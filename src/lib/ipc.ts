/**
 * ipc.ts — the only file in the frontend allowed to call `invoke()`.
 *
 * Called by: hooks, and (rarely) routes.
 * Calls: @tauri-apps/api/core → the `#[tauri::command]` functions in
 * `src-tauri/src/commands/`.
 *
 * Why the funnel (SPEC.md §10): a raw `invoke("get_courses")` in a component is
 * a stringly-typed call with an `any` return. Renaming a command then fails
 * silently in three places. Every command gets a wrapper here with a real
 * return type, and `grep invoke( src/` should only ever match this file.
 *
 * Commands land here as milestones complete. M0 has the two the theme system
 * needs plus a sync-status read the shell footer renders.
 */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type {
  AuthStatus,
  DegreeAudit,
  CalendarItem,
  CourseDetailPayload,
  Dashboard,
  DebugDump,
  DetectResult,
  DebugOverview,
  HarvestReport,
  IcsSummary,
  CourseSyllabus,
  InstructorRow,
  PlannerBlock,
  SolverAnswer,
  SyllabusFileRow,
  SyncStatus,
  ThemeMode,
  TriageRow,
} from "@/types";

/**
 * True when running inside the Tauri webview, false under a plain `vite dev`.
 *
 * Bare `vite dev` in a browser is genuinely useful for pushing pixels around
 * without a Rust rebuild between every change, so instead of letting every
 * command throw "window.__TAURI_INTERNALS__ is undefined", we detect it once
 * and let each wrapper decide on a sensible standalone answer.
 */
export const IS_TAURI =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Typed `invoke`, with the browser-only case handled by the caller.
 *
 * @param cmd    the `#[tauri::command]` name, snake_case as Rust declares it
 * @param args   camelCase keys; Tauri converts them to snake_case parameters
 * @throws whatever the Rust side returned as `Err`, as a string
 */
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!IS_TAURI) {
    throw new Error(`ipc: "${cmd}" is unavailable outside the Tauri webview`);
  }
  return tauriInvoke<T>(cmd, args);
}

/* ────────────────────────────────────────────────────────────────────────────
   Settings
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The persisted theme preference, or null if the user has never set one.
 *
 * Resolves to null rather than throwing outside Tauri, because the theme
 * provider treats "no stored preference" as a normal state and the localStorage
 * mirror is a perfectly good answer during browser-only UI work.
 */
export async function getPreferredTheme(): Promise<ThemeMode | null> {
  if (!IS_TAURI) return null;
  return call<ThemeMode | null>("get_preferred_theme");
}

/** Persist the theme preference. Fire-and-forget; failure is not user-visible. */
export async function setPreferredTheme(mode: ThemeMode): Promise<void> {
  if (!IS_TAURI) return;
  return call<void>("set_preferred_theme", { mode });
}

/* ────────────────────────────────────────────────────────────────────────────
   Sync (§6)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Current sync phase, last success time, and which auth tier produced the data.
 *
 * Outside Tauri this returns a plausible idle status so the shell footer has
 * something to render during browser-only UI work, rather than an error state
 * that would make the footer look permanently broken.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  if (!IS_TAURI) {
    return { phase: "idle", lastSyncedAt: null, message: null, authMode: "none" };
  }
  return call<SyncStatus>("get_sync_status");
}

/* ────────────────────────────────────────────────────────────────────────────
   Auth (§2.0)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Current auth tier and health, for first render. Live updates arrive on the
 * "auth:status-changed" event — see hooks/useAuth.
 *
 * Outside Tauri: a disconnected status, so Settings renders sensibly in
 * browser-only UI work.
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  if (!IS_TAURI) {
    return { tier: "none", alive: false, validatedAs: null, storage: null, message: null };
  }
  return call<AuthStatus>("auth_status");
}

/**
 * Open the SJSU login window (Tier 1). Rust polls for the session cookie,
 * validates it against Canvas, stores it, and closes the window itself;
 * progress lands on the "auth:status-changed" event. Resolves as soon as the
 * window is open, not when login completes.
 */
export async function openCanvasLogin(): Promise<void> {
  return call<void>("open_canvas_login");
}

/** One manual harvest attempt against the open login window (debug surface). */
export async function harvestSession(): Promise<HarvestReport> {
  return call<HarvestReport>("harvest_session");
}

/** Tier 0: validate and store an admin-issued access token. Throws with a
 *  display-ready message if Canvas rejects it. */
export async function setAccessToken(token: string): Promise<void> {
  return call<void>("set_access_token", { token });
}

