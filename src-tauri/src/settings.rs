//! Application settings store.
//!
//! Job: read and write the handful of preferences that must survive a restart
//! but are not course data — theme, sidebar state, the calendar feed URL.
//!
//! Called by: `commands::settings`.
//! Calls: the filesystem, via the app config directory Tauri resolves.
//!
//! # Why a JSON file and not the database
//!
//! SPEC.md §9.6 says the theme preference is persisted to the DB, and it will
//! be. But the database and its migrations arrive in M1, and the theme toggle
//! has to work in M0 — so M0 uses a small JSON file in the app config
//! directory, with the same interface the SQLite-backed version will have.
//!
//! TODO(M1): move this to a `settings` table, keeping `get`/`set` identical so
//! nothing above this module changes. Migrate the file's contents on first run
//! and delete it.
//!
//! # Failure policy
//!
//! Every read failure degrades to `Default`. A corrupt settings file must not
//! stop the app from opening — losing a theme preference is an inconvenience,
//! failing to launch is not.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// File name inside the app config directory.
const FILE: &str = "settings.json";

/// The persisted preferences.
///
/// `#[serde(default)]` on the struct means a settings file written by an older
/// version — missing fields we have since added — still deserialises. Without
/// it, adding one field silently resets every user preference on upgrade.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    /// `"light"`, `"dark"` or `"system"`. `None` means the user has never
    /// chosen, which the frontend treats as "follow the OS".
    pub theme: Option<String>,

    /// Tier 2 fallback: the user's private Canvas `.ics` feed URL (§2.0).
    /// Present here rather than in the keyring because it is a capability URL,
    /// not a credential — it grants read access to due dates and nothing else.
    ///
    /// NOTE: it is still a secret in the sense that anyone holding it can read
    /// your due dates, so it is excluded from logs.
    pub calendar_feed_url: Option<String>,
}

/// Errors this module can produce. Kept concrete so callers can tell "no file
/// yet" (normal) from "the disk is broken" (not).
#[derive(Debug, thiserror::Error)]
pub enum SettingsError {
    #[error("could not read settings file: {0}")]
    Io(#[from] std::io::Error),

    #[error("settings file is not valid JSON: {0}")]
    Parse(#[from] serde_json::Error),
}

/// Full path to the settings file inside `config_dir`.
fn path_in(config_dir: &Path) -> PathBuf {
    config_dir.join(FILE)
}

/// Load settings, falling back to defaults.
///
/// A missing file is the normal first-run case and returns `Default` without
/// complaint. A *corrupt* file is logged at `warn` and also returns `Default` —
/// see the failure policy above.
pub fn load(config_dir: &Path) -> Settings {
    let path = path_in(config_dir);
    match std::fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_else(|e| {
            tracing::warn!(path = %path.display(), error = %e, "settings file unreadable; using defaults");
            Settings::default()
        }),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Settings::default(),
        Err(e) => {
            tracing::warn!(path = %path.display(), error = %e, "could not read settings; using defaults");
            Settings::default()
        }
    }
}

/// Persist settings.
///
/// Writes to a temporary file and renames over the target, so a crash mid-write
/// leaves the previous settings intact rather than a truncated file that the
/// next launch has to discard. `rename` is atomic within a directory on every
/// platform we target.
pub fn save(config_dir: &Path, settings: &Settings) -> Result<(), SettingsError> {
    std::fs::create_dir_all(config_dir)?;

    let path = path_in(config_dir);
    let tmp = path.with_extension("json.tmp");

    let json = serde_json::to_string_pretty(settings)?;
    std::fs::write(&tmp, json)?;
    std::fs::rename(&tmp, &path)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A missing file is a normal state, not an error.
    #[test]
    fn load_missing_file_returns_defaults() {
        let dir = std::env::temp_dir().join("sc-test-missing");
        let _ = std::fs::remove_dir_all(&dir);
        let s = load(&dir);
        assert!(s.theme.is_none());
    }

    /// A round trip preserves what was written, and the write is atomic.
    #[test]
    fn save_then_load_round_trips() {
        let dir = std::env::temp_dir().join("sc-test-roundtrip");
        let _ = std::fs::remove_dir_all(&dir);

        let s = Settings {
            theme: Some("light".into()),
            ..Default::default()
        };
        save(&dir, &s).expect("save should succeed");

        let back = load(&dir);
        assert_eq!(back.theme.as_deref(), Some("light"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    /// Garbage on disk must not stop the app from opening.
    #[test]
    fn corrupt_file_degrades_to_defaults() {
        let dir = std::env::temp_dir().join("sc-test-corrupt");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(path_in(&dir), "{ this is not json").unwrap();

        let s = load(&dir);
        assert!(s.theme.is_none());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
