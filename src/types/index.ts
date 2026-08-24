/**
 * types/index.ts — TypeScript mirrors of the values `#[tauri::command]`
 * functions return (SPEC.md §10).
 *
 * Called by: lib/ipc.ts, hooks, components.
 * Calls: nothing.
 *
 * These are hand-maintained mirrors of the Rust structs in
 * `src-tauri/src/commands/`. When you change a command's return shape, change
 * it here in the same commit — the two are joined only by convention, and a
 * silent mismatch shows up as `undefined` at runtime rather than a type error.
 * Every Rust struct that crosses the boundary is `#[serde(rename_all =
 * "camelCase")]`, so field names here are camelCase.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Theme (§9.6)
   ──────────────────────────────────────────────────────────────────────────── */

/** What the user picked. Persisted. */
export type ThemeMode = "light" | "dark" | "system";

/** What is actually painted. "system" has already been resolved away. */
export type ResolvedTheme = "light" | "dark";

/* ────────────────────────────────────────────────────────────────────────────
   Signal palette (§9.1) — the vocabulary the backend uses to describe risk.
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * A course's standing. Computed in Rust (`grades.rs`), never in TypeScript —
 * the frontend picks a colour from this, it does not decide what colour to pick.
 *
 *   onTrack   projected grade meets or beats target
 *   atRisk    within 5 points of falling short
 *   critical  target no longer reachable, or work is missing/overdue
 *   locked    graded and final, nothing left to change
 */
export type SignalStatus = "onTrack" | "atRisk" | "critical" | "locked";

/* ────────────────────────────────────────────────────────────────────────────
   Sync (§6) — the footer's whole vocabulary.
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Where the sync engine is right now.
 *
 * `reconnectRequired` is the important one: it means the Canvas session died
 * (401, a 302 to the SSO host, or HTML where JSON was expected) and every grade
 * on screen is stale. It is a first-class state rather than an error, because
 * SSO sessions expiring mid-semester is expected behaviour, not a fault (§2.0).
 */
export type SyncPhase = "idle" | "syncing" | "reconnectRequired" | "error";

export interface SyncStatus {
  phase: SyncPhase;
  /** ISO-8601. Null before the first successful sync. */
  lastSyncedAt: string | null;
  /** Human-readable, already localised for display. Null unless phase is "error". */
  message: string | null;
  /** Which auth path produced the current data (§2.0). Drives the "not from
   *  Canvas" marks in the UI. */
  authMode: AuthMode;
}

/**
 * The auth tier currently in use (§2.0). Both tiers sit behind one interface in
 * Rust; this is only so the UI can be honest about where numbers came from.
 */
export type AuthMode = "token" | "session" | "ics" | "none";

/**
 * Provenance of a row (§3). Every synced table carries this, and anything not
 * `api` is visibly marked in the UI — the user always needs to know which
 * numbers Canvas confirmed and which they typed in themselves.
 */
export type Source = "api" | "ics" | "manual";

/* ────────────────────────────────────────────────────────────────────────────
   Auth (§2.0) — mirrors `commands/auth.rs`.
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The auth picture Settings and the reconnect banner render. Emitted on the
 * "auth:status-changed" Tauri event after every transition, and returned by
 * `auth_status` for first render. The credential itself never crosses the
 * IPC boundary — this is everything about it except the secret.
 */
export interface AuthStatus {
  /** Which tier holds a credential right now. "ics" never appears here — that
   *  tier is a feed URL in settings, not a credential (see SyncStatus). */
  tier: "token" | "session" | "none";
  /** Is the credential believed to currently work? False → reconnect banner. */
  alive: boolean;
  /** Display name Canvas confirmed via GET /users/self, once validated. */
  validatedAs: string | null;
  /** Where the credential is stored. "file" means the OS keyring failed (or
   *  the cookie header exceeded Windows' credential size cap) and the UI
   *  should say the fallback is in use. */
  storage: "keyring" | "file" | null;
  /** Display-ready progress or error line ("Waiting for you to sign in…"). */
  message: string | null;
}

