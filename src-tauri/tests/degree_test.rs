//! Parser and audit tests for [`semester_command_lib::degree`].
//!
//! The fixture is a **synthetic** report that mirrors the real MyProgress
//! rendering line for line — same concatenated status suffixes, same stacked
//! `Label\nValue` tables, same mismatched quotes in the grade-floor sentence,
//! same pagination rows. It is synthetic because `.gitignore` is explicit that
//! real grades never enter this repository, and a fixture is committed by
//! definition. Course codes and the plan name are invented; the *shapes* are
//! copied from an actual Fall 2026 report.
//!
//! Every case here exists because it produces a plausible wrong answer rather
//! than an obviously wrong one — the same standard as `grades_test.rs`.

use semester_command_lib::degree::{self, CourseStatus, ReqStatus};

const SAMPLE: &str = include_str!("fixtures/myprogress_sample.txt");

fn report() -> degree::Report {
    degree::parse(SAMPLE)
}

// ─── header ──────────────────────────────────────────────────────────────────

#[test]
fn header_fields() {
    let h = report().header;
    assert_eq!(h.student_name.as_deref(), Some("Test Student"));
    assert_eq!(h.plan.as_deref(), Some("Underwater Basket Weaving & Logic"));
    assert_eq!(h.catalog_term.as_deref(), Some("Fall 2025"));
    assert_eq!(h.last_term_registered.as_deref(), Some("Fall 2026"));
    assert_eq!(h.overall_gpa, Some(2.527));
    assert_eq!(h.sjsu_gpa, Some(2.459));
}

/// The single most consequential field in the document: a degree can be
/// finished and still not conferred if the application was never filed.
#[test]
fn graduation_status_is_captured() {
    assert_eq!(
        report().header.graduation_status.as_deref(),
        Some("Not Applied")
    );
}

// ─── requirement parsing ─────────────────────────────────────────────────────

#[test]
fn statuses_and_counts() {
    let r = report();
    let find = |t: &str| {
        r.requirements
            .iter()
            .find(|x| x.title == t)
            .unwrap_or_else(|| panic!("missing requirement {t}"))
    };

    assert_eq!(find("Minimum 120 Units").status, ReqStatus::Taken);
    assert_eq!(find("UBWL BW 146").status, ReqStatus::Enrolled);
    assert_eq!(find("UBWL MATH 31").status, ReqStatus::Error);

    let ud = find("40 Total Upper Division Units");
    assert_eq!(ud.units.unwrap().needed, 13.0);
}

/// The icon legend at the top of the report contains bare `Taken` / `Enrolled`
/// lines. Parsing from the top would invent a requirement for each one.
#[test]
fn icon_legend_is_not_parsed_as_requirements() {
    let r = report();
    assert!(
        !r.requirements.iter().any(|x| x.title.is_empty()
            || x.title == "Requirement is complete"
            || x.title == "Course completed"),
        "legend rows leaked into the requirement list"
    );
}

#[test]
fn requirement_keys_come_from_the_report() {
    let r = report();
    // From the heading.
    assert!(r.requirements.iter().any(|x| x.key == "RG1048"));
    // From prose: `Complete 1 course. (RQ2995, LI20)`.
    assert!(r.requirements.iter().any(|x| x.key == "RQ2995:LI20"));
}

// ─── course option tables ────────────────────────────────────────────────────

#[test]
fn stacked_course_tables_parse() {
    let r = report();
    let es = r
        .requirements
        .iter()
        .find(|x| x.title == "GE: 6 Ethnic Studies")
        .unwrap();

    let codes: Vec<&str> = es.options.iter().map(|c| c.code.as_str()).collect();
    assert_eq!(codes, vec!["AAS 1", "AAS 159", "AFAM 25", "CCS 25"]);

    let aas1 = &es.options[0];
    assert_eq!(aas1.description.as_deref(), Some("Intro Asn Am Studies"));
    assert_eq!(aas1.units, Some(3.0));
    assert!(aas1.offering.as_ref().unwrap().fall);
}

