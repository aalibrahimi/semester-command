//! Table structs mirroring `migrations/`.
//!
//! Called by: [`super::queries`], [`super::upsert`].
//! Calls: nothing.
//!
//! TODO(M1): the schema from SPEC.md §3 —
//!
//! ```sql
//! courses(id, name, course_code, term, apply_group_weights BOOL,
//!         current_score REAL, final_score REAL, syllabus_html, raw_json, synced_at)
//! assignment_groups(id, course_id, name, group_weight REAL, position, raw_json)
//! assignments(id, course_id, group_id, name, due_at, points_possible REAL,
//!             omit_from_final_grade BOOL, submission_types, html_url,
//!             rubric_json, raw_json)
//! submissions(assignment_id, score REAL, grade TEXT, submitted_at, graded_at,
//!             workflow_state, excused BOOL, missing BOOL, late BOOL, raw_json)
//! instructors(id, course_id, name, email, role, office_hours_note)
//! targets(course_id, target_letter TEXT, target_pct REAL)
//! estimates(assignment_id, est_minutes INT, my_note TEXT)   -- local only
//! sync_log(id, started_at, finished_at, entity, ok BOOL, error)
//! ```
//!
//! Two columns that are easy to leave out and expensive to add later:
//!
//! - `raw_json` on every synced entity. Canvas returns shapes you did not
//!   anticipate; when it does, you want the data already on disk (§2.2).
//! - `source` on every synced table. Without it the UI cannot tell the user
//!   which numbers Canvas confirmed and which they typed in (§3).
//!
//! `points_possible` and `score` are `REAL` and nullable. NULL means "not
//! graded"; 0 means "graded, scored zero". Collapsing those two is the single
//! most consequential modelling mistake available here.
