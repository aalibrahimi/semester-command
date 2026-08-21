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
pub mod syllabus;
pub mod sync;
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
        .plugin(tauri_plugin_dialog::init())
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
            commands::auth::auth_status,
            commands::auth::clear_session,
            commands::auth::harvest_session,
            commands::auth::open_canvas_login,
            commands::auth::set_access_token,
            commands::data::calendar_items,
            commands::data::fetch_syllabus_from_canvas,
            commands::data::import_syllabus_file,
            commands::data::set_instructor_starred,
            commands::data::syllabi,
            commands::data::debug_dump,
            commands::data::debug_force_reconnect,
            commands::data::debug_overview,
            commands::data::list_instructors,
            commands::data::save_instructor_note,
            commands::data::save_manual_assignment,
            commands::data::save_manual_course,
            commands::data::save_manual_group,
            commands::data::save_manual_score,
            commands::data::set_estimate,
            commands::data::triage_rows,
            commands::grades::course_detail,
            commands::grades::course_summaries,
            commands::grades::set_course_hidden,
            commands::grades::set_target,
            commands::grades::what_do_i_need,
            commands::settings::get_calendar_feed_url,
            commands::settings::get_preferred_theme,
            commands::settings::set_calendar_feed_url,
            commands::settings::set_preferred_theme,
            commands::sync::get_sync_status,
            commands::sync::trigger_ics_import,
            commands::sync::trigger_sync,
        ])
        .setup(|app| {
            // Resolving the config directory once, at startup, means every later
            // failure to read settings is a real error rather than "the
            // directory did not exist yet".
            let dir = app.path().app_config_dir()?;
            std::fs::create_dir_all(&dir)?;
            tracing::info!(config_dir = %dir.display(), "app config directory ready");

            // The database opens before anything that might read it. Blocking
            // setup on this is deliberate: every screen assumes the pool
            // exists, and migrations failing is a stop-the-world problem.
            let data_dir = app.path().app_data_dir()?;
            let pool = tauri::async_runtime::block_on(db::open(&data_dir))?;
            app.manage(pool);
            app.manage(sync::SyncState::new());

            setup_auth(app.handle().clone(), dir);
            setup_sync_schedule(app.handle().clone());

            // TODO(M4): build the tray icon with "Sync now" and the next three
            //           deadlines, and start minimised when launched at login.
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Semester Command");
}

/// Build the Canvas client, restore any stored credential, and manage the
/// shared [`commands::auth::AuthCtx`].
///
/// The restored credential is *presumed* alive for instant startup, then
/// validated in a background task — SSO sessions routinely die overnight, and
/// the difference between "session restored" and "session restored but dead"
/// is exactly what the reconnect banner exists to show (§2.0). Blocking
/// startup on a network round-trip would be the wrong trade.
fn setup_auth(app: tauri::AppHandle, config_dir: std::path::PathBuf) {
    use canvas::client::{AuthMode, CanvasClient, BASE_URL};
    use canvas::session_store::{SessionStore, Slot};
    use commands::auth::AuthCtx;

    // Raw response bodies land next to the config, not in the repo (§2.2).
    let raw_dir = config_dir.join("raw");
    let client = std::sync::Arc::new(CanvasClient::new(BASE_URL, Some(raw_dir)));
    let store = SessionStore::new(config_dir);

    let restored = store.load();
    let ctx = AuthCtx::new(client.clone(), store);
    if let Some(r) = &restored {
        *ctx.backend.lock().unwrap() = Some(r.backend);
    }
    app.manage(ctx);

    if let Some(r) = restored {
        let mode = match r.slot {
            Slot::Token => AuthMode::Token(r.secret),
            Slot::Session => AuthMode::Session { cookie_header: r.secret },
        };
        tracing::info!(slot = ?r.slot, backend = ?r.backend, "credential restored from storage");

        tauri::async_runtime::spawn(async move {
            client.set_auth(mode.clone()).await;
            match client.validate(&mode).await {
                Ok(user) => {
                    let ctx = app.state::<AuthCtx>();
                    *ctx.validated_as.lock().unwrap() = user.name.clone();
                    tracing::info!(user = ?user.name, "restored session validated");
                    commands::auth::emit_status(&app, None).await;
                    // Sync on launch (§6) — but only once the credential is
                    // proven, so a dead session shows the reconnect banner
                    // instead of a wall of failed-sync noise.
                    sync::run(&app, false).await;
                }
                Err(e) => {
                    // validate() already marked the client dead on session
                    // death; the footer picks it up as ReconnectRequired.
                    tracing::info!(error = %e, "restored credential no longer works");
                    commands::auth::emit_status(
                        &app,
                        Some("Your saved Canvas session has expired — sign in again.".into()),
                    )
                    .await;
                }
            }
        });
    }
}

/// The 30-minute background sync loop (§6).
///
/// The interval fires unconditionally; `sync::run` itself declines when the
/// floor hasn't elapsed, when a run is already going, or when there is no
/// usable credential — keeping every "should we sync" rule in one place.
fn setup_sync_schedule(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval =
            tokio::time::interval(std::time::Duration::from_secs(30 * 60));
        // The first tick fires immediately; skip it — launch sync is handled
        // by setup_auth once the credential is validated.
        interval.tick().await;
        loop {
            interval.tick().await;
            sync::run(&app, false).await;
        }
    });
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
