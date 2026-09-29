from c146common import *
import fig2

FG = fig2.figures()
SLUG = "2-adts-invariants-insertion"
O = lambda sid, pred: old_block(SLUG, sid, pred)

g = {
 "id": "cs146/2-adts-invariants-insertion",
 "course": "cs146",
 "lessons": "Lectures 2–3",
 "title": "ADTs, loop invariants, and insertion sort",
 "summary": "Say what an ADT is and pick stack vs queue for a real situation; build an array stack and a circular queue; draw a linked list and splice into it without losing anything; prove a loop correct with a three-part invariant; trace insertion sort and explain its best and worst case.",
 "estimatedMinutes": 90,
 "sourceNote": "Lecture 2 'Review: Lists, Stacks, Queues' (Aug 24) and Lecture 3 'Loop Invariants, Insertion Sort' (Aug 26) slides, HW 2, HW 3, Project 1 Part 1. Real-world notes are general industry practice.",
 "requires": [],
 "sections": [
  {"id": "map", "heading": "The big picture: two lectures, six ideas", "blocks": [
    P("Lecture 2 is about **containers**: ways to hold data so the operations you need are fast. Lecture 3 is about **being sure**: proving a loop does what you think, then using that on your first real sort. Each idea below builds on the one before it.", slide="What these lectures cover"),
    DG("roadmap", {"eyebrow": "Two lectures, two questions", "question": "What does it do, and **is it right**?", "steps": [
        {"title": "ADT", "sub": "a contract: what, not how", "result": "push / pop"},
        {"title": "Stack", "sub": "last in, first out", "result": "O(1)", "tone": "brand"},
        {"title": "Queue", "sub": "first in, first out", "result": "O(1) with %", "tone": "green"},
        {"title": "Linked list", "sub": "boxes and arrows", "result": "O(1) splice", "tone": "amber"},
        {"title": "Loop invariant", "sub": "prove a loop is right", "result": "3 steps", "tone": "brand"},
        {"title": "Insertion sort", "sub": "the first real sort", "result": "Ω(n) … O(n²)", "tone": "green"}]},
       "The chapter in six steps. Project 1 uses the last one; the midterm uses all six.", slide="Six ideas"),
  ]},
  {"id": "why", "heading": "ADT: what it does, not how", "blocks": [
    D("Abstract Data Type (ADT)", "A data type defined by its **behavior** (what operations you can do and what they promise), not its **implementation** (how those operations are built inside)."),
    O("why", lambda b: b["type"] == "trap"),
    DG("cards", {"cards": [
        {"title": "Stack ADT", "badge": "the contract", "tone": "brand", "lines": ["push(x) · pop() · peek() · isEmpty()", "All your code ever calls."]},
        {"title": "array + top", "badge": "build #1", "tone": "amber", "lines": ["An array and one index, top.", "Fixed size; overflow when full."]},
        {"title": "linked list + head", "badge": "build #2", "tone": "green", "lines": ["The top is the head node.", "Grows as needed; no overflow."]}],
       "note": "Swap build #1 for build #2 and your code doesn't change: like a car's pedals, gas or electric."},
       "One contract, two ways to build it. Your code only uses the contract, so the inside can change freely.", slide="Contract vs implementation"),
    WHY("**Why separate 'what' from 'how'?** So you can change your mind later. If your code only uses push and pop, you can switch from an array to a linked list (or to something faster that doesn't exist yet) and nothing else breaks. Big programs survive for years because of this separation."),
    O("why", lambda b: b["type"] == "definition"),
    WORLD("**Every language ships these contracts.** Java's `Deque` interface is the contract; `ArrayDeque` and `LinkedList` are two implementations of it. Python's `list` works as a stack, and `collections.deque` as a queue. When you pick one in real code, you're picking an implementation of an ADT."),
    C("In one sentence, what's the difference between an ADT and a data structure?", "The ADT is the contract (which operations, what they do); the data structure is how it's built (an array, a linked list). One ADT can have several implementations."),
  ]},
  {"id": "stack", "heading": "Stack: last in, first out", "blocks": [
    D("Stack", "A container where you add and remove at the **same end**, the top. The last item pushed is the first popped: **LIFO** (last in, first out). Operations: **push**, **pop**, **peek**, **isEmpty**."),
    ST("An array stack, operation by operation", stack_frames(4, [("push", 10), ("push", 20), ("push", 30), ("pop",), ("push", 40), ("pop",), ("pop",)])),
    SIM("stackqueue", "Press push a few times, then pop. Try popping when it's empty (underflow) and pushing when it's full (overflow). The log says exactly what changed, in Poon's words.", {"mode": "stack", "capacity": 6}, slide="Try it: a stack"),
    O("stack", lambda b: b["type"] == "example"),
    WORLD("**Stacks run your computer.** Every time a function calls another function, the computer pushes a 'frame' onto the **call stack**; when it returns, the frame is popped. That's why too much recursion gives a 'stack overflow'. Undo in any editor is a stack of your actions. Your browser's Back button is a stack of pages. Code editors check that brackets match with a stack."),
    THINK("**When you see 'most recent first', think stack.** Undo, back, 'return to where I was', nested things that must close in reverse order (brackets, HTML tags, function calls)."),
    PY("Your turn: do the brackets match?", "Code editors use a stack to check brackets. Finish `balanced(s)`: push every opening bracket; on a closing bracket, the top of the stack must be its partner, so pop it. At the end the stack must be empty. A Python list is a stack: `append` is push, `pop()` is pop, `stack[-1]` is peek.",
       '''
PAIRS = {")": "(", "]": "[", "}": "{"}

def balanced(s):
    stack = []
    for ch in s:
        if ch in "([{":
            pass   # push it
        elif ch in ")]}":
            pass   # the stack must not be empty, and its top must be PAIRS[ch]; then pop
    return True    # balanced only if nothing is left open

for s in ["(a[b]{c})", "(]", "((", "{[()()]}", ")("]:
    print(f"{s:10} -> {balanced(s)}")
''',
       check='''
assert balanced("(a[b]{c})") is True, "'(a[b]{c})' is balanced."
assert balanced("(]") is False, "'(]' is not balanced: ] closes something that was opened with (."
assert balanced("((") is False, "'((' is not balanced: two brackets are still open at the end. Is the stack empty?"
assert balanced(")(") is False, "')(' is not balanced: the ) arrives when nothing is open. Check for an empty stack before popping."
assert balanced("{[()()]}") is True, "'{[()()]}' is balanced."
assert balanced("") is True, "An empty string is balanced."
''',
       solution='''
PAIRS = {")": "(", "]": "[", "}": "{"}

def balanced(s):
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in ")]}":
            if not stack or stack[-1] != PAIRS[ch]:
                return False
            stack.pop()
    return len(stack) == 0

for s in ["(a[b]{c})", "(]", "((", "{[()()]}", ")("]:
    print(f"{s:10} -> {balanced(s)}")
''',
       hints=["Push: `stack.append(ch)`.", "On a closer: `if not stack or stack[-1] != PAIRS[ch]: return False`, then `stack.pop()`.", "At the end: `return len(stack) == 0`."],
       success="This is exactly how an editor underlines a missing bracket, and how a compiler matches { with }. The most recent opener must close first: LIFO."),
    O("stack", lambda b: b["type"] == "check"),
  ]},
  {"id": "queue", "heading": "Queue: first in, first out", "blocks": [
    D("Queue", "A container where you add at the **back** and remove from the **front**. The first item in is the first out: **FIFO**. Operations: **enqueue**, **dequeue**, **peek**, **isEmpty**."),
    DG("cards", {"cards": [
        {"title": "Queue", "badge": "FIFO", "tone": "brand", "lines": ["Join at the back, leave from the front.", "Like a checkout line."]},
        {"title": "Naive array", "badge": "O(n) dequeue", "tone": "red", "viz": [4, 3, 2, 1], "lines": ["Front stays at index 0,", "so every dequeue shifts everyone left."]},
        {"title": "Circular buffer", "badge": "O(1) both", "tone": "green", "lines": ["head and tail move instead,", "wrapping around with % capacity."]}]},
       "Poon's checkout line, and two ways to build it: the slow one shifts the whole line on every dequeue; the circular buffer just moves an index.", slide="A checkout line"),
    WHY("**Why the naive array is too slow.** If the front must stay at index 0, removing it leaves a hole, and every other item shifts left to fill it: n moves for one dequeue, O(n). A queue holding a million waiting requests would move a million items for every single dequeue."),
    ST("The circular queue, and the moment % wraps around", cqueue_frames(4, [("enq", "A"), ("enq", "B"), ("enq", "C"), ("deq",), ("deq",), ("enq", "D"), ("enq", "E"), ("enq", "F"), ("deq",)])),
    SIM("stackqueue", "Switch between 'Queue (naive, shifts)' and 'Queue (circular buffer)'. Fill each, dequeue three, enqueue three more. The naive one's move counter climbs; the circular one's tail wraps to index 0 and nothing moves.", {"mode": "queue", "capacity": 6}, slide="Try it: two queues"),
    O("queue", lambda b: b["type"] == "example" and "ArrayQueue" in b["body"]),
    O("queue", lambda b: b["type"] == "trap"),
    WORLD("**Queues are how computers take turns.** The print queue on a shared printer. Your operating system's list of programs waiting for the CPU. Every web server's line of incoming requests. Messaging systems (like the ones that deliver your notifications) are queues between programs. Audio and video players use a circular buffer so sound keeps flowing while the next chunk downloads."),
    THINK("**When you see 'in the order they arrived' or 'fair turns', think queue.** When you see 'most recent first', think stack. That one question decides most 'which ADT?' exam questions."),
    O("queue", lambda b: b["type"] == "example" and "tunnel" in b["body"]),
    PY("Your turn: a circular queue", "Finish `enqueue` and `dequeue` for a circular buffer. Keep `head` (where the next dequeue reads), `size`, and compute the write position as `(head + size) % cap`. Both methods move an index with `%`, and nothing ever shifts.",
       '''
class CircularQueue:
    def __init__(self, cap):
        self.a = [None] * cap
        self.cap = cap
        self.head = 0
        self.size = 0

    def enqueue(self, x):
        if self.size == self.cap:
            raise OverflowError("queue is full")
        pass   # write x at (head + size) % cap, then size += 1

    def dequeue(self):
        if self.size == 0:
            raise IndexError("queue is empty")
        pass   # read a[head], move head forward with %, size -= 1, return the value

q = CircularQueue(4)
for x in [10, 20, 30]:
    q.enqueue(x)
print(q.dequeue(), q.dequeue())   # should print 10 20
q.enqueue(40); q.enqueue(50)      # 50 wraps around to index 0
print(q.a, "head =", q.head)
''',
       check='''
q = CircularQueue(4)
for x in [10, 20, 30]:
    q.enqueue(x)
v1 = q.dequeue(); v2 = q.dequeue()
assert (v1, v2) == (10, 20), f"After enqueue 10, 20, 30, two dequeues should give 10 then 20 (first in, first out). Got {v1}, {v2}."
q.enqueue(40); q.enqueue(50); q.enqueue(60)
assert q.a[0] == 50, f"50 should wrap around to index 0. The array is {q.a}. Did you use % cap?"
got = [q.dequeue() for _ in range(4)]
assert got == [30, 40, 50, 60], f"The remaining items should come out 30, 40, 50, 60. Got {got}."
assert q.size == 0, "After taking everything out, size should be 0."
''',
       solution='''
class CircularQueue:
    def __init__(self, cap):
        self.a = [None] * cap
        self.cap = cap
        self.head = 0
        self.size = 0

    def enqueue(self, x):
        if self.size == self.cap:
            raise OverflowError("queue is full")
        self.a[(self.head + self.size) % self.cap] = x
        self.size += 1

    def dequeue(self):
        if self.size == 0:
            raise IndexError("queue is empty")
        x = self.a[self.head]
        self.head = (self.head + 1) % self.cap
        self.size -= 1
        return x

q = CircularQueue(4)
for x in [10, 20, 30]:
    q.enqueue(x)
print(q.dequeue(), q.dequeue())
q.enqueue(40); q.enqueue(50)
print(q.a, "head =", q.head)
''',
       hints=["enqueue: `self.a[(self.head + self.size) % self.cap] = x` then `self.size += 1`.", "dequeue: save `x = self.a[self.head]` first.", "Then `self.head = (self.head + 1) % self.cap`, `self.size -= 1`, `return x`."],
       success="Both operations are a couple of assignments, no matter how full the queue is: O(1). This is the buffer inside audio players and network cards."),
    O("queue", lambda b: b["type"] == "check"),
  ]},
  {"id": "linked", "heading": "Linked list: boxes and arrows", "blocks": [
    D("Linked list", "A chain of **nodes**. Each node holds a **value** and the **address of the next node**. The list is reached through one variable, **head**; the last node's next is **null**."),
    DG("cards", {"cards": [
        {"title": "Array", "badge": "numbered lockers", "tone": "brand", "lines": ["get(k): jump straight there, **O(1)**", "insert in the middle: shift everything after, **O(n)**"]},
        {"title": "Linked list", "badge": "a train", "tone": "amber", "lines": ["get(k): walk k cars from the head, **O(n)**", "insert in the middle: rewire 2 arrows, **O(1)**"]}]},
       "Poon's two pictures: an array is a row of numbered lockers, a linked list is a train. Each is fast at what the other is slow at.", slide="Lockers vs a train"),
    O("linked", lambda b: b["type"] == "definition"),
    F(FG["splice"], "Inserting X after B is two pointer writes, and the order matters: first point X at C, then point B at X. Hover each row.", slide="Splicing in two writes"),
    O("linked", lambda b: b["type"] == "trap"),
    O("queue", lambda b: b["type"] == "table"),
    WORLD("**Linked structures are everywhere, often in disguise.** Git: each commit stores the id of its parent, so your history is a linked list walked from the newest commit. A music app's 'next song' in a playlist, a browser's history, and the free-memory lists inside your operating system are linked. Most of the time you'll use a library's list, but knowing that 'get item k' costs a walk explains why some code is mysteriously slow."),
    WHEN("**Use an array (ArrayList, Python list)** when you read by position a lot, or mostly add at the end. That's most of the time. **Use a linked list** when you insert and remove in the middle constantly and already hold a reference to the spot, or need a queue/stack that never has to resize."),
    PY("Your turn: splice without losing the list", "`insert_after(node, value)` should put a new node right after `node`. The starter does the two writes in the WRONG order: run it and see what's lost. Then fix the order.",
       '''
class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

def to_list(head, limit=10):
    """The values from head onward (stops after `limit` in case of a loop)."""
    out = []
    while head is not None and len(out) < limit:
        out.append(head.value)
        head = head.next
    return out

def insert_after(node, value):
    x = Node(value)
    node.next = x          # write 2 ...
    x.next = node.next     # ... before write 1: C's address is already gone

# A -> B -> C -> D
d = Node("D"); c = Node("C", d); b = Node("B", c); a = Node("A", b)
insert_after(b, "X")
print(to_list(a))
''',
       check='''
d = Node("D"); c = Node("C", d); b = Node("B", c); a = Node("A", b)
insert_after(b, "X")
seen, n = [], a
while n is not None and len(seen) < 10:
    seen.append(n.value); n = n.next
assert seen == ["A", "B", "X", "C", "D"], f"The list should be A, B, X, C, D. Walking it gave {seen}. Point X at C before you point B at X."
''',
       solution='''
class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

def to_list(head, limit=10):
    """The values from head onward (stops after `limit` in case of a loop)."""
    out = []
    while head is not None and len(out) < limit:
        out.append(head.value)
        head = head.next
    return out

def insert_after(node, value):
    x = Node(value)
    x.next = node.next     # 1: X points at C (nothing lost yet)
    node.next = x          # 2: B points at X

d = Node("D"); c = Node("C", d); b = Node("B", c); a = Node("A", b)
insert_after(b, "X")
print(to_list(a))
''',
       hints=["Run the starter: X points at itself, and C and D are gone.", "Swap the two lines.", "`x.next = node.next` first, then `node.next = x`."],
       success="Two writes, O(1), and the order is the whole trick. This is the classic 'what's wrong with this code' exam question."),
    O("linked", lambda b: b["type"] == "check" and "get(k)" in b["prompt"]),
    O("linked", lambda b: b["type"] == "check" and "BEFORE" in b["prompt"]),
  ]},
  {"id": "invariants", "heading": "Loop invariants: proving a loop is right", "blocks": [
    D("Correct algorithm", "It **stops**, and it gives the right output for **every** valid input. Not just the ones you tested."),
    O("invariants", lambda b: b["type"] == "prose" and b.get("label") == "why"),
    O("invariants", lambda b: b["type"] == "definition"),
    DG("roadmap", {"eyebrow": "Insertion sort's invariant", "question": "a[0..j−1] is always **sorted**", "steps": [
        {"title": "Initialization", "sub": "= base case. j = 1: a[0..0] is one item, and one item is sorted.", "result": "true at start", "tone": "green"},
        {"title": "Maintenance", "sub": "= inductive step. Sorted before a round; the key slides in; still sorted after.", "result": "stays true", "tone": "brand"},
        {"title": "Termination", "sub": "= conclusion. The loop stops at j = n, so a[0..n−1], the WHOLE array, is sorted.", "result": "goal!", "tone": "amber"}]},
       "Insertion sort's invariant, checked at three moments. Like Poon's Lego tower: solid at the start, still solid after each brick, so the finished tower is solid.", slide="Three moments"),
    T(["Invariant step", "Induction step (Chapter 0)", "What you show"], [
      ["Initialization", "base case", "true before the first iteration"],
      ["Maintenance", "inductive step", "if true before an iteration, still true after it"],
      ["Termination", "conclusion", "when the loop stops, invariant + stop condition = the goal"],
    ], title="The three parts (Lecture 3)", slide="Three parts = induction"),
    O("invariants", lambda b: b["type"] == "stepper"),
    O("invariants", lambda b: b["type"] == "example"),
    THINK("**How to find an invariant.** Ask: 'halfway through, what is already true about the part I've finished?' Write that about the **prefix** a[0..j−1], not the whole array. Then check it in the three moments. If it's true in all three, the termination step hands you the proof."),
    O("invariants", lambda b: b["type"] == "trap"),
    WORLD("**Invariants are how engineers talk about correctness.** An `assert` in real code is an invariant the computer re-checks every run. A bank's database rule 'total debits = total credits' is an invariant that every transaction must maintain. When a code reviewer asks 'can this index ever go out of bounds?', the answer is an invariant in one sentence."),
    C("For a loop that finds the max of a[0..n−1] with `m = a[0]; for j = 1..n−1: if a[j] > m: m = a[j]`, state the invariant.", "At the start of each iteration j, m is the largest value in a[0..j−1]. Initialization: j = 1, m = a[0] is the max of a[0..0]. Maintenance: comparing with a[j] keeps m the max of a[0..j]. Termination: j = n, so m is the max of the whole array."),
  ]},
  {"id": "insertion", "heading": "Insertion sort", "blocks": [
    D("Insertion sort", "Keep a **sorted left part**. Take the next item (the **key**), slide it left past every bigger item, and drop it in. Repeat until the left part is the whole array."),
    ST("Insertion sort on [8, 5, 2, 6, 9] (HW 3 Problem 2)", ins_frames([8, 5, 2, 6, 9])),
    SIM("sort", "Insertion sort on your own array, one shift at a time, with the comparison and shift counts live. Type a reversed array (9, 8, 7, 6, 5) and confirm n(n−1)/2 shifts; type a sorted one and confirm zero.", {"algorithm": "insertion", "array": [7, 3, 9, 1, 4, 8, 2]}),
    O("insertion", lambda b: b["type"] == "example" and "insertionSort(int[] a)" in b["body"]),
    O("insertion", lambda b: b["type"] == "example" and "proof" in b["title"].lower()),
    DG("cards", {"cards": [
        {"title": "Already sorted", "badge": "best case", "tone": "green", "viz": [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3], "lines": ["0 shifts per key", "about n steps: **Ω(n)**"]},
        {"title": "Reversed", "badge": "worst case", "tone": "red", "viz": [1, 2, 3, 4, 5, 6, 7], "lines": ["key k shifts past all k before it", "1 + 2 + … + (n−1) = n(n−1)/2: **O(n²)**"]}]},
       "Shifts per key for n = 8. Sorted input: nothing moves. Reversed input: the bars form a triangle, half of an n × n square.", slide="Best vs worst"),
    O("insertion", lambda b: b["type"] == "definition" and b["term"].startswith("Best")),
    O("insertion", lambda b: b["type"] == "definition" and b["term"].startswith("Worst")),
    O("insertion", lambda b: b["type"] == "definition" and b["term"].startswith("Duplicates")),
    WHEN("**Use insertion sort** for small lists (a few dozen items) and lists that are already nearly sorted, like adding a new score to a sorted leaderboard, or keeping a hand of cards sorted as you draw. **Don't use it** on big, jumbled data: 100,000 random items means about 2.5 billion shifts."),
    WORLD("**It's inside the fast sorts.** Python's and Java's built-in sorts (Timsort) use insertion sort on short runs, and many quicksort implementations switch to it for tiny pieces, because on small inputs its simplicity beats the fancy algorithms. That's Project 1's hybrid sort."),
    PY("Your turn: count the shifts", "Write `shifts(a)`: run insertion sort on a copy of `a` and return how many times an item was shifted right. Then check the two extreme cases: sorted input and reversed input.",
       '''
def shifts(a):
    a = list(a)
    count = 0
    for j in range(1, len(a)):
        key = a[j]
        i = j - 1
        # while i >= 0 and a[i] > key: shift a[i] right, count it, move i left
        a[i + 1] = key
    return count

print(shifts([8, 5, 2, 6, 9]))        # HW 3 array
print(shifts([1, 2, 3, 4, 5, 6]))     # sorted: best case
print(shifts([6, 5, 4, 3, 2, 1]))     # reversed: worst case
''',
       check='''
assert shifts([1, 2, 3, 4, 5, 6]) == 0, "Sorted input should need 0 shifts: every key is already in place."
assert shifts([8, 5, 2, 6, 9]) == 4, f"[8, 5, 2, 6, 9] needs 4 shifts (5 moves past 8; 2 past 8 and 5; 6 past 8). Got {shifts([8, 5, 2, 6, 9])}."
assert shifts([6, 5, 4, 3, 2, 1]) == 15, f"Reversed input of 6 needs 1 + 2 + 3 + 4 + 5 = 15 shifts. Got {shifts([6, 5, 4, 3, 2, 1])}."
assert shifts(list(range(100, 0, -1))) == 4950, "Reversed input of 100 should need 100·99/2 = 4950 shifts."
''',
       solution='''
def shifts(a):
    a = list(a)
    count = 0
    for j in range(1, len(a)):
        key = a[j]
        i = j - 1
        while i >= 0 and a[i] > key:
            a[i + 1] = a[i]
            count += 1
            i -= 1
        a[i + 1] = key
    return count

print(shifts([8, 5, 2, 6, 9]))
print(shifts([1, 2, 3, 4, 5, 6]))
print(shifts([6, 5, 4, 3, 2, 1]))
''',
       hints=["Use `while i >= 0 and a[i] > key:`.", "Inside: `a[i + 1] = a[i]`, `count += 1`, `i -= 1`.", "The line after the loop already drops the key in."],
       success="0 for sorted, n(n−1)/2 for reversed: the best and worst case you'll be asked to state, now measured."),
    O("insertion", lambda b: b["type"] == "prose" and "slide 29" in b["md"]),
    O("insertion", lambda b: b["type"] == "check" and "[4, 3, 2, 1]" in b["prompt"]),
    O("insertion", lambda b: b["type"] == "check" and "fastest" in b["prompt"]),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["ADT", "a type defined by what it does (its operations), not how it's built"],
      ["Stack · LIFO", "last in, first out: push, pop, peek at the top"],
      ["Queue · FIFO", "first in, first out: enqueue at the back, dequeue from the front"],
      ["Circular buffer", "an array queue whose head and tail wrap with % capacity: O(1) both ways"],
      ["Overflow / underflow", "pushing onto a full structure / popping from an empty one"],
      ["Node · head · null", "a box with a value and a next-address; the first node; 'no next'"],
      ["Loop invariant", "a fact about the finished part that's true every time the loop checks its condition"],
      ["Initialization · maintenance · termination", "the three things you show about an invariant (base case, step, conclusion)"],
      ["Key", "in insertion sort, the item currently being slid into place"],
      ["Stable", "equal items keep their original order"],
    ]),
  ]},
 ],
}

