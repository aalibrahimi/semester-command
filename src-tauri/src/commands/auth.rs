//! Auth commands: establish, inspect and clear the Canvas connection.
//!
//! Called by: `src/lib/ipc.ts`, from the Settings screen and the reconnect
//! banner.
//! Calls: [`crate::canvas::client`] and [`crate::canvas::session_store`].
//!
//! # What this module will and will not do
//!
//! It reports *whether* the app is authenticated and under which tier. It
//! never returns the credential itself — no command hands a cookie or a token
//! to the webview (SPEC.md §1). The login window is opened from Rust, the
//! cookies are harvested in Rust, and they are attached to requests in Rust.
//! Cookie **names** do cross the boundary (the harvest report lists them);
//! names are not credentials and the M1 acceptance list explicitly wants them
//! reported.
//!
//! # The WebView2 deadlock rule
//!
//! Every cookie read in this file goes through [`read_login_cookies`], which
//! wraps `cookies_for_url` in `spawn_blocking` from an `async` command. Tauri
//! documents that reading cookies from a synchronous command or an event
//! handler deadlocks WebView2 — the app freezes with no error and no panic.
//! This repo is developed on Windows, so that is the expected failure, not a
//! theoretical one. Do not "simplify" the indirection away.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use super::{CommandError, CommandResult};
use crate::canvas::client::{AuthMode, CanvasClient, BASE_URL};
use crate::canvas::session_store::{Backend, SessionStore, Slot};

/// Window label for the login webview. One instance, ever.
const LOGIN_WINDOW: &str = "canvas-login";

/// Event the frontend listens on for every auth transition.
pub const AUTH_EVENT: &str = "auth:status-changed";

// NOTE: no session-cookie-name constant here on purpose. SJSU's live cookie
// set (confirmed 2026-08-20) is `canvas_session`, `_csrf_token`,
// `log_session_id` — but Canvas hands `canvas_session` to *unauthenticated*
// visitors too, so a name can never prove login. The poller instead
// fingerprints cookie values and lets `GET /users/self` be the judge; see
// `poll_for_session`.

/// Everything the app knows about auth, shared as Tauri managed state.
pub struct AuthCtx {
    pub client: std::sync::Arc<CanvasClient>,
    pub store: SessionStore,
    /// Guards against two concurrent login pollers when the button is mashed.
    polling: AtomicBool,
    /// One OS notification per session death, not one per failed sync.
    /// Cleared whenever a credential validates again.
    pub death_notified: AtomicBool,
    /// Where the live credential is physically stored, for UI honesty.
    pub backend: std::sync::Mutex<Option<Backend>>,
    /// Who Canvas last said we are ("validated as Ali …" in Settings).
    pub validated_as: std::sync::Mutex<Option<String>>,
    /// When the last *silent* re-auth attempt started — rate-limits the
    /// hidden-window dance so a hard-dead SSO doesn't spawn one per sync.
    last_silent_attempt: std::sync::Mutex<Option<Instant>>,
}

impl AuthCtx {
    pub fn new(client: std::sync::Arc<CanvasClient>, store: SessionStore) -> Self {
        Self {
            client,
            store,
            polling: AtomicBool::new(false),
            death_notified: AtomicBool::new(false),
            backend: std::sync::Mutex::new(None),
            validated_as: std::sync::Mutex::new(None),
            last_silent_attempt: std::sync::Mutex::new(None),
        }
    }
}

/// The auth picture the frontend renders. Mirrored as `AuthStatus` in
/// `src/types/index.ts` — change one, change the other in the same commit.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatusPayload {
    /// "token" | "session" | "none" — mirrors [`AuthMode`] without the secret.
    pub tier: &'static str,
    /// Is the credential believed to currently work?
    pub alive: bool,
    /// Display name Canvas confirmed, if a validation has succeeded.
    pub validated_as: Option<String>,
    /// Which store holds the credential — "keyring" or "file".
    pub storage: Option<Backend>,
    /// Display-ready progress/error line for the Settings screen.
    pub message: Option<String>,
}

