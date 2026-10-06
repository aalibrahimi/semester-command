"""LING 112 · Week 7: X-bar theory, from the Week 6 flat trees up."""
from l112common import *  # noqa

P1 = "′"  # the bar


def XP(cat, head, comp=None, spec=None, adj=()):
    """Bracket notation for one phrase in the X-bar template.

    adj: adjuncts from the innermost outward, each ("L", phrase) or ("R", phrase).
    Every phrase gets all three levels: XP, X′, X.
    """
    bar = f"[{cat}{P1} [{cat} {head}]" + (f" {comp}" if comp else "") + "]"
    for side, z in adj:
        bar = f"[{cat}{P1} {z} {bar}]" if side == "L" else f"[{cat}{P1} {bar} {z}]"
    return f"[{cat}P" + (f" {spec}" if spec else "") + f" {bar}]"


def NP(n, **kw):
    return XP("N", n, **kw)


def DP(d, n=None, **kw):
    # n is a bare noun ("track") or an NP already built with NP(...) (a bracket)
    comp = (n if n.startswith("[") else NP(n)) if isinstance(n, str) else n
    return XP("D", d, comp=comp, **kw)


def NAME(n):
    return DP("∅", n)


def PP(p, obj):
    return XP("P", p, comp=obj)


def ADJ(a, **kw):
    return XP("Adj", a, **kw)


def ADV(a, **kw):
    return XP("Adv", a, **kw)


# Handout (1): the same VP, flat (Week 6) and X-bar (Week 7)
FLAT_1 = "[TP [DP [D ∅] [NP [N Lee]]] [T will] [VP [V circle] [DP [D the] [NP [N track]]] [AdvP [AdvP [Adv extremely]] [Adv recklessly]] [PP [P in] [DP [D the] [NP [N morning]]]]]]"
VP_1 = XP("V", "circle", comp=DP("the", "track"), adj=[("R", ADV("recklessly", adj=[("L", ADV("extremely"))])), ("R", PP("in", DP("the", "morning")))])
X_1 = XP("T", "will", spec=NAME("Lee"), comp=VP_1)
# (7), (8)
X_7 = XP("T", "PRES", spec=NAME("Erin"), comp=XP("V", "plays", comp=DP("her", "guitar"), adj=[("R", PP("in", DP("the", "evenings")))]))
X_8 = XP("T", "PAST", spec=DP("her", "phone"), comp=XP("V", "buzzed", adj=[("R", ADV("loudly")), ("R", PP("for", DP("several", "minutes")))]))
# (9) possessors
POSS_A = DP("her", "phone")
POSS_B = XP("D", "'s", spec=NAME("Michelle"), comp=NP("phone"))
POSS_C = XP("D", "'s", spec=DP("my", NP("friend", adj=[("L", ADJ("best"))])), comp=NP("phone"))
# (11) one-substitution inside the NP
NP_11 = DP("those", NP("sacks", comp=PP("of", NAME("flour")), adj=[("L", ADJ("heavy")), ("R", PP("in", DP("the", "corner")))]))
# (13), (14)
X_13 = XP("D", "'s", spec=DP("the", "artist"), comp=NP("collection", comp=PP("of", NAME("paintings")), adj=[("L", ADJ("ugly", adj=[("L", ADV("rather"))]))]))
SHE = XP("D", "she")
CANE = PP("with", DP("a", "cane"))
X_14A = XP("T", "PAST", spec=SHE, comp=XP("V", "tripped", comp=DP("that", NP("man", adj=[("L", ADJ("unlucky"))])), adj=[("R", CANE)]))
X_14B = XP("T", "PAST", spec=SHE, comp=XP("V", "tripped", comp=DP("that", NP("man", adj=[("L", ADJ("unlucky")), ("R", CANE)]))))


