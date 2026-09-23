-- 0016: the in-app notification inbox.
--
-- Every notification the app sends lands here first, whether or not it
-- also pops up on screen. The inbox is the record; the pop-up is only a
-- way to get your attention. notifications_sent (0004) stays the dedupe
-- ledger: it answers "did we already send this?", this table answers
-- "what did we tell you, and have you seen it?".
--
--   kind     deadline | grade | missing | digest | session | sync | test
--   urgency  low (inbox only, no pop-up) | normal | high (stays until closed)
--   route    in-app place a click opens, e.g. '/courses/1629570'; NULL = none
--   read_at  NULL until you open it or mark it read

CREATE TABLE inbox (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    route      TEXT,
    urgency    TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    read_at    TEXT
);

CREATE INDEX inbox_created ON inbox (created_at DESC);
CREATE INDEX inbox_unread ON inbox (read_at) WHERE read_at IS NULL;
