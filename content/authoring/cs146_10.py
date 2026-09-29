"""CS 146 · Lecture 10: Linear-time sorts (bucket, counting, radix), from zero."""
from c146common import *  # noqa
from h15common import CMP, CARDS, ROAD
from cs146_10_figs import fig_boxes, fig_seats
from cs146_traces import TRACE, bucket_trace, counting_trace, radix_trace

# ── HW 10 answers, computed rather than typed ──────────────────────────────
HW_A, HW_K = [6, 0, 2, 0, 1, 3, 4, 6, 1, 3, 2], 6
_c = [HW_A.count(v) for v in range(HW_K + 1)]
_cum = [sum(_c[: v + 1]) for v in range(HW_K + 1)]
_sorted = sorted(HW_A)
_B, _C = [None] * len(HW_A), list(_cum)
_last3 = []
for j in range(len(HW_A) - 1, len(HW_A) - 4, -1):
    x = HW_A[j]
    _B[_C[x] - 1] = x
    _last3.append(f"j = {j}: A[{j}] = {x}, seat C[{x}] − 1 = {_C[x] - 1}, so B[{_C[x] - 1}] = {x}; C[{x}] becomes {_C[x] - 1}. B = [{', '.join('_' if b is None else str(b) for b in _B)}]")
    _C[x] -= 1

