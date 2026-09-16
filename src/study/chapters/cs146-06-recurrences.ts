import type { Chapter, Frame } from "../types";

/**
 * CS 146 · Lectures 6–7 — Recurrences: recursion tree, substitution, master
 * method. Built from Poon's Lecture 6 (updated Sep 9) and Lecture 7 (Sep 14)
 * slides, HW 6 and HW 7, and CLRS 4.3–4.5. Assumes Chapter 0.
 */


/** The merge-sort recursion tree, built up one level per frame. */
const treeLevels = [
  { nodes: ["n"], work: "1 · kn = kn" },
  { nodes: ["n/2", "n/2"], work: "2 · k(n/2) = kn" },
  { nodes: ["n/4", "n/4", "n/4", "n/4"], work: "4 · k(n/4) = kn" },
  { nodes: ["n/8", "n/8", "n/8", "n/8", "n/8", "n/8", "n/8", "n/8"], work: "8 · k(n/8) = kn" },
];
const treeFrames: Frame[] = [
  { kind: "tree", levels: [treeLevels[0]], caption: "Level 0: one call on n things. Its own work — the merge — is k·n. Under it hang two calls it makes." },
  { kind: "tree", levels: [treeLevels[0], { ...treeLevels[1], hl: true }], caption: "Level 1: two calls on n/2 each. Each merges n/2 things, cost k·n/2. Total at this level: 2 × k·n/2 = kn. Same as level 0." },
  { kind: "tree", levels: [treeLevels[0], treeLevels[1], { ...treeLevels[2], hl: true }], caption: "Level 2: four calls on n/4. Four times k·n/4 = kn again. The pattern: more nodes, smaller each, same total." },
  { kind: "tree", levels: [treeLevels[0], treeLevels[1], treeLevels[2], { ...treeLevels[3], hl: true }], caption: "Level 3: eight calls on n/8. Still kn. Every level costs kn. So the total cost is kn × (number of levels)." },
  { kind: "tree", levels: treeLevels.map((l) => ({ ...l, hl: true })), caption: "How many levels? Sizes go n, n/2, n/4, … until size 1. That's log₂ n halvings (Chapter 0), so log n + 1 levels including the root. Total ≈ kn · log n = O(n log n)." },
];

const unrollFrames: Frame[] = [
  { kind: "lines", lines: ["T(8) = 2·T(4) + 8k", "T(4) = 2·T(2) + 4k", "T(2) = 2·T(1) + 2k", "T(1) = 1"], active: 0, caption: "Plug n = 8 into T(n) = 2T(n/2) + kn. T(8) needs T(4), which we don't know yet." },
  { kind: "lines", lines: ["T(8) = 2·T(4) + 8k", "T(4) = 2·T(2) + 4k", "T(2) = 2·T(1) + 2k", "T(1) = 1"], active: 1, caption: "Plug n = 4. T(4) needs T(2)." },
  { kind: "lines", lines: ["T(8) = 2·T(4) + 8k", "T(4) = 2·T(2) + 4k", "T(2) = 2·T(1) + 2k", "T(1) = 1"], active: 2, caption: "Plug n = 2. T(2) needs T(1) — and T(1) is the base case." },
  { kind: "lines", lines: ["T(1) = 1", "T(2) = 2·1 + 2k = 2 + 2k", "T(4) = 2·(2 + 2k) + 4k = 4 + 8k", "T(8) = 2·(4 + 8k) + 8k = 8 + 24k"], active: 0, caption: "Now go back up. T(1) = 1 — one thing, one step." },
  { kind: "lines", lines: ["T(1) = 1", "T(2) = 2·1 + 2k = 2 + 2k", "T(4) = 2·(2 + 2k) + 4k = 4 + 8k", "T(8) = 2·(4 + 8k) + 8k = 8 + 24k"], active: 1, caption: "T(2) = two T(1)s plus 2k of merging." },
  { kind: "lines", lines: ["T(1) = 1", "T(2) = 2·1 + 2k = 2 + 2k", "T(4) = 2·(2 + 2k) + 4k = 4 + 8k", "T(8) = 2·(4 + 8k) + 8k = 8 + 24k"], active: 2, caption: "T(4) = two T(2)s plus 4k." },
  { kind: "lines", lines: ["T(1) = 1", "T(2) = 2·1 + 2k = 2 + 2k", "T(4) = 2·(2 + 2k) + 4k = 4 + 8k", "T(8) = 2·(4 + 8k) + 8k = 8 + 24k"], active: 3, caption: "T(8) = 8 + 24k. Look at the 24k: it's 8k + 8k + 8k — one kn for each of the 3 levels of merging. That's n log n: 8 · log₂ 8 = 8 · 3 = 24. The recursion tree is this computation drawn as a picture." },
];

