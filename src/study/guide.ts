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
  | FigureBlock;

interface BlockBase {
  /** `${sectionId}.${hash8}` — what mastery records and Recall cards point at. */
  id: string;
  /**
   * Slide deck: `true` makes this block a slide; a string is the slide's
   * title. Blocks without it stay in the book only. Steppers expand to one
   * slide per frame.
   */
  slide?: true | string;
}

/** A markdown paragraph. Lists and sub-headings are markdown too. */
export interface ProseBlock extends BlockBase {
  type: "prose";
  md: string;
  /** "why": the paragraph explains why a concept exists (rendered with a small label). */
  label?: "why";
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
