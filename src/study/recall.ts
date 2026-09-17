/**
 * recall.ts — generates Recall cards from a guide's blocks and orders the
 * review queue (wireframe B). Pure; the view and the Map's "Drill this
 * cluster" both call it.
 *
 * Cards per block:
 *   definition → two: term→body ("#tb") and body→term ("#bt")
 *   check      → one, itemId = the block id (shared with Read's "Test me")
 *   trap       → one "spot the trap" ("#trap")
 *   example    → one "compute it" ("#compute"), only when the block has an answer
 *
 * Queue: due cards first (never-seen counts as due); within due, cards from
 * trap blocks and cards with misses > 0 first; then section order, then
 * block order. Cards not yet due are not in the queue.
 */
import type { Guide, GuideBlock, GuideSection } from "./guide";
import { isDue, type GuideMastery, type ReviewRecord } from "./mastery";

export type CardKind = "term" | "body" | "check" | "trap" | "compute";

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  term: "term → definition",
  body: "definition → term",
  check: "self-test question",
  trap: "spot the trap",
  compute: "compute it",
};

export interface Card {
  /** The review-record key: block id plus a suffix for generated cards. */
  itemId: string;
  blockId: string;
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
}

function cardsOfBlock(b: GuideBlock, s: GuideSection, si: number, bi: number): Card[] {
  const base = { blockId: b.id, sectionId: s.id, sectionIndex: si, bullet: bi + 1 };
  switch (b.type) {
    case "definition":
      return [
        { ...base, itemId: `${b.id}#tb`, kind: "term", prompt: `Define: ${b.term}`, answer: b.body, fromTrap: false },
        { ...base, itemId: `${b.id}#bt`, kind: "body", prompt: "Which term is this?", mono: b.body, answer: b.term, fromTrap: false },
      ];
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

export function cardsFor(guide: Guide): Card[] {
  return guide.sections.flatMap((s, si) => s.blocks.flatMap((b, bi) => cardsOfBlock(b, s, si, bi)));
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
