//! Credential storage: OS keyring first, `0600` file fallback (SPEC.md §1).
//!
//! Called by: `commands::auth` (store/clear on login and logout) and `lib.rs`
//! (restore at startup).
//! Calls: the `keyring` crate and the filesystem.
//!
//! # Why the file fallback is not hypothetical on Windows
//!
//! Windows Credential Manager caps a credential blob at 2560 bytes
//! (`CRED_MAX_CREDENTIAL_BLOB_SIZE`). A harvested Canvas cookie header —
//! `canvas_session` plus the CSRF and log cookies — can exceed that, in which
//! case `set_password` fails even though the keyring itself is healthy. The
//! fallback file in the app config dir handles both that and a broken keyring,
//! and [`Backend`] is reported upward so the UI can say which one is in use.
//!
//! Both stores are treated as short-lived: SSO sessions expire and the app is
//! expected to re-authenticate (§2.0). Losing a stored credential is an
//! inconvenience, never data loss.

use std::path::{Path, PathBuf};

/// Keyring service name shared by both credential slots.
const SERVICE: &str = "semester-command";

/// Which physical store is holding a credential.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Backend {
    Keyring,
    File,
}

/// The two credential kinds (§2.0). Token is Tier 0, cookies are Tier 1.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Slot {
    Token,
    Session,
}

impl Slot {
    /// Keyring username / fallback file stem for this slot.
    fn key(self) -> &'static str {
        match self {
            Slot::Token => "canvas-token",
            Slot::Session => "canvas-session",
        }
    }
}

/// A credential restored at startup, tagged with where it was found.
#[derive(Debug)]
pub struct Restored {
    pub slot: Slot,
    pub secret: String,
    pub backend: Backend,
}

/// Handle to both credential slots. Cheap to clone; holds only the config dir.
#[derive(Debug, Clone)]
pub struct SessionStore {
    config_dir: PathBuf,
}

impl SessionStore {
    pub fn new(config_dir: PathBuf) -> Self {
        Self { config_dir }
    }

    /// Store a secret, keyring first, file on any keyring failure.
    ///
    /// Returns the backend that actually took the write. The previous copy in
    /// the *other* backend is removed so a later `load` cannot resurrect a
    /// stale credential from the store we stopped using.
    pub fn store(&self, slot: Slot, secret: &str) -> Result<Backend, String> {
        match keyring::Entry::new(SERVICE, slot.key()).and_then(|e| e.set_password(secret)) {
            Ok(()) => {
                let _ = std::fs::remove_file(self.file_path(slot));
                Ok(Backend::Keyring)
            }
            Err(e) => {
                tracing::warn!(
                    slot = slot.key(),
                    error = %e,
                    "keyring write failed; falling back to config-dir file"
                );
                self.write_file(slot, secret).map_err(|io| {
                    format!("keyring failed ({e}) and so did the fallback file: {io}")
                })?;
                Ok(Backend::File)
            }
        }
    }

    /// Restore whichever credential exists, preferring the token.
    ///
    /// Tier 0 outranks Tier 1 (§2.0): an admin-issued token is stabler than a
    /// browser session, so if both are somehow present the token wins.
    pub fn load(&self) -> Option<Restored> {
        for slot in [Slot::Token, Slot::Session] {
            if let Some((secret, backend)) = self.load_slot(slot) {
                return Some(Restored { slot, secret, backend });
            }
        }
        None
    }

    fn load_slot(&self, slot: Slot) -> Option<(String, Backend)> {
        match keyring::Entry::new(SERVICE, slot.key()).and_then(|e| e.get_password()) {
            Ok(secret) => return Some((secret, Backend::Keyring)),
            Err(keyring::Error::NoEntry) => {}
            Err(e) => {
                tracing::warn!(slot = slot.key(), error = %e, "keyring read failed; trying fallback file");
            }
        }
        let path = self.file_path(slot);
        match std::fs::read_to_string(&path) {
            Ok(secret) if !secret.trim().is_empty() => Some((secret, Backend::File)),
            Ok(_) => None,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
            Err(e) => {
                tracing::warn!(path = %path.display(), error = %e, "fallback credential file unreadable");
                None
            }
        }
    }

    /// Remove a credential from *both* backends.
    ///
    /// Deliberately not fail-fast: a keyring error must not leave the fallback
    /// file behind, so both removals always run and errors are combined.
    pub fn clear(&self, slot: Slot) -> Result<(), String> {
        let mut problems = Vec::new();

        match keyring::Entry::new(SERVICE, slot.key()).and_then(|e| e.delete_credential()) {
            Ok(()) | Err(keyring::Error::NoEntry) => {}
            Err(e) => problems.push(format!("keyring: {e}")),
        }
        match std::fs::remove_file(self.file_path(slot)) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => problems.push(format!("file: {e}")),
        }

        if problems.is_empty() {
            Ok(())
        } else {
            Err(problems.join("; "))
        }
    }

    /// Remove everything from every backend — the "sign out" button.
    pub fn clear_all(&self) -> Result<(), String> {
        let a = self.clear(Slot::Token);
        let b = self.clear(Slot::Session);
        match (a, b) {
            (Ok(()), Ok(())) => Ok(()),
            (r1, r2) => Err([r1.err(), r2.err()].into_iter().flatten().collect::<Vec<_>>().join("; ")),
        }
    }

    fn file_path(&self, slot: Slot) -> PathBuf {
        self.config_dir.join(format!("{}.dat", slot.key()))
    }

    /// Write the fallback file with owner-only permissions.
    ///
    /// `0600` is enforced on Unix. On Windows the app config dir under
    /// `%APPDATA%` is already scoped to the user's ACL, which is the platform
    /// equivalent — there is no mode-bits API to tighten further without
    /// hand-writing ACLs, and the keyring is the primary store anyway.
    fn write_file(&self, slot: Slot, secret: &str) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.config_dir)?;
        let path = self.file_path(slot);
        std::fs::write(&path, secret)?;
        set_owner_only(&path)?;
        Ok(())
    }
}

#[cfg(unix)]
fn set_owner_only(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
}

#[cfg(not(unix))]
fn set_owner_only(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store_in(name: &str) -> SessionStore {
        let dir = std::env::temp_dir().join(name);
        let _ = std::fs::remove_dir_all(&dir);
        SessionStore::new(dir)
    }

    // These tests exercise ONLY the file path. `load_slot`, `store` and
    // `clear` consult the OS keyring under the real service name, and a test
    // run on a dev machine must never read — let alone delete — the
    // developer's actual stored Canvas session. Keyring behaviour is verified
    // manually as part of the M1 acceptance checklist instead.

    /// The fallback file round-trips.
    #[test]
    fn file_fallback_round_trips() {
        let store = store_in("sc-test-session-store");
        store
            .write_file(Slot::Session, "cookie=abc")
            .expect("file write should succeed");

        let raw = std::fs::read_to_string(store.file_path(Slot::Session)).unwrap();
        assert_eq!(raw, "cookie=abc");
    }

    /// The two slots write to distinct files.
    #[test]
    fn slots_do_not_collide() {
        let store = store_in("sc-test-session-store-slots");
        store.write_file(Slot::Token, "tok").unwrap();
        store.write_file(Slot::Session, "cookie").unwrap();
        assert_ne!(store.file_path(Slot::Token), store.file_path(Slot::Session));
        assert_eq!(std::fs::read_to_string(store.file_path(Slot::Token)).unwrap(), "tok");
    }
}
