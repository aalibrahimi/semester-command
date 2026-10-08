"""CS 146 midterm crash course: every lecture from 2 to 13 on one page,
conceptual and plain, with the videos and a "go deeper" link from every
topic into the full chapter section that explains it slowly.

The facts here are condensed from the chapters themselves (which were built
from Poon's slides and homework), so the two never disagree. In-app links
are checked by scripts/check-guides.ts: a renamed section fails the build.
"""
import json
from c146common import *  # noqa
from h15common import ROAD

GUIDES_DIR = REPO + "/src/study/guides"


def video(src, caption=None):
    """Reuse a chapter's video block (same file, same chapter chips)."""
    for f in ("4-big-o-merge-sort", "8-heaps-heapsort-pq", "9-quicksort", "11-hash-tables", "12-binary-search-trees", "13-avl-trees"):
        gd = json.load(open(f"{GUIDES_DIR}/cs146--{f}.json"))
        for s in gd["sections"]:
            for b in s["blocks"]:
                if b["type"] == "video" and b["src"] == src:
                    b = dict(b); b.pop("id", None); b.pop("slide", None)
                    if caption:
                        b["caption"] = caption
                    return b
    raise KeyError(src)


def ch(label, guide, sec):
    return {"label": label, "url": f"/study/cs146/{guide}?s={sec}", "kind": "chapter"}


def yt(label, vid):
    return {"label": label, "url": f"https://www.youtube.com/watch?v={vid}", "kind": "video"}


def site(label, url):
    return {"label": label, "url": url, "kind": "site"}


def canvas(label, file_id):
    return {"label": label + " (Canvas)", "url": f"https://sjsu.instructure.com/courses/1629570/files/{file_id}", "kind": "video"}


def DEEPER(md, links):
    """The closing 'stuck?' line of a topic, with its link chips."""
    return {"type": "prose", "md": md, "resources": links}


def ONE(md):
    """The topic in one sentence."""
    return {"type": "prose", "md": md, "label": "think"}


L2 = "2-adts-invariants-insertion"
L4 = "4-big-o-merge-sort"
L0 = "0-notation"
L6 = "6-recurrences"
L7 = "7-master-method"
L8 = "8-heaps-heapsort-pq"
L9 = "9-quicksort"
L10 = "10-linear-sorts"
L11 = "11-hash-tables"
L12 = "12-binary-search-trees"
L13 = "13-avl-trees"

