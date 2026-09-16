import type { Chapter, Frame } from "../types";

/**
 * CS 154 · Lessons 3–4 — Alphabets, strings, formal languages, and the
 * notation rules Chen deducts for. Built from Lesson 3 (Aug 31) and Lesson 4
 * (Sep 2) slides, the Lesson 4 appendix on "quantities", and the Assignment 2
 * and 3 solution keys (Assignment 2 scored 16.5/24, mostly on notation).
 */

/** String exponent and reverse, worked one line at a time. */
const stringOpFrames: Frame[] = [
  { kind: "lines", lines: ["w = ab", "w³ = ?"], active: 1, caption: "**Exponent** on a string: wⁿ means n copies of w glued together (concatenated)." },
  { kind: "lines", lines: ["w = ab", "w³ = ab · ab · ab", "= ababab", "|w³| = |w| · 3 = 6"], active: 2, caption: "Three copies of ab. Length multiplies: |wⁿ| = |w| · n." },
  { kind: "lines", lines: ["w⁰ = ?", "zero copies of anything = the empty string", "(aaba)⁰ = λ"], active: 2, caption: "Zero copies is the string with no symbols: **λ** (lambda), the empty string. |λ| = 0. This is the string-world cousin of the empty set, and they are *not* the same thing." },
  { kind: "lines", lines: ["aaba⁰ — no parentheses", "the exponent applies only to the last symbol", "= aab · a⁰ = aab · λ = aab"], active: 1, caption: "Trap: without parentheses the exponent belongs to just the symbol before it. aaba⁰ = aab, but (aaba)⁰ = λ. Quiz question every year." },
  { kind: "lines", lines: ["aᵐbᵐ over Σ = {a, b}", "m a's, then m b's", "m = 2 → aabb,  |aᵐbᵐ| = 2m"], active: 1, caption: "The pattern you'll see most: aᵐbᵐ. Same count of a's and b's, all a's first. This is the shape of the 'celebrity language' in the next section." },
  { kind: "lines", lines: ["reverse: (abc)ᴿ = cba", "(uv)ᴿ = vᴿ uᴿ", "(ab · cd)ᴿ = (cd)ᴿ (ab)ᴿ = dc · ba = dcba"], active: 1, caption: "**Reverse** flips the order of symbols. Reversing a concatenation reverses each piece *and* swaps their order. A **palindrome** is a string with wᴿ = w (abba)." },
];

/** Concatenating two languages: every pair. */
const concatFrames: Frame[] = [
  { kind: "lines", lines: ["L₁ = {x, y, z}", "L₂ = {m, n}", "L₁L₂ = ?"], active: 2, caption: "**Concatenation of languages**: L₁L₂ = { uv | u ∈ L₁, v ∈ L₂ } — take a string from L₁, then a string from L₂, glue them, and do that for *every* pair. It's a Cartesian product where you concatenate instead of making tuples." },
  { kind: "array", cells: ["xm", "xn"], done: [0, 1], note: "x with each of L₂", caption: "x followed by m; x followed by n." },
  { kind: "array", cells: ["xm", "xn", "ym", "yn"], done: [0, 1, 2, 3], note: "then y", caption: "y with each." },
  { kind: "array", cells: ["xm", "xn", "ym", "yn", "zm", "zn"], done: [0, 1, 2, 3, 4, 5], note: "then z · 3 × 2 = 6 strings", caption: "L₁L₂ = {xm, xn, ym, yn, zm, zn}. Six strings, |L₁| · |L₂|. In general |L₁L₂| **≤** |L₁|·|L₂| — ≤, not =, because two different pairs can glue into the same string (a·ab = aa·b)." },
  { kind: "lines", lines: ["ϕL = Lϕ = ϕ      (like × 0: no strings to pick from)", "{λ}L = L{λ} = L   (like × 1: λ adds nothing)"], active: 0, caption: "Two special cases he asks about. Concatenating with the empty *language* gives the empty language — there's no string in ϕ to pick. Concatenating with {λ} — a language whose only string is the empty string — changes nothing." },
  { kind: "lines", lines: ["L = { aⁿbⁿ | n ≥ 0 }", "L² = LL = { aⁿbⁿ aᵐbᵐ | n, m ≥ 0 }", "NOT { a²ⁿb²ⁿ }"], active: 1, caption: "**Exponent on a language** concatenates it with itself. The two copies choose their n *independently* — so the second copy needs its own variable m. aabb·ab ∈ L² with n = 2, m = 1. Also: L⁰ = {λ} for every L, even ϕ⁰ = {λ}." },
];

