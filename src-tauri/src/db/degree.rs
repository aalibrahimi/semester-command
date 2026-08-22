//! Persistence for the MyProgress import (`migrations/0005_degree.sql`).
//!
//! Called by: [`crate::commands::degree`].
//! Calls: sqlx, and [`crate::degree`] for the types it stores.
//!
//! [`crate::degree`] is pure — text in, structures out. This module is the
//! only place those structures meet a database, which keeps the parser
//! testable against a fixture with no pool in sight.
//!
//! # Replace vs. preserve
//!
//! [`save`] **replaces** `degree_report`, `degree_requirements`,
//! `degree_requirement_courses` and `degree_history` in one transaction. A
//! MyProgress report is a snapshot of one moment and a partial merge of two
//! snapshots describes no real state — a requirement satisfied since the last
//! import would keep its stale `error` row forever.
//!
//! It never touches `degree_plan` or `degree_target`. Those hold the user's
//! own planning, exist nowhere else, and have no foreign key into the replaced
//! tables precisely so a cascade cannot take them (§3).

use super::Db;
use crate::degree::{CourseRow, CourseStatus, Offering, ReportHeader, ReqStatus, Truncation};
use crate::degree::{Counts, Report, Requirement};

/// Store a freshly parsed report, replacing any previous one.
///
/// `raw_text` is the exact paste. It is kept for the same reason Canvas rows
/// keep `raw_json`: when the parser turns out to have misread something, the
/// source is already on disk and the fix is a re-parse, not another trip to
/// MySJSU.
///
/// # Errors
/// Any sqlx failure. The transaction rolls back, so a failed import leaves the
/// previous report intact rather than half-replaced.
pub async fn save(db: &Db, report: &Report, raw_text: &str) -> Result<(), sqlx::Error> {
    let mut tx = db.begin().await?;

    // Order matters only for readability — `degree_requirement_courses` has
    // ON DELETE CASCADE — but being explicit means the cleanup still works if
    // someone runs with foreign keys off.
    sqlx::query("DELETE FROM degree_requirement_courses")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM degree_requirements")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM degree_history")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM degree_report")
        .execute(&mut *tx)
        .await?;

    let h = &report.header;
    sqlx::query(
        "INSERT INTO degree_report (id, student_name, student_id, career, program, plan,
             catalog_term, graduation_status, last_term_registered, academic_standing,
             overall_gpa, sjsu_gpa, generated_at, imported_at, raw_text)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&h.student_name)
    .bind(&h.student_id)
    .bind(&h.career)
    .bind(&h.program)
    .bind(&h.plan)
    .bind(&h.catalog_term)
    .bind(&h.graduation_status)
    .bind(&h.last_term_registered)
    .bind(&h.academic_standing)
    .bind(h.overall_gpa)
    .bind(h.sjsu_gpa)
    .bind(&h.generated_at)
    .bind(super::now_rfc3339())
    .bind(raw_text)
    .execute(&mut *tx)
    .await?;

    for r in &report.requirements {
        sqlx::query(
            "INSERT INTO degree_requirements (key, title, status, note,
                 units_required, units_taken, units_needed,
                 courses_required, courses_taken, courses_needed,
                 gpa_required, gpa_actual, min_grade,
                 truncated_shown, truncated_total, position)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&r.key)
        .bind(&r.title)
        .bind(r.status.as_str())
        .bind(&r.note)
        .bind(r.units.map(|c| c.required))
        .bind(r.units.map(|c| c.taken))
        .bind(r.units.map(|c| c.needed))
        .bind(r.courses.map(|c| c.required))
        .bind(r.courses.map(|c| c.taken))
        .bind(r.courses.map(|c| c.needed))
        .bind(r.gpa.map(|g| g.0))
        .bind(r.gpa.map(|g| g.1))
        .bind(&r.min_grade)
        .bind(r.truncated.map(|t| t.shown as i64))
        .bind(r.truncated.map(|t| t.total as i64))
        .bind(r.position as i64)
        .execute(&mut *tx)
        .await?;

        for (i, c) in r.options.iter().enumerate() {
            sqlx::query(
                "INSERT INTO degree_requirement_courses (requirement_key, position, code,
                     description, units, offered, grade, status, designation)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&r.key)
            .bind(i as i64)
            .bind(&c.code)
            .bind(&c.description)
            .bind(c.units)
            .bind(c.offering.as_ref().map(|o| o.raw.clone()))
            .bind(&c.grade)
            .bind(c.status.map(|s| s.as_str()))
            .bind(&c.designation)
            .execute(&mut *tx)
            .await?;
        }
    }

    for (i, c) in report.history.iter().enumerate() {
        sqlx::query(
            "INSERT INTO degree_history (position, code, description, units, offered,
                 grade, status, designation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(i as i64)
        .bind(&c.code)
        .bind(&c.description)
        .bind(c.units)
        .bind(c.offering.as_ref().map(|o| o.raw.clone()))
        .bind(&c.grade)
        .bind(c.status.map(|s| s.as_str()))
        .bind(&c.designation)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    tracing::info!(
        requirements = report.requirements.len(),
        history = report.history.len(),
        "degree report stored"
    );
    Ok(())
}

/// Read the stored report back, or `None` when nothing has been imported.
///
/// Reconstructs the same [`Report`] the parser produced, so every caller —
/// the audit, the UI, the MCP server — sees one shape regardless of whether
/// the data came from a fresh paste or from disk.
pub async fn load(db: &Db) -> Result<Option<Report>, sqlx::Error> {
    let Some(header) = load_header(db).await? else {
        return Ok(None);
    };

    let rows: Vec<RequirementRow> = sqlx::query_as(
        "SELECT key, title, status, note, units_required, units_taken, units_needed,
                courses_required, courses_taken, courses_needed, gpa_required, gpa_actual,
                min_grade, truncated_shown, truncated_total, position
         FROM degree_requirements ORDER BY position",
    )
    .fetch_all(db)
    .await?;

    let mut requirements = Vec::with_capacity(rows.len());
    for row in rows {
        let options: Vec<CourseRowDb> = sqlx::query_as(
            "SELECT code, description, units, offered, grade, status, designation
             FROM degree_requirement_courses WHERE requirement_key = ? ORDER BY position",
        )
        .bind(&row.key)
        .fetch_all(db)
        .await?;

        requirements.push(Requirement {
            key: row.key,
            title: row.title,
            status: ReqStatus::from_db(&row.status),
            note: row.note,
            units: triple(row.units_required, row.units_taken, row.units_needed),
            courses: triple(row.courses_required, row.courses_taken, row.courses_needed),
            gpa: row.gpa_required.zip(row.gpa_actual),
            min_grade: row.min_grade,
            options: options.into_iter().map(CourseRowDb::into_row).collect(),
            truncated: row.truncated_shown.zip(row.truncated_total).map(|(s, t)| {
                Truncation {
                    shown: s as usize,
                    total: t as usize,
                }
            }),
            position: row.position as usize,
        });
    }

    let history: Vec<CourseRowDb> = sqlx::query_as(
        "SELECT code, description, units, offered, grade, status, designation
         FROM degree_history ORDER BY position",
    )
    .fetch_all(db)
    .await?;

    Ok(Some(Report {
        header,
        requirements,
        history: history.into_iter().map(CourseRowDb::into_row).collect(),
    }))
}

/// When the report was imported, and MyProgress's own generation stamp.
/// Cheap enough to call on every screen paint, unlike [`load`].
pub async fn imported_at(db: &Db) -> Result<Option<(String, Option<String>)>, sqlx::Error> {
    let row: Option<(String, Option<String>)> =
        sqlx::query_as("SELECT imported_at, generated_at FROM degree_report WHERE id = 1")
            .fetch_optional(db)
            .await?;
    Ok(row)
}

/// The term the audit is measured against, e.g. `Fall 2027`.
pub async fn target_term(db: &Db) -> Result<Option<String>, sqlx::Error> {
    let row: Option<(Option<String>,)> =
        sqlx::query_as("SELECT target_term FROM degree_target WHERE id = 1")
            .fetch_optional(db)
            .await?;
    Ok(row.and_then(|r| r.0))
}

/// Set the target graduation term. Local-only; survives every import.
pub async fn set_target_term(db: &Db, term: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO degree_target (id, target_term, updated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET target_term = excluded.target_term,
                                       updated_at  = excluded.updated_at",
    )
    .bind(term)
    .bind(super::now_rfc3339())
    .execute(db)
    .await?;
    Ok(())
}

// ─── row structs ─────────────────────────────────────────────────────────────

async fn load_header(db: &Db) -> Result<Option<ReportHeader>, sqlx::Error> {
    let row: Option<HeaderRow> = sqlx::query_as(
        "SELECT student_name, student_id, career, program, plan, catalog_term,
                graduation_status, last_term_registered, academic_standing,
                overall_gpa, sjsu_gpa, generated_at
         FROM degree_report WHERE id = 1",
    )
    .fetch_optional(db)
    .await?;

    Ok(row.map(|r| ReportHeader {
        student_name: r.student_name,
        student_id: r.student_id,
        career: r.career,
        program: r.program,
        plan: r.plan,
        catalog_term: r.catalog_term,
        graduation_status: r.graduation_status,
        last_term_registered: r.last_term_registered,
        academic_standing: r.academic_standing,
        overall_gpa: r.overall_gpa,
        sjsu_gpa: r.sjsu_gpa,
        generated_at: r.generated_at,
    }))
}

/// Rebuild a [`Counts`] only when all three columns are present. A partial
/// triple would be a phantom count — better absent than half-true.
fn triple(required: Option<f64>, taken: Option<f64>, needed: Option<f64>) -> Option<Counts> {
    Some(Counts {
        required: required?,
        taken: taken?,
        needed: needed?,
    })
}

#[derive(sqlx::FromRow)]
struct HeaderRow {
    student_name: Option<String>,
    student_id: Option<String>,
    career: Option<String>,
    program: Option<String>,
    plan: Option<String>,
    catalog_term: Option<String>,
    graduation_status: Option<String>,
    last_term_registered: Option<String>,
    academic_standing: Option<String>,
    overall_gpa: Option<f64>,
    sjsu_gpa: Option<f64>,
    generated_at: Option<String>,
}

#[derive(sqlx::FromRow)]
struct RequirementRow {
    key: String,
    title: String,
    status: String,
    note: Option<String>,
    units_required: Option<f64>,
    units_taken: Option<f64>,
    units_needed: Option<f64>,
    courses_required: Option<f64>,
    courses_taken: Option<f64>,
    courses_needed: Option<f64>,
    gpa_required: Option<f64>,
    gpa_actual: Option<f64>,
    min_grade: Option<String>,
    truncated_shown: Option<i64>,
    truncated_total: Option<i64>,
    position: i64,
}

#[derive(sqlx::FromRow)]
struct CourseRowDb {
    code: String,
    description: Option<String>,
    units: Option<f64>,
    offered: Option<String>,
    grade: Option<String>,
    status: Option<String>,
    designation: Option<String>,
}

impl CourseRowDb {
    fn into_row(self) -> CourseRow {
        CourseRow {
            code: self.code,
            description: self.description,
            units: self.units,
            // Re-parsed rather than stored decomposed, so improving
            // `Offering::parse` fixes historical rows without a migration.
            offering: self.offered.as_deref().map(Offering::parse),
            grade: self.grade,
            status: self.status.as_deref().and_then(CourseStatus::from_db),
            designation: self.designation,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    const SAMPLE: &str = include_str!("../../tests/fixtures/myprogress_sample.txt");

    async fn mem_db() -> Db {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory sqlite");
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("migrations");
        pool
    }

    /// Sixteen bind parameters in column order is exactly the sort of thing
    /// that compiles and silently stores `units_taken` in `units_needed`.
    /// Asserting on the *audit* rather than on columns means a transposition
    /// shows up as a wrong answer, which is how the user would meet it.
    #[tokio::test]
    async fn round_trip_preserves_the_audit() {
        let db = mem_db().await;
        let parsed = crate::degree::parse(SAMPLE);
        save(&db, &parsed, SAMPLE).await.unwrap();

        let loaded = load(&db).await.unwrap().expect("a report was stored");

        assert_eq!(loaded.requirements.len(), parsed.requirements.len());
        assert_eq!(loaded.history.len(), parsed.history.len());
        assert_eq!(loaded.header.overall_gpa, parsed.header.overall_gpa);
        assert_eq!(
            loaded.header.graduation_status,
            parsed.header.graduation_status
        );

        let before = crate::degree::audit(&parsed);
        let after = crate::degree::audit(&loaded);
        assert_eq!(before.len(), after.len());
        assert!(
            (crate::degree::units_remaining(&loaded) - crate::degree::units_remaining(&parsed))
                .abs()
                < 0.001
        );

        // The retake must survive storage: it depends on min_grade, on the
        // option table and on the history all coming back intact.
        let math31 = after.iter().find(|i| i.title == "UBWL MATH 31").unwrap();
        assert_eq!(
            math31.retake_of.as_ref().and_then(|c| c.grade.as_deref()),
            Some("D")
        );
        assert_eq!(math31.min_grade.as_deref(), Some("C-"));

        // Truncation is a warning to the user; losing it in storage would
        // present a partial option list as complete.
        let es = after
            .iter()
            .find(|i| i.title == "GE: 6 Ethnic Studies")
            .unwrap();
        assert_eq!(es.truncated.map(|t| t.total), Some(13));
    }

    /// **The invariant `degree_plan` exists to have.** A re-import replaces
    /// every synced table; it must not take the user's planning with it. This
    /// is the failure §3 warns about — nobody notices until they open the app
    /// expecting their plan to still be there.
    #[tokio::test]
    async fn reimport_preserves_local_planning() {
        let db = mem_db().await;
        let parsed = crate::degree::parse(SAMPLE);
        save(&db, &parsed, SAMPLE).await.unwrap();

        set_target_term(&db, "Fall 2027").await.unwrap();
        sqlx::query(
            "INSERT INTO degree_plan (requirement_key, planned_term, note, updated_at)
             VALUES ('RQ2995:LI20', 'Spring 2027', 'retake', '2026-08-21T00:00:00Z')",
        )
        .execute(&db)
        .await
        .unwrap();

        // Import again, as the user would after re-pasting with View All.
        save(&db, &parsed, SAMPLE).await.unwrap();

        assert_eq!(target_term(&db).await.unwrap().as_deref(), Some("Fall 2027"));
        let plan: Option<(String,)> =
            sqlx::query_as("SELECT planned_term FROM degree_plan WHERE requirement_key = ?")
                .bind("RQ2995:LI20")
                .fetch_optional(&db)
                .await
                .unwrap();
        assert_eq!(
            plan.map(|p| p.0).as_deref(),
            Some("Spring 2027"),
            "a re-import destroyed the user's planned term"
        );
    }

    /// A second import must not leave the first one's rows behind.
    #[tokio::test]
    async fn reimport_replaces_rather_than_accumulates() {
        let db = mem_db().await;
        let parsed = crate::degree::parse(SAMPLE);
        save(&db, &parsed, SAMPLE).await.unwrap();
        save(&db, &parsed, SAMPLE).await.unwrap();

        let (reqs,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM degree_requirements")
            .fetch_one(&db)
            .await
            .unwrap();
        assert_eq!(reqs as usize, parsed.requirements.len());

        let (reports,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM degree_report")
            .fetch_one(&db)
            .await
            .unwrap();
        assert_eq!(reports, 1, "degree_report must hold exactly one row");
    }

    #[tokio::test]
    async fn nothing_imported_reads_as_none() {
        let db = mem_db().await;
        assert!(load(&db).await.unwrap().is_none());
        assert!(target_term(&db).await.unwrap().is_none());
    }
}
