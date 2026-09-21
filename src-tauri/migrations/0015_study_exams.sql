-- 0015 — Mock exams, and where an attempt came from.
--
-- A mock exam is a timed run of drills in the professor's format. The row
-- keeps the score and a per-section breakdown so the Study home can show
-- "last mock: 14/20, weakest: recurrences#master" without replaying it.
-- Attempts made inside an exam are still logged in study_attempt (one row
-- each) and now say so in `source`, so the error log can tell a miss under
-- exam conditions from one while reading.
-- Local-only: sync never touches these tables.

ALTER TABLE study_attempt ADD COLUMN source TEXT NOT NULL DEFAULT 'read';
-- 'read' (the panel under a section) | 'focus' | 'exam'

CREATE TABLE study_exam (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    course      TEXT NOT NULL,          -- 'cs146'
    started_at  TEXT NOT NULL,          -- RFC3339
    finished_at TEXT,                   -- NULL = abandoned
    total       INTEGER NOT NULL,       -- questions asked
    correct     INTEGER NOT NULL,       -- questions right
    seconds     INTEGER NOT NULL,       -- time used
    -- JSON: [{"guideId","sectionId","asked","correct"}] for the breakdown.
    breakdown   TEXT NOT NULL
);

CREATE INDEX study_exam_course ON study_exam (course, started_at);
