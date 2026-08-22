//! Degree progress commands: import a MyProgress paste, read the audit back.
//!
//! Called by: `src/lib/ipc.ts`.
//! Calls: [`crate::degree`] for parsing and auditing, [`crate::db::degree`]
//! for storage.
//!
//! Nothing here talks to Canvas. Degree requirements come from MySJSU, which
//! this app never contacts — the user pastes the page and that is the entire
//! ingestion path (see `degree.rs` for why).

use serde::Serialize;
use tauri::State;

use super::{CommandError, CommandResult};
use crate::db::{degree as store, Db};
use crate::degree::{self, AuditItem, ReportHeader};

/// Everything the graduation screen renders, in one round trip.
///
/// One command rather than four because every part is derived from the same
/// parse; splitting it would mean re-reading and re-auditing the report per
/// call for no benefit on a document this size.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DegreeAudit {
    pub header: ReportHeader,
    /// Outstanding requirements that name courses you can enrol in.
    pub outstanding: Vec<AuditItem>,
    /// Unit totals satisfied *by* those courses rather than alongside them.
    /// Rendered separately because the overlap is not knowable from the
    /// document — see [`crate::degree::Report::unit_buckets`].
    pub buckets: Vec<Bucket>,
    /// Sum over `outstanding`. Excludes `buckets` deliberately.
    pub units_from_courses: f64,
    /// Extra units the buckets require beyond what the itemised requirements
    /// account for. Non-zero means the report has unallocated elective room
    /// and the true total sits somewhere in between.
    pub unallocated_bucket_units: f64,
    /// The term the user is aiming at, e.g. `Fall 2027`.
    pub target_term: Option<String>,
    /// RFC 3339, when the paste was imported.
    pub imported_at: Option<String>,
    /// MyProgress's own "last generated on" stamp. Older than `imported_at`,
    /// and the one that describes the data.
    pub generated_at: Option<String>,
    /// Requirements whose option tables were paginated. A non-empty list means
    /// the user should re-paste with **View All** clicked, and the UI says so
    /// rather than presenting a partial list as complete.
    pub truncated_requirements: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bucket {
    pub key: String,
    pub title: String,
    pub units_needed: Option<f64>,
}

/// Parse and store a MyProgress paste.
///
/// Returns the audit computed from it, so the UI needs no second call.
///
/// # Errors
/// `Internal` when the text does not look like a MyProgress report — better a
/// named refusal than an empty screen the user cannot explain. `Storage` on
/// any database failure; the import transaction rolls back and the previous
/// report survives.
#[tauri::command]
pub async fn import_myprogress(db: State<'_, Db>, text: String) -> CommandResult<DegreeAudit> {
    let report = degree::parse(&text);

    // A paste of the wrong page parses to almost nothing rather than failing,
    // because the parser is deliberately lenient (SJSU restyles, and half a
    // report beats none). That leniency has to be checked *somewhere*, and
    // here is the only place with a user to tell.
    if report.requirements.len() < 5 {
        return Err(CommandError::internal(
            "That does not look like a MyProgress report. In MySJSU open \
             My Progress, click Expand All and View All, select the whole \
             page, and paste it here.",
        ));
    }

    store::save(&db, &report, &text)
        .await
        .map_err(|e| CommandError::storage(format!("Could not save the report: {e}")))?;

    audit_from(&db, report).await
}

/// Read the stored audit back. `None` when nothing has been imported yet.
#[tauri::command]
pub async fn get_degree_audit(db: State<'_, Db>) -> CommandResult<Option<DegreeAudit>> {
    let Some(report) = store::load(&db)
        .await
        .map_err(|e| CommandError::storage(format!("Could not read degree progress: {e}")))?
    else {
        return Ok(None);
    };
    audit_from(&db, report).await.map(Some)
}

/// Set the graduation term the audit is measured against.
///
/// Local-only and preserved across imports: it is the user's intent, not
/// something MyProgress knows.
#[tauri::command]
pub async fn set_target_term(db: State<'_, Db>, term: String) -> CommandResult<()> {
    store::set_target_term(&db, &term)
        .await
        .map_err(|e| CommandError::storage(format!("Could not save the target term: {e}")))
}

/// Shared tail of both read paths.
async fn audit_from(db: &Db, report: degree::Report) -> CommandResult<DegreeAudit> {
    let outstanding = degree::audit(&report);
    let units_from_courses = degree::units_remaining(&report);

    let buckets: Vec<Bucket> = report
        .unit_buckets()
        .iter()
        .map(|b| Bucket {
            key: b.key.clone(),
            title: b.title.clone(),
            units_needed: b.units_needed(),
        })
        .collect();

    // How much elective room the buckets demand that no itemised requirement
    // covers.
    //
    // Line items nest under their parent by key — `RQ3000` owns `RQ3000:LI10`
    // and `RQ3000:LI20` — and that nesting is the only structural signal the
    // document gives. Worked example from a real report: Major Electives
    // (`RQ3000`) needs 12 units and itemises two 3-unit children, so 6 units
    // are real work with no requirement row of their own.
    //
    // A bucket with **no** children is a different animal: "40 Total Upper
    // Division Units" and "SJSU Studies" are global constraints satisfied by
    // the named courses elsewhere in the report, not additional work. Counting
    // their shortfall would add 16 phantom units to a 36-unit total.
    let outstanding_refs = report.outstanding();
    let unallocated_bucket_units = report
        .unit_buckets()
        .iter()
        .filter_map(|b| {
            let needed = b.units_needed()?;
            let prefix = format!("{}:", b.key);
            if !report.requirements.iter().any(|r| r.key.starts_with(&prefix)) {
                return None;
            }
            let itemised: f64 = outstanding_refs
                .iter()
                .filter(|r| r.key.starts_with(&prefix))
                .filter_map(|r| r.units_needed())
                .sum();
            Some((needed - itemised).max(0.0))
        })
        .sum();

    let truncated_requirements = report
        .requirements
        .iter()
        .filter(|r| r.truncated.is_some())
        .map(|r| r.title.clone())
        .collect();

    let stamps = store::imported_at(db)
        .await
        .map_err(|e| CommandError::storage(format!("Could not read import time: {e}")))?;
    let target_term = store::target_term(db)
        .await
        .map_err(|e| CommandError::storage(format!("Could not read target term: {e}")))?;

    Ok(DegreeAudit {
        header: report.header.clone(),
        outstanding,
        buckets,
        units_from_courses,
        unallocated_bucket_units,
        target_term,
        imported_at: stamps.as_ref().map(|s| s.0.clone()),
        generated_at: stamps.and_then(|s| s.1),
        truncated_requirements,
    })
}