/// Snapshot current auth state and notify the frontend.
///
/// All auth transitions funnel through here so the Settings screen and the
/// sidebar footer can never disagree about what is true.
pub async fn emit_status(app: &AppHandle, message: Option<String>) {
    let ctx = app.state::<AuthCtx>();
    let tier = match ctx.client.auth_mode().await {
        AuthMode::Token(_) => "token",
        AuthMode::Session { .. } => "session",
        AuthMode::None => "none",
    };
    let payload = AuthStatusPayload {
        tier,
        alive: ctx.client.is_alive(),
        validated_as: ctx.validated_as.lock().unwrap().clone(),
        storage: *ctx.backend.lock().unwrap(),
        message,
    };
    if let Err(e) = app.emit(AUTH_EVENT, &payload) {
        tracing::warn!(error = %e, "could not emit auth status");
    }
}

/// Current auth state, for first render before any event has fired.
#[tauri::command]
pub async fn auth_status(app: AppHandle) -> CommandResult<AuthStatusPayload> {
    let ctx = app.state::<AuthCtx>();
    let tier = match ctx.client.auth_mode().await {
        AuthMode::Token(_) => "token",
        AuthMode::Session { .. } => "session",
        AuthMode::None => "none",
    };
    let validated_as = ctx.validated_as.lock().unwrap().clone();
    let storage = *ctx.backend.lock().unwrap();
    Ok(AuthStatusPayload {
        tier,
        alive: ctx.client.is_alive(),
        validated_as,
        storage,
        message: None,
    })
}

