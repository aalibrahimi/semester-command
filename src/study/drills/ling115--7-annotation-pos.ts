/**
 * Drills for LING 115 · Annotation and POS: which level an annotation is,
 * PTB tags in context (VBD vs VBN, RP vs IN, NN vs VB), and the kinds of
 * ambiguity.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling115/7-annotation-pos";

export const drills: Drill[] = [
  {
    id: "levels!which",
    guideId: G,
    sectionRef: "levels",
    title: "Which level of annotation?",
    skill: "Lexical, phonetic, morphological, syntactic, semantic, discourse: name the level from the example.",
    gen(r) {
      const items = [
        { ex: "Book_[verb] me a flight / the book_[noun]", ok: "Lexical" },
        { ex: "Time-aligned phones from TIMIT: h#, sh, iy…", ok: "Phonetic" },
        { ex: "A 4-line interlinear gloss with morpheme boundaries marked by '-' and clitics by '='", ok: "Morphological" },
        { ex: "How_WRB quickly_RB things_NNS change_VBP plus a phrase-structure tree", ok: "Syntactic" },
        { ex: "[What time]_pred is it in {Istanbul | city} {right now | start_time}", ok: "Semantic" },
        { ex: "Resolving what 'them' refers to in '…bring them round'", ok: "Discourse" },
        { ex: "ToBI marks for prosody and stress", ok: "Phonetic" },
        { ex: "Lemma and stem for every token", ok: "Lexical" },
      ];
      const it = r.pick(items);
      const levels = ["Lexical", "Phonetic", "Morphological", "Syntactic", "Semantic", "Discourse"];
      return {
        prompt: `Which level of annotation is this? **${it.ex}**`,
        answer: choice(r, it.ok, r.sample(levels.filter((l) => l !== it.ok), 3)),
        steps: [`Lexical = words and their tags; phonetic = sounds; morphological = pieces of words; syntactic = structure; semantic = meaning roles and entities; discourse = across sentences.`, `This one is ${it.ok}.`],
      };
    },
  },
  {
    id: "tagsets!ptb",
    guideId: G,
    sectionRef: "tagsets",
    title: "PTB tag in context",
    skill: "The same word gets different tags by its role: VBD vs VBN, RP vs IN, NN vs VB.",
    gen(r) {
      const items = [
        { s: "She **walked** home.", ok: "VBD (past tense)", bad: ["VBN (past participle)", "VBG", "NN"], why: "Simple past, no auxiliary: VBD." },
        { s: "She has **walked** home.", ok: "VBN (past participle)", bad: ["VBD (past tense)", "VBZ", "JJ"], why: "After *has*, it is the participle: VBN. PTB puts tense in the tag." },
        { s: "He looked **up** the answer.", ok: "RP (particle)", bad: ["IN (preposition)", "RB", "JJ"], why: "*look up* is a phrasal verb; you can say 'looked the answer up'. Particle: RP." },
        { s: "He looked **up** the stairs.", ok: "IN (preposition)", bad: ["RP (particle)", "RB", "DT"], why: "*up the stairs* is a place; you cannot say 'looked the stairs up'. Preposition: IN." },
        { s: "**Book** me a flight.", ok: "VB (base verb)", bad: ["NN (noun)", "NNS", "JJ"], why: "Imperative verb." },
        { s: "Read the **book**.", ok: "NN (noun)", bad: ["VB (base verb)", "VBD", "RB"], why: "After a determiner, it is a noun." },
        { s: "Police help **dog** bite victim (reading: they help the person bitten by a dog).", ok: "NN, inside the compound 'dog-bite victim'", bad: ["VB", "JJ", "RB"], why: "In that parse *dog bite* is a noun compound." },
        { s: "Police help dog **bite** victim (reading: they help a dog to bite someone).", ok: "VB (verb)", bad: ["NN", "JJ", "VBD"], why: "In that parse *bite* is the verb the dog does. The tag depends on the parse." },
        { s: "They **run** fast. (present, plural subject)", ok: "VBP", bad: ["VBZ", "VBD", "NN"], why: "Non-3rd-person present: VBP. *runs* would be VBZ." },
      ];
      const it = r.pick(items);
      return {
        prompt: `Penn Treebank tag for the bold word: ${it.s}`,
        answer: choice(r, it.ok, it.bad, { correct: it.why }),
        steps: ["Ask what the word is doing here, not what it is in the dictionary.", it.why],
        hint: "Try the substitution and movement tricks: can you move the word? What comes before it?",
      };
    },
  },
  {
    id: "pos!ambiguity",
    guideId: G,
    sectionRef: "pos",
    title: "What kind of ambiguity?",
    skill: "Lexical (one word), syntactic (one string, several parses), pragmatic (context beyond the sentence).",
    gen(r) {
      const items = [
        { ex: "'duck': the bird, or to take cover", ok: "Lexical", why: "One word, several meanings or categories." },
        { ex: "'The chicken is ready to eat'", ok: "Syntactic", why: "One string, two parses: chicken as eater or as food." },
        { ex: "'Can you pass the salt?'", ok: "Pragmatic", why: "Literally a question about ability; in context a request." },
        { ex: "'Police help dog bite victim'", ok: "Syntactic", why: "Two bracketings, two meanings." },
        { ex: "'bat': mammal, club, or to hit", ok: "Lexical", why: "One word, several senses and categories." },
        { ex: "'John loves his mother, and Bill does too' (his own, or John's?)", ok: "Pragmatic", why: "Resolving 'does too' needs context beyond the sentence." },
        { ex: "'K-Pop light sticks fire up impeachment protests'", ok: "Syntactic", why: "Is 'fire' a verb (fire up) or part of a noun compound (light sticks fire)?" },
      ];
      const it = r.pick(items);
      return {
        prompt: `What kind of ambiguity: ${it.ex}?`,
        answer: choice(r, it.ok, ["Lexical", "Syntactic", "Pragmatic"].filter((x) => x !== it.ok), { correct: it.why }),
        steps: [it.why, "Parsing needs the POS tags, but the right POS tag can depend on the parse: that circularity is why a machine can't just pick."],
      };
    },
  },

  {
    id: "process!steps",
    guideId: G,
    sectionRef: "process",
    title: "The data-linguist process",
    skill: "Question → design decisions → collection and shaping → annotation → analysis, iterate; and why documentation matters.",
    gen(r) {
      const qs = [
        { p: "Where do 'many linguistic decisions happen', per the slides?", ok: "Data design decisions (step 2)", bad: ["Analysis (step 5)", "Downloading the corpus", "Plotting"] },
        { p: "Tokenization and normalization belong to which step?", ok: "Data collection and shaping (step 3)", bad: ["Annotation", "Analysis and evaluation", "Question design"] },
        { p: "One reason to document your dataset:", ok: "It gives the data a lineage and known biases, so later results are interpretable and reproducible", bad: ["Canvas requires it", "It makes the corpus larger", "It replaces annotation"] },
        { p: "Why annotate at all? Pick the reason that is NOT one of hers.", ok: "It makes the corpus smaller", bad: ["Reproducibility", "Automatic examination (search 'all verbs')", "Multi-functionality (one corpus, many questions)"] },
        { p: "After analysis and evaluation, the process says to…", ok: "Iterate: go back and revise earlier decisions", bad: ["Publish", "Delete the raw data", "Stop"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: [`Answer: ${q.ok}.`] };
    },
  },
];
