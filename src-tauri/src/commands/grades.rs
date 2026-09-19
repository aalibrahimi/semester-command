//! Grade commands: read computed grades and run the solver.
//!
//! Called by: `src/lib/ipc.ts` (`courseSummaries`, `courseDetail`,
//! `whatDoINeed`, `setTarget`).
//! Calls: [`crate::grades`].
//!
//! This module is a thin translation layer and must stay that way. It loads
//! rows, hands them to `grades.rs`, and serialises the answer. The moment a
//! formula appears in this file, the test suite in `tests/grades_test.rs`
//! stops covering the thing that actually runs.

use std::collections::HashMap;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::{CommandError, CommandResult};
use crate::db::{queries, schema::*, upsert, Db};
use crate::grades::{
    self, AssignmentInput, CourseGrade, CourseInput, GradingMode, GroupInput, SignalStatus,
    SolveScope, SolverAnswer,
};

/// Default target when the user has not set one: an A− (90%). Visible in the
/// UI as the target marker, so the default is never silently load-bearing.
const DEFAULT_TARGET_PCT: f64 = 90.0;

// ─────────────────────────────────────────────────────────────────────────────
// Loading — one bundle read, shared by every command here and by triage.
// ─────────────────────────────────────────────────────────────────────────────

/// Everything grade-related from the DB, joined in memory. A semester is a
/// few hundred rows; loading it whole is simpler and faster than five
/// filtered queries per course.
pub struct Bundle {
    pub courses: Vec<CourseRow>,
    pub groups: Vec<AssignmentGroupRow>,
    pub assignments: Vec<AssignmentRow>,
    pub submissions: HashMap<String, SubmissionRow>,
    pub targets: HashMap<String, TargetRow>,
    pub estimates: HashMap<String, EstimateRow>,
}

pub async fn load_bundle(db: &Db) -> Result<Bundle, sqlx::Error> {
    Ok(Bundle {
        courses: queries::all_courses(db).await?,
        groups: queries::all_groups(db).await?,
        assignments: queries::all_assignments(db).await?,
        submissions: queries::all_submissions(db)
            .await?
            .into_iter()
            .map(|s| (s.assignment_id.clone(), s))
            .collect(),
        targets: queries::all_targets(db)
            .await?
            .into_iter()
            .map(|t| (t.course_id.clone(), t))
            .collect(),
        estimates: queries::all_estimates(db)
            .await?
            .into_iter()
            .map(|e| (e.assignment_id.clone(), e))
            .collect(),
    })
}

impl Bundle {
    /// Build the engine's input for one course.
    ///
    /// Assignments without a group (ICS or manual rows) go into a synthetic
    /// weightless group: in points mode they count fully; in weighted mode an
    /// unknown weight cannot honestly contribute, so they are inert there.
    pub fn course_input(&self, course_id: &str) -> CourseInput {
        let course = self.courses.iter().find(|c| c.id == course_id);
        let mode = match course.and_then(|c| c.apply_group_weights) {
            Some(true) => GradingMode::Weighted,
            // None = Canvas didn't say → points mode, the safer default.
            _ => GradingMode::Points,
        };

        let mut groups: Vec<GroupInput> = self
            .groups
            .iter()
            .filter(|g| g.course_id == course_id)
            .map(|g| GroupInput {
                id: g.id.clone(),
                weight: g.group_weight,
                assignments: Vec::new(),
            })
            .collect();
        let mut orphans = GroupInput {
            id: String::new(),
            weight: None,
            assignments: Vec::new(),
        };

        for a in self.assignments.iter().filter(|a| a.course_id == course_id) {
            let sub = self.submissions.get(&a.id);
            let input = AssignmentInput {
                id: a.id.clone(),
                points_possible: a.points_possible,
                omit_from_final_grade: a.omit_from_final_grade.unwrap_or(false),
                score: sub.and_then(|s| s.score),
                excused: sub.and_then(|s| s.excused).unwrap_or(false),
            };
            match groups.iter_mut().find(|g| Some(&g.id) == a.group_id.as_ref()) {
                Some(g) => g.assignments.push(input),
                None => orphans.assignments.push(input),
            }
        }
        if !orphans.assignments.is_empty() {
            groups.push(orphans);
        }
        CourseInput { mode, groups }
    }

