"""LING 112 · Chapter 0 rebuilt from zero: What syntax studies, and how to read a gloss."""
import sys, json
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from h15common import *  # noqa

from _paths import SNAPSHOTS
ORIG = json.load(open(SNAPSHOTS / "orig-ling112-0.json"))


def reuse(bid, **over):
    for s in ORIG["sections"]:
        for b in s["blocks"]:
            if b["id"] == bid:
                b = clean(dict(b)); b.pop("id")
                b.update(over)
                return b
    raise KeyError(bid)


A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"


def soft(col, a):
    return col[:-1] + f" / {a})"


def piece(x, y, text, col, label, title, fs=17):
    w = max(len(text) * fs * 0.6 + 22, len(label) * 6.4 + 14)
    return (f"<g><title>{title}</title><rect x='{x:.0f}' y='{y}' width='{w:.0f}' height='38' rx='8' fill='{soft(col, 0.12)}' stroke='{col}' stroke-width='1.5'/>"
            f"<text x='{x + w / 2:.0f}' y='{y + 25}' text-anchor='middle' font-size='{fs}' font-weight='600'>{text}</text>"
            f"<text x='{x + w / 2:.0f}' y='{y + 56}' text-anchor='middle' font-size='10.5' font-weight='700' fill='{col}'>{label}</text></g>"), w