/// Open the SJSU Canvas login window and start polling for a session.
///
/// The user authenticates through SSO themselves — including MFA. We never
/// see or store the password; the poller watches for the session cookie every
/// 2 seconds for up to 5 minutes (SSO plus MFA is slow — a 30-second timeout
/// would expire mid-Duo-push), validates a candidate against
/// `GET /users/self`, and only then stores it.
#[tauri::command]
pub async fn open_canvas_login(app: AppHandle) -> CommandResult<()> {
    // Reuse an already-open window rather than stacking a second one. It may
    // be a hidden silent-refresh window mid-attempt — the user asked to sign
    // in, so reveal it and let them take over; the running poller carries on.
    if let Some(win) = app.get_webview_window(LOGIN_WINDOW) {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    build_login_window(&app, true)
        .map_err(|e| CommandError::internal(format!("Could not open the login window: {e}")))?;

    // One poller at a time, even if the button is clicked twice.
    let ctx = app.state::<AuthCtx>();
    if ctx.polling.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    emit_status(&app, Some("Waiting for you to sign in…".into())).await;
    tauri::async_runtime::spawn(async move {
        poll_for_session(app, false).await;
    });
    Ok(())
}

/// Create the Canvas login webview, visibly or hidden.
///
/// Both the interactive sign-in and the silent refresh use the *same* window
/// label, and that is the mechanism behind "sign in once": WebView2 persists
/// this webview's profile (cookies included) on disk, so the SSO provider's
/// keep-me-signed-in cookies from the first interactive login are still in
/// the jar weeks later — a hidden load of Canvas rides them straight through
/// the SSO redirect chain to a fresh session, no user in the loop.
fn build_login_window(
    app: &AppHandle,
    visible: bool,
) -> Result<tauri::WebviewWindow, tauri::Error> {
    let url: tauri::Url = format!("{BASE_URL}/login")
        .parse()
        .expect("BASE_URL/login is a valid URL");

    tauri::WebviewWindowBuilder::new(app, LOGIN_WINDOW, tauri::WebviewUrl::External(url))
        .title("Sign in to Canvas")
        .inner_size(900.0, 750.0)
        .visible(visible)
        .focused(visible)
        // Trace where the SSO chain actually goes. A failed hop renders as a
        // blank white window with zero diagnostics otherwise (seen live with
        // an ERR_CONNECTION_RESET mid-Duo). Origin + path only — SAML/Okta
        // query strings carry state tokens and must stay out of logs.
        .on_page_load(|_, payload| {
            let url = payload.url();
            let stage = match payload.event() {
                tauri::webview::PageLoadEvent::Started => "started",
                tauri::webview::PageLoadEvent::Finished => "finished",
            };
            tracing::info!(
                stage,
                host = url.host_str().unwrap_or("?"),
                path = url.path(),
                "login window navigation"
            );
        })
        .build()
}

/// The Canvas session died. Try to fix it without the user first; only
/// escalate to the OS notification + reconnect banner when the silent path
/// can't.
///
/// Every session-death site funnels here (restore-validation at launch, any
/// sync). Rate limits itself: at most one hidden attempt per 10 minutes, so
/// SSO that is *hard* dead (password changed, MFA re-enrolment) degrades to
/// exactly the old behaviour instead of a window-spawning loop.
pub async fn handle_session_death(app: AppHandle) {
    const SILENT_COOLDOWN: Duration = Duration::from_secs(10 * 60);

    let ctx = app.state::<AuthCtx>();

    // Only a cookie session can be refreshed by re-riding SSO. A dead token
    // (Tier 0) or no credential at all goes straight to the banner.
    let refreshable = matches!(ctx.client.auth_mode().await, AuthMode::Session { .. });

    let cooldown_ok = {
        let mut last = ctx.last_silent_attempt.lock().unwrap();
        let ok = last.map_or(true, |t| t.elapsed() >= SILENT_COOLDOWN);
        if ok && refreshable {
            *last = Some(Instant::now());
        }
        ok
    };

    // A poller already running (user is mid-sign-in, or another death beat
    // us here) means the situation is already being handled.
    if refreshable && cooldown_ok && !ctx.polling.swap(true, Ordering::SeqCst) {
        if app.get_webview_window(LOGIN_WINDOW).is_none()
            && build_login_window(&app, false).is_ok()
        {
            tracing::info!("session died — attempting silent re-auth through the hidden login window");
            if poll_for_session(app.clone(), true).await {
                return; // fresh session, sync already kicked; nobody noticed.
            }
        } else {
            ctx.polling.store(false, Ordering::SeqCst);
        }
    }

    // Silent path unavailable or failed: the one-per-death OS ping and the
    // reconnect banner (§2.0).
    let ctx = app.state::<AuthCtx>();
    if !ctx.death_notified.swap(true, Ordering::SeqCst) {
        crate::notify::session_died(&app);
    }
    emit_status(
        &app,
        Some("Your Canvas session expired — sign in again.".into()),
    )
    .await;
}

/// The login poller. Lives exactly as long as the login window does.
///
/// # What triggers a validation attempt
///
/// A change in the **values** of the Canvas cookie jar, not its names.
/// Learned live on 2026-08-20: Canvas hands an anonymous `canvas_session` to
/// unauthenticated visitors, so "the session cookie exists" is always true
/// and gated nothing — the first cut validated (and collected a pointless
/// 401) every 6 seconds for the entire Okta/Duo dance. Meanwhile the cookie
/// *names* are identical before and after login; only the values rotate at
/// the moment SSO completes. So: fingerprint the sorted (name, value) pairs,
/// validate on fingerprint change, plus a slow fallback probe in case a
/// login shape ever rotates nothing.
/// `silent` = the hidden refresh attempt: a shorter timeout (an SSO chain
/// that auto-redirects finishes in seconds; one that stopped at a login form
/// needs a human and will never finish), no status chatter while running,
/// and the window is torn down on failure instead of being left for the
/// user. Returns whether a session was established.
async fn poll_for_session(app: AppHandle, silent: bool) -> bool {
    const INTERVAL: Duration = Duration::from_secs(2);
    const TIMEOUT: Duration = Duration::from_secs(5 * 60);
    const SILENT_TIMEOUT: Duration = Duration::from_secs(75);
    /// Safety-net cadence for validating an *unchanged* jar.
    const FALLBACK_EVERY: Duration = Duration::from_secs(30);

    let timeout = if silent { SILENT_TIMEOUT } else { TIMEOUT };
    let started = Instant::now();
    let mut last_names: Vec<String> = Vec::new();
    let mut last_fingerprint: Option<u64> = None;
    let mut last_validate: Option<Instant> = None;

    let outcome = loop {
        tokio::time::sleep(INTERVAL).await;

        // Window gone → the user closed it. Not an error, just "no login".
        let Some(win) = app.get_webview_window(LOGIN_WINDOW) else {
            break Some("Login window closed before sign-in finished.".to_string());
        };
        // A silent window the user has since revealed (clicked Reconnect) is
        // an interactive sign-in now — give it the interactive timeout.
        let timeout = if win.is_visible().unwrap_or(false) { TIMEOUT } else { timeout };
        if started.elapsed() > timeout {
            let _ = win.close();
            break Some(if silent {
                "Automatic reconnect didn't get through SSO.".into()
            } else {
                "Gave up waiting after 5 minutes. Open Settings and try signing in again.".into()
            });
        }

        let cookies = match read_login_cookies(&win).await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "cookie read failed; will retry");
                continue;
            }
        };

        // Sorted so WebView2's nondeterministic jar order doesn't read as
        // change. Names only in the log — never values.
        let mut pairs: Vec<(String, String)> = cookies
            .iter()
            .map(|c| (c.name().to_string(), c.value().to_string()))
            .collect();
        pairs.sort();
        let names: Vec<String> = pairs.iter().map(|(n, _)| n.clone()).collect();
        if names != last_names {
            // The acceptance checklist wants every cookie name reported, and
            // this log line is also how a renamed session cookie gets caught.
            tracing::info!(cookies = ?names, "cookie set changed on {BASE_URL}");
            last_names = names;
        }

        let fingerprint = {
            use std::hash::{Hash, Hasher};
            let mut h = std::collections::hash_map::DefaultHasher::new();
            pairs.hash(&mut h);
            h.finish()
        };
        let jar_changed = last_fingerprint != Some(fingerprint);
        last_fingerprint = Some(fingerprint);

        let fallback_due = last_validate.map_or(true, |t| t.elapsed() >= FALLBACK_EVERY);
        if cookies.is_empty() || !(jar_changed || fallback_due) {
            continue;
        }
        last_validate = Some(Instant::now());

        let header = cookies
            .iter()
            .map(|c| format!("{}={}", c.name(), c.value()))
            .collect::<Vec<_>>()
            .join("; ");
        let candidate = AuthMode::Session { cookie_header: header.clone() };

        let ctx = app.state::<AuthCtx>();
        match ctx.client.validate(&candidate).await {
            Ok(user) => {
                let backend = match ctx.store.store(Slot::Session, &header) {
                    Ok(b) => b,
                    Err(e) => {
                        // A session that only lives in memory still works until
                        // the app closes — degraded, said out loud, not fatal.
                        tracing::error!(error = %e, "could not persist session; it will last until app close");
                        emit_status(
                            &app,
                            Some("Signed in, but the session could not be saved — you'll need to sign in again next launch.".into()),
                        )
                        .await;
                        ctx.client.set_auth(candidate).await;
                        *ctx.validated_as.lock().unwrap() = user.name.clone();
                        let _ = win.close();
                        break None;
                    }
                };
                ctx.client.set_auth(candidate).await;
                *ctx.validated_as.lock().unwrap() = user.name.clone();
                *ctx.backend.lock().unwrap() = Some(backend);
                let _ = win.close();
                tracing::info!(user = ?user.name, ?backend, "Canvas session established");
                break None;
            }
            Err(e) => {
                // Expected mid-SSO: cookies exist but aren't a session yet.
                tracing::debug!(error = %e, "candidate cookies not valid yet");
                continue;
            }
        }
    };

    let succeeded = outcome.is_none();
    let ctx = app.state::<AuthCtx>();
    ctx.polling.store(false, Ordering::SeqCst);
    if succeeded {
        emit_status(&app, None).await;
        kick_sync(&app);
    } else if silent {
        // The caller (handle_session_death) owns the user-facing failure
        // path; log the reason and leave the UI alone from here.
        tracing::info!(reason = ?outcome, "silent re-auth attempt failed");
    } else {
        emit_status(&app, outcome).await;
    }
    succeeded
}

