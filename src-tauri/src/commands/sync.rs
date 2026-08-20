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
/// # Errors
/// Infallible today. It returns `CommandResult` anyway because from M1 it reads
/// the `sync_log` table, and changing a command's signature later means
/// changing its TypeScript wrapper and every call site at the same time.
#[tauri::command]
pub fn get_sync_status() -> CommandResult<SyncStatus> {
    // TODO(M1): read the latest `sync_log` row and the live engine state.
    Ok(SyncStatus {
        phase: SyncPhase::Idle,
        last_synced_at: None,
        message: None,
        auth_mode: AuthModeTag::None,
    })
}

// TODO(M1): trigger_sync() — kicks a sync, returns immediately. The engine
//           enforces the 30-minute floor (§2.0) and caps concurrency at 4;
//           a manual "Sync now" bypasses the floor but not the cap.
