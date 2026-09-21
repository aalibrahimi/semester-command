-- 0014 — Study attempts: every answer the reader gives to a generated drill.
--
-- Drills (src/study/drills/) make a fresh problem per seed and check the
-- answer in the webview. This table is the log: what was asked (drill +
-- seed reproduces it), what the reader typed, whether it was right, and the
-- diagnosis the drill gave for a miss. The Read view reads streaks from it,
-- the Study home reads weak spots, and the error log lists misses.
-- Local-only: sync never touches this table.

CREATE TABLE study_attempt (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guide_id   TEXT NOT NULL,           -- 'ling124/3-sampling-aliasing'
    section_id TEXT NOT NULL,           -- 'alias'
    drill_id   TEXT NOT NULL,           -- 'alias!fold' (section!slug)
    seed       INTEGER NOT NULL,        -- replays the exact instance
    correct    INTEGER NOT NULL,        -- 0 | 1
    input      TEXT,                    -- what the reader answered, normalised
    expected   TEXT,                    -- the accepted answer, rendered
    diagnosis  TEXT,                    -- the drill's named mistake, if any
    ms         INTEGER,                 -- time from instance shown to submit
    at         TEXT NOT NULL            -- RFC3339
);

CREATE INDEX study_attempt_guide ON study_attempt (guide_id, drill_id, at);
CREATE INDEX study_attempt_at ON study_attempt (at);