/** Roster for { w@w | w ∈ {a,b}∗ } — Assignment 2 Q12 and its deductions. */
const rosterFrames: Frame[] = [
  { kind: "lines", lines: ["L = { w@w | w ∈ {a, b}∗ }", "pattern: some string w, then @, then the SAME w again"], active: 1, caption: "Assignment 2 Q12: write this in roster form. Read the pattern first. The variable w appears twice, so both halves are identical." },
  { kind: "lines", lines: ["w = λ  →  λ@λ = @", "w = a  →  a@a", "w = b  →  b@b"], active: 0, caption: "Smallest w first. w = λ (the empty string, allowed because of the ∗): λ@λ is just **@**. Note that the string is '@', not λ — the @ is always there. Including λ in the roster was a −0.5 deduction." },
  { kind: "lines", lines: ["w = aa → aa@aa", "w = ab → ab@ab", "w = ba → ba@ba", "w = bb → bb@bb", "…"], active: 4, caption: "Length-2 w's, then it goes on forever. Infinite language, so the roster must end with '…' (−0.25 if missing)." },
  { kind: "lines", lines: ["L = { @, a@a, b@b, aa@aa, ab@ab, ba@ba, bb@bb, … }"], active: 0, caption: "The accepted answer. Deductions from the key: no braces −0.25 · no '…' −0.25 · λ included −0.5 · halves don't match (a@b) −1 · anything else −1.5." },
];

