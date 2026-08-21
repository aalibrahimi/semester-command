//! Local notification scheduling and deduplication (SPEC.md §6).
//!
//! Called by: `lib.rs` (a 5-minute tick loop) and the sync engine (after
//! each run that changed something).
//! Calls: tauri-plugin-notification, [`crate::db`],
//! [`crate::commands::grades::load_bundle`], [`crate::triage`].
//!
//! # What fires
//!
//! - **Deadline reminders**, 7d / 3d / 24h / 3h before a due date, scaled by
//!   grade impact — a 2%-of-grade discussion post gets the 24-hour ping only;
//!   a 25% midterm gets all four (see [`thresholds_for`]). An app that pings
//!   identically for both trains you to ignore it.
//! - **Grade movement**: Canvas's current score for a course moved by more
//!   than a point during a sync.
//! - **Missing flips**: Canvas newly flagged an assignment `missing`.
//! - **The 8am digest**: today's due items and the top three triage rows.
//!
//! # Dedupe — the hard part and the whole point
//!
//! Every send is recorded in `notifications_sent` (migration 0004) keyed by
//! a stable string, and checked before sending. The ledger lives in SQLite,
//! not memory, because dev rebuilds and autostart restart the app far more
//! often than a deadline moves. When several thresholds for one assignment
//! are already in the past (app was off for a week), only the tightest one
//! fires and the rest are marked sent silently — catching up must not mean
//! four stacked pings per assignment.

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::commands::grades::load_bundle;
use crate::db::{now_rfc3339, Db};
use crate::sync::SyncChanges;

/// Reminder thresholds in hours, gated by grade impact (percentage points of
/// the final grade at stake). Sorted descending; the gate is "impact at
/// least this much".
const THRESHOLDS: &[(i64, f64)] = &[
    (7 * 24, 10.0), // a week out: only the genuinely heavy items
    (3 * 24, 4.0),  // three days: anything that meaningfully moves the grade
    (24, 0.0),      // a day out: everything with points
    (3, 4.0),       // final call: the meaningful ones again
];

/// Which thresholds apply to an assignment of this impact.
fn thresholds_for(impact_pct: f64) -> impl Iterator<Item = i64> {
    THRESHOLDS
        .iter()
        .filter(move |(_, min)| impact_pct >= *min)
        .map(|(h, _)| *h)
}

/// The periodic pass: deadline reminders + the daily digest. Called every
/// five minutes from `lib.rs`; every call is idempotent thanks to the ledger.
pub async fn tick(app: &AppHandle) {
    use tauri::Manager;
    let db = app.state::<Db>().inner().clone();

    if let Err(e) = deadline_reminders(app, &db).await {
        tracing::warn!(error = %e, "deadline reminder pass failed");
    }
    if let Err(e) = daily_digest(app, &db).await {
        tracing::warn!(error = %e, "daily digest pass failed");
    }
}

async fn deadline_reminders(app: &AppHandle, db: &Db) -> Result<(), sqlx::Error> {
    let bundle = load_bundle(db).await?;
    let now = chrono::Utc::now();

    // Triage's rank already encodes "open, not hidden, worth attention" —
    // reuse it rather than re-deriving a slightly different notion here.
    for row in crate::triage::rank(&bundle, now) {
        let Some(due) = row
            .due_at
            .as_deref()
            .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
        else {
            continue;
        };
        let hours_left = (due.with_timezone(&chrono::Utc) - now).num_minutes() as f64 / 60.0;
        if hours_left <= 0.0 {
            continue; // overdue is triage's pinned zone, not a reminder
        }

        // All thresholds already inside the window, tightest first.
        let hit: Vec<i64> = thresholds_for(row.impact_pct)
            .filter(|h| hours_left <= *h as f64)
            .collect();
        let Some(tightest) = hit.iter().min().copied() else { continue };

        let key = format!("due:{}:{}", row.assignment_id, tightest);
        if already_sent(db, &key).await? {
            continue;
        }
        // Mark every hit threshold, so catching up after days offline sends
        // one notification, not a backlog.
        for h in &hit {
            mark_sent(db, &format!("due:{}:{}", row.assignment_id, h)).await?;
        }

        let course = row.course_code.as_deref().unwrap_or("course");
        let name = row.name.as_deref().unwrap_or("Assignment");
        send(
            app,
            &format!("{name} — due {}", human_hours(hours_left)),
            &format!("{course} · worth {:.1}% of your final grade", row.impact_pct),
        );
    }
    Ok(())
}

