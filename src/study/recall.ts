/**
 * recall.ts — generates Recall cards from a guide's blocks and orders the
 * review queue (wireframe B). Pure; the view and the Map's "Drill this
 * cluster" both call it.
 *
 * Cards per block:
 *   definition → two: term→body ("#tb") and body→term ("#bt"), plus a
 *                cloze ("#cloze") when the body has a bold phrase to blank:
 *                the reader TYPES the missing words (production, not recognition)
 *   check      → one, itemId = the block id (shared with Read's "Test me")
 *   trap       → one "spot the trap" ("#trap")
 *   example    → one "compute it" ("#compute"), only when the block has an answer
 *   drill      → one per drill in study/drills ("drill:<id>"): a fresh
 *                generated instance each time, checked by the drill's grader
 *
 * Queue: due cards first (never-seen counts as due); within due, cards from
 * trap blocks and cards with misses > 0 first; then section order, then
 * block order. Cards not yet due are not in the queue. Across guides
 * (course-wide Recall) the queues are interleaved round-robin so chapters
 * alternate, which is what makes review transfer to a mixed exam.
 */
import type { Drill, DrillAnswer, DrillInstance } from "./drill";
import { randomSeed, rng } from "./drill";
import type { Guide, GuideBlock, GuideSection } from "./guide";
import { isDue, type GuideMastery, type ReviewRecord } from "./mastery";

export type CardKind = "term" | "body" | "check" | "trap" | "compute" | "cloze" | "drill";

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  term: "term → definition",
  body: "definition → term",
  check: "self-test question",
  trap: "spot the trap",
  compute: "compute it",
  cloze: "fill the blank (typed)",
  drill: "solve it (generated, checked)",
};

export interface Card {
  /** The review-record key: block id plus a suffix for generated cards. */
  itemId: string;
  blockId: string;
  guideId: string;
  kind: CardKind;
  sectionId: string;
  sectionIndex: number;
  /** 1-based position of the block in its section — "bullet n" in the guide link. */
  bullet: number;
  prompt: string;
  /** Monospace line under the prompt (options, a computation, a trap's source). */
  mono?: string;
  answer: string;
  fromTrap: boolean;
  /**
   * Production cards: the answer is typed and checked before grading.
   * cloze → text accept list; drill → the generated instance's answer.
   */
  typed?: DrillAnswer;
  /** drill cards: the instance (steps, diagnose) and its seed. */
  drill?: { drill: Drill; seed: number; inst: DrillInstance };
}

