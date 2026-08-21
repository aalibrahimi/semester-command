//! **The core of the app.** Everything else is plumbing.
//!
//! Job: turn a course's assignment groups, assignments and submissions into the
//! numbers the user plans a semester around — the current grade, the projected
//! grade, and the answer to "what do I need on the final".
//!
//! Called by: [`crate::commands::grades`], [`crate::triage`], and the MCP
//! server in M5.
//! Calls: nothing. This module is deliberately pure — it takes data structures
//! and returns numbers, touches no database, makes no network request, and has
//! no `async` in it. That is what makes it testable, and being testable is what
//! makes it trustworthy.
//!
//! This file is the documented exception to "comment the why, not the what"
//! (§12). Every formula carries its reasoning and a worked example, because the
//! person reading it in a year has to be able to verify the math without
//! re-deriving it.
//!
//! ---
//!
//! # 1. Two grading modes
//!
//! Canvas computes a course grade one of two ways, and which one is in force is
//! a per-course setting: `apply_assignment_group_weights`.
//!
//! ## Weighted mode (`apply_group_weights == true`)
//!
//! ```text
//! group_pct_i = Σ(earned in group i) / Σ(possible in group i)
//! course_pct  = Σ(group_pct_i × weight_i) / Σ(weight_i for groups with any graded work)
//! ```
//!
//! **Read that denominator again.** Groups with no graded work yet are excluded
//! and the remaining weights are renormalised. Getting this wrong is the single
//! most common bug in third-party Canvas grade calculators, and it fails in the
//! direction that feels correct, which is why it survives review.
//!
//! Worked example. Three groups: Homework 30%, Exams 50%, Final 20%. It is week
//! four; only homework has been graded, at 45/50.
//!
//! ```text
//! group_pct(Homework) = 45/50 = 0.90
//! Exams and Final have no graded work → excluded
//! denominator = 0.30                       (not 1.00)
//! course_pct  = (0.90 × 0.30) / 0.30 = 0.90 → 90.0%
//! ```
//!
//! Divide by 1.00 instead and you get 27%, which would be a spectacular way to
//! ruin someone's Tuesday. The renormalisation is also what makes the number
//! agree with what Canvas itself displays — see the reconciliation check below.
//!
//! ## Points mode (`apply_group_weights == false`)
//!
//! ```text
//! course_pct = Σ(all earned) / Σ(all possible)
//! ```
//!
//! Group weights are ignored entirely. A course in points mode may still *have*
//! non-null `group_weight` values sitting in the database from Canvas; they are
//! not meaningful and must not be used.
//!
//! ## Exclusions — applied in both modes
//!
//! - `excused == true` submissions. Excused is not zero; it removes the
//!   assignment from both numerator and denominator, as though it were never
//!   assigned.
//! - Assignments with `omit_from_final_grade == true`.
//! - Zero-point assignments contribute 0 to the denominator and cannot change a
//!   percentage. They must not produce a division by zero — a group made
//!   entirely of zero-point assignments has no meaningful percentage and is
//!   treated as *ungraded*, not as 0%.
//!
//! ---
//!
//! # 2. Current vs. projected — always both, never one
//!
//! **Current** excludes ungraded work from the denominator. This is what Canvas
//! shows. It is optimistic by construction: it describes a world where
//! everything still outstanding is graded exactly as well as everything already
//! done.
//!
//! **Projected** counts every ungraded assignment as a zero. This is where the
//! user actually lands if they stop working today. It is the honest number.
//!
//! Both are shown side by side with the gap between them labelled, because the
//! gap is the motivation. A course at "94% current / 61% projected" is not a
//! course doing well; it is a course with a lot still in play.
//!
//! ## Reconciliation
//!
//! After computing **current**, compare it to `enrollments[].grades.current_score`
//! from the Canvas API. If they differ by more than 0.1 points, surface a
//! visible warning naming the course. We do not silently trust our arithmetic
//! over Canvas's — a mismatch means either an unmodelled course setting (a
//! dropped-lowest rule, a curve applied outside the gradebook) or a real bug,
//! and both are things the user must know about before planning around the
//! output.
//!
//! ---
//!
//! # 3. The "what do I need?" solver
//!
//! ## Uniform case — "what do I need to average on everything left"
//!
//! ```text
//! required_avg = (target − Σ(locked_contribution)) / remaining_weight
//! ```
//!
//! `locked_contribution` is what already-graded work contributes to the final
//! percentage; `remaining_weight` is the share of the grade still in play.
//!
//! ## Single-assignment case — "what do I need on the final"
//!
//! Treat the target assignment's score as `x`, hold every other projection
//! fixed, and solve the resulting linear equation for `x`. It is linear in both
//! grading modes, which is why a closed form exists rather than a search.
//!
//! ## The output must be blunt, and must cover the edges
//!
//! - Required score above 100% → *"Not reachable. Highest possible grade from
//!   here: 87.3% (B+)."* Give the ceiling, not just the refusal.
//! - Required score below 0% → *"Already locked in. You could score 0 on the
//!   final and still get an A−."*
//! - Always as both a percentage and raw points: *"you need 43/50 on the
//!   final"*. 86% is abstract; 43 of 50 is a thing you can picture.
//!
//! ---
//!
//! # 4. Grade scale
//!
//! Configurable per course, defaulting to the standard A/A−/B+/B/B−/… cutoffs.
//! SJSU instructors set their own and plenty of them curve, so the thresholds
//! are editable per course and stored in `targets` (§4.4).
//!
//! ---
//!
//! # 5. The linearity that powers the solver
//!
//! In both modes the final grade is **linear** in any one assignment's score,
//! and linear in a uniform score applied to all remaining work. So instead of
//! deriving a closed form per mode (and getting one of them subtly wrong),
//! the solver evaluates the pipeline at two points — everything remaining at
//! 0% (= projected) and at 100% (= max possible) — and interpolates:
//!
//! ```text
//! required_fraction = (target − at_zero) / (at_full − at_zero)
//! ```
//!
//! Above 1 → unreachable (report the ceiling). Below 0 → already locked
//! (report the floor). The same trick answers the single-assignment case by
//! rescoring only that assignment. Correctness then rests entirely on
//! `compute`, which is exactly the function the test suite hammers.
//!
//! The test suite lives in `tests/grades_test.rs` and covers, at minimum:
//! a weighted course with an empty group (the renormalisation case), an
//! excused submission, a zero-point assignment, an `omit_from_final_grade`
//! assignment, a course with a single graded item, zero-weight groups
//! alongside weighted ones (the live CS-146 shape), both solver edges, and
//! reconciliation against Canvas's own `current_score`.

