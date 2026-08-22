//! Degree progress: parsing SJSU's MyProgress report and auditing what is left.
//!
//! Called by: `commands::degree` (import + read), and the graduation screen.
//! Calls: nothing. Like [`crate::grades`], this module is pure — text in,
//! structures out, no I/O, no `async`, no database. That is what lets the
//! whole thing be tested against a real report in `tests/degree_test.rs`.
//!
//! # Why text, and not the PDF or the API
//!
//! Canvas knows nothing about degree requirements. The only source is
//! MyProgress, the PeopleSoft advisement report in MySJSU, and there are three
//! ways to get at it. We take the least clever one on purpose:
//!
//! * **Pasted page text (this module).** Requirement status arrives as literal
//!   words — `Taken`, `Enrolled`, `Planned`, `Error` — and the *Additional
//!   Courses* section carries the grade each past course earned.
//! * **The printed PDF.** Rejected: `pdftotext` yields an *empty* status
//!   column, because completion is drawn as an icon. The counts lines survive,
//!   the statuses do not.
//! * **Scraping MySJSU.** Rejected: PeopleSoft navigation requires POSTing
//!   `ICAction`/`ICStateNum` form state, which would break the GET-only
//!   invariant that `canvas/client.rs` enforces by construction (SPEC.md
//!   §2.0). It also would not have helped — pagination, icon-encoded status
//!   and absent prerequisites are properties of the report, not the transport.
//!
//! # The grade-floor rule, which is the whole reason this module is careful
//!
//! A course can satisfy one requirement and fail another. The observed case: a
//! `D` in MATH 31 satisfied GE Area 2 (no floor) and failed the CS
//! department's "C- or better in any course meeting a major requirement"
//! rule, so the major-prep line still reads `Error`. A model that recorded
//! "MATH 31: done" would show an on-time graduation and be wrong.
//!
//! So [`Requirement::min_grade`] is parsed per requirement, floors are
//! inherited from the enclosing block, and [`audit`] cross-references the
//! course history to mark a requirement as a **retake** rather than as
//! something never attempted. That distinction is the point.
//!
//! # What this module deliberately does not know
//!
//! **Prerequisites.** MyProgress carries offering terms but no prerequisite
//! data whatsoever. Chains like `MATH 31 → MATH 161A → CS 171` have to come
//! from the catalog and be entered by hand. Nothing here should pretend
//! otherwise — a planner that invents prerequisites is worse than one that
//! admits it has none.

use serde::Serialize;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/// Status of a requirement, exactly as MyProgress words it.
///
/// The report renders these as icons with `alt` text; pasting the page yields
/// the alt text, which is why this is parseable at all.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ReqStatus {
    /// Requirement is complete.
    Taken,
    /// In progress this term.
    Enrolled,
    /// A plan for completion is on file.
    Planned,
    /// Not yet completed. MyProgress's own word for it — not an app error.
    Error,
    /// An advisor granted an exception.
    Exception,
}

impl ReqStatus {
    /// The string form stored in SQLite. Kept beside [`ReqStatus::from_db`]
    /// so the two cannot drift apart.
    pub fn as_str(self) -> &'static str {
        match self {
            ReqStatus::Taken => "taken",
            ReqStatus::Enrolled => "enrolled",
            ReqStatus::Planned => "planned",
            ReqStatus::Error => "error",
            ReqStatus::Exception => "exception",
        }
    }

    /// Inverse of [`ReqStatus::as_str`]. An unrecognised value reads as
    /// `Error` — the conservative direction, since it shows the requirement as
    /// outstanding rather than quietly marking it done.
    pub fn from_db(s: &str) -> Self {
        match s {
            "taken" => ReqStatus::Taken,
            "enrolled" => ReqStatus::Enrolled,
            "planned" => ReqStatus::Planned,
            "exception" => ReqStatus::Exception,
            _ => ReqStatus::Error,
        }
    }

    /// Whether this requirement still needs work.
    ///
    /// `Enrolled` counts as satisfied: the report states that courses in
    /// progress are treated as if they will be passed. That is optimistic in
    /// exactly the way [`crate::grades`]'s *current* score is optimistic, and
    /// the graduation screen shows both readings for the same reason.
    pub fn outstanding(self) -> bool {
        matches!(self, ReqStatus::Error)
    }
}

/// Status of a single course row inside a requirement's option table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CourseStatus {
    Taken,
    Enrolled,
    Planned,
    Transferred,
}

