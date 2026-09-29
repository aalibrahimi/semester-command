//! Study content from Railway: guides and videos, cached locally.
//!
//! Job: on launch (and on demand from Settings), compare what Railway
//! Postgres holds in schema `content` with the local cache (migration 0017),
//! download only what changed, and drop what was removed. The webview then
//! reads guides and video paths from the cache through `commands::content`.
//!
//! Called by: `lib.rs` (a background sync at startup) and
//! `commands::content`. Calls: sqlx (Postgres for Railway, SQLite for the
//! cache) and the filesystem.
//!
//! Publishing side: `scripts/content-sync.ts` (`bun run content:push`)
//! writes the tables read here:
//!   content.guides (id, course, position, sha256, summary jsonb, body jsonb)
//!   content.assets (path, sha256, mime, size, body bytea)
//!
//! Credentials: the Railway URL is DATABASE_URL, the same one `db:push`
//! uses. It is looked up in the process environment, then in the project's
//! `.env` (dev builds only), then in `<app config>/content.env`. It is never
//! logged, never stored in SQLite, and never sent to the webview.
//! No URL means content sync is simply off, and the bundled guides are used.

use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::Serialize;
use sqlx::postgres::PgPoolOptions;
use sqlx::Row;

use crate::db::Db;

/// Where cached files live, under the app data directory.
pub const ASSET_DIR: &str = "study-assets";

#[derive(Debug, Default, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReport {
    pub guides_updated: u32,
    pub guides_removed: u32,
    pub assets_updated: u32,
    pub assets_removed: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum ContentError {
    #[error("content sync is off: no DATABASE_URL (put it in .env, or in content.env in the app config folder)")]
    NotConfigured,
    #[error("could not reach the content server: {0}")]
    Remote(String),
    #[error("local content cache failed: {0}")]
    Local(String),
    #[error("refusing an unsafe asset path: {0}")]
    BadPath(String),
}

/// Find the Railway URL without ever printing it.
pub fn database_url(config_dir: &Path) -> Option<String> {
    if let Ok(v) = std::env::var("DATABASE_URL") {
        if !v.trim().is_empty() {
            return Some(v.trim().to_string());
        }
    }
    let mut files: Vec<PathBuf> = Vec::new();
    if cfg!(debug_assertions) {
        // `npm run tauri dev`: the project's .env, next to src-tauri/.
        files.push(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("..")
                .join(".env"),
        );
    }
    files.push(config_dir.join("content.env"));
    files
        .into_iter()
        .find_map(|f| read_env_value(&f, "DATABASE_URL"))
}

/// `KEY=value` (optionally quoted, optionally `export KEY=…`) from an env file.
fn read_env_value(file: &Path, key: &str) -> Option<String> {
    let text = std::fs::read_to_string(file).ok()?;
    parse_env_value(&text, key)
}

fn parse_env_value(text: &str, key: &str) -> Option<String> {
    for line in text.lines() {
        let line = line.trim();
        let line = line.strip_prefix("export ").unwrap_or(line);
        if let Some(rest) = line.strip_prefix(key) {
            if let Some(v) = rest.trim_start().strip_prefix('=') {
                let v = v.trim().trim_matches(|c| c == '"' || c == '\'');
                if !v.is_empty() {
                    return Some(v.to_string());
                }
            }
        }
    }
    None
}

/// An asset path is `dir/name.ext` made of safe characters, never `..`.
pub fn safe_asset_path(p: &str) -> Result<&str, ContentError> {
    let ok = !p.is_empty()
        && !p.starts_with('/')
        && !p
            .split('/')
            .any(|seg| seg.is_empty() || seg == "." || seg == "..")
        && p.chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | '/'));
    if ok {
        Ok(p)
    } else {
        Err(ContentError::BadPath(p.to_string()))
    }
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

