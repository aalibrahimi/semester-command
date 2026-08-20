//! Grade commands: read computed grades and run the solver.
//!
//! Called by: `src/lib/ipc.ts` (`getCourseGrades`, `whatDoINeed` from M2).
//! Calls: [`crate::grades`].
//!
//! This module is a thin translation layer and should stay that way. It loads
//! rows, hands them to `grades.rs`, and serialises the answer. The moment a
//! formula appears in this file, the test suite in `tests/grades_test.rs` stops
//! covering the thing that actually runs.
//!
//! TODO(M2): planned surface:
//!
//! - `get_course_grades(course_id)` — current and projected together, never
//!   one without the other (§4.2), plus the reconciliation delta against
//!   Canvas's own `current_score` so the UI can raise the mismatch banner.
//! - `what_do_i_need(course_id, target, scope)` — `scope` is either every
//!   remaining assignment or a single one. Returns the required score as both a
//!   percentage and raw points, and says plainly when the target is
//!   unreachable or already locked in (§4.3).
//! - `set_target(course_id, letter)` and `set_grade_scale(course_id, cutoffs)`
//!   — SJSU instructors set their own cutoffs and plenty of them curve, so the
//!   scale is per course (§4.4).
