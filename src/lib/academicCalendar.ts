/**
 * academicCalendar — SJSU 2026–27 academic dates, bundled as data.
 *
 * Canvas knows due dates but nothing about the university's rhythm: when
 * breaks start, which days classes don't meet. SJSU publishes this once a
 * year (sjsu.edu/classes/calendar, fetched 2026-08-22), so it ships as a
 * static table rather than another network dependency. Overlapping entries
 * are avoided on purpose — MLK Day falls inside winter break, César Chávez
 * Day inside spring recess, so only the enclosing span is listed.
 *
 * Used by: Calendar (all three views: holiday chips, no-class column tint,
 * suppressing weekly class blocks on days classes don't meet).
 */

export type AcademicKind = "holiday" | "break" | "finals" | "milestone";

export interface AcademicSpan {
  /** Inclusive local dates, "YYYY-MM-DD". */
  start: string;
  end: string;
  label: string;
  kind: AcademicKind;
  /** True when regular class meetings do not happen on these days. */
  noClasses: boolean;
}

const SJSU_2026_27: AcademicSpan[] = [
  { start: "2026-09-07", end: "2026-09-07", label: "Labor Day", kind: "holiday", noClasses: true },
  { start: "2026-11-11", end: "2026-11-11", label: "Veterans Day", kind: "holiday", noClasses: true },
  { start: "2026-11-26", end: "2026-11-27", label: "Thanksgiving", kind: "holiday", noClasses: true },
  { start: "2026-12-07", end: "2026-12-07", label: "Last day of fall instruction", kind: "milestone", noClasses: false },
  { start: "2026-12-08", end: "2026-12-08", label: "Study day", kind: "milestone", noClasses: true },
  { start: "2026-12-09", end: "2026-12-15", label: "Fall finals", kind: "finals", noClasses: true },
  { start: "2026-12-16", end: "2027-01-26", label: "Winter break", kind: "break", noClasses: true },
  { start: "2027-01-27", end: "2027-01-27", label: "Spring instruction begins", kind: "milestone", noClasses: false },
  { start: "2027-03-29", end: "2027-04-02", label: "Spring recess", kind: "break", noClasses: true },
  { start: "2027-05-17", end: "2027-05-17", label: "Last day of spring instruction", kind: "milestone", noClasses: false },
  { start: "2027-05-18", end: "2027-05-18", label: "Study day", kind: "milestone", noClasses: true },
  { start: "2027-05-19", end: "2027-05-25", label: "Spring finals", kind: "finals", noClasses: true },
  { start: "2027-05-31", end: "2027-05-31", label: "Memorial Day", kind: "holiday", noClasses: true },
];

function isoKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Every academic span covering this local date. */
export function academicOn(d: Date): AcademicSpan[] {
  const key = isoKey(d);
  return SJSU_2026_27.filter((s) => s.start <= key && key <= s.end);
}

/** The span that cancels class meetings on this date, if any. */
export function noClassSpan(d: Date): AcademicSpan | null {
  return academicOn(d).find((s) => s.noClasses) ?? null;
}

/** Upcoming spans (starting today or later), soonest first, with a countdown.
 *  Spans already in progress count as starting "today". */
export function upcomingAcademic(
  from: Date,
  limit: number,
): { span: AcademicSpan; startsInDays: number }[] {
  const key = isoKey(from);
  const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return SJSU_2026_27.filter((s) => s.end >= key)
    .map((span) => {
      const [y, m, d] = span.start.split("-").map(Number);
      const startMs = new Date(y, m - 1, d).getTime();
      return { span, startsInDays: Math.max(0, Math.round((startMs - midnight) / 86_400_000)) };
    })
    .sort((a, b) => a.startsInDays - b.startsInDays)
    .slice(0, limit);
}
