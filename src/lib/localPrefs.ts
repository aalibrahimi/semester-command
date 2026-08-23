/**
 * localPrefs — view-layer preferences that live in localStorage, by design.
 *
 * Called by: Triage, CourseDetail, Sidebar, Courses — anywhere nicknames or
 * the local "done" marks matter.
 * Calls: localStorage.
 *
 * These are deliberately NOT in the database: the design review scoped
 * nicknames and mark-done as presentation state ("design changes only — no
 * data model"). Losing them costs a re-type, never data. If either ever
 * needs to survive a reinstall, promoting to a migration is a one-file
 * change on top of this interface.
 *
 * A single custom DOM event keeps every mounted consumer in sync — the same
 * pattern useCourses uses for cross-component refresh.
 */
import { useSyncExternalStore } from "react";

const NICKNAMES_KEY = "sc.nicknames"; // { [courseId]: string }
const DONE_KEY = "sc.done"; // string[] of assignment ids
const EVENT = "localprefs:changed";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/* ── Nicknames ───────────────────────────────────────────────────────────── */

let nicknamesCache: Record<string, string> | null = null;
function nicknamesSnapshot(): Record<string, string> {
  // useSyncExternalStore needs referential stability between events.
  nicknamesCache ??= read<Record<string, string>>(NICKNAMES_KEY, {});
  return nicknamesCache;
}

export function setNickname(courseId: string, nickname: string | null): void {
  const next = { ...nicknamesSnapshot() };
  if (nickname && nickname.trim() !== "") next[courseId] = nickname.trim();
  else delete next[courseId];
  nicknamesCache = next;
  write(NICKNAMES_KEY, next);
}

/** Live nickname map; re-renders subscribers on any change. */
export function useNicknames(): Record<string, string> {
  return useSyncExternalStore(subscribe, nicknamesSnapshot);
}

/* ── Local "done" marks ──────────────────────────────────────────────────── */

let doneCache: Set<string> | null = null;
function doneSnapshot(): Set<string> {
  doneCache ??= new Set(read<string[]>(DONE_KEY, []));
  return doneCache;
}

export function setDone(assignmentId: string, done: boolean): void {
  const next = new Set(doneSnapshot());
  if (done) next.add(assignmentId);
  else next.delete(assignmentId);
  doneCache = next;
  write(DONE_KEY, [...next]);
}

/** Live done-set; re-renders subscribers on any change. */
export function useDoneSet(): Set<string> {
  return useSyncExternalStore(subscribe, doneSnapshot);
}
