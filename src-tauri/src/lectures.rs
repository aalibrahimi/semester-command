//! Notice new lecture files on Canvas.
//!
//! Called by: [`crate::sync`] once per course per run, and the
//! `lecture_files_list` / `lecture_file_dismiss` commands.
//! Calls: [`crate::canvas::endpoints`] (course files, modules), the
//! `lecture_files` table (migration 0018).
//!
//! Professors post slides in two ways: the Files area (CS 146) or as file
//! items inside Modules (LING 112, where the Files API is closed to
//! students and returns 403). Both are read; either being closed is normal
//! and never fails the course.
//!
//! "Is this a lecture?" is a name test: lecture / week N / slides / handout
//! / notes, in a slide-like format. The first time a course is scanned,
//! everything found is recorded as a silent baseline, so installing the app
//! doesn't announce every slide deck of the semester.

use crate::canvas::client::{CanvasClient, CanvasError};
use crate::canvas::endpoints;
use crate::db::{self, Db};

/// A lecture file first seen in this sync run (after the baseline).
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewLecture {
    pub course_id: String,
    pub course_code: Option<String>,
    pub file_id: String,
    pub name: String,
}

/// One stored row, for the "lectures without a chapter" list.
#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct LectureFileRow {
    pub course_id: String,
    pub file_id: String,
    pub name: String,
    pub created_at: Option<String>,
    pub first_seen_at: String,
    pub is_new: bool,
    pub dismissed: bool,
}

/// Does this file name look like lecture material?
pub fn looks_like_lecture(name: &str) -> bool {
    let n = name.to_lowercase();
    let ext_ok = [".pdf", ".pptx", ".ppt", ".key", ".docx"]
        .iter()
        .any(|e| n.ends_with(e))
        || !n.contains('.');
    if !ext_ok {
        return false;
    }
    if n.contains("syllabus")
        || n.contains("quiz")
        || n.contains("exam key")
        || n.contains("solution")
    {
        return false;
    }
    let week = n
        .split(|c: char| !c.is_alphanumeric())
        .collect::<Vec<_>>()
        .windows(2)
        .any(|w| {
            (w[0] == "week" || w[0] == "lecture" || w[0] == "lec")
                && w[1].chars().all(|c| c.is_ascii_digit())
                && !w[1].is_empty()
        });
    week || ["lecture", "slides", "handout", "notes"]
        .iter()
        .any(|k| n.contains(k))
}

/// Candidate files for one course: (file id, name, created_at).
async fn candidates(
    client: &CanvasClient,
    course_id: &str,
) -> Result<Vec<(String, String, Option<String>)>, CanvasError> {
    let mut out: Vec<(String, String, Option<String>)> = Vec::new();
    let closed = |e: &CanvasError| {
        matches!(
            e,
            CanvasError::Http {
                status: 401 | 403 | 404,
                ..
            }
        )
    };

    match endpoints::course_files_recent(client, course_id).await {
        Ok(files) => {
            for f in files {
                let name = f
                    .get("display_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();
                let id = id_of(f.get("id"));
                if !id.is_empty() && !name.is_empty() {
                    out.push((
                        id,
                        name,
                        f.get("created_at")
                            .and_then(|v| v.as_str())
                            .map(str::to_string),
                    ));
                }
            }
        }
        Err(CanvasError::SessionExpired) => return Err(CanvasError::SessionExpired),
        Err(e) if closed(&e) => {}
        Err(e) => tracing::info!(course_id, error = %e, "files listing failed; trying modules"),
    }

    match endpoints::course_modules(client, course_id).await {
        Ok(modules) => {
            for m in modules {
                for it in m
                    .get("items")
                    .and_then(|v| v.as_array())
                    .into_iter()
                    .flatten()
                {
                    if it.get("type").and_then(|v| v.as_str()) != Some("File") {
                        continue;
                    }
                    let id = id_of(it.get("content_id"));
                    let name = it
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();
                    if !id.is_empty() && !name.is_empty() && !out.iter().any(|(x, _, _)| *x == id) {
                        out.push((id, name, None));
                    }
                }
            }
        }
        Err(CanvasError::SessionExpired) => return Err(CanvasError::SessionExpired),
        Err(e) if closed(&e) => {}
        Err(e) => tracing::info!(course_id, error = %e, "modules listing failed"),
    }
    Ok(out)
}

fn id_of(v: Option<&serde_json::Value>) -> String {
    match v {
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(serde_json::Value::Number(n)) => n.to_string(),
        _ => String::new(),
    }
}

/// Scan one course. Returns the lecture files first seen now (empty on the
/// course's first scan, which only records the baseline).
pub async fn scan_course(
    db: &Db,
    client: &CanvasClient,
    course_id: &str,
    course_code: Option<&str>,
) -> Result<Vec<NewLecture>, CanvasError> {
    let found = candidates(client, course_id).await?;
    match record(db, course_id, course_code, found).await {
        Ok(fresh) => Ok(fresh),
        Err(e) => {
            // A storage hiccup costs one notification at worst; it must not
            // fail the course's sync.
            tracing::warn!(course_id, error = %e, "could not store lecture files");
            Ok(Vec::new())
        }
    }
}

/// The database half of [`scan_course`], separate so it can be tested
/// without Canvas.
pub async fn record(
    db: &Db,
    course_id: &str,
    course_code: Option<&str>,
    found: Vec<(String, String, Option<String>)>,
) -> Result<Vec<NewLecture>, sqlx::Error> {
    let known: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM lecture_files WHERE course_id = ?1")
        .bind(course_id)
        .fetch_one(db)
        .await?;
    let baseline = known == 0;
    let now = db::now_rfc3339();
    let mut fresh = Vec::new();
    for (file_id, name, created_at) in found {
        if !looks_like_lecture(&name) {
            continue;
        }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO lecture_files (course_id, file_id, name, created_at, first_seen_at, is_new)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .bind(course_id)
        .bind(&file_id)
        .bind(&name)
        .bind(&created_at)
        .bind(&now)
        .bind(!baseline)
        .execute(db)
        .await?;
        if res.rows_affected() == 1 && !baseline {
            fresh.push(NewLecture {
                course_id: course_id.to_string(),
                course_code: course_code.map(str::to_string),
                file_id,
                name,
            });
        }
    }
    Ok(fresh)
}

pub async fn list(db: &Db) -> Result<Vec<LectureFileRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM lecture_files ORDER BY COALESCE(created_at, first_seen_at) DESC")
        .fetch_all(db)
        .await
}

