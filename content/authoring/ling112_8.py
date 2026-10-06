"""LING 112 · Week 8: arguments and adjuncts, theta roles, theta grids, the
Theta Criterion, the Projection Principle and the EPP. Built from Dr. Nie's
Week 8 handout ('Arguments and adjuncts'), with Ali's Oral Exam 1 topic
(the Projection Principle, Thu Oct 15) worked all the way through: the
prepared explanation and ten practice sentences with X-bar trees."""
from l112common import *  # noqa

P1 = "′"


# ── X-bar bracket helpers (same conventions as the Week 7 chapter) ─────────

def XP(cat, head, comp=None, spec=None, adj=()):
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


def PRO(p):
    return XP("D", p)


def PP(p, obj):
    return XP("P", p, comp=obj)


def ADJ(a, **kw):
    return XP("Adj", a, **kw)


def ADV(a, **kw):
    return XP("Adv", a, **kw)


def S(subj, t, vp):
    return XP("T", t, spec=subj, comp=vp)


# ── the practice sentences ────────────────────────────────────────────────
# Each: sentence, verb, theta grid rows (var, category, role, filler), the
# adjuncts left over, the tree, and the one-line Projection Principle story.

PRACTICE = [
    {
        "s": "Carly placed the briefcase on the table.",
        "v": "place",
        "grid": [("x", "DP", "Agent", "Carly"), ("y", "DP", "Theme", "the briefcase"), ("z", "PP", "Location", "on the table")],
        "adj": [],
        "tree": S(NAME("Carly"), "PAST", XP("V", "placed", comp=DP("the", "briefcase") + " " + PP("on", DP("the", "table")))),
        "pp": "place needs three things, so all three must be in the tree: Carly in Spec,TP (the external argument), the briefcase and on the table as complements, sisters of V. Drop the PP and place is left unfulfilled: *Carly placed the briefcase.",
    },
    {
        "s": "The boss disliked the strong smell.",
        "v": "dislike",
        "grid": [("x", "DP", "Experiencer", "the boss"), ("y", "DP", "Theme", "the strong smell")],
        "adj": [],
        "tree": S(DP("the", "boss"), "PAST", XP("V", "disliked", comp=DP("the", NP("smell", adj=[("L", ADJ("strong"))])))),
        "pp": "dislike has two requirements: an Experiencer (the boss, subject) and a Theme (the strong smell, complement). 'strong' is not in dislike's grid at all: it's an adjunct inside the NP, sister of N′.",
    },
    {
        "s": "Horror movies scare Lisa.",
        "v": "scare",
        "grid": [("x", "DP", "Theme", "horror movies"), ("y", "DP", "Experiencer", "Lisa")],
        "adj": [],
        "tree": S(DP("∅", NP("movies", adj=[("L", ADJ("horror"))])), "PRES", XP("V", "scare", comp=NAME("Lisa"))),
        "pp": "scare's requirements are a Theme and an Experiencer, in that order: the exception to the theta hierarchy (Experiencer usually comes first). The Projection Principle doesn't care about the order of roles, only that both are filled, once each.",
    },
    {
        "s": "It snowed yesterday.",
        "v": "snow",
        "grid": [],
        "adj": ["yesterday"],
        "tree": S(PRO("it"), "PAST", XP("V", "snowed", adj=[("R", ADV("yesterday"))])),
        "pp": "snow has NO requirements (a zero-argument predicate), so the Projection Principle asks for nothing. But English still demands a subject: that's the EPP. 'It' is an expletive: it fills Spec,TP but gets no theta role. 'yesterday' is an adjunct (sister of V′).",
    },
    {
        "s": "Michelle handed Lee a red pen.",
        "v": "hand",
        "grid": [("x", "DP", "Agent", "Michelle"), ("y", "DP", "Recipient", "Lee"), ("z", "DP", "Theme", "a red pen")],
        "adj": [],
        "tree": S(NAME("Michelle"), "PAST", XP("V", "handed", comp=NAME("Lee") + " " + DP("a", NP("pen", adj=[("L", ADJ("red"))])))),
        "pp": "hand takes DP DP complements here (like give): Recipient first, then Theme. All three requirements fulfilled: Michelle (subject), Lee and a red pen (both complements of V).",
    },
    {
        "s": "The tired students laughed loudly in the hallway.",
        "v": "laugh",
        "grid": [("x", "DP", "Agent", "the tired students")],
        "adj": ["loudly", "in the hallway"],
        "tree": S(DP("the", NP("students", adj=[("L", ADJ("tired"))])), "PAST", XP("V", "laughed", adj=[("R", ADV("loudly")), ("R", PP("in", DP("the", "hallway")))])),
        "pp": "laugh has one requirement, filled by the subject. Everything after the verb is NOT in its grid, so loudly and in the hallway are adjuncts: each gets its own V′ (V′ → V′ AdvP, then V′ → V′ PP), and the lowest V′ has the verb alone.",
    },
    {
        "s": "My roommate will put the keys in the drawer before dinner.",
        "v": "put",
        "grid": [("x", "DP", "Agent", "my roommate"), ("y", "DP", "Theme", "the keys"), ("z", "PP", "Location", "in the drawer")],
        "adj": ["before dinner"],
        "tree": S(DP("my", "roommate"), "will", XP("V", "put", comp=DP("the", "keys") + " " + PP("in", DP("the", "drawer")), adj=[("R", PP("before", NAME("dinner")))])),
        "pp": "Two PPs, two different jobs. in the drawer is put's Location requirement (a complement, sister of V). before dinner is not in put's grid (an adjunct, sister of V′). 'will' is in T.",
    },
    {
        "s": "Rosa sent a letter to her grandmother on Tuesday.",
        "v": "send",
        "grid": [("x", "DP", "Agent", "Rosa"), ("y", "DP", "Theme", "a letter"), ("z", "PP", "Recipient", "to her grandmother")],
        "adj": ["on Tuesday"],
        "tree": S(NAME("Rosa"), "PAST", XP("V", "sent", comp=DP("a", "letter") + " " + PP("to", DP("her", "grandmother")), adj=[("R", PP("on", NAME("Tuesday")))])),
        "pp": "send's Recipient can be a PP (to her grandmother), like give. on Tuesday is time, not in send's grid: adjunct. The test: 'Rosa sent a letter to her grandmother' is complete; 'Rosa sent a letter on Tuesday' still needs the recipient understood.",
    },
    {
        "s": "She quickly crossed the street.",
        "v": "cross",
        "grid": [("x", "DP", "Agent", "she"), ("y", "DP", "Location", "the street")],
        "adj": ["quickly"],
        "tree": S(PRO("she"), "PAST", XP("V", "crossed", comp=DP("the", "street"), adj=[("L", ADV("quickly"))])),
        "pp": "cross's Location is a DP here (the street), straight from the handout's (5a): a Location doesn't have to be a PP. quickly is an adjunct on the left: V′ → AdvP V′.",
    },
    {
        "s": "The chef's assistant ate the cake.",
        "v": "eat",
        "grid": [("x", "DP", "Agent", "the chef's assistant"), ("y", "DP", "Theme", "the cake")],
        "adj": [],
        "tree": S(XP("D", "'s", spec=DP("the", "chef"), comp=NP("assistant")), "PAST", XP("V", "ate", comp=DP("the", "cake"))),
        "pp": "Heads other than verbs have requirements too: the possessive 's needs a possessor (the chef, its specifier) and a possessed noun (assistant, its complement). eat's two requirements: the whole DP the chef's assistant (Agent) and the cake (Theme).",
    },
]


