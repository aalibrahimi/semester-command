import type { Chapter, Frame } from "../types";

/**
 * CS 146 · Lectures 2–3 — ADTs (lists, stacks, queues), loop invariants,
 * insertion sort. Built from Poon's Lecture 2 (Aug 24) and Lecture 3 (Aug 26)
 * slides, HW 2 and HW 3, and the Project 1 spec (insertion sort is Part 1).
 */

/** A stack as an array with a `top` index, one operation per frame. */
const stackFrames: Frame[] = [
  { kind: "array", cells: ["·", "·", "·", "·"], note: "top = −1  (empty)", caption: "An array stack with room for 4. `top` is the index of the most recent item. −1 means nothing is there yet. Reading `a[top]` now would be an **underflow** error." },
  { kind: "array", cells: [5, "·", "·", "·"], hl: [0], note: "push(5): top = 0", caption: "push(5): move `top` up by one, then write 5 there. Two steps, no loops, no matter how full the stack is — that's O(1)." },
  { kind: "array", cells: [5, 9, "·", "·"], hl: [1], note: "push(9): top = 1", caption: "push(9): same two steps. 9 sits on top of 5." },
  { kind: "array", cells: [5, 9, 2, "·"], hl: [2], note: "push(2): top = 2", caption: "push(2). The last thing in is always at `a[top]`." },
  { kind: "array", cells: [5, 9, 2, "·"], hl: [2], note: "peek() → 2", caption: "peek(): read `a[top]` and change nothing. Answer 2." },
  { kind: "array", cells: [5, 9, "2", "·"], done: [2], hl: [1], note: "pop() → 2, top = 1", caption: "pop(): read `a[top]` (2), then move `top` down. The 2 is still physically in the array, but nothing points at it — it's gone as far as the stack is concerned. The next push will overwrite it." },
  { kind: "array", cells: [5, "9", "2", "·"], done: [1, 2], hl: [0], note: "pop() → 9, top = 0", caption: "pop() again gives 9. Last in, first out: we pushed 5, 9, 2 and got back 2, 9. That order reversal is the whole point of a stack." },
];

/** A circular array queue, showing why `% capacity` exists. */
const queueFrames: Frame[] = [
  { kind: "array", cells: ["·", "·", "·", "·"], note: "head = 0, tail = −1, size 0", caption: "A queue in an array of capacity 4. `head` is where the next dequeue reads; `tail` is where the last enqueue wrote." },
  { kind: "array", cells: ["A", "B", "C", "·"], hl: [0], done: [1, 2], note: "enqueue A, B, C → tail = 2", caption: "Three enqueues. Each one moves `tail` right by one and writes there. `head` still points at A, the oldest." },
  { kind: "array", cells: ["A", "B", "C", "·"], hl: [1], done: [2], note: "dequeue() → A, head = 1", caption: "dequeue(): read `a[head]` (A) and move `head` right. Nothing shifts. The naive version would copy B and C one slot left — O(n) work for one removal. We just moved an index: O(1)." },
  { kind: "array", cells: ["·", "B", "C", "D"], hl: [1], done: [2, 3], note: "enqueue D → tail = 3", caption: "enqueue(D) fills the last slot. The array now looks full — but slot 0 is free. Without a trick, the next enqueue fails even though there's room." },
  { kind: "array", cells: ["E", "B", "C", "D"], hl: [1], done: [2, 3, 0], note: "enqueue E → tail = (3+1) % 4 = 0", caption: "The trick: `tail = (tail + 1) % capacity`. 4 % 4 = 0, so `tail` wraps around to slot 0 and E goes there. The queue order is still B, C, D, E — it just bends around the end of the array. That's why Poon's efficient queue uses modulo." },
];

