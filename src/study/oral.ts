/**
 * oral.ts: practice material for oral exams ("explain a concept, then
 * apply it live"). One list of concepts per course that has an oral exam.
 *
 * Called by: routes/StudyOral.tsx.
 *
 * Each concept has the question you'll be asked, the points a complete
 * explanation covers (the checklist you tick after speaking), and fresh
 * problems to apply it to, each with its own checklist and a model answer.
 * Everything here restates what the chapters teach, in their terms, so
 * practice and reading never disagree.
 */

export interface OralPoint {
  label: string;
  detail: string;
}

export interface OralProblem {
  task: string;
  checklist: string[];
  model: string;
}

export interface OralConcept {
  id: string;
  title: string;
  /** The question as the examiner would put it. */
  prompt: string;
  /** Where the chapter teaches it (for "review this first"). */
  guideId: string;
  sectionId: string;
  points: OralPoint[];
  problems: OralProblem[];
}

export const ORAL_EXPLAIN_SECONDS = 120;
export const ORAL_APPLY_SECONDS = 180;

const LING112: OralConcept[] = [
  {
    id: "projection",
    title: "The Projection Principle (your Oral Exam 1 topic)",
    prompt: "What is the Projection Principle? Give an example, and explain an issue it solves or raises.",
    guideId: "ling112/8-arguments-projection",
    sectionId: "oral",
    points: [
      { label: "Definition (Dr. Nie's words)", detail: "Every head must have all of its requirements fulfilled." },
      { label: "What 'requirements' are", detail: "Number of arguments (valency), their syntactic category (DP, PP), and their theta roles (Agent, Theme, Recipient, Location, Experiencer): the head's theta grid." },
      { label: "An example with its grid", detail: "place: x DP Agent, y DP Theme, z PP Location ('Carly placed the briefcase on the table'), written on the board." },
      { label: "Show it failing", detail: "# Carly placed the briefcase (number), # I placed the table a book (category: DP DP), # I placed a book on George (role: needs an inanimate Location)." },
      { label: "What it solves", detail: "Which phrases are obligatory: arguments are in the grid (complements = sisters of V, subject = Spec,TP); everything else is an adjunct (sister of V′, optional, stackable)." },
      { label: "What it raises", detail: "Zero-argument verbs (snow, rain, seem) require nothing, yet 'It snowed' needs a subject: the EPP (every clause has a subject); the expletive gets no theta role, so the Theta Criterion still holds." },
    ],
    problems: [
      {
        task: "Apply the Projection Principle to 'The students gave their teacher a card on Friday', explain your approach, then draw the X-bar tree.",
        checklist: [
          "Verb: gave (give), a three-argument verb",
          "Grid: x DP Agent (the students), y DP Recipient (their teacher), z DP Theme (a card)",
          "give allows DP DP here (also DP PP: gave a card to their teacher)",
          "on Friday is not in the grid: adjunct, sister of V′",
          "Tree: [TP [DP the students] [T′ [T PAST] [VP [V′ [V′ [V gave] [DP their teacher] [DP a card]] [PP on Friday]]]]], all three levels on every phrase",
          "Check: every slot in give's grid filled exactly once",
        ],
        model: "The head with requirements is 'gave'. Give is a three-place predicate: x is a DP Agent, the students; y is a DP Recipient, their teacher; z is a DP Theme, a card. By the Projection Principle all three have to be in the tree: the students in the specifier of TP, and their teacher and a card as complements, both sisters of V under the lowest V-bar. 'On Friday' isn't in give's grid, so it's an adjunct: I can drop it, and it attaches to a new V-bar above. T is PAST. Checking the tree, every requirement of give is filled exactly once.",
      },
      {
        task: "Apply the Projection Principle to 'It rained in the city', then draw the tree.",
        checklist: [
          "rain is a zero-argument predicate: the Projection Principle requires nothing",
          "It is an expletive: required by the EPP (every clause has a subject), no theta role",
          "in the city is an adjunct (rain doesn't need a place): sister of V′",
          "Tree: [TP [DP [D′ [D it]]] [T′ [T PAST] [VP [V′ [V′ [V rained]] [PP in the city]]]]]",
          "Say why this is the interesting case: the Projection Principle alone doesn't explain 'it'",
        ],
        model: "Rain has no requirements: it's a zero-argument predicate, so the Projection Principle asks for nothing here, and nothing in the sentence is a complement. But English still needs a subject, and that's the EPP: every clause must have a subject. So 'it' is an expletive in the specifier of TP with no theta role, which keeps the Theta Criterion happy. 'In the city' isn't required by rain, so it's an adjunct, sister of V-bar. This sentence shows exactly where the Projection Principle stops and the EPP takes over.",
      },
      {
        task: "Apply the Projection Principle to 'Maya will set the plates on the table carefully', then draw the tree.",
        checklist: [
          "Verb: set, three arguments like place",
          "Grid: x DP Agent (Maya), y DP Theme (the plates), z PP Location (on the table)",
          "carefully is an adjunct (manner): sister of V′",
          "will is in T",
          "Tree: [TP [DP Maya] [T′ [T will] [VP [V′ [V′ [V set] [DP the plates] [PP on the table]] [AdvP carefully]]]]]",
          "Contrast: # Maya will set the plates (the Location requirement isn't fulfilled)",
        ],
        model: "The verb is set, which works like place: it needs a DP Agent, a DP Theme and a PP Location. Maya is the Agent in the specifier of TP; 'the plates' and 'on the table' are both complements, sisters of V, because set requires them: 'Maya will set the plates' on its own is incomplete. 'Carefully' is manner, not in the grid, so it's an adjunct on a higher V-bar. 'Will' goes in T. Every requirement of set is fulfilled once, so the Projection Principle is satisfied.",
      },
    ],
  },
  {
    id: "heads",
    title: "Heads, complements and adjuncts",
    prompt: "What is the head of a phrase, and how do you tell a complement from an adjunct?",
    guideId: "ling112/4-heads-dependents",
    sectionId: "comp",
    points: [
      { label: "Definition", detail: "A phrase has exactly one head; it decides the category and core meaning. The other words are dependents." },
      { label: "Why it matters", detail: "'several large books' acts like a noun because its head is a noun; heads select their dependents (*the loudly yawn)." },
      { label: "Two kinds of dependent", detail: "Complements are selected, limited in number, adjacent to the head, usually obligatory. Adjuncts are optional, unlimited, and can move." },
      { label: "An example of each", detail: "'fond OF music' (fond selects 'of': complement) vs 'quietly serenaded his beloved in the garden' (quietly, in the garden: adjuncts)." },
      { label: "The exception", detail: "Subjects are arguments but not complements: they are required, but they sit outside the VP." },
      { label: "How you know", detail: "Name the test you used: drop it, stack more, move it, check whether the head picks the exact word." },
    ],
    problems: [
      {
        task: "In 'Maya carefully placed the vase on the shelf yesterday', find the head verb, its complements and its adjuncts. Prove each one.",
        checklist: [
          "Head: placed",
          "Complements: 'the vase' and 'on the shelf' ('place' needs both: *Maya placed the vase)",
          "Adjuncts: 'carefully' and 'yesterday' (drop either, still fine)",
          "Movement proof: 'Yesterday, Maya carefully placed the vase on the shelf'",
          "Subject 'Maya': an argument, but not a complement",
        ],
        model: "The head is 'placed'. 'Place' needs a thing and a location, so 'the vase' and 'on the shelf' are both complements: drop the PP and you get *Maya placed the vase, which is incomplete. 'Carefully' and 'yesterday' are adjuncts: I can drop them, I could stack more (in the morning, with gloves), and 'yesterday' moves to the front. 'Maya' is the subject: required, so an argument, but not a complement.",
      },
      {
        task: "In 'a student of physics with long hair', which PP is the complement of 'student' and which is the adjunct? How do you know?",
        checklist: [
          "Complement: 'of physics' (what is studied, selected by 'student')",
          "Adjunct: 'with long hair' (just describes)",
          "Order test: *a student with long hair of physics is bad",
          "Complements hug the head; adjuncts come after them",
          "Stacking: you can add more adjuncts (with a backpack), not more 'of' complements",
        ],
        model: "'Of physics' is the complement: it names what is studied, 'student' selects it, and it has to sit right next to the head. 'With long hair' is an adjunct. The order test proves it: *a student with long hair of physics sounds wrong, because the complement must hug the head and adjuncts go outside it. I can also stack adjuncts, 'with long hair with a backpack', but not a second 'of' phrase.",
      },
      {
        task: "Draw the dependency arrows for 'The tired dog slept on the porch' and label each dependent of 'slept' as complement or adjunct.",
        checklist: [
          "Root: slept (no arrow comes in)",
          "slept → dog (subject), dog → the, dog → tired",
          "slept → on, on → porch, porch → the",
          "'on the porch' is an adjunct: 'sleep' needs no location (The dog slept is fine)",
          "Every word except the root has exactly one incoming arrow",
        ],
        model: "The root is 'slept'. Arrows: slept → dog; dog → the and dog → tired; slept → on; on → porch; porch → the. 'Sleep' is intransitive, so it takes no complement: 'on the porch' is an adjunct, since 'The tired dog slept' is complete. 'Dog' is the subject, an argument. Each word has exactly one arrow coming in, except the root.",
      },
    ],
  },
  {
    id: "constituency",
    title: "Constituency tests",
    prompt: "What is a constituent, and how do you prove that a string of words is one?",
    guideId: "ling112/5-constituency-tests",
    sectionId: "sub",
    points: [
      { label: "Definition", detail: "A group of words that behaves as one unit. You can't see it; you prove it with a test." },
      { label: "Substitution", detail: "Replace the string with one pro-form (they, it, one(s), do so, there, then). The pro-form also tells you what kind of phrase it is." },
      { label: "Movement", detail: "Topicalize it (move it to the front with a comma) or cleft it: 'It's ___ that…'. Only units can travel." },
      { label: "Fragment answer", detail: "Ask a wh-question; if the string can be the whole answer alone, it's a unit." },
      { label: "The logic", detail: "Passing one test is enough to show a constituent. Failing one isn't proof it isn't one: try another test." },
      { label: "Why it matters", detail: "Constituents are what rules move and replace, and they explain structural ambiguity." },
    ],
    problems: [
      {
        task: "Is 'the old map' a constituent in 'Ana found the old map in the attic'? Use two tests.",
        checklist: [
          "Substitution: 'Ana found it in the attic' works",
          "Movement: 'The old map, Ana found in the attic' or 'It's the old map that Ana found in the attic'",
          "Fragment: 'What did Ana find?' 'The old map.'",
          "Conclusion: yes, a constituent (a DP)",
        ],
        model: "Yes. Substitution: 'Ana found it in the attic' keeps the meaning, and 'it' stands in for a DP. Clefting: 'It's the old map that Ana found in the attic' is grammatical. Either test is enough, so 'the old map' is a constituent, a DP.",
      },
      {
        task: "Is 'found the old' a constituent in the same sentence? Show how you know.",
        checklist: [
          "Substitution fails: no single pro-form replaces 'found the old'",
          "Movement fails: *Found the old, Ana map in the attic",
          "Fragment fails: no question gets 'found the old' as its answer",
          "Conclusion: not a constituent; it cuts the DP 'the old map' in half",
        ],
        model: "No. There's no pro-form for it, *'Found the old, Ana map in the attic' is terrible, and no question has 'found the old' as its answer. All three tests fail, and I can see why: the string splits the DP 'the old map' down the middle, so it can't be a unit.",
      },
      {
        task: "In 'those tall spies in the garden', show that 'tall spies in the garden' is a unit smaller than the whole phrase.",
        checklist: [
          "It's an N-bar: the noun and its describers, minus the determiner",
          "Its pro-form is one(s): 'those ones'",
          "'I like these tall spies in the garden more than those ones'",
          "Shows the DP has a layer inside it",
        ],
        model: "Use substitution with 'ones': 'I prefer these tall spies in the garden to those ones.' 'Ones' replaces 'tall spies in the garden' but leaves 'those' behind. So that string is a unit smaller than the DP: the N-bar, the noun plus what's attached to it, minus the determiner.",
      },
    ],
  },
  {
    id: "categories",
    title: "Syntactic categories by distribution",
    prompt: "How do you decide what category a word belongs to?",
    guideId: "ling112/2-categories",
    sectionId: "tests",
    points: [
      { label: "Definition", detail: "A category is a group of words that behave the same way: same endings, same slots." },
      { label: "Never by meaning", detail: "Meaning fails: 'destruction' is an action but a noun; 'run' can be a noun or a verb." },
      { label: "Morphological distribution", detail: "Which endings it takes: nouns take plural -s, verbs take -ed / -ing, adjectives take -er / -est." },
      { label: "Syntactic distribution", detail: "Which slots it fits: test frames like 'The ___ slept' (N), 'They will ___' (V), 'the ___ dog' (Adj)." },
      { label: "Lexical vs functional", detail: "N, V, Adj, Adv are open classes; P, D, C, Aux, Mod, T, Neg are closed functional classes." },
    ],
    problems: [
      {
        task: "What category is 'fast' in 'She runs fast' and in 'a fast car'? Prove each with distribution.",
        checklist: [
          "'a fast car': adjective (fits 'the ___ dog'; takes -er: a faster car)",
          "'runs fast': adverb (modifies the verb; fits after an intransitive verb like 'quickly')",
          "Same form, two categories: category comes from the slot, not the word's look",
          "Meaning alone can't decide it",
        ],
        model: "In 'a fast car', 'fast' is an adjective: it fits the frame 'the ___ dog' and takes '-er', 'a faster car'. In 'She runs fast', it's an adverb: it sits in the same slot as 'quickly' after the verb and modifies the running. Same spelling, two categories, which is exactly why we decide by distribution, not by the word itself.",
      },
      {
        task: "Is 'destruction' a noun or a verb? Explain why meaning is the wrong way to decide.",
        checklist: [
          "Noun",
          "Frame: 'The ___ was total' works; 'They will ___' fails",
          "Morphology: -tion is a derivational ending that makes nouns",
          "It names an action, so meaning would wrongly say verb",
        ],
        model: "It's a noun. It fits 'The ___ was total' but not 'They will ___', and '-tion' is a derivational suffix that makes nouns. Meaning would mislead me: destruction is an action, so a meaning-based rule says verb. That's why categories are defined by distribution.",
      },
      {
        task: "Give the category of each word in 'The students will not leave early' with one test for each.",
        checklist: [
          "the: D (determiner)",
          "students: N (plural -s; 'The ___ slept')",
          "will: Mod / T (carries the tense; 'They ___ leave')",
          "not: Neg",
          "leave: V ('They will ___')",
          "early: Adv (modifies the verb, like 'quickly')",
        ],
        model: "'The' is D. 'Students' is N: it takes plural -s and fits 'The ___ slept'. 'Will' is a modal in T: it carries the tense. 'Not' is Neg. 'Leave' is V: it fits 'They will ___'. 'Early' is an adverb here: it fills the same slot as 'quickly' after the verb.",
      },
    ],
  },
  {
    id: "trees",
    title: "Phrase structure rules and trees",
    prompt: "What does a phrase structure rule say, and how do you use the rules to draw a tree?",
    guideId: "ling112/6-phrase-structure",
    sectionId: "rules",
    points: [
      { label: "Definition", detail: "A rule says what a phrase is made of and in what order: PP → P DP." },
      { label: "Reading notation", detail: "Parentheses mean optional; + means one or more." },
      { label: "DP, not NP", detail: "Every nominal is a DP: DP → (DP) D NP. Names and bare plurals get a silent determiner ∅." },
      { label: "TP, not S", detail: "TP → DP T VP, and T is never empty: a modal or auxiliary, or PAST / PRES." },
      { label: "Clauses in clauses", detail: "CP → C TP: 'that she had left'." },
      { label: "The drawing order", detail: "Find the verb and T, split subject from predicate, build each DP and PP, check that every word hangs from one node." },
    ],
    problems: [
      {
        task: "Draw the tree for 'Sarah will read the letter' in bracket form.",
        checklist: [
          "[TP [DP [D ∅] [NP [N Sarah]]] [T will] [VP [V read] [DP [D the] [NP [N letter]]]]]",
          "Sarah is a DP with a null determiner",
          "'will' sits in T",
          "'the letter' is a DP inside the VP",
        ],
        model: "[TP [DP [D ∅] [NP [N Sarah]]] [T will] [VP [V read] [DP [D the] [NP [N letter]]]]]. 'Sarah' is a DP with a silent D, 'will' fills T, and the VP holds the verb and its object DP.",
      },
      {
        task: "Draw 'The dog barked' in bracket form. What goes in T?",
        checklist: [
          "No modal or auxiliary, so T holds PAST",
          "[TP [DP [D the] [NP [N dog]]] [T PAST] [VP [V barked]]]",
          "T is never empty",
        ],
        model: "There's no auxiliary, so T holds the tense itself: [TP [DP [D the] [NP [N dog]]] [T PAST] [VP [V barked]]]. T is never empty in this class.",
      },
      {
        task: "Draw 'Ming said that Taro left' in bracket form.",
        checklist: [
          "Main TP: [DP Ming] [T PAST] [VP said CP]",
          "CP → C TP: [CP [C that] [TP [DP Taro] [T PAST] [VP left]]]",
          "Both clauses get their own T",
          "Names are DPs with a null D",
        ],
        model: "[TP [DP [D ∅] [NP Ming]] [T PAST] [VP [V said] [CP [C that] [TP [DP [D ∅] [NP Taro]] [T PAST] [VP [V left]]]]]]. The embedded clause is a CP: the complementizer 'that' plus a full TP with its own T.",
      },
    ],
  },
  {
    id: "xbar",
    title: "X-bar theory",
    prompt: "What is X-bar theory, and why do we need bar levels?",
    guideId: "ling112/7-x-bar",
    sectionId: "template",
    points: [
      { label: "The problem", detail: "Flat trees have no node for units like 'circle the track', and can't tell a complement from an adjunct." },
      { label: "The evidence", detail: "do so replaces V′ strings and one replaces N′ strings (handout (1) and (11)), so the tree needs a middle layer." },
      { label: "The template", detail: "XP → YP X′ (specifier); X′ → X′ ZP (adjunct); X′ → X WP (complement). Every phrase has XP, X′ and X." },
      { label: "Positions", detail: "Complement = sister of the head; adjunct = sister of X′ under X′; specifier = sister of X′ under XP." },
      { label: "Why adjuncts stack", detail: "X′ → X′ ZP has X′ on both sides, so it can repeat; the complement and specifier rules can't." },
      { label: "Specifiers", detail: "The subject is the specifier of TP; a possessor is the specifier of a DP headed by 's." },
    ],
    problems: [
      {
        task: "Draw 'The dog chased the cat in the yard' in X-bar form (brackets are fine) and name every dependent of 'chased'.",
        checklist: [
          "TP: the subject DP 'the dog' is the specifier; T = PAST",
          "T′ → T VP",
          "Lowest V′: [V chased] + complement DP 'the cat'",
          "'in the yard' is an adjunct: a second V′ above the first",
          "Every phrase has all three levels (DP, D′, D; NP, N′, N; PP, P′, P)",
        ],
        model: "[TP [DP [D′ [D the] [NP [N′ [N dog]]]]] [T′ [T PAST] [VP [V′ [V′ [V chased] [DP [D′ [D the] [NP [N′ [N cat]]]]]] [PP [P′ [P in] [DP [D′ [D the] [NP [N′ [N yard]]]]]]]]]]]. 'The cat' is the complement: sister of V. 'In the yard' is an adjunct: sister of the lower V′. 'The dog' is the specifier of TP.",
      },
      {
        task: "In 'those heavy sacks of flour in the corner', prove 'sacks of flour' is a unit smaller than the NP, and say where 'of flour' attaches.",
        checklist: [
          "one-substitution: 'those heavy ones in the corner' (ones = sacks of flour)",
          "So 'sacks of flour' is an N′",
          "'of flour' is the complement: sister of N 'sacks' on the lowest N′",
          "Evidence: *'those heavy ones of flour' fails, because a complement can't be left behind",
        ],
        model: "'Those heavy ones in the corner' works, with 'ones' standing for 'sacks of flour', so that string is an N′. 'Of flour' is the complement of 'sacks': it sits with the head on the lowest N′. That's why '*those heavy ones of flour' fails: 'one' can't strand a complement.",
      },
    ],
  },
  {
    id: "direction",
    title: "Head directionality",
    prompt: "What is head directionality, and why is it called a parameter?",
    guideId: "ling112/4-heads-dependents",
    sectionId: "dir",
    points: [
      { label: "Definition", detail: "The order of a head and its complement: head-initial (head first) or head-final (head last)." },
      { label: "Languages", detail: "English, Spanish and Arabic are head-initial; Japanese, Hindi/Urdu and Turkish are head-final." },
      { label: "A pair", detail: "English 'ate an apple' vs Japanese 'ringo-o tabe-ta' (apple-ACC eat-PAST)." },
      { label: "Consistency", detail: "The setting holds across phrase types: Japanese has postpositions ('Tokyo e'), English prepositions ('to Tokyo')." },
      { label: "Parameter", detail: "A switch set once per language: learn it from one pair and predict the rest." },
    ],
    problems: [
      {
        task: "A language has 'house-in' for 'in the house'. Predict its verb and object order and explain.",
        checklist: [
          "'house-in' is a postposition: head-final",
          "Predict object before verb (SOV)",
          "Because directionality is consistent across heads",
          "Compare Japanese",
        ],
        model: "'House-in' puts the head, the adposition, after its complement, so it's a postposition and the language is head-final. Directionality is a parameter set once, so I predict the verb also comes after its object: SOV, like Japanese.",
      },
      {
        task: "Gloss the Japanese phrase 'robotto no shasin' and say what it shows about headedness.",
        checklist: [
          "robotto no shasin = robot of picture",
          "'a picture of a robot'",
          "The head noun 'shasin' comes last",
          "Head-final, like the verb in 'ringo-o tabe-ta'",
        ],
        model: "Word by word it's 'robot of picture': 'a picture of a robot'. The head noun 'shasin' comes after its complement, so the noun phrase is head-final too, just like the verb after its object in 'ringo-o tabe-ta'.",
      },
    ],
  },
  {
    id: "ambiguity",
    title: "Structural ambiguity",
    prompt: "What is structural ambiguity, and how do you prove a sentence has two structures?",
    guideId: "ling112/5-constituency-tests",
    sectionId: "ambig",
    points: [
      { label: "Definition", detail: "One string of words, two groupings, two meanings. The words aren't ambiguous; the structure is." },
      { label: "Example", detail: "'I saw the spy with the telescope': the PP attaches to the verb (I used it) or to the noun (the spy had it)." },
      { label: "Proof", detail: "Constituency tests pull the two readings apart: each test result goes with one meaning." },
      { label: "Trees", detail: "Two trees: the PP inside the DP vs the PP as a sister of the V." },
    ],
    problems: [
      {
        task: "Explain the two readings of 'Chris hit the man with the umbrella' and prove one with a test.",
        checklist: [
          "Reading 1: Chris used the umbrella (PP attaches to the VP)",
          "Reading 2: the man had the umbrella (PP inside the DP)",
          "Substitution: replace 'the man with the umbrella' with 'him': only reading 2 survives",
          "Movement: 'With the umbrella, Chris hit the man' forces reading 1",
        ],
        model: "Two groupings. If 'with the umbrella' attaches to the verb phrase, Chris used the umbrella; if it's inside the DP, the man was holding it. Fronting proves reading 1: 'With the umbrella, Chris hit the man' can only mean Chris used it, because the PP moved as its own unit. Replacing 'the man with the umbrella' with 'him' proves reading 2.",
      },
    ],
  },
];

const BY_COURSE: Record<string, OralConcept[]> = { ling112: LING112 };

export function oralConcepts(course: string | undefined): OralConcept[] {
  return (course && BY_COURSE[course]) || [];
}
