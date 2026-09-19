-- 0005 — graduation plan overrides.
--
-- The degree plan itself (terms, course slots, prereq intelligence) is
-- static frontend data ported from CWA-Manager's GraduationPlan. What must
-- persist locally is only what the user changes: a course's status
-- (passed / failed / dropped) or a term move. Everything else — current
-- enrollment, transfer credit — derives live from the Canvas sync and the
-- static registry, so the plan stays truthful with zero bookkeeping.

CREATE TABLE grad_overrides (
    code    TEXT PRIMARY KEY,
    -- 'planned' | 'in_progress' | 'passed' | 'failed' | 'dropped'; NULL =
    -- let the automatic derivation decide.
    status  TEXT,
    -- Term id (e.g. 'fa27') when the user re-slots a course; NULL = default.
    term_id TEXT
);
