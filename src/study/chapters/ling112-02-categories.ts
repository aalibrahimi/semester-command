import type { Chapter, Frame } from "../types";

/**
 * LING 112 · Week 2 — Syntactic categories by distribution. Built from the
 * Week 2 handout, the diagnostic quiz, Carnie videos 2.1–2.2, and HW 1.
 */
const labelFrames: Frame[] = [
  { kind: "lines", lines: ["That extremely leathery alligator greatly hopes to be eating us for dinner tonight.", "That → D  (determiner: closed class; sits before adjectives and the noun)", "extremely → Adv  (-ly; modifies an adjective; cannot go between D and N: *the extremely alligator)", "leathery → Adj  (-y; sits between D and N; takes 'very': very leathery)", "alligator → N  (follows D + Adj; takes plural -s: alligators)", "greatly → Adv  (-ly; modifies the verb; *the greatly alligator)", "hopes → V  (3SG -s; follows the subject; can be negated: does not hope)", "to → T  (infinitival 'to', a functional category)", "be → Aux  (auxiliary 'be')", "eating → V  (-ing; follows Aux)", "us → N  (pronoun: pronouns are nouns on her list)", "for → P", "dinner → N  (follows P; plural dinners)", "tonight → Adv  (temporal)"], active: 0, caption: "Handout sentence (3). We'll label left to right, giving a test for each — because 'it's a noun because it's a thing' is not an answer in this course." },
  ...[1,2,3,4,5,6,7,8,9,10,11,12,13].map((a) => ({ kind: "lines" as const, lines: ["That extremely leathery alligator greatly hopes to be eating us for dinner tonight.", "That → D  (determiner: closed class; sits before adjectives and the noun)", "extremely → Adv  (-ly; modifies an adjective; cannot go between D and N: *the extremely alligator)", "leathery → Adj  (-y; sits between D and N; takes 'very': very leathery)", "alligator → N  (follows D + Adj; takes plural -s: alligators)", "greatly → Adv  (-ly; modifies the verb; *the greatly alligator)", "hopes → V  (3SG -s; follows the subject; can be negated: does not hope)", "to → T  (infinitival 'to', a functional category)", "be → Aux  (auxiliary 'be')", "eating → V  (-ing; follows Aux)", "us → N  (pronoun: pronouns are nouns on her list)", "for → P", "dinner → N  (follows P; plural dinners)", "tonight → Adv  (temporal)"], active: a, caption: ["", "'That' is a determiner. Test: it's in the closed list (the, a, this, some, every…), and it's the slot before the adjectives.", "'extremely' ends in -ly and modifies the adjective after it. Adverb. Confirm with the D __ N frame: *'the extremely alligator' fails, so it's not an adjective.", "'leathery': can sit between D and N ('that leathery alligator') and takes 'very'. Adjective. Also derivational -y.", "'alligator' follows a determiner and an adjective, and takes plural -s. Noun.", "'greatly' is -ly, modifies 'hopes', and can't sit between D and N. Adverb (manner).", "'hopes' carries the 3SG -s inflection, follows the subject, and can be negated with 'not' via do-support. Verb.", "'to' before a bare verb is the functional category T (tense/infinitive marker), not a preposition — no noun follows it.", "'be' is an auxiliary. Aux is a functional category on her list (have, be, do).", "'eating' carries -ing and follows Aux 'be'. Verb.", "'us' is a pronoun. Her Week 2 list puts pronouns under N (they, him, who, what).", "'for' is a preposition — closed class, followed by a noun phrase.", "'dinner' follows P and takes plural -s. Noun.", "'tonight' is a temporal adverb; it modifies the verb phrase and can't sit between D and N."][a] })),
];

