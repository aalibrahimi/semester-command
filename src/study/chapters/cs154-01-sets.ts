import type { Chapter, Frame } from "../types";

/**
 * CS 154 · Lessons 1–2 — Math preliminaries: reading set notation from zero,
 * sets, power sets, Cartesian products, functions, directed graphs. Built from
 * Chen's Lesson 1 (Aug 24) and Lesson 2 (Aug 26) slides and the Assignment 1
 * solution key (whose deductions are quoted where they matter).
 */

/** Reading { 3n | 0 ≤ n ≤ 6 } one symbol at a time. */
const builderFrames: Frame[] = [
  { kind: "lines", lines: ["{  3n  |  0 ≤ n ≤ 6  }"], active: 0, caption: "Set-builder notation. It looks like a formula; it's actually a *recipe for listing elements*. Read it in three parts: the braces, the left side, the right side." },
  { kind: "lines", lines: ["{ … }", "the braces say: this is a SET"], active: 1, caption: "Curly braces always mean 'a set'. Whatever is inside is a description of which elements belong. (Round brackets would mean something else — an ordered tuple. Chen takes 0.5 off for mixing them up.)" },
  { kind: "lines", lines: ["3n  |", "the LEFT side is the shape of each element"], active: 1, caption: "Left of the bar `|` is a **pattern**: what every element looks like. Here each element is '3 times n' for some n. The bar itself reads as **'such that'** or **'where'**." },
  { kind: "lines", lines: ["|  0 ≤ n ≤ 6", "the RIGHT side says which n are allowed"], active: 1, caption: "Right of the bar is the **condition**: which values of the variable you're allowed to plug into the pattern. Here n runs from 0 to 6. (Chen's default: variables are natural numbers, and 0 counts as natural.)" },
  { kind: "lines", lines: ["n = 0 → 3·0 = 0", "n = 1 → 3·1 = 3", "n = 2 → 3·2 = 6", "…", "n = 6 → 3·6 = 18"], active: 0, caption: "Now run the recipe: plug in every allowed n and collect the results." },
  { kind: "lines", lines: ["{ 3n | 0 ≤ n ≤ 6 }", "= { 0, 3, 6, 9, 12, 15, 18 }"], active: 1, caption: "That's the set — written out in **roster** form. Same set, two spellings. Set-builder is just shorter when the list would be long or infinite: { 3n | n ≥ 0 } is every multiple of 3, forever, and you couldn't list that." },
  { kind: "lines", lines: ["{ x | x ≥ 1, x ≤ 5 }", "comma = AND", "= { 1, 2, 3, 4, 5 }"], active: 1, caption: "One more convention that costs points: in the condition, a **comma means 'and'**. x ≥ 1 *and* x ≤ 5. If you mean 'or', you must write 'or' (or ∨) explicitly." },
];

/** Building the power set of {a, b}. */
const powerFrames: Frame[] = [
  { kind: "array", cells: ["a", "b"], hl: [0, 1], note: "A = {a, b}", caption: "The **power set** of A, written 2ᴬ, is the set of *all subsets* of A. Let's list them for A = {a, b} by asking, for each element, 'in or out?'" },
  { kind: "array", cells: ["ϕ"], done: [0], note: "a out, b out", caption: "Both out: the empty set ϕ. Yes, ϕ is a subset of every set — it's always in the power set." },
  { kind: "array", cells: ["ϕ", "{a}"], done: [0, 1], note: "a in, b out", caption: "Just a." },
  { kind: "array", cells: ["ϕ", "{a}", "{b}"], done: [0, 1, 2], note: "a out, b in", caption: "Just b." },
  { kind: "array", cells: ["ϕ", "{a}", "{b}", "{a, b}"], done: [0, 1, 2, 3], note: "a in, b in", caption: "Both in: A itself. Every set is a subset of itself." },
  { kind: "array", cells: ["2ᴬ = { ϕ, {a}, {b}, {a, b} }"], done: [0], note: "|2ᴬ| = 2² = 4", caption: "Written out with **outer braces** (it's a set) and **inner braces** (each element is itself a set). Two elements, each in-or-out, gives 2 × 2 = 4 subsets. In general |2ᴬ| = 2^|A| — which is exactly why it's called 2ᴬ." },
];

