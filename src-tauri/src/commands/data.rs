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

// ── Screen reads ────────────────────────────────────────────────────────────

/// The triage list, ranked in Rust (§5 screen 1 — the frontend never ranks).
#[tauri::command]
pub async fn triage_rows(app: AppHandle) -> CommandResult<Vec<crate::triage::TriageRow>> {
    let db = db_of(&app);
    let bundle = crate::commands::grades::load_bundle(&db)
        .await
        .map_err(storage_err)?;
    Ok(crate::triage::rank(&bundle, chrono::Utc::now()))
}

/// One calendar item. Mirrored as `CalendarItem` in types.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarItem {
    pub assignment_id: String,
    pub course_id: String,
    pub course_code: Option<String>,
    pub name: Option<String>,
    pub due_at: String,
    pub points_possible: Option<f64>,
    pub submitted: bool,
    pub graded: bool,
    pub source: String,
}

/// Every dated assignment, ascending — the calendar's whole diet.
#[tauri::command]
pub async fn calendar_items(app: AppHandle) -> CommandResult<Vec<CalendarItem>> {
    let db = db_of(&app);
    let bundle = crate::commands::grades::load_bundle(&db)
        .await
        .map_err(storage_err)?;

    let code_of: std::collections::HashMap<&str, Option<String>> = bundle
        .courses
        .iter()
        .map(|c| (c.id.as_str(), c.course_code.clone()))
        .collect();

    let mut items: Vec<CalendarItem> = bundle
        .assignments
        .iter()
        .filter(|a| !bundle.is_hidden(&a.course_id))
        .filter_map(|a| {
            let due_at = a.due_at.clone()?;
            let s = bundle.submissions.get(&a.id);
            Some(CalendarItem {
                assignment_id: a.id.clone(),
                course_id: a.course_id.clone(),
                course_code: code_of.get(a.course_id.as_str()).cloned().flatten(),
                name: a.name.clone(),
                due_at,
                points_possible: a.points_possible,
                submitted: s.map(|s| s.submitted_at.is_some()).unwrap_or(false),
                graded: s.map(|s| s.score.is_some()).unwrap_or(false),
                source: a.source.clone(),
            })
        })
        .collect();
    items.sort_by(|a, b| a.due_at.cmp(&b.due_at));
    Ok(items)
}

/// Instructors across all courses, for the Contacts screen.
#[tauri::command]
pub async fn list_instructors(app: AppHandle) -> CommandResult<Vec<InstructorRow>> {
    let db = db_of(&app);
    queries::all_instructors(&db).await.map_err(storage_err)
}

/// The user's note on an instructor: office hours, "answers email fast".
/// Local-only, survives every sync (§3).
#[tauri::command]
pub async fn save_instructor_note(
    app: AppHandle,
    id: String,
    course_id: String,
    note: Option<String>,
) -> CommandResult<()> {
    let db = db_of(&app);
    upsert::instructor_note(&db, &id, &course_id, note.as_deref())
        .await
        .map_err(storage_err)
}

/// The user's time estimate for an assignment — the denominator of the
/// triage score, inline-editable on the list (§5).
#[tauri::command]
pub async fn set_estimate(
    app: AppHandle,
    assignment_id: String,
    est_minutes: Option<i64>,
) -> CommandResult<()> {
    if est_minutes.map(|m| m < 0 || m > 10_000).unwrap_or(false) {
        return Err(CommandError::internal("That estimate doesn't look like minutes."));
    }
    let db = db_of(&app);
    upsert::estimate(&db, &assignment_id, est_minutes)
        .await
        .map_err(storage_err)
}

// ── Class-slot detection (planner auto-populate) ────────────────────────────

