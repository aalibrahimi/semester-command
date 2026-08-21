//! Data commands: reads of synced coursework, manual entry, and the debug
//! surface.
//!
//! Called by: `src/lib/ipc.ts`.
//! Calls: [`crate::db`].
//!
//! Everything returned from here carries its `source` (`api` | `ics` |
//! `manual`), because §3 requires the UI to visibly mark any number Canvas did
//! not confirm. Dropping that field to simplify a return type would quietly
//! remove the distinction the user most needs.
//!
//! # Manual entry is a first-class path (§3)
//!
//! Under Tier 2 auth it is the only way grades exist at all. Manual IDs are
//! generated here with a `manual-` prefix, which is the entire mechanism that
//! keeps them out of the API upsert's reach — see [`crate::db::upsert`].

use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::{CommandError, CommandResult};
use crate::db::{self, queries, schema::*, upsert, Db};

/// Everything the debug screen renders in one call.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugOverview {
    pub stats: Vec<queries::EntityStat>,
    pub sync_log: Vec<SyncLogRow>,
}

/// One call per table for the debug dump; typed rows serialise with their
/// raw JSON included, so the viewer needs nothing else.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugDump {
    pub courses: Vec<CourseRow>,
    pub assignment_groups: Vec<AssignmentGroupRow>,
    pub assignments: Vec<AssignmentRow>,
    pub submissions: Vec<SubmissionRow>,
    pub instructors: Vec<InstructorRow>,
}

fn db_of(app: &AppHandle) -> Db {
    app.state::<Db>().inner().clone()
}

fn storage_err(e: sqlx::Error) -> CommandError {
    CommandError::storage(format!("Database read failed: {e}"))
}

/// Counts, freshness and the recent sync log.
#[tauri::command]
pub async fn debug_overview(app: AppHandle) -> CommandResult<DebugOverview> {
    let db = db_of(&app);
    Ok(DebugOverview {
        stats: queries::entity_stats(&db).await.map_err(storage_err)?,
        sync_log: queries::recent_sync_log(&db, 50).await.map_err(storage_err)?,
    })
}

/// Every synced row, verbatim. Debug view only — M3's screens get their own
/// purpose-shaped queries instead of this firehose.
#[tauri::command]
pub async fn debug_dump(app: AppHandle) -> CommandResult<DebugDump> {
    let db = db_of(&app);
    Ok(DebugDump {
        courses: queries::all_courses(&db).await.map_err(storage_err)?,
        assignment_groups: queries::all_groups(&db).await.map_err(storage_err)?,
        assignments: queries::all_assignments(&db).await.map_err(storage_err)?,
        submissions: queries::all_submissions(&db).await.map_err(storage_err)?,
        instructors: queries::all_instructors(&db).await.map_err(storage_err)?,
    })
}

/// Debug: flip the client into the session-dead state so the reconnect flow
/// can be exercised without waiting for SJSU to expire a real session.
#[tauri::command]
pub async fn debug_force_reconnect(app: AppHandle) -> CommandResult<()> {
    use crate::commands::auth::AuthCtx;
    let ctx = app.state::<AuthCtx>();
    ctx.client.mark_dead();
    crate::commands::auth::emit_status(&app, Some("Session marked dead (debug).".into())).await;
    Ok(())
}

// ── Manual entry (§3) ───────────────────────────────────────────────────────

/// A fresh id no Canvas entity can collide with.
///
/// Nanosecond timestamp rather than a UUID dependency: single machine, single
/// user, and two clicks in the same nanosecond is not a real risk.
fn manual_id(kind: &str) -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or_default();
    format!("manual-{kind}-{nanos}")
}

/// Create or update a manual course. Pass `id: None` to create; the id comes
/// back either way.
#[tauri::command]
pub async fn save_manual_course(
    app: AppHandle,
    id: Option<String>,
    name: String,
    course_code: Option<String>,
    apply_group_weights: Option<bool>,
) -> CommandResult<String> {
    let db = db_of(&app);
    let id = id.unwrap_or_else(|| manual_id("course"));
    let row = CourseRow {
        id: id.clone(),
        name: Some(name),
        course_code,
        term: None,
        apply_group_weights,
        current_score: None,
        final_score: None,
        syllabus_html: None,
        source: "manual".into(),
        raw_json: None,
        synced_at: Some(db::now_rfc3339()),
    };
    upsert::course(&db, &row).await.map_err(storage_err)?;
    Ok(id)
}

/// Create or update a manual assignment group (weights included — under Tier
/// 2 this is where the grade structure comes from).
#[tauri::command]
pub async fn save_manual_group(
    app: AppHandle,
    id: Option<String>,
    course_id: String,
    name: String,
    group_weight: Option<f64>,
) -> CommandResult<String> {
    let db = db_of(&app);
    let id = id.unwrap_or_else(|| manual_id("group"));
    let row = AssignmentGroupRow {
        id: id.clone(),
        course_id,
        name: Some(name),
        group_weight,
        position: None,
        source: "manual".into(),
        raw_json: None,
        synced_at: Some(db::now_rfc3339()),
    };
    upsert::assignment_group(&db, &row).await.map_err(storage_err)?;
    Ok(id)
}

/// Create or update a manual assignment.
#[tauri::command]
pub async fn save_manual_assignment(
    app: AppHandle,
    id: Option<String>,
    course_id: String,
    group_id: Option<String>,
    name: String,
    due_at: Option<String>,
    points_possible: Option<f64>,
) -> CommandResult<String> {
    let db = db_of(&app);
    let id = id.unwrap_or_else(|| manual_id("assignment"));
    let row = AssignmentRow {
        id: id.clone(),
        course_id,
        group_id,
        name: Some(name),
        due_at,
        points_possible,
        omit_from_final_grade: None,
        submission_types: None,
        html_url: None,
        rubric_json: None,
        source: "manual".into(),
        raw_json: None,
        synced_at: Some(db::now_rfc3339()),
    };
    upsert::assignment(&db, &row).await.map_err(storage_err)?;
    Ok(id)
}

/// Record a score by hand. `score: None` explicitly un-grades — that is a
/// deliberate action here, distinct from sync never writing None-means-zero.
#[tauri::command]
pub async fn save_manual_score(
    app: AppHandle,
    assignment_id: String,
    score: Option<f64>,
) -> CommandResult<()> {
    let db = db_of(&app);
    let row = SubmissionRow {
        assignment_id,
        score,
        grade: None,
        submitted_at: None,
        graded_at: score.is_some().then(db::now_rfc3339),
        workflow_state: Some((if score.is_some() { "graded" } else { "unsubmitted" }).into()),
        excused: None,
        missing: None,
        late: None,
        source: "manual".into(),
        raw_json: None,
        synced_at: Some(db::now_rfc3339()),
    };
    upsert::submission(&db, &row).await.map_err(storage_err)?;
    Ok(())
}
