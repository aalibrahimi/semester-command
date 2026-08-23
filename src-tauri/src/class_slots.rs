//! Class meeting-time detection (the planner's auto-populate).
//!
//! Called by: `commands::data::detect_class_slots`.
//! Calls: [`crate::canvas::client`] (calendar events), the syllabus table.
//!
//! Canvas's core objects carry no meeting schedule (verified against the
//! live course JSON — no sections/meetings keys), so detection triangulates
//! from two imperfect sources:
//!
//! 1. **Course calendar events** — `GET /calendar_events?type=event` per
//!    course over a three-week window. An event whose (weekday, start, end)
//!    repeats at least twice is a class meeting; one-offs (exams, review
//!    sessions) don't recur weekly and are dropped.
//! 2. **Syllabus text** — "MW 10:30–11:45 AM", "TuTh 3:00-4:15 PM" style
//!    patterns in the extracted PDFs, when any are imported.
//!
//! Every candidate goes to the user for confirmation before it becomes a
//! planner block — detection proposes, never writes.

use serde::{Deserialize, Serialize};

use crate::canvas::client::{CanvasClient, CanvasError};
use crate::db::Db;

/// One proposed class meeting slot. Mirrored as `ClassSlotCandidate`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassSlotCandidate {
    pub course_id: String,
    pub course_code: Option<String>,
    /// 0 = Monday … 6 = Sunday (the planner's convention).
    pub weekday: i64,
    pub start_min: i64,
    pub end_min: i64,
    pub location: Option<String>,
    /// 'canvas' | 'syllabus' — shown so the user knows what to trust.
    pub source: String,
    /// How many observations back this up (recurrences / pattern hits).
    pub confidence: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectResult {
    pub candidates: Vec<ClassSlotCandidate>,
    /// False when the Canvas source was unreachable (dead session) — the
    /// UI says "syllabus-only" instead of implying Canvas had nothing.
    pub canvas_checked: bool,
}

/// A Canvas calendar event, minimally.
#[derive(Debug, Deserialize)]
struct CalendarEvent {
    title: Option<String>,
    start_at: Option<String>,
    end_at: Option<String>,
    location_name: Option<String>,
}

/// Run detection over every visible gradeable course.
pub async fn detect(
    db: &Db,
    client: &CanvasClient,
    courses: &[(String, Option<String>)], // (id, course_code)
) -> DetectResult {
    let mut candidates: Vec<ClassSlotCandidate> = Vec::new();
    let mut canvas_checked = true;

    for (course_id, code) in courses {
        match canvas_events_for(client, course_id).await {
            Ok(found) => {
                for mut c in found {
                    c.course_code = code.clone();
                    candidates.push(c);
                }
            }
            Err(CanvasError::SessionExpired) | Err(CanvasError::NoAuth) => {
                canvas_checked = false;
                break; // every further course would fail identically
            }
            Err(e) => {
                tracing::info!(course_id, error = %e, "calendar events unavailable; skipping");
            }
        }
    }

    // Syllabus text, when imported. Purely local.
    if let Ok(rows) = sqlx::query_as::<_, (String, Option<String>)>(
        "SELECT course_id, extracted_text FROM syllabus_files WHERE extracted_text IS NOT NULL",
    )
    .fetch_all(db)
    .await
    {
        for (course_id, text) in rows {
            let Some(text) = text else { continue };
            let code = courses
                .iter()
                .find(|(id, _)| *id == course_id)
                .and_then(|(_, c)| c.clone());
            for mut c in from_syllabus_text(&text) {
                c.course_id = course_id.clone();
                c.course_code = code.clone();
                candidates.push(c);
            }
        }
    }

    // Dedupe on (course, weekday, start): Canvas beats syllabus (it carries
    // the room and reflects reality after schedule changes).
    candidates.sort_by(|a, b| {
        (&a.course_id, a.weekday, a.start_min, &a.source)
            .cmp(&(&b.course_id, b.weekday, b.start_min, &b.source))
    });
    candidates.dedup_by(|b, a| {
        a.course_id == b.course_id && a.weekday == b.weekday && (a.start_min - b.start_min).abs() < 20
    });

    DetectResult { candidates, canvas_checked }
}

