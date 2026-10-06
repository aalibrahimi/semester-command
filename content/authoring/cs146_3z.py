"""CS 146 Lecture 3, slowly: insertion sort, loop invariants, and what
O, Omega and Theta are for, with O(log n) vs O(n log n) made concrete.

Written for a reader who found Lecture 3 confusing the first time: one idea
per section, the code next to plain English, every step animated, and the
two videos. Facts match the Lecture 2 to 3 and Lecture 4 to 5 chapters
(Poon's slides); every count shown is computed below."""
import math
from c146common import *  # noqa
from h15common import ROAD
from cs146_traces import TRACE, insertion_trace
from cs146_3z_figs import fig_bounds, fig_growth, fig_paths

ARR = [5, 2, 4, 6, 1, 3]   # CLRS's insertion sort example
L = lambda xs: "[" + ", ".join(map(str, xs)) + "]"


def ch(label, guide, sec):
    return {"label": label, "url": f"/study/cs146/{guide}?s={sec}", "kind": "chapter"}


def invariant_frames(arr):
    """At every check of the for loop: the invariant, shown on the array."""
    a = list(arr)
    n = len(a)
    fr = [aframe(a, f"Initialization. Before the loop starts, j = 1. The invariant says a[0..0] is sorted. One card is always sorted, so it's true before we've done anything.", done=[0], note=f"a[0..0] = {L(a[:1])} sorted ✓", ptrs={"j": 1})]
    for j in range(1, n):
        key = a[j]
        i = j - 1
        while i >= 0 and a[i] > key:
            a[i + 1] = a[i]
            i -= 1
        a[i + 1] = key
        if j < n - 1:
            fr.append(aframe(a, f"Maintenance. This pass inserted {key} into the sorted part. Back at the loop check with j = {j + 1}: is a[0..{j}] sorted? Yes. Still true, one card bigger.", done=list(range(j + 1)), hl=[i + 1], note=f"a[0..{j}] = {L(a[:j + 1])} sorted ✓", ptrs={"j": j + 1}))
    fr.append(aframe(a, f"Termination. j = {n}, so the loop stops. Plug j = {n} into the invariant: a[0..{n - 1}] is sorted. That's the whole array, which is exactly the goal.", done=list(range(n)), note=f"a[0..{n - 1}] sorted ✓ = the whole array"))
    return fr


def cards_frames(arr):
    """The card picture: one pass per frame, in plain words."""
    a = list(arr)
    fr = [aframe(a, f"Your hand starts as the first card, {a[0]}. One card is already sorted.", done=[0])]
    for j in range(1, len(a)):
        key = a[j]
        i = j - 1
        passed = []
        while i >= 0 and a[i] > key:
            passed.append(a[i])
            a[i + 1] = a[i]
            i -= 1
        a[i + 1] = key
        how = f"slide it left past {', '.join(map(str, passed))}" if passed else "it's already bigger than everything in your hand, so it stays put"
        fr.append(aframe(a, f"Pick up {key}: {how}. Your hand is now {L(a[:j + 1])}.", done=list(range(j + 1)), hl=[i + 1]))
    fr.append(aframe(a, f"No cards left on the table. The whole hand is sorted: {L(a)}.", done=list(range(len(a)))))
    return fr


def shifts(a):
    a = list(a); s = 0
    for j in range(1, len(a)):
        key = a[j]; i = j - 1
        while i >= 0 and a[i] > key:
            a[i + 1] = a[i]; i -= 1; s += 1
        a[i + 1] = key
    return s


def count_frames():
    """Sorted vs reversed input: shifts per pass."""
    fr = []
    for name, arr in (("sorted", [1, 2, 3, 4, 5]), ("reversed", [5, 4, 3, 2, 1])):
        a = list(arr); total = 0
        fr.append(aframe(a, f"{name.capitalize()} input, n = 5. Count how many times an item slides right.", note="shifts so far: 0"))
        for j in range(1, 5):
            key = a[j]; i = j - 1; s = 0
            while i >= 0 and a[i] > key:
                a[i + 1] = a[i]; i -= 1; s += 1
            a[i + 1] = key
            total += s
            fr.append(aframe(a, f"j = {j}: the key {key} slides past {s} item{'s' if s != 1 else ''}." + (" Already in place: one comparison and done." if s == 0 else ""), done=list(range(j + 1)), hl=[i + 1], note=f"shifts so far: {total}"))
        fr.append(aframe(a, f"{name.capitalize()}: {total} shifts in total." + (" Best case: about n steps in all (just the comparisons): Ω(n)." if total == 0 else " Worst case: 1 + 2 + 3 + 4 = 10 = n(n−1)/2: O(n²)."), done=list(range(5)), note=f"total shifts: {total}"))
    return fr


