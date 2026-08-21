-- 0002_hidden_courses — a local-only "hide this course" flag.
--
-- Lives on `targets` because that is already the local-only per-course table
-- that sync never touches (§3). Hiding is a view preference, not a deletion:
-- the course's rows all stay, and unhiding restores everything instantly.
-- First use: FA25 LING-101 (previous semester, still 'active' on Canvas) and
-- the administrative shells.

ALTER TABLE targets ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
