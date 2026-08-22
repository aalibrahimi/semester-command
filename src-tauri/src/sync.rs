//! The sync engine: Canvas → SQLite, non-destructively.
//!
//! Called by: `commands::sync` (manual trigger), `lib.rs` (on launch and the
//! 30-minute interval).
//! Calls: [`crate::canvas::endpoints`] for reads, [`crate::db::upsert`] for
//! writes.
//!
//! NOTE — SPEC.md §10 has no module for this (deviation, recorded in the
//! appendix): the file tree there routes sync through `commands/sync.rs`, but
//! commands are the webview's surface and this must also run from launch and
//! a timer, so it lives one level down.
//!
//! # Shape of a run
//!
//! ```text
//! courses ──► per course: groups ─► assignments(+submissions) ─► instructors
//! ```
//!
//! Order matters — later entities reference earlier ones. Each course is
//! fenced: its failure is logged to `sync_log` and the run continues (§6).
//! The whole run is wrapped in an umbrella `sync` log row; the footer's
//! "synced Xm ago" advances only when that umbrella row closes ok.
//!
//! # Politeness (§2.0)
//!
//! Auto-runs are floored at 30 minutes apart; a manual "Sync now" bypasses
//! the floor but not the client's 4-request concurrency cap. Courses are
//! fetched sequentially — a personal gradebook does not need to hammer.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Instant;

use tauri::{AppHandle, Emitter, Manager};

use crate::canvas::client::CanvasError;
use crate::canvas::endpoints;
use crate::canvas::models;
use crate::commands::auth::AuthCtx;
use crate::db::{self, schema::*, upsert, Db};

/// Event the frontend refreshes on. Payload: the phase as a string.
pub const SYNC_EVENT: &str = "sync:status-changed";

/// Auto-sync floor (§2.0). Manual syncs ignore it.
const AUTO_FLOOR_SECS: u64 = 30 * 60;

/// Engine state, Tauri-managed. One sync at a time, ever.
pub struct SyncState {
    running: AtomicBool,
    last_attempt: Mutex<Option<Instant>>,
}

impl SyncState {
    pub fn new() -> Self {
        Self {
            running: AtomicBool::new(false),
            last_attempt: Mutex::new(None),
        }
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

impl Default for SyncState {
    fn default() -> Self {
        Self::new()
    }
}

/// What a finished run reports back to the caller (and the debug view).
#[derive(Debug, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSummary {
    pub courses: usize,
    pub assignment_groups: usize,
    pub assignments: usize,
    pub submissions: usize,
    pub instructors: usize,
    /// Rows Canvas sent that failed to parse (already logged + on disk).
    pub skipped_rows: usize,
    /// Course-level failures, as display-ready strings.
    pub course_errors: Vec<String>,
    /// What actually changed — the digest's and notifier's whole diet.
    pub changes: SyncChanges,
}

/// The differences one sync run made, computed by comparing each row against
/// what the database held *before* the upsert. This is what turns a silent
/// background sync into "2 new grades, HIST-15 moved +1.4" (§6).
#[derive(Debug, Default, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncChanges {
    pub new_grades: Vec<GradeEvent>,
    pub course_moves: Vec<CourseMove>,
    /// Assignments Canvas newly flagged `missing` — always notified.
    pub missing_flips: Vec<GradeEvent>,
    pub new_assignments: usize,
}

