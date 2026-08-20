//! The test suite that matters (SPEC.md §7 M2, §8).
//!
//! Called by: `cargo test`.
//! Calls: [`semester_command_lib::grades`].
//!
//! The grade engine gets tests before it gets a UI. This file is the reason
//! that rule is enforceable — it is where the edge cases live, and every one of
//! them exists because it produces a *plausible* wrong answer rather than an
//! obvious one.
//!
//! Required coverage before M2 can be called done:
//!
//! 1. **Weighted course with an empty group.** Groups with no graded work are
//!    excluded and the remaining weights renormalised. This is the single most
//!    common bug in third-party Canvas grade calculators.
//! 2. **Excused submission.** Removed from numerator *and* denominator. Not a
//!    zero.
//! 3. **Zero-point assignment.** Contributes nothing and must not divide by
//!    zero. A group of only zero-point assignments is ungraded, not 0%.
//! 4. **`omit_from_final_grade` assignment.** Excluded in both modes.
//! 5. **Course with a single graded item.** The degenerate case where one
//!    assignment is 100% of the denominator.
//! 6. **Reconciliation against Canvas's `current_score`.** A delta over 0.1
//!    must be reported, not swallowed.
//! 7. **Points mode.** Group weights present but ignored.
//! 8. **Solver, all three outcomes.** Reachable, unreachable (with the ceiling),
//!    already locked in (with the floor).
//!
//! TODO(M2): write them. `cargo test` passing with zero tests is not the same
//! as `cargo test` passing.

use semester_command_lib::grades::GradingMode;

/// Keeps `cargo test` wired to this file and asserts the one thing that is
/// actually true at M0: the engine's public vocabulary exists and distinguishes
/// the two grading modes.
///
/// It is deliberately not a green light. A passing run here says the harness
/// works, not that the arithmetic does — the suite in the module docs above is
/// what says that, and it lands in M2.
#[test]
fn grading_modes_are_distinct() {
    assert_ne!(
        GradingMode::Weighted,
        GradingMode::Points,
        "the two modes must not collapse — a course graded on points must never \
         be computed with group weights"
    );
}
