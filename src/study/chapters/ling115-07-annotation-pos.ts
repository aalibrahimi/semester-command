import type { Chapter, Frame } from "../types";

/**
 * LING 115 · Lectures 7–8 — Annotation, data documentation, the data-linguist
 * process; parsing, POS tagging, tagsets, ambiguity. Built from Kraus's
 * Lecture 7 and 8 slides, Gebru et al. (2018), Leech (2004), J&M ch. 18, HW 2.
 */

/** Tagging "Book me a flight" vs "the book": same word, two tags. */
const tagFrames: Frame[] = [
  { kind: "array", cells: ["Book", "me", "a", "flight"], hl: [0], note: "Book = ?", caption: "POS tagging assigns a grammatical category to every token. Start with *Book*. Out of context it could be a noun (a book) or a verb (to book). Which is it here?" },
  { kind: "array", cells: ["Book_VB", "me", "a", "flight"], done: [0], hl: [1], note: "sentence-initial, followed by an object → verb", caption: "It starts the sentence and is followed by *me a flight* — an imperative with objects. Verb, base form: **VB**. A tagger decides this from context, not from the word alone." },
  { kind: "array", cells: ["Book_VB", "me_PRP", "a_DT", "flight_NN"], done: [0, 1, 2, 3], note: "PRP pronoun · DT determiner · NN noun", caption: "*me* is a personal pronoun (PRP), *a* a determiner (DT), *flight* a singular noun (NN). These are Penn Treebank tags — the standard set." },
  { kind: "array", cells: ["I", "read", "the", "book"], hl: [3], note: "Book = ?", caption: "Same word, different sentence." },
  { kind: "array", cells: ["I_PRP", "read_VBD", "the_DT", "book_NN"], done: [0, 1, 2, 3], note: "after a determiner → noun", caption: "*the book*: after a determiner, it's a noun, **NN**. And *read* — past or present? Spelled the same. The tagger guessed VBD (past) here, but nothing in the sentence proves it. That's **ambiguity**, and it doesn't go away when you tokenize." },
];

