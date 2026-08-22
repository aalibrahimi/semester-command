//! MCP server mode — `semester-command --mcp` (SPEC.md §7, M5).
//!
//! Called by: `main.rs`, when the flag is present — before Tauri ever
//! initialises, because an MCP host is headless and must not touch the
//! windowing system.
//! Calls: [`crate::commands::grades`] (the Bundle loader — pure sqlx, no
//! Tauri), [`crate::grades`], [`crate::triage`].
//!
//! # Protocol
//!
//! A minimal, dependency-free MCP implementation: JSON-RPC 2.0 over stdio,
//! one message per line. Handles `initialize`, `tools/list`, `tools/call`,
//! and `ping`; notifications are consumed silently. That is the entire
//! surface an MCP host needs for a tools-only server, and hand-rolling it
//! keeps the binary's dependency graph identical to the desktop app's.
//!
//! # Read-only, twice over
//!
//! Nothing here writes to Canvas (there is no client at all — this reads the
//! local database the desktop app syncs), and nothing writes to the database
//! either: the pool is opened with `read_only(true)`, so this can run safely
//! while the desktop app is open, courtesy of WAL mode.
//!
//! # Tools
//!
//! - `list_courses`                       — codes, grades, standings
//! - `get_course_grades(course)`          — full breakdown for one course
//! - `what_do_i_need(course, target_pct, assignment?)` — the solver
//! - `upcoming(days)`                     — dated deadlines ahead
//! - `triage(n)`                          — the ranked to-do list
//! - `syllabus_search(query)`             — search extracted syllabus text

use serde_json::{json, Value};

use crate::commands::grades::{load_bundle, Bundle};
use crate::db::Db;
use crate::grades;

/// Blocking entry point. Owns its own tokio runtime — main.rs calls this
/// instead of starting Tauri.
pub fn serve() -> Result<(), Box<dyn std::error::Error>> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(serve_inner())
}

async fn serve_inner() -> Result<(), Box<dyn std::error::Error>> {
    let db = open_db_read_only().await?;

    let stdin = std::io::stdin();
    let mut line = String::new();
    loop {
        line.clear();
        if stdin.read_line(&mut line)? == 0 {
            return Ok(()); // EOF — host closed the pipe, we're done.
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let msg: Value = match serde_json::from_str(trimmed) {
            Ok(v) => v,
            Err(_) => continue, // not JSON — ignore rather than die
        };

        let id = msg.get("id").cloned();
        let method = msg.get("method").and_then(|m| m.as_str()).unwrap_or("");

        // Notifications (no id) get no response, per JSON-RPC.
        let Some(id) = id else { continue };

        let result = match method {
            "initialize" => Ok(json!({
                "protocolVersion": "2024-11-05",
                "capabilities": { "tools": {} },
                "serverInfo": { "name": "semester-command", "version": env!("CARGO_PKG_VERSION") },
            })),
            "ping" => Ok(json!({})),
            "tools/list" => Ok(json!({ "tools": tool_definitions() })),
            "tools/call" => call_tool(&db, msg.get("params").unwrap_or(&Value::Null)).await,
            _ => Err(format!("method not supported: {method}")),
        };

        let response = match result {
            Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
            Err(message) => json!({
                "jsonrpc": "2.0", "id": id,
                "error": { "code": -32601, "message": message },
            }),
        };
        // One line per message; stdout is the transport, so nothing else in
        // this mode may ever print to it (tracing goes to stderr).
        println!("{response}");
    }
}

/// The desktop app's data directory, resolved without Tauri. Must mirror
/// `tauri.conf.json`'s identifier — the two resolve the same folder.
fn app_data_dir() -> std::path::PathBuf {
    const IDENTIFIER: &str = "dev.codewithali.semester-command";
    #[cfg(target_os = "windows")]
    {
        std::path::PathBuf::from(std::env::var("APPDATA").expect("APPDATA is always set"))
            .join(IDENTIFIER)
    }
    #[cfg(target_os = "macos")]
    {
        std::path::PathBuf::from(std::env::var("HOME").expect("HOME is always set"))
            .join("Library/Application Support")
            .join(IDENTIFIER)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        std::path::PathBuf::from(std::env::var("HOME").expect("HOME is always set"))
            .join(".local/share")
            .join(IDENTIFIER)
    }
}

async fn open_db_read_only() -> Result<Db, Box<dyn std::error::Error>> {
    let path = app_data_dir().join("semester-command.db");
    if !path.exists() {
        return Err(format!(
            "no database at {} — run the Semester Command app and sync once first",
            path.display()
        )
        .into());
    }
    let opts = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(&path)
        .read_only(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);
    Ok(sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(2)
        .connect_with(opts)
        .await?)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool registry
// ─────────────────────────────────────────────────────────────────────────────

fn tool_definitions() -> Value {
    json!([
        {
            "name": "list_courses",
            "description": "Every active course with its current grade, projected grade (ungraded counted as zero), target, and standing.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_course_grades",
            "description": "Full grade breakdown for one course: current/projected/max-possible, assignment groups with weights, and every assignment with its score.",
            "inputSchema": {
                "type": "object",
                "properties": { "course": { "type": "string", "description": "Course code or name fragment, e.g. 'CS 146' or 'CS-146'" } },
                "required": ["course"]
            }
        },
        {
            "name": "what_do_i_need",
            "description": "Solve for the score needed to hit a target percentage in a course — averaged over everything remaining, or on one named assignment with everything else held at zero.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course": { "type": "string" },
                    "target_pct": { "type": "number", "description": "Target course percentage, e.g. 90" },
                    "assignment": { "type": "string", "description": "Optional assignment name fragment to solve for specifically" }
                },
                "required": ["course", "target_pct"]
            }
        },
        {
            "name": "upcoming",
            "description": "Dated assignments due in the next N days (default 7), with submission state.",
            "inputSchema": {
                "type": "object",
                "properties": { "days": { "type": "number" } }
            }
        },
        {
            "name": "triage",
            "description": "The ranked to-do list: unsubmitted work ordered by (grade impact × urgency) ÷ estimated hours, missing/overdue pinned first.",
            "inputSchema": {
                "type": "object",
                "properties": { "n": { "type": "number", "description": "Max rows (default 10)" } }
            }
        },
        {
            "name": "syllabus_search",
            "description": "Search the extracted text of every stored syllabus (late policies, office hours, make-up rules). Returns matching passages with their course.",
            "inputSchema": {
                "type": "object",
                "properties": { "query": { "type": "string" } },
                "required": ["query"]
            }
        }
    ])
}

