//! Sync commands: trigger a sync, report where it is.
//!
//! Called by: `src/lib/ipc.ts` (`getSyncStatus`; `triggerSync` from M1).
//! Calls: the sync engine (M1) and [`crate::db`].

use serde::Serialize;

use super::CommandResult;

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

/// Current sync status.
///
/// Auth tier and session health are live as of M1 steps 1–4; the sync engine
/// itself (last-synced time, syncing phase) lands with M1 steps 5–6.
#[tauri::command]
pub async fn get_sync_status(app: tauri::AppHandle) -> CommandResult<SyncStatus> {
    use crate::canvas::client::AuthMode;
    use crate::commands::auth::AuthCtx;
    use tauri::Manager;

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
            if has_feed { AuthModeTag::Ics } else { AuthModeTag::None }
        }
    };

    // A credential that stopped working means every number on screen is stale
    // and the footer must say so from any screen (§2.0, §5).
    let phase = if !mode.is_none() && !ctx.client.is_alive() {
        SyncPhase::ReconnectRequired
    } else {
        SyncPhase::Idle
    };

    // TODO(M1 steps 5–6): read the latest `sync_log` row for last_synced_at
    // and the live Syncing phase.
    Ok(SyncStatus {
        phase,
        last_synced_at: None,
        message: None,
        auth_mode,
    })
}

// TODO(M1): trigger_sync() — kicks a sync, returns immediately. The engine
//           enforces the 30-minute floor (§2.0) and caps concurrency at 4;
//           a manual "Sync now" bypasses the floor but not the cap.
