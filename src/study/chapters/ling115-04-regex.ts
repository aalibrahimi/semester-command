import type { Chapter, Frame } from "../types";

/**
 * LING 115 · Lecture 4 — Regular expressions from zero. Built from Kraus's
 * Lecture 4 slides (the cheat sheet on slide 8, the -ing family on slide 7,
 * the HAVE + been exercise on slide 11), J&M ch. 2, and HW 1.
 */

/** How the regex engine walks `abc+` across "abccd". */
const matchFrames: Frame[] = [
  { kind: "array", cells: ["a", "b", "c", "c", "d"], note: "pattern: abc+", caption: "A regex is a **pattern**; the engine slides it along the text looking for a place where every part of the pattern is satisfied in order. Pattern: `abc+` — read it as 'a, then b, then one-or-more c'. Text: abccd." },
  { kind: "array", cells: ["a", "b", "c", "c", "d"], hl: [0], note: "pattern part 1: a  ✓", caption: "Start at position 0. First pattern part is the literal `a`. The text has an a here. ✓ Move on." },
  { kind: "array", cells: ["a", "b", "c", "c", "d"], done: [0], hl: [1], note: "pattern part 2: b  ✓", caption: "Next pattern part: literal `b`. Text has b. ✓" },
  { kind: "array", cells: ["a", "b", "c", "c", "d"], done: [0, 1], hl: [2], note: "pattern part 3: c+  — need at least one c", caption: "Next: `c+`. The `+` is a **quantifier**: it applies to the thing right before it (just the c) and means 'one or more'. First c ✓ — the minimum is met." },
  { kind: "array", cells: ["a", "b", "c", "c", "d"], done: [0, 1, 2], hl: [3], note: "c+ keeps going: another c  ✓", caption: "Quantifiers are **greedy**: they grab as much as they can. There's another c, so `c+` takes it too." },
  { kind: "array", cells: ["a", "b", "c", "c", "d"], done: [0, 1, 2, 3], hl: [4], note: "d is not c → c+ stops", caption: "d isn't a c, so `c+` stops. The pattern has nothing after `c+`, so the pattern is complete. **Match: abcc** (positions 0–3). The d is simply not part of the match." },
  { kind: "array", cells: ["a", "b", "d"], hl: [2], note: "abc+ on 'abd': fails", caption: "Same pattern on 'abd'. a ✓, b ✓, then `c+` needs at least one c and finds d. The pattern fails at this position; the engine slides to position 1 and tries again (b, d… no a). No match anywhere. Compare `abc*`: `*` means zero or more, so 'ab' with zero c's would match." },
];

/** Reading the HAVE + been pattern piece by piece. */
const haveFrames: Frame[] = [
  { kind: "lines", lines: ["goal: match  have been · has been · 've been", "and also  have all been · has just been"], active: 0, caption: "Slide 11's exercise: capture every form of HAVE + been, with an optional word in between. Build the pattern from the sentence, left to right." },
  { kind: "lines", lines: ["(have|has|'ve)", "a group: any ONE of these alternatives"], active: 0, caption: "Three possible forms of HAVE. Parentheses make a **group**; the bar `|` inside means **or**. The group matches exactly one of the alternatives." },
  { kind: "lines", lines: ["(have|has|'ve)\\s", "\\s = one whitespace character"], active: 0, caption: "Then a space. `\\s` means any whitespace (space, tab, newline). Backslash-letter codes are **character classes**: `\\w` word character (letters, digits, underscore), `\\d` digit, `\\s` whitespace." },
  { kind: "lines", lines: ["(have|has|'ve)\\s(\\w+\\s)?", "(\\w+\\s)? = optionally, one word and a space"], active: 0, caption: "The optional middle word: `\\w+` is one or more word characters (a word), `\\s` the space after it, and the whole group followed by `?` means **zero or one** of it. So 'have all been' and 'have been' both work." },
  { kind: "lines", lines: ["(have|has|'ve)\\s(\\w+\\s)?been", "done"], active: 0, caption: "Finish with the literal `been`. Read the whole thing aloud: 'have or has or 've, a space, maybe a word and a space, been.' That's the answer." },
  { kind: "lines", lines: ["re.findall(r\"(?:have|has|'ve)\\s(?:\\w+\\s)?been\", text)", "(?: … ) = a group that doesn't capture"], active: 0, caption: "In Python: `re.findall` returns a list of matches — but if the pattern has capturing groups, it returns only the group contents. Adding `?:` right after the `(` makes a **non-capturing** group, so you get the whole matched phrase back. The `r` before the quote makes it a raw string so `\\s` isn't mangled by Python first." },
];

