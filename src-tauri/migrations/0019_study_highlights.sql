-- 0019 — Highlights and "explain it in your own words" attempts.
--
-- study_highlight: text the reader selected in a chapter and kept. `keys` are
-- the key ideas inside it (the chapter's bold terms that fall within the
-- selection, or picked words when there are none), stored at highlight time
-- so the explain check never depends on the chapter's current wording.
--
-- study_explain: one attempt at explaining a highlight or a definition card,
-- either by filling in its blanked key words ('blanks') or in the reader's
-- own words ('own'). `score` and `missed` come from the built-in check that
-- runs in the webview; `ai` holds Claude's feedback when the reader asks for
-- it. The previous attempt for the same target is what the next one is
-- compared against. Local-only: sync never touches these tables.

CREATE TABLE study_highlight (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guide_id   TEXT NOT NULL,           -- 'cs146/13-avl-trees'
    section_id TEXT NOT NULL,           -- 'balance'
    block_id   TEXT NOT NULL,           -- 'balance.1a2b3c4d'
    text       TEXT NOT NULL,           -- exactly what was selected
    context    TEXT NOT NULL,           -- the whole block's plain text
    keys       TEXT NOT NULL,           -- JSON array of key ideas
    created_at TEXT NOT NULL            -- RFC3339
);

CREATE INDEX study_highlight_guide ON study_highlight (guide_id, created_at);

CREATE TABLE study_explain (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    target     TEXT NOT NULL,           -- 'h:12' (highlight) or 'd:<block id>' (definition)
    guide_id   TEXT NOT NULL,
    mode       TEXT NOT NULL,           -- 'blanks' | 'own'
    answer     TEXT NOT NULL,           -- what the reader wrote (blanks joined with ' | ')
    score      REAL NOT NULL,           -- 0..1 from the built-in check
    missed     TEXT NOT NULL,           -- JSON array of key ideas not covered
    ai         TEXT,                    -- JSON of Claude's feedback, if asked
    at         TEXT NOT NULL            -- RFC3339
);

CREATE INDEX study_explain_target ON study_explain (target, at);
