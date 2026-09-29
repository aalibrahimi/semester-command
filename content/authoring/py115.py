import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from gb import *

g = {
    "id": "ling115/p-python-for-corpora",
    "course": "ling115",
    "lessons": "Python for the homework",
    "title": "Python for corpus work: count, sort, search, and show",
    "summary": "Write the code Kraus's homework asks for by yourself: loop over tagged (word, tag) pairs, count with a dictionary or Counter, sort to get a top-10 table, search with re (groups, backreferences, lookahead done right), turn counts into per-1,000 rates and TTR, and show results as a pandas table and a bar chart.",
    "estimatedMinutes": 75,
    "sourceNote": "Built from the Ling 115 Python Refresher, Homework 1 (Gutenberg and Brown regex searches, -eth verbs, reduplication), Homework 2 (Brown top-10 words and tags, adverbs, the three tags of 'so'), and the Lecture 7 Brown corpus explorer (FreqDist, per-1,000 rates, TTR, keyness, bar charts). Sample data here is small and made up so it runs instantly; the code is the same you'd run on NLTK's corpora.",
    "requires": [],
    "sections": [],
    "exercises": [],
}
S = g["sections"]

TAGGED = r'''
# A tiny Brown-style sample: a list of (word, tag) pairs, like brown.tagged_words()
tagged = [
    ("The", "AT"), ("detective", "NN"), ("walked", "VBD"), ("slowly", "RB"), ("back", "RB"),
    ("to", "IN"), ("the", "AT"), ("house", "NN"), (".", "."),
    ("He", "PPS"), ("was", "BEDZ"), ("so", "QL"), ("tired", "JJ"), ("that", "CS"), ("he", "PPS"),
    ("sat", "VBD"), ("down", "RP"), ("again", "RB"), (".", "."),
    ("So", "RB"), ("the", "AT"), ("case", "NN"), ("was", "BEDZ"), ("closed", "VBN"), (",", ","),
    ("and", "CC"), ("he", "PPS"), ("never", "RB"), ("looked", "VBD"), ("back", "RB"), (".", "."),
    ("She", "PPS"), ("left", "VBD"), ("early", "RB"), ("so", "CS"), ("she", "PPS"), ("could", "MD"),
    ("rest", "VB"), (".", "."),
]
'''

