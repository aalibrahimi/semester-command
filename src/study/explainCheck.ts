/**
 * explainCheck.ts: the built-in "do I really understand this?" check, with
 * no AI and no network.
 *
 * Called by: components/study/ExplainDialog, study/highlights (key ideas at
 * highlight time). Pure functions; tested in explainCheck.test.ts.
 *
 * Two ways to practice one definition or highlight:
 *
 *   blanks  The text with its key ideas blanked out. Each blank is checked
 *           on its own, forgiving case, punctuation and a small typo.
 *   own     The reader explains it in their own words. Each key idea counts
 *           as covered when most of its meaningful words (stemmed: "heights"
 *           matches "height") appear in the answer. Symbols like O(n), −1
 *           and n² count as words.
 *
 * Either way the result names what was missed, and `nudge` turns the first
 * miss into one hint: the sentence of the original that carries it. Compare
 * with the last attempt to see what you gained and what slipped.
 *
 * Key ideas are the text's **bold** phrases (the chapters bold exactly the
 * words that matter); when a highlight has none, `pickKeys` chooses the most
 * specific words instead.
 */

const STOP = new Set(
  "a an the of to in on at by for from with and or but if then so as is are was were be been being it its this that these those there here which who whom what when where why how not no only just than too very can could should would will may might must do does did done has have had having each every any all some more most less least such into onto over under out up down about between through before after again once also both either neither own same other another their they them we you your our his her he she i me my". split(" "),
);

const GREATER = new Set(["greater", "bigger", "larger", "above", "exceeds", "over"]);
const LESS = new Set(["less", "smaller", "below", "under", "fewer"]);
const NUMBER: Record<string, string> = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", ten: "10" };

/** Lowercase, unify minus signs and quotes, drop markdown asterisks. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[−–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** A rough English stem: enough to match heights/height, sorted/sort, children/child. */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w === "children") return "child";
  for (const [suf, rep] of [
    ["ies", "y"],
    ["ing", ""],
    ["ed", ""],
    ["es", ""],
    ["s", ""],
    ["ly", ""],
  ] as const) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length) + rep;
  }
  return w;
}

/**
 * Words that carry meaning: symbols like o(n), h(left), -1, n², 2i+1 are
 * kept whole; plain words are stemmed; stop words dropped.
 */
