-- 0011 — backfill: study sessions created before the 'study' kind existed.
--
-- The calendar redesign split personal blocks into 'study' (purple) and
-- 'event' (green), but every block created earlier is 'event'. Titles that
-- announce themselves as study sessions ("Study — LING 112 · syntax trees")
-- get recategorised once; anything ambiguous ("Recap — CS 154", "Weekly
-- sweep") stays personal and is one edit-dialog click to move.
--
-- Data-only migration: no schema change, safe on an empty table.

UPDATE planner_blocks
SET kind = 'study'
WHERE kind = 'event'
  AND (title LIKE 'Study %' OR title LIKE 'Study—%' OR title LIKE 'Study -%');
