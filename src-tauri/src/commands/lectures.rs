//! Lecture file commands: the list behind "lectures without a chapter",
//! and hiding one from it.
//!
//! Called by: `src/lib/ipc.ts` (`lectureFilesList`, `lectureFileDismiss`).
//! Calls: [`crate::lectures`].

use tauri::{AppHandle, Manager};

use super::{CommandError, CommandResult};
use crate::db::Db;
use crate::lectures::{self, LectureFileRow};

#[tauri::command]
pub async fn lecture_files_list(app: AppHandle) -> CommandResult<Vec<LectureFileRow>> {
    let db = app.state::<Db>().inner().clone();
    lectures::list(&db)
        .await
        .map_err(|e| CommandError::storage(format!("Could not read lecture files: {e}")))
}

#[tauri::command]
pub async fn lecture_file_dismiss(
    app: AppHandle,
    course_id: String,
    file_id: String,
    dismissed: bool,
) -> CommandResult<()> {
    let db = app.state::<Db>().inner().clone();
    lectures::set_dismissed(&db, &course_id, &file_id, dismissed)
        .await
        .map_err(|e| CommandError::storage(format!("Could not update the lecture: {e}")))
}
