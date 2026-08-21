//! `.ics` export and, for Tier 2 auth, `.ics` parsing (SPEC.md §2.0, §5).
//!
//! Called by: [`crate::commands::data`] (export, M4) and `commands::sync`
//! (import).
//! Calls: [`crate::db`], reqwest (plain — the feed is a capability URL, not
//! an authenticated API; it deliberately does not go through `CanvasClient`,
//! whose redirect-refusing, cookie-attaching behaviour is wrong here).
//!
//! # Export (TODO(M4))
//!
//! Every event carries a stable UID: `canvas-assignment-{id}@semester-command`.
//! That is what makes re-exporting after a sync *update* the events already in
//! the user's real calendar instead of adding a second copy of all of them.
//!
//! # Import (Tier 2)
//!
//! Canvas publishes a private `.ics` feed at Calendar → Calendar Feed that
//! needs no login and covers every assignment due date across every course.
//! Dates only — no grades, no weights, no rubrics — but paired with manual
//! grade entry the grade engine still works end to end.
//!
//! What a Canvas feed event looks like (shape confirmed against the crate's
//! parser in the tests below; field availability re-confirmed against a real
//! feed the first time one is configured):
//!
//! ```text
//! BEGIN:VEVENT
//! DTSTART:20260910T075900Z              (or ;VALUE=DATE:20260910 for all-day)
//! SUMMARY:HW 3 [FA26: CS 146 Sec 5]
//! UID:event-assignment-1234567
//! URL;VALUE=URI:https://sjsu.instructure.com/courses/12345/assignments/1234567
//! END:VEVENT
//! ```
//!
//! The UID carries the *Canvas assignment id*, so ICS rows share primary keys
//! with API rows on purpose: an API sync upgrades them in place. The reverse
//! direction is guarded — see [`crate::db::upsert::assignment_from_ics`].
//! Non-assignment events (`event-calendar-event-…`) are skipped: they are
//! lectures and campus events, not deliverables.

use std::str::FromStr;

use icalendar::{Calendar, CalendarComponent, Component, DatePerhapsTime};

use crate::db::{self, schema::*, upsert, Db};

/// What an import run did, for the debug view and toasts.
#[derive(Debug, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IcsSummary {
    pub assignments: usize,
    pub courses_created: usize,
    pub skipped_events: usize,
}

/// One assignment extracted from the feed, before it becomes rows.
#[derive(Debug, PartialEq)]
struct FeedAssignment {
    assignment_id: String,
    course_id: Option<String>,
    name: Option<String>,
    course_label: Option<String>,
    due_at: Option<String>,
    url: Option<String>,
}

/// Fetch the feed and import it. `feed_url` comes from settings; the caller
/// wraps this in `sync_log` rows.
pub async fn import_feed(db: &Db, feed_url: &str) -> Result<IcsSummary, String> {
    let text = reqwest::Client::new()
        .get(feed_url)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("could not fetch the calendar feed: {e}"))?
        .error_for_status()
        .map_err(|e| format!("the calendar feed URL was rejected: {e}"))?
        .text()
        .await
        .map_err(|e| format!("could not read the calendar feed: {e}"))?;

    let parsed = parse_feed(&text)?;
    write_feed(db, parsed).await
}

/// Parse the feed text into assignments. Pure, so the tests need no network.
fn parse_feed(text: &str) -> Result<Vec<FeedAssignment>, String> {
    let calendar = Calendar::from_str(text)
        .map_err(|e| format!("that is not a valid .ics feed: {e}"))?;

    let mut out = Vec::new();
    for component in &calendar.components {
        let CalendarComponent::Event(event) = component else { continue };
        let Some(uid) = event.get_uid() else { continue };

        // Only assignment events carry a Canvas assignment id.
        let Some(assignment_id) = uid.strip_prefix("event-assignment-") else {
            continue;
        };

        let (name, course_label) = split_summary(event.get_summary());
        let url = event.property_value("URL").map(str::to_string);

        out.push(FeedAssignment {
            assignment_id: assignment_id.to_string(),
            course_id: url.as_deref().and_then(course_id_from_url),
            name,
            course_label,
            due_at: event.get_start().and_then(to_rfc3339),
            url,
        });
    }
    Ok(out)
}

/// Write parsed feed assignments as `source='ics'` rows.
async fn write_feed(db: &Db, items: Vec<FeedAssignment>) -> Result<IcsSummary, String> {
    let mut summary = IcsSummary::default();
    let now = db::now_rfc3339();

    for item in items {
        // A course row must exist for the FK. Feed events without a URL have
        // no course id; they get a shared placeholder so they still show up.
        let course_id = item.course_id.clone().unwrap_or_else(|| "ics-unlinked".into());
        let created = upsert::course_if_absent(
            db,
            &course_id,
            item.course_label.as_deref().unwrap_or("From calendar feed"),
            &now,
        )
        .await
        .map_err(|e| format!("database error creating course: {e}"))?;
        if created {
            summary.courses_created += 1;
        }

        let row = AssignmentRow {
            id: item.assignment_id.clone(),
            course_id,
            group_id: None,
            name: item.name.clone(),
            due_at: item.due_at.clone(),
            points_possible: None,
            omit_from_final_grade: None,
            submission_types: None,
            html_url: item.url.clone(),
            rubric_json: None,
            source: "ics".into(),
            raw_json: serde_json::to_string(&serde_json::json!({
                "uid": format!("event-assignment-{}", item.assignment_id),
                "summary": item.name, "course_label": item.course_label,
                "due_at": item.due_at, "url": item.url,
            }))
            .ok(),
            synced_at: Some(now.clone()),
        };
        upsert::assignment_from_ics(db, &row)
            .await
            .map_err(|e| format!("database error writing assignment: {e}"))?;
        summary.assignments += 1;
    }
    Ok(summary)
}

