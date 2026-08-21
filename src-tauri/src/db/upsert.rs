//! Non-destructive sync writes.
//!
//! Called by: the sync engine, the ICS importer, and manual-entry commands.
//! Calls: sqlx.
//!
//! Every write here is `INSERT ... ON CONFLICT DO UPDATE`, keyed on the
//! Canvas ID. There is no `DELETE` and no `DROP` in this module, and that is
//! not an accident — see the invariant in [`super`].
//!
//! # How the three sources coexist without clobbering each other
//!
//! - **`manual` rows never collide with API rows.** Manual IDs are generated
//!   with a `manual-` prefix, so an API upsert cannot reach them at all.
//! - **`ics` rows deliberately share IDs with API rows** (the feed's UID
//!   carries the Canvas assignment ID). An API sync overwriting an ICS row is
//!   an upgrade — the API knows strictly more. The reverse is a downgrade, so
//!   ICS upserts carry `WHERE source != 'api'` and become no-ops on rows the
//!   API already owns.
//! - **`instructors.office_hours_note` is the user's**, so no statement in
//!   this file mentions it after the initial NULL insert.

use super::schema::*;
use super::Db;

/// Upsert one course from any source.
pub async fn course(db: &Db, r: &CourseRow) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO courses (id, name, course_code, term, apply_group_weights,
                             current_score, final_score, syllabus_html, source,
                             raw_json, synced_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            course_code = excluded.course_code,
            term = excluded.term,
            apply_group_weights = excluded.apply_group_weights,
            current_score = excluded.current_score,
            final_score = excluded.final_score,
            syllabus_html = excluded.syllabus_html,
            source = excluded.source,
            raw_json = excluded.raw_json,
            synced_at = excluded.synced_at
        "#,
    )
    .bind(&r.id)
    .bind(&r.name)
    .bind(&r.course_code)
    .bind(&r.term)
    .bind(r.apply_group_weights)
    .bind(r.current_score)
    .bind(r.final_score)
    .bind(&r.syllabus_html)
    .bind(&r.source)
    .bind(&r.raw_json)
    .bind(&r.synced_at)
    .execute(db)
    .await?;
    Ok(())
}

/// Insert a minimal course row only if the id is new. Returns whether a row
/// was created.
///
/// Used by the ICS importer, which knows only a label: an existing row —
/// especially an API-sourced one — must not have its name overwritten by the
/// feed's bracket text, so this is INSERT-or-nothing rather than an upsert.
pub async fn course_if_absent(
    db: &Db,
    id: &str,
    name: &str,
    now: &str,
) -> Result<bool, sqlx::Error> {
    let res = sqlx::query(
        r#"
        INSERT INTO courses (id, name, course_code, source, synced_at)
        VALUES (?1, ?2, ?2, 'ics', ?3)
        ON CONFLICT(id) DO NOTHING
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(now)
    .execute(db)
    .await?;
    Ok(res.rows_affected() > 0)
}

/// Upsert one assignment group.
pub async fn assignment_group(db: &Db, r: &AssignmentGroupRow) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO assignment_groups (id, course_id, name, group_weight,
                                       position, source, raw_json, synced_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            course_id = excluded.course_id,
            name = excluded.name,
            group_weight = excluded.group_weight,
            position = excluded.position,
            source = excluded.source,
            raw_json = excluded.raw_json,
            synced_at = excluded.synced_at
        "#,
    )
    .bind(&r.id)
    .bind(&r.course_id)
    .bind(&r.name)
    .bind(r.group_weight)
    .bind(r.position)
    .bind(&r.source)
    .bind(&r.raw_json)
    .bind(&r.synced_at)
    .execute(db)
    .await?;
    Ok(())
}