def grid_table(p):
    if not p["grid"]:
        return "No arguments: a zero-argument predicate."
    head = " · ".join(f"{v}: {c} {r}" for v, c, r, _ in p["grid"])
    fill = " · ".join(f"{v} = {f}" for v, _, _, f in p["grid"])
    return f"{head}\n{fill}"


def practice_block(i, p):
    return {"type": "sim", "sim": "tree", "caption": f"({i + 1}) {p['s']}  Theta grid of **{p['v']}**: " + ("none (zero arguments)" if not p["grid"] else "; ".join(f"{c} {r} = *{f}*" for _, c, r, f in p["grid"])) + (f". Adjuncts: {', '.join('*' + a + '*' for a in p['adj'])}." if p["adj"] else ". No adjuncts.") + " " + p["pp"], "params": {"bracket": p["tree"]}}


SCRIPT = """**Definition.** The Projection Principle says that every head must have all of its requirements fulfilled. A verb, for example, comes with requirements on its arguments: how many it takes, what syntactic category each one is, and what theta role each one plays. We write those requirements as a theta grid, and the Projection Principle says the sentence has to fulfill every one of them.

**Example.** Take place, as in 'Carly placed the briefcase on the table.' Its theta grid has three slots: a DP Agent, a DP Theme and a PP Location. Carly, the briefcase and on the table fill them. If I drop one, 'Carly placed the briefcase', the sentence is bad because place's Location requirement isn't fulfilled. The category matters too: 'I placed the table a book' is bad because place wants DP PP, not DP DP. And the role matters: 'I placed a book on George' is odd because the PP has to be an inanimate Location.

**What it solves.** It explains why some phrases are obligatory and others aren't. Anything in the head's grid is an argument and has to be there: in the tree, the internal arguments are complements, sisters of V, and the external argument is the subject in Spec,TP. Anything that isn't in the grid, like 'yesterday' or 'in the morning', is an adjunct: it's optional, I can stack as many as I want, and it attaches to V′. So the Projection Principle tells me where each phrase goes before I draw anything.

**What it raises.** Some verbs have no requirements at all, like snow. The Projection Principle asks for nothing there, but English still says 'It snowed', with a subject that means nothing. So we also need the Extended Projection Principle: every clause must have a subject. The expletive 'it' fills the subject position without getting a theta role, which also keeps the Theta Criterion happy."""

