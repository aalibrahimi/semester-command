import type { Chapter, Frame } from "../types";

/**
 * CS 146 · Lecture 8 — Heaps, heapify, buildHeap, heap sort, priority queues.
 * Built from Poon's Lecture 8 (Sep 16) slides, HW 8, and CLRS ch. 6.
 * Everything here is a binary MAX-heap unless it says otherwise.
 */

/** The array [16,14,10,8,7,9,3,2,4,1] read as a tree, level by level. */
const arrayTreeFrames: Frame[] = [
  { kind: "array", cells: [16, 14, 10, 8, 7, 9, 3, 2, 4, 1], hl: [0], note: "index 0 = the root", caption: "A heap is stored as a plain array. Index 0 is the top of the tree (the **root**). There are no pointers — the tree shape is implied by the indexes." },
  { kind: "tree", levels: [{ nodes: ["16"], hl: true }, { nodes: ["14", "10"] }], caption: "Index 0's children are indexes 1 and 2. In general, **left child of i = 2i + 1**, **right child = 2i + 2**. Check: 2·0+1 = 1, 2·0+2 = 2." },
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["14", "10"], hl: true }, { nodes: ["8", "7", "9", "3"] }], caption: "Index 1 (14) has children 2·1+1 = 3 and 2·1+2 = 4: that's 8 and 7. Index 2 (10) has children 5 and 6: 9 and 3. Poon's slide uses exactly this example." },
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["14", "10"] }, { nodes: ["8", "7", "9", "3"], hl: true }, { nodes: ["2", "4", "1"] }], caption: "Index 3 (8) has children 7 and 8: 2 and 4. Index 4 (7) has child 9: just 1 (its right child would be index 10, past the end). The last row fills left to right with no gaps — that's what **complete** means." },
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["14", "10"] }, { nodes: ["8", "7", "9", "3"] }, { nodes: ["2", "4", "1"], hl: true }], caption: "Going the other way: **parent of i = ⌊(i − 1) / 2⌋**. Parent of index 9 is ⌊8/2⌋ = 4 (the 7). Parent of index 6 is ⌊5/2⌋ = 2 (the 10). And look at the values: every parent is ≥ both its children. That's the **max-heap property**." },
];

/** heapify at index 1 on [16, 4, 10, 14, 7, 9, 3, 2, 8, 1] (CLRS's example). */
const heapifyFrames: Frame[] = [
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["4", "10"], hl: true }, { nodes: ["14", "7", "9", "3"] }, { nodes: ["2", "8", "1"] }], caption: "One thing is wrong here: the 4 at index 1 is smaller than its children 14 and 7. Everything below it is fine. heapify(a, 1) fixes exactly this one violation by letting the 4 sink." },
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["4", "10"] }, { nodes: ["14", "7", "9", "3"], hl: true }, { nodes: ["2", "8", "1"] }], caption: "Step 1: find the largest of the node and its two children. 4 vs 14 vs 7 → 14 (index 3). It's not the node itself, so we swap." },
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["14", "10"], hl: true }, { nodes: ["4", "7", "9", "3"] }, { nodes: ["2", "8", "1"] }], caption: "After the swap, 14 is up where it belongs. But the 4 is now at index 3, and it might be smaller than *its* children. So heapify calls itself on index 3." },
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["14", "10"] }, { nodes: ["4", "7", "9", "3"], hl: true }, { nodes: ["2", "8", "1"] }], caption: "heapify(a, 3): 4 vs children 2 (index 7) and 8 (index 8). Largest is 8. Swap." },
  { kind: "tree", levels: [{ nodes: ["16"] }, { nodes: ["14", "10"] }, { nodes: ["8", "7", "9", "3"] }, { nodes: ["2", "4", "1"], hl: true }], caption: "heapify(a, 8): index 8 has no children (2·8+1 = 17 is past the end). Nothing to compare — stop. The 4 sank two levels and the tree is a heap again. Array: [16, 14, 10, 8, 7, 9, 3, 2, 4, 1]." },
];