impl CourseStatus {
    /// The string form stored in SQLite.
    pub fn as_str(self) -> &'static str {
        match self {
            CourseStatus::Taken => "taken",
            CourseStatus::Enrolled => "enrolled",
            CourseStatus::Planned => "planned",
            CourseStatus::Transferred => "transferred",
        }
    }

    /// Inverse of [`CourseStatus::as_str`]. Unlike [`ReqStatus::from_db`] this
    /// returns `None` for an unknown value, because an empty status cell is
    /// normal and legal — it means the course has not been attempted.
    pub fn from_db(s: &str) -> Option<Self> {
        match s {
            "taken" => Some(CourseStatus::Taken),
            "enrolled" => Some(CourseStatus::Enrolled),
            "planned" => Some(CourseStatus::Planned),
            "transferred" => Some(CourseStatus::Transferred),
            _ => None,
        }
    }
}

/// `Units:` / `Courses:` triples. Every field is present in the source line,
/// so unlike Canvas payloads these are not optional.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub required: f64,
    pub taken: f64,
    pub needed: f64,
}

/// Which terms a course runs in, parsed from the report's `When` column.
///
/// This is the only scheduling data MyProgress provides, and it is the reason
/// a term planner is possible at all. `Variable Offering See Advisor` is the
/// dangerous one: it means the department does not commit to a cadence, so a
/// plan that depends on such a course has no guarantee behind it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Offering {
    /// The `When` cell verbatim, kept because our parse of it may be wrong and
    /// the user can read the original.
    pub raw: String,
    pub fall: bool,
    pub spring: bool,
    pub summer: bool,
    /// `Fall in odd years` / `Fall in even years` — halves the opportunities.
    pub parity: Option<YearParity>,
    /// `Variable Offering See Advisor`: no committed cadence.
    pub variable: bool,
    /// A concrete term such as `Fall 2026`, which means this row is the user's
    /// own enrollment rather than a catalogue option.
    pub term: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum YearParity {
    Odd,
    Even,
}

impl Offering {
    /// Parse a `When` cell.
    ///
    /// Order matters: a concrete term like `Fall 2026` contains the word
    /// "Fall", so the year check has to come first or every enrolled course
    /// looks like a fall-only catalogue offering.
    pub fn parse(raw: &str) -> Self {
        let trimmed = raw.trim();
        let lower = trimmed.to_ascii_lowercase();

        let mut o = Offering {
            raw: trimmed.to_string(),
            fall: false,
            spring: false,
            summer: false,
            parity: None,
            variable: false,
            term: None,
        };

        // A four-digit token means this is a specific term, not a cadence.
        if trimmed.split_whitespace().any(is_year) {
            o.term = Some(trimmed.to_string());
            return o;
        }

        if lower.contains("variable offering") {
            o.variable = true;
            return o;
        }

        if lower.contains("all terms") {
            o.fall = true;
            o.spring = true;
            o.summer = true;
            return o;
        }

        o.fall = lower.contains("fall");
        o.spring = lower.contains("spring");
        o.summer = lower.contains("summer");

        if lower.contains("odd years") {
            o.parity = Some(YearParity::Odd);
        } else if lower.contains("even years") {
            o.parity = Some(YearParity::Even);
        }

        o
    }

    /// True when the course runs in only one term of the year, with no parity
    /// or variability caveat. These are the rows a planner must schedule
    /// around rather than slot in wherever there is room.
    pub fn single_term(&self) -> bool {
        self.term.is_none()
            && !self.variable
            && self.parity.is_none()
            && [self.fall, self.spring, self.summer]
                .iter()
                .filter(|x| **x)
                .count()
                == 1
    }
}

fn is_year(tok: &str) -> bool {
    tok.len() == 4 && tok.chars().all(|c| c.is_ascii_digit())
}

/// One row of a requirement's "the following courses may be used" table, or of
/// the Additional Courses history.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseRow {
    pub code: String,
    pub description: Option<String>,
    pub units: Option<f64>,
    pub offering: Option<Offering>,
    /// Present only in the history section, and the field the grade-floor rule
    /// turns on. `None` means not attempted — never treat it as a failure.
    pub grade: Option<String>,
    pub status: Option<CourseStatus>,
    /// e.g. `GE: 2 Math/Quant Reason (B4)` — which requirement consumed it.
    pub designation: Option<String>,
}

/// A paginated table we only saw part of.
///
/// PeopleSoft caps option tables at ten rows and the user must click **View
/// All** before copying. Silent truncation here would hide the one eligible
/// course that fits their schedule, which is the same failure mode as
/// forgetting Canvas's `Link` header (see `docs/CANVAS_API.md` gotcha 6) — so
/// it is recorded and surfaced, never swallowed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Truncation {
    pub shown: usize,
    pub total: usize,
}

