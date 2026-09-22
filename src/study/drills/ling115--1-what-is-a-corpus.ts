/**
 * Drills for LING 115 · What a corpus is: the design vocabulary and the
 * named corpora.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling115/1-what-is-a-corpus";

export const drills: Drill[] = [
  {
    id: "design!vocab",
    guideId: G,
    sectionRef: "design",
    title: "Design vocabulary",
    skill: "Population, sampling frame, representativeness, balance, reference vs monitor: define by example.",
    gen(r) {
      const qs = [
        { p: "'Edited American English published in 1961' is Brown's…", ok: "Population", bad: ["Sampling frame", "Balance", "Tagset"] },
        { p: "The concrete set of texts you are allowed to draw from is the…", ok: "Sampling frame", bad: ["Population", "Representativeness", "Monitor corpus"] },
        { p: "How well the sample reflects the variability of the population (registers, speakers, time) is…", ok: "Representativeness", bad: ["Balance", "Size", "Annotation"] },
        { p: "Whether genre proportions in the corpus match their assumed importance in the population is…", ok: "Balance", bad: ["Representativeness", "Sampling frame", "Normalization"] },
        { p: "A fixed snapshot (Brown, 1961) versus one that keeps growing (COCA):", ok: "Reference corpus vs monitor corpus", bad: ["Specialized vs parallel", "Spoken vs written", "Balanced vs learner"] },
        { p: "A corpus of aligned translations is a…", ok: "Parallel corpus", bad: ["Learner corpus", "Monitor corpus", "Spoken corpus"] },
        { p: "Why can 1M-word Brown beat a 1B-word web corpus for a question about 1960s written American English?", ok: "Population match: Brown is that population; the web is a different one, however large", bad: ["Brown is bigger per genre", "The web has no nouns", "Brown is newer"] },
        { p: "Brown's 500 samples across 15 genres, deliberately proportioned, is an example of…", ok: "Balance", bad: ["A monitor corpus", "A sampling frame", "Annotation"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: [`Answer: ${q.ok}.`] };
    },
  },
  {
    id: "design!corpora",
    guideId: G,
    sectionRef: "design",
    title: "Which corpus?",
    skill: "Brown, COCA, Switchboard, TIMIT, Penn Treebank, Google N-grams: match the description.",
    gen(r) {
      const rows = [
        { c: "Brown (1961)", d: "~1M tokens, 500 samples × ~2,000 words, 15 genres, first machine-readable balanced corpus, POS-tagged, in NLTK" },
        { c: "COCA", d: "1B+ words, contemporary American English from the 1990s on, spoken + written, a monitor corpus" },
        { c: "Switchboard", d: "2.4M words of telephone conversations; spoken" },
        { c: "TIMIT", d: "Read speech with phone-level time alignment" },
        { c: "Penn Treebank", d: "Syntactically annotated Wall Street Journal text; the standard tagset" },
        { c: "Google N-grams", d: "1T words of web-scale counts, no full texts" },
      ];
      const it = r.pick(rows);
      return {
        prompt: `Which corpus is this? **${it.d}**`,
        answer: choice(r, it.c, r.sample(rows.filter((x) => x !== it).map((x) => x.c), 3)),
        steps: [`${it.c}: ${it.d}.`],
      };
    },
  },
];