def levels_frames():
    """Merge sort on 8 items, bottom up: every level touches all 8."""
    vals = [38, 27, 43, 3, 9, 82, 10, 15]
    rows = []
    fr = []
    size = 1
    level = 3
    while size <= len(vals):
        chunks = [sorted(vals[k:k + size]) for k in range(0, len(vals), size)]
        flat = [x for c in chunks for x in c]
        label = f"pieces of {size}"
        rows.append({"label": label, "cells": flat, "done": list(range(len(flat))) if size == len(vals) else []})
        if size == 1:
            cap = "log₂ 8 = 3 halvings turn 8 items into 8 pieces of 1. A piece of 1 is already sorted (the base case). No work yet."
        else:
            cap = f"Merge level: {len(vals) // size} merges, each of 2 pieces of {size // 2}, make pieces of {size}. Every one of the 8 items gets copied once: 8 steps on this level."
        fr.append(rframe([dict(r) for r in rows], cap, note=f"levels of merging so far: {int(math.log2(size))} · steps so far: {8 * int(math.log2(size))}"))
        size *= 2
        level -= 1
    fr.append(rframe([dict(r) for r in rows], "3 merge levels × 8 items per level = 24 steps = n · log₂ n. That's where n log n comes from: n work, repeated log n times.", note="8 × 3 = 24 = n log₂ n"))
    return fr


INS_TABLE = T(["Line", "Python (Poon's slides are Java; same logic)", "In plain English", "With cards in your hand"], [
    ["1", "`def insertion_sort(a):`", "a function that sorts the list a", "you're dealt a row of cards face up"],
    ["2", "`for j in range(1, len(a)):`", "take each item from the 2nd to the last, one at a time", "pick up the next card from the table"],
    ["3", "`key = a[j]`", "remember it; it's the one we're placing", "hold the new card in your other hand"],
    ["4", "`i = j - 1`", "start comparing with the item just to its left", "look at the rightmost card in your hand"],
    ["5", "`while i >= 0 and a[i] > key:`", "while there's something to the left AND it's bigger…", "…is that card bigger than the new one?"],
    ["6", "`a[i + 1] = a[i]`", "…slide it one spot right", "nudge it right to make room"],
    ["7", "`i -= 1`", "move one spot further left", "look at the next card to the left"],
    ["8", "`a[i + 1] = key`", "drop the key into the gap", "slot the new card in"],
], title="Insertion sort, line by line: code, English, and cards side by side")

JAVA_SIDE = T(["Python", "Java (how Poon writes it)"], [
    ["`for j in range(1, len(a)):`", "`for (int j = 1; j < a.length; j++) {`"],
    ["`key = a[j]`", "`int key = a[j];`"],
    ["`i = j - 1`", "`int i = j - 1;`"],
    ["`while i >= 0 and a[i] > key:`", "`while (i >= 0 && a[i] > key) {`"],
    ["`a[i + 1] = a[i]`", "`a[i + 1] = a[i];`"],
    ["`i -= 1`", "`i--;`"],
    ["`a[i + 1] = key`", "`a[i + 1] = key;`"],
], title="The same code in both languages, line for line")