export const ling115Annotation: Chapter = {
  slug: "7-annotation-pos",
  label: "Lectures 7–8",
  title: "Annotation, documentation, POS tagging, and ambiguity",
  source: "Lecture 7 (Sep 15) and Lecture 8 (Sep 17) slides, Gebru et al. 2018, Leech 2004 ch. 2, J&M ch. 18, HW 2.",
  goal: "Give the six annotation levels with an example each; recite the data-linguist process and why datasheets matter; distinguish parsing from POS tagging; name the three kinds of ambiguity with examples; compare Brown and Penn Treebank tagsets; explain why no tagger reaches 100%.",
  minutes: 55,
  requires: ["5-words-tokens-normalization"],
  sections: [
    {
      id: "why",
      title: "Why annotate at all",
      blocks: [
        { id: "why-1", t: "why", slide: "Raw text can't answer linguistic questions", title: "The idea", text: "A raw corpus is a pile of strings. Ask it 'how often is *book* a verb?' and it can't answer — it doesn't know what a verb is. **Annotation** adds a layer of linguistic interpretation on top of the text (this token is a verb; these four tokens are a noun phrase; this pronoun refers to that name) so questions about *structure* become countable. It's the difference between preprocessing — technical access to the text — and analysis." },
        { id: "why-2", t: "list", slide: "Leech's four reasons to annotate", items: [
          "**Reproducibility** — others can check and repeat your analysis.",
          "**Automatic examination** — a computer can search 'all verbs' only if verbs are marked.",
          "**Manual examination** — annotation guides a human reader through the data.",
          "**Multi-functionality** — one annotated corpus serves many later questions.",
        ] },
      ],
    },
    {
      id: "levels",
      title: "Six levels of annotation",
      blocks: [
        { id: "lv-1", t: "table", slide: "Levels, with her examples", rows: [
          ["Level", "What it marks", "Example she used"],
          ["Lexical", "lemmas, stems, POS tags", "Book_[verb] me a flight / the book_[noun]"],
          ["Phonetic", "phones (IPA / ARPABET / SAMPA), prosody, stress, pauses", "TIMIT time-aligned phones (h#, sh, iy…); ToBI"],
          ["Morphological", "morpheme boundaries + glosses, 4-line interlinear", "language documentation; affixes '-', clitics '='"],
          ["Syntactic", "POS + phrase structure", "How_WRB quickly_RB things_NNS change_VBP"],
          ["Semantic", "named entities, predicates, frames", "[What time]_pred is it in {Istanbul|city} {right now|start_time}"],
          ["Discourse", "anaphora, ellipsis", "'…bring them round'; Santa Cruz Sluicing Dataset"],
        ] },
        { id: "lv-2", t: "p", slide: "How this connects to LING 112", text: "The morphological and syntactic rows are LING 112's interlinear glosses and phrase-structure trees, stored as data. A treebank is a corpus where every sentence has the tree you'd draw in syntax class. That's why the Penn Treebank tagset is 'theoretically committed to constituency grammar' — its designers had a syntax theory in mind." },
      ],
    },
    {
      id: "process",
      title: "The data-linguist process and why documentation matters",
      blocks: [
        { id: "pr-1", t: "list", slide: "The five steps (Lecture 7 slide 6)", items: [
          "**1. Research question and hypotheses.**",
          "**2. Data design decisions** — 'this is where many linguistic decisions happen.'",
          "**3. Data collection and shaping** (tokenization, normalization — last chapter).",
          "**4. Data documentation.**",
          "**5. Analysis and evaluation** — then iterate.",
        ] },
        { id: "pr-2", t: "prof", title: "The shift she keeps naming", text: "Traditional corpus work: *'here is a dataset — what can I do with it?'* Contemporary work: *'what dataset do I need, and how do I design it?'* The linguist as **data architect**. Her Lecture 7 line: 'Data cleaning and shaping is actually linguistic theory in disguise.'" },
        { id: "pr-3", t: "why", slide: "Datasheets for Datasets (Gebru et al. 2018)", title: "Why document", text: "A datasheet is a standard description of a dataset: who made it, why, from what, how it was cleaned, what it should and shouldn't be used for. Two framings: it's **ethical accounting** (biases and provenance on the record) and it's a **QA document** (the dataset becomes inspectable, testable, reusable). Without one, a dataset has no lineage, no known biases, no clear use case, no interpretive constraints. That last sentence is the answer to 'give one reason documenting datasets is important.'" },
        { id: "pr-4", t: "try", q: "Chance quiz: T/F — removing emojis can remove pragmatic information. And: one reason documenting your dataset matters.", a: "True (🙄 marks sarcasm). Documentation gives the dataset a lineage and known biases, so a later user knows what it can and can't support — without it, results are uninterpretable and irreproducible." },
      ],
    },
    {
      id: "pos",
      title: "Parsing and POS tagging",
      blocks: [
        { id: "pos-1", t: "list", slide: "Definitions", items: [
          "**Parsing**: analyzing a string of words to determine its grammatical structure with respect to a formal grammar. Input: tokens. Output: a parse tree.",
          "**POS tagging**: assigning a grammatical category to each word — a *component* of parsing. A tagged corpus tells you *book* is a noun; a parsed corpus tells you whether that noun is subject, object, or inside a prepositional phrase.",
          "**Context-free grammar**: rewrite rules like NP → NP RelP, VP → VP NP, VP → VP PP. The slide-9 snippet generates both readings of the Canadian-audience headline.",
        ] },
        { id: "pos-2", t: "stepper", slide: true, title: "Tagging the same word two ways", frames: tagFrames },
        { id: "pos-3", t: "table", slide: "Three kinds of ambiguity (slide 11)", rows: [
          ["Kind", "Definition", "Her examples"],
          ["Lexical", "one word, several meanings or categories", "duck (bird / take cover); bat (mammal / club / hit)"],
          ["Syntactic", "one string, several parses", "'The chicken is ready to eat'; 'Police help dog bite victim'; 'K-Pop light sticks fire up impeachment protests'"],
          ["Pragmatic", "meaning depends on context beyond the sentence", "'Can you pass the salt?'; 'John loves his mother, and Bill does too'"],
        ] },
        { id: "pos-4", t: "worked", slide: "Why 'Police help dog bite victim' is hard", title: "Two parses, and why a machine can't pick", problem: "Explain the ambiguity.", steps: [
          "Reading 1: [help [dog-bite victim]] — police help a person who was bitten by a dog. *bite* is a noun inside a compound.",
          "Reading 2: [help dog] [bite victim] — police help a dog to bite someone. *bite* is a verb.",
          "The POS tag of *bite* depends on the parse, and the parse depends on the tags — circular. What breaks the tie is world knowledge (police don't usually help dogs bite people), which a tagger doesn't have.",
          "That's the chance-quiz answer for 'say something about ambiguity and language data': ambiguity doesn't disappear when you tokenize; context is needed to resolve it, and context can mislead.",
        ] },
      ],
    },
    {
      id: "tagsets",
      title: "Tagsets and taggers",
      blocks: [
        { id: "ts-1", t: "list", slide: "Brown vs Penn Treebank", items: [
          "**Brown tagset** (for the 1961 Brown Corpus): motivated by distributional linguistics, not committed to a syntactic theory; relatively coarse on verbs. NN, NNS, VB, VBD, JJ, RB.",
          "**Penn Treebank tagset** (early 1990s): mapped from Brown but expanded with finer, theory-committed distinctions — the most widely used tagset in NLP. Where Brown has 2 verb categories for base/past, PTB has 6.",
          "**PTB puts tense in the tag, not the tree**: VBD (past: *she walked*) vs VBN (past participle: *she has walked*). Particle vs preposition: RP (*looked up the answer*) vs IN (*looked up the stairs*).",
          "**Trade-off**: more tags = more expressive, harder to annotate consistently.",
        ] },
        { id: "ts-2", t: "warn", title: "Chance quiz: T/F — the Brown tagset has more tags than the Penn Treebank", text: "Argue from granularity, not raw counts. PTB *expands* Brown's distinctions (2 verb tags → 6) and is the finer, theory-committed set — so the intended answer is false. (Raw tag counts are murky — Brown's full list runs to ~80+ with compound tags, PTB's core is 45 — which is exactly why she wants the granularity argument.)" },
        { id: "ts-3", t: "list", slide: "Three families of tagger", items: [
          "**Rule-based**: hand-written disambiguation rules. Fast, transparent, brittle.",
          "**Statistical**: HMMs, maximum entropy — trained on annotated corpora. ('But how were *those* annotated?' — the chicken-and-egg she draws on the slide.)",
          "**Neural**: transformers with wide context. Best accuracy, least interpretable.",
          "None reaches 100%. Errors cluster on syntactically complex or rare structures and at sentence boundaries.",
        ] },
        { id: "ts-4", t: "code", slide: "HW 2's NLTK moves (Brown frequency analysis)", caption: "Every line marked DECISION is a place to write a sentence in your discussion about what it did to the data.", text: `import nltk
from nltk.corpus import brown
from collections import Counter
nltk.download('brown'); nltk.download('universal_tagset')

words  = brown.words(categories='news')                 # tokens, NLTK's tokenization (DECISION)
tagged = brown.tagged_words(categories='news', tagset='universal')

freq   = Counter(w.lower() for w in words)              # lowercasing (DECISION: Apple/apple merge)
freq.most_common(20)
types, tokens = len(set(words)), len(words)
ttr = types / tokens                                    # only comparable across same-size categories

tag_freq = Counter(t for _, t in tagged)                # POS distribution
nouns    = Counter(w.lower() for w, t in tagged if t == 'NOUN')

import pandas as pd
df = pd.DataFrame(freq.most_common(), columns=['word', 'count'])
df['per_million'] = df['count'] / tokens * 1_000_000    # relative frequency` },
        { id: "ts-5", t: "prof", title: "Where HW 1's lost points live", text: "In every homework discussion, write one paragraph on *what my preprocessing decisions did*: lowercasing merged *Apple/apple*; NLTK split *don't* into *do* + *n't*; TTR across categories of different sizes isn't comparable; the tagger's errors cluster at sentence boundaries. That paragraph is what she grades for." },
        { id: "ts-6", t: "def", term: "Lectures 7–8 in one paragraph", text: "Annotation adds linguistic interpretation at six levels (lexical, phonetic, morphological, syntactic, semantic, discourse). The data-linguist process is question → design → shape → document → analyze; datasheets give a dataset lineage and limits. POS tagging assigns a category per token and is one part of parsing; ambiguity is lexical, syntactic, or pragmatic and needs context (sometimes world knowledge) to resolve. Penn Treebank refines Brown's tags; rule-based, statistical, and neural taggers all fall short of 100%." },
      ],
    },
  ],
};
