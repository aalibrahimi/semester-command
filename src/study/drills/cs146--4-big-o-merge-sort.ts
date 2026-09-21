/**
 * Drills for CS 146 · Big-O and merge sort: Big-O of a loop nest, the
 * crossover between two algorithms, a merge step with its comparison count,
 * and the level count of merge sort.
 */
import type { Drill, Rng } from "../drill";
import { choice, fmt } from "../drill";

const G = "cs146/4-big-o-merge-sort";

function sortedNums(r: Rng, n: number, lo: number, hi: number): number[] {
  const out = new Set<number>();
  while (out.size < n) out.add(r.int(lo, hi));
  return [...out].sort((a, b) => a - b);
}

export const drills: Drill[] = [
  {
    id: "bigo!code",
    guideId: G,
    sectionRef: "bigo",
    title: "Big-O of a snippet",
    skill: "Read the loop shape and name the growth (HW 4 style).",
    gen(r) {
      const snippets = [
        { code: "for (int i = 0; i < n; i++)\n  sum += a[i];", o: "O(n)", why: "One pass, constant work per element." },
        { code: "for (int i = 0; i < n; i++)\n  for (int j = 0; j < n; j++)\n    count++;", o: "O(n²)", why: "n iterations, each doing n: n·n." },
        { code: "for (int i = 0; i < n; i++)\n  for (int j = 0; j < i; j++)\n    sum += i;", o: "O(n²)", why: "0 + 1 + … + (n−1) = n(n−1)/2, and the ½ and −n/2 drop." },
        { code: "while (n > 1) {\n  n = n / 2;\n  count++;\n}", o: "O(log n)", why: "Halving each step: log₂ n steps." },
        { code: "for (int i = 1; i < n; i *= 2)\n  sum += i;", o: "O(log n)", why: "i doubles each time, so it reaches n after log₂ n steps." },
        { code: "for (int i = 0; i < n; i++)\n  for (int j = 1; j < n; j *= 2)\n    count++;", o: "O(n log n)", why: "Outer loop n times, inner loop log n times." },
        { code: "return a[0] + a[n - 1];", o: "O(1)", why: "Two array reads no matter how big n is." },
        { code: "for (int i = 0; i < n; i++)\n  for (int j = 0; j < n; j++)\n    for (int k = 0; k < n; k++)\n      count++;", o: "O(n³)", why: "Three nested loops over n." },
        { code: "for (int i = 0; i < n; i++) sum += a[i];\nfor (int j = 0; j < n; j++) sum += a[j];", o: "O(n)", why: "Two passes in sequence is 2n, and the 2 drops. Sequence adds; nesting multiplies." },
        { code: "for (int i = 0; i < 100; i++)\n  for (int j = 0; j < n; j++)\n    count++;", o: "O(n)", why: "100 is a constant, not a function of n: 100n = O(n)." },
      ];
      const s = r.pick(snippets);
      const all = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)"];
      return {
        prompt: "What is the Big-O of this code, as a function of n?",
        code: s.code,
        answer: choice(r, s.o, r.sample(all.filter((x) => x !== s.o), 3), { correct: s.why }),
        steps: ["Nested loops multiply, sequential loops add, halving means log.", s.why],
        hint: "Count how many times the innermost line runs, as a formula in n. Then keep the fastest term.",
      };
    },
  },
  {
    id: "bigo!crossover",
    guideId: G,
    sectionRef: "bigo",
    title: "Where the constant stops mattering",
    skill: "Set the two costs equal to find the crossover n (Lecture 4's 1000n vs 5n²).",
    gen(r) {
      const c1 = r.pick([100, 200, 500, 1000, 2000]);
      const c2 = r.pick([1, 2, 4, 5, 10]);
      const cross = c1 / c2;
      return {
        prompt: `Algorithm A takes **${fmt(c1)}n** operations, B takes **${c2}n²**. For what n do they cost the same? (Above that, which is faster?)`,
        answer: { kind: "number", value: cross, tolerance: 0.01 },
        steps: [`Set equal: ${fmt(c1)}n = ${c2}n².`, `Divide by n: ${fmt(c1)} = ${c2}n → n = ${fmt(cross)}.`, `Below ${fmt(cross)}, B's small constant wins; above it, n² pulls away and A (linear) is faster forever.`],
        hint: "Divide both sides by n first.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.-]/g, ""));
          if (Math.abs(v - Math.sqrt(c1 / c2)) < 0.01) return `You solved ${fmt(c1)} = ${c2}n² (dropping the n on the left). Both sides have at least one n: cancel one and you get ${fmt(c1)} = ${c2}n.`;
          if (Math.abs(v - c1 * c2) < 0.01) return "You multiplied the constants. Set the costs equal and solve for n: n = c₁/c₂.";
          return undefined;
        },
      };
    },
  },
  {
    id: "merge!step",
    guideId: G,
    sectionRef: "merge",
    title: "Merge two sorted halves",
    skill: "Two fingers, take the smaller, count the comparisons (Project 1's merge).",
    gen(r) {
      const left = sortedNums(r, r.int(2, 4), 1, 30);
      const right = sortedNums(r, r.int(2, 4), 1, 30).filter((x) => !left.includes(x));
      if (right.length < 2) right.push(31, 32);
      let i = 0;
      let j = 0;
      let comps = 0;
      const out: number[] = [];
      while (i < left.length && j < right.length) {
        comps++;
        if (left[i] <= right[j]) out.push(left[i++]);
        else out.push(right[j++]);
      }
      const tail = i < left.length ? left.slice(i) : right.slice(j);
      const merged = [...out, ...tail];
      const askComps = r.next() < 0.4;
      if (askComps)
        return {
          prompt: `Merge [${left.join(", ")}] and [${right.join(", ")}]. How many comparisons does merge make before one side runs out?`,
          answer: { kind: "number", value: comps },
          steps: [`Each output before a side is exhausted costs one comparison.`, `Output by comparison: ${out.join(", ")} (${comps} comparisons). Then [${tail.join(", ")}] is copied with no comparisons.`, `Worst case for sizes ${left.length} and ${right.length} would be ${left.length + right.length - 1}.`],
          hint: "Every time you take an element while both sides still have items, that was one comparison.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.-]/g, ""));
            if (v === left.length + right.length) return "That is the number of elements copied. Comparisons stop once one side is empty; the rest is copied for free.";
            if (v === left.length * right.length) return "You multiplied the sizes. Merge is linear: at most n₁ + n₂ − 1 comparisons.";
            return undefined;
          },
        };
      return {
        prompt: `Merge the sorted halves [${left.join(", ")}] and [${right.join(", ")}]. Write the merged array.`,
        answer: { kind: "sequence", items: merged.map(String), placeholder: "e.g. 2, 5, 7, 9" },
        steps: [`i on ${left[0]}, j on ${right[0]}: take the smaller each time.`, `Order taken: ${merged.join(", ")}.`],
        hint: "Two fingers, one on each half. Compare, take the smaller, advance that finger.",
      };
    },
  },
  {
    id: "mergesort!levels",
    guideId: G,
    sectionRef: "mergesort",
    title: "Levels and work per level",
    skill: "n elements split in halves gives log₂ n levels; every level merges n elements total.",
    gen(r) {
      const n = r.pick([8, 16, 32, 64, 128, 256, 1024]);
      const mode = r.pick(["levels", "work", "total"]);
      if (mode === "levels")
        return {
          prompt: `Merge sort on **n = ${fmt(n)}** elements. How many levels of splitting until every piece has one element?`,
          answer: { kind: "number", value: Math.log2(n) },
          steps: [`Each level halves the pieces: ${n} → ${n / 2} → … → 1.`, `log₂ ${fmt(n)} = ${Math.log2(n)} levels.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.-]/g, ""));
            if (v === n / 2) return "That is the number of pieces after one split. Levels count how many *halvings* until size 1: log₂ n.";
            return undefined;
          },
        };
      if (mode === "work")
        return {
          prompt: `Merge sort on n = ${fmt(n)}. At the level where pieces have size ${r.pick([2, 4, 8])}, how many elements get merged in total across that level?`,
          answer: { kind: "number", value: n },
          steps: [`Every level contains every element exactly once, just in more or fewer pieces.`, `Merging a whole level touches all ${fmt(n)} elements: that is the kn per level.`],
          hint: "Add up the sizes of all the pieces on one level.",
        };
      return {
        prompt: `Merge sort on n = ${fmt(n)}: ${Math.log2(n)} levels, ${fmt(n)} elements merged per level. Roughly how many element-moves in total?`,
        answer: { kind: "number", value: n * Math.log2(n) },
        steps: [`Per level: ${fmt(n)}. Levels: log₂ ${fmt(n)} = ${Math.log2(n)}.`, `${fmt(n)} × ${Math.log2(n)} = ${fmt(n * Math.log2(n))}: the n log n.`],
      };
    },
  },
];
