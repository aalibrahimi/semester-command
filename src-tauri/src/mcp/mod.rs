//! MCP server mode — `semester-command --mcp` (SPEC.md §7, M5).
//!
//! Called by: `main.rs`, when the flag is present.
//! Calls: [`crate::db::queries`], [`crate::grades`].
//!
//! Exposes the local database over stdio as read-only MCP tools, so the
//! semester is queryable from an agent rather than being one more dashboard to
//! remember to open:
//!
//! - `list_courses`
//! - `get_course_grades`
//! - `what_do_i_need(course, target)`
//! - `upcoming(days)`
//! - `triage(n)`
//!
//! Read-only in both directions: nothing here writes to Canvas, and nothing
//! here writes to the local database either. It opens the SQLite file
//! read-only, which also means it can run while the desktop app is open.
//!
//! TODO(M5).
