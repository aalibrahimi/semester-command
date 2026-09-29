//! Sync commands: trigger a sync, report where it is.
//!
//! Called by: `src/lib/ipc.ts` (`getSyncStatus`, `triggerSync`,
//! `triggerIcsImport`).
//! Calls: [`crate::sync`], [`crate::ical`], [`crate::db`].

use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::{CommandError, CommandResult};
use crate::db::{queries, upsert, Db};

/// Where the sync engine is, as the sidebar footer renders it.
///
/// Mirrored in TypeScript as `SyncStatus` in `src/types/index.ts`. Change one,
/// change the other in the same commit.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub phase: SyncPhase,
    /// RFC 3339. `None` before the first successful sync.
    pub last_synced_at: Option<String>,
    /// Display-ready. `None` unless `phase` is `Error`.
    pub message: Option<String>,
    pub auth_mode: AuthModeTag,
    /// RFC 3339. When the last run of any outcome finished.
    pub last_attempt_at: Option<String>,
    /// Minutes between automatic runs, so the UI can say when the next one is.
    pub interval_minutes: u32,
}

/// The sync engine's states.
///
/// `ReconnectRequired` is a first-class state rather than an error variant
/// because SSO sessions expiring mid-semester is expected behaviour, not a
/// fault (§2.0). It means every grade on screen is stale and must be marked so.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncPhase {
    Idle,
    Syncing,
    ReconnectRequired,
    Error,
}

/// Which auth tier produced the data currently on screen.
///
/// The UI needs this to be honest about provenance: due dates from a calendar
/// feed plus hand-entered scores are a different kind of number than one Canvas
/// confirmed, and §3 requires the difference to be visible.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AuthModeTag {
    /// Tier 0 — an admin-issued access token.
    Token,
    /// Tier 1 — a harvested browser session cookie.
    Session,
    /// Tier 2 — calendar feed only. Dates, no grades.
    Ics,
    /// Nothing configured yet.
    None,
}

/// Current sync status: live engine state plus the last successful run.
#[tauri::command]
pub async fn get_sync_status(app: AppHandle) -> CommandResult<SyncStatus> {
    use crate::canvas::client::AuthMode;
    use crate::commands::auth::AuthCtx;
    use crate::sync::SyncState;

    let ctx = app.state::<AuthCtx>();
    let mode = ctx.client.auth_mode().await;

    let auth_mode = match &mode {
        AuthMode::Token(_) => AuthModeTag::Token,
        AuthMode::Session { .. } => AuthModeTag::Session,
        AuthMode::None => {
            // Tier 2 is "no Canvas credential, but a feed URL is configured".
            let dir = app.path().app_config_dir().ok();
            let has_feed = dir
                .map(|d| crate::settings::load(&d).calendar_feed_url.is_some())
                .unwrap_or(false);
            if has_feed {
                AuthModeTag::Ics
            } else {
                AuthModeTag::None
            }
        }
    };

    // A credential that stopped working means every number on screen is stale
    // and the footer must say so from any screen (§2.0, §5).
    let phase = if app.state::<SyncState>().is_running() {
        SyncPhase::Syncing
    } else if !mode.is_none() && !ctx.client.is_alive() {
        SyncPhase::ReconnectRequired
    } else {
        SyncPhase::Idle
    };

    let db = app.state::<Db>().inner().clone();
    let read = |e: sqlx::Error| CommandError::storage(format!("Could not read sync history: {e}"));
    let last_synced_at = queries::last_ok_sync(&db).await.map_err(read)?;
    let last_attempt_at = queries::last_sync_attempt(&db).await.map_err(read)?;

    // A run that failed after the last good one: say so, in plain words,
    // instead of letting "synced 3h ago" quietly grow.
    let (phase, message) = match phase {
        SyncPhase::Idle => match queries::failed_since_ok(&db).await.map_err(read)? {
            Some((_, err)) => (SyncPhase::Error, Some(describe_sync_error(err.as_deref()))),
            None => (SyncPhase::Idle, None),
        },
        other => (other, None),
    };

    Ok(SyncStatus {
        phase,
        last_synced_at,
        message,
        auth_mode,
        last_attempt_at,
        interval_minutes: 30,
    })
}