/// Fire-and-forget a sync right after auth is established — a fresh
/// credential with no data behind it is exactly when the user is watching.
/// Also re-arms the session-death notification: this session is alive.
fn kick_sync(app: &AppHandle) {
    app.state::<AuthCtx>().death_notified.store(false, Ordering::SeqCst);
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        crate::sync::run(&app, true).await;
    });
}

/// One manual harvest attempt against the open login window, for the debug
/// screen. Reports the cookie names it saw (names, never values).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HarvestReport {
    pub connected: bool,
    pub cookie_names: Vec<String>,
    pub validated_as: Option<String>,
}

/// Try a harvest right now, regardless of the poller.
///
/// MUST stay async — see the module docs on the WebView2 deadlock.
#[tauri::command]
pub async fn harvest_session(app: AppHandle) -> CommandResult<HarvestReport> {
    let win = app
        .get_webview_window(LOGIN_WINDOW)
        .ok_or_else(|| CommandError::internal("The login window is not open."))?;

    let cookies = read_login_cookies(&win)
        .await
        .map_err(CommandError::internal)?;
    let cookie_names: Vec<String> = cookies.iter().map(|c| c.name().to_string()).collect();

    let header = cookies
        .iter()
        .map(|c| format!("{}={}", c.name(), c.value()))
        .collect::<Vec<_>>()
        .join("; ");
    let candidate = AuthMode::Session { cookie_header: header.clone() };

    let ctx = app.state::<AuthCtx>();
    match ctx.client.validate(&candidate).await {
        Ok(user) => {
            let backend = ctx.store.store(Slot::Session, &header).ok();
            ctx.client.set_auth(candidate).await;
            *ctx.validated_as.lock().unwrap() = user.name.clone();
            *ctx.backend.lock().unwrap() = backend;
            let _ = win.close();
            emit_status(&app, None).await;
            kick_sync(&app);
            Ok(HarvestReport { connected: true, cookie_names, validated_as: user.name })
        }
        Err(_) => Ok(HarvestReport { connected: false, cookie_names, validated_as: None }),
    }
}

