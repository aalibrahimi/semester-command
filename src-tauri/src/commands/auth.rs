//! Auth commands: establish, inspect and clear the Canvas connection.
//!
//! Called by: `src/lib/ipc.ts`, from the Settings screen and the reconnect
//! banner.
//! Calls: [`crate::canvas::client`] and the keyring.
//!
//! # What this module will and will not do
//!
//! It will report *whether* the app is authenticated and under which tier. It
//! will never return the credential itself — no command hands a cookie or a
//! token to the webview (SPEC.md §1). The login window is opened from Rust, the
//! cookies are harvested in Rust, and they are attached to requests in Rust.
//!
//! TODO(M1): the whole module. Planned surface:
//!
//! - `open_canvas_login()` — opens a second webview at
//!   `https://sjsu.instructure.com`, polls for the session cookie, harvests via
//!   `webview.cookies_for_url(..)`, stores in the keyring, closes the window.
//!   **Must be an async command on a separate thread**: Tauri documents a
//!   WebView2 deadlock when cookies are read from a synchronous command or an
//!   event handler. That warning is Windows-specific and this repo is developed
//!   on Windows, so it is not a theoretical concern here — but it is done async
//!   on every platform regardless, because a deadlock that only reproduces on
//!   one target is the worst kind to debug.
//! - `set_access_token(token)` — Tier 0, if an SJSU admin ever issues one.
//! - `set_calendar_feed_url(url)` — Tier 2.
//! - `clear_session()` — wipes the keyring entry and the fallback file.
//! - `auth_status()` — which tier is live, and when the session was last seen
//!   working.
