/**
 * Drills for CS 154 · Strings and languages: |w|, reversal, prefix/suffix
 * pairs, |Σⁿ|, L⁰ vs w⁰, |L₁L₂|, and the 12 notation rules.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs154/3-strings-languages";

function word(r: Rng, lo: number, hi: number, sigma = ["a", "b"]): string {
  let w = "";
  const n = r.int(lo, hi);
  for (let i = 0; i < n; i++) w += r.pick(sigma);
  return w;
}

export const drills: Drill[] = [
  {
    id: "strings!length",
    guideId: G,
    sectionRef: "strings",
    title: "Length, with λ in the way",
    skill: "|w| counts symbols; λ adds nothing; |uv| = |u| + |v|.",
    gen(r) {
      const u = word(r, 1, 4);
      const v = word(r, 1, 4);
      const mode = r.pick(["lambda", "concat", "power"]);
      if (mode === "lambda") {
        const w = `${u}λ${v}`;
        return {
          prompt: `What is **|${w}|**?`,
          answer: { kind: "number", value: u.length + v.length },
          steps: [`λ is the empty string: it contributes no symbols.`, `${w} = ${u}${v}, so the length is ${u.length} + ${v.length} = ${u.length + v.length}.`],
          diagnose(input) {
            const v2 = Number(input.replace(/[^0-9]/g, ""));
            if (v2 === u.length + v.length + 1) return "You counted λ as a symbol. It is the empty string, zero symbols, and it can never be a symbol of an alphabet.";
            return undefined;
          },
        };
      }
      if (mode === "concat")
        return {
          prompt: `u = ${u}, v = ${v}. What is **|uv|**?`,
          answer: { kind: "number", value: u.length + v.length },
          steps: [`uv = ${u}${v}.`, `|uv| = |u| + |v| = ${u.length} + ${v.length} = ${u.length + v.length}.`],
        };
      const k = r.int(0, 3);
      const w = word(r, 1, 2);
      return {
        prompt: `w = ${w}. What is **|w${k === 0 ? "⁰" : k === 1 ? "¹" : k === 2 ? "²" : "³"}|**?`,
        answer: { kind: "number", value: k * w.length },
        steps: [`wᵏ is w written k times.`, k === 0 ? `w⁰ = λ, so the length is 0.` : `${k} × |${w}| = ${k} × ${w.length} = ${k * w.length}.`],
        hint: "An exponent on a string repeats it. w⁰ is λ.",
      };
    },
  },
  {
    id: "strings!reverse",
    guideId: G,
    sectionRef: "strings",
    title: "Reverse it",
    skill: "wᴿ reads the string backwards, symbol by symbol.",
    gen(r) {
      const w = word(r, 3, 6, ["a", "b", "c"]);
      const rev = w.split("").reverse().join("");
      return {
        prompt: `w = **${w}**. Write wᴿ.`,
        answer: { kind: "text", accept: [rev], placeholder: "type the string" },
        steps: [`Read ${w} from the right: ${rev}.`],
        diagnose(input) {
          const s = input.trim();
          if (s === w) return "That is w itself. Reversal writes the last symbol first.";
          if (s.length !== w.length) return `wᴿ has the same length as w (${w.length}). You wrote ${s.length} symbols.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "strings!splits",
    guideId: G,
    sectionRef: "strings",
    title: "Prefix and suffix pairs",
    skill: "A string of length n has n + 1 (prefix, suffix) splits, counting λ and w itself.",
    gen(r) {
      const w = word(r, 2, 6);
      const mode = r.next() < 0.5;
      if (mode)
        return {
          prompt: `w = **${w}**. How many (prefix, suffix) pairs does w have, with w = prefix·suffix?`,
          answer: { kind: "number", value: w.length + 1 },
          steps: [`A split is a cut position. ${w.length} symbols give ${w.length + 1} cut positions: before the first, between each pair, after the last.`, `(λ, ${w}) … (${w}, λ): ${w.length + 1} pairs.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9]/g, ""));
            if (v === w.length - 1) return "You left out both ends. λ is a prefix (cut before the first symbol) and w is a prefix (cut after the last).";
            if (v === w.length) return "One short: count the cut positions, not the symbols. Both λ and w itself count.";
            return undefined;
          },
        };
      const k = r.int(0, w.length);
      const p = w.slice(0, k);
      return {
        prompt: `w = **${w}**. If the prefix is **${p === "" ? "λ" : p}**, what is the matching suffix?`,
        answer: { kind: "text", accept: [w.slice(k) === "" ? "λ" : w.slice(k), w.slice(k) === "" ? "lambda" : w.slice(k)], placeholder: "the string, or λ" },
        steps: [`w = prefix · suffix, so the suffix is what remains after ${p === "" ? "nothing" : p}: ${w.slice(k) === "" ? "λ" : w.slice(k)}.`],
      };
    },
  },
  {
    id: "languages!count",
    guideId: G,
    sectionRef: "languages",
    title: "How many strings",
    skill: "|Σⁿ| = |Σ|ⁿ, and |L₁L₂| ≤ |L₁|·|L₂| (count distinct results).",
    gen(r) {
      if (r.next() < 0.5) {
        const s = r.int(2, 3);
        const n = r.int(0, 4);
        return {
          prompt: `Σ has **${s} symbols**. How many strings of length exactly **${n}** are there over Σ?`,
          answer: { kind: "number", value: s ** n },
          steps: [`Each of the ${n} positions holds one of ${s} symbols.`, `${s}^${n} = ${s ** n}${n === 0 ? " (just λ)" : ""}.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9]/g, ""));
            if (v === s * n) return "You multiplied |Σ| by n. Choices multiply across positions: |Σ| raised to n.";
            if (n === 0 && v === 0) return "Length 0 still has one string: λ. |Σ⁰| = 1.";
            return undefined;
          },
        };
      }
      const L1 = r.sample(["a", "b", "ab", "λ"], 2);
      const L2 = r.sample(["b", "ba", "λ", "aa"], 2);
      const cat = (u: string, v: string) => (u === "λ" ? "" : u) + (v === "λ" ? "" : v);
      const results = new Set<string>();
      for (const u of L1) for (const v of L2) results.add(cat(u, v));
      const items = [...results].map((x) => (x === "" ? "λ" : x));
      return {
        prompt: `L₁ = {${L1.join(", ")}}, L₂ = {${L2.join(", ")}}. Write **L₁L₂** as a roster (comma-separated; write λ for the empty string).`,
        answer: { kind: "set", items, placeholder: "e.g. ab, b, λ" },
        steps: [`L₁L₂ = { uv | u ∈ L₁, v ∈ L₂ }: every first from L₁ glued to every second from L₂.`, ...L1.map((u) => `${u} · {${L2.join(", ")}} → ${L2.map((v) => (cat(u, v) === "" ? "λ" : cat(u, v))).join(", ")}`), `Distinct results: {${items.join(", ")}} (${items.length} strings${items.length < 4 ? ", fewer than 2 × 2 because two products coincided" : ""}).`],
        hint: "Two times two products. Then remove duplicates: it is a set.",
      };
    },
  },
  {
    id: "languages!zero",
    guideId: G,
    sectionRef: "languages",
    title: "The zero-power trap",
    skill: "w⁰ = λ (a string) but L⁰ = {λ} (a language), even for ϕ (Rule 8).",
    gen(r) {
      const qs = [
        { p: "What is **L⁰** for any language L, including ϕ?", ok: "{λ}", bad: ["λ", "ϕ", "L"], why: "L⁰ is a language (a set) containing one string, the empty one." },
        { p: "What is **w⁰** for any string w?", ok: "λ", bad: ["{λ}", "ϕ", "w"], why: "A string to the zero power is the empty string, not a set." },
        { p: "What is **ϕL** (ϕ concatenated with L)?", ok: "ϕ", bad: ["L", "{λ}", "λ"], why: "There is no u ∈ ϕ to glue anything to, so no uv exists." },
        { p: "What is **{λ}L**?", ok: "L", bad: ["ϕ", "{λ}", "L ∪ {λ}"], why: "λ is the neutral element for concatenation: λv = v." },
        { p: "**Σ⁺** equals…", ok: "Σ∗ − {λ}", bad: ["Σ∗ ∪ {λ}", "Σ∗ − ϕ", "Σ"], why: "Σ⁺ is one or more symbols: everything in Σ∗ except the empty string." },
        { p: "L = { cⁿdⁿ | n ≥ 0 }. What is **L²**?", ok: "{ cⁿdⁿcᵐdᵐ | n, m ≥ 0 }", bad: ["{ c²ⁿd²ⁿ | n ≥ 0 }", "{ cⁿdⁿcⁿdⁿ | n ≥ 0 }", "{ c²ⁿd²ⁿ | n ≥ 1 }"], why: "Rule 9: exponents on languages create independent indices. The two copies need not share n." },
        { p: "L = { aⁿbⁿ | n ≥ 0 }. What is **Lᴿ**?", ok: "{ bⁿaⁿ | n ≥ 0 }", bad: ["{ aⁿbⁿ | n ≥ 0 }", "{ bⁿaᵐ | n, m ≥ 0 }", "{ (ba)ⁿ | n ≥ 0 }"], why: "Reverse every string: aⁿbⁿ backwards is bⁿaⁿ, same n." },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  },
  {
    id: "rules!notation",
    guideId: G,
    sectionRef: "rules",
    title: "Which one is written correctly",
    skill: "The 12 notation rules, applied: braces vs parentheses, λ vs ϕ, comma means and, name Σ.",
    gen(r) {
      const qs = [
        { p: "The set containing the strings ab and ba:", ok: "{ab, ba}", bad: ["(ab, ba)", "{ab; ba}", "[ab, ba]"], why: "Rule 1 and 11: sets get braces, elements separated by commas." },
        { p: "A language with no strings at all:", ok: "ϕ", bad: ["λ", "{λ}", "{ϕ}"], why: "Rule 2: ϕ is the empty set. λ is a string; {λ} has one string; {ϕ} has one element." },
        { p: "Strings over {a, b} with an even number of a's AND ending in b:", ok: "{ w ∈ {a,b}∗ | w has an even number of a's, w ends in b }", bad: ["{ w | even a's or ends in b }", "{ w ∈ {a,b}∗ | w has an even number of a's ∨ w ends in b }", "( w | even a's, ends in b )"], why: "Rule 3: in set-builder the comma means AND; use ∨ for or." },
        { p: "The complement of L:", ok: "Σ∗ − L (so Σ must be named)", bad: ["ϕ − L", "L − Σ∗", "{λ} − L"], why: "Rule 7: complement means everything in Σ∗ that is not in L." },
        { p: "The infinite language of all strings of a's:", ok: "{λ, a, aa, aaa, …}", bad: ["{λ, a, aa, aaa}", "{a, aa, aaa, …}", "(λ, a, aa, …)"], why: "Rule 5: roster form of an infinite language ends with …; and λ = a⁰ belongs." },
        { p: "Names, by convention:", ok: "strings w, u, v; languages L; alphabets Σ", bad: ["strings L; languages w; alphabets Σ", "strings Σ; languages L; alphabets w", "anything, as long as it is defined"], why: "Rule 6 and Rule 12: don't invent notation." },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  },
];
