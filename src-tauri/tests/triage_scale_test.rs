//! Tests for the surfaces around the grade engine: triage pinning and
//! dormant-course filtering, group shares (the Composition card's numbers),
//! and per-course grade scales.
//!
//! Called by: `cargo test`.
//! Calls: [`semester_command_lib::triage`], [`semester_command_lib::grades`],
//! and the `Bundle` loader's pure helpers.

use std::collections::HashMap;

use semester_command_lib::commands::grades::Bundle;
use semester_command_lib::db::schema::*;
use semester_command_lib::grades::{self, CourseInput, GradingMode, GroupInput, AssignmentInput};
use semester_command_lib::triage::{self, TriageState};

// ── Builders ────────────────────────────────────────────────────────────────

fn course_row(id: &str, code: &str, weighted: bool) -> CourseRow {
    CourseRow {
        id: id.into(),
        name: Some(code.into()),
        course_code: Some(code.into()),
        term: None,
        apply_group_weights: Some(weighted),
        current_score: None,
        final_score: None,
        syllabus_html: None,
        source: "api".into(),
        raw_json: None,
        synced_at: None,
    }
}

fn group_row(id: &str, course_id: &str, weight: Option<f64>) -> AssignmentGroupRow {
    AssignmentGroupRow {
        id: id.into(),
        course_id: course_id.into(),
        name: Some(id.into()),
        group_weight: weight,
        position: None,
        source: "api".into(),
        raw_json: None,
        synced_at: None,
    }
}

fn assignment_row(
    id: &str,
    course_id: &str,
    group_id: Option<&str>,
    due_at: Option<&str>,
    points: Option<f64>,
) -> AssignmentRow {
    AssignmentRow {
        id: id.into(),
        course_id: course_id.into(),
        group_id: group_id.map(String::from),
        name: Some(id.into()),
        due_at: due_at.map(String::from),
        points_possible: points,
        omit_from_final_grade: None,
        submission_types: None,
        html_url: None,
        rubric_json: None,
        source: "api".into(),
        raw_json: None,
        synced_at: None,
    }
}

fn missing_submission(assignment_id: &str) -> SubmissionRow {
    SubmissionRow {
        assignment_id: assignment_id.into(),
        score: None,
        grade: None,
        submitted_at: None,
        graded_at: None,
        workflow_state: Some("unsubmitted".into()),
        excused: None,
        missing: Some(true),
        late: None,
        source: "api".into(),
        raw_json: None,
        synced_at: None,
    }
}

fn bundle(
    courses: Vec<CourseRow>,
    groups: Vec<AssignmentGroupRow>,
    assignments: Vec<AssignmentRow>,
    submissions: Vec<SubmissionRow>,
) -> Bundle {
    Bundle {
        courses,
        groups,
        assignments,
        submissions: submissions
            .into_iter()
            .map(|s| (s.assignment_id.clone(), s))
            .collect(),
        targets: HashMap::new(),
        estimates: HashMap::new(),
    }
}

fn now() -> chrono::DateTime<chrono::Utc> {
    "2026-09-18T12:00:00Z".parse().unwrap()
}

// ── Triage pinning ──────────────────────────────────────────────────────────

/// A 0-point checklist Canvas flagged missing (the live "Assignment List
/// Review" shape) must not sit above a heavyweight assignment due tomorrow.
/// It keeps its Missing pill but ranks on score.
#[test]
fn zero_stake_overdue_is_not_pinned() {
    let b = bundle(
        vec![course_row("c1", "HIST-15", true)],
        vec![group_row("g1", "c1", Some(100.0))],
        vec![
            // The noise: overdue, zero points, flagged missing by Canvas.
            assignment_row("checklist", "c1", None, Some("2026-09-10T07:00:00Z"), Some(0.0)),
            // The real work: due tomorrow, all the marbles.
            assignment_row("essay", "c1", Some("g1"), Some("2026-09-19T07:00:00Z"), Some(100.0)),
        ],
        vec![missing_submission("checklist")],
    );

    let rows = triage::rank(&b, now());
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].assignment_id, "essay", "real work outranks 0-point noise");
    assert!(!rows[0].pinned);
    assert_eq!(rows[1].state, TriageState::Missing, "the pill still says missing");
    assert!(!rows[1].pinned, "but zero stake does not pin");
}

