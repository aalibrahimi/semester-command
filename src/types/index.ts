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

/** What a Tier 2 feed import did. */
export interface IcsSummary {
  assignments: number;
  coursesCreated: number;
  skippedEvents: number;
}