export const cs154Languages: Chapter = {
  slug: "3-strings-languages",
  label: "Lessons 3–4",
  title: "Alphabets, strings, formal languages — and the notation that costs points",
  source: "Lesson 3 (Aug 31) and Lesson 4 (Sep 2) slides + appendix, Assignment 2 and 3 solution keys.",
  goal: "Define alphabet, string, language in Chen's words; compute lengths, exponents, reverses, prefixes; tell λ, ϕ, {λ} apart; translate English ↔ set-builder for 'at least / exactly / starts with' languages and their complements; compute L₁L₂ and Lⁿ with independent indices.",
  minutes: 60,
  requires: ["1-sets-functions"],
  sections: [
    {
      id: "why",
      title: "Why 'language' means something strange here",
      blocks: [
        { id: "why-1", t: "why", slide: "A language is a yes/no problem in disguise", title: "The idea", text: "In this course a *language* is not English. It's a **set of strings** — any set of strings. {ab, aabb, aaabbb, …} is a language. Why care? Because every yes/no question about text can be rewritten as 'is this string in that set?' *Is this a valid email?* → is it in the set of valid emails. *Does this program compile?* → is it in the set of well-formed programs. So 'which languages can a machine recognize' is the same question as 'which problems can a machine solve'. Strings and languages are the vocabulary for asking that." },
        { id: "why-2", t: "prof", title: "The four branches (a 2-point question on Assignment 2)", text: "The theory of computation has four branches: **Formal Languages**, **Automata**, **Computability**, **Complexity**. 0.5 points each. It will come back." },
      ],
    },
    {
      id: "strings",
      title: "Alphabets and strings",
      blocks: [
        { id: "st-1", t: "list", slide: "The ♥ definitions", items: [
          "♥ **Alphabet** Σ: a **nonempty, finite set of symbols**. Symbols are indivisible. His 'celebrity alphabet' is Σ = {a, b}.",
          "♥ **String**: a **finite sequence of symbols from Σ**. It need not mean anything. Strings are named w (then u, v, then x, y, z).",
          "**Length** |w|: the number of symbols. |babba| = 5.",
          "**Empty string** λ: the string with zero symbols. |λ| = 0. λ can never be a *symbol* in an alphabet (λaabb would be ambiguous).",
        ] },
        { id: "st-2", t: "table", slide: "The three empties — never confuse them", rows: [
          ["Symbol", "What it is", "Size"],
          ["ϕ or { }", "the empty **set** — a language with no strings", "|ϕ| = 0"],
          ["λ", "the empty **string** — a string with no symbols", "|λ| = 0"],
          ["{λ}", "a language with **one** string, the empty one", "|{λ}| = 1"],
        ] },
        { id: "st-3", t: "stepper", slide: true, title: "Exponent, the a⁰ trap, and reverse", frames: stringOpFrames },
        { id: "st-4", t: "list", slide: "The rest of the string operations", items: [
          "**Concatenation** uv: write u then v. |uv| = |u| + |v|. λ is the neutral element: λw = wλ = w.",
          "**Substring**: a run of consecutive symbols. If w = uv, then u is a **prefix** and v a **suffix**. Both λ and w itself count as prefixes and suffixes.",
          "**Σ∗** (Sigma star): every string of zero or more symbols from Σ — including λ. **Σ⁺**: one or more — excluding λ. Both are infinite. Σ⁺ = Σ∗ − {λ}. Σ∗ is 'the universal language over Σ' — every language over Σ is a subset of it.",
        ] },
        { id: "st-5", t: "worked", slide: "Prefix/suffix pairs of abaaba", title: "Listing every split", problem: "List all (prefix, suffix) pairs of w = abaaba.", steps: [
          "A split is a place to cut. With 6 symbols there are 7 cut positions (before the first, between each pair, after the last).",
          "(λ, abaaba), (a, baaba), (ab, aaba), (aba, aba), (abaa, ba), (abaab, a), (abaaba, λ).",
          "Always |w| + 1 pairs. Don't forget the two ends.",
        ] },
        { id: "st-6", t: "try", q: "Can these be alphabets: {a, 1}, { }, {ab}, {λ}?", a: "{a, 1} yes. { } no — must be nonempty. {ab} yes — here 'ab' is one indivisible symbol. {λ} no — λ can't be a symbol." },
        { id: "st-7", t: "try", q: "|aλb| = ? (aba)⁰ = ? aba⁰ = ? λ⁰ = ?", a: "2 (λ adds nothing). λ. ab (only the last a is raised to 0). λ." },
      ],
    },
    {
      id: "languages",
      title: "Formal languages",
      blocks: [
        { id: "lg-1", t: "prof", title: "♥ Definition (2 points on Assignment 2)", text: "**A formal language over Σ is any subset of Σ∗.** A language is a set, so everything from Lesson 1 applies (union, complement, subset…). Named L. Two special ones: the **empty language** ϕ, and the **λ-language** {λ}." },
        { id: "lg-2", t: "p", slide: "The celebrity language", text: "L = { aⁿbⁿ | n ≥ 0 } = {λ, ab, aabb, aaabbb, …}: some a's, then *the same number* of b's. Compare { aⁿbᵐ | n, m ≥ 0 }: any number of a's, then any number of b's — n and m are independent, so aab is in it but not in the first. That one letter of difference is the whole distinction between what a DFA can and cannot do (Lesson 12)." },
        { id: "lg-3", t: "stepper", slide: true, title: "Concatenating and squaring languages", frames: concatFrames },
        { id: "lg-4", t: "list", slide: "Language operations, collected", items: [
          "Set operations as usual. **Complement** L̄ = Σ∗ − L — the universal set is Σ∗.",
          "**Reverse** Lᴿ = { wᴿ | w ∈ L }. { aⁿbⁿ }ᴿ = { bⁿaⁿ }.",
          "**Concatenation** L₁L₂ = { uv | u ∈ L₁, v ∈ L₂ }. ϕL = ϕ. {λ}L = L.",
          "**Exponent** Lⁿ: n copies concatenated, each with its own index. L⁰ = {λ}, even for ϕ.",
        ] },
        { id: "lg-5", t: "try", q: "L = { cⁿdⁿ | n ≥ 0 }. Write L² and Lᴿ.", a: "L² = { cⁿdⁿcᵐdᵐ | n, m ≥ 0 } (independent indices, not c²ⁿd²ⁿ). Lᴿ = { dⁿcⁿ | n ≥ 0 }." },
      ],
    },
    {
      id: "patterns",
      title: "English ↔ set-builder: the patterns he expects",
      blocks: [
        { id: "pt-1", t: "why", slide: "Why this table exists", title: "How to write 'at least one a'", text: "Assignment 3 asked for languages in set-builder and their complements, and the key wants specific shapes. The trick for all of them: describe the string as a *template* — some free stuff, the thing you require, more free stuff — where 'free stuff' is bⁿ (only b's) or w ∈ Σ∗ (anything). 'At least one a' becomes: any b's, then an a, then anything: { bⁿaw | n ≥ 0, w ∈ Σ∗ }. Once you see the template idea, the whole table writes itself." },
        { id: "pt-2", t: "table", slide: "The patterns (Σ = {a, b})", rows: [
          ["English", "Set-builder", "Complement"],
          ["at least one a", "{ bⁿaw | n ≥ 0, w ∈ Σ∗ }", "{ bⁿ | n ≥ 0 } — no a at all"],
          ["exactly one a", "{ bⁿabᵐ | n, m ≥ 0 }", "{ bⁿ | n ≥ 0 } ∪ { strings with ≥ 2 a's }"],
          ["starts with a", "{ aw | w ∈ Σ∗ }", "{λ} ∪ { bw | w ∈ Σ∗ }"],
          ["has prefix ab", "{ abw | w ∈ Σ∗ }", "{λ, a} ∪ { aaw | w ∈ Σ∗ } ∪ { bw | w ∈ Σ∗ }"],
          ["only a's (λ allowed)", "{ aⁿ | n ≥ 0 }", "strings containing at least one b"],
          ["at least n / at most n", "≥ n / ≤ n", "≤ n−1 / ≥ n+1"],
        ] },
        { id: "pt-3", t: "worked", slide: "Assignment 3 Q1: the complement of { aⁿb | n ≥ 0 }", title: "Complement by asking 'how can a string fail?'", problem: "L = { aⁿb | n ≥ 0 } over {a, b}: some a's then exactly one b at the end. Write L̄.", steps: [
          "A string is *not* in L in exactly two ways. Way 1: it has no b at all — just a's (including λ): { aⁿ | n ≥ 0 }.",
          "Way 2: it has a b, but the b isn't the last symbol — something follows it: { aⁿbw | n ≥ 0, w ∈ Σ⁺ }. (Σ⁺, not Σ∗, because if w were λ the string would be in L.)",
          "Union the two ways.",
        ], answer: "L̄ = { aⁿ | n ≥ 0 } ∪ { aⁿbw | n ≥ 0, w ∈ {a, b}⁺ }" },
        { id: "pt-4", t: "stepper", slide: true, title: "Assignment 2 Q12: roster form of { w@w | w ∈ {a,b}∗ }", frames: rosterFrames },
        { id: "pt-5", t: "try", q: "Over Σ = {a, b}, write 'more than one a' and its complement in set-builder.", a: "L = { bⁿabᵐaw | n, m ≥ 0, w ∈ Σ∗ } (two a's guaranteed, anything after). Complement = zero or one a: { bⁿ | n ≥ 0 } ∪ { bⁿabᵐ | n, m ≥ 0 }." },
      ],
    },
    {
      id: "rules",
      title: "The 12 notation rules (index-card material)",
      blocks: [
        { id: "r-1", t: "p", slide: "Where these come from", text: "Every one of these is a deduction from the Assignment 1–3 keys. Assignment 2 lost 7.5 of 24 points, almost all on these. Write them on a card and check every quiz answer against the card before submitting — it's the cheapest grade recovery in any of your classes." },
        { id: "r-2", t: "list", slide: "Rules 1–6", items: [
          "**1.** Sets and languages get braces { }; tuples get parentheses ( ).",
          "**2.** λ is the empty *string*; ϕ or { } is the empty *set*; {λ} is a language with one string.",
          "**3.** In set-builder, comma = *and*. Write 'or' (or ∨) for or.",
          "**4.** Always name the alphabet: 'over Σ = {a, b}'.",
          "**5.** Roster form of an infinite language ends with '…'.",
          "**6.** Strings are w, u, v; languages are L; alphabets are Σ.",
        ] },
        { id: "r-3", t: "list", slide: "Rules 7–12", items: [
          "**7.** Complement of a language means Σ∗ − L; you need Σ.",
          "**8.** w⁰ = λ (a string), but L⁰ = {λ} (a language).",
          "**9.** Exponents on languages create *independent* indices (n, m).",
          "**10.** A ⊂ B (proper) requires A ≠ B; when in doubt, ⊆.",
          "**11.** Roster elements separated by commas, inside one pair of braces.",
          "**12.** Don't invent notation. If the slide wrote it a certain way, write it that way.",
        ] },
        { id: "r-4", t: "def", term: "Lessons 3–4 in one breath", text: "Σ is a finite nonempty set of symbols; a string is a finite sequence of them; Σ∗ is all strings; a language is any subset of Σ∗. Strings concatenate, reverse, and take exponents (w⁰ = λ); languages do too (L⁰ = {λ}, independent indices). Complement is relative to Σ∗. Three empties: ϕ, λ, {λ}. Templates like bⁿaw turn English into set-builder." },
      ],
    },
  ],
};