impl SyncChanges {
    pub fn is_empty(&self) -> bool {
        self.new_grades.is_empty()
            && self.course_moves.is_empty()
            && self.missing_flips.is_empty()
            && self.new_assignments == 0
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GradeEvent {
    pub course_code: Option<String>,
    pub assignment_name: Option<String>,
    pub score: Option<f64>,
    pub points_possible: Option<f64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseMove {
    pub course_id: String,
    pub course_code: Option<String>,
    pub old_pct: f64,
    pub new_pct: f64,
}

/// Run a sync if one is due. Returns `None` when skipped (already running,
/// auto-floor not reached, or no usable auth).
pub async fn run(app: &AppHandle, manual: bool) -> Option<Result<SyncSummary, CanvasError>> {
    let state = app.state::<SyncState>();

    // Floor check first, and only for auto runs.
    if !manual {
        let last = *state.last_attempt.lock().unwrap();
        if let Some(t) = last {
            if t.elapsed().as_secs() < AUTO_FLOOR_SECS {
                tracing::debug!("auto-sync skipped: inside the 30-minute floor");
                return None;
            }
        }
    }
    // One at a time. swap returns the previous value.
    if state.running.swap(true, Ordering::SeqCst) {
        tracing::info!("sync already running; not starting another");
        return None;
    }
    *state.last_attempt.lock().unwrap() = Some(Instant::now());

    let ctx = app.state::<AuthCtx>();
    if ctx.client.auth_mode().await.is_none() {
        state.running.store(false, Ordering::SeqCst);
        tracing::debug!("sync skipped: no Canvas credential (Tier 2 syncs via the ICS path)");
        return None;
    }

    let _ = app.emit(SYNC_EVENT, "syncing");
    let result = run_inner(app).await;
    state.running.store(false, Ordering::SeqCst);
    let _ = app.emit(SYNC_EVENT, if result.is_ok() { "idle" } else { "error" });

    match &result {
        Ok(summary) if !summary.changes.is_empty() => {
            // The digest toast in the UI, and the OS notifications for the
            // changes that matter even when the window is hidden (§6).
            let _ = app.emit("sync:digest", &summary.changes);
            crate::notify::on_sync_changes(app, &summary.changes).await;
        }
        Ok(_) => {}
        Err(CanvasError::SessionExpired) => {
            // Session death is only dangerous when nobody notices — ping the
            // OS once per death, re-armed on the next successful sign-in.
            let ctx = app.state::<AuthCtx>();
            if !ctx.death_notified.swap(true, Ordering::SeqCst) {
                crate::notify::session_died(app);
            }
        }
        Err(e) => tracing::warn!(error = %e, "sync run failed"),
    }
    Some(result)
}

/// The run itself. Assumes the running flag is held by [`run`].
async fn run_inner(app: &AppHandle) -> Result<SyncSummary, CanvasError> {
    let db = app.state::<Db>().inner().clone();
    let client = app.state::<AuthCtx>().client.clone();
    // For syllabus document storage. Failure to resolve it would have failed
    // setup long before a sync could run.
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| CanvasError::Http { status: 0, path: "app data dir".into() })?;
    let mut summary = SyncSummary::default();

    // On the very first sync everything is "new" — that is a fresh install,
    // not news. Changes are collected but discarded at the end of a first
    // run so the digest and notifications stay meaningful.
    let first_run = crate::db::queries::last_ok_sync(&db)
        .await
        .ok()
        .flatten()
        .is_none();

    let umbrella = upsert::sync_log_start(&db, "sync").await.map_err(log_db_err)?;

    // ── Courses ────────────────────────────────────────────────────────────
    let course_log = upsert::sync_log_start(&db, "courses").await.map_err(log_db_err)?;
    let courses = match endpoints::active_courses(&client).await {
        Ok((rows, skipped)) => {
            summary.skipped_rows += skipped;
            let _ = upsert::sync_log_finish(&db, course_log, true, None).await;
            rows
        }
        Err(e) => {
            // No course list → nothing below can run. This is the one failure
            // that aborts the run (session death lands here too).
            let _ = upsert::sync_log_finish(&db, course_log, false, Some(&e.to_string())).await;
            let _ = upsert::sync_log_finish(&db, umbrella, false, Some(&e.to_string())).await;
            return Err(e);
        }
    };

    let now = db::now_rfc3339();
    for raw in &courses {
        let row = course_row(raw, &now);
        // Diff Canvas's own current score against what we held before the
        // write — a move of more than a point is digest + notification
        // material (§6).
        let old: Option<f64> =
            sqlx::query_scalar("SELECT current_score FROM courses WHERE id = ?1")
                .bind(&row.id)
                .fetch_optional(&db)
                .await
                .ok()
                .flatten();
        if let (Some(old_pct), Some(new_pct)) = (old, row.current_score) {
            if (new_pct - old_pct).abs() > 1.0 {
                summary.changes.course_moves.push(CourseMove {
                    course_id: row.id.clone(),
                    course_code: row.course_code.clone(),
                    old_pct,
                    new_pct,
                });
            }
        }
        // Trajectory memory (migration 0007): append a snapshot whenever the
        // scores differ from what we held — any delta, not just the >1pt
        // notification threshold — plus one baseline row for a course with
        // no history yet. Errors are logged and swallowed; history must
        // never fail a sync.
        let has_history: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM score_history WHERE course_id = ?1)",
        )
        .bind(&row.id)
        .fetch_one(&db)
        .await
        .unwrap_or(true);
        if (row.current_score != old || !has_history) && row.current_score.is_some() {
            if let Err(e) = sqlx::query(
                "INSERT INTO score_history (course_id, recorded_at, current_score, final_score)
                 VALUES (?1, ?2, ?3, ?4)",
            )
            .bind(&row.id)
            .bind(&now)
            .bind(row.current_score)
            .bind(row.final_score)
            .execute(&db)
            .await
            {
                tracing::warn!(error = %e, "score history append failed");
            }
        }
        upsert::course(&db, &row).await.map_err(log_db_err)?;
        summary.courses += 1;
    }

