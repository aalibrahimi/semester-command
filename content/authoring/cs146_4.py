from c146common import *
import fig4

FG = fig4.figures()
SLUG = "4-big-o-merge-sort"

MERGE_STEPPER = old_block(SLUG, "merge", lambda b: b["type"] == "stepper")
MERGE_JAVA = old_block(SLUG, "merge", lambda b: b["type"] == "example")
MS_TRACE = old_block(SLUG, "mergesort", lambda b: b["type"] == "example" and "M([50, 20, 60, 30, 10])" in b["body"])
MS_JAVA = old_block(SLUG, "mergesort", lambda b: b["type"] == "example" and "mergeSort(int[] a)" in b["body"])
MS_TREE = old_block(SLUG, "mergesort", lambda b: b["type"] == "stepper" and "tree" in b["title"])
PROJECT = old_section(SLUG, "project")

BS_FRAMES = bs_frames([2, 5, 8, 12, 16, 23, 38, 41, 56, 62, 71, 77, 83, 88, 91, 99], 23)

g = {
 "id": "cs146/4-big-o-merge-sort",
 "course": "cs146",
 "lessons": "Lectures 4–5",
 "title": "Big-O in practice, divide and conquer, and merge sort",
 "summary": "Count an algorithm's steps, turn the count into Big-O, recognize the common growth shapes on sight, then use the divide-and-conquer recipe to build merge sort and explain, with one picture, why it costs n log n.",
 "estimatedMinutes": 90,
 "sourceNote": "Lecture 4 'Asymptotic Notation' (Aug 31) and Lecture 5 'Divide and Conquer, Merge Sort' (Sep 2) slides, HW 4 and HW 5, Project 1 spec. Real-world notes are general industry practice.",
 "requires": ["cs146/0-notation", "cs146/2-adts-invariants-insertion"],
 "sections": [
  {"id": "map", "heading": "The big picture: what this chapter is for", "blocks": [
    P("You already know *how* to write a loop. This chapter is about a different question: **before you run a program, can you tell whether it will be fast enough?** Two lectures answer it in five small steps. Read them in order; each one uses the one before.", slide="What this chapter answers"),
    DG("roadmap", {
        "eyebrow": "The question this chapter answers",
        "question": "Is it fast enough, **before** you run it?",
        "steps": [
            {"title": "Count steps", "sub": "not seconds", "result": "T(n) = 2n + 3"},
            {"title": "Keep the shape", "sub": "Big-O drops the details", "result": "O(n)", "tone": "brand"},
            {"title": "Halve it", "sub": "binary search", "result": "O(log n)", "tone": "green"},
            {"title": "Divide & conquer", "sub": "split, solve, combine", "result": "a recipe", "tone": "amber"},
            {"title": "Merge sort", "sub": "halve, then merge", "result": "O(n log n)", "tone": "brand"},
        ],
        "payoff": {"title": "Why it matters: sorting 1,000,000 items", "bars": [
            {"label": "merge sort", "value": 2e7, "display": "≈ 20 million steps", "tone": "green"},
            {"label": "insertion sort", "value": 1e12, "display": "≈ 1 trillion steps", "tone": "red"},
        ], "note": "Bar lengths are on a log scale; the real gap is 50,000×."},
    }, "The whole chapter in five steps. By the end you can look at a sort you've never seen and say how it will behave on a million items.", slide="Five steps"),
    WHY("**Why bother predicting?** Because the alternative is finding out in production. An app that sorts 100 test items instantly can freeze on a real customer's 1,000,000. Engineers want to know that from the design, before writing or shipping anything. Poon's last slide in Lecture 7 makes the same point: the math lets you 'avoid costly implementation of slow algorithms'."),
  ]},
  {"id": "count", "heading": "Step 1: count steps, not seconds", "blocks": [
    D("Running time T(n)", "The **number of basic steps** an algorithm takes on an input of size n. A basic step is anything that takes about the same time no matter how big n is: one comparison, one assignment, one array read."),
    P("Why steps and not seconds? Seconds depend on the machine, the language, and what else the computer is doing. The **step count** is the same on every machine, so it describes the algorithm itself. Poon calls 'time complexity' a slight misnomer for exactly this reason."),
    DG("codecount", {
        "codeLabel": "code", "countLabel": "runs",
        "lines": [{"code": "int sum = 0;", "count": "1"}, {"code": "for (i = 0; i < n; i++)", "count": "n + 1"}, {"code": "    sum += a[i];", "count": "n"}, {"code": "return sum;", "count": "1"}],
        "total": "T(n) = 2n + 3",
        "barsLabel": "steps for a few n", "bars": [{"label": "n=2", "value": 7}, {"label": "n=4", "value": 11}, {"label": "n=8", "value": 19}, {"label": "n=16", "value": 35}],
        "barsNote": "Double n → about double the steps: **linear**.",
    }, "Count how many times each line runs, then add: summing an array takes 2n + 3 steps. The only thing we keep from that formula is its shape: double n, and the work about doubles.", slide="Counting steps"),
    THINK("**The two counting rules.** You only need these two.\n\n- **Things in a row ADD.** One loop of n, then another loop of n: n + n = 2n.\n- **Things inside each other MULTIPLY.** A loop of n inside a loop of n: n × n = n².\n\nSo to count: find the loops, ask how many times each one runs, add the ones in sequence, multiply the ones that are nested."),
    E("Bubble sort's inner work (Lecture 4)", "for i = 0 to n − 1          // outer: n times\n    for j = 0 to n − 2      // inner: n − 1 times, EVERY outer pass\n        compare a[j], a[j+1]\n\nsteps ≈ n × (n − 1) = n² − n", answer="about n² steps", slide="A nested loop"),
    PY("Count the steps yourself", "Run this. It literally counts the steps of a single loop and of two nested loops. Look at what happens to each count when n gets 10 times bigger. Then change the `for n in` list and run it again.",
       '''
def one_loop(n):
    steps = 0
    for i in range(n):
        steps += 1          # the loop body runs n times
    return steps

def nested_loops(n):
    steps = 0
    for i in range(n):
        for j in range(n):
            steps += 1      # runs n times for EACH i
    return steps

for n in [10, 100, 1000]:
    print(f"n = {n:5}:   one loop = {one_loop(n):7,}    nested = {nested_loops(n):11,}")
''', hints=["Watch the ratio: when n goes from 100 to 1000 (×10), one loop goes ×10 but nested goes ×100."]),
    C("A loop of n runs, then a separate loop of n runs, then a loop of n inside a loop of n. Roughly how many steps?", "n + n + n·n = n² + 2n. In rows ADD, nested MULTIPLY."),
  ]},
  {"id": "bigo", "heading": "Step 2: Big-O keeps only the shape", "blocks": [
    P("Exact counts like 2n + 3 or n² − n are fussy, and the fussy parts stop mattering once n is big. When n is a million, 2n + 3 and 2n are the same number for any practical purpose, and even the 2 only matters as much as buying a twice-as-fast computer. **Big-O throws away the fussy parts and keeps the shape of the growth.**"),
    D("Big-O, in plain words", "f(n) = O(g(n)) means **f grows no faster than g**. Past some input size, f(n) stays under g(n) times some fixed number, forever."),
    D("Big-O, the way Poon writes it", "f(n) = O(g(n)) if there are constants **c > 0** and **n₀** such that **f(n) ≤ c·g(n) for every n ≥ n₀**. c is the 'times some fixed number'; n₀ is the 'past some input size'."),
    DG("bigo", {"fa": 5, "fb": 10, "c": 6, "n0": 10, "xmax": 16, "summary": "**f(n) = O(g(n))**: past some n₀, f(n) ≤ c·g(n) forever. Here c = 6, n₀ = 10, g(n) = n, so **5n + 10 = O(n)**."},
       "Lecture 4's second example. f(n) = 5n + 10 starts above 6n, but they cross at n = 10, and from then on f stays under (green zone). That's all the definition asks: one c and one n₀ that work forever after.", slide="The definition as a picture"),
    ST("Proving 5n + 10 = O(n), step by step (Lecture 4)", [
      lines(["Goal: find c and n₀ with 5n + 10 ≤ c·n for all n ≥ n₀"], 0, "Write down what you need to show. g(n) = n, so we need 5n + 10 ≤ c·n."),
      lines(["Goal: find c and n₀ with 5n + 10 ≤ c·n for all n ≥ n₀", "Try c = 6:  5n + 10 ≤ 6n"], 1, "Pick c a little bigger than the leading number (5). c = 6 gives us one spare n to cover the + 10."),
      lines(["Goal: find c and n₀ with 5n + 10 ≤ c·n for all n ≥ n₀", "Try c = 6:  5n + 10 ≤ 6n", "Subtract 5n:  10 ≤ n"], 2, "Solve for n. The inequality holds exactly when n ≥ 10."),
      lines(["Goal: find c and n₀ with 5n + 10 ≤ c·n for all n ≥ n₀", "Try c = 6:  5n + 10 ≤ 6n", "Subtract 5n:  10 ≤ n", "So c = 6, n₀ = 10 works.  5n + 10 = O(n) ✓"], 3, "Done. Write the constants you found; that is the whole proof. (For 2n + 1, Poon uses c = 3 and n₀ = 1: 2n + 1 ≤ 3n whenever n ≥ 1.)"),
    ]),
    THINK("**The shortcut you'll actually use.** You rarely need c and n₀ on homework unless it asks for a proof. To find the Big-O of a formula:\n\n1. Keep only the **fastest-growing term**. (n² beats n, n beats log n, anything beats a constant.)\n2. **Drop its constant** multiplier.\n\n3n² + 100n + 7 → 3n² → **O(n²)**. 5n + 10 → 5n → **O(n)**. 1000 → **O(1)**.", slide="The shortcut"),
    DG("cards", {"cards": [
        {"title": "O(g)", "badge": "ceiling", "tone": "amber", "viz": "ceiling", "lines": ["f grows **at most** as fast as g", "Poon: the worst case"]},
        {"title": "Ω(g)", "badge": "floor", "tone": "green", "viz": "floor", "lines": ["f grows **at least** as fast as g", "Poon: the best case"]},
        {"title": "Θ(g)", "badge": "sandwich", "tone": "brand", "viz": "sandwich", "lines": ["f grows **exactly** like g", "when best and worst match"]},
    ], "note": "Blue: your algorithm's f(n). Dashed: c·g(n), the bound."},
       "The three symbols are a ceiling, a floor, and both.", slide="O, Ω, Θ"),
    T(["Symbol", "Reads as", "Poon uses it for", "Example"], [
      ["O(g)", "at most g (ceiling)", "the worst case", "insertion sort is O(n²)"],
      ["Ω(g)", "at least g (floor)", "the best case", "insertion sort is Ω(n)"],
      ["Θ(g)", "exactly g (both)", "when best and worst match", "summing an array is Θ(n)"],
    ], title="O, Ω, Θ in one table (Lecture 4)"),
    old_block(SLUG, "bigo", lambda b: b["type"] == "definition" and b["term"] == "Insertion sort"),
    old_block(SLUG, "bigo", lambda b: b["type"] == "definition" and b["term"] == "Linear search"),
    old_block(SLUG, "bigo", lambda b: b["type"] == "definition" and b["term"] == "Sum all elements"),
    TRAP("Dropping a term that is not smaller. n² + n log n → O(n²) is right. But n·log n is NOT 'n' with a constant: log n grows, so O(n log n) stays O(n log n). Only true constants (numbers that don't depend on n) get dropped.", "HW 4", slide="What you may drop"),
    C("HW 4 Problem 2: `for i in 0..n−1: for j in 0..i−1: sum += i`. How many times does the inner line run, and what's the Big-O?", "For each i it runs i times: 0 + 1 + 2 + … + (n−1) = n(n−1)/2 (Chapter 0's sum). Drop the ½ and the −n/2: O(n²)."),
    C("Give the simplest O, Ω and Θ for f(n) = 2n³ + 5n² + 100.", "All n³: f = O(n³) and Ω(n³), so Θ(n³). Only the fastest-growing term survives."),
  ]},
  {"id": "classes", "heading": "Step 3: the growth ladder, and how to spot each rung", "blocks": [
    P("Almost every algorithm in this course lands on one of six rungs. Learn them like a ladder: each rung is dramatically worse than the one below it."),
    SIM("growth", "Three panels. (1) Drag 'Plot up to n' and watch 2ⁿ and n² leave the chart. (2) Slide the input size up to a million or a billion and read the real time for each rung. (3) Race a careful n² algorithm against a sloppy n log n one and find where they cross.", {"xmax": 12, "n": 1000000}, slide="Race the curves"),
    T(["Rung", "Name", "The code looks like", "Everyday version"], [
      ["O(1)", "constant", "no loop over the input", "grabbing the top plate off a stack"],
      ["O(log n)", "logarithmic", "a loop that HALVES what's left", "finding a word in a paper dictionary"],
      ["O(n)", "linear", "one loop over the input", "reading every name on a list once"],
      ["O(n log n)", "linearithmic", "halving, with a full pass at each level", "sorting a deck by splitting and merging piles"],
      ["O(n²)", "quadratic", "a loop inside a loop, both over the input", "everyone at a party shaking hands with everyone"],
      ["O(2ⁿ)", "exponential", "trying every yes/no combination", "trying every possible playlist of your songs"],
    ], title="The growth ladder", slide="Six rungs"),
    THINK("**When you see X, think Y.** This is the pattern-matching you do on an exam.\n\n- A single `for` over the array → **n**.\n- A `for` inside a `for`, both up to n → **n²**. (Inner goes to i instead of n? Still n², it's half of n².)\n- A variable that is **halved or doubled** each pass (`n = n / 2`, `i *= 2`) → **log n**.\n- A loop of n around something that halves → **n log n**.\n- A loop that runs a **fixed** number of times, like 100 → constant, **O(1)**, no matter how big 100 looks.", slide="Spot the rung"),
    WHEN("**What size of input can each rung handle?** A laptop does roughly a billion simple steps per second. Rule of thumb for 'answers in about a second':\n\n- O(n²): up to around **30,000** items.\n- O(n log n): up to tens of **millions**.\n- O(n): up to around a **billion**.\n- O(2ⁿ): about **30** items. Really.\n\nSo if a task says 'n up to a million', any O(n²) plan is already dead, and you should be looking for n log n or better."),
    WORLD("**Where the rungs show up.** Looking up a contact by name in a sorted list: **log n** (it's binary search, next section). Scrolling a feed and rendering each post: **n**. Every sort built into a programming language: **n log n**. Checking every pair of users for 'people you may know' naively: **n²**, which is exactly why real systems don't do it naively. Trying every subset to pack a delivery truck perfectly: **2ⁿ**, which is why logistics companies settle for 'very good' instead of 'perfect'."),
    old_block(SLUG, "bigo", lambda b: b["type"] == "example" and "1000n" in b["title"]),
    C("Which rung: `i = 1; while (i < n) i = i * 2;`", "O(log n). i doubles each pass, so it reaches n after about log₂ n passes."),
    C("Which rung: `for i in 0..n−1: for j in 0..99: count++`", "O(n). The inner loop is always 100, a constant: 100n = O(n)."),
  ]},
  {"id": "binsearch", "heading": "Step 4: binary search, the halving trick", "blocks": [
    D("Binary search", "Find a value in a **sorted** array by checking the middle, then throwing away the half that can't contain it. Repeat on the half that's left."),
    ST("Binary search for 23 in 16 sorted numbers", BS_FRAMES),
    P("Watch the grayed-out part grow: every look throws away half of what's left, **in one comparison**. 16 → 8 → 4 → 2 → 1, so even the worst case needs only 5 looks (log₂ 16 + 1). **Double the items and you add just ONE look.**"),
    E("The code (Lecture 5, iterative)", "int binarySearch(int[] a, int target) {\n    int low = 0, high = a.length - 1;\n    while (low <= high) {\n        int mid = (low + high) / 2;\n        if (a[mid] == target) return mid;\n        else if (a[mid] < target) low = mid + 1;   // go right\n        else high = mid - 1;                       // go left\n    }\n    return -1;                                     // not there\n}", slide="The code"),
    WHY("**Why is it log n?** Every look halves what's left: n, n/2, n/4, … 1. Chapter 0 defined log₂ n as exactly 'how many times can you halve n before reaching 1'. So binary search takes about log₂ n looks. For a million items that's 20. For a billion, 30."),
    WORLD("**Binary search is everywhere.** A database finding a row by its id uses an index sorted for exactly this kind of halving (B-trees, a later lecture's cousin). `git bisect` finds the commit that broke your code by testing the middle commit, then the middle of the bad half: 1,000 commits take about 10 tests. Even a phone's contact list jumping to 'M' is halving, not scanning."),
    WHEN("**Use it when** the data is sorted and you search many times. **Don't** if the data is unsorted and you search once: sorting first costs n log n, more than one plain O(n) scan."),
    PY("Your turn: count the halvings", "Write `halvings(n)`: how many times can you halve n (with whole-number division `n // 2`) before it reaches 1? This number is ⌊log₂ n⌋, the number of 'go left or go right' decisions binary search makes.",
       '''
def halvings(n):
    count = 0
    # Keep replacing n with n // 2 while n is bigger than 1.
    # Add 1 to count each time you halve.
    return count

for n in [1, 2, 16, 1000, 1_000_000]:
    print(f"{n:>9,} -> {halvings(n)}")
''',
       check='''
assert halvings(1) == 0, "halvings(1) should be 0: 1 is already 1, nothing to halve."
assert halvings(2) == 1, "halvings(2) should be 1: 2 → 1."
assert halvings(16) == 4, "halvings(16) should be 4: 16 → 8 → 4 → 2 → 1."
assert halvings(1000) == 9, "halvings(1000) should be 9: 1000 → 500 → 250 → 125 → 62 → 31 → 15 → 7 → 3 → 1."
assert halvings(1_000_000) == 19, "halvings(1,000,000) should be 19. Are you stopping when n reaches 1?"
''',
       solution='''
def halvings(n):
    count = 0
    while n > 1:
        n = n // 2
        count += 1
    return count

for n in [1, 2, 16, 1000, 1_000_000]:
    print(f"{n:>9,} -> {halvings(n)}")
''',
       hints=["Use a `while n > 1:` loop.", "Inside the loop: `n = n // 2` and `count += 1`.", "Return count after the loop ends."],
       success="A million items, 19 halvings. That's why binary search on a million sorted items needs only about 20 comparisons."),
    C("A sorted array has 1,024 items. At most how many 'go left or right' decisions does binary search make?", "log₂ 1024 = 10 halvings (plus one final look at the last candidate)."),
  ]},
  {"id": "dc", "heading": "Step 5: divide and conquer, a recipe", "blocks": [
    D("Divide and conquer", "A recipe for designing algorithms in three steps: **divide** the problem into smaller copies of the same problem, **conquer** each copy by solving it the same way (recursion), and **combine** the answers."),
    ST("Divide, conquer, combine on 8 numbers", dc_frames([7, 3, 9, 1, 4, 8, 2, 6])),
    D("Base case", "The size where you stop dividing because the answer is obvious. For sorting: one item (or zero) is already sorted. Without a base case, the recursion never stops."),
    P("Recursion can feel circular: how can a function use itself? The answer is that every call works on a **smaller** input, so the calls must eventually hit the base case, which answers without calling again. Then each call hands its answer back to the one that called it."),
    T(["", "Binary search", "Merge sort"], [
      ["Divide", "look at the middle", "cut the array in half"],
      ["Conquer", "search ONE half", "sort BOTH halves"],
      ["Combine", "nothing to do", "**merge** the two sorted halves"],
    ], title="Same recipe, two algorithms (Lecture 5)", slide="Same recipe twice"),
    THINK("**How to design with it.** Ask three questions: (1) If a friend handed me the answers for each half, could I build the full answer quickly? (2) What's the smallest input where the answer is obvious? (3) Does splitting really shrink the problem? If all three are yes, divide and conquer will work."),
    WORLD("**At company scale.** Google's MapReduce, the idea behind processing the whole web, is divide and conquer: split the data across thousands of machines (divide), let each work alone (conquer), gather the results (combine). The same pattern runs sorting of files too big for memory: sort chunks that fit, then merge the sorted chunks. Your phone's photo app making thumbnails on every CPU core at once is the same idea on a small scale."),
    old_block(SLUG, "dc", lambda b: b["type"] == "trap"),
    C("In binary search, what are divide, conquer, and combine?", "Divide: compare with the middle. Conquer: search the one half that can hold the target. Combine: nothing, the answer from that half is the answer."),
  ]},
  {"id": "merge", "heading": "Merge: the one move merge sort needs", "blocks": [
    D("Merge", "Take **two sorted lists** and produce **one sorted list** containing everything from both, by repeatedly taking the smaller of the two front items."),
    WHY("**Why merging is easy but sorting is hard.** In two sorted piles, the smallest item overall must be on the front of one pile: nothing buried can be smaller than the front of its own pile. So you never search. You just compare two fronts, take the smaller, and repeat. Each step places one item for good."),
    ST("Merging [2, 5, 8, 12] and [3, 6, 9, 10] (HW 5 Problem 1)", merge_frames([2, 5, 8, 12], [3, 6, 9, 10])),
    P("**Cost of one merge.** Every step copies one item to the output, and nothing is copied twice. Merging lists with n items in total therefore takes about **n steps: O(n)**."),
    MERGE_JAVA,
    WORLD("**Merging sorted lists is a daily job for software.** Your email app showing messages from several accounts in one timeline is merging lists already sorted by date. A database answering 'join these two tables' often sorts both and merges them (a 'merge join'). Version control tools merge ordered sequences of lines. When data is already sorted, merging is the cheapest way to combine it."),
    PY("Your turn: write merge", "Finish the loop so it compares `left[i]` and `right[j]`, appends the smaller one to `out`, and moves that finger forward. Delete the `break` line when you write your version. Use `<=` so ties take from the left (that keeps merge sort stable).",
       '''
def merge(left, right):
    out = []
    i, j = 0, 0
    while i < len(left) and j < len(right):
        # compare left[i] and right[j], append the smaller one,
        # then move that finger (i += 1 or j += 1)
        break   # delete this line once your comparison is written
    # one pile ran out: copy whatever is left of both
    out.extend(left[i:])
    out.extend(right[j:])
    return out

print(merge([2, 5, 8, 12], [3, 6, 9, 10]))
''',
       check='''
r = merge([2, 5, 8, 12], [3, 6, 9, 10])
assert r == [2, 3, 5, 6, 8, 9, 10, 12], f"merge([2, 5, 8, 12], [3, 6, 9, 10]) gave {r}. Did you compare left[i] with right[j] and move only one finger?"
assert merge([], [1, 2]) == [1, 2], "Merging with an empty list should give the other list back."
assert merge([1, 4], []) == [1, 4], "Merging with an empty list should give the other list back."
assert merge([1, 1, 3], [1, 2]) == [1, 1, 1, 2, 3], "Ties: equal values should all end up in the output."
assert merge([10], [1, 2, 3]) == [1, 2, 3, 10], "One pile can run out long before the other."
''',
       solution='''
def merge(left, right):
    out = []
    i, j = 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out

print(merge([2, 5, 8, 12], [3, 6, 9, 10]))
''',
       hints=["Use an if/else: `if left[i] <= right[j]:` take from the left, else take from the right.", "In the left branch: `out.append(left[i])` then `i += 1`.", "In the right branch: `out.append(right[j])` then `j += 1`. Don't forget to delete the `break`."],
       success="That's the heart of merge sort, and the same merge the Java version in Project 1 needs."),
    C("Merging [1, 4, 9] with [2, 3, 10, 11]: how many comparisons happen before one list runs out?", "1v2 take 1; 4v2 take 2; 4v3 take 3; 4v10 take 4; 9v10 take 9. The left list is now empty: 5 comparisons. Then 10, 11 are copied with no comparisons."),
  ]},
  {"id": "mergesort", "heading": "Merge sort, top to bottom", "blocks": [
    D("Merge sort", "Split the array in half, merge-sort each half, then **merge** the two sorted halves. A piece of size 1 is already sorted (the base case)."),
    ST("Merge sort on [50, 20, 60, 30, 10]: split down, merge up", ms_frames([50, 20, 60, 30, 10])),
    P("Merge sort is an hourglass. Going **down** it only cuts (no comparisons at all). Coming **up** it merges, and every comparison in the whole algorithm happens on the way up."),
    SIM("sort", "Merge sort on your own array. Watch the splits go down to single elements and the merges come back up; the window shows which slice is being worked on. Count the levels for n = 8.", {"algorithm": "merge", "array": [7, 3, 9, 1, 4, 8, 2, 6]}),
    MS_TRACE,
    MS_JAVA,
    THINK("**How to trace merge sort without getting lost.** Always finish the LEFT side completely before touching the right. Write each call on its own line, indented by depth; write → result only after both of its children have returned. Odd length: the left half gets the extra item (mid = (lo + hi) / 2)."),
    C("HW 5 Problem 2: trace merge sort on [8, 3, 1, 7, 4, 6] in M() format.", "M([8,3,1,7,4,6]): M([8,3,1]) → M([8,3]) → M([8])→[8], M([3])→[3], →[3,8]; M([1])→[1]; →[1,3,8]. M([7,4,6]) → M([7,4]) → [7],[4] → [4,7]; M([6])→[6]; →[4,6,7]. Final → [1,3,4,6,7,8]."),
  ]},
  {"id": "whynlogn", "heading": "Why merge sort costs n log n (one picture)", "blocks": [
    P("This is the most important picture of the first half of the course. It comes back in Lecture 6 (recurrences), Lecture 7 (the master method), Lecture 8 (heap sort) and Lecture 9 (quicksort's best case)."),
    DG("levels", {"rows": [
        {"label": "level 0", "parts": [8], "total": "= 8"},
        {"label": "level 1", "parts": [4, 4], "total": "= 8"},
        {"label": "level 2", "parts": [2, 2, 2, 2], "total": "= 8"},
        {"label": "level 3", "parts": [1] * 8, "total": "= 8", "tone": "green"},
    ], "summary": "n per level × log₂ n levels = **n log n**", "detail": "n = 8: 3 levels of merging (8 → 4 → 2 → 1) × 8 = 24"},
       "Every level's merges handle each item once, so every level costs n. There are log₂ n levels of merging, because that's how many halvings get you from n to 1.", slide="n per level × log n levels"),
    ST("The argument in four lines", [
      lines(["1. One level's merges touch every item once: n steps"], 0, "No matter how many pieces a level is cut into, together they hold all n items, and merging touches each item once."),
      lines(["1. One level's merges touch every item once: n steps", "2. The sizes go n, n/2, n/4, …, 1: log₂ n levels"], 1, "Chapter 0: the number of halvings from n to 1 is log₂ n."),
      lines(["1. One level's merges touch every item once: n steps", "2. The sizes go n, n/2, n/4, …, 1: log₂ n levels", "3. Splitting is free (just compute mid): O(n) total"], 2, "Poon counts n − 1 splits, each O(1). That's O(n), which is smaller than what the merges cost."),
      lines(["1. One level's merges touch every item once: n steps", "2. The sizes go n, n/2, n/4, …, 1: log₂ n levels", "3. Splitting is free (just compute mid): O(n) total", "4. Total: n × log n + n = O(n log n)"], 3, "Keep the biggest term. Merge sort is O(n log n), and since it does this work on every input, even sorted input, it's Θ(n log n)."),
    ]),
    old_block(SLUG, "mergesort", lambda b: b["type"] == "prose" and "1,000,000" in b["md"]),
    PY("See it: count the comparisons", "This runs merge sort and insertion sort on random lists of growing size, counts their comparisons, and plots both. Run it. Insertion sort's curve bends upward (n²); merge sort's stays nearly straight (n log n). Try adding 1600 to `sizes`.",
       '''
import random, math
import matplotlib.pyplot as plt

def merge_sort_count(a):
    """Sort a; return (sorted list, number of comparisons)."""
    if len(a) <= 1:
        return a, 0
    mid = (len(a) + 1) // 2          # left half gets the extra item
    left, cl = merge_sort_count(a[:mid])
    right, cr = merge_sort_count(a[mid:])
    out, i, j, c = [], 0, 0, 0
    while i < len(left) and j < len(right):
        c += 1
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:], cl + cr + c

def insertion_sort_count(a):
    a, c = a[:], 0
    for j in range(1, len(a)):
        key, i = a[j], j - 1
        while i >= 0:
            c += 1
            if a[i] > key:
                a[i + 1] = a[i]; i -= 1
            else:
                break
        a[i + 1] = key
    return a, c

sizes = [10, 50, 100, 200, 400, 800]
ms, ins = [], []
for n in sizes:
    data = [random.random() for _ in range(n)]
    ms.append(merge_sort_count(data)[1])
    ins.append(insertion_sort_count(data)[1])
    print(f"n = {n:4}: merge {ms[-1]:6,}   insertion {ins[-1]:7,}   n·log2(n) = {round(n * math.log2(n)):6,}")

plt.plot(sizes, ins, "o-", label="insertion sort (about n²/4 on random input)")
plt.plot(sizes, ms, "o-", label="merge sort (about n log n)")
plt.xlabel("n (items)"); plt.ylabel("comparisons"); plt.legend(); plt.title("Comparisons on random input")
plt.show()
'''),
    C("Merge sort on n = 16: how many levels of merging, and about how many item-moves in total?", "log₂ 16 = 4 levels, 16 moves per level: about 64."),
    C("Why is merge sort O(n log n) even in the best case, when insertion sort can be Ω(n)?", "Merge sort always makes the same splits and always merges every level; it never notices that the input was sorted. Insertion sort's inner loop stops early on sorted input, so it does less work."),
  ]},
  {"id": "choose", "heading": "Which sort, when?", "blocks": [
    old_block(SLUG, "mergesort", lambda b: b["type"] == "table"),
    old_block(SLUG, "mergesort", lambda b: b["type"] == "prose" and "O(n) space" in b["md"]),
    WHEN("**Pick insertion sort** when the list is tiny (under a few dozen items) or already almost sorted, like adding one new score to a sorted leaderboard: it does almost no work then, and it needs no extra memory.\n\n**Pick merge sort** when the list is big, when you need a guaranteed n log n no matter what the input looks like, when equal items must keep their order (stable), or when the data doesn't fit in memory and must be merged from disk.\n\n**Watch out for** merge sort's extra O(n) memory on small devices. Heap sort (Lecture 8) fixes that.", slide="Insertion or merge?"),
    WORLD("**The real answer is 'both'.** Python's built-in sort and Java's sort for objects use **Timsort**: it finds runs that are already sorted, uses insertion sort to extend short runs, and merges runs merge-sort style. That's exactly Project 1's hybrid sort idea, used by billions of devices. Real-world data is often partly sorted, and this hybrid takes advantage of it."),
    TRAP("Saying merge sort sorts 'in place'. It doesn't: merge writes into a temporary array of size n, so it uses O(n) extra space. Insertion sort (and later heap sort) are the in-place ones.", "Lecture 5", slide="In place?"),
  ]},
  {"id": "project", "heading": "Project 1: SortingHub (due Fri Sep 25, 10% of the grade)", "blocks": PROJECT},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["T(n)", "the number of steps on an input of size n"],
      ["Big-O, O(g)", "grows no faster than g: a ceiling"],
      ["Omega, Ω(g)", "grows no slower than g: a floor"],
      ["Theta, Θ(g)", "grows exactly like g: both"],
      ["c, n₀", "the fixed multiplier and the 'from here on' point in the Big-O definition"],
      ["Binary search", "find a value in a sorted array by halving: O(log n)"],
      ["Divide and conquer", "split into smaller copies, solve each, combine"],
      ["Base case", "the size small enough to answer directly (for sorting: 1 item)"],
      ["Merge", "combine two sorted lists into one sorted list in O(n)"],
      ["Stable", "equal items keep their original order"],
      ["In place", "uses only O(1) extra memory"],
    ]),
  ]},
 ],
}

