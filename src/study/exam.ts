/**
 * exam.ts — builds a mock exam from a course's drills, in that professor's
 * shape, and scores it.
 *
 * Called by: routes/StudyExam.tsx, later the Study home (last score).
 * Calls: study/drill.ts (rng, grade), study/drills (the sets).
 *
 * The exam is a spread: questions are drawn round-robin across the course's
 * written guides so one chapter can't dominate, then shuffled so topics
 * interleave the way a real paper does. Rubric checklists (self-graded
 * writing tasks) are left out: an exam score has to be checkable.
 */
import type { Guide } from "./guide";
import type { Course } from "./types";
import type { Drill, DrillAnswer, DrillInstance } from "./drill";
import { grade, randomSeed, rng } from "./drill";

export interface ExamFormat {
  questions: number;
  /** Seconds per question; the whole exam gets questions × secondsPer. */
  secondsPer: number;
  /** One line on what the real thing looks like, shown before Start. */
  blurb: string;
}

/** Per-course shape, from `howTheyTest` and `exam.format` in courses.ts. */
export const EXAM_FORMATS: Record<string, ExamFormat> = {
  cs146: { questions: 12, secondsPer: 180, blurb: "In class, on paper: traces, runtimes, and the why. Only the three master-method cases are printed." },
  cs154: { questions: 15, secondsPer: 120, blurb: "Timed Canvas quiz, closed materials: the weekly quiz with more questions and less time each. Notation counts." },
  hist15: { questions: 15, secondsPer: 120, blurb: "15 multiple choice in 30 minutes, one attempt. Two minutes a question." },
  ling112: { questions: 10, secondsPer: 150, blurb: "The oral exam asks you to explain a concept, then apply it to a fresh problem. 'How do you know?' is the real question every time." },
  ling124: { questions: 12, secondsPer: 150, blurb: "Multiple choice about what a plot does when one parameter changes, plus the computations behind it." },
  ling115: { questions: 12, secondsPer: 180, blurb: "A homework that asks more: name what each technical choice loses, and compute the counts." },
};

export function examFormat(slug: string): ExamFormat {
  return EXAM_FORMATS[slug] ?? { questions: 12, secondsPer: 150, blurb: "Mixed questions across every written chapter." };
}

export interface ExamItem {
  guideId: string;
  guideTitle: string;
  sectionId: string;
  sectionHeading: string;
  drill: Drill;
  seed: number;
  inst: DrillInstance;
}

export interface ExamBreakdown {
  guideId: string;
  sectionId: string;
  asked: number;
  correct: number;
}

function isCheckable(a: DrillAnswer): boolean {
  return a.kind !== "checklist";
}

/**
 * Draw `n` questions across `guides` (each with its drills), spread evenly,
 * then shuffled. Deterministic for a given `seed`.
 */
export function buildExam(guides: { guide: Guide; drills: Drill[] }[], n: number, seed = randomSeed()): ExamItem[] {
  const r = rng(seed);
  const pools = guides
    .map(({ guide, drills }) => ({
      guide,
      drills: r.shuffle(drills.filter((d) => isCheckable(d.gen(rng(1)).answer))),
      cursor: 0,
    }))
    .filter((p) => p.drills.length > 0);
  if (pools.length === 0) return [];
  const items: ExamItem[] = [];
  let gi = r.int(0, pools.length - 1);
  while (items.length < n) {
    const p = pools[gi % pools.length];
    const drill = p.drills[p.cursor % p.drills.length];
    p.cursor++;
    gi++;
    const s = randomSeedFrom(r);
    const inst = drill.gen(rng(s));
    if (!isCheckable(inst.answer)) continue;
    const section = p.guide.sections.find((x) => x.id === drill.sectionRef);
    items.push({
      guideId: p.guide.id,
      guideTitle: p.guide.title,
      sectionId: drill.sectionRef,
      sectionHeading: section?.heading ?? drill.sectionRef,
      drill,
      seed: s,
      inst,
    });
    // Guard against a course with fewer distinct drills than questions looping forever.
    if (items.length >= n || items.length > pools.reduce((s2, x) => s2 + x.drills.length, 0) * 3) break;
  }
  return r.shuffle(items);
}

function randomSeedFrom(r: ReturnType<typeof rng>): number {
  return Math.floor(r.next() * 0x7fffffff);
}

export interface ExamAnswer {
  input: string;
  correct: boolean;
  expected: string;
  diagnosis?: string;
  ms: number;
}

export function gradeItem(item: ExamItem, input: string, ms: number): ExamAnswer {
  const g = grade(item.inst.answer, input);
  const meant = item.inst.answer.kind === "choice" ? (item.inst.answer.options[Number(input)] ?? input) : input;
  return { input: g.input, correct: g.correct, expected: g.expected, diagnosis: g.correct ? undefined : item.inst.diagnose?.(meant), ms };
}

export function breakdown(items: ExamItem[], answers: (ExamAnswer | null)[]): ExamBreakdown[] {
  const map = new Map<string, ExamBreakdown>();
  items.forEach((it, i) => {
    const k = `${it.guideId}#${it.sectionId}`;
    const b = map.get(k) ?? { guideId: it.guideId, sectionId: it.sectionId, asked: 0, correct: 0 };
    b.asked++;
    if (answers[i]?.correct) b.correct++;
    map.set(k, b);
  });
  return [...map.values()].sort((a, b) => a.correct / a.asked - b.correct / b.asked || b.asked - a.asked);
}

/** Total seconds for a course's mock. */
export function examSeconds(course: Course, n: number): number {
  return n * examFormat(course.slug).secondsPer;
}
