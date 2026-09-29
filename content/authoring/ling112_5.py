"""LING 112 · Chapter 5 rebuilt from zero: Constituent structure and constituency tests."""
from l112common import *  # noqa

O = Orig(5)


def ob(pred_or_id, **over):
    if isinstance(pred_or_id, str):
        return O.block(pred_or_id, **over)
    for s in O.g["sections"]:
        for b in s["blocks"]:
            if pred_or_id(b):
                return O.block(b["id"], **over)
    raise KeyError


SENT = "Those tall spies in the garden will quickly stash the evidence after midnight."
SENT_BR = "[TP [DP [D Those] [NP [AdjP [Adj tall]] [N spies] [PP [P in] [DP [D the] [NP [N garden]]]]]] [T will] [VP [AdvP [Adv quickly]] [V stash] [DP [D the] [NP [N evidence]]] [PP [P after] [DP [D ∅] [NP [N midnight]]]]]]"

MOVE = [
    lines([SENT], 0, "Test 2 is movement: pick up a string and put it somewhere else. If the sentence still works, the string moved as one block."),
    lines([SENT, "The evidence, those tall spies will quickly stash after midnight.  ✓"], 1, "Topicalization: move 'the evidence' to the front. Works, so 'the evidence' is a unit."),
    lines([SENT, "The evidence, those tall spies will quickly stash after midnight.  ✓", "After midnight, those tall spies will quickly stash the evidence.  ✓"], 2, "Front 'after midnight'. Works too."),
    lines([SENT, "It's the evidence that those tall spies will quickly stash after midnight.  ✓"], 1, "Clefting: wrap it in 'It's ___ that…'. 'the evidence' fits the slot, so it's a unit."),
    lines([SENT, "*Stash the, those tall spies will quickly evidence after midnight.  ✗"], 1, "Now a fake unit: 'stash the'. It can't move. Every piece of evidence says it's not a constituent."),
]

FRAG = [
    lines([SENT], 0, "Test 3 is the fragment answer: ask a question about the sentence. If the string can be the whole answer by itself, it's a unit."),
    lines([SENT, "Q: Who will stash the evidence?", "A: Those tall spies in the garden.  ✓"], 2, "The whole subject answers 'who?'. NP constituent."),
    lines([SENT, "Q: Where are the spies?", "A: In the garden.  ✓"], 2, "'where?' is answered by the PP."),
    lines([SENT, "Q: What will they do?", "A: Quickly stash the evidence after midnight.  ✓"], 2, "'what will they do?' is answered by a whole VP."),
    lines([SENT, "Q: ???", "A: *Stash the.  ✗"], 2, "No question in English has 'stash the' as its answer. Not a unit."),
]


