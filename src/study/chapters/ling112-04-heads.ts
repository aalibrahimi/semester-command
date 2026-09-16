import type { Chapter, Frame } from "../types";

/**
 * LING 112 · Week 4 — Heads, dependents, complements, adjuncts, head
 * directionality. Built from the Week 4 handout, Essentials ch. 6.2–6.3,
 * Tallerman 4.1–4.2. The most likely Oral Exam 1 concept.
 */
const depFrames: Frame[] = [
  { kind: "lines", lines: ["Several large books fell to the ground with a loud thud.", "fell → books        (the subject depends on the verb)", "fell → to           (PP 'to the ground' depends on the verb)", "fell → with         (PP 'with a loud thud' depends on the verb)", "books → several, books → large", "to → ground,  ground → the", "with → thud,  thud → a,  thud → loud"], active: 0, caption: "Handout (8). We'll draw the dependency diagram as a list of arrows, head → dependent. Every word gets exactly one head, except the root." },
  { kind: "lines", lines: ["Several large books fell to the ground with a loud thud.", "fell → books        (the subject depends on the verb)", "fell → to           (PP 'to the ground' depends on the verb)", "fell → with         (PP 'with a loud thud' depends on the verb)", "books → several, books → large", "to → ground,  ground → the", "with → thud,  thud → a,  thud → loud"], active: 1, caption: "The head of the whole sentence is the main verb 'fell'. Its first dependent is the subject NP, whose head is 'books'." },
  { kind: "lines", lines: ["Several large books fell to the ground with a loud thud.", "fell → books        (the subject depends on the verb)", "fell → to           (PP 'to the ground' depends on the verb)", "fell → with         (PP 'with a loud thud' depends on the verb)", "books → several, books → large", "to → ground,  ground → the", "with → thud,  thud → a,  thud → loud"], active: 2, caption: "'to the ground' is a prepositional phrase. The head of a PP is the preposition, so the arrow from 'fell' lands on 'to', not on 'ground'." },
  { kind: "lines", lines: ["Several large books fell to the ground with a loud thud.", "fell → books        (the subject depends on the verb)", "fell → to           (PP 'to the ground' depends on the verb)", "fell → with         (PP 'with a loud thud' depends on the verb)", "books → several, books → large", "to → ground,  ground → the", "with → thud,  thud → a,  thud → loud"], active: 3, caption: "Same for 'with a loud thud': 'fell' → 'with'. Both PPs are optional — the sentence is fine without them — so both are adjuncts of the verb." },
  { kind: "lines", lines: ["Several large books fell to the ground with a loud thud.", "fell → books        (the subject depends on the verb)", "fell → to           (PP 'to the ground' depends on the verb)", "fell → with         (PP 'with a loud thud' depends on the verb)", "books → several, books → large", "to → ground,  ground → the", "with → thud,  thud → a,  thud → loud"], active: 4, caption: "Inside the subject: 'several' (D) and 'large' (Adj) both depend on 'books'. A head can have many dependents." },
  { kind: "lines", lines: ["Several large books fell to the ground with a loud thud.", "fell → books        (the subject depends on the verb)", "fell → to           (PP 'to the ground' depends on the verb)", "fell → with         (PP 'with a loud thud' depends on the verb)", "books → several, books → large", "to → ground,  ground → the", "with → thud,  thud → a,  thud → loud"], active: 5, caption: "'to' has one dependent, 'ground' — its complement (a preposition must have an NP). And 'ground' has 'the'. A dependent can itself be a head." },
  { kind: "lines", lines: ["Several large books fell to the ground with a loud thud.", "fell → books        (the subject depends on the verb)", "fell → to           (PP 'to the ground' depends on the verb)", "fell → with         (PP 'with a loud thud' depends on the verb)", "books → several, books → large", "to → ground,  ground → the", "with → thud,  thud → a,  thud → loud"], active: 6, caption: "'with' → 'thud', and 'thud' → 'a', 'loud'. Ten words, nine arrows, one root. Her note: a dependency diagram is a connected directed acyclic graph with maximum in-degree 1 — every word has one incoming arrow except the root." },
];