use serde::{Deserialize, Serialize};

/// Which formula a course's grade is computed with.
///
/// Derived from Canvas's `apply_assignment_group_weights` on the course object.
/// Modelled as an enum rather than a `bool` so that call sites read as
/// `GradingMode::Weighted` instead of `true`, which says nothing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GradingMode {
    /// Group weights apply, and groups with no graded work are excluded from
    /// the denominator.
    Weighted,
    /// Straight points: total earned over total possible.
    Points,
}

/// A course grade, in both of the forms the user needs to see at once.
///
/// There is deliberately no way to construct one of these carrying only the
/// current percentage. §4.2 requires both numbers side by side, and a type that
/// can represent "current only" is a type that will eventually be rendered that
/// way.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseGrade {
    /// Ungraded work excluded from the denominator. What Canvas shows.
    /// `None` when nothing at all has been graded yet — which is a real state
    /// in week one, and not the same as 0%.
    pub current_pct: Option<f64>,

    /// Every ungraded assignment counted as zero. Where the user lands if they
    /// stop working now.
    pub projected_pct: f64,

    /// `current_pct − projected_pct`, precomputed so the UI never does grade
    /// arithmetic. This is the number the Grade Gap bar is built around.
    pub gap_pct: Option<f64>,

    /// Which formula produced these.
    pub mode: GradingMode,

    /// Canvas's own `current_score` for the same course, when the API supplied
    /// one. Kept beside ours rather than replaced by it.
    pub canvas_current_pct: Option<f64>,

    /// Set when `current_pct` and `canvas_current_pct` differ by more than 0.1.
    /// The UI raises a visible banner naming the course; it does not quietly
    /// prefer either number.
    pub reconciliation_delta: Option<f64>,
}