/** buildHeap on HW 8 Problem 1's array [1, 2, 3, 4, 5, 6, 7]. */
const buildFrames: Frame[] = [
  { kind: "tree", levels: [{ nodes: ["1"] }, { nodes: ["2", "3"] }, { nodes: ["4", "5", "6", "7"] }], caption: "[1, 2, 3, 4, 5, 6, 7] drawn as a tree. Is it a max-heap? No — the root 1 is smaller than its children (and so is every other parent). HW 8 Problem 1 asks you to fix it with buildHeap." },
  { kind: "tree", levels: [{ nodes: ["1"] }, { nodes: ["2", "3"] }, { nodes: ["4", "5", "6", "7"], hl: true }], caption: "n = 7. The first leaf is at index ⌊7/2⌋ = 3. Indexes 3, 4, 5, 6 (values 4, 5, 6, 7) are leaves — one-node heaps, already fine. So we only call heapify on indexes 2, 1, 0, in that order: **bottom-up**." },
  { kind: "tree", levels: [{ nodes: ["1"] }, { nodes: ["2", "7"], hl: true }, { nodes: ["4", "5", "6", "3"] }], caption: "heapify(2): 3 vs children 6, 7 → largest is 7. Swap. Array: [1, 2, 7, 4, 5, 6, 3]." },
  { kind: "tree", levels: [{ nodes: ["1"] }, { nodes: ["5", "7"], hl: true }, { nodes: ["4", "2", "6", "3"] }], caption: "heapify(1): 2 vs children 4, 5 → largest is 5. Swap. Array: [1, 5, 7, 4, 2, 6, 3]." },
  { kind: "tree", levels: [{ nodes: ["7"], hl: true }, { nodes: ["5", "1"] }, { nodes: ["4", "2", "6", "3"] }], caption: "heapify(0): 1 vs children 5, 7 → largest is 7. Swap. Now the 1 is at index 2 — and its children are 6 and 3. Not done: heapify recurses on index 2." },
  { kind: "tree", levels: [{ nodes: ["7"] }, { nodes: ["5", "6"] }, { nodes: ["4", "2", "1", "3"], hl: true }], caption: "heapify(2): 1 vs 6, 3 → swap with 6. The 1 is now a leaf. Every parent ≥ its children: a max-heap. **Answer: [7, 5, 6, 4, 2, 1, 3].**" },
];

/** heapSort on [7, 5, 6, 4, 2, 1, 3] — the heap we just built. */
const sortFrames: Frame[] = [
  { kind: "array", cells: [7, 5, 6, 4, 2, 1, 3], hl: [0], note: "a max-heap; the max is at index 0", caption: "heapSort starts from a max-heap (buildHeap gave us this). The biggest element is at the root, index 0. We know where it belongs: the very end." },
  { kind: "array", cells: [3, 5, 6, 4, 2, 1, 7], hl: [0], done: [6], note: "swap a[0] ↔ a[6]; heap is now a[0..5]", caption: "Swap the root with the last element. 7 is now in its final position (green) and is no longer part of the heap. But the 3 at the root breaks the heap property — so heapify(0) on the smaller heap a[0..5]." },
  { kind: "array", cells: [6, 5, 3, 4, 2, 1, 7], hl: [0], done: [6], note: "heapify(0) on 6 elements", caption: "heapify: 3 vs 5, 6 → swap with 6; then 3 vs child 1 → fine. Root is the max of what's left. Repeat." },
  { kind: "array", cells: [5, 4, 3, 1, 2, 6, 7], hl: [0], done: [5, 6], note: "swap a[0] ↔ a[5], heapify(0) on 5", caption: "Swap 6 to index 5; heapify the 1: 1 vs 5, 3 → swap with 5; 1 vs 4, 2 → swap with 4. Two sorted at the end." },
  { kind: "array", cells: [4, 2, 3, 1, 5, 6, 7], hl: [0], done: [4, 5, 6], note: "swap, heapify(0) on 4", caption: "Swap 5 to index 4; heapify the 2: 2 vs 4, 3 → swap with 4; 2 vs 1 → fine." },
  { kind: "array", cells: [3, 2, 1, 4, 5, 6, 7], hl: [0], done: [3, 4, 5, 6], note: "swap, heapify(0) on 3", caption: "Swap 4 to index 3; heapify the 1: 1 vs 2, 3 → swap with 3." },
  { kind: "array", cells: [1, 2, 3, 4, 5, 6, 7], done: [0, 1, 2, 3, 4, 5, 6], note: "two more rounds", caption: "Swap 3 out, heapify (2 vs 1 → swap); swap 2 out; one element left is trivially sorted. **[1, 2, 3, 4, 5, 6, 7]**. Everything happened inside the one array — no temp array. That's why heap sort is O(1) extra space." },
];

