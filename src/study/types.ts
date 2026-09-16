/**
 * Study content model — chapters that double as slide decks.
 *
 * Called by: src/study/chapters/*.ts, src/study/courses.ts, src/study/index.ts,
 * src/components/study/*, src/routes/Study*.tsx.
 * Calls: nothing.
 *
 * ONE source of truth. A chapter is prose (the "book"). Any block can carry
 * `slide: true` (or a slide title) and it then also appears in the chapter's
 * deck, in order. A stepper expands into one slide per frame. Because the
 * deck is derived from the chapter, every slide can link back to the exact
 * paragraph it came from — "nothing gets lost in translation" is a property
 * of the data, not a promise.
 *
 * Teaching order inside a section (the rule every chapter follows):
 *   why this exists → one concrete example → the idea → a second example that
 *   sharpens it → try one → the compressed form (formula / definition).
 */

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

export type Block =
  | { id?: string; t: "p"; text: string; slide?: boolean | string }
  /** Sub-heading inside a section. */
  | { id?: string; t: "h"; text: string }
  | { id?: string; t: "list"; items: string[]; slide?: boolean | string }
  /** Monospace: formulas, code, traces. */
  | { id?: string; t: "code"; text: string; caption?: string; slide?: boolean | string }
  /** The reason a thing exists — always before the formula. */
  | { id?: string; t: "why"; title?: string; text: string; slide?: boolean | string }
  /** How the professor says/asks it. */
  | { id?: string; t: "prof"; title?: string; text: string; slide?: boolean | string }
  /** A mistake people make here. */
  | { id?: string; t: "warn"; title?: string; text: string; slide?: boolean | string }
  /** The compressed form, once it has been earned. */
  | { id?: string; t: "def"; term: string; text: string; slide?: boolean | string }
  /** An SVG figure, inline. `svg` is the inner markup of a viewBox'd <svg>. */
  | { id?: string; t: "figure"; svg: string; viewBox: string; caption: string; slide?: boolean | string }
  /** A step-by-step animation the reader clicks through. */
  | { id?: string; t: "stepper"; title: string; frames: Frame[]; slide?: boolean | string }
  /** Worked example, fully shown. */
  | { id?: string; t: "worked"; title: string; problem: string; steps: string[]; answer?: string; slide?: boolean | string }
  /** Reader tries; answer hidden until revealed. */
  | { id?: string; t: "try"; q: string; a: string; slide?: boolean | string }
  /** Small table; first row is the header. */
  | { id?: string; t: "table"; rows: string[][]; slide?: boolean | string };

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Chapter {
  /** Route segment, unique within the course. */
  slug: string;
  /** "Lecture 6–7" / "Chapter 0". */
  label: string;
  title: string;
  /** What Canvas material this was built from. */
  source: string;
  /** One sentence: what you'll be able to do after. */
  goal: string;
  /** ~minutes to read the book version. */
  minutes: number;
  /** Chapters this one assumes (slugs). Shown as "read first". */
  requires?: string[];
  sections: Section[];
  /** "Do it yourself": hands-on problems with a hint ladder. Rendered after the sections. */
  practice?: Exercise[];
}

/**
 * One hands-on exercise. The reader works it on paper (or in a notebook) and
 * opens hints one at a time. `hints` is a ladder in a fixed order:
 *   [0] a nudge — where to start, without giving anything away
 *   [1] the mistake most people make here, and how to notice it
 *   [2] how to think about the problem — the frame, not the answer
 * `solution` is the full worked answer; `why` says why this skill matters
 * outside the exam. `choices` makes it a pick-one question: each wrong choice
 * carries its own feedback (what that mistake reveals).
 */
export interface Exercise {
  id: string;
  title: string;
  /** The task, in full. Inline markup allowed. */
  prompt: string;
  /** Optional code / data the task refers to. */
  code?: string;
  /** Pick-one variant. `answer` is the index of the right choice. */
  choices?: { text: string; feedback: string }[];
  answer?: number;
  hints: [string, string, string];
  solution: string[];
  why: string;
}

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
  /** Written chapters, in reading order. */
  chapters: Chapter[];
  /** Lectures that exist on Canvas but aren't written yet. */
  planned: { label: string; title: string }[];
}

/** A slide, as derived from a chapter. */
export interface Slide {
  /** Section title, for the deck's running header. */
  section: string;
  sectionId: string;
  /** Anchor in the chapter this slide came from. */
  anchor: string;
  title?: string;
  /** Either a block (rendered like the book) or one frame of a stepper. */
  content:
    | { kind: "section-title"; title: string; index: number; total: number }
    | { kind: "block"; block: Block }
    | { kind: "frame"; stepperTitle: string; frame: Frame; index: number; total: number };
}