/** Insertion sort on HW 3's array, one outer iteration per frame. */
const insertionFrames: Frame[] = [
  { kind: "array", cells: [8, 5, 2, 6, 9], done: [0], hl: [1], note: "j = 1, key = 5", caption: "Start. The first element alone counts as 'sorted' (green). The key is the first unsorted element, 5. We'll walk it left until it's in place." },
  { kind: "array", cells: [8, 8, 2, 6, 9], done: [0], hl: [1], note: "8 > 5 → shift 8 right", caption: "Compare the key with the element to its left: 8 > 5, so copy 8 one slot to the right. There's now a 'hole' at index 0 (still showing the old 8)." },
  { kind: "array", cells: [5, 8, 2, 6, 9], done: [0, 1], hl: [2], note: "drop key at index 0 · j = 2, key = 2", caption: "Nothing left to compare, so drop 5 into the hole. Sorted prefix is now [5, 8]. Next key: 2." },
  { kind: "array", cells: [5, 5, 8, 6, 9], done: [0, 1], hl: [2], note: "8 > 2 shift, 5 > 2 shift", caption: "8 > 2 → shift 8. Then 5 > 2 → shift 5. The hole has walked all the way to index 0." },
  { kind: "array", cells: [2, 5, 8, 6, 9], done: [0, 1, 2], hl: [3], note: "drop key at index 0 · j = 3, key = 6", caption: "Drop 2 into the hole. Sorted prefix [2, 5, 8]. Next key: 6." },
  { kind: "array", cells: [2, 5, 8, 8, 9], done: [0, 1, 2], hl: [3], note: "8 > 6 shift · 5 > 6? no → stop", caption: "8 > 6 → shift 8. Now compare 5 with 6: 5 is not greater, so **stop**. This early stop is what makes insertion sort fast on nearly-sorted input." },
  { kind: "array", cells: [2, 5, 6, 8, 9], done: [0, 1, 2, 3], hl: [4], note: "drop key at index 2 · j = 4, key = 9", caption: "Drop 6 into the hole at index 2. Sorted prefix [2, 5, 6, 8]. Last key: 9." },
  { kind: "array", cells: [2, 5, 6, 8, 9], done: [0, 1, 2, 3, 4], note: "8 > 9? no → zero shifts", caption: "8 is not greater than 9, so zero shifts; 9 stays put. The loop has run out of keys. Every element is in the sorted prefix: [2, 5, 6, 8, 9]. That's HW 3 Problem 2's answer, and the trace format Poon grades: key, sorted prefix, array after each iteration." },
];

/** Loop-invariant proof for the sum loop from HW 3 Problem 1. */
const invariantFrames: Frame[] = [
  { kind: "lines", lines: ["sum = 0; i = 0;", "while (i < A.length) {", "  sum += A[i];", "  i++;", "}"], active: 0, caption: "HW 3 Problem 1's loop. Goal: prove that when it ends, `sum` is the total of A. First, find a sentence that is true every time the loop is *about to* check its condition." },
  { kind: "lines", lines: ["Invariant:", "at the start of each iteration,", "sum = A[0] + A[1] + … + A[i−1]", "(the sum of the first i elements)"], active: 2, caption: "The invariant. Notice it's about the *part done so far* (the first i elements), not about the whole array. That's the most common lost point: 'sum is the total of A' is only true at the very end, so it can't be an invariant." },
  { kind: "lines", lines: ["1. Initialization (i = 0):", "sum of the first 0 elements = 0", "and sum was set to 0  ✓"], active: 1, caption: "Initialization: before the first iteration, i = 0. The sum of zero elements is 0, and `sum` is 0. True. (This is the base case of an induction proof wearing a different hat.)" },
  { kind: "lines", lines: ["2. Maintenance:", "assume sum = A[0..i−1] before an iteration", "body adds A[i]  → sum = A[0..i]", "body does i++   → 'A[0..i−1]' now means A[0..i]  ✓"], active: 1, caption: "Maintenance: suppose the sentence is true at the start of some iteration. The body adds A[i], so sum now covers A[0..i]. Then i goes up by one, so 'the first i elements' now means exactly A[0..i]. The sentence is true again. (Inductive step.)" },
  { kind: "lines", lines: ["3. Termination (i = A.length):", "sum = A[0] + … + A[A.length − 1]", "= the whole array  ✓"], active: 1, caption: "Termination: the loop stops when i = A.length. Plug that into the invariant: sum is the sum of the first A.length elements — all of them. That's exactly what we wanted to prove. (Conclusion.)" },
];