/// `(***)` is PeopleSoft's "approved transfer credit" placeholder, not a course.
#[test]
fn placeholder_rows_are_dropped() {
    let r = report();
    assert!(
        !r.requirements
            .iter()
            .flat_map(|x| &x.options)
            .any(|c| c.code.starts_with('(')),
        "the (***) placeholder row was treated as a course"
    );
}

/// An empty cell renders as two adjacent labels. Misreading that consumes the
/// next label as a value and shifts every remaining field by one.
#[test]
fn empty_cells_do_not_shift_columns() {
    let r = report();
    let math31 = r
        .requirements
        .iter()
        .find(|x| x.title == "UBWL MATH 31")
        .unwrap();
    let opt = &math31.options[0];
    assert_eq!(opt.code, "MATH 31");
    assert_eq!(opt.units, Some(4.0));
    assert_eq!(opt.offering.as_ref().unwrap().raw, "Spring Summer & Fall");
    // Grade and Status cells are empty for a course not yet taken.
    assert_eq!(opt.grade, None);
    assert_eq!(opt.status, None);
}

#[test]
fn enrolled_course_carries_a_concrete_term() {
    let r = report();
    let bw146 = r
        .requirements
        .iter()
        .find(|x| x.title == "UBWL BW 146")
        .unwrap();
    let opt = &bw146.options[0];
    assert_eq!(opt.status, Some(CourseStatus::Enrolled));
    let o = opt.offering.as_ref().unwrap();
    assert_eq!(o.term.as_deref(), Some("Fall 2026"));
    assert!(!o.fall, "a concrete term is an enrolment, not a cadence");
}

// ─── truncation ──────────────────────────────────────────────────────────────

/// PeopleSoft caps option tables at ten rows. Missing this hides eligible
/// courses and the user is never told — the same failure as ignoring Canvas's
/// `Link` header.
#[test]
fn pagination_is_recorded_as_truncation() {
    let r = report();
    let es = r
        .requirements
        .iter()
        .find(|x| x.title == "GE: 6 Ethnic Studies")
        .unwrap();
    let t = es.truncated.expect("truncation not detected");
    assert_eq!((t.shown, t.total), (10, 13));
}

// ─── history and the grade floor ─────────────────────────────────────────────

#[test]
fn history_captures_grades_and_designations() {
    let r = report();
    let math31 = r.attempt("MATH 31").expect("MATH 31 missing from history");
    assert_eq!(math31.grade.as_deref(), Some("D"));
    assert_eq!(math31.status, Some(CourseStatus::Taken));
    assert_eq!(
        math31.designation.as_deref(),
        Some("GE: 2 Math/Quant Reason (B4)")
    );
}

/// The history section states its own `Units:` line. Attributing it to the
/// preceding requirement silently replaces that requirement's real counts.
#[test]
fn history_counts_do_not_overwrite_the_previous_requirement() {
    let r = report();
    let electives = r
        .requirements
        .iter()
        .find(|x| x.title == "UBWL Major Electives")
        .unwrap();
    let u = electives.units.unwrap();
    assert_eq!(
        (u.required, u.needed),
        (15.0, 12.0),
        "the history block's 0/63/0 counts leaked onto this requirement"
    );
}

/// The department states its C- rule once, on the major block. Every line item
/// beneath it inherits — and that inheritance is what makes the retake case
/// below detectable at all.
#[test]
fn grade_floor_is_inherited_from_the_enclosing_block() {
    let r = report();
    let math31 = r
        .requirements
        .iter()
        .find(|x| x.title == "UBWL MATH 31")
        .unwrap();
    assert_eq!(math31.min_grade.as_deref(), Some("C-"));
}

// ─── the audit ───────────────────────────────────────────────────────────────