/** Priority-queue extract on [9, 8, 7, 5, 3, 2] (slides 41–42). */
const extractFrames: Frame[] = [
  { kind: "tree", levels: [{ nodes: ["9"], hl: true }, { nodes: ["8", "7"] }, { nodes: ["5", "3", "2"] }], caption: "extract(): return the max, which is always the root — 9. Now there's a hole at the top." },
  { kind: "tree", levels: [{ nodes: ["2"], hl: true }, { nodes: ["8", "7"] }, { nodes: ["5", "3"] }], caption: "Fill the hole with the **last** element (2) and shrink the size by one. This keeps the tree complete. But 2 is almost certainly too small for the root — so heapify(0)." },
  { kind: "tree", levels: [{ nodes: ["8"] }, { nodes: ["2", "7"], hl: true }, { nodes: ["5", "3"] }], caption: "heapify(0): 2 vs 8, 7 → swap with 8. Recurse on index 1." },
  { kind: "tree", levels: [{ nodes: ["8"] }, { nodes: ["5", "7"] }, { nodes: ["2", "3"], hl: true }], caption: "heapify(1): 2 vs 5, 3 → swap with 5. The 2 is a leaf now. Heap restored: [8, 5, 7, 2, 3]. Cost: one path down the tree, O(log n)." },
];

/** Priority-queue insert: trickle up. */
const insertFrames: Frame[] = [
  { kind: "tree", levels: [{ nodes: ["8"] }, { nodes: ["5", "7"] }, { nodes: ["2", "3", "9"], hl: true }], caption: "insert(9) into [8, 5, 7, 2, 3]: put the new element in the first empty slot — index 5, the end of the array — so the tree stays complete. Then compare it with its parent." },
  { kind: "tree", levels: [{ nodes: ["8"] }, { nodes: ["5", "9"], hl: true }, { nodes: ["2", "3", "7"] }], caption: "Parent of index 5 is ⌊4/2⌋ = 2, value 7. 7 < 9, so swap them. Now compare 9 with its new parent, the root 8. 8 < 9 → swap again." },
  { kind: "tree", levels: [{ nodes: ["9"], hl: true }, { nodes: ["5", "8"] }, { nodes: ["2", "3", "7"] }], caption: "9 is the new root. This is **trickle up** (heapify is trickle *down*). At most one swap per level, so insert is O(log n)." },
];

