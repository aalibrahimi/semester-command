-- 0007 — grade trajectory memory.
--
-- One row per course per *change* in Canvas's computed scores, appended
-- during sync. Not one per sync: a 30-minute cadence would bury the signal
-- in identical rows. This table exists so "is this course climbing or
-- sliding" is answerable later — every week without it is data lost forever.

CREATE TABLE score_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id     TEXT NOT NULL REFERENCES courses(id),
    recorded_at   TEXT NOT NULL,
    current_score REAL,
    final_score   REAL
);

CREATE INDEX idx_score_history_course ON score_history(course_id, recorded_at);