export const ling112Categories: Chapter = {
  slug: "2-categories",
  label: "Week 2",
  title: "Syntactic categories by distribution",
  source: "Week 2 handout (Syntactic categories), the diagnostic quiz, Carnie videos 2.1–2.2 (Parts of Speech), HW 1.",
  goal: "Label every word in a sentence with one of eleven categories and, for any word, give a morphological or syntactic test that proves the label — the way HW 1 and the oral exam require.",
  minutes: 55,
  requires: ["0-what-syntax-is"],
  sections: [
    {
      id: "why",
      title: "Why not 'a noun is a person, place or thing'",
      blocks: [
        { id: "why-1", t: "why", slide: "Meaning can't tell you the category", title: "The handout's opening argument", text: "'I *walked* quickly around the park' and 'I took three quick *walks* around the park' describe the same event. Same meaning, but *walked* is a verb and *walks* is a noun. Tagalog does it the other way: *Matalino ang doktor* ('the doctor is smart') and *Doktor ang matalino* ('the smart one is a doctor') swap which word is the predicate. If meaning decided category, none of that could happen. So category is decided by **distribution**: where the word can appear and what can attach to it." },
        { id: "why-2", t: "def", term: "Distribution", text: "The contexts a linguistic expression appears in. **Morphological distribution**: which morphemes (affixes) it can carry. **Syntactic distribution**: which other words it can co-occur with. The category of a word is determined by how it behaves, not what it means." },
        { id: "why-3", t: "p", slide: "Two kinds of affix", text: "**Derivational** morphemes *create* a word of a category: -tion makes nouns (isolat-ion), -ize makes verbs (real-ize), -able makes adjectives (read-able). **Inflectional** morphemes attach to a category *without changing it*: plural -s on nouns, -ed/-ing/-s on verbs, -er/-est on adjectives. Both are tests: if a word takes -est, it's an adjective; if it takes plural -s, it's a noun." },
      ],
    },
    {
      id: "list",
      title: "The eleven categories",
      blocks: [
        { id: "l-1", t: "p", slide: "Lexical vs functional", text: "**Lexical** categories carry content and are **open class** — new words get coined (the handout cites 'rage-bait', 'chopped'). **Functional** categories carry grammar and are **closed class** — you can't invent a new preposition. Functional words matter for tests because they create the *context* the lexical words appear in: a determiner tells you a noun is coming." },
        { id: "l-2", t: "table", slide: "Her list, verbatim", rows: [
          ["Category", "Abbrev.", "Examples from the handout"],
          ["Noun", "N", "granola, computer, party, joy, action, Jake, they, him, who, what"],
          ["Verb", "V", "run, arrive, laugh, know, love, think, say, spray"],
          ["Adjective", "Adj", "big, yellow, stable, intelligent, legal, fake"],
          ["Adverb", "Adv", "badly, curiously, possibly, often, very, really, tomorrow"],
          ["Preposition", "P", "on, of, by, through, into, from, for, to, with"],
          ["Determiner", "D", "the, a, this, some, every, two, thirteen, his, our, which"],
          ["Complementizer", "C", "that, if, whether"],
          ["Auxiliary", "Aux", "have, be, do"],
          ["Modal", "Mod", "will, would, can, could, may, might, should"],
          ["Tense", "T", "to (the infinitive marker)"],
          ["Negation", "Neg", "not"],
        ] },
        { id: "l-3", t: "warn", title: "Three traps in that list", text: "Pronouns (they, him) and wh-words used as arguments (who, what) are **nouns**. Possessives (his, our) and numbers (two) are **determiners**. Infinitival *to* is **T**, not a preposition — 'to eat' vs 'to Paris': only the second is P." },
      ],
    },
    {
      id: "tests",
      title: "The tests, category by category",
      blocks: [
        { id: "t-1", t: "table", slide: "The test table — this is what you cite", rows: [
          ["Category", "Morphological (affixes it takes)", "Syntactic (where it sits)"],
          ["Verb", "Deriv: -ate, -ize, -ify · Infl: -s, -ed, -ing, -en", "follows a subject; follows Aux / Mod / T ('will run', 'to run'); follows adverbs; can be negated with 'not'"],
          ["Noun", "Deriv: -ment, -ness, -(i)ty, -(t)ion, -hood, -ism · Infl: plural -s, possessive 's", "follows determiners and adjectives ('the big __'); can be negated with 'no' ('no computers')"],
          ["Adjective", "Deriv: -ing, -ive, -able, -al, -ish, -some, -(i)an, -ful, -less, -y · Infl: -er, -est", "sits between D and N ('the __ dog'); follows degree adverbs ('very __')"],
          ["Adverb", "Deriv: -ly · Infl: none", "CANNOT sit between D and N; follows degree adverbs ('very __')"],
        ] },
        { id: "t-2", t: "warn", title: "'very' doesn't separate Adj from Adv", text: "'very quick' and 'very quickly' both work. To split them use the D __ N frame: 'the quick run' ✓ vs '*the quickly run' ✗. Adjectives go between a determiner and a noun; adverbs never do. That one frame decides most of the diagnostic quiz." },
        { id: "t-3", t: "stepper", slide: true, title: "Labeling handout sentence (3) with a test per word", frames: labelFrames },
      ],
    },
    {
      id: "props",
      title: "Grammatical properties (the cross-linguistic part)",
      blocks: [
        { id: "p-1", t: "p", slide: "Why this section exists", text: "The tests above are for English. The handout's second half lists the properties categories tend to have in *any* language, so you can identify categories in Zulu or Japanese data on a homework — and so you can explain, on the oral exam, what makes a verb a verb across languages." },
        { id: "p-2", t: "list", slide: "Verbs", items: [
          "**Argument structure (valency)**: how many obligatory participants. Intransitive = 1 ('Ming sneezed'), transitive = 2 ('Sarah helped Ming'), ditransitive = 3 ('Taro gave the child a book'). Some verbs drop objects ('I ate').",
          "**Tense**: past / present / future — where the event sits in time.",
          "**Aspect**: ongoing vs completed — 'is helping' (progressive), 'has helped' (perfect).",
          "**Agreement**: features of an argument copied onto the verb. English: 3SG -s. Zulu (handout (9)): noun-class prefixes on the verb — *aba-ntu **ba**-bona um-fana* 'the people see the boy', with *ba-* agreeing with class 2 'people'.",
          "**Modality**: should, must — hypothetical scenarios.",
        ] },
        { id: "p-3", t: "list", slide: "Nouns", items: [
          "**Definiteness**: a car / that car / Sarah's car.",
          "**Number**: singular/plural — and Hebrew has a **dual**: *yom* (day), *yomáyim* (two days), *yamim* (days).",
          "**Gender / noun class**: Italian *il libro* (M) / *la casa* (F) — grammatical, not always semantic.",
          "**Case**: marks the noun's role. English only on pronouns (he/him). Japanese on every noun: *-ga* NOM, *-o* ACC, *-ni* DAT — which is why Japanese word order is free: *Hanako-ga Taro-o* and *Taro-o Hanako-ga* both mean Hanako hit Taro.",
        ] },
        { id: "p-4", t: "list", slide: "Adjectives and adverbs", items: [
          "Adjectives: **predicative** ('the car is fast') vs **attributive** ('a fast car'); **agreement** (French *vin blanc* / *porte blanche*); **comparative/superlative** (heavier/heaviest, more/most beautiful); take **degree adverbs** (very, too, quite).",
          "Adverb types: modal (possibly), manner (slowly), frequency (often), temporal (yesterday), degree (very). Only -ly derivation, no inflection.",
        ] },
        { id: "p-5", t: "prof", title: "Arabic for the oral exam", text: "Arabic shows nearly every property on the handout in one sentence: *al-bint-u l-ṣaġīr-at-u qaraʔ-at kitāb-a-hā* ('the little girl read her book'). Definiteness (*al-*), gender agreement on the adjective (*-at*), case (*-u* NOM, *-a* ACC), verb agreement (*-at* 3SG.F), a possessive clitic (*=hā*). Bring one glossed Arabic sentence and you can demonstrate five properties in a minute." },
      ],
    },
    {
      id: "practice",
      title: "Practice: the diagnostic quiz and handout (23)–(24)",
      blocks: [
        { id: "pr-1", t: "worked", slide: "Diagnostic quiz Q1", title: "Maurice very slowly dried the dishes with some worn red towels.", problem: "Label every word; justify the hard ones.", steps: [
          "Maurice N (proper noun; takes possessive 's) · very Adv (degree) · slowly Adv (-ly; *'the slowly dishes') · dried V (-ed; follows the subject) · the D · dishes N (plural -s; follows D) · with P · some D · worn Adj (between D and N; 'very worn') · red Adj (between D and N; 'redder') · towels N (plural; follows D + Adj + Adj).",
          "The diagnostic's Q2 asked for three multi-word constituents: 'the dishes', 'some worn red towels', 'with some worn red towels'. Why those count is Week 5's topic.",
        ] },
        { id: "pr-2", t: "try", q: "Handout (24): 'My anxious neighbors have just told me that their new roof caught on fire.' Label the functional categories.", a: "My D · have Aux · that C · their D · on P. (just is Adv; anxious, new Adj; neighbors, me, roof, fire N; told, caught V.)" },
        { id: "pr-3", t: "try", q: "Handout (23): 'Every professor likely knows that students prefer to have shorter assignments.' What are 'likely', 'to', and 'shorter', with a test each?", a: "likely = Adv (modal adverb; *'the likely professor' in this sense fails the D__N frame as an adverb — note 'likely' can also be an Adj elsewhere; here it modifies 'knows'). to = T (infinitive marker before bare 'have'). shorter = Adj (comparative -er; sits between D and N: 'the shorter assignments')." },
        { id: "pr-4", t: "try", q: "'Book' in 'Book me a flight' vs 'the book with the yellow cover'. Same category?", a: "No. First: V — follows nothing but takes an object, can be negated ('don't book'), takes -ed. Second: N — follows D, takes plural. Same form, two categories, decided by distribution. (This is also Ling 115's POS-tagging example.)" },
        { id: "pr-5", t: "def", term: "Syntactic category", text: "A class of words that share a distribution — the same affixes and the same positions. Lexical categories (N, V, Adj, Adv) are open; functional categories (P, D, C, Aux, Mod, T, Neg) are closed. Every label you give must be backed by a morphological or syntactic test." },
      ],
    },
  ],
};