/// Overdue work with real points on the line still pins above everything.
#[test]
fn overdue_with_stake_still_pins() {
    let b = bundle(
        vec![course_row("c1", "LING-115", true)],
        vec![group_row("g1", "c1", Some(100.0))],
        vec![
            assignment_row("reading1", "c1", Some("g1"), Some("2026-09-10T17:00:00Z"), Some(20.0)),
            assignment_row("reading2", "c1", Some("g1"), Some("2026-09-19T17:00:00Z"), Some(20.0)),
        ],
        vec![],
    );

    let rows = triage::rank(&b, now());
    assert_eq!(rows[0].assignment_id, "reading1");
    assert!(rows[0].pinned, "overdue with grade impact pins");
}

/// Canvas-flagged missing behaves like overdue: stake decides the pin.
#[test]
fn missing_flag_keeps_state_but_stake_decides_pin() {
    let b = bundle(
        vec![course_row("c1", "HIST-15", true)],
        vec![group_row("g1", "c1", Some(100.0))],
        vec![
            assignment_row("survey", "c1", None, Some("2026-09-01T07:00:00Z"), Some(0.0)),
            assignment_row("paper", "c1", Some("g1"), Some("2026-09-02T07:00:00Z"), Some(50.0)),
        ],
        vec![missing_submission("survey"), missing_submission("paper")],
    );

    let rows = triage::rank(&b, now());
    assert_eq!(rows[0].assignment_id, "paper");
    assert!(rows[0].pinned);
    assert_eq!(rows[1].state, TriageState::Missing);
    assert!(!rows[1].pinned);
}

// ── Dormant-course filtering ────────────────────────────────────────────────

/// A "course" with one undated assignment and no grading — the Title IX
/// training shape — is dormant: absent from triage entirely.
#[test]
fn dormant_shell_is_out_of_triage() {
    let b = bundle(
        vec![
            course_row("shell", "Title IX Training", false),
            course_row("live", "CS-146", false),
        ],
        vec![],
        vec![
            assignment_row("training", "shell", None, None, Some(100.0)),
            assignment_row("hw8", "live", None, Some("2026-09-21T17:30:00Z"), Some(100.0)),
        ],
        vec![],
    );

    assert!(!b.is_active("shell", now()));
    assert!(b.is_active("live", now()));

    let rows = triage::rank(&b, now());
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].assignment_id, "hw8");
}

/// Last term's course — everything months past due, nothing recently graded —
/// is dormant even though Canvas still lists the enrollment as active.
#[test]
fn stale_term_course_is_dormant() {
    let b = bundle(
        vec![course_row("old", "FA25 LING-101", false)],
        vec![],
        vec![assignment_row("hw", "old", None, Some("2025-12-01T08:00:00Z"), Some(10.0))],
        vec![],
    );
    assert!(!b.is_active("old", now()));
}

/// An undated assignment in an otherwise-live course still makes triage —
/// activity is judged per course, not per row.
#[test]
fn undated_rows_survive_in_active_courses() {
    let b = bundle(
        vec![course_row("c1", "CS-146", true)],
        vec![group_row("final", "c1", Some(40.0)), group_row("hw", "c1", Some(60.0))],
        vec![
            assignment_row("final-exam", "c1", Some("final"), None, Some(100.0)),
            assignment_row("hw8", "c1", Some("hw"), Some("2026-09-21T17:30:00Z"), Some(100.0)),
        ],
        vec![],
    );

    let rows = triage::rank(&b, now());
    assert_eq!(rows.len(), 2, "undated final stays listed");
}

// ── Group shares ────────────────────────────────────────────────────────────

