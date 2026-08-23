-- 0009 — the weekly planner (class meeting slots + personal blocks).
--
-- Canvas has no API for class meeting times (SJSU keeps schedules in
-- MySJSU), so class slots are user-entered once and recur weekly. Personal
-- blocks (gym, study sessions) can be weekly or one-off. All local-only:
-- sync never touches this table.
--
-- Recurrence model, deliberately minimal: `weekday` set → repeats weekly on
-- that day; `date` set → happens once on that date. Exactly one of the two
-- is set per row. Times are minutes-from-midnight so arithmetic needs no
-- timezone gymnastics — a 10:30 class is 630 wherever the laptop wakes up.

CREATE TABLE planner_blocks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 'class' (recurring course meeting) | 'event' (anything else).
    kind      TEXT NOT NULL DEFAULT 'event',
    -- Links a class block to its course for identity color + nickname.
    course_id TEXT,
    title     TEXT NOT NULL,
    location  TEXT,
    -- 0 = Monday … 6 = Sunday, for weekly blocks. NULL for one-offs.
    weekday   INTEGER,
    -- 'YYYY-MM-DD' local date for one-off blocks. NULL for weekly.
    date      TEXT,
    start_min INTEGER NOT NULL,
    end_min   INTEGER NOT NULL,
    note      TEXT
);