g["exercises"] = [
  MC("adt-undo", "Which ADT: undo", "A drawing app lets you undo your last action, then the one before it, and so on. Which ADT fits?", ["Queue", "Stack", "Array sorted by time", "Linked list with random access"], 1,
     ["A queue would undo your FIRST action first.", "Right: the most recent action comes off first. LIFO.", "Sorting adds work and doesn't match the access pattern.", "Undo only ever needs the newest item."],
     ["Which action does undo reverse first?", "The most recent one.", "Most recent first = LIFO = stack."], "Undo, back buttons and the call stack are all 'most recent first'.", ref="stack"),
  MC("adt-print", "Which ADT: printing", "A shared office printer must print jobs in the order people sent them. Which ADT fits?", ["Stack", "Queue", "Either works the same", "A set"], 1,
     ["A stack would print the newest job first, and the oldest could wait forever.", "Right: first sent, first printed. FIFO.", "They give opposite orders.", "A set has no order at all."],
     ["Who should be served first?", "The person who sent first.", "First in, first out = queue."], "Fairness in arrival order is the signature of a queue: printers, web servers, CPU scheduling.", ref="queue"),
  FILL("circ-wrap", "Where does it wrap?", "A circular queue has capacity 5, head = 2 and size = 3 (items at indexes 2, 3, 4). At which index does the next enqueue write? (write index = (head + size) % capacity)", ["0"],
     ["Compute head + size first.", "2 + 3 = 5.", "5 % 5 = 0: it wraps to the front."], ["head + size = 2 + 3 = 5.", "5 % 5 = 0.", "The new item goes in slot 0, which is free."], "This wrap is the entire point of the circular buffer: reuse freed slots, never shift.", ref="queue"),
  MC("ll-get", "Cost of get(k)", "Why does `get(k)` take O(n) on a singly linked list but O(1) on an array?", ["Linked lists store values in sorted order", "An array's item k is at a computable address; a list must follow k arrows from head", "Linked lists are always longer", "Arrays are cached, lists are not"], 1,
     ["Nothing about linked lists requires sorting.", "Right: start + k × size is one jump; nodes are scattered, so you walk.", "Length isn't the issue; the access method is.", "Caching affects constants, not the Big-O."],
     ["Where is item k in an array?", "At start + k × (size of one item): one computation.", "In a list, the address of node k is stored inside node k − 1."], "This is why 'ArrayList vs LinkedList' matters in real code: indexing into a linked list in a loop quietly makes it O(n²).", ref="linked"),
  MC("ll-order", "Splice order", "To insert X after B, which order is safe?", ["B.next = X, then X.next = B.next", "X.next = B.next, then B.next = X", "Either order is fine", "X.next = null, then B.next = X"], 1,
     ["After the first write, B.next is X, so X.next = B.next makes X point at itself. C is lost.", "Right: X grabs C's address before B's pointer is overwritten.", "One order loses the rest of the list.", "That cuts off C and everything after it."],
     ["What does B.next hold before you start?", "C's address, and nothing else holds it.", "Copy it into X.next BEFORE overwriting B.next."], "Every linked structure (trees, graphs, memory allocators) has this 'save it before you overwrite it' discipline.", ref="linked"),
  MC("inv-which", "Pick the invariant", "Which is a correct loop invariant for insertion sort's outer loop (index j)?", ["The whole array is sorted", "a[0..j−1] holds the original first j items, in sorted order", "a[j] is the smallest item", "a[j..n−1] is sorted"], 1,
     ["That's only true at the end, so it can't be true at the start of every iteration.", "Right: a statement about the finished prefix that's true every time the loop checks.", "Insertion sort never guarantees that.", "The right side is untouched and can be in any order."],
     ["An invariant must be true in the MIDDLE of the loop.", "What's true about the part already handled?", "The prefix a[0..j−1] is sorted."], "Writing it about the prefix, not the whole array, is the most common lost point on this question.", ref="invariants"),
  FILL("ins-worst", "Worst-case shifts", "How many shifts does insertion sort do on [6, 5, 4, 3, 2, 1]?", ["15"],
     ["Key 5 shifts past 1 item, key 4 past 2, …", "1 + 2 + 3 + 4 + 5.", "n(n−1)/2 with n = 6."], ["Keys shift 1, 2, 3, 4, 5 times.", "1 + 2 + 3 + 4 + 5 = 15.", "= 6·5/2 = n(n−1)/2."], "That triangle of shifts is the n²/2 behind insertion sort's O(n²).", ref="insertion"),
  MC("ins-best", "Best case", "On which input does insertion sort do the least work, and how much?", ["Reversed input, O(n)", "Random input, O(n log n)", "Already sorted input, about n comparisons: Ω(n)", "It always does n²/2"], 2,
     ["Reversed is the worst case.", "Insertion sort is never n log n on random input; it's about n²/4.", "Right: every key's first comparison says 'stop', so each key costs one step.", "Its inner loop stops early whenever it can."],
     ["When does the inner while loop stop immediately?", "When the item to the left is already ≤ key.", "That's every key when the input is sorted."], "This is why insertion sort is the go-to for nearly sorted data.", ref="insertion"),
] + old_exercises(SLUG)

build(g)
