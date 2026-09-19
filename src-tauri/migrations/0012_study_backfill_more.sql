-- 0012 — second study backfill pass, from Ali's live calendar.
--
-- 0011 caught titles starting "Study"; the real roster also has "Recap —
-- CS 154 · …" and "Swing study — CS 146 (…)" blocks, which are study
-- sessions in everything but prefix. "Weekly sweep" and the like stay
-- personal — reviewing the app is not studying a course.
--
-- Data-only migration: no schema change, safe on an empty table.

UPDATE planner_blocks
SET kind = 'study'
WHERE kind = 'event'
  AND (title LIKE 'Recap %' OR title LIKE 'Recap—%' OR title LIKE 'Recap -%'
       OR title LIKE 'Swing study%');