RADIX_HW = [170, 45, 75, 90, 2, 802, 24, 66]
_passes = []
_r = list(RADIX_HW)
for p in range(3):
    _r = sorted(_r, key=lambda x: (x // 10 ** p) % 10)
    _passes.append(", ".join(str(x).zfill(3) for x in _r))


def L(xs):
    return "[" + ", ".join(map(str, xs)) + "]"


g = {
 "id": "cs146/10-linear-sorts",
 "course": "cs146",
 "lessons": "Lecture 10",
 "title": "Linear-time sorts: bucket, counting and radix sort",
 "summary": "Why comparison sorts can't beat n log n, and how three sorts beat it anyway by opening the boxes: bucket sort for evenly spread numbers, counting sort for small integer ranges (with the cumulative count and the backwards pass that keeps it stable), and radix sort digit by digit. Trace each one and pick the right one for a situation.",
 "estimatedMinutes": 70,
 "sourceNote": "Lecture 10 'Linear Time Sorts' (Wed Sep 23) slides and HW 10, CLRS 8.1 to 8.4. The bucket example [.78, .17, …], the counting example [4, 1, 0, 2, 1, 0] and 'Your turn' [3, 0, 2, 2, 1], the radix example [329, 457, …], the summary table and the applications are Poon's. HW 10 answers are computed by the script that builds this chapter.",
 "requires": ["cs146/2-adts-invariants-insertion", "cs146/4-big-o-merge-sort", "cs146/9-quicksort"],
 "sections": [
  {"id": "map", "heading": "The big picture: sorting faster than n log n", "blocks": [
    P("Every sort so far (insertion, merge, heap, quicksort) works by **comparing two items** and asking which is smaller. This lecture proves that approach has a speed limit, then breaks through it with three sorts that never compare items against each other. They pay for it with an assumption about the input.", slide="What this chapter answers"),
    ROAD("Sort in Θ(n) by not comparing", [
      ("The speed limit", "comparison sorts need Ω(n log n)", "black boxes", "brand"),
      ("Bucket sort", "numbers spread evenly in [0, 1)", "Θ(n) on average", "green"),
      ("Counting sort", "integers in a small range 0..k", "Θ(n + k)", "amber"),
      ("Radix sort", "numbers with d digits", "Θ(d(n + b))", "red"),
      ("Pick the right one", "match the sort to the data", "exam favorite"),
    ], "The lecture's five parts, in order.", eyebrow="Lecture 10 agenda", slide="Five steps"),
    WHY("**Why it matters** When the data has structure (ages 0 to 120, 32-bit IP addresses, sensor readings spread evenly), a linear-time sort is not a small win: sorting 100 million ages with counting sort does about 100 million steps, while any comparison sort does billions. Knowing *when* you're allowed to use one is the skill the exam tests."),
  ]},
  {"id": "limits", "heading": "The speed limit of comparison sorts", "blocks": [
    D("Comparison sort", "A sort that decides the order **only** by comparing pairs of elements (is a[i] ≤ a[j]?). Insertion sort, merge sort, heapsort and quicksort are all comparison sorts.", slide="Comparison sorts"),
    D("Black box", "Poon's picture: a comparison sort treats each element like a **closed box**. It can't look inside; the only question it may ask is 'is box A lighter than box B?'. Every answer is one yes or no."),
    F(fig_boxes(), "Left: a comparison sort only weighs pairs of closed boxes. Right: a linear-time sort opens each box, reads the value, and computes the slot directly. Hover the boxes.", slide="Closed boxes vs open boxes"),
    D("The lower bound Ω(n log n)", "**Any** comparison sort needs at least about n log n comparisons in the worst case, no matter how clever. Poon states it and says the proof is outside this course. (The idea: there are n! possible orders, and each yes/no answer can at best cut the possibilities in half, so you need about log₂(n!) ≈ n log n answers.)"),
    P("**So how can anything be faster?** Stop comparing. A linear-time sort **opens the boxes**: it looks at the actual value (or one digit of it) and uses arithmetic to compute where the element belongs. The lower bound only applies to sorts that compare, so these sorts are allowed to beat it.", slide="How to beat it"),
    TRAP("'Linear time' does not mean these sorts are better in general. Each one only works on a certain kind of data (small integer range, fixed number of digits, evenly spread values). On the wrong data they are slow or don't apply at all.", "Lecture 10", slide="Trap: not a free lunch"),
    C("Merge sort runs in Θ(n log n). Could a smarter comparison sort run in Θ(n) in the worst case?", "No. Every comparison sort needs Ω(n log n) comparisons in the worst case. To go faster you must stop comparing and use the values themselves."),
  ]},
  {"id": "bucket", "heading": "Bucket sort: numbers spread evenly", "blocks": [
    D("Bucket sort", "For n numbers spread **evenly (uniformly)** over [0, 1). Make n buckets, bucket i covering [i/n, (i+1)/n). Drop each number x into bucket **⌊n · x⌋**, sort each bucket with insertion sort, then read the buckets in order.", slide="Definition"),
    D("Uniformly distributed", "Every part of the range is equally likely. With n numbers and n buckets, that means about **one number per bucket** on average, so each bucket's insertion sort is tiny."),
    T(["Step", "What happens", "Time"], [
      ["1. Create", "n empty buckets", "Θ(n)"],
      ["2. Distribute", "x goes to bucket ⌊n·x⌋", "Θ(n)"],
      ["3. Sort each bucket", "insertion sort, buckets are tiny", "Θ(n) for uniform data"],
      ["4. Concatenate", "read buckets 0 to n − 1", "Θ(n)"],
    ], title="Poon's four steps and their runtimes", slide="Four steps"),
    P("**Watch it run** on the slide's ten numbers. The code is on the left; each lit line is what just happened to the buckets on the right.", slide="Code, line by line"),
    TRACE("Bucket sort on [.78, .17, .39, .26, .72, .94, .21, .12, .23, .68] (the slide's example)", bucket_trace([.78, .17, .39, .26, .72, .94, .21, .12, .23, .68])),
    P("**Runtime.** Average case **Θ(n)**: every step is linear when the data is uniform. Worst case: whatever the **inner sort** costs. If every number lands in one bucket (say all are between 0.30 and 0.39), bucket sort becomes one insertion sort on n items: **Θ(n²)**."),
    TRAP("Bucket sort's Θ(n) is an **average** that depends on the uniform assumption. The worst case is the inner sort's worst case (Θ(n²) with insertion sort). Poon's slide: 'Worst-case time complexity: runtime of secondary sort'.", "Lecture 10 slide 21", slide="Trap: the worst case"),
    C("n = 10. Which bucket does 0.55 go to? And 0.05?", "⌊10 × 0.55⌋ = ⌊5.5⌋ = **5**. ⌊10 × 0.05⌋ = ⌊0.5⌋ = **0**."),
    C("You bucket-sort 1,000 numbers that are all between 0.40 and 0.41. What happens?", "With 1,000 buckets of width 0.001, they spread over only about 10 buckets (≈100 each), and each bucket's insertion sort does about 100² / 2 steps. Far from linear: the data isn't uniform over [0, 1)."),
    PY("Your turn: which bucket?", "Write `bucket_of(x, n)` returning ⌊n·x⌋, then distribute the slide's numbers into 10 buckets.",
       '''
def bucket_of(x, n):
    # return the bucket index for x in [0, 1)
    return 0

a = [.78, .17, .39, .26, .72, .94, .21, .12, .23, .68]
buckets = [[] for _ in range(10)]
for x in a:
    buckets[bucket_of(x, 10)].append(x)
print(buckets)
''',
       check='''
assert bucket_of(.78, 10) == 7 and bucket_of(.17, 10) == 1 and bucket_of(.94, 10) == 9, "bucket_of(.78, 10) should be 7: int(10 * .78)."
assert bucket_of(.05, 10) == 0, "Small numbers go to bucket 0."
''',
       solution='''
def bucket_of(x, n):
    return int(n * x)

a = [.78, .17, .39, .26, .72, .94, .21, .12, .23, .68]
buckets = [[] for _ in range(10)]
for x in a:
    buckets[bucket_of(x, 10)].append(x)
print(buckets)
''', hints=["int() rounds a positive number down, like floor.", "return int(n * x)"], success="That one line is the whole trick: arithmetic instead of comparisons."),
  ]},
  {"id": "counting", "heading": "Counting sort: small integer ranges", "blocks": [
    D("Counting sort", "For n **integers** whose values are all in **[0, k]**. The big idea (Poon's slide): for each element x, figure out **how many elements are ≤ x**, then put x straight into its sorted position.", slide="Definition"),
    D("k", "The largest possible value, so the values are 0, 1, …, k. The **count** array has k + 1 slots, one per possible value. In the slide's example a = [4, 1, 0, 2, 1, 0], n = 6 and k = 4."),
    T(["Step", "What it does", "Slide example (a = [4, 1, 0, 2, 1, 0], k = 4)"], [
      ["0. Create arrays", "count: k + 1 zeros; output: n empty seats", "count = [0, 0, 0, 0, 0], output = [_, _, _, _, _, _]"],
      ["1. Count", "count[x] += 1 for each x", "count = [2, 2, 1, 0, 1]"],
      ["2. Cumulative", "count[v] += count[v − 1], left to right", "count = [2, 4, 5, 5, 6]"],
      ["3. Build output", "walk a **backwards**; seat = count[x] − 1; then count[x] −= 1", "output = [0, 0, 1, 1, 2, 4]"],
    ], title="The four steps", slide="Four steps"),
    D("Cumulative count", "After step 2, **count[v] = how many elements are ≤ v**. Poon's analogy: it **saves seats** in the output. Two elements are ≤ 0, so save seats 0 and 1 for the zeros; four are ≤ 1, so the ones take seats 2 and 3; and so on."),
    F(fig_seats(), "The cumulative count [2, 4, 5, 5, 6] drawn as seats in the output. Each value's seats end at index count[v] − 1. Hover the seats.", slide="Cumulative count = saved seats"),
    TRACE("counting_sort([4, 1, 0, 2, 1, 0], k = 4), line by line (the slide's example)", counting_trace([4, 1, 0, 2, 1, 0], 4)),
    D("Stable", "A sort is **stable** if equal values keep their original left-to-right order. Counting sort walks a **backwards** in step 3 so that the **last** copy of a value takes the **last** seat for that value. Stability matters because radix sort (next section) is built on it."),
    TRACE("Your turn from the slides: a = [3, 0, 2, 2, 1]", counting_trace([3, 0, 2, 2, 1], 3)),
    P("**Runtime.** Step 0: Θ(1) to set up (Poon's slide). Step 1: Θ(n). Step 2: Θ(k). Step 3: Θ(n). Total **Θ(n + k)**. It's linear exactly when k is not much bigger than n.", slide="Runtime"),
    CMP(("Good case", "1,000,000 numbers, values 0..100", "brand"), ("Bad case", "100 numbers, one of them 100,000,000", "red"), [
      ("n", "1,000,000", "100"),
      ("k", "100", "100,000,000 = n⁴"),
      ("Θ(n + k)", "≈ Θ(n): linear", "≈ Θ(n⁴): the count array has 100 million slots"),
    ], "Poon's two examples: counting sort depends on the range k, not just on n.", slide="When k ruins it"),
    TRAP("In step 3 the seat is **count[x] − 1**, not count[x]: count[x] says how many items are ≤ x, and seats are numbered from 0. Then decrement count[x] so the next copy of x lands one seat earlier.", "HW 10", slide="Trap: the − 1"),
    C(f"HW 10 Problem 1: A = {L(HW_A)}, k = {HW_K}. (a) What is the count array C after counting frequencies?", f"C = **{L(_c)}** (two 0s, two 1s, two 2s, two 3s, one 4, zero 5s, two 6s)."),
    C("(b) What is C after the cumulative-count step?", f"C = **{L(_cum)}**. Each entry adds the one before it."),
    C("(c) What is the final sorted array, and how are the last three elements A[10], A[9], A[8] placed?", f"Sorted: **{L(_sorted)}**.\n\n" + "\n\n".join(_last3)),
    PY("Your turn: write counting sort", "Fill in the three loops of counting sort. Walk step 3 backwards so the sort is stable.",
       '''
def counting_sort(a, k):
    count = [0] * (k + 1)
    output = [None] * len(a)
    # step 1: count each value
    # step 2: cumulative count
    # step 3: walk a backwards, place each x at count[x] - 1, then decrement
    return output

print(counting_sort([4, 1, 0, 2, 1, 0], 4))
''',
       check='''
assert counting_sort([4, 1, 0, 2, 1, 0], 4) == [0, 0, 1, 1, 2, 4], "The slide's example should give [0, 0, 1, 1, 2, 4]."
assert counting_sort([3, 0, 2, 2, 1], 3) == [0, 1, 2, 2, 3], "The 'Your turn' array should give [0, 1, 2, 2, 3]."
assert counting_sort([6, 0, 2, 0, 1, 3, 4, 6, 1, 3, 2], 6) == [0, 0, 1, 1, 2, 2, 3, 3, 4, 6, 6], "HW 10's array should come out sorted."
''',
       solution='''
def counting_sort(a, k):
    count = [0] * (k + 1)
    output = [None] * len(a)
    for x in a:
        count[x] += 1
    for v in range(1, k + 1):
        count[v] += count[v - 1]
    for j in range(len(a) - 1, -1, -1):
        x = a[j]
        output[count[x] - 1] = x
        count[x] -= 1
    return output

print(counting_sort([4, 1, 0, 2, 1, 0], 4))
''', hints=["Step 1: `for x in a: count[x] += 1`.", "Step 2: `for v in range(1, k + 1): count[v] += count[v - 1]`.", "Step 3: `for j in range(len(a) - 1, -1, -1):` then `output[count[a[j]] - 1] = a[j]` and `count[a[j]] -= 1`."],
       success="No comparisons anywhere: three loops, Θ(n + k)."),
  ]},
  {"id": "radix", "heading": "Radix sort: one digit at a time", "blocks": [
    D("Radix sort", "For numbers that all have **d digits** in base b (b = 10 for decimal). Sort the whole array by the **last** digit (the 1s), then by the 10s digit, then the 100s, and so on, using a **stable** sort each time. After d passes, it's sorted.", slide="Definition"),
    D("Least significant digit (LSD)", "The rightmost digit, the one worth least. Radix sort starts there and works left. (In 329, the LSD is 9 and the most significant digit is 3.)"),
    TRACE("radix_sort on [329, 457, 657, 839, 436, 720, 355] (the slide's example)", radix_trace([329, 457, 657, 839, 436, 720, 355], 3)),
    THINK("**Why start from the right, and why must each pass be stable?** Each pass sorts by one digit and keeps ties in the order the earlier passes left them. After the 10s pass, numbers with the same 10s digit are still ordered by their 1s digit. So the last pass, on the most significant digit, breaks ties using everything sorted before it. If a pass weren't stable, it would scramble that work."),
    P("**Which stable sort does each pass use?** Counting sort, with k = b − 1 (a digit is 0..9 in base 10). Each pass is Θ(n + b), and there are d passes: **Θ(d(n + b))**. When d is a constant and b isn't huge, that's **Θ(n)**.", slide="Runtime"),
    E("Poon's example: 32-bit integers", "A 32-bit integer is 4 bytes. Treat each byte (8 bits) as one digit in base b = 2⁸ = 256.\n\n  d = 4 digits, b = 256\n  Θ(d(n + b)) = Θ(4(n + 256)) = Θ(n)\n\nd and b don't grow with n, so sorting a billion IP addresses is linear.", slide="32-bit integers"),
    TRAP("Radix sort needs a **stable** inner sort. Using an unstable one (like quicksort) for each digit gives wrong answers, not just slow ones.", "Lecture 10", slide="Trap: stability"),
    C("HW 10 Problem 2: radix-sort [170, 045, 075, 090, 002, 802, 024, 066] in base 10. Show the list after each pass.", f"After the 1s: **[{_passes[0]}]**.\n\nAfter the 10s: **[{_passes[1]}]**.\n\nAfter the 100s: **[{_passes[2]}]**."),
    C("How many passes does radix sort need for 6-digit phone extensions in base 10? What does each pass cost?", "d = 6 passes, each a counting sort with k = 9: Θ(n + 10). Total Θ(6(n + 10)) = Θ(n)."),
  ]},
  {"id": "choose", "heading": "Which sort for which data?", "blocks": [
    T(["", "Counting sort", "Radix sort", "Bucket sort"], [
      ["Input", "non-negative integers in a small range", "non-negative integers with a fixed number of digits", "numbers (often decimals) spread evenly over a range"],
      ["Compares?", "no", "no", "no, except inside a bucket"],
      ["Stable?", "yes", "yes (needs a stable inner sort)", "yes, if the inner sort is"],
      ["Time", "Θ(n + k)", "Θ(d(n + b))", "average Θ(n); worst = inner sort, e.g. Θ(n²)"],
      ["Breaks when", "k is huge", "d or b is huge", "the data is not evenly spread"],
      ["Poon's example", "exam scores 0 to 100", "phone numbers, SSNs", "decimals between 0.0 and 1.0"],
    ], title="Poon's summary table", slide="Summary"),
    P("**How to choose, in three questions.** Are they integers in a small range (k not much bigger than n)? → **counting sort**. Are they integers or strings with a fixed number of digits? → **radix sort**. Are they numbers spread evenly across a known range? → **bucket sort**. None of those? → a comparison sort (merge sort or quicksort)."),
    C("HW 10 Problem 3a: 10 million Employee objects sorted by a unique 8-digit ID. Which sort?", "**Radix sort**: d = 8 digits in base 10, so Θ(8(n + 10)) = Θ(n). Counting sort directly would need a count array of 100 million slots (k = 10⁸, ten times n); radix keeps each pass to 10 slots."),
    C("HW 10 Problem 3b: 500,000 floating-point timestamps from an experiment that fires at random, unpredictable intervals. Which sort?", "Bucket sort needs values spread **evenly**, and nothing guarantees that here: bursts of events would pile into a few buckets and push it toward Θ(n²). Counting and radix need integers. So use a comparison sort: **merge sort** (Θ(n log n) always) or quicksort."),
    C("HW 10 Problem 3c: the ages of 2 million residents, integers from 0 to 110. Which sort?", "**Counting sort**: k = 110 is tiny next to n = 2,000,000, so Θ(n + k) = Θ(n)."),
  ]},
  {"id": "apps", "heading": "Where linear-time sorts show up", "blocks": [
    CARDS([
      ("Counting sort", "small ranges", ["Histograms in image processing: how many pixels have each color value.", "Sorting user records by age (0 to 120)."], "brand"),
      ("Radix sort", "fixed-size keys", ["64-bit integers and fixed-length strings.", "Routers sorting 32-bit IP addresses.", "DNA sequences over {A, C, G, T}."], "green"),
      ("Bucket sort", "evenly spread data", ["Sensor readings and financial data.", "Map coordinates: a 2D grid of buckets finds nearby points fast."], "amber"),
    ], "Poon's professional applications slide.", slide="Applications"),
    WORLD("**You've used one today.** A photo editor's histogram (the little mountain chart of brightness values) is counting sort's step 1: count how many pixels have each of the 256 brightness values. It's linear because k = 255 never changes, however big the photo."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Comparison sort", "Orders items only by comparing pairs. Needs Ω(n log n) comparisons in the worst case."],
      ["Lower bound", "A speed no algorithm of that kind can beat."],
      ["Bucket sort", "n buckets, x goes to ⌊n·x⌋, sort each, concatenate. Average Θ(n) on uniform data."],
      ["Uniform distribution", "Every part of the range is equally likely."],
      ["Counting sort", "Integers in [0, k]: count, cumulative count, place backwards. Θ(n + k)."],
      ["Cumulative count", "count[v] = how many items are ≤ v: the seats saved for values up to v."],
      ["Stable", "Equal values keep their original order."],
      ["Radix sort", "Stable sort by each digit, least significant first. Θ(d(n + b))."],
      ["d, b", "Number of digits / the base (10 for decimal, 256 for bytes)."],
    ]),
  ]},
 ],
 "exercises": [
  MC("which-bucket", "Bucket index", "Bucket sort with n = 8 buckets. Which bucket does 0.30 go to?", ["2", "3", "0", "8"], 0,
     ["Yes: ⌊8 × 0.30⌋ = ⌊2.4⌋ = 2.", "8 × 0.30 = 2.4, and the floor of 2.4 is 2, not 3.", "Only numbers below 0.125 go to bucket 0.", "Buckets are numbered 0 to 7."],
     "**2**: ⌊8 × 0.30⌋ = ⌊2.4⌋ = 2.", "The bucket formula is the one piece of arithmetic bucket sort needs.", ref="bucket"),
  MC("cumulative", "Cumulative count", "After counting, count = [1, 3, 0, 2]. What is the cumulative count?", ["[1, 4, 4, 6]", "[1, 3, 0, 2]", "[6, 5, 2, 2]", "[1, 4, 3, 5]"], 0,
     ["Yes: 1, 1+3, 4+0, 4+2.", "That's the count before step 2.", "That adds from the right.", "Each entry adds the new running total, not the previous raw count."],
     "**[1, 4, 4, 6]**: each entry is the running total.", "count[v] then says how many items are ≤ v.", ref="counting"),
  MC("why-backwards", "Why backwards?", "Why does counting sort's step 3 walk the input from the end to the start?", ["To keep equal values in their original order (stable)", "It's faster that way", "To avoid a negative index", "Because count was built backwards"], 0,
     ["Yes: the last copy of a value takes the last seat for that value.", "Both directions take Θ(n).", "The seat is count[x] − 1, which is ≥ 0 either way.", "count was built left to right."],
     "Backwards keeps it **stable**, which radix sort depends on.", "A favorite 'why' question.", ref="counting"),
  MC("radix-time", "Radix runtime", "Radix sort on n numbers with d digits in base b costs…", ["Θ(d(n + b))", "Θ(n log n)", "Θ(n + b)", "Θ(n^d)"], 0,
     ["Yes: d passes of a Θ(n + b) counting sort.", "That's the comparison-sort bound radix sort beats.", "That's ONE pass.", "Passes add up, they don't multiply."],
     "**Θ(d(n + b))**, which is Θ(n) when d and b are constants.", "Poon's 32-bit example: d = 4, b = 256.", ref="radix"),
  MC("pick-ages", "Pick the sort", "Sort the exam scores (integers 0 to 100) of 300 students. Best choice?", ["Counting sort", "Bucket sort", "Radix sort with base 2", "Quicksort"], 0,
     ["Yes: k = 100 is small, so Θ(n + k).", "Scores are integers, not evenly spread decimals.", "Works, but more passes than needed.", "Θ(n log n) when Θ(n + k) is available."],
     "**Counting sort**: integers in a small range. Poon's own example scenario.", "Match the data to the sort.", ref="choose"),
  FILL("counting-seat", "Where does it go?", "Cumulative count = [2, 4, 5, 5, 6]. Walking backwards, the next element is x = 1. At which index of output does it go?", ["3"],
       ["count[1] says how many items are ≤ 1.", "Seats are numbered from 0, so subtract one.", "count[1] = 4, so the seat is 4 − 1."],
       ["count[1] − 1 = 4 − 1 = **3**. Then count[1] becomes 3."],
       "The − 1 is the most common slip.", ref="counting"),
 ],
}

for e in g["exercises"]:
    if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
build(g)
