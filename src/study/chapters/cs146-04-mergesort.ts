import type { Chapter, Frame } from "../types";

/**
 * CS 146 · Lectures 4–5 — Asymptotic notation in practice, divide & conquer,
 * merge sort, and Project 1 (SortingHub). Built from Poon's Lecture 4 (Aug 31)
 * and Lecture 5 (Sep 2) slides, HW 4, HW 5, and the Project 1 spec. The
 * definitions of O/Ω/Θ live in Chapter 0; this chapter uses them.
 */

/** Merging two sorted lists, one comparison per frame. Output grows on the right. */
const mergeFrames: Frame[] = [
  { kind: "array", cells: ["L: 2 5 8 12", "R: 3 6 9 10", "out:"], hl: [0, 1], caption: "Two sorted lists (HW 5 Problem 1). Keep one finger on the front of each. Each step: compare the two fingers, copy the smaller to the output, move that finger forward." },
  { kind: "array", cells: ["L: 5 8 12", "R: 3 6 9 10", "out: 2"], hl: [2], note: "2 vs 3 → take 2", caption: "2 < 3, so 2 goes out. The L finger moves to 5." },
  { kind: "array", cells: ["L: 5 8 12", "R: 6 9 10", "out: 2 3"], hl: [2], note: "5 vs 3 → take 3", caption: "5 vs 3: 3 is smaller. R finger moves to 6." },
  { kind: "array", cells: ["L: 8 12", "R: 6 9 10", "out: 2 3 5"], hl: [2], note: "5 vs 6 → take 5", caption: "5 vs 6: take 5." },
  { kind: "array", cells: ["L: 8 12", "R: 9 10", "out: 2 3 5 6"], hl: [2], note: "8 vs 6 → take 6", caption: "8 vs 6: take 6." },
  { kind: "array", cells: ["L: 12", "R: 9 10", "out: 2 3 5 6 8"], hl: [2], note: "8 vs 9 → take 8", caption: "8 vs 9: take 8." },
  { kind: "array", cells: ["L: 12", "R: 10", "out: 2 3 5 6 8 9"], hl: [2], note: "12 vs 9 → take 9", caption: "12 vs 9: take 9." },
  { kind: "array", cells: ["L: 12", "R: (empty)", "out: 2 3 5 6 8 9 10"], hl: [2], note: "12 vs 10 → take 10", caption: "12 vs 10: take 10. R is now empty." },
  { kind: "array", cells: ["L: (empty)", "R: (empty)", "out: 2 3 5 6 8 9 10 12"], done: [2], note: "copy the rest of L", caption: "One list ran out, so copy whatever's left of the other (just 12). Done. Count the work: 8 elements went out, each after at most one comparison. Merge is **O(n)** — it touches each element once." },
];

/** Merge sort as a recursion tree on the slides' example, top-down then bottom-up. */
const msTreeFrames: Frame[] = [
  { kind: "tree", levels: [{ nodes: ["50 20 60 30 10"], hl: true }], caption: "M([50, 20, 60, 30, 10]) — Poon's slide 20 example. Five things. Too many to sort 'directly', so **divide**: split in the middle. Left gets the extra element when the length is odd." },
  { kind: "tree", levels: [{ nodes: ["50 20 60 30 10"] }, { nodes: ["50 20 60", "30 10"], hl: true }], caption: "Two smaller versions of the same problem. Neither is size 1 yet, so keep splitting." },
  { kind: "tree", levels: [{ nodes: ["50 20 60 30 10"] }, { nodes: ["50 20 60", "30 10"] }, { nodes: ["50 20", "60", "30", "10"], hl: true }], caption: "[60], [30], [10] are single elements — a one-element list is already sorted. That's the **base case**. [50 20] still needs one more split." },
  { kind: "tree", levels: [{ nodes: ["50 20 60 30 10"] }, { nodes: ["50 20 60", "30 10"] }, { nodes: ["50 20", "60", "30", "10"] }, { nodes: ["50", "20"], hl: true }], caption: "Now everything at the bottom is size 1. Dividing is over. From here on, every step is a **merge** going back up." },
  { kind: "tree", levels: [{ nodes: ["50 20 60 30 10"] }, { nodes: ["50 20 60", "30 10"] }, { nodes: ["20 50", "60", "30", "10"], hl: true, work: "merge [50],[20] → [20 50]" }], caption: "Merge [50] and [20] → [20, 50]. In Poon's trace format you write `→ [20, 50]` under the call that produced it." },
  { kind: "tree", levels: [{ nodes: ["50 20 60 30 10"] }, { nodes: ["20 50 60", "10 30"], hl: true, work: "merge [20 50],[60] → [20 50 60]  ·  merge [30],[10] → [10 30]" }], caption: "Merge [20, 50] with [60] → [20, 50, 60]. On the right, merge [30] with [10] → [10, 30]. Each level's merges together touch every element once — that's O(n) per level." },
  { kind: "tree", levels: [{ nodes: ["10 20 30 50 60"], hl: true, work: "merge [20 50 60],[10 30]" }], caption: "The final merge: [20, 50, 60] with [10, 30] → [10, 20, 30, 50, 60]. Sorted. Notice what merge sort never does: it never compares elements 'in place'. It only ever splits and merges." },
];

