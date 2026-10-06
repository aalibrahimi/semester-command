//! Highlights and "explain it in your own words" (migration 0019), plus the
//! optional Claude check of a free-form explanation.
//!
//! Called by: `commands::explain`.
//! Calls: sqlx for the two tables; reqwest for the Anthropic Messages API.
//!
//! The built-in check (fill in the blanks, key-idea coverage, the nudge)
//! runs in the webview and only its result is stored here. Claude is the
//! second opinion the reader asks for with a button: it can tell when
//! different wording still means the right thing, which a word match can't.
//!
//! The API key never reaches the webview. It lives in the OS keychain (the
//! same store as the Canvas credential, its own slot) and is read here, per
//! request, only to set the `x-api-key` header.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::db::Db;

/// One kept highlight.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightRow {
    pub id: Option<i64>,
    pub guide_id: String,
    pub section_id: String,
    pub block_id: String,
    pub text: String,
    pub context: String,
    /// JSON array of strings.
    pub keys: String,
    pub created_at: String,
}

/// One explain attempt.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainRow {
    pub id: Option<i64>,
    pub target: String,
    pub guide_id: String,
    pub mode: String,
    pub answer: String,
    pub score: f64,
    /// JSON array of strings.
    pub missed: String,
    /// JSON of [`AiFeedback`], when Claude was asked.
    pub ai: Option<String>,
    pub at: String,
}

pub async fn add_highlight(db: &Db, h: HighlightRow) -> Result<HighlightRow, sqlx::Error> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO study_highlight (guide_id, section_id, block_id, text, context, keys, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id",
    )
    .bind(&h.guide_id)
    .bind(&h.section_id)
    .bind(&h.block_id)
    .bind(&h.text)
    .bind(&h.context)
    .bind(&h.keys)
    .bind(&h.created_at)
    .fetch_one(db)
    .await?;
    Ok(HighlightRow { id: Some(id), ..h })
}

pub async fn list_highlights(db: &Db) -> Result<Vec<HighlightRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM study_highlight ORDER BY created_at DESC")
        .fetch_all(db)
        .await
}

/// Remove a highlight and the attempts made on it.
pub async fn delete_highlight(db: &Db, id: i64) -> Result<(), sqlx::Error> {
    let mut tx = db.begin().await?;
    sqlx::query("DELETE FROM study_explain WHERE target = ?1")
        .bind(format!("h:{id}"))
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM study_highlight WHERE id = ?1")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await
}

pub async fn add_explain(db: &Db, e: ExplainRow) -> Result<ExplainRow, sqlx::Error> {
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO study_explain (target, guide_id, mode, answer, score, missed, ai, at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) RETURNING id",
    )
    .bind(&e.target)
    .bind(&e.guide_id)
    .bind(&e.mode)
    .bind(&e.answer)
    .bind(e.score)
    .bind(&e.missed)
    .bind(&e.ai)
    .bind(&e.at)
    .fetch_one(db)
    .await?;
    Ok(ExplainRow { id: Some(id), ..e })
}

/// Attach Claude's feedback to an attempt that was already stored.
pub async fn set_explain_ai(db: &Db, id: i64, ai: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE study_explain SET ai = ?1 WHERE id = ?2")
        .bind(ai)
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn list_explains(db: &Db) -> Result<Vec<ExplainRow>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM study_explain ORDER BY at DESC")
        .fetch_all(db)
        .await
}

/* ── Claude ─────────────────────────────────────────────────────────────── */

pub const API_URL: &str = "https://api.anthropic.com/v1/messages";
pub const API_VERSION: &str = "2023-06-01";
/// Small and fast is right for grading a few sentences; it keeps a check
/// well under a cent.
pub const MODEL: &str = "claude-haiku-4-5";

/// What the webview sends to be checked.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRequest {
    /// The term or a short title ("Balance B(node)").
    pub concept: String,
    /// The chapter's wording: the definition body or the highlighted text
    /// with its surrounding block.
    pub reference: String,
    /// The reader's explanation.
    pub answer: String,
    /// The reader's previous explanation of the same thing, if any.
    pub previous: Option<String>,
}