counts = [(n, n - 1, n * (n - 1) // 2) for n in (5, 10, 100, 1000)]
assert shifts([5, 4, 3, 2, 1]) == 10 and shifts([1, 2, 3, 4, 5]) == 0

g = {
 "id": "cs146/3-from-zero",
 "course": "cs146",
 "lessons": "Lecture 3, slowly",
 "title": "Lecture 3 from zero: insertion sort, loop invariants, and what O, Ω and Θ are for",
 "summary": "One idea at a time: insertion sort with cards, then the code next to plain English; what a loop invariant is and why it proves the sort works; counting steps on the best and worst input; what Big-O, Omega and Theta are each for and how to think about them; and exactly why O(log n) and O(n log n) are so different.",
 "estimatedMinutes": 60,
 "sourceNote": "A slower retelling of Lecture 3 (Loop Invariants, Insertion Sort) and the parts of Lectures 4 and 5 it leads into (asymptotic notation, binary search, merge sort), matching the facts in the Lecture 2 to 3 and Lecture 4 to 5 chapters. The insertion sort example [5, 2, 4, 6, 1, 3] is the textbook's (CLRS). Every count, curve and table is computed by the script that builds this chapter.",
 "requires": [],
 "sections": [
  {"id": "map", "heading": "What Lecture 3 is really asking", "blocks": [
    P("Every algorithm in this course gets asked the same **two questions**: **Is it correct?** (does it give the right answer for every possible input, not just the ones you tried?) and **How fast is it?** (how does the work grow when the input gets bigger?). Lecture 3 answers both for one small algorithm, **insertion sort**. Loop invariants answer the first question. Big-O, Omega and Theta answer the second.", slide="Two questions"),
    ROAD("Lecture 3, one idea at a time", [
      ("Insertion sort", "cards in your hand", "what it does", "brand"),
      ("The code", "line by line, next to English", "how it does it", "brand"),
      ("Loop invariant", "a promise the loop keeps", "is it correct?", "green"),
      ("Counting steps", "best and worst input", "how fast?", "amber"),
      ("O, Ω, Θ", "ceiling, floor, both", "saying 'how fast' precisely", "amber"),
      ("log n vs n log n", "one path vs the whole tree", "the two you'll mix up", "red"),
    ], "Each step only needs the one before it.", eyebrow="This chapter"),
    {"type": "video", "src": "/study-videos/cs146-insertion-invariant.mp4", "caption": "Insertion sort on [5, 2, 4, 6, 1, 3] with the code running beside it, and the loop invariant checked out loud at every pass. About 1.5 minutes; slow it to 0.75× the first time.", "chapters": "INSERTION_CHAPTERS"},
    WHY("**Why it matters** Lecture 3 is the vocabulary for the rest of the course. Every later algorithm (merge sort, heaps, quicksort, BSTs, AVL) gets the same treatment: show it works, then say its O, Ω or Θ. If these two ideas click now, the next ten lectures are new examples of the same thing."),
  ]},
  {"id": "cards", "heading": "Insertion sort, with cards (no code yet)", "blocks": [
    P("Picture sorting a hand of playing cards as you're dealt them. You keep the cards **in your hand sorted** at all times. Each new card, you slide it left past every card bigger than it, and drop it in the gap. When the deck runs out, your whole hand is sorted.", slide="The idea"),
    D("Insertion sort", "Keep a **sorted left part** of the list. Take the next item (the **key**), slide it left past every bigger item, and drop it in the gap. Repeat until the sorted part is the whole list."),
    D("Key", "The item currently being placed. In the card picture, the new card in your other hand."),
    D("Sorted part (the hand)", "Everything to the **left** of the key: a[0..j−1]. It's always sorted, even though it isn't in its final place yet (smaller items can still arrive later and push things right)."),
    ST(f"Insertion sort on {L(ARR)}, card by card", cards_frames(ARR)),
    C("In the middle of sorting [5, 2, 4, 6, 1, 3], the left part is [2, 4, 5, 6] and the key is 1. Where does 1 end up after this pass?", "At the very front: 1 is smaller than all four, so it slides past 6, 5, 4 and 2. The left part becomes **[1, 2, 4, 5, 6]**."),
  ]},
  {"id": "code", "heading": "The code, next to plain English", "blocks": [
    P("Here's the same thing as code. Read each row left to right: the code, what it means, and what you'd do with cards. There are only **two loops**: the outer `for` picks the next card, the inner `while` slides bigger cards right.", slide="Line by line"),
    INS_TABLE,
    TRACE(f"insertion_sort({L(ARR)}), line by line", insertion_trace(ARR)),
    JAVA_SIDE,
    THINK("**How to read any loop:** find the variable that moves (here j, then i), say out loud what it points at, and say what the loop body does to that spot. 'j picks the next card; i walks left while the cards are bigger; each step slides one card right.' If you can say that sentence, you understand the code."),
    TRAP("Line 8 is `a[i + 1] = key`, not `a[i] = key`. When the while loop stops, i points at the first card that is NOT bigger (or −1 if none). The gap is one to its right.", "Lecture 3, HW 3"),
    {"type": "prose", "md": "**Still fuzzy?** The Lecture 2 to 3 chapter has an interactive version: type your own array and watch every shift.", "resources": [ch("Insertion sort (Lectures 2 to 3)", "2-adts-invariants-insertion", "insertion"), {"label": "Comparison sort visualizer (USFCA)", "url": "https://www.cs.usfca.edu/~galles/visualization/ComparisonSort.html", "kind": "site"}]},
  ]},
  {"id": "invariant", "heading": "Loop invariants: a promise the loop keeps", "blocks": [
    P("**The problem.** You can test insertion sort on 10 arrays and it works. That proves nothing about the 11th. There are infinitely many inputs, so 'I tried it' is never a proof. We need a way to show it's right for **every** input.", slide="Why we need this"),
    D("Loop invariant", "A sentence about the loop's variables that is **true every time the loop checks its condition**: before the first pass, after every pass, and when it finally stops. It describes the progress made so far."),
    D("Insertion sort's invariant", "At the start of each pass of the for loop with index j: **a[0..j−1] is sorted** (and holds the same items that were there at the start)."),
    P("**The bookmark picture.** Imagine a bookmark at position j. The promise is: 'everything left of my bookmark is sorted'. The loop's whole job is to move the bookmark right **without ever breaking the promise**. When the bookmark reaches the end, the promise covers everything."),
    T(["Part", "What you show", "For insertion sort", "Like induction's…"], [
      ["**Initialization**", "it's true before the loop starts", "j = 1: a[0..0] is one item, and one item is always sorted", "base case"],
      ["**Maintenance**", "if it's true before a pass, it's still true after", "the pass slides the key into the right spot in a sorted part, so a[0..j] is sorted", "inductive step"],
      ["**Termination**", "when the loop stops, invariant + stop condition give the answer", "the loop stops at j = n, so a[0..n−1], the whole array, is sorted", "conclusion"],
    ], title="The three parts, side by side"),
    ST("Watch the promise hold at every check", invariant_frames(ARR)),
    E("The four sentences to write on the exam (fill in the blanks for any loop)", "Invariant: at the start of each iteration, ____ (what's true about the part done so far).\nInitialization: before the first iteration, ____ is true because ____.\nMaintenance: if ____ holds before an iteration, the body ____, so it still holds after.\nTermination: the loop stops when ____; then the invariant says ____, which is what we wanted.", answer="invariant, init, maintenance, termination"),
    T(["", "Insertion sort", "Summing an array (HW 3 Problem 1)"], [
      ["The loop", "for j = 1 to n − 1", "for i = 0 to n − 1: total += a[i]"],
      ["Invariant", "a[0..j−1] is sorted", "total = a[0] + … + a[i−1]"],
      ["Initialization", "a[0..0] is one item: sorted", "i = 0, total = 0 = the empty sum"],
      ["Maintenance", "insert a[j] into the sorted part", "adding a[i] extends the sum by one"],
      ["Termination", "j = n: whole array sorted", "i = n: total = sum of everything"],
    ], title="Same recipe, two loops"),
    TRAP("Writing the invariant about the **whole** array ('the array is sorted'). That's false in the middle of the loop. The invariant is always about the **part done so far**: a[0..j−1].", "Exam"),
    {"type": "prose", "md": "**Want the induction connection explained slowly?** Chapter 0 does induction from zero, and the Lecture 2 to 3 chapter proves HW 3's sum loop.", "resources": [ch("Induction (Chapter 0)", "0-notation", "induction"), ch("Loop invariants (Lectures 2 to 3)", "2-adts-invariants-insertion", "invariants")]},
  ]},
  {"id": "count", "heading": "Counting steps: best case and worst case", "blocks": [
    P("Now the second question: how fast? We **count steps**, not seconds (seconds depend on the computer). For insertion sort, the step that matters is the **shift**: sliding a card right. How many shifts depends on what order the cards arrive in.", slide="Count, don't time"),
    ST("Sorted vs reversed, n = 5: count the shifts", count_frames()),
    T(["n", "Best case (already sorted): comparisons", "Worst case (reversed): shifts = n(n−1)/2"], [[f"{n:,}", f"{c:,}", f"{w:,}"] for n, c, w in counts], title="The gap explodes as n grows"),
    P("Look at the last row: 1,000 items take about **1,000** steps when sorted but about **500,000** when reversed. Same algorithm, same n. So 'how fast is insertion sort?' has no single answer, and that's exactly why we need three different symbols."),
  ]},
  {"id": "family", "heading": "O, Ω and Θ: what each one is for", "blocks": [
    P("**The point of all three:** we want to describe how the work **grows** as n grows, ignoring details that don't matter (the computer's speed, constant factors like 3n vs 5n, small terms like +10). Each symbol answers a slightly different question.", slide="What they're for"),
    T(["Symbol", "Say it as", "It's a…", "Commute analogy", "Insertion sort"], [
      ["**O(g)**", "'grows **no faster** than g'", "**ceiling** (upper bound)", "'it takes **at most** 40 minutes'", "**O(n²)**: never worse than about n²"],
      ["**Ω(g)**", "'grows **no slower** than g'", "**floor** (lower bound)", "'it takes **at least** 20 minutes'", "**Ω(n)**: never better than about n"],
      ["**Θ(g)**", "'grows **exactly like** g'", "**both**: floor and ceiling match", "'it **always** takes about 30 minutes'", "no single Θ overall (n vs n²); worst case is Θ(n²)"],
    ], title="The three symbols"),
    THINK("**How to think about them:** O is a promise about the **worst** that can happen ('it won't be slower than this'). Ω is a promise about the **best** that can happen ('it can't be faster than this'). Θ is when both promises have the **same shape**, so you know the growth exactly. Poon uses O for the worst case and Ω for the best case."),
    F(fig_bounds(), "Θ(n²) as a picture: past n₀, the real step count stays between 3n² and 5n². Hover each line."),
    D("The formal definitions (Poon's)", "**f(n) = O(g(n))** if there are constants c > 0 and n₀ with f(n) ≤ c·g(n) for every n ≥ n₀. **f(n) = Ω(g(n))** if f(n) ≥ c·g(n) for every n ≥ n₀. **f(n) = Θ(g(n))** if both hold (with possibly different c's)."),
    T(["Statement", "True?", "Why"], [
      ["insertion sort is O(n²)", "**yes**", "the worst case is about n²/2"],
      ["insertion sort is O(n³)", "yes, but useless", "a ceiling can be too high; we always give the tightest one"],
      ["insertion sort is Ω(n)", "**yes**", "even sorted input needs a comparison per item"],
      ["insertion sort is Θ(n²)", "**no** (as a blanket statement)", "on sorted input it's about n, so n² isn't a floor"],
      ["merge sort is Θ(n log n)", "**yes**", "best and worst are both n log n"],
      ["summing an array is Θ(n)", "**yes**", "you must touch all n items, never more"],
    ], title="Check yourself: true or false?"),
    TRAP("Thinking O means 'worst case' by definition. O is just a ceiling on a function. It's the **worst-case running time** that we usually bound with O, which is why the two get said together.", "Lecture 4"),
    {"type": "video", "src": "/study-videos/cs146-growth.mp4", "caption": "O, Ω and Θ as ceiling, floor and sandwich, then O(log n) vs O(n log n) on 16 items, then the four shapes racing to n = 1,000,000. About 2 minutes.", "chapters": "GROWTH_CHAPTERS"},
    {"type": "prose", "md": "**More on this:** the Lecture 4 to 5 chapter proves 5n + 10 = O(n) step by step, and Abdul Bari's video works more examples.", "resources": [ch("Big-O, step by step (Lectures 4 to 5)", "4-big-o-merge-sort", "bigo"), ch("O(g(n)) from zero (Chapter 0)", "0-notation", "bigo"), {"label": "Asymptotic notation, worked (Abdul Bari)", "url": "https://www.youtube.com/watch?v=A03oI0znAoc", "kind": "video"}]},
  ]},
  {"id": "logs", "heading": "O(log n) vs O(n log n): the two you'll mix up", "blocks": [
    P("These two look alike and are **completely different**. The 'log n' part means the same thing in both: **how many times you can cut n in half** before reaching 1. The difference is **how much work you do each time you halve**.", slide="Same log, different work"),
    D("log₂ n", "The number of halvings from n down to 1. 8 → 4 → 2 → 1 is **3** halvings, so log₂ 8 = 3. 1,000,000 needs only about **20**. That's why log n is so small."),
    T(["", "O(log n)", "O(n log n)"], [
      ["The picture", "walk **one path** down the halvings", "do **all n items** at **every** level of halving"],
      ["Work per halving", "a constant (one comparison)", "n (touch every item)"],
      ["Total", "about log n", "n × log n"],
      ["Classic example", "**binary search**: look at the middle, throw away half", "**merge sort**: split everything in half, merge all of it back"],
      ["Code shape", "one loop that halves what's left", "halving recursion, with an O(n) merge at each level"],
      ["n = 1,000,000", f"about {math.log2(1e6):.0f} steps", f"about {1e6 * math.log2(1e6) / 1e6:.0f} million steps"],
    ], title="Side by side"),
    F(fig_paths(), "Same 16 items, same 4 levels of halving. Binary search keeps one half (green path); merge sort keeps both and touches all 16 on every merge level."),
    ST("O(log n): binary search throws half away each look", bs_frames([2, 5, 8, 12, 16, 23, 38, 45, 56, 72, 81, 90, 91, 95, 97, 99], 23)),
    ST("O(n log n): merge sort does n work on every level", levels_frames()),
    E("Binary search vs merge sort, as code", "# O(log n): ONE loop, and it halves what's left each time\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if a[mid] == x: return mid\n    if a[mid] < x: lo = mid + 1   # throw away the left half\n    else: hi = mid - 1            # throw away the right half\n\n# O(n log n): halve EVERYTHING, then merge ALL of it back\ndef merge_sort(a):\n    if len(a) <= 1: return a\n    m = len(a) // 2\n    return merge(merge_sort(a[:m]), merge_sort(a[m:]))   # merge is O(n)", answer="log n vs n log n"),
    F(fig_growth(), "All four shapes on one chart. log n hugs the bottom; n log n is just above n; n² leaves the chart almost at once."),
    THINK("**The one sentence to remember:** log n = 'one path down the halvings'; n log n = 'every item, on every level of halving'. If the algorithm **throws away** half, it's log n. If it **keeps and processes** both halves, it's n log n."),
    TRAP("Writing merge sort as O(log n) because 'it halves'. Halving gives you the **number of levels** (log n). You still have to count the **work per level**: merge sort merges all n items on each one.", "Lecture 5"),
    {"type": "prose", "md": "**Go deeper:** both algorithms are animated step by step in the Lecture 4 to 5 chapter.", "resources": [ch("What log n means (Chapter 0)", "0-notation", "log"), ch("Binary search", "4-big-o-merge-sort", "binsearch"), ch("Why merge sort is n log n", "4-big-o-merge-sort", "whynlogn"), {"label": "Merge sort (Abdul Bari)", "url": "https://www.youtube.com/watch?v=mB5HXBb_HY8", "kind": "video"}]},
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Insertion sort", "Keep a sorted left part; slide each new key left past bigger items. Ω(n) best, O(n²) worst."],
      ["Key", "The item being placed on this pass."],
      ["Loop invariant", "A sentence true every time the loop checks its condition. Insertion sort's: a[0..j−1] is sorted."],
      ["Initialization / Maintenance / Termination", "True at the start / stays true each pass / at the end it gives the answer."],
      ["Best case / worst case", "The input that makes it fastest / slowest (sorted / reversed for insertion sort)."],
      ["O(g)", "Ceiling: grows no faster than g."],
      ["Ω(g)", "Floor: grows no slower than g."],
      ["Θ(g)", "Both: grows exactly like g."],
      ["log₂ n", "How many times n halves down to 1."],
      ["O(log n) vs O(n log n)", "One path down the halvings vs all n items on every level."],
    ]),
  ]},
 ],
 "exercises": [
  MC("inv-whole", "Which invariant?", "Which is a correct loop invariant for insertion sort?", ["a[0..j−1] is sorted", "the array is sorted", "a[j] is the smallest item", "j < n"], 0,
     ["Yes: it's about the part done so far, so it's true mid-loop.", "False in the middle of the loop.", "Insertion sort doesn't pick minimums (that's selection sort).", "That's just the loop condition."],
     "**a[0..j−1] is sorted.**", "The most common lost point on invariants.", ref="invariant"),
  MC("inv-part", "Name the part", "'When the loop stops at j = n, a[0..n−1] is sorted, which is the whole array.' Which part is this?", ["Termination", "Initialization", "Maintenance", "Base case"], 0,
     ["Yes: invariant + stop condition = the goal.", "Initialization is before the first pass.", "Maintenance is about one pass keeping it true.", "The base case is the induction word for Initialization."],
     "**Termination.**", "Each of the three parts has its own job.", ref="invariant"),
  MC("best", "Best case", "On an already sorted array of n items, insertion sort does about…", ["n steps: Ω(n)", "n² steps", "log n steps", "1 step"], 0,
     ["Yes: one comparison per key, no shifts.", "That's the reversed (worst) case.", "It still has to look at every item once.", "It must at least look at every item."],
     "**About n: Ω(n).**", "Best case = the floor.", ref="count"),
  MC("theta", "What Θ means", "f(n) = Θ(n²) means…", ["f grows exactly like n²: it's both O(n²) and Ω(n²)", "f is at most n²", "f is at least n²", "f equals n² exactly"], 0,
     ["Yes: a floor and a ceiling of the same shape.", "That's only O.", "That's only Ω.", "Θ ignores constants and small terms: 3n² + 10 is Θ(n²)."],
     "**Both O(n²) and Ω(n²).**", "Θ = sandwiched.", ref="family"),
  MC("o-ceiling", "A loose ceiling", "Is insertion sort O(n³)?", ["Yes, but it's a useless bound; O(n²) is the tight one", "No, it's only O(n²)", "No, O only applies to worst cases", "Yes, and it's the best answer"], 0,
     ["Right: anything ≤ n² is also ≤ n³. We always give the tightest ceiling.", "A ceiling can be higher than needed and still be true.", "O is just a ceiling on a function.", "It's true but not the best answer."],
     "**Technically yes, but say O(n²).**", "A classic trick question.", ref="family"),
  MC("log-vs", "log n or n log n?", "An algorithm keeps cutting the list in half and throws away the half it doesn't need. Its running time is…", ["O(log n)", "O(n log n)", "O(n)", "O(n²)"], 0,
     ["Yes: one path down the halvings, constant work per step.", "That needs n work on every level (keeping both halves).", "It never looks at every item.", "Far too slow."],
     "**O(log n)**, like binary search.", "Throw away half → log n.", ref="logs"),
  MC("ms-log", "Merge sort", "Why is merge sort O(n log n) and not O(log n)?", ["it does n work (merging) on each of its log n levels", "it uses recursion", "it compares pairs", "it needs extra memory"], 0,
     ["Yes: log n levels × n work each.", "Binary search can be recursive too and it's log n.", "Every comparison sort compares pairs.", "Memory is about space, not time."],
     "**n work on every one of log n levels.**", "Halving gives the levels; you still count the work per level.", ref="logs"),
  FILL("log8", "Count the halvings", "What is log₂ 1024? (Hint: 2¹⁰ = 1024.)", ["10", "ten"],
       ["log₂ n asks: 2 to what power is n?", "Halve 1024: 512, 256, 128, …", "Count the halvings until you reach 1."],
       ["**10**: 1024 → 512 → 256 → 128 → 64 → 32 → 16 → 8 → 4 → 2 → 1 is 10 halvings."], "Binary search on 1,024 items takes about 10 looks.", ref="logs"),
 ],
}

# chip times from window.CHAPTERS when the videos were rendered
INSERTION_CHAPTERS = [{"t": 0, "label": "The idea"}, {"t": 9, "label": "Initialization"}, {"t": 14, "label": "Maintenance"}, {"t": 80, "label": "Termination"}, {"t": 86, "label": "How fast?"}]
GROWTH_CHAPTERS = [{"t": 9, "label": "O: ceiling"}, {"t": 19, "label": "Ω: floor"}, {"t": 24, "label": "Θ: both"}, {"t": 35, "label": "log n"}, {"t": 61, "label": "n log n"}, {"t": 85, "label": "The race"}]
for s in g["sections"]:
    for b in s["blocks"]:
        if b.get("chapters") == "INSERTION_CHAPTERS": b["chapters"] = INSERTION_CHAPTERS
        if b.get("chapters") == "GROWTH_CHAPTERS": b["chapters"] = GROWTH_CHAPTERS

for e in g["exercises"]:
    if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
gb.build(g)
