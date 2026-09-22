/**
 * Drills for CS 146 · Quicksort: Lomuto partition (result array, return
 * value, comparison count), the two recursive calls, the recursion on a
 * whole array, and the best / worst / average analysis.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs146/9-quicksort";

function distinct(r: Rng, n: number, lo = 1, hi = 30): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const v = r.int(lo, hi);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/** Lomuto partition, exactly the Lecture 9 pseudocode. Mutates a. */
function partition(a: number[], low: number, high: number): { p: number; steps: string[] } {
  const pivot = a[high];
  let i = low - 1;
  const steps: string[] = [`pivot = a[${high}] = ${pivot}, i = ${i}.`];
  for (let j = low; j < high; j++) {
    if (a[j] <= pivot) {
      i++;
      [a[i], a[j]] = [a[j], a[i]];
      steps.push(`j=${j}: ${a[i]} ≤ ${pivot} → i=${i}, swap a[${i}], a[${j}] → [${a.join(", ")}]`);
    } else steps.push(`j=${j}: ${a[j]} > ${pivot}, skip.`);
  }
  [a[i + 1], a[high]] = [a[high], a[i + 1]];
  steps.push(`Final swap a[${i + 1}] ↔ a[${high}] → [${a.join(", ")}]. Return ${i + 1}.`);
  return { p: i + 1, steps };
}

const seqDiag = (want: number[], wrongs: { arr: number[]; msg: string }[]) => (input: string) => {
  const got = input.split(/[,;→>\s[\]]+/).filter(Boolean).map(Number);
  for (const w of wrongs) if (got.length === w.arr.length && got.every((v, k) => v === w.arr[k])) return w.msg;
  if (got.length !== want.length) return `The array has ${want.length} elements; you wrote ${got.length}. Write the WHOLE array, including the parts partition didn't touch.`;
  return undefined;
};

