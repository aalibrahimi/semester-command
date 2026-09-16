import type { Chapter, Frame } from "../types";

/**
 * LING 115 · Lectures 5–6 — What counts as a word: tokens, types, lemmas,
 * TTR, Heaps' law; tokenization and normalization as linguistic decisions.
 * Built from Kraus's Lecture 5 and 6 slides (the normalization table on
 * slide 28, shown three times), J&M ch. 2, and the chance quizzes.
 */

/** Counting tokens and types in "a rose is a rose is a rose". */
const ttrFrames: Frame[] = [
  { kind: "array", cells: ["a", "rose", "is", "a", "rose", "is", "a", "rose"], note: "8 tokens", caption: "Gertrude Stein's line, split on spaces. Every word you can point at is a **token** — an instance. Count them: 8. (Kraus's slide counts the full 'a rose is a rose is a rose' line as 10 tokens with 'rose' at the start; the method is what matters.)" },
  { kind: "array", cells: ["a", "rose", "is", "a", "rose", "is", "a", "rose"], hl: [0], done: [3, 6], note: "type 1: a  (3 tokens)", caption: "Now count **types** — distinct words. 'a' appears three times but is one type." },
  { kind: "array", cells: ["a", "rose", "is", "a", "rose", "is", "a", "rose"], hl: [1], done: [4, 7], note: "type 2: rose  (3 tokens)", caption: "'rose': three tokens, one type." },
  { kind: "array", cells: ["a", "rose", "is", "a", "rose", "is", "a", "rose"], hl: [2], done: [5], note: "type 3: is  (2 tokens)", caption: "'is': two tokens, one type. That's every word accounted for. **3 types, 8 tokens.**" },
  { kind: "lines", lines: ["TTR = types / tokens", "= 3 / 8 = 0.375"], active: 1, caption: "**Type–token ratio.** Low TTR means lots of repetition; high TTR means varied vocabulary. Stein's line is deliberately repetitive. The first line of Wikipedia's 'Rose' article scores about 0.92 — almost every word is new." },
  { kind: "lines", lines: ["Switchboard (2.4M tokens): 0.0083", "Shakespeare (884K): 0.0351", "COCA (1B+): 0.00455", "Google N-grams (1T): 0.000013"], active: 0, caption: "Real corpora. Notice the pattern: **the bigger the corpus, the lower the TTR**. That's not because Google's English is boring. It's because vocabulary grows slower than text (next section), so tokens outrun types. TTR is only comparable between texts of similar size — Kraus's caveat about Alice vs Moby Dick." },
];

/** Heaps' law: types grow sub-linearly. */
const heapsFrames: Frame[] = [
  { kind: "lines", lines: ["V(n) = K · n^β", "V = number of types (vocabulary)", "n = number of tokens", "K ≈ 10–100,  β ≈ 0.4–0.6"], active: 0, caption: "**Heaps' law.** Read it as: 'vocabulary size is some constant times the token count raised to a power less than 1.' The power less than 1 is the whole message." },
  { kind: "lines", lines: ["if β were 1:  double the text → double the types", "β ≈ 0.5:  double the text → ×2^0.5 ≈ ×1.4 the types", "β ≈ 0.5:  100× the text → ×10 the types"], active: 1, caption: "A power of 1 would mean every new chunk of text brings as many new words as the first chunk. A power around 0.5 (a square root) means new words come more and more slowly — you keep seeing the same common words, and only occasionally a new rare one." },
  { kind: "lines", lines: ["n = 1,000     → V ≈ 30 · 1000^0.5 ≈ 950", "n = 10,000    → V ≈ 30 · 100     = 3,000", "n = 1,000,000 → V ≈ 30 · 1000    = 30,000"], active: 0, caption: "With K = 30, β = 0.5: a thousand-fold increase in text gives roughly a thirty-fold increase in vocabulary. Diminishing returns for rare words — which is why a 1-million-word corpus like Brown already has most of the common vocabulary, and why hapax legomena (words seen once) are so common: the tail never fills in." },
  { kind: "lines", lines: ["'dirty' data inflates V:", "sooooo · pls · thx · teh · Rose/rose/ROSE", "each counts as a new type unless you decide otherwise"], active: 0, caption: "The catch: typos, stretched spellings, and case variants all look like new types to a computer. Whether they *are* new types is a decision — which is what the rest of this chapter is about." },
];