/// The 8am digest: what's due today, and the top of the triage list. Fires
/// on the first tick at-or-after 08:00 local, once per calendar day.
async fn daily_digest(app: &AppHandle, db: &Db) -> Result<(), sqlx::Error> {
    let local = chrono::Local::now();
    if local.format("%H:%M").to_string().as_str() < "08:00" {
        return Ok(());
    }
    let key = format!("daily:{}", local.format("%Y-%m-%d"));
    if already_sent(db, &key).await? {
        return Ok(());
    }

    let bundle = load_bundle(db).await?;
    let rows = crate::triage::rank(&bundle, chrono::Utc::now());
    if rows.is_empty() {
        // A quiet day earns a quiet app — mark it so we don't re-check all
        // day, and send nothing.
        mark_sent(db, &key).await?;
        return Ok(());
    }

    let today = local.format("%Y-%m-%d").to_string();
    let due_today = rows
        .iter()
        .filter(|r| {
            r.due_at
                .as_deref()
                .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                .map(|d| d.with_timezone(&chrono::Local).format("%Y-%m-%d").to_string() == today)
                .unwrap_or(false)
        })
        .count();

    let top: Vec<String> = rows
        .iter()
        .take(3)
        .map(|r| {
            format!(
                "{} ({})",
                r.name.as_deref().unwrap_or("Untitled"),
                r.course_code.as_deref().unwrap_or("—")
            )
        })
        .collect();

    mark_sent(db, &key).await?;
    let title = if due_today > 0 {
        format!("{due_today} due today · {} open", rows.len())
    } else {
        format!("{} open items", rows.len())
    };
    send(app, &title, &format!("Start with: {}", top.join(" · ")));
    Ok(())
}

/// Sync-driven notifications: course grade moves and missing flips. The
/// change list arrives pre-diffed from the sync engine.
pub async fn on_sync_changes(app: &AppHandle, changes: &SyncChanges) {
    use tauri::Manager;
    let db = app.state::<Db>().inner().clone();

    for m in &changes.course_moves {
        // Keyed on the rounded pair, so a regrade back and forth cannot ping
        // twice for the same transition.
        let key = format!(
            "grade:{}:{:.1}->{:.1}",
            m.course_id, m.old_pct, m.new_pct
        );
        match already_sent(&db, &key).await {
            Ok(false) => {
                let _ = mark_sent(&db, &key).await;
                let code = m.course_code.as_deref().unwrap_or("A course");
                let dir = if m.new_pct > m.old_pct { "up" } else { "down" };
                send(
                    app,
                    &format!("{code}: grade moved {dir}"),
                    &format!("current {:.1}% → {:.1}%", m.old_pct, m.new_pct),
                );
            }
            _ => {}
        }
    }

    for f in &changes.missing_flips {
        // No stable id on the event; course+name is stable enough for a
        // once-per-flip ping.
        let key = format!(
            "missing:{}:{}",
            f.course_code.as_deref().unwrap_or("?"),
            f.assignment_name.as_deref().unwrap_or("?")
        );
        match already_sent(&db, &key).await {
            Ok(false) => {
                let _ = mark_sent(&db, &key).await;
                send(
                    app,
                    &format!("Marked missing: {}", f.assignment_name.as_deref().unwrap_or("an assignment")),
                    &format!("{} — still submittable? Check late policy in Syllabi.", f.course_code.as_deref().unwrap_or("")),
                );
            }
            _ => {}
        }
    }
}

// ── Plumbing ────────────────────────────────────────────────────────────────

async fn already_sent(db: &Db, key: &str) -> Result<bool, sqlx::Error> {
    let hit: Option<String> =
        sqlx::query_scalar("SELECT key FROM notifications_sent WHERE key = ?1")
            .bind(key)
            .fetch_optional(db)
            .await?;
    Ok(hit.is_some())
}

async fn mark_sent(db: &Db, key: &str) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT OR IGNORE INTO notifications_sent (key, sent_at) VALUES (?1, ?2)")
        .bind(key)
        .bind(now_rfc3339())
        .execute(db)
        .await?;
    Ok(())
}

fn send(app: &AppHandle, title: &str, body: &str) {
    if let Err(e) = app.notification().builder().title(title).body(body).show() {
        tracing::warn!(error = %e, title, "notification failed to send");
    } else {
        tracing::info!(title, "notification sent");
    }
}

/// "in 2h" / "in 3d" for notification titles.
fn human_hours(hours: f64) -> String {
    if hours < 1.5 {
        format!("in {}m", (hours * 60.0).round() as i64)
    } else if hours < 48.0 {
        format!("in {}h", hours.round() as i64)
    } else {
        format!("in {}d", (hours / 24.0).round() as i64)
    }
}
