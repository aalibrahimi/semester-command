"""LING 112 · Chapter 4 rebuilt from zero: Heads, dependents, complements and adjuncts."""
from l112common import *  # noqa

O = Orig(4)


# ── Figure: the drop test that finds the head ──────────────────────────────
def fig_drop():
    out = [f"<g {FONT}>"]
    words = ["several", "large", "books"]
    rows = [(0, True, "Drop 'several': 'large books' is still a books-phrase. Not the head."),
            (1, True, "Drop 'large': 'several books' is still a books-phrase. Not the head."),
            (2, False, "Drop 'books': 'several large' is not a phrase about anything. 'books' is the head.")]
    out.append(f"<text x='20' y='24' font-size='13' font-weight='700'>Take one word away at a time. Which loss breaks the phrase?</text>")
    y = 44
    for drop, ok, t in rows:
        x = 40
        out.append(f"<g><title>{t}</title>")
        for i, w in enumerate(words):
            wd = len(w) * 10 + 26
            gone = i == drop
            col = (G if not ok else "currentColor") if gone else ("currentColor")
            op = "0.35" if gone else "1"
            dash = "stroke-dasharray='5 4'" if gone else ""
            fill = "none" if gone else soft(A, 0.10)
            stroke = "currentColor" if gone else A
            out.append(f"<rect x='{x}' y='{y}' width='{wd}' height='38' rx='8' fill='{fill}' stroke='{stroke}' stroke-opacity='{op}' stroke-width='1.4' {dash}/>"
                       f"<text x='{x + wd / 2}' y='{y + 25}' text-anchor='middle' font-size='16' opacity='{op}'>{w}</text>")
            if gone:
                out.append(f"<line x1='{x + 8}' y1='{y + 19}' x2='{x + wd - 8}' y2='{y + 19}' stroke='{R}' stroke-width='2'/>")
            x += wd + 10
        res_col = G if ok else R
        res = "still a books-phrase ✓" if ok else "✗ nothing left: books is the HEAD"
        out.append(f"<text x='{x + 14}' y='{y + 25}' font-size='13.5' font-weight='700' fill='{res_col}'>{res}</text></g>")
        y += 56
    out.append(f"<text x='330' y='{y + 12}' text-anchor='middle' font-size='12' opacity='0.75'>The head is the one word you can't lose. The others are its dependents.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 232"


# ── Stepper: the deletion test for arguments vs adjuncts ────────────────────
DEL = [
    lines(["[The bear] yawned [loudly]."], 0, "Handout (6). Try deleting each bracket. What you can drop is optional; what you can't is required."),
    lines(["[The bear] yawned [loudly].", "The bear yawned.  ✓   → 'loudly' is optional: an ADJUNCT"], 1, "Drop 'loudly': still a fine sentence. So 'loudly' is an adjunct."),
    lines(["[The bear] yawned [loudly].", "The bear yawned.  ✓   → 'loudly' is optional: an ADJUNCT", "*Yawned loudly.  ✗   → 'the bear' is required: an ARGUMENT"], 2, "Drop 'the bear': broken. The yawner is required, so 'the bear' is an argument."),
    lines(["[The bear] savored [the berries] [slowly].", "*The bear savored slowly.  ✗   → 'the berries' is an ARGUMENT", "The bear savored the berries.  ✓   → 'slowly' is an ADJUNCT"], 0, "Next verb: 'savor' needs something savored. Drop 'the berries' and it breaks; drop 'slowly' and it's fine."),
    lines(["[The bear] gave [me] [a huge fright] [last weekend].", "arguments: the bear, me, a huge fright   (3: ditransitive)", "adjunct:   last weekend"], 1, "Three arguments (the giver, the one who got it, the thing given) and one adjunct (when). The count of arguments is the verb's valency from Week 2."),
]


g = {
 "id": "ling112/4-heads-dependents",
 "course": "ling112",
 "lessons": "Week 4",
 "title": "Heads, dependents, complements and adjuncts",
 "summary": "From zero: what a phrase and its head are, how to find the head, the difference between required and optional dependents (arguments vs adjuncts, complements vs adjuncts) with the four tests, how to draw a dependency diagram, and head directionality in English, Japanese and Arabic.",
 "estimatedMinutes": 65,
 "sourceNote": "Week 4 handout (Heads and dependents), Essentials of Linguistics ch. 6.2 to 6.3, Tallerman ch. 4.1 to 4.2. Rebuilt for readers who missed class: phrase, head, argument, complement and adjunct are each defined before they are used.",
 "requires": ["ling112/2-categories"],
 "sections": [
  {"id": "why", "heading": "Start here: phrases and their heads", "blocks": [
    D("Phrase", "A group of words that works as **one unit** in a sentence (a constituent, from the universals chapter). *Several large books* is a phrase: you can replace all three words with *they*.", slide="Phrase"),
    D("Head", "The **one word** in a phrase that decides what kind of phrase it is and what it's about. Every phrase has exactly one head. The other words in the phrase are its **dependents**: they add detail to the head.", slide="Head and dependents"),
    P("**One example.** *Several large books* is about **books**. *Several* and *large* just add detail (how many, what size). So *books* is the head, and *several* and *large* are its dependents. Here is the easiest way to find a head: drop words one at a time. The one you can't lose is the head.", slide="How to find the head"),
    F(fig_drop(), "The drop test. Losing 'several' or 'large' leaves a books-phrase. Losing 'books' leaves nothing to be about. Hover each row.", slide="The drop test"),
    D("Phrase names", "A phrase is named after the category of its head. Head is a noun → **NP** (noun phrase). Verb → **VP**. Preposition → **PP**. Adjective → **AdjP**. Adverb → **AdvP**. So *several large books* is an NP, and *with a loud thud* is a PP because its head is the preposition *with*."),
    T(["Phrase", "Head", "Name", "Why that word is the head"], [
      ["several large **books**", "books (N)", "NP", "it's about books; the rest describes them"],
      ["**with** a loud thud", "with (P)", "PP", "a preposition heads its phrase and needs the NP after it"],
      ["our **request** for privacy", "request (N)", "NP", "it's a request; *for privacy* says what kind"],
      ["**yawned** loudly", "yawned (V)", "VP", "it's a yawning; *loudly* describes how"],
      ["extremely **proud** of her", "proud (Adj)", "AdjP", "it's a kind of proud; the rest says how and of whom"],
    ], title="Handout (1): find the head, name the phrase", slide="Five phrases, five heads"),
    D("Selection", "A head **selects** its dependents: it decides what kind of words may go with it. A noun takes an adjective (*the loud yawn*, '*the loudly yawn'), a verb takes an adverb (*yawned loudly*, '*yawned loud'). Some heads even pick an exact word: you're fond **of** something, never '*fond with'.", slide="Heads choose their dependents"),
    P("**Handout (5), same idea:** *After evacuating, the audience congregated in the hallway* is fine, but *#After evacuating, the speaker congregated* is odd: *congregate* needs a group as its subject, and one speaker can't gather together.", slide="Handout (5)"),
    P("**Heads can pick meaning too.** *The speaker informed the audience* is fine, but *#The earthquake informed the audience* is odd: *inform* wants someone who can mean to tell you something. That's why it gets `#` (grammatical, but strange), not `*`."),
    C("What is the head of *the old man from Ohio*, and what kind of phrase is it?", "**man** (a noun), so it's an **NP**. Drop *man* and you have *the old from Ohio*, which isn't about anything."),
    C("What is the head of *right under the bed*?", "**under** (a preposition), so it's a **PP**. *right* and *the bed* depend on it."),
    WORLD("**Where you'll meet this** Search engines reduce your query to its head before matching: 'cheap flights to Osaka' is about *flights*. Dependency parsers (spaCy, Stanza) output exactly the head-to-dependent links from this chapter, and apps read 'who did what to whom' straight off them."),
  ]},
  {"id": "args", "heading": "Required or optional: arguments and adjuncts", "blocks": [
    D("Argument", "A dependent that is **required** by the verb's meaning: the participants the action can't happen without. *Savor* needs someone savoring and something savored, so both are arguments. (This is valency from Week 2: yawn 1, savor 2, give 3.)", slide="Argument"),
    D("Adjunct", "A dependent that is **optional**: extra detail about how, when, where, why. You can always drop it and the sentence stays grammatical. *loudly*, *yesterday*, *in the garden*.", slide="Adjunct"),
    ST("The deletion test, on handout (6)", DEL),
    E("Handout (6b): [The bear] [very suddenly] awoke [in the middle of the night].", "Which brackets can go?\n\n1. Drop 'very suddenly': 'The bear awoke in the middle of the night.' ✓ Optional: adjunct.\n2. Drop 'in the middle of the night': 'The bear very suddenly awoke.' ✓ Optional: adjunct.\n3. Drop 'the bear': '*Very suddenly awoke in the middle of the night.' ✗ Required: argument.\n4. So 'awake' takes one argument (intransitive, like 'sneeze') and two adjuncts.", slide="Handout (6b)"),
    P("**The one-line version:** ==what you can drop is an adjunct; what you can't drop is an argument==. Always test by deleting, then say what happened."),
    C("*She put the keys on the table after lunch.* Which dependents of *put* are arguments?", "*she*, *the keys*, and *on the table* (*She put the keys* is incomplete). *after lunch* is an adjunct: drop it and nothing breaks."),
  ]},
  {"id": "comp", "heading": "Complements vs adjuncts: the four tests", "blocks": [
    D("Complement", "A dependent that the head **picks out** and keeps **right next to it**. drafted **a screenplay**, fond **of music**, into **the house**. Most complements are required. Complement is the word syntax uses for the head's chosen partner; argument is the word for a required participant.", slide="Complement"),
    TRAP("**The one exception:** the subject is an **argument** (it's required) but **not a complement** (it sits on the other side of the verb and isn't the verb's chosen partner). *The bear* in *The bear savored the berries* is an argument, not a complement. The trees in Week 6 show why.", "Week 4 handout", slide="Trap: subjects"),
    O.block("comp.9f06f131", slide="The four tests (handout §2)"),
    CMP(("Complement", "hugs the head", "brand"), ("Adjunct", "stacks and floats", "amber"), [
      ("Can you drop it?", "usually no: *She drafted", "always yes"),
      ("How many?", "1 or 2, fixed by the head", "as many as you like"),
      ("Where?", "right next to the head", "can move: In the garden, he sang"),
      ("Picked by the head?", "yes, even the exact word: resort TO", "no, fits almost any head"),
    ], "The four tests in one picture. Run at least two of them and name them in your answer.", slide="Complement vs adjunct"),
    O.block("comp.3d8f6a1c", slide="One head, one complement, endless adjuncts"),
    O.block("comp.f8ae541b", slide="Handout (11): complements of the bolded heads"),
    O.block(next(b["id"] for s in O.g["sections"] for b in s["blocks"] if b.get("title") == "Sorting both"), slide="Handout (12): complements AND adjuncts"),
    P("**Position, the handout's question.** In English, complements come **right after** the head: serenaded **his beloved**. Adjuncts can come before or after, outside the complement: **quietly** serenaded his beloved **in the garden**. ==Complements hug the head; adjuncts stack and float.=="),
    C("*She glanced at the clock nervously.* Complement or adjunct: *at the clock*? *nervously*?", "*at the clock* = complement (glance picks *at*; it sits right after the verb). *nervously* = adjunct (droppable, movable: *Nervously, she glanced at the clock*)."),
  ]},
  {"id": "dep", "heading": "Dependency diagrams: heads drawn as arrows", "blocks": [
    D("Dependency diagram", "A picture of a sentence where an **arrow goes from each head to each of its dependents**. Every word has exactly one arrow coming in, except one: the **root**, which is the main verb (the head of the whole sentence).", slide="What it is"),
    P("**One example.** In *The bear yawned*, draw *yawned → bear* (bear depends on yawned) and *bear → The* (the depends on bear). *yawned* has no arrow coming in, so it's the root.", slide="A tiny one first"),
    O.block(next(b["id"] for s in O.g["sections"] for b in s["blocks"] if b["type"] == "stepper"), slide="Handout (8), drawn as arrows"),
    O.block("dep.4a7c9e2b", slide="Handout (8) as arcs"),
    TRAP("An arrow from outside a phrase must land on that phrase's **head**. The verb's arrow goes to *to* in *to the ground*, never straight to *ground*. If an arrow lands in the middle of a phrase, you skipped a head.", "Homework", slide="Trap: land on the head"),
    O.block("dep.f746f8ba"),
    O.block("dep.91bafb7e"),
    O.block("dep.1f0e0c7f"),
    E("Handout (9): My usually nosy neighbors actually respected our request for privacy.", "Find the root, then work outward.\n\n1. Root: respected (the main verb, no arrow coming in).\n2. respected → neighbors (subject), respected → actually (adjunct), respected → request (complement).\n3. neighbors → My, neighbors → nosy; nosy → usually (usually describes how nosy).\n4. request → our, request → for; for → privacy.\n5. Check: 10 words, 9 arrows, one root. Every word except 'respected' has exactly one arrow in.", slide="Handout (9) as arrows"),
  ]},
  {"id": "dir", "heading": "Head directionality: head first or head last?", "blocks": [
    O.block("dir.726b5ab6", slide="Definition"),
    P("**One example.** English says ate **an apple** (head *ate* first). Japanese says *ringo-o tabe-ta*, 'apple ate' (head last). Same meaning, mirrored order."),
    O.block("dir.0546d5e4", slide="English vs Japanese, with Arabic"),
    O.block("dir.5c9a3f7d", slide="One parameter, three mirrored pairs"),
    O.block("dir.055c8ac2"),
    O.block("dir.03a29e6a"),
  ]},
  {"id": "oral", "heading": "If this is your oral-exam concept", "blocks": [
    O.block("oral.cc21516a", slide="The 3-minute explanation"),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Phrase", "A group of words that works as one unit."],
      ["Head", "The one word that decides what a phrase is and is about."],
      ["Dependent", "Any other word in the phrase; it adds detail to the head."],
      ["NP, VP, PP, AdjP, AdvP", "Phrases named after the category of their head."],
      ["Selection", "A head choosing what may go with it (fond OF, not fond WITH)."],
      ["Argument", "A required participant of the verb."],
      ["Adjunct", "An optional add-on: how, when, where, why."],
      ["Complement", "The head's chosen partner, right next to it; usually required."],
      ["Root", "The word with no arrow coming in: the main verb."],
      ["Head-initial / head-final", "Head before its complement (English, Arabic) / after (Japanese)."],
    ]),
  ]},
 ],
 "exercises": O.exercises() + [
  MC("find-head", "Find the head", "What is the head of *a very tall glass of water*?", ["glass", "water", "tall", "of"], 0,
     ["Yes: it's a glass; 'of water' says of what.", "Water is inside the PP 'of water', which depends on glass.", "Tall describes the glass.", "Of heads the smaller PP 'of water', not the whole phrase."],
     "**glass.** Drop it and *a very tall of water* makes no sense.", "Finding the head is the first step of every tree and every dependency diagram.", ref="why"),
  MC("arg-adj", "Argument or adjunct?", "*He fixed the sink yesterday.* What is *yesterday*?", ["Adjunct", "Argument", "Complement", "Head"], 0,
     ["Yes: drop it and 'He fixed the sink' is fine.", "It isn't required: the fixing happens with or without it.", "It isn't picked by 'fixed'; any verb can take 'yesterday'.", "The head of the VP is 'fixed'."],
     "**Adjunct.** It's optional and could go on almost any verb.", "The deletion test settles most of these in one step.", ref="args"),
  MC("subj-comp", "The subject exception", "In *The dog chased the cat*, is *the dog* a complement of *chased*?", ["No: it's an argument, but not a complement", "Yes: it's required", "No: it's an adjunct", "Yes: it's next to the verb"], 0,
     ["Right. Required (argument) but not the verb's chosen partner on its right.", "Required makes it an argument, not automatically a complement.", "You can't drop it, so it isn't an adjunct.", "Being next to the verb isn't enough; the complement is 'the cat'."],
     "**No.** *The dog* is an argument (required) but not a complement; *the cat* is the complement.", "The handout flags this as the one place the two words split.", ref="comp"),
  MC("direction", "Head-initial or head-final?", "Turkish says *ev-de* 'house-in' and *elma yedim* 'apple I-ate'. What is its setting?", ["Head-final", "Head-initial", "Mixed", "Can't tell"], 0,
     ["Yes: the postposition and the verb both come after their complements.", "Head-initial would put 'in' and 'ate' first.", "Both pairs point the same way.", "Two pairs agree, which is enough to predict the rest."],
     "**Head-final**, like Japanese.", "Once one pair tells you the setting, you can predict the others: that's what makes it a parameter.", ref="dir"),
 ],
}

finish(g)
