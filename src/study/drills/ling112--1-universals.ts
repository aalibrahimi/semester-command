/**
 * Drills for LING 112 · The five universals: name the property from one
 * example (categories, constituents, sentence types, hierarchy, recursion),
 * plus one focused drill per property.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling112/1-universals";

const U = ["Categories", "Constituents", "Sentence types", "Hierarchy", "Recursion"] as const;
type Univ = (typeof U)[number];

const CLUE: Record<Univ, string> = {
  Categories: "It's about which slot a word fits (or which ending it takes).",
  Constituents: "A group of words is acting as one piece: replaced, moved, or used as an answer.",
  "Sentence types": "It's about the shape of the whole sentence: statement, question, or command.",
  Hierarchy: "One word order with two meanings, or a rule that follows structure instead of counting.",
  Recursion: "A unit sits inside a unit of the same type, and you could keep adding more.",
};

const BANK: { p: string; ok: Univ }[] = [
  { p: "'Dog', 'idea' and 'destruction' all fit 'The ___ was surprising'; 'destroy' does not.", ok: "Categories" },
  { p: "'The cat sat in the hat.' → 'The cat sat there.'", ok: "Constituents" },
  { p: "'The dog is barking.' / 'Is the dog barking?' / 'Stop barking!'", ok: "Sentence types" },
  { p: "'The thief tripped the man with a cane' has two meanings with the same word order.", ok: "Hierarchy" },
  { p: "'This is the rat that ate the malt that lay in the house that Jack built.'", ok: "Recursion" },
  { p: "'my friend's sister's boss's car'", ok: "Recursion" },
  { p: "'Will', 'can' and 'should' fit 'They ___ leave'; 'eat' and 'happy' don't.", ok: "Categories" },
  { p: "Q: 'What did Sherlock find?' A: 'The missing letter.'", ok: "Constituents" },
  { p: "'The man who is tall is happy' → 'Is the man who is tall happy?', never '*Is the man who tall is happy?'", ok: "Hierarchy" },
  { p: "'Close the door.' has no spoken subject but is a complete sentence.", ok: "Sentence types" },
  { p: "'the key to the door of the house on the hill'", ok: "Recursion" },
  { p: "'The evidence, the spies will stash after midnight.' Three words moved to the front together.", ok: "Constituents" },
  { p: "'old men and women': are the women old too? It depends on the grouping.", ok: "Hierarchy" },
  { p: "'Where did you park?' vs 'You parked downtown.'", ok: "Sentence types" },
  { p: "Add '-ness' to 'happy' and 'happiness' now fits 'The ___ faded.'", ok: "Categories" },
  { p: "'Sam thinks that Ana knows that Lee left.'", ok: "Recursion" },
  { p: "'I saw the girl with the telescope.' Who has the telescope?", ok: "Hierarchy" },
  { p: "'The book on the table is mine.' → 'It is mine.'", ok: "Constituents" },
  { p: "Arabic 'hal akalta?' and Japanese 'Tabemashita ka?' both ask a yes/no question.", ok: "Sentence types" },
  { p: "'Sing', 'eat' and 'jump' fit 'Let's ___'; 'song' and 'food' don't.", ok: "Categories" },
  { p: "'Visiting relatives can be boring.' Who is visiting whom?", ok: "Hierarchy" },
  { p: "'She said that he thinks that they know.'", ok: "Recursion" },
];

export const drills: Drill[] = [
  {
    id: "which!any",
    guideId: G,
    sectionRef: "which",
    title: "Which universal is this?",
    skill: "One example, five choices: categories, constituents, sentence types, hierarchy, recursion.",
    gen(r) {
      const q = r.pick(BANK);
      const wrong = U.filter((u) => u !== q.ok);
      return {
        prompt: `Which universal is this? ${q.p}`,
        answer: choice(r, q.ok, [...wrong]),
        steps: [
          "Ask in order: slot? one piece? whole-sentence shape? same order, two meanings? same type inside same type?",
          `The giveaway: ${CLUE[q.ok]}`,
          `Answer: ${q.ok}.`,
        ],
      };
    },
  },
  {
    id: "categories!slot",
    guideId: G,
    sectionRef: "categories",
    title: "Which word fits the slot?",
    skill: "Categories are found by slots, not meaning: pick the word that fits the frame.",
    gen(r) {
      const qs = [
        { f: "The ___ slept.", ok: "destruction", bad: ["destroy", "happy", "quickly"], cat: "noun" },
        { f: "They will ___ .", ok: "arrive", bad: ["arrival", "happy", "the"], cat: "verb" },
        { f: "a very ___ dog", ok: "loud", bad: ["loudly", "loudness", "bark"], cat: "adjective" },
        { f: "She sang ___ .", ok: "beautifully", bad: ["beautiful", "beauty", "the"], cat: "adverb" },
        { f: "___ dog barked.", ok: "every", bad: ["happily", "run", "that-ness"], cat: "determiner" },
        { f: "I think ___ it rained.", ok: "that", bad: ["the", "quickly", "rain"], cat: "complementizer" },
        { f: "The cat sat ___ the mat.", ok: "on", bad: ["happy", "sleep", "every"], cat: "preposition" },
      ];
      const q = r.pick(qs);
      return {
        prompt: `Which word fits the frame '${q.f}'?`,
        answer: choice(r, q.ok, q.bad),
        steps: [`The slot in '${q.f}' only takes a ${q.cat}.`, `'${q.ok}' is a ${q.cat}; the others belong to other categories.`],
      };
    },
  },
  {
    id: "constituents!unit",
    guideId: G,
    sectionRef: "constituents",
    title: "Unit or not?",
    skill: "Use replace, move, or answer to decide whether the bracketed words are one constituent.",
    gen(r) {
      const qs = [
        { p: "The spies will stash [the evidence] after midnight.", ok: true, why: "'stash it' works (replace)." },
        { p: "The spies will [stash the] evidence after midnight.", ok: false, why: "no pro-form replaces it, it can't move, it can't answer a question." },
        { p: "The cat sat [on the mat].", ok: true, why: "'The cat sat there' works; 'Where did it sit? On the mat.'" },
        { p: "The cat in the [hat sat] on the mat.", ok: false, why: "no question has 'hat sat' as its answer." },
        { p: "[The old man] fed the birds.", ok: true, why: "'He fed the birds' works (replace)." },
        { p: "The old man fed [the birds in] the park.", ok: false, why: "'the birds in' can't be replaced, moved, or used as an answer." },
        { p: "Sarah will [read the book] tonight.", ok: true, why: "'Sarah will do so tonight' works (replace with do so)." },
      ];
      const q = r.pick(qs);
      const ok = q.ok ? "Yes, it's a constituent" : "No, it's not a constituent";
      const no = q.ok ? "No, it's not a constituent" : "Yes, it's a constituent";
      return { prompt: `Are the bracketed words one unit? ${q.p}`, answer: choice(r, ok, [no]), steps: ["Try replace, move, answer. One pass is enough.", `${ok}: ${q.why}`] };
    },
  },
  {
    id: "types!name",
    guideId: G,
    sectionRef: "types",
    title: "Name the sentence type",
    skill: "Declarative, interrogative (yes/no or wh-), imperative: judge by shape.",
    gen(r) {
      const qs = [
        { p: "Sarah won the race.", ok: "Declarative (statement)" },
        { p: "Did Sarah win the race?", ok: "Interrogative (yes/no question)" },
        { p: "What did Sarah win?", ok: "Interrogative (wh-question)" },
        { p: "Win the race!", ok: "Imperative (command)" },
        { p: "Could you open the window?", ok: "Interrogative (yes/no question)" },
        { p: "Sit down.", ok: "Imperative (command)" },
        { p: "Where are my keys?", ok: "Interrogative (wh-question)" },
      ];
      const all = ["Declarative (statement)", "Interrogative (yes/no question)", "Interrogative (wh-question)", "Imperative (command)"];
      const q = r.pick(qs);
      return {
        prompt: `Which sentence type? '${q.p}'`,
        answer: choice(r, q.ok, all.filter((a) => a !== q.ok)),
        steps: ["Judge the shape, not the job: helper verb first = yes/no, wh-word first = wh-, no subject = imperative.", `Answer: ${q.ok}.`],
      };
    },
  },
  {
    id: "hierarchy!reading",
    guideId: G,
    sectionRef: "hierarchy",
    title: "Which grouping gives this meaning?",
    skill: "Match a meaning of an ambiguous sentence to its bracketing.",
    gen(r) {
      const qs = [
        { p: "'The thief tripped the man with a cane.' Meaning: the thief used the cane.", ok: "tripped [the man] [with a cane]", bad: ["tripped [the man with a cane]"] },
        { p: "'The thief tripped the man with a cane.' Meaning: the man was holding the cane.", ok: "tripped [the man with a cane]", bad: ["tripped [the man] [with a cane]"] },
        { p: "'I saw the girl with the telescope.' Meaning: I looked through the telescope.", ok: "saw [the girl] [with the telescope]", bad: ["saw [the girl with the telescope]"] },
        { p: "'old men and women' Meaning: only the men are old.", ok: "[old men] and [women]", bad: ["old [men and women]"] },
        { p: "'old men and women' Meaning: everyone is old.", ok: "old [men and women]", bad: ["[old men] and [women]"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: ["The words are in the same order either way; only the grouping changes.", `Grouping: ${q.ok}.`] };
    },
  },
  {
    id: "recursion!yes",
    guideId: G,
    sectionRef: "recursion",
    title: "Recursive or just long?",
    skill: "Recursion needs a unit inside a unit of the same type; length alone doesn't count.",
    gen(r) {
      const qs = [
        { p: "the big old red wooden barn", ok: false, why: "a list of adjectives, no same-type unit inside itself" },
        { p: "the dog that chased the cat that ate the mouse", ok: true, why: "a relative clause inside a relative clause" },
        { p: "my friend's sister's car", ok: true, why: "a possessor inside a possessor" },
        { p: "She quickly and quietly left.", ok: false, why: "two adverbs joined; nothing sits inside a same-type unit" },
        { p: "Sam thinks that Ana knows that Lee left.", ok: true, why: "a that-clause inside a that-clause" },
        { p: "the key to the door of the house", ok: true, why: "a DP inside a PP inside a DP" },
        { p: "Dogs bark.", ok: false, why: "one clause, nothing nested" },
      ];
      const q = r.pick(qs);
      const ok = q.ok ? "Recursive" : "Not recursive";
      return { prompt: `Recursive or not? '${q.p}'`, answer: choice(r, ok, [q.ok ? "Not recursive" : "Recursive"]), steps: ["Look for the same type of unit inside itself.", `${ok}: ${q.why}.`] };
    },
  },
];
