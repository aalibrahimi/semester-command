//! Inbox and pop-up commands.
//!
//! Called by: `src/lib/ipc.ts` (the bell, the Inbox page, Settings, and the
//! toast window's page).
//! Calls: the `inbox` table (migration 0016) and [`crate::inbox`].
//!
//! Every write emits `inbox:changed` so any open bell or inbox list
//! refreshes without polling.

use tauri::{AppHandle, Emitter, Manager};

use super::{CommandError, CommandResult};
use crate::db::{now_rfc3339, Db};
use crate::inbox::{self, InboxItem, Note, ToastQueue, Urgency};

fn db_of(app: &AppHandle) -> Db {
    app.state::<Db>().inner().clone()
}

fn storage_err(e: sqlx::Error) -> CommandError {
    CommandError::storage(format!("Inbox store failed: {e}"))
}

fn changed(app: &AppHandle) {
    let _ = app.emit("inbox:changed", ());
}

/// Newest first. `unread_only` for the Unread tab.
#[tauri::command]
pub async fn inbox_list(
    app: AppHandle,
    limit: Option<i64>,
    unread_only: Option<bool>,
) -> CommandResult<Vec<InboxItem>> {
    let sql = if unread_only.unwrap_or(false) {
        "SELECT id, kind, title, body, route, urgency, created_at, read_at
         FROM inbox WHERE read_at IS NULL ORDER BY id DESC LIMIT ?1"
    } else {
        "SELECT id, kind, title, body, route, urgency, created_at, read_at
         FROM inbox ORDER BY id DESC LIMIT ?1"
    };
    sqlx::query_as::<_, InboxItem>(sql)
        .bind(limit.unwrap_or(200).clamp(1, 1000))
        .fetch_all(&db_of(&app))
        .await
        .map_err(storage_err)
}

#[tauri::command]
pub async fn inbox_unread_count(app: AppHandle) -> CommandResult<i64> {
    sqlx::query_scalar("SELECT COUNT(*) FROM inbox WHERE read_at IS NULL")
        .fetch_one(&db_of(&app))
        .await
        .map_err(storage_err)
}

/// Mark these ids read, or everything when `ids` is None.
#[tauri::command]
pub async fn inbox_mark_read(app: AppHandle, ids: Option<Vec<i64>>) -> CommandResult<()> {
    let db = db_of(&app);
    let now = now_rfc3339();
    match ids {
        None => {
            sqlx::query("UPDATE inbox SET read_at = ?1 WHERE read_at IS NULL")
                .bind(&now)
                .execute(&db)
                .await
                .map_err(storage_err)?;
        }
        Some(ids) => {
            for id in ids {
                sqlx::query("UPDATE inbox SET read_at = ?1 WHERE id = ?2 AND read_at IS NULL")
                    .bind(&now)
                    .bind(id)
                    .execute(&db)
                    .await
                    .map_err(storage_err)?;
            }
        }
    }
    changed(&app);
    Ok(())
}

/// Put an item back to unread.
#[tauri::command]
pub async fn inbox_mark_unread(app: AppHandle, id: i64) -> CommandResult<()> {
    sqlx::query("UPDATE inbox SET read_at = NULL WHERE id = ?1")
        .bind(id)
        .execute(&db_of(&app))
        .await
        .map_err(storage_err)?;
    changed(&app);
    Ok(())
}

#[tauri::command]
pub async fn inbox_delete(app: AppHandle, id: i64) -> CommandResult<()> {
    sqlx::query("DELETE FROM inbox WHERE id = ?1")
        .bind(id)
        .execute(&db_of(&app))
        .await
        .map_err(storage_err)?;
    changed(&app);
    Ok(())
}

/// Delete every read item.
#[tauri::command]
pub async fn inbox_clear_read(app: AppHandle) -> CommandResult<()> {
    sqlx::query("DELETE FROM inbox WHERE read_at IS NOT NULL")
        .execute(&db_of(&app))
        .await
        .map_err(storage_err)?;
    changed(&app);
    Ok(())
}

/// A pop-up was clicked: mark it read, bring the main window forward, and
/// tell it where to go.
#[tauri::command]
pub async fn inbox_open(app: AppHandle, id: i64) -> CommandResult<()> {
    let db = db_of(&app);
    let route: Option<String> = sqlx::query_scalar("SELECT route FROM inbox WHERE id = ?1")
        .bind(id)
        .fetch_optional(&db)
        .await
        .map_err(storage_err)?
        .flatten();
    sqlx::query("UPDATE inbox SET read_at = ?1 WHERE id = ?2 AND read_at IS NULL")
        .bind(now_rfc3339())
        .bind(id)
        .execute(&db)
        .await
        .map_err(storage_err)?;
    changed(&app);
    crate::show_main_window(&app);
    let _ = app.emit_to(
        "main",
        "inbox:navigate",
        route.unwrap_or_else(|| "/inbox".to_string()),
    );
    Ok(())
}

/// The toast window pulls everything queued for it.
#[tauri::command]
pub fn toast_take(app: AppHandle) -> Vec<InboxItem> {
    std::mem::take(&mut *app.state::<ToastQueue>().0.lock().unwrap())
}

/// The toast window reports its content height; 0 hides it.
#[tauri::command]
pub fn toast_resize(app: AppHandle, height: f64) {
    inbox::place_toast(&app, height);
}

/// "custom" | "system" | "off".
#[tauri::command]
pub fn get_popup_style(app: AppHandle) -> String {
    inbox::popup_style(&app)
}

#[tauri::command]
pub fn set_popup_style(app: AppHandle, style: String) -> CommandResult<()> {
    if !["custom", "system", "off"].contains(&style.as_str()) {
        return Err(CommandError::internal(format!(
            "Unknown pop-up style: {style}"
        )));
    }
    let dir = app.path().app_config_dir().map_err(|e| {
        CommandError::storage(format!("Could not find a place to store settings: {e}"))
    })?;
    let mut s = crate::settings::load(&dir);
    s.popup_style = Some(style);
    crate::settings::save(&dir, &s)
        .map_err(|e| CommandError::storage(format!("Could not save settings: {e}")))?;
    Ok(())
}

/// The Settings button: send a sample so you can see the pop-up. `delay_ms`
/// lets you hide the window first, since a focused main window shows the
/// in-app toast instead of the pop-up.
#[tauri::command]
pub async fn notify_test(app: AppHandle, delay_ms: Option<u64>) -> CommandResult<()> {
    if let Some(ms) = delay_ms {
        tokio::time::sleep(std::time::Duration::from_millis(ms.min(30_000))).await;
    }
    inbox::deliver_now(
        &app,
        Note::new(
            "test",
            "This is what a reminder looks like",
            "Click it to open your inbox. Deadline reminders, grade changes and missing work all arrive like this.",
        )
        .route("/inbox")
        .urgency(Urgency::Normal),
    )
    .await
    .map_err(storage_err)?;
    Ok(())
}
