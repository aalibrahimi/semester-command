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