/// Upsert one assignment from the API or manual entry (full overwrite).
pub async fn assignment(db: &Db, r: &AssignmentRow) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO assignments (id, course_id, group_id, name, due_at,
                                 points_possible, omit_from_final_grade,
                                 submission_types, html_url, rubric_json,
                                 source, raw_json, synced_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        ON CONFLICT(id) DO UPDATE SET
            course_id = excluded.course_id,
            group_id = excluded.group_id,
            name = excluded.name,
            due_at = excluded.due_at,
            points_possible = excluded.points_possible,
            omit_from_final_grade = excluded.omit_from_final_grade,
            submission_types = excluded.submission_types,
            html_url = excluded.html_url,
            rubric_json = excluded.rubric_json,
            source = excluded.source,
            raw_json = excluded.raw_json,
            synced_at = excluded.synced_at
        "#,
    )
    .bind(&r.id)
    .bind(&r.course_id)
    .bind(&r.group_id)
    .bind(&r.name)
    .bind(&r.due_at)
    .bind(r.points_possible)
    .bind(r.omit_from_final_grade)
    .bind(&r.submission_types)
    .bind(&r.html_url)
    .bind(&r.rubric_json)
    .bind(&r.source)
    .bind(&r.raw_json)
    .bind(&r.synced_at)
    .execute(db)
    .await?;
    Ok(())
}

/// Upsert one assignment from the ICS feed.
///
/// Downgrade guard: if the API already owns this row, the feed's dates-only
/// view must not blank the richer fields, so the update applies only to rows
/// the API has never written (`WHERE source != 'api'`). Also touches only the
/// fields a feed actually knows: name, due date.
pub async fn assignment_from_ics(db: &Db, r: &AssignmentRow) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO assignments (id, course_id, group_id, name, due_at,
                                 points_possible, omit_from_final_grade,
                                 submission_types, html_url, rubric_json,
                                 source, raw_json, synced_at)
        VALUES (?1, ?2, NULL, ?3, ?4, NULL, NULL, NULL, ?5, NULL, 'ics', ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            due_at = excluded.due_at,
            raw_json = excluded.raw_json,
            synced_at = excluded.synced_at
        WHERE assignments.source != 'api'
        "#,
    )
    .bind(&r.id)
    .bind(&r.course_id)
    .bind(&r.name)
    .bind(&r.due_at)
    .bind(&r.html_url)
    .bind(&r.raw_json)
    .bind(&r.synced_at)
    .execute(db)
    .await?;
    Ok(())
}

/// Upsert one submission.
pub async fn submission(db: &Db, r: &SubmissionRow) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO submissions (assignment_id, score, grade, submitted_at,
                                 graded_at, workflow_state, excused, missing,
                                 late, source, raw_json, synced_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
        ON CONFLICT(assignment_id) DO UPDATE SET
            score = excluded.score,
            grade = excluded.grade,
            submitted_at = excluded.submitted_at,
            graded_at = excluded.graded_at,
            workflow_state = excluded.workflow_state,
            excused = excluded.excused,
            missing = excluded.missing,
            late = excluded.late,
            source = excluded.source,
            raw_json = excluded.raw_json,
            synced_at = excluded.synced_at
        "#,
    )
    .bind(&r.assignment_id)
    .bind(r.score)
    .bind(&r.grade)
    .bind(&r.submitted_at)
    .bind(&r.graded_at)
    .bind(&r.workflow_state)
    .bind(r.excused)
    .bind(r.missing)
    .bind(r.late)
    .bind(&r.source)
    .bind(&r.raw_json)
    .bind(&r.synced_at)
    .execute(db)
    .await?;
    Ok(())
}

/// Upsert one instructor. `office_hours_note` is intentionally absent from
/// the update list — it belongs to the user.
pub async fn instructor(db: &Db, r: &InstructorRow) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO instructors (id, course_id, name, email, role,
                                 office_hours_note, source, raw_json, synced_at)
        VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7, ?8)
        ON CONFLICT(id, course_id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            role = excluded.role,
            source = excluded.source,
            raw_json = excluded.raw_json,
            synced_at = excluded.synced_at
        "#,
    )
    .bind(&r.id)
    .bind(&r.course_id)
    .bind(&r.name)
    .bind(&r.email)
    .bind(&r.role)
    .bind(&r.source)
    .bind(&r.raw_json)
    .bind(&r.synced_at)
    .execute(db)
    .await?;
    Ok(())
}

