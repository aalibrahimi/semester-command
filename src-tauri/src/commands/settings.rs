//! Settings commands: the preferences the frontend owns the UI for.
//!
//! Called by: `src/lib/ipc.ts` (`getPreferredTheme`, `setPreferredTheme`).
//! Calls: [`crate::settings`].

use tauri::{AppHandle, Manager};

use super::{CommandError, CommandResult};
use crate::settings;

/// Resolve the app config directory, creating it if needed.
///
/// Every settings command needs this and every one of them should fail the same
/// way if the platform will not give us a config directory — which in practice
/// means the OS is in a state where nothing else will work either.
fn config_dir(app: &AppHandle) -> CommandResult<std::path::PathBuf> {
    app.path().app_config_dir().map_err(|e| {
        CommandError::storage(format!("Could not find a place to store settings: {e}"))
    })
}

/// The persisted theme preference, or `None` if the user has never set one.
///
/// Returns `None` rather than a default so the frontend can tell "never chosen"
/// (follow the OS) from "explicitly chose system" — they behave the same today
/// but the distinction matters the moment we add a first-run experience.
#[tauri::command]
pub fn get_preferred_theme(app: AppHandle) -> CommandResult<Option<String>> {
    let dir = config_dir(&app)?;
    Ok(settings::load(&dir).theme)
}

/// Persist the theme preference.
///
/// # Errors
/// Returns [`crate::commands::ErrorKind::Storage`] if the settings file cannot
/// be written. The frontend deliberately ignores this: the localStorage mirror
/// already carried the change, so the only consequence is that the preference
/// does not survive a restart.
/// The stored Tier 2 calendar feed URL, if any.
#[tauri::command]
pub fn get_calendar_feed_url(app: AppHandle) -> CommandResult<Option<String>> {
    let dir = config_dir(&app)?;
    Ok(settings::load(&dir).calendar_feed_url)
}

/// Store (or clear, with `None`/empty) the Tier 2 calendar feed URL.
///
/// Light validation only — a wrong-but-https URL fails loudly at import time
/// with a better message than any guess we could make here.
#[tauri::command]
pub fn set_calendar_feed_url(app: AppHandle, url: Option<String>) -> CommandResult<()> {
    let url = url.map(|u| u.trim().to_string()).filter(|u| !u.is_empty());
    if let Some(u) = &url {
        if !u.starts_with("https://") {
            return Err(CommandError::internal(
                "That doesn't look like a feed URL — it should start with https://",
            ));
        }
    }
    let dir = config_dir(&app)?;
    let mut current = settings::load(&dir);
    current.calendar_feed_url = url;
    settings::save(&dir, &current)
        .map_err(|e| CommandError::storage(format!("Could not save the feed URL: {e}")))
}

#[tauri::command]
pub fn set_preferred_theme(app: AppHandle, mode: String) -> CommandResult<()> {
    // Validate rather than trust. The webview is our own code, but a command is
    // a public API surface and writing an arbitrary string into the settings
    // file would let a typo silently disable theming on the next launch.
    if !matches!(mode.as_str(), "light" | "dark" | "system") {
        return Err(CommandError::internal(format!(
            "Unknown theme \"{mode}\" — expected light, dark or system"
        )));
    }

    let dir = config_dir(&app)?;
    let mut current = settings::load(&dir);
    current.theme = Some(mode);

    settings::save(&dir, &current)
        .map_err(|e| CommandError::storage(format!("Could not save your theme preference: {e}")))
}