export const cs146Adts: Chapter = {
  slug: "2-adts-invariants-insertion",
  label: "Lectures 2–3",
  title: "ADTs, loop invariants, and insertion sort",
  source: "Lecture 2 (Aug 24) and Lecture 3 (Aug 26) slides, HW 2, HW 3, Project 1 Part 1.",
  goal: "Say what an ADT is and pick stack vs queue for a scenario; write an array stack and a circular queue; prove a loop correct with a three-part invariant; trace insertion sort the way Poon grades it and explain its best and worst case.",
  minutes: 60,
  sections: [
    {
      id: "why",
      title: "Why this course starts with 'what does it do', not 'how'",
      blocks: [
        { id: "why-1", t: "why", slide: "The car-pedal idea", title: "The whole lecture in one idea", text: "You can drive a car without knowing whether the engine is gas or electric. The pedals are a **contract**: press this, the car goes. An **Abstract Data Type** is a contract like that for data: it lists the operations you can do (push, pop, peek…) and what they promise, and says nothing about how they're built inside. The 'how' is the **implementation** — and the same contract can have several implementations with very different speeds. Almost every exam question in this course is, underneath, 'which contract does this problem need, and which implementation makes those operations cheap?'" },
        { id: "why-2", t: "prof", title: "Poon's definition (reproduce it)", text: "'An abstract data type is a data type defined by its behavior — what it does — not its implementation — how it does it.' He wants that sentence, then an example. The pedal analogy is his." },
        { id: "why-3", t: "def", term: "ADT · List · Stack · Queue", text: "**List**: a sequence you access by position (index). Operations: add, remove, get, size. **Stack**: last in, first out (LIFO). push, pop, peek, isEmpty. Plates in a cafeteria. **Queue**: first in, first out (FIFO). enqueue, dequeue, peek, isEmpty. A checkout line." },
      ],
    },
    {
      id: "stack",
      title: "Stacks: LIFO, and what push/pop actually do",
      blocks: [
        { id: "st-1", t: "p", slide: "Where stacks show up", text: "Your browser's back button is a stack: every page you visit is pushed; Back pops. Undo is a stack. And the big one: **the call stack** — every time a function calls another, the new call is pushed on top; when it returns, it's popped. That's why recursion works at all, and why infinite recursion gives a 'stack overflow' error: the stack literally ran out of room." },
        { id: "st-2", t: "stepper", slide: true, title: "An array stack, operation by operation", frames: stackFrames },
        { id: "st-3", t: "code", slide: "Array stack in Java (write it cold)", caption: "Java, because that's what Poon's slides and Project 1 use. If you know JS/TS: `int[]` is a fixed-size array of ints, `public` is just visibility, and the semicolons are mandatory.", text: `public class ArrayStack {
  private int[] a;
  private int top = -1;              // index of the top item; -1 = empty

  public ArrayStack(int capacity) { a = new int[capacity]; }

  public void push(int x) {
    if (top == a.length - 1) throw new RuntimeException("overflow");
    top++;
    a[top] = x;
  }
  public int pop() {
    if (top == -1) throw new RuntimeException("underflow");
    int x = a[top];
    top--;
    return x;
  }
  public int peek()      { return a[top]; }   // same check as pop
  public boolean isEmpty() { return top == -1; }
}` },
        { id: "st-4", t: "p", slide: "Linked stack: same contract, different insides", text: "A **linked list** version keeps the top as the head node. push: make a new node, point it at the old head, make it the head. pop: save the head's value, move head to head.next. Same four operations, same O(1) cost. Differences: no overflow (it grows as needed), no fixed capacity, but every node costs an extra pointer of memory and the nodes are scattered around memory instead of side by side. Underflow check becomes `head == null`." },
        { id: "st-5", t: "try", q: "You push 1, 2, 3, then pop once, then push 4. What does peek return, and what's the order the remaining items come out in?", a: "peek → 4. Pops give 4, 2, 1. (3 was popped and is gone.)" },
      ],
    },
    {
      id: "queue",
      title: "Queues: FIFO, and why the circular buffer exists",
      blocks: [
        { id: "q-1", t: "p", slide: "Where queues show up", text: "Anything that must be served in arrival order: print jobs, the operating system deciding which program runs next, messages between servers, breadth-first search later in this course. The contract: **enqueue** at the back, **dequeue** from the front." },
        { id: "q-2", t: "why", slide: "The naive array queue's problem", title: "Why 'just use an array' is O(n)", text: "Put the front at index 0. Dequeue removes index 0 — and now everything has to shift one slot left to keep the front at 0. For a queue of n items that's n copies for one removal: O(n). Poon calls this the naive array queue. The fix keeps two indexes, `head` and `tail`, and lets the data **wrap around** the end of the array." },
        { id: "q-3", t: "stepper", slide: true, title: "The circular array queue, and the moment `%` matters", frames: queueFrames },
        { id: "q-4", t: "code", slide: "Circular queue in Java", caption: "The `%` keeps head and tail inside 0..capacity−1. `size` tells full from empty (both have head == tail otherwise).", text: `public class ArrayQueue {
  private int[] a; private int head = 0, tail = -1, size = 0;
  public ArrayQueue(int capacity) { a = new int[capacity]; }

  public void enqueue(int x) {
    if (size == a.length) throw new RuntimeException("overflow");
    tail = (tail + 1) % a.length;    // wrap around
    a[tail] = x; size++;
  }
  public int dequeue() {
    if (size == 0) throw new RuntimeException("underflow");
    int x = a[head];
    head = (head + 1) % a.length;    // wrap around
    size--; return x;
  }
}` },
        { id: "q-5", t: "warn", title: "The linked-queue bug he calls out", text: "A linked queue keeps `head` (front) and `tail` (back). When you dequeue the **last** item, head becomes null — and you must also set `tail = null`. Forget that and `tail` points at a node that no longer belongs to the queue; the next enqueue attaches to a ghost. He shows this on the slides; it's a likely 'what's wrong with this code' question." },
        { id: "q-6", t: "table", slide: "Array vs linked list — the trade-off in one table", rows: [
          ["", "Array-based", "Linked list"],
          ["Get item at index k", "O(1) — like numbered lockers", "O(n) — walk the train car by car"],
          ["Insert / delete in the middle", "O(n) — shift everything after", "O(1) if you're already holding the node"],
          ["Memory", "Contiguous, cache-friendly", "Extra pointer per node, scattered"],
          ["Growth", "Fixed capacity; resize (usually double) when full", "Grows one node at a time, no overflow"],
        ] },
        { id: "q-7", t: "worked", slide: "HW 2: the single-lane tunnel", title: "Picking the ADT from a story", problem: "A single-lane tunnel. Scenario 1: cars leave in the order they entered. Scenario 2: the tunnel is blocked, so the last car in must back out first. Which ADT models each, and which operations are entering and leaving?", steps: [
          "Ask one question: does the *first* thing in leave first, or the *last*?",
          "Scenario 1: first in, first out → **Queue**. Entering = enqueue at the back. Leaving = dequeue from the front.",
          "Scenario 2: last in, first out → **Stack**. Entering = push. Backing out = pop — the most recently pushed car is the first one popped.",
        ], answer: "1: queue (enqueue/dequeue). 2: stack (push/pop)." },
        { id: "q-8", t: "try", q: "Why does the efficient array queue use `% capacity`?", a: "So head and tail wrap around to reuse the slots freed at the front. Without it, either the queue walks off the end of the array while empty slots sit unused at the front, or dequeue has to shift every element (O(n)). With it, both operations stay O(1)." },
      ],
    },
    {
      id: "invariants",
      title: "Loop invariants: proving a loop is right",
      blocks: [
        { id: "inv-1", t: "why", slide: "Why testing isn't enough", title: "Why anyone bothers", text: "You can run a sort on a thousand arrays and it works every time. Does it work on the thousand-and-first? Testing can only show that bugs *are* there, never that they *aren't*. Poon's definition of **correct**: the algorithm terminates and produces the desired output for *every* valid input. To claim that, you need an argument, not a test. The argument for loops is the **loop invariant**." },
        { id: "inv-2", t: "def", term: "Loop invariant", text: "A sentence about the loop's variables that is true every time the loop is about to check its condition — before the first iteration, between every pair of iterations, and after the last. It describes the *progress so far*, usually as a fact about the prefix the loop has already handled." },
        { id: "inv-3", t: "p", slide: "It's induction (Chapter 0) with new names", text: "If you did the induction section of Chapter 0, you already know this proof shape. **Initialization** = base case: true before the first iteration. **Maintenance** = inductive step: if it's true before one iteration, the body keeps it true for the next. **Termination** = the conclusion: when the loop stops, the invariant plus the stopping condition give you the thing you wanted. Poon's analogy: a Lego tower where every layer built so far is stable and aligned — so the finished tower is too." },
        { id: "inv-4", t: "stepper", slide: true, title: "HW 3 Problem 1: proving the sum loop", frames: invariantFrames },
        { id: "inv-5", t: "worked", slide: "The template answer for the exam", title: "Four sentences, always the same shape", problem: "How do you write a loop-invariant answer so Poon gives full marks?", steps: [
          "**Invariant:** 'At the start of each iteration with index j, ⟨a property of the part already processed, a[0..j−1]⟩ holds.'",
          "**Initialization:** plug in the first value of j; the property is trivially true (empty or one-element prefix).",
          "**Maintenance:** assume it holds for j; show the loop body extends the property to j+1.",
          "**Termination:** plug in the final value of j; the property now covers the whole array, which is what you wanted.",
        ] },
        { id: "inv-6", t: "warn", title: "The most common lost point", text: "Writing the invariant about the *whole* array ('the array is sorted') instead of the *prefix handled so far* ('a[0..j−1] is sorted'). An invariant has to be true in the middle of the loop, when the job is only partly done." },
      ],
    },
    {
      id: "insertion",
      title: "Insertion sort",
      blocks: [
        { id: "ins-1", t: "why", slide: "Sorting a hand of cards", title: "The idea before the code", text: "You're dealt cards one at a time. You hold the ones you have in sorted order. Each new card, you slide left past every bigger card until it fits, and drop it in. The cards in your hand are always sorted; the deck is the unsorted part. That's insertion sort: a **sorted prefix** that grows by one each round, and a **key** that walks left into its place." },
        { id: "ins-2", t: "stepper", slide: true, title: "Insertion sort on [8, 5, 2, 6, 9] (HW 3 Problem 2)", frames: insertionFrames },
        { id: "ins-3", t: "code", slide: "The code from the slides (Project 1 Part 1)", caption: "Line by line: `j` is the key's starting index; `i` walks left; the while loop shifts bigger elements right; the last line drops the key into the hole. Project 1 wants this exact algorithm with null / empty guards added.", text: `public static void insertionSort(int[] a) {
  if (a == null || a.length < 2) return;      // Project 1 guard
  for (int j = 1; j < a.length; j++) {
    int key = a[j];
    int i = j - 1;
    while (i >= 0 && a[i] > key) {
      a[i + 1] = a[i];      // shift the bigger element right
      i = i - 1;
    }
    a[i + 1] = key;         // drop key into the hole
  }
}` },
        { id: "ins-4", t: "p", slide: "If you're coming from JS/TS", text: "Same algorithm you'd write in TypeScript with `let key = a[j]` — the differences are cosmetic: `int` instead of `let`, `a.length` is the same, `&&` is the same, and there's no `const`. One real difference: Java arrays are fixed size and `int[]` holds only ints, so there's no `.push()`; you index." },
        { id: "ins-5", t: "worked", slide: "Insertion sort's own invariant (from the slides)", title: "The proof Poon shows", problem: "Prove insertionSort is correct.", steps: [
          "Invariant: at the start of each iteration of the for loop, a[0..j−1] holds the elements that were originally in a[0..j−1], in sorted order.",
          "Initialization: j = 1, so a[0..0] is one element — trivially sorted.",
          "Maintenance: assume a[0..j−1] is sorted. The while loop shifts every element bigger than key one slot right and drops key just before them, so a[0..j] is the original elements of a[0..j], sorted. The invariant now holds for j+1.",
          "Termination: the loop ends when j = a.length. The invariant says a[0..a.length−1] — the whole array — is sorted. Done.",
        ] },
        { id: "ins-6", t: "list", slide: "Runtime: best and worst", items: [
          "**Best case — already sorted**: the while condition `a[i] > key` is false immediately every time, so the inner loop never runs. One comparison per key: **Ω(n)**.",
          "**Worst case — sorted backwards**: every key must walk past every earlier element. Shifts: 1 + 2 + 3 + … + (n−1) = n(n−1)/2 (Chapter 0's sum). That's about n²/2: **O(n²)**.",
          "**Duplicates** (HW 3 Problem 3): the worst case stays O(n²). Because the test is strict (`>`), equal elements don't shift past each other — which is also why insertion sort is **stable**: equal items keep their original order.",
        ] },
        { id: "ins-7", t: "prof", title: "'Why would anyone use an O(n²) sort?' (slide 29 — a likely short answer)", text: "Three reasons. (1) **Small arrays** (under ~20): tiny constant factors and cache-friendly memory beat merge sort. Real libraries switch to insertion sort for small pieces — that is exactly Project 1's hybrid sort. (2) **Nearly-sorted data**: close to O(n) because the inner loop stops early. (3) **Simple and stable.**" },
        { id: "ins-8", t: "try", q: "Trace insertion sort on [4, 3, 2, 1]. How many shifts total, and what does that number tell you?", a: "j=1 key 3: 1 shift → [3,4,2,1]. j=2 key 2: 2 shifts → [2,3,4,1]. j=3 key 1: 3 shifts → [1,2,3,4]. Total 1+2+3 = 6 = 4·3/2 = n(n−1)/2. Reverse order is the worst case: every key shifts past everything." },
        { id: "ins-9", t: "try", q: "What input makes insertion sort fastest, and what makes it slowest? Give the growth for each.", a: "Fastest: already sorted, Ω(n) — the inner loop condition fails at once. Slowest: sorted largest-to-smallest, O(n²) — every element shifts past all earlier ones." },
      ],
    },
  ],
};
