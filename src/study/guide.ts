/**
 * guide.ts — the typed study-guide schema every Study view (Read, Cheat sheet,
 * Recall, Map) renders from.
 *
 * Called by: the Study views, the Recall card generator, the Map edge
 * builder, and scripts/check-guides.ts (which validates the JSON against
 * this shape). The guides/*.json files are the canonical content source.
 * Calls: nothing.
 *
 * A guide is content only. Nothing here records what the reader knows — that
 * lives in the mastery store (src/study/mastery.ts), keyed by the ids below.
 * Ids are therefore stable and content-derived: `${sectionId}` for sections,
 * `${sectionId}.${hash8}` for blocks, where hash8 is the first 8 hex chars of
 * FNV-1a over the block's type + primary text. Inserting a block mid-section
 * leaves every other block's id — and its mastery rows — untouched.
 */

import type { Frame } from "./types";

export interface Guide {
  /** Stable id, `${course}/${slug}` — the mastery store's key. */
  id: string;
  /** Course slug the app already uses ("cs154"). */
  course: string;
  /** Lesson / lecture / week range as the syllabus names it ("Lessons 3–4"). */
  lessons: string;
  title: string;
  /** One or two sentences: what you can do after reading. */
  summary: string;
  estimatedMinutes: number;
  /** What the guide was built from (slides, keys, readings). */
  sourceNote: string;
  /** Guides this one assumes (ids). Shown as "read first". */
  requires: string[];
  sections: GuideSection[];
  /**
   * Hands-on exercises with the hint ladder (the "Do it yourself" sets).
   * Richer than a `check`: multiple choice with per-wrong-answer feedback,
   * three hints, a stepped solution.
   */
  exercises: GuideExercise[];
}

export interface GuideSection {
  /** Stable within the guide. */
  id: string;
  heading: string;
  blocks: GuideBlock[];
}

export type GuideBlock =
  | ProseBlock
  | DefinitionBlock
  | TableBlock
  | ExampleBlock
  | TrapBlock
  | CheckBlock
  | StepperBlock
  | FigureBlock
  | DiagramBlock
  | SimBlock
  | CodeBlock;

/** A verified external link that teaches this exact block's idea — an
 *  interactive visualization or a video. Curated and CHECKED (the URL was
 *  actually opened before being committed), never a search-results dump. */
export interface GuideResource {
  label: string;
  url: string;
  kind?: "video" | "site";
}

interface BlockBase {
  /** `${sectionId}.${hash8}` — what mastery records and Recall cards point at. */
  id: string;
  /**
   * Slide deck: `true` makes this block a slide; a string is the slide's
   * title. Blocks without it stay in the book only. Steppers expand to one
   * slide per frame.
   */
  slide?: true | string;
  /**
   * Presenter notes: the deeper explanation behind a "More" button on the
   * slide — context that would crowd the slide but rescues a confused
   * reader. Same inline markup as prose.
   */
  slideNotes?: string;
  /** External links shown as chips under the block (book and slides). */
  resources?: GuideResource[];
}

export const PROSE_LABELS = ["why", "world", "think", "when"] as const;
export type ProseLabel = (typeof PROSE_LABELS)[number];

/** A markdown paragraph. Lists and sub-headings are markdown too. */
export interface ProseBlock extends BlockBase {
  type: "prose";
  md: string;
  /**
   * A labeled callout instead of a plain paragraph:
   *   why    why the concept exists at all (the problem it solves)
   *   world  where it shows up in real software, with a concrete product
   *   think  how to think about it: a recipe, "when you see X, do Y"
   *   when   when to use it and when not to (a decision guide)
   */
  label?: ProseLabel;
}

/** A click-through walkthrough: one Frame per step (array / tree / lines). */
export interface StepperBlock extends BlockBase {
  type: "stepper";
  title: string;
  frames: Frame[];
}

/** An inline SVG diagram. `svg` is the inner markup; `viewBox` sizes it. */
export interface FigureBlock extends BlockBase {
  type: "figure";
  svg: string;
  viewBox: string;
  caption: string;
}

/** The kinds components/study/Diagram.tsx can draw. */
export const DIAGRAM_KINDS = ["roadmap", "codecount", "cards", "levels", "bigo", "formula"] as const;