STEPS = [
    ("Find the heads with requirements", "Underline every verb (and any other head that selects, like possessive 's). Say what kind of verb it is: zero, one, two or three arguments."),
    ("Write the theta grid", "For the main verb: x, y, z with category and theta role (DP Agent, DP Theme, PP Location…). Say it out loud: 'place needs a DP Agent, a DP Theme and a PP Location.'"),
    ("Match arguments to slots", "Point to the phrase that fills each slot. Use the Theta Criterion: one role per argument, one argument per role. If there's no subject role (snow, rain, seem), the subject is an expletive (EPP)."),
    ("Everything left over is an adjunct", "Any phrase not in a grid (time, manner, place words the verb doesn't need) is an adjunct. Prove it: it can be dropped, and you could stack another."),
    ("Place them in the tree", "TP → DP T′ (subject in Spec,TP), T′ → T VP (T = PAST, PRES or an auxiliary like will). Complements: sisters of V under the lowest V′. Adjuncts: one new V′ each (V′ → V′ AdvP/PP, or AdvP V′ on the left)."),
    ("Draw, then check", "Every phrase has all three levels (XP, X′, X); every nominal is a DP. Then check: is every requirement in the grid filled exactly once? That's the Projection Principle, verified on your own tree."),
]

g = {
 "id": "ling112/8-arguments-projection",
 "course": "ling112",
 "lessons": "Week 8",
 "title": "Arguments, theta roles and the Projection Principle (Oral Exam 1)",
 "summary": "What makes a phrase an argument or an adjunct; the three kinds of requirement a verb has (how many arguments, what category, what theta role); theta roles and theta grids; the Theta Criterion; the Projection Principle ('every head must have all of its requirements fulfilled') and the EPP; then the whole oral exam on the Projection Principle: the 2 to 3 minute explanation and ten practice sentences with X-bar trees.",
 "estimatedMinutes": 75,
 "sourceNote": "Week 8 handout 'Arguments and adjuncts' (Dr. Nie): the definitions of argument, valency, selectional restrictions, the five theta roles and their examples, theta grids for place, dislike and scare, the Theta Criterion (7), the theta role hierarchy (8), the Projection Principle (1), expletives and the EPP (9) to (10), and the adjective and adverbial hierarchies. Oral exam format from the course's oral exam sign-up page. Trees follow the Week 6 phrase structure rules and the Week 7 X-bar handout (TP → DP T′, T′ → T VP, every nominal a DP, all three bar levels on every phrase).",
 "requires": ["ling112/4-heads-dependents", "ling112/6-phrase-structure", "ling112/7-x-bar"],
 "sections": [
  {"id": "map", "heading": "Start here: verbs come with requirements", "blocks": [
    P("**The idea of this week.** A verb isn't just a word; it comes with a list of **requirements**. *Laugh* needs one participant, *eat* two, *put* three, *snow* none. The sentence has to supply exactly what the verb asks for. This week names those requirements (theta roles, theta grids) and the principle that enforces them: the **Projection Principle**.", slide="The idea"),
    ROAD("Week 8, in order", [
      ("Arguments", "obligatory participants, 0 to 3", "valency", "brand"),
      ("Three requirements", "number, category, theta role", "selection", "brand"),
      ("Theta roles and grids", "Agent, Theme, Recipient, Location, Experiencer", "writing them down", "green"),
      ("Theta Criterion", "one role per argument, one argument per role", "the matching rule", "green"),
      ("Projection Principle + EPP", "every requirement fulfilled; every clause has a subject", "your oral topic", "amber"),
      ("Adjuncts", "everything else; their own hierarchies", "the leftovers", "red"),
    ], "The handout's parts, in order.", eyebrow="Week 8 agenda"),
    WHY("**Why it matters** This is your Oral Exam 1 topic (Thursday Oct 15, 12:00, CL 491). It's also the reason the trees from Weeks 6 and 7 look the way they do: the verb's requirements decide which phrases are complements and which are adjuncts."),
  ]},
  {"id": "arguments", "heading": "Arguments and the three kinds of requirement", "blocks": [
    D("Argument", "An **obligatory participant** of the verb. Each verb has requirements on the number and type of arguments it takes (its **selectional restrictions**)."),
    D("Adjunct", "An **optional** phrase the verb doesn't ask for: time, manner, extra location. You can drop it, and you can stack as many as you like."),
    T(["Valency (number of arguments)", "Verbs from the handout"], [
      ["0", "rain, snow, seem, be likely"],
      ["1", "laugh, smile, sleep, arrive, fall, drift, rise"],
      ["2", "hit, build, defeat, praise, eat, create, like, watch"],
      ["3", "give, hand, put, set, place"],
    ], title="Number: English verbs allow 0 to 3 arguments"),
    T(["Requirement", "What it restricts", "Handout example (✓ fine, # odd or bad)"], [
      ["**Number** (valency)", "how many arguments", "*place* needs 3: # Carly placed the briefcase"],
      ["**Category**", "DP, PP, …", "*give* allows DP PP and DP DP: I gave [a book] [to George] ✓ · I gave [George] [a book] ✓. *place* allows only DP PP: # I placed [the table] [a book]"],
      ["**Theta role**", "the meaning/role of each argument", "*give*'s PP must be an animate Recipient: # I gave a book to George's lap. *place*'s PP must be an inanimate Location: # I placed a book on George"],
    ], title="The three requirements a verb has"),
    D("Subcategory", "Verbs that share the same requirements form a **subtype** (subcategory): *give* and *hand* (DP DP or DP PP), *place* and *put* (DP PP Location only)."),
    C("Is 'in the kitchen' an argument or an adjunct in (a) 'Sam put the bowl in the kitchen' and (b) 'Sam ate in the kitchen'?", "(a) **Argument**: *put* requires a Location (# Sam put the bowl). (b) **Adjunct**: *eat* doesn't need a place (Sam ate is fine)."),
  ]},
  {"id": "theta", "heading": "Theta roles: who does what to whom", "blocks": [
    P("**Grammatical relations vs theta roles.** 'Subject' and 'object' describe a phrase's role in the **sentence**, so they change when the sentence changes. **Theta roles** describe its role relative to the **verb**, so they stay the same."),
    T(["", "Active: She punched them.", "Passive: They were punched by her."], [
      ["she / her", "**subject**, Agent", "non-subject, **still Agent**"],
      ["them / they", "non-subject, Theme", "**subject**, **still Theme**"],
    ], title="Same roles, different grammatical relations"),
    T(["Theta role", "Definition (handout)", "Handout examples"], [
      ["**Agent**", "the initiator or doer of an action", "*Rosa* danced all night · The cats were chased *by Zeno*"],
      ["**Theme** (Patient)", "the entity that undergoes an action, is perceived or is experienced", "Victor threw *the ball* · *The building* collapsed onto the ground"],
      ["**Recipient**", "the entity that receives a theme; with verbs of transfer of possession", "Michelle handed *Lee* a red pen · *Carlos* was gifted an office plant"],
      ["**Location**", "the place where an action or state occurs", "She quickly crossed *the street* · José slid the bag *under the table*"],
      ["**Experiencer**", "the entity that perceives an event or state", "*Anna* noticed the train · The rabid dog scared *my poor cats*"],
    ], title="The five major theta roles"),
    TRAP("Reading the role off the position. In 'The building collapsed', the subject is a **Theme** (it undergoes the collapse; nobody did it). In 'The rabid dog scared my poor cats', the Experiencer is the **object**. Ask what the phrase **does in the event**, not where it sits.", "Week 8 handout"),
    C("Give the theta roles in 'Anna noticed the train'.", "*Anna* = **Experiencer** (she perceives), *the train* = **Theme** (what's perceived)."),
  ]},
  {"id": "grids", "heading": "Theta grids and the Theta Criterion", "blocks": [
    D("Theta grid (subcategorization frame)", "A verb's requirements written down: the **number**, **category** and **theta role** of each argument, as slots x, y, z. Arguments can be DPs or PPs."),
    E("Handout theta grids", "place  (Carly placed the briefcase on the table)\n  x: DP Agent      y: DP Theme          z: PP Location\n     Carly           the briefcase         on the table\n\ndislike  (The boss disliked the strong smell)\n  x: DP Experiencer   y: DP Theme\n     the boss            the strong smell\n\nscare  (Horror movies scare Lisa)\n  x: DP Theme      y: DP Experiencer\n     horror movies    Lisa", answer="x, y, z = category + role"),
    D("Theta Criterion", "**Every theta role is assigned to one and only one argument. Every argument is assigned one and only one theta role.** No empty slots, no double roles, no extra arguments with no role."),
    D("Theta role hierarchy", "Roles usually line up in this order: **Agent, Experiencer > Theme, Recipient > Location**. The higher role tends to be the subject. Exception: *scare* (Theme > Experiencer)."),
    T(["Sentence", "What goes wrong"], [
      ["# Carly placed the briefcase.", "the Location role has no argument (role left unassigned)"],
      ["# Carly placed the briefcase on the table the book.", "*the book* gets no role (argument with no role)"],
      ["# The boss disliked.", "the Theme role has no argument"],
    ], title="Theta Criterion violations"),
    C("Write the theta grid for *throw* in 'Victor threw the ball'.", "x: DP **Agent** (Victor), y: DP **Theme** (the ball)."),
  ]},
  {"id": "projection", "heading": "The Projection Principle (your oral topic)", "blocks": [
    D("Projection Principle", "**Every head must have all of its requirements fulfilled.** (Dr. Nie's handout (1).) A head's requirements are its number of arguments, their categories and their theta roles: its theta grid. The sentence, and so the tree, must contain a phrase for every one of them."),
    P("**Why it's called 'projection'.** The requirements live in the head (in its lexical entry), and they **project** up into the structure: the head's grid decides what has to appear around it in the tree. The tree is the head's requirements made visible."),
    T(["What the head requires", "Where it goes in the X-bar tree", "Example"], [
      ["internal argument (object, PP Location, Recipient)", "**complement**: sister of V, daughter of the lowest V′", "*placed* [the briefcase] [on the table]"],
      ["external argument (the x slot, usually the highest role)", "**subject**: specifier of TP (TP → DP T′)", "[Carly] placed…"],
      ["nothing (not in the grid)", "**adjunct**: sister of a V′ (one V′ per adjunct)", "…[yesterday], [in the morning]"],
    ], title="The Projection Principle decides where every phrase goes"),
    SIM("tree", "Carly placed the briefcase on the table. All three of *place*'s requirements are in the tree: Carly in Spec,TP, the briefcase and on the table as complements of V. Click the lowest V′: V and both its complements.", {"bracket": PRACTICE[0]["tree"]}),
    T(["Violation", "Which requirement fails"], [
      ["# Carly placed the briefcase.", "**number**: place's z slot is empty"],
      ["# I placed the table a book.", "**category**: place wants DP PP, not DP DP"],
      ["# I placed a book on George.", "**theta role**: place's PP must be an inanimate Location"],
      ["# The students laughed the joke.", "**number**: laugh has one slot; the joke has no role (Theta Criterion too)"],
    ], title="Four ways to break the Projection Principle"),
    TRAP("Putting an argument PP as an adjunct (or the reverse). In 'put the keys in the drawer before dinner', *in the drawer* is put's Location: complement, sister of V. *before dinner* isn't in the grid: adjunct, sister of V′. Two PPs, two different positions, decided by the grid.", "Oral exam practical"),
  ]},
  {"id": "epp", "heading": "Expletives and the EPP", "blocks": [
    P("**The problem the Projection Principle can't solve alone.** Zero-argument predicates (*snow*, *rain*, *seem*) have no requirements, so the Projection Principle asks for nothing. Yet English still needs a subject: 'It snowed yesterday', never just 'Snowed yesterday'."),
    D("Expletive pronoun", "A subject that **doesn't mean or refer to anything**: *it* in 'It snowed yesterday' and 'It seems that horror movies scare Lisa', *there* in 'There appears to be a problem with our oven'. It gets **no theta role**."),
    D("Extended Projection Principle (EPP)", "**Every clause must have a subject.** (Handout (10).) The structural position is the **specifier of TP**."),
    SIM("tree", "Handout task: 'It snowed yesterday' in X-bar. *It* sits in Spec,TP to satisfy the EPP (no theta role, since snow has none to give). *yesterday* is an adjunct: sister of V′.", {"bracket": PRACTICE[3]["tree"]}),
    THINK("**Projection Principle vs EPP in one line each:** the Projection Principle says every head gets **everything it asks for**; the EPP says every clause gets **a subject, even if no head asked for one**. The expletive is how English satisfies the EPP without breaking the Theta Criterion."),
  ]},
  {"id": "adjuncts", "heading": "Adjuncts and their order", "blocks": [
    P("Adjuncts aren't required, but they still come in a preferred order."),
    T(["Opinion", "Size / physical", "Age", "Shape", "Color", "Origin", "Material", "Purpose", "Noun"], [["good", "sturdy", "old", "square", "red", "French", "wooden", "rocking", "chair"]], title="Adjective hierarchy (fairly rigid, possibly universal; subjectivity predicts the order)"),
    T(["Verb", "Manner", "Location", "Frequency", "Time", "Purpose"], [["jog", "lightly", "around the park", "every day", "in the morning", "for exercise"]], title="Adverbial hierarchy (freer; both AdvPs and PPs act as adverbials)"),
    C("Why is 'a wooden old chair' odd?", "Age comes before material in the adjective hierarchy: **an old wooden chair**."),
  ]},
  {"id": "oral", "heading": "Oral Exam 1: the prepared portion", "blocks": [
    T(["Part", "Points", "What it asks", "Notes allowed?"], [
      ["Prepared (2 to 3 min)", "2", "a concise definition or description of the Projection Principle", "yes"],
      ["", "2", "one or more examples; one or more issues it raises or solves", "yes"],
      ["Practical", "2", "explain how the Projection Principle applies to her sentence", "**no**"],
      ["", "2", "demonstrate and explain your approach before drawing", "**no**"],
      ["", "2", "draw the X-bar tree with our English rules", "**no**"],
    ], title="How the 10 points break down (Thu Oct 15, 12:00, CL 491, whiteboard)"),
    P(SCRIPT),
    P("**Timing:** read at a calm pace, this script is about 2.5 minutes. You can bring it as notes, but practice it until you only glance at the bold words. For the examples, **write them on the whiteboard as you talk**: the theta grid for *place* with x, y, z, and the three starred sentences. Writing is what makes it look fluent."),
    E("If she asks you to elaborate", "\"What's a theta grid?\"  → the verb's requirements written down: number, category and theta role of each argument.\n\"How is that different from the Theta Criterion?\"  → the Projection Principle says the requirements must be fulfilled; the Theta Criterion says the matching is one-to-one (one role per argument, one argument per role).\n\"Why do we need the EPP?\"  → snow has no requirements but 'It snowed' still needs a subject: an expletive with no role.\n\"Do only verbs have requirements?\"  → no, every head: possessive 's needs a possessor and a possessed noun; a preposition needs its DP object.", answer="grid, criterion, EPP, other heads"),
  ]},
  {"id": "practical", "heading": "Oral Exam 1: the practical, step by step", "blocks": [
    P("No notes here, so learn these six steps by heart. They also earn the 2 points for 'demonstrate and explain your approach before drawing a tree': **say each step out loud** as you do it."),
    T(["Step", "What to do (and say out loud)"], [[f"{i + 1}. {a}", b] for i, (a, b) in enumerate(STEPS)], title="The six steps (memorize the left column)"),
    P("**A one-line mnemonic for the six steps:** *Verbs, Grid, Match, Leftovers, Place, Check*."),
    *[practice_block(i, p) for i, p in enumerate(PRACTICE)],
    TRAP("Forgetting the bar levels. Dr. Nie's trees have **all three levels on every phrase**, even a lone word: [DP [D′ [D it]]], [AdvP [Adv′ [Adv yesterday]]]. And every nominal is a DP (a name gets an empty D: [DP [D′ [D ∅] [NP Carly]]]).", "Week 7 handout"),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Argument", "An obligatory participant of the verb."],
      ["Adjunct", "An optional phrase the verb doesn't require; stackable."],
      ["Valency", "How many arguments a verb takes (0 to 3 in English)."],
      ["Selectional restrictions", "A verb's requirements on its arguments: number, category, theta role."],
      ["Theta role", "The role an argument plays relative to the verb: Agent, Theme, Recipient, Location, Experiencer."],
      ["Theta grid", "The requirements written as slots: x: DP Agent, y: DP Theme, z: PP Location."],
      ["Theta Criterion", "One role per argument, one argument per role."],
      ["Projection Principle", "Every head must have all of its requirements fulfilled."],
      ["Expletive", "A subject with no meaning and no theta role: it, there."],
      ["EPP", "Every clause must have a subject (in Spec,TP)."],
    ]),
  ]},
 ],
 "exercises": [
  MC("pp-def", "The definition", "Dr. Nie's Projection Principle says…", ["every head must have all of its requirements fulfilled", "every clause must have a subject", "every argument gets exactly one theta role", "every phrase has a head"], 0,
     ["Yes, word for word from the handout.", "That's the EPP.", "That's (half of) the Theta Criterion.", "That's endocentricity (Week 4), true but not this principle."],
     "**Every head must have all of its requirements fulfilled.**", "Say this sentence first in the prepared portion.", ref="projection"),
  MC("pp-break", "What breaks", "'# I placed the table a book' breaks which requirement of *place*?", ["category: place wants DP PP, not DP DP", "number: too few arguments", "theta role: the book isn't a Theme", "the EPP"], 0,
     ["Yes: place takes DP PP only (give takes both).", "It has three phrases, the right number.", "The problem is the shape, DP DP.", "There is a subject."],
     "**Category.**", "The handout's place vs give contrast.", ref="arguments"),
  MC("expl", "Expletives", "In 'It snowed yesterday', what theta role does *it* get?", ["none: it's an expletive", "Agent", "Theme", "Location"], 0,
     ["Yes: snow has no roles to give; it only satisfies the EPP.", "Nothing does the snowing.", "It doesn't undergo anything.", "yesterday is time, and it's an adjunct anyway."],
     "**None.**", "The EPP, not the Projection Principle, puts it there.", ref="epp"),
  MC("comp-adj", "Complement or adjunct?", "In 'My roommate will put the keys in the drawer before dinner', which PP is a complement?", ["in the drawer", "before dinner", "both", "neither"], 0,
     ["Yes: put requires a Location.", "Time isn't in put's grid: adjunct.", "Only one is required: drop 'before dinner' and it's fine; drop 'in the drawer' and it's not.", "put needs its Location."],
     "**in the drawer** (complement, sister of V); before dinner is an adjunct (sister of V′).", "The grid decides the position.", ref="projection"),
  MC("role", "Theta role", "In 'The building collapsed onto the ground', *the building* is the…", ["Theme", "Agent", "Experiencer", "Recipient"], 0,
     ["Yes: it undergoes the collapse.", "Nobody initiated it: not an Agent.", "It doesn't perceive anything.", "Nothing is transferred to it."],
     "**Theme.**", "Subjects aren't always Agents.", ref="theta"),
  FILL("valency", "How many?", "How many arguments does *give* take in 'I gave George a book'?", ["3", "three"],
       ["Count the participants the verb needs.", "Who gives? What is given? Who receives?", "Agent, Theme, Recipient."],
       ["**3**: I (Agent), George (Recipient), a book (Theme)."], "A three-place predicate, like hand, put, place.", ref="arguments"),
 ],
}

finish(g)
