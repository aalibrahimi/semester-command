//! Syllabus documents: fetch from Canvas files, import by hand, extract text.
//!
//! Called by: `commands::data` (fetch/import/list) and the sync engine
//! (opportunistic fetch per course).
//! Calls: [`crate::canvas`] for downloads, [`crate::db`], `pdf-extract`.
//!
//! # Why files, not the syllabus page
//!
//! Verified live 2026-08-21: every synced `syllabus_body` on the account was
//! empty — SJSU professors upload the syllabus as a PDF in course files.
//! So the primary source is `GET /courses/:id/files?search_term=syllabus`,
//! with two fallbacks: the syllabus page HTML when it exists, and manual
//! import for the courses where the files API is closed to students
//! (gotcha 12) — the user has every syllabus as a download anyway.
//!
//! Extracted text is stored in the DB so the Syllabi screen can search for
//! "late", "make-up", "office hours" across every course at once. Extraction
//! failure is never fatal: the file is still stored and openable, it just
//! isn't searchable, and the UI says so.

use crate::canvas::client::{CanvasClient, CanvasError};
use crate::canvas::endpoints;
use crate::db::{self, schema::SyllabusFileRow, upsert, Db};

/// Where syllabus documents live on disk.
fn store_dir(data_dir: &std::path::Path) -> std::path::PathBuf {
    data_dir.join("syllabi")
}

/// Fetch syllabus-looking files for one course from Canvas.
///
/// Returns how many files were stored. A 403 (files closed to students) and
/// an empty result are both just `Ok(0)` — expected states, not errors.
pub async fn fetch_for_course(
    db: &Db,
    client: &CanvasClient,
    data_dir: &std::path::Path,
    course_id: &str,
) -> Result<usize, CanvasError> {
    let (files, _skipped) = match endpoints::files_search(client, course_id, "syllabus").await {
        Ok(r) => r,
        Err(CanvasError::Http { status: 403 | 404, .. }) => {
            tracing::debug!(course_id, "course files not visible; syllabus needs manual import");
            return Ok(0);
        }
        Err(e) => return Err(e),
    };

    let mut stored = 0usize;
    for f in files {
        let file = &f.parsed;
        let Some(url) = &file.url else { continue };
        let name = file
            .display_name
            .clone()
            .or(file.filename.clone())
            .unwrap_or_else(|| format!("syllabus-{}", file.id));

        // Skip anything we already have at this Canvas file id — re-fetch is
        // cheap but re-download is not, and syllabi rarely change mid-term.
        let existing: Option<i64> = sqlx::query_scalar(
            "SELECT id FROM syllabus_files WHERE course_id = ?1 AND canvas_file_id = ?2",
        )
        .bind(course_id)
        .bind(&file.id)
        .fetch_optional(db)
        .await
        .ok()
        .flatten();
        if existing.is_some() {
            continue;
        }

        let bytes = client.get_bytes(url).await?;
        let row = store_document(
            db,
            data_dir,
            course_id,
            Some(file.id.clone()),
            &name,
            file.content_type.as_deref(),
            &bytes,
            "api",
        )
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "storing syllabus failed");
            CanvasError::Http { status: 0, path: "local storage".into() }
        })?;
        tracing::info!(course_id, file = %row.filename, "syllabus stored");
        stored += 1;
    }
    Ok(stored)
}

/// Import a document the user picked from disk.
pub async fn import_local(
    db: &Db,
    data_dir: &std::path::Path,
    course_id: &str,
    path: &std::path::Path,
) -> Result<SyllabusFileRow, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("Could not read that file: {e}"))?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("syllabus")
        .to_string();
    let content_type = match path.extension().and_then(|e| e.to_str()) {
        Some("pdf") => Some("application/pdf"),
        Some("html") | Some("htm") => Some("text/html"),
        Some("txt") | Some("md") => Some("text/plain"),
        Some("docx") => Some("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        _ => None,
    };
    store_document(db, data_dir, course_id, None, &name, content_type, &bytes, "manual")
        .await
        .map_err(|e| format!("Could not store the file: {e}"))
}

