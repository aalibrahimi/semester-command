//! Highlight and explain commands (migration 0019), and the optional Claude
//! check with the reader's own API key.
//!
//! Called by: `src/lib/ipc.ts` (`highlightAdd`, `highlightsAll`,
//! `highlightDelete`, `explainRecord`, `explainsAll`, `explainAiStatus`,
//! `explainAiSetKey`, `explainAiClearKey`, `explainAiGrade`).
//! Calls: [`crate::explain`] and the credential store's `Anthropic` slot.

use tauri::{AppHandle, Manager};

use super::{CommandError, CommandResult};
use crate::canvas::session_store::Slot;
use crate::commands::auth::AuthCtx;
use crate::db::Db;
use crate::explain::{self, AiFeedback, AiRequest, ExplainRow, HighlightRow};

fn db_of(app: &AppHandle) -> Db {
    app.state::<Db>().inner().clone()
}

fn storage_err(e: sqlx::Error) -> CommandError {
    CommandError::storage(format!("Could not save your highlights: {e}"))
}

#[tauri::command]
pub async fn highlight_add(app: AppHandle, highlight: HighlightRow) -> CommandResult<HighlightRow> {
    explain::add_highlight(&db_of(&app), highlight)
        .await
        .map_err(storage_err)
}

#[tauri::command]
pub async fn highlights_all(app: AppHandle) -> CommandResult<Vec<HighlightRow>> {
    explain::list_highlights(&db_of(&app))
        .await
        .map_err(storage_err)
}

#[tauri::command]
pub async fn highlight_delete(app: AppHandle, id: i64) -> CommandResult<()> {
    explain::delete_highlight(&db_of(&app), id)
        .await
        .map_err(storage_err)
}

/// Store an attempt; with `ai`, attach Claude's feedback to attempt `id`.
#[tauri::command]
pub async fn explain_record(app: AppHandle, attempt: ExplainRow) -> CommandResult<ExplainRow> {
    let db = db_of(&app);
    if let (Some(id), Some(ai)) = (attempt.id, attempt.ai.as_deref()) {
        explain::set_explain_ai(&db, id, ai)
            .await
            .map_err(storage_err)?;
        return Ok(attempt);
    }
    explain::add_explain(&db, attempt)
        .await
        .map_err(storage_err)
}

#[tauri::command]
pub async fn explains_all(app: AppHandle) -> CommandResult<Vec<ExplainRow>> {
    explain::list_explains(&db_of(&app))
        .await
        .map_err(storage_err)
}

/// Whether a key is saved. Never returns the key itself.
#[tauri::command]
pub fn explain_ai_status(app: AppHandle) -> bool {
    app.state::<AuthCtx>()
        .store
        .load_one(Slot::Anthropic)
        .is_some_and(|k| !k.trim().is_empty())
}

#[tauri::command]
pub fn explain_ai_set_key(app: AppHandle, key: String) -> CommandResult<()> {
    let key = key.trim();
    if !key.starts_with("sk-ant-") {
        return Err(CommandError::internal(
            "That doesn't look like an Anthropic API key (they start with sk-ant-).",
        ));
    }
    app.state::<AuthCtx>()
        .store
        .store(Slot::Anthropic, key)
        .map(|_| ())
        .map_err(|e| CommandError::storage(format!("Could not save the key: {e}")))
}

#[tauri::command]
pub fn explain_ai_clear_key(app: AppHandle) -> CommandResult<()> {
    app.state::<AuthCtx>()
        .store
        .clear(Slot::Anthropic)
        .map_err(|e| CommandError::storage(format!("Could not remove the key: {e}")))
}

#[tauri::command]
pub async fn explain_ai_grade(app: AppHandle, request: AiRequest) -> CommandResult<AiFeedback> {
    let key = app
        .state::<AuthCtx>()
        .store
        .load_one(Slot::Anthropic)
        .ok_or_else(|| {
            CommandError::internal(
                "Add your Anthropic API key in Settings, Study, to use the Claude check.",
            )
        })?;
    explain::grade(&key, &request)
        .await
        .map_err(CommandError::internal)
}
