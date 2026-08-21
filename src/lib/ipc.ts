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
import type { AuthStatus, HarvestReport, SyncStatus, ThemeMode } from "@/types";

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

// TODO(M1): triggerSync
// TODO(M1): listCourses, listAssignments, listInstructors
// TODO(M2): getCourseGrades, whatDoINeed
// TODO(M4): exportIcs
