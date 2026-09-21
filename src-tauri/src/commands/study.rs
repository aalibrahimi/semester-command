//! Study mastery commands — the one store behind the Read, Cheat sheet,
//! Recall and Map views (migration 0010), plus the drill attempt log
//! (migration 0014).
//!
//! Called by: `src/lib/ipc.ts` (`studyMastery`, `setStudySection`,
//! `saveStudyScratch`, `recordStudyReview`, `recordStudyAttempt`,
//! `studyAttemptsRecent`).
//! Calls: `study_section`, `study_review` and `study_attempt` via sqlx.
//!
//! The frontend keeps an in-memory copy per guide and writes through; every
//! write returns the row it stored so the copy never drifts from the disk.
//! No scheduling math lives here — SM-2 runs in the webview and sends the
//! resulting record; this module only stores and returns it.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::{AppHandle, Manager};

use super::{CommandError, CommandResult};
use crate::db::{self, Db};

fn db_of(app: &AppHandle) -> Db {
    app.state::<Db>().inner().clone()
}

fn storage_err(e: sqlx::Error) -> CommandError {
    CommandError::storage(format!("Study store failed: {e}"))
}

/// One section's status + scratchpad.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudySectionRow {
    pub guide_id: String,
    pub section_id: String,
    /// 'unread' | 'shaky' | 'mastered'.
    pub status: String,
    pub scratch: Option<String>,
    pub updated_at: String,
}

/// One drillable item's review record (check block or generated card).
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyReviewRow {
    pub guide_id: String,
    pub item_id: String,
    pub last_seen: Option<String>,
    pub misses: i64,
    pub next_due: Option<String>,
    pub ease: f64,
    pub interval_days: f64,
    pub reps: i64,
}

/// One answer to a generated drill (migration 0014). `id` is None on the
/// way in and set by SQLite on the way out.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyAttemptRow {
    #[serde(default)]
    pub id: Option<i64>,
    pub guide_id: String,
    pub section_id: String,
    pub drill_id: String,
    pub seed: i64,
    pub correct: bool,
    pub input: Option<String>,
    pub expected: Option<String>,
    pub diagnosis: Option<String>,
    pub ms: Option<i64>,
    pub at: String,
}

/// Everything the store holds for one guide.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyMastery {
    pub guide_id: String,
    pub sections: Vec<StudySectionRow>,
    pub reviews: Vec<StudyReviewRow>,
    pub attempts: Vec<StudyAttemptRow>,
}

/// Load one guide's mastery. Missing rows mean unread / never seen.
#[tauri::command]
pub async fn study_mastery(app: AppHandle, guide_id: String) -> CommandResult<StudyMastery> {
    let db = db_of(&app);
    let sections = sqlx::query_as("SELECT * FROM study_section WHERE guide_id = ?1")
        .bind(&guide_id)
        .fetch_all(&db)
        .await
        .map_err(storage_err)?;
    let reviews = sqlx::query_as("SELECT * FROM study_review WHERE guide_id = ?1")
        .bind(&guide_id)
        .fetch_all(&db)
        .await
        .map_err(storage_err)?;
    let attempts = sqlx::query_as("SELECT * FROM study_attempt WHERE guide_id = ?1 ORDER BY at")
        .bind(&guide_id)
        .fetch_all(&db)
        .await
        .map_err(storage_err)?;
    Ok(StudyMastery {
        guide_id,
        sections,
        reviews,
        attempts,
    })
}

/// Append one drill attempt. Returns the row with its id.
#[tauri::command]
pub async fn record_study_attempt(
    app: AppHandle,
    attempt: StudyAttemptRow,
) -> CommandResult<StudyAttemptRow> {
    let db = db_of(&app);
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO study_attempt (guide_id, section_id, drill_id, seed, correct, input, expected, diagnosis, ms, at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         RETURNING id",
    )
    .bind(&attempt.guide_id)
    .bind(&attempt.section_id)
    .bind(&attempt.drill_id)
    .bind(attempt.seed)
    .bind(attempt.correct)
    .bind(&attempt.input)
    .bind(&attempt.expected)
    .bind(&attempt.diagnosis)
    .bind(attempt.ms)
    .bind(&attempt.at)
    .fetch_one(&db)
    .await
    .map_err(storage_err)?;
    Ok(StudyAttemptRow {
        id: Some(id),
        ..attempt
    })
}