/// Propose class meeting slots from Canvas calendar events + syllabus text.
/// Proposes only — the user confirms before anything becomes a block.
#[tauri::command]
pub async fn detect_class_slots(
    app: AppHandle,
) -> CommandResult<crate::class_slots::DetectResult> {
    let db = db_of(&app);
    let bundle = crate::commands::grades::load_bundle(&db)
        .await
        .map_err(storage_err)?;
    let courses: Vec<(String, Option<String>)> = bundle
        .courses
        .iter()
        .filter(|c| !bundle.is_hidden(&c.id))
        .map(|c| (c.id.clone(), c.course_code.clone()))
        .collect();
    let client = app.state::<crate::commands::auth::AuthCtx>().client.clone();
    Ok(crate::class_slots::detect(&db, &client, &courses).await)
}

/// One professor comment on a submission. Comments are NOT synced — Canvas
/// only serves them from the submission endpoints, so the Done screen
/// fetches them live, per assignment, on demand.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionCommentOut {
    pub id: String,
    pub author: Option<String>,
    pub comment: String,
    pub created_at: Option<String>,
}

/// Professor feedback on one of the user's submissions, fetched live.
/// Read-only GET, same contract as every Canvas call (§2).
#[tauri::command]
pub async fn fetch_submission_comments(
    app: AppHandle,
    course_id: String,
    assignment_id: String,
) -> CommandResult<Vec<SubmissionCommentOut>> {
    let client = app.state::<crate::commands::auth::AuthCtx>().client.clone();
    let path = format!(
        "/courses/{course_id}/assignments/{assignment_id}/submissions/self?include[]=submission_comments"
    );
    let v = client.get_object(&path).await?;
    let comments = v
        .get("submission_comments")
        .and_then(|c| c.as_array())
        .cloned()
        .unwrap_or_default();
    Ok(comments
        .iter()
        .map(|c| SubmissionCommentOut {
            id: c.get("id").map(|i| i.to_string()).unwrap_or_default(),
            author: c
                .get("author_name")
                .and_then(|a| a.as_str())
                .map(String::from),
            comment: c
                .get("comment")
                .and_then(|a| a.as_str())
                .unwrap_or_default()
                .to_string(),
            created_at: c
                .get("created_at")
                .and_then(|a| a.as_str())
                .map(String::from),
        })
        .collect())
}

// ── Weekly planner (migration 0009) ─────────────────────────────────────────

/// Every planner block — the week view expands recurrence client-side.
#[tauri::command]
pub async fn planner_blocks(app: AppHandle) -> CommandResult<Vec<PlannerBlockRow>> {
    let db = db_of(&app);
    sqlx::query_as("SELECT * FROM planner_blocks ORDER BY start_min")
        .fetch_all(&db)
        .await
        .map_err(storage_err)
}

/// Create (id: None) or update (id: Some) one block. Returns the row id.
/// Exactly one of weekday/date must be set — the recurrence model.
#[tauri::command]
pub async fn save_planner_block(
    app: AppHandle,
    id: Option<i64>,
    kind: String,
    course_id: Option<String>,
    title: String,
    location: Option<String>,
    weekday: Option<i64>,
    date: Option<String>,
    start_min: i64,
    end_min: i64,
    note: Option<String>,
) -> CommandResult<i64> {
    if !matches!(kind.as_str(), "class" | "event") {
        return Err(CommandError::internal("Block kind must be 'class' or 'event'."));
    }
    if weekday.is_some() == date.is_some() {
        return Err(CommandError::internal(
            "A block repeats weekly (weekday) or happens once (date) — exactly one.",
        ));
    }
    if let Some(w) = weekday {
        if !(0..=6).contains(&w) {
            return Err(CommandError::internal("Weekday must be 0 (Mon) to 6 (Sun)."));
        }
    }
    if !(0..=1440).contains(&start_min) || !(0..=1440).contains(&end_min) || end_min <= start_min {
        return Err(CommandError::internal("End time must come after start time."));
    }
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err(CommandError::internal("Give the block a title."));
    }

    let db = db_of(&app);
    match id {
        Some(id) => {
            sqlx::query(
                "UPDATE planner_blocks SET kind=?1, course_id=?2, title=?3, location=?4,
                 weekday=?5, date=?6, start_min=?7, end_min=?8, note=?9 WHERE id=?10",
            )
            .bind(&kind)
            .bind(&course_id)
            .bind(&title)
            .bind(&location)
            .bind(weekday)
            .bind(&date)
            .bind(start_min)
            .bind(end_min)
            .bind(&note)
            .bind(id)
            .execute(&db)
            .await
            .map_err(storage_err)?;
            Ok(id)
        }
        None => {
            let res = sqlx::query(
                "INSERT INTO planner_blocks (kind, course_id, title, location, weekday, date,
                 start_min, end_min, note) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            )
            .bind(&kind)
            .bind(&course_id)
            .bind(&title)
            .bind(&location)
            .bind(weekday)
            .bind(&date)
            .bind(start_min)
            .bind(end_min)
            .bind(&note)
            .execute(&db)
            .await
            .map_err(storage_err)?;
            Ok(res.last_insert_rowid())
        }
    }
}