/**
 * Result of a manual harvest attempt (dev/debug surface). Cookie *names* only
 * — the M1 acceptance list wants them reported, and names are not secrets.
 */
export interface HarvestReport {
  connected: boolean;
  cookieNames: string[];
  validatedAs: string | null;
}

/* ────────────────────────────────────────────────────────────────────────────
   Synced rows (§3) — mirrors of the Rust structs in db/schema.rs.
   All camelCase via serde; every row carries `source` so the UI can mark
   anything Canvas didn't confirm.
   ──────────────────────────────────────────────────────────────────────────── */

export interface CourseRow {
  id: string;
  name: string | null;
  courseCode: string | null;
  term: string | null;
  /** null = Canvas didn't say (grade engine treats as points mode). */
  applyGroupWeights: boolean | null;
  /** Canvas's own computed scores, for reconciliation — not ours. */
  currentScore: number | null;
  finalScore: number | null;
  syllabusHtml: string | null;
  source: Source;
  rawJson: string | null;
  syncedAt: string | null;
}

export interface AssignmentGroupRow {
  id: string;
  courseId: string;
  name: string | null;
  groupWeight: number | null;
  position: number | null;
  source: Source;
  rawJson: string | null;
  syncedAt: string | null;
}

export interface AssignmentRow {
  id: string;
  courseId: string;
  groupId: string | null;
  name: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  omitFromFinalGrade: boolean | null;
  /** JSON array as text, e.g. '["online_upload"]'. */
  submissionTypes: string | null;
  htmlUrl: string | null;
  rubricJson: string | null;
  source: Source;
  rawJson: string | null;
  syncedAt: string | null;
}

export interface SubmissionRow {
  assignmentId: string;
  /** null = not graded. Never conflate with 0. */
  score: number | null;
  grade: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  workflowState: string | null;
  excused: boolean | null;
  missing: boolean | null;
  late: boolean | null;
  source: Source;
  rawJson: string | null;
  syncedAt: string | null;
}

export interface InstructorRow {
  id: string;
  courseId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  /** Local-only; sync never touches it. */
  officeHoursNote: string | null;
  /** Local-only "this is MY professor" flag. */
  starred: boolean;
  source: Source;
  rawJson: string | null;
  syncedAt: string | null;
}

/* ────────────────────────────────────────────────────────────────────────────
   Sync engine + debug surface — mirrors of commands/{sync,data}.rs.
   ──────────────────────────────────────────────────────────────────────────── */

export interface SyncLogRow {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  entity: string;
  ok: boolean;
  error: string | null;
}

export interface EntityStat {
  entity: string;
  rows: number;
  lastSyncedAt: string | null;
}

export interface DebugOverview {
  stats: EntityStat[];
  syncLog: SyncLogRow[];
}

export interface DebugDump {
  courses: CourseRow[];
  assignmentGroups: AssignmentGroupRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  instructors: InstructorRow[];
}

/** One professor comment on a submission, fetched live (never synced). */
export interface SubmissionComment {
  id: string;
  author: string | null;
  comment: string;
  createdAt: string | null;
}

/* ────────────────────────────────────────────────────────────────────────────
   Finances — a MySJSU snapshot (no API there; captured point-in-time and
   rendered with its as-of date). Rust stores this as opaque JSON. */

export interface FinanceCharge {
  label: string;
  amount: number;
  dueDate: string | null;
}

export interface FinanceAward {
  name: string;
  category: string;
  offered: number;
  accepted: number;
  disbDate: string | null;
}

export interface FinanceActivityRow {
  date: string;
  item: string;
  term: string;
  kind: "charge" | "payment" | "refund";
  amount: number;
  /** One muted line explaining what this item actually is. */
  note?: string;
}

/** One bar in the aid-by-term comparison — the "where did my money go" chart. */
export interface FinanceAidByTerm {
  label: string;
  amount: number;
  tone?: "good" | "warn" | "urgent";
}

