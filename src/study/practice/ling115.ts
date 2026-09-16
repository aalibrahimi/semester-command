import type { Exercise } from "../types";

/**
 * LING 115 · "Do it yourself" sets. Shaped like Kraus's chance quizzes and
 * homework: a true/false with reasoning, then 'name what this choice erases'.
 */
export const ling115Practice: Record<string, Exercise[]> = {
  "1-what-is-a-corpus": [
    {
      id: "design-a-corpus",
      title: "Design a corpus for a question",
      prompt: "Research question: 'Do American political speeches use more first-person plural (*we, our*) now than in the 1960s?' Specify: the population, a sampling frame, two balance decisions, whether you need a reference or monitor corpus, and one thing your design cannot answer.",
      hints: [
        "Work top-down: population = the language you're making a claim about (which speeches, which decades). Sampling frame = the concrete texts you can actually get. Balance = what proportions you'll hold constant so the comparison is fair.",
        "The weak design compares 'all speeches I could find from each era'. That confounds the question with genre: if the 1960s sample is mostly inaugural addresses and the 2020s sample is mostly rally speeches, you've measured genre, not time.",
        "Hold constant: speech type (say, State of the Union only), speaker role, and length or word count per decade. Then the one thing you can't answer: anything about speeches of a type you excluded, or about *why* the rate changed.",
      ],
      solution: [
        "Population: transcribed American presidential speeches of a fixed type, 1960s vs 2020s.",
        "Sampling frame: official transcripts (e.g. the American Presidency Project) of State of the Union addresses in each decade.",
        "Balance: same speech type across decades; roughly equal word counts per decade; both parties represented in each.",
        "Reference corpora — two fixed snapshots — since the question compares two periods, not a moving target.",
        "Cannot answer: whether rally or campaign speeches changed, or why the pronoun rate moved. It's a description of a rate, not an explanation.",
      ],
      why: "Every data-science project that compares two groups fails or succeeds on this step, before any code runs. The 'linguist as data architect' is the person who notices the genre confound before the results are published.",
    },
  ],

  "4-regex": [
    {
      id: "predict-matches",
      title: "Predict the matches before you run it",
      prompt: "Text: `The cat sat. Then the caterpillar concatenated categories at 3:45.` Without running anything, list what each pattern returns from `re.findall`: (a) `cat` (b) `\\bcat\\b` (c) `cat\\w+` (d) `\\d+:\\d+` (e) `[Tt]he`. Then run it in Colab and compare.",
      hints: [
        "Walk the text left to right for each pattern. `cat` with no anchors matches inside longer words. `\\b` is a word boundary — it forbids a word character on that side.",
        "The usual miss is (b): people say 'cat' appears once. Check 'caterpillar', 'concatenated', 'categories' — `cat` is inside each, but `\\bcat\\b` rejects all three because a letter follows. And in (c), `\\w+` is greedy — it eats to the end of the word.",
        "For (e), the class `[Tt]` matches one character: capital or lowercase T. Count both 'The' and 'the' — and check 'Then': does `[Tt]he` match inside it?",
      ],
      solution: [
        "(a) `cat` → ['cat', 'cat', 'cat', 'cat'] — in cat, caterpillar, concatenated, categories.",
        "(b) `\\bcat\\b` → ['cat'] — only the standalone word.",
        "(c) `cat\\w+` → ['caterpillar', 'categories'] plus the tail of concatenated: actually the match starts at 'cat' inside con**cat**enated → 'catenated'. So ['caterpillar', 'catenated', 'categories']. The standalone 'cat' has no word character after it, so it's excluded.",
        "(d) `\\d+:\\d+` → ['3:45'].",
        "(e) `[Tt]he` → ['The', 'The', 'the'] — 'The' at the start, 'The' inside 'Then', and 'the'. Add `\\b` on the right to exclude 'Then'.",
      ],
      why: "Predicting before running is how you catch the silent regex bug — the pattern that matches too much and quietly corrupts your counts. In corpus work, a wrong regex doesn't crash; it produces a plausible wrong number.",
    },
    {
      id: "write-patterns",
      title: "Write four patterns",
      prompt: "Write a regex for each, then a sentence on one thing it will wrongly catch or miss: (a) words ending in -ly; (b) a US phone number like 408-555-1234; (c) any form of *walk* (walk, walks, walked, walking); (d) a hashtag.",
      hints: [
        "Build each from pieces: what must be there, what's optional, where the boundaries are. Use `\\b` to stop matches from leaking into neighbouring words.",
        "The classic errors: (a) `ly` alone matches 'lyric'; (c) `walk.*` runs to the end of the line; (d) `#\\w` matches only one character after the hash.",
        "For each pattern, think of one false positive ('fly' for -ly? 'walkway' for walk?) and one false negative (a phone number with dots or parentheses). That sentence is worth as much as the pattern.",
      ],
      solution: [
        "(a) `\\b\\w+ly\\b` — catches 'family', 'fly', 'July' (not adverbs); misses nothing ending in -ly.",
        "(b) `\\b\\d{3}-\\d{3}-\\d{4}\\b` — misses (408) 555-1234 and 408.555.1234; a more tolerant version: `\\(?\\d{3}\\)?[-. ]?\\d{3}[-. ]\\d{4}`.",
        "(c) `\\bwalk(s|ed|ing)?\\b` — catches all four; misses 'walker' (arguably right) and would need `(?:…)` in findall to return whole words.",
        "(d) `#\\w+` — catches '#fyp', '#2024'; misses hashtags with hyphens or emoji, and will match '#' inside URLs or CSS colours like '#fff'.",
      ],
      why: "Writing the pattern is half the job; writing what it gets wrong is the other half — that's the 'name what this choice erases' habit Kraus grades for, applied to code. In production, the second sentence becomes the unit test.",
    },
  ],

  "5-words-tokens-normalization": [
    {
      id: "count-and-decide",
      title: "Count tokens and types — then defend the count",
      prompt: "Text: `I can't believe it's already 5pm! I CAN'T. Time flies, doesn't it? #mood 😩` Give the token count and type count under (A) whitespace splitting with no changes and (B) NLTK-style tokenization with lowercasing. Then write two sentences on what (B) erased that a study of *register* would need.",
      hints: [
        "For (A), just count space-separated chunks — punctuation stays attached ('5pm!' is one token). For (B), NLTK splits 'can't' into 'ca' + \"n't\", separates punctuation, and lowercasing merges 'I CAN'T' with 'I can't'.",
        "The usual error is doing only one count and treating it as *the* answer. The exercise is about how the count *changes* with the decision, and being able to say by how much.",
        "What does 'CAN'T' in capitals tell you that 'can't' doesn't? What does the emoji do to the sentence's tone? Those are the register signals lowercasing and emoji-stripping delete.",
      ],
      solution: [
        "(A) Whitespace: I · can't · believe · it's · already · 5pm! · I · CAN'T. · Time · flies, · doesn't · it? · #mood · 😩 → 14 tokens. Only 'I' repeats exactly ('can't' and 'CAN'T.' differ in case and punctuation), so 13 types.",
        "(B) NLTK + lowercase: i · ca · n't · believe · it · 's · already · 5pm · ! · i · ca · n't · . · time · flies · , · does · n't · it · ? · # · mood · 😩 → 23 tokens; types: i, ca, n't, believe, it, 's, already, 5pm, !, ., time, flies, ,, does, ?, #, mood, 😩 → 18 types.",
        "TTR moves from 13/14 ≈ 0.93 to 18/23 ≈ 0.78 — from the decisions alone, not the text.",
        "(B) erased emphasis (CAN'T vs can't — shouting is register), and stripping/separating the emoji loses the exasperated tone that flips the meaning of 'Time flies'. A register study needs both preserved.",
      ],
      why: "Two people can 'count the words' in the same text and get numbers 60% apart, both correct under their decisions. Reporting the decisions with the number is what makes a result reproducible — the whole point of documentation in Lectures 7–8.",
    },
    {
      id: "ttr-trap",
      title: "The TTR comparison trap",
      prompt: "A classmate reports: 'Brown's *news* category has TTR 0.14 and *science fiction* has TTR 0.19, so sci-fi authors use a richer vocabulary.' Is the conclusion justified? What one fact would you need to check first, and what would you do instead?",
      choices: [
        { text: "Yes — a higher TTR means more types per token, which is richer vocabulary by definition.", feedback: "That's the definition, but TTR falls with length (Heaps' law). If the two categories have different sizes, the comparison is meaningless." },
        { text: "Not yet — check the token counts of the two categories; if they differ, compare TTR on equal-size samples (e.g. the first 10,000 tokens of each).", feedback: "Right. Brown's news category is about 100k tokens and science fiction about 14k; the smaller one has a higher TTR almost automatically." },
        { text: "No — TTR can never be compared across texts.", feedback: "Too strong. It can be compared when the texts are the same length, or with a length-corrected measure." },
      ],
      answer: 1,
      hints: [
        "Recall what happens to TTR as a text gets longer. Then ask: are the two categories the same length?",
        "The reflex is to accept a number because it's a number. The chapter's caveat (Alice vs Moby Dick) is exactly this case.",
        "The fix is mechanical: sample equal-size windows from each, or use a size-corrected measure, and *then* compare.",
      ],
      solution: [
        "Not justified as stated. TTR decreases with text length because vocabulary grows as K·nᵝ with β < 1 — bigger corpus, lower ratio.",
        "Check the token counts: in Brown, news ≈ 100,000 tokens, science fiction ≈ 14,000. The smaller category is expected to have a higher TTR regardless of style.",
        "Instead: compute TTR on equal-size samples (first 10,000 tokens of each, or averaged over 10k windows), or use a length-corrected measure (MTLD, or a standardized TTR).",
        "Then, if sci-fi is still higher, you can start to talk about vocabulary — and even then it's a claim about these texts, not about 'sci-fi authors'.",
      ],
      why: "Comparing rates across groups of different sizes is the most common statistical mistake in any field — from 'this city has more crime' to 'this model has more errors'. Heaps' law is just the linguistics version. Catching it is what 'quantitative literacy' means.",
    },
  ],

  "7-annotation-pos": [
    {
      id: "tag-and-doubt",
      title: "Tag it, then say where a tagger would fail",
      prompt: "Give Penn Treebank tags for every word in: 'Flying planes can be dangerous.' Give both readings. Then name the one word whose tag decides the reading, and say what a statistical tagger would probably do and why.",
      hints: [
        "Reading 1: planes that are flying are dangerous (Flying is an adjective-like modifier of planes). Reading 2: the act of flying planes is dangerous (Flying is a gerund verb taking 'planes' as its object).",
        "The typical answer stops at 'it's ambiguous'. The question asks for two complete tag sequences and for *which tag* differs — that's the precision Kraus grades for.",
        "PTB: VBG for the -ing verb form (used for both gerunds and participles); JJ for an adjective. 'planes' is NNS either way; 'can' MD; 'be' VB; 'dangerous' JJ. A tagger sees 'Flying' sentence-initially before a plural noun and picks by frequency in its training data.",
      ],
      solution: [
        "Reading 1 (planes that fly): Flying/VBG (participle modifying planes) planes/NNS can/MD be/VB dangerous/JJ ./. — some annotators would use JJ for 'Flying' here.",
        "Reading 2 (the activity): Flying/VBG (gerund, head of the subject) planes/NNS can/MD be/VB dangerous/JJ ./.",
        "The deciding word is 'Flying' — VBG-as-modifier (or JJ) versus VBG-as-gerund-head. PTB's tag alone doesn't distinguish them; the *tree* does (is 'planes' the head of the subject or the object of 'Flying'?).",
        "A statistical tagger will output VBG for 'Flying' either way, because sentence-initial -ing words before nouns are overwhelmingly VBG in the Wall Street Journal. It won't 'see' the ambiguity — which is Kraus's point: tagging doesn't resolve ambiguity; it papers over it.",
      ],
      why: "This is Chomsky's example, and it's on every NLP course because it shows the limit of tagging: the tag can be 'right' while the meaning is still open. Knowing where a pipeline hides ambiguity is what makes you able to audit one.",
    },
    {
      id: "datasheet",
      title: "Write the datasheet questions you'd ask",
      prompt: "Someone hands you 'a corpus of 50,000 tweets about the election' with no documentation. List six questions a datasheet should answer for it, grouped as: how it was collected, how it was cleaned, what it can and can't be used for. For two of them, say what goes wrong if the answer is bad.",
      hints: [
        "Gebru et al.'s sections: motivation, composition, collection process, preprocessing/cleaning, uses, distribution, maintenance. Pick questions from collection, cleaning, and uses.",
        "The thin answer lists generic questions ('what's in it?'). Make each one specific to tweets: which keywords or hashtags selected them? which language filter? were retweets kept? were emojis or URLs stripped?",
        "For 'what goes wrong': if the tweets were selected by one hashtag, you've sampled one side's vocabulary; if retweets were kept, a single viral tweet may be 5% of your tokens.",
      ],
      solution: [
        "Collection: (1) What query — keywords, hashtags, accounts — selected these tweets, and on what dates? (2) Was there a language or location filter, and how was it applied?",
        "Cleaning: (3) Were retweets and duplicates removed? (4) Were URLs, @mentions, emojis, or hashtags stripped or kept, and were tweets lowercased?",
        "Uses: (5) What research question was it built for, and what populations does it not represent (people without Twitter accounts; suspended accounts)? (6) Can it be redistributed given Twitter's terms, and are user IDs anonymized?",
        "If (1) is one partisan hashtag, any 'both sides' analysis is invalid — you sampled one community. If (3) kept retweets, frequency counts are dominated by a few viral texts and your TTR and keyword lists describe those, not the discourse.",
      ],
      why: "Every model trained on undocumented data inherits its blind spots invisibly; datasheets are the industry's answer, and writing one is now a routine part of shipping a dataset. Being the person who asks these six questions before the analysis starts is the job Kraus is training you for.",
    },
  ],
};