/** The runtime argument, line by line. */
const runtimeFrames: Frame[] = [
  { kind: "lines", lines: ["Merging one level = O(n)", "Number of levels = log₂ n", "Total merging = O(n) · log n = O(n log n)", "Dividing: n − 1 splits, each O(1) = O(n)", "Overall: O(n log n) + O(n) = O(n log n)"], active: 0, caption: "At any one level of the tree, all the merges together handle every element exactly once. So a level costs about n operations — no matter how many pieces it's cut into." },
  { kind: "lines", lines: ["Merging one level = O(n)", "Number of levels = log₂ n", "Total merging = O(n) · log n = O(n log n)", "Dividing: n − 1 splits, each O(1) = O(n)", "Overall: O(n log n) + O(n) = O(n log n)"], active: 1, caption: "How many levels? Sizes go n, n/2, n/4, … down to 1. Chapter 0: the number of halvings from n to 1 is log₂ n. (Poon spends four slides on this; it's the foundation for every recurrence later.)" },
  { kind: "lines", lines: ["Merging one level = O(n)", "Number of levels = log₂ n", "Total merging = O(n) · log n = O(n log n)", "Dividing: n − 1 splits, each O(1) = O(n)", "Overall: O(n log n) + O(n) = O(n log n)"], active: 2, caption: "n per level, log n levels: n log n." },
  { kind: "lines", lines: ["Merging one level = O(n)", "Number of levels = log₂ n", "Total merging = O(n) · log n = O(n log n)", "Dividing: n − 1 splits, each O(1) = O(n)", "Overall: O(n log n) + O(n) = O(n log n)"], active: 3, caption: "Poon also counts the dividing: to get n single elements you make n − 1 cuts, each just computing a midpoint. O(n) total — small next to the merging." },
  { kind: "lines", lines: ["Merging one level = O(n)", "Number of levels = log₂ n", "Total merging = O(n) · log n = O(n log n)", "Dividing: n − 1 splits, each O(1) = O(n)", "Overall: O(n log n) + O(n) = O(n log n)"], active: 4, caption: "Add them; drop the lower-order term. **O(n log n)**, best case and worst case alike — merge sort does the same splits and merges regardless of the input's order." },
];