/// Write bytes to the store, extract text, record the row.
#[allow(clippy::too_many_arguments)] // a plain pipeline, called from two places
async fn store_document(
    db: &Db,
    data_dir: &std::path::Path,
    course_id: &str,
    canvas_file_id: Option<String>,
    filename: &str,
    content_type: Option<&str>,
    bytes: &[u8],
    source: &str,
) -> Result<SyllabusFileRow, Box<dyn std::error::Error + Send + Sync>> {
    let dir = store_dir(data_dir).join(course_id);
    std::fs::create_dir_all(&dir)?;
    // Sanitised filename: keep it recognisable, keep the extension, drop
    // anything the filesystem might object to.
    let safe: String = filename
        .chars()
        .map(|c| if c.is_alphanumeric() || ".-_ ".contains(c) { c } else { '_' })
        .collect();
    let path = dir.join(&safe);
    std::fs::write(&path, bytes)?;

    let extracted = extract_text(bytes, content_type, filename);

    let row = SyllabusFileRow {
        id: 0, // assigned by SQLite
        course_id: course_id.to_string(),
        canvas_file_id,
        filename: safe,
        content_type: content_type.map(String::from),
        local_path: path.to_string_lossy().into_owned(),
        extracted_text: extracted,
        source: source.to_string(),
        fetched_at: Some(db::now_rfc3339()),
    };
    upsert::syllabus_file(db, &row).await?;
    Ok(row)
}

/// Best-effort text extraction. `None` = format not supported (yet) or the
/// extractor choked — the file is still stored and openable either way.
fn extract_text(bytes: &[u8], content_type: Option<&str>, filename: &str) -> Option<String> {
    let is_pdf = content_type == Some("application/pdf")
        || filename.to_lowercase().ends_with(".pdf")
        || bytes.starts_with(b"%PDF");
    if is_pdf {
        // pdf-extract panics on some malformed PDFs rather than erroring, so
        // it runs inside catch_unwind — a bad syllabus must not take down a
        // sync (§6).
        let result = std::panic::catch_unwind(|| pdf_extract::extract_text_from_mem(bytes));
        return match result {
            Ok(Ok(text)) => {
                let cleaned = normalize_ws(&text);
                (!cleaned.is_empty()).then_some(cleaned)
            }
            Ok(Err(e)) => {
                tracing::warn!(filename, error = %e, "pdf text extraction failed");
                None
            }
            Err(_) => {
                tracing::warn!(filename, "pdf extractor panicked; file stored without text");
                None
            }
        };
    }

    let looks_text = content_type
        .map(|t| t.starts_with("text/"))
        .unwrap_or(false)
        || filename.to_lowercase().ends_with(".txt")
        || filename.to_lowercase().ends_with(".md")
        || filename.to_lowercase().ends_with(".html");
    if looks_text {
        let raw = String::from_utf8_lossy(bytes);
        let stripped = strip_html(&raw);
        let cleaned = normalize_ws(&stripped);
        return (!cleaned.is_empty()).then_some(cleaned);
    }

    // TODO(M4): docx via a zip + XML pass if any professor actually uses one.
    None
}

/// Collapse runs of whitespace but keep paragraph breaks readable.
fn normalize_ws(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut blank_run = 0;
    for line in s.lines() {
        let line = line.trim();
        if line.is_empty() {
            blank_run += 1;
            if blank_run == 1 {
                out.push('\n');
            }
        } else {
            blank_run = 0;
            out.push_str(line);
            out.push('\n');
        }
    }
    out.trim().to_string()
}

/// Crude tag stripper for HTML syllabi. Presentation fidelity does not
/// matter here — the text only feeds search and policy extraction.
fn strip_html(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for c in s.chars() {
        match c {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                out.push(' ');
            }
            c if !in_tag => out.push(c),
            _ => {}
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_html_leaves_text() {
        let html = "<p>Late work: <b>10%</b> per day.</p><br><div>Office hours 2-3pm</div>";
        let text = normalize_ws(&strip_html(html));
        assert!(text.contains("Late work:  10%  per day."));
        assert!(text.contains("Office hours 2-3pm"));
    }

    #[test]
    fn normalize_collapses_blank_runs() {
        let s = "a\n\n\n\nb\n   \nc";
        assert_eq!(normalize_ws(s), "a\n\nb\n\nc");
    }

    #[test]
    fn extract_unknown_format_is_none_not_error() {
        assert_eq!(extract_text(&[0x50, 0x4b, 0x03, 0x04], None, "syllabus.docx"), None);
    }
}