/// One requirement or sub-requirement.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Requirement {
    /// Stable key from the report: `RG1048`, or `RQ2995:LI20` for a line item.
    /// Falls back to a slug of the title when the report states no id.
    pub key: String,
    pub title: String,
    pub status: ReqStatus,
    /// The descriptive prose under the heading, joined.
    pub note: Option<String>,
    pub units: Option<Counts>,
    pub courses: Option<Counts>,
    /// `GPA: 2.000 required, 3.056 actual`.
    pub gpa: Option<(f64, f64)>,
    /// Minimum passing grade, inherited from the enclosing block when the
    /// requirement itself does not restate it.
    pub min_grade: Option<String>,
    pub options: Vec<CourseRow>,
    pub truncated: Option<Truncation>,
    /// Order of appearance, so the UI can render the report's own sequence.
    pub position: usize,
}

impl Requirement {
    /// Whether the report says anything is still outstanding here. A bare
    /// `Error` with no counts is a heading whose children carry the detail.
    pub fn needs_work(&self) -> bool {
        self.courses.is_some_and(|c| c.needed > 0.0)
            || self.units.is_some_and(|u| u.needed > 0.0)
    }

    /// A unit-total constraint rather than a course to take.
    ///
    /// The rule is structural, not a threshold: a requirement that lists no
    /// eligible courses *and* states no course count cannot be enrolled in.
    /// It is arithmetic over other requirements.
    pub fn is_rollup(&self) -> bool {
        self.options.is_empty() && self.courses.is_none()
    }

    /// Units still needed, preferring the explicit `Units:` line and falling
    /// back to `courses_needed × the smallest eligible option`.
    ///
    /// The fallback is deliberately conservative: picking the *smallest*
    /// option understates the workload rather than overstating it, and an
    /// audit that flatters the schedule is the one that costs a semester.
    pub fn units_needed(&self) -> Option<f64> {
        if let Some(u) = self.units {
            if u.needed > 0.0 {
                return Some(u.needed);
            }
        }
        let n = self.courses?.needed;
        if n <= 0.0 {
            return None;
        }
        let smallest = self
            .options
            .iter()
            .filter_map(|c| c.units)
            .filter(|u| *u > 0.0)
            .fold(f64::INFINITY, f64::min);
        if smallest.is_finite() {
            Some(n * smallest)
        } else {
            None
        }
    }
}

/// The header block of the report.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportHeader {
    pub student_name: Option<String>,
    pub student_id: Option<String>,
    pub career: Option<String>,
    pub program: Option<String>,
    pub plan: Option<String>,
    pub catalog_term: Option<String>,
    pub graduation_status: Option<String>,
    pub last_term_registered: Option<String>,
    pub academic_standing: Option<String>,
    pub overall_gpa: Option<f64>,
    pub sjsu_gpa: Option<f64>,
    pub generated_at: Option<String>,
}

/// A parsed MyProgress report.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub header: ReportHeader,
    pub requirements: Vec<Requirement>,
    /// Rows from *Additional Courses → Earned Units*: every course with a
    /// grade on record. This is what makes the retake rule computable.
    pub history: Vec<CourseRow>,
}

impl Report {
    /// Outstanding requirements that name actual courses — the things you
    /// enrol in.
    ///
    /// Excludes *unit buckets* (see [`Report::unit_buckets`]). Both carry
    /// `Error`, and summing the two would double-count: "40 Total Upper
    /// Division Units" is satisfied *by* the named upper-division courses, not
    /// alongside them.
    pub fn outstanding(&self) -> Vec<&Requirement> {
        self.requirements
            .iter()
            .filter(|r| r.status.outstanding() && r.needs_work() && !r.is_rollup())
            .collect()
    }

    /// Outstanding requirements that state only a unit total and name no
    /// eligible courses — "40 Total Upper Division Units", "Complete 15 units"
    /// of major electives.
    ///
    /// You cannot enrol in one of these directly; they are satisfied as a side
    /// effect of the requirements in [`Report::outstanding`]. They are
    /// reported separately because the overlap is **not** knowable from the
    /// document: MyProgress renders nesting with indentation, and pasting the
    /// page discards it. A bucket needing 12 units above two itemised 3-unit
    /// children leaves 6 units genuinely unaccounted for, and the UI has to
    /// say so rather than silently pick a number.
    pub fn unit_buckets(&self) -> Vec<&Requirement> {
        self.requirements
            .iter()
            .filter(|r| r.status.outstanding() && r.needs_work() && r.is_rollup())
            .collect()
    }

