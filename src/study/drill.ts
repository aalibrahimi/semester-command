/**
 * drill.ts — generated, checked practice.
 *
 * A drill is a small generator: give it a seeded random source and it
 * returns one fresh problem instance with the accepted answer, a worked
 * solution for THAT instance, and (optionally) a diagnosis function that
 * looks at a wrong answer and names the mistake it usually means.
 *
 * Called by: components/study/Drill.tsx (the "Put it to the test" panel and
 * focus mode), scripts/check-drills.ts (self-consistency), later the mock
 * exam and Recall.
 * Calls: nothing. Pure functions only — grading has no side effects.
 *
 * Drill sets live in study/drills/<course>--<slug>.ts, one file per guide,
 * and bind to a section id so the panel can show them right after the
 * section's blocks. The `id` is `${sectionRef}!${slug}` and is what the
 * attempt log records; keep it stable once attempts exist for it.
 */

/* ── Seeded randomness (mulberry32) ─────────────────────────────────────── */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Integer in [lo, hi], inclusive. */
  int(lo: number, hi: number): number;
  /** One element of a non-empty array. */
  pick<T>(xs: readonly T[]): T;
  /** A fresh shuffled copy. */
  shuffle<T>(xs: readonly T[]): T[];
  /** `n` distinct elements. */
  sample<T>(xs: readonly T[], n: number): T[];
}

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const shuffle = <T>(xs: readonly T[]) => {
    const out = xs.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return {
    next,
    int,
    pick: (xs) => xs[int(0, xs.length - 1)],
    shuffle,
    sample: (xs, n) => shuffle(xs).slice(0, n),
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

/* ── Answers ───────────────────────────────────────────────────────────── */

export type DrillAnswer =
  /** A number; `tolerance` is absolute (default 1e-6 relative-ish). */
  | { kind: "number"; value: number; tolerance?: number; unit?: string }
  /** Free text; any of `accept` matches after normalisation. */
  | { kind: "text"; accept: string[]; placeholder?: string }
  /** Unordered list, typed comma-separated. `items` is the canonical form. */
  | { kind: "set"; items: string[]; placeholder?: string }
  /** Ordered list, typed comma- or arrow-separated. */
  | { kind: "sequence"; items: string[]; placeholder?: string }
  /** One of `options`; `feedback[i]` explains why option i is wrong (or right). */
  | { kind: "choice"; options: string[]; correct: number; feedback?: string[] }
  /** Writing tasks: the reader ticks what their answer contains. All items = correct. */
  | { kind: "checklist"; items: string[] }
  /** Free text judged by code (a regex run against test words, say). `display` is the model answer. */
  | { kind: "custom"; check: (input: string) => boolean; display: string; placeholder?: string };

export interface DrillInstance {
  /** Markdown-ish (Inline marks). Read aloud, this is the whole question. */
  prompt: string;
  code?: string;
  answer: DrillAnswer;
  /** Worked solution for this instance, one step per line. */
  steps: string[];
  /** One nudge, shown on request before the solution. */
  hint?: string;
  /**
   * Given the reader's raw input, name what the mistake usually means
   * ("You gave Fₛ − F: that's the alias, not the Nyquist frequency").
   * Return undefined when nothing specific applies.
   */
  diagnose?: (input: string) => string | undefined;
}

export interface Drill {
  /** `${sectionRef}!${slug}` — stable; the attempt log keys on it. */
  id: string;
  guideId: string;
  sectionRef: string;
  title: string;
  /** What being able to do this proves, in one line. Shown under the title. */
  skill: string;
  gen: (r: Rng) => DrillInstance;
}

/* ── Grading ───────────────────────────────────────────────────────────── */

export interface GradeResult {
  correct: boolean;
  /** The answer as the reader typed it, normalised for the log. */
  input: string;
  /** The accepted answer rendered for display. */
  expected: string;
}

export function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[−–—]/g, "-")
    .replace(/\s*([,;→>])\s*/g, "$1");
}

