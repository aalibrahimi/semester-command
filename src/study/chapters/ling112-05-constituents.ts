import type { Chapter, Frame } from "../types";

/**
 * LING 112 · Week 5 — Constituent structure and constituency tests. The
 * Quiz 2 material (due Mon Sep 21 noon). Built from the Week 5 handout and
 * TrevTutor 'Constituents and Constituency Tests'.
 */
const S = "Those tall spies in the garden will quickly stash the evidence after midnight.";
const testFrames: Frame[] = [
  { kind: "lines", lines: [S, "[Those tall spies in the garden] → They will quickly stash the evidence after midnight.  ✓ NP", "those tall [spies in the garden] → those tall ones  ✓ N-bar", "[in the garden] → there  ✓ PP", "will [quickly stash the evidence after midnight] → will do so  ✓ VP", "[the evidence] → it  ✓ NP", "[after midnight] → then  ✓ PP", "[spies in] → ???  ✗   [stash the] → ???  ✗   [evidence after] → ???  ✗"], active: 0, caption: "Handout sentence (3). First test: substitution. We try to replace a string with a single pro-form. If a pro-form fits, the string is a unit." },
  ...[1,2,3,4,5,6,7].map((a) => ({ kind: "lines" as const, lines: [S, "[Those tall spies in the garden] → They will quickly stash the evidence after midnight.  ✓ NP", "those tall [spies in the garden] → those tall ones  ✓ N-bar", "[in the garden] → there  ✓ PP", "will [quickly stash the evidence after midnight] → will do so  ✓ VP", "[the evidence] → it  ✓ NP", "[after midnight] → then  ✓ PP", "[spies in] → ???  ✗   [stash the] → ???  ✗   [evidence after] → ???  ✗"], active: a, caption: ["", "'They' replaces the whole subject. A pronoun stands in for a noun phrase, so 'those tall spies in the garden' is an NP constituent — including the PP inside it.", "'ones' replaces 'spies in the garden' but leaves 'those tall' outside. That smaller unit — a noun with its complements/adjuncts but without the determiner — is what she calls an N (N-bar) constituent.", "'there' replaces 'in the garden'. Pro-form for a place PP.", "'do so' replaces everything after the modal 'will'. That's the verb phrase — the verb with all its dependents. Note: 'do so' also works for 'stash the evidence after midnight' without 'quickly': adverbs attach to the VP, so both are VPs.", "'it' replaces 'the evidence'. Another NP.", "'then' replaces 'after midnight'. Time PP.", "No pro-form stands for 'spies in', 'stash the', or 'evidence after'. They aren't units. Substitution fails, and — spoiler — so will every other test."][a] })),
];

