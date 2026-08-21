//! The test suite that matters (SPEC.md §7 M2, §8).
//!
//! Called by: `cargo test`.
//! Calls: [`semester_command_lib::grades`].
//!
//! Every case here exists because it produces a *plausible* wrong answer
//! rather than an obvious one. Two of them (`cs146_shape_*`) mirror the
//! user's actual Fall 2026 CS-146 structure as synced from Canvas on
//! 2026-08-20 — Projects 30 / Midterms 30 / Final 40, plus two zero-weight
//! groups — because the live schedule is a better adversary than anything
//! invented here.

use semester_command_lib::grades::*;

// ── Builders ────────────────────────────────────────────────────────────────

fn a(id: &str, possible: f64, score: Option<f64>) -> AssignmentInput {
    AssignmentInput {
        id: id.into(),
        points_possible: Some(possible),
        omit_from_final_grade: false,
        score,
        excused: false,
    }
}

fn group(id: &str, weight: f64, assignments: Vec<AssignmentInput>) -> GroupInput {
    GroupInput {
        id: id.into(),
        weight: Some(weight),
        assignments,
    }
}

fn weighted(groups: Vec<GroupInput>) -> CourseInput {
    CourseInput {
        mode: GradingMode::Weighted,
        groups,
    }
}

/// Points mode, with a decoy group weight — Canvas populates weights even in
/// points mode (docs/CANVAS_API.md gotcha 10) and they must be ignored.
fn points(assignments: Vec<AssignmentInput>) -> CourseInput {
    CourseInput {
        mode: GradingMode::Points,
        groups: vec![GroupInput {
            id: "g".into(),
            weight: Some(35.0),
            assignments,
        }],
    }
}

fn assert_close(actual: Option<f64>, expected: f64) {
    let actual = actual.expect("expected a percentage, got None");
    assert!(
        (actual - expected).abs() < 0.01,
        "expected {expected}, got {actual}"
    );
}

// ── 1. The renormalisation case — the bug this engine exists to not have ────

/// Week four: Homework 30% graded at 90%, Exams 50% and Final 20% untouched.
/// Current must be 90%, NOT 27% — empty groups leave the denominator.
#[test]
fn weighted_empty_groups_renormalise() {
    let course = weighted(vec![
        group("hw", 30.0, vec![a("hw1", 50.0, Some(45.0))]),
        group("exams", 50.0, vec![a("mt", 100.0, None)]),
        group("final", 20.0, vec![a("fin", 100.0, None)]),
    ]);
    let s = standing(&course);
    assert_close(s.current_pct, 90.0);
    // Projected counts the ungraded work as zeros across the full weight set:
    // (0.9×30 + 0×50 + 0×20) / 100 = 27%.
    assert_close(Some(s.projected_pct), 27.0);
    // Max: perfect from here = 27 + 50 + 20 = 97%.
    assert_close(Some(s.max_possible_pct), 97.0);
}

/// The user's real CS-146: zero-weight "Assignments" and "Homework" groups
/// beside the real ones must not distort anything, even when they contain
/// graded work — perfect or bombed.
#[test]
fn cs146_shape_zero_weight_groups_are_inert() {
    let course = weighted(vec![
        group("assignments", 0.0, vec![a("a1", 10.0, Some(10.0))]),
        group("homework", 0.0, vec![a("h1", 20.0, Some(0.0))]),
        group("projects", 30.0, vec![a("p1", 100.0, Some(80.0))]),
        group("midterms", 30.0, vec![a("m1", 100.0, None)]),
        group("final", 40.0, vec![a("f1", 100.0, None)]),
    ]);
    let s = standing(&course);
    assert_close(s.current_pct, 80.0);
    assert_close(Some(s.projected_pct), 24.0); // 0.8×30 / 100
    assert_close(Some(s.max_possible_pct), 94.0); // 24 + 30 + 40
}

/// When the only graded work sits in zero-weight groups, there is no
/// meaningful percentage yet — None, not 0% and not 100%.
#[test]
fn cs146_shape_only_zero_weight_graded_is_ungraded() {
    let course = weighted(vec![
        group("assignments", 0.0, vec![a("a1", 10.0, Some(10.0))]),
        group("projects", 30.0, vec![a("p1", 100.0, None)]),
    ]);
    assert_eq!(standing(&course).current_pct, None);
}

// ── 2–4. Exclusions ─────────────────────────────────────────────────────────

/// Excused leaves both numerator and denominator — it is not a zero, in any
/// of the three anchor numbers.
#[test]
fn excused_is_not_zero() {
    let mut excused = a("q2", 50.0, None);
    excused.excused = true;
    let course = points(vec![a("q1", 50.0, Some(40.0)), excused]);
    let s = standing(&course);
    assert_close(s.current_pct, 80.0);
    assert_close(Some(s.projected_pct), 80.0);
    assert_close(Some(s.max_possible_pct), 80.0);
}