/** Cartesian product for Assignment 1 Q16. */
const productFrames: Frame[] = [
  { kind: "lines", lines: ["Q = {m, n}", "Σ = {x, y}", "find Q × (Σ ∪ {λ})"], active: 2, caption: "Assignment 1 Q16. Two sets, and a product of them. First simplify the thing in parentheses." },
  { kind: "lines", lines: ["Σ ∪ {λ} = {x, y} ∪ {λ}", "= {x, y, λ}"], active: 1, caption: "Union: everything in either set. Three elements now. (λ is the empty string — a symbol-like thing you'll meet properly in Lesson 3. Here it's just a third element.)" },
  { kind: "lines", lines: ["Q × {x, y, λ}", "= every (element of Q, element of the other) pair", "first from Q, second from {x, y, λ}"], active: 1, caption: "**Cartesian product** A × B: the set of all ordered pairs (a, b) with a from A and b from B. Order matters inside the pair — (m, x) and (x, m) are different, and only the first belongs here." },
  { kind: "array", cells: ["(m, x)", "(m, y)", "(m, λ)"], done: [0, 1, 2], note: "m paired with each", caption: "Take m, pair it with each of x, y, λ. Three pairs." },
  { kind: "array", cells: ["(m, x)", "(m, y)", "(m, λ)", "(n, x)", "(n, y)", "(n, λ)"], done: [0, 1, 2, 3, 4, 5], note: "then n with each", caption: "Take n, same thing. Three more." },
  { kind: "lines", lines: ["{ (m,x), (m,y), (m,λ), (n,x), (n,y), (n,λ) }", "size check: |Q| · |Σ ∪ {λ}| = 2 · 3 = 6  ✓"], active: 0, caption: "The answer: outer **braces** (a set), each element in **parentheses** (an ordered pair). |A × B| = |A| · |B| — always check your count. Chen's key: writing 'lambda' in words is fine; wrong brackets are −0.5." },
];