def fig_template():
    """The X-bar template with the three dependent positions colored."""
    o = [f"<g {FONT}>"]
    N = {"XP": (300, 34), "YP": (170, 104), "X′a": (400, 104), "ZP": (520, 174), "X′b": (300, 174), "X": (220, 244), "WP": (380, 244)}
    lab = {"X′a": "X′", "X′b": "X′"}
    edges = [("XP", "YP"), ("XP", "X′a"), ("X′a", "X′b"), ("X′a", "ZP"), ("X′b", "X"), ("X′b", "WP")]
    for a, b in edges:
        (x1, y1), (x2, y2) = N[a], N[b]
        o.append(f"<line x1='{x1}' y1='{y1 + 8}' x2='{x2}' y2='{y2 - 18}' stroke='currentColor' stroke-opacity='0.45' stroke-width='1.4'/>")
    info = {
        "XP": ("currentColor", "The phrase level: the whole phrase. Exactly one per head."),
        "YP": (A, "Specifier: sister of X′, daughter of XP. At most one. The subject of a sentence is the specifier of TP."),
        "X′a": ("currentColor", "A bar level. There can be several, one per adjunct: that's how adjuncts stack."),
        "X′b": ("currentColor", "The lowest bar level: the head and its complement."),
        "ZP": (Y, "Adjunct: sister of X′, daughter of X′. As many as you like: X′ → X′ ZP can apply again and again."),
        "X": ("currentColor", "The head. Exactly one."),
        "WP": (G, "Complement: sister of the head X, daughter of X′. A limited number, chosen by the head."),
    }
    for k, (x, y) in N.items():
        col, tip = info[k]
        o.append(f"<g><title>{tip}</title><text x='{x}' y='{y}' text-anchor='middle' font-size='17' font-weight='800' fill='{col}'>{lab.get(k, k)}</text></g>")
    o.append(f"<text x='120' y='132' text-anchor='middle' font-size='11.5' fill='{A}' font-weight='700'>specifier</text>")
    o.append(f"<text x='580' y='200' text-anchor='middle' font-size='11.5' fill='{Y}' font-weight='700'>adjunct</text>")
    o.append(f"<text x='380' y='272' text-anchor='middle' font-size='11.5' fill='{G}' font-weight='700'>complement</text>")
    o.append("<text x='300' y='300' text-anchor='middle' font-size='12' opacity='0.8'>Same word (dependent), three positions. The position decides which one it is.</text>")
    o.append("</g>")
    return "".join(o), "0 0 640 312"


