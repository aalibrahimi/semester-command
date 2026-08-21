//! Read queries.
//!
//! Called by: [`crate::commands::data`], [`crate::commands::grades`],
//! [`crate::triage`], and the MCP server in M5.
//! Calls: sqlx.
//!
//! NOTE — deviation from SPEC.md §1: these are runtime-checked `query_as`
//! calls, not the compile-time `query!` macros. The macros need a live
//! `DATABASE_URL` or a committed `.sqlx/` cache at build time, which breaks
//! `cargo check` on a fresh clone and in CI for a modest safety gain on a
//! single-user schema. The structs in [`super::schema`] are the contract;
//! renaming a column fails these queries loudly at first use in dev, which
//! is acceptable. Recorded in the SPEC appendix.

use super::schema::*;
use super::Db;
use serde::Serialize;

/// Row-count + freshness for one table, as the debug view renders it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityStat {
    pub entity: String,
    pub rows: i64,
    pub last_synced_at: Option<String>,
}

/// Counts and last-sync times for every synced table.
///
/// Static list rather than sqlite_master introspection: the debug view wants
/// the synced entities in a fixed, meaningful order, not whatever order the
/// catalog returns.
pub async fn entity_stats(db: &Db) -> Result<Vec<EntityStat>, sqlx::Error> {
    let mut out = Vec::new();
    for table in [
        "courses",
        "assignment_groups",
        "assignments",
        "submissions",
        "instructors",
    ] {
        // Table names come from the constant list above, never from input.
        let (rows, last): (i64, Option<String>) = sqlx::query_as(&format!(
            "SELECT COUNT(*), MAX(synced_at) FROM {table}"
        ))
        .fetch_one(db)
        .await?;
        out.push(EntityStat {
            entity: table.to_string(),
            rows,
            last_synced_at: last,
        });
    }
    Ok(out)
}

/// Latest sync-log rows, newest first.
pub async fn recent_sync_log(db: &Db, limit: i64) -> Result<Vec<SyncLogRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM sync_log ORDER BY id DESC LIMIT ?1")
        .bind(limit)
        .fetch_all(db)
        .await
}

/// When the last fully-successful sync run finished, if ever.
///
/// "The run" is identified by the umbrella `sync` entity row the engine
/// writes around each run, so a partial failure doesn't advance the footer's
/// "synced Xm ago".
pub async fn last_ok_sync(db: &Db) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT finished_at FROM sync_log
         WHERE entity = 'sync' AND ok = 1 AND finished_at IS NOT NULL
         ORDER BY id DESC LIMIT 1",
    )
    .fetch_optional(db)
    .await
    .map(Option::flatten)
}

/// All courses, for the debug view and (later) the sidebar.
pub async fn all_courses(db: &Db) -> Result<Vec<CourseRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM courses ORDER BY course_code, name")
        .fetch_all(db)
        .await
}

pub async fn all_groups(db: &Db) -> Result<Vec<AssignmentGroupRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM assignment_groups ORDER BY course_id, position")
        .fetch_all(db)
        .await
}

pub async fn all_assignments(db: &Db) -> Result<Vec<AssignmentRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM assignments ORDER BY course_id, due_at")
        .fetch_all(db)
        .await
}

pub async fn all_submissions(db: &Db) -> Result<Vec<SubmissionRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM submissions ORDER BY assignment_id")
        .fetch_all(db)
        .await
}

pub async fn all_instructors(db: &Db) -> Result<Vec<InstructorRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM instructors ORDER BY course_id, role, name")
        .fetch_all(db)
        .await
}

pub async fn all_targets(db: &Db) -> Result<Vec<TargetRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM targets").fetch_all(db).await
}

pub async fn all_estimates(db: &Db) -> Result<Vec<EstimateRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM estimates").fetch_all(db).await
}
