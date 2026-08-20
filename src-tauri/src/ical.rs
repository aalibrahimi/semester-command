//! `.ics` export and, for Tier 2 auth, `.ics` parsing (SPEC.md §2.0, §5).
//!
//! Called by: [`crate::commands::data`] (export) and the sync engine (import).
//! Calls: [`crate::db`].
//!
//! # Export
//!
//! Every event carries a stable UID: `canvas-assignment-{id}@semester-command`.
//! That is what makes re-exporting after a sync *update* the events already in
//! the user's real calendar instead of adding a second copy of all of them.
//! Generating a fresh UID per export is the default behaviour of most naive
//! implementations and produces a calendar nobody can use by week four.
//!
//! # Import (Tier 2)
//!
//! Canvas publishes a private `.ics` feed at Calendar → Calendar Feed that needs
//! no login at all and covers every assignment due date across every course. It
//! is dates only — no grades, no weights, no rubrics — but paired with manual
//! grade entry the grade engine still works end to end. This is a real
//! supported mode, not a stub: if cookie auth breaks mid-semester, it is what
//! keeps the app useful.
//!
//! Rows created this way are written with `source = 'ics'` and the UI marks
//! them, so the user always knows which dates Canvas confirmed directly.
//!
//! TODO(M1) for the parser, TODO(M4) for the export.
