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

use std::path::Path;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

/// The one pool. Clone freely — it is a handle.
pub type Db = sqlx::SqlitePool;

/// Open (creating if missing) the database and run migrations.
///
/// WAL mode: the app is single-user and single-process today, but the MCP
/// server in M5 opens this same file while the desktop app is running, and
/// WAL is what makes concurrent reader + writer safe.
///
/// # Errors
/// Anything sqlx raises opening the file or running `migrations/`. A failed
/// migration is fatal to the caller — running against half a schema corrupts
/// more than it saves.
pub async fn open(data_dir: &Path) -> Result<Db, sqlx::Error> {
    std::fs::create_dir_all(data_dir).map_err(sqlx::Error::Io)?;
    let path = data_dir.join("semester-command.db");

    let opts = SqliteConnectOptions::new()
        .filename(&path)
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        // NORMAL is durable enough under WAL and much faster than FULL; a
        // grade cache can always be re-synced, unlike a ledger.
        .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(opts)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!(db = %path.display(), "database open, migrations current");
    Ok(pool)
}

/// Now, as the RFC 3339 UTC string every timestamp column stores.
pub fn now_rfc3339() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}
