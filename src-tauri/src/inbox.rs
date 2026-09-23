//! The notification center: every notification goes into the inbox, then
//! gets shown the way you chose (the app's own pop-up, the OS one, or not
//! at all).
//!
//! Called by: [`crate::notify`] (deadline reminders, digests, grade moves,
//! missing flips, session death) and `commands::inbox` (the test button).
//! Calls: the `inbox` table (migration 0016), [`crate::settings`] for the
//! pop-up style, tauri-plugin-notification for the "system" style, and the
//! `toast` window for the "custom" style.
//!
//! # How one notification travels
//!
//! 1. [`deliver`] writes it to `inbox` (so it's never lost, even if every
//!    pop-up is off) and emits `inbox:new` to every window. The main window
//!    uses that to bump the bell's unread count.
//! 2. If the main window is open and focused, the main window shows its own
//!    in-app toast (it listens to `inbox:new`); nothing else pops up. You're
//!    already looking at the app.
//! 3. Otherwise, by pop-up style:
//!    - `custom` (default): the item joins [`ToastQueue`] and the `toast`
//!      window (small, frameless, transparent, always on top, never takes
//!      focus) appears in the top-right corner and pulls the queue.
//!    - `system`: the OS notification, as before.
//!    - `off`: inbox only.
//!
//!    `low` urgency items (like "3 new assignments") never pop up at all.
//!
//! # Why a queue instead of just emitting
//!
//! The toast window is created on first use, and an event emitted before
//! its page has loaded would be lost. So the window *pulls*: it calls
//! `toast_take` when it starts and again whenever it gets a `toast:wake`.

use std::sync::Mutex;

use serde::Serialize;
use sqlx::FromRow;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::db::{now_rfc3339, Db};

pub const TOAST_LABEL: &str = "toast";
/// Width of the pop-up window in logical pixels. The cards inside are
/// narrower; the rest is room for their shadow.
const TOAST_WIDTH: f64 = 396.0;
/// Gap from the screen's top-right corner (below the menu bar on macOS).
const TOAST_MARGIN: f64 = 10.0;

/// What a caller hands to [`deliver`].
#[derive(Debug, Clone)]
pub struct Note {
    pub kind: &'static str,
    pub title: String,
    pub body: String,
    pub route: Option<String>,
    pub urgency: Urgency,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Urgency {
    /// Inbox only. For things worth knowing but not worth an interruption.
    Low,
    Normal,
    /// The pop-up stays until you close it.
    High,
}

impl Urgency {
    fn as_str(self) -> &'static str {
        match self {
            Urgency::Low => "low",
            Urgency::Normal => "normal",
            Urgency::High => "high",
        }
    }
}

impl Note {
    pub fn new(kind: &'static str, title: impl Into<String>, body: impl Into<String>) -> Self {
        Note {
            kind,
            title: title.into(),
            body: body.into(),
            route: None,
            urgency: Urgency::Normal,
        }
    }
    pub fn route(mut self, route: impl Into<String>) -> Self {
        self.route = Some(route.into());
        self
    }
    pub fn urgency(mut self, urgency: Urgency) -> Self {
        self.urgency = urgency;
        self
    }
}

/// One stored notification, as the frontend sees it.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InboxItem {
    pub id: i64,
    pub kind: String,
    pub title: String,
    pub body: String,
    pub route: Option<String>,
    pub urgency: String,
    pub created_at: String,
    pub read_at: Option<String>,
}

/// Items waiting for the pop-up window to pick them up.
#[derive(Default)]
pub struct ToastQueue(pub Mutex<Vec<InboxItem>>);

/// Store a notification and show it. Fire-and-forget: callers are often
/// sync code (the session-death handler), so the work runs on a task.
pub fn deliver(app: &AppHandle, note: Note) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = deliver_now(&app, note).await {
            tracing::warn!(error = %e, "notification delivery failed");
        }
    });
}

/// The awaitable version of [`deliver`], for callers that want the stored
/// row back (the test button).
pub async fn deliver_now(app: &AppHandle, note: Note) -> Result<InboxItem, sqlx::Error> {
    let db = app.state::<Db>().inner().clone();
    let item = insert(&db, &note).await?;
    tracing::info!(kind = note.kind, title = %note.title, "notification stored");
    let _ = app.emit("inbox:new", &item);

    if note.urgency == Urgency::Low || main_window_in_use(app) {
        return Ok(item);
    }
    let style = popup_style(app);
    match style.as_str() {
        "off" => {}
        "system" => system_popup(app, &item),
        _ => custom_popup(app, item.clone()),
    }
    Ok(item)
}

async fn insert(db: &Db, note: &Note) -> Result<InboxItem, sqlx::Error> {
    sqlx::query_as::<_, InboxItem>(
        "INSERT INTO inbox (kind, title, body, route, urgency, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         RETURNING id, kind, title, body, route, urgency, created_at, read_at",
    )
    .bind(note.kind)
    .bind(&note.title)
    .bind(&note.body)
    .bind(&note.route)
    .bind(note.urgency.as_str())
    .bind(now_rfc3339())
    .fetch_one(db)
    .await
}

/// The user is looking at the app right now: the in-app toast is enough.
fn main_window_in_use(app: &AppHandle) -> bool {
    app.get_webview_window("main")
        .map(|w| w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false))
        .unwrap_or(false)
}