    // ── Per course, fenced ─────────────────────────────────────────────────
    for raw in &courses {
        let course = &raw.parsed;
        let label = course
            .course_code
            .clone()
            .unwrap_or_else(|| course.id.clone());
        let log_id = upsert::sync_log_start(&db, &format!("course:{label}")).await.map_err(log_db_err)?;

        match sync_one_course(&db, &client, &data_dir, raw, &mut summary).await {
            Ok(()) => {
                let _ = upsert::sync_log_finish(&db, log_id, true, None).await;
            }
            Err(e) => {
                let msg = e.to_string();
                let _ = upsert::sync_log_finish(&db, log_id, false, Some(&msg)).await;
                // Session death mid-run: every remaining course would fail the
                // same way. Stop the run; keep what already landed.
                if matches!(e, CanvasError::SessionExpired) {
                    let _ = upsert::sync_log_finish(&db, umbrella, false, Some(&msg)).await;
                    return Err(e);
                }
                summary.course_errors.push(format!("{label}: {msg}"));
            }
        }
    }

    let ok = summary.course_errors.is_empty();
    let err_text = (!ok).then(|| summary.course_errors.join("; "));
    let _ = upsert::sync_log_finish(&db, umbrella, ok, err_text.as_deref()).await;

    if first_run {
        summary.changes = SyncChanges::default();
    }

    tracing::info!(
        courses = summary.courses,
        assignments = summary.assignments,
        submissions = summary.submissions,
        instructors = summary.instructors,
        skipped = summary.skipped_rows,
        errors = summary.course_errors.len(),
        "sync finished"
    );
    Ok(summary)
}