const masterFrames: Frame[] = [
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n", "a = 4, b = 2, f(n) = n", "n^(log_b a) = n^(log₂ 4) = n²", "compare f(n) = n  vs  n²", "n is polynomially smaller (n = n^(2−1), ε = 1) → Case 1", "T(n) = Θ(n²)"], active: 0, caption: "Example 1 (Lecture 7 slide 13). Start by matching the shape aT(n/b) + f(n)." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n", "a = 4, b = 2, f(n) = n", "n^(log_b a) = n^(log₂ 4) = n²", "compare f(n) = n  vs  n²", "n is polynomially smaller (n = n^(2−1), ε = 1) → Case 1", "T(n) = Θ(n²)"], active: 1, caption: "Read off a (subproblems), b (shrink factor), f(n) (the non-recursive work)." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n", "a = 4, b = 2, f(n) = n", "n^(log_b a) = n^(log₂ 4) = n²", "compare f(n) = n  vs  n²", "n is polynomially smaller (n = n^(2−1), ε = 1) → Case 1", "T(n) = Θ(n²)"], active: 2, caption: "Compute the watershed: log₂ 4 = 2, so n². (Chapter 0 if this stalls.)" },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n", "a = 4, b = 2, f(n) = n", "n^(log_b a) = n^(log₂ 4) = n²", "compare f(n) = n  vs  n²", "n is polynomially smaller (n = n^(2−1), ε = 1) → Case 1", "T(n) = Θ(n²)"], active: 3, caption: "Compare the work-outside-recursion f(n) to the watershed." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n", "a = 4, b = 2, f(n) = n", "n^(log_b a) = n^(log₂ 4) = n²", "compare f(n) = n  vs  n²", "n is polynomially smaller (n = n^(2−1), ε = 1) → Case 1", "T(n) = Θ(n²)"], active: 4, caption: "n¹ vs n²: the exponents differ by 1, a real polynomial gap. Case 1: the leaves dominate." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n", "a = 4, b = 2, f(n) = n", "n^(log_b a) = n^(log₂ 4) = n²", "compare f(n) = n  vs  n²", "n is polynomially smaller (n = n^(2−1), ε = 1) → Case 1", "T(n) = Θ(n²)"], active: 5, caption: "Case 1's answer is the watershed itself: Θ(n²)." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n²", "a = 4, b = 2, f(n) = n²,  watershed n²", "n² vs n² — the same → Case 2", "T(n) = Θ(n² log n)"], active: 2, caption: "Example 2 (slide 16). f(n) equals the watershed. Every level does the same work, and there are log n levels — so multiply by log n." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n²", "a = 4, b = 2, f(n) = n²,  watershed n²", "n² vs n² — the same → Case 2", "T(n) = Θ(n² log n)"], active: 3, caption: "Case 2: Θ(watershed · log n) = Θ(n² log n)." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n³", "a = 4, b = 2, f(n) = n³,  watershed n²", "n³ vs n² — f is polynomially larger (ε = 1) → Case 3", "regularity: 4·(n/2)³ = 4n³/8 = n³/2 ≤ c·n³ with c = ½ < 1  ✓", "T(n) = Θ(n³)"], active: 2, caption: "Example 3 (slide 17). Now f is bigger than the watershed by a polynomial gap. The root's own work dominates." },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n³", "a = 4, b = 2, f(n) = n³,  watershed n²", "n³ vs n² — f is polynomially larger (ε = 1) → Case 3", "regularity: 4·(n/2)³ = 4n³/8 = n³/2 ≤ c·n³ with c = ½ < 1  ✓", "T(n) = Θ(n³)"], active: 3, caption: "Case 3 has an extra check: the work must shrink going down the tree. Plug n/2 into f, multiply by a, and see it's at most a fraction c < 1 of f(n). Here it's exactly half. ✓" },
  { kind: "lines", lines: ["T(n) = 4T(n/2) + n³", "a = 4, b = 2, f(n) = n³,  watershed n²", "n³ vs n² — f is polynomially larger (ε = 1) → Case 3", "regularity: 4·(n/2)³ = 4n³/8 = n³/2 ≤ c·n³ with c = ½ < 1  ✓", "T(n) = Θ(n³)"], active: 4, caption: "Case 3's answer is f(n) itself: Θ(n³)." },
];

