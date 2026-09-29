/**
 * lectureCoverage: which lecture files on Canvas already have a study
 * chapter, and which are still waiting for one.
 *
 * Called by: routes/StudyLectures.tsx, routes/StudyCourse.tsx, Today.
 * Calls: study/courses (Canvas course code → study course), guide
 * summaries (their `lessons` field).
 *
 * A file is matched to chapters by its number: "Lecture 12_ Binary Search
 * Trees.pdf" is Lecture 12; "LING 112 - Week 7 - X-bar theory.pdf" is Week
 * 7. A chapter covers it when its `lessons` names the same kind and a range
 * containing the number ("Lecture 11", "Lectures 2–3", "Week 7").
 */
import { parseCourseLabel } from "@/lib/courseLabel";
import { courseBySlug } from "./courses";
import type { Course } from "./types";

export interface LectureRef {
  kind: "lecture" | "week";
  n: number;
}

/** "Lecture 12_ …" → lecture 12; "… Week 7 …" → week 7; else null. */
export function lectureRef(fileName: string): LectureRef | null {
  const m = /(?:^|[^a-z])(lecture|lec|week)s?\s*[#_-]?\s*(\d{1,2})(?!\d)/i.exec(fileName);
  if (!m) return null;
  return { kind: m[1].toLowerCase() === "week" ? "week" : "lecture", n: Number(m[2]) };
}

/** Ranges named in a guide's `lessons`: "Lectures 2–3" → lecture 2..3. */
export function lessonRanges(lessons: string): { kind: LectureRef["kind"]; lo: number; hi: number }[] {
  const out: { kind: LectureRef["kind"]; lo: number; hi: number }[] = [];
  const re = /\b(lecture|week)s?\s+(\d{1,2})(?:\s*(?:–|-|to|and|&)\s*(\d{1,2}))?/gi;
  for (const m of lessons.matchAll(re)) {
    const lo = Number(m[2]);
    out.push({ kind: m[1].toLowerCase() === "week" ? "week" : "lecture", lo, hi: m[3] ? Number(m[3]) : lo });
  }
  return out;
}

/** The chapter (guide id) that covers this file, if any. */
export function coveringGuide(ref: LectureRef | null, guides: { id: string; lessons: string }[]): string | undefined {
  if (!ref) return undefined;
  return guides.find((g) => lessonRanges(g.lessons).some((r) => r.kind === ref.kind && ref.n >= r.lo && ref.n <= r.hi))?.id;
}

/** The study course for a Canvas course code ("FA26: CS-146 Sec 03 - …" → cs146). */
export function studyCourseForCode(courseCode: string | null | undefined): Course | undefined {
  const code = parseCourseLabel(courseCode).code;
  return code ? courseBySlug(code.toLowerCase().replace(/[^a-z0-9]/g, "")) : undefined;
}
