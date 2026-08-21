//! `#[tauri::command]` functions — the **only** surface the webview can reach.
//!
//! Called by: the frontend, exclusively through `src/lib/ipc.ts`.
//! Calls: everything else in the crate.
//!
//! # The rules this module exists to enforce
//!
//! 1. **No credential ever crosses this boundary.** The Canvas session cookie
//!    and any access token live in the OS keyring and are attached to requests
//!    inside `canvas::client`. A command may report *whether* the app is
//!    authenticated; none may return the thing that authenticates it
//!    (SPEC.md §1).
//! 2. **No grade math above this line.** Commands return numbers that
//!    [`crate::grades`] computed. If a percentage is calculated in TypeScript,
//!    that is a bug (§10).
//! 3. **Errors cross as strings.** Tauri needs `Result<T, E: Serialize>`;
//!    [`CommandError`] wraps the crate's real error types and produces a
//!    message that names what broke and how to fix it, as §9.7 requires.

pub mod auth;
pub mod data;
pub mod grades;
pub mod settings;
pub mod sync;

use serde::Serialize;

/// The error shape every command returns.
///
/// Tauri serialises `Err` values straight to the webview, so this is what the
/// user eventually reads. Messages are written for them, not for a log:
/// "Canvas session expired — sign in again from Settings" rather than
/// "reqwest::Error: 401".
#[derive(Debug, Serialize)]
pub struct CommandError {
    /// Machine-readable discriminator, so the frontend can special-case
    /// recoverable states (notably `sessionExpired`) without matching on prose.
    pub kind: ErrorKind,
    /// Human-readable, already suitable for display.
    pub message: String,
}

/// Error categories the frontend is allowed to branch on.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    /// The Canvas session died: a 401, a redirect to the SSO host, or HTML
    /// where JSON was expected. Recoverable by signing in again — the UI shows
    /// the reconnect banner rather than an error toast (§2.0).
    SessionExpired,
    /// Canvas is rate-limiting. The client already backed off and retried.
    RateLimited,
    /// Network is unreachable, DNS failed, TLS failed.
    Network,
    /// Local database or filesystem problem.
    Storage,
    /// A bug on our side, or a Canvas response we could not parse.
    Internal,
}

impl CommandError {
    /// Build an internal error with a display-ready message.
    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::Internal,
            message: message.into(),
        }
    }

    /// Build a storage error with a display-ready message.
    pub fn storage(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::Storage,
            message: message.into(),
        }
    }
}

/// Convenient alias — every command returns this.
pub type CommandResult<T> = Result<T, CommandError>;

impl From<crate::canvas::client::CanvasError> for CommandError {
    /// Map client errors onto the frontend's vocabulary. The messages are the
    /// user-facing text, written per §9.7: name what broke and how to fix it.
    fn from(e: crate::canvas::client::CanvasError) -> Self {
        use crate::canvas::client::CanvasError as E;
        let (kind, message) = match &e {
            E::SessionExpired => (
                ErrorKind::SessionExpired,
                "Canvas session expired — sign in again from Settings.".to_string(),
            ),
            E::RateLimited => (
                ErrorKind::RateLimited,
                "Canvas is rate-limiting us. Wait a minute and try again.".to_string(),
            ),
            E::Network(_) => (
                ErrorKind::Network,
                "Could not reach Canvas — check your connection.".to_string(),
            ),
            E::NoAuth => (
                ErrorKind::SessionExpired,
                "Not connected to Canvas. Sign in from Settings.".to_string(),
            ),
            E::Http { .. } | E::Parse { .. } => (ErrorKind::Internal, format!("{e}")),
        };
        Self { kind, message }
    }
}