/// Tier 0: an admin-issued access token. Validated against Canvas before it
/// is stored — a mistyped token should fail here, not as a mystery sync error
/// half an hour later.
#[tauri::command]
pub async fn set_access_token(app: AppHandle, token: String) -> CommandResult<()> {
    let token = token.trim().to_string();
    if token.is_empty() {
        return Err(CommandError::internal("The token is empty."));
    }

    let ctx = app.state::<AuthCtx>();
    let candidate = AuthMode::Token(token.clone());
    let user = ctx.client.validate(&candidate).await.map_err(|e| {
        CommandError::internal(format!("Canvas rejected that token: {e}"))
    })?;

    let backend = ctx
        .store
        .store(Slot::Token, &token)
        .map_err(CommandError::storage)?;
    ctx.client.set_auth(candidate).await;
    *ctx.validated_as.lock().unwrap() = user.name.clone();
    *ctx.backend.lock().unwrap() = Some(backend);
    emit_status(&app, None).await;
    kick_sync(&app);
    Ok(())
}

/// Sign out: wipe both credential slots from both backends and drop to
/// `AuthMode::None`. Never touches the local database — losing a session must
/// never mean losing data (§2.0).
#[tauri::command]
pub async fn clear_session(app: AppHandle) -> CommandResult<()> {
    let ctx = app.state::<AuthCtx>();
    ctx.store.clear_all().map_err(CommandError::storage)?;
    ctx.client.set_auth(AuthMode::None).await;
    *ctx.validated_as.lock().unwrap() = None;
    *ctx.backend.lock().unwrap() = None;
    emit_status(&app, None).await;
    Ok(())
}

/// Read the login window's cookies for the Canvas origin.
///
/// `spawn_blocking` + async command is the documented safe combination for
/// WebView2 (see module docs). Cookies only exist for http/https origins —
/// never `tauri://` — which is why this asks for the Canvas URL specifically.
async fn read_login_cookies(
    win: &tauri::WebviewWindow,
) -> Result<Vec<tauri::webview::Cookie<'static>>, String> {
    let win = win.clone();
    let url: tauri::Url = BASE_URL.parse().expect("BASE_URL is a valid URL");
    tauri::async_runtime::spawn_blocking(move || {
        win.cookies_for_url(url).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("cookie task panicked: {e}"))?
}