g = {
 "id": "ling112/7-x-bar",
 "course": "ling112",
 "lessons": "Week 7",
 "title": "X-bar theory: bar levels, specifiers, complements and adjuncts",
 "summary": "See what Week 6's flat trees can't show, add the bar level (V′, N′) that 'do so' and 'one' actually replace, and use the X-bar template to tell a specifier, a complement and an adjunct apart by position. Draw X-bar trees for sentences with subjects, possessors and stacked adjuncts.",
 "estimatedMinutes": 65,
 "sourceNote": "Week 7 handout 'X-bar theory' (Dr. Nie, (1) to (14)); Carnie, Syntax: A Generative Introduction ch. 6. Every tree here is generated from the handout's own rules, with all three levels (XP, X′, X) on every phrase as the handout asks. Oral Exam 1 territory.",
 "requires": ["ling112/4-heads-dependents", "ling112/5-constituency-tests", "ling112/6-phrase-structure"],
 "sections": [
  {"id": "why", "heading": "Start here: what flat trees can't show", "blocks": [
    P("**The problem** Week 6's rules built **flat** phrases: a VP was just V followed by everything after it, all sisters. Dr. Nie's handout starts by testing that on one sentence, and it fails.", slide="The problem", why=True),
    E("Handout (1)", "(1) Lee will circle the track extremely recklessly in the morning.\n\nHow many units can **do so** replace?\n\n  a. Lee will circle the track extremely recklessly in the morning, and Sam will **do so** too.\n     (do so = circle the track extremely recklessly in the morning)\n  b. …, and Sam will **do so** in the evening.\n     (do so = circle the track extremely recklessly)\n  c. …, and Sam will **do so** carefully in the evening.\n     (do so = circle the track)\n\nThree different strings pass the test, so all three are constituents.", slide="Handout (1): do so, three times"),
    SIM("tree", "The flat Week 6 tree for (1). Click the VP: it's the only node above *circle*. There is **no node** for *circle the track* or *circle the track extremely recklessly*, even though do so just proved both are units.", {"bracket": FLAT_1}),
    T(["Concept", "Can the flat tree show it?", "Why"], [
      ["Head", "yes", "the phrase is named after it (VP ← V)"],
      ["Dependent", "yes", "every other daughter of the phrase"],
      ["Complement vs adjunct", "**no**", "the object DP and the adverb are both just sisters of V"],
      ["Head directionality", "yes", "the order of V and its complement"],
      ["Constituency", "**only partly**", "no node for *circle the track*, which do so proves is a unit"],
    ], title="The handout's question: what can our diagrams represent so far?", slide="What flat trees miss"),
    WHY("**Why it matters** A theory of syntax should draw a node for every unit the tests find, and nothing else. The flat tree misses units and can't tell a complement from an adjunct, two things you already know are real from Weeks 4 and 5. X-bar theory fixes both with one idea: a middle layer."),
  ]},
  {"id": "bar", "heading": "Bar levels: the missing middle layer", "blocks": [
    D("Bar level (X′)", "An **intermediate projection** of a head: bigger than the head, smaller than the whole phrase. Read V′ as **'V-bar'**. A category has exactly **one head** and **one phrase level**, but it can have **several bar levels**."),
    D("Projection", "The levels built on one head: the head V **projects** up to V′ and then to VP. They all share the head's category, which is why the phrase is named after its head."),
    P("**What do so really replaces.** The handout's point: do so substitution targets the **V-bar**, not the VP. Each do so in (1a) to (1c) replaced a different V′. So the VP needs one V′ per unit the test found.", slide="do so targets V′"),
    T(["Rule", "Read it as"], [
      ["VP → V′", "a VP is made of a V-bar"],
      ["V′ → V′ (AdvP / PP)", "a V-bar can be another V-bar plus an adverb phrase or a PP after it"],
      ["V′ → V DP", "the lowest V-bar is the verb and its object"],
    ], title="Handout (3): the flat VP rule, rewritten with bar levels", slide="Rules (3)"),
    SIM("tree", "Sentence (1) in X-bar form. Click each V′ from the bottom up: *circle the track*, then *circle the track extremely recklessly*, then everything including *in the morning*. Each one is exactly a string that do so replaced.", {"bracket": X_1}),
    TRAP("The rule V′ → V′ (AdvP / PP) has V′ on **both** sides of the arrow. That's on purpose: it can apply again to its own output, so adjuncts can stack without limit. It is recursion, from Week 1.", "Week 7 handout", slide="Trap: V′ on both sides"),
    C("In (1), which string does the **lowest** V′ cover?", "*circle the track*: the verb and its object DP (the complement)."),
    C("How many V′ nodes does (1) need, and why that number?", "**Three**: one for V + complement, and one more for each adjunct (*extremely recklessly*, *in the morning*). Each is a unit that do so can replace."),
  ]},
  {"id": "template", "heading": "The X-bar template", "blocks": [
    P("**One template for every phrase.** Instead of a different flat rule for each category, X-bar theory says every phrase, whatever its head (N, V, P, Adj, Adv, D, T), has the same shape. X stands for any category.", slide="One template"),
    T(["Rule", "What it adds", "Name of the added phrase"], [
      ["XP → YP X′", "a phrase on the left, under XP", "YP = **specifier**"],
      ["X′ → ZP X′  or  X′ → X′ ZP", "a phrase next to an X′, under an X′", "ZP = **adjunct**"],
      ["X′ → X WP", "a phrase next to the head", "WP = **complement**"],
    ], title="Handout (5): the X-bar schema", slide="The schema (5)"),
    F(fig_template(), "The template drawn out. Hover each label for its definition. The three kinds of dependent are told apart purely by **where they attach**.", slide="The template, drawn"),
    D("Complement", "A phrase that is **sister to the head X** and a **daughter of X′**. (*the track* in *circle the track*.)"),
    D("Adjunct", "A phrase that is **sister to an X′** and a **daughter of an X′**. (*in the morning*.)"),
    D("Specifier", "A phrase that is **sister to an X′** and a **daughter of the XP**. (The subject, as the next section shows.)"),
    P("**Every phrase has all three levels, even alone.** The handout's (6): a phrase with just a head is still XP over X′ over X. *Lee* is a DP, *track* sits in an NP over an N′ over an N. Draw all three every time.", slide="Always three levels"),
    THINK("**Handout question: why can a head have only a few complements and specifiers, but unlimited adjuncts?** Look at which rules can repeat. X′ → X WP puts the head at the bottom, so it applies **once**: one set of complements. XP → YP X′ builds the top, so it also applies **once**: one specifier. X′ → X′ ZP has X′ on both sides, so it can apply **again and again**: unlimited adjuncts. The template's shape is the explanation."),
    C("A phrase is a daughter of V′ and a sister of V. What is it?", "A **complement** of the verb."),
    C("A phrase is a daughter of N′ and a sister of another N′. What is it?", "An **adjunct** inside the noun phrase."),
  ]},
  {"id": "spec", "heading": "Specifiers: subjects and possessors", "blocks": [
    D("Subject = specifier of TP", "The handout puts it in one line: the object DP is the complement of V, the VP is the complement of T, and **the subject DP is the specifier of T**. So TP → DP T′, and T′ → T VP."),
    SIM("tree", "Handout (7): *Erin PRES plays her guitar in the evenings.* Click T′: it covers T and the whole VP. The subject *Erin* sits above it, as the specifier. *in the evenings* is an adjunct V′; *her guitar* is the complement of *plays*.", {"bracket": X_7}),
    SIM("tree", "Handout (8): *Her phone PAST buzzed loudly for several minutes.* *buzz* takes no object, so the lowest V′ is just the verb. Two adjuncts stack as two more V′ levels.", {"bracket": X_8}),
    P("**DPs have specifiers too.** Handout (9) asks what category a possessive is. A possessive pronoun like *her* fills the **D** slot: it can't sit next to another determiner (`*the her phone` is out). A possessive **nominal** like *Michelle's* is different: *Michelle* is a whole DP, and *'s* is the D head.", slide="Possessors"),
    T(["", "Rule", "Read it as"], [
      ["(10a)", "DP → Possessor-DP D′", "the possessor is the **specifier** of DP"],
      ["(10c)", "D′ → D Possessed-NP", "'s is the head; the thing possessed is its **complement** NP"],
    ], title="Handout (10): possessors", slide="Rules (10)"),
    SIM("tree", "(9b) *Michelle's phone*: the possessor DP *Michelle* is the specifier, *'s* is D, and *phone* is the complement NP. Edit the brackets to try (9a) and (9c).", {"bracket": POSS_B}),
    E("(9a) and (9c) in brackets", f"(9a) her phone:\n{POSS_A}\n\n(9c) my best friend's phone:\n{POSS_C}\n\nIn (9c) the possessor is itself a DP with its own adjunct: *best* sits on an N′ inside it.", slide="(9a) and (9c)"),
    C("In *the artist's collection*, which phrase is the specifier of the DP, and what is D?", "*the artist* is the specifier (a possessor DP); D is *'s*."),
    C("What is the specifier of TP in *Erin plays her guitar*?", "The subject DP *Erin*."),
  ]},
  {"id": "np", "heading": "Inside the noun phrase: one targets N′", "blocks": [
    E("Handout (11)", "(11) those heavy sacks of flour in the corner\n\nHow many units can **one(s)** replace?\n\n  a. those **ones** (= heavy sacks of flour in the corner)\n  b. those **ones** in the corner (= heavy sacks of flour)\n  c. those heavy **ones** in the corner (= sacks of flour)\n  d. ✗ those heavy **ones** of flour in the corner (ones = sacks: FAILS)\n\nThree units pass, and *sacks* alone does not.", slide="Handout (11): one, three times"),
    P("**Same pattern as do so.** One substitution targets the **N-bar**, not the NP. And *of flour* can't be left behind (11d) because it is the **complement** of *sacks*: it's inside the lowest N′ with the head. *heavy* and *in the corner* are adjuncts, each adding an N′.", slide="one targets N′"),
    T(["Rule", "Read it as"], [
      ["NP → N′", "a noun phrase is made of an N-bar"],
      ["N′ → (AdjP) N′ (PP)", "an N-bar can add an adjective before it or a PP after it (adjuncts)"],
      ["N′ → N (PP)", "the lowest N-bar is the noun and maybe its complement PP"],
    ], title="Handout (12): NP rules in X-bar form", slide="Rules (12)"),
    SIM("tree", "(11) in X-bar form. Click the three N′ nodes: they are exactly (11c), (11b) and (11a). The PP *of flour* hangs from the lowest N′, next to the head: a complement.", {"bracket": NP_11}),
    SIM("tree", "Handout (13): *the artist's rather ugly collection of paintings*. Possessor in the specifier, *of paintings* as the complement of *collection*, and *rather ugly* as an adjunct N′ (with *rather* as an adjunct inside the AdjP).", {"bracket": X_13}),
    P("**Handout (14) is ambiguous**, and X-bar shows exactly where: *She PAST tripped that unlucky man with a cane*. If she used the cane, *with a cane* is an adjunct on a **V′**. If the man had the cane, it's an adjunct on an **N′** inside the object.", slide="(14): two trees"),
    SIM("tree", "(14), reading A: she tripped him using a cane. The PP is an adjunct V′.", {"bracket": X_14A}, slide=False),
    SIM("tree", "(14), reading B: the man who had a cane. The PP is an adjunct N′ inside the object DP.", {"bracket": X_14B}, slide=False),
    C("In *a student of physics with long hair*, which PP is on the lowest N′?", "*of physics*: it's the complement of *student*, sister to the head N. *with long hair* is an adjunct on a higher N′."),
  ]},
  {"id": "oral", "heading": "If this is your oral-exam concept", "blocks": [
    P("- Definition: X-bar theory says every phrase has the same shape, XP over X′ over X, and dependents are named by where they attach.\n- Why it's needed: flat trees miss units that do so and one prove exist, and can't tell complements from adjuncts.\n- The three positions: complement = sister of the head; adjunct = sister of X′ under X′; specifier = sister of X′ under XP.\n- The evidence: do so replaces V′, one replaces N′ (handout (1) and (11)).\n- Why adjuncts are unlimited: X′ → X′ ZP can repeat; the complement and specifier rules can't.\n- Live problem: 'Draw this sentence in X-bar and label every dependent.' Start from TP: subject in Spec,TP; T′ → T VP; complement next to V; one V′ per adjunct.", slide="The 3-minute explanation"),
    C("Say it out loud in one breath: why does X-bar theory need a bar level at all?", "Because do so and one replace strings that are bigger than a head but smaller than a phrase (*circle the track*, *sacks of flour*), so the tree needs a node there: the bar level."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Flat structure", "Week 6's trees: every dependent is a sister of the head."],
      ["Bar level (X′, 'X-bar')", "A middle layer between the head and the phrase. One or more per phrase."],
      ["Projection", "The head and the levels built on it: X, X′, XP."],
      ["X-bar template", "XP → YP X′; X′ → X′ ZP (or ZP X′); X′ → X WP."],
      ["Complement", "Sister of the head, daughter of X′."],
      ["Adjunct", "Sister of X′, daughter of X′. Can stack."],
      ["Specifier", "Sister of X′, daughter of XP. The subject is Spec of TP."],
      ["Possessor", "A DP in the specifier of a DP headed by 's."],
      ["do so / one", "Pro-forms for V′ and N′."],
    ]),
  ]},
 ],
 "exercises": [
  MC("which-position", "Name the position", "A PP is a daughter of V′ and a sister of another V′. What is it?", ["An adjunct", "A complement", "A specifier", "The head"], 0,
     ["Yes: sister of X′ under X′.", "A complement is a sister of the HEAD V.", "A specifier is a daughter of the XP (VP), not of V′.", "The head is the verb itself."],
     "**An adjunct**: sister to an X′, daughter of an X′.", "Positions are the whole point of X-bar.", ref="template"),
  MC("do-so-target", "What does do so replace?", "In X-bar theory, 'do so' replaces a…", ["V′", "VP", "V", "TP"], 0,
     ["Yes: the handout says do so targets the V-bar.", "Close, but the handout's point is that it's the V-bar level.", "A single verb can't be replaced by do so alone when it has an object.", "TP includes the subject and tense."],
     "**V′.** Each do so in handout (1) replaced a different V′.", "Same idea as one → N′.", ref="bar"),
  MC("subject-spec", "Where is the subject?", "In X-bar theory, the subject DP of a sentence is…", ["the specifier of TP", "the complement of V", "an adjunct of VP", "the head of TP"], 0,
     ["Yes: TP → DP T′.", "That's the object.", "Subjects aren't optional add-ons.", "T is the head of TP."],
     "**The specifier of TP.**", "Handout section 2.1.", ref="spec"),
  MC("unlimited", "Why unlimited adjuncts?", "Why can a phrase have unlimited adjuncts but only one specifier?", ["The adjunct rule has X′ on both sides, so it can repeat", "Adjuncts are shorter", "Specifiers are always pronouns", "Adjuncts come after the head"], 0,
     ["Yes: X′ → X′ ZP can apply to its own output.", "Length has nothing to do with it.", "Specifiers are full DPs like 'the artist'.", "Adjuncts can come before the head too ('heavy')."],
     "The **recursive** adjunct rule X′ → X′ ZP.", "The handout's closing question for section 2.", ref="template"),
  FILL("count-nbar", "Count the N′s", "How many N′ nodes does 'those heavy sacks of flour in the corner' have in X-bar form?", ["3", "three"],
       ["One N′ for the head and its complement.", "One more for each adjunct.", "The adjuncts are 'heavy' and 'in the corner'."],
       ["**3**: [sacks of flour], [heavy sacks of flour], [heavy sacks of flour in the corner]. Each is replaceable by one(s)."],
       "Counting bar levels = counting adjuncts + 1.", ref="np"),
 ],
}

finish(g)
