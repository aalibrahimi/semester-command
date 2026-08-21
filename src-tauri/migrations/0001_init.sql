-- 0001_init — the full M1 schema (SPEC.md §3).
--
-- Conventions, applied everywhere:
--   * Canvas IDs are TEXT. Every request sends `application/json+canvas-string-ids`
--     precisely so IDs never exist as numbers anywhere in the pipeline.
--   * Timestamps are RFC 3339 TEXT in UTC. SQLite has no date type; TEXT in one
--     format sorts correctly and round-trips through chrono.
--   * Booleans are INTEGER 0/1, nullable where Canvas may omit the field.
--   * `source` is 'api' | 'ics' | 'manual' on every synced table. Rows the user
--     typed in must survive an API sync and be visibly marked in the UI (§3).
--   * `raw_json` holds the exact Canvas payload the row was parsed from, so an
--     unanticipated shape is a parser fix, not lost data (§2.2).
--   * Score fields are nullable REAL. NULL means "not graded", never zero —
--     that distinction is the entire point of this app (§4.2).

CREATE TABLE courses (
    id                  TEXT PRIMARY KEY,
    name                TEXT,
    course_code         TEXT,
    term                TEXT,
    -- NULL = Canvas didn't say; the grade engine must then infer points mode.
    apply_group_weights INTEGER,
    -- Canvas's own numbers, kept to reconcile our math against (§4.2).
    current_score       REAL,
    final_score         REAL,
    syllabus_html       TEXT,
    source              TEXT NOT NULL DEFAULT 'api',
    raw_json            TEXT,
    synced_at           TEXT
);

CREATE TABLE assignment_groups (
    id           TEXT PRIMARY KEY,
    course_id    TEXT NOT NULL REFERENCES courses(id),
    name         TEXT,
    group_weight REAL,
    position     INTEGER,
    source       TEXT NOT NULL DEFAULT 'api',
    raw_json     TEXT,
    synced_at    TEXT
);

CREATE TABLE assignments (
    id                    TEXT PRIMARY KEY,
    course_id             TEXT NOT NULL REFERENCES courses(id),
    -- Nullable: ICS rows arrive before groups exist, and some Canvas
    -- assignments genuinely have no group visible to students.
    group_id              TEXT REFERENCES assignment_groups(id),
    name                  TEXT,
    due_at                TEXT,
    points_possible       REAL,
    omit_from_final_grade INTEGER,
    -- JSON array as text, e.g. ["online_upload"]. Display-only.
    submission_types      TEXT,
    html_url              TEXT,
    -- rubric + rubric_settings from the assignment object, verbatim.
    rubric_json           TEXT,
    source                TEXT NOT NULL DEFAULT 'api',
    raw_json              TEXT,
    synced_at             TEXT
);

CREATE TABLE submissions (
    assignment_id  TEXT PRIMARY KEY REFERENCES assignments(id),
    -- NULL score = not graded. See header note; never default this.
    score          REAL,
    grade          TEXT,
    submitted_at   TEXT,
    graded_at      TEXT,
    workflow_state TEXT,
    excused        INTEGER,
    missing        INTEGER,
    late           INTEGER,
    source         TEXT NOT NULL DEFAULT 'api',
    raw_json       TEXT,
    synced_at      TEXT
);

-- One row per (person, course): the same professor teaching two courses is
-- two rows, because role and the user's notes are per-course.
CREATE TABLE instructors (
    id                TEXT NOT NULL,
    course_id         TEXT NOT NULL REFERENCES courses(id),
    name              TEXT,
    email             TEXT,
    role              TEXT,
    -- Local-only field. The upsert deliberately never touches it (§3).
    office_hours_note TEXT,
    source            TEXT NOT NULL DEFAULT 'api',
    raw_json          TEXT,
    synced_at         TEXT,
    PRIMARY KEY (id, course_id)
);

-- ── Local-only tables. Never written by sync, must survive it (§3). ────────

CREATE TABLE targets (
    course_id        TEXT PRIMARY KEY REFERENCES courses(id),
    target_letter    TEXT,
    target_pct       REAL,
    -- Per-course grade cutoffs as JSON, editable because SJSU instructors set
    -- their own and plenty curve (§4.4). NULL = the standard scale.
    grade_scale_json TEXT
);

CREATE TABLE estimates (
    assignment_id TEXT PRIMARY KEY REFERENCES assignments(id),
    est_minutes   INTEGER,
    my_note       TEXT
);

CREATE TABLE sync_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    -- What was being synced: 'courses', 'course:12345:assignments', 'ics', …
    entity      TEXT NOT NULL,
    ok          INTEGER NOT NULL DEFAULT 0,
    error       TEXT
);

CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_due    ON assignments(due_at);
CREATE INDEX idx_groups_course      ON assignment_groups(course_id);
CREATE INDEX idx_instructors_course ON instructors(course_id);
CREATE INDEX idx_sync_log_started   ON sync_log(started_at);
