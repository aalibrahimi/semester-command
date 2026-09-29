/**
 * readiness.ts: "am I ready for this exam?", one course at a time.
 *
 * Called by: routes/StudyReady.tsx.
 * Calls: nothing. Pure: pass the rows in, get scores and a plan out.
 *
 * Every exam topic is one guide section (intros, maps, word lists and
 * practice sets are not topics). Each gets a score from 0 to 1 built from
 * what the app already records:
 *
 *   base      how you marked it: unread 0, shaky 0.45, got it 0.75
 *   drills    your recent drill accuracy for that section, newer answers
 *             weighing more. It counts for up to 70% once there are four or
 *             more answers, so a couple of lucky guesses can't carry it.
 *   cards     every recall card of that section that is overdue takes a
 *             little off (up to 0.15); a card missed twice or more takes 0.1
 *   staleness nothing touched in 10+ days takes 0.1 off: memory fades
 *
 * The 20-minute plan spends the time on the weakest topics first: a drill
 * where there are drills, a reread where the section is new or shaky, and
 * the due cards for the course.
 */
import type { ChapterLike } from "./guideSummary";
import type { AttemptRecord, ReviewRecord, SectionRecord } from "./mastery";

export type Level = "new" | "weak" | "shaky" | "ok" | "ready";

export interface TopicScore {
  guideId: string;
  sectionId: string;
  heading: string;
  chapter: string;
  /** 0..1 */
  score: number;
  level: Level;
  /** Short, plain reasons, most important first. */
  evidence: string[];
  /** Drill answers in the last three weeks. */
  tries: number;
  /** Recall cards of this section that are due now. */
  due: number;
  hasDrills: boolean;
}

export interface PlanStep {
  kind: "drill" | "reread" | "read" | "recall";
  title: string;
  why: string;
  minutes: number;
  /** Route to open. */
  to: string;
}

export interface Readiness {
  topics: TopicScore[];
  /** Mean topic score, 0..1. */
  overall: number;
  counts: Record<Level, number>;
  /** Up to five topics to work on, weakest first (new topics after weak ones). */
  weak: TopicScore[];
  plan: PlanStep[];
}

export interface ReadinessInput {
  guides: ChapterLike[];
  sections: SectionRecord[];
  attempts: AttemptRecord[];
  reviews: ReviewRecord[];
  /** Guide ids that have generated drills, and which sections they cover. */
  drillSections: Set<string>;
  now?: Date;
}

/** Sections that set up or wrap up a chapter rather than teach a topic. */
const NOT_TOPICS = new Set(["why", "map", "words", "practice", "quiz"]);
const DAY = 86_400_000;
const BASE: Record<string, number> = { unread: 0, shaky: 0.45, mastered: 0.75 };

export function levelOf(score: number, touched: boolean): Level {
  if (!touched) return "new";
  if (score < 0.4) return "weak";
  if (score < 0.65) return "shaky";
  if (score < 0.85) return "ok";
  return "ready";
}

