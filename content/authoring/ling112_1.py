"""LING 112 · The five universals, from zero ("Which universal is this?")."""
import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from h15common import *  # noqa

A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"
CW = 7.6  # rough width of one character at 14px


def soft(col, a):
    return col[:-1] + f' / {a})'


def tw(s, size=14):
    return len(s) * CW * size / 14


def chip(x, y, word, ok, title):
    w = len(word) * 8.3 + 34
    col = G if ok else R
    mark = "✓" if ok else "✗"
    return (f"<g><title>{title}</title><rect x='{x}' y='{y}' width='{w:.0f}' height='26' rx='13' fill='{soft(col, 0.12)}' stroke='{col}' stroke-width='1.3'/>"
            f"<text x='{x + 11}' y='{y + 17.5}' font-size='13'>{word}</text><text x='{x + w - 12:.0f}' y='{y + 17.5}' font-size='11' text-anchor='middle' fill='{col}'>{mark}</text></g>"), w


# ── Figure: categories are slots ────────────────────────────────────────────
def fig_slots():
    out = [f"<g {FONT}>"]
    panels = [
        (20, "The ___ slept.", "a noun slot (after 'the', before a verb)",
         [("dog", True, "'The dog slept.' Fine: dog is a noun."), ("idea", True, "'The idea slept.' Weird meaning, but the grammar is fine: idea is a noun."),
          ("destruction", True, "'The destruction slept.' Nonsense, but grammatical: destruction is a noun even though it names an action."),
          ("happy", False, "'*The happy slept.' Broken: happy is an adjective and cannot fill a noun slot alone."), ("run", False, "'*The run slept.' Only works if you force run into a noun (a run). As a verb it fails.")]),
        (340, "They will ___ .", "a verb slot (after a modal like 'will')",
         [("laugh", True, "'They will laugh.' Fine: laugh is a verb."), ("destroy", True, "'They will destroy.' Fine: destroy is a verb (its noun cousin destruction is not)."),
          ("arrive", True, "'They will arrive.' Fine: arrive is a verb."), ("dog", False, "'*They will dog.' Broken: dog is a noun."), ("happy", False, "'*They will happy.' Broken: happy is an adjective. You need 'be happy'.")]),
    ]
    for x0, frame, sub, words in panels:
        out.append(f"<g><title>A test frame: a sentence with one hole. Every word that fits the hole belongs to the same category.</title>"
                   f"<rect x='{x0}' y='14' width='300' height='236' rx='14' fill='rgb(var(--accent-fg) / 0.04)' stroke='currentColor' stroke-opacity='0.15'/>"
                   f"<text x='{x0 + 150}' y='52' text-anchor='middle' font-size='20' font-weight='700' fill='{A}'>{frame}</text>"
                   f"<text x='{x0 + 150}' y='74' text-anchor='middle' font-size='11' opacity='0.7'>{sub}</text></g>")
        x, y = x0 + 16, 96
        for w, ok, t in words:
            c, width = chip(x, y, w, ok, t)
            if x + width > x0 + 290:
                x, y = x0 + 16, y + 40
                c, width = chip(x, y, w, ok, t)
            out.append(c)
            x += width + 10
        out.append(f"<text x='{x0 + 150}' y='232' text-anchor='middle' font-size='11' opacity='0.75'>green = same category · red = different category</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 264"


# ── Figure: a constituent vs a non-constituent ──────────────────────────────
def fig_unit():
    words = "The cat in the hat sat on the mat".split()
    xs, x = [], 40
    for w in words:
        xs.append(x); x += tw(w, 18) + 16
    out = [f"<g {FONT}>"]
    for w, x in zip(words, xs):
        out.append(f"<text x='{x:.0f}' y='130' font-size='18'>{w}</text>")
    # unit: in the hat (idx 2..4) above
    a, b = xs[2] - 6, xs[4] + tw("hat", 18) + 6
    out.append(f"<g><title>'in the hat' IS a constituent: it can be replaced by 'there', moved to the front, and used alone as an answer.</title>"
               f"<path d='M{a:.0f} 104 L{a:.0f} 92 L{b:.0f} 92 L{b:.0f} 104' fill='none' stroke='{G}' stroke-width='2.2'/>"
               f"<rect x='{a:.0f}' y='108' width='{b - a:.0f}' height='32' rx='8' fill='{soft(G, 0.12)}' stroke='none'/>"
               f"<text x='{(a + b) / 2:.0f}' y='80' text-anchor='middle' font-size='13' font-weight='700' fill='{G}'>one unit ✓</text>"
               f"<text x='{(a + b) / 2:.0f}' y='60' text-anchor='middle' font-size='11' fill='{G}'>'Where was the cat?' 'In the hat.'</text></g>")
    # non-unit: hat sat (idx 4..5) below
    a2, b2 = xs[4] - 4, xs[5] + tw("sat", 18) + 4
    out.append(f"<g><title>'hat sat' is NOT a constituent: no pronoun can replace it, it can't move, and it can't answer any question alone.</title>"
               f"<path d='M{a2:.0f} 146 L{a2:.0f} 160 L{b2:.0f} 160 L{b2:.0f} 146' fill='none' stroke='{R}' stroke-width='2.2' stroke-dasharray='5 4'/>"
               f"<text x='{(a2 + b2) / 2:.0f}' y='180' text-anchor='middle' font-size='13' font-weight='700' fill='{R}'>not a unit ✗</text>"
               f"<text x='{(a2 + b2) / 2:.0f}' y='199' text-anchor='middle' font-size='11' fill='{R}'>no question has 'hat sat' as its answer</text></g>")
    out.append(f"<text x='330' y='236' text-anchor='middle' font-size='12' opacity='0.75'>Words next to each other are not automatically a unit. A unit is what the tests say it is.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 250"


# ── Figure: list vs hierarchy (nested boxes) ────────────────────────────────
def fig_nest():
    out = [f"<g {FONT}>"]
    words = "The cat in the hat sat on the mat".split()
    out.append(f"<g><title>The 'list' view: nine words in a row, nothing grouped. This view can't explain why 'in the hat' acts as one piece.</title>"
               f"<text x='20' y='26' font-size='13' font-weight='700'>A list (what it looks like)</text>")
    x = 20
    for w in words:
        wd = tw(w, 13) + 14
        out.append(f"<rect x='{x:.0f}' y='40' width='{wd:.0f}' height='26' rx='6' fill='none' stroke='currentColor' stroke-opacity='0.35'/><text x='{x + 7:.0f}' y='58' font-size='13'>{w}</text>")
        x += wd + 5
    out.append("</g>")
    out.append(f"<text x='20' y='112' font-size='13' font-weight='700' fill='{A}'>A hierarchy (what it really is): boxes inside boxes</text>")
    gap, fs = 38, 16
    widths = [len(w) * 9.6 for w in words]
    total = sum(widths) + gap * (len(words) - 1)
    xs, x = [], (660 - total) / 2
    for wd in widths:
        xs.append(x); x += wd + gap
    spans = [(0, 8, 0, "TP (sentence)", A, "The whole sentence is the biggest unit. Everything else is inside it."),
             (0, 4, 1, "DP subject", G, "The subject 'The cat in the hat'. Replace it with 'It': 'It sat on the mat.'"),
             (2, 4, 2, "PP", Y, "'in the hat' is a unit INSIDE the subject. It tells you which cat."),
             (3, 4, 3, "DP", G, "'the hat' is a unit inside the PP."),
             (5, 8, 1, "VP", A, "The verb phrase 'sat on the mat'. Replace it with 'did so'."),
             (6, 8, 2, "PP", Y, "'on the mat' is a unit inside the VP. Replace it with 'there'."),
             (7, 8, 3, "DP", G, "'the mat' is a unit inside the PP.")]
    for i, j, d, lab, col, t in spans:
        pad = 19 - 4 * d
        x0, x1 = xs[i] - pad, xs[j] + widths[j] + pad
        y0, y1 = 124 + d * 24, 262 - d * 7
        out.append(f"<g><title>{t}</title><rect x='{x0:.0f}' y='{y0}' width='{x1 - x0:.0f}' height='{y1 - y0}' rx='9' fill='{soft(col, 0.06)}' stroke='{col}' stroke-width='1.4'/>"
                   f"<text x='{x0 + 6:.0f}' y='{y0 + 14}' font-size='10' font-weight='700' fill='{col}'>{lab}</text></g>")
    for w, x in zip(words, xs):
        out.append(f"<text x='{x + len(w) * 4.8:.0f}' y='242' text-anchor='middle' font-size='{fs}' font-weight='600'>{w}</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 272"


# ── Figure: questions follow structure, not counting ─────────────────────────
def fig_aux():
    out = [f"<g {FONT}>"]
    words = ["The", "man", "who", "is", "tall", "is", "happy."]
    xs, x = [], 90
    for w in words:
        xs.append(x); x += tw(w, 17) + 18
    s_a, s_b = xs[0] - 8, xs[4] + tw("tall", 17) + 8
    out.append(f"<g><title>The subject 'the man who is tall' is one unit. The 'is' inside it belongs to the smaller clause 'who is tall'.</title>"
               f"<rect x='{s_a:.0f}' y='96' width='{s_b - s_a:.0f}' height='40' rx='10' fill='{soft(G, 0.10)}' stroke='{G}' stroke-width='1.4'/>"
               f"<text x='{(s_a + s_b) / 2:.0f}' y='156' text-anchor='middle' font-size='11' fill='{G}'>one unit: the subject</text></g>")
    for i, (w, x) in enumerate(zip(words, xs)):
        col = R if i == 3 else (A if i == 5 else "currentColor")
        wt = "700" if i in (3, 5) else "400"
        out.append(f"<text x='{x:.0f}' y='122' font-size='17' font-weight='{wt}' fill='{col}'>{w}</text>")
    # wrong arrow from first is
    x1 = xs[3] + 6
    out.append(f"<g><title>Rule 'move the FIRST is' (counting words): gives a broken question.</title>"
               f"<path d='M{x1:.0f} 100 C {x1 - 40:.0f} 40, 80 40, 60 70' fill='none' stroke='{R}' stroke-width='1.6' stroke-dasharray='5 4'/>"
               f"<text x='30' y='30' font-size='12.5' fill='{R}'>'move the first is' ✗  *Is the man who tall is happy?</text></g>")
    x2 = xs[5] + 6
    out.append(f"<g><title>Rule 'move the is of the MAIN clause' (using structure): gives the real question. Every English speaker does this without being taught.</title>"
               f"<path d='M{x2:.0f} 138 C {x2 - 40:.0f} 210, 90 210, 64 140' fill='none' stroke='{A}' stroke-width='1.8'/>"
               f"<text x='30' y='214' font-size='12.5' font-weight='600' fill='{A}'>'move the main-clause is' ✓  Is the man who is tall happy?</text></g>")
    out.append("</g>")
    return "".join(out), "0 0 660 228"


# ── Figure: recursion as nesting dolls ──────────────────────────────────────
def fig_dolls():
    out = [f"<g {FONT}>"]
    rows = [("TP", "I remember", A, "The main clause. It contains a clause after 'remember'."),
            ("CP", "that John told me", G, "Clause 2, a CP (starts with the complementizer 'that'). It contains another CP."),
            ("CP", "that the Times reported", Y, "Clause 3, another CP inside clause 2. Same type inside same type: that is recursion."),
            ("CP", "that Sarah won.", R, "Clause 4, a CP inside a CP inside a CP. Nothing stops you adding a fifth.")]
    for k, (lab, txt, col, t) in enumerate(rows):
        x, y = 16 + k * 34, 14 + k * 46
        w, h = 628 - k * 68, (228 - k * 10) - (14 + k * 46)
        out.append(f"<g><title>{t}</title><rect x='{x}' y='{y}' width='{w}' height='{h}' rx='12' fill='{soft(col, 0.07)}' stroke='{col}' stroke-width='1.5'/>"
                   f"<text x='{x + 12}' y='{y + 28}' font-size='12' font-weight='800' fill='{col}'>{lab}</text>"
                   f"<text x='{x + 52}' y='{y + 28}' font-size='15'>{txt}</text></g>")
    out.append(f"<text x='330' y='252' text-anchor='middle' font-size='12' opacity='0.75'>Each box is the same kind of thing as the box around it. You can always add one more.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 264"


# ── Brackets for the tree sims ──────────────────────────────────────────────
CAT = "[TP [DP [D The] [NP [N cat] [PP [P in] [DP [D the] [NP [N hat]]]]]] [T PAST] [VP [V sat] [PP [P on] [DP [D the] [NP [N mat]]]]]]"
REC = "[TP [DP I] [VP [V remember] [CP [C that] [TP [DP John] [VP [V said] [CP [C that] [TP [DP Sarah] [VP [V won]]]]]]]]]"
KEY = "[DP [D the] [NP [N key] [PP [P to] [DP [D the] [NP [N door] [PP [P of] [DP [D the] [NP [N house] [PP [P on] [DP [D the] [NP [N hill]]]]]]]]]]]]"
A_VP = "[TP [DP [D The] [NP [N thief]]] [T PAST] [VP [V tripped] [DP [D that] [NP [AdjP [Adj unlucky]] [N man]]] [PP [P with] [DP [D a] [NP [N cane]]]]]]"
A_NP = "[TP [DP [D The] [NP [N thief]]] [T PAST] [VP [V tripped] [DP [D that] [NP [AdjP [Adj unlucky]] [N man] [PP [P with] [DP [D a] [NP [N cane]]]]]]]]"

# ── "Which universal is this?" item bank (also used for the MC exercises) ──
U = ["Categories", "Constituents", "Sentence types", "Hierarchy", "Recursion"]
FB = {
    "Categories": "Categories is about which words can fill the same slot (noun, verb, adjective…).",
    "Constituents": "Constituents is about a group of words acting as ONE piece (the tests: replace, move, answer).",
    "Sentence types": "Sentence types is about the shape of the whole sentence: statement, question, or command.",
    "Hierarchy": "Hierarchy is about HOW units group inside each other, so that the grouping (not the word order) decides meaning or rules.",
    "Recursion": "Recursion is about a unit of one type sitting inside a unit of the SAME type, with no upper limit.",
}
ITEMS = [
    ("cats", "*Cat*, *idea* and *destruction* can all fill the blank in 'The ___ was surprising.' *Destroy* cannot.", "Categories",
     "The example sorts words by which slot they fit. Same slot, same category: all three are nouns, *destroy* is a verb."),
    ("there", "'The cat sat **in the hat**.' → 'The cat sat **there**.' One word replaces all three.", "Constituents",
     "One pro-form (*there*) replaced three words at once. That only works if the three words form one unit."),
    ("q-shape", "'The dog is barking.' vs 'Is the dog barking?' vs 'Stop barking!'", "Sentence types",
     "Same topic, three sentence shapes: a statement (declarative), a question (interrogative), a command (imperative)."),
    ("cane", "'The thief tripped the man with a cane' has two meanings, and the words are in the same order both times.", "Hierarchy",
     "Order is identical, so the two meanings must come from two different groupings: *with a cane* goes with *tripped* or with *the man*."),
    ("jack", "'This is the rat that ate the malt that lay in the house that Jack built.'", "Recursion",
     "A relative clause (*that lay in…*) sits inside another relative clause (*that ate…*), and you could keep adding more."),
    ("poss", "'my friend's sister's boss's car'", "Recursion",
     "A possessive phrase sits inside a possessive phrase inside a possessive phrase. Same type inside same type, with no limit."),
    ("will", "*Will*, *can*, *should* all fit 'They ___ leave', but *eat* and *happy* don't.", "Categories",
     "Grouping words by the slot they fit is the definition of a category. These three are modals."),
    ("frag", "Q: 'What did Sherlock find?' A: 'The missing letter.'", "Constituents",
     "*The missing letter* can stand alone as an answer: the fragment-answer test. Only a unit can do that."),
    ("aux", "'The man who is tall is happy.' becomes 'Is the man who is tall happy?', never '*Is the man who tall is happy?'", "Hierarchy",
     "The rule moves the *is* of the main clause, not the first *is* in the string. The rule reads structure, not word order."),
    ("imp", "'Close the door.' has no subject you can hear, but it is still a full sentence.", "Sentence types",
     "A command with no spoken subject (the 'you' is understood) is the imperative sentence type."),
    ("key", "'the key to the door of the house on the hill'", "Recursion",
     "A PP sits inside a noun phrase inside a PP inside a noun phrase… The same types repeat inside each other."),
    ("move", "'**The evidence**, the spies will stash after midnight.' The three words moved to the front together.", "Constituents",
     "The movement test: only a unit can be moved as a block. *The evidence* moved together, so it is a constituent."),
    ("old", "'old men and women': are the women old too? It depends on whether *old* groups with *men* or with *men and women*.", "Hierarchy",
     "Two groupings, [old men] and [women] vs old [men and women], give two meanings over one word order."),
    ("wh", "'Where did you park?' starts with a *wh*-word and asks for information, not yes or no.", "Sentence types",
     "This is an interrogative (a question), specifically a *wh*-question. That is a sentence type."),
    ("ness", "Add *-ness* to *happy* and you get *happiness*, which now fits 'The ___ faded.'", "Categories",
     "A suffix moved the word into a new category (adjective → noun). Categories are defined by slots and word endings."),
    ("think", "'Sam thinks that Ana knows that Lee left.'", "Recursion",
     "A *that*-clause inside a *that*-clause. Same type (a clause) inside the same type (a clause)."),
]


def item_mc(i, it):
    key, prompt, ans, why = it
    fb = [("Yes. " if u == ans else "Not this one. ") + FB[u] for u in U]
    return MC(f"which-{key}", f"Which universal? ({i + 1})", f"Which universal is this?\n\n{prompt}", U, U.index(ans), fb,
              f"**{ans}.** {why}", "Naming the property from an example is the exact skill Dr. Nie checks: see the example, pick the one idea it proves.",
              hints=["Ask the five questions in order: slot? one piece? whole-sentence shape? grouping changes meaning? same type inside same type?",
                     "If the example is about ONE word and the slot it fits, it's categories. If it's about a whole sentence's shape, it's sentence types.",
                     "Recursion needs the SAME type inside itself (clause in clause, PP in NP in PP). Two meanings from one order is hierarchy."],
              ref="which")


g = {
 "id": "ling112/1-universals",
 "course": "ling112",
 "lessons": "Week 1 (Aug 20)",
 "title": "Which universal is this? Categories, constituents, sentence types, hierarchy and recursion",
 "summary": "From zero: what each of the five properties every human language shares actually means, what it looks like in a real sentence, and how to name the property from one example in a few seconds.",
 "estimatedMinutes": 45,
 "sourceNote": "Week 1 handout 'Introduction' (Dr. Nie), the Aug 20 lecture, and Carnie, Syntax ch. 1. The examples are the handout's (the cat in the hat, the thief with a cane, the Times reported that Sarah won) plus classic textbook ones. Later weeks go deeper on each: categories (Week 2), constituents (Weeks 4 to 5), trees (Week 6).",
 "requires": ["ling112/0-what-syntax-is"],
 "sections": [
  {"id": "map", "heading": "The big picture in one minute", "blocks": [
    P("A **universal** is a property that every human language has. Not most languages: all of them, from English to Arabic to sign languages. Dr. Nie's Week 1 handout lists five, and the question you'll keep hearing is *Which universal is this?*: you get one example and you name the property it shows.", slide="What a universal is"),
    P("Think of a sentence like a Lego build. **Categories** are the kinds of bricks. **Constituents** are bricks snapped into pieces. **Sentence types** are the finished shapes (a statement, a question, a command). **Hierarchy** says pieces go *inside* pieces, and where they snap changes the meaning. **Recursion** says a piece can hold a piece of the same kind, forever.", slide="The Lego picture"),
    ROAD("Which universal is this?", [
      ("Categories", "Words come in kinds: noun, verb, adjective…", "Ask: which slot does it fit?", "brand"),
      ("Constituents", "Words group into units", "Ask: does it act as one piece?", "green"),
      ("Sentence types", "Statement, question, command", "Ask: what shape is the whole sentence?", "amber"),
      ("Hierarchy", "Units nest; grouping decides meaning", "Ask: same order, different grouping?", "brand"),
      ("Recursion", "A unit inside a unit of the same kind", "Ask: could it go on forever?", "red"),
    ], "The five universals, smallest idea to biggest. The question under each is the one to ask yourself when you see an example.", eyebrow="Five properties every language has", slide="The five at a glance"),
    WHY("**Why it matters** Every other week of this class zooms in on one of these five. Categories become Week 2, constituents become Weeks 4 and 5, hierarchy becomes the trees of Week 6. If the five are clear now, every later chapter is just detail. And on the oral exam, 'which property does this show, and how do you know?' is the easiest points you can bank."),
  ]},
  {"id": "categories", "heading": "Categories: words come in kinds", "blocks": [
    D("Syntactic category", "A group of words that can go in the **same slots** in a sentence and take the **same endings**. Noun, verb, adjective, adverb, preposition, determiner and so on. (You may know them as parts of speech.)", slide="Definition"),
    P("**One example.** Take the frame *The ___ slept.* The words that fit the hole are nouns: *dog*, *baby*, even *idea*. The words that don't fit are not nouns: 'The happy slept' and 'The quickly slept' are broken. The hole is doing the sorting, not the meaning."),
    F(fig_slots(), "Two test frames. Left: a noun slot. 'Destruction' fits even though it names an action, which is why 'a noun is a person, place or thing' fails. Right: a verb slot. 'Destroy' fits, 'dog' doesn't. Hover each word to see the full sentence.", slide="Slots do the sorting"),
    T(["Category", "Label", "A frame that finds it", "Examples"], [
      ["Noun", "N", "The ___ slept. / two ___s", "dog, idea, joy, destruction"],
      ["Verb", "V", "They will ___ .", "run, arrive, destroy, know"],
      ["Adjective", "Adj", "a very ___ dog", "big, happy, legal, fake"],
      ["Adverb", "Adv", "She ran ___ .", "quickly, often, really"],
      ["Preposition", "P", "___ the table", "on, in, with, to, from"],
      ["Determiner", "D", "___ dog barked.", "the, a, this, every, his"],
      ["Complementizer", "C", "I think ___ it rained.", "that, if, whether"],
      ["Modal / Auxiliary", "Mod / Aux", "They ___ leave.", "will, can, should · have, be, do"],
    ], title="The main categories and a frame for each", slide="The main categories"),
    TRAP("Don't define a category by meaning. *Destruction* is an action but it's a noun (*the destruction*, *destructions*). *Happiness* is a feeling but it's a noun. Dr. Nie wants a **test**: 'it fits after *the* and takes plural *-s*, so it's a noun.'", "Week 2 handout, 'distribution'", slide="Trap: meaning is not the test"),
    P("**How you'll recognize it in an example:** the example is about **one word** (or a few words) and **which slot they fit or which ending they take**. If you see a frame with a blank, or a list of words that 'pattern together', answer *categories*."),
    C("*Every*, *the*, *this* and *his* can all fill the blank in '___ dog barked.' Which universal does this show?", "**Categories.** The four words share a slot, so they share a category (they're all determiners)."),
    WORLD("**Where you'll meet this** Your phone's autocorrect and every grammar checker start by tagging each word with a category (this step is called part-of-speech tagging, and LING 115 builds one). 'Time flies like an arrow' confuses them because *flies* and *like* can each be in two categories."),
  ]},
  {"id": "constituents", "heading": "Constituents: words team up into units", "blocks": [
    D("Constituent", "A group of words that acts as **one single unit** in a sentence. You prove it with a test: can you **replace** it with one word, **move** it as a block, or use it **alone as an answer**?", slide="Definition"),
    P("**One example.** In *The cat in the hat sat on the mat*, the words *in the hat* are a unit. Ask *Where was the cat?* and you can answer *In the hat.* But *hat sat* is not a unit, even though the two words sit side by side. No question has *hat sat* as its answer."),
    F(fig_unit(), "Green: 'in the hat' passes the answer test, so it is a constituent. Red: 'hat sat' fails every test. Being next to each other is not enough. Hover each bracket.", slide="Next to each other ≠ a unit"),
    ST("Running the three tests on 'the evidence'", [
      lines(["The spies will stash [the evidence] after midnight."], 0, "Is *the evidence* one unit? Three tests. Passing any one is enough."),
      lines(["The spies will stash [the evidence] after midnight.", "The spies will stash [it] after midnight.  ✓"], 1, "Test 1, replace: one pronoun, *it*, swaps out both words. ✓"),
      lines(["The spies will stash [the evidence] after midnight.", "The spies will stash [it] after midnight.  ✓", "[The evidence], the spies will stash after midnight.  ✓"], 2, "Test 2, move: the two words move to the front together and the sentence still works. ✓"),
      lines(["The spies will stash [the evidence] after midnight.", "The spies will stash [it] after midnight.  ✓", "[The evidence], the spies will stash after midnight.  ✓", "What will the spies stash? [The evidence.]  ✓"], 3, "Test 3, answer: it can stand alone as the answer to a question. ✓ So *the evidence* is a constituent."),
      lines(["Now try [stash the]:", "*The spies will [it] evidence.  ✗", "*[Stash the], the spies will evidence.  ✗", "What will the spies do? *[Stash the.]  ✗"], 3, "Same tests on *stash the*: every one fails. Not a unit, even though the words are neighbors."),
    ]),
    SIM("tree", "The cat in the hat, as a tree. Every node is a constituent. Click **PP** over *in the hat*: it's one unit. Now look for a single node covering just *hat sat*: there isn't one, and that's why it fails the tests.", {"bracket": CAT}),
    TRAP("A constituent can be one word or many words. And a unit is decided by **tests**, not by 'it sounds like it goes together'. Always name the test you used.", "Week 5 handout, constituency tests", slide="Trap: say which test"),
    P("**How you'll recognize it in an example:** the example **replaces, moves, or isolates a chunk of words** (*in the hat → there*, *the evidence* fronted, a one-phrase answer). If a group of words is being treated as one piece, answer *constituents*."),
    C("'Put the book **on the shelf**.' → 'Put the book **there**.' Which universal?", "**Constituents.** One word (*there*) replaced three, so *on the shelf* is one unit."),
  ]},
  {"id": "types", "heading": "Sentence types: statements, questions, commands", "blocks": [
    D("Sentence type", "The overall **shape** a sentence is built in, which matches the job it does. Every language has at least three: **declarative** (a statement), **interrogative** (a question), and **imperative** (a command).", slide="Definition"),
    P("**One example.** Same ingredients, three shapes: *The dog is quiet.* (declarative) · *Is the dog quiet?* (interrogative) · *Be quiet!* (imperative). The words barely change, but the arrangement tells you whether you're stating, asking, or ordering."),
    CARDS([
      ("Declarative", "statement", ["Makes a claim that can be true or false.", "Shape: subject, then verb.", "*Sarah won the race.*"], "brand"),
      ("Interrogative: yes/no", "question", ["Asks for yes or no.", "English: the helper verb jumps before the subject.", "*Did Sarah win the race?*"], "amber"),
      ("Interrogative: wh-", "question", ["Asks for information.", "Starts with who, what, where, when, why, how.", "*What did Sarah win?*"], "amber"),
      ("Imperative", "command", ["Tells someone to do something.", "No spoken subject: the 'you' is understood.", "*Win the race!*"], "green"),
    ], "The sentence types. Two kinds of question, because a yes/no question and a wh-question are built differently.", note="A fourth type, the exclamative (*What a race that was!*), shows up in many languages too.", slide="The types, side by side"),
    P("**Other languages build them differently, but they all have them.** Arabic makes a yes/no question by adding the particle *hal* at the front: *hal qaraʔta l-kitāb?* 'Did you read the book?'. Japanese adds *ka* at the end. English moves a helper verb. Different tools, same universal: every language has a way to ask."),
    TRAP("The type is about **shape**, not punctuation or tone. *Could you pass the salt?* has question shape (interrogative) even though it's really a polite request. On the exam, name the shape and, if you want extra credit, say the job it's doing.", "Week 1 handout", slide="Trap: shape, not job"),
    P("**How you'll recognize it in an example:** the example compares **whole sentences** as statement vs question vs command, or asks you to name one. If the whole sentence's shape is the point, answer *sentence types*."),
    C("'Sit down.' / 'Are you sitting?' / 'You are sitting.' Which universal do these three show together?", "**Sentence types.** One imperative, one interrogative, one declarative."),
  ]},
  {"id": "hierarchy", "heading": "Hierarchy: units inside units, and grouping decides meaning", "blocks": [
    D("Hierarchy", "Constituents sit **inside** bigger constituents, like boxes in boxes. The **grouping**, not just the left-to-right order, decides what a sentence means and how rules apply to it.", slide="Definition"),
    P("**One example.** *The thief tripped the man with a cane.* Who has the cane? It depends on the grouping. If *with a cane* groups with *tripped*, the thief used the cane. If it groups with *the man*, the man was holding it. The word order is identical, so only the **structure** can tell the two apart."),
    F(fig_nest(), "Top: the list view, nine separate words. Bottom: the real hierarchy, boxes inside boxes. 'the hat' is inside 'in the hat', which is inside the subject, which is inside the sentence. Hover any box.", slide="A list vs a hierarchy"),
    CMP(("Reading A: the cane is the thief's", "*with a cane* groups with the verb", "brand"), ("Reading B: the cane is the man's", "*with a cane* groups with *the man*", "amber"), [
      ("Brackets", "tripped [the man] [with a cane]", "tripped [the man with a cane]"),
      ("Answers the question", "Tripped him HOW?", "WHICH man?"),
      ("Replace the object with 'him'", "tripped **him** with a cane", "tripped **him** (him = the man with the cane)"),
      ("Picture", "thief swings a cane", "man leaning on a cane"),
    ], "One string, two groupings, two meanings. That's the whole point of hierarchy.", slide="Same words, two structures"),
    SIM("tree", "Reading A as a tree: the PP *with a cane* hangs off the VP, next to the object.", {"bracket": A_VP}, slide=False),
    SIM("tree", "Reading B: the PP is *inside* the object. Click the object DP: now it covers *that unlucky man with a cane*.", {"bracket": A_NP}, slide=False),
    P("**The second kind of evidence: rules follow structure, not counting.** To turn *The man who is tall is happy* into a question, you move an *is* to the front. But which one? If English counted words and moved the first *is*, you'd get nonsense. Every speaker moves the *is* of the **main** clause and skips the one tucked inside the subject. Nobody teaches kids this. The rule 'sees' the boxes.", slide="Rules follow structure"),
    F(fig_aux(), "Red, dashed: the counting rule (move the first 'is') gives a broken sentence. Blue: the structure rule (move the main clause's 'is') gives the real question. The green box is the subject unit that the rule skips over. Hover any part.", slide="Question formation reads the boxes"),
    TRAP("Constituents vs hierarchy: **constituents** is 'this group is one unit' (one box). **Hierarchy** is 'boxes sit inside boxes, and *which* box something is in matters' (the nesting and its effect). If the example shows **two meanings from one order**, or a rule that must see structure, it's hierarchy.", "Common mix-up", slide="Trap: one box vs boxes in boxes"),
    P("**How you'll recognize it in an example:** look for **one word order with two meanings** (an attachment ambiguity) or a **rule that ignores the linear order** and follows the structure. Answer *hierarchy*."),
    C("'I saw the girl with the telescope.' Which universal explains why it has two meanings?", "**Hierarchy.** *with the telescope* can group with *saw* (I used the telescope) or with *the girl* (she had it). Same order, different grouping."),
  ]},
  {"id": "recursion", "heading": "Recursion: a unit inside a unit of the same kind, forever", "blocks": [
    D("Recursion", "A unit can contain **another unit of the same type**, and that one can contain another, with **no upper limit**. A clause inside a clause, a noun phrase inside a noun phrase. It's why there is no longest sentence.", slide="Definition"),
    P("**One example.** *I remember that John told me that the Times reported that Sarah won.* Each *that*-clause holds another *that*-clause. You could always add *that her coach said that…*. The grammar never runs out, even though your breath does."),
    ST("Growing a sentence one clause at a time", [
      lines(["Sarah won."], 0, "Start with one clause. A clause is a subject plus a verb."),
      lines(["Sarah won.", "the Times reported [that Sarah won]."], 1, "Wrap it: the whole old clause becomes a piece INSIDE a new clause. Clause inside clause."),
      lines(["Sarah won.", "the Times reported [that Sarah won].", "John told me [that the Times reported [that Sarah won]]."], 2, "Wrap again. Same move, same type of box."),
      lines(["Sarah won.", "the Times reported [that Sarah won].", "John told me [that the Times reported [that Sarah won]].", "I remember [that John told me [that the Times reported [that Sarah won]]]."], 3, "And again. Four clauses, three of them nested. The rule that builds it is one rule used over and over."),
      lines(["I remember [that John told me [that the Times reported [that Sarah won]]].", "…and you could wrap it again, and again, forever."], 1, "That's recursion: no rule says 'stop at four'. That's why a language has infinitely many sentences built from a finite set of words and rules."),
    ]),
    F(fig_dolls(), "The same sentence as nesting dolls. Every inner box is the same kind of thing (a clause) as the box around it. Hover each box.", slide="Nesting dolls"),
    SIM("tree", "A shorter version as a tree: *I remember that John said that Sarah won.* (Simplified: T and the insides of each DP are left out so the clauses stand out.) Click each **CP**: every one sits inside the one above it. Add another *that*-clause to the brackets and watch the tree grow.", {"bracket": REC}),
    T(["Kind of recursion", "Example", "Same type inside itself"], [
      ["Clause inside a clause", "Sam thinks [that Ana knows [that Lee left]]", "CP in CP"],
      ["Relative clause stacking", "the rat [that ate the malt [that lay in the house [that Jack built]]]", "relative clause in relative clause"],
      ["Noun phrase / PP stacking", "the key to [the door of [the house on [the hill]]]", "DP in PP in DP…"],
      ["Possessives", "[[[my friend]'s sister]'s boss]'s car", "possessor in possessor"],
    ], title="Recursion you'll see on the exam", slide="Four shapes recursion takes"),
    SIM("tree", "*the key to the door of the house on the hill*: a DP holds a PP that holds a DP that holds a PP… Click any DP and see what it covers.", {"bracket": KEY}, slide=False),
    TRAP("**Long is not recursive.** *big red shiny ball* has three adjectives, but no unit sits inside a unit of the same type the way a clause holds a clause. And *hierarchy* vs *recursion*: every recursive example is hierarchical, but recursion is the special case where the **same type** repeats inside itself. If you can point to 'a clause inside a clause' (or NP in NP), say recursion.", "Week 1 handout, the Jack example", slide="Trap: long ≠ recursive"),
    P("**How you'll recognize it in an example:** the example has **the same structure repeated inside itself** (*that… that… that…*, *'s … 's … 's*, *of the… of the…*), and you can imagine adding one more. Answer *recursion*."),
    C("'the dog that chased the cat that ate the mouse' Which universal?", "**Recursion.** A relative clause (*that ate the mouse*) sits inside another relative clause (*that chased the cat…*)."),
    WORLD("**Where you'll meet this** Recursion is exactly how programming languages work: an *if* inside an *if*, a function that calls itself (CS 146), brackets inside brackets. The grammars that compilers use to read code came straight out of this idea in linguistics."),
  ]},
  {"id": "which", "heading": "Which universal is this? The five-question method", "blocks": [
    P("When you get an example, don't guess. Ask these five questions **in order** and stop at the first *yes*. The order goes from smallest idea (one word) to biggest (endless nesting), so the easy ones catch first.", slide="The method"),
    T(["Ask yourself…", "If yes, it's…", "Giveaway clues"], [
      ["Is it about **which slot a word fits** or which ending it takes?", "Categories", "a frame with a blank; 'these words pattern together'; noun / verb / adjective"],
      ["Is a **group of words acting as one piece** (replaced, moved, or used as an answer)?", "Constituents", "→ it / there / do so; a phrase moved to the front; a short answer"],
      ["Is it about the **shape of the whole sentence**: statement, question, command?", "Sentence types", "a period vs a question vs an order; *hal*, *ka*, moving *did*"],
      ["Does **the same word order have two meanings**, or does a rule **skip over structure**?", "Hierarchy", "'with a cane', 'with the telescope', 'old men and women', 'Is the man who is tall happy?'"],
      ["Is a unit **inside a unit of the same type**, and could it **go on forever**?", "Recursion", "that… that… that…; 's… 's…; of the… of the…"],
    ], title="The five questions", slide="Five questions, in order"),
    E("Worked example 1", "'The students **who finished early** left.' → 'The students left.' Which universal is shown by the bold part coming out as a block?", answer="**Constituents.** The bold words were removed together and the rest still works, so they act as one unit. (If the question were about *who finished early* sitting inside the subject and making a rule skip it, that would be hierarchy.)"),
    E("Worked example 2", "'Visiting relatives can be boring.' Are the relatives visiting you, or are you visiting them?", answer="**Hierarchy.** One word order, two groupings: [visiting relatives] as people who visit, or [visiting] [relatives] as an activity. Two structures, two meanings."),
    E("Worked example 3", "'She said that he thinks that they know.'", answer="**Recursion.** A *that*-clause inside a *that*-clause inside the main clause. Same type in same type, and you could add more."),
    E("Worked example 4", "*Sing*, *eat* and *jump* fit 'Let's ___ .' but *song* and *food* don't.", answer="**Categories.** The slot sorts the words: the first three are verbs, the others nouns."),
    E("Worked example 5", "English 'Did you eat?', Arabic 'hal akalta?', Japanese 'Tabemashita ka?'", answer="**Sentence types.** Three languages, three different tools, but every one has a yes/no question shape. That's the universal."),
    CMP(("Hierarchy", "boxes in boxes; grouping decides", "brand"), ("Recursion", "same kind of box, inside itself", "red"), [
      ("The test question", "Does the grouping change the meaning or the rule?", "Is a unit inside a unit of the same type?"),
      ("Classic example", "the man with a cane (two meanings)", "that… that… that… (no end)"),
      ("Needs the same type repeated?", "No", "Yes"),
      ("Relationship", "Every sentence has it", "A special kind of hierarchy"),
    ], "The pair students mix up most. Recursion is always hierarchical, but hierarchy is not always recursive.", slide="The mix-up: hierarchy vs recursion"),
    C("'the teacher's student's essay' Which universal?", "**Recursion.** A possessor (*the teacher's*) sits inside a possessor (*the teacher's student's*). Same type in same type."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Universal", "A property every human language has."],
      ["Syntactic category", "A kind of word defined by the slots it fits and the endings it takes (noun, verb…)."],
      ["Constituent", "A group of words that acts as one unit; proven by replace, move, or answer tests."],
      ["Sentence type", "The shape of a whole sentence: declarative (statement), interrogative (question), imperative (command)."],
      ["Hierarchy", "Units inside units; the grouping decides meaning and how rules apply."],
      ["Recursion", "A unit inside a unit of the same type, with no limit."],
      ["Structural ambiguity", "One word order, two groupings, two meanings (the cane sentence)."],
      ["Pro-form", "A short word that replaces a whole unit: it, there, do so."],
    ]),
  ]},
 ],
 "exercises": [item_mc(i, it) for i, it in enumerate(ITEMS)] + [
  FILL("define-rec", "Define it in one line: recursion", "In your own words: what is recursion? (Type the key phrase: a unit inside a unit of the ___ type.)", ["same", "same type", "the same type", "same kind"],
       ["It's about what's inside what.", "A clause inside a clause, an NP inside an NP.", "The missing word means 'identical'."],
       "A unit inside a unit of the **same** type, with no upper limit.", "The oral exam starts with 'explain the concept'. A crisp one-line definition gets you there.", ref="recursion"),
  MC("hier-vs-cons", "One box or boxes in boxes?", "'**The book on the table** is mine.' → '**It** is mine.' Which property does the replacement prove?", ["Constituents", "Hierarchy", "Recursion", "Sentence types"], 0,
     ["Yes. *It* replaced five words at once, so they're one unit.", "Close, but nothing here changes meaning with grouping. The replacement proves one unit exists.", "No same-type unit is repeated inside itself here.", "The sentence shape (a statement) didn't change."],
     "**Constituents.** One pronoun replacing a whole chunk is the substitution test.", "The trap of the week: constituents is one box, hierarchy is boxes in boxes that matter.", ref="hierarchy"),
  MC("long-not-rec", "Long, but recursive?", "Is 'the big old red wooden barn' an example of recursion?", ["No: a list of adjectives isn't a unit inside a same-type unit", "Yes: it has many adjectives", "Yes: every noun phrase is recursive", "No: it has no verb"], 0,
     ["Right. Length alone isn't recursion.", "Many words is not the test. You need the same type inside itself.", "A noun phrase is only recursive if it contains another noun phrase (e.g. *the barn of the farmer*).", "Having a verb has nothing to do with recursion."],
     "**No.** Four adjectives in a row make a long phrase, but no unit sits inside a unit of the same type.", "Saying 'long = recursive' is the most common wrong answer on this question type.", ref="recursion"),
  MC("aux-rule", "Why this question?", "Why does English say 'Is the man who is tall happy?' and not '*Is the man who tall is happy?'", ["Rules follow structure (hierarchy): move the main clause's *is*", "Rules count words: always move the first *is*", "It's a sentence type rule: questions start with *is*", "Recursion: there are two *is*'s"], 0,
     ["Yes. The rule skips the *is* inside the subject because it can 'see' the subject unit.", "If it counted, it would move the first *is* and produce the broken version.", "Being a question is the sentence type, but it doesn't explain WHICH *is* moves.", "There's a clause inside a noun phrase, but the reason for the choice is the grouping."],
     "**Hierarchy.** The rule targets the *is* of the main clause, skipping the whole subject unit, so it must be reading structure, not linear order.", "This is Chomsky's classic argument that children expect structure from day one.", ref="hierarchy"),
 ],
}

for e in g['exercises']:
    if isinstance(e['solution'], str): e['solution'] = [e['solution']]
build(g)