async fn call_tool(db: &Db, params: &Value) -> Result<Value, String> {
    let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
    let args = params.get("arguments").cloned().unwrap_or(json!({}));

    let bundle = load_bundle(db).await.map_err(|e| format!("database read failed: {e}"))?;

    let text = match name {
        "list_courses" => list_courses(&bundle),
        "get_course_grades" => {
            let course = str_arg(&args, "course")?;
            course_grades(&bundle, &course)?
        }
        "what_do_i_need" => {
            let course = str_arg(&args, "course")?;
            let target = args
                .get("target_pct")
                .and_then(|v| v.as_f64())
                .ok_or("target_pct is required")?;
            let assignment = args.get("assignment").and_then(|v| v.as_str());
            what_do_i_need(&bundle, &course, target, assignment)?
        }
        "upcoming" => {
            let days = args.get("days").and_then(|v| v.as_f64()).unwrap_or(7.0);
            upcoming(&bundle, days)
        }
        "triage" => {
            let n = args.get("n").and_then(|v| v.as_u64()).unwrap_or(10) as usize;
            triage(&bundle, n)
        }
        "syllabus_search" => {
            let query = str_arg(&args, "query")?;
            syllabus_search(db, &query).await?
        }
        other => return Err(format!("unknown tool: {other}")),
    };

    Ok(json!({ "content": [{ "type": "text", "text": text }] }))
}

fn str_arg(args: &Value, key: &str) -> Result<String, String> {
    args.get(key)
        .and_then(|v| v.as_str())
        .map(String::from)
        .ok_or_else(|| format!("{key} is required"))
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool implementations — thin joins over the same engine the app uses.
// ─────────────────────────────────────────────────────────────────────────────

/// Match "CS 146" / "cs-146" / a name fragment against a course row.
fn find_course<'a>(bundle: &'a Bundle, needle: &str) -> Result<&'a crate::db::schema::CourseRow, String> {
    let n = needle.to_lowercase().replace('-', " ");
    bundle
        .courses
        .iter()
        .find(|c| {
            c.course_code
                .as_deref()
                .map(|code| code.to_lowercase().replace('-', " ").contains(&n))
                .unwrap_or(false)
                || c.name
                    .as_deref()
                    .map(|name| name.to_lowercase().contains(&n))
                    .unwrap_or(false)
        })
        .ok_or_else(|| format!("no course matches \"{needle}\""))
}