export const cs146Heaps: Chapter = {
  slug: "8-heaps-heapsort-pq",
  label: "Lecture 8",
  title: "Heaps, heapify, buildHeap, heap sort, priority queues",
  source: "Lecture 8 slides (Sep 16), HW 8 (due Mon Sep 21), CLRS ch. 6.",
  goal: "Read an array as a tree with the index formulas; trace heapify, buildHeap, heapSort, insert and extract on paper; say the runtime of each and why buildHeap is O(n); explain priority queue as the ADT and heap as the implementation.",
  minutes: 60,
  requires: ["2-adts-invariants-insertion", "4-big-o-merge-sort"],
  sections: [
    {
      id: "why",
      title: "Why heaps exist",
      blocks: [
        { id: "why-1", t: "why", slide: "The ER triage problem", title: "The problem a heap solves", text: "An emergency room doesn't serve patients in arrival order (a queue) or most-recent-first (a stack). It serves the **most urgent** next, and new patients keep arriving with their own urgency. You need two operations, over and over: *add a thing with a priority* and *take out the most important thing*. A sorted list makes 'take the max' O(1) but 'add' O(n) (shift everything). An unsorted list makes 'add' O(1) but 'take the max' O(n) (scan everything). A **heap** gets both down to O(log n) by keeping things only *partly* sorted: just enough to know the max instantly." },
        { id: "why-2", t: "def", term: "Binary max-heap", text: "A **complete** binary tree (every level full except possibly the last, which fills left to right) where **every parent ≥ its children**. Consequence: the maximum is always at the root. A **min-heap** flips the inequality; the minimum is at the root. Lecture 8 uses max-heaps throughout." },
        { id: "why-3", t: "p", slide: "'Partly sorted' — what a heap does NOT promise", text: "A heap does not say the left child is smaller than the right. It does not say the array is sorted. It does not let you find the second-largest quickly without extracting the first. The only promise is the one line: parent ≥ children, on every edge. Everything else follows from that plus the complete shape." },
      ],
    },
    {
      id: "array",
      title: "The array IS the tree",
      blocks: [
        { id: "ar-1", t: "stepper", slide: true, title: "Reading [16, 14, 10, 8, 7, 9, 3, 2, 4, 1] as a tree", frames: arrayTreeFrames },
        { id: "ar-2", t: "prof", title: "Index formulas — 0-based, memorize", text: "Left child of i: **2i + 1**. Right child: **2i + 2**. Parent: **⌊(i − 1) / 2⌋**. First leaf: **⌊n / 2⌋** (every index from there on has no children). He uses 0-based indexing; CLRS uses 1-based (2i, 2i+1, ⌊i/2⌋) — don't mix them on the exam." },
        { id: "ar-3", t: "why", slide: "Why a complete tree fits in an array", title: "Why there are no pointers", text: "Because the tree is complete, reading it level by level, left to right, gives one unbroken run of nodes with no holes. So position-in-that-reading *is* the array index, and the arithmetic above recovers the shape. No pointers means no extra memory per node and no chasing references around memory — the heap is one contiguous block." },
        { id: "ar-4", t: "try", q: "In an array of 12 elements, what are the children of index 4, the parent of index 11, and which indexes are leaves?", a: "Children of 4: 9 and 10. Parent of 11: ⌊10/2⌋ = 5. Leaves: ⌊12/2⌋ = 6 onward, i.e. indexes 6–11." },
      ],
    },
    {
      id: "heapify",
      title: "heapify: fix one node by letting it sink",
      blocks: [
        { id: "hf-1", t: "stepper", slide: true, title: "heapify(a, 1): the 4 sinks to where it belongs", frames: heapifyFrames },
        { id: "hf-2", t: "code", slide: "heapify in Java", caption: "`n` is the heap size — which may be smaller than a.length during heapSort. The recursion follows the sinking element down.", text: `static void heapify(int[] a, int i, int n) {
  int l = 2 * i + 1, r = 2 * i + 2, largest = i;
  if (l < n && a[l] > a[largest]) largest = l;
  if (r < n && a[r] > a[largest]) largest = r;
  if (largest != i) {
    int t = a[i]; a[i] = a[largest]; a[largest] = t;   // swap
    heapify(a, largest, n);                            // keep sinking
  }
}` },
        { id: "hf-3", t: "p", slide: "Precondition and cost", text: "heapify assumes the two subtrees *below* i are already valid heaps; it only fixes i itself. Each call does a constant amount of work and moves one level down, so it makes at most (height of the tree) calls. A complete tree with n nodes has height ⌊log₂ n⌋ (Chapter 0: halving). **heapify is O(log n).**" },
        { id: "hf-4", t: "warn", title: "Slide 21, 'Common misconception'", text: "heapify does NOT sort the array, and it does NOT build a heap from scratch. It repairs a *single* out-of-place value at node i, trusting that everything below is already a heap. Poon put this on its own slide; expect a true/false or short answer on it." },
      ],
    },
    {
      id: "build",
      title: "buildHeap: any array → a heap, in O(n)",
      blocks: [
        { id: "bh-1", t: "stepper", slide: true, title: "HW 8 Problem 1: buildHeap on [1, 2, 3, 4, 5, 6, 7]", frames: buildFrames },
        { id: "bh-2", t: "code", slide: "buildHeap in Java", caption: "Start at the last non-leaf and walk toward the root, heapifying each. Going bottom-up is what guarantees heapify's precondition: by the time we reach i, both of its subtrees have already been fixed.", text: `static void buildHeap(int[] a) {
  int n = a.length;
  for (int i = n / 2 - 1; i >= 0; i--)   // last non-leaf down to root
    heapify(a, i, n);
}` },
        { id: "bh-3", t: "why", slide: "Why O(n), not O(n log n)", title: "The non-obvious runtime", text: "There are about n/2 calls to heapify, each 'O(log n)', so the lazy answer is O(n log n). But most of those calls are cheap. Half the nodes are leaves (cost 0 — we skip them). A quarter sit one level up and can sink at most 1 step. An eighth can sink at most 2. Add it up: n/4·1 + n/8·2 + n/16·3 + … — a series whose sum is about n, not n log n. Poon states O(n) on slide 25; the sentence to say is **'most nodes are near the bottom, so most heapify calls are short.'**" },
        { id: "bh-4", t: "try", q: "buildHeap on [3, 9, 2, 1, 4, 5]. Which indexes get heapified, in what order, and what's the result?", a: "n = 6, so i = 2, 1, 0. heapify(2): 2 vs child 5 → [3,9,5,1,4,2]. heapify(1): 9 vs 1, 4 → fine. heapify(0): 3 vs 9, 5 → swap with 9 → [9,3,5,1,4,2]; then 3 vs 1, 4 → swap with 4 → [9,4,5,1,3,2]." },
      ],
    },
    {
      id: "sort",
      title: "heapSort",
      blocks: [
        { id: "hs-1", t: "why", slide: "The idea", title: "Max at the root, so pull it out repeatedly", text: "If the max is always at index 0, sorting is: swap the max to the end of the array, pretend the array is one shorter, fix the root, repeat. Each round places one element in its final spot from the right. After n rounds the array is sorted ascending — and it never needed a second array." },
        { id: "hs-2", t: "stepper", slide: true, title: "heapSort on [7, 5, 6, 4, 2, 1, 3]", frames: sortFrames },
        { id: "hs-3", t: "code", slide: "heapSort in Java", caption: "buildHeap once, then n rounds of swap + heapify with a shrinking heap size.", text: `static void heapSort(int[] a) {
  buildHeap(a);                              // O(n)
  for (int end = a.length - 1; end > 0; end--) {
    int t = a[0]; a[0] = a[end]; a[end] = t; // max → its final slot
    heapify(a, 0, end);                      // heap is now a[0..end-1]; O(log n)
  }
}` },
        { id: "hs-4", t: "table", slide: "heapSort facts (slides 32–35)", rows: [
          ["Question", "Answer"],
          ["Time", "O(n) build + n × O(log n) heapify = **O(n log n)** — always, no bad input"],
          ["Extra space", "**O(1)** — everything happens inside the input array"],
          ["Stable?", "**No** — the swaps can reorder equal elements"],
          ["When to prefer it", "Memory-limited or embedded systems: guaranteed O(n log n) with no extra array"],
        ] },
        { id: "hs-5", t: "table", slide: "The three sorts so far", rows: [
          ["", "Insertion", "Merge", "Heap"],
          ["Worst time", "O(n²)", "O(n log n)", "O(n log n)"],
          ["Best time", "Ω(n)", "Ω(n log n)", "Ω(n log n)"],
          ["Extra space", "O(1)", "O(n)", "O(1)"],
          ["Stable", "yes", "yes", "no"],
        ] },
        { id: "hs-6", t: "try", q: "Why is merge sort O(n) space while heap sort is O(1)?", a: "Merge needs a temporary array so it doesn't overwrite unread elements while merging. Heap sort only ever swaps two positions inside the input array." },
      ],
    },
    {
      id: "pq",
      title: "Priority queue: the ADT a heap implements",
      blocks: [
        { id: "pq-1", t: "p", slide: "ADT vs implementation, again", text: "Lectures 2–3: an ADT is the contract, the implementation is the machinery. **Priority queue** is the contract: insert(x with a priority), extract the highest priority, peek, isEmpty. **Heap** is the machinery that makes each of those O(log n) or better. On an exam, 'priority queue' is the answer to *which ADT*, 'heap' is the answer to *how*." },
        { id: "pq-2", t: "stepper", slide: true, title: "extract() on [9, 8, 7, 5, 3, 2] (slides 41–42)", frames: extractFrames },
        { id: "pq-3", t: "stepper", slide: true, title: "insert(): trickle up", frames: insertFrames },
        { id: "pq-4", t: "list", slide: "The operations and their costs", items: [
          "**insert(x)**: append at the end (keeps the tree complete), then swap upward with the parent while parent < x. **O(log n)** — one path up.",
          "**extract()**: save a[0]; move the last element to a[0]; shrink; heapify(0). **O(log n)** — one path down.",
          "**peek()**: return a[0]. **O(1)**.",
          "**isEmpty()**: size == 0. **O(1)**.",
          "**buildHeap** from a batch of n items: **O(n)** — cheaper than n inserts (n log n).",
          "**update / decreaseKey**: 'future lecture' — it's what Dijkstra's algorithm needs.",
        ] },
        { id: "pq-5", t: "worked", slide: "HW 8 Problem 3: the task scheduler", title: "Picking the structure from a story", problem: "Tasks with priorities arrive continuously; the system must always work on the highest-priority task next. Which structure, which operations, what cost?", steps: [
          "'Arrive continuously' → we need cheap insert. 'Highest priority next' → we need cheap take-the-max. That pair is the priority queue ADT.",
          "Implement it as a **max-heap**: insert is O(log n), extract-max is O(log n).",
          "If a batch of tasks exists at startup, buildHeap them in O(n) instead of inserting one at a time.",
        ], answer: "Priority queue via max-heap; insert + extract, both O(log n)" },
        { id: "pq-6", t: "try", q: "Max-heap vs min-heap — and give a real use for a min-heap.", a: "Max-heap: parent ≥ children, root is the max. Min-heap: parent ≤ children, root is the min. Min-heap uses: Dijkstra's shortest path (always take the closest unvisited vertex), event simulation ordered by earliest time, merging k sorted lists." },
        { id: "pq-7", t: "def", term: "Heap in one paragraph", text: "A complete binary tree in an array (children 2i+1, 2i+2; parent ⌊(i−1)/2⌋) with parent ≥ children. heapify(i) sinks one node, O(log n). buildHeap runs heapify from ⌊n/2⌋−1 down to 0, O(n). heapSort = buildHeap + n rounds of swap-to-end + heapify(0), O(n log n) time, O(1) space, unstable. A heap implements the priority-queue ADT with insert and extract in O(log n)." },
      ],
    },
  ],
};
