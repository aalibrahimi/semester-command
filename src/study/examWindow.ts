/**
 * examWindow: which exams are close enough to lead the Today page.
 *
 * Called by: components/today/ExamFocus.tsx.
 */
import { courses as studyCourses, daysUntil } from "./index";
import type { Course } from "./types";

/** Days before an exam that its study plan leads Today. */
export const EXAM_WINDOW_DAYS = 14;

/** Study courses with an exam in the next two weeks, nearest first. */
export function upcomingExams(now = new Date()): { c: Course; days: number }[] {
  return studyCourses
    .map((c) => ({ c, days: daysUntil(c.exam.date, now) }))
    .filter((x) => x.days >= 0 && x.days <= EXAM_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);
}