fn fmt_pct(p: Option<f64>) -> String {
    p.map(|v| format!("{v:.1}%")).unwrap_or_else(|| "—".into())
}

fn list_courses(bundle: &Bundle) -> String {
    let mut out = String::new();
    for c in &bundle.courses {
        let input = bundle.course_input(&c.id);
        let s = grades::standing(&input);
        let (target, letter) = bundle.target_of(&c.id);
        out.push_str(&format!(
            "{} — {}\n  current {} · projected {:.1}% · best possible {:.1}% · target {} ({}%) · {} open\n",
            c.course_code.as_deref().unwrap_or("?"),
            c.name.as_deref().unwrap_or(""),
            fmt_pct(s.current_pct),
            s.projected_pct,
            s.max_possible_pct,
            letter,
            target,
            bundle.open_count(&c.id),
        ));
    }
    if out.is_empty() {
        out.push_str("No courses synced yet.");
    }
    out
}

fn course_grades(bundle: &Bundle, needle: &str) -> Result<String, String> {
    let c = find_course(bundle, needle)?;
    let input = bundle.course_input(&c.id);
    let s = grades::standing(&input);
    let mut out = format!(
        "{} — {}\ncurrent {} (Canvas says {}) · projected {:.1}% · best possible {:.1}%\n\n",
        c.course_code.as_deref().unwrap_or("?"),
        c.name.as_deref().unwrap_or(""),
        fmt_pct(s.current_pct),
        fmt_pct(c.current_score),
        s.projected_pct,
        s.max_possible_pct,
    );
    for g in bundle.groups.iter().filter(|g| g.course_id == c.id) {
        out.push_str(&format!(
            "[{}] weight {}\n",
            g.name.as_deref().unwrap_or("group"),
            g.group_weight.map(|w| format!("{w:.0}%")).unwrap_or_else(|| "—".into()),
        ));
        for a in bundle.assignments.iter().filter(|a| a.group_id.as_deref() == Some(g.id.as_str())) {
            let sub = bundle.submissions.get(&a.id);
            out.push_str(&format!(
                "  {} — {} / {}\n",
                a.name.as_deref().unwrap_or("?"),
                sub.and_then(|s| s.score).map(|v| format!("{v}")).unwrap_or_else(|| "ungraded".into()),
                a.points_possible.map(|v| format!("{v}")).unwrap_or_else(|| "—".into()),
            ));
        }
    }
    Ok(out)
}

fn what_do_i_need(
    bundle: &Bundle,
    needle: &str,
    target_pct: f64,
    assignment: Option<&str>,
) -> Result<String, String> {
    let c = find_course(bundle, needle)?;
    let input = bundle.course_input(&c.id);

    let scope = match assignment {
        Some(frag) => {
            let f = frag.to_lowercase();
            let a = bundle
                .assignments
                .iter()
                .filter(|a| a.course_id == c.id)
                .find(|a| a.name.as_deref().map(|n| n.to_lowercase().contains(&f)).unwrap_or(false))
                .ok_or_else(|| format!("no assignment in that course matches \"{frag}\""))?;
            grades::SolveScope::SingleAssignment(&a.id)
        }
        None => grades::SolveScope::EverythingRemaining,
    };

    // The borrow of `a.id` above ties scope to bundle — solve immediately.
    let answer = grades::solve(&input, target_pct, scope, grades::DEFAULT_SCALE);
    Ok(match answer {
        grades::SolverAnswer::Required { pct, points_needed, points_possible } => {
            let pts = match (points_needed, points_possible) {
                (Some(n), Some(p)) => format!(" ({n:.1} of {p:.0} points)"),
                _ => String::new(),
            };
            format!("You need {pct:.1}%{pts} to finish at {target_pct}%.")
        }
        grades::SolverAnswer::Unreachable { best_possible_pct, best_possible_letter } => format!(
            "Not reachable. Best possible from here: {best_possible_pct:.1}% ({best_possible_letter})."
        ),
        grades::SolverAnswer::AlreadyLocked { floor_pct, floor_letter } => format!(
            "Already locked in — even scoring zero on everything left you finish at {floor_pct:.1}% ({floor_letter})."
        ),
    })
}

