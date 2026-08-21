-- 0004 — notification dedupe ledger (SPEC.md §6).
--
-- Every notification the app has ever sent, keyed by a stable string:
--   due:{assignment_id}:{threshold_hours}   deadline reminder
--   grade:{course_id}:{graded_at}           grade movement alert
--   missing:{assignment_id}                 assignment flipped to missing
--   daily:{yyyy-mm-dd}                      the 8am digest
--
-- The rule "never the same notification twice" is enforced by this table,
-- not by in-memory state — the app restarts (dev rebuilds, reboots,
-- autostart) far too often for memory to be the ledger.

CREATE TABLE notifications_sent (
    key     TEXT PRIMARY KEY,
    sent_at TEXT NOT NULL
);
