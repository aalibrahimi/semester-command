import type { Exercise } from "../types";

/**
 * LING 112 · "Do it yourself" sets. Shaped like Dr. Nie's homework and the
 * oral exam: label, prove with a named test, draw, and explain the reasoning.
 */
export const ling112Practice: Record<string, Exercise[]> = {
  "0-what-syntax-is": [
    {
      id: "gloss-arabic",
      title: "Write a three-line gloss",
      prompt: "Gloss this Arabic sentence in three lines (original with morpheme breaks · morpheme-by-morpheme with grammatical labels in small caps · free translation): *katab-at al-bint-u risaalat-an* — 'The girl wrote a letter.' (katab = write, -at = 3rd person feminine singular past, al- = the, bint = girl, -u = nominative, risaalat = letter, -an = accusative indefinite.)",
      hints: [
        "Line 1 is the sentence with hyphens at every morpheme boundary. Line 2 has exactly as many hyphenated pieces, aligned under them, with lexical meaning in lowercase and grammar in SMALL CAPS. Line 3 is plain English in quotes.",
        "The mistake that costs the most is misaligning: line 2 must have the same number of words as line 1, and the same number of hyphens inside each word. Don't merge 'the' and 'girl' into one word in the gloss.",
        "Grammatical abbreviations from the handout: 3 = third person, F = feminine, SG = singular, PAST, DEF = definite, NOM = nominative, ACC = accusative, INDEF = indefinite.",
      ],
      solution: [
        "Line 1: katab-at   al-bint-u   risaalat-an",
        "Line 2: write-3F.SG.PAST   DEF-girl-NOM   letter-ACC.INDEF",
        "Line 3: 'The girl wrote a letter.'",
        "Notice what the gloss reveals: the verb comes first (VSO), the subject is marked by -u and the object by -an — Arabic tells you who did what by case endings, so word order can vary without changing meaning.",
      ],
      why: "Interlinear glossing is how every language in the world gets documented and how corpus linguists (LING 115's morphological annotation) store it. If you ever work on a language you don't speak — in NLP, in fieldwork, in translation QA — the gloss is the only thing that tells you what the data says.",
    },
    {
      id: "structure-evidence",
      title: "Argue that structure exists",
      prompt: "A friend says: 'Sentences are just words in a row — there's no hidden structure.' Give two pieces of evidence from the chapter that there *is* structure, each in two sentences: the phenomenon, then why plain word order can't explain it.",
      hints: [
        "Think about sentences where the same string of words means two different things, and about rules that seem to skip over words (like question formation moving 'is' from the right place).",
        "The weak answer is 'because linguists say so'. The strong answer names a fact about English that word-by-word order can't predict: ambiguity, or a dependency between non-adjacent words.",
        "Example shapes: 'I saw the man with the telescope' (one string, two meanings → two structures). 'The man who is tall is happy' → 'Is the man who is tall happy?' (the moved 'is' is the *structurally* main one, not the first one in the row).",
      ],
      solution: [
        "Structural ambiguity: 'I saw the man with the telescope' has one word order but two meanings (I used the telescope / the man had it). If meaning came only from the row of words, one row could only have one meaning. The two meanings are two different groupings.",
        "Structure-dependent rules: to make a yes/no question from 'The man who is tall is happy', you move the *second* 'is', not the first: 'Is the man who is tall happy?' A rule stated on the word row ('move the first auxiliary') gives the wrong sentence. The rule refers to the main clause's auxiliary — a structural notion.",
        "Both show that speakers compute groupings (constituents) that aren't visible in the string.",
      ],
      why: "This is the argument behind every parser and every grammar checker: they build a tree, not a list. It's also the exam's favorite 'explain why' question, because it's the reason the course exists.",
    },
  ],

  "2-categories": [
    {
      id: "label-and-prove",
      title: "Label every word, and prove three of them",
      prompt: "'The exhausted students will probably finish their difficult assignments before midnight.' Label each word with one of the eleven categories. Then, for *exhausted*, *probably*, and *before*, give one test each that proves the label.",
      hints: [
        "Go word by word with the frames from the chapter: can it follow 'the'? take -s or -ed? take -er/-est or 'very'? sit between a determiner and a noun? take an NP after it?",
        "The traps: *exhausted* looks like a verb (-ed) but here it sits between D and N and takes 'very' — that's the adjective frame. *probably* modifies the verb and can't be 'very probably… the probably student' — adverb. And 'will' is an auxiliary, not a verb.",
        "A test is only a proof if you show it *passes* here and would *fail* for the competing category. 'very exhausted' ✓ (Adj), '✱very finish' ✗ (V).",
      ],
      solution: [
        "The D · exhausted Adj · students N · will Aux · probably Adv · finish V · their D · difficult Adj · assignments N · before P · midnight N.",
        "*exhausted* = Adj: fits D __ N ('the exhausted students'), takes 'very' ('very exhausted'), and can be predicative ('the students are exhausted'). As a verb it couldn't take 'very'.",
        "*probably* = Adv: modifies the verb/sentence, moves freely ('Probably the students will…'), and can't fit D __ N ('✱the probably students').",
        "*before* = P here: it takes an NP complement ('before midnight') and the phrase answers 'when?'. (Note: 'before' can also be a C — 'before they left' — the complement decides.)",
      ],
      why: "POS tagging (LING 115) is this exercise done a million times by a program, and the program's errors are exactly the cases where the tests conflict — 'exhausted', 'before', 'that'. Knowing the tests is knowing where the machine will fail.",
    },
    {
      id: "same-form",
      title: "Same word, different category",
      prompt: "For each pair, say the category of the italic word in each sentence and the one test that separates them: (a) 'She will *run* tomorrow' / 'She went for a *run*'. (b) '*That* book is mine' / 'I know *that* she left'. (c) 'He walked *fast*' / 'a *fast* car'.",
      hints: [
        "Don't look at the word — look at what's around it. What precedes it? What follows it? Can you add a plural, a past tense, 'very', 'the'?",
        "The mistake is answering from the dictionary ('run is a verb'). Categories are positions, not words. 'a run' after a determiner, taking a plural ('runs'), is a noun.",
        "For (b): a determiner 'that' sits before a noun and can be swapped for 'this'; a complementizer 'that' introduces a whole clause and can often be dropped ('I know she left').",
      ],
      solution: [
        "(a) V / N. Test: 'a run' follows a determiner and pluralizes ('two runs'); 'will run' follows an auxiliary and takes tense ('ran').",
        "(b) D / C. Test: D 'that' swaps with 'this' and precedes a noun; C 'that' precedes a full clause with its own subject and verb and can be omitted.",
        "(c) Adv / Adj. Test: 'a fast car' fits D __ N and takes 'very'/'faster'; 'walked fast' modifies the verb and can't fit D __ N ('✱a fast'). English 'fast' happens to have the same form in both categories — most adverbs would show -ly.",
      ],
      why: "Every ambiguity in a headline ('Police help dog bite victim') and every failure of autocorrect comes from a word that lives in two categories. Resolving it by distribution — not by memory — is the skill.",
    },
  ],

  "4-heads-dependents": [
    {
      id: "complement-or-adjunct",
      title: "Complement or adjunct? Run the diagnostics",
      prompt: "'She put the keys on the table yesterday.' Find the head of the VP and sort *the keys*, *on the table*, and *yesterday* into complements and adjuncts using at least two of the four diagnostics each (obligatoriness, ordering, iteration, 'do so' replacement).",
      hints: [
        "Start with obligatoriness: which phrases can you delete and still have a grammatical sentence? Delete one at a time.",
        "The trap is 'on the table' — it's a PP, and PPs are 'usually adjuncts'. But try deleting it: '✱She put the keys.' Some verbs *require* a location. Obligatory → complement, whatever its category.",
        "'Do so' replaces the verb plus its complements. 'She put the keys on the table yesterday and he did so today' ✓ — 'today' is outside 'do so', so 'yesterday' is an adjunct. Try '✱…and he did so on the floor': it fails, so 'on the table' is inside.",
      ],
      solution: [
        "Head of the VP: *put*.",
        "*the keys*: obligatory ('✱She put on the table'), can't be iterated, inside 'do so' → complement.",
        "*on the table*: obligatory with *put* ('✱She put the keys'), can't be replaced by another location after 'do so' → complement. A PP complement — category doesn't decide.",
        "*yesterday*: optional, can be stacked with other time adjuncts ('yesterday, after lunch'), outside 'do so' ('…and he did so today' ✓), freely reordered → adjunct.",
        "So: put [the keys] [on the table] — two complements — plus the adjunct [yesterday].",
      ],
      why: "Complements are what a verb *requires*; dictionaries call this valency and NLP calls it a subcategorization frame. Every dependency parser, every verb-sense lexicon, and every 'this sentence is missing something' grammar error depends on getting exactly this distinction right.",
    },
    {
      id: "draw-arrows",
      title: "Draw the dependency diagram",
      prompt: "Draw the dependency diagram (head → dependent arrows) for 'The old professor from Kyoto gave a very long lecture on syntax.' Name the root and list every head with its dependents.",
      hints: [
        "Find the main verb first — that's the root. Then ask of every other word: which word does it depend on? An adjective depends on its noun; a determiner on its noun; a PP's preposition depends on whatever it modifies; the preposition's NP depends on the preposition.",
        "Two frequent errors: hanging 'from Kyoto' on the verb instead of on 'professor' (who is from Kyoto? the professor — so it modifies the noun), and making 'very' depend on 'lecture' instead of on 'long'.",
        "Each word has exactly one head, except the root. Count your arrows: n words → n − 1 arrows.",
      ],
      solution: [
        "Root: gave.",
        "gave → professor (subject), gave → lecture (object).",
        "professor → The, professor → old, professor → from; from → Kyoto.",
        "lecture → a, lecture → long, lecture → on; long → very; on → syntax.",
        "11 words, 10 arrows. ✓",
      ],
      why: "Dependency diagrams are the format of Universal Dependencies, the treebank standard used by spaCy, Stanza, and most modern parsers. If you ever look at parsed output in a corpus, this is what you'll be reading.",
    },
  ],

  "5-constituency-tests": [
    {
      id: "prove-three-ways",
      title: "Prove a constituent three ways",
      prompt: "'The children found a wallet under the old bridge.' Prove that *under the old bridge* is a constituent using all three tests, writing out the actual test sentence for each. Then show that *a wallet under* is NOT one.",
      hints: [
        "Substitution: find one pro-form that replaces the whole string ('there' for places). Movement: front it, or cleft it ('It was ___ that…'). Fragment: ask a question the string alone can answer.",
        "The mistake is describing the tests instead of running them. Write the real sentence and mark it ✓ or *. A test you didn't write out isn't evidence.",
        "For the non-constituent, show at least one test *failing* with an asterisked sentence. One clean failure is enough, but showing two is stronger.",
      ],
      solution: [
        "Substitution: 'The children found a wallet *there*.' ✓",
        "Movement (fronting): '*Under the old bridge*, the children found a wallet.' ✓ Cleft: 'It was under the old bridge that the children found a wallet.' ✓",
        "Fragment: 'Where did the children find a wallet?' — 'Under the old bridge.' ✓",
        "*a wallet under*: no pro-form replaces it ('✱The children found it the old bridge'); can't move ('✱A wallet under, the children found the old bridge'); can't answer a question. Not a constituent — it straddles the NP and the PP.",
      ],
      why: "Constituency tests are how syntacticians settle arguments without appealing to intuition alone, and they're the reasoning behind every bracket in a treebank. They're also the oral exam's core: the examiner wants to see you *run* the test, not name it.",
    },
    {
      id: "ambiguity",
      title: "Pull apart a structural ambiguity",
      prompt: "'She watched the man with the binoculars.' Give the two meanings, then use one constituency test to show which structure each meaning has — a test that succeeds under one reading and fails under the other.",
      hints: [
        "Meaning 1: she used the binoculars. Meaning 2: the man had them. The question is whether 'with the binoculars' groups with 'the man' (inside the NP) or with 'watched' (a separate phrase in the VP).",
        "The error is picking a test that gives the same result for both readings. Substitution of the NP with a pronoun is the sharp one: if 'him' replaces 'the man with the binoculars', the PP was inside the NP.",
        "Try: 'She watched him.' Under which reading does 'him' still mean 'the man with the binoculars'? Then try fronting the PP: 'With the binoculars, she watched the man' — which reading survives?",
      ],
      solution: [
        "Reading A (instrument): she used binoculars to watch. Reading B (modifier): the man who had binoculars.",
        "Pronoun substitution: 'She watched him' can mean B ('him' = the man with the binoculars) — so under B, [the man with the binoculars] is one NP constituent. Under A the PP isn't part of 'him'.",
        "PP fronting: 'With the binoculars, she watched the man' has only reading A — so under A, [with the binoculars] is a separate VP-level constituent that can move; under B it's stuck inside the NP.",
        "Two structures: A = watched [the man] [with the binoculars]; B = watched [the man [with the binoculars]].",
      ],
      why: "PP-attachment ambiguity is the single most common structural ambiguity in English and one of the hardest problems in parsing — every NLP system gets some of these wrong. Knowing how the tests separate the readings is how you'd debug one.",
    },
  ],
};
