/**
 * courseLabel — turn Canvas's course strings into something a human scans.
 *
 * Called by: Sidebar, Courses, Triage, Calendar, CommandPalette,
 * CourseDetail — anywhere a course is named.
 * Calls: nothing.
 *
 * SJSU's Canvas course_code is the whole kitchen sink:
 *
 *   "FA26: CS-146 Sec 08 - Data Struct and Alg"
 *
 * which truncates to uselessness in any row narrower than a monitor. This
 * parser splits it into term / code / title once, so every surface can show
 * the part it has room for. Non-matching strings ("SJSU AI Literacy
 * Essentials (Transfer Students)") pass through as title-only — parsing is
 * best-effort, never destructive.
 */

export interface CourseLabel {
  /** "FA26" — or null when the string has no term prefix. */
  term: string | null;
  /** "CS-146" — or null for shells with no course number. */
  code: string | null;
  /** "Data Struct and Alg" — always populated (falls back to the input). */
  title: string;
}

const PATTERN =
  /^(?:([A-Z]{2}\d{2}):\s*)?([A-Z]{2,4}\d?-\d{1,3}[A-Z]{0,2})?(?:\s+Sec\s+\S+)?\s*(?:-\s*)?(.*)$/;

export function parseCourseLabel(raw: string | null | undefined): CourseLabel {
  const input = (raw ?? "").trim();
  if (input === "") return { term: null, code: null, title: "Untitled course" };

  const m = input.match(PATTERN);
  if (!m) return { term: null, code: null, title: input };

  const [, term, code, rest] = m;
  const title = rest?.trim() || code || input;
  return { term: term ?? null, code: code ?? null, title };
}

/** The shortest useful handle: "CS-146", else a clipped title — a chip
 *  reading "SJSU AI Literacy Essentials (Transfer Students)" defeats the
 *  point of a chip. Parentheticals go first, then a hard clip. */
export function courseShort(raw: string | null | undefined): string {
  const { code, title } = parseCourseLabel(raw);
  if (code) return code;
  const clean = title.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return clean.length > 18 ? `${clean.slice(0, 17).trimEnd()}…` : clean;
}

/** Code + title when both exist and differ: "CS-146 · Data Struct and Alg". */
export function courseFull(raw: string | null | undefined): string {
  const { code, title } = parseCourseLabel(raw);
  if (code && title && title !== code) return `${code} · ${title}`;
  return code ?? title;
}
