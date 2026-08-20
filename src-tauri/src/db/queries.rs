//! Read queries.
//!
//! Called by: [`crate::commands::data`], [`crate::commands::grades`],
//! [`crate::triage`], and the MCP server in M5.
//! Calls: sqlx.
//!
//! Uses sqlx's compile-time checked macros (§1), so a column renamed in a
//! migration fails the build rather than a Tuesday afternoon. That requires
//! either a live `DATABASE_URL` at build time or a checked-in `.sqlx/` offline
//! cache — see docs/DEVELOPMENT.md for which one this repo uses.
//!
//! TODO(M1).