/// Set a course's target grade (local-only table, user-owned).
pub async fn target(
    db: &Db,
    course_id: &str,
    letter: &str,
    pct: f64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO targets (course_id, target_letter, target_pct)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(course_id) DO UPDATE SET
            target_letter = excluded.target_letter,
            target_pct = excluded.target_pct
        "#,
    )
    .bind(course_id)
    .bind(letter)
    .bind(pct)
    .execute(db)
    .await?;
    Ok(())
}

/// Hide or unhide a course (local-only view preference on `targets`).
pub async fn course_hidden(db: &Db, course_id: &str, hidden: bool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO targets (course_id, hidden) VALUES (?1, ?2)
        ON CONFLICT(course_id) DO UPDATE SET hidden = excluded.hidden
        "#,
    )
    .bind(course_id)
    .bind(hidden)
    .execute(db)
    .await?;
    Ok(())
}

/// Set an assignment's time estimate (local-only table, user-owned).
pub async fn estimate(
    db: &Db,
    assignment_id: &str,
    est_minutes: Option<i64>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO estimates (assignment_id, est_minutes)
        VALUES (?1, ?2)
        ON CONFLICT(assignment_id) DO UPDATE SET est_minutes = excluded.est_minutes
        "#,
    )
    .bind(assignment_id)
    .bind(est_minutes)
    .execute(db)
    .await?;
    Ok(())
}

/// Record a syllabus file. Keyed on the Canvas file id when there is one so
/// a re-fetch replaces rather than duplicates; manual imports always insert.
pub async fn syllabus_file(db: &Db, r: &SyllabusFileRow) -> Result<(), sqlx::Error> {
    if let Some(canvas_id) = &r.canvas_file_id {
        sqlx::query("DELETE FROM syllabus_files WHERE course_id = ?1 AND canvas_file_id = ?2")
            .bind(&r.course_id)
            .bind(canvas_id)
            .execute(db)
            .await?;
    }
    sqlx::query(
        r#"
        INSERT INTO syllabus_files (course_id, canvas_file_id, filename,
                                    content_type, local_path, extracted_text,
                                    source, fetched_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
    )
    .bind(&r.course_id)
    .bind(&r.canvas_file_id)
    .bind(&r.filename)
    .bind(&r.content_type)
    .bind(&r.local_path)
    .bind(&r.extracted_text)
    .bind(&r.source)
    .bind(&r.fetched_at)
    .execute(db)
    .await?;
    Ok(())
}

/// Star or unstar an instructor as "my professor" (local-only, like the
/// note — sync never touches it).
pub async fn instructor_starred(
    db: &Db,
    id: &str,
    course_id: &str,
    starred: bool,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE instructors SET starred = ?1 WHERE id = ?2 AND course_id = ?3")
        .bind(starred)
        .bind(id)
        .bind(course_id)
        .execute(db)
        .await?;
    Ok(())
}

/// Update the user's note on an instructor — the one instructor field sync
/// never touches, so this is its only writer.
pub async fn instructor_note(
    db: &Db,
    id: &str,
    course_id: &str,
    note: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE instructors SET office_hours_note = ?1 WHERE id = ?2 AND course_id = ?3")
        .bind(note)
        .bind(id)
        .bind(course_id)
        .execute(db)
        .await?;
    Ok(())
}

/// Open a `sync_log` row, returning its id for [`sync_log_finish`].
pub async fn sync_log_start(db: &Db, entity: &str) -> Result<i64, sqlx::Error> {
    let res = sqlx::query("INSERT INTO sync_log (started_at, entity) VALUES (?1, ?2)")
        .bind(super::now_rfc3339())
        .bind(entity)
        .execute(db)
        .await?;
    Ok(res.last_insert_rowid())
}

/// Close a `sync_log` row with its outcome.
pub async fn sync_log_finish(
    db: &Db,
    id: i64,
    ok: bool,
    error: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE sync_log SET finished_at = ?1, ok = ?2, error = ?3 WHERE id = ?4")
        .bind(super::now_rfc3339())
        .bind(ok)
        .bind(error)
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}