    /// The best graded attempt at a course code, wherever it appears.
    ///
    /// Two subtleties, both load-bearing for the retake rule:
    ///
    /// **Grades live in two places.** *Additional Courses* holds coursework
    /// not consumed by a requirement, but an expanded report also prints the
    /// grade inside the satisfied requirement's own table — MATH 30's `B` is
    /// only ever visible there. Searching one section finds half the record.
    ///
    /// **Best grade wins, not first.** A repeated course appears once per
    /// attempt, and the report lists them in no useful order. ENGL 2 shows a
    /// `D` and a `C`; SJSU counts the `C`. Taking the first row would report a
    /// passed requirement as needing a retake.
    pub fn attempt(&self, code: &str) -> Option<&CourseRow> {
        self.history
            .iter()
            .chain(self.requirements.iter().flat_map(|r| &r.options))
            .filter(|c| c.code.eq_ignore_ascii_case(code) && c.grade.is_some())
            .max_by(|a, b| {
                let pts = |c: &CourseRow| {
                    c.grade.as_deref().and_then(grade_points).unwrap_or(-1.0)
                };
                pts(a).partial_cmp(&pts(b)).unwrap_or(std::cmp::Ordering::Equal)
            })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grades
// ─────────────────────────────────────────────────────────────────────────────

/// Grade points on the standard 4.0 scale, or `None` for a non-letter mark
/// (`CR`, `W`, `I`, ...).
///
/// `None` is not a failure. A withdrawal is not a bad grade, and treating it
/// as one would tell the user to retake a course they never took — the same
/// class of mistake as `unwrap_or_default()` on an ungraded score.
pub fn grade_points(grade: &str) -> Option<f64> {
    let g = grade.trim().to_ascii_uppercase();
    let pts = match g.as_str() {
        "A+" | "A" => 4.0,
        "A-" => 3.7,
        "B+" => 3.3,
        "B" => 3.0,
        "B-" => 2.7,
        "C+" => 2.3,
        "C" => 2.0,
        "C-" => 1.7,
        "D+" => 1.3,
        "D" => 1.0,
        "D-" => 0.7,
        "F" => 0.0,
        _ => return None,
    };
    Some(pts)
}

/// Whether `grade` clears `floor`. Unknown marks return `None` — undecidable,
/// and the caller must say so rather than assume either way.
pub fn meets_floor(grade: &str, floor: &str) -> Option<bool> {
    Some(grade_points(grade)? >= grade_points(floor)?)
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────────────────────────

/// An outstanding requirement, enriched with what the report implies about it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditItem {
    pub key: String,
    pub title: String,
    pub units_needed: Option<f64>,
    pub min_grade: Option<String>,
    /// A prior attempt that failed this requirement's grade floor. When set,
    /// this is a **retake**, not a course never taken — the single most
    /// misleading thing a naive audit gets wrong.
    pub retake_of: Option<CourseRow>,
    /// Options that run in exactly one term per year.
    pub single_term_only: bool,
    /// Any option carries `Variable Offering See Advisor`, and none is
    /// reliably scheduled.
    pub needs_advisor: bool,
    pub options: Vec<CourseRow>,
    pub truncated: Option<Truncation>,
}

/// Audit a parsed report: what is left, and what is unusual about each item.
///
/// Does **not** schedule anything. Ordering requirements across terms needs
/// prerequisite data that MyProgress does not carry (see the module docs).
pub fn audit(report: &Report) -> Vec<AuditItem> {
    report
        .outstanding()
        .into_iter()
        .map(|r| {
            // A retake is an option this requirement lists that the student
            // has already sat and not passed to this requirement's floor.
            let retake_of = r.min_grade.as_deref().and_then(|floor| {
                r.options.iter().find_map(|opt| {
                    let attempt = report.attempt(&opt.code)?;
                    let grade = attempt.grade.as_deref()?;
                    match meets_floor(grade, floor) {
                        Some(false) => Some(attempt.clone()),
                        _ => None,
                    }
                })
            });

            let offerings: Vec<&Offering> =
                r.options.iter().filter_map(|c| c.offering.as_ref()).collect();

            AuditItem {
                key: r.key.clone(),
                title: r.title.clone(),
                units_needed: r.units_needed(),
                min_grade: r.min_grade.clone(),
                retake_of,
                single_term_only: !offerings.is_empty()
                    && offerings.iter().all(|o| o.single_term()),
                needs_advisor: !offerings.is_empty() && offerings.iter().all(|o| o.variable),
                options: r.options.clone(),
                truncated: r.truncated,
            }
        })
        .collect()
}

/// Total units still required, summed over outstanding leaf requirements.
pub fn units_remaining(report: &Report) -> f64 {
    report
        .outstanding()
        .iter()
        .filter_map(|r| r.units_needed())
        .sum()
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

/// Column labels in the report's stacked table rendering. Copying the page
/// yields `Label\nValue` pairs rather than real table cells.
const LABELS: &[&str] = &[
    "Course",
    "Description",
    "Units",
    "When",
    "Grade",
    "Status",
    "Notes",
    "RequirementDesignation",
    "Requirement",
    "Designation",
];

/// Labels that can appear inside a single course record.
const FIELDS: &[&str] = &[
    "Course",
    "Description",
    "Units",
    "When",
    "Grade",
    "Status",
    "Notes",
    "RequirementDesignation",
];

fn is_label(s: &str) -> bool {
    LABELS.contains(&s)
}

fn is_field(s: &str) -> bool {
    FIELDS.contains(&s)
}

/// Parse a pasted MyProgress page.
///
/// Never fails: an unrecognised line is skipped rather than aborting the
/// parse. A report that half-parses is still useful, and the alternative — a
/// hard error on SJSU's next restyle — leaves the user with nothing.
pub fn parse(input: &str) -> Report {
    let lines: Vec<&str> = input
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect();

    let header = parse_header(&lines);

    // Everything above "Expand All" is the icon legend, which contains bare
    // `Taken` / `Enrolled` lines that would otherwise parse as requirements.
    let start = lines
        .iter()
        .rposition(|l| *l == "Expand All")
        .map(|i| i + 1)
        .unwrap_or(0);

    let mut requirements: Vec<Requirement> = Vec::new();
    let mut history: Vec<CourseRow> = Vec::new();
    // Grade floors cascade: the CS department states its C- rule once, on the
    // major block, and every line item under it inherits.
    let mut inherited_floor: Option<String> = None;
    let mut in_history = false;
    let mut notes: Vec<String> = Vec::new();

    let mut i = start;
    while i < lines.len() {
        let line = lines[i];

        // ── a course record ────────────────────────────────────────────────
        if line == "Course" && i + 1 < lines.len() && !is_label(lines[i + 1]) {
            let (row, next) = parse_course(&lines, i);
            i = next;
            if let Some(row) = row {
                if in_history {
                    history.push(row);
                } else if let Some(r) = requirements.last_mut() {
                    r.options.push(row);
                }
            }
            continue;
        }

        // ── a requirement heading ──────────────────────────────────────────
        if let Some((title, status)) = split_status(line) {
            flush_notes(&mut requirements, &mut notes);
            let position = requirements.len();
            let (title, key_from_title) = extract_key(title);
            // A new top-level group (`RGxxxx`) ends the previous block's grade
            // floor. Without this, GE Area 6's C- rule leaks into every later
            // block that states no floor of its own.
            if key_from_title.as_deref().is_some_and(|k| k.starts_with("RG")) {
                inherited_floor = None;
            }
            requirements.push(Requirement {
                key: key_from_title.unwrap_or_else(|| slug(&title)),
                title,
                status,
                note: None,
                units: None,
                courses: None,
                gpa: None,
                min_grade: inherited_floor.clone(),
                options: Vec::new(),
                truncated: None,
                position,
            });
            in_history = false;
            i += 1;
            continue;
        }

        // ── section markers ────────────────────────────────────────────────
        if line == "Additional Courses" || line == "Earned Units" {
            in_history = true;
            i += 1;
            continue;
        }
        if line == "Ineligible Coursework" {
            in_history = false;
            i += 1;
            continue;
        }

        // Inside the history section, prose and counts describe past
        // coursework rather than the requirement that happens to precede it.
        // Without this guard the history's own
        // `Units: 0.00 required, 63.00 taken, 0.00 needed` lands on the last
        // requirement parsed and silently overwrites its real counts.
        if in_history {
            i += 1;
            continue;
        }

        // ── counts, ids, floors, pagination ────────────────────────────────
        if let Some(r) = requirements.last_mut() {
            // First value wins. A requirement states its own counts directly
            // beneath its heading, so a *second* counts line belongs to
            // something nested below it. Sub-blocks such as `GE: CORE GE
            // ADDITIONAL UNITS (RQ1584)` carry no status word, so no
            // requirement is opened for them — and letting their
            // `Units: 0.00 ... 0.00 needed` through would silently zero the
            // enclosing requirement's real figure.
            if let Some(c) = parse_counts(line, "Units:") {
                r.units = r.units.or(Some(c));
            } else if let Some(c) = parse_counts(line, "Courses:") {
                r.courses = r.courses.or(Some(c));
            } else if let Some(g) = parse_gpa(line) {
                r.gpa = r.gpa.or(Some(g));
            } else if let Some(t) = parse_pagination(line) {
                r.truncated = r.truncated.or(Some(t));
            } else {
                // Prose. It may carry the requirement's id and grade floor.
                if r.key.starts_with("slug:") {
                    if let Some(k) = key_from_note(line) {
                        // `CSLN Major Preparation` states its id in prose
                        // rather than its heading, so the group reset has to
                        // happen here too.
                        if k.starts_with("RG") {
                            inherited_floor = None;
                            r.min_grade = None;
                        }
                        r.key = k;
                    }
                }
                if let Some(floor) = parse_min_grade(line) {
                    r.min_grade = Some(floor.clone());
                    // A floor stated on a block heading applies to everything
                    // nested beneath it until the next block restates one.
                    if r.options.is_empty() && r.courses.is_none() {
                        inherited_floor = Some(floor);
                    }
                }
                notes.push(line.to_string());
            }
        }
        i += 1;
    }
    flush_notes(&mut requirements, &mut notes);

    Report {
        header,
        requirements,
        history,
    }
}

fn flush_notes(reqs: &mut [Requirement], notes: &mut Vec<String>) {
    if notes.is_empty() {
        return;
    }
    if let Some(r) = reqs.last_mut() {
        if r.note.is_none() {
            r.note = Some(notes.join(" "));
        }
    }
    notes.clear();
}

/// Split `Minimum 120 UnitsTaken` into `("Minimum 120 Units", Taken)`.
///
/// The status word is concatenated with no separator because it is an image's
/// alt text sitting immediately after the heading in the DOM. A bare status
/// word — the `Status` cell of a course row — has an empty title and is
/// rejected here, which is what keeps table cells out of the requirement list.
fn split_status(line: &str) -> Option<(String, ReqStatus)> {
    const SUFFIXES: &[(&str, ReqStatus)] = &[
        ("Exception made for requirement", ReqStatus::Exception),
        ("Enrolled", ReqStatus::Enrolled),
        ("Planned", ReqStatus::Planned),
        ("Taken", ReqStatus::Taken),
        ("Error", ReqStatus::Error),
    ];
    for (word, status) in SUFFIXES {
        if let Some(title) = line.strip_suffix(word) {
            let title = title.trim();
            if !title.is_empty() {
                return Some((title.to_string(), *status));
            }
        }
    }
    None
}

/// Pull a trailing `(RG1048)` off a heading, returning the cleaned title.
fn extract_key(title: String) -> (String, Option<String>) {
    let Some(open) = title.rfind('(') else {
        return (title, None);
    };
    let Some(close) = title[open..].find(')') else {
        return (title, None);
    };
    let inner = &title[open + 1..open + close];
    if !is_req_id(inner) {
        return (title, None);
    }
    let key = inner.to_string();
    let cleaned = title[..open].trim().to_string();
    (cleaned, Some(key))
}

/// `RQ2995, LI20` in prose becomes the key `RQ2995:LI20`.
fn key_from_note(line: &str) -> Option<String> {
    let open = line.rfind('(')?;
    let close = line[open..].find(')')? + open;
    let inner = &line[open + 1..close];
    let parts: Vec<&str> = inner.split(',').map(str::trim).collect();
    if parts.iter().all(|p| is_req_id(p)) && !parts.is_empty() {
        Some(parts.join(":"))
    } else {
        None
    }
}

/// `RG1048`, `RQ39`, `LI20` — a two-letter tag followed by digits.
fn is_req_id(s: &str) -> bool {
    let s = s.trim();
    let mut chars = s.chars();
    let (Some(a), Some(b)) = (chars.next(), chars.next()) else {
        return false;
    };
    a.is_ascii_uppercase()
        && b.is_ascii_uppercase()
        && s.len() > 2
        && chars.all(|c| c.is_ascii_digit())
}

fn slug(title: &str) -> String {
    let body: String = title
        .chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect();
    format!("slug:{}", body.trim_matches('-'))
}

/// `Units: 40.00 required, 27.00 taken, 13.00 needed`
fn parse_counts(line: &str, prefix: &str) -> Option<Counts> {
    let rest = line.strip_prefix(prefix)?;
    let mut nums = rest.split(',').filter_map(|part| {
        part.split_whitespace()
            .next()
            .and_then(|n| n.parse::<f64>().ok())
    });
    Some(Counts {
        required: nums.next()?,
        taken: nums.next()?,
        needed: nums.next()?,
    })
}

/// `GPA: 2.000 required, 3.056 actual`
fn parse_gpa(line: &str) -> Option<(f64, f64)> {
    let rest = line.strip_prefix("GPA:")?;
    let mut nums = rest.split(',').filter_map(|part| {
        part.split_whitespace()
            .next()
            .and_then(|n| n.parse::<f64>().ok())
    });
    Some((nums.next()?, nums.next()?))
}

/// `1-10 of 13` inside the pagination row.
///
/// Tokenised on any whitespace rather than on tabs: the row arrives tab-
/// separated from a browser copy but space-separated from some clipboards,
/// and a truncation we fail to notice is one the user never gets told about.
fn parse_pagination(line: &str) -> Option<Truncation> {
    let toks: Vec<&str> = line.split_whitespace().collect();
    let of = toks.iter().position(|t| *t == "of")?;
    let (_, shown) = toks.get(of.checked_sub(1)?)?.split_once('-')?;
    let shown: usize = shown.parse().ok()?;
    let total: usize = toks.get(of + 1)?.parse().ok()?;
    (shown < total).then_some(Truncation { shown, total })
}

/// `A minimum grade of "C-" is required.` and the major block's
/// `A grade of 'C-" or better is required` — note the mismatched quotes in
/// SJSU's own copy, which is why this scans for any quote character rather
/// than matching a pair.
fn parse_min_grade(line: &str) -> Option<String> {
    let idx = line.find("grade of ")?;
    let rest = &line[idx + "grade of ".len()..];
    let rest = rest.trim_start_matches(['"', '\'', '\u{2018}', '\u{201c}']);
    let end = rest.find(['"', '\'', '\u{2019}', '\u{201d}'])?;
    let grade = rest[..end].trim();
    if grade_points(grade).is_some() {
        Some(grade.to_string())
    } else {
        None
    }
}

/// The four words a course's `Status` cell can hold. Anything else means the
/// cell is empty and the line belongs to whatever follows the table.
fn course_status(s: &str) -> Option<CourseStatus> {
    match s {
        "Taken" => Some(CourseStatus::Taken),
        "Enrolled" => Some(CourseStatus::Enrolled),
        "Planned" => Some(CourseStatus::Planned),
        "Transferred" => Some(CourseStatus::Transferred),
        _ => None,
    }
}

/// Read one stacked course record starting at `Course`. Returns the row and
/// the index to resume from.
fn parse_course(lines: &[&str], start: usize) -> (Option<CourseRow>, usize) {
    let mut i = start + 1;
    let code = lines[i].to_string();
    i += 1;

    let mut row = CourseRow {
        code,
        description: None,
        units: None,
        offering: None,
        grade: None,
        status: None,
        designation: None,
    };

    while i < lines.len() {
        let label = lines[i];
        if label == "Course" || !is_field(label) {
            break;
        }
        // Deciding whether the next line is this cell's value or the start of
        // something else is the whole difficulty of the stacked rendering.
        // Three things disqualify it, and missing any one shifts every
        // remaining column by one:
        //
        //   * another label — the cell is simply empty;
        //   * a requirement heading — an empty trailing `Status` cell is
        //     followed directly by the next requirement, and consuming it
        //     deletes that requirement from the report entirely;
        //   * for `Status`, anything outside the four words it can hold,
        //     which is what stops the table's own footer being eaten.
        let value = lines
            .get(i + 1)
            .filter(|v| !is_label(v))
            .filter(|v| split_status(v).is_none())
            .filter(|v| label != "Status" || course_status(v).is_some())
            .map(|v| v.to_string());
        i += 1 + usize::from(value.is_some());

        let Some(value) = value else { continue };
        match label {
            "Description" => row.description = Some(value),
            "Units" => row.units = value.parse().ok(),
            "When" => row.offering = Some(Offering::parse(&value)),
            "Grade" => row.grade = Some(value),
            "RequirementDesignation" => row.designation = Some(value),
            "Status" => row.status = course_status(&value),
            _ => {}
        }
    }

    // `(***)` is PeopleSoft's placeholder row for "approved transfer credit",
    // not a course anyone can enrol in.
    let keep = !row.code.starts_with('(');
    (keep.then_some(row), i)
}

/// The `Label:Value` block above the requirement list.
fn parse_header(lines: &[&str]) -> ReportHeader {
    let mut h = ReportHeader::default();

    for (i, line) in lines.iter().enumerate() {
        let next = |n: usize| lines.get(i + n).map(|s| s.to_string());

        if *line == "My Progress" {
            h.student_name = next(1);
            h.student_id = next(2);
        } else if *line == "Career:" {
            h.career = next(1);
            h.catalog_term = next(2);
        } else if *line == "Program:" {
            h.program = next(1);
        } else if *line == "Plan:" {
            h.plan = next(1);
        } else if let Some(v) = line.strip_prefix("Graduation Status:") {
            h.graduation_status = Some(v.trim().to_string());
        } else if let Some(v) = line.strip_prefix("Last Term Registered:") {
            h.last_term_registered = Some(v.trim().to_string());
        } else if let Some(v) = line.strip_prefix("Academic Standing:") {
            h.academic_standing = Some(v.trim().to_string());
        } else if let Some(v) = line.strip_prefix("Overall GPA:") {
            h.overall_gpa = v.trim().parse().ok();
        } else if let Some(v) = line.strip_prefix("SJSU GPA:") {
            h.sjsu_gpa = v.trim().parse().ok();
        } else if let Some(v) = line.strip_prefix("This report last generated on") {
            h.generated_at = Some(v.trim().to_string());
        }
    }
    h
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn offering_specific_term_beats_season_word() {
        let o = Offering::parse("Fall 2026");
        assert_eq!(o.term.as_deref(), Some("Fall 2026"));
        assert!(!o.fall, "a concrete term is an enrolment, not a cadence");
    }

    #[test]
    fn offering_seasons() {
        assert!(Offering::parse("Spring Summer & Fall").summer);
        assert!(Offering::parse("All Terms").spring);
        assert!(Offering::parse("Variable Offering See Advisor").variable);
        assert_eq!(
            Offering::parse("Fall in odd years").parity,
            Some(YearParity::Odd)
        );
    }

    #[test]
    fn single_term_excludes_parity_and_variable() {
        assert!(Offering::parse("Fall").single_term());
        assert!(Offering::parse("Spring").single_term());
        assert!(!Offering::parse("Spring & Fall").single_term());
        assert!(!Offering::parse("Fall in odd years").single_term());
        assert!(!Offering::parse("Variable Offering See Advisor").single_term());
    }

    #[test]
    fn grade_floor_arithmetic() {
        assert_eq!(meets_floor("D", "C-"), Some(false));
        assert_eq!(meets_floor("C-", "C-"), Some(true));
        assert_eq!(meets_floor("B+", "C-"), Some(true));
        // A withdrawal is undecidable, not a failure.
        assert_eq!(meets_floor("W", "C-"), None);
    }

    #[test]
    fn min_grade_tolerates_sjsus_mismatched_quotes() {
        assert_eq!(
            parse_min_grade(r#"A minimum grade of "C-" is required."#).as_deref(),
            Some("C-")
        );
        assert_eq!(
            parse_min_grade(r#"A grade of 'C-" or better is required for courses"#).as_deref(),
            Some("C-")
        );
        assert_eq!(parse_min_grade("no floor stated here"), None);
    }

    #[test]
    fn status_suffix_needs_a_title() {
        assert!(split_status("Taken").is_none(), "a bare table cell");
        assert_eq!(
            split_status("Minimum 120 UnitsTaken"),
            Some(("Minimum 120 Units".into(), ReqStatus::Taken))
        );
    }

    #[test]
    fn counts_and_pagination() {
        assert_eq!(
            parse_counts("Units: 40.00 required, 27.00 taken, 13.00 needed", "Units:"),
            Some(Counts {
                required: 40.0,
                taken: 27.0,
                needed: 13.0
            })
        );
        assert_eq!(
            parse_pagination(" First\t Previous\t1-10 of 13\tNext \tLast"),
            Some(Truncation {
                shown: 10,
                total: 13
            })
        );
        // A complete table is not truncation.
        assert_eq!(parse_pagination(" First\t Previous\t1-13 of 13\tNext"), None);
    }

    #[test]
    fn requirement_ids() {
        assert_eq!(
            extract_key("University Units (RG1048)".into()),
            ("University Units".into(), Some("RG1048".into()))
        );
        assert_eq!(
            key_from_note("Complete 1 course. (RQ2995, LI20)").as_deref(),
            Some("RQ2995:LI20")
        );
        assert_eq!(key_from_note("Complete 1 course. (see advisor)"), None);
    }
}