/// Groups → assignments (+submissions) → instructors for one course.
async fn sync_one_course(
    db: &Db,
    client: &crate::canvas::client::CanvasClient,
    data_dir: &std::path::Path,
    course: &endpoints::Raw<models::Course>,
    summary: &mut SyncSummary,
) -> Result<(), CanvasError> {
    let course_id = &course.parsed.id;
    let now = db::now_rfc3339();

    let (groups, skipped) = endpoints::assignment_groups(client, course_id).await?;
    summary.skipped_rows += skipped;
    for g in &groups {
        upsert::assignment_group(db, &group_row(g, course_id, &now)).await.map_err(log_db_err)?;
        summary.assignment_groups += 1;
    }

    let (assignments, skipped) = endpoints::assignments(client, course_id).await?;
    summary.skipped_rows += skipped;

    // Snapshot what we already knew, once per course, so the loop below can
    // diff without a query per row.
    let known_ids: std::collections::HashSet<String> =
        sqlx::query_scalar::<_, String>("SELECT id FROM assignments WHERE course_id = ?1")
            .bind(course_id)
            .fetch_all(db)
            .await
            .unwrap_or_default()
            .into_iter()
            .collect();
    let old_subs: std::collections::HashMap<String, (Option<f64>, Option<bool>)> =
        sqlx::query_as::<_, (String, Option<f64>, Option<bool>)>(
            "SELECT s.assignment_id, s.score, s.missing FROM submissions s
             JOIN assignments a ON a.id = s.assignment_id WHERE a.course_id = ?1",
        )
        .fetch_all(db)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|(id, score, missing)| (id, (score, missing)))
        .collect();
    let course_code = &course.parsed.course_code;

    for a in &assignments {
        if !known_ids.contains(&a.parsed.id) {
            summary.changes.new_assignments += 1;
        }
        upsert::assignment(db, &assignment_row(a, course_id, &now)).await.map_err(log_db_err)?;
        summary.assignments += 1;

        if let Some(sub) = &a.parsed.submission {
            let (old_score, old_missing) = old_subs
                .get(&a.parsed.id)
                .cloned()
                .unwrap_or((None, None));

            let event = || GradeEvent {
                course_code: course_code.clone(),
                assignment_name: a.parsed.name.clone(),
                score: sub.score,
                points_possible: a.parsed.points_possible,
            };
            // A grade where there was none, or a regrade to a new number.
            if sub.score.is_some() && sub.score != old_score {
                summary.changes.new_grades.push(event());
            }
            // Newly flagged missing (and still ungraded) — always worth a ping.
            if sub.missing == Some(true) && old_missing != Some(true) && sub.score.is_none() {
                summary.changes.missing_flips.push(event());
            }

            upsert::submission(db, &submission_row(sub, &a.parsed.id, &now)).await.map_err(log_db_err)?;
            summary.submissions += 1;
        }
    }

    // Syllabus files, opportunistically: fetch_for_course treats a 403 and
    // an empty result as Ok(0), and anything it stores makes the Syllabi
    // screen richer. Only session death propagates.
    match crate::syllabus::fetch_for_course(db, client, data_dir, course_id).await {
        Ok(n) if n > 0 => tracing::info!(course_id, files = n, "syllabus documents stored"),
        Ok(_) => {}
        Err(CanvasError::SessionExpired) => return Err(CanvasError::SessionExpired),
        Err(e) => tracing::info!(course_id, error = %e, "syllabus fetch failed; continuing"),
    }

    // Instructors are nice-to-have: a 403 here (SJSU hides rosters in some
    // courses) must not fail the course. Fall back to the display names that
    // came embedded in the course payload.
    match instructors_for(db, client, course_id, &now).await {
        Ok(n) => summary.instructors += n,
        Err(e) => {
            tracing::info!(course_id, error = %e, "instructor fetch failed; using embedded names");
            if matches!(e, CanvasError::SessionExpired) {
                return Err(e);
            }
            for t in course.parsed.teachers.iter().flatten() {
                if let Some(id) = &t.id {
                    let row = InstructorRow {
                        id: id.clone(),
                        course_id: course_id.clone(),
                        name: t.display_name.clone(),
                        email: None,
                        role: Some("teacher".into()),
                        office_hours_note: None,
                        starred: false,
                        source: "api".into(),
                        raw_json: None,
                        synced_at: Some(now.clone()),
                    };
                    upsert::instructor(db, &row).await.map_err(log_db_err)?;
                    summary.instructors += 1;
                }
            }
        }
    }

    Ok(())
}

/// Fetch and store teachers + TAs. Returns how many rows were written.
async fn instructors_for(
    db: &Db,
    client: &crate::canvas::client::CanvasClient,
    course_id: &str,
    now: &str,
) -> Result<usize, CanvasError> {
    let mut written = 0usize;
    for (fetch, role) in [
        (endpoints::teachers(client, course_id).await, "teacher"),
        (endpoints::tas(client, course_id).await, "ta"),
    ] {
        let (users, _skipped) = fetch?;
        for u in &users {
            let row = InstructorRow {
                id: u.parsed.id.clone(),
                course_id: course_id.to_string(),
                name: u.parsed.name.clone().or(u.parsed.sortable_name.clone()),
                email: u.parsed.email.clone(),
                role: Some(role.to_string()),
                office_hours_note: None,
                starred: false,
                source: "api".into(),
                raw_json: Some(u.raw.to_string()),
                synced_at: Some(now.to_string()),
            };
            upsert::instructor(db, &row).await.map_err(log_db_err)?;
            written += 1;
        }
    }
    Ok(written)
}

// ── Model → row mapping ─────────────────────────────────────────────────────
// Pure functions, deliberately: this is where "Canvas's shape" becomes "our
// shape", and it must stay auditable at a glance. No `unwrap_or_default` on
// any score — `None` flows through (§2.2).

