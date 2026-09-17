/**
 * Study content types that are not the guide schema itself: the stepper
 * Frame (shared with study/guide.ts), course metadata, and the Slide shape
 * the deck derives from a guide. Guide content lives in study/guide.ts and
 * ships as JSON under study/guides/.
 */
import type { GuideBlock } from "./guide";


export type Frame =
  /** An array being transformed. `hl` = indices to highlight, `done` = indices
   *  shown as settled. `note` renders under the array (e.g. "key = 5"). */
  | { kind: "array"; cells: (number | string)[]; hl?: number[]; done?: number[]; note?: string; caption: string }
  /** A recursion tree drawn level by level. `levels[i].nodes` are the labels
   *  inside the boxes; `work` is the per-level total shown on the right.
   *  Frames add levels cumulatively — pass the full list each time. */
  | { kind: "tree"; levels: { nodes: string[]; work?: string; hl?: boolean }[]; caption: string }
  /** Lines of math/text; `active` is highlighted, later lines are dimmed. */
  | { kind: "lines"; lines: string[]; active: number; caption: string };

export interface Deadline {
  date: string;
  label: string;
  weight?: string;
  kind: "exam" | "quiz" | "hw" | "project" | "other";
}

export interface Course {
  slug: string;
  code: string;
  title: string;
  instructor: string;
  /** One paragraph on how this professor teaches and tests. */
  howTheyTest: string;
  weights: { label: string; pct: string }[];
  exam: { label: string; date: string; format: string; covers: string };
  deadlines: Deadline[];
  alerts?: { kind: "warn" | "info"; text: string }[];
  /** Before-the-exam checklist. */
  checklist: string[];
  /** Guide slugs (src/study/guides/<course>--<slug>.json), in reading order. */
  guides: string[];
  /** Lectures that exist on Canvas but aren't written yet. */
  planned: { label: string; title: string }[];
}

/** A slide, as derived from a guide (src/study/index.ts). */
export interface Slide {
  /** Section heading, for the deck's running header. */
  section: string;
  sectionId: string;
  /** Block id (or section id) this slide came from — "Read in the book" is exact. */
  anchor: string;
  title?: string;
  content:
    | { kind: "section-title"; title: string; index: number; total: number }
    | { kind: "block"; block: GuideBlock }
    | { kind: "frame"; stepperTitle: string; frame: Frame; index: number; total: number };
}
