-- Lecture files seen on Canvas, so the app can say "Lecture 12 was posted"
-- the sync after a professor uploads it, and list which lectures still have
-- no study chapter.
--
-- One row per (course, file). The first scan of a course records what's
-- already there silently (a baseline); only files first seen after that
-- produce a notification. `dismissed` hides a file from the to-write list
-- (the user decided it doesn't need a chapter).
CREATE TABLE lecture_files (
    course_id     TEXT NOT NULL,
    file_id       TEXT NOT NULL,
    name          TEXT NOT NULL,
    -- Canvas created_at when the files API gave it; NULL when the file was
    -- found through a module item (module items carry no upload date).
    created_at    TEXT,
    first_seen_at TEXT NOT NULL,
    -- 1 when the file was seen after the course's baseline scan.
    is_new        INTEGER NOT NULL DEFAULT 0,
    dismissed     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (course_id, file_id)
);
