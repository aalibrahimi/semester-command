"""CS 146 Lecture 14, Midterm Review: every question on Poon's review slides,
answered and explained, in his order, plus his own list of practice-problem
types mapped to the app, and a practice paper in the real exam's shape
(about 10 short answers and 5 detailed ones).

Source: "Lecture 14_ Midterm Review.pdf" (Canvas file 89210079, Oct 7 2026).
Every trace and number shown is computed here or by the shared trace
engines, not typed: heapify after 14 -> 3, insert(19) into Poon's BST, the
two rotations of 10(1, 20(15)), the recursion-tree totals, the practice
paper's heap extract and AVL insert.
"""
from c146common import *  # noqa
from h15common import ROAD
from cs146_traces import TRACE, heapify_trace
from cs146_12_trace import insert_trace as bst_insert_trace, build as bst_build, inorder, preorder, postorder
from cs146_13_trace import INSERT_CODE, Tree, from_shape, frame, insert_trace as avl_insert_trace, left_rotate, levels, plain, right_rotate, build as avl_build
from cs146_12_trace import _T

L = lambda xs: ", ".join(map(str, xs))
C146 = 1629570


def ch(label, guide, sec):
    return {"label": label, "url": f"/study/cs146/{guide}?s={sec}", "kind": "chapter"}


def canvas(label, file_id):
    return {"label": label + " (Canvas)", "url": f"https://sjsu.instructure.com/courses/{C146}/files/{file_id}", "kind": "video"}


def DEEPER(md, links):
    return {"type": "prose", "md": md, "resources": links}


# Poon's videos, uploaded to Canvas Files on Oct 8 with the review.
V_BIGO, V_MERGE, V_MSORT, V_INS = 89211000, 89211345, 89211678, 89211807
V_PSTUD, V_PARR, V_QUICK, V_HEAP = 89211879, 89211934, 89211995, 89212093
V_SUCC9, V_SUCC13, V_BSTINS = 89212217, 89212258, 89212360

L2, L0, L3Z, L4 = "2-adts-invariants-insertion", "0-notation", "3-from-zero", "4-big-o-merge-sort"
L6, L7, L8, L9, L10 = "6-recurrences", "7-master-method", "8-heaps-heapsort-pq", "9-quicksort", "10-linear-sorts"
L11, L12, L13 = "11-hash-tables", "12-binary-search-trees", "13-avl-trees"


# ── computed facts ─────────────────────────────────────────────────────────

# Slide 18: is 2n^3 + 12 = O(n^3)? c = 3 -> 12 <= n^3 -> n0 = 3.
N0_SLIDE = next(n for n in range(1, 100) if 2 * n**3 + 12 <= 3 * n**3)
assert N0_SLIDE == 3
# Practice: 4n^2 + 50 = O(n^2) with c = 5 -> 50 <= n^2 -> n0 = 8.
N0_PRACTICE = next(n for n in range(1, 100) if 4 * n * n + 50 <= 5 * n * n)
assert N0_PRACTICE == 8

# Slides 33 to 36: T(n) = 3T(n/3) + c. Rows cost c, 3c, 9c, ...; log3 n + 1 rows.
def tree3_total(n):
    rows, size, calls = 0, n, 1
    total = 0
    while size >= 1:
        total += calls
        rows += 1
        if size == 1:
            break
        size //= 3
        calls *= 3
    return rows, total


for m in range(1, 7):
    n = 3**m
    rows, total = tree3_total(n)
    assert rows == m + 1 and total == (3 * n - 1) // 2

# Slide 47 to 50: CLRS heap with 14 -> 3 at index 1, then heapify(a, 1).
HEAP = [16, 14, 10, 8, 7, 9, 3, 2, 4, 1]
HEAP_CHANGED = list(HEAP)
HEAP_CHANGED[1] = 3
HEAPIFY_PAIR = heapify_trace(HEAP_CHANGED, 1)
HEAP_AFTER = HEAPIFY_PAIR[0][-1]["a"]
assert HEAP_AFTER == [16, 8, 10, 4, 7, 9, 3, 2, 3, 1]

# Slide 60 to 63: traversals of 10(5(3, 7), 15).
SMALL = bst_build([10, 5, 15, 3, 7])
IN, PRE, POST = inorder(SMALL), preorder(SMALL), postorder(SMALL)
assert (IN, PRE, POST) == ([3, 5, 7, 10, 15], [10, 5, 3, 7, 15], [3, 7, 5, 15, 10])

# Slide 66: insert 19 into Poon's BST.
INS19_PAIR, INS19_T = bst_insert_trace(19)

# Slides 71 to 72: rotations of 10(1, 20(15)).
ROT_SPEC = (10, 1, (20, 15, None))


def rotation_frames():
    before = from_shape(ROT_SPEC)
    fr = [frame(before, "The slide's tree: 10 on top, 1 on the left, 20 on the right, and 15 under 20 on the left. Two separate questions: what does rightRotate(10) give, and what does leftRotate(10) give?", hl=[10], b_for=set())]
    fr.append(frame(before, "**rightRotate(10).** x = 10, y = x.left = 1. temp = y.right = nothing (1 has no right child).", hl=[10, 1], b_for=set()))
    r = right_rotate(from_shape(ROT_SPEC))
    fr.append(frame(r, "y.right = x and x.left = temp: 1 goes on top, 10 becomes 1's right child, and 10's left (it was 1) becomes temp, which is empty. The tree leans even further right now. That's fine: the question only asks for the shape.", hl=[1], done=[10], b_for=set()))
    fr.append(frame(before, "**leftRotate(10)** (on the ORIGINAL tree). x = 10, y = x.right = 20. temp = y.left = 15: the middle piece that changes parents.", hl=[10, 20], path=[15], b_for=set()))
    lft = left_rotate(from_shape(ROT_SPEC))
    fr.append(frame(lft, "y.left = x and x.right = temp: 20 goes on top, 10 becomes 20's left child, and 15 moves over to be 10's RIGHT child. 15 is still between 10 and 20, so the BST order holds.", hl=[20], done=[15], b_for=set()))
    fr.append(frame(lft, f"Check either answer with an in-order walk: both rotations keep it {L([1, 10, 15, 20])}. A rotation never changes the sorted order, only who is on top.", b_for=set()))
    return fr


ROT_FRAMES = rotation_frames()
assert plain(right_rotate(from_shape(ROT_SPEC))) == {"k": 1, "l": None, "r": {"k": 10, "l": None, "r": {"k": 20, "l": {"k": 15, "l": None, "r": None}, "r": None}}}
assert plain(left_rotate(from_shape(ROT_SPEC)))["k"] == 20

