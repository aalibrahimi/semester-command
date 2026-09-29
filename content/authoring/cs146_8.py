from c146common import *
import fig8

FG = fig8.figures()
SLUG = "8-heaps-heapsort-pq"
O = lambda sid, pred: old_block(SLUG, sid, pred)

g = {
 "id": "cs146/8-heaps-heapsort-pq",
 "course": "cs146",
 "lessons": "Lecture 8",
 "title": "Heaps, heapify, buildHeap, heap sort, priority queues",
 "summary": "Say why a priority queue needs a heap; read a heap as a tree and as an array with the index formulas; trace heapify, buildHeap and heapSort; explain why buildHeap is O(n) and heap sort is O(n log n) with O(1) space; and run insert and extract on a priority queue.",
 "estimatedMinutes": 75,
 "sourceNote": "Lecture 8 'Heaps, Heap Sort, Priority Queues' (Sep 16) slides, HW 8, CLRS ch. 6. Real-world notes are general industry practice.",
 "requires": ["cs146/2-adts-invariants-insertion", "cs146/4-big-o-merge-sort"],
 "sections": [
  {"id": "map", "heading": "The big picture: always hand over the most urgent thing", "blocks": [
    P("Stacks hand you the newest item, queues the oldest. Lots of real problems want neither: they want the **most important** item, while new items keep arriving. That's a **priority queue**, and a **heap** is the clever structure that makes it fast. Along the way you get a third n log n sort that needs no extra memory.", slide="What this chapter answers"),
    DG("roadmap", {"eyebrow": "The question", "question": "Always hand over the **most urgent** thing, fast", "steps": [
        {"title": "Priority queue", "sub": "the contract: take the max", "result": "the ADT"},
        {"title": "Heap", "sub": "a tree stored in an array", "result": "parent ≥ kids", "tone": "brand"},
        {"title": "heapify", "sub": "let one value sink", "result": "O(log n)", "tone": "amber"},
        {"title": "buildHeap", "sub": "heapify from the bottom up", "result": "O(n)", "tone": "green"},
        {"title": "heapSort", "sub": "pull the max out n times", "result": "O(n log n)", "tone": "brand"}]},
       "The chapter in five steps. The pay-off: an n log n sort with no extra memory.", slide="Five steps"),
  ]},
  {"id": "why", "heading": "Why heaps exist: the emergency room", "blocks": [
    DG("cards", {"cards": [
        {"title": "Queue", "badge": "by arrival", "tone": "red", "lines": ["A (2), B (9), C (4), D (7)", "the critical patient B waits behind A"]},
        {"title": "Priority queue", "badge": "by urgency", "tone": "green", "lines": ["B (9), D (7), C (4), A (2)", "most urgent first, even as new patients arrive"]}],
       "note": "Patients keep arriving, so re-sorting everyone each time would be too slow. A heap keeps just enough order to find the max fast."},
       "Poon's emergency room: arrival order vs urgency order.", slide="Who goes next?"),
    D("Priority queue (the ADT)", "A container where each item has a priority. Operations: **insert(x)**, **extract()** (remove and return the highest priority), **peek()**, **isEmpty()**."),
    WHY("**Why not just keep a sorted list?** Inserting into a sorted array costs O(n) shifts. Keeping it unsorted makes extract cost O(n) to find the max. A heap makes **both** O(log n) by keeping only a partial order: just enough to know where the max is."),
    O("why", lambda b: b["type"] == "definition"),
    O("why", lambda b: b["type"] == "prose" and "does not say" in b["md"]),
  ]},
  {"id": "array", "heading": "The array IS the tree", "blocks": [
    F(FG["arraytree"], "The same ten numbers drawn two ways. The tree is how you think; the array is what the computer stores. Read the tree level by level, left to right, and you get the array.", slide="Tree and array"),
    O("array", lambda b: b["type"] == "trap"),
    O("array", lambda b: b.get("label") == "why"),
    THINK("**When you see an index, draw the family.** For index i, say out loud: 'my kids are 2i + 1 and 2i + 2, my parent is (i − 1) / 2 rounded down.' For i = 3: kids 7 and 8, parent 1. Two seconds, and every heap question gets easier."),
    PY("Your turn: the index formulas", "Write `left(i)`, `right(i)` and `parent(i)` (0-based), then `is_max_heap(a)`: True when every item is ≤ its parent.",
       '''
def left(i):
    return 0

def right(i):
    return 0

def parent(i):
    return 0

def is_max_heap(a):
    # check every index i >= 1 against its parent
    return True

print(left(1), right(1), parent(4))                 # expect 3 4 1
print(is_max_heap([16, 14, 10, 8, 7, 9, 3, 2, 4, 1]))   # a heap
print(is_max_heap([16, 4, 10, 14, 7, 9, 3, 2, 8, 1]))   # 4 has a bigger child
''',
       check='''
assert (left(0), right(0)) == (1, 2), "The root's children are at 1 and 2."
assert (left(3), right(3)) == (7, 8), "Index 3's children: 2·3 + 1 = 7 and 2·3 + 2 = 8."
assert parent(7) == 3 and parent(8) == 3, "7 and 8 are both children of 3: (7 − 1) // 2 = 3 and (8 − 1) // 2 = 3."
assert parent(1) == 0 and parent(2) == 0, "1 and 2 are the root's children."
assert is_max_heap([16, 14, 10, 8, 7, 9, 3, 2, 4, 1]) is True, "[16, 14, 10, 8, 7, 9, 3, 2, 4, 1] is a max-heap."
assert is_max_heap([16, 4, 10, 14, 7, 9, 3, 2, 8, 1]) is False, "In [16, 4, 10, 14, …], index 1 (4) has a child 14 that's bigger: not a heap."
assert is_max_heap([]) is True and is_max_heap([5]) is True, "Empty and one-item arrays are heaps."
''',
       solution='''
def left(i):
    return 2 * i + 1

def right(i):
    return 2 * i + 2

def parent(i):
    return (i - 1) // 2

def is_max_heap(a):
    return all(a[parent(i)] >= a[i] for i in range(1, len(a)))

print(left(1), right(1), parent(4))
print(is_max_heap([16, 14, 10, 8, 7, 9, 3, 2, 4, 1]))
print(is_max_heap([16, 4, 10, 14, 7, 9, 3, 2, 8, 1]))
''',
       hints=["left = 2i + 1, right = 2i + 2.", "parent = (i − 1) // 2 (integer division rounds down).", "is_max_heap: `all(a[parent(i)] >= a[i] for i in range(1, len(a)))`."],
       success="Those three one-line formulas are the whole reason a heap needs no pointers."),
    O("array", lambda b: b["type"] == "check"),
  ]},
  {"id": "heapify", "heading": "heapify: let one value sink", "blocks": [
    D("heapify(a, i)", "Fix **one** node: if a[i] is smaller than a child, swap it with its **larger** child and repeat from there, until it's bigger than both children or reaches a leaf. It assumes both subtrees under i are already heaps."),
    ST("heapify(a, 1): the 4 sinks to where it belongs (Lecture 8)", heapify_frames([16, 4, 10, 14, 7, 9, 3, 2, 8, 1], 1)),
    THINK("**Always swap with the LARGER child.** If you swapped with the smaller one, the bigger child would end up under a smaller parent and you'd break the heap you were fixing. Bigger child goes up; the sinking value goes down."),
    O("heapify", lambda b: b["type"] == "example"),
    O("heapify", lambda b: b["type"] == "prose" and "assumes" in b["md"]),
    O("heapify", lambda b: b["type"] == "prose" and "misconception" in b["md"]),
    PY("Your turn: write heapify", "Write `heapify(a, i, n)` for a max-heap of size n (the part a[0..n−1]). Loop: find the largest of a[i] and its children that exist (index < n); if that's i, stop; otherwise swap and continue from the child.",
       '''
def heapify(a, i, n):
    while True:
        l, r = 2 * i + 1, 2 * i + 2
        largest = i
        # if l < n and a[l] > a[largest]: largest = l   (same for r)
        # if largest == i: stop; else swap a[i], a[largest] and set i = largest
        return

a = [16, 4, 10, 14, 7, 9, 3, 2, 8, 1]
heapify(a, 1, len(a))
print(a)    # expect [16, 14, 10, 8, 7, 9, 3, 2, 4, 1]
''',
       check='''
a = [16, 4, 10, 14, 7, 9, 3, 2, 8, 1]
heapify(a, 1, len(a))
assert a == [16, 14, 10, 8, 7, 9, 3, 2, 4, 1], f"heapify(a, 1) on the slide's array should give [16, 14, 10, 8, 7, 9, 3, 2, 4, 1]. Got {a}."
b = [1, 5, 9]
heapify(b, 0, 3)
assert b == [9, 5, 1], f"The root must swap with its LARGER child: [1, 5, 9] → [9, 5, 1]. Got {b}."
c = [3, 9, 8, 100]
heapify(c, 0, 3)
assert c == [9, 3, 8, 100], f"Only the first n items are the heap: with n = 3, index 3 (100) must be ignored. Got {c}."
''',
       solution='''
def heapify(a, i, n):
    while True:
        l, r = 2 * i + 1, 2 * i + 2
        largest = i
        if l < n and a[l] > a[largest]:
            largest = l
        if r < n and a[r] > a[largest]:
            largest = r
        if largest == i:
            return
        a[i], a[largest] = a[largest], a[i]
        i = largest

a = [16, 4, 10, 14, 7, 9, 3, 2, 8, 1]
heapify(a, 1, len(a))
print(a)
''',
       hints=["Two ifs pick the largest: compare a[l] and a[r] with a[largest], only when l < n / r < n.", "`if largest == i: return`.", "Otherwise swap `a[i], a[largest] = a[largest], a[i]` and set `i = largest`."],
       success="One path down the tree, at most log n swaps: heapify is O(log n). Everything else in this chapter is built from it."),
  ]},
  {"id": "build", "heading": "buildHeap: any array → a heap, in O(n)", "blocks": [
    D("buildHeap(a)", "Turn any array into a max-heap by calling heapify on every non-leaf, **from the last one (index ⌊n/2⌋ − 1) back to the root**."),
    ST("HW 8 Problem 1: buildHeap on [1, 2, 3, 4, 5, 6, 7]", buildheap_frames([1, 2, 3, 4, 5, 6, 7])),
    WHY("**Why bottom-up?** heapify(i) only works if both subtrees under i are already heaps. Going from the bottom up guarantees that: by the time you reach a node, everything below it has been fixed. Leaves are one-item heaps, so they need nothing."),
    O("build", lambda b: b["type"] == "example"),
    DG("levels", {"rows": [
        {"label": "1 node", "parts": [1], "partLabel": "≤3", "total": "≤ 3 swaps", "tone": "amber"},
        {"label": "2 nodes", "parts": [1, 1], "partLabel": "≤2", "total": "≤ 4 swaps", "tone": "amber"},
        {"label": "4 nodes", "parts": [1, 1, 1, 1], "partLabel": "≤1", "total": "≤ 4 swaps", "tone": "brand"},
        {"label": "8 leaves", "parts": [1] * 8, "partLabel": "0", "total": "0 swaps", "tone": "green"}],
       "summary": "≤ 11 swaps for n = 15: about n, not n log n", "detail": "half the nodes are leaves and never move"},
       "Why buildHeap is O(n). Each box is one node, labeled with how far it can sink at most. Most nodes are near the bottom and can barely move.", slide="Why O(n)"),
    O("build", lambda b: b["type"] == "sim"),
    O("build", lambda b: b.get("label") == "why"),
    O("build", lambda b: b["type"] == "check"),
  ]},
  {"id": "sort", "heading": "heapSort: pull the max out, n times", "blocks": [
    D("heapSort(a)", "buildHeap once. Then repeat: swap the root (the max) with the last item of the heap, shrink the heap by one, heapify the root."),
    ST("heapSort on [7, 5, 6, 4, 2, 1, 3]", heapsort_frames([7, 5, 6, 4, 2, 1, 3])),
    O("sort", lambda b: b["type"] == "example"),
    O("sort", lambda b: b["type"] == "sim"),
    O("sort", lambda b: b["type"] == "table" and "Question" in b["columns"]),
    O("sort", lambda b: b["type"] == "table" and "Heap" in b["columns"]),
    WHEN("**Use heap sort** when you need a guaranteed n log n **and** can't afford extra memory: embedded devices, kernels, systems with a hard memory budget. **Prefer merge sort** when you need stability (equal items keep their order). **Prefer quicksort** (next chapter) when average speed matters most. Real libraries often use heap sort as a safety net inside quicksort (introsort)."),
    TRAP("Calling heap sort stable. It isn't: the swap of the root to the end can jump an item over equal items.", "Lecture 8 slide 35"),
    O("sort", lambda b: b["type"] == "check"),
  ]},
  {"id": "pq", "heading": "Priority queue: insert and extract, O(log n) each", "blocks": [
    O("pq", lambda b: b["type"] == "prose" and "Lectures 2–3" in b["md"]),
    ST("insert(9) into [8, 5, 7, 2, 3]: trickle up", insert_frames([8, 5, 7, 2, 3], 9)),
    ST("extract() on [9, 8, 7, 5, 3, 2] (slides 41–42)", extract_frames([9, 8, 7, 5, 3, 2])),
    SIM("heap", "Now you drive: insert a big number and watch it climb, then extractMax and watch the replacement sink. The counter compares the swaps with the tree's height.", {"array": [9, 8, 7, 5, 3, 2]}),
    O("pq", lambda b: b["type"] == "definition" and b["term"] == "insert(x)"),
    O("pq", lambda b: b["type"] == "definition" and b["term"] == "extract()"),
    O("pq", lambda b: b["type"] == "definition" and b["term"] == "peek()"),
    O("pq", lambda b: b["type"] == "definition" and b["term"] == "buildHeap"),
    O("pq", lambda b: b["type"] == "definition" and b["term"].startswith("update")),
    WORLD("**Priority queues quietly run a lot of software.** Your operating system picks the next program to run from a priority queue. Game engines and web servers keep a queue of timed events ordered by 'when'. Google Maps-style shortest routes use Dijkstra's algorithm, which is a priority queue of 'closest unvisited place'. Python ships one as `heapq`; Java as `PriorityQueue`."),
    PY("See it: an ER with Python's heapq", "Python's `heapq` is a **min**-heap on a plain list. To pop the most urgent first, push `(-urgency, name)`. Run it, then add a patient with urgency 10 midway.",
       '''
import heapq

er = []
for name, urgency in [("A", 2), ("B", 9), ("C", 4)]:
    heapq.heappush(er, (-urgency, name))      # negate: min-heap acts as max-heap
    print("arrived:", name, "urgency", urgency, "| next up:", er[0][1])

heapq.heappush(er, (-7, "D"))
print("D arrives (7). Treating in order:")
while er:
    neg, name = heapq.heappop(er)
    print("  treat", name, "urgency", -neg)
'''),
    O("pq", lambda b: b["type"] == "example"),
    O("pq", lambda b: b["type"] == "check"),
    O("pq", lambda b: b["type"] == "prose" and "Heap in one paragraph" in b["md"]),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Priority queue", "the ADT: insert, extract the highest priority, peek, isEmpty"],
      ["Binary max-heap", "a complete binary tree where every parent ≥ its children"],
      ["Complete", "every level full except the last, which fills left to right"],
      ["heapify(i)", "let a[i] sink by swapping with its larger child: O(log n)"],
      ["buildHeap", "heapify every non-leaf from ⌊n/2⌋ − 1 down to 0: O(n)"],
      ["heapSort", "buildHeap, then n × (swap root to end, heapify): O(n log n), O(1) space, not stable"],
      ["Trickle up", "insert's move: swap with the parent while bigger"],
    ]),
  ]},
 ],
}

