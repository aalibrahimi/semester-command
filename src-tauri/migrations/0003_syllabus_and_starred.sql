-- 0003 — syllabus files + "my professor" star.
--
-- `syllabus_files`: syllabus documents per course. SJSU professors put the
-- syllabus in a PDF in course files, not in Canvas's syllabus page (verified
-- against the live account 2026-08-21: every synced syllabus_body was
-- empty). Files are downloaded to the app data dir and their text extracted
-- so policies ("late", "make-up", office hours) are searchable.
--
-- `instructors.starred`: local-only "this is MY professor" flag. Canvas
-- lists every section's teacher on umbrella courses (six "teachers" on
-- CS-146), so which one is yours is something only the user knows. Like
-- office_hours_note, sync never touches it.

CREATE TABLE syllabus_files (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id      TEXT NOT NULL REFERENCES courses(id),
    -- Canvas file id for API-fetched files; NULL for manual imports.
    canvas_file_id TEXT,
    filename       TEXT NOT NULL,
    content_type   TEXT,
    -- Where the document lives on disk (app data dir).
    local_path     TEXT NOT NULL,
    -- Extracted plain text; empty when extraction isn't supported yet.
    extracted_text TEXT,
    source         TEXT NOT NULL DEFAULT 'api',
    fetched_at     TEXT
);

CREATE INDEX idx_syllabus_course ON syllabus_files(course_id);

ALTER TABLE instructors ADD COLUMN starred INTEGER NOT NULL DEFAULT 0;