async fn set_meta(db: &Db, key: &str, value: &str) {
    let _ = sqlx::query("INSERT INTO content_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(key)
        .bind(value)
        .execute(db)
        .await;
}

pub async fn get_meta(db: &Db, key: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT value FROM content_meta WHERE key = ?")
        .bind(key)
        .fetch_optional(db)
        .await
        .ok()
        .flatten()
}

/// Pull what changed from Railway into the cache.
///
/// # Errors
/// [`ContentError::NotConfigured`] without a URL; `Remote` when Railway is
/// unreachable (the cache is left as it was); `Local` for SQLite or disk.
pub async fn sync(db: &Db, config_dir: &Path, data_dir: &Path) -> Result<SyncReport, ContentError> {
    let url = database_url(config_dir).ok_or(ContentError::NotConfigured)?;
    let result = sync_with(db, &url, data_dir).await;
    match &result {
        Ok(r) => {
            set_meta(db, "last_sync_at", &now_iso()).await;
            set_meta(db, "last_error", "").await;
            tracing::info!(?r, "content sync done");
        }
        Err(e) => {
            set_meta(db, "last_error", &e.to_string()).await;
            tracing::warn!(error = %e, "content sync failed");
        }
    }
    result
}

async fn sync_with(db: &Db, url: &str, data_dir: &Path) -> Result<SyncReport, ContentError> {
    let remote = |e: sqlx::Error| ContentError::Remote(e.to_string());
    let local = |e: sqlx::Error| ContentError::Local(e.to_string());

    let pg = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .connect(url)
        .await
        .map_err(remote)?;

    let mut report = SyncReport::default();

    // ── Guides ──────────────────────────────────────────────────────────
    let rows = sqlx::query("SELECT id, course, position, sha256 FROM content.guides")
        .fetch_all(&pg)
        .await
        .map_err(remote)?;
    let have: std::collections::HashMap<String, String> =
        sqlx::query("SELECT id, sha FROM content_guide")
            .fetch_all(db)
            .await
            .map_err(local)?
            .into_iter()
            .map(|r| (r.get::<String, _>("id"), r.get::<String, _>("sha")))
            .collect();

    let mut remote_ids = std::collections::HashSet::new();
    for r in &rows {
        let id: String = r.get("id");
        let sha: String = r.get("sha256");
        remote_ids.insert(id.clone());
        if have.get(&id) == Some(&sha) {
            continue;
        }
        let full = sqlx::query(
            "SELECT summary::text AS summary, body::text AS body FROM content.guides WHERE id = $1",
        )
        .bind(&id)
        .fetch_one(&pg)
        .await
        .map_err(remote)?;
        let course: String = r.get("course");
        let position: i32 = r.get("position");
        sqlx::query(
            "INSERT INTO content_guide (id, course, position, sha, summary, body, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET course = excluded.course, position = excluded.position, sha = excluded.sha,
               summary = excluded.summary, body = excluded.body, synced_at = excluded.synced_at",
        )
        .bind(&id)
        .bind(&course)
        .bind(position)
        .bind(&sha)
        .bind(full.get::<String, _>("summary"))
        .bind(full.get::<String, _>("body"))
        .bind(now_iso())
        .execute(db)
        .await
        .map_err(local)?;
        report.guides_updated += 1;
    }
    for id in have.keys().filter(|id| !remote_ids.contains(*id)) {
        sqlx::query("DELETE FROM content_guide WHERE id = ?")
            .bind(id)
            .execute(db)
            .await
            .map_err(local)?;
        report.guides_removed += 1;
    }

    // ── Assets ──────────────────────────────────────────────────────────
    let root = data_dir.join(ASSET_DIR);
    let rows = sqlx::query("SELECT path, sha256, mime, size FROM content.assets")
        .fetch_all(&pg)
        .await
        .map_err(remote)?;
    let have: std::collections::HashMap<String, String> =
        sqlx::query("SELECT path, sha FROM content_asset")
            .fetch_all(db)
            .await
            .map_err(local)?
            .into_iter()
            .map(|r| (r.get::<String, _>("path"), r.get::<String, _>("sha")))
            .collect();
    let mut remote_paths = std::collections::HashSet::new();
    for r in &rows {
        let path: String = r.get("path");
        let sha: String = r.get("sha256");
        let rel = safe_asset_path(&path)?.to_string();
        remote_paths.insert(rel.clone());
        let file = root.join(&rel);
        if have.get(&rel) == Some(&sha) && file.exists() {
            continue;
        }
        let bytes: Vec<u8> = sqlx::query_scalar("SELECT body FROM content.assets WHERE path = $1")
            .bind(&path)
            .fetch_one(&pg)
            .await
            .map_err(remote)?;
        if let Some(parent) = file.parent() {
            std::fs::create_dir_all(parent).map_err(|e| ContentError::Local(e.to_string()))?;
        }
        // Write to a temp name and rename, so a half-downloaded video never
        // looks complete.
        let tmp = file.with_extension("part");
        std::fs::write(&tmp, &bytes).map_err(|e| ContentError::Local(e.to_string()))?;
        std::fs::rename(&tmp, &file).map_err(|e| ContentError::Local(e.to_string()))?;
        sqlx::query(
            "INSERT INTO content_asset (path, sha, mime, size, synced_at) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(path) DO UPDATE SET sha = excluded.sha, mime = excluded.mime, size = excluded.size, synced_at = excluded.synced_at",
        )
        .bind(&rel)
        .bind(&sha)
        .bind(r.get::<String, _>("mime"))
        .bind(r.get::<i64, _>("size"))
        .bind(now_iso())
        .execute(db)
        .await
        .map_err(local)?;
        report.assets_updated += 1;
    }
    for p in have.keys().filter(|p| !remote_paths.contains(*p)) {
        if safe_asset_path(p).is_ok() {
            let _ = std::fs::remove_file(root.join(p));
        }
        sqlx::query("DELETE FROM content_asset WHERE path = ?")
            .bind(p)
            .execute(db)
            .await
            .map_err(local)?;
        report.assets_removed += 1;
    }

    pg.close().await;
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn env_values_are_parsed() {
        let text = "# comment\nFOO=1\nexport DATABASE_URL=\"postgres://u:p@h:5432/db\"\n";
        assert_eq!(
            parse_env_value(text, "DATABASE_URL").as_deref(),
            Some("postgres://u:p@h:5432/db")
        );
        assert_eq!(
            parse_env_value("DATABASE_URL = 'x'", "DATABASE_URL").as_deref(),
            Some("x")
        );
        assert_eq!(
            parse_env_value("DATABASE_URL_OTHER=y", "DATABASE_URL"),
            None
        );
        assert_eq!(parse_env_value("DATABASE_URL=", "DATABASE_URL"), None);
    }

    #[test]
    fn asset_paths_are_confined() {
        assert!(safe_asset_path("study-videos/cs146-hash-tables.mp4").is_ok());
        for bad in [
            "../x.mp4",
            "/etc/passwd",
            "a//b",
            "a/./b",
            "a b.mp4",
            "",
            "study-videos/../../x",
        ] {
            assert!(safe_asset_path(bad).is_err(), "{bad}");
        }
    }

    /// End to end against a real Postgres that `content:push` has filled:
    ///   CONTENT_TEST_PG=postgres://… cargo test --lib content -- --ignored
    #[tokio::test]
    #[ignore = "needs a Postgres with the content schema"]
    async fn sync_pulls_and_is_idempotent() {
        let url = std::env::var("CONTENT_TEST_PG").expect("CONTENT_TEST_PG");
        std::env::set_var("DATABASE_URL", &url);
        let dir = std::env::temp_dir().join(format!("content-test-{}", std::process::id()));
        let db = crate::db::open(&dir).await.unwrap();
        let first = sync(&db, &dir, &dir).await.unwrap();
        assert!(first.guides_updated > 0, "{first:?}");
        let again = sync(&db, &dir, &dir).await.unwrap();
        assert_eq!(
            (again.guides_updated, again.assets_updated),
            (0, 0),
            "second sync should download nothing"
        );
        let n: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM content_asset")
            .fetch_one(&db)
            .await
            .unwrap();
        for p in sqlx::query_scalar::<_, String>("SELECT path FROM content_asset")
            .fetch_all(&db)
            .await
            .unwrap()
        {
            assert!(dir.join(ASSET_DIR).join(&p).exists(), "{p} not on disk");
        }
        assert!(n > 0);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