/// What the solver was asked, and what it answered.
///
/// `Required` carries points as well as a percentage because §4.3 requires both
/// — the raw points are what makes the answer actionable.
// `rename_all` covers only the variant names; `rename_all_fields` is what
// puts the *fields* in camelCase — without it the frontend would silently
// read `undefined` for every snake_case key.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "outcome")]
pub enum SolverAnswer {
    /// Reachable. Score this or better.
    Required {
        /// The score needed, 0–100.
        pct: f64,
        /// The same answer in points, when the scope is a single assignment
        /// with a known `points_possible`.
        points_needed: Option<f64>,
        points_possible: Option<f64>,
    },
    /// The target cannot be reached even with perfect scores from here.
    /// Carries the ceiling, because "no" without a number is not useful.
    Unreachable {
        best_possible_pct: f64,
        best_possible_letter: String,
    },
    /// The target holds even at a zero on everything remaining.
    AlreadyLocked {
        floor_pct: f64,
        floor_letter: String,
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Inputs — plain data, built by `commands::grades` from database rows.
// ─────────────────────────────────────────────────────────────────────────────

/// One assignment as the engine sees it. Flattened: the submission's
/// interesting fields are folded in, because the engine has no reason to know
/// submissions exist as a separate table.
#[derive(Debug, Clone)]
pub struct AssignmentInput {
    pub id: String,
    pub points_possible: Option<f64>,
    pub omit_from_final_grade: bool,
    /// `None` = not graded. The engine never defaults this (§2.2).
    pub score: Option<f64>,
    pub excused: bool,
}

#[derive(Debug, Clone)]
pub struct GroupInput {
    pub id: String,
    /// Percent of the final grade (e.g. 30.0). Meaningful only in weighted
    /// mode; may be present-but-meaningless in points mode (gotcha 10).
    pub weight: Option<f64>,
    pub assignments: Vec<AssignmentInput>,
}

#[derive(Debug, Clone)]
pub struct CourseInput {
    pub mode: GradingMode,
    pub groups: Vec<GroupInput>,
}

/// A computed course standing: the three anchor percentages every surface
/// renders. `max_possible_pct` is the right edge of the Grade Gap bar's
/// hatched region and the ceiling the solver reports.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Standing {
    pub current_pct: Option<f64>,
    pub projected_pct: f64,
    pub max_possible_pct: f64,
}

// ─────────────────────────────────────────────────────────────────────────────
// The core computation
// ─────────────────────────────────────────────────────────────────────────────

/// How ungraded work is counted — the only thing that differs between the
/// three anchor numbers.
#[derive(Clone, Copy, PartialEq)]
enum Ungraded {
    /// Excluded from the denominator entirely → the *current* grade.
    Excluded,
    /// Counted as zero → the *projected* grade.
    AsZero,
    /// Counted at full points → the *max possible* grade.
    AsFull,
}

/// Earned/possible totals for one set of assignments under one policy.
///
/// Exclusions (§4.1) applied here, in one place: excused submissions and
/// omit-from-final-grade assignments simply do not exist as far as the sums
/// are concerned. Zero-point assignments add their score to the numerator
/// (that is how Canvas models extra credit) and nothing to the denominator.
fn totals(assignments: &[AssignmentInput], policy: Ungraded) -> (f64, f64) {
    let mut earned = 0.0;
    let mut possible = 0.0;
    for a in assignments {
        if a.excused || a.omit_from_final_grade {
            continue;
        }
        let pts = a.points_possible.unwrap_or(0.0);
        match (a.score, policy) {
            (Some(s), _) => {
                earned += s;
                possible += pts;
            }
            (None, Ungraded::Excluded) => {}
            (None, Ungraded::AsZero) => {
                possible += pts;
            }
            (None, Ungraded::AsFull) => {
                earned += pts;
                possible += pts;
            }
        }
    }
    (earned, possible)
}

/// One anchor percentage for a whole course under one ungraded policy.
///
/// Weighted mode implements the renormalised denominator from §1: a group
/// whose `possible` is zero under the current policy contributes nothing and
/// its weight is left out of the denominator. Zero-weight groups fall out of
/// the arithmetic naturally (they add 0 to both sums) — which matches how
/// Canvas treats the live CS-146 shape ("Homework 0%" alongside real groups).
fn course_pct(input: &CourseInput, policy: Ungraded) -> Option<f64> {
    match input.mode {
        GradingMode::Points => {
            let all: Vec<AssignmentInput> = input
                .groups
                .iter()
                .flat_map(|g| g.assignments.iter().cloned())
                .collect();
            let (earned, possible) = totals(&all, policy);
            (possible > 0.0).then(|| earned / possible * 100.0)
        }
        GradingMode::Weighted => {
            let mut weighted_sum = 0.0;
            let mut weight_total = 0.0;
            for g in &input.groups {
                let w = g.weight.unwrap_or(0.0);
                let (earned, possible) = totals(&g.assignments, policy);
                if possible > 0.0 {
                    weighted_sum += (earned / possible) * w;
                    weight_total += w;
                }
            }
            (weight_total > 0.0).then(|| weighted_sum / weight_total * 100.0)
        }
    }
}

/// The three anchor numbers for a course.
///
/// `projected_pct` and `max_possible_pct` default to 0 when the course has no
/// gradeable content at all (an announcements shell, week zero) — rendering a
/// flat empty bar, which is the truthful picture.
pub fn standing(input: &CourseInput) -> Standing {
    Standing {
        current_pct: course_pct(input, Ungraded::Excluded),
        projected_pct: course_pct(input, Ungraded::AsZero).unwrap_or(0.0),
        max_possible_pct: course_pct(input, Ungraded::AsFull).unwrap_or(0.0),
    }
}

/// Assemble the full [`CourseGrade`] including reconciliation against
/// Canvas's own number (§2).
pub fn course_grade(input: &CourseInput, canvas_current_pct: Option<f64>) -> CourseGrade {
    let s = standing(input);
    let reconciliation_delta = match (s.current_pct, canvas_current_pct) {
        (Some(ours), Some(theirs)) => {
            let delta = ours - theirs;
            (delta.abs() > RECONCILE_TOLERANCE).then_some(delta)
        }
        _ => None,
    };
    CourseGrade {
        gap_pct: s.current_pct.map(|c| c - s.projected_pct),
        current_pct: s.current_pct,
        projected_pct: s.projected_pct,
        mode: input.mode,
        canvas_current_pct,
        reconciliation_delta,
    }
}

/// §4.2: differ from Canvas by more than this and the UI must say so.
pub const RECONCILE_TOLERANCE: f64 = 0.1;

// ─────────────────────────────────────────────────────────────────────────────
// Solver (§3) — interpolation over the linear pipeline; see module docs §5.
// ─────────────────────────────────────────────────────────────────────────────

/// What the solver should treat as "the thing being scored".
pub enum SolveScope<'a> {
    /// Average needed across everything still ungraded.
    EverythingRemaining,
    /// Score needed on one specific assignment, holding every other ungraded
    /// assignment at zero (its projection).
    SingleAssignment(&'a str),
}

/// Answer "what do I need to hit `target_pct`" (0–100).
pub fn solve(
    input: &CourseInput,
    target_pct: f64,
    scope: SolveScope<'_>,
    scale: &[(f64, &str)],
) -> SolverAnswer {
    // The two evaluation points. For the single-assignment case only that
    // assignment moves; for the uniform case all remaining work moves.
    let (at_zero, at_full, points_possible) = match scope {
        SolveScope::EverythingRemaining => {
            let s = standing(input);
            let remaining: f64 = ungraded(input).map(|a| a.points_possible.unwrap_or(0.0)).sum();
            (s.projected_pct, s.max_possible_pct, (remaining > 0.0).then_some(remaining))
        }
        SolveScope::SingleAssignment(id) => {
            let pts = ungraded(input)
                .find(|a| a.id == id)
                .and_then(|a| a.points_possible)
                .filter(|p| *p > 0.0);
            let zero = standing(input).projected_pct;
            let full = standing(&rescored(input, id)).projected_pct;
            (zero, full, pts)
        }
    };

    let span = at_full - at_zero;
    if span <= f64::EPSILON {
        // Nothing (with points) left to score in this scope.
        return if at_zero >= target_pct {
            SolverAnswer::AlreadyLocked {
                floor_pct: at_zero,
                floor_letter: letter_for(scale, at_zero),
            }
        } else {
            SolverAnswer::Unreachable {
                best_possible_pct: at_full,
                best_possible_letter: letter_for(scale, at_full),
            }
        };
    }

    let fraction = (target_pct - at_zero) / span;
    if fraction > 1.0 {
        SolverAnswer::Unreachable {
            best_possible_pct: at_full,
            best_possible_letter: letter_for(scale, at_full),
        }
    } else if fraction < 0.0 {
        SolverAnswer::AlreadyLocked {
            floor_pct: at_zero,
            floor_letter: letter_for(scale, at_zero),
        }
    } else {
        SolverAnswer::Required {
            pct: fraction * 100.0,
            points_needed: points_possible.map(|p| fraction * p),
            points_possible,
        }
    }
}

/// Every ungraded, countable assignment in the course.
fn ungraded(input: &CourseInput) -> impl Iterator<Item = &AssignmentInput> {
    input
        .groups
        .iter()
        .flat_map(|g| g.assignments.iter())
        .filter(|a| a.score.is_none() && !a.excused && !a.omit_from_final_grade)
}

/// A copy of the course with one assignment scored at full points.
fn rescored(input: &CourseInput, id: &str) -> CourseInput {
    let mut out = input.clone();
    for g in &mut out.groups {
        for a in &mut g.assignments {
            if a.id == id {
                a.score = a.points_possible;
            }
        }
    }
    out
}

// ─────────────────────────────────────────────────────────────────────────────
// Grade scale + course standing signal
// ─────────────────────────────────────────────────────────────────────────────

/// The default cutoffs (§4). Per-course overrides live in `targets` and are
/// passed in by the caller; the engine never reads the database.
pub const DEFAULT_SCALE: &[(f64, &str)] = &[
    (93.0, "A"),
    (90.0, "A-"),
    (87.0, "B+"),
    (83.0, "B"),
    (80.0, "B-"),
    (77.0, "C+"),
    (73.0, "C"),
    (70.0, "C-"),
    (67.0, "D+"),
    (63.0, "D"),
    (60.0, "D-"),
];

/// Letter for a percentage under a scale of descending `(cutoff, letter)`
/// pairs. Below every cutoff is an F.
pub fn letter_for(scale: &[(f64, &str)], pct: f64) -> String {
    scale
        .iter()
        .find(|(cutoff, _)| pct >= *cutoff)
        .map(|(_, l)| (*l).to_string())
        .unwrap_or_else(|| "F".to_string())
}

/// The sidebar's signal vocabulary (§9.1). Serialised as the camelCase
/// strings the frontend's `SignalStatus` type expects.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SignalStatus {
    OnTrack,
    AtRisk,
    Critical,
    Locked,
}