export const ling115Regex: Chapter = {
  slug: "4-regex",
  label: "Lecture 4",
  title: "Regular expressions from zero",
  source: "Lecture 4 slides (Sep 3), J&M ch. 2, HW 1, regexone.com.",
  goal: "Read any regex on Kraus's cheat sheet aloud and predict what it matches; write patterns with anchors, quantifiers, classes, groups and alternation; use re.search / findall / sub / split in Python with raw strings.",
  minutes: 45,
  sections: [
    {
      id: "why",
      title: "Why a linguist needs regex",
      blocks: [
        { id: "why-1", t: "why", slide: "Ctrl+F with wildcards", title: "The problem", text: "You have a million words of text and you want every word ending in -ing. Ctrl+F finds exact strings: it can find 'running', but not 'every word that ends in ing'. A **regular expression** is a search pattern that describes a *shape* of text — 'any word characters, then ing, then a word boundary' — and a regex engine finds every stretch of text with that shape. Kraus's definition: 'a syntax for finding & manipulating text… operates on the level of the character; used to find, split, extract, or transform strings.' Every corpus tool you'll use this semester runs on it." },
        { id: "why-2", t: "p", slide: "Its connection to CS 154", text: "If you're also in CS 154: a regular expression describes exactly the languages a DFA can recognize. `abc*` is the language { ab, abc, abcc, … } = { abcⁿ | n ≥ 0 }, and the regex engine is, underneath, running a finite automaton over your text. The two courses are teaching the same object from opposite ends." },
      ],
    },
    {
      id: "how",
      title: "How a pattern matches",
      blocks: [
        { id: "how-1", t: "stepper", slide: true, title: "Watching abc+ match abccd, one character at a time", frames: matchFrames },
        { id: "how-2", t: "list", slide: "The four ideas in every regex", items: [
          "**Literals**: ordinary characters match themselves. `ing` matches the three letters i-n-g in a row, anywhere.",
          "**Quantifiers** say how many of the *previous thing*: `*` zero or more, `+` one or more, `?` zero or one, `{3}` exactly three, `{2,5}` two to five, `{2,}` two or more.",
          "**Classes** match one character from a set: `.` any character, `\\w` word character, `\\d` digit, `\\s` whitespace, `[aeiou]` one vowel, `[^aeiou]` one non-vowel.",
          "**Anchors and groups**: `^` start of string, `$` end of string, `\\b` word boundary; `( )` group things so a quantifier or `|` applies to all of them together.",
        ] },
        { id: "how-3", t: "table", slide: "Kraus's cheat sheet (slide 8)", rows: [
          ["Pattern", "Means", "Matches"],
          ["^The", "'The' at the start", "The end · not: In The end"],
          ["end$", "'end' at the end", "The end · not: ending"],
          ["abc*", "ab, then 0+ c", "ab, abc, abcc"],
          ["abc+", "ab, then 1+ c", "abc, abcc · not: ab"],
          ["abc?", "ab, then 0 or 1 c", "ab, abc · (abcc matches only 'abc')"],
          ["abc{3}", "ab, then exactly 3 c", "abccc"],
          ["a(bc){2,5}", "a, then 2–5 copies of 'bc'", "abcbc, abcbcbc"],
          ["(abc|def)", "abc or def", "either"],
          ["\\wing", "a word char, then ing", "sing, ring in 'bring'"],
          [".*", "anything, any length", "a whole line"],
          ["\\. \\$ \\( \\[", "a literal . $ ( [", "escaped specials"],
        ] },
        { id: "how-4", t: "warn", title: "The quantifier applies only to the thing right before it", text: "`abc+` is 'ab, then one-or-more c' — *not* 'one-or-more abc'. To repeat a whole chunk, group it: `(abc)+`. Same mistake as CS 154's aaba⁰. If a quantifier seems to do the wrong thing, ask 'what is the one thing immediately to its left?'" },
      ],
    },
    {
      id: "examples",
      title: "The slides' examples",
      blocks: [
        { id: "ex-1", t: "worked", slide: "Slide 7: the -ing family", title: "Four patterns, four different sets", problem: "Words: bingo, running, binges, cringe, pooling, ingenuity, cooperating. Which does each pattern find?", steps: [
          "`ing` — the letters anywhere: all seven.",
          "`^ing` — at the start of the string: ingenuity only. (`\\bing` — at the start of any word — is the same idea inside a longer text.)",
          "`ing$` — at the end: running, pooling, cooperating.",
          "`\\wing\\w` — a word character on both sides, so ing is strictly inside: bingo, binges, cringe.",
        ] },
        { id: "ex-2", t: "stepper", slide: true, title: "Slide 11: every HAVE + been", frames: haveFrames },
        { id: "ex-3", t: "code", slide: "The Python you need (HW 1)", caption: "Always write patterns as raw strings r\"…\" so backslashes reach the regex engine intact.", text: `import re
re.search(r"ing$", "running")        # first match object, or None
re.findall(r"\\w+ing\\b", text)         # list of every match
re.sub(r"\\s+", " ", text)             # replace: collapse runs of whitespace
re.split(r"[.!?]\\s", text)            # split on sentence-ish boundaries
re.findall(r"colou?r", text, re.I)    # re.I = ignore case

# groups: findall returns the GROUPS if you have any
re.findall(r"(\\w+)ing", "running singing")   # ['runn', 'sing']
re.findall(r"(?:\\w+)ing", "running singing") # ['running', 'singing']  (?: = don't capture)` },
        { id: "ex-4", t: "try", q: "Chance quiz: T/F — `.*` captures literally everything on a line.", a: "True. `.` is any character except newline, `*` allows any number of them, and it's greedy — so it swallows the whole line." },
        { id: "ex-5", t: "try", q: "Write a regex for 'ab followed by two or more c', and one for 'a, then more than one b, then c'.", a: "`abc{2,}` (or `abcc+`). `ab{2,}c` (or `abb+c`)." },
        { id: "ex-6", t: "try", q: "What does `\\b\\w+n't\\b` find in \"I don't know why they can't\"?", a: "don't, can't — a word boundary, one or more word characters, then n't, then a boundary. (Note the apostrophe is not a word character, so `\\w+` stops before it and the literal n't picks up from there.)" },
        { id: "ex-7", t: "def", term: "Regex in one paragraph", text: "A pattern of literals, classes (`.` `\\w` `\\d` `\\s` `[…]`), quantifiers (`*` `+` `?` `{n,m}`) that apply to the single thing before them, anchors (`^` `$` `\\b`), and groups `( )` with alternation `|`. The engine slides the pattern along the text and reports every place it fits, greedily. In Python: `re.findall(r\"pattern\", text)`." },
      ],
    },
  ],
};
