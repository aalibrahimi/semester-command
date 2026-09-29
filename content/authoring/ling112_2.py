"""LING 112 · Chapter 2 rebuilt from zero: Syntactic categories by distribution."""
from l112common import *  # noqa

O = Orig(2)


# ── Figure: a word's two ID cards (endings + neighbors) ─────────────────────
def fig_idcards():
    out = [f"<g {FONT}>"]
    cards = [
        (20, "walk as a VERB", A, "I walked quickly around the park.",
         [("endings it takes", "walk-s · walk-ed · walk-ing"), ("neighbors", "after a subject: I walk · after will: will walk"), ("negation", "don't walk")],
         "As a verb, 'walk' takes verb endings (-ed, -ing) and follows a subject or 'will'."),
        (340, "walk as a NOUN", G, "I took three quick walks.",
         [("endings it takes", "walk-s (plural) · walk's (possessive)"), ("neighbors", "after the / a / three · after quick"), ("negation", "no walks")],
         "As a noun, 'walk' takes plural -s and follows a determiner (three) and an adjective (quick)."),
    ]
    for x, title, col, ex, rows, t in cards:
        out.append(f"<g><title>{t}</title><rect x='{x}' y='12' width='300' height='214' rx='14' fill='{soft(col, 0.06)}' stroke='{col}' stroke-width='1.5'/>"
                   f"<text x='{x + 16}' y='40' font-size='16' font-weight='800' fill='{col}'>{title}</text>"
                   f"<text x='{x + 16}' y='62' font-size='12' font-style='italic' opacity='0.85'>{ex}</text>")
        y = 92
        for lab, val in rows:
            out.append(f"<text x='{x + 16}' y='{y}' font-size='10' font-weight='700' opacity='0.6'>{lab.upper()}</text>"
                       f"<text x='{x + 16}' y='{y + 18}' font-size='12.5'>{val}</text>")
            y += 44
        out.append("</g>")
    out.append(f"<text x='330' y='246' text-anchor='middle' font-size='12' opacity='0.75'>Same word, same meaning, two categories. The endings and the neighbors decide, not the meaning.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 258"


# ── Figure: valency, 1 / 2 / 3 participants ────────────────────────────────
def fig_valency():
    out = [f"<g {FONT}>"]
    rows = [("Intransitive · 1", ["Ming"], "sneezed", [], "One participant: only the sneezer."),
            ("Transitive · 2", ["Sarah"], "helped", ["Ming"], "Two participants: a helper and someone helped."),
            ("Ditransitive · 3", ["Taro"], "gave", ["the child", "a book"], "Three participants: a giver, a receiver, and a thing given.")]
    y = 20
    for lab, subj, verb, objs, t in rows:
        out.append(f"<g><title>{t}</title><text x='20' y='{y + 25}' font-size='13' font-weight='700'>{lab}</text>")
        x = 190
        for w in subj:
            wd = len(w) * 9 + 26
            out.append(f"<rect x='{x}' y='{y}' width='{wd}' height='38' rx='19' fill='{soft(A, 0.13)}' stroke='{A}' stroke-width='1.4'/><text x='{x + wd / 2}' y='{y + 24}' text-anchor='middle' font-size='14'>{w}</text>")
            x += wd + 12
        wd = len(verb) * 9 + 26
        out.append(f"<rect x='{x}' y='{y}' width='{wd}' height='38' rx='8' fill='{soft(Y, 0.18)}' stroke='{Y}' stroke-width='1.6'/><text x='{x + wd / 2}' y='{y + 24}' text-anchor='middle' font-size='14' font-weight='700'>{verb}</text>")
        x += wd + 12
        for w in objs:
            wd2 = len(w) * 9 + 26
            out.append(f"<rect x='{x}' y='{y}' width='{wd2}' height='38' rx='19' fill='{soft(G, 0.13)}' stroke='{G}' stroke-width='1.4'/><text x='{x + wd2 / 2}' y='{y + 24}' text-anchor='middle' font-size='14'>{w}</text>")
            x += wd2 + 12
        out.append("</g>")
        y += 62
    out.append(f"<text x='330' y='{y + 6}' text-anchor='middle' font-size='12' opacity='0.75'>Amber = the verb. Round bubbles = the participants it needs. Count the bubbles.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 222"


# ── The alligator sentence, one word per frame ──────────────────────────────
ALLI = [
    ("That", "D", "on the closed list of determiners (the, a, this, that…); it comes before the adjectives and noun"),
    ("extremely", "Adv", "ends in -ly; can't go between a determiner and a noun ('*the extremely alligator')"),
    ("leathery", "Adj", "fits between D and N ('that leathery alligator') and takes 'very'"),
    ("alligator", "N", "follows D + Adj; takes plural -s ('alligators')"),
    ("greatly", "Adv", "ends in -ly and describes the verb 'hopes'"),
    ("hopes", "V", "has the -s ending for 'he/she/it'; follows the subject; negates as 'does not hope'"),
    ("to", "T", "'to' right before a plain verb is the infinitive marker T, not a preposition"),
    ("be", "Aux", "a helper verb: be, have, do are auxiliaries"),
    ("eating", "V", "-ing ending; comes after the auxiliary 'be'"),
    ("us", "N", "a pronoun, and on Dr. Nie's list pronouns count as nouns"),
    ("for", "P", "a preposition: closed class, followed by a noun phrase"),
    ("dinner", "N", "follows the preposition; plural 'dinners' works"),
    ("tonight", "Adv", "a time word that describes when; can't sit between D and N"),
]


def alli_frames():
    fr = [lines(["That extremely leathery alligator greatly hopes to be eating us for dinner tonight."], 0,
                "Handout sentence (3). Label each word and give a reason, left to right. Watch the list grow.")]
    done = []
    for w, c, why in ALLI:
        done.append(f"{w:<10} → {c}")
        fr.append(lines(["That extremely leathery alligator greatly hopes to be eating us for dinner tonight."] + done, len(done), f"**{w} = {c}.** Test: {why}."))
    return fr


g = {
 "id": "ling112/2-categories",
 "course": "ling112",
 "lessons": "Week 2",
 "title": "Syntactic categories by distribution",
 "summary": "From zero: what a category is, the eleven categories on Dr. Nie's list with what each one does, the two kinds of test (endings and neighbors) that prove a label, and how to label every word of a sentence with a reason, the way HW 1 and the oral exam ask.",
 "estimatedMinutes": 60,
 "sourceNote": "Week 2 handout (Syntactic categories), the diagnostic quiz, Carnie videos 2.1 to 2.2 (Parts of Speech), HW 1. Rebuilt for readers who missed class: each term is defined before it is used.",
 "requires": ["ling112/0-what-syntax-is", "ling112/1-universals"],
 "sections": [
  {"id": "why", "heading": "Start here: what a category is, and why meaning can't find it", "blocks": [
    D("Syntactic category", "A group of words that **behave the same way**: they take the same endings and show up in the same spots in a sentence. Noun, verb, adjective and so on. You may know them as 'parts of speech'.", slide="Definition"),
    P("**One example.** In *I walked around the park*, *walked* is a verb. In *I took three walks around the park*, *walks* is a noun. It's the same event, the same meaning. What changed is the **endings** (-ed vs plural -s) and the **neighbors** (after *I* vs after *three*). That's the whole idea of this chapter.", slide="One word, two categories"),
    F(fig_idcards(), "Every word carries two 'ID cards': the endings it can take and the neighbors it can have. Same word 'walk', two sets of cards, two categories. Hover each card.", slide="The two ID cards"),
    D("Distribution", "Where a word can show up. Dr. Nie splits it in two. **Morphological distribution**: which endings (affixes) it can take. **Syntactic distribution**: which words it can sit next to. A category is decided by distribution, never by meaning."),
    TRAP("School says 'a noun is a person, place or thing'. It fails right away: *destruction* is an action, *happiness* is a feeling, and both are nouns (*the destruction*, *two happinesses*). On a test, 'it's a noun because it's a thing' earns nothing. 'It's a noun because it follows *the* and takes plural *-s*' earns full credit.", "Week 2 handout", slide="Trap: never argue from meaning"),
    D("Two kinds of ending", "**Derivational** endings make a new word, often of a new category: *-tion* makes nouns (*isolat-ion*), *-ize* makes verbs (*real-ize*), *-able* makes adjectives (*read-able*). **Inflectional** endings just adjust a word and keep its category: plural *-s* on nouns, *-ed* / *-ing* on verbs, *-er* / *-est* on adjectives.", slide="Derivational vs inflectional"),
    CMP(("Derivational", "makes a new word", "brand"), ("Inflectional", "adjusts the same word", "amber"), [
      ("Changes category?", "often: happy (Adj) → happi-ness (N)", "never: dog (N) → dog-s (N)"),
      ("Examples", "-tion, -ment, -ness, -ize, -ify, -able, -ful, -ly", "-s, -ed, -ing, -en, -er, -est, 's"),
      ("As a test", "-ness at the end → it's a noun", "takes -est → it's an adjective"),
    ], "Both kinds of ending are evidence. If a word can take a noun ending, that's a reason to call it a noun.", slide="The two kinds of ending"),
    C("*Quickly*: which ending does it have, is it derivational or inflectional, and what category does it make?", "*-ly*, derivational (it turns the adjective *quick* into a new word), and it makes an **adverb**."),
    WORLD("**Where you'll meet this** Part-of-speech tagging, this exact labeling job done by a program, is step one of almost every language app. A voice assistant hearing 'Book me a flight' has to decide *book* is a verb before it can do anything. Taggers fail exactly where the tests in this chapter disagree."),
  ]},
  {"id": "list", "heading": "The eleven categories, one at a time", "blocks": [
    P("Dr. Nie's list has eleven categories. Here is each one with what it **does** in plain words, a few examples from the handout, and one quick test. Don't memorize the examples; learn the job and the test.", slide="Her eleven categories"),
    T(["Category", "Label", "What it does", "Examples", "Quick test"], [
      ["Noun", "N", "names a thing, person, idea, event", "granola, party, joy, Jake, they, him, who", "fits after *the*; takes plural *-s*"],
      ["Verb", "V", "the action or state", "run, arrive, know, think, spray", "fits after *will*; takes *-ed* / *-ing*"],
      ["Adjective", "Adj", "describes a noun", "big, yellow, stable, fake", "fits in *the ___ dog*; takes *very*"],
      ["Adverb", "Adv", "describes a verb, adjective, or the whole sentence", "badly, often, very, tomorrow", "*-ly* often; can't fit *the ___ dog*"],
      ["Preposition", "P", "a little relation word before a noun phrase", "on, of, by, into, with, to", "followed by a noun phrase: *on the table*"],
      ["Determiner", "D", "comes first in a noun phrase: which one, how many, whose", "the, a, this, every, two, his, which", "fits in *___ dog barked*"],
      ["Complementizer", "C", "introduces a whole clause inside a sentence", "that, if, whether", "*I think ___ it rained*"],
      ["Auxiliary", "Aux", "a helper verb", "have, be, do", "*She ___ eaten / eating*; moves in questions"],
      ["Modal", "Mod", "a helper that adds 'possible / necessary'", "will, would, can, may, should", "*They ___ leave*; never takes *-s*"],
      ["Tense", "T", "the infinitive marker", "to (only before a plain verb)", "*to eat*, never *to Paris*"],
      ["Negation", "Neg", "makes it negative", "not", "*will not go*"],
    ], title="The eleven categories", slide="The full list"),
    D("Lexical vs functional", "**Lexical** categories (N, V, Adj, Adv) carry content, and new words join them all the time (*rage-bait*, *to google*), so they're called **open class**. **Functional** categories (P, D, C, Aux, Mod, T, Neg) carry grammar, and you basically can't invent new ones, so they're **closed class**.", slide="Open vs closed"),
    CMP(("Lexical (open class)", "N · V · Adj · Adv", "brand"), ("Functional (closed class)", "P · D · C · Aux · Mod · T · Neg", "amber"), [
      ("Job", "carry meaning", "carry grammar"),
      ("New words?", "yes, every year", "almost never"),
      ("How you prove the label", "run a test (endings, frames)", "find it on her list"),
    ], "The practical difference: test the lexical words, look up the functional ones.", slide="Lexical vs functional"),
    TRAP("**Three words that fool everyone.** Pronouns (*they*, *him*) and question words used as nouns (*who*, *what*) are **N** on her list. Possessives (*his*, *our*) and numbers (*two*) are **D**. And *to* before a plain verb is **T**, not P: *to eat* is T, *to Paris* is P.", "Week 2 handout", slide="Trap: pronouns, possessives, to"),
    C("*Their* in *their new roof*: which category, and is it open or closed?", "**D** (determiner): possessives are determiners on her list. Closed class."),
    C("*To* in *I want to leave* vs *I went to Rome*?", "*to leave*: **T** (before a plain verb). *to Rome*: **P** (before a noun phrase)."),
  ]},
  {"id": "tests", "heading": "The tests that prove a label", "blocks": [
    D("Test frame", "A sentence with one blank. Every word that fits the blank naturally belongs to the same category. *The ___ slept* finds nouns. *They will ___* finds verbs. *the ___ dog* finds adjectives.", slide="What a frame is"),
    dict(O.block("tests.1c7244bc", slide="The test table: this is what you cite"), rows=[[c.replace("Deriv:", "Derivational:").replace("Infl:", "Inflectional:") for c in r] for r in O.block("tests.1c7244bc")["rows"]], columns=["Category", "Endings it takes", "Where it sits"]),
    P("**How to read that table.** Pick the row for the category you think it is. Show one ending from the middle column **or** one position from the right column. That's your proof. Two proofs is better than one."),
    O.block("tests.8e4b7c1d", slide="The D ___ N frame"),
    TRAP("*Very* does NOT separate adjectives from adverbs: *very quick* and *very quickly* both work. Use the **D ___ N** frame instead: *the quick run* ✓, '*the quickly run' ✗. Adjectives fit between a determiner and a noun; adverbs never do.", "Quiz", slide="Trap: 'very' can't decide"),
    ST("Labeling handout sentence (3), one word at a time", alli_frames()),
    C("Prove that *fast* in *a fast car* is an adjective, not an adverb.", "It fits the D ___ N frame (*a fast car*) and takes *-er* (*a faster car*). An adverb can't sit between *a* and *car*."),
    C("Prove *arrival* is a noun with an ending test and a neighbor test.", "Ending: *-al* here is a noun-making ending, and it takes plural *-s* (*arrivals*). Neighbor: it fits after *the* (*the arrival was late*)."),
  ]},
  {"id": "props", "heading": "Grammatical properties: what categories carry in any language", "blocks": [
    P("The tests above are for English. The second half of the handout lists **properties** categories tend to carry in every language, so you can spot a verb in Zulu or a noun in Japanese on the homework. Two groups: what **verbs** carry, and what **nouns** carry.", slide="Why this section exists"),
    D("Argument structure (valency)", "How many participants a verb **needs**. Intransitive = 1 (*Ming sneezed*), transitive = 2 (*Sarah helped Ming*), ditransitive = 3 (*Taro gave the child a book*).", slide="Valency"),
    F(fig_valency(), "Valency, counted. The amber box is the verb; the bubbles are the participants it can't do without. Hover each row.", slide="Count the participants"),
    CARDS([
      ("Tense", "verbs", ["When it happened: past, present, future.", "*helped* vs *helps*"], "brand"),
      ("Aspect", "verbs", ["Ongoing or finished.", "*is helping* (ongoing) vs *has helped* (finished)"], "brand"),
      ("Agreement", "verbs", ["The verb copies a feature of a noun.", "*she helps*: the -s agrees with *she*"], "brand"),
      ("Modality", "verbs", ["Possible, necessary, should.", "*should*, *must*, *might*"], "brand"),
    ], "Properties verbs carry. Zulu shows agreement dramatically: *aba-ntu ba-bona um-fana*, 'the people see the boy', where *ba-* on the verb agrees with 'people'.", slide="What verbs carry"),
    CARDS([
      ("Definiteness", "nouns", ["Which one: known or new.", "*a car* vs *that car* vs *Sarah's car*"], "green"),
      ("Number", "nouns", ["How many.", "singular, plural; Hebrew even has a dual: *yomáyim* 'two days'"], "green"),
      ("Gender / noun class", "nouns", ["A grammatical group, not always about sex.", "Italian *il libro* (M), *la casa* (F)"], "green"),
      ("Case", "nouns", ["The noun's job, marked on the noun.", "Japanese *-ga* subject, *-o* object; English only *he* / *him*"], "green"),
    ], "Properties nouns carry. Because Japanese marks case, *Hanako-ga Taro-o* and *Taro-o Hanako-ga* mean the same thing: Hanako hit Taro.", slide="What nouns carry"),
    P("**Adjectives and adverbs have properties too.** Adjectives can be **attributive** (*a fast car*, before the noun) or **predicative** (*the car is fast*, after *be*); they can **agree** (French *vin blanc* / *porte blanche*); they have **comparative / superlative** forms (*heavier* / *heaviest*). Adverbs come in types: manner (*slowly*), frequency (*often*), time (*yesterday*), degree (*very*), modal (*possibly*).", slide="Adjectives and adverbs"),
    O.block("props.c4709b48", slide="Your Arabic, five properties at once"),
    C("*Sarah gave Ming a book.* How many participants, and what's that called?", "Three (Sarah, Ming, a book): **ditransitive**."),
  ]},
  {"id": "practice", "heading": "Practice: the diagnostic quiz and handout (23) to (24)", "blocks": [
    O.block("practice.7c3e9b5d", slide="Which category? Run the frames in order"),
    O.block("practice.25787a76", slide="Diagnostic quiz Q1"),
    E("Handout (4): She did not say whether those computers in her office are currently working.", "Label every word, with a reason for the tricky ones.\n\n1. She N (a pronoun: pronouns are N on her list)\n2. did Aux (the helper 'do'; it carries the past tense)\n3. not Neg\n4. say V (follows the auxiliary; plain form after 'did')\n5. whether C (introduces a whole clause: 'whether those computers… are working')\n6. those D (fits '___ dog barked'; comes first in the noun phrase)\n7. computers N (follows D; plural -s)\n8. in P (followed by the noun phrase 'her office')\n9. her D (a possessive: possessives are D)\n10. office N (follows D)\n11. are Aux (helper 'be' before the -ing verb)\n12. currently Adv (-ly; '*the currently computers' fails the D ___ N frame)\n13. working V (-ing ending, follows the auxiliary 'are')", slide="Handout (4), every word labeled"),
    O.block("practice.c809a986"),
    O.block("practice.67a36bf1"),
    O.block("practice.7457ae73"),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Syntactic category", "A group of words that take the same endings and fit the same spots."],
      ["Distribution", "Where a word can appear: its endings (morphological) and neighbors (syntactic)."],
      ["Derivational ending", "Makes a new word, often a new category (-ness, -ize, -able)."],
      ["Inflectional ending", "Adjusts a word, same category (-s, -ed, -ing, -er)."],
      ["Test frame", "A sentence with a blank; whatever fits shares a category."],
      ["Lexical / open class", "N, V, Adj, Adv: content words, new ones added all the time."],
      ["Functional / closed class", "P, D, C, Aux, Mod, T, Neg: grammar words, a fixed list."],
      ["Determiner", "the, a, this, every, his, two: starts a noun phrase."],
      ["Complementizer", "that, if, whether: introduces a clause inside a sentence."],
      ["Valency", "How many participants a verb needs (1, 2 or 3)."],
      ["Tense / aspect", "When it happened / whether it's ongoing or finished."],
      ["Agreement", "A verb (or adjective) copying a feature of a noun."],
      ["Attributive / predicative", "Adjective before a noun (a fast car) / after be (the car is fast)."],
    ]),
  ]},
 ],
 "exercises": O.exercises() + [
  MC("which-frame", "Which frame decides it?", "You need to prove *careful* is an adjective and not an adverb. Which frame settles it?", ["the ___ driver", "very ___", "She drove ___ .", "___ -ly"], 0,
     ["Yes: only adjectives fit between a determiner and a noun.", "Both adjectives and adverbs take 'very', so it can't decide.", "That frame finds adverbs; 'careful' fails it, which is a hint but not the positive proof.", "Adding -ly makes a different word (carefully)."],
     "**the ___ driver.** *The careful driver* works; an adverb would not fit.", "Picking the one frame that separates the two candidates is exactly what the quiz grades.", ref="tests"),
  MC("to-T", "What is 'to' here?", "*She decided to stay.* What category is *to*?", ["T (infinitive marker)", "P (preposition)", "C (complementizer)", "Adv"], 0,
     ["Yes: 'to' before a plain verb is T.", "A preposition 'to' comes before a noun phrase (to Rome).", "C is that, if, whether.", "It isn't describing anything."],
     "**T.** It sits right before the plain verb *stay*.", "One of the three traps on her list.", ref="list"),
  MC("his-D", "What is 'his'?", "*His old car broke down.* What category is *his*?", ["D (determiner)", "N (pronoun)", "Adj", "P"], 0,
     ["Yes: possessives are determiners on her list.", "Pronouns like 'him' are N, but possessive 'his' fills the D slot (compare 'the old car').", "It doesn't take 'very' or fit between D and N.", "It isn't followed by a noun phrase as a relation word."],
     "**D.** Swap it for *the*: *The old car broke down.* Same slot.", "Swapping with 'the' is a fast way to prove D.", ref="list"),
  MC("valency-3", "Count the participants", "*The waiter handed me the bill.* What is the verb's valency?", ["Ditransitive (3)", "Transitive (2)", "Intransitive (1)", "Four"], 0,
     ["Yes: the waiter, me, the bill.", "There's a third participant: the one who receives the bill.", "More than one participant is needed.", "Only three participants are involved."],
     "**Ditransitive.** Giver (the waiter), receiver (me), thing (the bill).", "Valency comes back in Week 8 as theta roles.", ref="props"),
  MC("deriv-infl", "Which kind of ending?", "*teach* → *teacher*. What kind of ending is *-er* here?", ["Derivational: it makes a new noun", "Inflectional: it's the comparative -er", "Inflectional: plural", "Not an ending"], 0,
     ["Yes: a verb became a noun, so it's derivational.", "Comparative -er goes on adjectives (tall-er); teach isn't an adjective.", "Plural is -s.", "It is a suffix: teach + -er."],
     "**Derivational.** It turns the verb *teach* into the noun *teacher*.", "Same-looking endings can be different morphemes; the category of the root tells you which.", ref="why"),
 ],
}

finish(g)
