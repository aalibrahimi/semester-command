/**
 * Drills for LING 112 · X-bar theory: name a dependent by its position,
 * count bar levels (one per adjunct, plus one), say what do so and one
 * replace, find specifiers (subjects, possessors), and tell a complement PP
 * from an adjunct PP inside a noun phrase.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling112/7-x-bar";

const POSITIONS = [
  { where: "a sister of the head X and a daughter of X′", answer: "Complement" },
  { where: "a sister of an X′ and a daughter of another X′", answer: "Adjunct" },
  { where: "a sister of an X′ and a daughter of XP", answer: "Specifier" },
] as const;

const VERBS = [
  { v: "circle", obj: "the track" },
  { v: "read", obj: "the letter" },
  { v: "fix", obj: "the bike" },
  { v: "paint", obj: "the fence" },
];
const ADJUNCTS = ["carefully", "in the morning", "with a brush", "on Tuesday", "very slowly", "for an hour", "at home"];

const NOUNS = [
  { n: "sacks", comp: "of flour" },
  { n: "student", comp: "of physics" },
  { n: "collection", comp: "of paintings" },
  { n: "picture", comp: "of the robot" },
];
const NADJ = ["heavy", "old", "rather ugly", "famous"];
const NPP = ["in the corner", "with long hair", "on the wall", "from Tokyo"];

export const drills: Drill[] = [
  {
    id: "template!position",
    guideId: G,
    sectionRef: "template",
    title: "Name it by its position",
    skill: "Tell a complement, an adjunct and a specifier apart by where they attach.",
    gen(r) {
      const p = r.pick(POSITIONS);
      return {
        prompt: `In the X-bar template, a phrase that is ${p.where} is called a…`,
        answer: choice(r, p.answer, [...POSITIONS.map((x): string => x.answer).filter((x) => x !== p.answer), "Head"]),
        steps: ["Complement: sister of X, daughter of X′.", "Adjunct: sister of X′, daughter of X′.", "Specifier: sister of X′, daughter of XP."],
      };
    },
  },
  {
    id: "bar!count",
    guideId: G,
    sectionRef: "bar",
    title: "How many V′?",
    skill: "Count bar levels: one for the head and its complement, one more per adjunct.",
    gen(r) {
      const { v, obj } = r.pick(VERBS);
      const n = r.int(0, 3);
      const adj = r.shuffle([...ADJUNCTS]).slice(0, n);
      return {
        prompt: `How many V′ nodes does the VP *${[v, obj, ...adj].join(" ")}* have in X-bar form?`,
        answer: { kind: "number", value: n + 1 },
        steps: [`Lowest V′: *${v} ${obj}* (verb + complement).`, ...adj.map((a, i) => `Adjunct *${a}* adds V′ number ${i + 2}.`), `Total: ${n + 1}.`],
        hint: "One V′ for the verb and its object, then one more for each optional add-on.",
        diagnose: (s) => (Number(s) === n ? "You counted only the adjuncts. The lowest V′ (verb + object) counts too." : Number(s) === n + 2 ? "VP is the phrase level, not a V′. Count only the bar levels." : undefined),
      };
    },
  },
  {
    id: "bar!proform",
    guideId: G,
    sectionRef: "bar",
    title: "What does it replace?",
    skill: "do so replaces a V′; one(s) replaces an N′.",
    gen(r) {
      const q = r.pick([
        { pf: "do so", ans: "V′", why: "do so substitution targets the V-bar level (handout (1) to (3))." },
        { pf: "one / ones", ans: "N′", why: "one substitution targets the N-bar level (handout (11))." },
      ]);
      return {
        prompt: `In X-bar theory, the pro-form *${q.pf}* replaces which level?`,
        answer: choice(r, q.ans, ["V′", "N′", "VP", "NP", "DP"].filter((x) => x !== q.ans).slice(0, 3)),
        steps: [q.why],
      };
    },
  },
  {
    id: "np!count",
    guideId: G,
    sectionRef: "np",
    title: "How many N′?",
    skill: "Count N′ levels inside a noun phrase.",
    gen(r) {
      const { n, comp } = r.pick(NOUNS);
      const a = r.int(0, 1) ? [r.pick(NADJ)] : [];
      const p = r.int(0, 1) ? [r.pick(NPP)] : [];
      const count = 1 + a.length + p.length;
      return {
        prompt: `How many N′ nodes does *those ${[...a, n, comp, ...p].join(" ")}* have in X-bar form?`,
        answer: { kind: "number", value: count },
        steps: [`Lowest N′: *${n} ${comp}* (the noun and its complement PP).`, ...a.map((x) => `The adjective *${x}* is an adjunct: +1 N′.`), ...p.map((x) => `*${x}* is an adjunct PP: +1 N′.`), `Total: ${count}. Each one can be replaced by *one(s)*.`],
        diagnose: (s) => (Number(s) === count + 1 ? `The *${comp}* PP is the complement: it shares the lowest N′ with the head, it doesn't add one.` : undefined),
      };
    },
  },
  {
    id: "np!comp-or-adj",
    guideId: G,
    sectionRef: "np",
    title: "Complement or adjunct PP?",
    skill: "Inside an NP, the complement PP sits next to the head on the lowest N′.",
    gen(r) {
      const { n, comp } = r.pick(NOUNS);
      const adj = r.pick(NPP);
      const askComp = r.int(0, 1) === 1;
      const target = askComp ? comp : adj;
      return {
        prompt: `In *a ${n} ${comp} ${adj}*, is *${target}* a complement or an adjunct of *${n}*?`,
        answer: choice(r, askComp ? "Complement" : "Adjunct", [askComp ? "Adjunct" : "Complement", "Specifier"]),
        steps: askComp
          ? [`*${comp}* is chosen by *${n}* and must sit right next to it: sister of N, daughter of the lowest N′.`, `Test: *a ${n} ${adj} ${comp}* sounds wrong.`]
          : [`*${adj}* is an optional add-on: sister of an N′, daughter of a higher N′.`, `Test: it can be dropped and more like it stacked.`],
      };
    },
  },
  {
    id: "spec!find",
    guideId: G,
    sectionRef: "spec",
    title: "Find the specifier",
    skill: "The subject is Spec,TP; a possessor is Spec,DP (with D = 's).",
    gen(r) {
      const cases = [
        { phrase: "the sentence *Erin plays her guitar*", spec: "Erin", wrong: ["her guitar", "plays", "PRES"] },
        { phrase: "the sentence *Her phone buzzed loudly*", spec: "Her phone", wrong: ["loudly", "buzzed", "PAST"] },
        { phrase: "the DP *Michelle's phone*", spec: "Michelle", wrong: ["'s", "phone", "none: DPs have no specifier"] },
        { phrase: "the DP *the artist's collection of paintings*", spec: "the artist", wrong: ["of paintings", "'s", "collection"] },
        { phrase: "the sentence *Lee will circle the track*", spec: "Lee", wrong: ["the track", "will", "circle the track"] },
      ];
      const c = r.pick(cases);
      return {
        prompt: `What is the specifier in ${c.phrase}?`,
        answer: choice(r, c.spec, c.wrong),
        steps: [c.phrase.startsWith("the DP") ? "A possessor DP is the specifier of the DP headed by 's; the possessed NP is the complement." : "The subject DP is the specifier of TP (TP → DP T′)."],
      };
    },
  },
];