/// Delete one block. The dialog's Delete button; nothing cascades.
#[tauri::command]
pub async fn delete_planner_block(app: AppHandle, id: i64) -> CommandResult<()> {
    let db = db_of(&app);
    sqlx::query("DELETE FROM planner_blocks WHERE id = ?1")
        .bind(id)
        .execute(&db)
        .await
        .map_err(storage_err)?;
    Ok(())
}

/// Write the semester `.ics` to a path the user picked in the save dialog.
/// Returns how many events were written.
#[tauri::command]
pub async fn export_semester_ics(app: AppHandle, path: String) -> CommandResult<usize> {
    let db = db_of(&app);
    let bundle = crate::commands::grades::load_bundle(&db)
        .await
        .map_err(storage_err)?;

    let items: Vec<(String, Option<String>, Option<String>, String, Option<f64>)> = bundle
        .assignments
        .iter()
        .filter(|a| !bundle.is_hidden(&a.course_id))
        .filter_map(|a| {
            let due = a.due_at.clone()?;
            let code = bundle
                .courses
                .iter()
                .find(|c| c.id == a.course_id)
                .and_then(|c| c.course_code.clone());
            Some((a.id.clone(), code, a.name.clone(), due, a.points_possible))
        })
        .collect();

    let count = items.len();
    let ics = crate::ical::build_semester_ics(&items);
    std::fs::write(&path, ics)
        .map_err(|e| CommandError::storage(format!("Could not write the file: {e}")))?;
    Ok(count)
}

/// One registrar requirement's title + status, for the plan merge.
/// Statuses as MyProgress reports them: 'taken' (satisfied), 'enrolled'
/// (registered this term), 'error' (outstanding).
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RequirementStatus {
    pub title: String,
    pub status: String,
}

/// Every parsed requirement's status from the imported MyProgress report.
/// Empty when no report has been imported. The frontend maps titles to plan
/// course codes — the mapping is presentation knowledge, not registrar data.
#[tauri::command]
pub async fn grad_requirement_statuses(app: AppHandle) -> CommandResult<Vec<RequirementStatus>> {
    let db = db_of(&app);
    sqlx::query_as("SELECT title, status FROM degree_requirements")
        .fetch_all(&db)
        .await
        .map_err(storage_err)
}

// ── Graduation plan overrides ───────────────────────────────────────────────

/// One user override on the static degree plan. Mirrored as `GradOverride`.
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct GradOverride {
    pub code: String,
    pub status: Option<String>,
    pub term_id: Option<String>,
}

/// Every stored override, for the Graduation screen's merge.
#[tauri::command]
pub async fn grad_overrides(app: AppHandle) -> CommandResult<Vec<GradOverride>> {
    let db = db_of(&app);
    sqlx::query_as("SELECT * FROM grad_overrides")
        .fetch_all(&db)
        .await
        .map_err(storage_err)
}

