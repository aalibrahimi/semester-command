/**
 * Drills for LING 115 · Regex: which words a pattern finds (graded by
 * actually running the pattern), and which pattern says what.
 * Patterns use only syntax shared by Python's re and JavaScript.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "ling115/4-regex";
const WORDS = ["bingo", "running", "binges", "cringe", "pooling", "ingenuity", "cooperating", "sing", "ring", "bring", "singer", "thing", "nothing", "ingot"];

const PATTERNS: { p: string; means: string }[] = [
  { p: "ing", means: "the letters i-n-g anywhere" },
  { p: "^ing", means: "i-n-g at the start of the string" },
  { p: "ing$", means: "i-n-g at the end of the string" },
  { p: "^.ing", means: "any one character, then i-n-g, at the start" },
  { p: "ing.", means: "i-n-g followed by at least one more character" },
  { p: "^b.*ing$", means: "starts with b, ends with ing" },
  { p: "^[bcr]", means: "starts with b, c or r" },
  { p: "^[^bcr]", means: "starts with anything except b, c or r" },
  { p: "in.*in", means: "'in' twice, anything between" },
  { p: "o{2}", means: "exactly two o's in a row" },
  { p: "^.{5}$", means: "exactly five characters long" },
  { p: "^.{6,}$", means: "six or more characters long" },
  { p: "(ing|ers)$", means: "ends in ing or ers" },
  { p: "\\bring", means: "ring at the start of a word" },
];

function matches(p: string, ws: string[]): string[] {
  const re = new RegExp(p);
  return ws.filter((w) => re.test(w));
}

export const drills: Drill[] = [
  {
    id: "how!matches",
    guideId: G,
    sectionRef: "how",
    title: "Which words does the pattern find?",
    skill: "Read a pattern as a sequence of tests; anchors, classes and quantifiers each do one job.",
    gen(r: Rng) {
      const pool = r.sample(WORDS, 7);
      let pat = r.pick(PATTERNS);
      let hits = matches(pat.p, pool);
      // Avoid degenerate all/none instances most of the time.
      for (let k = 0; k < 6 && (hits.length === 0 || hits.length === pool.length); k++) {
        pat = r.pick(PATTERNS);
        hits = matches(pat.p, pool);
      }
      return {
        prompt: `Words: **${pool.join(", ")}**. Which of them does the pattern \`${pat.p}\` match? (List them, comma-separated; write "none" if nothing matches.)`,
        answer: { kind: "set", items: hits.length ? hits : ["none"], placeholder: "e.g. bingo, cringe" },
        steps: [`\`${pat.p}\` means: ${pat.means}.`, ...pool.map((w) => `${w}: ${hits.includes(w) ? "match" : "no"}`)],
        hint: pat.p.includes("^") || pat.p.includes("$") ? "Anchors: ^ is the start of the string, $ the end. Without them the pattern can sit anywhere." : "Without anchors the pattern can appear anywhere inside the word.",
        diagnose(input) {
          const got = input.split(/[,;\s]+/).filter(Boolean);
          const unanchored = pat.p.replace(/^\^|\$$/g, "");
          const loose = matches(unanchored, pool);
          if (unanchored !== pat.p && got.length === loose.length && loose.every((w) => got.includes(w))) return "You ignored the anchor. ^ pins the match to the start of the string and $ to the end; the pattern can no longer float.";
          const missing = hits.filter((h) => !got.includes(h));
          const extra = got.filter((g) => !hits.includes(g) && g !== "none");
          if (missing.length && !extra.length) return `You missed ${missing.join(", ")}. Re-test ${missing.length === 1 ? "it" : "them"} against the pattern piece by piece.`;
          if (extra.length && !missing.length) return `${extra.join(", ")} ${extra.length === 1 ? "does" : "do"} not match. Which part of the pattern fails there?`;
          return undefined;
        },
      };
    },
  },
  {
    id: "how!quantifier",
    guideId: G,
    sectionRef: "how",
    title: "Quantifiers and classes",
    skill: "* + ? {m,n} apply to the thing just before them; classes match one character.",
    gen(r) {
      const qs = [
        { p: "Which pattern matches 'ab' followed by **two or more** c's?", ok: "`abc{2,}`", bad: ["`abc{2}`", "`abcc*`", "`ab{2,}c`"], why: "{2,} means two or more of the previous thing, c." },
        { p: "Which pattern matches 'a', then **more than one** b, then 'c'?", ok: "`ab{2,}c`", bad: ["`ab+c`", "`ab*c`", "`abbc?`"], why: "More than one = at least two: {2,}. b+ allows a single b." },
        { p: "Does `abc*` match the string 'ab'?", ok: "Yes: * allows zero c's", bad: ["No: it needs at least one c", "No: * needs at least two"], why: "* is zero or more of the previous character." },
        { p: "Does `abc+` match 'ab'?", ok: "No: + needs at least one c", bad: ["Yes: + allows zero", "Yes: c+ is optional"], why: "+ is one or more." },
        { p: "What does `a(bc){2,5}` match?", ok: "a, then 2 to 5 copies of 'bc'", bad: ["a, then b, then 2 to 5 c's", "'abc' repeated 2 to 5 times", "a, then 2 to 5 of b or c"], why: "Parentheses group, so the quantifier applies to the whole 'bc'." },
        { p: "What does `[^aeiou]` match?", ok: "One character that is not a vowel", bad: ["The start of a string followed by a vowel", "Any vowel", "One or more consonants"], why: "Inside brackets ^ means NOT; the class matches one character." },
        { p: "What does `\\w+ing\\b` find in text?", ok: "Whole words ending in ing (word chars, then ing, then a boundary)", bad: ["Only the string 'ing'", "Any 'ing' followed by a space", "Words starting with ing"], why: "\\w+ takes the word characters before ing; \\b stops at the word's end." },
        { p: "`.*` on a line of text captures…", ok: "The whole line: any character, any number of times, greedy", bad: ["One character", "Only the words", "Nothing unless the line has a dot"], why: "The Chance Quiz true/false: true." },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  },
  {
    id: "examples!write",
    guideId: G,
    sectionRef: "examples",
    title: "Write the pattern",
    skill: "From a plain-English description to a working pattern (checked by running it).",
    gen(r) {
      const tasks = [
        { d: "words that END in ing (test on whole words)", yes: ["running", "sing", "pooling"], no: ["ingot", "singer", "bingo"], model: "ing$" },
        { d: "words that START with ing", yes: ["ingot", "ingenuity"], no: ["running", "thing", "bring"], model: "^ing" },
        { d: "words that start with b and end with ing", yes: ["bring", "binging"], no: ["bingo", "running", "thing"], model: "^b.*ing$" },
        { d: "words that contain two o's in a row", yes: ["pooling", "cooperating", "moon"], no: ["bingo", "ring", "oregano"], model: "oo" },
        { d: "words that are exactly four characters long", yes: ["sing", "ring", "moon"], no: ["bring", "ingot", "run"], model: "^.{4}$" },
        { d: "words that start with a vowel", yes: ["ingot", "oregano", "apple"], no: ["bingo", "ring", "thing"], model: "^[aeiou]" },
        { d: "words containing 'in' followed later by another 'in'", yes: ["binging", "inning", "intoning"], no: ["bingo", "ring", "inch"], model: "in.*in" },
      ];
      const t = r.pick(tasks);
      const all = [...t.yes, ...t.no];
      return {
        prompt: `Write a regex for: **${t.d}**. It must match ${t.yes.join(", ")} and must NOT match ${t.no.join(", ")}. Type just the pattern.`,
        answer: {
          kind: "custom",
          display: t.model,
          placeholder: "e.g. ^b.*ing$",
          check(input) {
            const re = new RegExp(input.trim());
            return t.yes.every((w) => re.test(w)) && t.no.every((w) => !re.test(w));
          },
        },
        steps: [`One pattern that works: \`${t.model}\`.`, ...all.map((w) => `${w}: ${t.yes.includes(w) ? "must match" : "must not match"}`)],
        hint: "Anchors first: does the description say start, end, or anywhere?",
        diagnose(input) {
          let re: RegExp;
          try {
            re = new RegExp(input.trim());
          } catch {
            return "That is not a valid pattern (unbalanced brackets or parentheses, or a quantifier with nothing before it).";
          }
          const wrongYes = t.yes.filter((w) => !re.test(w));
          const wrongNo = t.no.filter((w) => re.test(w));
          const parts: string[] = [];
          if (wrongYes.length) parts.push(`it fails to match ${wrongYes.join(", ")}`);
          if (wrongNo.length) parts.push(`it wrongly matches ${wrongNo.join(", ")}`);
          return `Running your pattern: ${parts.join("; ")}.`;
        },
      };
    },
  },
];