    /// The course's target percentage and letter (user-set, or the default).
    pub fn target_of(&self, course_id: &str) -> (f64, String) {
        let scale = self.scale_of(course_id);
        match self.targets.get(course_id) {
            Some(t) => {
                let pct = t.target_pct.unwrap_or(DEFAULT_TARGET_PCT);
                let letter = t
                    .target_letter
                    .clone()
                    .unwrap_or_else(|| grades::letter_for(&scale, pct));
                (pct, letter)
            }
            None => (
                DEFAULT_TARGET_PCT,
                grades::letter_for(&scale, DEFAULT_TARGET_PCT),
            ),
        }
    }

    /// The course's grade scale (§4.4): the user's stored cutoffs, or the
    /// default A/A−/B+/… scale. Owned pairs either way, so every caller
    /// letters percentages through one code path.
    pub fn scale_of(&self, course_id: &str) -> Vec<(f64, String)> {
        self.targets
            .get(course_id)
            .and_then(|t| grades::scale_from_json(t.grade_scale_json.as_deref()))
            .unwrap_or_else(|| {
                grades::DEFAULT_SCALE
                    .iter()
                    .map(|(c, l)| (*c, (*l).to_string()))
                    .collect()
            })
    }

    /// Does this course still have a live pulse this term?
    ///
    /// Canvas's `enrollment_state=active` list is full of things that are not
    /// coursework — announcement shells, Title IX trainings, last term's
    /// courses never archived. Rather than asking the user to hide each one,
    /// a course is *active* when anything about it is recent: an assignment
    /// due in the last 30 days or the future, or work graded in the last 60.
    /// Inactive courses stay synced and visible on the Courses page; triage,
    /// the sidebar and the MCP tools skip them.
    pub fn is_active(&self, course_id: &str, now: chrono::DateTime<chrono::Utc>) -> bool {
        // A hand-made course is active by definition — the user created it on
        // purpose, possibly before adding any dated work, and "hidden" is the
        // tool for retiring it.
        if self
            .courses
            .iter()
            .any(|c| c.id == course_id && c.source == "manual")
        {
            return true;
        }
        let recent_due = now - chrono::Duration::days(30);
        let recent_grade = now - chrono::Duration::days(60);
        self.assignments
            .iter()
            .filter(|a| a.course_id == course_id)
            .any(|a| {
                let due_recent = a
                    .due_at
                    .as_deref()
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                    .map(|d| d.with_timezone(&chrono::Utc) >= recent_due)
                    .unwrap_or(false);
                let graded_recent = self
                    .submissions
                    .get(&a.id)
                    .and_then(|s| s.graded_at.as_deref())
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                    .map(|d| d.with_timezone(&chrono::Utc) >= recent_grade)
                    .unwrap_or(false);
                due_recent || graded_recent
            })
    }

    /// Is this course hidden (local view preference)?
    pub fn is_hidden(&self, course_id: &str) -> bool {
        self.targets.get(course_id).map(|t| t.hidden).unwrap_or(false)
    }

    /// Missing-work count: Canvas's own `missing` flag on ungraded work.
    pub fn missing_count(&self, course_id: &str) -> usize {
        self.assignments
            .iter()
            .filter(|a| a.course_id == course_id)
            .filter_map(|a| self.submissions.get(&a.id))
            .filter(|s| s.missing == Some(true) && s.score.is_none())
            .count()
    }

