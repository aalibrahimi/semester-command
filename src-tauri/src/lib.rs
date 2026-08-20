//! Module tree and the Tauri app builder.
//!
//! Job: declare what the app is made of, register plugins and commands, and
//! start the event loop.
//!
//! Called by: `main.rs`.
//! Calls: every module below.
//!
//! ## Where things live
//!
//! | I want to change…            | Look in                  |
//! |------------------------------|--------------------------|
//! | grade math                   | [`grades`]               |
//! | what Canvas requests look like | [`canvas::endpoints`]  |
//! | how a synced row is written  | [`db::upsert`]           |
//! | what the frontend can call   | [`commands`]             |
//! | triage ranking               | [`triage`]               |
//!
//! ## The one architectural rule
//!
//! `commands` is the *only* surface the webview can reach. Nothing else in this
//! tree is callable from TypeScript, and in particular no Canvas credential is
//! ever readable from the webview (SPEC.md §1). If a feature seems to need the
//! frontend to hold a token, the feature is designed wrong.

pub mod canvas;
pub mod commands;
pub mod db;
pub mod grades;
pub mod ical;
pub mod mcp;
pub mod notify;
pub mod settings;
pub mod triage;

use tauri::Manager;

/// Build and run the desktop app.
///
/// Registers plugins first, then commands, then shows the window. Plugin order
/// does not matter to Tauri, but it is kept alphabetical here so a missing one
/// is obvious at a glance.
///
/// # Panics
/// Panics if the Tauri context cannot be generated or the event loop fails to
/// start. Both are unrecoverable — there is no app without them — so a panic
/// with Tauri's own message is more useful than any error we could invent.
pub fn run() {
    init_tracing();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init());

    // Autostart is desktop-only. §6 wants the app to launch minimised to tray at
    // login, because reminders are worthless if the app only runs when you
    // remember to open it — but it is registered disabled here and only enabled
    // from Settings in M4. Silently adding a login item at first launch is
    // exactly the kind of thing that makes people uninstall software.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use tauri_plugin_autostart::MacosLauncher;
        builder = builder.plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ));
    }

    builder
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_preferred_theme,
            commands::settings::set_preferred_theme,
            commands::sync::get_sync_status,
        ])
        .setup(|app| {
            // Resolving the config directory once, at startup, means every later
            // failure to read settings is a real error rather than "the
            // directory did not exist yet".
            let dir = app.path().app_config_dir()?;
            std::fs::create_dir_all(&dir)?;
            tracing::info!(config_dir = %dir.display(), "app config directory ready");

            // TODO(M1): open the SQLite pool, run migrations, restore the
            //           session from the keyring, and kick off the first sync.
            // TODO(M4): build the tray icon with "Sync now" and the next three
            //           deadlines, and start minimised when launched at login.
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Semester Command");
}

/// Initialise `tracing`.
///
/// Defaults to `info` for our own crate and `warn` for everything else, because
/// `reqwest` and `sqlx` at `info` bury the one line you actually wanted. Override
/// with `RUST_LOG=semester_command_lib=debug`.
fn init_tracing() {
    use tracing_subscriber::EnvFilter;

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("warn,semester_command_lib=info"));

    // `try_init` rather than `init`: the test harness may have installed a
    // subscriber already, and panicking there would fail tests for a logging
    // detail.
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .try_init();
}