export interface FinanceSnapshot {
  asOf: string;
  source: string;
  term: string;
  dueNow: number;
  futureDue: number;
  pastDue: boolean;
  dueDate: string | null;
  holds: number;
  todos: number;
  charges: FinanceCharge[];
  aidYear: string;
  awards: FinanceAward[];
  awardsYearOffered: number;
  awardsYearAccepted: number;
  activity: FinanceActivityRow[];
  aidByTerm?: FinanceAidByTerm[];
  findings: FinanceFinding[];
  loans?: FinanceLoans;
  tracking?: FinanceTrackingItem[];
  fafsa?: FinanceFafsa;
  /** The portal date range the activity was captured over ("YYYY-MM-DD"). */
  capturedFrom?: string;
  capturedTo?: string;
}

/** The next FAFSA cycle — the one deadline that caused this year's mess. */
export interface FinanceFafsa {
  /** e.g. "2027–28". */
  year: string;
  /** "YYYY-MM-DD" the form opens. */
  opens: string;
  /** "YYYY-MM-DD" Cal Grant / CSAC priority deadline. */
  priorityDeadline: string;
  filed: boolean;
}

/** Existing federal loans, from studentaid.gov. */
export interface FinanceLoans {
  totalBalance: number;
  principal: number;
  interest: number;
  count: number;
  servicer: string;
  rateRange: string;
  status: string;
  byYear: { year: string; amount: number }[];
  asOf: string;
}

/** One line in the paper trail: what's been done, what's waiting. */
export interface FinanceTrackingItem {
  label: string;
  detail?: string;
  state: "done" | "pending" | "todo";
  date?: string;
}

export interface FinanceFinding {
  /** Short bright headline — the claim. */
  title: string;
  /** The dimmed explanation under it. */
  detail: string;
  /** Colors the item: good news, needs action, urgent, or opportunity. */
  tone?: "good" | "warn" | "urgent" | "info";
}

/** What a Tier 2 feed import did. */
export interface IcsSummary {
  assignments: number;
  coursesCreated: number;
  skippedEvents: number;
}

/* ────────────────────────────────────────────────────────────────────────────
   Grades (§4) — mirrors of grades.rs and commands/grades.rs. Every number
   here was computed in Rust; the frontend renders, never derives.
   ──────────────────────────────────────────────────────────────────────────── */

export type GradingMode = "weighted" | "points";

export interface CourseGrade {
  /** Ungraded excluded — what Canvas shows. Null = nothing graded yet. */
  currentPct: number | null;
  /** Every ungraded counted as zero — the honest number. */
  projectedPct: number;
  /** currentPct − projectedPct, precomputed in Rust. */
  gapPct: number | null;
  mode: GradingMode;
  /** Canvas's own current_score, kept beside ours, never replacing it. */
  canvasCurrentPct: number | null;
  /** Set when ours and Canvas's differ by >0.1 — the mismatch banner. */
  reconciliationDelta: number | null;
}

export interface CourseSummary {
  id: string;
  courseCode: string | null;
  name: string | null;
  term: string | null;
  source: Source;
  grade: CourseGrade;
  maxPossiblePct: number;
  currentLetter: string | null;
  projectedLetter: string;
  targetPct: number;
  targetLetter: string;
  status: SignalStatus;
  openCount: number;
  missingCount: number;
  /** False for shells (announcements, advising) — de-emphasised in the UI. */
  gradeable: boolean;
  /** Local view preference — hidden courses render only in the Courses
   *  page's collapsed section. */
  hidden: boolean;
}

export interface Dashboard {
  /** Sorted by risk in Rust; render in order. */
  courses: CourseSummary[];
  openTotal: number;
  dueThisWeek: number;
}

export interface GroupDetail {
  id: string;
  name: string | null;
  weight: number | null;
  currentPct: number | null;
  gradedCount: number;
  totalCount: number;
}