    /// Open (not submitted, not graded, not excused) assignments of a course.
    pub fn open_count(&self, course_id: &str) -> usize {
        self.assignments
            .iter()
            .filter(|a| a.course_id == course_id)
            .filter(|a| {
                let s = self.submissions.get(&a.id);
                let submitted = s.map(|s| s.submitted_at.is_some()).unwrap_or(false);
                let graded = s.map(|s| s.score.is_some()).unwrap_or(false);
                let excused = s.and_then(|s| s.excused).unwrap_or(false);
                !submitted && !graded && !excused
            })
            .count()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summaries — the sidebar's and course index's whole diet.
// ─────────────────────────────────────────────────────────────────────────────

/// One course as the sidebar and the Courses grid render it. Mirrored as
/// `CourseSummary` in `src/types/index.ts`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseSummary {
    pub id: String,
    pub course_code: Option<String>,
    pub name: Option<String>,
    pub term: Option<String>,
    pub source: String,
    pub grade: CourseGrade,
    pub max_possible_pct: f64,
    pub current_letter: Option<String>,
    pub projected_letter: String,
    pub target_pct: f64,
    pub target_letter: String,
    pub status: SignalStatus,
    pub open_count: usize,
    pub missing_count: usize,
    /// True when the course has any assignment worth points — the shells
    /// (announcements, advising) are false and the UI can de-emphasise them.
    pub gradeable: bool,
    /// True when the course shows recent life (see [`Bundle::is_active`]).
    /// Stale-but-still-"active" Canvas enrollments are false; the UI groups
    /// them with the shells instead of alongside this term's work.
    pub active: bool,
    /// Local view preference: hidden courses render only in the Courses
    /// page's collapsed section; every other surface skips them.
    pub hidden: bool,
}

/// The whole dashboard in one read. Mirrored as `Dashboard` in types.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    /// Sorted by risk: critical → atRisk → onTrack → locked, gradeable
    /// courses always above shells.
    pub courses: Vec<CourseSummary>,
    pub open_total: usize,
    pub due_this_week: usize,
}

fn storage_err(e: sqlx::Error) -> CommandError {
    CommandError::storage(format!("Database read failed: {e}"))
}

fn summary_of(bundle: &Bundle, course: &CourseRow) -> CourseSummary {
    let input = bundle.course_input(&course.id);
    let standing = grades::standing(&input);
    let grade = grades::course_grade(&input, course.current_score);
    let (target_pct, target_letter) = bundle.target_of(&course.id);
    let scale = bundle.scale_of(&course.id);
    let missing = bundle.missing_count(&course.id);
    let gradeable = input
        .groups
        .iter()
        .flat_map(|g| &g.assignments)
        .any(|a| a.points_possible.unwrap_or(0.0) > 0.0);

    CourseSummary {
        id: course.id.clone(),
        course_code: course.course_code.clone(),
        name: course.name.clone(),
        term: course.term.clone(),
        source: course.source.clone(),
        current_letter: grade.current_pct.map(|p| grades::letter_for(&scale, p)),
        projected_letter: grades::letter_for(&scale, grade.projected_pct),
        max_possible_pct: standing.max_possible_pct,
        status: grades::signal(&standing, target_pct, missing),
        grade,
        target_pct,
        target_letter,
        open_count: bundle.open_count(&course.id),
        missing_count: missing,
        gradeable,
        active: bundle.is_active(&course.id, chrono::Utc::now()),
        hidden: bundle.is_hidden(&course.id),
    }
}

