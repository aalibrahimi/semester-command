-- 0017: local cache of study content pulled from Railway (src/content.rs).
--
-- Guides and videos are published to Railway Postgres (schema "content") by
-- `bun run content:push`. On launch the app copies whatever changed into
-- these tables, so the Study views work offline and a new chapter reaches
-- the app without a rebuild. Nothing here is user data: dropping these rows
-- only means the next sync downloads them again.
--
--   content_guide  one row per guide: its summary (lists, progress) and the
--                  full JSON body, keyed by id, compared by sha (SHA-256).
--   content_asset  one row per file (a video, its poster); the bytes live on
--                  disk under <app data>/study-assets/<path>.
--   content_meta   last_sync_at, last_error.

CREATE TABLE content_guide (
    id         TEXT PRIMARY KEY,
    course     TEXT NOT NULL,
    position   INTEGER NOT NULL,
    sha        TEXT NOT NULL,
    summary    TEXT NOT NULL,
    body       TEXT NOT NULL,
    synced_at  TEXT NOT NULL
);

CREATE TABLE content_asset (
    path       TEXT PRIMARY KEY,
    sha        TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    synced_at  TEXT NOT NULL
);

CREATE TABLE content_meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);