TEXT = r'''
# A few lines in the style of the Gutenberg texts
text = """He that loveth his brother abideth in the light. The Lord giveth and the Lord taketh away.
No, no, I will not go. She laughed and said very, very well. His teeth were white as snow.
Queen Elizabeth came on the twentieth day. The wind bloweth where it listeth.
Choo-choo went the little train, and the baby said night night."""
'''

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "shape", "heading": "Every homework notebook has the same shape", "blocks": [
    P("Homework 1 and 2 look long, but every question is the same five steps: **get the words**, **loop** over them, **keep** the ones that match, **count** them, and **show** the top ones as a table. Learn those five and the homework stops being a wall of code.", slide="Five steps, every question"),
    T(["Step", "What it looks like in the homework"], [
        ["Get the words", "`brown.tagged_words(categories='mystery')`, `gutenberg.sents(fileid)`"],
        ["Loop", "`for word, tag in tagged:` / `for sent in ...:`"],
        ["Keep what matches", "`if tag == 'RB':` or `pattern.finditer(sentence_text)`"],
        ["Count", "`counts[word] = counts.get(word, 0) + 1` or `Counter(...)`"],
        ["Show", "`sorted(...)[:10]` and `print(f\"{word:15s} {count}\")`"],
    ], title="The five steps", slide="The five steps"),
    P("NLTK's corpora are big and need downloading, so the boxes here use a tiny made-up sample with the **same shape** (a list of `(word, tag)` pairs, or a string of text). Code that works here works on `brown.tagged_words()` unchanged."),
    PY("Try it: the data",
       "Run it to see what a tagged sample looks like. `tagged` was loaded for you.",
       r'''
print(len(tagged), "tokens")
print(tagged[:5])

word, tag = tagged[1]
print("word:", word, "| tag:", tag)
''',
       setup=TAGGED),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "fstrings", "heading": "Printing a neat table with f-strings", "blocks": [
    D("f-string", "Text with an `f` in front, where anything in `{curly braces}` is replaced by its value: `f\"{word} {count}\"`. Add `:15s` to pad text to 15 characters, `:>5` to right-align a number in 5, `:.2f` for 2 decimals.", slide=True),
    E("The homework's table line", "word = \"loveth\"; count = 12\nprint(f\"{word:15s} {count}\")      ->   loveth          12\nprint(f\"{word:>10} | {count:5d}\")  ->       loveth |    12\nprint(f\"{0.123456:.2f}\")           ->   0.12",
      answer="`:15s` pads text to 15 characters, so the numbers line up in a column."),
    PY("Your turn: one table row",
       "Make `row` the text **`so` padded to 10 characters, then a space, then the count 126**, using an f-string. It should look like `so         126`.",
       r'''
word = "so"
count = 126

row = None   # an f-string

print(row)
''',
       check=r'''
assert row is not None, "Replace `None` with an f-string."
assert row == "so         126", f"Expected 'so' padded to 10 characters, a space, then 126: 'so         126'. Yours is {row!r}."
''',
       solution=r'''
word = "so"
count = 126

row = f"{word:10s} {count}"

print(row)
''',
       hints=["Start with `f\"...\"` and put the variables in `{}`.", "`{word:10s}` pads the word to 10 characters: `f\"{word:10s} {count}\"`."],
       success="Every summary table in Homework 1 and 2 is this line inside a loop."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "loops", "heading": "Looping over (word, tag) pairs", "blocks": [
    D("tuple unpacking", "A pair like `(\"walked\", \"VBD\")` can be split into two names in one go: `word, tag = pair`. In a loop: `for word, tag in tagged:` gives you both parts every round.", slide=True),
    D("list comprehension", "A one-line loop that builds a list: `[w.lower() for w, t in tagged if t == 'RB']` means \"for every pair, if the tag is RB, keep the lowercased word\".", slide=True),
    E("The same thing two ways", "adverbs = []\nfor word, tag in tagged:\n    if tag == \"RB\":\n        adverbs.append(word.lower())\n\nadverbs = [word.lower() for word, tag in tagged if tag == \"RB\"]",
      answer="Both give the same list. The second is the Refresher's \"comprehension\"."),
    PY("Your turn: collect the adverbs",
       "Homework 2 Q6: make `adverbs`, a list of every word tagged **RB**, **lowercased**. (In the real Brown tags, also keep RBR and RBT.)",
       r'''
adverbs = []
# loop over tagged and fill adverbs

print(adverbs)
''',
       setup=TAGGED,
       check=r'''
assert adverbs, "The list is empty. Loop with `for word, tag in tagged:` and append when `tag == 'RB'`."
assert adverbs == ["slowly", "back", "again", "so", "never", "back", "early"], f"Expected 7 adverbs in order: slowly, back, again, so, never, back, early. You have {adverbs}. Did you lowercase them (the sample has a capital 'So')?"
''',
       solution=r'''
adverbs = [word.lower() for word, tag in tagged if tag == "RB"]

print(adverbs)
''',
       hints=["`for word, tag in tagged:` then `if tag == \"RB\":` then `adverbs.append(...)`.", "Lowercase with `word.lower()` so 'So' and 'so' count as the same word."],
       success="Lowercasing is the \"think about capitalization\" hint from Homework 2 Q4: without it, 'So' and 'so' are counted as two different words."),
    PY("Your turn: the tags of 'so'",
       "Homework 2 Q7: make `so_tags`, the list of tags that the word **so** (any capitalization) has in `tagged`.",
       r'''
so_tags = None   # a list of tags

print(so_tags)
''',
       setup=TAGGED,
       check=r'''
assert so_tags is not None, "Replace `None` with a list."
assert sorted(so_tags) == ["CS", "QL", "RB"], f"'so' appears 3 times, tagged QL, RB and CS. You have {so_tags}. Compare `word.lower() == 'so'`."
''',
       solution=r'''
so_tags = [tag for word, tag in tagged if word.lower() == "so"]

print(so_tags)
''',
       hints=["Keep the **tag** this time, when the **word** is 'so'.", "`[tag for word, tag in tagged if word.lower() == \"so\"]`"],
       success="QL (so tired), CS (so she could), RB (So the case...). One spelling, three jobs: that's the lexical ambiguity Homework 2 is about."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "counting", "heading": "Counting: dictionary, .get, and Counter", "blocks": [
    D("dictionary", "A lookup table from keys to values: `counts = {\"the\": 2, \"he\": 3}`. `counts[\"he\"]` gives 3. Perfect for \"how many times did each word appear\".", slide=True),
    P("There are three ways to count with it. All three give the same answer; the last is shortest.", slide="Three ways to count"),
    E("Three ways", "# 1. try / except (Homework 1 style)\ntry:\n    counts[w] += 1\nexcept KeyError:\n    counts[w] = 1\n\n# 2. .get with a default of 0\ncounts[w] = counts.get(w, 0) + 1\n\n# 3. Counter does the whole loop for you\nfrom collections import Counter\ncounts = Counter(words)",
      answer="`counts.get(w, 0)` means \"the count so far, or 0 if this word is new\"."),
    PY("Your turn: count the tags with .get",
       "Make `tag_counts`, a dictionary from each tag to how many times it appears in `tagged`. Use a loop and `.get`.",
       r'''
tag_counts = {}
for word, tag in tagged:
    pass   # replace this line

print(tag_counts)
''',
       setup=TAGGED,
       check=r'''
from collections import Counter
exp = Counter(t for w, t in tagged)
assert tag_counts, "Still empty. Inside the loop: `tag_counts[tag] = tag_counts.get(tag, 0) + 1`."
assert dict(tag_counts) == dict(exp), f"Some counts are off. RB should be 7, VBD 4, PPS 5. You have RB={tag_counts.get('RB')}, VBD={tag_counts.get('VBD')}, PPS={tag_counts.get('PPS')}."
''',
       solution=r'''
tag_counts = {}
for word, tag in tagged:
    tag_counts[tag] = tag_counts.get(tag, 0) + 1

print(tag_counts)
''',
       hints=["The key is the tag, the value is the count so far.", "`tag_counts[tag] = tag_counts.get(tag, 0) + 1`"],
       success="That one line replaces Homework 1's four-line try/except. Same result."),
    PY("Your turn: the same with Counter",
       "Now do it in one line with `Counter`, and store the **3 most common tags** (with their counts) in `top3`.",
       r'''
from collections import Counter

counts = None
top3 = None

print(top3)
''',
       setup=TAGGED,
       check=r'''
from collections import Counter
assert counts is not None and top3 is not None, "Replace both `None`s."
assert list(top3) == Counter(t for w, t in tagged).most_common(3), f"Expected {Counter(t for w, t in tagged).most_common(3)}. You have {top3}. Build the Counter from the tags, then `.most_common(3)`."
''',
       solution=r'''
from collections import Counter

counts = Counter(tag for word, tag in tagged)
top3 = counts.most_common(3)

print(top3)
''',
       hints=["Give Counter just the tags: `Counter(tag for word, tag in tagged)`.", "`counts.most_common(3)` returns a list of (tag, count) pairs, biggest first."],
       success="`most_common(n)` is the `get_top_10` function from Homework 2 in one call. NLTK's `FreqDist` (Lecture 7 notebook) works the same way."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "sorting", "heading": "Sorting to get a top-N list", "blocks": [
    D("sorted(..., key=..., reverse=True)", "Sorts anything. `key` says what to sort by; `key=lambda pair: pair[1]` means \"by the second thing in each pair\" (the count). `reverse=True` puts the biggest first.", slide=True),
    E("Two ways to rank (word, count) pairs", "pairs = [(\"the\", 3), (\"back\", 2), (\"so\", 3)]\n\nsorted(pairs, key=lambda p: p[1], reverse=True)\n  ->  [('the', 3), ('so', 3), ('back', 2)]\n\n# Homework 1's trick: flip to (count, word) and sort that\nsorted([(c, w) for w, c in pairs], reverse=True)\n  ->  [(3, 'the'), (3, 'so'), (2, 'back')]",
      answer="Either works. `key=` keeps the pairs in (word, count) order."),
    PY("Your turn: top 3 words",
       "`word_counts` (a dictionary) was made for you from the sample, with every word lowercased. Make `top3`: the 3 most frequent **(word, count)** pairs, biggest first, using `sorted`. Punctuation counts as a word here.",
       r'''
top3 = None

for word, count in top3:
    print(f"{word:10s} {count}")
''',
       setup=TAGGED + r'''
word_counts = {}
for w, t in tagged:
    word_counts[w.lower()] = word_counts.get(w.lower(), 0) + 1
''',
       check=r'''
assert top3 is not None, "Replace `None` with a sorted slice."
exp = sorted(word_counts.values(), reverse=True)[:3]
assert [c for w, c in top3] == exp, f"The top three counts are {exp}. Yours are {[c for w, c in top3]}. Sort `word_counts.items()` by the count, biggest first, and take `[:3]`."
assert all(word_counts[w] == c for w, c in top3), "Each pair should be (word, its count) from `word_counts`."
assert top3[0][0] == ".", f"The most common 'word' is the period '.' (4 times). You have {top3[0]}."
''',
       solution=r'''
top3 = sorted(word_counts.items(), key=lambda pair: pair[1], reverse=True)[:3]

for word, count in top3:
    print(f"{word:10s} {count}")
''',
       hints=["`word_counts.items()` gives (word, count) pairs.", "`sorted(word_counts.items(), key=lambda pair: pair[1], reverse=True)[:3]`"],
       success="Punctuation and function words top every list: that's Zipf's law, and the reason the Lecture 7 notebook removes stopwords before plotting."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "regex", "heading": "Regex in Python: findall, finditer, compile", "blocks": [
    T(["Code", "What you get"], [
        ["`re.findall(r'...', text)`", "A list of every matching piece of text"],
        ["`for m in re.finditer(r'...', text):`", "Each match as an object: `m.group()` is the text, `m.start()` where it starts"],
        ["`pattern = re.compile(r'...')`", "Save a pattern to reuse; then `pattern.finditer(text)`"],
        ["`re.sub(r'...', 'new', text)`", "Replace every match"],
        ["`flags=re.IGNORECASE`", "Upper and lower case match alike"],
    ], title="The four re functions from the Refresher", slide="The re toolkit"),
    D("\\b (word boundary)", "Matches the **edge of a word** (between a letter and a space or punctuation), without using up a character. `eth\\b` means \"eth at the end of a word\".", slide=True),
    TRAP("Always write patterns as raw strings, `r'...'`. Without the `r`, Python turns `\\b` into a backspace character before re ever sees it, and the pattern silently matches nothing.", "Homework 1", None),
    PY("Your turn: the -eth verbs",
       "Homework 1, Problem 1.1: make `eth_words`, every word in `text` that **ends in eth**, using `re.findall` and `\\b`.",
       r'''
import re

eth_words = None

print(eth_words)
''',
       setup=TEXT,
       check=r'''
import re
assert eth_words is not None, "Replace `None` with `re.findall(...)`."
exp = ["loveth", "abideth", "giveth", "taketh", "teeth", "Elizabeth", "twentieth", "bloweth", "listeth"]
assert list(eth_words) == exp, f"Expected {exp}. You have {eth_words}. Try r'[a-zA-Z]+eth\\b' (letters, then eth, then the end of the word)."
''',
       solution=r'''
import re

eth_words = re.findall(r"[a-zA-Z]+eth\b", text)

print(eth_words)
''',
       hints=["One or more letters is `[a-zA-Z]+`.", "`re.findall(r\"[a-zA-Z]+eth\\b\", text)`"],
       success="It also caught teeth, Elizabeth and twentieth: spelling can't tell a verb from a noun. The next two sections fix that."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "groups", "heading": "Groups and backreferences: finding reduplication", "blocks": [
    D("group ( )", "Parentheses in a pattern capture the part they wrap. `m.group(1)` is the text the first group matched.", slide=True),
    D("backreference \\1", "Means \"the **same text** group 1 matched, again\". `(\\w+) \\1` matches a word followed by the same word: *night night*.", slide=True),
    PY("Your turn: reduplication",
       "Homework 1, Problem 1.2: match a word repeated right after itself, allowing a **space**, a **comma and space**, or a **hyphen** in between (*no, no*, *very, very*, *choo-choo*, *night night*). Store all the full matches in `redups`.",
       r'''
import re

pattern = None   # r"..." with a group and \1
redups = [m.group() for m in re.finditer(pattern, text, flags=re.IGNORECASE)]

print(redups)
''',
       setup=TEXT,
       check=r'''
assert pattern is not None, "Write a pattern string."
assert redups == ["No, no", "very, very", "Choo-choo", "night night"], f"Expected ['No, no', 'very, very', 'Choo-choo', 'night night']. You have {redups}. The part between the two words can be ', ' or ' ' or '-': something like (, |-| )."
''',
       solution=r'''
import re

pattern = r"\b(\w+)(, |-| )\1\b"
redups = [m.group() for m in re.finditer(pattern, text, flags=re.IGNORECASE)]

print(redups)
''',
       hints=["Start with `r\"\\b(\\w+) \\1\\b\"`: word, space, same word.", "Replace the space with a choice: `(, |-| )`. Order matters: try `, ` before ` `."],
       success="`\\1` is the whole trick: a regex can't \"remember\" a word any other way. Note it still misses *the the* when the two copies differ in case unless you add `re.IGNORECASE`, which is why 'No, no' needed it."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "lookahead", "heading": "Lookahead: excluding words, the right way", "blocks": [
    D("negative lookahead (?!...)", "Checks that what comes **next** does **not** match `...`, without using up any text. Put it **before** the part it guards: `\\b(?!teeth\\b)[a-z]+eth\\b` means \"at the start of a word that isn't teeth, match an -eth word\".", slide=True),
    TRAP("`[a-zA-Z]+(?!eth)` doesn't mean \"words not ending in eth\". The `+` grabs as many letters as it can, then the lookahead checks the text **after** the word (a space), which is never \"eth\", so it matches **every** word. The lookahead must sit at the **start** of the word, before the letters it's about.", "Homework 1 Q4", None),
    E("Where the lookahead goes", "WRONG:  [a-zA-Z]+(?!eth)                 matches every word\nRIGHT:  \\b(?!(?:teeth|elizabeth)\\b)[a-zA-Z]+eth\\b\n        ^ start of word, then \"not teeth/elizabeth\", then the -eth word",
      answer="Check at the start of the word, then match it."),
    PY("Your turn: only the verbs",
       "Make `verbs`: the **-eth** words in `text` **except** *teeth*, *Elizabeth*, and ordinal numbers ending in **-ieth** (twentieth, thirtieth). Use one pattern with negative lookahead(s) and `re.IGNORECASE`.",
       r'''
import re

pattern = None   # r"..."
verbs = re.findall(pattern, text, flags=re.IGNORECASE)

print(verbs)
''',
       setup=TEXT,
       check=r'''
import re
assert pattern is not None, "Write a pattern string."
exp = ["loveth", "abideth", "giveth", "taketh", "bloweth", "listeth"]
assert verbs == exp, f"Expected only the verbs {exp}. You have {verbs}. Put `(?!...)` right after `\\b`, before `[a-z]+eth\\b`."
t2 = "The fiftieth man speaketh; Macbeth's teeth."
got = re.findall(pattern, t2, flags=re.IGNORECASE)
assert "fiftieth" not in [w.lower() for w in got], "Your pattern lists the words one by one. Block the whole -ieth family with a lookahead like (?![a-z]*ieth\\b) so fiftieth, thirtieth and so on are all excluded."
''',
       solution=r'''
import re

pattern = r"\b(?!(?:teeth|elizabeth)\b)(?![a-z]*ieth\b)[a-z]+eth\b"
verbs = re.findall(pattern, text, flags=re.IGNORECASE)

print(verbs)
''',
       hints=["Two lookaheads can sit side by side after `\\b`: one for the word list, one for the -ieth pattern.", "`(?!(?:teeth|elizabeth)\\b)` blocks those two words; `(?![a-z]*ieth\\b)` blocks every ordinal."],
       success="Now compare this with Homework 1 Part 2: on the tagged Brown corpus, `[a-z]+eth/VBZ` gets the same verbs with no lookaheads at all. That's the \"tagged vs raw\" point of the whole homework."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "rates", "heading": "From counts to rates: per 1,000 words and TTR", "blocks": [
    D("relative frequency", "A count divided by the corpus size. **Per 1,000 words** = count / total × 1000. It's the only fair way to compare a 14k-word genre with a 182k-word one.", slide=True),
    D("type-token ratio (TTR)", "Number of **different** words (types) ÷ number of **words** (tokens). `len(set(words)) / len(words)`. Only compare TTRs of texts of the same size.", slide=True),
    PY("Your turn: rate and TTR",
       "`words` is a list of lowercase words (no punctuation). Compute `per_1000`, how often **the** appears per 1,000 words, and `ttr`, the type-token ratio.",
       r'''
per_1000 = None
ttr = None

print(round(per_1000, 1), round(ttr, 3))
''',
       setup=TAGGED + r'''
words = [w.lower() for w, t in tagged if w.isalpha()]
''',
       check=r'''
assert per_1000 is not None and ttr is not None, "Replace both `None`s."
n = len(words)
assert abs(per_1000 - words.count("the") / n * 1000) < 1e-6, f"'the' appears {words.count('the')} times in {n} words, so {words.count('the') / n * 1000:.1f} per 1,000. You have {per_1000}."
assert abs(ttr - len(set(words)) / n) < 1e-9, f"TTR = {len(set(words))} types / {n} tokens = {len(set(words)) / n:.3f}. You have {ttr}. Types are `len(set(words))`."
''',
       solution=r'''
per_1000 = words.count("the") / len(words) * 1000
ttr = len(set(words)) / len(words)

print(round(per_1000, 1), round(ttr, 3))
''',
       hints=["`words.count(\"the\")` counts one word; `len(words)` is the total.", "A `set` drops duplicates, so `len(set(words))` is the number of types."],
       success="These two numbers are columns in the Lecture 7 notebook's diversity table (TTR, per-1,000)."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "show", "heading": "Showing results: a pandas table and a bar chart", "blocks": [
    D("DataFrame", "pandas' table: rows and named columns. Build one from a list of dictionaries (one per row): `pd.DataFrame([{\"word\": \"the\", \"count\": 3}, ...])`. Print it with `df.to_string(index=False)`.", slide=True),
    PY("Your turn: a ranked table",
       "Make `df`, a DataFrame with columns **word**, **count**, **per_1000** for the 5 most common words in `words`, sorted from most to least common.",
       r'''
import pandas as pd
from collections import Counter

rows = []
for word, count in Counter(words).most_common(5):
    pass   # add a dictionary to rows

df = None
print(df.to_string(index=False))
''',
       setup=TAGGED + r'''
words = [w.lower() for w, t in tagged if w.isalpha()]
''',
       check=r'''
import pandas as pd
from collections import Counter
assert df is not None, "Make `df = pd.DataFrame(rows)`."
assert list(df.columns) == ["word", "count", "per_1000"], f"The columns should be word, count, per_1000 in that order. You have {list(df.columns)}."
top = Counter(words).most_common(5)
assert list(df["count"]) == [c for w, c in top], f"The counts should be {[c for w, c in top]}. You have {list(df['count'])}."
assert abs(df["per_1000"].iloc[0] - top[0][1] / len(words) * 1000) < 1e-6, "per_1000 should be count / len(words) * 1000."
''',
       solution=r'''
import pandas as pd
from collections import Counter

rows = []
for word, count in Counter(words).most_common(5):
    rows.append({"word": word, "count": count, "per_1000": count / len(words) * 1000})

df = pd.DataFrame(rows)
print(df.to_string(index=False))
''',
       hints=["Each row is a dictionary with the three keys: `{\"word\": word, \"count\": count, \"per_1000\": ...}`.", "`rows.append({...})` inside the loop, then `df = pd.DataFrame(rows)` after it."],
       success="This is exactly how the Lecture 7 notebook's `display_top_words` builds its tables."),
    PY("Your turn: a horizontal bar chart",
       "Plot the 5 most common words as a **horizontal bar chart** (`ax.barh`), **most common at the top**, with the x-axis labeled **count**.",
       r'''
import matplotlib.pyplot as plt
from collections import Counter

top = Counter(words).most_common(5)
labels = [w for w, c in top]
counts = [c for w, c in top]

fig, ax = plt.subplots(figsize=(6, 3))
# bars, flip so the biggest is on top, label the x-axis

plt.show()
''',
       setup=TAGGED + r'''
words = [w.lower() for w, t in tagged if w.isalpha()]
''',
       check=r'''
import _sc
a = _sc.last().axes[0]
assert a.patches, "No bars yet. Use `ax.barh(labels, counts)`."
assert len(a.patches) == 5, f"There should be 5 bars. You have {len(a.patches)}."
assert a.yaxis_inverted(), "The biggest bar is at the bottom. Flip it with `ax.invert_yaxis()`."
assert "count" in a.get_xlabel().lower(), "Label the x-axis 'count'."
''',
       solution=r'''
import matplotlib.pyplot as plt
from collections import Counter

top = Counter(words).most_common(5)
labels = [w for w, c in top]
counts = [c for w, c in top]

fig, ax = plt.subplots(figsize=(6, 3))
ax.barh(labels, counts)
ax.invert_yaxis()
ax.set_xlabel('count')

plt.show()
''',
       hints=["`ax.barh(labels, counts)` draws horizontal bars.", "`barh` puts the first item at the bottom; `ax.invert_yaxis()` flips it."],
       success="Same three calls as the notebook's `plot_top_words`, minus the colors."),
]})

g["exercises"] = [
    MC("py115-get", "What does .get do?", "What is `counts.get(\"zebra\", 0)` if \"zebra\" was never counted?",
       ["0", "An error (KeyError)", "None", "\"zebra\""], 0,
       ["Right: the second argument is the default when the key is missing.", "That's what `counts[\"zebra\"]` would do; `.get` avoids it.", "Only if you leave out the default.", ".get returns the value, not the key."],
       ["`.get(key, default)`.", "The default is 0 here."], "`.get` is how you count without try/except.", ref="counting"),
    FILL("py115-ttr", "TTR by hand", "\"a rose is a rose is a rose\": what is the TTR? (types ÷ tokens, as a decimal)", ["0.375", "3/8"],
         ["Count tokens: every word.", "8 tokens; types are a, rose, is.", "3 / 8."], ["8 tokens, 3 types", "3 / 8 = 0.375"], "Same method as the Gertrude Stein example on Kraus's TTR slide: count every word, then count the different ones, then divide.", ref="rates"),
    MC("py115-lookahead", "Why does it match everything?", "Why does `[a-zA-Z]+(?!eth)` match every word?",
       ["The lookahead checks what comes after the whole word (a space), which is never 'eth'", "Lookaheads don't work in Python", "It needs re.IGNORECASE", "`+` should be `*`"], 0,
       ["Right: `+` eats the word first, then the lookahead looks past it.", "They work; this one is just in the wrong place.", "Case isn't the issue.", "That would make it match even empty strings."],
       ["Think about where the regex is standing when it reaches `(?!eth)`.", "After `[a-zA-Z]+`, it's already past the word."], "Lookaheads guard what comes next, so put them before the part they're about.", ref="lookahead"),
    MC("py115-backref", "What does \\1 match?", "In `(\\w+) \\1`, what does `\\1` match?",
       ["Exactly the same text group 1 matched", "Any word", "The digit 1", "The first character of the line"], 0,
       ["Right: it's a copy of whatever group 1 captured.", "That would be `\\w+` again, which allows different words.", "In a pattern, `\\1` is a backreference, not a digit.", "That's `^`."],
       ["It refers back to a group.", "Same text, not same kind of text."], "Backreferences are how regex finds repetition.", ref="groups"),
    FILL("py115-per1000", "Per 1,000", "'said' appears 450 times in a 90,000-word genre. How many per 1,000 words?", ["5"],
         ["count / total × 1000.", "450 / 90000 = 0.005.", "× 1000."], ["450 / 90000 × 1000 = 5"], "Rates let you compare genres of different sizes.", ref="rates"),
    MC("py115-sorted", "Biggest first", "Which gives (word, count) pairs from most to least common?",
       ["`sorted(d.items(), key=lambda p: p[1], reverse=True)`", "`sorted(d.items())`", "`sorted(d.values(), reverse=True)`", "`d.sort(reverse=True)`"], 0,
       ["Right: sort by the count (p[1]), biggest first.", "That sorts alphabetically by word.", "That loses the words: you only get the numbers.", "Dictionaries don't have .sort()."],
       ["You need both the word and the count.", "`key=` picks what to sort by."], "Sorted pairs are every top-N table.", ref="sorting"),
]

build(g)