/// **The case this whole module exists for.**
///
/// MATH 31 was taken and passed with a `D`. That satisfied a GE area with no
/// floor and failed the major's C- floor, so the requirement still reads
/// `Error`. An audit that reports it as "not yet taken" is wrong in a way that
/// looks right, and an audit that reports it as "taken" shows an on-time
/// graduation that will not happen.
#[test]
fn a_failed_floor_is_reported_as_a_retake() {
    let r = report();
    let items = degree::audit(&r);
    let math31 = items
        .iter()
        .find(|i| i.title == "UBWL MATH 31")
        .expect("MATH 31 should still be outstanding");

    let retake = math31
        .retake_of
        .as_ref()
        .expect("a D against a C- floor is a retake, not an untaken course");
    assert_eq!(retake.grade.as_deref(), Some("D"));
}

/// An expanded report prints a satisfied requirement's grade inside that
/// requirement's own table rather than in Additional Courses. MATH 30's `B`
/// exists nowhere else, so a history-only lookup reports it as unattempted.
#[test]
fn grades_inside_a_satisfied_requirement_are_found() {
    let r = report();
    let math30 = r
        .attempt("MATH 30")
        .expect("MATH 30's grade lives in its own requirement table");
    assert_eq!(math30.grade.as_deref(), Some("B"));
    assert_eq!(math30.units, Some(5.0));
}

/// A repeated course appears once per attempt, in no useful order. SJSU counts
/// the best grade; taking the first row reports a passed course as a retake.
#[test]
fn a_repeated_course_reports_its_best_grade() {
    let r = report();
    let engl2 = r.attempt("ENGL 2").unwrap();
    assert_eq!(
        engl2.grade.as_deref(),
        Some("C"),
        "an earlier D was preferred over the later C"
    );
}

/// A `Taken` requirement carrying its own course table must not spill those
/// rows into the requirement that follows it.
#[test]
fn a_satisfied_requirements_table_does_not_leak() {
    let r = report();
    let math31 = r
        .requirements
        .iter()
        .find(|x| x.title == "UBWL MATH 31")
        .unwrap();
    let codes: Vec<&str> = math31.options.iter().map(|c| c.code.as_str()).collect();
    assert_eq!(codes, vec!["MATH 31"], "MATH 30's row leaked forward");
}

/// The mirror image: a course passed above the floor must never be flagged.
#[test]
fn a_cleared_floor_is_not_a_retake() {
    let r = report();
    assert_eq!(degree::meets_floor("C", "C-"), Some(true));
    // ENGL 2 sits in the history with a C and must not appear as a retake.
    assert!(
        !degree::audit(&r)
            .iter()
            .any(|i| i.retake_of.as_ref().is_some_and(|c| c.code == "ENGL 2")),
        "a passing grade was reported as a retake"
    );
}

#[test]
fn scheduling_constraints_are_surfaced() {
    let r = report();
    let items = degree::audit(&r);

    let fall_only = items.iter().find(|i| i.title == "UBWL BW 171").unwrap();
    assert!(fall_only.single_term_only, "BW 171 runs in Fall only");

    let variable = items.iter().find(|i| i.title == "UBWL BW 156").unwrap();
    assert!(
        variable.needs_advisor,
        "`Variable Offering See Advisor` must be flagged — it is the one \
         constraint a plan cannot rely on"
    );
}

/// Unit totals are satisfied *by* the named courses, not alongside them.
/// Summing both roughly doubles the remaining workload.
#[test]
fn unit_buckets_are_separated_from_courses() {
    let r = report();

    let course_titles: Vec<&str> = r.outstanding().iter().map(|x| x.title.as_str()).collect();
    assert!(course_titles.contains(&"UBWL MATH 31"));
    assert!(
        !course_titles.contains(&"40 Total Upper Division Units"),
        "a unit total is not a course you can enrol in"
    );

    let bucket_titles: Vec<&str> = r.unit_buckets().iter().map(|x| x.title.as_str()).collect();
    assert!(bucket_titles.contains(&"40 Total Upper Division Units"));
    assert!(bucket_titles.contains(&"UBWL Major Electives"));
}

/// A satisfied requirement must never appear as outstanding, even though its
/// parent group is flagged `Error`.
#[test]
fn satisfied_requirements_are_excluded() {
    let r = report();
    let titles: Vec<&str> = r.outstanding().iter().map(|x| x.title.as_str()).collect();
    assert!(!titles.contains(&"Minimum 120 Units"), "status Taken");
    assert!(!titles.contains(&"UBWL BW 146"), "status Enrolled");
    assert!(
        !titles.contains(&"GE Core Requirements"),
        "0.00 needed is not outstanding"
    );
}

