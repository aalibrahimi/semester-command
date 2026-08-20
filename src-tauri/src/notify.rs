//! Local notification scheduling and deduplication (SPEC.md §6).
//!
//! Called by: the sync engine, after each successful run.
//! Calls: tauri-plugin-notification, [`crate::db::queries`].
//!
//! What fires:
//!
//! - 7 days / 3 days / 24 hours / 3 hours before a due date, **scaled by grade
//!   impact**. A 2%-of-grade discussion post gets the 24-hour ping only; a 25%
//!   midterm gets all four. An app that pings identically for both trains you
//!   to ignore it.
//! - A new grade posts and moves the course grade by more than 1 point.
//! - An assignment flips to `missing`.
//! - A daily 8am digest: today's due items and the top three triage rows.
//!
//! Dedupe is the hard part and the whole point — the same notification must
//! never arrive twice, across restarts. That means persisting "already sent"
//! keyed on (assignment, threshold), not holding it in memory, because the app
//! restarts far more often than a deadline moves.
//!
//! TODO(M4).