/// Recurring events for one course over a three-week window.
async fn canvas_events_for(
    client: &CanvasClient,
    course_id: &str,
) -> Result<Vec<ClassSlotCandidate>, CanvasError> {
    let start = chrono::Utc::now().date_naive();
    let end = start + chrono::Duration::days(21);
    let path = format!(
        "/calendar_events?type=event&context_codes[]=course_{course_id}&start_date={start}&end_date={end}"
    );
    let events: Vec<serde_json::Value> = client.get_all(&path).await?;

    // Bucket by (weekday, start, end); >= 2 recurrences = a weekly meeting.
    let mut buckets: std::collections::HashMap<(i64, i64, i64), (usize, Option<String>)> =
        std::collections::HashMap::new();
    for value in events {
        let Ok(ev) = serde_json::from_value::<CalendarEvent>(value) else { continue };
        let (Some(s), Some(e)) = (ev.start_at.as_deref(), ev.end_at.as_deref()) else { continue };
        let (Ok(s), Ok(e)) = (
            chrono::DateTime::parse_from_rfc3339(s),
            chrono::DateTime::parse_from_rfc3339(e),
        ) else {
            continue;
        };
        let s = s.with_timezone(&chrono::Local);
        let e = e.with_timezone(&chrono::Local);
        let weekday = s.format("%u").to_string().parse::<i64>().unwrap_or(1) - 1; // Mon=0
        let start_min = i64::from(chrono::Timelike::hour(&s)) * 60 + i64::from(chrono::Timelike::minute(&s));
        let end_min = i64::from(chrono::Timelike::hour(&e)) * 60 + i64::from(chrono::Timelike::minute(&e));
        if end_min <= start_min {
            continue; // all-day or malformed
        }
        let entry = buckets.entry((weekday, start_min, end_min)).or_insert((0, None));
        entry.0 += 1;
        if entry.1.is_none() {
            entry.1 = ev.location_name.filter(|l| !l.trim().is_empty()).or(ev.title);
        }
    }

    Ok(buckets
        .into_iter()
        .filter(|(_, (count, _))| *count >= 2)
        .map(|((weekday, start_min, end_min), (count, location))| ClassSlotCandidate {
            course_id: course_id.to_string(),
            course_code: None,
            weekday,
            start_min,
            end_min,
            location,
            source: "canvas".into(),
            confidence: count,
        })
        .collect())
}

/// Scan syllabus text for "MW 10:30–11:45 AM" style meeting patterns.
pub fn from_syllabus_text(text: &str) -> Vec<ClassSlotCandidate> {
    // Two-stage scan per line: recognisable day tokens (the campus
    // shorthand zoo — MWF, TR, TTh, TuTh, Mon/Wed, full names) and a time
    // range on the same line.
    let range_re = regex::Regex::new(
        r"(\d{1,2}):(\d{2})\s*(?i:(am|pm|a\.m\.|p\.m\.))?\s*(?:[-–—]|to)\s*(\d{1,2}):(\d{2})\s*(?i:(am|pm|a\.m\.|p\.m\.))?",
    )
    .expect("range regex is valid");

    let mut out = Vec::new();
    for line in text.lines() {
        let Some(days) = parse_day_tokens(line) else { continue };
        let Some(caps) = range_re.captures(line) else { continue };

        let sh: i64 = caps[1].parse().unwrap_or(0);
        let sm: i64 = caps[2].parse().unwrap_or(0);
        let eh: i64 = caps[4].parse().unwrap_or(0);
        let em: i64 = caps[5].parse().unwrap_or(0);
        let s_mer = caps.get(3).map(|m| m.as_str().to_lowercase());
        let e_mer = caps.get(6).map(|m| m.as_str().to_lowercase());

        let mut start = to_minutes(sh, sm, s_mer.as_deref(), e_mer.as_deref());
        let mut end = to_minutes(eh, em, e_mer.as_deref(), s_mer.as_deref());
        // "10:30-11:45" with no meridiem at all: daytime classes — anything
        // starting before 8 reads as afternoon.
        if s_mer.is_none() && e_mer.is_none() {
            if sh < 8 {
                start += 12 * 60;
            }
            if eh < 8 || end < start {
                end = to_minutes(eh, em, None, None) + 12 * 60;
            }
        }
        if end <= start || end - start > 4 * 60 {
            continue; // not a class meeting shape
        }
        for weekday in days {
            out.push(ClassSlotCandidate {
                course_id: String::new(), // filled by the caller
                course_code: None,
                weekday,
                start_min: start,
                end_min: end,
                location: None,
                source: "syllabus".into(),
                confidence: 1,
            });
        }
    }
    out
}