export const ling112Heads: Chapter = {
  slug: "4-heads-dependents",
  label: "Week 4",
  title: "Heads, dependents, complements and adjuncts",
  source: "Week 4 handout (Heads and dependents), Essentials of Linguistics ch. 6.2–6.3, Tallerman ch. 4.1–4.2, University of Nottingham 'Phrases, heads and modifiers'.",
  goal: "Find the head of any phrase, sort its dependents into complements and adjuncts using the four diagnostics, draw a dependency diagram, and state head directionality for English, Japanese and Arabic.",
  minutes: 60,
  requires: ["2-categories"],
  sections: [
    {
      id: "why",
      title: "Why phrases have heads",
      blocks: [
        { id: "why-1", t: "why", slide: "The question", title: "What 'several large books' is", text: "Week 2 gave you categories for words. But 'several large books' behaves like one thing — it can be a subject, you can replace all three words with 'they'. What category is the *group*? The answer: a group takes its category from one word inside it. 'Several large books' is about books, and it's a noun-ish thing (a noun phrase), because **books** is its **head**. Take away 'several' or 'large' and you still have a books-phrase; take away 'books' and you have nothing." },
        { id: "why-2", t: "def", term: "Head and dependent", text: "A **phrase** is a unit built from a head and its dependents. The **head** determines the syntactic category and core meaning of the phrase — exactly one per phrase. **Dependents** are the other elements, which contribute to the meaning." },
        { id: "why-3", t: "worked", slide: "Handout (1): circle the head", title: "Five phrases", problem: "Find the one word that gives each phrase its category.", steps: [
          "several large **books** — NP. It's about books; 'several' and 'large' modify.",
          "**with** a loud thud — PP. The preposition is the head: the phrase does what a preposition does (relates something to the verb), and 'with' selects the NP.",
          "our **request** for privacy — NP. 'For privacy' tells you what kind of request.",
          "**yawned** loudly — VP. 'Loudly' modifies the yawning.",
          "a huge **dinner** of very round red berries — NP. The whole thing is a dinner; 'of very round red berries' is a PP inside it, headed by 'of', with its own NP headed by 'berries'.",
        ] },
        { id: "why-4", t: "p", slide: "Heads select their dependents", text: "Two facts from the handout. **Heads pick the category of their dependents**: 'the loud yawn' ✓ / '*the loudly yawn' ✗ — the noun 'yawn' takes an adjective; 'loudly yawned' ✓ / '*loud yawned' ✗ — the verb takes an adverb. **Heads can also pick the meaning**: 'The speaker informed the audience' ✓ but '#The earthquake informed the audience' — grammatical, but 'inform' wants a dependent that can intend to inform. The `#` marks that." },
      ],
    },
    {
      id: "args",
      title: "Obligatory vs optional: arguments and adjuncts",
      blocks: [
        { id: "a-1", t: "p", slide: "Handout (6): which brackets can you delete?", text: "'[The bear] yawned [loudly]' — delete 'loudly' and it's fine; delete 'the bear' and it isn't (*'Yawned loudly' as a sentence). '[The bear] [slowly] savored [the berries]' — delete 'slowly', fine; delete 'the berries', *'The bear savored' is broken. '[The bear] gave [me] [a huge fright] [last weekend]' — 'last weekend' can go; 'me' and 'a huge fright' cannot." },
        { id: "a-2", t: "def", term: "Argument vs adjunct", text: "**Arguments** are the obligatory dependents of a predicate — the participants the verb's meaning requires. Verbs differ in how many they take (their argument structure: yawn 1, savor 2, give 3). **Adjuncts** are optional dependents — anything you can drop." },
      ],
    },
    {
      id: "comp",
      title: "Complements vs adjuncts — the diagnostics",
      blocks: [
        { id: "c-1", t: "p", slide: "A finer cut", text: "'Argument' is about the verb's meaning. **Complement** is the syntactic version: a dependent the head *selects*, sitting right next to it. Most complements are arguments and vice versa, with one big exception the handout flags: **subjects are arguments but NOT complements** — they sit on the other side of the verb and behave differently (you'll see why when trees arrive in Week 6)." },
        { id: "c-2", t: "table", slide: "The four diagnostics (handout §2)", rows: [
          ["Test", "Complement", "Adjunct"],
          ["Obligatory?", "Usually yes", "No — always optional"],
          ["How many can a head take?", "A limited number, usually 1–2, fixed by the head", "Potentially unlimited (yawned loudly, yesterday, in the garden, for an hour…)"],
          ["Position", "Adjacent to the head", "Need not be adjacent; freer order"],
          ["Selected by the head?", "Yes — category and often the exact preposition ('resort TO', 'fond OF')", "No — attaches to almost any head of that type"],
        ] },
        { id: "c-3", t: "worked", slide: "Handout (11): complements of the bolded heads", title: "Six phrases", problem: "For each, what is the complement and its category?", steps: [
          "**into** [the house] — complement NP. A preposition always takes exactly one NP complement.",
          "**drafted** [a new screenplay] — complement NP. Drop it: *'She drafted' is odd; 'draft' selects an object.",
          "**set** [the packages] [on that shelf] — TWO complements, NP and PP. 'Set' requires both: *'set the packages' is incomplete.",
          "**wondered** [whether she left] — complement is a clause (CP) introduced by the complementizer 'whether'. 'Wonder' selects a question-clause.",
          "**resorted** [to his back-up plan] — complement PP, and 'resort' selects specifically 'to' (*'resorted with'). Selection of the exact preposition = complement.",
          "**fond** [of classical music] — complement PP of the adjective. 'Fond' requires 'of' (*'fond' alone is odd as a predicate: *'She is fond').",
        ] },
        { id: "c-4", t: "worked", slide: "Handout (12): complements AND adjuncts", title: "Sorting both", problem: "For each bolded head, which dependents are complements and which adjuncts?", steps: [
          "quietly **serenaded** his beloved in the garden with a guitar — complement: NP 'his beloved' (obligatory, adjacent, selected). Adjuncts: AdvP 'quietly', PP 'in the garden', PP 'with a guitar' — all droppable, stackable, movable ('In the garden, he quietly serenaded his beloved').",
          "repeatedly **glanced** at the clock nervously before noon — complement: PP 'at the clock' (glance selects 'at'). Adjuncts: 'repeatedly', 'nervously', 'before noon'.",
          "unbelievably wealthy **relatives** of mine — complement: PP 'of mine' (the noun 'relative' wants a possessor). Adjunct: AdjP 'unbelievably wealthy'.",
          "extremely **proud** of each student — complement: PP 'of each student' (proud selects 'of'). Adjunct: 'extremely'.",
        ], answer: "Complements hug the head and are limited; adjuncts stack and float." },
        { id: "c-5", t: "p", slide: "Position question from the handout", text: "'What position(s) can complements appear in relative to the head? What about adjuncts?' In English, complements come **immediately after** the head (V–NP, P–NP, Adj–PP, N–PP). Adjuncts can come **before or after** and outside the complement: 'quietly serenaded [his beloved] in the garden' — adjunct, head, complement, adjunct. That asymmetry is the whole reason X-bar theory (Week 7) puts complements as sisters of the head and adjuncts one level up." },
      ],
    },
    {
      id: "dep",
      title: "Dependency diagrams",
      blocks: [
        { id: "d-1", t: "p", slide: "The convention", text: "An arrow goes **from head to dependent**. A head may have many arrows out; every word has at most one arrow in. The word with no arrow in is the root — the head of the whole sentence, which is the main verb. Constituency trees (Week 6) are the other way of drawing the same facts." },
        { id: "d-2", t: "stepper", slide: true, title: "Handout (8), drawn as arrows", frames: depFrames },
        { id: "d-3", t: "try", q: "Handout (7a): 'a huge fright'. Draw the arrows.", a: "fright → a; fright → huge. Head: fright (N). Two dependents, both adjuncts/modifiers of the noun." },
        { id: "d-4", t: "try", q: "Handout (7c): 'in the middle of the night'.", a: "in → middle; middle → the; middle → of; of → night; night → the. Head of the whole phrase: 'in' (it's a PP). 'of the night' is a PP complement of the noun 'middle'." },
        { id: "d-5", t: "try", q: "Handout (10): 'The brown bear slowly savored a huge dinner of very round red berries.' What is the root and what are its direct dependents?", a: "Root: savored. Dependents of savored: bear (subject; bear → the, brown), slowly (adjunct), dinner (complement; dinner → a, huge, of; of → berries; berries → round (→ very), red)." },
      ],
    },
    {
      id: "dir",
      title: "Head directionality",
      blocks: [
        { id: "h-1", t: "def", term: "Head directionality", text: "The order of head and complement. **Head-initial**: head before complement (English, Spanish, Tagalog, Arabic). **Head-final**: head after complement (Japanese, Hindi/Urdu, Turkish). SVO is one head-initial pattern (V before its object); SOV is head-final. Subjects are not complements, so they don't count." },
        { id: "h-2", t: "table", slide: "Handout (13)–(15): English vs Japanese, with Arabic added", rows: [
          ["Head–complement pair", "English (head-initial)", "Japanese (head-final)", "Arabic (head-initial)"],
          ["V – object NP", "ate [an apple]", "[ringo-o] tabe-ta (apple-ACC eat-PAST)", "ʔakala [t-tuffāḥ-a] (ate the-apple-ACC)"],
          ["P – NP", "to [Tokyo]", "[Tokyo] e (Tokyo to) — a postposition", "ʔilā [Tōkyō] (to Tokyo)"],
          ["N – PP", "picture [of a robot]", "[robotto no] shasin (robot of picture)", "ṣūrat-u [rōbōt-in] (picture of-robot — the genitive follows)"],
        ] },
        { id: "h-3", t: "p", text: "The point for the oral exam: directionality is *consistent* within a language. Japanese puts every head last — verb after object, postposition after noun, noun after its PP. English and Arabic put every head first. Once you know a language's setting from one pair, you can predict the others. That's what 'parameter' means." },
        { id: "h-4", t: "try", q: "Korean is SOV with postpositions (handout Week 1: 'bang-eseo', room-in). Predict: does the noun come before or after its PP complement?", a: "After. Korean is head-final throughout, so 'picture of a robot' will be [robot-of] picture, like Japanese." },
      ],
    },
    {
      id: "oral",
      title: "If this is your oral-exam concept",
      blocks: [
        { id: "o-1", t: "list", slide: "The 3-minute explanation", items: [
          "Definition: phrases are built from one head plus dependents; the head fixes the category and core meaning.",
          "Why it matters: it explains why 'several large books' acts like a noun, and why heads restrict what they combine with (*the loudly yawn).",
          "Two kinds of dependent: complements (selected, limited, adjacent, usually obligatory) vs adjuncts (optional, unlimited, movable). Give 'fond of music' vs 'quietly serenaded … in the garden'.",
          "The one exception to remember: subjects are arguments but not complements.",
          "Cross-linguistic hook: head directionality — English/Arabic head-initial, Japanese head-final, with one glossed pair each.",
          "Live problem: 'Take this sentence, find the head of each phrase, and sort the dependents' — narrate each test as you apply it.",
        ] },
      ],
    },
  ],
};