g["exercises"] = [
  FILL("hp-kids", "Children of 5", "In a 0-based heap array, what are the indexes of the children of index 5? Answer like 11, 12.", ["11, 12", "11,12", "11 and 12", "11 12"],
     ["left = 2i + 1.", "right = 2i + 2.", "i = 5."], ["2·5 + 1 = 11.", "2·5 + 2 = 12.", "Children: 11, 12."], "Index arithmetic replaces pointers; getting it right is the first line of every heap trace.", ref="array"),
  FILL("hp-parent", "Parent of 9", "What is the parent index of index 9?", ["4"],
     ["parent = ⌊(i − 1) / 2⌋.", "(9 − 1) / 2 = 4.", "Check: 2·4 + 2 = 10, 2·4 + 1 = 9. ✓"], ["(9 − 1) / 2 = 4."], "Trickle-up in insert uses this formula at every step.", ref="array"),
  MC("hp-larger", "Which child?", "heapify finds a[i] smaller than both children. Which child does it swap with, and why?", ["The left one, always", "The smaller one, to move less", "The larger one, so the new parent is ≥ both children", "Either; it doesn't matter"], 2,
     ["Left isn't special.", "Then the bigger child would sit under a smaller parent: broken heap.", "Right: the larger child becomes the parent of the other child, so the property holds there.", "It matters: the wrong choice breaks the heap one level down."],
     ["After the swap, the child you picked becomes the parent.", "It must be ≥ the other child.", "So pick the larger."], "This is the most common heapify mistake on a hand trace.", ref="heapify"),
  FILL("hp-first", "Where buildHeap starts", "buildHeap on an array of n = 10. Which index is heapified first?", ["4"],
     ["First leaf = ⌊n/2⌋ = 5.", "Start one before the first leaf.", "⌊10/2⌋ − 1."], ["Leaves: 5 to 9.", "Last non-leaf: 4.", "Order: 4, 3, 2, 1, 0."], "Starting at the last non-leaf skips half the array: the leaves are already one-item heaps.", ref="build"),
  MC("hp-buildcost", "buildHeap's cost", "Why is buildHeap O(n) even though it calls heapify (O(log n)) about n/2 times?", ["It isn't; it's O(n log n)", "Most nodes are near the bottom and can only sink a level or two", "heapify is O(1) during buildHeap", "It only heapifies the root"], 1,
     ["The loose bound is n log n, but the tight one is n.", "Right: half the nodes are leaves (0 work), a quarter sink ≤ 1, an eighth ≤ 2… The sum stays under n.", "Each call can still be log n for the nodes near the top.", "It heapifies every non-leaf."],
     ["How far can a node near the bottom sink?", "Count nodes per level times their max sink distance.", "n/4·1 + n/8·2 + n/16·3 + … < n."], "A classic example of a loose Big-O bound vs a tight one.", ref="build"),
  MC("hp-space", "Heap sort's space", "How much extra memory does heap sort use, and is it stable?", ["O(n), stable", "O(1), stable", "O(1), not stable", "O(log n), not stable"], 2,
     ["That's merge sort.", "It's in place, but the long-distance swaps break stability.", "Right: everything happens inside the input array, and swapping the root to the end can jump equal items.", "That's quicksort's call stack."],
     ["Does heap sort allocate a second array?", "No: it swaps within a.", "Can equal items change order? Yes."], "In-place + guaranteed n log n is heap sort's selling point for memory-tight systems.", ref="sort"),
  MC("hp-insert", "insert's cost", "What does insert(x) cost on a heap of n items, and why?", ["O(1): append to the end", "O(log n): append, then trickle up at most the tree's height", "O(n): shift items to make room", "O(n log n)"], 1,
     ["Appending is O(1), but x may be bigger than its parent.", "Right: one path from a leaf to the root, height log n.", "Nothing shifts; it swaps along one path.", "Too much."],
     ["Where does x go first?", "At the end: index n.", "Then it swaps upward, at most log n times."], "Both PQ operations follow one root-to-leaf path: that's why heaps beat sorted arrays for this job.", ref="pq"),
  FILL("hp-extract", "Extract by hand", "extract() on the max-heap [9, 8, 7, 5, 3, 2]. What is the array after the operation? Answer like [a, b, c, d, e].", ["[8, 5, 7, 2, 3]", "8, 5, 7, 2, 3", "[8,5,7,2,3]"],
     ["Return 9; move the last item (2) to the root.", "2 vs children 8 and 7: swap with 8.", "2 (now at index 1) vs children 5 and 3: swap with 5."], ["Take 9. Root ← 2: [2, 8, 7, 5, 3].", "Swap with 8: [8, 2, 7, 5, 3].", "Swap with 5: [8, 5, 7, 2, 3]."], "Poon's slide 41–42 example: exactly what the midterm will ask you to trace.", ref="pq"),
] + old_exercises(SLUG)

build(g)