# Practice paper: extract from a max-heap, AVL inserts.
PAPER_HEAP = [20, 18, 15, 9, 12, 10, 7, 2]
_ex = extract_frames(PAPER_HEAP)
PAPER_HEAP_AFTER = _ex[-1]["a"]
assert PAPER_HEAP_AFTER == [18, 12, 15, 9, 2, 10, 7]

PAPER_AVL = [10, 20, 30, 25, 28]
_tree, _tr, PAPER_CASES = Tree(), _T(), []
for _i, _k in enumerate(PAPER_AVL):
    _, _c = avl_insert_trace(_tree, _k, _tr, brief=_i >= 3)
    PAPER_CASES.append(_c)
PAPER_AVL_PAIR = _tr.out(INSERT_CODE)
assert PAPER_CASES == [None, None, "RR", None, "LR"]
PAPER_AVL_LEVELS = levels(avl_build(PAPER_AVL))
assert plain(avl_build(PAPER_AVL)) == {"k": 20, "l": {"k": 10, "l": None, "r": None}, "r": {"k": 28, "l": {"k": 25, "l": None, "r": None}, "r": {"k": 30, "l": None, "r": None}}}


g = {
 "id": "cs146/14-midterm-review",
 "course": "cs146",
 "lessons": "Lecture 14",
 "title": "Poon's midterm review, every question answered",
 "summary": "Lecture 14 is Poon's own list of what the midterm looks like. This chapter goes through it slide by slide in his order: every '?' on his slides filled in, with the reason behind each answer, the traces animated, his list of practice-problem types turned into links to the app's drills, and a practice paper shaped like the real exam (about 10 short answers and 5 detailed ones).",
 "estimatedMinutes": 150,
 "sourceNote": "Poon's Lecture 14 Midterm Review slides (Canvas, Oct 7 2026), and the videos he posted to Canvas Files on Oct 8. Answers and reasons are checked against this app's Lecture 2 to 13 chapters; every trace is computed by the same engines.",
 "requires": [],
 "sections": [
  {"id": "map", "heading": "The exam, in Poon's words", "blocks": [
    P("This is the review lecture Poon gave on Wed Oct 7. Every slide that ended in a **'?'** is a question he expects you to answer; this chapter answers all of them, **in his order**, and says **why** each answer is true. If you only have time for one thing before Monday, do this chapter.", slide="What this is"),
    T(["", "From his slides"], [
      ["When", "**Mon Oct 12**, in your normal lecture slot, the full **75 minutes**. Late arrivals still stop at the end of the period."],
      ["Shape", "about **10 short answers** and about **5 detailed answers**, printed front **and back**"],
      ["Covers", "**every lecture to date** (Lectures 1 to 13)"],
      ["Bring", "your **SJSU Tower Card** (visible on the desk) and a pen or pencil"],
      ["Not allowed", "notes, **scratch paper**, the book, any device, **watches** (he shows the time)"],
      ["Grading", "**partial credit** is possible, so always write your steps"],
      ["Given to you", "only the **three master-method cases** (Lecture 7 slide 35: 'Given on Midterm and Final'). Not regularity, not the 'does not apply' list, not any runtime"],
    ], title="Midterm logistics (slide 5)"),
    THINK("**What he says the questions test (slide 6).** 'Hard', but almost everything comes straight from his lectures. Two kinds of knowledge: **how things work** (the mechanics: trace it on a small array or tree) and **why things work** (the principle: why is buildHeap O(n)? why does radix need a stable sort?). Only a few questions ask you to apply an idea to something new. You'll read or write **a little** code."),
    ROAD("His agenda, which is this chapter's order", [
      ("Structures", "list, stack, queue runtimes", "Lecture 2", "brand"),
      ("Correctness & speed", "loop invariants, Big-O proofs, the growth table", "Lectures 3 to 4", "brand"),
      ("Sorting", "the big sorting table", "Lectures 3 to 10", "green"),
      ("Recurrences", "read, substitute, draw the tree, master method", "Lectures 6 to 7", "green"),
      ("Heaps & hashing", "heapify after a change, PQs, good hash functions", "Lectures 8, 11", "amber"),
      ("Trees", "BST traversals, insert, runtimes; AVL rotations", "Lectures 12 to 13", "red"),
    ], "Lecture 14's agenda (slide 7), grouped.", eyebrow="Review map"),
    T(["Day", "What to do", "Time"], [
      ["**Thu Oct 8**", "Sections 1 to 5 here (structures to recurrences). Do the drills under each one.", "about 90 min"],
      ["**Fri Oct 9**", "Sections 6 to 10 here (master method to AVL), with drills. Then the **short answers** in the practice paper from memory.", "2 to 3 hours"],
      ["**Sat Oct 10** (work)", "Breaks only: **Recall** on your phone or laptop, 10 to 15 cards at a time. Redo your missed Explain-it attempts from the highlights icon.", "30 to 45 min"],
      ["**Sun Oct 11** (work)", "Evening: the **mock exam** (15 questions, 75 minutes, like the real one), then the **Mistakes** page. Then the 5 **detailed** questions on paper, no peeking.", "about 2 hours"],
      ["**Mon Oct 12**", "Before class: the crash course's **night-before trap list** (10 min). Tower Card, pencil, no watch.", "15 min"],
    ], title="Thursday to Monday, around your weekend shifts"),
    DEEPER("**Want the condensed version of every lecture?** The crash course is one page per topic; this chapter is Poon's own questions.", [ch("Midterm crash course", "midterm-crash-course", "start"), ch("Every sort, every structure", "midterm-crash-course", "compare"), ch("The trap list", "midterm-crash-course", "night")]),
  ]},

  {"id": "structures", "heading": "1. List, stack and queue runtimes (slides 9 to 14)", "blocks": [
    P("Poon asks the **worst-case** runtime of every operation, for **two** builds of each ADT. Don't memorize the grid: each answer has a one-line reason, and the reason is what gets you the points on a variation.", slide="The question"),
    T(["List", "Array", "Linked list", "Why"], [
      ["get(i)", "**O(1)**", "**O(n)**", "array: jump straight to slot i. Linked list: no index, walk from head i steps"],
      ["add", "**O(n)**", "**O(1)** at head/tail · O(n) by index", "array: adding at the front shifts every item right (or the array is full and must be copied). Linked list: relink two pointers, but finding index i first is a walk"],
      ["remove", "**O(n)**", "**O(1)** at head / known node · O(n) by index or value", "array: shift everything left to close the gap. Linked list: relink, once you're there"],
      ["size", "**O(1)**", "**O(1)**", "both keep a counter; nobody counts items"],
    ], title="Lists (slide 10)"),
    T(["Stack", "Array", "Linked list", "Why"], [
      ["push", "**O(1) amortized** · O(n) on resize", "**O(1)**", "array: write at top, except when full: copy everything into an array twice as big. That rare O(n) averages out to O(1)"],
      ["pop / peek", "**O(1)**", "**O(1)**", "the top is always the last filled index (array) or head (list)"],
      ["size", "**O(1)**", "**O(1)**", "a counter"],
    ], title="Stacks (slide 12)"),
    T(["Queue", "Circular array", "Linked list", "Why"], [
      ["enqueue", "**O(1) amortized** · O(n) on resize", "**O(1)**", "write at tail; the array resize is the same story as the stack"],
      ["dequeue", "**O(1)**", "**O(1)**", "move the **head index** forward instead of shifting everything left: that's the whole point of 'circular'"],
      ["peek / size", "**O(1)**", "**O(1)**", "read a[head]; a counter"],
    ], title="Queues (slide 14)"),
    D("Amortized", "The **average cost per operation over a long run**, when most calls are cheap and a rare one is expensive. n pushes cost n writes plus copies of 1 + 2 + 4 + … < 2n items, so about 3n total: **O(1) each, amortized**."),
    TRAP("Writing just 'O(1)' for an array push. Poon's answer is **'O(1) amortized, O(n) for resize'**: say both.", "Slide 12"),
    C("Why is dequeue O(1) on a circular array, when removing the front of a normal array is O(n)?", "Nothing shifts: the head index moves forward one slot (wrapping around at the end)."),
    C("Linked list add at the tail is O(1). What does the list need for that to be true?", "A **tail pointer**. Without it you'd walk from head: O(n)."),
    DEEPER("**Stuck?** The Lecture 2 chapter animates every push, pop and wrap-around.", [ch("Stack", L2, "stack"), ch("Circular queue", L2, "queue"), ch("Linked list", L2, "linked")]),
  ]},

  {"id": "invariant", "heading": "2. Write a loop invariant (slide 16)", "blocks": [
    P("His practice problem, word for word in spirit: **write a loop invariant that holds before the loop condition is checked**, then prove it with the three parts.", slide="The question"),
    E("The code (slide 16)", "public int power(int a, int p) {\n    int result = 1;\n    for (int i = 0; i < p; i++) {\n        result = result * a;\n    }\n    return result;\n}", answer="result = a^i"),
    D("The invariant", "**Before the loop condition is checked, result = aⁱ.** (After i trips through the loop, result has been multiplied by a exactly i times.)"),
    T(["Part", "What you write (Poon's answer)"], [
      ["**Initialization**", "Before the first iteration, i = 0 and result = 1. a⁰ = 1, so the invariant holds."],
      ["**Maintenance**", "Assume it holds at the start of an iteration: result = aᵏ (with i = k). The body does result = result · a = aᵏ · a = **aᵏ⁺¹**, and i becomes k + 1. So it holds for the next check."],
      ["**Termination**", "The loop stops when i = p. The invariant still holds at that final check, so result = **aᵖ**, which is what's returned. The algorithm is correct."],
    ], title="The three parts, filled in"),
    THINK("**How to find an invariant for any loop.** Ask: 'after i trips through the loop, what is true about the variable that builds the answer?' Write that with i in it. Then check: plug in i = 0 (should be the starting value) and i = the stopping value (should be the final answer). If both work, you have it."),
    TRAP("Writing the invariant with the **final** value (result = aᵖ). That's only true at the end. It has to mention **i**, so it's true in the middle too.", "Slide 16"),
    C("For `s = 0; for i in range(n): s += a[i]`, what is the invariant before each check?", "s = a[0] + a[1] + … + a[i − 1] (the sum of the first i items). i = 0 gives the empty sum 0; i = n gives the whole sum."),
    DEEPER("**Stuck?** Lecture 3 from zero shows the invariant on the array at every check.", [ch("Loop invariants from zero", L3Z, "invariant"), ch("The three parts", L2, "invariants"), canvas("Poon: insertion sort", V_INS)]),
  ]},

  {"id": "bigo", "heading": "3. Prove a Big-O, and the growth table (slides 18 to 19)", "blocks": [
    D("Big-O (slide 18)", "f(n) = O(g(n)) if there exist positive constants **c** and **n₀** such that **0 ≤ f(n) ≤ c · g(n) for all n ≥ n₀**."),
    E("Slide 18: is 2n³ + 12 = O(n³)?", f"1. Pick c a little bigger than the leading coefficient: **c = 3**.\n2. Substitute: is 2n³ + 12 ≤ 3n³ ?\n3. Simplify (subtract 2n³): is 12 ≤ n³ ?\n4. Find where that starts: 2³ = 8 is too small, 3³ = 27 ≥ 12. So **n₀ = {N0_SLIDE}**.\n5. Conclude: with c = 3 and n₀ = 3, 2n³ + 12 ≤ 3n³ for all n ≥ 3. **Yes, 2n³ + 12 = O(n³).**", answer=f"c = 3, n₀ = {N0_SLIDE}"),
    THINK("**The recipe, every time:** (1) c = leading coefficient + 1, (2) substitute, (3) cancel the big term so only the leftovers remain, (4) find the first n where it's true: that's n₀, (5) say 'for all n ≥ n₀'. Any c and n₀ that work are correct; you don't need the smallest."),
    P("**Ω and Θ the same way.** For a floor, drop the small terms: 2n³ + 12 ≥ 2n³ for all n ≥ 1, so it's **Ω(n³)** with c = 2, n₀ = 1. Ceiling and floor are both n³, so it's **Θ(n³)**."),
    T(["Big-O", "Name", "What causes it", "Poon's example"], [
      ["O(1)", "constant", "no loop over the input", "array access by index"],
      ["O(log n)", "logarithmic", "repeatedly **halving** the problem", "binary search"],
      ["O(n)", "linear", "one pass over the input", "searching an unsorted array"],
      ["O(n log n)", "linearithmic", "halving, with a full pass per level", "merge sort (worst case)"],
      ["O(n²)", "quadratic", "nested loops", "insertion sort (worst case)"],
      ["O(2ⁿ)", "exponential", "doubles with each extra element", "naive recursive Fibonacci; traveling salesman"],
    ], title="His growth table (slide 19), fastest to slowest"),
    TRAP("Stopping at 'c = 3 works' without **n₀**. The definition needs both constants, and 'for all n ≥ n₀'. Missing either costs points.", "Slide 18"),
    C(f"Prove 4n² + 50 = O(n²): give c and n₀.", f"c = 5: 4n² + 50 ≤ 5n² ⇔ 50 ≤ n². 7² = 49 is too small, 8² = 64 works: **n₀ = {N0_PRACTICE}**."),
    DEEPER("**Stuck?** Lecture 3 from zero draws the ceiling, the floor and n₀.", [ch("O, Ω, Θ from zero", L3Z, "family"), ch("Big-O in plain words", L4, "bigo"), ch("log n vs n log n", L3Z, "logs"), canvas("Poon: Big-O", V_BIGO)]),
  ]},

  {"id": "sorts", "heading": "4. The sorting table (slide 21)", "blocks": [
    P("He put this table on the review on purpose: expect at least one 'which sort, and why' question. Learn the **why** column; the runtimes follow from it.", slide="The question"),
    T(["Algorithm", "Worst", "Best", "Avg", "His use", "Why (say this)"], [
      ["Insertion", "O(n²)", "O(n)", "O(n²)", "small or nearly-sorted arrays", "sorted input: each key compares once. Reversed: each key slides past everything"],
      ["Merge sort", "O(n log n)", "O(n log n)", "O(n log n)", "stable, divide and conquer", "log n levels of halving × n work to merge each level, whatever the input"],
      ["Heap sort", "O(n log n)", "O(n log n)", "O(n log n)", "in place, using a heap", "buildHeap O(n), then n extracts × O(log n)"],
      ["Quicksort", "**O(n²)**", "O(n log n)", "O(n log n)", "usually fastest; divide and conquer", "bad pivots (sorted input, last-item pivot) split n into n − 1 and 0"],
      ["Counting", "O(n + k)", "O(n + k)", "O(n + k)", "small range of values", "one pass to count, one over the k possible values, one to place"],
      ["Radix", "O(nk)", "O(nk)", "O(nk)", "sorts by digit position", "k digits → k stable counting-sort passes of n items"],
      ["Bucket", "O(n²)", "O(n)", "O(n + k)", "uniformly spread data", "even data: about 1 item per bucket. All in one bucket: insertion sort on n items"],
    ], title="Poon's sorting table"),
    P("**Two letter clashes to watch.** In counting sort, **k** is the largest value. In his radix row, **k** is the number of **digits** (the crash course writes it d). In bucket sort, **k** is the number of buckets. Say which one you mean."),
    T(["Question", "Answer"], [
      ["Which are in place?", "insertion, heap sort, quicksort"],
      ["Which are stable?", "insertion, merge, counting, radix (bucket if its inner sort is)"],
      ["Which beat n log n, and how?", "counting, radix, bucket: they look at the **values**, not just compare pairs"],
      ["Which is O(n log n) no matter what?", "merge sort and heap sort"],
    ], title="The four follow-ups he asks"),
    TRAP("Saying quicksort is O(n log n) without 'average'. Its **worst** case is O(n²), and Poon asks for worst cases by default.", "Slide 21"),
    C("Why is insertion sort good for nearly-sorted arrays?", "Each key only slides past the few items out of place, so it's close to its O(n) best case."),
    DEEPER("**Stuck?** Poon's own videos for each sort, and the chapters.", [canvas("Poon: insertion sort", V_INS), canvas("Poon: merge", V_MERGE), canvas("Poon: merge sort", V_MSORT), canvas("Poon: heap sort", V_HEAP), canvas("Poon: partitioning students", V_PSTUD), canvas("Poon: partitioning an array", V_PARR), canvas("Poon: quicksort", V_QUICK), ch("Linear-time sorts", L10, "choose")]),
  ]},

  {"id": "recurrences", "heading": "5. Recurrences: read, substitute, draw the tree (slides 23 to 36)", "blocks": [
    P("Three skills, each one a likely detailed question: say a recurrence **in English**, prove a guess by **substitution**, and add up a **recursion tree** with the table.", slide="The question"),
    T(["Recurrence", "In English (Poon's wording)"], [
      ["T(n) = 2T(n/2)", "runtime for 1 problem of size n = runtime for **2** problems of size **n/2**"],
      ["T(n) = 3T(n/5) + 17", "= runtime for 3 problems of size n/5, **plus 17 operations**"],
      ["T(n) = 3T(n/5) + 4n", "= runtime for 3 problems of size n/5, plus **4n** operations"],
      ["T(n) = 2T(n/2) + O(n)", "= runtime for 2 problems of size n/2, plus **O(n)** operations (merge sort)"],
    ], title="Read it out loud (slides 23 to 24)"),
    E("Substitution: T(n) = T(n − 1) + n is O(n²) (slide 26)", "1. **Guess** O(n²): show T(n) ≤ cn² for all n ≥ n₀.\n2. **Assume** it holds for n − 1: T(n − 1) ≤ c(n − 1)².\n3. **Substitute** into the recurrence:\n   T(n) = T(n − 1) + n\n        ≤ c(n − 1)² + n\n        = c(n² − 2n + 1) + n\n        = cn² − 2cn + c + n\n        = cn² − (2c − 1)n + c\n4. **Prove** that's ≤ cn²: need −(2c − 1)n + c ≤ 0, i.e. (1 − 2c)n + c ≤ 0.\n   (1 − 2c) must be negative. Pick **c = 1**: −n + 1 ≤ 0, true for all n ≥ 1. **n₀ = 1.** QED.", answer="c = 1, n₀ = 1"),
    TRAP("Step 2 on his slide is printed as T(n − 1) ≤ (n − 1)², without the c. Write it **with the c**: c(n − 1)². Step 3 uses it.", "Slide 26"),
    T(["Level", "# nodes", "Size per node", "Work per node", "Total at this level"], [
      ["0", "1", "n", "kn", "kn"],
      ["1", "2", "n/2", "kn/2", "kn"],
      ["2", "4", "n/4", "kn/4", "kn"],
      ["3", "8", "n/8", "kn/8", "kn"],
      ["i", "2ⁱ", "n/2ⁱ", "kn/2ⁱ", "**kn**"],
    ], title="T(n) = 2T(n/2) + kn: fill out the table (slides 28 to 30)"),
    E("How many levels? (slide 31)", "The base case is size 1. Level k has size n/2ᵏ, so\nn/2ᵏ = 1 ⇒ n = 2ᵏ ⇒ log₂ n = k.\nThat's log₂ n levels **below** the root; **log₂ n + 1** including it.\nTotal = kn × (log₂ n + 1) = **O(n log n)**.", answer="O(n log n)"),
    T(["Level", "# nodes", "Size per node", "Total at this level"], [
      ["0", "1", "n", "c"], ["1", "3", "n/3", "3c"], ["2", "9", "n/9", "9c"], ["i", "3ⁱ", "n/3ⁱ", "**3ⁱ · c**"],
    ], title="T(n) = 3T(n/3) + c (slides 33 to 36)"),
    E("Add it up", "Levels: n/3ᵏ = 1 ⇒ k = log₃ n, so **log₃ n + 1** levels including the root.\nTotal = c(1 + 3 + 9 + … + 3ᵏ) = c(3ᵏ⁺¹ − 1)/2.\n3ᵏ = n, so 3ᵏ⁺¹ = 3n: total = **c(3n − 1)/2 = Θ(n)**.\nCheck n = 9: c + 3c + 9c = 13c, and (27 − 1)/2 = 13. ✓\nThe master method agrees: a = 3, b = 3, n^(log₃ 3) = n beats f(n) = c, case 1, Θ(n).", answer="Θ(n)"),
    THINK("**Why the rows differ.** In merge sort, nodes double and work halves, so every row is kn. Here nodes triple but each node's work stays c, so rows **grow** ×3 and the bottom row (n leaves) dominates. Which row dominates is exactly what the master method's three cases decide."),
    C("T(n) = T(n − 1) + 1 has how many levels, and what's the total?", "n levels (it subtracts 1, it doesn't halve), 1 work each: Θ(n)."),
    DEEPER("**Stuck?** The Lecture 6 chapter computes T(8) by hand before drawing any tree.", [ch("Read a recurrence", L6, "read"), ch("The recursion tree", L6, "tree"), ch("Substitution", L6, "substitution")]),
  ]},

  {"id": "master", "heading": "6. The master method, and when it doesn't apply (slides 39 to 43)", "blocks": [
    P("For **T(n) = aT(n/b) + f(n)**: compute **n^(log_b a)**, compare it with f(n), pick the case. Poon's three examples all use a = 4, b = 2, so n^(log₂ 4) = **n²**, and only f(n) changes.", slide="The question"),
    T(["f(n)", "Compared with n²", "Case", "T(n)"], [
      ["n", "polynomially **smaller**: n = O(n^(2 − ε)) with ε = 1", "1", "**Θ(n²)**"],
      ["n²", "**equal**: n² = Θ(n²)", "2", "**Θ(n² log n)**"],
      ["n³", "polynomially **larger**: n³ = Ω(n^(2 + ε)) with ε = 1, **and** regularity holds", "3", "**Θ(n³)**"],
    ], title="4T(n/2) + f(n), three ways (slides 39, 40, 43)"),
    D("Regularity condition (slide 42)", "**a·f(n/b) ≤ c·f(n)** for some constant **c < 1** and all large n. In words: the **next level's total work** (a calls, each doing f(n/b)) is at most a fraction of **this level's work**. The work shrinks geometrically going down, so the root's f(n) dominates."),
    E("Check regularity for 4T(n/2) + n³ (slide 43)", "a·f(n/b) = 4·(n/2)³ = 4·n³/8 = n³/2\nNeed n³/2 ≤ c·n³ ⇒ 1/2 ≤ c.\nPick **c = 1/2** (it's < 1). Regularity holds, so case 3: **Θ(n³)**.", answer="c = 1/2 works"),
    T(["Recurrence", "Why the master method does NOT apply"], [
      ["T(n) = nT(n/2) + n²", "**a = n is not a constant**"],
      ["T(n) = T(n − 1) + 1", "the subproblem size isn't **n/b**: it subtracts instead of divides"],
      ["T(n) = 2T(n/2) + n/log n", "n/log n is smaller than n, but only by a **log factor**, not polynomially: no ε > 0 makes n/log n = O(n^(1 − ε)). Not case 1, not case 2"],
      ["case 3 shape, regularity fails", "f is polynomially larger but the work doesn't shrink level by level"],
    ], title="'Give examples where the master method does not apply' (slides 41 to 42)"),
    THINK("**Why a log gap isn't enough.** Subtracting from the exponent (n^0.99) eventually beats dividing by log n, for any tiny ε. So n/log n sits **between** case 1 and case 2. Full-credit answer: '**does not apply**, because the gap is only logarithmic, not polynomial.'"),
    TRAP("Using case 3 without checking regularity. Poon shows the check on the slide, so he expects it in your answer.", "Slide 43"),
    C("T(n) = 9T(n/3) + n: which case and answer?", "n^(log₃ 9) = n². f = n is polynomially smaller (ε = 1): case 1, **Θ(n²)**."),
    DEEPER("**Stuck?** The master method chapter has a practice set with every case and failure.", [ch("The five moves", L7, "master"), ch("When it doesn't apply", L7, "limits"), ch("Practice set", L7, "practice")]),
  ]},

  {"id": "heaps", "heading": "7. Heaps: fill in the ?s, and what happens if 14 → 3 (slides 46 to 52)", "blocks": [
    T(["Fill in the ?", "Answer (0-based, Poon's)"], [
      ["left child of i", "**2i + 1**"], ["right child of i", "**2i + 2**"], ["parent of i", "**⌊(i − 1) / 2⌋**"],
    ], title="Slide 46"),
    E("The slide's heap", f"array: [{L(HEAP)}] (indexes 0 to 9)\nindex 1 holds 14: its children are at 3 (8) and 4 (7); its parent is at 0 (16).", answer="2i+1, 2i+2, ⌊(i−1)/2⌋"),
    P(f"**Slide 47's question: what happens if the 14 becomes a 3?** Now a[1] = 3 is smaller than its children, so the heap property breaks at index 1, and only there. The fix is **heapify(a, 1)**: let the 3 sink, swapping with the **larger** child each time."),
    TRACE("heapify(a, 1) after 14 → 3 (slides 48 to 50)", HEAPIFY_PAIR),
    E("The three steps, as you'd write them", f"heapify(a, 1): children 8 (index 3) and 7 (index 4). Max child 8 swaps with 3.\nheapify(a, 3): children 2 (index 7) and 4 (index 8). Max child 4 swaps with 3.\nheapify(a, 8): index 8 has no children (2·8 + 1 = 17 > 9). Base case, done.\nResult: [{L(HEAP_AFTER)}]", answer=f"[{L(HEAP_AFTER)}]"),
    T(["Operation", "Runtime", "Why"], [
      ["heapify", "**O(log n)**", "one value sinks down one path; the tree's height is log n"],
      ["buildHeap", "**O(n)**", "most nodes are near the bottom and sink only a level or two; the sum works out to < 2n"],
      ["heapSort", "**O(n log n)**", "n times: swap the root to the end, heapify(0)"],
      ["heapSort space", "**O(1)**", "it sorts inside the same array"],
      ["heapSort stability", "**not stable**", "swapping the root to the end jumps it over equal items"],
      ["PQ insert", "**O(log n)**", "add at the end, swap **up** past smaller parents"],
      ["PQ extract", "**O(log n)**", "take a[0], move the last item to 0, heapify(0)"],
      ["PQ isEmpty", "**O(1)**", "size == 0"],
    ], title="Slide 52, with the reasons"),
    TRAP("Swapping with the **first** child instead of the **larger** one. If you swap 3 with 7 instead of 8, then 7 is the parent of 8: still broken.", "Slide 48"),
    C("Why is buildHeap O(n) and not O(n log n), even though it calls heapify n/2 times?", "Most of those calls are on nodes near the bottom, which can sink only 0 or 1 levels. Only the root can sink log n."),
    DEEPER("**Stuck?** Poon's heap sort video and the Lecture 8 chapter.", [canvas("Poon: heap sort", V_HEAP), ch("Array as tree", L8, "array"), ch("heapify", L8, "heapify"), ch("buildHeap is O(n)", L8, "build"), ch("Priority queue", L8, "pq")]),
  ]},

  {"id": "hash", "heading": "8. Hash tables: a good hash function, and chaining runtimes (slides 54 to 56)", "blocks": [
    T(["A good hash function is…", "Meaning"], [
      ["**deterministic**", "the same key always gives the same slot (or you could never find it again)"],
      ["**fast to compute**", "hashing is done on every insert and search; a slow hash kills the O(1)"],
      ["**uniform**", "spreads keys evenly across all the slots, so chains stay short"],
    ], title="What makes a good hash function? (slide 54)"),
    D("Simple uniform hashing assumption (SUHA)", "**Every key is equally likely to land in any slot, independently of where the other keys went.** It's an assumption that makes the math work: with it, every chain has about the same length, α."),
    D("Load factor α", "**α = n / m**: elements in the table divided by slots. That's the **average chain length**."),
    T(["Operation", "Runtime", "Why"], [
      ["insert (most runs)", "**O(α) = O(1)**", "hash to the slot, add to that chain"],
      ["insert that triggers a resize", "**O(n)**", "when α gets too big, make a bigger table and re-insert everything"],
      ["insert, amortized", "**O(1)**", "resizes are rare: their cost spread over all inserts is constant"],
      ["delete", "**O(α) = O(1)**", "hash, walk that one chain"],
      ["search", "**O(α) = O(1)**", "hash, walk that one chain"],
    ], title="Chaining, assuming SUHA (slide 56)"),
    P("**Why is O(α) the same as O(1)?** Because the table resizes whenever α passes a limit, so α never grows with n. It stays below a constant (like 0.75)."),
    TRAP("Forgetting the assumption. Without SUHA (a bad hash function that sends everything to one slot), search is **O(n)**.", "Slide 55"),
    C("What does SUHA assume, in one sentence?", "Any key is equally likely to hash to any slot, independent of the other keys."),
    DEEPER("**Stuck?** Start from the librarian story in the Lecture 11 chapter.", [ch("The library analogy", L11, "library"), ch("Hash functions", L11, "hashing"), ch("Load factor and resizing", L11, "runtime")]),
  ]},

  {"id": "bst", "heading": "9. BSTs: why, traversals, insert, runtimes (slides 59 to 69)", "blocks": [
    T(["If hash tables are ~O(1), why BSTs?", ""], [
      ["**Range queries**", "'all products priced 20 to 50', 'orders between two dates'. A hash table has no order, so it scans everything: O(n)"],
      ["**Min / max**", "'cheapest product', 'latest review'. Hash table: full scan, O(n). BST: walk left (or right): O(h)"],
    ], title="Slide 59"),
    E("Traverse 10(5(3, 7), 15) (slides 60 to 63)", f"In-order   (left, node, right): {L(IN)}   ← sorted\nPre-order  (node, left, right): {L(PRE)}\nPost-order (left, right, node): {L(POST)}", answer=f"in {L(IN)} · pre {L(PRE)} · post {L(POST)}"),
    THINK("**A trick for traversals by hand.** Pre-order: write a node the **first** time you pass it going around the tree. In-order: when you pass **under** it. Post-order: the **last** time, on the way back up."),
    P("**Slide 66: where would we insert 19?** Walk down like a search: 19 > 15 go right, 19 > 18 go right, 19 < 20 go left, 20's left is empty: **19 becomes 20's left child**."),
    TRACE("insert(root, 19), line by line (slides 66 to 68)", INS19_PAIR),
    T(["Stage", "What happens (slide 67)"], [
      ["Going down", "recursion follows the BST rule until it hits **null**: the insertion point"],
      ["Base case", "make the new node, not linked yet, and **return a pointer to it**"],
      ["One level up", "the new node's **parent** gets that pointer and stores it in its left or right child: now it's linked"],
      ["All the way up", "every ancestor gets back its own unchanged child pointer and **blindly overwrites** it with the same value: no structural change"],
    ], title="insert relinks through the recursion"),
    T(["Operation", "Runtime", "Why"], [
      ["pre / in / post-order", "**O(n)**", "every node is visited exactly once"],
      ["search, insert, delete", "**O(h)**", "one path from the root down"],
      ["min, max", "**O(h)**", "keep going left (min) or right (max)"],
      ["successor", "**O(h)**", "down the right subtree, or one search from the root"],
    ], title="Runtime analysis (slide 69)"),
    P("**What's the worst case, and what causes it?** h can be **n − 1**: the tree is a **chain** (a linked list in disguise), and everything becomes **O(n)**. It happens when keys are inserted in **sorted (or reverse-sorted) order**: every new key goes to the same side. Balanced: h ≈ log n, everything **O(log n)**."),
    TRAP("Saying 'BST search is O(log n)'. It's **O(h)**: O(log n) only when the tree is balanced. That gap is exactly why AVL trees exist.", "Slide 69"),
    C("Why does an in-order walk of a BST come out sorted?", "Left subtree (all smaller), then the node, then the right subtree (all bigger), at every node."),
    DEEPER("**Stuck?** Poon's three videos from the slides, and the Lecture 12 chapter.", [canvas("Poon: successor of 9", V_SUCC9), canvas("Poon: successor of 13", V_SUCC13), canvas("Poon: BST insert", V_BSTINS), ch("Traversals", L12, "traversal"), ch("Insert", L12, "insert"), ch("Delete", L12, "delete")]),
  ]},

  {"id": "avl", "heading": "10. AVL trees: draw the rotations, fill in the strategy (slides 71 to 76)", "blocks": [
    ST("rightRotate(10) and leftRotate(10) on the slide's tree (slides 71 to 72)", ROT_FRAMES),
    E("Both answers", "rightRotate(10): 1 on top → 1 (right: 10 (right: 20 (left: 15)))\nleftRotate(10):  20 on top → 20 (left: 10 (left 1, right 15))\nThe rule: the child on the rotation's side comes up; the middle subtree (temp) changes parents.", answer="rightRotate → 1 on top · leftRotate → 20 on top"),
    T(["", "insert (slides 73 to 74)", "delete (slides 75 to 76)"], [
      ["Step 1: go **down**", "standard BST search, then insert the leaf: **O(log n)**", "standard BST delete: **O(log n)**"],
      ["Step 2: go back **up**", "for each node on the path: update **H = 1 + max(H(left), H(right))**, rebalance if needed", "same, using the deletion LL / LR / RR / RL cases"],
      ["Cost of step 2", "**O(1)** per node × **O(log n)** nodes", "**O(1)** per node × **O(log n)** nodes"],
      ["Total", "**O(log n)**", "**O(log n)**"],
    ], title="Fill in the ?s: insert and delete strategy"),
    P("**Why O(log n) is guaranteed:** the AVL rule (|B| ≤ 1 at every node) keeps the height at most about 1.44 log n, so 'one path down' is always short. A rotation is a few pointer changes: O(1)."),
    TRAP("Rotating the **wrong way**. rightRotate brings the **left** child up; leftRotate brings the **right** child up. Say it once before you draw.", "Slides 71 to 72"),
    C("After an AVL insert, at most how many rotation sets are needed? After a delete?", "Insert: at most one (single or double). Delete: up to O(log n), because a rotation can shorten a subtree and unbalance an ancestor."),
    DEEPER("**Stuck?** The Lecture 13 chapter steps through every height update.", [ch("Rotations", L13, "rotations"), ch("Insert cases", L13, "insert"), ch("Delete and cascading", L13, "delete"), ch("HW 13 worked", L13, "hw")]),
  ]},

  {"id": "practice", "heading": "Poon's practice list, turned into the app (slide 78)", "blocks": [
    P("On slide 78 Poon lists the practice problems he recommends asking an AI for. The app already has every one as a **drill** that makes a new problem each time and checks your answer. Each row below links straight to it.", slide="His list"),
    DEEPER("**1. The mechanics and principles of an algorithm** ('many short answers test deeper understanding, as well as memorization'). Do the checks in each section above and the **short answers** in the practice paper below.", [ch("Practice paper", "14-midterm-review", "paper"), ch("Crash course questions", "midterm-crash-course", "night")]),
    DEEPER("**2. Prove Big-O for different functions T(n).**", [ch("Big-O proofs (this chapter)", "14-midterm-review", "bigo"), ch("Find the constants (drill)", L0, "bigo")]),
    DEEPER("**3. Write and prove loop invariants.**", [ch("Invariant parts (drill)", L2, "invariants"), ch("Invariants from zero", L3Z, "invariant")]),
    DEEPER("**4. Apply the master method.**", [ch("Master case + watershed (drills)", L7, "master"), ch("Regularity (drill)", "14-midterm-review", "master"), ch("Practice set", L7, "practice")]),
    DEEPER("**5. Execute an algorithm: heapify, counting sort, quicksort, …**", [ch("heapify (drill)", L8, "heapify"), ch("counting sort (drill)", L10, "counting"), ch("partition (drill)", L9, "partition"), ch("insertion sort (drill)", L2, "insertion"), ch("merge (drill)", L4, "merge")]),
    DEEPER("**6. The runtime of an algorithm.**", [ch("Every sort, every structure", "midterm-crash-course", "compare"), ch("Quicksort cases (drill)", L9, "analysis"), ch("BST height (drill)", L12, "runtime")]),
    DEEPER("**7. Draw a recurrence tree and total its cost.**", [ch("Tree counts (drill)", L6, "tree"), ch("Tree levels (drill)", "14-midterm-review", "recurrences")]),
    DEEPER("**8. Trace insert and extract on a priority queue.**", [ch("extract (drill)", L8, "sort"), ch("PQ contract (drill)", L8, "pq")]),
    WHEN("**And the mock exam.** It mixes drills from every chapter, 15 questions in 75 minutes, like the real one. Take it once on Sunday, then work through the Mistakes page it fills."),
  ]},

  {"id": "paper", "heading": "Practice paper: 10 short, 5 detailed", "blocks": [
    P("The real exam's shape. **No notes, no scratch paper**: answer on the page, like Monday. Short answers first (one or two sentences each; flip each card when you've said your answer out loud), then the five **detailed** questions. They're the 'Do it yourself' boxes in sections 2 (invariant), 3 (Big-O proof), 6 (master method), 7 (heap extract) and 10 (AVL inserts). Write each one on paper before you open the solution.", slide="How to use it"),
    C("1. Worst-case runtime of get(i) on a linked list, and why?", "O(n): there's no index, so you walk from head i steps."),
    C("2. Array-based stack push: what's the runtime?", "O(1) amortized; O(n) on the push that triggers a resize (copy into a bigger array)."),
    C("3. Name the three parts of a loop invariant proof.", "Initialization, maintenance, termination."),
    C("4. Is heap sort stable? Why or why not?", "No: swapping the root to the end can jump it over an equal item."),
    C("5. What is the runtime of buildHeap?", "O(n): most nodes sit near the bottom and sink only a little."),
    C("6. Give two reasons to use a BST instead of a hash table.", "Range queries and min/max (anything needing order): a hash table must scan everything, O(n)."),
    C("7. What does the simple uniform hashing assumption assume?", "Any key is equally likely to hash to any slot, independently of the others."),
    C("8. Quicksort's worst case: runtime, and what input causes it (last-item pivot)?", "O(n²), on already sorted (or reverse-sorted) input."),
    C("9. Which comparison sorts are in place?", "Insertion sort, heap sort, quicksort. (Merge sort needs O(n) extra.)"),
    C("10. What does a plain BST look like in its worst case, and what causes it?", "A chain, height n − 1, so operations are O(n). Caused by inserting keys in sorted order."),
    WHY("**Why it matters** Poon gives partial credit, so on the detailed questions write **every step**, even when you're unsure of the last one. A clear table or trace with one slip still earns most of the points."),
  ]},
 ],
 "exercises": [
  EX("detailed-invariant", "Detailed 1: loop invariant", "Write a loop invariant that holds before the loop condition is checked, then prove the code correct with initialization, maintenance and termination.\n\nint sum(int[] a) {\n    int s = 0;\n    for (int i = 0; i < a.length; i++) {\n        s = s + a[i];\n    }\n    return s;\n}",
     ["Ask: after i trips through the loop, what does s hold?", "Check your sentence at i = 0 (s should be 0) and at i = a.length (s should be the answer).", "Maintenance: assume it at i = k, run the body once, show it for k + 1."],
     ["**Invariant:** before the loop condition is checked, s = a[0] + a[1] + … + a[i − 1] (the sum of the first i items).",
      "**Initialization:** before the first iteration i = 0 and s = 0, the sum of zero items. Holds.",
      "**Maintenance:** assume s = a[0] + … + a[k − 1] when i = k. The body does s = s + a[k], so s = a[0] + … + a[k], and i becomes k + 1. Holds for the next check.",
      "**Termination:** the loop stops when i = a.length = n. The invariant gives s = a[0] + … + a[n − 1], the sum of every item, which is returned. Correct."],
     "Same shape as Poon's power(a, p) example on slide 16.", ref="invariant"),
  EX("detailed-bigo", "Detailed 2: prove a Big-O", "Prove that 4n² + 50 = O(n²) using the formal definition. Give c and n₀.",
     ["Pick c one more than the leading coefficient.", "Cancel the 4n² from both sides.", "Find the first whole n where what's left is true."],
     ["Definition: f(n) = O(g(n)) if there are positive c, n₀ with 0 ≤ f(n) ≤ c·g(n) for all n ≥ n₀.",
      "Let **c = 5**. Is 4n² + 50 ≤ 5n²? Subtract 4n²: is 50 ≤ n²?",
      f"7² = 49 < 50, 8² = 64 ≥ 50, so **n₀ = {N0_PRACTICE}**.",
      f"With c = 5 and n₀ = {N0_PRACTICE}, 4n² + 50 ≤ 5n² for all n ≥ {N0_PRACTICE}. So 4n² + 50 = O(n²)."],
     "Slide 18's recipe. Any working c and n₀ get full credit.", ref="bigo"),
  EX("detailed-master", "Detailed 3: master method, three times", "Solve each with the master method, or say why it doesn't apply.\n(a) T(n) = 9T(n/3) + n\n(b) T(n) = 2T(n/2) + n\n(c) T(n) = 2T(n/2) + n²\n(d) T(n) = 2T(n/2) + n/log n",
     ["Compute n^(log_b a) first for each.", "(c) is case 3: check regularity, a·f(n/b) ≤ c·f(n) with c < 1.", "(d): is the gap polynomial?"],
     ["(a) a = 9, b = 3: n^(log₃ 9) = n². f = n is polynomially smaller (ε = 1). Case 1: **Θ(n²)**.",
      "(b) a = 2, b = 2: n^(log₂ 2) = n. f = n is equal. Case 2: **Θ(n log n)**.",
      "(c) n^(log₂ 2) = n. f = n² is polynomially larger (ε = 1). Regularity: 2·(n/2)² = n²/2 ≤ c·n² with c = 1/2 < 1. Holds. Case 3: **Θ(n²)**.",
      "(d) n^(log₂ 2) = n. n/log n is smaller than n only by a log factor, not polynomially. **The master method does not apply.**"],
     "Poon's slides 39 to 43 in one question.", ref="master"),
  EX("detailed-heap", "Detailed 4: extract from a max-heap", f"A max-heap is stored as [{L(PAPER_HEAP)}] (0-based). Trace one extract(): what does it return, and what is the array afterwards? Show each swap.",
     ["The answer is the root. Then move the LAST item to index 0.", "Sink it: swap with the LARGER child each time.", "Children of i are 2i + 1 and 2i + 2, and the heap is one item shorter now."],
     [f"Return a[0] = **{PAPER_HEAP[0]}**. Move the last item (2) to index 0; the heap is now 7 items: [2, 18, 15, 9, 12, 10, 7].",
      "heapify(0): children 18 (index 1) and 15 (index 2). Larger is 18: swap → [18, 2, 15, 9, 12, 10, 7].",
      "heapify(1): children 9 (index 3) and 12 (index 4). Larger is 12: swap → [18, 12, 15, 9, 2, 10, 7].",
      "heapify(4): children would be 9 and 10, past the end (size 7). Done.",
      f"Result: **[{L(PAPER_HEAP_AFTER)}]**. O(log n): at most one swap per level."],
     "Slide 78's 'trace insert and extract on a priority queue'.", ref="heaps"),
  EX("detailed-avl", "Detailed 5: AVL inserts", f"Insert {L(PAPER_AVL)} in that order into an empty AVL tree. Name every rotation case and draw the final tree.",
     ["After each insert, go back up and compute B = H(left) − H(right) at each node.", "The case is the two steps from the unbalanced node toward the new key.", "A zig-zag (LR or RL) needs two rotations."],
     ["10, 20: no problem.",
      "30: at 10, B = −1 − 1 = −2. Path right, right: **RR** → leftRotate(10). Tree: 20 (10, 30).",
      "25: goes 20 → 30 → left of 30. Every |B| ≤ 1. No rotation.",
      "28: goes 20 → 30 → 25 → right of 25. At 30, B = 1 − (−1) = **+2**. Path from 30: left (25), then right (28): **LR** → leftRotate(25), then rightRotate(30). 28 comes up with 25 and 30 as its children.",
      "Final: **20 (10, 28 (25, 30))**. " + " · ".join(PAPER_AVL_LEVELS.split("\n"))],
     "Slide 74's strategy, and the HW 13 shape.", ref="avl"),
  MC("regularity-meaning", "Regularity, in words", "What does the regularity condition a·f(n/b) ≤ c·f(n), c < 1, guarantee?", ["The work shrinks by a constant fraction at each level down, so the root dominates", "The tree has log n levels", "f(n) is a polynomial", "The leaves do most of the work"], 0,
     ["Yes: next level's total ≤ a fraction of this level's.", "That's from b, not regularity.", "It doesn't need to be.", "That's case 1, the opposite."],
     "**Geometric decay**: each level does at most c < 1 times the work of the one above.", "Slide 42's three bullets.", ref="master"),
  MC("why-bst", "Why BSTs", "Which task is O(n) with a hash table but O(h) with a BST?", ["Finding the minimum key", "Looking up one key", "Inserting a key", "Deleting a known key"], 0,
     ["Yes: a hash table has no order, so it scans every key.", "Hash lookup is O(1) on average.", "Hash insert is O(1) amortized.", "Hash delete is O(1) on average."],
     "**Min/max and range queries**: the hash table has no order.", "Slide 59.", ref="bst"),
 ],
}

for e in g["exercises"]:
    if isinstance(e.get("solution"), str):
        e["solution"] = [e["solution"]]
gb.build(g)