/// Turn a stored sync error into one sentence a person can act on. The raw
/// text stays in `sync_log` (and the debug view) for diagnosis.
pub fn describe_sync_error(raw: Option<&str>) -> String {
    let raw = raw.unwrap_or("").trim();
    let low = raw.to_lowercase();
    if low.contains("session expired") {
        "Your Canvas sign-in expired. Reconnect to keep grades and due dates current.".into()
    } else if low.contains("rate-limiting") || low.contains("http 429") {
        "Canvas asked the app to slow down. It will try again on the next scheduled sync.".into()
    } else if low.contains("network problem")
        || low.contains("timed out")
        || low.contains("dns")
        || low.contains("connect")
    {
        "Couldn't reach Canvas. Check your internet connection; the app will retry on its own."
            .into()
    } else if let Some(code) = low
        .split("http ")
        .nth(1)
        .and_then(|r| r.get(..3))
        .and_then(|c| c.parse::<u16>().ok())
    {
        if code >= 500 {
            format!("Canvas had a server problem (HTTP {code}). It usually clears up; the app will retry.")
        } else {
            format!("Canvas refused a request (HTTP {code}). Try Sync now; if it keeps happening, reconnect.")
        }
    } else if low.contains("could not parse") {
        "Canvas sent something the app didn't expect. Try Sync now; if it repeats, it's a bug worth reporting.".into()
    } else if raw.is_empty() {
        "The last sync didn't finish. Try Sync now.".into()
    } else {
        let short: String = raw.chars().take(140).collect();
        format!("The last sync failed: {short}")
    }
}

#[cfg(test)]
mod tests {
    use super::describe_sync_error;

    #[test]
    fn plain_words_for_common_failures() {
        assert!(
            describe_sync_error(Some("Canvas session expired: sign in again"))
                .contains("Reconnect")
        );
        assert!(describe_sync_error(Some(
            "network problem talking to Canvas: error sending request"
        ))
        .contains("internet"));
        assert!(
            describe_sync_error(Some("Canvas returned HTTP 503 for /api/v1/courses"))
                .contains("HTTP 503")
        );
        assert!(
            describe_sync_error(Some("Canvas returned HTTP 403 for /api/v1/courses"))
                .contains("refused")
        );
        assert!(describe_sync_error(Some(
            "Canvas is rate-limiting us and retries were exhausted"
        ))
        .contains("slow down"));
        assert!(describe_sync_error(None).contains("didn't finish"));
    }
}

/// Kick a sync and return immediately; progress lands on the `sync:` event
/// and in `get_sync_status`. Manual, so it bypasses the 30-minute floor but
/// not the concurrency cap (§6).
#[tauri::command]
pub async fn trigger_sync(app: AppHandle) -> CommandResult<()> {
    tauri::async_runtime::spawn(async move {
        crate::sync::run(&app, true).await;
    });
    Ok(())
}

/// Import the Tier 2 calendar feed now. Returns what it did — this one is
/// awaited rather than fire-and-forget because the Settings screen shows the
/// result inline.
#[tauri::command]
pub async fn trigger_ics_import(app: AppHandle) -> CommandResult<crate::ical::IcsSummary> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| CommandError::storage(format!("No config dir: {e}")))?;
    let url = crate::settings::load(&dir)
        .calendar_feed_url
        .ok_or_else(|| CommandError::internal("No calendar feed URL is configured."))?;

    let db = app.state::<Db>().inner().clone();
    let log_id = upsert::sync_log_start(&db, "ics")
        .await
        .map_err(|e| CommandError::storage(format!("Could not open sync log: {e}")))?;

    match crate::ical::import_feed(&db, &url).await {
        Ok(summary) => {
            let _ = upsert::sync_log_finish(&db, log_id, true, None).await;
            Ok(summary)
        }
        Err(e) => {
            let _ = upsert::sync_log_finish(&db, log_id, false, Some(&e)).await;
            Err(CommandError::internal(e))
        }
    }
}