function splitList(s: string): string[] {
  // Commas, semicolons, arrows and newlines separate items; if the reader
  // used none of those, plain spaces do.
  const hasSep = /[,;\n]|→|->|>/.test(s);
  return s
    .split(hasSep ? /[,;\n]|→|->|>/ : /\s+/)
    .map((x) => norm(x))
    .filter(Boolean);
}

function parseNumber(s: string): number | null {
  const cleaned = s.replace(/[,\s]/g, "").replace(/[−–—]/g, "-");
  // Allow simple fractions and powers written as 2^12 or 2**12.
  const frac = cleaned.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const pow = cleaned.match(/^(-?\d+(?:\.\d+)?)(?:\^|\*\*)(-?\d+)$/);
  if (pow) return Math.pow(Number(pow[1]), Number(pow[2]));
  const n = Number(cleaned.replace(/[a-zµ%°]+$/i, ""));
  return Number.isFinite(n) && cleaned !== "" ? n : null;
}

/** Render the accepted answer for display after a miss. */
export function expectedText(a: DrillAnswer): string {
  switch (a.kind) {
    case "number":
      return `${a.value}${a.unit ? " " + a.unit : ""}`;
    case "text":
      return a.accept[0];
    case "set":
      return a.items.join(", ");
    case "sequence":
      return a.items.join(" → ");
    case "choice":
      return a.options[a.correct];
    case "checklist":
      return a.items.join("; ");
    case "custom":
      return a.display;
  }
}

/**
 * Grade a raw input. For `choice` the input is the option index as a string;
 * for `checklist` it is the ticked indices comma-separated.
 */
export function grade(a: DrillAnswer, raw: string): GradeResult {
  const expected = expectedText(a);
  switch (a.kind) {
    case "number": {
      const n = parseNumber(raw);
      const tol = a.tolerance ?? Math.max(1e-9, Math.abs(a.value) * 1e-6);
      return { correct: n !== null && Math.abs(n - a.value) <= tol, input: raw.trim(), expected };
    }
    case "text": {
      const got = norm(raw);
      return { correct: a.accept.some((x) => norm(x) === got), input: raw.trim(), expected };
    }
    case "set": {
      const got = splitList(raw);
      const want = a.items.map(norm);
      const ok = got.length === want.length && want.every((w) => got.includes(w)) && new Set(got).size === got.length;
      return { correct: ok, input: got.join(", "), expected };
    }
    case "sequence": {
      const got = splitList(raw);
      const want = a.items.map(norm);
      const ok = got.length === want.length && want.every((w, i) => got[i] === w);
      return { correct: ok, input: got.join(" → "), expected };
    }
    case "choice": {
      const i = Number(raw);
      return { correct: i === a.correct, input: a.options[i] ?? raw, expected };
    }
    case "checklist": {
      const ticked = raw
        .split(",")
        .map((x) => Number(x))
        .filter((x) => Number.isInteger(x));
      const ok = a.items.every((_, i) => ticked.includes(i));
      return { correct: ok, input: `${ticked.length}/${a.items.length}`, expected };
    }
    case "custom": {
      let ok = false;
      try {
        ok = a.check(raw);
      } catch {
        ok = false;
      }
      return { correct: ok, input: raw.trim(), expected };
    }
  }
}

/* ── Small helpers drill files share ───────────────────────────────────── */

/** Format a number the way the guides print them: thousands separated. */
export function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Make a plain choice answer with the correct option first, then shuffle. */
export function choice(r: Rng, correct: string, wrong: string[], feedback?: { correct?: string; wrong?: string[] }): DrillAnswer {
  // Drop distractors that collide with the answer or each other (generated
  // options can coincide for small parameters).
  const seen = new Set([correct]);
  const distinct = wrong
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => (seen.has(t) ? false : (seen.add(t), true)));
  const items = [{ t: correct, ok: true, f: feedback?.correct }, ...distinct.map(({ t, i }) => ({ t, ok: false, f: feedback?.wrong?.[i] }))];
  const shuffled = r.shuffle(items);
  return {
    kind: "choice",
    options: shuffled.map((x) => x.t),
    correct: shuffled.findIndex((x) => x.ok),
    feedback: shuffled.map((x) => x.f ?? ""),
  };
}