/// The most recent attempts across every guide (newest first) — the Study
/// home's weak-spot panel and the error log.
#[tauri::command]
pub async fn study_attempts_recent(
    app: AppHandle,
    limit: Option<i64>,
) -> CommandResult<Vec<StudyAttemptRow>> {
    let db = db_of(&app);
    sqlx::query_as("SELECT * FROM study_attempt ORDER BY at DESC LIMIT ?1")
        .bind(limit.unwrap_or(500).clamp(1, 5000))
        .fetch_all(&db)
        .await
        .map_err(storage_err)
}

/// Section status for every guide — the Study index and course pages need
/// progress without loading each guide.
#[tauri::command]
pub async fn study_sections_all(app: AppHandle) -> CommandResult<Vec<StudySectionRow>> {
    let db = db_of(&app);
    sqlx::query_as("SELECT * FROM study_section")
        .fetch_all(&db)
        .await
        .map_err(storage_err)
}

/// Set a section's status. Keeps the scratchpad.
#[tauri::command]
pub async fn set_study_section(
    app: AppHandle,
    guide_id: String,
    section_id: String,
    status: String,
) -> CommandResult<StudySectionRow> {
    if !matches!(status.as_str(), "unread" | "shaky" | "mastered") {
        return Err(CommandError::internal(
            "Section status must be unread, shaky or mastered.",
        ));
    }
    let db = db_of(&app);
    sqlx::query(
        "INSERT INTO study_section (guide_id, section_id, status, updated_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(guide_id, section_id) DO UPDATE SET status = excluded.status,
                                                        updated_at = excluded.updated_at",
    )
    .bind(&guide_id)
    .bind(&section_id)
    .bind(&status)
    .bind(db::now_rfc3339())
    .execute(&db)
    .await
    .map_err(storage_err)?;
    section_row(&db, &guide_id, &section_id).await
}

/// Save the per-section scratchpad. Keeps the status.
#[tauri::command]
pub async fn save_study_scratch(
    app: AppHandle,
    guide_id: String,
    section_id: String,
    scratch: Option<String>,
) -> CommandResult<StudySectionRow> {
    let db = db_of(&app);
    sqlx::query(
        "INSERT INTO study_section (guide_id, section_id, scratch, updated_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(guide_id, section_id) DO UPDATE SET scratch = excluded.scratch,
                                                        updated_at = excluded.updated_at",
    )
    .bind(&guide_id)
    .bind(&section_id)
    .bind(&scratch)
    .bind(db::now_rfc3339())
    .execute(&db)
    .await
    .map_err(storage_err)?;
    section_row(&db, &guide_id, &section_id).await
}

/// Store a review record as the webview computed it (SM-2 runs there).
#[tauri::command]
pub async fn record_study_review(
    app: AppHandle,
    review: StudyReviewRow,
) -> CommandResult<StudyReviewRow> {
    let db = db_of(&app);
    sqlx::query(
        "INSERT INTO study_review (guide_id, item_id, last_seen, misses, next_due, ease, interval_days, reps)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(guide_id, item_id) DO UPDATE SET
           last_seen = excluded.last_seen, misses = excluded.misses, next_due = excluded.next_due,
           ease = excluded.ease, interval_days = excluded.interval_days, reps = excluded.reps",
    )
    .bind(&review.guide_id)
    .bind(&review.item_id)
    .bind(&review.last_seen)
    .bind(review.misses)
    .bind(&review.next_due)
    .bind(review.ease)
    .bind(review.interval_days)
    .bind(review.reps)
    .execute(&db)
    .await
    .map_err(storage_err)?;
    Ok(review)
}

async fn section_row(db: &Db, guide_id: &str, section_id: &str) -> CommandResult<StudySectionRow> {
    sqlx::query_as("SELECT * FROM study_section WHERE guide_id = ?1 AND section_id = ?2")
        .bind(guide_id)
        .bind(section_id)
        .fetch_one(db)
        .await
        .map_err(storage_err)
}