/// Every course, graded and ranked by risk, plus the nav counts.
#[tauri::command]
pub async fn course_summaries(app: AppHandle) -> CommandResult<Dashboard> {
    let db = app.state::<Db>().inner().clone();
    let bundle = load_bundle(&db).await.map_err(storage_err)?;

    let mut courses: Vec<CourseSummary> = bundle
        .courses
        .iter()
        .map(|c| summary_of(&bundle, c))
        .collect();

    // Risk order (§5): the course closest to falling short sits on top.
    // Dormant courses (shells, stale enrollments) sink below everything
    // live; hidden courses below that (they still ship so the Courses page
    // can offer an unhide section).
    fn rank(s: &CourseSummary) -> (u8, u8, u8) {
        let status = match s.status {
            SignalStatus::Critical => 0,
            SignalStatus::AtRisk => 1,
            SignalStatus::OnTrack => 2,
            SignalStatus::Locked => 3,
        };
        (u8::from(s.hidden), u8::from(!s.gradeable || !s.active), status)
    }
    courses.sort_by(|a, b| {
        rank(a).cmp(&rank(b)).then(
            // Within a tier: smallest margin over target first.
            (a.grade.projected_pct - a.target_pct)
                .partial_cmp(&(b.grade.projected_pct - b.target_pct))
                .unwrap_or(std::cmp::Ordering::Equal),
        )
    });

    // Counts describe what the user actually watches — hidden and dormant
    // courses are out of both.
    let watched: std::collections::HashSet<&str> = courses
        .iter()
        .filter(|c| !c.hidden && c.active)
        .map(|c| c.id.as_str())
        .collect();
    let open_total = courses
        .iter()
        .filter(|c| watched.contains(c.id.as_str()))
        .map(|c| c.open_count)
        .sum();
    // Parsed comparison, not lexicographic: API rows render "…Z" but the ICS
    // path historically wrote "+00:00" offsets, and a string compare quietly
    // mixes the two.
    let now = chrono::Utc::now();
    let week_out = now + chrono::Duration::days(7);
    // "Due this week" = OPEN work due in the next 7 days. One definition,
    // exported once — the Triage tile, its hover preview and the week rail
    // all render this number's set, never a local recount.
    let due_this_week = bundle
        .assignments
        .iter()
        .filter(|a| watched.contains(a.course_id.as_str()))
        .filter(|a| {
            let s = bundle.submissions.get(&a.id);
            let submitted = s.map(|s| s.submitted_at.is_some()).unwrap_or(false);
            let graded = s.map(|s| s.score.is_some()).unwrap_or(false);
            let excused = s.and_then(|s| s.excused).unwrap_or(false);
            !submitted && !graded && !excused
        })
        .filter(|a| {
            a.due_at
                .as_deref()
                .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                .map(|d| {
                    let d = d.with_timezone(&chrono::Utc);
                    d > now && d <= week_out
                })
                .unwrap_or(false)
        })
        .count();

    Ok(Dashboard { courses, open_total, due_this_week })
}

// ─────────────────────────────────────────────────────────────────────────────
// Course detail
// ─────────────────────────────────────────────────────────────────────────────

/// One assignment as the detail table renders it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentDetail {
    pub id: String,
    pub group_id: Option<String>,
    pub name: Option<String>,
    pub due_at: Option<String>,
    pub points_possible: Option<f64>,
    pub score: Option<f64>,
    pub excused: bool,
    pub missing: bool,
    pub late: bool,
    pub submitted: bool,
    pub omitted: bool,
    pub html_url: Option<String>,
    pub source: String,
    pub has_rubric: bool,
    pub rubric_json: Option<String>,
    /// The instructor's description, as Canvas HTML. Not a schema column —
    /// extracted from the stored `raw_json` on read, which is exactly the
    /// "shapes we didn't model are still on disk" payoff of §2.2.
    pub description_html: Option<String>,
    /// JSON array as text, e.g. `["online_upload"]`, for the detail sheet.
    pub submission_types: Option<String>,
    /// Percentage points of the final grade riding on this one assignment.
    pub impact_pct: f64,
    pub est_minutes: Option<i64>,
}

/// One group with its own percentage.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupDetail {
    pub id: String,
    pub name: Option<String>,
    pub weight: Option<f64>,
    /// This group's share of the final grade, 0–100, from
    /// [`grades::group_shares`]. The Composition card renders this verbatim
    /// — a share computed in TypeScript is the §10 bug.
    pub share_pct: f64,
    /// Earned / possible over the group's *graded* work — its current pct.
    pub current_pct: Option<f64>,
    pub graded_count: usize,
    pub total_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseDetailPayload {
    pub summary: CourseSummary,
    pub groups: Vec<GroupDetail>,
    pub assignments: Vec<AssignmentDetail>,
    pub instructors: Vec<InstructorRow>,
    /// The scale letters are computed with: the stored per-course cutoffs,
    /// or the default. Descending `[cutoff, letter]` pairs.
    pub scale: Vec<(f64, String)>,
    /// True when `scale` came from the user, not the default — the editor
    /// offers "reset to default" only then.
    pub custom_scale: bool,
    /// In a weighted course, assignments outside any weighted group cannot
    /// count toward the grade. The count ships so the UI says so out loud
    /// instead of the rows being silently inert (they are still listed,
    /// still in triage, still reminded about).
    pub uncounted_count: usize,
}