g["exercises"] = [
  MC("rung-halving", "Spot the rung: halving", "What is the Big-O of this loop?\n\nint count = 0;\nfor (int i = n; i > 1; i = i / 2)\n    count++;", ["O(1)", "O(log n)", "O(n)", "O(n / 2)"], 1,
     ["It depends on n: bigger n means more passes.", "Right. i is halved each pass, so there are about log₂ n passes.", "It doesn't visit every value from n down to 1; it jumps by halving.", "O(n/2) would be a loop that goes down by 1 until n/2. And n/2 is just O(n) anyway."],
     ["i takes the values n, n/2, n/4, …, 2.", "The number of halvings from n to 1 is log₂ n.", "So the loop body runs about log₂ n times: O(log n)."],
     "Halving loops are the fingerprint of log n: binary search, heap operations, and the height of merge sort's tree.", ref="classes"),
  MC("rung-nested-const", "Spot the rung: a constant inner loop", "What is the Big-O?\n\nfor (int i = 0; i < n; i++)\n    for (int j = 0; j < 50; j++)\n        total += a[i];", ["O(n²)", "O(50n²)", "O(n)", "O(1)"], 2,
     ["Nested loops multiply, but the inner one is 50, not n.", "The inner loop never depends on n, and constants are dropped anyway.", "Right: 50 × n = 50n = O(n).", "The outer loop grows with n."],
     ["The outer loop runs n times.", "The inner loop runs 50 times every time: a constant.", "50n → drop the constant → O(n)."],
     "Only loops whose length depends on n change the rung. This is a common exam trick.", ref="classes"),
  FILL("bigo-shortcut", "Keep the fastest term", "Give the Big-O of T(n) = 4n² + 300n log n + 10⁶. Answer like O(n^2).", ["O(n^2)", "O(n²)", "n^2", "n²", "O(n*n)"],
     ["Which of the three terms grows fastest as n gets huge?", "n² beats n log n (because n beats log n), and both beat a constant.", "Keep 4n², drop the 4."],
     ["Terms: 4n², 300 n log n, 10⁶.", "Fastest-growing: n².", "Drop the constant 4: O(n²)."],
     "Big constants like 300 or 10⁶ feel important, but for big enough n the shape always wins.", ref="bigo"),
  FILL("bigo-c", "Find c", "To prove 3n + 8 = O(n) with n₀ = 8, what is the smallest whole-number c that works? (We need 3n + 8 ≤ c·n for all n ≥ 8.)", ["4"],
     ["Try c = 4: is 3n + 8 ≤ 4n when n ≥ 8?", "3n + 8 ≤ 4n ⟺ 8 ≤ n. True for all n ≥ 8.", "Could c = 3 work? 3n + 8 ≤ 3n means 8 ≤ 0: never."],
     ["c = 3 fails: 3n + 8 ≤ 3n is never true.", "c = 4: 3n + 8 ≤ 4n ⟺ n ≥ 8. True from n₀ = 8 on.", "So c = 4."],
     "This is the exact pattern of Poon's 5n + 10 example: one more than the leading number, and n₀ equal to the constant.", ref="bigo"),
  FILL("bs-looks", "Binary search looks", "About how many halvings does binary search need on a sorted list of 1,000,000 items? (Give the whole number of times you can halve 1,000,000 before reaching 1.)", ["19", "20"],
     ["2¹⁰ = 1,024, so 2²⁰ ≈ 1,000,000.", "log₂ 1,000,000 ≈ 19.9.", "Halving with whole numbers stops after 19; counting the final look it's 20."],
     ["2²⁰ ≈ 1,048,576 ≈ 1,000,000.", "So log₂ 1,000,000 ≈ 20.", "About 19 to 20 looks, compared with up to 1,000,000 for a linear scan."],
     "This is why databases and search indexes keep data sorted: lookups stay tiny even when the data is enormous.", ref="binsearch"),
  MC("merge-cost", "Cost of a merge", "Merging two sorted lists of 500 items each takes how many steps, roughly?", ["About 10 (log of 1000)", "About 1,000", "About 250,000", "About 1,000,000"], 1,
     ["That's the number of halvings, not of copies.", "Right: every item is copied to the output exactly once, so about 1,000 steps: O(n).", "That's (n/2)², what you'd get comparing every pair. Merge never does that.", "That's n², far too many."],
     ["Each step copies one item into the output.", "No item is copied twice.", "1,000 items total → about 1,000 steps."],
     "Merge is linear because sortedness lets you skip searching. That single fact is where merge sort's speed comes from.", ref="merge"),
  MC("ms-where-work", "Where merge sort does its work", "In merge sort, where do the comparisons between items actually happen?", ["While splitting the array in half", "Only in the base case", "While merging, on the way back up", "Nowhere; merge sort doesn't compare"], 2,
     ["Splitting just computes mid = (lo + hi) / 2. No item is looked at.", "A single item needs no comparison: it's already sorted.", "Right. All comparisons happen in merge, as the recursion returns.", "It's a comparison sort: merge compares two fronts."],
     ["Going down: just cutting.", "Base case: one item, nothing to do.", "Coming up: merge compares fronts. That's all the work."],
     "Quicksort (Lecture 9) is the mirror image: all its work happens on the way DOWN (partition), and there is nothing to combine.", ref="mergesort"),
  MC("choose-sort", "Pick the sort", "A fitness app keeps a leaderboard of 5,000 scores, always sorted. Each minute, one new score arrives and must be put in place. Which is the better fit?", ["Merge sort the whole list each minute", "Insertion sort's idea: slide the new score into place", "Try every ordering and keep the sorted one", "It doesn't matter; both are the same Big-O here"], 1,
     ["That's n log n ≈ 60,000 steps every minute to place one item.", "Right. On an almost-sorted list, insertion does at most n shifts, usually far fewer, and uses no extra memory.", "That's n!, hopeless.", "They're not: inserting one item is O(n) at worst, re-sorting is O(n log n)."],
     ["The list is already sorted except one item.", "Insertion sort's best case is on nearly sorted input.", "Sliding one item into place is at most n shifts."],
     "Matching the algorithm to the shape of the data, not just its size, is what real engineers do. It's also why Timsort looks for already-sorted runs.", ref="choose"),
] + old_exercises(SLUG)
g["exercises"] = [with_code(e) if e["id"].startswith("rung-") else e for e in g["exercises"]]

build(g)