export const ling115Words: Chapter = {
  slug: "5-words-tokens-normalization",
  label: "Lectures 5–6",
  title: "What counts as a word: tokens, types, TTR, tokenization, normalization",
  source: "Lecture 5 (Sep 8) and Lecture 6 (Sep 10) slides, J&M ch. 2.1–2.6, chance quizzes.",
  goal: "Distinguish lemma / wordform / type / token and compute TTR; explain Heaps' law and why TTR only compares equal-size texts; list where whitespace tokenization fails; reproduce the normalization table and give three examples of what cleaning erases.",
  minutes: 55,
  requires: ["4-regex"],
  sections: [
    {
      id: "why",
      title: "Why 'what is a word' is a real question",
      blocks: [
        { id: "why-1", t: "why", slide: "The course's thesis", title: "Every technical choice is a linguistic claim", text: "Before you can count words, you have to decide what a word is — and every answer erases something. Is *San Francisco* one word or two? Is *don't* one? Are *Apple* and *apple* the same? Kraus's line: **'Tokenization is an analytic decision, not a neutral preprocessing step.'** Her chance-quiz questions almost all have the same shape: *true or false about a definition*, then *give one example of what a choice preserves or erases*. This chapter is that answer bank." },
      ],
    },
    {
      id: "units",
      title: "Lemma, wordform, type, token",
      blocks: [
        { id: "u-1", t: "list", slide: "Four words for 'word'", items: [
          "**Lemma**: the dictionary headword — same stem, same part of speech, same basic sense. *cat* and *cats* are one lemma.",
          "**Wordform**: the fully inflected surface form. *cat* and *cats* are two wordforms.",
          "**Type**: a distinct element of the vocabulary V. Whether types are counted as lemmas or wordforms is a decision.",
          "**Token**: one instance of a type in running text. Counting tokens gives n, the text length.",
          "**Hapax legomena**: types that occur exactly once in a corpus. In natural text, roughly half the vocabulary is hapax.",
        ] },
        { id: "u-2", t: "stepper", slide: true, title: "Counting types and tokens; computing TTR", frames: ttrFrames },
        { id: "u-3", t: "worked", slide: "Her 16-token example", title: "'they sat back on their San Francisco stoop and looked up at the stars and their'", problem: "How many tokens, how many types?", steps: [
          "Split on spaces: 16 tokens. If *San Francisco* is one multi-word token: 15. Already a decision.",
          "Types: *and* appears twice, *their* twice. 16 − 2 = 14 types. Treat *San Francisco* as one: 13. Lemmatize *stars* → *star*, *looked* → *look*? Still 13 here (no collisions), but in a longer text lemmatizing shrinks V.",
          "There's no single right count. The right answer names the decisions: 'Sixteen tokens on whitespace, fourteen types as wordforms; fifteen and thirteen if multi-word place names are one token.'",
        ] },
        { id: "u-4", t: "try", q: "Compute TTR for 'the dog saw the other dog and the other dog saw the cat'.", a: "13 tokens. Types: the, dog, saw, other, and, cat = 6. TTR = 6/13 ≈ 0.46." },
        { id: "u-5", t: "try", q: "Chance quiz: separate the morphemes in *rewriting* and *undermined*. And: T/F, hapax legomena are very common in corpora.", a: "re-writ(e)-ing; under-mine-(e)d. True — around half of all types in a natural corpus occur once." },
      ],
    },
    {
      id: "heaps",
      title: "Heaps' law: why vocabulary grows slowly",
      blocks: [
        { id: "h-1", t: "stepper", slide: true, title: "V(n) = K·nᵝ, read slowly", frames: heapsFrames },
        { id: "h-2", t: "warn", title: "The TTR caveat (a likely midterm question)", text: "Alice in Wonderland TTR ≈ 0.097; Moby Dick ≈ 0.080. That does **not** mean Melville had a smaller vocabulary. Moby Dick is about eight times longer, and by Heaps' law tokens grow faster than types, so its ratio *must* be lower. TTR only compares texts of similar length. To compare different lengths, use a fixed window (TTR over the first 10,000 tokens of each) or a size-corrected measure." },
        { id: "h-3", t: "p", slide: "Why frequency matters at all", text: "Frequency reveals things the words alone don't: register (formal text uses *however*; chat uses *lol*), speaker age, subject matter, dialect. A frequency list is the first thing a corpus linguist looks at — and every number in it depends on the tokenization and normalization decisions below." },
      ],
    },
    {
      id: "tokenization",
      title: "Tokenization: where whitespace fails",
      blocks: [
        { id: "t-1", t: "def", term: "Tokenization", text: "Breaking a continuous stream of text into meaningful units (tokens). The questions to ask: where are the boundaries? what are the minimal units? what linguistic structure does this preserve or erase?" },
        { id: "t-2", t: "list", slide: "Five places 'split on spaces' breaks", items: [
          "**Scripts without spaces.** Chinese 姚明进入总决赛 — is that 3, 5, or 7 tokens? 'Tokenization requires a theory of wordhood.' Japanese mixes four writing systems and needs a lexicon-based segmenter; Thai, Burmese, Ge'ez similar.",
          "**Compounds.** German *Flughafensicherheitskontrolle* (airport security check) is one orthographic word and three or four lexical ones.",
          "**Punctuation that carries meaning.** *Ph.D.*, *W.H.O.* (one unit each); *$89.99* vs *$8999*; *1/25/2026*; URLs and emails. Strip punctuation and these change meaning or vanish.",
          "**Clitics.** *we're*, *I'm*, *don't*; French *j'ai*; Spanish *dámelo* (give-me-it). One word or two or three? NLTK splits *don't* into *do* + *n't*.",
          "**Multi-word expressions.** *New York City*, *father-in-law*, *back and forth*. NLTK splits them (MWETokenizer can rejoin from *your* list); spaCy splits, then recovers spans via named-entity recognition and noun chunks; Penn Treebank tags each piece and keeps the unit in the tree.",
        ] },
        { id: "t-3", t: "try", q: "Chance quiz: T/F — it's fine to remove all punctuation when tokenizing, since punctuation doesn't tell you anything important.", a: "False. Punctuation marks conventional units (Ph.D.), encodes magnitude and currency ($89.99), carries structure (dates, URLs), and delimits sentences. Removing it changes meaning before the analysis starts." },
      ],
    },
    {
      id: "normalization",
      title: "Normalization: what to standardize and what to keep",
      blocks: [
        { id: "n-1", t: "def", term: "Normalization", text: "Making different surface forms comparable by mapping them to a standard representation. 'Tokenization feeds normalization.' The question is never *whether* to normalize but *which variation is noise for your question and which variation is the data*." },
        { id: "n-2", t: "table", slide: "The normalization table (slide 28 — shown three times)", rows: [
          ["Type of variation", "Example", "Treatment"],
          ["Noise", "typos, stray punctuation, HTML tags", "Remove / normalize"],
          ["Orthographic", "color / colour, e-mail / email, st. / street", "Normalize selectively"],
          ["Morphosyntactic", "don't → do not, gonna → going to, yeah / yah / ya", "Normalize selectively"],
          ["Sociolinguistic / register", "lol, u vs you, texting shorthand", "PRESERVE"],
          ["Dialect / regional", "y'all, sittin, innit", "PRESERVE"],
          ["Formatting / structural", "#fyp, <body>, https://…", "Normalize if it interferes"],
        ] },
        { id: "n-3", t: "why", slide: "The pattern in the table", title: "Why the bottom rows say PRESERVE", text: "The rows to normalize are variation that *doesn't correlate with anything linguistic* — a typo tells you nothing about the writer. The rows to preserve are variation that *is* linguistic evidence: register, dialect, identity. If your research question is about those, normalizing them away deletes your data. If it isn't, they're noise. The table isn't a rule; it's a way of asking 'what is my question?' before touching the text." },
        { id: "n-4", t: "list", slide: "What cleaning erases (Lecture 7's list — the quiz answer bank)", items: [
          "**Removing emojis** erases pragmatic cues: 'Excellent, another meeting 🙄' is sarcastic; without the emoji it's sincere.",
          "**Lowercasing** erases proper-noun and category signals: *Apple* vs *apple*; German *Essen* (food, noun) vs *essen* (to eat, verb) — capitalization *is* the part of speech.",
          "**Spell-correcting / standardizing** erases identity, dialect, expertise, play: 'yall be trippin lol' → 'you all are tripping' loses everything the writer chose.",
          "**Removing punctuation** collapses *Ph.D.*, *$8.99*, sentence boundaries, *tl;dr*.",
          "**Expanding numbers** is ambiguous: '1915 J St' — nineteen fifteen? one-nine-one-five? 'roll two sixty four sided dice' — 264? 2 × 64? 260 × 4?",
        ] },
        { id: "n-5", t: "list", slide: "Two distinctions she names", items: [
          "**Preprocessing vs annotation**: preprocessing is technical access (strip HTML, tokenize, split sentences); annotation is linguistic interpretation (POS tags, parses, sentiment). Next chapter.",
          "**Lossless vs lossy**: lossless shaping is reversible — the original is recoverable. Lossy is not — lowercasing, emoji removal, stemming all discard information for good. Prefer keeping the raw text and deriving normalized *views* of it.",
        ] },
        { id: "n-6", t: "try", q: "Chance quiz: give one example of how lowercasing or removing emojis can alter or erase linguistic information.", a: "Lowercasing: *Apple* (company) → *apple* (fruit) loses the named-entity distinction; German *Essen/essen* loses noun vs verb. Emoji: 🙄 flips sincerity to sarcasm." },
        { id: "n-7", t: "try", q: "Is stemming lossy or lossless? Why does it matter for a dialect study?", a: "Lossy — *running, runner, runs* → *run* can't be reversed. A dialect study needs surface forms (*sittin* vs *sitting*), so stemming or spell-normalizing would erase the very variable under study." },
        { id: "n-8", t: "def", term: "Lectures 5–6 in one paragraph", text: "Tokens are instances, types are distinct forms, lemmas are headwords; TTR = types/tokens and falls with length because vocabulary grows as K·nᵝ with β < 1 (Heaps). Whitespace tokenization fails on unspaced scripts, compounds, meaningful punctuation, clitics, and multi-word expressions. Normalize noise and orthography; preserve register and dialect. Every cleaning step is lossy or lossless, and every lossy step is a linguistic claim — name what it erases." },
      ],
    },
  ],
};
