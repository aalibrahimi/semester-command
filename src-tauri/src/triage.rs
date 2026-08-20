//! The triage ranking algorithm (SPEC.md §5, screen 1).
//!
//! Called by: [`crate::commands::data`].
//! Calls: [`crate::grades`] for effective group weights, [`crate::db::queries`]
//! for the rows.
//!
//! ```text
//! score        = (grade_impact × urgency) / est_hours
//! grade_impact = points_possible × effective_group_weight
//! urgency      = 1 / max(days_until_due, 0.5)
//! ```
//!
//! `grade_impact` is the share of the *final* grade at stake, which is why it
//! needs the effective group weight rather than the raw one — in a weighted
//! course, a 100-point assignment in a group worth 10% matters far less than a
//! 20-point one in a group worth 40%, and points alone cannot see that.
//!
//! The `max(days_until_due, 0.5)` floor keeps urgency finite for something due
//! in an hour. Without it the score approaches infinity as the deadline
//! approaches and a trivial discussion post due in ten minutes outranks the
//! midterm — which is exactly backwards, since the midterm is still winnable.
//!
//! Overdue-but-still-open items are pinned above the ranked list rather than
//! scored into it (§5). Their urgency is degenerate and their real priority is
//! "deal with this now", which a formula should not have to express.
//!
//! TODO(M3).