/// Claude's verdict, as the webview shows it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiFeedback {
    /// "right" | "almost" | "wrong".
    pub verdict: String,
    #[serde(default)]
    pub got: Vec<String>,
    #[serde(default)]
    pub missing: Vec<String>,
    /// Things the answer says that are actually false.
    #[serde(default)]
    pub wrong: Vec<String>,
    /// One sentence: the single thing that would fix it, without giving the
    /// whole answer away.
    #[serde(default)]
    pub nudge: String,
    /// One sentence on how this answer compares with the previous one.
    #[serde(default)]
    pub compare: Option<String>,
}

const SYSTEM: &str = "You check a college student's explanation of a course concept against the course's own wording. \
Judge meaning, not phrasing: different words that say the same thing are correct. Be strict about real errors \
(a wrong sign, a wrong order, a missing condition). Never use em dashes. Reply with ONLY a JSON object, no prose, \
with these keys: \"verdict\" (\"right\" if nothing important is missing or wrong, \"almost\" if one piece is missing \
or slightly off, \"wrong\" if the core idea is wrong or absent), \"got\" (short phrases the student got right), \
\"missing\" (short phrases for important ideas they left out), \"wrong\" (short phrases for anything they said that \
is false), \"nudge\" (ONE plain sentence pointing at the single most important missing or wrong piece, as a hint, \
without writing the full answer for them; empty if the verdict is right), \"compare\" (one sentence comparing this \
answer with their previous one if a previous answer is given, otherwise null).";

/// The user message: reference first, then the answer, then the previous one.
pub fn prompt(r: &AiRequest) -> String {
    let mut s = format!(
        "Concept: {}\n\nCourse wording:\n{}\n\nStudent's explanation:\n{}\n",
        r.concept.trim(),
        r.reference.trim(),
        r.answer.trim()
    );
    if let Some(p) = r.previous.as_ref().filter(|p| !p.trim().is_empty()) {
        s.push_str(&format!(
            "\nStudent's previous explanation:\n{}\n",
            p.trim()
        ));
    }
    s
}

/// Pull the JSON object out of the model's text (tolerates ``` fences or a
/// stray sentence around it) and parse it.
pub fn parse_feedback(text: &str) -> Result<AiFeedback, String> {
    let start = text.find('{').ok_or("Claude's reply had no JSON in it")?;
    let end = text.rfind('}').ok_or("Claude's reply had no JSON in it")?;
    let mut fb: AiFeedback = serde_json::from_str(&text[start..=end])
        .map_err(|e| format!("Could not read Claude's reply: {e}"))?;
    fb.verdict = match fb.verdict.to_lowercase().as_str() {
        "right" | "correct" => "right".into(),
        "wrong" | "incorrect" => "wrong".into(),
        _ => "almost".into(),
    };
    fb.compare = fb.compare.filter(|c| !c.trim().is_empty());
    Ok(fb)
}

/// The request body for the Messages API.
pub fn body(r: &AiRequest) -> serde_json::Value {
    serde_json::json!({
        "model": MODEL,
        "max_tokens": 600,
        "system": SYSTEM,
        "messages": [{ "role": "user", "content": prompt(r) }],
    })
}