/// Set (or clear, with both fields None) an override for one course code.
#[tauri::command]
pub async fn set_grad_override(
    app: AppHandle,
    code: String,
    status: Option<String>,
    term_id: Option<String>,
) -> CommandResult<()> {
    if let Some(s) = &status {
        if !matches!(s.as_str(), "planned" | "in_progress" | "passed" | "failed" | "dropped") {
            return Err(CommandError::internal(format!("Unknown status \"{s}\".")));
        }
    }
    let db = db_of(&app);
    if status.is_none() && term_id.is_none() {
        sqlx::query("DELETE FROM grad_overrides WHERE code = ?1")
            .bind(&code)
            .execute(&db)
            .await
            .map_err(storage_err)?;
    } else {
        sqlx::query(
            r#"
            INSERT INTO grad_overrides (code, status, term_id) VALUES (?1, ?2, ?3)
            ON CONFLICT(code) DO UPDATE SET
                status = excluded.status,
                term_id = excluded.term_id
            "#,
        )
        .bind(&code)
        .bind(&status)
        .bind(&term_id)
        .execute(&db)
        .await
        .map_err(storage_err)?;
    }
    Ok(())
}

// ── Syllabi ─────────────────────────────────────────────────────────────────

/// One course's syllabus material: the Canvas syllabus page (rarely used at
/// SJSU) plus every stored document. Mirrored as `CourseSyllabus` in types.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseSyllabus {
    pub course_id: String,
    pub course_code: Option<String>,
    pub course_name: Option<String>,
    pub syllabus_html: Option<String>,
    pub files: Vec<SyllabusFileRow>,
}

/// Syllabus material for every visible course, whether or not any exists —
/// the screen renders "nothing yet + how to fix it" per course.
#[tauri::command]
pub async fn syllabi(app: AppHandle) -> CommandResult<Vec<CourseSyllabus>> {
    let db = db_of(&app);
    let bundle = crate::commands::grades::load_bundle(&db)
        .await
        .map_err(storage_err)?;
    let files = queries::all_syllabus_files(&db).await.map_err(storage_err)?;

    Ok(bundle
        .courses
        .iter()
        .filter(|c| !bundle.is_hidden(&c.id))
        .map(|c| CourseSyllabus {
            course_id: c.id.clone(),
            course_code: c.course_code.clone(),
            course_name: c.name.clone(),
            syllabus_html: c
                .syllabus_html
                .clone()
                .filter(|h| !h.trim().is_empty()),
            files: files.iter().filter(|f| f.course_id == c.id).cloned().collect(),
        })
        .collect())
}

/// Try to pull syllabus files for one course from Canvas right now.
/// Returns how many new documents were stored (0 = none found or files
/// closed to students — the UI offers manual import either way).
#[tauri::command]
pub async fn fetch_syllabus_from_canvas(app: AppHandle, course_id: String) -> CommandResult<usize> {
    let db = db_of(&app);
    let ctx = app.state::<crate::commands::auth::AuthCtx>();
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::storage(format!("No data dir: {e}")))?;
    let stored = crate::syllabus::fetch_for_course(&db, &ctx.client, &data_dir, &course_id).await?;
    Ok(stored)
}

/// Import a syllabus the user picked from disk (path comes from the native
/// file dialog — the webview itself has no filesystem access).
#[tauri::command]
pub async fn import_syllabus_file(
    app: AppHandle,
    course_id: String,
    path: String,
) -> CommandResult<SyllabusFileRow> {
    let db = db_of(&app);
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::storage(format!("No data dir: {e}")))?;
    crate::syllabus::import_local(&db, &data_dir, &course_id, std::path::Path::new(&path))
        .await
        .map_err(CommandError::internal)
}

/// Star/unstar "this is MY professor" (local-only, survives sync).
#[tauri::command]
pub async fn set_instructor_starred(
    app: AppHandle,
    id: String,
    course_id: String,
    starred: bool,
) -> CommandResult<()> {
    let db = db_of(&app);
    upsert::instructor_starred(&db, &id, &course_id, starred)
        .await
        .map_err(storage_err)
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