g = {
 "id": "cs146/midterm-crash-course",
 "course": "cs146",
 "lessons": "Midterm review",
 "title": "Midterm crash course: Lectures 2 to 13 on one page",
 "summary": "Every topic on the Oct 12 midterm, condensed to what you need to explain it: the idea in one sentence, the few definitions that matter, one small example, the trap that costs points, and why it matters. Each topic links straight into the full chapter section when you need the slow version, and the videos are right where they help.",
 "estimatedMinutes": 120,
 "sourceNote": "Condensed from this app's CS 146 chapters (Lectures 2 to 13), which were built from Poon's slides and homework. The exam facts (in class Mon Oct 12, master-method cases printed, everything else from memory) are from the syllabus and the course page. Videos: the app's own animations, Poon's Canvas videos, and checked YouTube explanations.",
 "requires": [],
 "sections": [
  {"id": "start", "heading": "How to use this (read first, 2 minutes)", "blocks": [
    P("This page is the **whole midterm in one place**, written for understanding, not memorizing code. Every topic has the same five parts: **the idea in one sentence**, the **few definitions** you must be able to say, **one small example**, the **trap** that costs points, and a **go deeper** row of links into the full chapter when something doesn't click.", slide="What this is"),
    T(["", "The facts"], [
      ["When", "**Monday, Oct 12**, in class, on paper, the full 75 minutes (30% of your grade)"],
      ["Shape", "about **10 short answers** and **5 detailed answers**, front and back, partial credit"],
      ["Covers", "every lecture to date: ADTs to AVL trees"],
      ["Given to you", "only the three master-method cases. No notes, scratch paper, devices or watches; bring your Tower Card"],
      ["What he tests", "exactly what's on the slides: traces on small arrays and trees, runtimes, and the **why** behind them. A few 'extend it to a new case' questions."],
    ], title="The midterm"),
    ROAD("Twelve topics, in lecture order", [
      ("Structures", "ADTs, stacks, queues, linked lists", "Lecture 2", "brand"),
      ("Correctness", "loop invariants, insertion sort", "Lecture 3", "brand"),
      ("Speed", "Big-O, Ω, Θ, divide and conquer, merge sort", "Lectures 4 to 5", "green"),
      ("Recurrences", "unrolling, recursion trees, master method", "Lectures 6 to 7", "green"),
      ("Sorting", "heaps, quicksort, linear-time sorts", "Lectures 8 to 10", "amber"),
      ("Lookup", "hash tables, BSTs, AVL trees", "Lectures 11 to 13", "red"),
    ], "The course so far, grouped. Each group builds on the one before.", eyebrow="Midterm map"),
    DEEPER("**Do Poon's own review first.** The Lecture 14 chapter answers every question from his review slides, in his order, with a practice paper in the real exam's shape.", [ch("Lecture 14: Poon's review, answered", "14-midterm-review", "map"), ch("Practice paper", "14-midterm-review", "paper")]),
    WHEN("**Short on time?** Do it in this order: the **comparison tables** at the end (they answer half the 'which is faster and why' questions), then **master method**, **quicksort**, **heaps**, **BSTs** and **AVL** (the most traceable topics), then everything else. Each topic takes about 8 to 10 minutes. Mark a topic **shaky** and the app will bring it back in Recall and on your Ready page."),
  ]},

  {"id": "adts", "heading": "1. ADTs, stacks, queues, linked lists (Lecture 2)", "blocks": [
    ONE("**An ADT says what a structure does, not how it's built**; a stack and a queue are two ADTs that differ only in which end things come out of."),
    D("ADT (Poon's sentence)", "'An abstract data type is a data type defined by its **behavior** (what it does), not its **implementation** (how it does it).' He wants this sentence, then an example."),
    D("Stack: LIFO", "Last in, first out. Add and remove at the **same end** (the top). push, pop, peek, isEmpty. Plates in a cafeteria. All O(1)."),
    D("Queue: FIFO", "First in, first out. Add at the **back**, remove from the **front**. enqueue, dequeue, peek, isEmpty. A checkout line. All O(1) (with a circular array or a linked list with head and tail)."),
    D("Linked list", "A chain of **nodes**; each holds a value and the **address of the next** node. You reach it through **head**; the last node's next is **null**. No index: getting the k-th item means walking k steps."),
    E("The same ADT, two builds", "A stack can be built on an array (top = last filled index) or on a linked list (top = head). The ADT, push/pop/peek, is identical; only the inside differs. That's the whole point of an ADT.", answer="behavior, not implementation"),
    TRAP("Two linked-list bugs he calls out: (1) inserting after node B, write **X.next = B.next before B.next = X**, or the rest of the list is lost; (2) in a linked queue, when you dequeue the **last** item, set **tail = null** too.", "Exam"),
    DEEPER("**Stuck?** The full chapter draws every pointer change step by step.", [ch("ADTs", L2, "why"), ch("Stack", L2, "stack"), ch("Queue", L2, "queue"), ch("Linked list", L2, "linked"), site("Stack / queue visualizer (USFCA)", "https://www.cs.usfca.edu/~galles/visualization/Algorithms.html")]),
  ]},

  {"id": "invariants", "heading": "2. Loop invariants and insertion sort (Lectures 2 to 3)", "blocks": [
    ONE("**A loop invariant is a sentence that stays true every time the loop checks its condition**; proving it at the start, keeping it true each pass, and reading it at the end proves the loop correct."),
    T(["Part", "What you show", "Like induction's…"], [
      ["**Initialization**", "true before the first iteration", "base case"],
      ["**Maintenance**", "if true before an iteration, still true after it", "inductive step"],
      ["**Termination**", "when the loop stops, invariant + stop condition = the goal", "conclusion"],
    ], title="The three parts"),
    D("Insertion sort", "Keep a **sorted left part**. Take the next item (the **key**), slide it left past every bigger item, drop it in. Invariant: **a[0..j−1] is sorted** (the prefix handled so far)."),
    T(["Case", "Input", "Time", "Why"], [
      ["Best", "already sorted", "**Ω(n)**", "each key compares once and stays"],
      ["Worst", "sorted backwards", "**O(n²)**", "shifts 1 + 2 + … + (n−1) = n(n−1)/2"],
    ], title="Insertion sort's runtime"),
    P("Insertion sort is **in place** (O(1) extra space) and **stable**: the test is strictly `a[i] > key`, so equal items never jump past each other."),
    TRAP("Writing the invariant about the **whole** array ('the array is sorted') instead of the **prefix** ('a[0..j−1] is sorted'). An invariant must be true in the middle, when the job is half done.", "Exam"),
    DEEPER("**Stuck?** Lecture 3 from zero goes one idea at a time, with the code next to plain English and a video.", [ch("Lecture 3 from zero: invariants", "3-from-zero", "invariant"), ch("Lecture 3 from zero: the code", "3-from-zero", "code"), ch("Loop invariants", L2, "invariants"), ch("Insertion sort", L2, "insertion"), ch("Induction (Chapter 0)", L0, "induction"), canvas("Poon: insertion sort", 89211807)]),
  ]},

  {"id": "bigo", "heading": "3. Big-O, Omega, Theta and the growth ladder (Lecture 4)", "blocks": [
    ONE("**Big-O ignores constants and small terms and keeps only the shape of how the work grows** as the input gets big."),
    D("Big-O: a ceiling", "f(n) = O(g(n)) if there are constants **c > 0** and **n₀** with **f(n) ≤ c·g(n) for all n ≥ n₀**. 'Past some size, f stays under a constant times g.'"),
    T(["Symbol", "Means", "Poon uses it for", "Example"], [
      ["O(g)", "at most (ceiling)", "worst case", "insertion sort is O(n²)"],
      ["Ω(g)", "at least (floor)", "best case", "insertion sort is Ω(n)"],
      ["Θ(g)", "exactly (both)", "when best = worst", "summing an array is Θ(n)"],
    ], title="O, Ω, Θ"),
    T(["Rung", "Name", "Looks like in code"], [
      ["O(1)", "constant", "no loop over the input"],
      ["O(log n)", "logarithmic", "a loop that **halves** what's left"],
      ["O(n)", "linear", "one loop over the input"],
      ["O(n log n)", "linearithmic", "halving, with a full pass at each level (merge sort)"],
      ["O(n²)", "quadratic", "a loop inside a loop, both over the input"],
      ["O(2ⁿ)", "exponential", "try every subset"],
    ], title="The growth ladder, slowest-growing first"),
    E("Simplify", "T(n) = 3n² + 10n log n + 500\n\nKeep the fastest-growing term, drop its constant: **Θ(n²)**.\nProve O(n²) with the definition: for n ≥ 1, 3n² + 10n log n + 500 ≤ 3n² + 10n² + 500n² = 513n², so c = 513, n₀ = 1.", answer="Θ(n²)"),
    TRAP("Dropping a term that **isn't** a constant. n log n is not 'n times a constant': log n grows. O(n log n) stays O(n log n).", "HW 4"),
    DEEPER("**Stuck?** Lecture 3 from zero explains what O, Ω and Θ are each for, with a video; Chapter 0 explains log from zero.", [ch("O, Ω, Θ from zero", "3-from-zero", "family"), ch("log n vs n log n", "3-from-zero", "logs"), ch("Big-O in plain words", L4, "bigo"), ch("The growth ladder", L4, "classes"), ch("What log n means", L0, "log"), canvas("Poon: Big-O", 89211000), yt("Asymptotic notation, worked (Abdul Bari)", "A03oI0znAoc"), site("Big-O cheat sheet", "https://www.bigocheatsheet.com/")]),
  ]},

  {"id": "dc", "heading": "4. Divide and conquer, binary search, merge sort (Lectures 4 to 5)", "blocks": [
    ONE("**Divide and conquer: split the problem into smaller copies of itself, solve those the same way, combine the answers.**"),
    T(["", "Binary search", "Merge sort"], [
      ["Divide", "look at the middle", "cut the array in half"],
      ["Conquer", "search **one** half", "sort **both** halves (recursively)"],
      ["Combine", "nothing", "**merge** the two sorted halves"],
      ["Time", "**O(log n)**", "**Θ(n log n)** always"],
      ["Needs", "a sorted array", "O(n) extra space for merging"],
    ], title="Same recipe, two algorithms"),
    D("Merge", "Two sorted lists → one sorted list, by repeatedly taking the **smaller front item**. Θ(n) for n total items."),
    video("/study-videos/cs146-merge-sort.mp4"),
    P("**Why n log n?** The halving makes **log n levels**; every level merges all n items once. n work × log n levels = **n log n**. That picture (the recursion tree) is the answer to 'explain merge sort's runtime'."),
    TRAP("Saying merge sort sorts **in place**. It doesn't: merge writes into a temporary array, **O(n) extra space**. Insertion sort and heap sort are the in-place ones.", "Lecture 5"),
    DEEPER("**Stuck?** Watch the video again at 0.75×, or step through merge in the chapter. log n vs n log n has its own slow section.", [ch("log n vs n log n, slowly", "3-from-zero", "logs"), ch("Binary search", L4, "binsearch"), ch("Merge", L4, "merge"), ch("Merge sort", L4, "mergesort"), ch("Why n log n", L4, "whynlogn"), canvas("Poon: merge", 89211345), canvas("Poon: merge sort", 89211678), yt("Merge sort (Abdul Bari)", "mB5HXBb_HY8")]),
  ]},

  {"id": "recurrences", "heading": "5. Recurrences and the recursion tree (Lecture 6)", "blocks": [
    ONE("**A recurrence writes a recursive algorithm's cost in terms of its own cost on smaller inputs**; the recursion tree adds that cost up row by row."),
    D("Recurrence", "An equation for T(n) using T of smaller inputs, plus a **base case**. Merge sort: **T(n) = 2T(n/2) + n**, T(1) = 1. Read it as: 'two calls on half the input, plus n work to merge'."),
    D("Recursion tree", "One box per call, with the work that call does **itself** inside. Total = sum of the **rows**. For aT(n/b) + f(n): row i has **aⁱ** calls of size **n/bⁱ**, and there are about **log_b n** rows."),
    E("Merge sort's tree", "Row 0: 1 call × n work = n\nRow 1: 2 calls × n/2 = n\nRow 2: 4 calls × n/4 = n\n…\nlog₂ n rows, each costs n → total **n log n**", answer="Θ(n log n)"),
    D("Substitution method", "**Guess** the answer (usually from the tree), **assume** it holds for the smaller input, **substitute** into the recurrence, and **prove** it's ≤ c·(your guess). It's induction."),
    TRAP("Forgetting the base case, or reading T(n−1) like T(n/2). T(n) = T(n−1) + 1 shrinks by **subtracting**: n levels, Θ(n). Halving gives log n levels.", "HW 6"),
    DEEPER("**Stuck?** The chapter computes T(8) by hand before drawing the tree.", [ch("Read a recurrence", L6, "read"), ch("Unrolling", L6, "unroll"), ch("Recursion tree", L6, "tree"), ch("Substitution", L6, "substitution"), yt("Recurrence relations (Abdul Bari)", "4V30R3I1vLI")]),
  ]},

  {"id": "master", "heading": "6. The master method (Lecture 7)", "blocks": [
    ONE("**For T(n) = aT(n/b) + f(n), compare f(n) with n^(log_b a); whichever is bigger wins, and a tie costs an extra log n.** The cases are printed on the exam; the points are in doing the comparison cleanly."),
    T(["Move", "What to do"], [
      ["1. Match the shape", "write **a** (number of calls), **b** (shrink factor), **f(n)** (work outside the calls)"],
      ["2. Watershed", "compute **n^(log_b a)** ('b to what power gives a?'): the leaves' total work"],
      ["3. Compare", "is f(n) polynomially **smaller**, the **same**, or polynomially **bigger**?"],
      ["4. Read the case", "smaller → **Θ(n^(log_b a))** · same → **Θ(n^(log_b a) log n)** · bigger (+ regularity) → **Θ(f(n))**"],
      ["5. Know when it fails", "say '**does not apply**, because…' for the four bad shapes"],
    ], title="The five moves"),
    T(["Recurrence", "a, b, f", "Watershed", "Case", "Answer"], [
      ["T(n/2) + 1 (binary search)", "1, 2, 1", "n⁰ = 1", "2 (same)", "Θ(log n)"],
      ["2T(n/2) + n (merge sort)", "2, 2, n", "n", "2 (same)", "Θ(n log n)"],
      ["4T(n/2) + n", "4, 2, n", "n²", "1 (f smaller)", "Θ(n²)"],
      ["4T(n/2) + n³", "4, 2, n³", "n²", "3 (f bigger)", "Θ(n³)"],
    ], title="The four to know cold"),
    D("When it does NOT apply", "**a not constant** (n·T(n/2)); **subtracting instead of dividing** (T(n−1)); **only a log gap** (2T(n/2) + n/log n: not polynomially smaller); **case 3 without regularity** (n²(2 + cos n)). Write 'does not apply' plus the reason: that's the full-credit answer."),
    TRAP("Calling n/log n 'smaller than n' and using case 1. The gap must be **polynomial** (exponents differ by some ε > 0). A log factor isn't. Does not apply.", "HW 7, Midterm"),
    DEEPER("**Stuck?** The chapter has a practice set with every case and every failure shape.", [ch("The five moves", L7, "master"), ch("The watershed", L7, "watershed"), ch("When it doesn't apply", L7, "limits"), ch("Practice set", L7, "practice"), yt("Master theorem, worked (Abdul Bari)", "OynWkEj0S-s")]),
  ]},

  {"id": "heaps", "heading": "7. Heaps, heap sort, priority queues (Lecture 8)", "blocks": [
    ONE("**A max-heap is a complete binary tree stored in an array where every parent is ≥ its children, so the biggest item is always at index 0.**"),
    T(["Index of…", "Formula (0-based, Poon's)"], [
      ["left child of i", "**2i + 1**"], ["right child of i", "**2i + 2**"], ["parent of i", "**⌊(i − 1) / 2⌋**"], ["first leaf", "**⌊n / 2⌋**"],
    ], title="The array IS the tree"),
    T(["Operation", "What it does", "Time"], [
      ["heapify(i)", "let a[i] **sink**: swap with its **larger** child until it's bigger than both", "O(log n)"],
      ["buildHeap", "heapify every non-leaf from ⌊n/2⌋ − 1 **down to 0**", "**O(n)** (not n log n)"],
      ["heapSort", "buildHeap; then n times: swap root to the end, shrink, heapify(0)", "O(n log n), O(1) space, **not stable**"],
      ["PQ insert", "append, then swap **up** while bigger than the parent", "O(log n)"],
      ["PQ extract", "take a[0], move the last item to 0, heapify(0)", "O(log n)"],
      ["PQ peek", "return a[0]", "O(1)"],
    ], title="Every heap operation"),
    video("/study-videos/cs146-heapsort.mp4"),
    TRAP("Mixing up index formulas: Poon is **0-based** (2i+1, 2i+2). The textbook (CLRS) is 1-based (2i, 2i+1). Use his.", "Exam"),
    DEEPER("**Stuck?** The chapter traces heapify and buildHeap line by line.", [ch("Array as tree", L8, "array"), ch("heapify", L8, "heapify"), ch("buildHeap is O(n)", L8, "build"), ch("Heap sort", L8, "sort"), ch("Priority queue", L8, "pq"), canvas("Poon: heap sort", 89212093), yt("Heap sort and heapify (Abdul Bari)", "HqPJF2L5h9U"), site("Heap visualizer (USFCA)", "https://www.cs.usfca.edu/~galles/visualization/Heap.html")]),
  ]},

  {"id": "quicksort", "heading": "8. Quicksort (Lecture 9)", "blocks": [
    ONE("**Quicksort picks a pivot, partitions the array so smaller items are left of it and bigger ones right, then sorts each side the same way.** All the work is in partition; there's no combine step."),
    D("partition (Lomuto, Poon's version)", "pivot = **a[high]** (the last item). One left-to-right pass moves every item ≤ pivot into a left zone, then the pivot goes right after that zone, at **i + 1**, which is returned. The pivot is now in its **final sorted position**. Θ(n)."),
    video("/study-videos/cs146-quicksort.mp4"),
    T(["", "Quicksort", "Merge sort", "Heap sort"], [
      ["Average", "Θ(n log n)", "Θ(n log n)", "Θ(n log n)"],
      ["Worst", "**O(n²)**", "Θ(n log n)", "Θ(n log n)"],
      ["Extra space", "O(log n) call stack", "O(n)", "O(1)"],
      ["Stable?", "no", "yes", "no"],
      ["In practice", "usually fastest", "steady", "steady"],
    ], title="The three n log n sorts (Poon's slide)"),
    P("**Worst case:** every pivot is the largest or smallest item, so one side is empty and the other has n − 1: n + (n−1) + … = **n²**. With last-item pivots, that happens on **already sorted** input. Fixes: a **random** pivot, **median of three**."),
    TRAP("Returning i instead of **i + 1** from partition, or counting the returned index from low instead of from 0 (it's an index into the **whole** array).", "HW 9"),
    DEEPER("**Stuck?** Poon's own animation and the chapter's line-by-line partition trace.", [ch("partition", L9, "partition"), ch("quicksort", L9, "quicksort"), ch("Why the worst case is n²", L9, "analysis"), canvas("Poon's video: partitioning an array", 88840377), canvas("Poon: partitioning students", 89211879), canvas("Poon: quicksort", 89211995), yt("Quicksort (Abdul Bari)", "7h1s2SojIRw")]),
  ]},

  {"id": "linear", "heading": "9. The n log n limit and linear-time sorts (Lecture 10)", "blocks": [
    ONE("**Any sort that only compares pairs needs Ω(n log n) comparisons; counting, radix and bucket sort beat that by looking at the values themselves, but each only works on a certain kind of data.**"),
    D("Comparison sort lower bound", "Insertion, merge, heap and quicksort treat items like **closed boxes** they can only compare. Any such sort needs **Ω(n log n)** comparisons in the worst case. Poon states it; the proof is outside the course."),
    T(["", "Counting sort", "Radix sort", "Bucket sort"], [
      ["Input", "integers in a small range [0, k]", "integers with d digits", "numbers spread **evenly** over [0, 1)"],
      ["Idea", "count each value, cumulative counts = seats, place items **backwards**", "stable-sort by the **last** digit, then the next, … d passes", "n buckets, x goes to ⌊n·x⌋, sort each bucket, concatenate"],
      ["Time", "**Θ(n + k)**", "**Θ(d(n + b))**", "average **Θ(n)**; worst = the inner sort (Θ(n²))"],
      ["Breaks when", "k is huge", "d is huge", "data isn't evenly spread"],
    ], title="Poon's summary table"),
    E("Counting sort, the slide's example", "a = [4, 1, 0, 2, 1, 0], k = 4\ncount      = [2, 2, 1, 0, 1]   (two 0s, two 1s, …)\ncumulative = [2, 4, 5, 5, 6]   (count[v] = how many items are ≤ v)\nwalk a backwards; seat = count[x] − 1; then count[x] −= 1\noutput     = [0, 0, 1, 1, 2, 4]", answer="[0, 0, 1, 1, 2, 4]"),
    TRAP("Radix sort with an **unstable** inner sort gives **wrong** answers, not just slow ones: the earlier digits' order must survive. That's why counting sort walks **backwards** (it keeps it stable).", "Lecture 10"),
    DEEPER("**Stuck?** The chapter traces all three on Poon's arrays.", [ch("The n log n limit", L10, "limits"), ch("Counting sort", L10, "counting"), ch("Radix sort", L10, "radix"), ch("Bucket sort", L10, "bucket"), ch("Which sort when", L10, "choose"), yt("Counting sort (CS Dojo)", "OKd534EWcdk"), yt("Radix sort (CS Dojo)", "XiuSW_mEn7g")]),
  ]},

  {"id": "hash", "heading": "10. Hash tables (Lecture 11)", "blocks": [
    ONE("**A hash table turns a key into an array index with a hash function, so insert, search and delete take O(1) on average**; collisions go into a chain at that slot."),
    video("/study-videos/cs146-hash-tables.mp4", "Poon's librarian analogy and the whole mechanism in 2.5 minutes. Use the chips to jump."),
    T(["Word", "Plain meaning"], [
      ["Hash function h(k)", "key → slot number 0..m−1. Division: **k mod m**. Multiplication: **⌊m·(kA mod 1)⌋**"],
      ["Collision", "two different keys, same slot. Unavoidable when there are more possible keys than slots"],
      ["Chaining", "each slot holds a linked list; insert at the **head** (O(1))"],
      ["Load factor α", "**n / m**, the average chain length. Search walks about α nodes"],
      ["Resize", "when α passes a limit (0.75), double m and re-insert everything: O(n) once in a while"],
      ["Amortized O(1)", "the occasional O(n) resize spread over all the cheap inserts averages to O(1)"],
    ], title="The whole lecture in six words"),
    E("Chaining with h(k) = k mod 10", "insert 42, 17, 22, 37 (insert at head)\nslot 2: 22 → 42\nslot 7: 37 → 17\nsearch(42): slot 2, walk 22, then 42: found in 2 steps", answer="slot 2: 22 → 42"),
    TRAP("'Amortized O(1)' does **not** mean every call is O(1): one insert can cost O(n) when it triggers a resize. And it assumes a good hash function; one that sends everything to the same slot makes search **O(n)**.", "Exam"),
    DEEPER("**Stuck?** Start from the librarian story in the chapter; it maps every word.", [ch("The library analogy", L11, "library"), ch("Hash functions", L11, "hashing"), ch("Chaining", L11, "chaining"), ch("Load factor and resizing", L11, "runtime"), yt("Hashing, simplified (Abdul Bari)", "mFY0J5W8Udk"), site("Hash table visualizer (USFCA)", "https://www.cs.usfca.edu/~galles/visualization/OpenHash.html")]),
  ]},

  {"id": "bst", "heading": "11. Binary search trees (Lecture 12)", "blocks": [
    ONE("**In a BST, every key in a node's left subtree is smaller and every key in its right subtree is bigger, so search walks one path down: O(h).** Unlike a hash table, it keeps things in order."),
    video("/study-videos/cs146-bst.mp4"),
    T(["Operation", "How", "Time"], [
      ["search / min / max", "one path down (min: keep going left)", "O(h)"],
      ["insert", "search until you fall off; the new key becomes a **leaf**", "O(h)"],
      ["delete", "leaf: remove · one child: child takes its place · two children: copy the **successor** (min of the right subtree) up, then delete it", "O(h)"],
      ["successor", "right child? min of right subtree. Else: search from the root; the **last node where you stepped left**", "O(h)"],
      ["in / pre / post-order", "visit every node", "O(n)"],
    ], title="Everything a BST does"),
    T(["Order", "Visit", "On Poon's tree"], [
      ["In-order", "left, **node**, right", "2 3 5 6 7 9 13 15 17 18 20 (sorted!)"],
      ["Pre-order", "**node**, left, right", "15 6 3 2 5 7 13 9 18 17 20"],
      ["Post-order", "left, right, **node**", "2 5 3 9 13 7 6 17 20 18 15"],
    ], title="The three traversals"),
    P("**h is the catch.** Keys in mixed order: h ≈ log n, everything O(log n). Keys in **sorted** order: the tree is a chain, h = n − 1, everything **O(n)**. That's the problem AVL trees fix."),
    TRAP("The BST rule is about whole **subtrees**, not just children. And in the two-children delete, forgetting step two: after copying the successor up, delete the old successor node.", "Exam"),
    DEEPER("**Stuck?** Poon's own successor videos, and the chapter's line-by-line traces.", [ch("The BST property", L12, "property"), ch("Search and successor", L12, "search"), ch("Traversals", L12, "traversal"), ch("Insert", L12, "insert"), ch("Delete: three cases", L12, "delete"), canvas("Poon: successor of 13", 89088648), canvas("Poon: what insert() returns", 89089843), canvas("Poon: successor of 9", 89212217), canvas("Poon: BST insert", 89212360), site("BST visualizer (USFCA)", "https://www.cs.usfca.edu/~galles/visualization/BST.html")]),
  ]},

  {"id": "avl", "heading": "12. AVL trees (Lecture 13)", "blocks": [
    ONE("**An AVL tree is a BST that keeps |H(left) − H(right)| ≤ 1 at every node by doing O(1) rotations after inserts and deletes, so its height, and every operation, stays O(log n).**"),
    video("/study-videos/cs146-avl.mp4"),
    D("H and B", "**H(node)** = edges down to the deepest leaf (leaf 0, **null −1**). **B(node) = H(left) − H(right)**. Balanced if B is −1, 0 or 1; **B > 1** left-heavy, **B < −1** right-heavy."),
    T(["Case", "Path from the unbalanced node to the new key", "Fix"], [
      ["**LL**", "left, left", "rightRotate(node)"],
      ["**LR**", "left, right (zig-zag)", "leftRotate(node.left), then rightRotate(node)"],
      ["**RR**", "right, right", "leftRotate(node)"],
      ["**RL**", "right, left (zig-zag)", "rightRotate(node.right), then leftRotate(node)"],
    ], title="Insert cases"),
    T(["", "insert", "delete"], [
      ["Rotation sets", "**at most 1**", "up to **O(log n)** (can cascade to the root)"],
      ["Case picked by", "where the new key went", "**B(y)** of the heavier child (LL if ≥ 0, LR if < 0)"],
      ["Time", "O(log n)", "O(log n)"],
    ], title="Insert vs delete"),
    E("HW 13 Problem 1: insert 15, 20, 25, 10, 8", "15, 20: fine\n25: 15 has B = −2, path right, right → RR: leftRotate(15), 20 on top\n10: no rotation; 15 now leans left by 1\n8: 15 has B = +2, path left, left → LL: rightRotate(15), 10 takes its place\nFinal: 20 (10 (8, 15), 25)", answer="RR, then LL; root 20"),
    TRAP("B is **left minus right** (left-heavy is positive), a missing child counts **−1**, and a zig-zag needs **two** rotations: one rotation just flips the problem to the other side.", "HW 13"),
    DEEPER("**Stuck?** The chapter steps through every height update and rotation.", [ch("H and B", L13, "balance"), ch("Rotations", L13, "rotations"), ch("Insert cases", L13, "insert"), ch("HW 13 worked", L13, "hw"), ch("Delete and cascading", L13, "delete"), yt("AVL insertion and rotations (Abdul Bari)", "jDM6_TnYIqE"), site("AVL visualizer (USFCA)", "https://www.cs.usfca.edu/~galles/visualization/AVLtree.html")]),
  ]},

  {"id": "compare", "heading": "The comparison tables (the highest-value page)", "blocks": [
    P("Half the conceptual questions are 'which one, and why?'. These two tables answer most of them."),
    T(["Sort", "Best", "Average", "Worst", "Extra space", "Stable", "In place", "One-line why"], [
      ["Insertion", "Ω(n)", "Θ(n²)", "O(n²)", "O(1)", "yes", "yes", "shifts each key left past bigger items"],
      ["Merge", "Θ(n log n)", "Θ(n log n)", "Θ(n log n)", "O(n)", "yes", "no", "log n levels × n work to merge"],
      ["Heap", "Θ(n log n)", "Θ(n log n)", "Θ(n log n)", "O(1)", "no", "yes", "n extracts × O(log n) each"],
      ["Quick", "Θ(n log n)", "Θ(n log n)", "**O(n²)**", "O(log n)", "no", "yes", "bad pivots (sorted input) split n into 0 and n − 1"],
      ["Counting", "Θ(n + k)", "Θ(n + k)", "Θ(n + k)", "O(n + k)", "yes", "no", "no comparisons: count values in [0, k]"],
      ["Radix", "Θ(d(n + b))", "Θ(d(n + b))", "Θ(d(n + b))", "O(n + b)", "yes", "no", "d stable passes, one per digit"],
      ["Bucket", "Θ(n)", "Θ(n) average", "O(n²)", "O(n)", "if inner is", "no", "even data → about 1 item per bucket"],
    ], title="Every sort"),
    T(["Structure", "search", "insert", "delete", "min / ordered walk", "Catch"], [
      ["Unsorted array", "O(n)", "O(1) at the end", "O(n)", "O(n)", "everything but append is slow"],
      ["Sorted array", "O(log n) binary search", "O(n) shifting", "O(n) shifting", "fast", "changes are slow"],
      ["Linked list", "O(n)", "O(1) at head", "O(1) once found", "O(n)", "no indexing"],
      ["Max-heap (PQ)", "O(n)", "O(log n)", "extract O(log n)", "max O(1)", "only the top is easy"],
      ["Hash table", "**O(1)** avg", "**O(1)** amortized", "**O(1)** avg", "O(n): no order", "bad hash → O(n)"],
      ["BST", "O(h)", "O(h)", "O(h)", "O(h), in order", "sorted input → h = n − 1"],
      ["AVL tree", "**O(log n)**", "**O(log n)**", "**O(log n)**", "O(log n), in order", "rotations to maintain"],
    ], title="Every structure"),
    THINK("**Picking, in one breath:** need lookup by key only → hash table. Need order (min, ranges, sorted walk) → balanced BST (AVL). Need 'give me the most urgent next' → heap. Sorting small integers → counting/radix. General sorting with a guarantee → merge sort (stable) or heap sort (in place); fastest in practice → quicksort with a random pivot."),
  ]},

  {"id": "night", "heading": "The night before: the traps, all in one list", "blocks": [
    P("Every trap from every chapter that has cost students points, in lecture order. Read it once the night before and once in the morning."),
    T(["Topic", "The trap"], [
      ["Linked list", "set X.next before B.next; dequeueing the last item also sets tail = null"],
      ["Invariants", "about the **prefix** handled so far, never the whole array"],
      ["Big-O", "log n is not a constant: O(n log n) stays O(n log n)"],
      ["Merge sort", "not in place: O(n) extra space"],
      ["Recurrences", "T(n−1) means n levels; T(n/2) means log n levels"],
      ["Master method", "a log gap isn't polynomial: 'does not apply'"],
      ["Heaps", "0-based: children 2i+1, 2i+2; buildHeap is O(n); heap sort isn't stable"],
      ["Quicksort", "partition returns i + 1; worst case n² on sorted input"],
      ["Linear sorts", "radix needs a stable inner sort; bucket's Θ(n) is only for even data"],
      ["Hash tables", "amortized ≠ every call; a bad hash makes search O(n)"],
      ["BSTs", "the rule is about whole subtrees; two-children delete = copy successor + delete it"],
      ["AVL", "B = left − right; null is −1; zig-zags need two rotations; delete can cascade"],
    ], title="The trap list"),
    WHY("**Why it matters** These are the exact slips Poon marks down on homework, and he writes the midterm from the same slides. Knowing the trap is often worth the whole question."),
    DEEPER("**Want a test run?** The mock exam and the Ready page use everything you've marked so far.", [ch("Practice paper (Lecture 14)", "14-midterm-review", "paper"), ch("Poon's practice list", "14-midterm-review", "practice"), ch("Start of Lecture 2", L2, "map")]),
  ]},
 ],
 "exercises": [
  MC("adt", "ADT", "Which sentence matches Poon's definition of an abstract data type?", ["A type defined by what it does, not how it's built", "A type built from an array", "Any type with more than one field", "A type that can't be instantiated"], 0,
     ["Yes: behavior, not implementation.", "That's one possible implementation, which is exactly what an ADT leaves out.", "Fields describe implementation.", "That's an abstract class in Java, a different idea."],
     "**Behavior, not implementation.**", "He asks for this sentence word for word.", ref="adts"),
  MC("invariant", "Invariant", "For insertion sort, the loop invariant is…", ["a[0..j−1] is sorted", "the whole array is sorted", "a[j] is the smallest item", "j < n"], 0,
     ["Yes: the prefix handled so far.", "That's only true at the end.", "Insertion sort doesn't select minimums.", "That's the loop condition, not an invariant about progress."],
     "**The prefix a[0..j−1] is sorted.**", "The most common lost point on invariants.", ref="invariants"),
  MC("theta", "Theta", "Summing all n elements of an array is…", ["Θ(n)", "Θ(1)", "Θ(log n)", "Θ(n²)"], 0,
     ["Yes: best and worst are both n, so Θ.", "You must touch every element.", "There's no halving.", "One pass, not nested."],
     "**Θ(n)**: Ω(n) and O(n) at once.", "Θ means best = worst.", ref="bigo"),
  MC("merge-space", "Merge sort space", "Why isn't merge sort in place?", ["merge writes into a temporary array of size n", "it uses recursion", "it compares pairs", "it's stable"], 0,
     ["Yes: O(n) extra space.", "Quicksort recurses too and is in place.", "All comparison sorts compare.", "Stability is unrelated to space."],
     "**The merge step needs an O(n) temporary array.**", "A classic 'compare the sorts' question.", ref="dc"),
  MC("master-1", "Master method", "T(n) = 8T(n/2) + n². What is the solution?", ["Θ(n³)", "Θ(n² log n)", "Θ(n²)", "does not apply"], 0,
     ["Yes: watershed n^(log₂ 8) = n³; n² is polynomially smaller, case 1.", "That would need f = n³ (a tie).", "f(n) loses here; the leaves win.", "It fits the shape with constants a = 8, b = 2."],
     "**Θ(n³)**, case 1: the leaves dominate.", "Compute the watershed first, always.", ref="master"),
  MC("master-no", "Does not apply", "T(n) = 2T(n/2) + n/log n. Master method?", ["does not apply: only a log gap", "case 1: Θ(n)", "case 2: Θ(n log n)", "case 3: Θ(n/log n)"], 0,
     ["Yes: n/log n is smaller than n, but not polynomially.", "Case 1 needs a polynomial gap.", "Case 2 needs f to equal the watershed.", "f is smaller, not bigger."],
     "**Does not apply**: the gap between n/log n and n is only a log factor.", "Poon grades 'does not apply because…' as full credit.", ref="master"),
  MC("buildheap", "buildHeap", "buildHeap on n items costs…", ["O(n)", "O(n log n)", "O(log n)", "O(n²)"], 0,
     ["Yes: most nodes are near the bottom and sink only a little.", "That's n separate inserts, the slow way.", "That's one heapify.", "Far too much."],
     "**O(n).**", "A favorite 'surprising runtime' question.", ref="heaps"),
  MC("quick-worst", "Quicksort worst case", "With the last item as pivot, quicksort's worst case happens on…", ["already sorted input", "random input", "input with all different values", "small arrays"], 0,
     ["Yes: every pivot is the max, splitting n into n − 1 and 0.", "Random input gives n log n on average.", "Distinct values don't matter.", "Size isn't the issue."],
     "**Sorted (or reverse-sorted) input**: Θ(n²).", "The fix: a random pivot.", ref="quicksort"),
  MC("radix-stable", "Radix sort", "Why must radix sort's inner sort be stable?", ["so the order from earlier digits survives", "so it runs in place", "so it's faster", "so it can handle negatives"], 0,
     ["Yes: ties on this digit must keep the order the last pass made.", "Stability isn't about space.", "Speed is the same.", "Unrelated."],
     "**To keep the earlier digits' order.** Unstable = wrong answers.", "Lecture 10's key idea.", ref="linear"),
  MC("hash-alpha", "Load factor", "A hash table with chaining has m = 8 slots and n = 6 keys. α is…", ["0.75", "1.33", "48", "6"], 0,
     ["Yes: α = n / m = 6 / 8.", "That's m / n, upside down.", "That's n × m.", "That's just n."],
     "**α = n / m = 0.75**, right at the resize limit.", "α is the average chain length.", ref="hash"),
  MC("bst-inorder", "In-order", "An in-order traversal of any BST gives the keys…", ["in sorted order", "in insertion order", "level by level", "in reverse order"], 0,
     ["Yes: left, node, right = smaller, this, bigger.", "Insertion order is lost once the tree is built.", "That's a breadth-first walk, not in-order.", "Reverse would be right, node, left."],
     "**Sorted.**", "A free check on any BST answer.", ref="bst"),
  MC("bst-sorted", "BST on sorted input", "Inserting 1, 2, 3, …, n into a plain BST makes search…", ["O(n): the tree is a chain", "O(log n)", "O(1)", "O(n log n)"], 0,
     ["Yes: every key goes right; h = n − 1.", "Only if it stayed balanced.", "Only a hash table promises that.", "Search is one path, never n log n."],
     "**O(n).** That's why AVL trees exist.", "The bridge from Lecture 12 to 13.", ref="bst"),
  MC("avl-case", "AVL case", "Insert 10, 30, 20 into an empty AVL tree. Which case?", ["RL", "RR", "LR", "LL"], 0,
     ["Yes: from 10 the path to 20 goes right (30), then left.", "RR would be 10, 20, 30.", "LR starts by going left.", "LL is two left steps."],
     "**RL**: rightRotate(30), then leftRotate(10). 20 ends on top.", "Name the two steps from the unbalanced node.", ref="avl"),
  MC("avl-delete", "AVL delete", "Why can an AVL delete need several rotation sets?", ["a rotation can shrink the subtree, unbalancing nodes above", "deletes always remove two nodes", "the successor must be rotated", "it rebuilds the tree"], 0,
     ["Yes: the height loss travels up, possibly to the root.", "A delete removes one node.", "The successor is just copied up.", "Nothing is rebuilt."],
     "**The height loss can cascade upward**, so up to O(log n) rotation sets.", "Insert needs at most one.", ref="avl"),
 ],
}

for e in g["exercises"]:
    if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
gb.build(g)