fn to_minutes(h: i64, m: i64, own_mer: Option<&str>, other_mer: Option<&str>) -> i64 {
    let mer = own_mer.or(other_mer);
    let h24 = match mer {
        Some(s) if s.starts_with('p') && h != 12 => h + 12,
        Some(s) if s.starts_with('a') && h == 12 => 0,
        _ => h,
    };
    h24 * 60 + m
}

/// "MW", "TuTh", "Mon/Wed", "Tuesday & Thursday" → planner weekdays.
/// Returns None when the line has no recognisable day block.
fn parse_day_tokens(line: &str) -> Option<Vec<i64>> {
    let lower = line.to_lowercase();
    let mut days: Vec<i64> = Vec::new();

    // Full/abbreviated names first — unambiguous.
    for (pat, d) in [
        ("monday", 0), ("mon", 0),
        ("tuesday", 1), ("tues", 1), ("tue", 1),
        ("wednesday", 2), ("wed", 2),
        ("thursday", 3), ("thurs", 3), ("thur", 3), ("thu", 3),
        ("friday", 4), ("fri", 4),
        ("saturday", 5), ("sat", 5),
    ] {
        if lower.contains(pat) && !days.contains(&d) {
            days.push(d);
        }
    }
    if !days.is_empty() {
        days.sort_unstable();
        return Some(days);
    }

    // Compact letter runs: MWF, TR, TTh, TuTh. Scan a candidate token.
    let letters = regex::Regex::new(r"\b((?:M|Tu|T|W|Th|R|F){2,5})\b").expect("valid");
    let caps = letters.captures(line)?;
    let token = &caps[1];
    let mut i = 0;
    let bytes = token.as_bytes();
    while i < bytes.len() {
        let rest = &token[i..];
        let (d, adv) = if rest.starts_with("Th") {
            (3, 2)
        } else if rest.starts_with("Tu") {
            (1, 2)
        } else {
            match bytes[i] {
                b'M' => (0, 1),
                b'T' => (1, 1),
                b'W' => (2, 1),
                b'R' => (3, 1),
                b'F' => (4, 1),
                _ => return None,
            }
        };
        if !days.contains(&d) {
            days.push(d);
        }
        i += adv;
    }
    if days.len() >= 2 {
        days.sort_unstable();
        Some(days)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn syllabus_mw_with_meridiem() {
        let slots = from_syllabus_text("Lectures: MW 10:30 AM - 11:45 AM in MH 225");
        let days: Vec<i64> = slots.iter().map(|s| s.weekday).collect();
        assert_eq!(days, vec![0, 2]);
        assert_eq!(slots[0].start_min, 10 * 60 + 30);
        assert_eq!(slots[0].end_min, 11 * 60 + 45);
    }

    #[test]
    fn syllabus_tuth_afternoon_no_meridiem() {
        let slots = from_syllabus_text("Class meets TuTh 3:00-4:15");
        let days: Vec<i64> = slots.iter().map(|s| s.weekday).collect();
        assert_eq!(days, vec![1, 3]);
        // No meridiem, start hour < 8 → read as PM.
        assert_eq!(slots[0].start_min, 15 * 60);
        assert_eq!(slots[0].end_min, 16 * 60 + 15);
    }

    #[test]
    fn syllabus_full_day_names() {
        let slots = from_syllabus_text("Monday and Wednesday, 9:00am–10:15am, DH 450");
        let days: Vec<i64> = slots.iter().map(|s| s.weekday).collect();
        assert_eq!(days, vec![0, 2]);
        assert_eq!(slots[0].start_min, 9 * 60);
    }

    #[test]
    fn prose_without_times_is_ignored() {
        assert!(from_syllabus_text("Make-up work: within two weeks. MW office drop-ins welcome.").is_empty());
    }
}