/// omit_from_final_grade behaves like the assignment does not exist.
#[test]
fn omitted_assignment_does_not_exist() {
    let mut omitted = a("practice", 100.0, Some(10.0));
    omitted.omit_from_final_grade = true;
    let course = points(vec![a("real", 100.0, Some(90.0)), omitted]);
    assert_close(standing(&course).current_pct, 90.0);
}

/// A zero-point assignment cannot divide by zero, and a scored zero-pointer
/// adds its points to the numerator only — Canvas's extra-credit model.
#[test]
fn zero_point_assignments() {
    // Alone: no denominator → no grade, not 0%.
    let alone = points(vec![a("ec", 0.0, Some(5.0))]);
    assert_eq!(standing(&alone).current_pct, None);

    // Beside real work: pure bonus. 45+5 over 50 = 100%.
    let with_work = points(vec![a("hw", 50.0, Some(45.0)), a("ec", 0.0, Some(5.0))]);
    assert_close(standing(&with_work).current_pct, 100.0);
}

// ── 5. Small-course states ──────────────────────────────────────────────────

/// One graded item is a complete, legitimate gradebook.
#[test]
fn single_graded_item() {
    let course = points(vec![a("only", 10.0, Some(7.0))]);
    let s = standing(&course);
    assert_close(s.current_pct, 70.0);
    assert_close(Some(s.projected_pct), 70.0);
    assert_close(Some(s.max_possible_pct), 70.0);
}

/// Nothing graded at all: current must be None (week one is not an F).
#[test]
fn nothing_graded_is_none_not_zero() {
    let course = points(vec![a("hw1", 100.0, None)]);
    let s = standing(&course);
    assert_eq!(s.current_pct, None);
    assert_close(Some(s.projected_pct), 0.0);
    assert_close(Some(s.max_possible_pct), 100.0);
}

// ── 6. Reconciliation (§4.2) ────────────────────────────────────────────────

/// Within tolerance: no flag. Beyond it: the delta is surfaced, and neither
/// number is discarded.
#[test]
fn reconciliation_against_canvas() {
    let course = points(vec![a("hw", 100.0, Some(85.0))]);

    let agrees = course_grade(&course, Some(85.05));
    assert_eq!(agrees.reconciliation_delta, None);

    let disagrees = course_grade(&course, Some(91.0));
    let delta = disagrees.reconciliation_delta.expect("delta should be flagged");
    assert!((delta - (85.0 - 91.0)).abs() < 0.01);
    assert_eq!(disagrees.canvas_current_pct, Some(91.0));
    assert_close(disagrees.current_pct, 85.0);
}

// ── 7. Points mode ignores weights ──────────────────────────────────────────

/// The `points()` builder plants a decoy 35% weight; straight points must
/// come out regardless.
#[test]
fn points_mode_ignores_group_weights() {
    let course = points(vec![
        a("hw", 100.0, Some(50.0)),
        a("exam", 300.0, Some(300.0)),
    ]);
    // 350/400 = 87.5% — weight-blind.
    assert_close(standing(&course).current_pct, 87.5);
}

// ── 8. Solver, all outcomes (§4.3) ──────────────────────────────────────────

/// Points mode, one 50-point final left, 156/200 banked. Target 80% overall:
/// need (0.8×250 − 156) = 44 of 50 → 88%.
#[test]
fn solver_single_assignment_points_mode() {
    let course = points(vec![
        a("done", 200.0, Some(156.0)),
        a("final", 50.0, None),
    ]);
    match solve(&course, 80.0, SolveScope::SingleAssignment("final"), DEFAULT_SCALE) {
        SolverAnswer::Required { pct, points_needed, points_possible } => {
            assert!((pct - 88.0).abs() < 0.01, "pct was {pct}");
            assert!((points_needed.unwrap() - 44.0).abs() < 0.01);
            assert!((points_possible.unwrap() - 50.0).abs() < 0.01);
        }
        other => panic!("expected Required, got {other:?}"),
    }
}

/// Weighted mode, final is its own 40% group (the CS-146 shape). 80% banked
/// in Projects(30), 90% in Midterms(30). Target 85% overall:
/// 85 = 24 + 27 + x×40 → x = 85%.
#[test]
fn solver_single_assignment_weighted_mode() {
    let course = weighted(vec![
        group("projects", 30.0, vec![a("p", 100.0, Some(80.0))]),
        group("midterms", 30.0, vec![a("m", 100.0, Some(90.0))]),
        group("final", 40.0, vec![a("f", 100.0, None)]),
    ]);
    match solve(&course, 85.0, SolveScope::SingleAssignment("f"), DEFAULT_SCALE) {
        SolverAnswer::Required { pct, points_needed, .. } => {
            assert!((pct - 85.0).abs() < 0.01, "pct was {pct}");
            assert!((points_needed.unwrap() - 85.0).abs() < 0.01);
        }
        other => panic!("expected Required, got {other:?}"),
    }
}

