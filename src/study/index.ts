/**
 * Study module entry: courses, chapters, and the chapter → deck derivation.
 *
 * Called by: src/routes/Study*.tsx, src/components/study/*.
 */
import type { Block, Chapter, Slide } from "./types";

export * from "./types";
export { courses, courseBySlug } from "./courses";

/** Anchor id for a block: its own id, or a stable positional fallback. */
export function blockAnchor(sectionId: string, block: Block, index: number): string {
  return block.id ?? `${sectionId}-b${index}`;
}

/**
 * Derive the slide deck from a chapter. Every section contributes a title
 * slide; every block with `slide` contributes one slide (a stepper
 * contributes one per frame). The anchor on each slide is the block it came
 * from, so "Read in the book" is exact.
 */
export function buildDeck(chapter: Chapter): Slide[] {
  const slides: Slide[] = [];
  const total = chapter.sections.length;
  chapter.sections.forEach((section, si) => {
    slides.push({
      section: section.title,
      sectionId: section.id,
      anchor: section.id,
      content: { kind: "section-title", title: section.title, index: si + 1, total },
    });
    section.blocks.forEach((block, bi) => {
      if (!("slide" in block) || !block.slide) return;
      const anchor = blockAnchor(section.id, block, bi);
      const title = typeof block.slide === "string" ? block.slide : undefined;
      if (block.t === "stepper") {
        block.frames.forEach((frame, fi) => {
          slides.push({
            section: section.title,
            sectionId: section.id,
            anchor,
            title: title ?? block.title,
            content: { kind: "frame", stepperTitle: block.title, frame, index: fi + 1, total: block.frames.length },
          });
        });
      } else {
        slides.push({ section: section.title, sectionId: section.id, anchor, title, content: { kind: "block", block } });
      }
    });
  });
  return slides;
}

/** Days from today (local midnight) to an ISO date. Negative = past. */
export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(iso: string, style: "long" | "short" = "long"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    ...(style === "long" ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
  });
}
