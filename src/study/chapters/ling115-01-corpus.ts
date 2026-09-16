import type { Chapter } from "../types";

/**
 * LING 115 · Weeks 1–2 — What a corpus is, design, representativeness.
 * The week 1–2 Canvas modules are locked behind the Syllabus Quiz, so this is
 * reconstructed from the syllabus topics and the assigned readings (Grabowski
 * 2023; Weisser 2015 ch. 3; Leech 2004) plus the corpora Kraus names later.
 * Once the module unlocks, check it against her slides.
 */
export const ling115Corpus: Chapter = {
  slug: "1-what-is-a-corpus",
  label: "Weeks 1–2",
  title: "What a corpus is, and what makes one good",
  source: "Syllabus, Grabowski (2023), Weisser (2015) ch. 3, Leech (2004); week 1–2 slides once the Syllabus Quiz unlocks them.",
  goal: "Define corpus, representativeness, balance, and sampling frame; describe Brown, COCA, Switchboard, TIMIT, and the Penn Treebank in one line each; explain why a small balanced corpus can beat a huge web corpus.",
  minutes: 30,
  sections: [
    {
      id: "why",
      title: "Why not just use all the text on the internet?",
      blocks: [
        { id: "why-1", t: "why", slide: "Size is not evidence", title: "The idea", text: "Suppose you want to know how 1960s American newspapers used the word *nuclear*. A trillion words of web text won't tell you — wrong decade, wrong register, unknown authors, duplicated spam, and no way to say what fraction is news. A **corpus** is the fix: a collection of texts chosen *on purpose*, so that what you count in the sample says something about the language you actually care about. The design questions — what population, what proportions, how sampled — are the whole discipline. Everything later (regex, tokens, tagging) is machinery for asking questions of a well-built corpus." },
        { id: "why-2", t: "def", term: "Corpus", text: "A large, principled, machine-readable collection of naturally occurring language, built to be representative of some language or variety, and used as the basis of linguistic analysis. Plural *corpora*." },
      ],
    },
    {
      id: "design",
      title: "Design vocabulary",
      blocks: [
        { id: "d-1", t: "list", slide: "The terms", items: [
          "**Population**: the language or variety you want to make claims about (edited American English published in 1961).",
          "**Sampling frame**: the concrete set of texts you're allowed to draw from to stand in for the population.",
          "**Representativeness**: how well the sample reflects the *variability* of the population — across text types, registers, speakers, time.",
          "**Balance**: whether the proportions of text types in the corpus match their (assumed) importance in the population. Brown: 500 samples across 15 genres, deliberately proportioned.",
          "**Reference vs monitor corpus**: a reference corpus is a fixed snapshot (Brown, 1961); a monitor corpus keeps growing (COCA).",
          "**Specialized, learner, parallel, spoken**: built for one domain, for learner language, for aligned translations, or from transcribed speech.",
        ] },
        { id: "d-2", t: "table", slide: "The corpora she names (one line each)", rows: [
          ["Corpus", "Size", "What it is"],
          ["Brown (1961)", "~1M tokens", "500 × ~2,000-word samples, 15 genres of edited American English; first machine-readable balanced corpus; POS-tagged; in NLTK"],
          ["COCA", "1B+", "Contemporary American English, 1990s on; spoken + written; monitor corpus; english-corpora.org"],
          ["Switchboard", "2.4M", "Telephone conversations; spoken"],
          ["TIMIT", "—", "Read speech with phone-level time alignment (LING 124 territory)"],
          ["Penn Treebank", "—", "Syntactically annotated Wall Street Journal text; the standard tagset"],
          ["Google N-grams", "1T", "Web-scale counts, no full texts"],
          ["Shakespeare", "884K", "Complete works; closed, historical"],
        ] },
        { id: "d-3", t: "worked", slide: "Small and balanced vs huge and messy", title: "Why Brown can beat the web", problem: "Why might a 1-billion-word web corpus be *less* useful than the 1-million-word Brown Corpus for a question about 1960s written American English?", steps: [
          "Population match: Brown *is* edited 1961 American English; the web is mostly not.",
          "Balance: Brown's genre proportions are known and deliberate; the web's are unknown and skewed.",
          "Documentation: Brown's design is published; a web crawl has no datasheet (Lectures 7–8).",
          "Annotation: Brown is POS-tagged; a raw crawl isn't.",
          "Size helps only for rare phenomena — and only if the sample is of the right thing.",
        ], answer: "Representativeness, balance, documentation, and annotation beat raw size." },
        { id: "d-4", t: "prof", title: "Grabowski's question (a Reading Response option)", text: "'Statistician, programmer, data scientist — who is, or should be, a corpus linguist in the 2020s?' Kraus's answer across the semester: the linguist as **data architect** — someone who designs the dataset around the research question, rather than taking a dataset and asking what can be done with it." },
        { id: "d-5", t: "try", q: "You want to study how teenagers use *like* in speech. Name the population, a plausible sampling frame, and one balance decision.", a: "Population: spoken English of teenagers (say, 13–19, US, 2020s). Sampling frame: recorded conversations you can legally collect — e.g. consented recordings from several schools. Balance: equal proportions by age band, gender, and region, so no one group dominates the counts." },
      ],
    },
  ],
};
