/**
 * plan.ts — "what should I do in the next 45 minutes", computed from what
 * the app already knows: exam dates, section statuses, drill attempts,
 * cards due, and mock exam scores.
 *
 * Called by: routes/Study.tsx (the panel at the top of Study home).
 * Calls: nothing. Pure: pass the rows in, get actions out.
 *
 * Priority is exam pressure × weakness. A section you keep missing drills
 * in, for an exam next week, outranks everything. Then cards that are due,
 * then shaky sections, then unread sections of the nearest exam's chapters.
 * No mock in the last three days for an exam within ten → a mock.
 */
import type { Guide } from "./guide";
import type { AttemptRecord, ExamRecord, ReviewRecord, SectionRecord } from "./mastery";
import type { Course } from "./types";

export type ActionKind = "drill" | "recall" | "reread" | "read" | "mock" | "mistakes";

export interface Action {
  kind: ActionKind;
  course: Course;
  title: string;
  /** Why this, in one line. */
  reason: string;
  /** Route to open. */
  to: string;
  /** Rough minutes. */
  minutes: number;
  score: number;
}

export interface PlanInput {
  courses: Course[];
  guidesByCourse: Record<string, Guide[]>;
  sections: SectionRecord[];
  attempts: AttemptRecord[];
  reviews: ReviewRecord[];
  exams: ExamRecord[];
  now?: Date;
}

function daysTo(iso: string, now: Date): number {
  const d = new Date(iso + "T23:59:59");
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

/** Exam pressure: 1 far away, up to ~6 the day before. */
function pressure(days: number): number {
  if (days < 0) return 0.3;
  if (days <= 1) return 6;
  if (days <= 3) return 5;
  if (days <= 7) return 4;
  if (days <= 14) return 2.5;
  if (days <= 30) return 1.5;
  return 1;
}

export function plan(input: PlanInput, limit = 5): Action[] {
  const now = input.now ?? new Date();
  const out: Action[] = [];
  const secStatus = new Map(input.sections.map((s) => [`${s.guideId}#${s.sectionId}`, s.status]));
  const recent = input.attempts.filter((a) => now.getTime() - new Date(a.at).getTime() < 14 * 86_400_000);

  for (const course of input.courses) {
    const guides = input.guidesByCourse[course.slug] ?? [];
    if (guides.length === 0) continue;
    const days = daysTo(course.exam.date, now);
    const p = pressure(days);
    const gids = new Set(guides.map((g) => g.id));
    const when = days < 0 ? "exam passed" : days === 0 ? "exam today" : days === 1 ? "exam tomorrow" : `exam in ${days} days`;

    // 1. Sections where drills keep missing.
    const bySec = new Map<string, { tries: number; misses: number; last: string }>();
    for (const a of recent) {
      if (!gids.has(a.guideId)) continue;
      const k = `${a.guideId}#${a.sectionId}`;
      const s = bySec.get(k) ?? { tries: 0, misses: 0, last: a.at };
      s.tries++;
      if (!a.correct) s.misses++;
      if (a.at > s.last) s.last = a.at;
      bySec.set(k, s);
    }
    for (const [k, s] of bySec) {
      if (s.tries < 2) continue;
      const rate = s.misses / s.tries;
      if (rate < 0.34) continue;
      const [gid, sid] = k.split("#");
      const g = guides.find((x) => x.id === gid);
      const sec = g?.sections.find((x) => x.id === sid);
      if (!g || !sec) continue;
      out.push({
        kind: "drill",
        course,
        title: `Drill: ${sec.heading}`,
        reason: `${s.misses} of ${s.tries} wrong in the last two weeks · ${when}`,
        to: `/study/${gid}?s=${sid}`,
        minutes: 15,
        score: p * (2 + rate * 3),
      });
    }

    // 2. Shaky sections.
    for (const g of guides) {
      for (const sec of g.sections) {
        if (secStatus.get(`${g.id}#${sec.id}`) === "shaky") {
          out.push({
            kind: "reread",
            course,
            title: `Reread: ${sec.heading}`,
            reason: `marked shaky · ${g.title} · ${when}`,
            to: `/study/${g.id}?s=${sec.id}`,
            minutes: 12,
            score: p * 1.6,
          });
        }
      }
    }

    // 3. Cards due, per guide.
    for (const g of guides) {
      const due = input.reviews.filter((r) => r.guideId === g.id && (!r.nextDue || new Date(r.nextDue) <= now)).length;
      if (due === 0) continue;
      out.push({
        kind: "recall",
        course,
        title: `Recall: ${due} card${due === 1 ? "" : "s"} due · ${g.title}`,
        reason: `spaced review keeps it from fading · ${when}`,
        to: `/study/${g.id}/recall`,
        minutes: Math.min(20, 2 + Math.ceil(due / 2)),
        score: p * (1.2 + Math.min(due, 20) / 20),
      });
    }

    // 4. A mock, if the exam is close and none was taken lately.
    if (days >= 0 && days <= 10) {
      const lastMock = input.exams.filter((e) => e.course === course.slug).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
      const ago = lastMock ? (now.getTime() - new Date(lastMock.startedAt).getTime()) / 86_400_000 : Infinity;
      if (ago > 3) {
        out.push({
          kind: "mock",
          course,
          title: `Mock exam · ${course.code}`,
          reason: lastMock ? `last mock ${Math.floor(ago)} days ago: ${lastMock.correct}/${lastMock.total} · ${when}` : `no mock yet · ${when}`,
          to: `/study/${course.slug}/exam`,
          minutes: 30,
          score: p * 1.8,
        });
      }
    }

    // 5. Unread sections, nearest exam first (only one suggestion per course).
    const unread = guides.flatMap((g) => g.sections.filter((s) => !secStatus.get(`${g.id}#${s.id}`) || secStatus.get(`${g.id}#${s.id}`) === "unread").map((s) => ({ g, s })));
    if (unread.length > 0) {
      const { g, s } = unread[0];
      out.push({
        kind: "read",
        course,
        title: `Read: ${s.heading}`,
        reason: `${unread.length} unread section${unread.length === 1 ? "" : "s"} in ${course.code} · ${when}`,
        to: `/study/${g.id}?s=${s.id}`,
        minutes: 15,
        score: p * 1.0,
      });
    }
  }

  // Dedupe by route, keep the best, and spread across courses a little.
  const best = new Map<string, Action>();
  for (const a of out) {
    const prev = best.get(a.to);
    if (!prev || prev.score < a.score) best.set(a.to, a);
  }
  const sorted = [...best.values()].sort((a, b) => b.score - a.score);
  const picked: Action[] = [];
  const perCourse = new Map<string, number>();
  for (const a of sorted) {
    const c = perCourse.get(a.course.slug) ?? 0;
    if (c >= 2 && picked.length < limit) continue;
    picked.push(a);
    perCourse.set(a.course.slug, c + 1);
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Wrong answers, newest first, for the error log. */
export function mistakes(attempts: AttemptRecord[]): AttemptRecord[] {
  return attempts.filter((a) => !a.correct).sort((a, b) => b.at.localeCompare(a.at));
}
