from l112common import *  # noqa


def fig_treewords():
    out = [f"<g {FONT}>"]
    # nodes: (x, y, label, col, title)
    N = {"TP": (330, 40), "DP": (170, 110), "T": (330, 110), "VP": (490, 110), "D": (120, 180), "NP": (220, 180), "V": (490, 180)}
    W = {"D": "the", "NP": "dog", "T": "PAST", "V": "barked"}
    edges = [("TP", "DP"), ("TP", "T"), ("TP", "VP"), ("DP", "D"), ("DP", "NP"), ("VP", "V")]
    for a, b in edges:
        (x1, y1), (x2, y2) = N[a], N[b]
        out.append(f"<line x1='{x1}' y1='{y1 + 8}' x2='{x2}' y2='{y2 - 16}' stroke='currentColor' stroke-opacity='0.45' stroke-width='1.4'/>")
    for k, (x, y) in N.items():
        col = A if k == "TP" else (G if k in ("DP", "D", "NP") else Y if k in ("VP", "V") else "currentColor")
        out.append(f"<g><title>A node labeled {k}.</title><text x='{x}' y='{y}' text-anchor='middle' font-size='15' font-weight='800' fill='{col}'>{k}</text></g>")
        if k in W:
            out.append(f"<line x1='{x}' y1='{y + 6}' x2='{x}' y2='{y + 30}' stroke='currentColor' stroke-opacity='0.35'/><text x='{x}' y='{y + 46}' text-anchor='middle' font-size='14' font-style='italic'>{W[k]}</text>")
    # callouts
    out.append(f"<g><title>The top node is the mother of DP, T and VP. It dominates every word below it.</title><text x='420' y='30' font-size='11.5' fill='{A}'>← mother of DP, T, VP (the root)</text></g>")
    out.append(f"<g><title>DP, T and VP share a mother, so they are sisters.</title><text x='330' y='254' text-anchor='middle' font-size='11.5' opacity='0.8'>DP, T and VP are daughters of TP, and sisters of each other</text></g>")
    out.append(f"<g><title>A branch is a line from a mother down to a daughter.</title><text x='40' y='70' font-size='11.5' opacity='0.8'>each line = a branch</text><line x1='112' y1='66' x2='236' y2='80' stroke='currentColor' stroke-opacity='0.3' stroke-dasharray='3 3'/></g>")
    out.append(f"<text x='330' y='286' text-anchor='middle' font-size='13.5' font-family='ui-monospace, monospace'>[TP [DP [D the] [NP dog]] [T PAST] [VP [V barked]]]</text>")
    out.append(f"<text x='330' y='308' text-anchor='middle' font-size='11.5' opacity='0.75'>Same tree as brackets: every [ opens a node, its label comes first, and ] closes it.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 320"



S6 = "[TP [DP [D The] [NP [AdjP [Adj young]] [N officer]]] [T PAST] [VP [V inspected] [DP [D the] [NP [AdjP [AdvP [Adv brand]] [Adj new]] [N license]]]]]"
S8 = "[TP [DP [D ∅] [NP [N Nadia]]] [T will] [VP [AdvP [Adv carefully]] [V hand] [DP [D a] [NP [AdjP [Adj fragile]] [N vase]]] [PP [P to] [DP [D the] [NP [N buyer]]]] [PP [P in] [DP [D the] [NP [N morning]]]]]]"
A_VP = "[TP [DP [D The] [NP [N thief]]] [T PAST] [VP [V tripped] [DP [D that] [NP [AdjP [Adj unlucky]] [N man]]] [PP [P with] [DP [D a] [NP [N cane]]]]]]"
A_NP = "[TP [DP [D The] [NP [N thief]]] [T PAST] [VP [V tripped] [DP [D that] [NP [AdjP [Adj unlucky]] [N man] [PP [P with] [DP [D a] [NP [N cane]]]]]]]]"

g = {
 "id": "ling112/6-phrase-structure",
 "course": "ling112",
 "lessons": "Week 6",
 "title": "Phrase structure rules and drawing trees",
 "summary": "Read a phrase structure rule out loud; use Dr. Nie's eight English rules to bracket and draw a tree for any sentence, with a null D for bare nouns and a T (a modal, or PAST/PRES) in every sentence; draw both trees for an ambiguous sentence.",
 "estimatedMinutes": 60,
 "sourceNote": "Week 6 handout 'Phrase structure' (Dr. Nie, sentences (1) to (11)); Carnie, Syntax: A Generative Introduction ch. 3; builds on the Week 5 constituency tests. Quiz 3 territory.",
 "requires": ["ling112/1-universals", "ling112/4-heads-dependents", "ling112/5-constituency-tests"],
 "sections": [
  {"id": "why", "heading": "Why we need rules at all", "blocks": [
    P("**The problem** Last week the constituency tests told you which chunks of *one* sentence are units. But you can say millions of sentences you have never heard before, and you know right away which ones are English. *The thief tripped the man* is fine. *Tripped man the thief the* is not. Something in your head is doing that check. A **phrase structure rule** is our attempt to write that something down.", slide="Why rules", why=True),
    D("Phrase structure rule", "A rule that says **what a phrase is made of, and in what order**. It is written as a phrase label, an arrow, and the pieces: `PP → P DP` means *a prepositional phrase is made of a preposition followed by a determiner phrase* (**in** + **the garden**)."),
    P("**Why it matters outside this class** A short list of rules can build an endless number of sentences, because a rule can reuse itself: a DP can contain a PP, which contains another DP, which can contain another PP (*the key to the door of the house on the hill*). This is the same idea as a **context-free grammar** in CS 154, and it is how grammar checkers, voice assistants and programming-language compilers read input: they check it against rules like these and build a tree.", slide="Same idea as CS 154 grammars"),
  ]},
  {"id": "trees", "heading": "Start here: how to read a tree", "blocks": [
    P("Week 6 is where drawings of sentences begin, and the lecture uses words like node and dominate without stopping. Here they are, one at a time, on the smallest tree possible.", slide="Why start here"),
    D("Tree", "A drawing of a sentence's structure (its hierarchy). The whole sentence is at the top, each phrase splits into its pieces below, and the words sit at the bottom. It's the boxes-inside-boxes picture from the universals chapter, drawn upside down like a family tree.", slide="Tree"),
    D("Node and label", "Each point in the tree is a **node**. Its **label** says what kind of unit it is: TP (sentence), DP, NP, VP, PP, or a single-word category like N or V. Every node is a constituent."),
    D("Mother, daughter, sister", "A node directly above another is its **mother**; the node below is its **daughter**. Daughters of the same mother are **sisters**. A line from mother to daughter is a **branch**."),
    D("Dominate", "A node **dominates** everything below it on its branches. The VP in *the dog barked* dominates *barked*; the TP at the top dominates every word. 'Which words does this node dominate?' is the same question as 'which words make up this constituent?'"),
    F(fig_treewords(), "The smallest full tree in this class, labeled. Hover each part. Below it: the same tree written as brackets, which is how you'll type trees on the homework.", slide="Tree words, labeled"),
    SIM("tree", "Type your own. Change *barked* to *chased the cat*: add [DP [D the] [NP [N cat]]] inside the VP and watch a new branch appear. Click any node to see what it dominates.", {"bracket": "[TP [DP [D the] [NP [N dog]]] [T PAST] [VP [V barked]]]"}),
    C("In [TP [DP [D the] [NP dog]] [T PAST] [VP [V barked]]], what are the sisters of T?", "DP and VP: all three are daughters of TP."),
    C("Which words does the DP dominate?", "*the dog*."),
  ]},
  {"id": "read", "heading": "How to read a rule", "blocks": [
    P("Every rule has the same shape: `XP → YP X ZP`. Read the arrow as **\"is made of\"**. The phrase on the left is named after its **head**, the one word it cannot do without (you met heads in Week 4). **X** is that head. **YP** and **ZP** are the *dependents*, the phrases that hang off the head.", slide="The shape of every rule"),
    T(["Mark", "Means", "Example rule", "What it allows"], [
      ["no mark: ZP", "required", "PP → P DP", "*in the garden*, but not just *in*"],
      ["(ZP)", "optional, at most one", "DP → (DP) D NP", "*the cat* or *Sarah's cat*"],
      ["(ZP+)", "optional, and can repeat (adjuncts)", "AdjP → (AdvP+) Adj", "*tall*, *very tall*, *very very tall*"],
      ["(A / B)", "one or the other, not both", "VP → … (DP / PP) …", "*give him a book* or *give a book to him*"],
    ], title="The four marks", slide="Parentheses, plus, slash"),
    E("Reading one rule out loud", "AdjP → (AdvP+) Adj\n\n\"An adjective phrase is made of an adjective, and before it you may put any number of adverb phrases.\"\n\n  tall            = Adj\n  very tall       = AdvP + Adj\n  really very tall = AdvP + AdvP + Adj", slide=True),
    P("The `+` is Dr. Nie's mark for **adjuncts**: optional add-ons you can stack (Week 4). Arguments, the dependents the head needs or selects, have no `+`. So the notation itself tells you which dependents are adjuncts."),
    C("Read `PP → P DP` out loud, and say which piece is the head.", "\"A prepositional phrase is made of a preposition followed by a determiner phrase.\" P is the head (it names the phrase: P → PP). Example: *to the buyer*."),
  ]},
  {"id": "rules", "heading": "The eight English rules", "blocks": [
    P("These are the rules from the handout, (1). You will use exactly these on the quiz, so learn to read each one and give an example. Go one row at a time.", slide="Handout (1)"),
    T(["Rule", "In words", "Example"], [
      ["AdvP → (AdvP+) Adv", "an adverb, maybe with adverbs before it", "*very* **quickly**"],
      ["AdjP → (AdvP+) Adj", "an adjective, maybe with adverbs before it", "*brand* **new**"],
      ["NP → (AdjP+) N (PP) (PP+) (CP)", "a noun, maybe adjectives before; after it maybe a PP argument, PP adjuncts, a clause", "*tall* **spies** *in the garden*"],
      ["DP → (DP) D NP", "a determiner plus an NP, maybe a possessor DP first", "**the** *spies*"],
      ["PP → P DP", "a preposition plus a DP", "**in** *the garden*"],
      ["VP → (AdvP+) V (DP) (DP / PP) (CP) (AdvP+ / PP+) (AdvP+ / PP+)", "a verb; adverbs before; then up to two objects, a clause, and adverb or PP adjuncts after", "*carefully* **hand** *a vase to the buyer in the morning*"],
      ["TP → DP T VP", "a sentence is a subject DP, then T, then a VP", "*Sarah* **will** *run the race*"],
      ["CP → C TP", "a complementizer plus a sentence", "**that** *she had left*"],
    ], title="English phrase structure rules (handout (1))", slide="All eight rules"),
    P("Notice two things. First, **NP and DP are different**: the NP is the noun and its describers (*tall spies in the garden*), and the DP wraps a determiner around it (*those* + *tall spies in the garden*). Second, **a sentence is a TP**, not an S. The next two sections explain why."),
    TRAP("The VP rule is long, so people drop pieces. Before you draw, list what comes after the verb: objects (DP), a second object or a to-phrase (DP / PP), a clause (CP), then adjuncts (AdvP / PP). Adjuncts always come last.", "Week 6 handout"),
  ]},
  {"id": "dp", "heading": "Every noun phrase is a DP, even without a determiner", "blocks": [
    D("DP (determiner phrase)", "A noun phrase wrapped in a **determiner**: *the, a, that, each, those*. Rule: `DP → (DP) D NP`. In this class **every** nominal is a DP, even when you cannot hear a determiner."),
    D("Null determiner (∅)", "A D slot that is there in the structure but silent. Names and bare plurals get one: *Sarah* = [DP [D ∅] [NP Sarah]], *berries* = [DP [D ∅] [NP berries]]."),
    E("Why a silent D? The 'one' test", "those tall spies in the garden\n→ those [ones]\n\n'ones' replaces tall spies in the garden but NOT 'those'.\nSo 'tall spies in the garden' is a unit (the NP) and 'those' sits outside it (in D).\nEvery nominal has that same two-layer shape, so a name gets the D layer too, just empty.", slide="The 'one' test shows the NP inside the DP"),
    P("**Why bother with an empty slot** Keeping every nominal the same shape means one rule (`DP → (DP) D NP`) covers *the cat*, *Sarah*, *cats* and *Sarah's cat*. Without the ∅, you would need a separate rule for each. Fewer rules that cover more is the whole goal."),
    TRAP("Forgetting the ∅. *Nadia*, *berries*, *night* (in *at night*) all need [D ∅]. A tree with a DP that has no D is marked wrong.", "Week 6 handout, assumptions", slide="Don't forget the ∅"),
    C("Bracket the DP *very round red berries*.", "[DP [D ∅] [NP [AdjP [AdvP [Adv very]] [Adj round]] [AdjP [Adj red]] [N berries]]]. A bare plural gets a null D; each adjective is its own AdjP; *very* modifies *round* only."),
  ]},
  {"id": "tp", "heading": "Every sentence is a TP, and T is never empty", "blocks": [
    D("TP (tense phrase)", "The sentence. Rule: `TP → DP T VP`: the subject DP, then **T**, then the VP. T is the slot for **tense**: a modal or auxiliary (*will, can, had, is*) or, if there is none, just the tense itself, written **PAST** or **PRES**."),
    T(["Sentence", "T", "VP"], [
      ["Sarah **will** run the race.", "will", "run the race"],
      ["Sarah **ran** the race.", "PAST", "ran the race"],
      ["Sarah **runs** races.", "PRES", "runs races"],
      ["She **had** left.", "had", "left"],
    ], title="Filling T", slide="What goes in T"),
    E("Proof that T sits outside the VP: the do so test", "Sarah will [run the race], and Tom will [do so], too.\n\n'do so' replaces 'run the race' but leaves 'will' behind.\nSo 'will' is not inside the VP. It is in T, between the subject and the VP.", slide=True),
    P("When there is no auxiliary, the tense still exists (you can hear it in *ran* vs *runs*), so T still gets a value: **PAST** or **PRES**. The verb itself stays in V. Writing T = PAST and V = *ran* is the convention on the handout."),
    TRAP("Leaving T out of a sentence with no auxiliary. *The thief tripped the man* still has T: it is [T PAST]. No TP without a T.", "Week 6 handout, assumptions"),
    C("What goes in T for *The owner very clearly adores each piece in her collection*?", "PRES. There is no modal or auxiliary, and *adores* is present tense. *adores* stays in V."),
  ]},
  {"id": "cp", "heading": "Clauses inside clauses: CP", "blocks": [
    D("CP (complementizer phrase)", "A sentence introduced by a **complementizer**, a word like *that*, *if*, *whether*. Rule: `CP → C TP`. *that she had left* = [CP [C that] [TP she had left]]."),
    P("A CP shows up in two places in our rules: after a verb (`VP → … (CP) …`, *Henry* **said** *that she had left*) and after a noun (`NP → … (CP)`, *a dubious* **rumor** *that he threw the game*). Inside the CP is a whole TP, with its own subject, T and VP. That is where the endless nesting comes from: *I think that you said that she knows that…*"),
    E("Two CPs, two homes (handout (10) and (11))", "(10) Henry said [CP that she had left rather quietly at night].\n     The CP is what Henry said: it sits in the VP, after 'said'.\n\n(11) We heard a dubious rumor [CP that he threw the game].\n     The CP says what the rumor was: it sits in the NP, after 'rumor'.", slide="CP after a verb vs after a noun"),
    C("In *We heard a dubious rumor that he threw the game*, is the CP inside the VP directly, or inside the object DP?", "Inside the object DP (in its NP, after *rumor*). Test: We heard **it** replaces *a dubious rumor that he threw the game* as one piece."),
  ]},
  {"id": "draw", "heading": "Drawing a tree, step by step", "blocks": [
    P("Here is a recipe that works on every sentence in the handout. Do it in brackets first; the tree is just the brackets drawn out.", slide="The recipe"),
    ST("Bracketing (6): The young officer inspected the brand new license.", [
      lines(["The young officer inspected the brand new license."], 0, "Start with the plain sentence. Our goal: TP → DP T VP."),
      lines(["[TP [DP The young officer] [T PAST] [VP inspected the brand new license]]"], 0, "Step 1: find T. No modal or auxiliary, and *inspected* is past, so T = PAST. Everything before the verb is the subject DP; the verb and what follows is the VP."),
      lines(["[TP [DP The young officer] [T PAST] [VP inspected the brand new license]]", "[DP [D The] [NP young officer]]"], 1, "Step 2: split each DP into D + NP. *The* is D; *young officer* is the NP."),
      lines(["[DP [D The] [NP [AdjP [Adj young]] [N officer]]]"], 0, "Step 3: inside the NP, each adjective is its own AdjP (rule NP → (AdjP+) N …). The noun is the head, N."),
      lines(["[VP [V inspected] [DP the brand new license]]"], 0, "Step 4: in the VP, the verb is V; *the brand new license* is its object DP."),
      lines(["[DP [D the] [NP [AdjP [AdvP [Adv brand]] [Adj new]] [N license]]]"], 0, "Step 5: *brand* modifies *new* (it says how new), so it is an AdvP inside the AdjP (rule AdjP → (AdvP+) Adj)."),
      lines(["[TP [DP [D The] [NP [AdjP [Adj young]] [N officer]]] [T PAST] [VP [V inspected] [DP [D the] [NP [AdjP [AdvP [Adv brand]] [Adj new]] [N license]]]]]"], 0, "Put it together. Check: every DP has a D, the TP has a T, every phrase has its head."),
    ]),
    SIM("tree", "Sentence (6) as a tree. Click any node to see the words it covers and the pro-form test that proves it. Then edit the brackets and try (7) yourself.", {"bracket": S6}),
    T(["Step", "Ask", "Write"], [
      ["1", "Is there a modal/auxiliary? What tense?", "[TP [DP subject] [T will / PAST / PRES] [VP …]]"],
      ["2", "What are the DPs?", "[DP [D the / a / ∅] [NP …]] for each"],
      ["3", "What is inside each NP?", "AdjPs before N; PP / CP after N"],
      ["4", "What follows the verb?", "objects (DP), then DP/PP, then CP, then adjuncts"],
      ["5", "Any adverbs or adjectives modifying another word?", "nest an AdvP inside the AdjP / AdvP it modifies"],
    ], title="The five questions", slide="Checklist while you draw"),
    E("Handout (8), done with the recipe", "Nadia will carefully hand a fragile vase to the buyer in the morning.\n\n[TP [DP [D ∅] [NP [N Nadia]]]\n    [T will]\n    [VP [AdvP [Adv carefully]] [V hand]\n        [DP [D a] [NP [AdjP [Adj fragile]] [N vase]]]\n        [PP [P to] [DP [D the] [NP [N buyer]]]]\n        [PP [P in] [DP [D the] [NP [N morning]]]]]]\n\nVP rule used: (AdvP+) V (DP) (DP / PP) … (PP+): carefully, hand, a fragile vase, to the buyer, in the morning.", slide=True),
    SIM("tree", "Handout (8). Click the two PPs: *to the buyer* is an argument of *hand* (you hand something TO someone); *in the morning* is an adjunct (a time add-on).", {"bracket": S8}, slide=False),
  ]},
  {"id": "ambig", "heading": "One string, two trees: structural ambiguity", "blocks": [
    D("Structural ambiguity", "When the same string of words can be built by the rules in **two different ways**, and each way means something different. The words are not ambiguous; the grouping is."),
    E("Handout (4) and (5): The thief tripped that unlucky man with a cane.", "Reading A: the thief used a cane to trip him.\n  The PP is in the VP, next to the object: a tool for the tripping.\n  [VP [V tripped] [DP that unlucky man] [PP with a cane]]\n\nReading B: the man was holding a cane.\n  The PP is inside the NP: it describes the man.\n  [VP [V tripped] [DP [D that] [NP unlucky man [PP with a cane]]]]", slide="Who has the cane?"),
    SIM("tree", "Reading A: the PP hangs off the VP. Click the object DP: it is just *that unlucky man*.", {"bracket": A_VP}, slide=False),
    SIM("tree", "Reading B: the PP is inside the NP. Click the object DP now: it covers *that unlucky man with a cane*.", {"bracket": A_NP}, slide=False),
    P("**Prove each tree with a test** (Week 5): replace the object with *him*. *The thief tripped **him** with a cane* keeps the PP outside, so it matches reading A. For reading B, the pronoun swallows the PP: The thief tripped **him** (him = the man with the cane). Fragment answer works too: *Who did the thief trip?* *That unlucky man with a cane.* works only for B.", slide="The tests pull them apart"),
    C("In reading B, what does *him* replace?", "The whole DP *that unlucky man with a cane*, because in B the PP is inside that DP."),
  ]},
  {"id": "practice", "heading": "Practice: handout (7), (9), (10), (11)", "blocks": [
    P("Bracket each one yourself first, then open the answer. Use the five questions. These are the exact sentences from the handout, so this is quiz practice."),
    E("(7) The owner very clearly adores each piece in her collection.", "[TP [DP [D The] [NP [N owner]]]\n    [T PRES]\n    [VP [AdvP [AdvP [Adv very]] [Adv clearly]] [V adores]\n        [DP [D each] [NP [N piece]\n              [PP [P in] [DP [D her] [NP [N collection]]]]]]]]\n\nNotes: T = PRES (no auxiliary, present tense). 'very' modifies 'clearly', so it nests inside that AdvP. 'in her collection' says which piece: it is in the NP. 'her' is a possessive; here it fills D.", slide=True),
    E("(9) The bear savored a huge dinner of very round red berries.", "[TP [DP [D The] [NP [N bear]]]\n    [T PAST]\n    [VP [V savored]\n        [DP [D a] [NP [AdjP [Adj huge]] [N dinner]\n              [PP [P of] [DP [D ∅] [NP [AdjP [AdvP [Adv very]] [Adj round]] [AdjP [Adj red]] [N berries]]]]]]]]\n\nNotes: 'berries' is a bare plural, so D = ∅. 'of very round red berries' is inside the NP of 'dinner'.", slide=True),
    E("(10) Henry said that she had left rather quietly at night.", "[TP [DP [D ∅] [NP [N Henry]]]\n    [T PAST]\n    [VP [V said]\n        [CP [C that]\n            [TP [DP she] [T had]\n                [VP [V left] [AdvP [AdvP [Adv rather]] [Adv quietly]]\n                    [PP [P at] [DP [D ∅] [NP [N night]]]]]]]]]\n\nNotes: two TPs, two Ts: PAST for 'said', 'had' for the inner clause. A pronoun like 'she' is a whole DP on its own; ask Dr. Nie whether she writes it as [DP [D she]] or [DP she].", slide=True),
    E("(11) We heard a dubious rumor that he threw the game.", "[TP [DP we] [T PAST]\n    [VP [V heard]\n        [DP [D a] [NP [AdjP [Adj dubious]] [N rumor]\n              [CP [C that] [TP [DP he] [T PAST] [VP [V threw] [DP [D the] [NP [N game]]]]]]]]]]\n\nNotes: the CP is inside the NP (it tells you what the rumor is). Rule: NP → (AdjP+) N … (CP).", slide=True),
    C("Why is *in her collection* inside the NP in (7), and not in the VP?", "It says which piece (a description of the noun), not how or where the adoring happens. Test: The owner adores **it** means the piece in her collection, so the PP went with the pronoun."),
  ]},
 ],
 "exercises": [
  EX("which-rule", "Which rule makes this?",
     "Which of Dr. Nie's rules builds the phrase *very carefully*?",
     ["Find the head: the word the phrase is named after.", "*carefully* is an adverb, so this is an AdvP. What is *very* doing?", "Look for a rule with AdvP on the left: AdvP → (AdvP+) Adv."],
     ["The head is *carefully* (Adv), so the phrase is an AdvP.", "*very* modifies it, and it is itself an AdvP: [AdvP [AdvP [Adv very]] [Adv carefully]].", "Rule: AdvP → (AdvP+) Adv."],
     "Being able to name the rule is how you check a tree: every node and its children must match one rule exactly.",
     choices=[{"text": "AdvP → (AdvP+) Adv", "feedback": "Right. *very* is an AdvP stacked in front of the head adverb *carefully*."},
              {"text": "AdjP → (AdvP+) Adj", "feedback": "*carefully* is an adverb, not an adjective (it describes how, not what kind)."},
              {"text": "VP → (AdvP+) V …", "feedback": "There is no verb in *very carefully*."}], answer=0, ref="rules"),
  EX("t-slot", "What goes in T?",
     "For each sentence, what fills T? (a) *The bear savored a huge dinner.* (b) *Nadia will hand a vase to the buyer.* (c) *She had left.* (d) *The owner adores each piece.*",
     ["T holds a modal or auxiliary if there is one.", "No auxiliary? Then T holds just the tense: PAST or PRES.", "The main verb never moves into T in these trees; it stays in V."],
     ["(a) PAST: no auxiliary, *savored* is past.", "(b) will.", "(c) had.", "(d) PRES: no auxiliary, *adores* is present."],
     "Tense is part of every sentence, heard or not. Giving it a fixed slot is what lets one rule, TP → DP T VP, cover every sentence.", ref="tp"),
  EX("bracket-6", "Draw (6) yourself",
     "Bracket *The young officer inspected the brand new license* with the eight rules, then check it with the tree sim.",
     ["Step 1: T. There is no auxiliary. What tense is *inspected*?", "Step 2: two DPs, *The young officer* and *the brand new license*. Split each into D + NP.", "Step 3: *brand* describes *new*, not *license*. Where does an adverb that modifies an adjective go?"],
     ["[TP [DP [D The] [NP [AdjP [Adj young]] [N officer]]] [T PAST] [VP [V inspected] [DP [D the] [NP [AdjP [AdvP [Adv brand]] [Adj new]] [N license]]]]]"],
     "Once you can bracket, drawing the tree is mechanical, and so is checking your own answer before you hand it in.", ref="draw"),
 ],
}
g["exercises"] += [
  MC("tree-sister", "Sisters", "In [VP [V hand] [DP a vase] [PP to the buyer]], which nodes are sisters of V?", ["DP and PP", "Only DP", "VP", "PP only"], 0,
     ["Yes: V, DP and PP are all daughters of the same VP.", "PP shares the same mother too.", "VP is their mother, not a sister.", "DP shares the same mother too."],
     "**DP and PP.** All three hang from the same VP.", "Sisterhood is how Week 7 tells complements (sister of the head) from adjuncts.", ref="trees"),
  MC("null-d", "Where is the D?", "How do you bracket the DP *Nadia*?", ["[DP [D ∅] [NP [N Nadia]]]", "[NP [N Nadia]]", "[DP [D Nadia]]", "[N Nadia]"], 0,
     ["Yes: every nominal is a DP, with a silent D when you can't hear one.", "Missing the DP layer: in this class every nominal is a DP.", "A name is a noun, not a determiner.", "A bare N can't be an argument on its own in these trees."],
     "**[DP [D ∅] [NP [N Nadia]]].**", "Forgetting the ∅ is the most common point loss on Week 6 trees.", ref="dp"),
  MC("t-value", "Fill T", "*The cat chased the mouse.* What goes in T?", ["PAST", "chased", "the cat", "nothing"], 0,
     ["Yes: no auxiliary, past tense, so T = PAST.", "The verb stays in V; only its tense shows up in T.", "That's the subject DP.", "Every TP has a T; it's never empty."],
     "**PAST.** *chased* stays in V.", "TP → DP T VP needs a T in every sentence.", ref="tp"),
]
finish(g)
