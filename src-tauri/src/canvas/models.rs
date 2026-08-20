//! serde types mirroring Canvas's JSON.
//!
//! Called by: [`super::client`] and [`super::endpoints`].
//! Calls: nothing.
//!
//! # Two rules, both learned the hard way
//!
//! **Every field is `Option<T>`.** Canvas omits keys constantly depending on
//! permissions, course settings and enrollment type. A field that is present in
//! every course you have looked at so far is not guaranteed to be present in
//! the next one.
//!
//! **Never `unwrap_or_default()` a grade.** A missing `score` is not zero — it
//! means "not graded yet", and the difference between those two is the whole
//! distinction between the current and projected numbers in §4.2. Handle `None`
//! explicitly at the point where you know what it means.
//!
//! Alongside the parsed struct, sync stores the raw response body in a
//! `raw_json` column (§2.2). When Canvas returns a shape nobody anticipated,
//! the data is already on disk and the fix is a parser change rather than
//! another semester of waiting for the same assignment to come around again.
//!
//! TODO(M1): `Course`, `AssignmentGroup`, `Assignment`, `Submission`,
//!           `Enrollment`, `User`, `PlannerItem`, `Rubric`, `RubricSettings`.
//!           Rubric criteria arrive embedded on the assignment object as
//!           `rubric` and `rubric_settings` — there is no separate call.