/** The section an item id belongs to: block ids are `${sectionId}.${hash}`. */
function sectionOfItem(itemId: string): string {
  return itemId.split(/[.#]/)[0];
}

export function readiness(input: ReadinessInput): Readiness {
  const now = input.now ?? new Date();
  const status = new Map(input.sections.map((s) => [`${s.guideId}#${s.sectionId}`, s]));
  const byKey = new Map<string, AttemptRecord[]>();
  for (const a of input.attempts) {
    const age = now.getTime() - new Date(a.at).getTime();
    if (age > 21 * DAY) continue;
    const k = `${a.guideId}#${a.sectionId}`;
    byKey.set(k, [...(byKey.get(k) ?? []), a]);
  }
  const reviewsBy = new Map<string, ReviewRecord[]>();
  for (const r of input.reviews) {
    const k = `${r.guideId}#${sectionOfItem(r.itemId)}`;
    reviewsBy.set(k, [...(reviewsBy.get(k) ?? []), r]);
  }

  const topics: TopicScore[] = [];
  for (const g of input.guides) {
    for (const sec of g.sections) {
      if (NOT_TOPICS.has(sec.id)) continue;
      const k = `${g.id}#${sec.id}`;
      const st = status.get(k);
      const tries = (byKey.get(k) ?? []).sort((a, b) => a.at.localeCompare(b.at));
      const cards = reviewsBy.get(k) ?? [];
      const evidence: string[] = [];

      let score = BASE[st?.status ?? "unread"] ?? 0;
      if (st?.status === "mastered") evidence.push("you marked it Got it");
      else if (st?.status === "shaky") evidence.push("you marked it shaky");

      if (tries.length > 0) {
        // Newer answers weigh more: weight 1, 2, 3, ... by position.
        let wSum = 0, hit = 0;
        tries.forEach((a, i) => { const w = i + 1; wSum += w; if (a.correct) hit += w; });
        const acc = hit / wSum;
        const w = Math.min(1, tries.length / 4) * 0.7;
        score = (1 - w) * score + w * acc;
        const right = tries.filter((a) => a.correct).length;
        evidence.unshift(`${right} of ${tries.length} drills right lately`);
      }

      const dueNow = cards.filter((r) => !r.nextDue || new Date(r.nextDue) <= now);
      const overdue = cards.filter((r) => r.nextDue && new Date(r.nextDue) <= now);
      if (overdue.length) {
        score -= Math.min(0.15, overdue.length * 0.05);
        evidence.push(`${overdue.length} recall card${overdue.length === 1 ? "" : "s"} overdue`);
      }
      const hard = cards.filter((r) => r.misses >= 2);
      if (hard.length) {
        score -= 0.1;
        evidence.push(`${hard.length} card${hard.length === 1 ? "" : "s"} missed twice or more`);
      }

      const stamps = [st?.updatedAt, tries[tries.length - 1]?.at, ...cards.map((r) => r.lastSeen)].filter((x): x is string => !!x);
      const last = stamps.length ? Math.max(...stamps.map((s) => new Date(s).getTime())) : null;
      const touched = (st && st.status !== "unread") || tries.length > 0 || cards.some((r) => r.reps > 0);
      if (touched && last !== null && now.getTime() - last > 10 * DAY) {
        score -= 0.1;
        evidence.push(`not practiced in ${Math.floor((now.getTime() - last) / DAY)} days`);
      }
      if (!touched) evidence.push("not started");

      score = Math.max(0, Math.min(1, score));
      topics.push({
        guideId: g.id,
        sectionId: sec.id,
        heading: sec.heading,
        chapter: g.title,
        score,
        level: levelOf(score, !!touched),
        evidence,
        tries: tries.length,
        due: dueNow.length,
        hasDrills: input.drillSections.has(k),
      });
    }
  }

  const counts: Record<Level, number> = { new: 0, weak: 0, shaky: 0, ok: 0, ready: 0 };
  for (const t of topics) counts[t.level]++;
  const overall = topics.length ? topics.reduce((s, t) => s + t.score, 0) / topics.length : 0;

  // Weak spots: started-but-weak first (those are misunderstandings), then
  // shaky, then brand-new topics in reading order.
  const rank: Record<Level, number> = { weak: 0, shaky: 1, new: 2, ok: 3, ready: 4 };
  const weak = topics
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.level !== "ready" && t.level !== "ok")
    .sort((a, b) => rank[a.t.level] - rank[b.t.level] || (a.t.level === "new" ? a.i - b.i : a.t.score - b.t.score))
    .slice(0, 5)
    .map(({ t }) => t);

  return { topics, overall, counts, weak, plan: planFor(weak, topics, input.guides[0]?.course) };
}

/** Twenty minutes, weakest first. */
export function planFor(weak: TopicScore[], topics: TopicScore[], course: string | undefined, budget = 20): PlanStep[] {
  const steps: PlanStep[] = [];
  let left = budget;
  const add = (s: PlanStep) => {
    if (s.minutes > left) return;
    steps.push(s);
    left -= s.minutes;
  };
  const due = topics.reduce((s, t) => s + t.due, 0);
  for (const t of weak) {
    if (left < 5) break;
    const at = `/study/${t.guideId}?s=${t.sectionId}`;
    if (t.level === "new") {
      add({ kind: "read", title: `Read: ${t.heading}`, why: `${t.chapter} · not started yet`, minutes: 8, to: at });
    } else if (t.hasDrills) {
      add({ kind: "drill", title: `Drill: ${t.heading}`, why: t.evidence[0] ?? "your weakest topic", minutes: 6, to: `${at}&focus=1` });
    } else {
      add({ kind: "reread", title: `Reread: ${t.heading}`, why: t.evidence[0] ?? "marked shaky", minutes: 7, to: at });
    }
  }
  if (due > 0 && course && left >= 3) {
    add({ kind: "recall", title: `Recall: ${due} card${due === 1 ? "" : "s"} due`, why: "mixed from every chapter, the way the exam mixes them", minutes: Math.min(left, 5), to: `/study/${course}/recall` });
  }
  return steps;
}
