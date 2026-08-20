//! One function per Canvas endpoint (SPEC.md §2.1).
//!
//! Called by: the sync engine.
//! Calls: [`super::client`] — every request goes through the paginating helper
//! there, without exception.
//!
//! TODO(M1). The endpoint list, with the include params that matter:
//!
//! | Purpose | Call |
//! |---|---|
//! | Active courses w/ scores + teachers | `GET /courses?enrollment_state=active&include[]=total_scores&include[]=teachers&include[]=term&include[]=syllabus_body` |
//! | Grade weighting mode | same call — read `apply_assignment_group_weights` per course |
//! | Assignment groups + weights | `GET /courses/:id/assignment_groups?include[]=assignments&include[]=submission` |
//! | Assignments (incl. rubric) | `GET /courses/:id/assignments?include[]=submission&include[]=score_statistics` |
//! | My enrollment grades | `GET /courses/:id/enrollments?user_id=self` |
//! | Instructors | `GET /courses/:id/users?enrollment_type[]=teacher&enrollment_type[]=ta&include[]=email&include[]=avatar_url&include[]=bio` |
//! | Course files | `GET /courses/:id/files` |
//! | Planner | `GET /planner/items?start_date=...` |
//!
//! Base URL is `https://sjsu.instructure.com/api/v1`.
//!
//! NOTE: never invent a field name here. If you are unsure whether a field
//! exists, fetch the endpoint once, log the raw JSON, and confirm against what
//! actually came back (§8). Guesses in this file become wrong numbers three
//! layers up.