export const drills: Drill[] = [
  {
    id: "partition!result",
    guideId: G,
    sectionRef: "partition",
    title: "Run partition",
    skill: "Trace Lomuto partition and write the array it leaves behind.",
    gen(r) {
      const n = r.int(5, 7);
      const a = distinct(r, n);
      const b = a.slice();
      const { steps } = partition(b, 0, n - 1);
      const sorted = a.slice().sort((x, y) => x - y);
      return {
        prompt: `partition(a, 0, ${n - 1}) with a = [${a.join(", ")}] (pivot = last element). Write the array afterwards.`,
        answer: { kind: "sequence", items: b.map(String) },
        steps,
        hint: "Only elements ≤ pivot get swapped into the left zone; big ones are walked past. Don't forget the final pivot swap.",
        diagnose: seqDiag(b, [{ arr: sorted, msg: "That is the fully sorted array. partition only puts the pivot in place and splits the rest into ≤ and >; the two sides stay in scan order, not sorted." }]),
      };
    },
  },
  {
    id: "partition!return",
    guideId: G,
    sectionRef: "partition",
    title: "What does partition return?",
    skill: "Find the pivot's final index, counting from a[0], on a subarray.",
    gen(r) {
      const n = r.int(7, 9);
      const a = distinct(r, n);
      const low = r.int(0, 2);
      const high = r.int(low + 3, n - 1);
      const b = a.slice();
      const { p, steps } = partition(b, low, high);
      return {
        prompt: `a = [${a.join(", ")}]. What index does partition(a, ${low}, ${high}) return?`,
        answer: { kind: "number", value: p },
        steps: [`Only a[${low}..${high}] = [${a.slice(low, high + 1).join(", ")}] is touched.`, ...steps],
        hint: "Count how many elements in a[low..high−1] are ≤ the pivot; the pivot lands that many places after low.",
        diagnose(input) {
          const v = Number(input.trim());
          if (v === p - 1) return "Off by one: after the loop, i is the last small element; the pivot goes to i + 1, and that's the return value.";
          if (v === p - low) return `That index counts from low = ${low}. partition returns a position in the whole array, counted from a[0]: add ${low}.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "partition!comparisons",
    guideId: G,
    sectionRef: "partition",
    title: "How many comparisons?",
    skill: "partition on a range of size m compares exactly m − 1 times: Θ(n).",
    gen(r) {
      const low = r.int(0, 5);
      const high = low + r.int(3, 20);
      const m = high - low + 1;
      return {
        prompt: `How many times does partition(a, ${low}, ${high}) evaluate \`a[j] <= pivot\`?`,
        answer: { kind: "number", value: m - 1 },
        steps: [`j runs from ${low} to ${high} − 1 = ${high - 1}.`, `That is ${high - 1} − ${low} + 1 = ${m - 1} comparisons (every element except the pivot). Linear: Θ(n).`],
        diagnose(input) {
          const v = Number(input.trim());
          if (v === m) return "The pivot itself is never compared: the loop stops at high − 1.";
          return undefined;
        },
      };
    },
  },
  {
    id: "quicksort!calls",
    guideId: G,
    sectionRef: "quicksort",
    title: "The two recursive calls",
    skill: "After partition returns p, name the two calls quicksort makes next.",
    gen(r) {
      const n = r.int(6, 9);
      const a = distinct(r, n);
      const low = r.int(0, 1);
      const high = n - 1;
      const b = a.slice();
      const { p } = partition(b, low, high);
      const want = `Q(${low}, ${p - 1}) and Q(${p + 1}, ${high})`;
      const wrong = [`Q(${low}, ${p}) and Q(${p + 1}, ${high})`, `Q(${low}, ${p - 1}) and Q(${p}, ${high})`, `Q(${low}, ${p}) and Q(${p}, ${high})`];
      return {
        prompt: `quicksort(a, ${low}, ${high}) on a = [${a.join(", ")}]. partition returns p = ${p}. Which two calls come next?`,
        answer: choice(r, want, wrong, { correct: "The pivot at p is final, so both calls skip it: p − 1 on the left, p + 1 on the right." }),
        steps: [`p = ${p}: a[${p}] = ${b[p]} is in its final place.`, `Left: quicksort(a, ${low}, ${p - 1}). Right: quicksort(a, ${p + 1}, ${high}).`],
      };
    },
  },
  {
    id: "quicksort!level",
    guideId: G,
    sectionRef: "quicksort",
    title: "After the first two levels",
    skill: "Run partition on the whole array, then on both sides, and write the array.",
    gen(r) {
      const n = r.int(6, 8);
      const a = distinct(r, n);
      const b = a.slice();
      const { p } = partition(b, 0, n - 1);
      const after1 = b.slice();
      const log: string[] = [`Level 1: partition(a, 0, ${n - 1}) → [${after1.join(", ")}], p = ${p}.`];
      if (0 < p - 1) {
        const q = partition(b, 0, p - 1).p;
        log.push(`Left: partition(a, 0, ${p - 1}) → [${b.join(", ")}], p = ${q}.`);
      } else log.push(`Left side (0..${p - 1}) has ≤ 1 element: base case.`);
      if (p + 1 < n - 1) {
        const q = partition(b, p + 1, n - 1).p;
        log.push(`Right: partition(a, ${p + 1}, ${n - 1}) → [${b.join(", ")}], p = ${q}.`);
      } else log.push(`Right side (${p + 1}..${n - 1}) has ≤ 1 element: base case.`);
      return {
        prompt: `a = [${a.join(", ")}]. Run the first partition, then ONE partition on each side (left side first). Write the array at that point.`,
        answer: { kind: "sequence", items: b.map(String) },
        steps: log,
        hint: "Three partitions total (or fewer if a side has 0 or 1 elements). Each only touches its own range.",
        diagnose: seqDiag(b, [{ arr: after1, msg: "That is after the first partition only. Now partition the left range, then the right range." }]),
      };
    },
  },
  {
    id: "analysis!cases",
    guideId: G,
    sectionRef: "analysis",
    title: "Best, worst, average",
    skill: "Match an input or a split to quicksort's running time and recurrence.",
    gen(r) {
      const items = [
        { q: "Lomuto quicksort on an already sorted array of n elements.", ok: "Θ(n²): T(n) = T(n−1) + Θ(n)", bad: ["Θ(n log n): T(n) = 2T(n/2) + Θ(n)", "Θ(n): the array is already sorted", "Θ(log n)"] },
        { q: "Every pivot lands exactly in the middle.", ok: "Θ(n log n): T(n) = 2T(n/2) + Θ(n)", bad: ["Θ(n²): T(n) = T(n−1) + Θ(n)", "Θ(n)", "Θ(log n): T(n) = T(n/2) + Θ(1)"] },
        { q: "Every partition splits 9 to 1.", ok: "Θ(n log n): deeper tree, but still logarithmic depth with Θ(n) per level", bad: ["Θ(n²): any uneven split is quadratic", "Θ(n)", "Θ(n^1.1)"] },
        { q: "Random input, on average.", ok: "Θ(n log n)", bad: ["Θ(n²)", "Θ(n)", "Θ(n log² n)"] },
        { q: "Lomuto quicksort on a reverse-sorted array.", ok: "Θ(n²): the pivot is always the minimum, so one side is empty", bad: ["Θ(n log n)", "Θ(n)", "Θ(n²) only if n is even"] },
      ];
      const it = r.pick(items);
      return {
        prompt: `${it.q} Running time?`,
        answer: choice(r, it.ok, it.bad),
        steps: ["T(n) = T(q) + T(n − q − 1) + Θ(n): the split q decides everything.", `Here: ${it.ok}.`],
        hint: "Where does the pivot land? One end → n²; anywhere proportional (even 9:1) → n log n.",
      };
    },
  },
  {
    id: "analysis!worst-count",
    guideId: G,
    sectionRef: "analysis",
    title: "Count the worst case exactly",
    skill: "On sorted input, total comparisons = (n−1) + (n−2) + … + 1 = n(n−1)/2.",
    gen(r) {
      const n = r.int(5, 20);
      const total = (n * (n - 1)) / 2;
      return {
        prompt: `Lomuto quicksort on the sorted array [1, 2, …, ${n}]. How many comparisons \`a[j] <= pivot\` in total?`,
        answer: { kind: "number", value: total },
        steps: [`First partition: ${n} elements → ${n - 1} comparisons, pivot stays at the end, left side has ${n - 1}.`, `Then ${n - 2}, ${n - 3}, …, 1.`, `Sum = ${n}·${n - 1}/2 = ${total}. That is the n²/2 of the worst case.`],
        diagnose(input) {
          const v = Number(input.trim());
          if (v === (n * (n + 1)) / 2) return "That counts n + (n−1) + … + 1. Each partition on m elements compares m − 1 times (not the pivot), so the sum starts at n − 1.";
          if (v === n * n) return "Close in spirit (it IS Θ(n²)), but the exact count is (n−1) + … + 1 = n(n−1)/2.";
          return undefined;
        },
      };
    },
  },
];
