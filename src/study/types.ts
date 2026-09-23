/**
 * Study content types that are not the guide schema itself: the stepper
 * Frame (shared with study/guide.ts), course metadata, and the Slide shape
 * the deck derives from a guide. Guide content lives in study/guide.ts and
 * ships as JSON under study/guides/.
 */
import type { GuideBlock, GuideResource } from "./guide";


export type Frame =
  /** An array being transformed. `hl` = indices to highlight, `done` = indices
   *  shown as settled, `dim` = indices out of play (grayed, dashed). `ptrs`
   *  names indexes with a labeled arrow under the cell ({ low: 0, mid: 4 });
   *  the arrows slide between frames. `note` renders under the array.
   *  Items with the same value keep their identity across frames, so a
   *  swap or a shift is animated as the items actually moving. */
  | { kind: "array"; cells: (number | string)[]; hl?: number[]; done?: number[]; dim?: number[]; ptrs?: Record<string, number>; note?: string; caption: string }
  /** Several labeled arrays at once (two piles and an output, a heap and its
   *  sorted tail). An item that moves from one row to another flies there.
   *  `null` cells are empty slots (dashed); "" cells are nothing at all
   *  (spacing). `offset` shifts a row right by that many columns (may be
   *  fractional, to center it); `at` instead gives each cell its own column
   *  (for tree-shaped layouts). `ptrs` entries are [row, index]. */
  | {
      kind: "rows";
      rows: { label?: string; cells: (number | string | null)[]; offset?: number; at?: number[]; hl?: number[]; done?: number[]; dim?: number[] }[];
      ptrs?: Record<string, [number, number]>;
      note?: string;
      caption: string;
    }
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
  /** Presenter notes from the source block — the slide's "More" panel. */
  notes?: string;
  /** Verified external links from the source block, as chips. */
  resources?: GuideResource[];
  content:
    | { kind: "section-title"; title: string; index: number; total: number }
    | { kind: "block"; block: GuideBlock }
    | { kind: "frame"; stepperTitle: string; frame: Frame; index: number; total: number };
}