/// "custom" | "system" | "off", from settings.json. Default: custom.
pub fn popup_style(app: &AppHandle) -> String {
    app.path()
        .app_config_dir()
        .ok()
        .and_then(|dir| crate::settings::load(&dir).popup_style)
        .unwrap_or_else(|| "custom".to_string())
}

fn system_popup(app: &AppHandle, item: &InboxItem) {
    use tauri_plugin_notification::NotificationExt;
    if let Err(e) = app
        .notification()
        .builder()
        .title(&item.title)
        .body(&item.body)
        .show()
    {
        tracing::warn!(error = %e, "system notification failed");
    }
}

fn custom_popup(app: &AppHandle, item: InboxItem) {
    app.state::<ToastQueue>().0.lock().unwrap().push(item);
    match toast_window(app) {
        // An existing window gets a nudge to pull the queue. A new one pulls
        // on its own as soon as its page loads.
        Ok((_win, existed)) => {
            if existed {
                let _ = app.emit_to(TOAST_LABEL, "toast:wake", ());
            }
        }
        Err(e) => tracing::warn!(error = %e, "could not open the notification window"),
    }
}

/// The pop-up window, created on first use. Returns (window, already_existed).
fn toast_window(app: &AppHandle) -> tauri::Result<(WebviewWindow, bool)> {
    if let Some(w) = app.get_webview_window(TOAST_LABEL) {
        return Ok((w, true));
    }
    let builder = tauri::WebviewWindowBuilder::new(app, TOAST_LABEL, tauri::WebviewUrl::default())
        .title("Semester Command notifications")
        .inner_size(TOAST_WIDTH, 140.0)
        .decorations(false)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .focused(false)
        // Never steal focus from whatever you're typing in.
        .focusable(false)
        // One click acts on the card, even though the window isn't focused.
        .accept_first_mouse(true)
        .visible(false)
        // Needs tauri's "macos-private-api" feature (Cargo.toml) and
        // app.macOSPrivateApi (tauri.conf.json) on macOS.
        .transparent(true);
    let win = builder.build()?;
    Ok((win, false))
}

/// Size the pop-up to its cards and pin it to the top-right corner of the
/// screen's usable area. Called by the toast page whenever its content
/// changes; a height of 0 hides it.
pub fn place_toast(app: &AppHandle, height: f64) {
    let Some(win) = app.get_webview_window(TOAST_LABEL) else {
        return;
    };
    if height <= 0.0 {
        let _ = win.hide();
        return;
    }
    let monitor = win
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| win.primary_monitor().ok().flatten());
    let _ = win.set_size(tauri::LogicalSize::new(TOAST_WIDTH, height));
    if let Some(m) = monitor {
        let scale = m.scale_factor();
        let area = m.work_area();
        let x = area.position.x as f64 / scale + area.size.width as f64 / scale
            - TOAST_WIDTH
            - TOAST_MARGIN;
        let y = area.position.y as f64 / scale + TOAST_MARGIN;
        let _ = win.set_position(tauri::LogicalPosition::new(x, y));
    }
    if !win.is_visible().unwrap_or(false) {
        let _ = win.show();
    }
}

/// Drop what nobody will look for again: read items after 60 days, anything
/// after 180. Called from the notification tick.
pub async fn prune(db: &Db) -> Result<(), sqlx::Error> {
    let now = chrono::Utc::now();
    let ts = |days: i64| {
        (now - chrono::Duration::days(days)).to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
    };
    sqlx::query(
        "DELETE FROM inbox WHERE (read_at IS NOT NULL AND created_at < ?1) OR created_at < ?2",
    )
    .bind(ts(60))
    .bind(ts(180))
    .execute(db)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn db() -> Db {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::query(include_str!("../migrations/0016_inbox.sql"))
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn insert_returns_the_stored_row() {
        let db = db().await;
        let note = Note::new("deadline", "HW 3 due in 3h", "CS 146 · 2% of grade")
            .route("/courses/1")
            .urgency(Urgency::High);
        let item = insert(&db, &note).await.unwrap();
        assert_eq!(item.kind, "deadline");
        assert_eq!(item.route.as_deref(), Some("/courses/1"));
        assert_eq!(item.urgency, "high");
        assert!(item.read_at.is_none());
    }

    #[tokio::test]
    async fn prune_keeps_recent_and_unread() {
        let db = db().await;
        let old = (chrono::Utc::now() - chrono::Duration::days(90)).to_rfc3339();
        for (created, read) in [
            (old.clone(), Some(old.clone())),
            (old.clone(), None),
            (now_rfc3339(), Some(now_rfc3339())),
        ] {
            sqlx::query(
                "INSERT INTO inbox (kind, title, created_at, read_at) VALUES ('test', 't', ?1, ?2)",
            )
            .bind(created)
            .bind(read)
            .execute(&db)
            .await
            .unwrap();
        }
        prune(&db).await.unwrap();
        let left: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM inbox")
            .fetch_one(&db)
            .await
            .unwrap();
        // The 90-day-old read one goes; the 90-day-old unread one and the
        // fresh read one stay.
        assert_eq!(left, 2);
    }
}
