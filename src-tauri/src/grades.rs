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
//! # 5. Implementation status
//!
//! TODO(M2): implement `compute`, `project`, `solve_uniform`,
//! `solve_single_assignment`, `reconcile`, and `letter_for`.
//!
//! The test suite lands *before* the UI does (§8). `tests/grades_test.rs` must
//! cover at minimum:
//!
//! - a weighted course with an empty group (the renormalisation case above)
//! - an excused submission
//! - a zero-point assignment
//! - an `omit_from_final_grade` assignment
//! - a course with a single graded item
//! - reconciliation against Canvas's own `current_score`

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
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "outcome")]
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
