import type { Chapter } from "../types";

/**
 * LING 112 · Chapter 0 + Week 1 — what syntax studies, why structure exists,
 * and how to read and write an interlinear gloss. Built from the Week 1
 * handout, Tallerman ch. 1.2 (the assigned glossing reading), and the
 * syllabus. Written for someone who said "I don't know what a constituent
 * is" and "haven't learned" glossing.
 */
export const ling112Intro: Chapter = {
  slug: "0-what-syntax-is",
  label: "Chapter 0 · Week 1",
  title: "What syntax studies, and how to read a gloss",
  source: "Week 1 handout (Introduction), Tallerman 2011 ch. 1.2 (interlinear glossing), Chomsky 1957 ch. 1–2, the Aug 20 lecture.",
  goal: "Say what a sentence's 'structure' is and why linguists believe in it; read and write a three-line gloss for an Arabic sentence; recognize the word-order and movement parameters Dr. Nie uses.",
  minutes: 45,
  sections: [
    {
      id: "why",
      title: "Why sentences have structure (and not just order)",
      blocks: [
        { id: "why-1", t: "p", slide: "The obvious view, and why it's wrong", text: "The obvious view of a sentence is that it's a list of words in a row: *the cat in the hat sat on the mat*. Reverse the list and it's garbage — *mat the on sat hat the in cat the* — which the handout marks with an asterisk: `*` means **ungrammatical**, a sentence that violates a rule of the language. So order clearly matters. Syntax is the claim that order isn't the whole story: words are grouped into units, and the units are nested inside bigger units, like a tree." },
        { id: "why-2", t: "why", slide: "The evidence: long-distance dependencies", title: "Dr. Nie's proof from the handout", text: "'Sherlock will ask Watson to destroy the evidence' is fine. 'Will Sherlock ask Watson to destroy?' is not — the verb *destroy* needs an object. But 'What will Sherlock ask Watson to destroy?' IS fine, and *destroy* still has no word after it. The object is *what*, sitting eight words away at the front. If sentences were only linear strings, the same string 'ask Watson to destroy' couldn't be good in one case and bad in another. Something links 'what' to the empty slot after 'destroy' across all that distance. That something is structure." },
        { id: "why-3", t: "p", text: "Two more things the handout wants you to hold. **Ungrammatical is not the same as unlikely**: 'Colorless green ideas sleep furiously' (Chomsky's example) is grammatical nonsense; 'I want that you leave' is ungrammatical English even though you understand it. **Most rules are unconscious**: you have never been taught the rule that blocks *'Will Sherlock ask Watson to destroy?', yet you know it instantly. Syntax is the project of writing down the rules you already follow." },
        { id: "why-4", t: "def", term: "Syntax", text: "The study of the structure of phrases and sentences — how words combine into units and units into sentences — and of the rules that make some combinations grammatical and others not." },
      ],
    },
    {
      id: "universals",
      title: "Four properties of every human language",
      blocks: [
        { id: "u-1", t: "list", slide: "The four (handout §2) — these are the course outline", items: [
          "**Words belong to syntactic categories** (parts of speech): noun, verb, adjective… — Week 2.",
          "**Words combine into larger units** called **constituents** — Weeks 4–5. A constituent is a group of words that behaves as a single unit; 'in the hat' is one, 'hat sat' is not.",
          "**Constituents combine into sentence types**: declarative, interrogative, imperative.",
          "**Hierarchy and recursion.** Hierarchy: the *order in which* words group matters — 'the thief tripped that unlucky man with a cane' means two different things depending on whether *with a cane* groups with *tripped* or with *man*. Recursion: a unit can contain another unit of the same kind, without limit — 'I remember that [John told me that [the Times reported that [Sarah won]]].'",
        ] },
        { id: "u-2", t: "figure", slide: "Hierarchy: the same words, two structures", viewBox: "0 0 620 190", caption: "'The thief tripped that unlucky man with a cane.' Left: the cane is the instrument (with a cane groups with the verb). Right: the man has the cane (with a cane groups with man). Same string, two trees, two meanings.", svg: `<g font-family="ui-sans-serif, system-ui" font-size="11" fill="currentColor">
<text x="20" y="20" font-weight="600">Reading A: tripped [with a cane]</text>
<line x1="90" y1="45" x2="40" y2="80" stroke="currentColor" opacity=".5"/><line x1="90" y1="45" x2="150" y2="80" stroke="currentColor" opacity=".5"/><line x1="90" y1="45" x2="230" y2="80" stroke="rgb(59 130 246)" stroke-width="2"/>
<text x="75" y="40">tripped</text><text x="20" y="95">that unlucky man</text><text x="200" y="95">with a cane</text>
<text x="340" y="20" font-weight="600">Reading B: [that unlucky man with a cane]</text>
<line x1="420" y1="45" x2="380" y2="80" stroke="currentColor" opacity=".5"/><line x1="420" y1="45" x2="500" y2="80" stroke="currentColor" opacity=".5"/>
<line x1="500" y1="80" x2="460" y2="120" stroke="currentColor" opacity=".5"/><line x1="500" y1="80" x2="560" y2="120" stroke="rgb(59 130 246)" stroke-width="2"/>
<text x="400" y="40">tripped</text><text x="360" y="95">(subject)</text><text x="475" y="95">NP</text><text x="410" y="135">that unlucky man</text><text x="530" y="135">with a cane</text>
</g>` },
        { id: "u-3", t: "try", q: "Which of these shows recursion: (a) 'big red ball', (b) 'the house that Jack built that the rat ate', (c) 'quickly ran'?", a: "(b). A relative clause ('that Jack built') contains another relative clause ('that the rat ate…') — a unit inside a unit of the same type. (a) is just two adjectives; (c) is an adverb and a verb." },
      ],
    },
    {
      id: "variation",
      title: "How languages differ: the parameters (handout §3)",
      blocks: [
        { id: "v-1", t: "p", slide: "Word order", text: "The 'dominant' word order is the most common, neutral order of Subject, Object and Verb. Dr. Nie's WALS numbers: **SOV 41%** (Japanese: *Naomi-ga tegami-o yon-da*, 'Naomi letter read'), **SVO 35%** (English, French), **VSO 7%** (Tagalog: *Binasa ni Naomi ang liham*, 'read Naomi the-letter'), VOS 2%, OVS/OSV 1%, and 14% with no dominant order." },
        { id: "v-2", t: "table", slide: "The other parameters", rows: [
          ["Parameter", "Options", "Examples from the handout"],
          ["Adjective–noun", "Adj-N (27%) vs N-Adj (64%)", "English 'big red ball' / Vietnamese 'quả bóng đỏ lớn' (ball red big); Spanish mostly N-Adj"],
          ["Adposition", "Preposition vs postposition", "English 'in the room' / Korean 'bang-eseo' (room-in)"],
          ["Subject pronouns", "Overt vs null-subject", "Spanish 'Habla español' = '(s/he) speaks Spanish' — no pronoun needed"],
          ["Wh-questions", "Wh-movement vs wh-in-situ", "Syrian Arabic moves 'šu' (what) to the front; Mandarin leaves 'shénme' in the object slot"],
        ] },
        { id: "v-3", t: "prof", title: "Your Arabic, on this table", text: "MSA: neutral order is **VSO** (*qaraʔa l-walad-u l-kitāb-a*, 'read the-boy the-book'), with SVO common in speech and in topic-first sentences. **N-Adj**: *kitāb kabīr* (book big). **Prepositions**: *fī l-bayt* (in the-house). **Null subject**: *yatakallam* alone means 'he speaks'. **Wh-movement**: *māḏā qaraʔa l-walad?* 'what read the-boy?' — the wh-word fronts, like the Syrian example on the handout. You can fill every row of Dr. Nie's table from a language you speak — that's a ready-made oral-exam example set." },
      ],
    },
    {
      id: "gloss",
      title: "Reading and writing an interlinear gloss (Tallerman 1.2)",
      blocks: [
        { id: "g-1", t: "why", slide: "Why linguists gloss", title: "Why this exists", text: "If Dr. Nie shows you a Japanese sentence, you can't tell which word is the subject. A gloss is the standard three-line format that lets anyone read the structure of any language without speaking it. Every non-English example in this course — on handouts, homework, and the oral exam — is in this format, and homework answers in Arabic must be too." },
        { id: "g-2", t: "code", slide: "The three lines", caption: "Line 1: the sentence with morpheme boundaries. Line 2: one gloss per morpheme, aligned under it. Line 3: a free translation in quotes.", text: `Naomi-ga    tegami-o    yon-da.          ← line 1: the language, morphemes split with hyphens
Naomi-NOM   letter-ACC  read-PAST        ← line 2: gloss, one item per morpheme, aligned
'Naomi read the letter.'                 ← line 3: translation, in single quotes` },
        { id: "g-3", t: "list", slide: "The rules", items: [
          "**Hyphens for affixes, = for clitics.** *tegami-o*: the accusative suffix is an affix, so a hyphen. English *I'm* would be *I=m*.",
          "**Grammatical labels in SMALL CAPS** (or all caps when you can't): NOM (nominative), ACC (accusative), DAT (dative), GEN (genitive), ERG (ergative), PAST, PRES, PFV (perfective), 1SG/2SG/3SG (person.number), PL, M/F (gender), DEF, CL (classifier). Lexical meanings in lowercase: *letter*, *read*.",
          "**One-to-one alignment**: every morpheme in line 1 has exactly one gloss in line 2, in the same order. If one morpheme carries two meanings, join them with a period: *read.3.PAST* (French *a lu* on the handout is glossed *read.3.PAST*).",
          "**Line 3 is a translation, not a gloss**: natural English, in quotes.",
          "**Lit.** for a literal reading when the free translation hides the structure: Tagalog *Doktor ang matalino*, 'The smart is doctor' (Lit.), 'The smart one is a doctor.'",
        ] },
        { id: "g-4", t: "worked", slide: "Glossing an Arabic sentence, step by step", title: "'The girl read the book' in MSA", problem: "qaraʔat al-bintu al-kitāba. Build the three lines.", steps: [
          "Segment: *qaraʔ-at* (read + 3SG feminine past), *al-bint-u* (the + girl + NOM), *al-kitāb-a* (the + book + ACC).",
          "Line 1: qaraʔ-at   al-bint-u   al-kitāb-a",
          "Line 2: read-3SG.F.PAST   DEF-girl-NOM   DEF-book-ACC   ← the verb suffix carries three features, joined with periods",
          "Line 3: 'The girl read the book.'",
          "Check alignment: three words, three glosses; each hyphen in line 1 has a hyphen in line 2. Order is V S O — which is the VSO parameter from the previous section, visible in your own data.",
        ] },
        { id: "g-5", t: "prof", title: "Dialect words are fine — consistency is what she grades", text: "You've been mixing MSA with dialect ('dablah' for table). That's allowed. What loses points is a gloss that doesn't match its line 1 — a case suffix glossed on a dialect word that doesn't carry case, or a dropped morpheme. Pick one register per example and gloss exactly what's there." },
        { id: "g-6", t: "try", q: "Gloss the Japanese example from the Week 2 handout: *Hanako-ga Taro-o tatai-ta.* ('Hanako hit Taro.')", a: "Line 1: Hanako-ga  Taro-o  tatai-ta. Line 2: Hanako-NOM  Taro-ACC  hit-PAST. Line 3: 'Hanako hit Taro.' Note that *Taro-o Hanako-ga tatai-ta* means the same thing — the case suffixes, not the order, say who hit whom. That's why Japanese can move words around and English can't." },
        { id: "g-7", t: "try", q: "Gloss Spanish *Está lloviendo* ('It's raining').", a: "Line 1: Está  lloviendo. Line 2: be.PRES.3SG  raining. Line 3: 'It's raining.' No subject pronoun — Spanish is a null-subject language (handout (15c))." },
      ],
    },
    {
      id: "how-class-works",
      title: "How this class works (so the packet makes sense)",
      blocks: [
        { id: "h-1", t: "list", slide: "The loop", items: [
          "**Before class**: watch the assigned Carnie or TrevTutor video or read the Tallerman pages (20–30 min). The syllabus schedule lists them per day.",
          "**In class**: you get a paper packet — the same PDF that's on Canvas — full of blanks, and you fill it in groups. The blanks are the content. If you miss class, two classmates post their filled packets to the 'Class notes repository' discussion.",
          "**After class**: post-mortem the packet. For every answer, write one sentence of 'how I know' — which test. That sentence is the oral exam.",
          "**Homework** (6, 45%): Google Doc problem sets, typed, submitted as PDF named 'Alibrahimi A - LING112 - HW#'. Collaborate, but write your own; list collaborators. Due Mondays noon, no penalty until the next class starts.",
          "**Quizzes** (6, 10%): open-book, short, on Canvas or in class. Quiz 2 is due Mon Sep 21 noon.",
          "**Oral exams** (2, 20%): explain a concept you chose, then apply it live. Chapter on that later.",
        ] },
        { id: "h-2", t: "def", term: "* and #", text: "`*` marks an ungrammatical sentence (breaks a rule). `#` marks a sentence that is grammatical but semantically odd ('#The earthquake informed the audience'). She uses both on every handout." },
      ],
    },
  ],
};
