-- 0005 — degree progress, imported from SJSU MyProgress.
--
-- Canvas knows nothing about degree requirements, so none of this is synced.
-- It arrives as one pasted document (see `src/degree.rs` for why pasted text
-- and not the PDF or a scrape) and is parsed into the three tables below.
--
-- Conventions carried over from 0001:
--   * Timestamps are RFC 3339 TEXT in UTC.
--   * `raw_text` on degree_report is the exact paste, playing the same role as
--     `raw_json` does for Canvas rows: when SJSU restyles the portal and the
--     parser misreads something, the source document is already on disk and
--     the fix is a re-parse rather than another trip to MySJSU (§2.2).
--
-- IMPORTANT — the replace/preserve split.
--
-- A MyProgress report is a *snapshot*: requirements, their eligible courses
-- and the history all describe one moment, and a re-import replaces them
-- wholesale inside a single transaction. That is a deliberate exception to
-- §3's "upsert, never rebuild" rule, which exists to protect user-authored
-- data — and none of these three tables holds any.
--
-- `degree_plan` and `degree_target` DO hold user-authored data and are
-- therefore NOT replaced on import, and carry no foreign key to
-- degree_requirements. A cascade there would silently delete every term the
-- user had planned the moment they pasted a fresher report, which is exactly
-- the failure §3 warns about.

CREATE TABLE degree_report (
    -- Single row. The CHECK is what makes that structural rather than a
    -- convention someone forgets.
    id                   INTEGER PRIMARY KEY CHECK (id = 1),
    student_name         TEXT,
    student_id           TEXT,
    career               TEXT,
    program              TEXT,
    plan                 TEXT,
    catalog_term         TEXT,
    -- 'Not Applied' here means the degree cannot be conferred no matter how
    -- the coursework lands. Surfaced prominently by the UI for that reason.
    graduation_status    TEXT,
    last_term_registered TEXT,
    academic_standing    TEXT,
    overall_gpa          REAL,
    sjsu_gpa             REAL,
    -- MyProgress's own "last generated on" stamp, not our import time. The
    -- two differ and the older one is what the data actually reflects.
    generated_at         TEXT,
    imported_at          TEXT NOT NULL,
    raw_text             TEXT NOT NULL
);

CREATE TABLE degree_requirements (
    -- The report's own id: 'RG1048', or 'RQ2995:LI20' for a line item.
    -- Falls back to 'slug:<title>' when the report states none.
    key              TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    -- 'taken' | 'enrolled' | 'planned' | 'error' | 'exception'.
    -- 'error' is MyProgress's word for "not yet completed", not a fault.
    status           TEXT NOT NULL,
    note             TEXT,
    units_required   REAL,
    units_taken      REAL,
    units_needed     REAL,
    courses_required REAL,
    courses_taken    REAL,
    courses_needed   REAL,
    gpa_required     REAL,
    gpa_actual       REAL,
    -- Minimum passing grade, inherited from the enclosing block where the
    -- requirement does not restate it. This is what distinguishes "never
    -- taken" from "taken and failed the floor" — see degree.rs.
    min_grade        TEXT,
    -- Set when the report's option table was paginated and we only saw part
    -- of it. NULL means the list is complete.
    truncated_shown  INTEGER,
    truncated_total  INTEGER,
    position         INTEGER NOT NULL
);

CREATE TABLE degree_requirement_courses (
    requirement_key TEXT NOT NULL REFERENCES degree_requirements(key) ON DELETE CASCADE,
    position        INTEGER NOT NULL,
    code            TEXT NOT NULL,
    description     TEXT,
    units           REAL,
    -- The `When` column verbatim: 'Fall', 'Spring & Fall', 'All Terms',
    -- 'Fall in odd years', 'Variable Offering See Advisor', or a concrete
    -- term like 'Fall 2026' meaning the user is enrolled in it now.
    -- Stored raw and parsed in Rust, so a parse fix needs no migration.
    offered         TEXT,
    -- NULL = not attempted. Never 0, never ''.
    grade           TEXT,
    status          TEXT,
    designation     TEXT,
    PRIMARY KEY (requirement_key, position)
);

-- Additional Courses → Earned Units: coursework not consumed by a requirement
-- above. Kept separate from degree_requirement_courses because these are
-- attempts, not options.
CREATE TABLE degree_history (
    position    INTEGER PRIMARY KEY,
    code        TEXT NOT NULL,
    description TEXT,
    units       REAL,
    offered     TEXT,
    grade       TEXT,
    status      TEXT,
    designation TEXT
);

CREATE INDEX idx_degree_history_code ON degree_history(code);
CREATE INDEX idx_degree_req_courses_code ON degree_requirement_courses(code);

-- ── Local-only below this line. Never touched by an import. ──────────────────

-- Which term the user intends to satisfy each outstanding requirement in, and
-- with which course. No foreign key on purpose: see the header note.
CREATE TABLE degree_plan (
    requirement_key TEXT PRIMARY KEY,
    planned_term    TEXT,
    planned_course  TEXT,
    note            TEXT,
    updated_at      TEXT
);

CREATE TABLE degree_target (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    -- e.g. 'Fall 2027'. The term the whole audit is measured against.
    target_term TEXT,
    updated_at  TEXT
);
