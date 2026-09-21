/**
 * Drills for LING 115 · Words, tokens, normalization: token/type counts and
 * TTR on generated sentences, the TTR caveat, and tokenization decisions.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "ling115/5-words-tokens-normalization";

const NOUNS = ["dog", "cat", "bird", "car", "stoop", "star"];
const VERBS = ["saw", "chased", "liked", "found"];

function sentence(r: Rng): string[] {
  const n1 = r.pick(NOUNS);
  const n2 = r.pick(NOUNS.filter((n) => n !== n1));
  const n3 = r.pick(NOUNS);
  const v = r.pick(VERBS);
  const v2 = r.pick(VERBS);
  const shapes = [
    ["the", n1, v, "the", n2, "and", "the", n2, v2, "the", n3],
    ["the", n1, v, "the", "other", n1, "and", "the", "other", n1, v2, "the", n2],
    ["a", n1, "and", "a", n2, v, "the", n3, "and", "the", n3, v2, "a", n1],
  ];
  return r.pick(shapes);
}

export const drills: Drill[] = [
  {
    id: "units!count",
    guideId: G,
    sectionRef: "units",
    title: "Tokens, types, TTR",
    skill: "Count running words (tokens) and distinct words (types); TTR = types/tokens.",
    gen(r) {
      const ws = sentence(r);
      const tokens = ws.length;
      const types = new Set(ws).size;
      const mode = r.pick(["tokens", "types", "ttr"]);
      const text = ws.join(" ");
      if (mode === "tokens")
        return {
          prompt: `"${text}". How many **tokens** (split on spaces, no lemmatizing)?`,
          answer: { kind: "number", value: tokens },
          steps: [`Count every running word, repeats included.`, `${tokens} tokens.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.]/g, ""));
            if (v === types) return "That is the number of types (distinct words). Tokens count every occurrence, repeats included.";
            return undefined;
          },
        };
      if (mode === "types")
        return {
          prompt: `"${text}". How many **types** (distinct wordforms)?`,
          answer: { kind: "number", value: types },
          steps: [`List each distinct word once: ${[...new Set(ws)].join(", ")}.`, `${types} types.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.]/g, ""));
            if (v === tokens) return "That is the token count. Types are the vocabulary: each distinct word counts once no matter how often it appears.";
            return undefined;
          },
        };
      return {
        prompt: `"${text}". What is the **type/token ratio** (TTR), to two decimals?`,
        answer: { kind: "number", value: types / tokens, tolerance: 0.006 },
        steps: [`Tokens: ${tokens}. Types: ${types} (${[...new Set(ws)].join(", ")}).`, `TTR = ${types}/${tokens} = ${(types / tokens).toFixed(2)}.`],
        hint: "Types over tokens, so it is always ≤ 1.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.]/g, ""));
          if (Math.abs(v - tokens / types) < 0.01) return "You divided tokens by types. TTR is types ÷ tokens, so it is at most 1.";
          return undefined;
        },
      };
    },
  },
  {
    id: "heaps!caveat",
    guideId: G,
    sectionRef: "heaps",
    title: "The TTR caveat",
    skill: "TTR falls as a text grows (Heaps' law), so TTRs of different-length texts don't compare.",
    gen(r) {
      const qs = [
        { p: "Alice in Wonderland has TTR ≈ 0.097 and Moby Dick ≈ 0.080. What does that show?", ok: "Nothing about vocabulary size: Moby Dick is much longer, and TTR falls as length grows", bad: ["Carroll had a richer vocabulary than Melville", "Moby Dick has fewer types", "Alice has more tokens"], why: "Heaps' law: vocabulary grows slower than text length, so longer texts always have lower TTR." },
        { p: "You double the length of a corpus. What happens to the number of types?", ok: "It grows, but by less than double (Heaps' law)", bad: ["It doubles", "It stays the same", "It quadruples"], why: "New text mostly reuses known words; new types arrive ever more slowly." },
        { p: "Roughly what fraction of the types in a natural corpus are hapax legomena (occur once)?", ok: "About half", bad: ["About 5%", "About 90%", "Almost none"], why: "The Chance Quiz true/false: hapax legomena are very common." },
        { p: "To compare vocabulary richness fairly between two texts of different lengths you should…", ok: "Compare TTR on equal-sized samples of each", bad: ["Compare their raw TTRs", "Compare their token counts", "Lemmatize the longer one only"], why: "Same length removes the length effect." },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  },
  {
    id: "tokenization!decisions",
    guideId: G,
    sectionRef: "tokenization",
    title: "Tokenization decisions",
    skill: "Where whitespace fails: clitics, compounds, punctuation that carries meaning, MWEs, scripts without spaces.",
    gen(r) {
      const qs = [
        { p: "NLTK's word tokenizer splits *don't* into…", ok: "do + n't", bad: ["don + 't", "don't (one token)", "do + not"], why: "The clitic n't is split off as its own token." },
        { p: "Stripping all punctuation before tokenizing is fine because punctuation carries no information. True or false?", ok: "False", bad: ["True"], why: "Ph.D., $89.99 vs $8999, dates and URLs all change meaning or vanish without their punctuation." },
        { p: "*New York City* in a whitespace tokenizer becomes…", ok: "Three tokens; a multi-word expression needs MWETokenizer or NER to rejoin it", bad: ["One token automatically", "Two tokens: New, York City", "It is dropped as a proper noun"], why: "Whitespace knows nothing about names." },
        { p: "Why is Chinese text hard to tokenize by whitespace?", ok: "It has no spaces between words, so tokenizing needs a theory of wordhood", bad: ["The characters are too many", "It has no punctuation", "Its words are all one character"], why: "姚明进入总决赛: 3, 5, or 7 tokens depending on your theory." },
        { p: "German *Flughafensicherheitskontrolle* is…", ok: "One orthographic word that is several lexical words (a compound)", bad: ["A typo for several words", "One lexical word", "A multi-word expression with spaces removed"], why: "Compounds are one problem whitespace cannot see." },
        { p: "Counting *cat* and *cats* as one unit is counting by…", ok: "Lemma", bad: ["Wordform", "Token", "Hapax"], why: "Same stem, same POS, same basic sense = one lemma; two wordforms." },
        { p: "Which is a wordform, not a lemma?", ok: "*running* (inflected form of the lemma *run*)", bad: ["*run* as the dictionary headword", "the lemma of *ran*", "the type *run*"], why: "Wordforms are the surface, inflected forms." },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  },
];
