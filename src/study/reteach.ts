/**
 * reteach.ts: when a reader misses the same drill twice, show the one block
 * that teaches that exact skill again, then offer a fresh variant.
 *
 * Called by: components/study/Drill.tsx (DrillCard, after a wrong answer).
 * Calls: nothing. Pure, so it is unit tested.
 *
 * Which block: a drill can name one (Drill.reteach, matched against a
 * block's title or caption). Otherwise the section's best picture, in this
 * order: a code + animation stepper, any stepper, a figure, a diagram, a
 * simulation, then the definition. Pictures first, because a miss after
 * reading the prose means the prose alone did not land.
 */
import type { AttemptRecord } from "./mastery";
import type { GuideBlock, GuideSection } from "./guide";

/** Misses on one drill before the reteach card appears. */
export const RETEACH_AFTER = 2;

/** How many times this drill has been missed (all time, this section). */
export function missCount(attempts: AttemptRecord[], sectionId: string, drillId: string): number {
  return attempts.filter((a) => a.sectionId === sectionId && a.drillId === drillId && !a.correct).length;
}

export function needsReteach(attempts: AttemptRecord[], sectionId: string, drillId: string): boolean {
  return missCount(attempts, sectionId, drillId) >= RETEACH_AFTER;
}

function label(b: GuideBlock): string {
  const x = b as { title?: string; caption?: string; term?: string };
  return (x.title ?? x.caption ?? x.term ?? "").toLowerCase();
}

const ORDER: ((b: GuideBlock) => boolean)[] = [
  (b) => b.type === "stepper" && !!(b as { trace?: unknown }).trace,
  (b) => b.type === "stepper",
  (b) => b.type === "figure",
  (b) => b.type === "diagram",
  (b) => b.type === "sim",
  (b) => b.type === "definition",
];

/**
 * The block to reteach with, or undefined when the section has nothing
 * better than the answer's own steps.
 * @param prefer a drill's `reteach` hint: a lowercase piece of the block's title or caption.
 */
export function reteachBlock(sections: GuideSection[] | undefined, sectionId: string, prefer?: string): GuideBlock | undefined {
  const sec = sections?.find((s) => s.id === sectionId);
  if (!sec) return undefined;
  if (prefer) {
    const want = prefer.toLowerCase();
    const hit = sec.blocks.find((b) => label(b).includes(want));
    if (hit) return hit;
  }
  for (const test of ORDER) {
    const hit = sec.blocks.find(test);
    if (hit) return hit;
  }
  return undefined;
}
