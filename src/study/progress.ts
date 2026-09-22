/**
 * progress.ts — "how far am I, and where do I pick up", per chapter and per
 * course, from the section rows in the mastery store.
 *
 * Called by: routes/Study.tsx (course bars), routes/StudyCourse.tsx
 * (chapter bars), routes/StudyRead.tsx (the rail bar).
 * Calls: nothing. Pure: pass the rows in.
 *
 * Done means mastered: you pressed "Got it" or drilled it 5 in a row.
 * Next is the first section, in reading order, that isn't done yet. A shaky
 * section earlier in the book counts as next, because that is the gap.
 */
import type { Guide } from "./guide";
import type { SectionRecord, SectionStatus } from "./mastery";

export interface NextStop {
  guideId: string;
  guideTitle: string;
  guideLessons: string;
  sectionId: string;
  heading: string;
  status: SectionStatus;
  /** Section number inside its chapter, 1-based. */
  index: number;
}

export interface Tally {
  mastered: number;
  shaky: number;
  total: number;
  /** Whole-number percent of sections mastered. */
  pct: number;
}

export interface ChapterProgress extends Tally {
  guideId: string;
  done: boolean;
  /** Every section in reading order, with its status. */
  sections: { id: string; heading: string; status: SectionStatus }[];
  next: NextStop | null;
}

export interface CourseProgress extends Tally {
  chapters: ChapterProgress[];
  next: NextStop | null;
  /** Most recently touched section in this course, for "last time". */
  last: { guideId: string; heading: string; at: string } | null;
}

export type StatusMap = Map<string, SectionStatus>;

export function statusMap(rows: SectionRecord[]): StatusMap {
  return new Map(rows.map((r) => [`${r.guideId}#${r.sectionId}`, r.status]));
}

function pct(m: number, t: number): number {
  return t === 0 ? 0 : Math.round((m / t) * 100);
}

export function chapterProgress(g: Guide, st: StatusMap): ChapterProgress {
  let mastered = 0;
  let shaky = 0;
  let next: NextStop | null = null;
  const sections: ChapterProgress["sections"] = [];
  g.sections.forEach((s, i) => {
    const status = st.get(`${g.id}#${s.id}`) ?? "unread";
    sections.push({ id: s.id, heading: s.heading, status });
    if (status === "mastered") mastered++;
    else {
      if (status === "shaky") shaky++;
      if (!next) next = { guideId: g.id, guideTitle: g.title, guideLessons: g.lessons, sectionId: s.id, heading: s.heading, status, index: i + 1 };
    }
  });
  const total = g.sections.length;
  return { guideId: g.id, mastered, shaky, total, pct: pct(mastered, total), done: total > 0 && mastered === total, sections, next };
}

export function courseProgress(guides: Guide[], rows: SectionRecord[]): CourseProgress {
  const st = statusMap(rows);
  const chapters = guides.map((g) => chapterProgress(g, st));
  const mastered = chapters.reduce((s, c) => s + c.mastered, 0);
  const shaky = chapters.reduce((s, c) => s + c.shaky, 0);
  const total = chapters.reduce((s, c) => s + c.total, 0);
  const next = chapters.find((c) => c.next)?.next ?? null;

  const gids = new Map(guides.map((g) => [g.id, g]));
  let last: CourseProgress["last"] = null;
  for (const r of rows) {
    const g = gids.get(r.guideId);
    if (!g || r.status === "unread") continue;
    if (!last || r.updatedAt > last.at) {
      const sec = g.sections.find((s) => s.id === r.sectionId);
      if (sec) last = { guideId: g.id, heading: sec.heading, at: r.updatedAt };
    }
  }
  return { mastered, shaky, total, pct: pct(mastered, total), chapters, next, last };
}

/** "today", "yesterday", "3 days ago". */
export function ago(iso: string, now = new Date()): string {
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

/** Route that opens a stop in the reader. */
export const stopRoute = (n: NextStop) => `/study/${n.guideId}?s=${n.sectionId}`;