export const cs146Recurrences: Chapter = {
  slug: "6-recurrences",
  label: "Lectures 6–7",
  title: "Recurrences: recursion tree, substitution, master method",
  source: "Lecture 6 slides (updated Sep 9), Lecture 7 slides (Sep 14), HW 6, HW 7, CLRS 4.3–4.5.",
  goal: "Given any T(n) = aT(n/b) + f(n), say what it means, draw its tree, and produce its Θ runtime — by tree, by substitution, or by the master method — and know which one Poon wants.",
  minutes: 75,
  requires: ["0-notation"],
  sections: [
    {
      id: "why",
      title: "Why recurrences exist",
      blocks: [
        {
          id: "why-1",
          t: "why",
          slide: "The question this answers",
          title: "The question",
          text: "In Lecture 5 you saw merge sort, and Poon argued it runs in O(n log n) with a picture: n−1 divisions, then O(n) of merging per level times log n levels. That argument works for merge sort. But what about an algorithm that splits into three pieces? Or four pieces each a third the size? Or does n² of work to combine? You'd need a new hand-wavy picture every time. Recurrences are the *general* tool: write one equation describing a single level of recursion, then solve it with a method that works for every shape.",
        },
        {
          id: "why-2",
          t: "p",
          slide: "The whole chapter in one line",
          text: "That's the entire chapter: **(1)** write the equation, **(2)** solve it. Writing it is easy once you can read T(n) as a sentence. Solving it has three methods — the recursion tree (draw it), substitution (guess and prove), the master method (look it up in a three-case table). Poon teaches them in that order because each one explains the next.",
        },
        {
          id: "why-3",
          t: "prof",
          title: "What Poon will ask",
          text: "HW 6: draw the first three levels of a tree and fill in a table. HW 7: four recurrences, \"give the Θ solution if the master method applies, state which case and show the conditions are met; if it doesn't apply, say why.\" On the midterm the three master cases are printed on the exam sheet; computing n^(log_b a), picking the case, and spotting when it fails are not.",
        },
      ],
    },
    {
      id: "read",
      title: "Writing the recurrence for merge sort",
      blocks: [
        {
          id: "read-1",
          t: "p",
          slide: "Describe ONE level",
          text: "Chapter 0 gave you T(n) as \"steps to handle n things.\" A recurrence describes what happens in one call of the recursive function — not the whole recursion, just one level. Merge sort on n things does exactly three things: it splits (cheap, constant), it calls itself on two halves, and it merges the results (a pass over n things, so some constant k per element).",
        },
        {
          id: "read-2",
          t: "code",
          slide: "Merge sort's recurrence",
          caption: "Lecture 6 slides 9–10. The +kn is the merge; Poon writes it as O(n) first, then as kn to keep a constant to track.",
          text: `mergeSort(a):                         T(n) =
  if a.length == 1: return a            T(1) = 1                  ← base case
  left  = mergeSort(first half)         T(n/2)
  right = mergeSort(second half)      + T(n/2)      = 2T(n/2)     ← two recursive calls
  return merge(left, right)           + kn                        ← merge: k steps per element`,
        },
        {
          id: "read-3",
          t: "p",
          text: "Why only one level? Because the recursion handles the rest — the same way a recursive function doesn't re-describe its inner calls. Poon asks this on slide 9 (\"Recurrence relations only need to capture what happens on one level. Why?\"). The answer: the T(n/2) terms *are* the deeper levels, by definition.",
        },
        {
          id: "read-4",
          t: "list",
          slide: "Other recurrences read the same way",
          items: [
            "T(n) = 3T(n/5) + 17 — \"three subproblems of a fifth the size, plus 17 fixed steps.\"",
            "T(n) = 3T(n/5) + 4n — \"three subproblems of a fifth the size, plus 4n steps.\"",
            "T(n) = T(n−1) + 1 — \"one subproblem of size one less, plus one step.\" (A loop in disguise: that's n steps total.)",
            "T(n) = 2T(n/2) + O(n) — same as merge sort with the constant hidden; Poon writes both.",
          ],
        },
        {
          id: "read-5",
          t: "try",
          q: "Write the recurrence for binary search (Lecture 5 slide 9: check the middle, recurse on one half).",
          a: "T(n) = T(n/2) + 1: one subproblem of half size, plus a constant to compare the middle. (Solution: log n levels × constant = O(log n).)",
        },
      ],
    },
    {
      id: "unroll",
      title: "Solving by hand for n = 8 — where n log n actually comes from",
      blocks: [
        {
          id: "unroll-1",
          t: "p",
          slide: "Before any method: just compute it",
          text: "Before the three methods, do the dumbest possible thing once: pick n = 8 and compute T(8) by plugging numbers in. This is what a recurrence *is*. Everything after is a shortcut for this.",
        },
        { id: "unroll-2", t: "stepper", slide: true, title: "Unrolling T(n) = 2T(n/2) + kn at n = 8", frames: unrollFrames },
        {
          id: "unroll-3",
          t: "p",
          text: "Two things to take from that. First, the recursion bottoms out at T(1) — without a base case the chain never ends, which is why Poon insists on T(1) = 1. Second, the 24k is 3 × 8k: three levels of merging, each costing k×8. The number of levels was log₂ 8 = 3. That's n log n appearing from arithmetic, no theory. The recursion tree is the same computation, drawn.",
        },
      ],
    },
    {
      id: "tree",
      title: "Method 1 — The recursion tree",
      blocks: [
        {
          id: "tree-1",
          t: "p",
          slide: "The idea",
          text: "Draw every call as a box. Under each box, draw the boxes it calls. Write each box's *own* work (the f(n) part — the merge) next to it. Then add up a whole row at a time, because every box in a row is the same size and does the same work. Total = sum of the rows.",
        },
        { id: "tree-2", t: "stepper", slide: true, title: "Merge sort's tree, one level at a time", frames: treeFrames },
        {
          id: "tree-3",
          t: "table",
          slide: "Poon's table (Lecture 6 slide 24) — this is what HW 6 asks for",
          rows: [
            ["Level", "# nodes", "Size per node", "Work per node", "Total at this level"],
            ["0", "1", "n", "k·n", "1 · kn = kn"],
            ["1", "2", "n/2", "k·n/2", "2 · kn/2 = kn"],
            ["2", "4", "n/4", "k·n/4", "4 · kn/4 = kn"],
            ["3", "8", "n/8", "k·n/8", "8 · kn/8 = kn"],
            ["i", "2ⁱ", "n/2ⁱ", "k·n/2ⁱ", "2ⁱ · kn/2ⁱ = kn"],
          ],
        },
        {
          id: "tree-4",
          t: "p",
          slide: "Row i in general",
          text: "The row for level i is the one that matters, because it's true for every level at once. At level i there are 2ⁱ boxes (doubling each level — Chapter 0's picture), each of size n/2ⁱ (halving each level), each doing k times its size. Multiply: 2ⁱ · k · n/2ⁱ — the 2ⁱ cancels — = kn. Every row costs kn, no matter how deep.",
        },
        {
          id: "tree-5",
          t: "worked",
          slide: "How many levels? (slides 25–26)",
          title: "Counting the depth",
          problem: "The tree stops when a box has size 1. At level i the size is n/2ⁱ. At what level does that hit 1?",
          steps: [
            "Set n/2ⁱ = 1.",
            "Multiply both sides by 2ⁱ: n = 2ⁱ.",
            "\"2 to what power is n?\" — that's log₂ n. So i = log₂ n is the last level.",
            "Levels are numbered from 0, so there are log₂ n + 1 levels in total (Poon's little table: n=1 → 1 level, n=8 → 4 levels, n=16 → 5).",
          ],
          answer: "log₂ n + 1 levels",
        },
        {
          id: "tree-6",
          t: "code",
          slide: "The total",
          caption: "Lecture 6 slide 27. Drop the +1 and the constant k when you switch to Big-O.",
          text: `Total = (cost per level) × (number of levels)
      = kn × (log n + 1)
      = kn log n + kn
      = O(n log n)`,
        },
        {
          id: "tree-7",
          t: "h",
          text: "When the rows are NOT all equal",
        },
        {
          id: "tree-8",
          t: "p",
          slide: "Trees where each level grows or shrinks",
          text: "Merge sort is the special case where every row costs the same. Change the numbers and the rows change size. Poon does two on slides 28–33, and they're the intuition behind the master method, so slow down here.",
        },
        {
          id: "tree-9",
          t: "worked",
          slide: "T(n) = 3T(n/2) + kn — rows GROW",
          title: "Three subproblems of half size",
          problem: "Fill the row for level i.",
          steps: [
            "Nodes: each box makes 3 children, so level i has 3ⁱ boxes (not 2ⁱ).",
            "Size: each child is half the parent, so size at level i is still n/2ⁱ.",
            "Work per node: k · n/2ⁱ.",
            "Total at level i: 3ⁱ · k · n/2ⁱ = (3/2)ⁱ · kn.",
            "(3/2)ⁱ grows with i: level 0 costs kn, level 1 costs 1.5kn, level 2 costs 2.25kn… The BOTTOM row is the biggest. The leaves dominate.",
            "Depth is still log₂ n (sizes halve). Bottom row has 3^(log₂ n) = n^(log₂ 3) ≈ n^1.58 leaves, each O(1). Total is Θ(n^1.58).",
          ],
        },
        {
          id: "tree-10",
          t: "worked",
          slide: "T(n) = 2T(n/3) + kn — rows SHRINK",
          title: "Two subproblems of a third the size",
          problem: "Fill the row for level i.",
          steps: [
            "Nodes: 2ⁱ (each box makes 2 children).",
            "Size: n/3ⁱ (each child is a third of the parent).",
            "Work per node: k · n/3ⁱ. Total at level i: 2ⁱ · kn/3ⁱ = (2/3)ⁱ · kn.",
            "(2/3)ⁱ shrinks: kn, then 0.67kn, then 0.44kn… The TOP row is the biggest. The root dominates.",
            "Depth: sizes divide by 3, so n/3ⁱ = 1 → i = log₃ n → log₃ n + 1 levels (slide 32).",
            "A shrinking geometric series adds up to a constant times its first term, so the total is Θ(kn) = Θ(n).",
          ],
        },
        {
          id: "tree-11",
          t: "figure",
          slide: "Three shapes, one picture",
          viewBox: "0 0 600 180",
          caption: "Row cost by level. Left: rows grow (leaves win — Case 1). Middle: rows equal (multiply by #levels — Case 2). Right: rows shrink (root wins — Case 3). This picture IS the master method.",
          svg: `<g font-family="ui-monospace, monospace" font-size="11" fill="currentColor">
${[0,1,2,3,4].map(i=>`<rect x="${100-i*10-30}" y="${20+i*26}" width="${60+i*20}" height="18" rx="3" fill="rgb(59 130 246 / .5)"/>`).join("")}
<text x="30" y="160" opacity=".7">grows → leaves dominate</text>
${[0,1,2,3,4].map(i=>`<rect x="270" y="${20+i*26}" width="80" height="18" rx="3" fill="rgb(59 130 246 / .5)"/>`).join("")}
<text x="240" y="160" opacity=".7">equal → cost × log n</text>
${[0,1,2,3,4].map(i=>`<rect x="${480+i*10-20}" y="${20+i*26}" width="${100-i*20}" height="18" rx="3" fill="rgb(59 130 246 / .5)"/>`).join("")}
<text x="440" y="160" opacity=".7">shrinks → root dominates</text>
</g>`,
        },
        {
          id: "tree-12",
          t: "try",
          q: "HW 6 Problem 1: T(n) = 4T(n/3) + cn. How many subproblems, what size, what combine cost? Cost at the root and at levels 1 and 2?",
          a: "4 subproblems of size n/3, combine cost cn. Root: cn. Level 1: 4 nodes × c·n/3 = (4/3)cn. Level 2: 16 nodes × c·n/9 = (16/9)cn. Rows grow (4/3 > 1) → leaves dominate. Level i: (4/3)ⁱ cn; depth log₃ n; total Θ(n^(log₃ 4)) ≈ Θ(n^1.26). (That's the 'QUITE hard' Problem 2 — it's just the growing case.)",
        },
      ],
    },
    {
      id: "substitution",
      title: "Method 2 — Substitution (guess, then prove by induction)",
      blocks: [
        {
          id: "sub-1",
          t: "why",
          slide: "Why a second method",
          title: "Why it exists",
          text: "The tree gives you a strong guess but the hand-waving (\"about kn per level\") isn't a proof. Substitution is how you prove a guess is right. It's induction from Chapter 0: assume the formula works for smaller inputs, show it then works for n.",
        },
        {
          id: "sub-2",
          t: "list",
          slide: "Poon's four steps (Lecture 6 slide 12)",
          items: [
            "**Guess** the solution. From the tree: T(n) = O(n log n), i.e. T(n) ≤ c·n log n for some c.",
            "**Inductive assumption**: assume it's true for the smaller input the recurrence uses. Here that's n/2: T(n/2) ≤ c·(n/2)·log(n/2).",
            "**Substitute** the assumption into the recurrence and simplify.",
            "**Prove** the result is ≤ c·n log n for some choice of c. If you can, the guess is confirmed.",
          ],
        },
        {
          id: "sub-3",
          t: "worked",
          slide: "Merge sort by substitution (slides 13–16)",
          title: "Prove T(n) = 2T(n/2) + kn is O(n log n)",
          problem: "Every line uses one fact from Chapter 0. I'll name which.",
          steps: [
            "Guess: T(n) ≤ c·n log n.",
            "Assume for n/2: T(n/2) ≤ c·(n/2)·log(n/2).",
            "Substitute into T(n) = 2T(n/2) + kn:   T(n) ≤ 2·c·(n/2)·log(n/2) + kn.",
            "Simplify 2·(n/2) = n:   T(n) ≤ c·n·log(n/2) + kn.",
            "Log rule 1: log(n/2) = log n − 1:   T(n) ≤ c·n·(log n − 1) + kn.",
            "Distribute:   T(n) ≤ c·n·log n − c·n + kn.",
            "We need this ≤ c·n·log n. Subtract c·n·log n from both sides: need −cn + kn ≤ 0, i.e. kn ≤ cn, i.e. **c ≥ k**.",
            "k is a constant (the merge's cost per element), so pick any c ≥ k. The inequality holds. QED: merge sort is O(n log n).",
          ],
          answer: "Any c ≥ k works.",
        },
        {
          id: "sub-4",
          t: "warn",
          title: "The step people get stuck on",
          text: "Step 7 feels like it appeared from nowhere. It didn't: after substituting, you have T(n) ≤ (what you wanted) − cn + kn. The leftover \"− cn + kn\" is the only thing standing between you and the guess. It's ≤ 0 exactly when c ≥ k. That's the entire proof — the algebra is just clearing the way to that one comparison.",
        },
        {
          id: "sub-5",
          t: "try",
          q: "Use substitution to check that T(n) = T(n/2) + 1 (binary search) is O(log n). Guess T(n) ≤ c·log n.",
          a: "Assume T(n/2) ≤ c·log(n/2) = c(log n − 1). Then T(n) ≤ c·log n − c + 1. Need ≤ c·log n: need −c + 1 ≤ 0, i.e. c ≥ 1. ✓ So T(n) = O(log n).",
        },
      ],
    },
    {
      id: "master",
      title: "Method 3 — The master method",
      blocks: [
        {
          id: "master-1",
          t: "why",
          slide: "Why a third method",
          title: "Why it exists",
          text: "Trees and substitution work but take a page each. Most recurrences you'll ever meet have the shape aT(n/b) + f(n), and for that shape someone did the tree once, in general, and wrote down the answer as three cases. You match your recurrence to the shape, do one comparison, and read off the answer. It's a lookup table with one calculation.",
        },
        {
          id: "master-2",
          t: "code",
          slide: "The shape (Lecture 7 slides 10–11)",
          caption: "a ≥ 1, b > 1, f(n) positive. Merge sort: a = 2, b = 2, f(n) = n.",
          text: `T(n) = a·T(n/b) + f(n)
        │     │      └─ work done OUTSIDE the recursive calls (divide + combine)
        │     └─ each subproblem is 1/b the size
        └─ number of subproblems`,
        },
        {
          id: "master-3",
          t: "p",
          slide: "The watershed function",
          text: "Every case is a comparison between two things: **f(n)** — the work at the root — and **n^(log_b a)** — which, as the tree section showed, is the number of leaves, i.e. the work at the bottom (Lecture 7 slide 21: a^(log_b n) = n^(log_b a) = # leaves). Poon borrows CLRS's word *watershed* for n^(log_b a): a ridge line. If f is below it, water runs to the leaves (they dominate). If f is above it, water runs to the root. If f is exactly on it, every level is equal and you multiply by the number of levels.",
        },
        {
          id: "master-4",
          t: "table",
          slide: "The three cases — printed on the exam",
          rows: [
            ["Case", "When", "Meaning", "Answer"],
            ["1", "f(n) is polynomially SMALLER than n^(log_b a)", "leaves dominate (rows grow)", "Θ(n^(log_b a))"],
            ["2", "f(n) is the SAME as n^(log_b a)", "rows equal", "Θ(n^(log_b a) · log n)"],
            ["3", "f(n) is polynomially LARGER than n^(log_b a)", "root dominates (rows shrink)", "Θ(f(n))"],
          ],
        },
        {
          id: "master-5",
          t: "p",
          slide: "What 'polynomially' means — the ε",
          text: "\"Polynomially smaller\" means the *exponents* differ by some fixed amount ε > 0: f(n) = O(n^(log_b a − ε)). n vs n² qualifies (ε = 1). n^1.9 vs n² qualifies (ε = 0.1). But n/log n vs n does NOT — they have the same exponent 1, and a log factor is not a polynomial gap. That's the trap on slide 28, and it's HW 7 Problem 4.",
        },
        {
          id: "master-6",
          t: "list",
          slide: "The procedure (this is HW 7's answer format)",
          items: [
            "Match the shape. Write a, b, f(n) explicitly.",
            "Compute the watershed n^(log_b a). (Chapter 0 table: log₂ 4 = 2, log₂ 8 = 3, log₃ 27 = 3, log₂ 1 = 0.)",
            "Compare f(n)'s exponent to the watershed's exponent. Smaller by a constant → Case 1. Equal → Case 2. Larger by a constant → Case 3.",
            "Case 3 only: check regularity — a·f(n/b) ≤ c·f(n) for some c < 1. (Plug n/b into f, multiply by a, confirm it's a fraction of f(n).)",
            "Write the answer with the case named.",
          ],
        },
        { id: "master-7", t: "stepper", slide: true, title: "The three canonical examples, worked (Lecture 7 slides 13–17)", frames: masterFrames },
        {
          id: "master-8",
          t: "why",
          title: "Why the regularity check exists (slides 29–31)",
          text: "Case 3 claims the root's work dominates everything below it. That's only true if the work actually shrinks as you go down — geometrically, by a constant factor per level. a·f(n/b) is the total work at the next level; c·f(n) with c < 1 says \"strictly less than the level above.\" A weird f(n) that oscillates (his example: n²(2 + cos n)) can be polynomially larger and still fail this, so the shortcut isn't safe. For every polynomial f(n) = nᵖ you'll meet, regularity holds automatically: a·(n/b)ᵖ = (a/bᵖ)·nᵖ, and a/bᵖ < 1 is the same condition as Case 3 itself.",
        },
        {
          id: "master-9",
          t: "h",
          text: "When the master method does NOT apply",
        },
        {
          id: "master-10",
          t: "list",
          slide: "Four shapes it can't handle (slides 26–31) — free points on the exam",
          items: [
            "**a is not a constant.** T(n) = n·T(n/2) + n². The number of subproblems changes with n; the shape breaks.",
            "**The subproblem isn't n/b.** T(n) = T(n−1) + 1. Subtracting, not dividing — not the shape. (It's a loop; solve by unrolling: n steps.)",
            "**The gap isn't polynomial.** T(n) = 2T(n/2) + n/log n. Watershed is n; f is smaller but only by a log factor. Falls between Case 1 and Case 2. Say \"does not apply\" — that's the graded answer.",
            "**Case 3 without regularity.** f(n) = n²(2 + cos n): polynomially larger than the watershed but doesn't shrink steadily. Say \"does not apply.\"",
          ],
        },
        {
          id: "master-11",
          t: "def",
          term: "Master theorem",
          text: "For T(n) = aT(n/b) + f(n): compare f(n) to n^(log_b a). Polynomially smaller → Θ(n^(log_b a)). Equal → Θ(n^(log_b a) log n). Polynomially larger and regular → Θ(f(n)). Otherwise the theorem is silent.",
        },
      ],
    },
    {
      id: "hw",
      title: "HW 6 and HW 7, solved in full",
      blocks: [
        {
          id: "hw-1",
          t: "p",
          text: "These are the questions the midterm will look like. Cover the answers, try each, then compare.",
        },
        {
          id: "hw-2",
          t: "worked",
          slide: "HW 6 · T(n) = 4T(n/3) + cn",
          title: "HW 6 Problem 1 and the 'quite hard' Problem 2",
          problem: "Draw the first 3 levels, then generalize to level i, count levels, and total.",
          steps: [
            "Subproblems: 4. Size of each: n/3. Combine cost per node: c × its size.",
            "Level 0: 1 node, size n, work cn. Total cn.",
            "Level 1: 4 nodes, size n/3, work cn/3 each. Total 4cn/3.",
            "Level 2: 16 nodes, size n/9, work cn/9 each. Total 16cn/9.",
            "Level i: 4ⁱ nodes × c·n/3ⁱ = (4/3)ⁱ · cn.",
            "Levels: size n/3ⁱ = 1 → i = log₃ n → log₃ n + 1 levels.",
            "Total: cn · Σ (4/3)ⁱ for i = 0…log₃ n. Growing series → dominated by the last term ≈ cn·(4/3)^(log₃ n) = c·n^(log₃ 4). Answer Θ(n^(log₃ 4)) ≈ Θ(n^1.26). Cross-check with the master method: a=4, b=3, watershed n^1.26, f = n is smaller → Case 1 → same answer.",
          ],
        },
        {
          id: "hw-3",
          t: "worked",
          slide: "HW 7 · Problem 1",
          title: "T(n) = 8T(n/2) + n²",
          problem: "Master method with justification.",
          steps: [
            "a = 8, b = 2, f(n) = n².",
            "Watershed: n^(log₂ 8) = n³.",
            "n² vs n³: exponent smaller by 1 (ε = 1). Case 1.",
            "T(n) = Θ(n³).",
          ],
          answer: "Θ(n³), Case 1",
        },
        {
          id: "hw-4",
          t: "worked",
          slide: "HW 7 · Problem 2",
          title: "T(n) = 7T(n/2) + n³",
          problem: "Master method with justification.",
          steps: [
            "a = 7, b = 2, f(n) = n³.",
            "Watershed: n^(log₂ 7) ≈ n^2.81.",
            "n³ vs n^2.81: exponent larger by ≈ 0.19 (ε = 0.19 > 0). Case 3.",
            "Regularity: 7·(n/2)³ = 7n³/8 ≤ c·n³ with c = 7/8 < 1. ✓",
            "T(n) = Θ(n³).",
          ],
          answer: "Θ(n³), Case 3",
        },
        {
          id: "hw-5",
          t: "worked",
          slide: "HW 7 · Problem 3",
          title: "T(n) = 27T(n/3) + Θ(n³)",
          problem: "Master method with justification.",
          steps: [
            "a = 27, b = 3, f(n) = Θ(n³).",
            "Watershed: n^(log₃ 27) = n³.",
            "n³ vs n³: equal. Case 2.",
            "T(n) = Θ(n³ log n).",
          ],
          answer: "Θ(n³ log n), Case 2",
        },
        {
          id: "hw-6",
          t: "worked",
          slide: "HW 7 · Problem 4",
          title: "T(n) = T(n/2) + log n",
          problem: "Master method with justification.",
          steps: [
            "a = 1, b = 2, f(n) = log n.",
            "Watershed: n^(log₂ 1) = n⁰ = 1.",
            "log n vs 1: log n is bigger, but is it *polynomially* bigger? That needs log n = Ω(n^ε) for some ε > 0. No — log n grows slower than every n^ε, no matter how tiny ε is.",
            "So it's not Case 2 (not equal) and not Case 3 (gap isn't polynomial). **The master method does not apply.** State that.",
            "(For your own curiosity: unrolling gives log n + log(n/2) + log(n/4) + … ≈ log n terms of size ≤ log n → Θ(log² n). Not required.)",
          ],
          answer: "Does not apply — the gap between log n and 1 is not polynomial.",
        },
      ],
    },
    {
      id: "practice",
      title: "Practice set",
      blocks: [
        { id: "pr-1", t: "try", q: "T(n) = 2T(n/2) + n log n. Does the master method apply?", a: "Watershed n. f = n log n is larger than n but only by a log factor — not polynomially. Does not apply (the famous gap between Case 2 and 3). The tree gives Θ(n log² n)." },
        { id: "pr-2", t: "try", q: "T(n) = 3T(n/3) + n", a: "a=3, b=3, watershed n^(log₃ 3) = n. f = n equal → Case 2 → Θ(n log n)." },
        { id: "pr-3", t: "try", q: "T(n) = 16T(n/4) + n²", a: "a=16, b=4, log₄ 16 = 2 → watershed n². f = n² equal → Case 2 → Θ(n² log n)." },
        { id: "pr-4", t: "try", q: "T(n) = 2T(n/4) + √n", a: "a=2, b=4, log₄ 2 = ½ → watershed n^½ = √n. f = √n equal → Case 2 → Θ(√n log n)." },
        { id: "pr-5", t: "try", q: "T(n) = T(n/2) + n", a: "a=1, b=2, watershed n⁰ = 1. f = n polynomially larger (ε = 1) → Case 3. Regularity: 1·(n/2) = n/2 ≤ c·n with c = ½. ✓ Θ(n). (Rows shrink by half each level: n + n/2 + n/4 + … = 2n.)" },
        { id: "pr-6", t: "try", q: "Draw the level-i row for T(n) = 5T(n/2) + n² and say which case it is without the formula.", a: "5ⁱ nodes × (n/2ⁱ)² = 5ⁱ · n²/4ⁱ = (5/4)ⁱ n². Rows grow (5/4 > 1) → leaves dominate → Case 1 → Θ(n^(log₂ 5)) ≈ Θ(n^2.32)." },
        { id: "pr-7", t: "try", q: "Explain in one sentence why every level of merge sort's tree costs the same.", a: "The number of nodes doubles each level while the work per node halves, and 2ⁱ · (kn/2ⁱ) = kn." },
      ],
    },
  ],
};