#[test]
fn units_remaining_sums_named_courses_only() {
    let r = report();
    // Ethnic Studies 2.60 + MATH 31 4.00 + BW 171 3.00 + BW 156 3.00
    assert!(
        (degree::units_remaining(&r) - 12.6).abs() < 0.001,
        "got {}",
        degree::units_remaining(&r)
    );
}

/// A requirement stating only a course count gets its units from the smallest
/// eligible option — deliberately the smallest, so the estimate understates
/// rather than flatters.
#[test]
fn units_fall_back_to_the_smallest_eligible_option() {
    let r = report();
    let math31 = r
        .requirements
        .iter()
        .find(|x| x.title == "UBWL MATH 31")
        .unwrap();
    assert_eq!(math31.units, None, "no explicit Units: line here");
    assert_eq!(math31.units_needed(), Some(4.0));
}

/// A parse must never panic, whatever it is handed. SJSU restyles the portal
/// and a hard failure would leave the user with nothing at all.
#[test]
fn malformed_input_does_not_panic() {
    for input in ["", "Expand All", "Course", "Course\nCourse", "Units: bad"] {
        let _ = degree::parse(input);
    }
}

/// Verify against a **real** export when one is present.
///
/// A synthetic fixture only proves the parser handles the shapes it was
/// written against, which is circular. Drop a real MyProgress paste at
/// `tests/fixtures/myprogress_real.txt` — gitignored, never committed — and
/// this asserts the invariants that must hold for any genuine report. It
/// no-ops when the file is absent so CI and a fresh clone stay green.
#[test]
fn real_export_parses_sanely() {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/myprogress_real.txt"
    );
    let Ok(text) = std::fs::read_to_string(path) else {
        eprintln!("skipping: no real export at {path}");
        return;
    };

    let r = degree::parse(&text);

    assert!(
        r.header.graduation_status.is_some(),
        "a real report always states a graduation status"
    );
    assert!(
        r.requirements.len() > 20,
        "only {} requirements parsed — the report structure changed",
        r.requirements.len()
    );
    assert!(
        !r.history.is_empty(),
        "Additional Courses should yield graded history"
    );
    assert!(
        r.requirements.iter().any(|x| x.status == ReqStatus::Taken),
        "nothing parsed as complete"
    );
    assert!(
        r.requirements.iter().any(|x| x.min_grade.is_some()),
        "no grade floor found — the retake rule would be silently dead"
    );
    // Every outstanding item must be actionable: it names courses to take.
    for item in r.outstanding() {
        assert!(
            !item.options.is_empty(),
            "outstanding requirement {} names no eligible courses",
            item.title
        );
    }
    eprintln!(
        "\nreal export — {} requirements, {} history rows, graduation: {}",
        r.requirements.len(),
        r.history.len(),
        r.header.graduation_status.as_deref().unwrap_or("?")
    );
    for item in degree::audit(&r) {
        let mut flags = Vec::new();
        if item.retake_of.is_some() {
            flags.push("RETAKE");
        }
        if item.single_term_only {
            flags.push("single-term");
        }
        if item.needs_advisor {
            flags.push("variable-offering");
        }
        if item.truncated.is_some() {
            flags.push("truncated");
        }
        eprintln!(
            "  {:<46} {:>5} units  {}",
            item.title,
            item.units_needed
                .map(|u| format!("{u:.1}"))
                .unwrap_or_else(|| "?".into()),
            flags.join(" ")
        );
    }
    for b in r.unit_buckets() {
        eprintln!(
            "  [bucket] {:<37} {:>5} units",
            b.title,
            b.units_needed()
                .map(|u| format!("{u:.1}"))
                .unwrap_or_else(|| "?".into())
        );
    }
    eprintln!(
        "  = {:.1} units from named courses\n",
        degree::units_remaining(&r)
    );
}

