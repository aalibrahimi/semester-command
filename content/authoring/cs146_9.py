from c146common import *
from cs146_traces import TRACE, insertion_trace, merge_trace, mergesort_trace, heapify_trace, partition_trace, quicksort_trace

SLUG = "9-quicksort"
O = lambda sid, pred: old_block(SLUG, sid, pred)

g = {
 "id": "cs146/9-quicksort",
 "course": "cs146",
 "lessons": "Lecture 9",
 "title": "Quicksort: partition, recursion, and why the worst case is n²",
 "summary": "Trace Lomuto partition (pivot, i, j, the final swap, the return value); run quicksort's recursion on an array; write its recurrence and explain the Θ(n²) worst case, the Θ(n log n) best and average case, and how real libraries avoid the worst case.",
 "estimatedMinutes": 70,
 "sourceNote": "Lecture 9 'Quicksort' (Sep 21) slides, HW 9, CLRS ch. 7. Builds on merge sort (Lecture 5) and recurrences (Lectures 6 and 7). Real-world notes are general industry practice.",
 "requires": ["cs146/4-big-o-merge-sort", "cs146/6-recurrences"],
 "sections": [
  {"id": "map", "heading": "The big picture: sort in place by picking a pivot", "blocks": [
    P("Merge sort is always n log n but needs a second array. Heap sort needs no extra array but is fiddly and not very cache-friendly. **Quicksort** sorts inside the one array and, on typical data, is the fastest of the three. Its one weakness is a bad pivot, and this chapter shows exactly when that happens and how real code avoids it.", slide="What this chapter answers"),
    DG("roadmap", {"eyebrow": "The question", "question": "Sort **in place**, fast, by picking a pivot", "steps": [
        {"title": "Pivot", "sub": "one item goes to its final spot", "result": "the idea"},
        {"title": "partition", "sub": "small items left, big items right", "result": "O(n)", "tone": "brand"},
        {"title": "quicksort", "sub": "partition, then recurse on both sides", "result": "3 lines", "tone": "green"},
        {"title": "Analysis", "sub": "it depends on the pivot", "result": "n log n … n²", "tone": "amber"},
        {"title": "In practice", "sub": "how libraries dodge n²", "result": "random pivot"}]},
       "The chapter in five steps.", slide="Five steps"),
  ]},
  {"id": "why", "heading": "The idea: line a class up by height", "blocks": [
    O("why", lambda b: b["type"] == "prose" and "analogy" in b["md"].lower()),
    O("why", lambda b: b["type"] == "definition"),
    WHY("**Why pick one item and not sort everything at once?** Because placing ONE item correctly is cheap (one pass, O(n)) and it splits the problem in two independent halves that never need to be combined. Do that again inside each half, and the whole thing sorts itself."),
  ]},
  {"id": "partition", "heading": "partition: the one step that does all the work", "blocks": [
    O("partition", lambda b: b["type"] == "definition"),
    ST("partition(a, 0, 4) on [9, 3, 1, 7, 5] (the slide's example)", partition_frames([9, 3, 1, 7, 5], 0, 4)),
    TRACE("partition(a, 0, 4), line by line", partition_trace([9, 3, 1, 7, 5], 0, 4)),
    P("Watch the colors: **green** is 'known to be ≤ pivot', **amber** is 'known to be > pivot', white is 'not checked yet'. **j is the scout** walking right; **i is the boundary** of the green zone. A small item gets swapped into the green zone; a big one is simply walked past."),
    O("partition", lambda b: b["type"] == "example"),
    ST("Your turn from the slides: partition(a, 2, 7) on [19, 9, 5, 1, 8, 7, 2, 3, 4, 6]", partition_frames([19, 9, 5, 1, 8, 7, 2, 3, 4, 6], 2, 7)),
    THINK("**The invariant that makes partition correct:** at every moment, a[low..i] ≤ pivot, a[i+1..j−1] > pivot, a[j..high−1] unchecked, a[high] = pivot. Each step keeps it true; when j reaches high, one swap puts the pivot between the two zones."),
    SIM("sort", "Pick *quicksort* and press Next to watch every partition step. Then type your own array. Try an already sorted one like 1, 2, 3, 4, 5, 6 and count the comparisons.", {"algorithm": "quick", "array": [9, 3, 1, 7, 5]}),
    P("**Runtime of partition** The loop runs once for each element from `low` to `high − 1`, doing constant work each time. So partition on n elements is **Θ(n)**."),
    O("partition", lambda b: b["type"] == "trap" and "Returning i" in b["body"]),
    O("partition", lambda b: b["type"] == "trap" and "Counting indexes" in b["body"]),
    PY("Your turn: write partition", "Write Lomuto `partition(a, low, high)` in Python: pivot = a[high], i = low − 1, scout j from low to high − 1, final swap, return i + 1.",
       '''
def partition(a, low, high):
    pivot = a[high]
    i = low - 1
    # for j in range(low, high): if a[j] <= pivot: i += 1 and swap a[i], a[j]
    # then swap a[i + 1] with a[high] and return i + 1
    return -1

a = [9, 3, 1, 7, 5]
p = partition(a, 0, 4)
print(a, "pivot landed at", p)     # expect [3, 1, 5, 7, 9] 2
''',
       check='''
a = [9, 3, 1, 7, 5]
p = partition(a, 0, 4)
assert (a, p) == ([3, 1, 5, 7, 9], 2), f"partition([9, 3, 1, 7, 5], 0, 4) should leave [3, 1, 5, 7, 9] and return 2. Got {a}, {p}."
b = [19, 9, 5, 1, 8, 7, 2, 3, 4, 6]
p = partition(b, 2, 7)
assert p == 4 and b == [19, 9, 1, 2, 3, 7, 5, 8, 4, 6], f"partition(b, 2, 7) should return 4 (an index into the WHOLE array) and leave a[0..1] and a[8..9] untouched. Got {b}, {p}."
c = [1, 2, 3, 4]
assert partition(c, 0, 3) == 3, "On sorted input the pivot (the max) stays at the end: return 3."
''',
       solution='''
def partition(a, low, high):
    pivot = a[high]
    i = low - 1
    for j in range(low, high):
        if a[j] <= pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[high] = a[high], a[i + 1]
    return i + 1

a = [9, 3, 1, 7, 5]
p = partition(a, 0, 4)
print(a, "pivot landed at", p)
''',
       hints=["`for j in range(low, high):` stops BEFORE high, the pivot.", "Inside: `if a[j] <= pivot: i += 1; a[i], a[j] = a[j], a[i]`.", "After the loop: `a[i + 1], a[high] = a[high], a[i + 1]` and `return i + 1`."],
       success="Ten lines, and the heart of the fastest general-purpose sort. It's also one of the most-asked interview snippets."),
    O("partition", lambda b: b["type"] == "check"),
  ]},
  {"id": "quicksort", "heading": "quicksort: partition, then recurse on both sides", "blocks": [
    O("quicksort", lambda b: b["type"] == "example" and "quicksort(a, low, high)" in b["body"]),
    ST("quicksort on [2, 8, 7, 1, 3, 5, 6, 4] (the slide's example)", quicksort_frames([2, 8, 7, 1, 3, 5, 6, 4])),
    TRACE("The recursion on a smaller array, [5, 2, 8, 1, 4]: which call is running, and who is waiting", quicksort_trace([5, 2, 8, 1, 4])),
    {"type": "video", "src": "/study-videos/cs146-quicksort.mp4", "slide": "Watch it move",
     "caption": "Quicksort on the slide's array as a 2.5-minute video: code on the left, bars on the right. Every partition, every swap, and which calls are waiting on the stack. Use the chips to jump, or slow it to 0.75×.",
     "chapters": [{"t": 0, "label": "Start"}, {"t": 5, "label": "First partition"}, {"t": 46, "label": "Left side"}, {"t": 87, "label": "Right side"}, {"t": 137, "label": "Runtime"}]},
    P("Notice what is **not** there: no merge step. Once the pivot is in place and both sides are sorted, the whole range is sorted, because every left item ≤ pivot < every right item. And the pivot is **left out** of both recursive calls (p − 1 and p + 1): it's already done."),
    O("quicksort", lambda b: b["type"] == "table"),
    O("quicksort", lambda b: b["type"] == "prose" and "on the way" in b["md"]),
    O("quicksort", lambda b: b["type"] == "check"),
  ]},
  {"id": "analysis", "heading": "How fast? It depends on the pivot", "blocks": [
    O("analysis", lambda b: b["type"] == "example" and "recurrence" in b["title"].lower()),
    O("analysis", lambda b: b["type"] == "prose" and "not fixed" in b["md"]),
    DG("cards", {"cards": [
        {"title": "Good pivots", "badge": "about half / half", "tone": "green", "viz": [1, 2, 4, 8], "lines": ["log n levels, n work per level", "T(n) = 2T(n/2) + n → **Θ(n log n)**"]},
        {"title": "Bad pivots", "badge": "n − 1 and 0", "tone": "red", "viz": [6, 5, 4, 3, 2, 1], "lines": ["n levels, each one item shorter", "T(n) = T(n − 1) + n → **Θ(n²)**"]}],
       "note": "Each bar is one level of the recursion: how many pieces (good) or how big the one piece is (bad). Lomuto on **already sorted** input always picks the max as pivot, so it's always the bad shape."},
       "The pivot decides the shape of the recursion, and the shape decides the running time.", slide="Two shapes"),
    O("analysis", lambda b: b["type"] == "example" and "Worst case" in b["title"]),
    ST("The worst case: quicksort on already sorted [1, 2, 3, 4, 5]", quicksort_frames([1, 2, 3, 4, 5])),
    O("analysis", lambda b: b["type"] == "example" and "Best case" in b["title"]),
    O("analysis", lambda b: b["type"] == "prose" and "Average case" in b["md"]),
    O("analysis", lambda b: b["type"] == "table"),
    O("analysis", lambda b: b["type"] == "trap"),
    O("analysis", lambda b: b["type"] == "check"),
  ]},
  {"id": "practice", "heading": "How real code avoids the worst case", "blocks": [
    O("practice", lambda b: b["type"] == "prose" and "Nobody ships" in b["md"]),
    O("practice", lambda b: b["type"] == "table"),
    WORLD("**Where you'll meet it.** Java's `Arrays.sort` on primitive arrays is a dual-pivot quicksort. C++'s `std::sort` is **introsort**: quicksort that switches to heap sort if the recursion gets too deep (so the worst case is n log n) and to insertion sort on tiny pieces, the same trick as Project 1's hybrid. Database engines use quicksort-style partitioning for in-memory sorts, and 'quickselect' (partition, then recurse on ONE side) finds a median or the top-k in O(n) on average."),
    WHEN("**Use quicksort** (your library's sort) for general in-memory sorting where average speed matters most. **Use merge sort / Timsort** when you need stability or a guaranteed n log n on adversarial input. **Use heap sort** when memory is tight and you need a guarantee. **Use partition alone** (quickselect) when you only need the k-th smallest, not a full sort."),
    PY("See it: sorted input vs random input", "This counts quicksort's comparisons on a random list and on an already sorted list of the same size, with a last-element pivot and with a random pivot. Run it and compare the last two columns.",
       '''
import random, sys
sys.setrecursionlimit(10000)

def quicksort(a, lo, hi, pick, count):
    if lo < hi:
        k = pick(lo, hi)
        a[k], a[hi] = a[hi], a[k]           # move the chosen pivot to the end
        pivot, i = a[hi], lo - 1
        for j in range(lo, hi):
            count[0] += 1
            if a[j] <= pivot:
                i += 1
                a[i], a[j] = a[j], a[i]
        a[i + 1], a[hi] = a[hi], a[i + 1]
        quicksort(a, lo, i, pick, count)
        quicksort(a, i + 2, hi, pick, count)

last = lambda lo, hi: hi
rand = lambda lo, hi: random.randint(lo, hi)

for n in [200, 800, 1600]:
    row = []
    for data in (random.sample(range(n), n), list(range(n))):
        for pick in (last, rand):
            c = [0]
            quicksort(list(data), 0, n - 1, pick, c)
            row.append(c[0])
    print(f"n = {n:5}: random+last {row[0]:8,}  random+rand {row[1]:8,}  SORTED+last {row[2]:9,}  sorted+rand {row[3]:8,}")
'''),
    O("practice", lambda b: b["type"] == "check"),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Pivot", "the item partition puts in its final place; Lomuto uses the last item"],
      ["partition", "one pass that puts ≤ pivot left, > pivot right, pivot between: Θ(n)"],
      ["i (boundary) / j (scout)", "end of the ≤ pivot zone / the next item to check"],
      ["In place", "sorts inside the input array; quicksort's only extra space is the call stack"],
      ["Worst case", "Θ(n²): every pivot is the max or min (Lomuto on sorted input)"],
      ["Randomized pivot", "pick the pivot at random so no particular input is bad"],
      ["Introsort", "quicksort with a heap sort fallback; what C++'s std::sort does"],
    ]),
  ]},
 ],
}

