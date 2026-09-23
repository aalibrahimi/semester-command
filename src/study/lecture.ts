/**
 * lecture.ts — what the deck says out loud, and how a figure builds up.
 *
 * Called by: routes/StudySlides.tsx (lecture mode).
 * Calls: nothing (DOMParser / XMLSerializer from the browser).
 *
 * Narration: the slide's presenter notes when it has them, otherwise the
 * block's own text with the inline marks stripped, so every slide can be
 * read aloud without extra authoring. Figures narrate their tooltip
 * titles one group at a time, which is also the build order.
 */
import type { GuideBlock } from "./guide";
import type { Slide } from "./types";

/** Strip the guide's inline marks (**, *, `, ==, !!, ##) and markdown bullets. */
export function plain(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/!!([^!]+)!!/g, "$1")
    .replace(/##([^#]+)##/g, "$1")
    .replace(/^\s*(?:-|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function blockText(b: GuideBlock): string {
  switch (b.type) {
    case "prose":
      return plain(b.md);
    case "definition":
      return `${b.term}. ${plain(b.body)}`;
    case "example":
      return `${b.title}. ${plain(b.body).slice(0, 600)}`;
    case "trap":
      return `This costs points. ${plain(b.body)}`;
    case "table":
      return `${b.title ?? "A table"}: ${b.columns.filter(Boolean).join(", ")}. ${b.rows.map((r) => r.join(", ")).join(". ")}`;
    case "figure":
    case "diagram":
      return plain(b.caption);
    case "sim":
      return `Try it yourself. ${plain(b.caption)}`;
    case "stepper":
      return b.title;
    case "code":
      return `Your turn in Python. ${b.title}. ${plain(b.task)}`;
    case "check":
      return b.prompt;
  }
}

/** The figure's build-up groups: every <g> with a direct <title>, in order. */
export function figureGroups(svg: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`, "image/svg+xml");
    const out: string[] = [];
    for (const g of Array.from(doc.querySelectorAll("g"))) {
      const t = Array.from(g.children).find((c) => c.tagName.toLowerCase() === "title");
      if (t?.textContent) out.push(t.textContent.trim());
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * The figure with groups after `step` dimmed and group `step` emphasised.
 * `step` ≥ groups.length shows everything as authored.
 */
export function figureAtStep(svg: string, step: number): string {
  try {
    const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`, "image/svg+xml");
    const groups = Array.from(doc.querySelectorAll("g")).filter((g) => Array.from(g.children).some((c) => c.tagName.toLowerCase() === "title"));
    if (step >= groups.length) return svg;
    groups.forEach((g, i) => {
      if (i > step) g.setAttribute("opacity", "0.12");
      else if (i === step) g.setAttribute("style", "filter: drop-shadow(0 0 3px rgb(var(--accent) / 0.6))");
    });
    const root = doc.documentElement;
    return Array.from(root.childNodes)
      .map((n) => new XMLSerializer().serializeToString(n))
      .join("");
  } catch {
    return svg;
  }
}

/** What to say for a slide (and, for a figure, for one build step). */
export function narration(slide: Slide, step?: number): string {
  const c = slide.content;
  if (c.kind === "section-title") return `Section ${c.index}. ${c.title}.`;
  if (c.kind === "frame") return `${c.index === 1 ? c.stepperTitle + ". " : ""}${plain(c.frame.caption)}`;
  const b = c.block;
  if (b.type === "figure") {
    const groups = figureGroups(b.svg);
    if (step !== undefined && step < groups.length) return groups[step];
    return slide.notes ? plain(slide.notes) : plain(b.caption);
  }
  if (slide.notes) return `${blockText(b)} ${plain(slide.notes)}`;
  return blockText(b);
}

/** Slides worth keeping when a deck is long: the deliberate ones. */
export function isEssential(slide: Slide): boolean {
  const c = slide.content;
  if (c.kind !== "block") return true;
  const b = c.block;
  if (slide.title) return true;
  if (b.type === "figure" || b.type === "diagram" || b.type === "sim" || b.type === "trap" || b.type === "definition" || b.type === "table") return true;
  if (b.type === "prose" && b.label) return true;
  return false;
}