/// Ask Claude. Errors are written for the reader.
pub async fn grade(key: &str, r: &AiRequest) -> Result<AiFeedback, String> {
    let res = reqwest::Client::new()
        .post(API_URL)
        .header("x-api-key", key)
        .header("anthropic-version", API_VERSION)
        .header("content-type", "application/json")
        .timeout(std::time::Duration::from_secs(45))
        .json(&body(r))
        .send()
        .await
        .map_err(|_| "Could not reach Claude: check your connection.".to_string())?;
    let status = res.status();
    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|_| "Claude sent a reply we could not read.".to_string())?;
    if !status.is_success() {
        return Err(match status.as_u16() {
            401 | 403 => "Your Anthropic API key was rejected. Check it in Settings, Study.".into(),
            429 => "Claude is rate-limiting this key. Wait a minute and try again.".into(),
            _ => format!(
                "Claude returned an error ({}): {}",
                status.as_u16(),
                json["error"]["message"].as_str().unwrap_or("no details")
            ),
        });
    }
    let text = json["content"]
        .as_array()
        .and_then(|blocks| blocks.iter().find_map(|b| b["text"].as_str()))
        .ok_or("Claude's reply was empty.")?;
    parse_feedback(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_plain_and_fenced_replies() {
        let plain = r#"{"verdict":"almost","got":["left minus right"],"missing":["null is -1"],"wrong":[],"nudge":"What height does a missing child have?","compare":null}"#;
        let fb = parse_feedback(plain).unwrap();
        assert_eq!(fb.verdict, "almost");
        assert_eq!(fb.missing, vec!["null is -1"]);
        assert_eq!(fb.compare, None);

        let fenced = format!("Here you go:\n```json\n{plain}\n```");
        assert_eq!(parse_feedback(&fenced).unwrap(), fb);

        let loose = r#"{"verdict":"Correct","nudge":""}"#;
        let fb = parse_feedback(loose).unwrap();
        assert_eq!(fb.verdict, "right");
        assert!(fb.got.is_empty() && fb.missing.is_empty());

        assert!(parse_feedback("no json here").is_err());
    }

    #[test]
    fn prompt_includes_previous_only_when_given() {
        let mut r = AiRequest {
            concept: "Balance B(node)".into(),
            reference: "B(node) = H(left) - H(right).".into(),
            answer: "right minus left".into(),
            previous: None,
        };
        assert!(!prompt(&r).contains("previous"));
        r.previous = Some("  ".into());
        assert!(!prompt(&r).contains("previous"));
        r.previous = Some("left height minus right height".into());
        let p = prompt(&r);
        assert!(p.contains("previous explanation") && p.contains("left height minus right height"));
        assert_eq!(body(&r)["model"], MODEL);
        assert!(!SYSTEM.contains('\u{2014}'));
    }

    #[tokio::test]
    async fn highlights_and_attempts_round_trip() {
        let dir = std::env::temp_dir().join(format!("explain-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let db = crate::db::open(&dir).await.unwrap();
        let h = add_highlight(
            &db,
            HighlightRow {
                id: None,
                guide_id: "cs146/13-avl-trees".into(),
                section_id: "balance".into(),
                block_id: "balance.1".into(),
                text: "B(node) = H(left child) − H(right child)".into(),
                context: "Balance B(node). B(node) = H(left child) − H(right child).".into(),
                keys: r#"["H(left child) − H(right child)"]"#.into(),
                created_at: "2026-10-06T10:00:00Z".into(),
            },
        )
        .await
        .unwrap();
        let id = h.id.unwrap();
        let e = add_explain(
            &db,
            ExplainRow {
                id: None,
                target: format!("h:{id}"),
                guide_id: h.guide_id.clone(),
                mode: "own".into(),
                answer: "left height minus right height".into(),
                score: 1.0,
                missed: "[]".into(),
                ai: None,
                at: "2026-10-06T10:01:00Z".into(),
            },
        )
        .await
        .unwrap();
        set_explain_ai(&db, e.id.unwrap(), r#"{"verdict":"right"}"#)
            .await
            .unwrap();
        let all = list_explains(&db).await.unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].ai.as_deref(), Some(r#"{"verdict":"right"}"#));
        assert_eq!(list_highlights(&db).await.unwrap().len(), 1);
        delete_highlight(&db, id).await.unwrap();
        assert!(list_highlights(&db).await.unwrap().is_empty());
        assert!(
            list_explains(&db).await.unwrap().is_empty(),
            "attempts go with their highlight"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }
}