/// Split "HW 3 [FA26: CS 146 Sec 5]" into (name, course label).
///
/// The bracket suffix is Canvas's convention for feed events; a summary
/// without one is kept whole as the name.
fn split_summary(summary: Option<&str>) -> (Option<String>, Option<String>) {
    let Some(s) = summary else { return (None, None) };
    let s = s.trim();
    if let (Some(open), true) = (s.rfind('['), s.ends_with(']')) {
        let label = s[open + 1..s.len() - 1].trim();
        let name = s[..open].trim();
        if !label.is_empty() && !name.is_empty() {
            return (Some(name.to_string()), Some(label.to_string()));
        }
    }
    (Some(s.to_string()), None)
}

/// Pull the course id out of `…/courses/12345/assignments/…`.
fn course_id_from_url(url: &str) -> Option<String> {
    let rest = url.split("/courses/").nth(1)?;
    let id: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    (!id.is_empty()).then_some(id)
}

/// Normalise the crate's date representation to the RFC 3339 UTC strings the
/// database stores.
///
/// - All-day dates get 23:59:59Z — a due *date* means "end of that day".
/// - Floating and zoned-but-unresolvable times are stored as if UTC and
///   logged; being minutes off beats dropping the deadline entirely, and the
///   API path corrects it the moment cookie auth works again.
fn to_rfc3339(start: DatePerhapsTime) -> Option<String> {
    use icalendar::CalendarDateTime;
    match start {
        DatePerhapsTime::DateTime(CalendarDateTime::Utc(dt)) => {
            Some(dt.to_rfc3339_opts(chrono::SecondsFormat::Secs, true))
        }
        DatePerhapsTime::DateTime(CalendarDateTime::Floating(naive)) => {
            tracing::debug!("feed event has floating time; storing as UTC");
            Some(format!("{}Z", naive.format("%Y-%m-%dT%H:%M:%S")))
        }
        DatePerhapsTime::DateTime(CalendarDateTime::WithTimezone { date_time, tzid }) => {
            tracing::debug!(tzid, "feed event has zoned time; storing naive as UTC");
            Some(format!("{}Z", date_time.format("%Y-%m-%dT%H:%M:%S")))
        }
        DatePerhapsTime::Date(date) => Some(format!("{}T23:59:59Z", date.format("%Y-%m-%d"))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FEED: &str = "BEGIN:VCALENDAR\r\n\
VERSION:2.0\r\n\
PRODID:-//Instructure//Canvas//EN\r\n\
BEGIN:VEVENT\r\n\
DTSTART:20260910T075900Z\r\n\
SUMMARY:HW 3 [FA26: CS 146 Sec 5]\r\n\
UID:event-assignment-1234567\r\n\
URL;VALUE=URI:https://sjsu.instructure.com/courses/12345/assignments/1234567\r\n\
END:VEVENT\r\n\
BEGIN:VEVENT\r\n\
DTSTART;VALUE=DATE:20261002\r\n\
SUMMARY:Essay draft\r\n\
UID:event-assignment-7654321\r\n\
END:VEVENT\r\n\
BEGIN:VEVENT\r\n\
DTSTART:20260911T170000Z\r\n\
SUMMARY:Lecture [FA26: CS 146 Sec 5]\r\n\
UID:event-calendar-event-999\r\n\
END:VEVENT\r\n\
END:VCALENDAR\r\n";

    /// Assignments are extracted with ids, courses and dates; the lecture
    /// (a calendar event, not an assignment) is skipped.
    #[test]
    fn parses_canvas_shaped_feed() {
        let items = parse_feed(FEED).expect("feed should parse");
        assert_eq!(items.len(), 2);

        let hw = &items[0];
        assert_eq!(hw.assignment_id, "1234567");
        assert_eq!(hw.course_id.as_deref(), Some("12345"));
        assert_eq!(hw.name.as_deref(), Some("HW 3"));
        assert_eq!(hw.course_label.as_deref(), Some("FA26: CS 146 Sec 5"));
        assert_eq!(hw.due_at.as_deref(), Some("2026-09-10T07:59:00Z"));

        // All-day event → end of day; no URL → no course id.
        let essay = &items[1];
        assert_eq!(essay.course_id, None);
        assert_eq!(essay.due_at.as_deref(), Some("2026-10-02T23:59:59Z"));
        assert_eq!(essay.name.as_deref(), Some("Essay draft"));
    }

    /// Summaries without the bracket convention survive whole.
    #[test]
    fn summary_without_brackets_is_kept() {
        assert_eq!(
            split_summary(Some("Midterm review")),
            (Some("Midterm review".into()), None)
        );
        // A bracket that isn't a suffix label is not stripped.
        assert_eq!(
            split_summary(Some("[draft] essay")),
            (Some("[draft] essay".into()), None)
        );
    }

    #[test]
    fn course_id_extraction() {
        assert_eq!(
            course_id_from_url("https://x.instructure.com/courses/98/assignments/1").as_deref(),
            Some("98")
        );
        assert_eq!(course_id_from_url("https://x.instructure.com/about"), None);
    }
}