g = {
 "id": "ling112/5-constituency-tests",
 "course": "ling112",
 "lessons": "Week 5",
 "title": "Constituent structure and constituency tests",
 "summary": "From zero: what a constituent is, the three tests that prove one (substitution, movement, fragment answer) with each term defined before it's used, how to use the tests to pull apart an ambiguous sentence, and how to write a full Quiz 2 answer.",
 "estimatedMinutes": 60,
 "sourceNote": "Week 5 handout (Constituent structure), TrevTutor 'Constituents and Constituency Tests', the Sep 15 and 17 classes. Quiz 2 covers this. Rebuilt for readers who missed class: pro-form, topicalization, cleft, N-bar and finiteness are each defined before they are used.",
 "requires": ["ling112/4-heads-dependents"],
 "sections": [
  {"id": "why", "heading": "Start here: what a constituent is", "blocks": [
    P("**Dr. Nie opens Week 5 with a review.** Define phrase, head, dependent, complement, adjunct and head directionality (all from Week 4), then say which ones a dependency diagram shows clearly. Answer below; open it after you try.", slide="The warm-up"),
    E("Warm-up: what do dependency diagrams show well?", "Which Week 4 ideas can you read straight off the arrows, and which can't you?", answer="**Shown clearly:** head and dependent (every arrow goes head → dependent), and head directionality (do the arrows to complements point right or left?).\n\n**Not shown clearly:** phrases (you have to collect a head and everything under it yourself), and complement vs adjunct (both are just arrows; nothing marks which is which).\n\nThat gap is why Week 5 switches to constituents and Week 6 to trees, where phrases are visible as nodes.", slide="Warm-up answer"),
    D("Constituent", "A group of words that **behaves as one unit** in a sentence. You can't see it by looking; you prove it with a **test**. A single word always counts; the tests are for strings of two or more words.", slide="Definition"),
    P("**One example.** In *Those tall spies in the garden will quickly stash the evidence after midnight*, is *the evidence* a unit? Replace it with *it*: …will quickly stash **it** after midnight. Works. So yes. Is *stash the* a unit? Replace it with any one word: nothing works. So no. Every pair of neighbors **looks** like a group; only the tests tell you which ones are real.", slide="The idea in one example"),
    CARDS([
      ("Substitution", "#1", ["Swap the string for one short word.", "*the evidence* → *it*"], "brand"),
      ("Movement", "#2", ["Move the string somewhere else.", "*The evidence, they stashed.*"], "green"),
      ("Fragment answer", "#3", ["Let it answer a question by itself.", "*What did they stash? The evidence.*"], "amber"),
    ], "The three tests. Passing any one of them proves the string is a constituent.", slide="The three tests"),
    CMP(("A test PASSES", "the string works", "green"), ("A test FAILS", "the string doesn't work", "red"), [
      ("What it proves", "Yes, it's a constituent", "Nothing yet: try another test"),
      ("Can you then say 'not a constituent'?", "No: it IS one", "Only if EVERY test fails"),
    ], "The rule Dr. Nie stresses: a pass is proof, a fail is silence. Some real constituents fail one test and pass another.", slide="Pass = proof, fail = try again"),
    O.block("why.8f3a6d2c", slide="What the tests are drawing"),
    SIM("tree", "The handout sentence as a tree. Every node is a constituent. Click **NP**, **VP** or **PP** to see which words it covers and which test would prove it. Try to find a node that covers exactly *stash the*: there isn't one.", {"bracket": SENT_BR}),
    C("*The dog chased the cat.* Is *chased the* a constituent? Try one test.", "No. Substitution: no single word replaces *chased the* (*The dog **it** cat* is nonsense). Movement and fragment answers fail too."),
  ]},
  {"id": "sub", "heading": "Test 1: substitution (swap it for one word)", "blocks": [
    D("Pro-form", "A short word that stands in for a whole unit. *It*, *they*, *him* stand in for a noun phrase; *there*, *then* for a place or time phrase; *do so* for a verb phrase. 'Pro' means 'in place of', like pronoun.", slide="Pro-form"),
    D("Substitution test", "Replace the string with one pro-form. If the sentence still works (and means the same thing), the string is a constituent. The pro-form also tells you what **kind** of phrase it is.", slide="Substitution test"),
    O.block("sub.e2cec6e2", slide="Which pro-form goes with which phrase"),
    D("N-bar (N′)", "A middle-sized unit: the noun **plus** what's attached to it, **minus** the determiner. In *those tall spies in the garden*, the N-bar is *tall spies in the garden*. Its pro-form is *one(s)*: those **ones**. It shows that a noun phrase has a layer inside it.", slide="N-bar"),
    ob(lambda b: b["type"] == "stepper" and "substitution" in b["title"].lower(), slide="Running substitution on handout (3)"),
    TRAP("**'ones' never takes the determiner.** Those tall **ones** works; `*ones in the garden` for the whole phrase does not. That's why NP (with *the*/*those*) and N-bar (without) are two different units.", "Week 5 handout", slide="Trap: 'ones' leaves D behind"),
    C("*She met the new teacher from Ohio.* Replace *teacher from Ohio* with one word. What does that prove?", "She met the new **one**. One word replaced *teacher from Ohio*, so it's a unit: an N-bar. *the* stays outside, as always."),
  ]},
  {"id": "move", "heading": "Test 2: movement (can it travel as a block?)", "blocks": [
    D("Movement test", "Pick up the string and put it somewhere else in the sentence. If the result is grammatical, the words traveled together, so they're one unit. English has two easy ways to move things: topicalization and clefting.", slide="Movement test"),
    D("Topicalization", "Move the string to the **front**, followed by a comma: *The evidence, the spies will stash after midnight.* It sounds a bit dramatic, but it's grammatical."),
    D("It-cleft", "Put the string in the frame **It's ___ that…**: *It's the evidence that the spies will stash.* 'Cleft' means split: the sentence is split around the string."),
    ST("Running movement on handout (3)", MOVE),
    O.block("move.6d57d3e8"),
    C("Use a cleft to prove *after midnight* is a constituent.", "*It's after midnight that those tall spies will stash the evidence.* ✓"),
  ]},
  {"id": "frag", "heading": "Test 3: fragment answer (can it answer alone?)", "blocks": [
    D("Fragment answer test", "Ask a question about the sentence (who, what, where, when, what did they do). If the string can be the **whole answer**, said on its own, it's a constituent. Only units can stand alone like that.", slide="Fragment answer test"),
    ST("Asking questions about handout (3)", FRAG),
    O.block("frag.bcb9162e", slide="All the fragment answers for handout (3)"),
    C("*Mia left her keys on the counter.* Prove *on the counter* is a constituent with a fragment answer.", "*Where did Mia leave her keys?* *On the counter.* ✓"),
  ]},
  {"id": "ambig", "heading": "Using the tests on an ambiguous sentence", "blocks": [
    D("Structural ambiguity", "One word order, **two groupings**, two meanings. The words aren't ambiguous; the structure is. The tests let you prove each grouping exists.", slide="Definition"),
    O.block("ambig.6ccc92dd"),
    O.block("ambig.7d4e2b9f", slide="Two trees, and the tests that tell them apart"),
    O.block("ambig.f92e84be", slide="Reading A: the cane is the instrument"),
    O.block("ambig.5b5d8605", slide="Reading B: the man has the cane"),
    ob(lambda b: b["id"].startswith("ambig.") and b["type"] == "prose" and b["md"].startswith("**Where")),
  ]},
  {"id": "finite", "heading": "A note on tense: finite vs non-finite verb phrases", "blocks": [
    D("Finite / non-finite", "A verb is **finite** when it carries tense itself (*submitted*, *submits*). It's **non-finite** when it doesn't, usually because a helper like *will* carries the tense instead (*will* **submit**).", slide="Finite vs non-finite"),
    O.block("finite.75776839"),
    O.block("finite.93409973"),
  ]},
  {"id": "practice", "heading": "Practice: a full Quiz 2 answer (handout (4) to (6))", "blocks": [
    O.block("practice.64b07ee6"),
    O.block("practice.9e6b3a7c", slide="The test loop: substitute → move → fragment"),
  ] + [ob(lambda b, t=t: b.get("title", "").startswith(t)) for t in ["That officer", "I will invest", "Lee paraded"]] + [
    O.block("practice.144e377c"),
    O.block("practice.3c134055"),
    O.block("practice.d9adccb2"),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Constituent", "A group of words that behaves as one unit; proven by a test."],
      ["Pro-form", "A short word standing in for a unit: it, they, there, then, do so, one(s)."],
      ["Substitution", "Test 1: swap the string for one pro-form."],
      ["Topicalization", "Move the string to the front: The evidence, they stashed."],
      ["It-cleft", "Put the string in 'It's ___ that…'."],
      ["Fragment answer", "Test 3: the string answers a question by itself."],
      ["N-bar (N′)", "A noun plus its attachments, without the determiner; replaced by one(s)."],
      ["Structural ambiguity", "One word order, two groupings, two meanings."],
      ["Finite / non-finite", "The verb carries tense itself / a helper like 'will' carries it."],
    ]),
  ]},
 ],
 "exercises": O.exercises() + [
  MC("which-proform", "Pick the pro-form", "Which pro-form tests whether *in the kitchen* is a constituent in *We ate in the kitchen*?", ["there", "it", "do so", "one"], 0,
     ["Yes: a place phrase (PP) is replaced by 'there'.", "'it' replaces noun phrases.", "'do so' replaces verb phrases.", "'one' replaces an N-bar."],
     "**there.** *We ate there.* ✓", "Choosing the right pro-form also tells you the phrase type.", ref="sub"),
  MC("fail-means", "What does a failed test mean?", "*The garden* fails the movement test in *Those spies in the garden will stash it* ('*The garden, those spies in will stash it'). What can you conclude?", ["Nothing yet: try another test", "It's not a constituent", "It's an adjunct", "The sentence is ambiguous"], 0,
     ["Right. A fail is silence. Substitution ('in it') shows it IS a constituent.", "One failed test never proves that; it's too deeply embedded to move.", "Movement doesn't test for adjuncts.", "Nothing here has two meanings."],
     "**Nothing yet.** Try substitution: the spies in **it**. ✓ So it is a constituent.", "Dr. Nie: 'you may need to try multiple tests before you find one that works'.", ref="move"),
  MC("cleft-which", "Which cleft works?", "Which cleft proves a constituent in *Ana bought a red bike yesterday*?", ["It was a red bike that Ana bought yesterday.", "It was bought a that Ana red bike yesterday.", "It was Ana bought that a red bike yesterday.", "It was red bike yesterday that Ana bought a."], 0,
     ["Yes: 'a red bike' fits the slot, so it's a unit.", "'bought a' isn't a unit.", "The frame is broken: 'Ana bought' isn't what goes in the slot here.", "'red bike yesterday' crosses two phrases."],
     "**It was a red bike that Ana bought yesterday.**", "Writing out the actual test sentence is what earns the points on Quiz 2.", ref="move"),
  MC("frag-q", "Which question?", "To prove *to her sister* is a constituent in *Jo sent a card to her sister*, which question do you ask?", ["Who did Jo send a card to?", "What did Jo send?", "Did Jo send a card?", "When did Jo send it?"], 0,
     ["Yes: the answer 'To her sister.' stands alone.", "That question is answered by 'a card'.", "A yes/no question is answered by yes or no, not a fragment.", "That asks about time, which isn't in the sentence."],
     "**Who did Jo send a card to?** → *To her sister.* ✓", "Pick the question whose natural answer is exactly the string.", ref="frag"),
 ],
}

finish(g)