/** Sign out: wipes the stored credential (both slots, both backends). Local
 *  data is untouched — losing a session never means losing data. */
export async function clearSession(): Promise<void> {
  return call<void>("clear_session");
}

/**
 * Kick a full Canvas sync. Fire-and-forget: progress arrives via the
 * "sync:status-changed" event and getSyncStatus polling.
 */
export async function triggerSync(): Promise<void> {
  return call<void>("trigger_sync");
}

/** Import the Tier 2 calendar feed now. Resolves with what it did. */
export async function triggerIcsImport(): Promise<IcsSummary> {
  return call<IcsSummary>("trigger_ics_import");
}

/** The stored Tier 2 feed URL, if any. */
export async function getCalendarFeedUrl(): Promise<string | null> {
  if (!IS_TAURI) return null;
  return call<string | null>("get_calendar_feed_url");
}

/** Store (or clear, with null) the Tier 2 feed URL. */
export async function setCalendarFeedUrl(url: string | null): Promise<void> {
  return call<void>("set_calendar_feed_url", { url });
}

/* ────────────────────────────────────────────────────────────────────────────
   Manual entry (§3) — first-class under Tier 2, not a debug feature.
   Each save resolves with the row id (fresh when created).
   ──────────────────────────────────────────────────────────────────────────── */

export async function saveManualCourse(args: {
  id?: string;
  name: string;
  courseCode?: string;
  applyGroupWeights?: boolean;
}): Promise<string> {
  return call<string>("save_manual_course", args);
}

export async function saveManualGroup(args: {
  id?: string;
  courseId: string;
  name: string;
  groupWeight?: number;
}): Promise<string> {
  return call<string>("save_manual_group", args);
}

export async function saveManualAssignment(args: {
  id?: string;
  courseId: string;
  groupId?: string;
  name: string;
  dueAt?: string;
  pointsPossible?: number;
}): Promise<string> {
  return call<string>("save_manual_assignment", args);
}

/** Record a score by hand; null explicitly un-grades. */
export async function saveManualScore(assignmentId: string, score: number | null): Promise<void> {
  return call<void>("save_manual_score", { assignmentId, score });
}

/* ────────────────────────────────────────────────────────────────────────────
   Grades + screens (§4, §5) — all numbers computed in Rust.
   ──────────────────────────────────────────────────────────────────────────── */

/** Every course graded and ranked by risk, plus the nav counts. Outside
 *  Tauri: an empty dashboard so the shell renders in browser-only work. */
export async function courseSummaries(): Promise<Dashboard> {
  if (!IS_TAURI) return { courses: [], openTotal: 0, dueThisWeek: 0 };
  return call<Dashboard>("course_summaries");
}

/** Everything the course-detail screen needs in one read. */
export async function courseDetail(courseId: string): Promise<CourseDetailPayload> {
  return call<CourseDetailPayload>("course_detail", { courseId });
}

/** "What do I need?" — null assignmentId = averaged over everything left. */
export async function whatDoINeed(
  courseId: string,
  targetPct: number,
  assignmentId: string | null,
): Promise<SolverAnswer> {
  return call<SolverAnswer>("what_do_i_need", { courseId, targetPct, assignmentId });
}

/** Hide/unhide a course everywhere (view preference, never a deletion). */
export async function setCourseHidden(courseId: string, hidden: boolean): Promise<void> {
  return call<void>("set_course_hidden", { courseId, hidden });
}

/** Set a course's target grade. */
export async function setTarget(
  courseId: string,
  targetPct: number,
  targetLetter?: string,
): Promise<void> {
  return call<void>("set_target", { courseId, targetPct, targetLetter });
}

/** The ranked triage list. Outside Tauri: empty. */
export async function triageRows(): Promise<TriageRow[]> {
  if (!IS_TAURI) return [];
  return call<TriageRow[]>("triage_rows");
}

/** Every dated assignment, ascending. Outside Tauri: empty. */
export async function calendarItems(): Promise<CalendarItem[]> {
  if (!IS_TAURI) return [];
  return call<CalendarItem[]>("calendar_items");
}

/** Propose class meeting slots from Canvas calendar events + syllabi. */
export async function detectClassSlots(): Promise<DetectResult> {
  return call<DetectResult>("detect_class_slots");
}

/** Every weekly-planner block. Outside Tauri: empty. */
export async function plannerBlocks(): Promise<PlannerBlock[]> {
  if (!IS_TAURI) return [];
  return call<PlannerBlock[]>("planner_blocks");
}

