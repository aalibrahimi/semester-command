//! Table structs mirroring `migrations/0001_init.sql`.
//!
//! Called by: [`super::queries`], [`super::upsert`], the sync engine, and
//! (serialised) the debug view.
//! Calls: nothing.
//!
//! One struct per table, fields in column order. All of them derive
//! `sqlx::FromRow` for reads and `serde::Serialize` (camelCase) because the
//! debug view renders rows verbatim. Score-ish fields are `Option<f64>` —
//! NULL means "not graded", never zero, and nothing in this file may default
//! it (§2.2, §4.2).

use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseRow {
    pub id: String,
    pub name: Option<String>,
    pub course_code: Option<String>,
    pub term: Option<String>,
    /// `None` = Canvas didn't say. The grade engine treats that as points mode
    /// but must surface the uncertainty (§4.1).
    pub apply_group_weights: Option<bool>,
    /// Canvas's own computed scores, for reconciliation (§4.2). Not ours.
    pub current_score: Option<f64>,
    pub final_score: Option<f64>,
    pub syllabus_html: Option<String>,
    pub source: String,
    pub raw_json: Option<String>,
    pub synced_at: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentGroupRow {
    pub id: String,
    pub course_id: String,
    pub name: Option<String>,
    pub group_weight: Option<f64>,
    pub position: Option<i64>,
    pub source: String,
    pub raw_json: Option<String>,
    pub synced_at: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentRow {
    pub id: String,
    pub course_id: String,
    pub group_id: Option<String>,
    pub name: Option<String>,
    pub due_at: Option<String>,
    pub points_possible: Option<f64>,
    pub omit_from_final_grade: Option<bool>,
    /// JSON array as text, e.g. `["online_upload"]`.
    pub submission_types: Option<String>,
    pub html_url: Option<String>,
    pub rubric_json: Option<String>,
    pub source: String,
    pub raw_json: Option<String>,
    pub synced_at: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionRow {
    pub assignment_id: String,
    /// NULL = not graded. The one field this whole app exists to not corrupt.
    pub score: Option<f64>,
    pub grade: Option<String>,
    pub submitted_at: Option<String>,
    pub graded_at: Option<String>,
    pub workflow_state: Option<String>,
    pub excused: Option<bool>,
    pub missing: Option<bool>,
    pub late: Option<bool>,
    pub source: String,
    pub raw_json: Option<String>,
    pub synced_at: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstructorRow {
    pub id: String,
    pub course_id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    /// Local-only; the upsert never touches it (§3).
    pub office_hours_note: Option<String>,
    /// Local-only "this is MY professor" flag — Canvas lists every section's
    /// teacher on umbrella courses, so which one is yours is user knowledge.
    pub starred: bool,
    pub source: String,
    pub raw_json: Option<String>,
    pub synced_at: Option<String>,
}

/// A syllabus document on disk, with its extracted text (migration 0003).
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyllabusFileRow {
    pub id: i64,
    pub course_id: String,
    pub canvas_file_id: Option<String>,
    pub filename: String,
    pub content_type: Option<String>,
    pub local_path: String,
    pub extracted_text: Option<String>,
    pub source: String,
    pub fetched_at: Option<String>,
}

/// Local-only (§3): the user's target grade per course.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetRow {
    pub course_id: String,
    pub target_letter: Option<String>,
    pub target_pct: Option<f64>,
    pub grade_scale_json: Option<String>,
    /// View preference: true removes the course from every surface except
    /// the Courses page's "hidden" section. Never deletes anything.
    pub hidden: bool,
}

/// Local-only (§3): the user's time estimate per assignment.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateRow {
    pub assignment_id: String,
    pub est_minutes: Option<i64>,
    pub my_note: Option<String>,
}

/// One weekly-planner block (migration 0009). Local-only.
#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannerBlockRow {
    pub id: i64,
    /// 'class' | 'event'.
    pub kind: String,
    pub course_id: Option<String>,
    pub title: String,
    pub location: Option<String>,
    /// 0 = Monday … 6 = Sunday for weekly blocks; NULL for one-offs.
    pub weekday: Option<i64>,
    /// 'YYYY-MM-DD' for one-off blocks; NULL for weekly.
    pub date: Option<String>,
    pub start_min: i64,
    pub end_min: i64,
    pub note: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncLogRow {
    pub id: i64,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub entity: String,
    pub ok: bool,
    pub error: Option<String>,
}
