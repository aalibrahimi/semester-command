//! One function per Canvas endpoint (SPEC.md §2.1).
//!
//! Called by: the sync engine.
//! Calls: [`super::client`] — every request goes through the paginating helper
//! there, without exception.
//!
//! Each function returns `Vec<Raw<T>>`: the typed struct *and* the exact JSON
//! it was parsed from, so the sync engine can store per-row `raw_json` (§2.2).
//! A row that fails to parse is skipped and counted, never fatal — one
//! malformed assignment must not cost the course (§6). The full response body
//! is also already on disk via the client's raw log, so a skipped row is
//! recoverable evidence, not lost data.
//!
//! NOTE: never invent a field name here or in [`super::models`]. If unsure,
//! fetch the endpoint once, read the raw JSON on disk, and model what actually
//! came back (§8). Guesses in this file become wrong numbers three layers up.

use super::client::{CanvasClient, CanvasError};
use super::models::*;

/// A parsed row plus the JSON it came from.
#[derive(Debug)]
pub struct Raw<T> {
    pub parsed: T,
    pub raw: serde_json::Value,
}

/// Fetch a collection, keeping raw JSON per row.
///
/// Returns the parsed rows and how many were skipped as unparseable.
async fn get_all_raw<T: serde::de::DeserializeOwned>(
    client: &CanvasClient,
    path: &str,
) -> Result<(Vec<Raw<T>>, usize), CanvasError> {
    let values: Vec<serde_json::Value> = client.get_all(path).await?;
    let mut out = Vec::with_capacity(values.len());
    let mut skipped = 0usize;

    for value in values {
        match serde_json::from_value::<T>(value.clone()) {
            Ok(parsed) => out.push(Raw { parsed, raw: value }),
            Err(e) => {
                skipped += 1;
                // The id is the one thing worth pulling out of the wreckage —
                // it lets the raw dump on disk be searched for the culprit.
                let id = value.get("id").map(|v| v.to_string()).unwrap_or_default();
                tracing::warn!(path, id, error = %e, "row failed to parse; skipped");
            }
        }
    }
    Ok((out, skipped))
}

/// Active courses with scores, teachers, term and syllabus in one call.
pub async fn active_courses(
    client: &CanvasClient,
) -> Result<(Vec<Raw<Course>>, usize), CanvasError> {
    get_all_raw(
        client,
        "/courses?enrollment_state=active&include[]=total_scores&include[]=teachers&include[]=term&include[]=syllabus_body",
    )
    .await
}

/// Assignment groups (with weights) for one course.
pub async fn assignment_groups(
    client: &CanvasClient,
    course_id: &str,
) -> Result<(Vec<Raw<AssignmentGroup>>, usize), CanvasError> {
    get_all_raw(client, &format!("/courses/{course_id}/assignment_groups")).await
}

/// Assignments for one course, each carrying the caller's submission and the
/// embedded rubric.
pub async fn assignments(
    client: &CanvasClient,
    course_id: &str,
) -> Result<(Vec<Raw<Assignment>>, usize), CanvasError> {
    get_all_raw(
        client,
        &format!("/courses/{course_id}/assignments?include[]=submission&include[]=score_statistics"),
    )
    .await
}

/// Teachers of one course. Role comes from the request filter, not the
/// payload — see [`CourseUser`].
pub async fn teachers(
    client: &CanvasClient,
    course_id: &str,
) -> Result<(Vec<Raw<CourseUser>>, usize), CanvasError> {
    get_all_raw(
        client,
        &format!("/courses/{course_id}/users?enrollment_type[]=teacher&include[]=email"),
    )
    .await
}

/// TAs of one course.
pub async fn tas(
    client: &CanvasClient,
    course_id: &str,
) -> Result<(Vec<Raw<CourseUser>>, usize), CanvasError> {
    get_all_raw(
        client,
        &format!("/courses/{course_id}/users?enrollment_type[]=ta&include[]=email"),
    )
    .await
}