pub async fn set_dismissed(
    db: &Db,
    course_id: &str,
    file_id: &str,
    dismissed: bool,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE lecture_files SET dismissed = ?3 WHERE course_id = ?1 AND file_id = ?2")
        .bind(course_id)
        .bind(file_id)
        .bind(dismissed)
        .execute(db)
        .await
        .map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lecture_names() {
        for yes in [
            "Lecture 10_ Linear Time Sorts.pdf",
            "LING 112 - Week 7 - X-bar theory.pdf",
            "Week 3 slides.pptx",
            "Handout (Tallerman ch 4).pdf",
            "lec 5.pdf",
        ] {
            assert!(looks_like_lecture(yes), "{yes}");
        }
        for no in [
            "Syllabus Fall 2026.pdf",
            "PartitionArray.mp4",
            "Quiz 2 key.pdf",
            "HW3 solution.pdf",
            "photo.png",
            "Carnie 2013 Syntax.pdf",
        ] {
            assert!(!looks_like_lecture(no), "{no}");
        }
    }

    #[tokio::test]
    async fn first_scan_is_a_silent_baseline_then_new_files_announce() {
        let dir = std::env::temp_dir().join(format!("lectures-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let db = crate::db::open(&dir).await.unwrap();
        let l10 = (
            "1".to_string(),
            "Lecture 10_ Linear Time Sorts.pdf".to_string(),
            Some("2026-09-23T10:00:00Z".to_string()),
        );
        let video = ("2".to_string(), "PartitionArray.mp4".to_string(), None);
        let first = record(&db, "c1", Some("CS 146"), vec![l10.clone(), video])
            .await
            .unwrap();
        assert!(first.is_empty(), "baseline must not announce");

        let l11 = (
            "3".to_string(),
            "Lecture 11_ Hash Tables.pdf".to_string(),
            None,
        );
        let second = record(&db, "c1", Some("CS 146"), vec![l10.clone(), l11])
            .await
            .unwrap();
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].name, "Lecture 11_ Hash Tables.pdf");

        let again = record(&db, "c1", Some("CS 146"), vec![l10]).await.unwrap();
        assert!(again.is_empty(), "a file announces once");

        let rows = list(&db).await.unwrap();
        assert_eq!(rows.len(), 2, "the video was never stored");
        set_dismissed(&db, "c1", "3", true).await.unwrap();
        assert!(list(&db)
            .await
            .unwrap()
            .iter()
            .any(|r| r.file_id == "3" && r.dismissed && r.is_new));
    }
}
