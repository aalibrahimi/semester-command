//! serde types mirroring Canvas's JSON.
//!
//! Called by: [`super::endpoints`] and the sync engine.
//! Calls: nothing.
//!
//! # Two rules, both learned the hard way
//!
//! **Every field is `Option<T>`.** Canvas omits keys constantly depending on
//! permissions, course settings and enrollment type. A field that is present in
//! every course you have looked at so far is not guaranteed to be present in
//! the next one. The only exception is `id`: an entity without an id cannot be
//! upserted, so a missing id is a parse failure by design — better a logged
//! skip than a row keyed on garbage.
//!
//! **Never `unwrap_or_default()` a grade.** A missing `score` is not zero — it
//! means "not graded yet", and the difference between those two is the whole
//! distinction between the current and projected numbers in §4.2. Handle `None`
//! explicitly at the point where you know what it means.
//!
//! Alongside the parsed struct, sync stores each row's raw JSON in a
//! `raw_json` column (§2.2), so a shape nobody anticipated is a parser fix,
//! not lost data. Fields not modelled here are therefore not lost — they are
//! on disk, one `serde` line away.
//!
//! IDs are `String` throughout: every request sends
//! `Accept: application/json+canvas-string-ids` (§2.0).

use serde::Deserialize;

/// A course, from `GET /courses?...&include[]=total_scores&include[]=teachers
/// &include[]=term&include[]=syllabus_body`.
#[derive(Debug, Clone, Deserialize)]
pub struct Course {
    pub id: String,
    pub name: Option<String>,
    pub course_code: Option<String>,
    /// The grading-mode switch the entire grade engine branches on (§4.1).
    pub apply_assignment_group_weights: Option<bool>,
    pub term: Option<Term>,
    pub syllabus_body: Option<String>,
    /// With `include[]=total_scores`, the caller's own enrollment(s) carry
    /// Canvas's computed scores — which saves the separate `/enrollments`
    /// call §2.1 lists.
    pub enrollments: Option<Vec<CourseEnrollment>>,
    /// With `include[]=teachers`: display names only, no email. The dedicated
    /// users call fills in the rest; this is the fallback when that call 403s.
    pub teachers: Option<Vec<TeacherDisplay>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Term {
    pub name: Option<String>,
}

/// The caller's enrollment summary embedded in a course.
///
/// NOTE: here the score fields are `computed_*`, but on the standalone
/// enrollments endpoint they live under a `grades` object. Same numbers, two
/// shapes — this struct models the embedded one.
#[derive(Debug, Clone, Deserialize)]
pub struct CourseEnrollment {
    #[serde(rename = "type")]
    pub kind: Option<String>,
    pub computed_current_score: Option<f64>,
    pub computed_final_score: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TeacherDisplay {
    pub id: Option<String>,
    pub display_name: Option<String>,
}

/// An assignment group, from `GET /courses/:id/assignment_groups`.
#[derive(Debug, Clone, Deserialize)]
pub struct AssignmentGroup {
    pub id: String,
    pub name: Option<String>,
    /// Percent of the final grade, meaningful only when the course has
    /// `apply_assignment_group_weights = true` — Canvas populates it in
    /// points mode too (docs/CANVAS_API.md gotcha 10).
    pub group_weight: Option<f64>,
    pub position: Option<i64>,
}

/// An assignment, from `GET /courses/:id/assignments?include[]=submission`.
#[derive(Debug, Clone, Deserialize)]
pub struct Assignment {
    pub id: String,
    pub assignment_group_id: Option<String>,
    pub name: Option<String>,
    /// RFC 3339 UTC, and often null (gotcha 13).
    pub due_at: Option<String>,
    /// Can be 0 or null (gotcha 9). The grade engine owns that headache.
    pub points_possible: Option<f64>,
    pub omit_from_final_grade: Option<bool>,
    pub submission_types: Option<Vec<String>>,
    pub html_url: Option<String>,
    /// Rubric criteria arrive embedded — no separate call (§2.1). Kept as
    /// raw JSON: the M3 sheet renders criteria, nothing computes on them.
    pub rubric: Option<serde_json::Value>,
    pub rubric_settings: Option<serde_json::Value>,
    /// With `include[]=submission`: the caller's own submission.
    pub submission: Option<Submission>,
}

/// The caller's submission for one assignment.
#[derive(Debug, Clone, Deserialize)]
pub struct Submission {
    pub assignment_id: Option<String>,
    /// None = not graded. Never default this (module docs).
    pub score: Option<f64>,
    pub grade: Option<String>,
    pub submitted_at: Option<String>,
    pub graded_at: Option<String>,
    pub workflow_state: Option<String>,
    pub excused: Option<bool>,
    pub missing: Option<bool>,
    pub late: Option<bool>,
}

/// A user, from `GET /courses/:id/users?enrollment_type[]=...`.
///
/// The role is *not* in this payload — it is implied by the
/// `enrollment_type[]` filter of the request that fetched it, which is why
/// instructors and TAs are fetched with two calls rather than one.
#[derive(Debug, Clone, Deserialize)]
pub struct CourseUser {
    pub id: String,
    pub name: Option<String>,
    pub sortable_name: Option<String>,
    /// Present only with `include[]=email`, and SJSU may still withhold it.
    pub email: Option<String>,
}