export interface AssignmentDetail {
  id: string;
  groupId: string | null;
  name: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  score: number | null;
  excused: boolean;
  missing: boolean;
  late: boolean;
  submitted: boolean;
  omitted: boolean;
  htmlUrl: string | null;
  source: Source;
  hasRubric: boolean;
  rubricJson: string | null;
  /** Instructor's description as Canvas HTML, from the stored raw JSON. */
  descriptionHtml: string | null;
  /** JSON array as text, e.g. '["online_upload"]'. */
  submissionTypes: string | null;
  /** Percentage points of the final grade riding on this assignment. */
  impactPct: number;
  estMinutes: number | null;
}

export interface CourseDetailPayload {
  summary: CourseSummary;
  groups: GroupDetail[];
  assignments: AssignmentDetail[];
  instructors: InstructorRow[];
}

/** The solver's answer (§4.3) — blunt on purpose. */
export type SolverAnswer =
  | { outcome: "required"; pct: number; pointsNeeded: number | null; pointsPossible: number | null }
  | { outcome: "unreachable"; bestPossiblePct: number; bestPossibleLetter: string }
  | { outcome: "alreadyLocked"; floorPct: number; floorLetter: string };

/* ────────────────────────────────────────────────────────────────────────────
   Triage + calendar — mirrors of triage.rs and commands/data.rs.
   ──────────────────────────────────────────────────────────────────────────── */

export type TriageState = "missing" | "overdue" | "open";

export interface TriageRow {
  assignmentId: string;
  courseId: string;
  courseCode: string | null;
  name: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  /** "worth X% of your final grade". */
  impactPct: number;
  estMinutes: number | null;
  state: TriageState;
  htmlUrl: string | null;
  /** The Rust-computed rank score, for the debug view. */
  score: number;
}

export interface CalendarItem {
  assignmentId: string;
  courseId: string;
  courseCode: string | null;
  name: string | null;
  dueAt: string;
  pointsPossible: number | null;
  submitted: boolean;
  graded: boolean;
  source: Source;
}


/* ────────────────────────────────────────────────────────────────────────────
   Syllabi — mirrors of commands/data.rs CourseSyllabus + db SyllabusFileRow.
   ──────────────────────────────────────────────────────────────────────────── */

export interface SyllabusFileRow {
  id: number;
  courseId: string;
  canvasFileId: string | null;
  filename: string;
  contentType: string | null;
  /** Absolute path on disk — open with the opener plugin. */
  localPath: string;
  /** Plain text for search; null when extraction isn't supported. */
  extractedText: string | null;
  source: Source;
  fetchedAt: string | null;
}

export interface CourseSyllabus {
  courseId: string;
  courseCode: string | null;
  courseName: string | null;
  /** The Canvas syllabus page HTML — rarely used at SJSU. */
  syllabusHtml: string | null;
  files: SyllabusFileRow[];
}

/* ────────────────────────────────────────────────────────────────────────────
   Sync digest (§6) — mirror of sync.rs SyncChanges, delivered on the
   "sync:digest" event after any run that changed something.
   ──────────────────────────────────────────────────────────────────────────── */

export interface GradeEvent {
  courseCode: string | null;
  assignmentName: string | null;
  score: number | null;
  pointsPossible: number | null;
}

export interface CourseMove {
  courseId: string;
  courseCode: string | null;
  oldPct: number;
  newPct: number;
}

export interface SyncChanges {
  newGrades: GradeEvent[];
  courseMoves: CourseMove[];
  missingFlips: GradeEvent[];
  newAssignments: number;
}

/* ────────────────────────────────────────────────────────────────────────────
   Degree progress — mirror of commands/degree.rs.

   Sourced from a pasted MySJSU MyProgress report, not from Canvas: Canvas has
   no concept of degree requirements. Nothing here is synced, and nothing here
   is computed in TypeScript — `unitsFromCourses` and the retake flags come
   from `src-tauri/src/degree.rs`.
   ──────────────────────────────────────────────────────────────────────────── */

/** MyProgress's own word for a requirement's state. `error` means "not yet
 *  completed" — it is not a fault. */
