/**
 * Drills for LING 112 · What syntax is: the four universals, the parameters
 * of variation, and interlinear gloss conventions (Tallerman 1.2).
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling112/0-what-syntax-is";

export const drills: Drill[] = [
  {
    id: "universals!which",
    guideId: G,
    sectionRef: "universals",
    title: "Which universal is this?",
    skill: "Categories, constituents, sentence types, hierarchy and recursion: name the property from the example.",
    gen(r) {
      const qs = [
        { p: "'the house that Jack built that the rat ate': a relative clause inside a relative clause.", ok: "Recursion: a unit inside a unit of the same type", bad: ["Hierarchy", "Syntactic categories", "Sentence types"] },
        { p: "'the thief tripped that unlucky man with a cane' means two things depending on what 'with a cane' groups with.", ok: "Hierarchy: the grouping matters, not just the order", bad: ["Recursion", "Constituency is absent", "Sentence types"] },
        { p: "'in the hat' behaves as one unit; 'hat sat' does not.", ok: "Constituency: words combine into larger units", bad: ["Recursion", "Sentence types", "Head directionality"] },
        { p: "run, arrive, laugh pattern together; the, a, every pattern together.", ok: "Words belong to syntactic categories", bad: ["Recursion", "Hierarchy", "Null subjects"] },
        { p: "Declarative, interrogative, imperative.", ok: "Constituents combine into sentence types", bad: ["Syntactic categories", "Recursion", "Adposition order"] },
        { p: "'big red ball' (two adjectives), 'quickly ran' (adverb + verb): do these show recursion?", ok: "No: neither has a unit inside a unit of the same type", bad: ["Yes: two adjectives is recursion", "Yes: any modifier is recursion"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: ["Recursion = same-type unit nested; hierarchy = grouping decides meaning; constituency = words that act as one unit.", `Answer: ${q.ok}.`] };
    },
  },
  {
    id: "variation!param",
    guideId: G,
    sectionRef: "variation",
    title: "Which parameter?",
    skill: "Adjective–noun, adposition, subject pronouns, wh-questions: place a language fact on the table.",
    gen(r) {
      const qs = [
        { p: "Vietnamese 'quả bóng đỏ lớn' (ball red big) vs English 'big red ball'.", ok: "Adjective–noun order: N-Adj vs Adj-N", bad: ["Adposition type", "Null subjects", "Wh-movement"] },
        { p: "Korean 'bang-eseo' (room-in) vs English 'in the room'.", ok: "Adposition: postposition vs preposition", bad: ["Adjective–noun order", "Null subjects", "Wh-in-situ"] },
        { p: "Spanish 'Habla español' = '(s/he) speaks Spanish', no pronoun.", ok: "Subject pronouns: null-subject language", bad: ["Wh-movement", "Postpositions", "N-Adj order"] },
        { p: "Mandarin leaves 'shénme' (what) in the object slot; Syrian Arabic fronts 'šu'.", ok: "Wh-questions: wh-in-situ vs wh-movement", bad: ["Null subjects", "Adposition type", "Adjective–noun order"] },
        { p: "MSA 'kitāb kabīr' (book big).", ok: "Adjective–noun order: N-Adj", bad: ["Postposition", "Wh-in-situ", "Overt subject"] },
        { p: "MSA neutral order 'qaraʔa l-walad-u l-kitāb-a' (read the-boy the-book).", ok: "Basic word order: VSO", bad: ["SOV", "SVO only", "Wh-movement"] },
      ];
      const q = r.pick(qs);
      return { prompt: `Which parameter does this illustrate? ${q.p}`, answer: choice(r, q.ok, q.bad), steps: [`It is the ${q.ok.split(":")[0].toLowerCase()} parameter.`] };
    },
  },
  {
    id: "gloss!rules",
    guideId: G,
    sectionRef: "gloss",
    title: "Gloss conventions",
    skill: "Hyphens for affixes, = for clitics, small caps for grammatical labels, one gloss per morpheme, line 3 in quotes.",
    gen(r) {
      const qs = [
        { p: "Japanese 'tegami-o' (letter-ACC): why a hyphen?", ok: "The accusative marker is an affix; hyphens separate affixes", bad: ["Hyphens separate words", "It is a clitic", "Hyphens mark stress"] },
        { p: "English 'I'm' in a gloss line 1:", ok: "I=m, with = because 'm is a clitic", bad: ["I-m, with a hyphen", "I'm, unchanged", "I m, with a space"] },
        { p: "A morpheme carries two meanings at once (French 'a lu' = read.3.PAST). How is it glossed?", ok: "One gloss item with the meanings joined by periods: read.3.PAST", bad: ["Two gloss items: read 3.PAST", "Hyphenated: read-3-PAST", "Only the main meaning: read"] },
        { p: "Line 3 of an interlinear gloss is…", ok: "A free translation in quotes, natural English", bad: ["Another gloss line", "The IPA transcription", "The literal word order"] },
        { p: "NOM, ACC, PAST, 3SG are written in…", ok: "Small caps (or all caps): grammatical labels", bad: ["Italics: lexical meanings", "Lowercase, like the words", "Bold"] },
        { p: "The one-to-one rule says:", ok: "Every morpheme in line 1 has exactly one gloss in line 2, same order", bad: ["Every word gets one gloss", "Line 2 may reorder into English order", "Affixes are left unglossed"] },
        { p: "Spanish 'Está lloviendo' ('It's raining') glossed as be.PRES.3SG raining shows…", ok: "A null-subject language: no pronoun in line 1, none invented in line 2", bad: ["A missing morpheme to be added as 'it'", "A clitic subject", "An error in the handout"] },
        { p: "What loses points in a gloss, per the handout?", ok: "A gloss that does not match its line 1 (a case marker glossed that isn't there, or missing)", bad: ["Using a dialect word instead of MSA", "Writing the translation in quotes", "Using small caps"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: [`Answer: ${q.ok}.`] };
    },
  },
];
