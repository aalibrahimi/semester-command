//! Data commands: plain reads of synced coursework.
//!
//! Called by: `src/lib/ipc.ts` (`listCourses`, `listAssignments`,
//! `listInstructors` from M1).
//! Calls: [`crate::db::queries`].
//!
//! Everything returned from here carries its `source` (`api` | `ics` |
//! `manual`), because §3 requires the UI to visibly mark any number Canvas did
//! not confirm. Dropping that field to simplify a return type would quietly
//! remove the distinction the user most needs.
//!
//! TODO(M1): `list_courses`, `list_assignments(course_id)`,
//!           `list_instructors(course_id)`, `set_estimate(assignment_id, mins)`,
//!           `set_note(...)`, and the manual-entry writes — which are a
//!           first-class path, not a debug feature: under Tier 2 auth they are
//!           the only way grades exist at all.
