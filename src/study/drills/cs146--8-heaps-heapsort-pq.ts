/**
 * Drills for CS 146 · Heaps: 0-based index arithmetic, heapify (sink) on one
 * node, buildHeap's order and result, one extract-max, and the PQ contract.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs146/8-heaps-heapsort-pq";

function distinct(r: Rng, n: number, lo = 1, hi = 40): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const v = r.int(lo, hi);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

function heapify(a: number[], i: number, n: number): number[] {
  const l = 2 * i + 1;
  const rr = 2 * i + 2;
  let largest = i;
  if (l < n && a[l] > a[largest]) largest = l;
  if (rr < n && a[rr] > a[largest]) largest = rr;
  if (largest !== i) {
    [a[i], a[largest]] = [a[largest], a[i]];
    heapify(a, largest, n);
  }
  return a;
}

function buildHeap(a: number[]): { result: number[]; order: number[] } {
  const order: number[] = [];
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
    order.push(i);
    heapify(a, i, a.length);
  }
  return { result: a, order };
}

const seqDiag = (want: number[]) => (input: string) => {
  const got = input.split(/[,;→>\s]+/).filter(Boolean).map(Number);
  if (got.length !== want.length) return `The array keeps all ${want.length} elements.`;
  const sorted = want.slice().sort((x, y) => y - x);
  if (got.every((g, i) => g === sorted[i])) return "That is the array sorted descending. A heap only promises parent ≥ children, not a sorted order.";
  return undefined;
};

export const drills: Drill[] = [
  {
    id: "array!index",
    guideId: G,
    sectionRef: "array",
    title: "Index arithmetic (0-based)",
    skill: "left 2i+1, right 2i+2, parent ⌊(i−1)/2⌋, first leaf ⌊n/2⌋.",
    gen(r) {
      const n = r.int(7, 15);
      const i = r.int(1, Math.floor(n / 2) - 1);
      const mode = r.pick(["children", "parent", "leaves"]);
      if (mode === "children")
        return {
          prompt: `Heap stored in an array of **${n}** elements, 0-based. What are the children of index **${i}**? (two numbers)`,
          answer: { kind: "set", items: [String(2 * i + 1), String(2 * i + 2)] },
          steps: [`Left child = 2i + 1 = ${2 * i + 1}; right child = 2i + 2 = ${2 * i + 2}.`, 2 * i + 2 < n ? "Both exist since they are below n." : "Note the right child would be out of range if ≥ n."],
          diagnose(input) {
            const got = input.split(/[,;\s]+/).filter(Boolean).map(Number);
            if (got.includes(2 * i) && got.includes(2 * i + 1)) return "Those are the 1-based formulas (2i, 2i+1). Poon uses 0-based: 2i+1 and 2i+2.";
            return undefined;
          },
        };
      if (mode === "parent") {
        const c = r.int(3, n - 1);
        return {
          prompt: `Array heap, 0-based, ${n} elements. What is the parent of index **${c}**?`,
          answer: { kind: "number", value: Math.floor((c - 1) / 2) },
          steps: [`parent(i) = ⌊(i − 1)/2⌋.`, `⌊(${c} − 1)/2⌋ = ⌊${(c - 1) / 2}⌋ = ${Math.floor((c - 1) / 2)}.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.-]/g, ""));
            if (v === Math.floor(c / 2) && Math.floor(c / 2) !== Math.floor((c - 1) / 2)) return "That is ⌊i/2⌋, the 1-based formula. 0-based is ⌊(i − 1)/2⌋.";
            return undefined;
          },
        };
      }
      return {
        prompt: `Array heap, 0-based, **${n}** elements. What is the index of the first leaf?`,
        answer: { kind: "number", value: Math.floor(n / 2) },
        steps: [`First leaf = ⌊n/2⌋ = ⌊${n}/2⌋ = ${Math.floor(n / 2)}.`, `Every index from ${Math.floor(n / 2)} to ${n - 1} has no children (2i + 1 ≥ n). The last non-leaf is ${Math.floor(n / 2) - 1}.`],
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.-]/g, ""));
          if (v === Math.floor(n / 2) - 1) return "That is the last non-leaf (where buildHeap starts). The first leaf is one further: ⌊n/2⌋.";
          return undefined;
        },
      };
    },
  },
  {
    id: "heapify!sink",
    guideId: G,
    sectionRef: "heapify",
    title: "heapify one node",
    skill: "Compare with both children, swap with the larger, keep sinking (precondition: subtrees already heaps).",
    gen(r) {
      // Build a valid heap, then break the root or an internal node.
      const base = distinct(r, r.int(6, 8));
      const heap = buildHeap(base.slice()).result;
      const i = r.pick([0, 0, 1]);
      const a = heap.slice();
      a[i] = r.int(1, Math.min(...a) - 1 > 0 ? Math.min(...a) - 1 : 1) || 1; // make it small so it sinks
      if (a[i] >= Math.min(...heap)) a[i] = 0;
      const before = a.slice();
      const after = heapify(a.slice(), i, a.length);
      return {
        prompt: `a = [${before.join(", ")}] (0-based). Both subtrees of index ${i} are valid max-heaps but a[${i}] = ${before[i]} is too small. Write the array after heapify(a, ${i}, ${a.length}).`,
        answer: { kind: "sequence", items: after.map(String) },
        steps: [
          `Children of ${i}: ${2 * i + 1} (${before[2 * i + 1]}) and ${2 * i + 2} (${before[2 * i + 2] ?? "none"}). Largest of the three is not a[${i}], so swap with the larger child.`,
          `Follow the sinking element down, repeating the comparison at each new position until it is ≥ both children or has none.`,
          `Result: [${after.join(", ")}].`,
        ],
        hint: "Swap with the LARGER child, not the first one you see.",
        diagnose: (input) => {
          const got = input.split(/[,;→>\s]+/).filter(Boolean).map(Number);
          const oneSwap = before.slice();
          const l = 2 * i + 1;
          const rr = 2 * i + 2;
          const big = rr < oneSwap.length && oneSwap[rr] > oneSwap[l] ? rr : l;
          [oneSwap[i], oneSwap[big]] = [oneSwap[big], oneSwap[i]];
          if (got.length === after.length && got.every((g, k) => g === oneSwap[k]) && oneSwap.some((v, k) => v !== after[k])) return "You stopped after one swap. heapify keeps sinking: the element that moved down may still be smaller than its new children.";
          return seqDiag(after)(input);
        },
      };
    },
  },
  {
    id: "build!order",
    guideId: G,
    sectionRef: "build",
    title: "buildHeap: where it starts, what it makes",
    skill: "Start at the last non-leaf ⌊n/2⌋ − 1, walk to 0, heapify each; O(n) overall.",
    gen(r) {
      const a = distinct(r, r.int(5, 7));
      const { result, order } = buildHeap(a.slice());
      const mode = r.pick(["order", "result", "result"]);
      if (mode === "order")
        return {
          prompt: `buildHeap on an array of **${a.length}** elements. Which indexes get heapified, in order?`,
          answer: { kind: "sequence", items: order.map(String) },
          steps: [`n = ${a.length}: last non-leaf is ⌊${a.length}/2⌋ − 1 = ${order[0]}.`, `Walk toward the root: ${order.join(", ")}. Leaves are already one-element heaps, so they are skipped.`],
          diagnose(input) {
            const got = input.split(/[,;→>\s]+/).filter(Boolean).map(Number);
            if (got[0] === 0) return "Backwards. Going top-down breaks heapify's precondition (subtrees not yet fixed). Start at the last non-leaf and go toward the root.";
            if (got.includes(Math.floor(a.length / 2))) return `Index ${Math.floor(a.length / 2)} is the first leaf; it has no children, so buildHeap never heapifies it.`;
            return undefined;
          },
        };
      return {
        prompt: `buildHeap on [${a.join(", ")}] (max-heap, 0-based). Write the resulting array.`,
        answer: { kind: "sequence", items: result.map(String) },
        steps: [`Heapify indexes ${order.join(", ")} in that order.`, ...order.map((i) => `heapify(${i}): compare a[${i}] with its children, swap down as needed.`), `Result: [${result.join(", ")}]. Check: every parent ≥ its children.`],
        hint: "Bottom-up. Do the last non-leaf first, the root last.",
        diagnose: seqDiag(result),
      };
    },
  },
  {
    id: "sort!extract",
    guideId: G,
    sectionRef: "sort",
    title: "One step of heapSort",
    skill: "Swap the max to the end, shrink n, heapify the root.",
    gen(r) {
      const a = buildHeap(distinct(r, r.int(5, 7)).slice()).result;
      const b = a.slice();
      const n = b.length;
      [b[0], b[n - 1]] = [b[n - 1], b[0]];
      heapify(b, 0, n - 1);
      return {
        prompt: `Max-heap a = [${a.join(", ")}]. Do one heapSort step: swap the root with the last element, shrink the heap to ${n - 1}, heapify the root. Write the whole array afterwards.`,
        answer: { kind: "sequence", items: b.map(String) },
        steps: [`Swap a[0] = ${a[0]} with a[${n - 1}] = ${a[n - 1]}: the max is now parked at the end.`, `heapify(a, 0, ${n - 1}) on the first ${n - 1} slots only; ${a[0]} at the end is finished.`, `Result: [${b.join(", ")}].`],
        hint: "The last slot is outside the heap now: heapify must not look at it.",
        diagnose(input) {
          const got = input.split(/[,;→>\s]+/).filter(Boolean).map(Number);
          if (got.length === n && got[n - 1] !== a[0]) return `The largest element (${a[0]}) must end up in the last slot; that is the whole point of the step.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "pq!contract",
    guideId: G,
    sectionRef: "pq",
    title: "Priority queue: the contract and the costs",
    skill: "insert and extract-max in O(log n), peek in O(1); why a heap and not a sorted array.",
    gen(r) {
      const qs = [
        { p: "Cost of extract-max on a binary heap of n elements?", ok: "O(log n)", bad: ["O(1)", "O(n)", "O(n log n)"], why: "Swap the last leaf to the root and sink it: at most the height, log n." },
        { p: "Cost of peek (read the max) on a binary heap?", ok: "O(1)", bad: ["O(log n)", "O(n)", "O(n log n)"], why: "The max is always at index 0." },
        { p: "Cost of insert on a binary heap?", ok: "O(log n)", bad: ["O(1)", "O(n)", "O(log log n)"], why: "Append at the end and bubble up: at most the height." },
        { p: "Building a heap from n arbitrary elements with buildHeap costs…", ok: "O(n)", bad: ["O(n log n)", "O(log n)", "O(n²)"], why: "Most nodes are near the bottom and sink only a little; the sum converges to O(n)." },
        { p: "Why not keep a sorted array as the priority queue?", ok: "Insert would be O(n): everything after the new element shifts", bad: ["Peek would be O(n)", "Extract-max would be O(log n), too slow", "Sorted arrays can't hold duplicates"], why: "Extract from a sorted array is cheap; insert is the expensive one." },
        { p: "Where is the largest element in a max-heap array?", ok: "Index 0", bad: ["Index n − 1", "Index ⌊n/2⌋", "Anywhere in the last level"], why: "The root is the maximum, and the root is index 0." },
        { p: "Where must the smallest element of a max-heap be?", ok: "In a leaf (index ≥ ⌊n/2⌋)", bad: ["Index n − 1 exactly", "Index 0", "Index 1 or 2"], why: "A parent is ≥ its children, so the minimum can't have children; but which leaf is not fixed." },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  },
];
