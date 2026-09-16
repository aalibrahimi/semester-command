import type { Exercise } from "../types";

/**
 * CS 154 · "Do it yourself" sets, keyed by chapter slug. Modelled on Chen's
 * assignment questions and appendix exercises — and graded, in the hints, the
 * way his keys grade: notation first.
 */
export const cs154Practice: Record<string, Exercise[]> = {
  "1-sets-functions": [
    {
      id: "read-builder",
      title: "Read three set-builders",
      prompt: "List the elements (roster form) of: (a) { 2n | 1 ≤ n ≤ 4 }, (b) { x | x ∈ ℕ, x < 3 }, (c) { n² | n ∈ ℕ, n² < 30 }. Say which are finite.",
      hints: [
        "Left of the bar is the shape of each element; right of the bar is which variable values are allowed. Plug every allowed value into the shape.",
        "For (b), people forget that 0 is a natural number in this class. For (c), don't stop at n = 4 — check n = 5: 25 < 30, so it's in. n = 6 gives 36, out.",
        "Write the answer with braces and commas. If it's infinite you'd need '…'; none of these are.",
      ],
      solution: [
        "(a) n = 1, 2, 3, 4 → {2, 4, 6, 8}. Finite, size 4.",
        "(b) natural numbers below 3, with 0 included → {0, 1, 2}. Finite, size 3.",
        "(c) n = 0…5 → {0, 1, 4, 9, 16, 25}. Finite, size 6.",
      ],
      why: "Set-builder is the notation of every specification you'll read as an engineer — 'the set of requests r such that r.status = 500' is exactly { r | r.status = 500 }. SQL's WHERE clause, list comprehensions in Python, and type predicates are all this notation with different punctuation.",
    },
    {
      id: "empties",
      title: "Which statements are true?",
      prompt: "Decide true or false, and fix each false one with a single change: (a) |{ϕ}| = 0. (b) ϕ ⊆ {a, b}. (c) {a, b} ⊂ {a, b}. (d) ϕ ∈ {ϕ}. (e) {1, 2} = {2, 1, 1}.",
      hints: [
        "For each, ask what kind of thing is on each side: an element? a set? a set containing a set? The symbols ∈ and ⊆ need different kinds of things on their left.",
        "The most-missed one is (a): {ϕ} is a box containing an empty box — one thing inside. And (c): ⊂ (proper) demands the sets be different.",
        "For (e): sets ignore order and repeats. Read both sides as 'which distinct things are in here'.",
      ],
      solution: [
        "(a) False: |{ϕ}| = 1. Fix: |ϕ| = 0.",
        "(b) True: the empty set is a subset of every set.",
        "(c) False: a set is not a proper subset of itself. Fix: {a, b} ⊆ {a, b}.",
        "(d) True: ϕ is the one element of {ϕ}.",
        "(e) True: both are the set containing exactly 1 and 2.",
      ],
      why: "The difference between 'an empty collection' and 'a collection containing an empty collection' is the difference between `[]` and `[[]]` in code — and between 'no result' and 'a result that is empty' in an API. Bugs live in that gap.",
    },
    {
      id: "product-function",
      title: "Product, then function",
      prompt: "Q = {p, q}, Σ = {0, 1}. (a) Write Q × Σ in roster form and give its size. (b) Define a *total* function δ : Q × Σ → Q of your choice as a set of ordered pairs. (c) Change one pair so δ becomes partial, and one different change so it stops being a function at all.",
      hints: [
        "(a) is mechanical: every (state, symbol) pair, in parentheses, inside one set of braces. Count = |Q| · |Σ|.",
        "Chen's deductions here are all brackets: tuples in ( ), the set in { }. And a function 'as ordered pairs' means pairs of the form (input, output) — here ((p, 0), q), a pair whose first part is itself a pair.",
        "Total means every one of the four inputs has an output. Partial: delete one. Not a function: give one input two different outputs.",
      ],
      solution: [
        "(a) Q × Σ = {(p, 0), (p, 1), (q, 0), (q, 1)}. Size 2 · 2 = 4.",
        "(b) e.g. δ = {((p, 0), p), ((p, 1), q), ((q, 0), q), ((q, 1), p)} — all four inputs defined, one output each. Total.",
        "(c) Partial: remove ((q, 1), p) — input (q, 1) now has no output. Not a function: add ((p, 0), q) alongside ((p, 0), p) — one input, two outputs.",
      ],
      why: "This δ is literally the transition table of a state machine — the thing that runs a vending machine, a TCP connection, or a UI's screen flow. 'Total' means the machine can never be surprised by an input; a partial δ is the bug where the app has no idea what to do when you press a button at the wrong time.",
    },
  ],

  "3-strings-languages": [
    {
      id: "string-ops",
      title: "String arithmetic",
      prompt: "Let u = ab, v = ba. Compute: (a) |uvu|, (b) (uv)ᴿ, (c) u³, (d) uv⁰, (e) (uv)⁰, (f) the number of (prefix, suffix) pairs of uvu.",
      hints: [
        "Concatenate first, then apply the operation to the result. Write the actual strings out — don't do it symbolically.",
        "(d) vs (e) is the aaba⁰ trap: without parentheses the exponent applies only to v. And in (f), λ and the whole string both count.",
        "(b): reverse of a concatenation = reverse each part and swap the order. Check it by writing uv out and reading it backwards.",
      ],
      solution: [
        "(a) uvu = abbaab, length 6.",
        "(b) uv = abba; reversed = abba (it's a palindrome). Via the rule: vᴿuᴿ = ab·ba = abba ✓.",
        "(c) u³ = ababab.",
        "(d) uv⁰ = u·λ = ab. (e) (uv)⁰ = λ.",
        "(f) |uvu| + 1 = 7 pairs.",
      ],
      why: "String operations are the primitives of every parser, every regex engine, and every 'does this input match this format' check. Getting the empty string right is what stops off-by-one bugs at the ends of inputs.",
    },
    {
      id: "english-to-builder",
      title: "English → set-builder, plus complements",
      prompt: "Over Σ = {a, b}, write in set-builder: (a) strings that end in b; (b) strings with exactly two a's; (c) strings of even length. Then write the complement of (a) and (b).",
      hints: [
        "Use templates: 'free stuff' is w ∈ Σ∗ (anything) or bⁿ (only b's). Put the required part where it must be and free stuff around it.",
        "Chen's deductions: missing 'over Σ', missing the condition on n, and — for (b) — forgetting that between and around the two a's there can be b's *but not a's*. { w a w a w | w ∈ Σ∗ } is wrong (the w's could contain a's).",
        "For complements, ask 'how does a string fail?'. (a) fails if it's empty OR ends in a. (b) fails if it has fewer than 2 a's OR more than 2.",
      ],
      solution: [
        "(a) { wb | w ∈ Σ∗ }. Complement: {λ} ∪ { wa | w ∈ Σ∗ }.",
        "(b) { bⁿ a bᵐ a bᵏ | n, m, k ≥ 0 }. Complement: { bⁿ | n ≥ 0 } ∪ { bⁿ a bᵐ | n, m ≥ 0 } ∪ { w | w ∈ Σ∗, w has at least three a's } — or { bⁿabᵐabᵏaw | n,m,k ≥ 0, w ∈ Σ∗ } for the last piece.",
        "(c) { w | w ∈ Σ∗, |w| is even } — or { uv | u, v ∈ Σ∗, |u| = |v| }. Note λ ∈ this set (length 0 is even).",
      ],
      why: "Translating a plain-English requirement into a precise pattern — and then writing what *doesn't* match — is the core of writing validators, firewall rules, and test cases. The complement is the part people skip, and it's where the security holes are.",
    },
    {
      id: "roster-deductions",
      title: "Grade it like Chen",
      prompt: "A student answers the question 'Write L = { aⁿb | n ≥ 0 } in roster form' with: `(λ, b, ab, aab, aaab)`. List every deduction the key would take and write the correct answer.",
      choices: [
        { text: "Only one thing is wrong: the brackets.", feedback: "The brackets are wrong, but keep looking — is λ actually in L? And is the language finite?" },
        { text: "Three things: brackets, λ shouldn't be there, and it's missing '…'.", feedback: "Right. Parentheses instead of braces (−0.25 to −0.5), λ included when n = 0 gives 'b' not λ (−0.5), and no '…' for an infinite language (−0.25)." },
        { text: "Nothing — λ is in L because n can be 0.", feedback: "n = 0 gives a⁰b = λb = b. The string is b, not λ. The b is always there." },
      ],
      answer: 1,
      hints: [
        "Check three things every time: the brackets, whether the smallest element is right, and whether the list needs '…'.",
        "The λ trap: a⁰ is λ, but a⁰b is b. Plug n = 0 in fully before writing the first element.",
        "Chen's rule 5: roster form of an infinite language ends with '…'. Rule 1: sets get braces.",
      ],
      solution: [
        "Brackets: a set needs { }, not ( ). Deduction.",
        "First element: n = 0 → a⁰b = b, not λ. λ ∉ L. Deduction.",
        "Infinite language, no '…'. Deduction.",
        "Correct: L = { b, ab, aab, aaab, … }.",
      ],
      why: "Reading your own answer the way a strict grader would is a skill in itself — it's code review applied to yourself. In this class it's worth about a third of the points you've been losing.",
    },
  ],

  "5-dfa": [
    {
      id: "run-it",
      title: "Run the machine",
      prompt: "M has states {q0, q1, q2}, initial q0, accepting {q2}, Σ = {a, b}. δ: q0 —a→ q1, q0 —b→ q0, q1 —a→ q1, q1 —b→ q2, q2 —a→ q1, q2 —b→ q0. Run M on aab, abab, bba, and λ. For each, list the state after every symbol and say accept or reject. Then describe L(M) in English.",
      hints: [
        "Keep a finger on the current state and read one symbol at a time. Write the state sequence like q0 → q1 → q1 → q2. Accept iff the *last* state is in F.",
        "λ trips people: no symbols are read, so the run ends in the initial state. Is q0 accepting? Also: 'reject' here never means 'got stuck' — δ is total, so every string ends somewhere.",
        "To describe L(M), ask what has to be true of the last two symbols for the run to end in q2. Which arrows lead into q2?",
      ],
      solution: [
        "aab: q0 —a→ q1 —a→ q1 —b→ q2. Accept.",
        "abab: q0 —a→ q1 —b→ q2 —a→ q1 —b→ q2. Accept.",
        "bba: q0 —b→ q0 —b→ q0 —a→ q1. Reject.",
        "λ: no moves, stays in q0. Reject.",
        "L(M) = strings ending in ab. (The only arrow into q2 is q1 —b→, and you're in q1 exactly when the last symbol read was a.) L(M) = { wab | w ∈ Σ∗ }.",
      ],
      why: "Every network protocol, every lexer in a compiler, and every regex you'll ever run is executed exactly like this: one symbol, one table lookup, one state change. Tracing by hand is how you debug them when they misbehave.",
    },
    {
      id: "design-one",
      title: "Design from a description",
      prompt: "Over Σ = {a, b}, design a DFA for L = strings that contain the substring bb. Follow the six steps: write L and L̄ in set-builder; draw the spine; add the trap or heaven; check λ; check totality; test with three strings.",
      hints: [
        "The spine is 'see a b, then see another b immediately'. Two b's in a row means you need to *remember* that the previous symbol was b — that memory is a state.",
        "The usual bug: from the 'just saw one b' state, what happens on a? You haven't seen bb, and the a resets you — back to the start state, not to a trap. Traps are for strings that can *never* succeed; here every string can still succeed.",
        "Once you've seen bb, nothing can un-see it: the accepting state is heaven (loops on a and b). And λ: does the empty string contain bb?",
      ],
      solution: [
        "L = { ubbv | u, v ∈ Σ∗ }. L̄ = strings with no two consecutive b's.",
        "States: q0 'no b just seen' (initial), q1 'the last symbol was b', q2 'have seen bb' (accepting, heaven).",
        "δ: q0 —a→ q0, q0 —b→ q1, q1 —a→ q0, q1 —b→ q2, q2 —a,b→ q2. Every state has one a-arrow and one b-arrow: total.",
        "λ ∉ L, so q0 is not accepting. No trap needed — no string is doomed.",
        "Tests: abba → q0,q1,q2,q2 accept ✓. baba → q1,q0,q1,q0 reject ✓. bb → q1,q2 accept ✓.",
      ],
      why: "'Detect a pattern in a stream without storing the stream' is the shape of intrusion detection, of finding a keyword in a live transcript, and of the `grep` you run on logs. The states are the only memory, and designing them is the skill.",
    },
    {
      id: "formal-def",
      title: "Write the formal definition",
      prompt: "For the bb-machine you just designed, write M = (Q, Σ, δ, q₀, F) with every component spelled out, and give δ as a table. Then: what is the *domain* of δ and what is its *range*, and why must δ be total for this to be a DFA?",
      hints: [
        "Five components in order, in parentheses. Q and F are sets (braces). q₀ is a single state (no braces). Σ is a set. δ is written as a table with rows = states, columns = symbols.",
        "Chen's key takes points for F written without braces, for q₀ written as {q0}, and for a δ table with an empty cell. Fill every cell.",
        "Domain and range are Lesson 2 words: domain = the set of inputs = all (state, symbol) pairs = Q × Σ. Range = Q. Total = every pair has exactly one next state = 'deterministic'.",
      ],
      solution: [
        "M = ({q0, q1, q2}, {a, b}, δ, q0, {q2}).",
        "δ table — rows q0, q1, q2; columns a, b: q0: (q0, q1); q1: (q0, q2); q2: (q2, q2).",
        "Domain of δ: Q × Σ = {(q0,a), (q0,b), (q1,a), (q1,b), (q2,a), (q2,b)}. Range: Q.",
        "δ total ⇒ for every state and every symbol there is exactly one next state ⇒ the machine never has a choice and never gets stuck. That is what 'deterministic' means; an NFA (Lesson 8) drops exactly this requirement.",
      ],
      why: "The 5-tuple is a machine written as data — which is how real state machines are stored: as a transition table you can load, validate, and test automatically. 'Is the table total?' is a check you can write in one line of code, and it catches a whole class of bugs before they ship.",
    },
  ],
};