/// Weighted mode: shares are the declared weights normalised — no
/// graded-work renormalisation, because composition describes the syllabus.
#[test]
fn shares_weighted_normalise_declared_weights() {
    let input = CourseInput {
        mode: GradingMode::Weighted,
        groups: vec![
            GroupInput { id: "hw".into(), weight: Some(30.0), assignments: vec![] },
            GroupInput { id: "exams".into(), weight: Some(50.0), assignments: vec![] },
            GroupInput { id: "extra".into(), weight: None, assignments: vec![] },
        ],
    };
    let shares: HashMap<String, f64> = grades::group_shares(&input).into_iter().collect();
    assert!((shares["hw"] - 37.5).abs() < 0.01, "30 of 80 declared");
    assert!((shares["exams"] - 62.5).abs() < 0.01);
    assert_eq!(shares["extra"], 0.0, "weightless group cannot earn a share");
}

/// Points mode: shares follow points, and excused/omitted work is out.
#[test]
fn shares_points_follow_points() {
    let mut excused = AssignmentInput {
        id: "x".into(),
        points_possible: Some(100.0),
        omit_from_final_grade: false,
        score: None,
        excused: true,
    };
    excused.excused = true;
    let input = CourseInput {
        mode: GradingMode::Points,
        groups: vec![
            GroupInput {
                id: "a".into(),
                weight: Some(35.0), // decoy — ignored in points mode
                assignments: vec![AssignmentInput {
                    id: "a1".into(),
                    points_possible: Some(30.0),
                    omit_from_final_grade: false,
                    score: None,
                    excused: false,
                }],
            },
            GroupInput {
                id: "b".into(),
                weight: None,
                assignments: vec![
                    AssignmentInput {
                        id: "b1".into(),
                        points_possible: Some(90.0),
                        omit_from_final_grade: false,
                        score: None,
                        excused: false,
                    },
                    excused,
                ],
            },
        ],
    };
    let shares: HashMap<String, f64> = grades::group_shares(&input).into_iter().collect();
    assert!((shares["a"] - 25.0).abs() < 0.01, "30 of 120 countable points");
    assert!((shares["b"] - 75.0).abs() < 0.01, "excused 100-pointer is invisible");
}

// ── Grade scales ────────────────────────────────────────────────────────────

/// A stored scale letters percentages instead of the default, and unsorted
/// hand-edited pairs are healed.
#[test]
fn custom_scale_round_trips_and_sorts() {
    let json = r#"[[80.0,"A-"],[85.0,"A"],[70.0,"B"]]"#; // deliberately unsorted
    let scale = grades::scale_from_json(Some(json)).expect("valid scale parses");
    assert_eq!(grades::letter_for(&scale, 86.0), "A");
    assert_eq!(grades::letter_for(&scale, 82.0), "A-");
    assert_eq!(grades::letter_for(&scale, 71.0), "B");
    assert_eq!(grades::letter_for(&scale, 42.0), "F");
}

/// Garbage in → None out, never a half-applied scale.
#[test]
fn broken_scales_fall_back() {
    assert!(grades::scale_from_json(None).is_none());
    assert!(grades::scale_from_json(Some("")).is_none());
    assert!(grades::scale_from_json(Some("[]")).is_none());
    assert!(grades::scale_from_json(Some("{\"A\":93}")).is_none());
    assert!(grades::scale_from_json(Some("not json")).is_none());
}

/// `Bundle::scale_of` prefers the stored scale and falls back per course.
#[test]
fn scale_of_prefers_stored() {
    let mut b = bundle(vec![course_row("c1", "CS-146", true)], vec![], vec![], vec![]);
    b.targets.insert(
        "c1".into(),
        TargetRow {
            course_id: "c1".into(),
            target_letter: None,
            target_pct: None,
            grade_scale_json: Some(r#"[[85.0,"A"],[70.0,"B"]]"#.into()),
            hidden: false,
        },
    );
    let custom = b.scale_of("c1");
    assert_eq!(grades::letter_for(&custom, 86.0), "A", "custom cutoff applies");
    let default = b.scale_of("other-course");
    assert_eq!(grades::letter_for(&default, 86.0), "B", "default scale for the rest");
}
