//! The triage ranking algorithm (SPEC.md §5, screen 1).
//!
//! Called by: [`crate::commands::data`].
//! Calls: [`crate::grades`] for grade impact; rows arrive pre-loaded in a
//! [`crate::commands::grades::Bundle`].
//!
//! ```text
//! score        = (grade_impact × urgency) / est_hours
//! grade_impact = percentage points of the final grade riding on the item
//! urgency      = 1 / max(days_until_due, 0.5)
//! ```
//!
//! `grade_impact` comes from [`crate::grades::grade_impact_pct`] — the swing
//! between scoring zero and full marks — rather than raw points, because in a
//! weighted course a 100-point assignment in a 10% group matters far less
//! than a 20-point one in a 40% group, and points alone cannot see that.
//!
//! The `max(days_until_due, 0.5)` floor keeps urgency finite for something
//! due in an hour. Without it the score approaches infinity as the deadline
//! approaches and a trivial discussion post due in ten minutes outranks the
//! midterm — which is exactly backwards, since the midterm is still winnable.
//!
//! Overdue-but-still-open and missing items are pinned above the ranked list
//! rather than scored into it (§5). Their urgency is degenerate and their
//! real priority is "deal with this now", which a formula should not have to
//! express.

use serde::Serialize;

use crate::commands::grades::Bundle;
use crate::grades;

/// Why a row is on the list. Also the pill the UI renders.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TriageState {
    /// Canvas marked it missing.
    Missing,
    /// Past due, still open.
    Overdue,
    /// Open, due in the future (or undated).
    Open,
}

/// One row of the triage list. Mirrored as `TriageRow` in types.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriageRow {
    pub assignment_id: String,
    pub course_id: String,
    pub course_code: Option<String>,
    pub name: Option<String>,
    pub due_at: Option<String>,
    pub points_possible: Option<f64>,
    /// "worth X% of your final grade" — the row's headline number.
    pub impact_pct: f64,
    pub est_minutes: Option<i64>,
    pub state: TriageState,
    pub html_url: Option<String>,
    /// The ranking score, exposed so the debug view can sanity-check order.
    pub score: f64,
}

/// Rank everything not yet submitted. Pinned states first (most overdue at
/// the very top), then open items by descending score.
pub fn rank(bundle: &Bundle, now: chrono::DateTime<chrono::Utc>) -> Vec<TriageRow> {
    let mut rows: Vec<TriageRow> = Vec::new();

    for course in &bundle.courses {
        let input = bundle.course_input(&course.id);

        for a in bundle.assignments.iter().filter(|a| a.course_id == course.id) {
            let sub = bundle.submissions.get(&a.id);
            let submitted = sub.map(|s| s.submitted_at.is_some()).unwrap_or(false);
            let graded = sub.map(|s| s.score.is_some()).unwrap_or(false);
            let excused = sub.and_then(|s| s.excused).unwrap_or(false);
            if submitted || graded || excused || a.omit_from_final_grade.unwrap_or(false) {
                continue;
            }

            let due = a
                .due_at
                .as_deref()
                .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                .map(|d| d.with_timezone(&chrono::Utc));

            // Ancient artifacts (more than 30 days past due, e.g. from a
            // previous term still marked active) are clutter, not triage.
            // Canvas-flagged `missing` items stay regardless.
            let missing = sub.and_then(|s| s.missing).unwrap_or(false);
            let long_gone = due
                .map(|d| now.signed_duration_since(d).num_days() > 30)
                .unwrap_or(false);
            if long_gone && !missing {
                continue;
            }

            let impact = grades::grade_impact_pct(&input, &a.id);
            // Zero-impact, zero-point rows (surveys, shells) only make the
            // list if Canvas itself flags them missing.
            if impact <= 0.0 && a.points_possible.unwrap_or(0.0) <= 0.0 && !missing {
                continue;
            }

            let overdue = due.map(|d| d < now).unwrap_or(false);
            let state = if missing {
                TriageState::Missing
            } else if overdue {
                TriageState::Overdue
            } else {
                TriageState::Open
            };

            // Undated work is "someday" — ranked as two weeks out.
            let days_until = due
                .map(|d| (d - now).num_minutes() as f64 / (60.0 * 24.0))
                .unwrap_or(14.0);
            let urgency = 1.0 / days_until.max(0.5);
            let est_minutes = bundle.estimates.get(&a.id).and_then(|e| e.est_minutes);
            // No estimate defaults to one hour; a floor of 15 minutes stops a
            // tiny estimate from catapulting a trivial item over a midterm.
            let est_hours = est_minutes.map(|m| m as f64 / 60.0).unwrap_or(1.0).max(0.25);
            let score = (impact * urgency) / est_hours;

            rows.push(TriageRow {
                assignment_id: a.id.clone(),
                course_id: course.id.clone(),
                course_code: course.course_code.clone(),
                name: a.name.clone(),
                due_at: a.due_at.clone(),
                points_possible: a.points_possible,
                impact_pct: impact,
                est_minutes,
                state,
                html_url: a.html_url.clone(),
                score,
            });
        }
    }

    rows.sort_by(|a, b| {
        let pin = |r: &TriageRow| u8::from(r.state == TriageState::Open);
        pin(a)
            .cmp(&pin(b))
            .then_with(|| match (a.state, b.state) {
                // Pinned zone: oldest deadline first — the longest-overdue
                // item is the most on fire.
                (x, y) if x != TriageState::Open && y != TriageState::Open => {
                    a.due_at.cmp(&b.due_at)
                }
                // Ranked zone: highest score first.
                _ => b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal),
            })
    });
    rows
}