export function contentWords(s: string): string[] {
  const out: string[] = [];
  for (let t of norm(s).split(/[\s,;:!?"]+/)) {
    t = t.replace(/^[.'`]+|[.'`]+$/g, "");
    if (t.startsWith("(") && !t.includes(")")) t = t.slice(1);
    if (t.endsWith(")") && !t.includes("(")) t = t.slice(0, -1);
    t = t.replace(/[.']+$/, "");
    if (!t) continue;
    // hyphenated words ("left-heavy") count as their parts
    if (/^[a-z]+(-[a-z]+)+$/.test(t)) {
      for (const part of t.split("-")) if (part.length >= 2 && !STOP.has(part)) out.push(stem(part));
      continue;
    }
    // spoken and written operators and numbers are the same idea
    if (t === "-" || t === "minus" || t === "negative") { out.push("minus"); continue; }
    if (t === "=" || t === "equals" || t === "equal") { out.push("equal"); continue; }
    if (t === ">" || t === "≥" || t === ">=" || GREATER.has(t)) { out.push("gt"); continue; }
    if (t === "<" || t === "≤" || t === "<=" || LESS.has(t)) { out.push("lt"); continue; }
    if (t in NUMBER) { out.push(NUMBER[t]); continue; }
    if (/^-\d+$/.test(t)) { out.push("minus", t.slice(1)); continue; }
    if (/[0-9()=<>≤≥+\-²³ⁿ√⌊⌋|/]/.test(t)) {
      // "h(left" or "child)" are words wrapped in notation: keep the words.
      // Pure math (o(n), -1, n², 2i+1, >) stays whole.
      const runs = t.match(/[a-z]{3,}/g);
      if (runs) for (const r of runs) { if (!STOP.has(r)) out.push(stem(r)); }
      else out.push(t);
      continue;
    }
    const w = t.replace(/[^a-z]/g, "");
    if (w.length < 2 || STOP.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

/** The **bold** phrases of a markdown string, in order, de-duplicated. */
export function boldPhrases(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(/\*\*([^*]+)\*\*/g)) {
    const p = m[1].trim().replace(/[.:,;]+$/, "");
    if (p && !out.some((o) => norm(o) === norm(p))) out.push(p);
  }
  return out;
}

/**
 * Key ideas for a stretch of text when it has no bold phrases: up to `n`
 * of its most specific words (symbols first, then the longest words).
 */
export function pickKeys(text: string, n = 3): string[] {
  const seen = new Set<string>();
  const words: { w: string; score: number; at: number }[] = [];
  norm(text)
    .split(/[\s,;:!?"]+/)
    .forEach((raw, at) => {
      const w = raw.replace(/^[^a-z0-9(]+|[^a-z0-9)²³ⁿ]+$/g, "");
      if (!w || STOP.has(w) || seen.has(w)) return;
      seen.add(w);
      const symbolic = /[0-9()=²³ⁿ]/.test(w);
      if (!symbolic && w.length < 5) return;
      words.push({ w, score: (symbolic ? 100 : 0) + w.length, at });
    });
  return words
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.w);
}

/** Key ideas of a highlight: bold phrases of its source block inside the selection, else picked words. */
export function keysForSelection(selection: string, blockMarkdown: string): string[] {
  const sel = ` ${norm(selection).replace(/[^a-z0-9()=<>≤≥+\-²³ⁿ ]/g, " ")} `;
  const whole = (b: string) => sel.includes(` ${norm(b).replace(/[^a-z0-9()=<>≤≥+\-²³ⁿ ]/g, " ")} `);
  const inside = boldPhrases(blockMarkdown).filter(whole);
  return inside.length ? inside.slice(0, 5) : pickKeys(selection);
}

/* ── Fill in the blanks ─────────────────────────────────────────────────── */

export type Piece = { text: string } | { blank: number; answer: string };

/**
 * Split `text` into plain pieces and blanks, one blank per key idea (its
 * first occurrence). Keys that don't occur in the text are skipped.
 */
export function makeBlanks(text: string, keys: string[]): Piece[] {
  const plain = text.replace(/\*\*/g, "");
  const lower = norm(plain);
  // positions in the normalised string line up with `plain` only when the
  // lengths match; normalisation only changes case, dashes and whitespace
  // runs, so collapse whitespace in `plain` the same way first.
  const src = plain.replace(/\s+/g, " ").trim();
  const hits: { at: number; len: number; answer: string }[] = [];
  for (const k of keys) {
    const at = lower.indexOf(norm(k));
    if (at < 0 || hits.some((h) => at < h.at + h.len && h.at < at + k.length)) continue;
    hits.push({ at, len: norm(k).length, answer: src.slice(at, at + norm(k).length) });
  }
  hits.sort((a, b) => a.at - b.at);
  const out: Piece[] = [];
  let i = 0;
  hits.forEach((h, n) => {
    if (h.at > i) out.push({ text: src.slice(i, h.at) });
    out.push({ blank: n, answer: h.answer });
    i = h.at + h.len;
  });
  if (i < src.length) out.push({ text: src.slice(i) });
  return out;
}

/** Edit distance, capped (only small typos matter). */
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** One blank: exact after normalising, a typo or two on longer answers, or every content word present. */
export function blankOk(input: string, answer: string): boolean {
  const a = norm(input).replace(/[.,;:]+$/, "");
  const b = norm(answer).replace(/[.,;:]+$/, "");
  if (!a) return false;
  if (a === b || a.replace(/\s/g, "") === b.replace(/\s/g, "")) return true;
  if (b.length >= 6 && lev(a, b) <= (b.length >= 12 ? 2 : 1)) return true;
  const want = [...new Set(contentWords(b))];
  const got = new Set(contentWords(a));
  const hit = want.filter((w) => got.has(w)).length;
  // short answers need every word; long ones (a whole formula) most of them
  return want.length > 0 && (want.length >= 4 ? hit / want.length >= 0.6 : hit === want.length);
}

/* ── In your own words ──────────────────────────────────────────────────── */

export interface Coverage {
  covered: string[];
  missed: string[];
  /** covered / total, 0..1 */
  score: number;
}

/** Is one key idea present in the answer? Most of its content words must be. */
export function covers(answer: string, key: string): boolean {
  const want = [...new Set(contentWords(key))];
  if (!want.length) return norm(answer).includes(norm(key));
  const got = new Set(contentWords(answer));
  const hit = want.filter((w) => got.has(w) || [...got].some((g) => g.length >= 4 && (g.startsWith(w) || w.startsWith(g)))).length;
  // a comparison is the whole point of keys like "B > 1": the direction must be there
  if (want.some((w) => (w === "gt" || w === "lt") && !got.has(w))) return false;
  // a long key (a formula, a rule) is covered by its core; a short one needs most of it
  return hit >= Math.ceil(want.length * (want.length >= 4 ? 0.5 : 0.6));
}

export function coverage(answer: string, keys: string[]): Coverage {
  const covered = keys.filter((k) => covers(answer, k));
  const missed = keys.filter((k) => !covered.includes(k));
  return { covered, missed, score: keys.length ? covered.length / keys.length : 0 };
}

/** The sentence of `reference` that contains `key`, as the hint behind a nudge. */
export function sentenceWith(reference: string, key: string): string | null {
  const plain = reference.replace(/\*\*/g, "");
  const sentences = plain.split(/(?<=[.!?])\s+(?=[A-Z0-9(])/);
  return sentences.find((s) => norm(s).includes(norm(key))) ?? null;
}

export type Verdict = "right" | "almost" | "wrong";

export function verdictOf(score: number, total: number): Verdict {
  if (total === 0) return "almost";
  if (score >= 0.999) return "right";
  if (score >= 0.5 || total - Math.round(score * total) === 1) return "almost";
  return "wrong";
}

/** One plain sentence: what's missing, or that it's all there. */
export function nudge(c: Coverage): string {
  if (!c.missed.length) return "You covered every key idea. Say it once more out loud without looking, and it's yours.";
  if (c.missed.length === 1) return `You're one idea away: you haven't said anything about "${c.missed[0]}". Add that and it's complete.`;
  return `Start with "${c.missed[0]}": that's the piece the rest depends on. Then ${c.missed.length - 1} more to go.`;
}

/* ── Compare with last time ─────────────────────────────────────────────── */

export interface Comparison {
  /** Missed last time, covered now. */
  gained: string[];
  /** Covered last time, missed now. */
  slipped: string[];
  /** Missed both times: the real gap. */
  stuck: string[];
  delta: number;
}

export function compare(prevMissed: string[], prevScore: number, now: Coverage): Comparison {
  return {
    gained: prevMissed.filter((k) => now.covered.includes(k)),
    slipped: now.missed.filter((k) => !prevMissed.includes(k)),
    stuck: now.missed.filter((k) => prevMissed.includes(k)),
    delta: now.score - prevScore,
  };
}