export const ling112Constituents: Chapter = {
  slug: "5-constituency-tests",
  label: "Week 5",
  title: "Constituent structure and constituency tests",
  source: "Week 5 handout (Constituent structure), TrevTutor 'Constituents and Constituency Tests', the Sep 15 and 17 classes. Quiz 2 covers this.",
  goal: "Given any sentence, find its constituents and PROVE each one with a named test — substitution, movement, or fragment answer — and use the tests to pull apart a structurally ambiguous sentence.",
  minutes: 60,
  requires: ["4-heads-dependents"],
  sections: [
    {
      id: "why",
      title: "What a constituent is",
      blocks: [
        { id: "why-1", t: "why", slide: "The question", title: "Which groups of words are real?", text: "Week 4 said sentences are built from phrases. But look at 'Several large books fell to the ground with a loud thud' and ask: is 'books fell' a phrase? Is 'to the ground'? Is 'ground with'? You can't tell by looking — every adjacent pair of words *looks* like a group. You need a way to test whether a string of words actually behaves as one unit. That test-based notion is what a constituent is." },
        { id: "why-2", t: "def", term: "Constituent", text: "Any linguistic expression that behaves as a syntactic unit. A single word is trivially a constituent; the tests are for multi-word strings. **Constituency tests** are diagnostics: substitution, movement, and fragment answer. Not every constituent passes every test — 'you may need to try multiple tests before you find one that works' — but a string that passes *any* test is a constituent." },
        { id: "why-3", t: "p", text: "The logic is the same as Week 2's: we defined categories by distribution, not meaning. Now we define units by *behavior*, not by looks. If a string can be replaced by one word, moved as a block, or stand alone as an answer, the grammar is treating it as one thing." },
      ],
    },
    {
      id: "sub",
      title: "Test 1 · Substitution with a pro-form",
      blocks: [
        { id: "s-1", t: "table", slide: "Pro-forms by constituent type (handout §1.1)", rows: [
          ["If the string is a…", "It can be replaced by", "Example"],
          ["NP (noun phrase)", "she, he, they, them, it, something", "[the evidence] → it"],
          ["N (N-bar: noun + its dependents, minus D)", "one(s), thing(s)", "those tall [spies in the garden] → those tall ones"],
          ["V / VP (verb + its dependents)", "do so (too), did so (too)", "will [stash the evidence] → will do so"],
          ["PP (prepositional phrase)", "here, there, then", "[in the garden] → there; [after midnight] → then"],
        ] },
        { id: "s-2", t: "stepper", slide: true, title: "Running substitution on handout (3)", frames: testFrames },
        { id: "s-3", t: "warn", title: "The 'ones' trap", text: "'ones' replaces the noun and everything attached to it *except the determiner*: 'those tall ones' works, but '*ones in the garden' for 'those tall spies in the garden' does not. That's why she distinguishes NP (with D) from N-bar (without). It's also the first sign that 'tall' and 'in the garden' attach at a level below the determiner — which becomes X-bar theory in Week 7." },
      ],
    },
    {
      id: "move",
      title: "Test 2 · Movement",
      blocks: [
        { id: "m-1", t: "p", slide: "If it moves as a block, it's a block", text: "Move the string somewhere else in the sentence. If the result is grammatical, the string traveled as a unit — which means it *is* a unit. Two ways to move things in English:" },
        { id: "m-2", t: "list", slide: "Two movement tests (handout §1.2)", items: [
          "**Topicalization** — put the string at the front: 'The evidence, those tall spies will quickly stash after midnight.' ✓ (NP). 'After midnight, those tall spies will stash the evidence.' ✓ (PP). '*Stash the, those spies will evidence after midnight.' ✗",
          "**It-clefting** — 'It's X that/who Y': 'It's the evidence that those spies will stash after midnight.' ✓. 'It's after midnight that they'll stash it.' ✓. 'It's in the garden that the spies are.' ✓ (PP). '*It's spies in that those tall the garden will…' ✗",
        ] },
        { id: "m-3", t: "warn", title: "A failed movement test proves nothing", text: "Handout: 'Some constituents are too deeply embedded within other constituents to undergo movement.' '*The garden, those tall spies in will stash the evidence' fails — but 'the garden' IS a constituent (substitution: 'in it'). Movement can only give you a yes. If it says no, try another test before concluding anything." },
      ],
    },
    {
      id: "frag",
      title: "Test 3 · Fragment answer",
      blocks: [
        { id: "f-1", t: "p", slide: "Can it answer a question alone?", text: "Ask a wh-question about the sentence. If the string can be the whole answer, standing alone, it's a constituent — because only units can be pronounced in isolation." },
        { id: "f-2", t: "worked", slide: "Fragment answers for handout (3)", title: "Question → fragment", problem: S, steps: [
          "Who will stash the evidence? — 'Those tall spies in the garden.' ✓ NP",
          "Where are the spies? — 'In the garden.' ✓ PP",
          "What will they stash? — 'The evidence.' ✓ NP",
          "When? — 'After midnight.' ✓ PP",
          "What will they do? — 'Quickly stash the evidence after midnight.' ✓ VP (and 'Stash the evidence after midnight.' ✓ — the smaller VP)",
          "*'Stash the.' — no question has that answer. ✗",
        ] },
      ],
    },
    {
      id: "ambig",
      title: "Structural ambiguity: the tests pull two structures apart",
      blocks: [
        { id: "am-1", t: "p", slide: "Handout (7)", text: "'The thief tripped that unlucky man with a cane.' Two meanings: the thief used a cane, or the man carries a cane. Chapter 0 showed these as two trees. Now you can *prove* both trees exist with tests — each reading passes a test the other fails." },
        { id: "am-2", t: "worked", slide: "Reading A: the cane is the instrument", title: "'with a cane' attaches to the verb", problem: "Show 'with a cane' is a separate constituent from the NP.", steps: [
          "Cleft: 'It's with a cane that the thief tripped that unlucky man.' ✓ — the PP moved away from 'man', so it wasn't inside the NP.",
          "Substitution: 'The thief tripped him with a cane.' ✓ — 'him' replaces 'that unlucky man' and leaves 'with a cane' behind.",
          "Do-so: 'The thief tripped that unlucky man with a cane, and the burglar did so with a rope.' ✓ — 'did so' = 'tripped that unlucky man', and the instrument is outside it.",
        ] },
        { id: "am-3", t: "worked", slide: "Reading B: the man has the cane", title: "'with a cane' attaches to the noun", problem: "Show 'that unlucky man with a cane' is one NP.", steps: [
          "Substitution: 'The thief tripped him.' ✓ where 'him' = 'that unlucky man with a cane' — the whole thing, cane included.",
          "Fragment: 'Who did the thief trip?' — 'That unlucky man with a cane.' ✓",
          "Topicalization: 'That unlucky man with a cane, the thief tripped.' ✓ — the PP moved along with the NP, so it's inside it.",
        ], answer: "Same string, two constituent structures. Each test result is evidence for one of them." },
      ],
    },
    {
      id: "finite",
      title: "The finiteness note (handout (8)–(9))",
      blocks: [
        { id: "fi-1", t: "p", slide: "Finite vs non-finite VPs behave differently", text: "'Farah **will submit** the assignment' — the VP after the modal is **non-finite** (no tense on 'submit'). Substitution: 'Farah will do so.' ✓ Fragment: 'What will Farah do? — Submit the assignment.' ✓ Clean." },
        { id: "fi-2", t: "p", text: "'Farah **submitted** the assignment' — the VP is **finite** (tense is on the verb). Substitution needs do-support to carry the tense: 'Farah did so.' ✓ Fragment answer: 'What did Farah do? — *Submitted the assignment' is marginal; the natural fragment is 'Submit the assignment', with the tense stripped. Her point: some tests interact with tense, so say which kind of VP you're testing." },
      ],
    },
    {
      id: "practice",
      title: "Practice (handout (4)–(6)) — this is Quiz 2 territory",
      blocks: [
        { id: "p-0", t: "prof", title: "What she asks", text: "'Identify all syntactic categories. Identify constituents in each sentence, using each type of constituency test (substitution, movement, fragment answer) at least once.' So a full answer = labels + at least three constituents, each with a named test and the actual test sentence written out." },
        { id: "p-1", t: "worked", slide: "Handout (4)", title: "That officer from the precinct sauntered away very slowly.", problem: "Categories, then three constituents with three different tests.", steps: [
          "Categories: That D · officer N · from P · the D · precinct N · sauntered V · away Adv (particle) · very Adv · slowly Adv.",
          "Substitution: [That officer from the precinct] → 'He sauntered away very slowly.' ✓ NP.",
          "Movement (cleft): [very slowly] → 'It was very slowly that that officer sauntered away.' ✓ AdvP.",
          "Fragment: 'What did the officer do?' — [Sauntered away very slowly.] ✓ VP.",
          "Bonus: [from the precinct] → 'It's from the precinct that the officer is' / fragment 'From where?' — 'From the precinct.' ✓ PP.",
        ] },
        { id: "p-2", t: "worked", slide: "Handout (5)", title: "I will invest in some cryptocurrency to fund my globe-trotting lifestyle.", problem: "Three constituents, three tests.", steps: [
          "Categories: I N · will Mod · invest V · in P · some D · cryptocurrency N · to T · fund V · my D · globe-trotting Adj · lifestyle N.",
          "Substitution (do so): 'I will [do so] to fund my lifestyle.' ✓ → 'invest in some cryptocurrency' is a VP.",
          "Movement (cleft): 'It's to fund my globe-trotting lifestyle that I will invest in some cryptocurrency.' ✓ → the purpose clause is a constituent (an adjunct).",
          "Fragment: 'In what will you invest?' — 'In some cryptocurrency.' ✓ PP.",
          "Substitution: [my globe-trotting lifestyle] → 'to fund it' ✓ NP.",
        ] },
        { id: "p-3", t: "worked", slide: "Handout (6)", title: "Lee paraded his favorite new motorbikes around town.", problem: "Is 'motorbikes around town' a constituent?", steps: [
          "Try substitution: 'them' replaces 'his favorite new motorbikes' — 'Lee paraded them around town' ✓ — but that leaves 'around town' outside. No pro-form covers 'motorbikes around town' alone.",
          "Try movement: '*Motorbikes around town, Lee paraded his favorite new.' ✗",
          "Try fragment: 'What did Lee parade?' — 'His favorite new motorbikes.' ✓ — the answer stops before 'around town'. '*Motorbikes around town' is not an answer to any question.",
          "Conclusion: 'motorbikes around town' is NOT a constituent. 'around town' is a PP adjunct of the verb ('It's around town that Lee paraded them' ✓), sister to the object NP, not inside it. Compare reading A of the cane sentence.",
        ] },
        { id: "p-4", t: "try", q: "'The spies hid in the garden.' Prove 'in the garden' is a constituent three ways.", a: "Substitution: 'The spies hid there.' Cleft: 'It's in the garden that the spies hid.' Fragment: 'Where did the spies hide?' — 'In the garden.'" },
        { id: "p-5", t: "try", q: "Is 'hid in' a constituent?", a: "No. No pro-form ('*The spies did-so the garden'), can't move ('*Hid in, the spies the garden'), can't answer a question. The verb and the preposition belong to different phrases: 'in' heads the PP 'in the garden', which is a dependent of 'hid'." },
        { id: "p-6", t: "def", term: "The three tests, in one line each", text: "**Substitution**: replace the string with one pro-form (pronoun / one(s) / do so / there, then). **Movement**: topicalize it or cleft it ('It's X that…'). **Fragment answer**: let it answer a wh-question alone. Pass any one → constituent. Fail one → try another." },
      ],
    },
  ],
};
