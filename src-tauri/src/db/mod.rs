//! SQLite storage: schema, queries, and non-destructive sync writes.
//!
//! Called by: [`crate::commands`] and the sync engine.
//! Calls: sqlx.
//!
//! # The invariant that matters most
//!
//! **Sync never wipes and rebuilds.** It upserts by Canvas ID. `targets` and
//! `estimates` are the user's own data — a target grade, a time estimate, a
//! note about an assignment — and they exist nowhere else. A drop-and-recreate
//! sync would destroy them, and the user would not notice until the next time
//! they opened the app expecting their planning to still be there (§3).
//!
//! Manual and ICS-sourced rows survive an API sync for the same reason. Every
//! synced table carries a `source` column (`api` | `ics` | `manual`), and the
//! UI marks anything that is not `api`.

pub mod queries;
pub mod schema;
pub mod upsert;

// TODO(M1): `pool()` — opens the SQLite pool at the app data dir and runs
//           `migrations/` on startup. WAL mode; the app is single-user and
//           single-process, but the MCP server in M5 opens the same file
//           read-only while the desktop app is running.
