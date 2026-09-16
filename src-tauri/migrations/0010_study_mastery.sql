-- 0010 — Study mastery: what the reader knows, per guide.
--
-- One store, four views (Read, Cheat sheet, Recall, Map). Content is not
-- here — guides ship with the app as JSON — only the reader's state, keyed
-- by content-derived ids so a re-migrated guide keeps its records.
-- Local-only: sync never touches these tables.

-- Section status. A row appears the first time a section is marked; absent
-- means 'unread'.
CREATE TABLE study_section (
    guide_id   TEXT NOT NULL,           -- 'cs154/3-strings-languages'
    section_id TEXT NOT NULL,           -- 'strings'
    -- 'unread' | 'shaky' | 'mastered'
    status     TEXT NOT NULL DEFAULT 'unread',
    -- The reader's scratchpad for this section (Read view, right rail).
    scratch    TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (guide_id, section_id)
);

-- Review record for every drillable item: a check block, or a card the
-- Recall view generates from a block. `item_id` is the block id
-- ('strings.3') plus a card suffix for generated cards ('strings.3#tb',
-- '#bt', '#trap', '#compute'). Absent row = never seen.
CREATE TABLE study_review (
    guide_id   TEXT NOT NULL,
    item_id    TEXT NOT NULL,
    -- RFC3339 of the last time the reader answered it.
    last_seen  TEXT,
    -- Total 'Missed' / 'Again' answers, ever.
    misses     INTEGER NOT NULL DEFAULT 0,
    -- RFC3339 of when it is next due. NULL = due now.
    next_due   TEXT,
    -- SM-2 ease factor. 2.5 is the standard start.
    ease       REAL NOT NULL DEFAULT 2.5,
    -- Current interval in days (SM-2 needs it to compute the next one).
    interval_days REAL NOT NULL DEFAULT 0,
    -- Consecutive correct answers (SM-2 repetition count).
    reps       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guide_id, item_id)
);

CREATE INDEX study_review_due ON study_review (guide_id, next_due);