fn upcoming(bundle: &Bundle, days: f64) -> String {
    let now = chrono::Utc::now();
    let horizon = now + chrono::Duration::minutes((days * 24.0 * 60.0) as i64);
    let mut rows: Vec<(String, String)> = Vec::new();

    for a in &bundle.assignments {
        let Some(due) = a.due_at.as_deref().and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
        else {
            continue;
        };
        let due = due.with_timezone(&chrono::Utc);
        if due < now || due > horizon {
            continue;
        }
        let code = bundle
            .courses
            .iter()
            .find(|c| c.id == a.course_id)
            .and_then(|c| c.course_code.clone())
            .unwrap_or_default();
        let sub = bundle.submissions.get(&a.id);
        let state = if sub.map(|s| s.submitted_at.is_some()).unwrap_or(false) {
            "submitted"
        } else {
            "open"
        };
        rows.push((
            a.due_at.clone().unwrap_or_default(),
            format!(
                "{} · {} — due {} ({state})",
                code,
                a.name.as_deref().unwrap_or("?"),
                due.format("%a %b %-d %H:%M UTC"),
            ),
        ));
    }
    rows.sort();
    if rows.is_empty() {
        format!("Nothing due in the next {days:.0} days.")
    } else {
        rows.into_iter().map(|(_, line)| line).collect::<Vec<_>>().join("\n")
    }
}

fn triage(bundle: &Bundle, n: usize) -> String {
    let rows = crate::triage::rank(bundle, chrono::Utc::now());
    if rows.is_empty() {
        return "Nothing to triage — everything gradeable is submitted.".into();
    }
    rows.iter()
        .take(n)
        .enumerate()
        .map(|(i, r)| {
            format!(
                "{}. {} · {} — worth {:.1}% of final grade, due {}{}",
                i + 1,
                r.course_code.as_deref().unwrap_or("?"),
                r.name.as_deref().unwrap_or("?"),
                r.impact_pct,
                r.due_at.as_deref().unwrap_or("(no date)"),
                match r.state {
                    crate::triage::TriageState::Missing => " [MISSING]",
                    crate::triage::TriageState::Overdue => " [OVERDUE]",
                    crate::triage::TriageState::Open => "",
                },
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

async fn syllabus_search(db: &Db, query: &str) -> Result<String, String> {
    let rows: Vec<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT s.filename, s.course_id, s.extracted_text FROM syllabus_files s
         WHERE s.extracted_text IS NOT NULL",
    )
    .fetch_all(db)
    .await
    .map_err(|e| format!("database read failed: {e}"))?;

    let codes: std::collections::HashMap<String, String> = sqlx::query_as::<_, (String, Option<String>)>(
        "SELECT id, course_code FROM courses",
    )
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?
    .into_iter()
    .filter_map(|(id, code)| code.map(|c| (id, c)))
    .collect();

    let q = query.to_lowercase();
    let mut out = String::new();
    for (filename, course_id, text) in rows {
        let Some(text) = text else { continue };
        let lower = text.to_lowercase();
        let mut found = 0;
        let mut from = 0;
        while let Some(pos) = lower[from..].find(&q) {
            let at = from + pos;
            // A passage of context around the hit, on char boundaries.
            let start = text[..at].char_indices().rev().nth(120).map(|(i, _)| i).unwrap_or(0);
            let end = text[at..]
                .char_indices()
                .nth(200)
                .map(|(i, _)| at + i)
                .unwrap_or(text.len());
            out.push_str(&format!(
                "— {} ({}):\n…{}…\n\n",
                codes.get(&course_id).map(String::as_str).unwrap_or(&course_id),
                filename,
                text[start..end].trim().replace('\n', " "),
            ));
            found += 1;
            from = at + q.len();
            if found >= 3 {
                break; // three passages per document is plenty
            }
        }
    }
    Ok(if out.is_empty() {
        format!("No syllabus mentions \"{query}\". (Only imported syllabi with extracted text are searchable.)")
    } else {
        out
    })
}
