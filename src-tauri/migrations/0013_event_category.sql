-- 0013 — split personal blocks into categories (from Ali's live calendar:
-- "too much green").
--
-- 'event' blocks gain a category: 'fitness' | 'work' | 'personal' (NULL
-- reads as personal). Class and study blocks ignore it — their color comes
-- from the course. Backfill from the titles already on the roster: Gym is
-- fitness, the teaching internship is work; anything unrecognised stays
-- personal and is one edit away.

ALTER TABLE planner_blocks ADD COLUMN category TEXT;

UPDATE planner_blocks
SET category = 'fitness'
WHERE kind = 'event'
  AND (title LIKE 'Gym%' OR title LIKE '%workout%' OR title LIKE 'Run %');

UPDATE planner_blocks
SET category = 'work'
WHERE kind = 'event'
  AND category IS NULL
  AND (title LIKE '%intern%' OR title LIKE 'Work%' OR title LIKE '%shift%');
