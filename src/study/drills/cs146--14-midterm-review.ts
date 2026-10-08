/**
 * Drills for CS 146 · Lecture 14, Poon's midterm review: the four practice
 * types from his slides that no other chapter drills directly. Find n₀ in a
 * Big-O proof, find the regularity constant for a case-3 recurrence, count a
 * recursion tree's levels, and rotate a small BST.
 */
import type { Drill } from "../drill";

const G = "cs146/14-midterm-review";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (k: number) => String(k).split("").map((d) => SUP[Number(d)]).join("");

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A tiny BST: key with optional children. */
interface N {
  k: number;
  l: N | null;
  r: N | null;
}

function ins(t: N | null, k: number): N {
  if (!t) return { k, l: null, r: null };
  if (k < t.k) t.l = ins(t.l, k);
  else t.r = ins(t.r, k);
  return t;
}

function pre(t: N | null, out: number[] = []): number[] {
  if (t) {
    out.push(t.k);
    pre(t.l, out);
    pre(t.r, out);
  }
  return out;
}

function rotR(x: N): N {
  const y = x.l!;
  x.l = y.r;
  y.r = x;
  return y;
}

function rotL(x: N): N {
  const y = x.r!;
  x.r = y.l;
  y.l = x;
  return y;
}

export const drills: Drill[] = [
  {
    id: "bigo!n0",
    guideId: G,
    sectionRef: "bigo",
    title: "Find n₀",
    skill: "Finish a Big-O proof: with c given, find the first n where f(n) ≤ c·g(n).",
    gen(r) {
      const k = r.pick([1, 2, 3]);
      const a = r.int(2, 6);
      const b = k === 1 ? r.int(5, 60) : k === 2 ? r.int(10, 150) : r.int(10, 400);
      const c = a + 1;
      let n0 = 1;
      while (n0 ** k < b) n0++;
      const nk = k === 1 ? "n" : `n${sup(k)}`;
      return {
        prompt: `Prove ${a}${nk} + ${b} = O(${nk}) with c = ${c}. What is the smallest whole number n₀ that works?`,
        answer: { kind: "number", value: n0 },
        steps: [
          `Substitute: is ${a}${nk} + ${b} ≤ ${c}${nk} ?`,
          `Cancel ${a}${nk}: is ${b} ≤ ${nk} ?`,
          n0 > 1 ? `${n0 - 1}${k > 1 ? sup(k) : ""} = ${(n0 - 1) ** k} < ${b}, but ${n0}${k > 1 ? sup(k) : ""} = ${n0 ** k} ≥ ${b}.` : `Already true at n = 1.`,
          `So n₀ = ${n0}: for all n ≥ ${n0}, ${a}${nk} + ${b} ≤ ${c}${nk}.`,
        ],
        hint: `With c = a + 1, the ${a}${nk} cancels and only ${b} ≤ ${nk} is left.`,
        diagnose: (x) => (Number(x) === b ? `That's the leftover number itself. You want the first n where ${nk} reaches ${b}.` : undefined),
      };
    },
  },
  {
    id: "master!regularity",
    guideId: G,
    sectionRef: "master",
    title: "Regularity constant",
    skill: "Check case 3's regularity condition: find the smallest c with a·f(n/b) ≤ c·f(n).",
    gen(r) {
      // a < b^k so case 3 applies, f(n) = n^k
      let a = 2,
        b = 2,
        k = 2;
      do {
        b = r.pick([2, 3, 4]);
        k = r.pick([1, 2, 3]);
        a = r.int(1, 9);
      } while (!(a < b ** k && a >= 1 && (k > 1 || a > 1)));
      const den = b ** k;
      const g = gcd(a, den);
      const frac = `${a / g}/${den / g}`;
      const fx = k === 1 ? "n" : `n${sup(k)}`;
      return {
        prompt: `T(n) = ${a}T(n/${b}) + ${fx} is case 3. Check regularity: a·f(n/b) = c·f(n) for what constant c? (Give it as a fraction like 1/2.)`,
        answer: {
          kind: "custom",
          display: frac,
          placeholder: "e.g. 1/2",
          check: (s: string) => {
            const t = s.replace(/\s/g, "");
            const m = t.match(/^(\d+)\/(\d+)$/);
            if (m) return Number(m[1]) * den === a * Number(m[2]) && Number(m[2]) > 0;
            const x = Number(t);
            return Number.isFinite(x) && Math.abs(x - a / den) < 1e-3;
          },
        },
        steps: [
          `a·f(n/b) = ${a}·(n/${b})${k > 1 ? sup(k) : ""} = ${a}·${fx}/${den}.`,
          `So a·f(n/b) = (${a}/${den})·${fx}: c = ${frac}.`,
          `${frac} < 1, so regularity holds and T(n) = Θ(${fx}).`,
        ],
        hint: `Plug n/${b} into f, multiply by ${a}, and compare with ${fx}.`,
      };
    },
  },
  {
    id: "recurrences!levels",
    guideId: G,
    sectionRef: "recurrences",
    title: "Count the tree's levels",
    skill: "Count a recursion tree's levels from n/bᵏ = 1, including the root.",
    gen(r) {
      const b = r.pick([2, 3, 4]);
      const a = r.pick([1, 2, 3, 4]);
      const m = r.int(2, b === 2 ? 8 : 5);
      const n = b ** m;
      return {
        prompt: `T(n) = ${a}T(n/${b}) + f(n), with base case size 1. For n = ${n.toLocaleString("en-US")}, how many levels does the recursion tree have, including the root?`,
        answer: { kind: "number", value: m + 1 },
        steps: [`Level k has size n/${b}ᵏ. The base case is n/${b}ᵏ = 1, so ${b}ᵏ = ${n} and k = log${b === 2 ? "₂" : b === 3 ? "₃" : "₄"} ${n} = ${m}.`, `That's ${m} levels below the root; ${m + 1} including it. (a = ${a} changes how many nodes per level, not how many levels.)`],
        hint: `How many times can you divide ${n} by ${b} before reaching 1? Then add 1 for the root.`,
        diagnose: (x) => (Number(x) === m ? "That's the levels below the root. Add the root." : undefined),
      };
    },
  },
  {
    id: "avl!rotate",
    guideId: G,
    sectionRef: "avl",
    title: "Rotate it",
    skill: "Rotate a small BST at the root and give the result in pre-order.",
    gen(r) {
      const dir = r.pick(["right", "left"] as const);
      const keys = r.sample([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], 5);
      let t: N | null = null;
      for (const k of keys) t = ins(t, k);
      // need the rotating child to exist
      let tries = 0;
      while ((dir === "right" ? !t!.l : !t!.r) && tries < 50) {
        const ks = r.sample([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], 5);
        t = null;
        for (const k of ks) t = ins(t, k);
        tries++;
      }
      if (dir === "right" ? !t!.l : !t!.r) {
        t = null;
        for (const k of [30, 15, 45, 10, 20]) t = ins(t, k);
      }
      const before = pre(t);
      const root = t!.k;
      const up = dir === "right" ? t!.l!.k : t!.r!.k;
      const after = pre(dir === "right" ? rotR(t!) : rotL(t!));
      return {
        prompt: `A BST's pre-order is ${before.join(", ")} (build it by inserting in that order). Do ${dir}Rotate(${root}). Write the new tree's pre-order.`,
        answer: { kind: "sequence", items: after.map(String) },
        steps: [
          `${dir}Rotate brings the ${dir === "right" ? "LEFT" : "RIGHT"} child up: ${up} becomes the root and ${root} becomes its ${dir} child.`,
          `${up}'s old ${dir} subtree (the middle keys, between ${Math.min(up, root)} and ${Math.max(up, root)}) moves over to be ${root}'s ${dir === "right" ? "left" : "right"} child.`,
          `Pre-order (node, left, right): ${after.join(", ")}.`,
        ],
        hint: "Draw the tree first. The rotating child comes up; the middle subtree changes parents; nothing else moves.",
      };
    },
  },
];