export const cs154Sets: Chapter = {
  slug: "1-sets-functions",
  label: "Lessons 1–2",
  title: "Reading set notation, sets, power sets, products, functions",
  source: "Lesson 1 (Aug 24) and Lesson 2 (Aug 26) slides, Assignment 1 solution key.",
  goal: "Read and write set-builder notation without guessing; tell ϕ, {ϕ}, and λ apart; build a power set and a Cartesian product with the right brackets; say what total and partial functions are in Chen's words; see why δ : Q × Σ → Q is coming.",
  minutes: 50,
  sections: [
    {
      id: "why",
      title: "Why a course about computers starts with sets",
      blocks: [
        { id: "why-1", t: "why", slide: "The whole course is built from sets", title: "The plan behind the preliminaries", text: "CS 154 asks a strange question: *what can a machine compute at all?* To answer it, Chen replaces real computers with mathematical toys — automata — and every toy is defined as a handful of sets and one function between them. A DFA (Lesson 5) is literally (Q, Σ, δ, q₀, F): a set of states, a set of symbols, a function, a state, and a subset. So Lessons 1–2 aren't a review; they're the parts list. Everything below reappears as a piece of a machine." },
        { id: "why-2", t: "prof", title: "How Chen grades — read this before anything else", text: "From the syllabus: **'Only use the notations mentioned in the class. Different notation(s) considered as wrong answer(s).'** From the Assignment 1 key: −0.5 for any notation error, −1 for an answer that's wrong but makes sense, −1.5 for major mistakes. Definitions marked ♥ on the slides must be reproduced almost word for word: 'a function where all of its domain elements are defined' was accepted; 'all domains are defined' was marked wrong. This chapter tells you which sentences those are." },
      ],
    },
    {
      id: "reading",
      title: "Reading { … | … } — the notation that was costing you points",
      blocks: [
        { id: "rd-1", t: "stepper", slide: true, title: "Reading { 3n | 0 ≤ n ≤ 6 } symbol by symbol", frames: builderFrames },
        { id: "rd-2", t: "def", term: "Set-builder notation", text: "{ pattern | condition }. Read the bar as **'such that'**. The set contains every value the pattern produces for every variable value the condition allows. Comma in the condition = **and**. The other two ways to write a set: **roster** — {0, 3, 6, …} with '…' when the pattern is obvious — and a **Venn diagram**." },
        { id: "rd-3", t: "worked", slide: "Going the other way: English → set-builder", title: "Writing B = {0, 3, 6, 9, 12, 15, 18} and X = {0, 3, 6, 9, …}", problem: "Give both in set-builder form and say whether each is finite.", steps: [
          "Find the pattern: every element is a multiple of 3. So the left side is 3n.",
          "Find the range of n. For B, n goes 0 to 6: B = { 3n | 0 ≤ n ≤ 6 }. Finite, |B| = 7.",
          "For X the '…' means it never stops: X = { 3n | n ≥ 0 }. Infinite.",
          "You may write n ∈ ℕ in the condition, but Chen's default universal set for variables is the natural numbers, so it can be left out.",
        ] },
        { id: "rd-4", t: "try", q: "List the elements of { 2n + 1 | 0 ≤ n ≤ 3 }, and write {1, 4, 9, 16, …} in set-builder.", a: "{1, 3, 5, 7}. Squares: { n² | n ≥ 1 }." },
      ],
    },
    {
      id: "sets",
      title: "Sets: the ♥ definitions",
      blocks: [
        { id: "s-1", t: "list", slide: "The definitions to reproduce", items: [
          "♥ **Set**: a collection of objects (its elements or members). Order does not matter and repeats don't count: {3, 4, 1, 3, 2} = {1, 2, 3, 4}. A **list** is the ordered version — a different concept.",
          "**Cardinality** |A|: the number of elements. |{1, 3, 1, 6, 5}| = 4 (the repeated 1 counts once).",
          "**Empty set**: { } or ϕ (phi). |ϕ| = 0.",
          "♥ **Finite set**: a set whose size is a natural number. (0 is natural here, so ϕ is finite.) ♥ **Infinite set**: a set whose size cannot be expressed by a natural number, e.g. ℕ = {0, 1, 2, …}.",
          "♥ **Universal set** U: the set of all possible elements under consideration — the rectangle in a Venn diagram.",
          "♥ **Complement** Ā = { x | x ∈ U, x ∉ A }: everything in U that's not in A. You cannot take a complement without knowing U.",
        ] },
        { id: "s-2", t: "warn", title: "ϕ versus {ϕ} — a favorite trick question", text: "ϕ is the empty set: nothing inside, |ϕ| = 0. {ϕ} is a set with **one** element, and that element happens to be the empty set: |{ϕ}| = 1. A box with nothing in it versus a box containing an empty box. In Lesson 3 a third thing joins them — λ, the empty *string* — and telling all three apart is worth points on every quiz." },
        { id: "s-3", t: "list", slide: "Relations between sets", items: [
          "Element to set: x ∈ A (is in), x ∉ A (is not in).",
          "**Intersecting** sets share at least one element; **disjoint** sets share none.",
          "**Subset** A ⊆ B: every element of A is also in B. **Proper subset** A ⊂ B: A ⊆ B *and* A ≠ B. If A = {2, 5, 3} and B = {3, 5, 2}, then A ⊆ B is right and A ⊂ B is **wrong** — they're equal.",
          "**Equal** A = B exactly when A ⊆ B and B ⊆ A.",
        ] },
        { id: "s-4", t: "list", slide: "Operations and the identities he lists", items: [
          "Union A ∪ B = { x | x ∈ A or x ∈ B }. Intersection A ∩ B = { x | x ∈ A, x ∈ B }. Difference A − B = { x | x ∈ A, x ∉ B }. Complement Ā = U − A.",
          "Union and intersection are commutative, associative, distributive. Difference is none of those (A − B ≠ B − A).",
          "**De Morgan**: the complement of A ∩ B is Ā ∪ B̄; the complement of A ∪ B is Ā ∩ B̄. (Flip the operation, complement each part.)",
          "Identity A ∪ ϕ = A, A ∩ U = A. Domination A ∪ U = U, A ∩ ϕ = ϕ. Idempotent A ∪ A = A. Complement A ∪ Ā = U, A ∩ Ā = ϕ. Double complement gives A back.",
        ] },
        { id: "s-5", t: "try", q: "Is {ϕ} the empty set? Is ϕ ⊆ {1, 2}? Is {1, 2} ⊂ {1, 2}?", a: "No — it has one element. Yes — the empty set is a subset of everything. No — proper subset requires the sets to differ; {1, 2} ⊆ {1, 2} is the correct statement." },
      ],
    },
    {
      id: "power",
      title: "Power set: the set of all subsets",
      blocks: [
        { id: "pw-1", t: "stepper", slide: true, title: "Building 2ᴬ for A = {a, b}", frames: powerFrames },
        { id: "pw-2", t: "def", term: "Power set 2ᴬ", text: "2ᴬ = { X | X ⊆ A }, the set of all subsets of A. |2ᴬ| = 2^|A|. Always includes ϕ and A itself." },
        { id: "pw-3", t: "warn", title: "Assignment 1 Q12 — the deductions", text: "Power set of {c, d} must be written **{ϕ, {c}, {d}, {c, d}}∗*: outer braces *and* inner braces. Marked down: round brackets instead of braces; writing {ϕ} when you mean the empty set as an element (that's a set containing the empty set, a different thing). Spelling out 'phi' is accepted." },
        { id: "pw-4", t: "p", slide: "Why you'll need this: NFAs", text: "In Lesson 8, a nondeterministic automaton's transition function will map to a *set of states* rather than a single state. Its range is 2^Q — the power set of the state set. When Chen asks 'what is the range of δ for an NFA', this is the answer, and this is where he taught it." },
        { id: "pw-5", t: "try", q: "Write 2ᴬ for A = {1, 2, 3}. How many elements should it have before you start?", a: "2³ = 8: { ϕ, {1}, {2}, {3}, {1,2}, {1,3}, {2,3}, {1,2,3} }." },
      ],
    },
    {
      id: "product",
      title: "Cartesian product: all the ordered pairs",
      blocks: [
        { id: "cp-1", t: "why", slide: "Why pairs", title: "Where pairs come from", text: "A DFA's brain makes a decision from two things at once: *which state am I in* and *which symbol did I just read*. A decision that depends on two inputs is a function of the **pair** (state, symbol). The Cartesian product is how you build the set of all such pairs — so the transition function has a domain to be defined on." },
        { id: "cp-2", t: "stepper", slide: true, title: "Assignment 1 Q16: Q × (Σ ∪ {λ})", frames: productFrames },
        { id: "cp-3", t: "def", term: "Cartesian product A × B", text: "{ (a, b) | a ∈ A, b ∈ B }: every ordered pair with first part from A and second from B. |A × B| = |A|·|B|. A × ϕ = ϕ. **Not commutative** — A × B ≠ B × A unless A = B or one is empty, because pairs are ordered. Extends to more sets: Q × Σ × Γ is a set of 3-tuples." },
        { id: "cp-4", t: "try", q: "A = {1, 2}, B = {p}. Write A × B and B × A. Are they equal?", a: "A × B = {(1, p), (2, p)}. B × A = {(p, 1), (p, 2)}. Not equal — (1, p) ≠ (p, 1)." },
      ],
    },
    {
      id: "functions",
      title: "Functions, total and partial",
      blocks: [
        { id: "fn-1", t: "p", slide: "A function is a rule with one answer", text: "f : D → R takes each element of the **domain** D to **one** element of the **range** R. One input, at most one output — that's the rule. Several inputs may share an output (f(1) = f(2) = 5 is fine); one input may not have two outputs. You can write a function as algebra (f(x) = 2x), as arrows in a diagram, or as a set of ordered pairs (input, output) — and that set of pairs is a subset of D × R. That's the link to the Cartesian product." },
        { id: "fn-2", t: "prof", title: "♥ Total and partial — the exact wording", text: "**Total function**: a function where **all elements of its domain are defined**. **Partial function**: at least one domain element is undefined (has no output). The key accepted 'a function that all of its domain elements are defined' and rejected 'all domains are defined', 'the function is defined', 'all elements are defined'. The words *domain elements* must be there." },
        { id: "fn-3", t: "worked", slide: "Assignment 1: can this δ be a function?", title: "Spotting a non-function", problem: "Q = {q₀, q₁}, Γ = {a, b}, δ : Q × Γ → Q × Γ × {L, R}. Can δ = { ((q₀,a), (q₀,a,L)), ((q₀,a), (q₀,b,L)) } be a function?", steps: [
          "Read the pairs as (input, output). Both pairs have the same input, (q₀, a).",
          "The outputs differ: (q₀, a, L) versus (q₀, b, L).",
          "One input with two outputs breaks the rule. **Not a function.**",
          "(That δ shape — state and symbol in, state and symbol and a direction out — is a Turing machine's. He's planting it in week 2.)",
        ], answer: "No: the same domain element maps to two range elements." },
        { id: "fn-4", t: "p", slide: "The one function that matters: δ : Q × Σ → Q", text: "Read it aloud: 'delta is a function from Q cross Sigma to Q.' Domain: the set of (state, symbol) pairs — the Cartesian product from the previous section. Range: the set of states. In words: *given a state and a symbol, δ tells you the next state.* That is the entire brain of a DFA, and if δ is **total** (every pair has an answer), the machine always knows what to do. Lesson 5 will draw it as arrows; this is what the arrows mean." },
        { id: "fn-5", t: "try", q: "D = {1, 2, 3}, R = {a, b}. f = {(1, a), (3, b)}. Is f a function? Total or partial?", a: "It's a function (no input has two outputs). Partial — 2 is a domain element with no output." },
      ],
    },
    {
      id: "graphs",
      title: "Directed graphs and walks",
      blocks: [
        { id: "g-1", t: "list", slide: "The definitions", items: [
          "A **graph** is a non-empty finite set of **vertices** V and a finite set of **edges** E. This course uses **directed** graphs only: an edge is an ordered pair (from, to) — an arrow.",
          "A **walk** is a sequence of edges where each edge ends where the next one begins. 'We cannot jump.' Its **length** is the number of edges.",
          "**One-dimensional projection**: stretch a walk out in a line — v₁ → v₃ → v₁ → v₃ → v₂ — so its length is obvious (4 here).",
        ] },
        { id: "g-2", t: "p", slide: "Why graphs are here", text: "A DFA's control unit is drawn as a directed graph: vertices are states, edges are transitions labelled with symbols. Running the machine on a string is *taking a walk* — one edge per symbol read — and the one-dimensional projection of that walk is the machine's trace. When Lesson 5 says 'the machine follows the transition', it means 'takes the next edge in the walk'." },
        { id: "g-3", t: "def", term: "Lessons 1–2 in one breath", text: "Sets hold the pieces (states Q, symbols Σ). The Cartesian product Q × Σ makes (state, symbol) pairs. A total function δ : Q × Σ → Q picks the next state for each pair. Drawn as a directed graph, running the machine is a walk. The power set 2^Q shows up when a machine is allowed several next states at once (NFA)." },
      ],
    },
  ],
};