g["exercises"] = [
  FILL("qs-return", "What does partition return?", "partition([4, 8, 2, 6, 5], 0, 4) with the last element as pivot. What index does it return?", ["2"],
     ["Pivot = 5. Which items are ≤ 5?", "4 and 2: two items, so the green zone is a[0..1].", "The pivot goes right after it: index 2."], ["≤ 5: 4, 2 → i ends at 1.", "Swap a[2] with the pivot.", "Return i + 1 = 2. Array: [4, 2, 5, 6, 8]."], "The return value is the pivot's final index, which is where quicksort splits its recursion.", ref="partition"),
  MC("qs-scout", "i and j", "In Lomuto partition, what are i and j?", ["i = the pivot, j = the last index", "i = end of the ≤ pivot zone (boundary), j = the next item to check (scout)", "i and j both walk from the two ends toward the middle", "i counts swaps, j counts comparisons"], 1,
     ["The pivot is a[high]; i is an index into the green zone.", "Right: j scouts every item; i grows the green zone when j finds a small one.", "That's Hoare's partition, not Lomuto's.", "They're positions in the array, not counters."],
     ["What does i + 1 mean after the loop?", "It's the first slot after the ≤ pivot zone.", "j walks low..high − 1."], "Keeping the two roles straight is what the midterm's partition trace tests.", ref="partition"),
  MC("qs-worst", "The surprising worst case", "Lomuto quicksort (pivot = last item) takes Θ(n²) on which input?", ["Random input", "Already sorted input", "Input with all distinct values", "Input of odd length"], 1,
     ["Random input is Θ(n log n) on average.", "Right: the pivot is always the max, so each call only removes one item.", "Distinctness alone doesn't matter.", "Length parity doesn't matter."],
     ["Where does the pivot land if it's the largest item?", "At the end: left side n − 1, right side 0.", "T(n) = T(n − 1) + n."], "Sorted data is common in real systems (appended in time order), which is why no library ships plain Lomuto.", ref="analysis"),
  MC("qs-recurrence", "Best-case recurrence", "When every pivot lands in the middle, quicksort's recurrence is…", ["T(n) = T(n − 1) + n", "T(n) = 2T(n/2) + n", "T(n) = T(n/2) + 1", "T(n) = 4T(n/2) + n"], 1,
     ["That's the worst case.", "Right: two halves plus Θ(n) partition work. Merge sort's recurrence: Θ(n log n).", "That's binary search.", "That's the master method's case 1 example."],
     ["How many recursive calls, how big?", "Two, each n/2.", "Plus partition's n."], "Same recurrence as merge sort, but the work happens on the way down (partition) instead of up (merge).", ref="analysis"),
  MC("qs-space", "Quicksort's extra space", "Quicksort sorts in place. What extra space does it still use?", ["None at all", "O(log n) on average: the call stack of pending recursive calls", "O(n): a temp array", "O(n²)"], 1,
     ["The recursion needs somewhere to remember what's left to do.", "Right: about log n deep with balanced splits (n deep in the worst case).", "That's merge sort.", "Far too much."],
     ["What does each pending call cost?", "One stack frame.", "How deep does the recursion go when splits are balanced?"], "This is why production quicksorts recurse on the smaller side first: it keeps the stack at O(log n) even in bad cases.", ref="analysis"),
  MC("qs-fix", "Dodging the worst case", "Which change makes sorted input no longer a problem for quicksort?", ["Use a bigger array", "Choose the pivot at random (or median of three)", "Always pick the first item as pivot", "Recurse on the right side first"], 1,
     ["Size doesn't change the shape.", "Right: no particular input consistently gives bad pivots any more.", "On sorted input the first item is the min: just as bad.", "Order of recursion affects stack depth, not total work."],
     ["Why is sorted input bad?", "The last item is always the max.", "Pick a pivot the input can't predict."], "Randomization turns 'some inputs are always slow' into 'every input is fast with overwhelming probability'.", ref="practice"),
] + old_exercises(SLUG)

build(g)
