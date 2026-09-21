/**
 * Drills for CS 154 · Sets and functions: cardinality with repeats, ϕ vs {ϕ},
 * subset vs proper subset, |2ᴬ|, |A × B|, and function / total / partial.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs154/1-sets-functions";

function roster(r: Rng, n: number, pool: string[]): string[] {
  return r.sample(pool, n);
}

export const drills: Drill[] = [
  {
    id: "sets!cardinality",
    guideId: G,
    sectionRef: "sets",
    title: "Cardinality with repeats",
    skill: "|A| counts distinct elements: repeats and order are noise.",
    gen(r) {
      const base = roster(r, r.int(2, 5), ["1", "2", "3", "4", "5", "6", "7", "9"]);
      const withReps = r.shuffle([...base, ...r.sample(base, Math.min(base.length, r.int(1, 3)))]);
      const n = base.length;
      return {
        prompt: `A = {${withReps.join(", ")}}. What is |A|?`,
        answer: { kind: "number", value: n },
        steps: [`A set has no repeats: {${withReps.join(", ")}} = {${[...new Set(withReps)].join(", ")}}.`, `|A| = ${n}.`],
        diagnose(input) {
          const v = Number(input.replace(/[^0-9]/g, ""));
          if (v === withReps.length) return "You counted the symbols written. Repeated elements count once: a set is a collection, not a list.";
          return undefined;
        },
      };
    },
  },
  {
    id: "sets!empty",
    guideId: G,
    sectionRef: "sets",
    title: "ϕ, {ϕ}, and subsets",
    skill: "The trick questions: |{ϕ}| = 1, ϕ ⊆ everything, A ⊂ A is false.",
    gen(r) {
      const qs = [
        { p: "What is |{ϕ}|?", ok: "1", bad: ["0", "undefined", "2"], why: "{ϕ} is a set with one element, and that element is the empty set. A box containing an empty box is not empty." },
        { p: "What is |ϕ|?", ok: "0", bad: ["1", "undefined", "∞"], why: "The empty set has no elements." },
        { p: "Is ϕ ⊆ {1, 2}?", ok: "Yes: the empty set is a subset of every set", bad: ["No: ϕ is not an element of {1, 2}", "Only if 0 ∈ {1, 2}"], why: "A ⊆ B means every element of A is in B. ϕ has no elements, so the condition holds vacuously." },
        { p: "A = {2, 5, 3}, B = {3, 5, 2}. Which is correct?", ok: "A ⊆ B and A = B; A ⊂ B is wrong", bad: ["A ⊂ B (proper subset)", "A ≠ B because the order differs", "A ⊄ B"], why: "Order does not matter, so A = B. Proper subset requires A ≠ B." },
        { p: "Is ϕ = {ϕ}?", ok: "No: one has zero elements, the other has one", bad: ["Yes: both are empty", "Yes: ϕ is the only element of both"], why: "|ϕ| = 0 but |{ϕ}| = 1." },
        { p: "Is {1, 2} ⊂ {1, 2}?", ok: "No: proper subset requires the sets to differ; ⊆ is the correct symbol", bad: ["Yes: every set is a proper subset of itself", "Yes, because 1 ∈ {1, 2}"], why: "A ⊂ B means A ⊆ B and A ≠ B (Rule 10: when in doubt, ⊆)." },
        { p: "Complement of A ∩ B (De Morgan)?", ok: "Ā ∪ B̄", bad: ["Ā ∩ B̄", "A ∪ B", "(A ∪ B) ∩ U"], why: "Flip the operation, complement each part." },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  },
  {
    id: "power!size",
    guideId: G,
    sectionRef: "power",
    title: "How big is the power set",
    skill: "|2ᴬ| = 2^|A|, always including ϕ and A itself (Assignment 1 Q12).",
    gen(r) {
      const n = r.int(0, 6);
      const A = roster(r, n, ["a", "b", "c", "d", "e", "f"]);
      const mode = r.next() < 0.7;
      if (mode)
        return {
          prompt: `A = {${A.join(", ")}}${n === 0 ? " = ϕ" : ""}. How many elements does 2ᴬ (the power set) have?`,
          answer: { kind: "number", value: 2 ** n },
          steps: [`|2ᴬ| = 2^|A| = 2^${n} = ${2 ** n}.`, n === 0 ? "Even the empty set has one subset: itself. 2^ϕ = {ϕ}." : `Every element is either in or out of a subset: two choices each, ${n} elements.`],
          hint: "Each element is in or out: 2 choices per element.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9]/g, ""));
            if (v === 2 * n) return "You doubled |A|. Each element doubles the *number of subsets*, so it is 2 raised to |A|.";
            if (v === 2 ** n - 1) return "Off by one: you left out ϕ (or A itself). Both are always subsets.";
            if (v === 2 ** n - 2) return "You left out both ϕ and A. Both count: the power set includes the empty subset and the whole set.";
            return undefined;
          },
        };
      const k = r.int(0, n);
      const el = r.pick([`{${A.slice(0, k).join(", ")}}`, "ϕ", `{${A.join(", ")}}`]);
      return {
        prompt: `A = {${A.join(", ")}}. Is **${el}** an element of 2ᴬ?`,
        answer: choice(r, "Yes: it is a subset of A, so it is an element of the power set", ["No: elements of 2ᴬ are elements of A, not sets", "Only if it is nonempty"], {
          correct: "2ᴬ = { X | X ⊆ A }. Every subset, including ϕ and A, is an element.",
        }),
        steps: [`2ᴬ is the set of all subsets of A.`, `${el} ⊆ A, so ${el} ∈ 2ᴬ.`],
      };
    },
  },
  {
    id: "product!size",
    guideId: G,
    sectionRef: "product",
    title: "Cartesian product",
    skill: "|A × B| = |A|·|B|; pairs are ordered, so A × B ≠ B × A.",
    gen(r) {
      const a = r.int(1, 4);
      const b = r.int(1, 4);
      const A = roster(r, a, ["1", "2", "3", "4"]);
      const B = roster(r, b, ["p", "q", "r", "s"]);
      if (r.next() < 0.6)
        return {
          prompt: `A = {${A.join(", ")}}, B = {${B.join(", ")}}. What is |A × B|?`,
          answer: { kind: "number", value: a * b },
          steps: [`A × B is every ordered pair (x, y) with x ∈ A and y ∈ B.`, `${a} choices for x, ${b} for y: ${a} × ${b} = ${a * b} pairs.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9]/g, ""));
            if (v === a + b) return "You added. Every element of A pairs with every element of B: multiply.";
            return undefined;
          },
        };
      const pair = `(${r.pick(B)}, ${r.pick(A)})`;
      return {
        prompt: `A = {${A.join(", ")}}, B = {${B.join(", ")}}. Is **${pair} ∈ A × B**?`,
        answer: choice(r, "No: the first part must come from A and the second from B", ["Yes: both parts appear in A or B", "Yes: order inside a pair does not matter"], {
          correct: `${pair} ∈ B × A, not A × B. Pairs are ordered.`,
        }),
        steps: [`A × B = { (x, y) | x ∈ A, y ∈ B }.`, `${pair} has its first part from B, so it belongs to B × A.`],
      };
    },
  },
  {
    id: "functions!kind",
    guideId: G,
    sectionRef: "functions",
    title: "Function, total, partial, or not a function",
    skill: "One output per input = function; every input used = total; otherwise partial.",
    gen(r) {
      const D = ["1", "2", "3"];
      const R = ["a", "b"];
      const kind = r.pick(["total", "partial", "not"] as const);
      let pairs: string[];
      if (kind === "total") pairs = D.map((d) => `(${d}, ${r.pick(R)})`);
      else if (kind === "partial") pairs = r.sample(D, 2).map((d) => `(${d}, ${r.pick(R)})`);
      else {
        const d = r.pick(D);
        pairs = [`(${d}, a)`, `(${d}, b)`, ...D.filter((x) => x !== d).slice(0, 1).map((x) => `(${x}, ${r.pick(R)})`)];
      }
      pairs = r.shuffle(pairs);
      const opts = {
        total: "A total function: every domain element has exactly one output",
        partial: "A partial function: some domain element has no output",
        not: "Not a function: one input has two different outputs",
      };
      return {
        prompt: `D = {1, 2, 3}, R = {a, b}, f = {${pairs.join(", ")}}. What is f?`,
        answer: choice(r, opts[kind], Object.entries(opts).filter(([k]) => k !== kind).map(([, v]) => v), {
          correct: kind === "not" ? "Two pairs share an input with different outputs, which breaks the one-output rule." : kind === "partial" ? "No input repeats, but one domain element is missing." : "No input repeats and all three of 1, 2, 3 appear.",
        }),
        steps: ["First check: does any input appear twice with different outputs? If yes, not a function.", "Then: does every element of D appear as an input? Yes → total; no → partial.", `Here: ${opts[kind]}.`],
        hint: "Read each pair as (input, output). Look for a repeated input first.",
      };
    },
  },
];
