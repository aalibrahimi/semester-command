from gb import *

g = {
 "id": "ling115/9-frequency-keyness",
 "course": "ling115",
 "lessons": "Weeks 5–6",
 "title": "Counting words: normalized frequency, Zipf's law and keyness",
 "summary": "Turn raw counts into per-million frequencies and explain why tiny corpora mislead; say why a count needs a concordance before it means anything; describe Zipf's law; define keyness, compute a log-likelihood keyness score by hand, and read a keyword list the way Farr & Murphy (2009) do.",
 "estimatedMinutes": 50,
 "sourceNote": "Week 5 Thursday slides (keyness), Week 6 overview (corpus statistics), Farr & Murphy 2009 'Religious references in contemporary Irish English' (the Monday reading), Benor & Levy 2006 (Wednesday reading). Dr. Kraus's Week 6 slides were not posted yet when this was written; recheck against them.",
 "requires": ["ling115/5-words-tokens-normalization"],
 "sections": [
  {"id": "why", "heading": "Why count at all", "blocks": [
    P("**The question** People say Irish English speakers use words like *God* and *Jesus* a lot, and mostly not about religion. Is that true, or just a stereotype? You can't answer that by asking people (they'll tell you what they *think* they say). You answer it by **counting** what they actually say, in a corpus, and comparing it with other speakers. That is exactly what Farr & Murphy (2009), your Monday reading, did.", slide="A stereotype you can test", why=True),
    P("**Why it matters outside class** Every 'word of the year', every dictionary's 'this word is informal' label, every spam filter and every authorship case (the Rowling example from Week 2) rests on the same move: count a word here, count it there, and ask whether the difference is real or just noise. This chapter is the toolkit for that."),
  ]},
  {"id": "norm", "heading": "Raw counts lie: normalize to per million", "blocks": [
    D("Raw frequency", "How many times a word occurs in a corpus. *God* occurs 785 times in the Limerick Corpus of Irish English (LCIE)."),
    D("Normalized (relative) frequency", "The count scaled to a common corpus size, usually **per million words**: `count ÷ corpus size × 1,000,000`. It lets you compare corpora of different sizes."),
    E("Why you must normalize", "Corpus A: 2,000,000 words, 'hell' occurs 200 times\nCorpus B:   500,000 words, 'hell' occurs  80 times\n\nRaw: A looks bigger (200 vs 80).\nPer million:\n  A = 200 ÷ 2,000,000 × 1,000,000 = 100 pm\n  B =  80 ÷   500,000 × 1,000,000 = 160 pm\n\nB actually uses 'hell' MORE often. Raw counts reward big corpora.", slide="200 vs 80, or 100 vs 160?"),
    P("Farr & Murphy say it directly: their corpora 'vary in size from half a million words to two million words, and so results are normalized to words per million'. Every table in the paper is per million from then on."),
    TRAP("Per million can make **tiny** corpora look impressive. Farr & Murphy's age groups are 15,000 words each. A score of **266 per million** there is 266 ÷ 1,000,000 × 15,000 = **4 actual occurrences**. One chatty speaker could produce all four. Always ask: how many raw hits is this?", "Farr & Murphy 2009, Table 7", slide="266 per million = 4 words"),
    C("A word occurs 12 times in a 60,000-word corpus. What is its frequency per million?", "12 ÷ 60,000 × 1,000,000 = 200 per million."),
  ]},
  {"id": "concord", "heading": "A count needs a concordance", "blocks": [
    D("Concordance (KWIC)", "Every occurrence of a search word printed with its left and right context, one per line (*Key Word In Context*). It is how you read what the word is actually doing in each hit."),
    P("The count of *God* doesn't tell you whether someone is praying or saying *oh my God* about a football match. Farr & Murphy read the concordance lines and split each count into **religious** and **non-religious** use. In LCIE, only **146 of 1,528** religious references are used religiously: about 1 in 10."),
    T(["Corpus", "Total", "Religious use", "Non-religious use"], [
      ["BNC written", "641", "523", "118"],
      ["BNC spoken", "748", "267", "481"],
      ["LCIE (Irish, casual talk)", "1528 pm", "146", "1382"],
    ], title="Same words, opposite patterns (Farr & Murphy Tables 1 and 3)", slide="Count, then split by meaning"),
    P("The written/spoken flip is the finding: in writing these words are mostly religious, in speech mostly not. No frequency list could show that; the concordance did."),
    D("Cluster (n-gram)", "A sequence of words that recurs: *oh my God* (243 times in LCIE), *swear to God* (33), *thank God* (34). Looking left and right of a search word in the concordance is how you find them."),
    C("Why couldn't Farr & Murphy split the 3,500 hits in Table 2 into religious and non-religious uses?", "They say it was too much work and too often ambiguous to decide with confidence. So Table 2 is undifferentiated counts only, and they did the careful split just for LCIE."),
  ]},
  {"id": "zipf", "heading": "Zipf's law: a few words do most of the work", "blocks": [
    D("Zipf's law", "In any large corpus, a word's frequency is roughly **inversely proportional to its rank**: the 2nd most common word appears about half as often as the 1st, the 3rd about a third as often, and so on. frequency × rank ≈ constant."),
    E("What it looks like", "rank 1  'the'  ~ 60,000 per million\nrank 2  'of'   ~ 30,000\nrank 3  'and'  ~ 20,000\nrank 10         ~  6,000\nrank 100        ~    600\n\nA handful of function words cover a huge share of all tokens;\na very long tail of words appears once or twice (the hapaxes from Week 3).", slide="Rank × frequency ≈ constant"),
    P("**Why it matters for you** It means most words are rare. A 15,000-word corpus will have most content words at 0 or 1 hits, which is why the tiny-corpus trap above bites so hard, and why comparing two corpora needs a statistic, not eyeballing."),
    C("If the most frequent word in a corpus has 50,000 hits, roughly how many would Zipf's law predict for the 5th most frequent?", "About 50,000 ÷ 5 = 10,000."),
  ]},
  {"id": "key", "heading": "Keyness: what makes this corpus different", "blocks": [
    D("Keyness", "How much **more frequent** (or less) a word is in a **target** corpus than in a larger **reference** corpus, measured with a statistic (usually **log-likelihood**). Dr. Kraus's definition: 'words that are statistically more prominent, frequent, or significant in a target text or corpus compared to a larger reference corpus'. It is a measure of **statistical salience**."),
    P("Frequency lists tell you what is common. **Keyword** lists tell you what is *characteristic*. *the* is the most frequent word everywhere, so it is never key. Farr & Murphy ran a keyword list on their female talk corpus against a reference corpus, and six religious words came out in the top 20 (*God* was number 1). That was their first signal that something was going on.", slide="Frequent vs key"),
    E("Log-likelihood, step by step", "a = hits in target      = 90   (target size c = 45,000)\nb = hits in reference   = 600  (reference size d = 1,000,000)\n\nExpected, if the word were equally common everywhere:\n  E1 = c × (a + b) / (c + d) = 45,000 × 690 / 1,045,000 = 29.7\n  E2 = d × (a + b) / (c + d) = 1,000,000 × 690 / 1,045,000 = 660.3\n\nLL = 2 × ( a·ln(a/E1) + b·ln(b/E2) )\n   = 2 × ( 90·ln(90/29.7) + 600·ln(600/660.3) )\n   = 84.6\n\nLL above 3.84 → significant at p < 0.05; above 6.63 → p < 0.01.\n84.6 is far above: this word is KEY in the target.", answer="LL ≈ 84.6, key (p < 0.01)", slide="Computing keyness"),
    P("Read it in plain words: we **expected** about 30 hits in the target if it talked like the reference; we **saw** 90. Log-likelihood measures how surprising that gap is, taking both corpus sizes into account. The bigger the number, the more surprising."),
    TRAP("Key does not mean frequent. A word can be key with only a few dozen hits if the reference almost never uses it, and a very frequent word is often not key at all. And 'statistically significant' does not tell you *why*; you still go back to the concordance.", "Week 5 Thursday quiz (true/false on keyness)"),
    C("True or false: keyness is a measure of statistical salience.", "True (that was the Week 5 Thursday quiz question). It measures how unexpectedly frequent a word is in the target compared with the reference."),
  ]},
  {"id": "vars", "heading": "Using counts to compare groups", "blocks": [
    P("Once you can normalize and test, you can compare **groups of speakers**. Farr & Murphy compared age groups and men vs women, all per million."),
    T(["Finding", "Evidence (per million)"], [
      ["Religious references are mostly an informal-speech thing", "LCIE 1528, teen London talk 1322, vs academic 204–397 and US political 85 (Table 2)"],
      ["Oldest speakers use them most, and more often in the religious sense", "female 70s/80s: 2266 religious-use pm vs 0 for 20s (Table 8)"],
      ["Men use them more, and the 'stronger' ones", "total MAC 12,992 vs FAC 9,793; Christ 3199 vs 666 (Table 9)"],
      ["Oh my God is a young-female cluster", "467 pm in female 20s vs 200 in 40s (Table 11); linked to the sitcom Friends"],
    ], title="Farr & Murphy's main results", slide="What the counts showed"),
    P("**The other reading (Benor & Levy 2006)** does the same kind of work for word order: in binomials like *salt and pepper* or *ladies and gentlemen*, which word comes first? They count real binomials in corpora and model the ordering as **probabilistic** preferences (meaning, sound/rhythm, frequency) rather than strict rules. Same toolkit, different question."),
    C("A table says women in their 40s use 'Almighty' at 266 per million, in a 15,000-word sub-corpus. How many times did anyone actually say it?", "266 × 15,000 ÷ 1,000,000 ≈ 4 times. Worth remembering before drawing big conclusions."),
  ]},
 ],
 "exercises": [
  EX("normalize", "Normalize and compare",
     "'Jesus' occurs 462 times in the 1-million-word LCIE, and 22 times in a 500,000-word corpus of London teen talk. Which group uses it more, per million?",
     ["Convert both to per million.", "LCIE is already 1 million words, so its count is its per-million rate.", "Teens: 22 ÷ 500,000 × 1,000,000."],
     ["LCIE: 462 per million.", "Teens: 22 ÷ 500,000 × 1,000,000 = 44 per million.", "The Irish speakers use it about ten times as often."],
     "Normalizing is the one step that makes every other comparison honest; forgetting it is the most common error in student corpus projects, including final papers.", ref="norm"),
  EX("keyness-ll", "Is it key?",
     "A word appears 20 times in your 45,000-word target corpus and 400 times in a 1,000,000-word reference. Expected counts come out to E1 = 18.1 and E2 = 401.9. The log-likelihood is 0.20. Is the word key?",
     ["Compare what you saw with what you expected in the target: 20 vs 18.1.", "The cut-off for p < 0.05 is 3.84.", "0.20 is far below 3.84."],
     ["Observed 20 vs expected 18.1: almost the same.", "LL = 0.20 < 3.84: not significant.", "The word is not key; the target uses it at about the same rate as the reference (444 vs 400 per million)."],
     "Keyword lists are how corpus linguists find what to look at first. Knowing when a difference is just noise keeps you from building a paper on four lucky hits.",
     choices=[{"text": "No, LL is below 3.84", "feedback": "Right: observed and expected are nearly equal."}, {"text": "Yes, it appears more per million in the target", "feedback": "444 vs 400 per million is a small gap; the test says it could easily be chance."}], answer=0, ref="key"),
 ],
}
build(g)
