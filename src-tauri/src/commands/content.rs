//! Content cache commands: the Study views read guides and video paths the
//! launch sync pulled from Railway (see [`crate::content`]).
//!
//! Called by: `src/lib/ipc.ts` (`contentManifest`, `contentGuide`,
//! `contentAsset`, `contentStatus`, `contentSync`).
//! Calls: [`crate::content`], sqlx.
//!
//! Nothing here returns or accepts the Railway URL.

use serde::Serialize;
use sqlx::Row;
use tauri::{AppHandle, Emitter, Manager};

use super::{CommandError, CommandResult};
use crate::content::{self, ContentError, SyncReport};
use crate::db::Db;

fn db_of(app: &AppHandle) -> Db {
    app.state::<Db>().inner().clone()
}

fn local(e: sqlx::Error) -> CommandError {
    CommandError::storage(format!("Content cache failed: {e}"))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestRow {
    pub id: String,
    pub course: String,
    pub position: i64,
    pub sha: String,
    /// GuideSummary as JSON text.
    pub summary: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentStatus {
    pub configured: bool,
    pub last_sync_at: Option<String>,
    pub last_error: Option<String>,
    pub guides: i64,
    pub assets: i64,
}

/// Every cached guide's summary (no bodies: those load on open).
#[tauri::command]
pub async fn content_manifest(app: AppHandle) -> CommandResult<Vec<ManifestRow>> {
    let rows = sqlx::query(
        "SELECT id, course, position, sha, summary FROM content_guide ORDER BY course, position",
    )
    .fetch_all(&db_of(&app))
    .await
    .map_err(local)?;
    Ok(rows
        .into_iter()
        .map(|r| ManifestRow {
            id: r.get("id"),
            course: r.get("course"),
            position: r.get("position"),
            sha: r.get("sha"),
            summary: r.get("summary"),
        })
        .collect())
}

/// One cached guide's JSON, or None.
#[tauri::command]
pub async fn content_guide(app: AppHandle, id: String) -> CommandResult<Option<String>> {
    sqlx::query_scalar::<_, String>("SELECT body FROM content_guide WHERE id = ?")
        .bind(id)
        .fetch_optional(&db_of(&app))
        .await
        .map_err(local)
}

/// Absolute path of a cached asset (for `convertFileSrc`), or None when this
/// computer hasn't downloaded it yet.
#[tauri::command]
pub async fn content_asset(app: AppHandle, path: String) -> CommandResult<Option<String>> {
    let rel = content::safe_asset_path(&path).map_err(|e| CommandError::internal(e.to_string()))?;
    let known: Option<String> = sqlx::query_scalar("SELECT path FROM content_asset WHERE path = ?")
        .bind(rel)
        .fetch_optional(&db_of(&app))
        .await
        .map_err(local)?;
    if known.is_none() {
        return Ok(None);
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::internal(e.to_string()))?;
    let file = dir.join(content::ASSET_DIR).join(rel);
    Ok(file.exists().then(|| file.to_string_lossy().into_owned()))
}

#[tauri::command]
pub async fn content_status(app: AppHandle) -> CommandResult<ContentStatus> {
    let db = db_of(&app);
    let config = app
        .path()
        .app_config_dir()
        .map_err(|e| CommandError::internal(e.to_string()))?;
    let guides: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM content_guide")
        .fetch_one(&db)
        .await
        .map_err(local)?;
    let assets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM content_asset")
        .fetch_one(&db)
        .await
        .map_err(local)?;
    Ok(ContentStatus {
        configured: content::database_url(&config).is_some(),
        last_sync_at: content::get_meta(&db, "last_sync_at").await,
        last_error: content::get_meta(&db, "last_error")
            .await
            .filter(|s| !s.is_empty()),
        guides,
        assets,
    })
}

/// Pull from Railway now. Emits `content:synced` when anything changed.
#[tauri::command]
pub async fn content_sync(app: AppHandle) -> CommandResult<SyncReport> {
    run(&app).await.map_err(|e| match e {
        ContentError::Local(m) => CommandError::storage(m),
        other => CommandError::internal(other.to_string()),
    })
}

/// Shared by the command and the launch-time background sync.
pub async fn run(app: &AppHandle) -> Result<SyncReport, ContentError> {
    let config = app
        .path()
        .app_config_dir()
        .map_err(|e| ContentError::Local(e.to_string()))?;
    let data = app
        .path()
        .app_data_dir()
        .map_err(|e| ContentError::Local(e.to_string()))?;
    let report = content::sync(&db_of(app), &config, &data).await?;
    if report.guides_updated + report.guides_removed + report.assets_updated + report.assets_removed
        > 0
    {
        let _ = app.emit("content:synced", &report);
    }
    Ok(report)
}
