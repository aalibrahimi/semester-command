/**
 * Study module entry: courses and the guide → deck derivation.
 *
 * Called by: src/routes/Study*.tsx, src/components/study/*.
 */
import type { Guide } from "./guide";
import type { Slide } from "./types";

export * from "./types";
export { courses, courseBySlug } from "./courses";

/**
 * Derive the slide deck from a guide. Every section contributes a title
 * slide; every block with `slide` contributes one slide (a stepper
 * contributes one per frame). The anchor on each slide is the block id, so
 * "Read in the book" lands on the exact paragraph.
 */
export function buildDeck(guide: Guide): Slide[] {
  const slides: Slide[] = [];
  const total = guide.sections.length;
  guide.sections.forEach((section, si) => {
    slides.push({
      section: section.heading,
      sectionId: section.id,
      anchor: section.id,
      content: { kind: "section-title", title: section.heading, index: si + 1, total },
    });
    for (const block of section.blocks) {
      if (!block.slide || block.type === "check") continue;
      const title = typeof block.slide === "string" ? block.slide : undefined;
      if (block.type === "stepper") {
        block.frames.forEach((frame, fi) => {
          slides.push({
            section: section.heading,
            sectionId: section.id,
            anchor: block.id,
            title: title ?? block.title,
            notes: block.slideNotes,
            resources: block.resources,
            content: { kind: "frame", stepperTitle: block.title, frame, index: fi + 1, total: block.frames.length },
          });
        });
      } else {
        slides.push({
          section: section.heading,
          sectionId: section.id,
          anchor: block.id,
          title,
          notes: block.slideNotes,
          resources: block.resources,
          content: { kind: "block", block },
        });
      }
    }
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
