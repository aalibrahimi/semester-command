/**
 * courseWork: sorting one course's assignments into what's missing, due
 * this week, and coming up. Used by the course page (header pills and the
 * Overview tab's Do next list).
 */
import type { AssignmentDetail } from "@/types";

const DAY = 86_400_000;

/** Done means graded or turned in; excused and omitted work never shows. */
export function isDone(a: AssignmentDetail): boolean {
  return a.submitted || a.score !== null;
}

/** Sort assignments into the list's sections. */
export function classify(assignments: AssignmentDetail[], now: number) {
  const live = assignments.filter((a) => !a.excused && !a.omitted && !isDone(a));
  const dated = live.filter((a) => a.dueAt);
  const t = (a: AssignmentDetail) => new Date(a.dueAt as string).getTime();
  const missing = dated
    .filter((a) => t(a) < now && (a.missing || (a.pointsPossible ?? 0) > 0))
    .sort((a, b) => t(b) - t(a));
  const soon = dated.filter((a) => t(a) >= now && t(a) < now + 7 * DAY).sort((a, b) => t(a) - t(b));
  const later = dated.filter((a) => t(a) >= now + 7 * DAY && t(a) < now + 21 * DAY).sort((a, b) => t(a) - t(b));
  return { missing, soon, later };
}


/** "due today", "due tomorrow", or "due Mon": for pills and headers. */
export function dueWhen(iso: string, now: number): string {
  const d = new Date(iso);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / DAY);
  if (days < 0) return "overdue";
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due ${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d)}`;
}