# ── Figure: words are built from morphemes ──────────────────────────────────
def fig_morph():
    out = [f"<g {FONT}>"]
    rows = [
        ("English", [("un", Y, "prefix", "'un-' is a prefix: an affix glued to the FRONT. It means 'not'."),
                     ("happi", A, "root", "The root carries the main meaning: happy."),
                     ("ness", G, "suffix", "'-ness' is a suffix: an affix glued to the END. It turns an adjective into a noun.")], "'unhappiness' = 3 morphemes"),
        ("Arabic", [("al", Y, "prefix: 'the'", "'al-' means 'the'. It is glued to the front of the noun."),
                    ("bint", A, "root: girl", "The root: bint, 'girl'."),
                    ("u", G, "suffix: subject", "'-u' marks the noun as the SUBJECT (nominative case).")], "'al-bintu' = 'the girl' (as subject)"),
    ]
    y = 30
    for lang, parts, note in rows:
        out.append(f"<text x='20' y='{y + 25}' font-size='13' font-weight='700'>{lang}</text>")
        x = 110
        for i, (t, col, lab, tt) in enumerate(parts):
            c, w = piece(x, y, t, col, lab, tt)
            out.append(c)
            x += w
            if i < len(parts) - 1:
                out.append(f"<text x='{x + 9:.0f}' y='{y + 26}' text-anchor='middle' font-size='20' font-weight='700' opacity='0.6'>-</text>")
                x += 18
        out.append(f"<text x='{x + 22:.0f}' y='{y + 25}' font-size='12.5' opacity='0.75'>{note}</text>")
        y += 96
    out.append(f"<text x='330' y='{y - 4}' text-anchor='middle' font-size='12' opacity='0.75'>A hyphen in a gloss marks exactly these seams between morphemes.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 222"


# ── Figure: subject, verb, object in three languages ───────────────────────
def fig_roles():
    out = [f"<g {FONT}>"]
    col = {"S": A, "V": Y, "O": G}
    name = {"S": "subject (doer)", "V": "verb (action)", "O": "object (receiver)"}
    rows = [
        ("English · SVO", [("S", "Naomi"), ("V", "read"), ("O", "the letter")]),
        ("Japanese · SOV", [("S", "Naomi-ga"), ("O", "tegami-o"), ("V", "yon-da")]),
        ("Arabic (MSA) · VSO", [("V", "qaraʔa"), ("S", "l-waladu"), ("O", "l-kitāba")]),
    ]
    out.append(f"<text x='20' y='24' font-size='12' opacity='0.8'>Same three jobs, different order:</text>")
    lx = 250
    for k in ("S", "V", "O"):
        out.append(f"<rect x='{lx}' y='12' width='12' height='12' rx='3' fill='{col[k]}'/><text x='{lx + 17}' y='23' font-size='11.5'>{name[k]}</text>")
        lx += 136
    y = 46
    for lab, parts in rows:
        out.append(f"<text x='20' y='{y + 25}' font-size='13' font-weight='700'>{lab}</text>")
        x = 190
        for role, word in parts:
            w = max(len(word) * 9.4 + 30, 92)
            out.append(f"<g><title>{name[role].capitalize()}: '{word}'.</title><rect x='{x:.0f}' y='{y}' width='{w:.0f}' height='40' rx='9' fill='{soft(col[role], 0.13)}' stroke='{col[role]}' stroke-width='1.5'/>"
                       f"<text x='{x + 10:.0f}' y='{y + 16}' font-size='10' font-weight='800' fill='{col[role]}'>{role}</text>"
                       f"<text x='{x + w / 2 + 6:.0f}' y='{y + 27}' text-anchor='middle' font-size='15'>{word}</text></g>")
            x += w + 10
        y += 58
    out.append(f"<text x='330' y='{y + 10}' text-anchor='middle' font-size='12' opacity='0.75'>All three mean 'Naomi / the boy read the letter / book'. Only the ORDER of S, V, O changes.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 238"


# ── Figure: how common each word order is (WALS numbers from the handout) ──
def fig_wals():
    data = [("SOV", 41, A, "Japanese, Korean, Hindi"), ("SVO", 35, G, "English, French, Mandarin"), ("none", 14, "currentColor", "no single dominant order"),
            ("VSO", 7, Y, "Tagalog, MSA Arabic, Irish"), ("VOS", 2, R, "Malagasy"), ("OVS/OSV", 1, R, "very rare")]
    out = [f"<g {FONT}>"]
    y = 18
    for lab, pct, col, ex in data:
        w = pct * 8
        out.append(f"<g><title>{lab}: about {pct}% of the world's languages ({ex}).</title>"
                   f"<text x='96' y='{y + 17}' text-anchor='end' font-size='13' font-weight='700'>{lab}</text>"
                   f"<rect x='106' y='{y + 2}' width='{max(w, 4)}' height='22' rx='5' fill='{col}' fill-opacity='0.75'/>"
                   f"<text x='{112 + max(w, 4)}' y='{y + 17}' font-size='12.5' font-weight='700'>{pct}%</text>"
                   f"<text x='{156 + max(w, 4)}' y='{y + 17}' font-size='11.5' opacity='0.7'>{ex}</text></g>")
        y += 34
    out.append("</g>")
    return "".join(out), "0 0 660 222"


g = {
 "id": "ling112/0-what-syntax-is",
 "course": "ling112",
 "lessons": "Chapter 0 · Week 1",
 "title": "What syntax studies, and how to read a gloss",
 "summary": "From zero: the handful of words every lecture assumes (morpheme, subject, object, *, #), why linguists say sentences have structure, how the world's languages differ (word order and the other parameters), and how to read and write the three-line gloss used for every non-English example.",
 "estimatedMinutes": 55,
 "sourceNote": "Week 1 handout (Introduction), Tallerman 2011 ch. 1.2 (interlinear glossing), Chomsky 1957 ch. 1 to 2, the Aug 20 lecture. Rebuilt for readers who missed the lecture: every term the handout takes for granted is defined before it is used.",
 "requires": [],
 "sections": [
  {"id": "start", "heading": "Start here: the words every lecture assumes you know", "blocks": [
    P("The Week 1 handout was written for people sitting in the room, so it uses some words without explaining them. Here they are, one at a time. Once these are clear, the rest of the chapter (and the rest of the course) reads much easier.", slide="Why start here"),
    D("Syntax", "The study of how words combine into phrases and sentences, and the rules that decide which combinations are allowed. Not what words mean (that's semantics), not how they sound (phonology): how they **fit together**.", slide="Syntax"),
    D("Morpheme", "The smallest piece of a word that has its own meaning or job. *Unhappiness* has three: *un-* (not) + *happi* (happy) + *-ness* (turns it into a noun). A word can be one morpheme (*dog*) or many."),
    D("Root and affix", "The **root** carries the main meaning (*happy*, *bint* 'girl'). An **affix** is a piece glued onto a root that can't stand alone. A **prefix** goes in front (*un-*, Arabic *al-* 'the'); a **suffix** goes at the end (*-ness*, *-ed*, Arabic *-u*)."),
    F(fig_morph(), "Words split into morphemes. The blue piece is the root; the others are affixes. In a gloss you'll draw a hyphen at every seam. Hover each piece.", slide="Morphemes, drawn"),
    D("Subject, verb, object", "The three main jobs in a basic sentence. The **verb** is the action or state (*read*). The **subject** is usually the doer (*Naomi*). The **object** is usually what the action happens to (*the letter*). In *Naomi read the letter*: S = Naomi, V = read, O = the letter.", slide="Subject, verb, object"),
    F(fig_roles(), "The same three jobs in three languages. English puts them S V O, Japanese S O V, Arabic V S O. Linguists compare languages by writing these three letters. Hover each box.", slide="S, V and O across languages"),
    D("Grammatical vs ungrammatical", "A sentence is **grammatical** if it follows the rules native speakers carry in their heads, and **ungrammatical** if it breaks one. This is not about school rules (*don't end a sentence with a preposition*); it's about what real speakers accept."),
    D("The star * and the hash #", "`*` in front of a sentence means **ungrammatical**: `*Cat the sat.` `#` means **grammatical but weird in meaning**: `#The rock ate lunch.` Dr. Nie uses both on every handout, so read them as labels, not typos."),
    P("**Rare is not the same as wrong.** The handout's point: sentences you almost never hear can still be grammatical, and most rules are **unconscious** (you follow them without being able to say them). A sentence gets `*` only when it breaks a rule, never just because it sounds unusual.", slide="Rare is not wrong"),
    TRAP("Ungrammatical is not the same as nonsense. *Colorless green ideas sleep furiously* (Chomsky) makes no sense, but every rule is followed, so it's grammatical. *I want that you leave* makes perfect sense, but English doesn't allow it, so it gets a `*`.", "Week 1 handout", slide="Trap: sense vs rules"),
    C("Split *replayed* into morphemes and name each one.", "*re-* (prefix, 'again') + *play* (root) + *-ed* (suffix, past tense). Three morphemes."),
    C("In *The dog chased the cat*, which is the subject and which is the object?", "Subject: *the dog* (the doer). Object: *the cat* (what the chasing happens to). Verb: *chased*."),
  ]},
  {"id": "why", "heading": "Why linguists say sentences have structure", "blocks": [
    P("**The obvious view** is that a sentence is just words in a row. Order clearly matters: *the cat sat on the mat* is fine, `*mat the on sat cat the` is garbage. But syntax makes a bigger claim: the words are **grouped into units**, and the units sit inside bigger units, like boxes in boxes. That grouping is what linguists call **structure**.", slide="Order isn't the whole story"),
    P("**Evidence 1: one word order, two meanings.** *I saw the man with the telescope.* Did I use the telescope, or did the man have it? The words are in exactly the same order either way. If a sentence were only a row of words, one row could only mean one thing. So the two meanings must come from two **groupings**."),
    P("**Evidence 2: words that belong together can be far apart.** Dr. Nie's handout example: *Sherlock will ask Watson to destroy the evidence* is fine. Drop the object and it breaks: `*Will Sherlock ask Watson to destroy?` But *What will Sherlock ask Watson to destroy?* is fine again, even though nothing comes after *destroy*. The object is still there: it's *what*, moved to the front, eight words away. Something links *what* to the empty spot after *destroy*. That link runs through the structure, not the row."),
    reuse("why.b7d21f4e", slide="The Sherlock sentence: filler and gap"),
    ST("Why a 'row of words' grammar fails on Sherlock", [
      lines(["Sherlock will ask Watson to destroy the evidence.  ✓"], 0, "Normal sentence. 'destroy' has its object: 'the evidence'."),
      lines(["Sherlock will ask Watson to destroy the evidence.  ✓", "*Will Sherlock ask Watson to destroy?  ✗"], 1, "Take the object away: broken. 'destroy' needs an object."),
      lines(["Sherlock will ask Watson to destroy the evidence.  ✓", "*Will Sherlock ask Watson to destroy?  ✗", "What will Sherlock ask Watson to destroy?  ✓"], 2, "Same ending, still no word after 'destroy', but now it's fine. Why?"),
      lines(["What will Sherlock ask Watson to destroy ___ ?", "   ^ filler                                  ^ gap"], 0, "Because 'what' IS the object. It was pronounced at the front and left a gap. The grammar connects filler and gap across the whole sentence: that connection needs structure."),
    ]),
    P("**Evidence 3: you know rules nobody taught you.** No teacher ever told you that `*Will Sherlock ask Watson to destroy?` is wrong, yet you knew instantly. Syntax is the project of writing down the rules you already follow without noticing."),
    D("Structure", "The way the words of a sentence are grouped into units, and those units into bigger units. It's invisible in the written row of words, but speakers compute it every time they understand a sentence."),
    WORLD("**Where you'll meet this** Every grammar checker and voice assistant builds a tree over your sentence, not a list. 'Call me an ambulance' is a joke because two structures fit one string. Headline writers fight 'crash blossoms' like *Squad helps dog bite victim*, where readers build the wrong grouping."),
    C("Give the two meanings of *Visiting relatives can be boring* and say what that proves.", "(1) Relatives who visit you can be boring. (2) Going to visit relatives can be boring. Same words, same order, two meanings: so meaning depends on grouping (structure), not just order."),
  ]},
  {"id": "universals", "heading": "Five properties every human language has", "blocks": [
    P("Every language, from English to Arabic to sign languages, shares five properties: **categories**, **constituents**, **sentence types**, **hierarchy**, and **recursion**. They have their own chapter, **Which universal is this?**, with pictures, trees and practice for each. Read that one next. Here is the one-line version so you know the names.", slide="The five, in one line each"),
    CARDS([
      ("Categories", "Week 2", ["Words come in kinds: noun, verb, adjective…", "Found by which slot a word fits."], "brand"),
      ("Constituents", "Weeks 4 to 5", ["Words group into units that act as one piece.", "'in the hat' is one; 'hat sat' is not."], "green"),
      ("Sentence types", "Week 1", ["Statement, question, command.", "Every language can ask and order."], "amber"),
      ("Hierarchy + recursion", "Week 6", ["Units sit inside units; grouping decides meaning.", "A unit can hold another of the same kind, forever."], "red"),
    ], "The five universals. Hierarchy and recursion share a card here; the next chapter separates them.", slide="The five universals"),
  ]},
  {"id": "variation", "heading": "How languages differ: the parameters", "blocks": [
    D("Parameter", "A yes/no or either/or choice that languages make differently, like a setting on a switch. All languages share the universals; they differ in their parameter settings. Example: does the verb come before or after its object?", slide="What a parameter is"),
    P("**The biggest parameter: basic word order.** Take the three jobs from the start of the chapter (S, V, O). Every language has a most common, neutral order for them, called its **dominant word order**. English is SVO (*Naomi read the letter*), Japanese is SOV (*Naomi-ga tegami-o yon-da*, 'Naomi letter read'), Tagalog is VSO (*B⟨in⟩asa ni Naomi ang liham*, 'read Naomi the-letter'; the *⟨in⟩* is an **infix**, an affix placed inside the root, here marking a completed action)."),
    F(fig_wals(), "How common each dominant order is across the world's languages (WALS numbers from the Week 1 handout). SOV and SVO together cover three quarters of languages. Hover each bar.", slide="Word order around the world"),
    P("**Four more parameters on the handout.** Each one is a single choice. Read the definition, then the example.", slide="The other parameters"),
    T(["Parameter", "What it means", "Setting A", "Setting B"], [
      ["Adjective and noun", "Does the describing word go before or after the noun?", "Adj-N: English *big red ball*", "N-Adj: Vietnamese *quả bóng đỏ lớn* (ball red big), Arabic *kitāb kabīr* (book big)"],
      ["Adposition", "An **adposition** is a little word like *in*, *on*, *to*. Before the noun = **preposition**, after = **postposition**.", "Preposition: English *in the room*", "Postposition: Korean *bang-eseo* (room-in)"],
      ["Subject pronouns", "Must the subject be said out loud, or can it be dropped because the verb ending already tells you?", "Overt: English needs *he* in *He speaks*", "Null subject: Spanish *Habla español* = '(he/she) speaks Spanish'"],
      ["Wh-questions", "A **wh-word** is who, what, where, when, why, how. Does it move to the front of the question, or stay where the answer would go?", "Wh-movement: Syrian Arabic *šw khals-et ħaneen?* 'what finished Haneen?' (the object *šw* 'what' moves to the front; English does the same)", "Wh-in-situ ('in place'): Mandarin *tāmen zài wán shénme yóuxì?* 'they are playing what game?'; Hindi/Urdu *sita-ne kıs=ko dekh-a th-a?* 'Sita who-ACC seen had?'"],
    ], title="The parameters, defined", slide="The parameter table"),
    TRAP("**Your Arabic fills every row.** MSA: neutral order **VSO** (*qaraʔa l-walad-u l-kitāb-a*, 'read the-boy the-book'), SVO common in speech. **N-Adj**: *kitāb kabīr* (book big). **Prepositions**: *fī l-bayt* (in the-house). **Null subject**: *yatakallam* alone means 'he speaks'. **Wh-movement**: *māḏā qaraʔa l-walad?* 'what read the-boy?'. That's a ready-made oral-exam example set from a language you speak.", "Exam", slide="Your Arabic on the table"),
    WORLD("**Where you'll meet this** Parameters are why machine translation is more than swapping words: English to Japanese means flipping the order inside almost every phrase. They also break app interfaces: a template that glues 'You' + verb falls apart in null-subject languages."),
    C("Korean *hakkyo-e* means 'to school' (literally 'school-to'). Which parameter, and which setting?", "Adposition: Korean uses a **postposition** (the 'to' word comes after the noun)."),
    C("Spanish *Llueve* means 'It rains', with no word for 'it'. Which parameter?", "Subject pronouns: Spanish is a **null-subject** language; the verb ending does the work."),
  ]},
  {"id": "gloss", "heading": "Reading and writing an interlinear gloss", "blocks": [
    D("Interlinear gloss", "The standard **three-line** format for showing a sentence from another language. **Line 1**: the sentence, with hyphens between morphemes. **Line 2**: the meaning of each morpheme, lined up underneath it. **Line 3**: a normal translation in quotes. 'Interlinear' just means 'between the lines'.", slide="What a gloss is"),
    P("**Why it exists** If Dr. Nie shows you a Japanese sentence, you can't tell which word is the subject. The gloss lets anyone read the **structure** of any language without speaking it. Every non-English example in this course is written this way, and your homework answers in Arabic must be too.", why=True, slide="Why linguists gloss"),
    ST("Building a gloss, one line at a time", [
      lines(["Naomi-ga tegami-o yon-da."], 0, "Line 1: the Japanese sentence, with a hyphen at each seam between morphemes. -ga, -o and -da are suffixes."),
      lines(["Naomi-ga    tegami-o    yon-da.", "Naomi-NOM   letter-ACC  read-PAST"], 1, "Line 2: one meaning per morpheme, lined up underneath. Word meanings in lowercase (letter, read); grammar labels in CAPITALS (NOM, ACC, PAST)."),
      lines(["Naomi-ga    tegami-o    yon-da.", "Naomi-NOM   letter-ACC  read-PAST", "'Naomi read the letter.'"], 2, "Line 3: a natural translation, in quotes."),
      lines(["Naomi-ga    tegami-o    yon-da.", "Naomi-NOM   letter-ACC  read-PAST", "'Naomi read the letter.'", "check: 3 words = 3 words · each hyphen above has one below"], 3, "Last step: check alignment. Same number of words on lines 1 and 2, and the same number of hyphens inside each word."),
    ]),
    D("Case", "A marker on a noun (usually a suffix) that tells you its **job** in the sentence: subject, object, and so on. English only shows it on pronouns (*he* vs *him*). Japanese and Arabic mark it on nouns (*-ga*/*-o*, *-u*/*-a*), which is why their word order can move around without changing who did what."),
    T(["Label", "Stands for", "Plain meaning"], [
      ["NOM", "nominative case", "marks the subject (the doer)"],
      ["ACC", "accusative case", "marks the object (the receiver)"],
      ["DAT / GEN", "dative / genitive", "'to someone' / 'of someone'"],
      ["PAST, PRES", "past, present tense", "when it happened"],
      ["1, 2, 3 + SG, PL", "person + number", "1SG = I, 2SG = you, 3PL = they"],
      ["M, F", "masculine, feminine", "grammatical gender"],
      ["DEF, INDEF", "definite, indefinite", "'the' vs 'a'"],
    ], title="The labels you'll see most", slide="Gloss labels"),
    D("Hyphen vs =", "A **hyphen** joins an affix to its root (*tegami-o*). An **equals sign** marks a **clitic**: a short word that leans on its neighbor in pronunciation but is still its own word, like English *'m* in *I'm*, written *I=m*."),
    D("Two meanings in one piece", "If one morpheme carries two or more meanings at once, join the glosses with a period: French *a lu* is glossed *read.3.PAST*. The period means 'these are fused, you can't split them'."),
    E("'The girl read the book' in MSA", "qaraʔat al-bintu al-kitāba. Build the three lines.\n\n1. Split into morphemes: qaraʔ-at (read + 3rd person feminine past), al-bint-u (the + girl + subject case), al-kitāb-a (the + book + object case).\n2. Line 1: qaraʔ-at   al-bint-u   al-kitāb-a\n3. Line 2: read-3SG.F.PAST   DEF-girl-NOM   DEF-book-ACC  (the verb ending carries three meanings, joined with periods)\n4. Line 3: 'The girl read the book.'\n5. Check: three words and three glosses; every hyphen above has one below. The order is V S O: the VSO parameter, in your own data.", slide="Glossing an Arabic sentence, step by step"),
    TRAP("**Dialect words are fine; consistency is what she grades.** Mixing MSA with a dialect word (like *dablah* for table) is allowed. What loses points is a line 2 that doesn't match line 1: a case suffix glossed on a word that doesn't have one, or a morpheme left out. Gloss exactly what's there.", "Exam", slide="Trap: match line 1"),
    C("Gloss the Japanese sentence *Hanako-ga Taro-o tatai-ta* ('Hanako hit Taro').", "Line 1: Hanako-ga  Taro-o  tatai-ta. Line 2: Hanako-NOM  Taro-ACC  hit-PAST. Line 3: 'Hanako hit Taro.' Note: *Taro-o Hanako-ga tatai-ta* means the same thing, because the case suffixes (not the order) say who hit whom."),
    C("Gloss Spanish *Está lloviendo* ('It's raining').", "Line 1: Está  lloviendo. Line 2: be.PRES.3SG  raining. Line 3: 'It's raining.' There is no 'it' in line 1, so none in line 2: Spanish is null-subject."),
  ]},
  {"id": "how-class-works", "heading": "How this class works (so the packet makes sense)", "blocks": [
    b for b in [clean({k: v for k, v in bb.items() if k != "id"}) for bb in next(s for s in ORIG["sections"] if s["id"] == "how-class-works")["blocks"]]
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Syntax", "How words combine into phrases and sentences, and the rules for it."],
      ["Morpheme", "The smallest piece of a word with its own meaning or job (un-, happy, -ness)."],
      ["Root / affix", "The main-meaning piece / a piece glued on (prefix in front, suffix at the end)."],
      ["Subject, verb, object", "The doer, the action, the receiver: S, V, O."],
      ["* and #", "* = ungrammatical (breaks a rule). # = grammatical but odd in meaning."],
      ["Structure", "How words group into units inside bigger units."],
      ["Filler and gap", "A word pronounced in one place (what) that fills an empty spot somewhere else."],
      ["Parameter", "An either/or choice languages make differently (word order, pre/postpositions…)."],
      ["Adposition", "A word like in/on/to: preposition if before the noun, postposition if after."],
      ["Null subject", "A language can drop the subject pronoun (Spanish, Arabic)."],
      ["Wh-movement / in-situ", "The question word moves to the front / stays in place."],
      ["Interlinear gloss", "Three lines: sentence with hyphens, meaning of each piece, translation."],
      ["Case", "A marker on a noun telling its job (NOM = subject, ACC = object)."],
      ["Clitic", "A small word that leans on its neighbor; written with = (I=m)."],
    ]),
  ]},
 ],
 "exercises": [clean(e) for e in ORIG["exercises"]] + [
  MC("star-hash", "* or #?", "Which label does *The chair laughed at my joke* get?", ["# (grammatical but odd meaning)", "* (ungrammatical)", "No label: it's fine", "Both * and #"], 0,
     ["Yes. Every rule is followed; chairs just don't laugh.", "Nothing breaks a rule here: subject, verb, and phrase are all in order.", "It's grammatical, but the meaning is strange, so it gets #.", "A sentence is either rule-breaking (*) or just odd (#), not both here."],
     "**#.** The grammar is perfect; only the meaning is odd.", "Mixing up * and # is the most common Week 1 slip, and it changes what a handout example is testing.", ref="start"),
  MC("svo-arabic", "Name the order", "*Kataba l-waladu risālatan* ('The boy wrote a letter'): *kataba* = wrote, *l-waladu* = the boy, *risālatan* = a letter. What is the order?", ["VSO", "SVO", "SOV", "VOS"], 0,
     ["Yes: verb (wrote), subject (the boy), object (a letter).", "SVO would start with the boy.", "SOV would end with the verb.", "VOS would put the letter before the boy."],
     "**VSO.** Wrote (V), the boy (S), a letter (O).", "Word order is the first parameter Dr. Nie asks about for any language example.", ref="variation"),
  MC("postposition", "Which setting?", "Japanese *Tōkyō-ni* means 'to Tokyo' (literally 'Tokyo-to'). Which parameter setting is that?", ["Postposition", "Preposition", "Null subject", "Wh-in-situ"], 0,
     ["Yes: the 'to' word comes after the noun.", "A preposition would come before: 'to Tokyo'.", "Null subject is about dropping the subject, not about 'to'.", "Wh-in-situ is about question words."],
     "**Postposition.**", "Adposition order tends to line up with verb-object order: SOV languages like Japanese usually have postpositions.", ref="variation"),
  MC("morph-count", "Count the morphemes", "How many morphemes are in *unbreakable*?", ["3", "1", "2", "4"], 0,
     ["Yes: un- + break + -able.", "It's more than one word-piece: 'un' and 'able' each add meaning.", "Count again: un-, break, -able.", "There are only three meaningful pieces."],
     "**3:** *un-* (not) + *break* (root) + *-able* (can be done).", "Glossing starts with splitting morphemes; a wrong split makes every line after it wrong.", ref="start"),
 ],
}

for e in g["exercises"]:
    if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
build(g)