/**
 * A picture built from the app's own UI (cards, chips, bars) rather than a
 * drawn SVG: a chapter roadmap, code with per-line counts, comparison
 * cards, per-level cost bars, the Big-O definition plot. `data`'s shape
 * depends on `kind` (see Diagram.tsx).
 */
export interface DiagramBlock extends BlockBase {
  type: "diagram";
  kind: (typeof DIAGRAM_KINDS)[number];
  data: Record<string, unknown>;
  caption: string;
}

/**
 * An interactive simulator: a registered React component (components/study/
 * sims) fed by `params`. The reader changes the dials and watches, or types a
 * string and runs the machine. `sim` must be one of study/sims.ts SIM_NAMES.
 */
export interface SimBlock extends BlockBase {
  type: "sim";
  sim: string;
  params?: Record<string, unknown>;
  /** What to try, in one or two sentences. */
  caption: string;
}

/**
 * A Python cell the reader edits and runs in the app (Pyodide, see
 * lib/python). With `check` it is an exercise: after the reader's code runs,
 * the hidden check runs in the same namespace and each failed `assert`
 * shows its message as the feedback. Without `check` it is a "try it" cell.
 */
export interface CodeBlock extends BlockBase {
  type: "code";
  title: string;
  /** What to do, in the reader's words. Same inline markup as prose. */
  task: string;
  /** What the editor starts with. */
  starter: string;
  /** Hidden code run first, e.g. data the task needs. */
  setup?: string;
  /** Hidden asserts with plain-language messages. */
  check?: string;
  /** Up to three hints, shown one at a time. */
  hints?: string[];
  /** A working answer, revealed on request. */
  solution?: string;
  /** Shown once the check passes: what just happened and why it matters. */
  success?: string;
}

/** "The bold terms." One term, one body. */
export interface DefinitionBlock extends BlockBase {
  type: "definition";
  term: string;
  body: string;
  /**
   * Map view: terms this definition depends on that a case-insensitive text
   * match would miss (synonyms, symbols). Optional, hand-maintained.
   */
  related?: string[];
}

export interface TableBlock extends BlockBase {
  type: "table";
  /** Optional caption shown above the table in the cheat sheet. */
  title?: string;
  columns: string[];
  rows: string[][];
}

/** A worked example or code. `body` is rendered monospace-friendly. */
export interface ExampleBlock extends BlockBase {
  type: "example";
  title: string;
  body: string;
  /**
   * Recall view: when set, the "compute it" card hides this line and asks
   * for it. Migration fills it from `worked.answer` when there is one.
   */
  answer?: string;
}

/** The "costs points" callouts. */
export interface TrapBlock extends BlockBase {
  type: "trap";
  body: string;
  /** Where the points were lost: "Assignment 2", "HW 3", "Lab 2 Q9", "Midterm". */
  source: string;
  /** Points at stake as the professor states them, e.g. "−0.5". Null when unknown. */
  points: string | null;
}

/** A self-test question. */
export interface CheckBlock extends BlockBase {
  type: "check";
  prompt: string;
  answer: string;
  /** Section the check belongs to (its own section unless it tests another). */
  sectionRef: string;
}

/** Unchanged from the chapter model's `Exercise`; see study/types.ts. */
export interface GuideExercise {
  id: string;
  title: string;
  prompt: string;
  code?: string;
  choices?: { text: string; feedback: string }[];
  answer?: number;
  /**
   * Fill in the blank: any of these, after normalising (case, spaces,
   * dashes), counts as right. Numbers are compared within 1%, so "0.5",
   * ".50" and "1/2" style variants should be listed if they matter.
   */
  accept?: string[];
  hints: [string, string, string];
  solution: string[];
  why: string;
  /** Section this exercise drills (best-effort, set by migration by keyword). */
  sectionRef?: string;
}

/* ── Helpers every view shares ────────────────────────────────────────────── */

export function blocksOfType<T extends GuideBlock["type"]>(
  guide: Guide,
  type: T,
): Extract<GuideBlock, { type: T }>[] {
  return guide.sections.flatMap((s) => s.blocks.filter((b): b is Extract<GuideBlock, { type: T }> => b.type === type));
}

export function sectionOf(guide: Guide, blockId: string): GuideSection | undefined {
  const sid = blockId.slice(0, blockId.lastIndexOf("."));
  return guide.sections.find((s) => s.id === sid);
}