/// Everything the course-detail screen needs, in one read.
#[tauri::command]
pub async fn course_detail(app: AppHandle, course_id: String) -> CommandResult<CourseDetailPayload> {
    let db = app.state::<Db>().inner().clone();
    let bundle = load_bundle(&db).await.map_err(storage_err)?;

    let course = bundle
        .courses
        .iter()
        .find(|c| c.id == course_id)
        .ok_or_else(|| CommandError::internal("That course is not in the local database."))?;

    let input = bundle.course_input(&course_id);
    let summary = summary_of(&bundle, course);

    // Per-group current percentages, from the engine's own arithmetic (a
    // one-group CourseInput in points mode is exactly "earned over possible
    // for the graded work in this group").
    let shares: HashMap<String, f64> = grades::group_shares(&input).into_iter().collect();
    let groups = bundle
        .groups
        .iter()
        .filter(|g| g.course_id == course_id)
        .map(|g| {
            let engine_group = input.groups.iter().find(|ig| ig.id == g.id);
            let assignments = engine_group.map(|ig| ig.assignments.clone()).unwrap_or_default();
            let solo = CourseInput {
                mode: GradingMode::Points,
                groups: vec![GroupInput { id: g.id.clone(), weight: None, assignments: assignments.clone() }],
            };
            GroupDetail {
                id: g.id.clone(),
                name: g.name.clone(),
                weight: g.group_weight,
                share_pct: shares.get(&g.id).copied().unwrap_or(0.0),
                current_pct: grades::standing(&solo).current_pct,
                graded_count: assignments.iter().filter(|a| a.score.is_some()).count(),
                total_count: assignments.len(),
            }
        })
        .collect();

    // The synthetic orphan group (empty id) holds ICS/manual assignments
    // with no Canvas group. In weighted mode those cannot count (§3) — say
    // how many, so the UI can warn instead of the user wondering why a
    // manual assignment moves nothing.
    let uncounted_count = match input.mode {
        GradingMode::Weighted => input
            .groups
            .iter()
            .filter(|g| g.id.is_empty() || g.weight.is_none())
            .flat_map(|g| &g.assignments)
            .filter(|a| a.points_possible.unwrap_or(0.0) > 0.0)
            .count(),
        GradingMode::Points => 0,
    };

    let assignments = bundle
        .assignments
        .iter()
        .filter(|a| a.course_id == course_id)
        .map(|a| {
            let s = bundle.submissions.get(&a.id);
            AssignmentDetail {
                id: a.id.clone(),
                group_id: a.group_id.clone(),
                name: a.name.clone(),
                due_at: a.due_at.clone(),
                points_possible: a.points_possible,
                score: s.and_then(|s| s.score),
                excused: s.and_then(|s| s.excused).unwrap_or(false),
                missing: s.and_then(|s| s.missing).unwrap_or(false),
                late: s.and_then(|s| s.late).unwrap_or(false),
                submitted: s.map(|s| s.submitted_at.is_some()).unwrap_or(false),
                omitted: a.omit_from_final_grade.unwrap_or(false),
                html_url: a.html_url.clone(),
                source: a.source.clone(),
                has_rubric: a.rubric_json.is_some(),
                rubric_json: a.rubric_json.clone(),
                description_html: a
                    .raw_json
                    .as_deref()
                    .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
                    .and_then(|v| v.get("description")?.as_str().map(str::to_string))
                    .filter(|s| !s.trim().is_empty()),
                submission_types: a.submission_types.clone(),
                impact_pct: grades::grade_impact_pct(&input, &a.id),
                est_minutes: bundle.estimates.get(&a.id).and_then(|e| e.est_minutes),
            }
        })
        .collect();

    let instructors = queries::all_instructors(&db)
        .await
        .map_err(storage_err)?
        .into_iter()
        .filter(|i| i.course_id == course_id)
        .collect();

    let custom_scale = bundle
        .targets
        .get(&course_id)
        .and_then(|t| grades::scale_from_json(t.grade_scale_json.as_deref()))
        .is_some();
    let scale = bundle.scale_of(&course_id);

    Ok(CourseDetailPayload {
        summary,
        groups,
        assignments,
        instructors,
        scale,
        custom_scale,
        uncounted_count,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Solver + target
// ─────────────────────────────────────────────────────────────────────────────

/// "What do I need?" `assignment_id: None` = averaged over everything
/// remaining; `Some(id)` = that one assignment, others held at projection.
#[tauri::command]
pub async fn what_do_i_need(
    app: AppHandle,
    course_id: String,
    target_pct: f64,
    assignment_id: Option<String>,
) -> CommandResult<SolverAnswer> {
    let db = app.state::<Db>().inner().clone();
    let bundle = load_bundle(&db).await.map_err(storage_err)?;
    let input = bundle.course_input(&course_id);

    let scope = match &assignment_id {
        Some(id) => SolveScope::SingleAssignment(id),
        None => SolveScope::EverythingRemaining,
    };
    Ok(grades::solve(&input, target_pct, scope, &bundle.scale_of(&course_id)))
}

/// Set or clear a course's grade scale (§4.4). `scale: None` resets to the
/// default. Cutoffs are validated here — a scale that can't letter anything
/// should fail at the dialog, not corrupt every later render.
#[tauri::command]
pub async fn set_grade_scale(
    app: AppHandle,
    course_id: String,
    scale: Option<Vec<(f64, String)>>,
) -> CommandResult<()> {
    let json = match &scale {
        None => None,
        Some(pairs) => {
            if pairs.is_empty() {
                return Err(CommandError::internal("A scale needs at least one cutoff."));
            }
            if pairs.iter().any(|(c, l)| !(0.0..=110.0).contains(c) || l.trim().is_empty()) {
                return Err(CommandError::internal(
                    "Each cutoff must be 0–110% and carry a letter.",
                ));
            }
            Some(
                serde_json::to_string(pairs)
                    .map_err(|e| CommandError::internal(format!("could not encode scale: {e}")))?,
            )
        }
    };
    let db = app.state::<Db>().inner().clone();
    upsert::grade_scale(&db, &course_id, json.as_deref())
        .await
        .map_err(storage_err)
}

/// Hide or unhide a course everywhere. A view preference, never a deletion —
/// the course's data stays synced and unhiding restores it instantly.
#[tauri::command]
pub async fn set_course_hidden(
    app: AppHandle,
    course_id: String,
    hidden: bool,
) -> CommandResult<()> {
    let db = app.state::<Db>().inner().clone();
    upsert::course_hidden(&db, &course_id, hidden)
        .await
        .map_err(storage_err)
}

/// Set (or reset) a course's target grade.
#[tauri::command]
pub async fn set_target(
    app: AppHandle,
    course_id: String,
    target_pct: f64,
    target_letter: Option<String>,
) -> CommandResult<()> {
    if !(0.0..=110.0).contains(&target_pct) {
        return Err(CommandError::internal("Target must be between 0 and 110%."));
    }
    let db = app.state::<Db>().inner().clone();
    let letter = match target_letter {
        Some(l) => l,
        // Letter the percentage on this course's own scale, not the default.
        None => {
            let bundle = load_bundle(&db).await.map_err(storage_err)?;
            grades::letter_for(&bundle.scale_of(&course_id), target_pct)
        }
    };
    upsert::target(&db, &course_id, &letter, target_pct)
        .await
        .map_err(storage_err)?;
    Ok(())
}