/** The first bold phrase in a definition body that isn't the term itself and is 1 to 4 words. */
function clozeTarget(term: string, body: string): string | null {
  const bolds = [...body.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
  for (const b of bolds) {
    const words = b.split(/\s+/);
    if (words.length >= 1 && words.length <= 4 && b.toLowerCase() !== term.toLowerCase() && /[a-z0-9]/i.test(b) && !/[:=]/.test(b)) return b;
  }
  return null;
}

function cardsOfBlock(b: GuideBlock, s: GuideSection, si: number, bi: number, guideId: string): Card[] {
  const base = { blockId: b.id, guideId, sectionId: s.id, sectionIndex: si, bullet: bi + 1 };
  switch (b.type) {
    case "definition": {
      const cards: Card[] = [
        { ...base, itemId: `${b.id}#tb`, kind: "term", prompt: `Define: ${b.term}`, answer: b.body, fromTrap: false },
        { ...base, itemId: `${b.id}#bt`, kind: "body", prompt: "Which term is this?", mono: b.body, answer: b.term, fromTrap: false },
      ];
      const target = clozeTarget(b.term, b.body);
      if (target) {
        const blank = "＿".repeat(Math.min(10, Math.max(4, target.length)));
        cards.push({
          ...base,
          itemId: `${b.id}#cloze`,
          kind: "cloze",
          prompt: `Fill the blank: ${b.term}`,
          mono: b.body.replace(`**${target}**`, `**${blank}**`),
          answer: target,
          fromTrap: false,
          typed: { kind: "text", accept: [target], placeholder: "type the missing words" },
        });
      }
      return cards;
    }
    case "check":
      return [{ ...base, itemId: b.id, kind: "check", prompt: b.prompt, answer: b.answer, fromTrap: false }];
    case "trap": {
      const lead = /^\*\*([^*]+)\*\*/.exec(b.body)?.[1];
      return [
        {
          ...base,
          itemId: `${b.id}#trap`,
          kind: "trap",
          prompt: lead ? `Spot the trap: ${lead}` : "Spot the trap: what costs points here?",
          mono: `COSTS POINTS · ${b.source}${b.points ? ` · ${b.points}` : ""}`,
          answer: b.body.replace(/^\*\*[^*]+\*\*\s*/, ""),
          fromTrap: true,
        },
      ];
    }
    case "example":
      return b.answer
        ? [{ ...base, itemId: `${b.id}#compute`, kind: "compute", prompt: `Compute it: ${b.title}`, mono: b.body.split("\n")[0], answer: b.answer, fromTrap: false }]
        : [];
    default:
      return [];
  }
}

/** A drill as a card: one fresh instance per call (the seed is kept on the card). */
function drillCard(d: Drill, guide: Guide): Card | null {
  const si = guide.sections.findIndex((s) => s.id === d.sectionRef);
  if (si < 0) return null;
  const seed = randomSeed();
  const inst = d.gen(rng(seed));
  if (inst.answer.kind === "checklist") return null;
  return {
    itemId: `drill:${d.id}`,
    blockId: d.sectionRef,
    guideId: guide.id,
    kind: "drill",
    sectionId: d.sectionRef,
    sectionIndex: si,
    bullet: 0,
    prompt: inst.prompt,
    mono: inst.code,
    answer: "",
    fromTrap: false,
    typed: inst.answer,
    drill: { drill: d, seed, inst },
  };
}

export function cardsFor(guide: Guide, drills: Drill[] = []): Card[] {
  const fromBlocks = guide.sections.flatMap((s, si) => s.blocks.flatMap((b, bi) => cardsOfBlock(b, s, si, bi, guide.id)));
  const fromDrills = drills.map((d) => drillCard(d, guide)).filter((c): c is Card => c !== null);
  return [...fromBlocks, ...fromDrills];
}

/** Round-robin merge of several guides' queues, so chapters alternate. */
export function interleave(queues: Card[][]): Card[] {
  const out: Card[] = [];
  const idx = queues.map(() => 0);
  for (;;) {
    let any = false;
    queues.forEach((q, k) => {
      if (idx[k] < q.length) {
        out.push(q[idx[k]++]);
        any = true;
      }
    });
    if (!any) break;
  }
  return out;
}

/* ── Card-level status, from the review record ─────────────────────────── */

export type CardStatus = "new" | "due" | "shaky" | "mastered";

export function cardStatus(r: ReviewRecord | undefined, now = new Date()): CardStatus {
  if (!r) return "new";
  if (r.misses > 0 && r.reps < 3) return "shaky";
  if (isDue(r, now)) return "due";
  return "mastered";
}

export function isShaky(r: ReviewRecord | undefined): boolean {
  return !!r && r.misses > 0 && r.reps < 3;
}

/* ── Queue ──────────────────────────────────────────────────────────────── */

export function buildQueue(cards: Card[], m: GuideMastery, now = new Date()): Card[] {
  const due = cards.filter((c) => isDue(m.reviews[c.itemId], now));
  const front = (c: Card) => (c.fromTrap || (m.reviews[c.itemId]?.misses ?? 0) > 0 ? 0 : 1);
  return due
    .map((c, i) => ({ c, i }))
    .sort((a, b) => front(a.c) - front(b.c) || a.c.sectionIndex - b.c.sectionIndex || a.i - b.i)
    .map((x) => x.c);
}

/** "Review shaky anyway": every shaky card, due or not, in section order. */
export function shakyQueue(cards: Card[], m: GuideMastery): Card[] {
  return cards.filter((c) => isShaky(m.reviews[c.itemId]));
}

export function counts(cards: Card[], m: GuideMastery, now = new Date()) {
  let due = 0, shaky = 0, mastered = 0;
  for (const c of cards) {
    const st = cardStatus(m.reviews[c.itemId], now);
    if (st === "shaky") shaky++;
    else if (st === "mastered") mastered++;
    if (isDue(m.reviews[c.itemId], now)) due++;
  }
  return { due, shaky, mastered };
}

/** Earliest future due date across the deck, for the empty-queue summary. */
export function nextDue(cards: Card[], m: GuideMastery, now = new Date()): Date | null {
  let best: Date | null = null;
  for (const c of cards) {
    const r = m.reviews[c.itemId];
    if (!r?.nextDue) continue;
    const d = new Date(r.nextDue);
    if (d > now && (!best || d < best)) best = d;
  }
  return best;
}

/** "10 min" · "3 h" · "2 days" — for the grade buttons. */
export function intervalLabel(days: number): string {
  const mins = Math.round(days * 1440);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  if (mins < 1440) return `${Math.round(mins / 60)} h`;
  const d = Math.round(days);
  return d === 1 ? "1 day" : `${d} days`;
}
