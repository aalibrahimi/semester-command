import type { Exercise } from "../types";

/**
 * CS 146 · "Do it yourself" sets, keyed by chapter slug. Each exercise is
 * shaped like an exam or homework question Poon actually asks: a trace, a
 * runtime with reasoning, a proof shape, or a "which structure" story.
 */
export const cs146Practice: Record<string, Exercise[]> = {
  "0-notation": [
    {
      id: "log-halvings",
      title: "How many halvings?",
      prompt: "An array has 1,000,000 elements. Binary search halves it each step until one element is left. About how many steps? Do it without a calculator — you only need to know one power of 2.",
      hints: [
        "You're being asked 'how many times can I halve a million before I hit 1'. That number has a name from this chapter.",
        "People reach for log₁₀ and get 6. Wrong base. Every halving is a division by 2, so it's log₂ — and log₂ 1,000,000 is much bigger than 6.",
        "Find a power of 2 near a million: 2¹⁰ = 1,024 ≈ 1,000. So a million ≈ 1,000 × 1,000 ≈ 2¹⁰ × 2¹⁰ = 2²⁰. The exponent is your answer.",
      ],
      solution: [
        "Steps = log₂ 1,000,000 (the number of halvings from n down to 1).",
        "2¹⁰ = 1,024 ≈ 10³, so 10⁶ ≈ (2¹⁰)² = 2²⁰.",
        "log₂ 10⁶ ≈ 20. About 20 steps. (Exact: 19.93.)",
        "Sanity check the other way: 2²⁰ = 1,048,576 — just over a million. ✓",
      ],
      why: "'A million items, twenty steps' is the single most useful number in computing. It's why databases index, why sorted data is worth keeping sorted, and why an O(log n) algorithm feels instant no matter how big the input gets. You'll estimate this in your head for the rest of your career.",
    },
    {
      id: "sum-loop",
      title: "Count the inner loop",
      prompt: "How many times does `count++` run, as a formula in n? Then give the Big-O.",
      code: `for (int i = 0; i < n; i++)
  for (int j = 0; j < i; j++)
    count++;`,
      hints: [
        "Don't try to see it all at once. Ask: when i = 0, how many times does the inner loop run? When i = 1? When i = 2? Write those down.",
        "The common mistake is 'two nested loops, so n × n'. That would be right if the inner loop always ran n times — but it runs i times, and i changes. Add up the actual counts.",
        "You're adding 0 + 1 + 2 + … + (n−1). That sum has a closed form from this chapter. Then: which term grows fastest?",
      ],
      solution: [
        "For i = 0 the inner loop runs 0 times; i = 1 → 1 time; i = 2 → 2 times; … ; i = n−1 → n−1 times.",
        "Total = 0 + 1 + 2 + … + (n−1) = n(n−1)/2.",
        "Expand: (n² − n)/2 = n²/2 − n/2. The n² term dominates; drop the coefficient ½ and the lower-order n/2.",
        "O(n²). (This is HW 4 Problem 2 and the exact shape of insertion sort's worst case.)",
      ],
      why: "Almost every 'why is my code slow' question in a real job is this exercise in disguise: a loop hiding inside a loop, doing n(n−1)/2 work where n(log n) was possible. Being able to count it — not guess it — is what lets you find the fix.",
    },
    {
      id: "induction-shape",
      title: "Write the shape of an induction proof",
      prompt: "Claim: 1 + 2 + 4 + … + 2ⁿ = 2ⁿ⁺¹ − 1 for every n ≥ 0. Don't prove it yet — just write the three labelled parts you'd need (base case, inductive hypothesis, inductive step), each as one sentence with the actual numbers or expressions filled in.",
      hints: [
        "The base case is the smallest n the claim mentions. Plug it into both sides and check they match.",
        "People write the inductive step as 'assume it's true for all n' — that assumes the conclusion. You assume it for ONE value, k, and show it for the NEXT one, k+1.",
        "In the step, the left side for k+1 is the left side for k plus one more term. Write 'LHS(k+1) = LHS(k) + 2ᵏ⁺¹', then replace LHS(k) with what the hypothesis says it equals.",
      ],
      solution: [
        "Base case (n = 0): left side is 1; right side is 2¹ − 1 = 1. ✓",
        "Inductive hypothesis: assume 1 + 2 + … + 2ᵏ = 2ᵏ⁺¹ − 1 for some k ≥ 0.",
        "Inductive step: 1 + 2 + … + 2ᵏ + 2ᵏ⁺¹ = (2ᵏ⁺¹ − 1) + 2ᵏ⁺¹ = 2·2ᵏ⁺¹ − 1 = 2ᵏ⁺² − 1, which is the claim for k+1. ✓",
        "Conclusion: true for n = 0, and true for k ⇒ true for k+1, so true for all n ≥ 0.",
      ],
      why: "Loop invariants (Lectures 2–3), recurrence proofs by substitution (Lectures 6–7), and every correctness argument you'll ever write for a recursive function are this same three-part shape. Learn the shape once and you can prove code correct instead of hoping.",
    },
  ],

  "2-adts-invariants-insertion": [
    {
      id: "stack-queue-story",
      title: "Which ADT?",
      prompt: "A text editor's undo feature. Every edit is recorded; pressing Undo reverses the most recent edit that hasn't been undone yet. Which ADT, which operations map to 'make an edit' and 'press Undo', and why not the other one?",
      choices: [
        { text: "Queue — enqueue on edit, dequeue on undo", feedback: "A queue would undo the *oldest* edit first. Try it: edits A, B, C; dequeue gives A. That's not what Undo does." },
        { text: "Stack — push on edit, pop on undo", feedback: "Right. The most recent edit is the first one reversed: last in, first out." },
        { text: "List — add at index 0 on edit, get(size−1) on undo", feedback: "A list can be made to work, but you'd be reimplementing a stack with extra steps and an O(n) shift on every edit. Poon's point about ADTs: pick the contract that matches the behaviour." },
      ],
      answer: 1,
      hints: [
        "Ask the one question: when you undo, do you reverse the *first* edit you ever made, or the *most recent* one?",
        "Students often pick the structure they find more familiar rather than matching the *order* of removal. The only thing that decides stack vs queue is: first-in-first-out or last-in-first-out?",
        "Say the scenario out loud as 'the ___ thing in is the ___ thing out'. Fill the blanks; that sentence names the ADT.",
      ],
      solution: [
        "Undo reverses the most recent edit: last in, first out. That's a stack.",
        "Make an edit = push(edit). Press Undo = pop() and reverse what it returns. Redo is a second stack: each undone edit is pushed there.",
        "A queue would reverse the oldest edit first — wrong behaviour, not just slower.",
      ],
      why: "Undo/redo, the browser's back button, the call stack that runs every function you write, and matching brackets in a compiler are all stacks. Recognizing 'this is LIFO' in a story is a skill interviewers test directly.",
    },
    {
      id: "circular-queue-trace",
      title: "Trace a circular queue",
      prompt: "Capacity 4, head = 0, tail = −1, size = 0. Run: enqueue(A), enqueue(B), enqueue(C), dequeue(), dequeue(), enqueue(D), enqueue(E), enqueue(F). After each operation write head, tail, size, and the array. Which enqueue wraps around, and what is `tail` right after it?",
      hints: [
        "Keep a table with columns: op · array · head · tail · size. Fill one row per operation. Enqueue moves tail; dequeue moves head; both use `(x + 1) % 4`.",
        "The usual slip is forgetting that dequeue does NOT clear or shift anything — it only moves `head`. The old value stays in the slot until something overwrites it.",
        "Wraparound happens when tail is at index 3 and you enqueue: (3 + 1) % 4 = 0. Watch for the moment tail hits 3.",
      ],
      solution: [
        "enqueue A: [A · · ·], head 0, tail 0, size 1. enqueue B: [A B · ·], tail 1, size 2. enqueue C: [A B C ·], tail 2, size 3.",
        "dequeue → A: head 1, size 2. dequeue → B: head 2, size 1. (Slots 0 and 1 still hold A and B physically, but they're free.)",
        "enqueue D: tail (2+1)%4 = 3, [A B C D], size 2. enqueue E: tail (3+1)%4 = **0** — wraps — [E B C D], size 3.",
        "enqueue F: tail 1, [E F C D], size 4 — full. Queue order (from head): C, D, E, F.",
        "The enqueue of E wraps; tail = 0 right after it.",
      ],
      why: "This exact structure is the ring buffer inside every keyboard driver, audio pipeline, and network card — a fixed block of memory reused forever with two indexes. If you ever write anything real-time, you'll write this.",
    },
    {
      id: "invariant-max",
      title: "State and prove a loop invariant",
      prompt: "Write the loop invariant for this code and give Initialization, Maintenance, and Termination in Poon's four-sentence format.",
      code: `int best = a[0];
for (int i = 1; i < a.length; i++)
  if (a[i] > best) best = a[i];`,
      hints: [
        "The invariant is a sentence about `best` and `i` that's true every time the loop is about to test `i < a.length`. What does `best` hold at that moment — in terms of i?",
        "The classic mistake: 'best is the maximum of the array'. That's only true at the END. Mid-loop, best is the maximum of the part you've *seen*. Name that part using i.",
        "Template: 'At the start of each iteration with index i, best = the maximum of a[0..i−1].' Now plug in i = 1 for initialization and i = a.length for termination.",
      ],
      solution: [
        "Invariant: at the start of each iteration with index i, `best` equals the maximum of a[0..i−1].",
        "Initialization: i = 1, so a[0..0] is just a[0], and best was set to a[0]. ✓",
        "Maintenance: assume best = max of a[0..i−1]. The body compares a[i] to best and keeps the larger, so best = max of a[0..i]. Then i increments, so the invariant reads 'max of a[0..i−1]' again for the new i. ✓",
        "Termination: the loop ends when i = a.length. The invariant says best = max of a[0..a.length−1] — the whole array. ✓",
      ],
      why: "Every time you write a loop that accumulates something (a max, a sum, a running average, 'the best candidate so far'), the invariant is the sentence that tells you the loop is right — and it's the sentence you'll write in a code review comment when someone asks 'why does this work?'",
    },
    {
      id: "insertion-trace",
      title: "Trace insertion sort",
      prompt: "Trace insertion sort on [6, 3, 7, 1, 5]. For each outer iteration write the key, the sorted prefix before the insert, the number of shifts, and the array after. Then: how many shifts total, and what input of length 5 would give the maximum possible?",
      hints: [
        "Set up five rows, one per j from 1 to 4. The key is a[j]; the sorted prefix is a[0..j−1]; a shift happens every time the element left of the hole is bigger than the key.",
        "The common mistake is counting comparisons instead of shifts, or forgetting that the loop stops at the first element that is NOT bigger than the key (the `>` is strict).",
        "For the maximum: what arrangement forces every key to walk past every earlier element? Then use 1 + 2 + … + (n−1).",
      ],
      solution: [
        "j=1 key 3, prefix [6]: 6 > 3 → 1 shift → [3, 6, 7, 1, 5].",
        "j=2 key 7, prefix [3, 6]: 6 > 7? no → 0 shifts → [3, 6, 7, 1, 5].",
        "j=3 key 1, prefix [3, 6, 7]: 7, 6, 3 all bigger → 3 shifts → [1, 3, 6, 7, 5].",
        "j=4 key 5, prefix [1, 3, 6, 7]: 7 > 5 shift, 6 > 5 shift, 3 > 5? no → 2 shifts → [1, 3, 5, 6, 7].",
        "Total shifts: 1 + 0 + 3 + 2 = 6. Maximum for n = 5: reverse order [5, 4, 3, 2, 1] gives 1 + 2 + 3 + 4 = 10 = n(n−1)/2.",
      ],
      why: "Insertion sort is what real libraries run on small or nearly-sorted pieces (Python's sort, Java's, and your Project 1 hybrid). Knowing exactly what it does on a specific input is how you predict whether it'll be fast on *your* data.",
    },
  ],

  "4-big-o-merge-sort": [
    {
      id: "crossover",
      title: "When does the 'slower' algorithm win?",
      prompt: "Algorithm P costs 50·n·log₂n operations; algorithm Q costs n². For n = 8, n = 64, and n = 1024, which is cheaper? Roughly where do they cross?",
      hints: [
        "Just compute both sides for each n. log₂ 8 = 3, log₂ 64 = 6, log₂ 1024 = 10.",
        "The usual mistake is trusting the Big-O label ('n log n beats n²') without plugging in numbers. Big-O is about *large* n. The constant 50 matters for small n.",
        "Set 50·n·log₂n = n² → 50·log₂n = n. Try n = 256 (log = 8 → 400 vs 256), n = 512 (log = 9 → 450 vs 512). The crossover is between them.",
      ],
      solution: [
        "n = 8: P = 50·8·3 = 1,200; Q = 64. Q wins by a mile.",
        "n = 64: P = 50·64·6 = 19,200; Q = 4,096. Q still wins.",
        "n = 1024: P = 50·1024·10 = 512,000; Q = 1,048,576. P wins now.",
        "Crossover where 50·log₂n = n: around n ≈ 450–500. Below it the quadratic algorithm is faster; above it, n log n pulls away forever.",
      ],
      why: "This is exactly why Project 1's hybrid sort exists and why Java's own sort switches to insertion sort under ~47 elements. Engineers pick algorithms by measuring the crossover on real sizes, not by the label alone.",
    },
    {
      id: "merge-trace",
      title: "Trace merge sort in M() format",
      prompt: "Trace merge sort on [9, 2, 7, 4, 1, 8, 3] in Poon's M([…]) format, indenting by depth and writing → result on every return. Left half gets the extra element.",
      hints: [
        "Write M([9,2,7,4,1,8,3]) at the top. Split: mid = (0+6)/2 = 3, so left is indexes 0..3 (four elements) and right is 4..6 (three). Indent each sub-call one level.",
        "Two common slips: splitting so the *right* half gets the extra element (Poon's convention is left), and writing the merged result before both children have returned. Every → must come after both sub-calls above it.",
        "Base case is a single element: M([x]) → [x] on one line. When you merge, do it with two fingers on paper — don't sort the two halves in your head.",
      ],
      solution: [
        "M([9,2,7,4,1,8,3])",
        "  M([9,2,7,4]) → M([9,2]) → M([9])→[9], M([2])→[2], →[2,9]; M([7,4]) → [7],[4] →[4,7]; →[2,4,7,9]",
        "  M([1,8,3]) → M([1,8]) → [1],[8] →[1,8]; M([3])→[3]; →[1,3,8]",
        "  →[1,2,3,4,7,8,9]",
        "Seven elements, three levels of merging below the root: 7 × 3 ≈ 21 element-moves, matching n log n ≈ 7 × 2.8.",
      ],
      why: "Merge sort is the algorithm behind external sorting (data too big for memory), behind `git merge`'s ordering, and behind Timsort in Python and Java. Being able to trace it means being able to debug a recursive function by hand — the skill that separates 'it works' from 'I know why'.",
    },
    {
      id: "merge-space",
      title: "Why the temp array?",
      prompt: "Try to merge the two sorted halves of [2, 5, 1, 4] *in place*, writing the merged output into the same four slots from left to right. Show the exact step where it breaks and explain what merge sort does instead and what that costs.",
      hints: [
        "Left half [2, 5], right half [1, 4]. Merge step 1: the smallest is 1. Where does it need to go? What's currently in that slot?",
        "The mistake is to say 'just swap them'. Swap 1 and 2: [1, 5, 2, 4]. Now the right half is [2, 4] — still sorted, lucky — but keep going and you'll find swaps that break the sortedness of a half. Try [2, 6, 1, 3].",
        "The clean argument: writing output to slot k overwrites an element you may not have read yet. So merge writes to a separate array and copies back — O(n) extra space, the price of O(n) merge time.",
      ],
      solution: [
        "Merge [2, 5] and [1, 4]: first output is 1, which belongs at index 0 — but index 0 holds 2, which hasn't been placed yet. Writing 1 there destroys the 2.",
        "Swapping instead of overwriting can break a half's sortedness in general (e.g. [2, 6, 1, 3]: after moving 1 to the front, the 2 lands in the right half ahead of 3 — fine — but the next steps put 6 before 3).",
        "Merge sort avoids this with a temp array: write the merged run into tmp[lo..hi], then copy back. Space O(n); time stays O(n) per merge.",
        "Heap sort (Lecture 8) is the O(n log n) sort that manages without the extra array.",
      ],
      why: "Memory is the constraint on phones, embedded devices, and GPUs. 'Does it need a copy of the data?' is one of the first questions asked about any algorithm in production, and the answer for merge sort is yes.",
    },
  ],

  "6-recurrences": [
    {
      id: "write-recurrence",
      title: "Write the recurrence from the code",
      prompt: "Write T(n) for this function (base case included), then say what a, b, and f(n) are.",
      code: `int f(int[] a, int lo, int hi) {
  if (hi - lo < 1) return a[lo];          // one element
  int mid = (lo + hi) / 2;
  int x = f(a, lo, mid);
  int y = f(a, mid + 1, hi);
  int z = f(a, lo, mid);                   // yes, again
  for (int i = lo; i <= hi; i++) x += a[i];
  return x + y + z;
}`,
      hints: [
        "Count three things at the current call: how many recursive calls, how big is each, and how much other work is done. That's a, n/b, and f(n).",
        "The trap is missing the third call — it's a repeat of the first, but the computer runs it again. Count calls, not distinct subproblems.",
        "The for loop runs hi − lo + 1 = n times. Everything else at this level is constant.",
      ],
      solution: [
        "Three recursive calls, each on half the input: a = 3, b = 2.",
        "The loop does n work: f(n) = n (plus constants).",
        "T(n) = 3T(n/2) + n, with T(1) = 1.",
        "For later: n^(log₂3) ≈ n^1.58, and n is polynomially smaller, so master case 1 gives Θ(n^1.58).",
      ],
      why: "Reading the recurrence off code is the whole game. Every 'why is this recursive function slow' investigation starts by writing T(n) — and a duplicated recursive call like the third one here is the single most common performance bug in recursive code (it's what makes naive Fibonacci exponential).",
    },
    {
      id: "tree-table",
      title: "Fill the recursion-tree table",
      prompt: "For T(n) = 2T(n/4) + n, fill Poon's table for levels 0, 1, 2, and general i (columns: nodes, size per node, work per node, total at level). How many levels? Which level dominates, and what is T(n)?",
      hints: [
        "Level 0 is one node of size n doing n work. Level 1: how many nodes (a), each of what size (n/b), each doing how much (f of that size)?",
        "The most common error is the level total: it's nodes × work-per-node, and both change with i. Write it as a product first, then simplify. Here: 2ⁱ × n/4ⁱ.",
        "2ⁱ/4ⁱ = (2/4)ⁱ = (1/2)ⁱ. The per-level total *shrinks* by half each level. When the series shrinks, the root dominates — the whole sum is at most 2 × the root.",
      ],
      solution: [
        "Level 0: 1 node, size n, work n, total n. Level 1: 2 nodes, size n/4, work n/4 each, total n/2. Level 2: 4 nodes, size n/16, work n/16, total n/4.",
        "Level i: 2ⁱ nodes × n/4ⁱ = (1/2)ⁱ·n.",
        "Levels: n/4ᵏ = 1 → k = log₄ n, so log₄ n + 1 levels.",
        "Total = n(1 + ½ + ¼ + …) ≤ 2n. The root dominates: T(n) = Θ(n). (Master: n^(log₄2) = n^0.5, f = n is polynomially larger, case 3 → Θ(n). Same answer.)",
      ],
      why: "The table is how you reason about any divide-and-conquer cost — including parallel programs, where 'work per level' becomes 'work per round of machines'. If the per-level series shrinks, the top dominates; if it grows, the leaves do. That instinct transfers far beyond sorting.",
    },
    {
      id: "master-mix",
      title: "Master method, four in a row",
      prompt: "Solve with the master method, stating a, b, the watershed n^(log_b a), the case, and the answer. If it doesn't apply, say why. (1) T(n) = 9T(n/3) + n. (2) T(n) = T(2n/3) + 1. (3) T(n) = 3T(n/4) + n log n. (4) T(n) = 2T(n/2) + n log n.",
      hints: [
        "For each: write a, b, f(n) first, then compute log_b a as 'b to what power gives a'. Only then compare f to the watershed.",
        "Two traps: (2) has a = 1, so the watershed is n⁰ = 1 — people forget log_b 1 = 0. And (4) is the famous gap: n log n is bigger than n, but not *polynomially* bigger, so no case fits.",
        "Case 3 needs the regularity check: a·f(n/b) ≤ c·f(n) with c < 1. Do it explicitly for (3).",
      ],
      solution: [
        "(1) a = 9, b = 3, watershed n^(log₃9) = n². f = n is polynomially smaller (ε = 1). Case 1 → Θ(n²).",
        "(2) a = 1, b = 3/2, watershed n^(log₁.₅ 1) = n⁰ = 1. f = 1 = Θ(1) matches. Case 2 → Θ(log n). (Binary-search-like.)",
        "(3) a = 3, b = 4, watershed n^(log₄3) ≈ n^0.79. f = n log n is polynomially larger (n log n ≥ n^(0.79+ε) for ε = 0.2). Regularity: 3·(n/4)log(n/4) ≤ (3/4)·n log n ✓ (c = 3/4). Case 3 → Θ(n log n).",
        "(4) a = 2, b = 2, watershed n. f = n log n is larger than n but only by a log factor — not n^ε for any ε > 0. Falls in the gap between cases 2 and 3: **master method does not apply**. (Recursion tree gives Θ(n log² n), but 'does not apply' is the graded answer.)",
      ],
      why: "The master method is the two-minute estimate engineers use before writing a divide-and-conquer algorithm at all — 'if I split in 3 and combine in linear time, is that worth it?' Knowing its blind spots (the log gap, non-constant a) is what stops you from applying a formula where it lies.",
    },
  ],

  "8-heaps-heapsort-pq": [
    {
      id: "index-math",
      title: "Index arithmetic without the picture",
      prompt: "A max-heap is stored in an array of 15 elements. Without drawing it: (a) what are the children of index 6? (b) the parent of index 13? (c) which indexes are leaves? (d) if a[6] = 40, what can you say about a[13] and a[14]?",
      hints: [
        "Three formulas: left 2i+1, right 2i+2, parent ⌊(i−1)/2⌋. Just apply them. Leaves start at ⌊n/2⌋.",
        "Two frequent slips: using the 1-based CLRS formulas (2i, 2i+1, ⌊i/2⌋) in a 0-based array, and thinking 'leaves are the last row' — with n = 15 the last row happens to be full, but in general leaves are everything from ⌊n/2⌋ on.",
        "For (d): the heap property is only between a node and its own children. Which indexes are 6's children? Then the inequality follows.",
      ],
      solution: [
        "(a) Children of 6: 2·6+1 = 13 and 2·6+2 = 14.",
        "(b) Parent of 13: ⌊12/2⌋ = 6.",
        "(c) Leaves: ⌊15/2⌋ = 7 through 14 — eight leaves, exactly half of 15 rounded up.",
        "(d) a[13] ≤ 40 and a[14] ≤ 40, because 13 and 14 are 6's children and a parent is ≥ its children. Nothing is implied about a[13] vs a[14].",
      ],
      why: "Heaps are stored this way because array arithmetic is the fastest thing a CPU does — no pointers to follow, everything in one cache-friendly block. Priority queues in operating systems, Dijkstra's algorithm, and every 'top-k' query run on this arithmetic.",
    },
    {
      id: "buildheap-trace",
      title: "buildHeap, then one extract",
      prompt: "Run buildHeap on [4, 10, 3, 5, 1, 8, 9] showing the array after each heapify call. Then perform extract() and show the array after the swap and after the heapify.",
      hints: [
        "n = 7 → first leaf is index 3, so heapify runs for i = 2, 1, 0 in that order. For each, compare the node with its two children and swap with the larger if the larger beats the node.",
        "The mistake that costs the most is stopping heapify after one swap. If the sunk value still has children, compare again. In heapify(0) here, the value sinks twice.",
        "For extract: take a[0], move the LAST element to a[0], shrink to 6 elements, then heapify(0) on the 6-element heap — ignore the old last slot.",
      ],
      solution: [
        "heapify(2): 3 vs children 8, 9 → swap with 9: [4, 10, 9, 5, 1, 8, 3].",
        "heapify(1): 10 vs 5, 1 → already largest, no change.",
        "heapify(0): 4 vs 10, 9 → swap with 10: [10, 4, 9, 5, 1, 8, 3]; 4 now at index 1 vs children 5, 1 → swap with 5: [10, 5, 9, 4, 1, 8, 3]. Heap built.",
        "extract(): return 10. Move last (3) to root, size 6: [3, 5, 9, 4, 1, 8]. heapify(0): 3 vs 5, 9 → swap with 9: [9, 5, 3, 4, 1, 8]; 3 at index 2 vs child 8 (index 5; index 6 is out of range) → swap: [9, 5, 8, 4, 1, 3].",
        "Final heap: [9, 5, 8, 4, 1, 3].",
      ],
      why: "This is the exact loop inside a task scheduler, a bandwidth shaper, or an event simulator: build once, then extract-the-max forever. If you can trace it, you can read the standard library's PriorityQueue source and know what it costs.",
    },
    {
      id: "heap-vs-others",
      title: "Pick the structure and justify the cost",
      prompt: "A log system receives a million events per hour and must always report the 100 most severe seen so far, updated in real time. Compare: (A) keep a sorted array of all events, (B) keep a min-heap of size 100, (C) keep a max-heap of all events. Which would you choose and what does each cost per event?",
      choices: [
        { text: "(A) sorted array of everything", feedback: "Inserting into a sorted array is O(n) — shifting up to a million elements per event. And you're storing everything when you only need 100." },
        { text: "(B) a min-heap holding only the top 100", feedback: "Right. The root is the *least severe of the top 100*. New event: if it beats the root, replace the root and heapify — O(log 100), constant in practice. Memory: 100 items." },
        { text: "(C) a max-heap of all events", feedback: "Insert is O(log n) — fine — but 'the top 100' would need 100 extracts (then re-inserts) every time you report, and you store every event forever. A max-heap gives you the max, not the top k." },
      ],
      answer: 1,
      hints: [
        "You only ever need 100 things. What's the one comparison that decides whether a new event belongs among them? Which structure makes *that* item O(1) to find?",
        "The counter-intuitive part is using a MIN-heap to track the MAXIMUM 100. People pick the max-heap by reflex. Ask: to decide if a newcomer joins the top 100, do you need the best of the top 100 or the worst of them?",
        "Think of the top-100 as a club with a bouncer. The bouncer only needs to know the *weakest* current member. A min-heap keeps the weakest at the root.",
      ],
      solution: [
        "Keep a min-heap of the 100 most severe events seen so far. Its root is the least severe of those 100.",
        "New event e: if severity(e) ≤ root, discard it in O(1). Otherwise replace the root with e and heapify(0): O(log 100) ≈ 7 steps.",
        "Reporting the top 100 is just reading the heap (or sorting 100 items). Memory stays at 100 no matter how many events arrive.",
        "Sorted array: O(n) per insert. Max-heap of everything: O(log n) insert but O(k log n) to report the top k, plus unbounded memory.",
      ],
      why: "'Top k of a stream' is one of the most common real problems there is — trending topics, most-viewed pages, hottest CPUs in a fleet — and the min-heap-of-size-k trick is the standard answer. It's also a classic interview question precisely because the reflex answer (max-heap) is wrong.",
    },
  ],
};