/// Map a course's numbers to its signal (§9.1).
///
/// The judgment call worth documenting: early in a semester `projected` is
/// low for everyone (most work is ungraded), so risk is judged on *current*
/// performance — "if you keep scoring like this, where do you land" — with
/// `max_possible` as the hard backstop:
///
/// - locked:   nothing gradeable remains.
/// - critical: the target is mathematically unreachable, work is missing, or
///             current performance trails the target by more than 5 points.
/// - atRisk:   current performance is below target (within 5 points).
/// - onTrack:  current meets target, or nothing is graded yet (week one gets
///             the benefit of the doubt).
pub fn signal(
    s: &Standing,
    target_pct: f64,
    missing_count: usize,
) -> SignalStatus {
    if (s.max_possible_pct - s.projected_pct).abs() <= f64::EPSILON {
        return SignalStatus::Locked;
    }
    if s.max_possible_pct < target_pct || missing_count > 0 {
        return SignalStatus::Critical;
    }
    match s.current_pct {
        Some(current) if current < target_pct - 5.0 => SignalStatus::Critical,
        Some(current) if current < target_pct => SignalStatus::AtRisk,
        _ => SignalStatus::OnTrack,
    }
}

/// Percentage points of the final grade riding on one assignment: the swing
/// between scoring zero and full marks on it. This is triage's
/// `grade_impact`, and it is computed here rather than in `triage.rs` so the
/// weighted/points distinction stays in one module.
pub fn grade_impact_pct(input: &CourseInput, assignment_id: &str) -> f64 {
    let zero = standing(input).projected_pct;
    let full = standing(&rescored(input, assignment_id)).projected_pct;
    (full - zero).max(0.0)
}