/// Target higher than perfect play allows → the ceiling, with its letter.
#[test]
fn solver_unreachable_reports_ceiling() {
    let course = points(vec![
        a("done", 200.0, Some(120.0)), // 60% banked
        a("final", 50.0, None),
    ]);
    // Perfect final: 170/250 = 68%. The A is gone; say what's left.
    match solve(&course, 93.0, SolveScope::EverythingRemaining, DEFAULT_SCALE) {
        SolverAnswer::Unreachable { best_possible_pct, best_possible_letter } => {
            assert!((best_possible_pct - 68.0).abs() < 0.01);
            assert_eq!(best_possible_letter, "D+");
        }
        other => panic!("expected Unreachable, got {other:?}"),
    }
}

/// Target already guaranteed → the floor, with its letter.
#[test]
fn solver_already_locked_reports_floor() {
    let course = points(vec![
        a("done", 200.0, Some(196.0)), // 98% banked
        a("quiz", 10.0, None),
    ]);
    // Even a zero on the quiz leaves 196/210 = 93.3% — the A holds.
    match solve(&course, 90.0, SolveScope::EverythingRemaining, DEFAULT_SCALE) {
        SolverAnswer::AlreadyLocked { floor_pct, floor_letter } => {
            assert!((floor_pct - 93.33).abs() < 0.01);
            assert_eq!(floor_letter, "A");
        }
        other => panic!("expected AlreadyLocked, got {other:?}"),
    }
}

/// Nothing left to score and target not met → Unreachable, not a division by
/// zero.
#[test]
fn solver_nothing_remaining() {
    let course = points(vec![a("done", 100.0, Some(70.0))]);
    match solve(&course, 90.0, SolveScope::EverythingRemaining, DEFAULT_SCALE) {
        SolverAnswer::Unreachable { best_possible_pct, .. } => {
            assert!((best_possible_pct - 70.0).abs() < 0.01);
        }
        other => panic!("expected Unreachable, got {other:?}"),
    }
}

// ── Letters, signals, impact ────────────────────────────────────────────────

#[test]
fn letter_boundaries() {
    assert_eq!(letter_for(DEFAULT_SCALE, 93.0), "A");
    assert_eq!(letter_for(DEFAULT_SCALE, 92.99), "A-");
    assert_eq!(letter_for(DEFAULT_SCALE, 60.0), "D-");
    assert_eq!(letter_for(DEFAULT_SCALE, 59.99), "F");
}

#[test]
fn signal_mapping() {
    // Week one, nothing graded, nothing missing → benefit of the doubt.
    let fresh = Standing { current_pct: None, projected_pct: 0.0, max_possible_pct: 100.0 };
    assert_eq!(signal(&fresh, 90.0, 0), SignalStatus::OnTrack);

    // Missing work is critical regardless of the numbers.
    assert_eq!(signal(&fresh, 90.0, 1), SignalStatus::Critical);

    // Current below target but within 5 → at risk.
    let slipping = Standing { current_pct: Some(87.0), projected_pct: 40.0, max_possible_pct: 95.0 };
    assert_eq!(signal(&slipping, 90.0, 0), SignalStatus::AtRisk);

    // Target mathematically gone → critical.
    let gone = Standing { current_pct: Some(85.0), projected_pct: 60.0, max_possible_pct: 82.0 };
    assert_eq!(signal(&gone, 90.0, 0), SignalStatus::Critical);

    // Nothing left to grade → locked.
    let done = Standing { current_pct: Some(91.0), projected_pct: 91.0, max_possible_pct: 91.0 };
    assert_eq!(signal(&done, 90.0, 0), SignalStatus::Locked);
}

/// grade_impact is the swing an assignment has on the final grade — in a
/// weighted course, a small assignment in a heavy group outranks a big one
/// in a light group. This is what makes triage's ranking mean anything.
#[test]
fn grade_impact_respects_weights() {
    let course = weighted(vec![
        group("hw", 10.0, vec![a("big-hw", 100.0, None)]),
        group("final", 40.0, vec![a("small-final", 20.0, None)]),
    ]);
    let hw_impact = grade_impact_pct(&course, "big-hw");
    let final_impact = grade_impact_pct(&course, "small-final");
    assert!(
        final_impact > hw_impact,
        "20-point final ({final_impact}) must outrank 100-point hw ({hw_impact})"
    );
    // Precisely: each group is its whole weight — 40 vs 10 of the 50 total.
    assert!((final_impact - 80.0).abs() < 0.01);
    assert!((hw_impact - 20.0).abs() < 0.01);
}