export type ReqStatus = "taken" | "enrolled" | "planned" | "error" | "exception";

export type DegreeCourseStatus = "taken" | "enrolled" | "planned" | "transferred";

/** Which terms a course runs in, parsed from the report's `When` column. */
export interface Offering {
  /** The cell verbatim, shown in a tooltip so a bad parse is visible. */
  raw: string;
  fall: boolean;
  spring: boolean;
  summer: boolean;
  /** `Fall in odd years` halves the chances of ever catching it. */
  parity: "odd" | "even" | null;
  /** `Variable Offering See Advisor` — no committed cadence. */
  variable: boolean;
  /** A concrete term like `Fall 2026`: this row is a current enrolment. */
  term: string | null;
}

export interface DegreeCourse {
  code: string;
  description: string | null;
  units: number | null;
  offering: Offering | null;
  /** null = not attempted. Never 0. */
  grade: string | null;
  status: DegreeCourseStatus | null;
  designation: string | null;
}

/** A paginated option table we only saw part of — the user needs to re-paste
 *  with **View All** clicked. */
export interface Truncation {
  shown: number;
  total: number;
}

export interface AuditItem {
  key: string;
  title: string;
  unitsNeeded: number | null;
  /** Minimum passing grade, inherited from the enclosing block. */
  minGrade: string | null;
  /** Set when a prior attempt failed this requirement's grade floor. This is a
   *  **retake**, not something never taken — the distinction the whole
   *  feature turns on. */
  retakeOf: DegreeCourse | null;
  /** Every eligible option runs in exactly one term per year. */
  singleTermOnly: boolean;
  /** Every eligible option is `Variable Offering See Advisor`. */
  needsAdvisor: boolean;
  options: DegreeCourse[];
  truncated: Truncation | null;
}

export interface DegreeBucket {
  key: string;
  title: string;
  unitsNeeded: number | null;
}

export interface DegreeHeader {
  studentName: string | null;
  studentId: string | null;
  career: string | null;
  program: string | null;
  plan: string | null;
  catalogTerm: string | null;
  /** `Not Applied` means the degree cannot be conferred however the
   *  coursework lands. */
  graduationStatus: string | null;
  lastTermRegistered: string | null;
  academicStanding: string | null;
  overallGpa: number | null;
  sjsuGpa: number | null;
  generatedAt: string | null;
}

export interface DegreeAudit {
  header: DegreeHeader;
  outstanding: AuditItem[];
  /** Unit totals satisfied *by* the outstanding courses, not alongside them. */
  buckets: DegreeBucket[];
  unitsFromCourses: number;
  /** Elective room the buckets demand that no itemised requirement covers. */
  unallocatedBucketUnits: number;
  targetTerm: string | null;
  importedAt: string | null;
  generatedAt: string | null;
  truncatedRequirements: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
   Weekly planner (migration 0009) — mirror of PlannerBlockRow.
   ──────────────────────────────────────────────────────────────────────────── */

export interface PlannerBlock {
  id: number;
  /** 'class' (recurring course meeting) | 'event' (anything else). */
  kind: "class" | "event";
  courseId: string | null;
  title: string;
  location: string | null;
  /** 0 = Monday … 6 = Sunday for weekly blocks; null for one-offs. */
  weekday: number | null;
  /** 'YYYY-MM-DD' for one-off blocks; null for weekly. */
  date: string | null;
  /** Minutes from midnight. */
  startMin: number;
  endMin: number;
  note: string | null;
}

/** One proposed class meeting slot from detection (Canvas events or
 *  syllabus text). Proposals only — the user confirms each. */
export interface ClassSlotCandidate {
  courseId: string;
  courseCode: string | null;
  weekday: number;
  startMin: number;
  endMin: number;
  location: string | null;
  source: "canvas" | "syllabus";
  confidence: number;
}

export interface DetectResult {
  candidates: ClassSlotCandidate[];
  /** False when Canvas was unreachable — results are syllabus-only. */
  canvasChecked: boolean;
}