export const cs146MergeSort: Chapter = {
  slug: "4-big-o-merge-sort",
  label: "Lectures 4–5",
  title: "Big-O in practice, divide & conquer, and merge sort",
  source: "Lecture 4 (Aug 31) and Lecture 5 (Sep 2) slides, HW 4, HW 5, Project 1 spec (SortingHub).",
  goal: "Compare algorithms by growth rate and say when constants matter; explain divide & conquer; trace merge and merge sort in Poon's M([…]) format; derive O(n log n) and O(n) space; build Project 1's three sorts in Java.",
  minutes: 70,
  requires: ["0-notation", "2-adts-invariants-insertion"],
  sections: [
    {
      id: "bigo",
      title: "Big-O in practice (Lecture 4)",
      blocks: [
        { id: "bo-1", t: "p", slide: "What we're actually counting", text: "Chapter 0 has the definition of O, Ω and Θ. Lecture 4 is about *using* them, and Poon opens with a correction worth remembering: 'time complexity' is a misnomer. We count **operations** as a function of input size, not seconds — seconds depend on the machine; operation counts don't." },
        { id: "bo-2", t: "table", slide: "The growth-rate table (slide 26 — reproduce from memory)", rows: [
          ["Big-O", "Name", "Where it comes from", "Example"],
          ["O(1)", "Constant", "No dependence on n", "Reading a[i]; push/pop"],
          ["O(log n)", "Logarithmic", "Halving the problem each step", "Binary search"],
          ["O(n)", "Linear", "One pass over the input", "Linear search; summing an array; merge"],
          ["O(n log n)", "Linearithmic", "Halving, with linear work per level", "Merge sort"],
          ["O(n²)", "Quadratic", "Nested loops over the input", "Insertion sort worst case"],
          ["O(2ⁿ)", "Exponential", "Work doubles per extra element", "Naive recursive Fibonacci"],
        ] },
        { id: "bo-3", t: "list", slide: "Best vs worst for his three examples", items: [
          "**Insertion sort**: Ω(n) best (sorted), O(n²) worst (reversed).",
          "**Linear search**: Ω(1) best (it's the first element), O(n) worst (last, or missing).",
          "**Sum all elements**: Ω(n) and O(n) — you must touch everything, no shortcut, so it's **Θ(n)**.",
        ] },
        { id: "bo-4", t: "worked", slide: "HW 4 Problem 3: when do constants win?", title: "1000n vs 5n²", problem: "Algorithm A takes 1000n operations, B takes 5n². Which is faster?", steps: [
          "Set them equal to find the crossover: 1000n = 5n² → 1000 = 5n → n = 200.",
          "Below 200, the n² hasn't grown enough to beat the big 1000 constant: **B is faster** for small inputs.",
          "Above 200, n² takes over and keeps pulling away: **A is faster** for large inputs, and the gap grows without bound.",
          "This is why Big-O throws away constants: for big enough n the growth rate decides, and 'big enough' always arrives. But it's also why the hybrid sort in Project 1 exists — for tiny n, constants are the whole story.",
        ], answer: "B for n < 200, A for n > 200, tie at 200" },
        { id: "bo-5", t: "try", q: "HW 4 Problem 2: `for i in 0..n−1: for j in 0..i−1: sum += i`. How many times does the inner line run, and what's the Big-O?", a: "For each i it runs i times: 0 + 1 + 2 + … + (n−1) = n(n−1)/2 (Chapter 0's sum). Drop the ½ and the −n/2: O(n²)." },
        { id: "bo-6", t: "try", q: "Give the simplest O, Ω and Θ for f(n) = 2n³ + 5n² + 100.", a: "All n³: f = O(n³) and Ω(n³), so Θ(n³). Only the fastest-growing term survives." },
      ],
    },
    {
      id: "dc",
      title: "Divide and conquer",
      blocks: [
        { id: "dc-1", t: "why", slide: "Looking up a word", title: "The idea", text: "How do you find 'marble' in a paper dictionary? You don't start at page 1. You open to the middle, see 'L…', and throw away the whole first half. Open the middle of what's left, throw away half again. Each look halves the problem, so a 1000-page dictionary takes about 10 looks (Chapter 0: log₂ 1000 ≈ 10). That's the pattern: make the problem smaller by a constant factor each step, and the number of steps is logarithmic. **Divide and conquer** is that pattern turned into a recipe." },
        { id: "dc-2", t: "prof", title: "Poon's definition", text: "**Divide**: break the problem into smaller subproblems that are the same kind of problem as the original. **Conquer**: solve them recursively; when a subproblem is small enough (the **base case**), solve it directly. Many algorithms add a third step, **combine**: put the sub-answers together. His examples: binary search and dictionary lookup." },
        { id: "dc-3", t: "p", slide: "What 'recursively' means here", text: "The function calls itself on a smaller input. That feels circular until you see the base case: the calls keep shrinking the input, so eventually they hit something trivially solvable (one element, an empty list) and return without calling again. Each returning call hands its answer up to the caller, which combines it and returns in turn. The call stack from Lectures 2–3 is what keeps track of who's waiting for whom." },
      ],
    },
    {
      id: "merge",
      title: "Merge: two sorted lists into one",
      blocks: [
        { id: "mg-1", t: "why", slide: "Why merge is the key move", title: "The one trick merge sort needs", text: "Combining two *unsorted* piles into a sorted one is hard. Combining two *sorted* piles is easy: the smallest overall must be at the front of one pile or the other. Look at both fronts, take the smaller, repeat. Merge sort is built entirely on this: it only ever asks 'merge two sorted lists', and it makes sure the lists are sorted by making them tiny first." },
        { id: "mg-2", t: "stepper", slide: true, title: "Merging [2, 5, 8, 12] and [3, 6, 9, 10] (HW 5 Problem 1)", frames: mergeFrames },
        { id: "mg-3", t: "code", slide: "merge in Java, working on a subrange with a temp array", caption: "This is the shape Project 1 needs: it merges a[lo..mid] with a[mid+1..hi] into tmp, then copies back. `i` and `j` are the two fingers; `k` is the output position.", text: `// merges the two sorted halves a[lo..mid] and a[mid+1..hi]
static void merge(int[] a, int lo, int mid, int hi, int[] tmp) {
  int i = lo, j = mid + 1, k = lo;
  while (i <= mid && j <= hi) {
    if (a[i] <= a[j]) tmp[k++] = a[i++];   // <= keeps it stable
    else              tmp[k++] = a[j++];
  }
  while (i <= mid) tmp[k++] = a[i++];       // copy the rest of the left half
  while (j <= hi)  tmp[k++] = a[j++];       // copy the rest of the right half
  for (k = lo; k <= hi; k++) a[k] = tmp[k]; // copy back
}` },
        { id: "mg-4", t: "p", slide: "Reading `tmp[k++] = a[i++]`", text: "Java (like JS) lets `k++` mean 'use k, then add one to it'. So `tmp[k++] = a[i++]` is three things in one line: copy a[i] into tmp[k], then advance both k and i. You can write it as three lines if that's clearer; the meaning is identical." },
      ],
    },
    {
      id: "mergesort",
      title: "Merge sort",
      blocks: [
        { id: "ms-1", t: "stepper", slide: true, title: "Merge sort as a tree: M([50, 20, 60, 30, 10])", frames: msTreeFrames },
        { id: "ms-2", t: "code", slide: "Poon's trace format, M([…]) — HW 5 requires exactly this", caption: "Indent by recursion depth. Under each call, show its two sub-calls, then `→ result` when it returns. Odd lengths: the left half gets the extra element (mid = (lo + hi) / 2, left = lo..mid).", text: `M([50, 20, 60, 30, 10])
  M([50, 20, 60])
    M([50, 20])
      M([50]) → [50]
      M([20]) → [20]
      → [20, 50]
    M([60]) → [60]
    → [20, 50, 60]
  M([30, 10])
    M([30]) → [30]
    M([10]) → [10]
    → [10, 30]
  → [10, 20, 30, 50, 60]` },
        { id: "ms-3", t: "code", slide: "mergeSort in Java", caption: "Three lines of logic: base case, two recursive calls, merge. The public wrapper allocates the temp array once and handles Project 1's null / short-array cases.", text: `public static void mergeSort(int[] a) {
  if (a == null || a.length < 2) return;
  mergeSort(a, 0, a.length - 1, new int[a.length]);
}
static void mergeSort(int[] a, int lo, int hi, int[] tmp) {
  if (lo >= hi) return;                 // base case: 0 or 1 element
  int mid = (lo + hi) / 2;              // integer division: left gets the extra
  mergeSort(a, lo, mid, tmp);           // conquer left
  mergeSort(a, mid + 1, hi, tmp);       // conquer right
  merge(a, lo, mid, hi, tmp);           // combine
}` },
        { id: "ms-4", t: "stepper", slide: true, title: "Why it's O(n log n)", frames: runtimeFrames },
        { id: "ms-5", t: "p", slide: "His scale check", text: "n = 1,000,000. Merge sort: about n log n = 1,000,000 × 20 = 20,000,000 operations. Insertion sort worst case: about n² = 10¹². That's the difference between a blink and eleven days. This is the sentence to remember when someone asks why growth rate matters more than constants." },
        { id: "ms-6", t: "why", slide: "Why merge sort needs extra space", title: "O(n) space — the price of the speed", text: "Merge writes its output somewhere. If it wrote straight back into the input array, it would overwrite elements it hasn't read yet: merging [2, 5] with [1, 4] in place, the 1 has to go where the 2 is, but the 2 hasn't been placed yet. So merge needs a temporary array the size of the input — **O(n) extra space**. Slide 38 walks through exactly this. Heap sort (Lecture 8) is the sort that avoids it." },
        { id: "ms-7", t: "table", slide: "Insertion sort vs merge sort", rows: [
          ["", "Insertion sort", "Merge sort"],
          ["Best case", "Ω(n)", "Ω(n log n)"],
          ["Worst case", "O(n²)", "O(n log n)"],
          ["Extra space", "O(1) — in place", "O(n) — temp array"],
          ["Stable", "Yes", "Yes (with `<=` in merge)"],
          ["Wins when", "n is tiny or nearly sorted", "n is large"],
        ] },
        { id: "ms-8", t: "try", q: "HW 5 Problem 2: trace merge sort on [8, 3, 1, 7, 4, 6] in M() format.", a: "M([8,3,1,7,4,6]): M([8,3,1]) → M([8,3]) → M([8])→[8], M([3])→[3], →[3,8]; M([1])→[1]; →[1,3,8]. M([7,4,6]) → M([7,4]) → [7],[4] → [4,7]; M([6])→[6]; →[4,6,7]. Final → [1,3,4,6,7,8]." },
        { id: "ms-9", t: "try", q: "Why is merge sort O(n log n) even in the best case, when insertion sort can be Ω(n)?", a: "Merge sort always makes the same splits and always merges every level; it never notices that the input was sorted. Insertion sort's inner loop stops early on sorted input, so it does less work." },
      ],
    },
    {
      id: "project",
      title: "Project 1: SortingHub (due Fri Sep 25, 10% of the grade)",
      blocks: [
        { id: "pj-1", t: "p", slide: "What the project is", text: "Part 1 is three methods in Java: **insertionSort**, **mergeSort**, and **hybridSort** — a merge sort that switches to insertion sort when a piece gets small. Part 2 runs the provided `main()` to time them and asks you to write about what you see. Everything above in this chapter and the previous one *is* the project; the code blocks here are the pieces. Check the spec for the exact method names and signatures he expects, and use his — he docks for format." },
        { id: "pj-2", t: "code", slide: "hybridSort: merge sort with a small-case base", caption: "The only new idea: change the base case. When a range is at or below the threshold, insertion-sort just that range instead of splitting further. Insertion sort must therefore work on a subrange lo..hi, not the whole array.", text: `public static void hybridSort(int[] a, int threshold) {
  if (a == null || a.length < 2) return;
  hybridSort(a, 0, a.length - 1, threshold, new int[a.length]);
}
static void hybridSort(int[] a, int lo, int hi, int t, int[] tmp) {
  if (hi - lo + 1 <= t) { insertionSortRange(a, lo, hi); return; }
  int mid = (lo + hi) / 2;
  hybridSort(a, lo, mid, t, tmp);
  hybridSort(a, mid + 1, hi, t, tmp);
  merge(a, lo, mid, hi, tmp);
}
static void insertionSortRange(int[] a, int lo, int hi) {
  for (int j = lo + 1; j <= hi; j++) {
    int key = a[j], i = j - 1;
    while (i >= lo && a[i] > key) { a[i + 1] = a[i]; i--; }
    a[i + 1] = key;
  }
}` },
        { id: "pj-3", t: "list", slide: "Java from a JS/TS background — the things that bite", items: [
          "**Types everywhere**: `int x`, `int[] a`, `boolean`, `void` for no return. No `let`/`const`.",
          "**Arrays are fixed size**: `new int[n]` makes n zeros; no `.push`, no `.length` changes. `a.length` (no parentheses) is the size.",
          "**Integer division**: `(lo + hi) / 2` with ints throws away the remainder automatically — no `Math.floor` needed.",
          "**`static`** means the method belongs to the class, not an object — you call `SortingHub.mergeSort(a)` without `new`. The spec's methods are almost certainly static.",
          "**Compile, then run**: `javac SortingHub.java` then `java SortingHub`. Errors at compile time are your friend — read the line number.",
          "**Passing arrays**: like JS, the method gets a reference, so sorting `a` inside the method changes the caller's array. That's why these sorts return `void`.",
        ] },
        { id: "pj-4", t: "worked", slide: "Build order that won't waste your weekend", title: "In what order to write it", problem: "How to get from an empty file to a submitted project.", steps: [
          "Write `insertionSort` (Lectures 2–3 chapter) and a tiny `main` that sorts `{8, 5, 2, 6, 9}` and prints it. Also test `null`, `{}`, `{1}`, and an already-sorted array.",
          "Write `merge` and test it alone on two sorted halves inside one array — e.g. `{2, 5, 8, 12, 3, 6, 9, 10}` with lo=0, mid=3, hi=7. Print the result; expect the HW 5 answer.",
          "Write `mergeSort` on top of `merge`. Test with the M() example — you should get [10, 20, 30, 50, 60].",
          "Copy `mergeSort` into `hybridSort`, change the base case to call `insertionSortRange`. Test with threshold 1 (should behave like merge sort) and threshold = array length (should behave like insertion sort).",
          "Run the provided `main()` for Part 2. For the write-up: expect insertion sort to win at tiny sizes, lose badly at large sizes; the hybrid should match or beat plain merge sort, with a sweet-spot threshold somewhere around 10–30. Explain *why* using the HW 4 crossover idea: constants win small, growth rate wins large.",
        ] },
        { id: "pj-5", t: "warn", title: "Late penalty", text: "10% off per day. A working insertion sort + merge sort submitted on time is worth far more than a perfect hybrid submitted Sunday. Get Part 1 in first." },
      ],
    },
  ],
};