fn course_row(raw: &endpoints::Raw<models::Course>, now: &str) -> CourseRow {
    let c = &raw.parsed;
    // The caller's own student enrollment carries Canvas's computed scores.
    // Prefer the row typed "student"; fall back to any enrollment that has a
    // score at all (sections can produce oddly-typed duplicates).
    let scores = c.enrollments.as_ref().and_then(|es| {
        es.iter()
            .find(|e| e.kind.as_deref() == Some("student"))
            .or_else(|| es.iter().find(|e| e.computed_current_score.is_some()))
    });

    CourseRow {
        id: c.id.clone(),
        name: c.name.clone(),
        course_code: c.course_code.clone(),
        term: c.term.as_ref().and_then(|t| t.name.clone()),
        apply_group_weights: c.apply_assignment_group_weights,
        current_score: scores.and_then(|s| s.computed_current_score),
        final_score: scores.and_then(|s| s.computed_final_score),
        syllabus_html: c.syllabus_body.clone(),
        source: "api".into(),
        raw_json: Some(raw.raw.to_string()),
        synced_at: Some(now.to_string()),
    }
}

fn group_row(
    raw: &endpoints::Raw<models::AssignmentGroup>,
    course_id: &str,
    now: &str,
) -> AssignmentGroupRow {
    let g = &raw.parsed;
    AssignmentGroupRow {
        id: g.id.clone(),
        course_id: course_id.to_string(),
        name: g.name.clone(),
        group_weight: g.group_weight,
        position: g.position,
        source: "api".into(),
        raw_json: Some(raw.raw.to_string()),
        synced_at: Some(now.to_string()),
    }
}

fn assignment_row(
    raw: &endpoints::Raw<models::Assignment>,
    course_id: &str,
    now: &str,
) -> AssignmentRow {
    let a = &raw.parsed;
    // Rubric criteria + settings travel together or not at all.
    let rubric_json = match (&a.rubric, &a.rubric_settings) {
        (None, None) => None,
        (rubric, settings) => Some(
            serde_json::json!({ "rubric": rubric, "settings": settings }).to_string(),
        ),
    };
    AssignmentRow {
        id: a.id.clone(),
        course_id: course_id.to_string(),
        group_id: a.assignment_group_id.clone(),
        name: a.name.clone(),
        due_at: a.due_at.clone(),
        points_possible: a.points_possible,
        omit_from_final_grade: a.omit_from_final_grade,
        submission_types: a
            .submission_types
            .as_ref()
            .and_then(|t| serde_json::to_string(t).ok()),
        html_url: a.html_url.clone(),
        rubric_json,
        source: "api".into(),
        raw_json: Some(raw.raw.to_string()),
        synced_at: Some(now.to_string()),
    }
}

fn submission_row(s: &models::Submission, assignment_id: &str, now: &str) -> SubmissionRow {
    SubmissionRow {
        // The embedded submission usually repeats the assignment id; trust the
        // assignment we found it on when it doesn't.
        assignment_id: s
            .assignment_id
            .clone()
            .unwrap_or_else(|| assignment_id.to_string()),
        score: s.score,
        grade: s.grade.clone(),
        submitted_at: s.submitted_at.clone(),
        graded_at: s.graded_at.clone(),
        workflow_state: s.workflow_state.clone(),
        excused: s.excused,
        missing: s.missing,
        late: s.late,
        source: "api".into(),
        raw_json: serde_json::to_string(&serde_json::json!({
            "score": s.score, "grade": s.grade, "workflow_state": s.workflow_state,
            "excused": s.excused, "missing": s.missing, "late": s.late,
        }))
        .ok(),
        synced_at: Some(now.to_string()),
    }
}

/// Fold a database error into the engine's error type.
///
/// The engine's callers speak `CanvasError`; a storage failure mid-sync is
/// rare (disk full, file locked) and non-retryable, so it is folded into the
/// parse variant with a clear message rather than growing the enum for one
/// edge. The full error is logged here at the point of failure either way.
fn log_db_err(e: sqlx::Error) -> CanvasError {
    tracing::error!(error = %e, "database write failed during sync");
    CanvasError::Parse {
        path: "local database".into(),
        source: serde_json::Error::io(std::io::Error::other(e.to_string())),
    }
}
