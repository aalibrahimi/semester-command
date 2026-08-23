/**
 * format.ts — presentation-only formatting of numbers, dates and durations.
 *
 * Called by: components, exclusively for display.
 * Calls: Intl.
 *
 * HARD RULE (SPEC.md §10): nothing in this file may compute a grade. Rounding a
 * percentage Rust already calculated is formatting; deriving that percentage is
 * grade math, and grade math lives in `src-tauri/src/grades.rs`. If a function
 * here ever needs a `points_possible`, it is in the wrong file.
 */

/**
 * A percentage as the app displays it everywhere: one decimal, explicit sign
 * never shown, "—" for absent.
 *
 * One decimal is deliberate. Canvas reports `current_score` to two, but a
 * gradebook scanned twenty times a week reads better at one, and the reconcile
 * check in §4.2 tolerates 0.1 anyway — showing more precision than the
 * tolerance would imply a confidence the numbers do not have.
 *
 * @param pct  0–100, or null when nothing is graded yet
 */
export function pct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  return `${pct.toFixed(1)}%`;
}

/**
 * Points as "43/50". Used beside every solver answer, because "you need 86%" is
 * abstract and "you need 43 of 50 points" is not (§4.3).
 */
export function points(earned: number | null | undefined, possible: number | null | undefined): string {
  if (earned === null || earned === undefined) return possible == null ? "—" : `—/${trimNum(possible)}`;
  if (possible === null || possible === undefined) return trimNum(earned);
  return `${trimNum(earned)}/${trimNum(possible)}`;
}

/** Drop a trailing ".0" so 50 renders as "50" and 12.5 stays "12.5". */
function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** An absolute date, e.g. "Tue Sep 9, 11:59 PM". */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/**
 * Relative time, biased toward what matters on a deadline list: "in 3h",
 * "tomorrow", "4d overdue".
 *
 * NOTE: this deviates from `Intl.RelativeTimeFormat`'s phrasing on purpose.
 * "in 3 hours" is fine in prose and too wide in a table column that also has to
 * hold "4d overdue" without wrapping (§9.2 — tabular layout is the point).
 *
 * @param iso   the due date
 * @param now   injectable for tests; defaults to the wall clock
 */
export function relativeDue(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const ms = d.getTime() - now.getTime();
  const overdue = ms < 0;
  const abs = Math.abs(ms);

  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  let magnitude: string;
  if (mins < 60) magnitude = `${mins}m`;
  else if (hours < 24) magnitude = `${hours}h`;
  else if (days < 14) magnitude = `${days}d`;
  else magnitude = `${Math.round(days / 7)}w`;

  return overdue ? `${magnitude} overdue` : `in ${magnitude}`;
}

/**
 * The strict-grid due format from the design review: "Wed 10:30a". Fixed
 * shape so the column never wraps; "no date yet" for undated work.
 */
export function dueShort(iso: string | null | undefined): string {
  if (!iso) return "no date yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const wd = d.toLocaleDateString(undefined, { weekday: "short" });
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? "p" : "a";
  return `${wd} ${hour12}:${String(d.getMinutes()).padStart(2, "0")}${suffix}`;
}

/**
 * "synced 4m ago" for the sidebar footer (§5). Returns "never" before the first
 * successful sync, which is a real state the empty-state copy depends on.
 */
export function sinceSync(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "never";
  const secs = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86_400)}d ago`;
}

/**
 * Minutes as "1h 30m" for the inline time estimates on the triage list (§5).
 * Zero and null both render as an em dash, since "0m" reads like a real
 * estimate and "no estimate yet" is the state we actually mean.
 */
export function minutes(mins: number | null | undefined): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
