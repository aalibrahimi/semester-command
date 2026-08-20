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
import type { SyncStatus, ThemeMode } from "@/types";

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

// TODO(M1): triggerSync, getAuthMode, openLoginWindow, clearSession
// TODO(M1): listCourses, listAssignments, listInstructors
// TODO(M2): getCourseGrades, whatDoINeed
// TODO(M4): exportIcs