/** Create (id undefined) or update one planner block. Resolves with its id. */
export async function savePlannerBlock(block: {
  id?: number;
  kind: "class" | "event";
  courseId?: string | null;
  title: string;
  location?: string | null;
  weekday?: number | null;
  date?: string | null;
  startMin: number;
  endMin: number;
  note?: string | null;
}): Promise<number> {
  return call<number>("save_planner_block", block);
}

/** Delete one planner block. */
export async function deletePlannerBlock(id: number): Promise<void> {
  return call<void>("delete_planner_block", { id });
}

/** Instructors across all courses. Outside Tauri: empty. */
export async function listInstructors(): Promise<InstructorRow[]> {
  if (!IS_TAURI) return [];
  return call<InstructorRow[]>("list_instructors");
}

/** Write the semester .ics to a chosen path. Resolves with the event count. */
export async function exportSemesterIcs(path: string): Promise<number> {
  return call<number>("export_semester_ics", { path });
}

/** Registrar requirement statuses from the imported MyProgress report —
 *  empty until a report is imported. Feeds the plan merge. */
export async function gradRequirementStatuses(): Promise<
  { title: string; status: string }[]
> {
  if (!IS_TAURI) return [];
  return call("grad_requirement_statuses");
}

/** Stored graduation-plan overrides (status / term moves). */
export async function gradOverrides(): Promise<
  { code: string; status: string | null; termId: string | null }[]
> {
  if (!IS_TAURI) return [];
  return call("grad_overrides");
}

/** Set (or clear, with both null) one course's plan override. */
export async function setGradOverride(
  code: string,
  status: string | null,
  termId: string | null,
): Promise<void> {
  return call<void>("set_grad_override", { code, status, termId });
}

/** Syllabus material (page HTML + stored documents) per visible course. */
export async function syllabi(): Promise<CourseSyllabus[]> {
  if (!IS_TAURI) return [];
  return call<CourseSyllabus[]>("syllabi");
}

/** Pull syllabus files for a course from Canvas now. Resolves with how many
 *  new documents were stored (0 = none found / files closed to students). */
export async function fetchSyllabusFromCanvas(courseId: string): Promise<number> {
  return call<number>("fetch_syllabus_from_canvas", { courseId });
}

/** Import a syllabus document from a local path (from the file dialog). */
export async function importSyllabusFile(
  courseId: string,
  path: string,
): Promise<SyllabusFileRow> {
  return call<SyllabusFileRow>("import_syllabus_file", { courseId, path });
}

/** Star/unstar "this is MY professor" (local-only). */
export async function setInstructorStarred(
  id: string,
  courseId: string,
  starred: boolean,
): Promise<void> {
  return call<void>("set_instructor_starred", { id, courseId, starred });
}

/** Save the local-only note on an instructor. */
export async function saveInstructorNote(
  id: string,
  courseId: string,
  note: string | null,
): Promise<void> {
  return call<void>("save_instructor_note", { id, courseId, note });
}

/** Save the local-only time estimate on an assignment (triage's divisor). */
export async function setEstimate(assignmentId: string, estMinutes: number | null): Promise<void> {
  return call<void>("set_estimate", { assignmentId, estMinutes });
}

/* ────────────────────────────────────────────────────────────────────────────
   Debug surface (dev builds only — the /dev/debug route).
   ──────────────────────────────────────────────────────────────────────────── */

export async function debugOverview(): Promise<DebugOverview> {
  return call<DebugOverview>("debug_overview");
}

export async function debugDump(): Promise<DebugDump> {
  return call<DebugDump>("debug_dump");
}

/** Force the session-dead state to exercise the reconnect flow. */
export async function debugForceReconnect(): Promise<void> {
  return call<void>("debug_force_reconnect");
}
// TODO(M2): getCourseGrades, whatDoINeed
// TODO(M4): exportIcs

/* ────────────────────────────────────────────────────────────────────────────
   Degree progress (MyProgress import)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The stored degree audit, or null when nothing has been imported yet.
 * Outside Tauri: null, so the empty state renders in `vite dev`.
 */
export async function getDegreeAudit(): Promise<DegreeAudit | null> {
  if (!IS_TAURI) return null;
  return call<DegreeAudit | null>("get_degree_audit");
}

/**
 * Parse and store a pasted MyProgress page, returning the audit computed from
 * it. Rejects with a CommandError when the text is not a MyProgress report.
 */
export async function importMyProgress(text: string): Promise<DegreeAudit> {
  return call<DegreeAudit>("import_myprogress", { text });
}

/** Set the graduation term the audit is measured against, e.g. "Fall 2027". */
export async function setTargetTerm(term: string): Promise<void> {
  await call<void>("set_target_term", { term });
}
