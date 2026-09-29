"""CS 146 · Lecture 11: Hash tables, from the library analogy up."""
from c146common import *  # noqa
from h15common import CMP, CARDS, ROAD
from cs146_11_figs import *  # noqa
from cs146_11_trace import chaining_trace, resize_trace


def TRACE(title, pair):
    frames, trace = pair
    b = ST(title, frames)
    b["trace"] = trace
    return b


INS = [(42, "a"), (17, "b"), (82, "c"), (37, "d"), (55, "e"), (99, "f")]


def overwrite_frames():
    T = [None] * 10
    fr = [aframe(T[:], "An empty table of m = 10 slots. We'll insert six (key, value) pairs with h(k) = k mod 10 and NO collision handling yet. Only keys are shown.")]
    for k, v in INS:
        j = k % 10
        old = T[j]
        T[j] = k
        if old is None:
            cap = f"insert({k}, '{v}'): h({k}) = {k} mod 10 = **{j}**. Slot {j} is empty, so T[{j}] = ({k}, '{v}')."
            fr.append(aframe(T[:], cap, hl=[j]))
        else:
            cap = f"insert({k}, '{v}'): h({k}) = **{j}**, but T[{j}] already holds {old}. **Collision.** Without a plan, we overwrite it and ({old}, …) is gone for good."
            fr.append(aframe(T[:], cap, warn=[j]))
    fr.append(aframe(T[:], "Final state: 4 keys survived, but 42 and 17 were silently lost. Phase 2 of the library had the same problem. Chaining fixes it.", done=[2, 5, 7, 9]))
    return fr


def chain_rows(chains, hl=None):
    rows = []
    for i in range(10):
        c = [str(k) for k, v in chains.get(i, [])]
        cells = c + [None] * (3 - len(c))
        r = {"label": f"T[{i}]", "cells": cells}
        if hl is not None and hl == i:
            r["hl"] = [0]
        rows.append(r)
    return rows


def chaining_frames():
    ch = {}
    fr = [rframe(chain_rows(ch), "Same six inserts, now with chaining. Each row is one slot's linked list (chain), read left to right from the head; only keys are shown, like the slides. Empty boxes mean nothing is there.")]
    for k, v in INS:
        j = k % 10
        had = ch.get(j, [])
        ch[j] = [(k, v)] + had
        if had:
            cap = f"insert({k}, '{v}'): h({k}) = **{j}**. Slot {j} already has {had[0][0]}. No overwrite: the new pair goes at the **head** of the chain, and {had[0][0]} is pushed one step back. T[{j}] = ({k}, '{v}') → " + " → ".join(f"({a}, '{b}')" for a, b in had) + "."
        else:
            cap = f"insert({k}, '{v}'): h({k}) = **{j}**. Chain {j} is empty, so ({k}, '{v}') becomes its only node."
        fr.append(rframe(chain_rows(ch, j), cap))
    fr.append(rframe(chain_rows(ch), "Done. All six pairs are stored; nothing was lost. Chains 2 and 7 have two nodes each, and the newest node is always first."))
    return fr


def search_frames():
    ch = {2: [(82, "c"), (42, "a")], 5: [(55, "e")], 7: [(37, "d"), (17, "b")], 9: [(99, "f")]}
    fr = [rframe(chain_rows(ch), "search(17). Step 1: compute the slot. h(17) = 17 mod 10 = 7.")]
    rows = chain_rows(ch); rows[7]["hl"] = [0]
    fr.append(rframe(rows, "Step 2: look at the head of chain 7. Its key is 37. Not 17, so follow the next pointer."))
    rows = chain_rows(ch); rows[7]["hl"] = [1]; rows[7]["dim"] = [0]
    fr.append(rframe(rows, "Step 3: the next node's key is 17. Found it: return (17, 'b'). Two looks, because chain 7 has length 2."))
    rows = chain_rows(ch); rows[4]["hl"] = [0]
    fr.append(rframe(rows, "search(64): h(64) = 4. Chain 4 is empty, so return null right away. One look."))
    return fr


def resize_frames():
    fr = []
    m, keys = 4, []
    def rows_for(m, keys, hl=None):
        out = []
        for i in range(m):
            c = [str(k) for k in reversed(keys) if k % m == i]
            r = {"label": f"T[{i}]", "cells": c + [None] * (3 - len(c))}
            out.append(r)
        return out
    fr.append(rframe(rows_for(4, []), "Start small: m = 4 slots, and we'll resize whenever α = n/m goes above α_max = 0.75."))
    for k in [5, 12, 7]:
        keys.append(k)
        a = len(keys) / m
        fr.append(rframe(rows_for(m, keys), f"insert {k}: h({k}) = {k} mod {m} = {k % m}. n = {len(keys)}, α = {len(keys)}/{m} = {a:.2f}." + (" Still ≤ 0.75, fine." if a <= 0.75 else "")))
    keys.append(20)
    fr.append(rframe(rows_for(m, keys), f"insert 20: h(20) = 0. n = 4, α = 4/4 = 1.00 > 0.75. **Too full: time to resize.**"))
    m = 8
    fr.append(rframe(rows_for(m, keys), "Resize: make a new table with m = 8 and **re-insert every key** with the new h(k) = k mod 8 (the slots change!). That copy is O(n). Now α = 4/8 = 0.5 again."))
    return fr


g = {
 "id": "cs146/11-hash-tables",
 "course": "cs146",
 "lessons": "Lecture 11",
 "title": "Hash tables: the library analogy, hash functions, chaining",
 "summary": "From the library analogy up: the dictionary ADT, direct-address tables and why they waste space, hash functions (division and multiplication), collisions, chaining with insert at head, load factor α = n/m, and why resizing keeps every operation amortized O(1).",
 "estimatedMinutes": 75,
 "sourceNote": "Lecture 11 'Hash Tables' (Mon Sep 28) slides, CLRS 11 intro and 11.1 to 11.3. The library phases, the 42/17/82/37/55/99 trace, the m = 16 and prime 2663 examples, and the k = 123456 multiplication example are Poon's. Book letter counts (spaces not counted) are worked out here.",
 "requires": ["cs146/2-adts-invariants-insertion", "cs146/4-big-o-merge-sort"],
 "sections": [
  {"id": "map", "heading": "The big picture: find anything in O(1)", "blocks": [
    P("Every structure so far makes you **look** for things. An unsorted array: check every slot, O(n). A sorted array: binary search, O(log n). A **hash table** does better: it computes where a thing lives from its name, and goes straight there. On average that's **O(1)**, no matter how much you store. You already use it daily: a JavaScript `Map` or object, a Python `dict`, Java's `HashMap` are all hash tables.", slide="What this chapter answers"),
    ROAD("Find a value by its key in O(1)", [
      ("Library analogy", "3 phases: waste, collide, chain", "the intuition", "brand"),
      ("Direct-address table", "key = array index", "O(1) but huge"),
      ("Hash function", "compute the index from the key", "h(k) = k mod m", "green"),
      ("Collisions", "two keys, one slot", "chaining", "amber"),
      ("Load factor + resizing", "keep chains short", "amortized O(1)", "red"),
    ], "The lecture's five parts, in order. Each one fixes the problem the previous one exposed.", eyebrow="Lecture 11 agenda", slide="Five steps"),
    {"type": "video", "src": "/study-videos/cs146-hash-tables.mp4", "slide": "Watch it first",
     "caption": "The whole lecture as a 2.5-minute animation: the librarian's three phases, the six-key chaining trace, a search, and a resize. Use the chips to jump to a scene, or slow it to 0.75×.",
     "chapters": [{"t": 5, "label": "Phase 1: waste"}, {"t": 17, "label": "Phase 2: collisions"}, {"t": 45, "label": "Phase 3: chains"}, {"t": 66, "label": "Story → CS"},
                  {"t": 76, "label": "Chaining trace"}, {"t": 112, "label": "search(17)"}, {"t": 124, "label": "Load factor + resize"}, {"t": 146, "label": "Bottom line"}]},
    WHY("**Why it matters** Hash tables are probably the most used data structure in real software. Every time a website checks if your username is taken, a browser checks if it already downloaded an image, or your code does `obj[key]`, a hash table answers in constant time. If you understand this chapter, you understand why `map.get(key)` is fast and when it isn't."),
  ]},
  {"id": "library", "heading": "The library analogy, phase by phase", "blocks": [
    P("Poon builds the whole idea as a story about a librarian with 5 books: *Pride and Prejudice*, *Odyssey*, *The Great Gatsby*, *Dracula* and the *Bible*. She needs three operations: **search** for a book by title, **insert** a book, **delete** a book. Each phase fixes the problem of the last one.", slide="The setup"),
    D("Phase 1: one reserved cubby per book", "The library has **1,000 cubbies**, each fits one book. She reserves cubby 0 for *Bible*, cubby 1 for *Dracula*, and so on. To search, she walks straight to that book's cubby. Every operation is instant. But 995 cubbies sit empty forever."),
    F(fig_phase1(), "Phase 1, drawn to scale (480 of the 1,000 cubbies shown). The five colored cubbies are the whole library; every outlined square is paid-for wall space holding nothing. Hover the cubbies.", slide="Phase 1: fast but wasteful"),
    D("Phase 2: 10 cubbies and a rule", "The mayor says she can only have **10 cubbies**. So she invents a **rule** that turns any title into a cubby number: count the letters, keep the last digit (the count **mod 10**). *Bible* has 5 letters → cubby 5. *Odyssey* has 7 → cubby 7. Now 10 cubbies can serve any title. But what if two titles get the same number?"),
    F(fig_phase2(), "Phase 2 with all five books. The rule sends 'Odyssey', 'Dracula' and 'Pride and Prejudice' (17 letters → 7) to the same cubby. Only one fits. Hover each row for the arithmetic.", slide="Phase 2: small, but books collide"),
    D("Phase 3: chains for collisions", "She buys chains. If a book's cubby is already full, she clips the new book onto **that cubby's chain**. To search, she uses the rule to find the cubby, checks the book there, then walks down the chain until she finds the title (or runs out of chain)."),
    F(fig_phase3(), "Phase 3: cubby 7 holds 'Odyssey' and a chain with 'Dracula' and 'Pride and Prejudice'. Searching for 'Dracula' takes 2 looks instead of 1. Hover the cubby.", slide="Phase 3: chains fix collisions"),
    T(["Phase", "Idea", "What works", "What breaks"], [
      ["1", "one cubby reserved per possible book", "search / insert / delete are instant", "995 of 1,000 cubbies wasted"],
      ["2", "10 cubbies + a rule (letters mod 10)", "tiny space, still instant", "two books can map to one cubby: collision"],
      ["3", "same rule + a chain per cubby", "no space waste, no lost books", "a long chain makes search slower"],
    ], title="The three phases, side by side", slide="Phases side by side"),
    T(["In the story", "In computer science"], [
      ["book title", "**key**"],
      ["the physical book", "**value**"],
      ["the wall of cubbies", "an **array** (the table T)"],
      ["one cubby", "a **slot** (T[i])"],
      ["the letters-mod-10 rule", "the **hash function** h(k)"],
      ["two books, one cubby", "a **collision**"],
      ["the chain on a cubby", "a **linked list** (chaining)"],
      ["average books per cubby", "the **load factor** α"],
      ["buying a bigger wall and moving every book", "**resizing** (rehashing)"],
    ], title="Translating the analogy", slide="Story → CS"),
    C("With Poon's rule (letters mod 10), which cubby does *Hamlet* go to? Does it collide with any of the five books?", "*Hamlet* has 6 letters, 6 mod 10 = **6**. Cubby 6 is empty (the five books use 4, 5 and 7), so no collision."),
    C("Which cubby does *Moby Dick* go to?", "M-o-b-y D-i-c-k = 8 letters (the space doesn't count) → cubby **8**."),
  ]},
  {"id": "adt", "heading": "The dictionary ADT: keys and values", "blocks": [
    D("Dictionary ADT", "An abstract data type for storing **key-value pairs** and finding a value quickly by its key. Poon calls it the 'Library ADT (actually the Dictionary ADT)'. (ADT = what the structure does, not how, from Lecture 2.)", slide="Definition"),
    D("Key and value", "The **key** is the piece of information you look things up by; the **value** is what you want back. Library: key = book title, value = the physical book. A real dictionary: key = word, value = definition. A gradebook: key = student name, value = grade."),
    T(["Operation", "What it does"], [
      ["insert(k, v)", "add the pair (k, v)"],
      ["delete(k)", "remove the pair whose key is k"],
      ["search(k)", "return the pair with key k if it exists, else null"],
    ], title="The three operations", slide="Operations"),
    E("The same ADT in code you already know", "JavaScript:\n  const grades = new Map();\n  grades.set(\"Alice\", 95);      // insert\n  grades.get(\"Alice\");          // search → 95\n  grades.delete(\"Alice\");       // delete\n\nJava (Poon's slide):\n  Map<String, Integer> grades = new HashMap<>();\n  grades.put(\"Alice\", 95);        // hashes \"Alice\" to find a slot\n  int grade = grades.get(\"Alice\");  // hashes \"Alice\" again to retrieve", slide="Map and HashMap"),
    P("**How could we build it?** An array or a linked list of pairs works, but search means scanning: O(n). The rest of the chapter builds something that does all three operations in O(1)."),
    C("In a phone's contact list, what is the key and what is the value?", "Key: the contact's name. Value: their phone number (and other details)."),
  ]},
  {"id": "direct", "heading": "Direct-address tables: the key IS the index", "blocks": [
    D("Direct-address table", "The special case where every key is a small whole number. The universe of possible keys is U = {0, 1, …, 9}. Make an array T with one slot per possible key: **T[k] holds the value for key k**, or null if there isn't one. This is Phase 1 of the library.", slide="Definition"),
    D("Universe U and |U|", "**U** is the set of every key that could ever show up. **|U|** is how many there are (set size, 'cardinality'): if A = {1, 2, 3} then |A| = 3. A direct-address table needs an array of size |U|."),
    F(fig_direct(), "CLRS p. 254 redrawn. U = {0..9}, but only K = {2, 3, 5, 8} are in use. Each used key points straight at its own slot, which points to the stored data; every other slot is null. Hover any slot.", slide="Direct addressing, drawn"),
    T(["Operation", "Code", "Time"], [
      ["search(k)", "return T[k]", "O(1)"],
      ["insert(k, v)", "T[k] = v", "O(1)"],
      ["delete(k)", "T[k] = null", "O(1)"],
    ], title="Every operation is one array access", slide="All O(1)"),
    P("**So why not use this for everything?** Because the array must be as big as the universe of keys, not the number you actually store. Poon's example: keys are SJSU student IDs (9 digits).", slide="The catch"),
    F(fig_ids(), "Each small square is a million array slots, so the grid is a billion. SJSU's 40,000 students occupy 4% of the first square. Everything else is null. Hover the legend.", slide="1 billion slots for 40,000 students"),
    C("Keys are 3-digit room numbers (000 to 999) and you store 12 rooms. How big is a direct-address table, and what fraction is used?", "|U| = 1,000 slots; 12 used, so 1.2%. Fast, but 98.8% of the array is wasted."),
  ]},
  {"id": "hashing", "heading": "Hash tables and hash functions", "blocks": [
    D("Hash table", "An array T with **m** slots, where m is much smaller than |U| (written m ≪ |U|). Instead of using the key as the index, we **compute** the index from the key.", slide="Hash table"),
    D("Hash function h", "A function that maps any key in U to a slot number: **h : U → {0, 1, …, m−1}**. The number h(k) is the key's **hash value**, and we store the pair at T[h(k)]. In the library, h was 'count the letters, take mod 10'."),
    F(fig_hash(True), "CLRS p. 256 redrawn. A huge U funnels through h into only m = 8 slots. Most keys land in their own slot, but k₂ and k₅ both hash to slot 3. Hover each key.", slide="Keys through the hash function"),
    D("Collision", "Two **different** keys with the **same** hash value: h(k₂) = h(k₅). Because m is smaller than |U|, collisions can't be avoided entirely (more possible keys than slots), so we need a plan for them. Phase 2's cubby 7 was a collision."),
    CARDS([
      ("Deterministic", "must", ["Same key → same slot, every time.", "Otherwise search can't find what insert stored."], "brand"),
      ("Fast to compute", "must", ["h(k) runs on every operation.", "A slow h erases the whole benefit."], "green"),
      ("Uniform", "goal", ["Spreads keys evenly over all m slots.", "Even spread = short chains."], "amber"),
    ], "What makes a good hash function (Poon's three).", slide="A good hash function"),
    D("Simple uniform hashing assumption (SUHA)", "We **assume** the hash function sends each key to any of the m slots with equal chance, independently of where other keys went. It's an idealization that lets us do the math on average chain length. Real hash functions only approximate it."),
    C("A hash function returns a random slot each time it's called. Why is that useless?", "It isn't deterministic: insert(k) might store at slot 3 and search(k) might look at slot 8, so you'd never find anything."),
  ]},
  {"id": "division", "heading": "Hashing by division: h(k) = k mod m", "blocks": [
    D("mod (remainder)", "**a mod m** is the remainder when a is divided by m. 42 mod 10 = 2 (42 = 4·10 + **2**). 17 mod 10 = 7. 123 mod 16 = 11 (123 = 7·16 + **11**). The answer is always between 0 and m−1, which is exactly the range of slot numbers.", slide="What mod means"),
    D("Division method", "**h(k) = k mod m**, where k is an integer key and m is the table size. The library rule was this with m = 10 and k = number of letters."),
    ST("Hashing by division, m = 10, no collision handling (the slide trace)", overwrite_frames()),
    TRAP("Without collision handling, a colliding insert **silently overwrites** the old pair. After the six inserts, 42 and 17 are simply gone. The slide flags it: 'We lost information!'", "Lecture 11 slide 23", slide="Trap: overwriting loses data"),
    F(fig_bits(), "Poon's example. With m = 16, 'mod 16' just keeps the last 4 bits of the key, so keys differing only in their higher bits all collide. A prime m mixes in every bit. Hover the bits.", slide="Choosing m"),
    P("**The rule for choosing m:** avoid powers of 2 (4, 8, 16, 1024…). Pick a **prime** that isn't close to a power of 2. To size a table: expected items ÷ target fullness, then round to a nearby prime (2,000 ÷ 0.75 ≈ 2,667 → **2,663**)."),
    C("m = 10. Where do 23, 58, 73 and 100 go? Which ones collide?", "h(23) = 3, h(58) = 8, h(73) = 3, h(100) = 0. **23 and 73 collide** in slot 3."),
    PY("Your turn: hash by division", "Write `h(k, m)` for the division method, then print the slot for each key in the slide's list with m = 10.",
       '''
def h(k, m):
    # return the division-method hash
    return 0

for k in [42, 17, 82, 37, 55, 99]:
    print(k, "->", h(k, 10))
''',
       check='''
assert h(42, 10) == 2 and h(17, 10) == 7 and h(99, 10) == 9, "h(42,10) should be 2, h(17,10) 7, h(99,10) 9. Use k % m."
assert h(123, 16) == 11, "h(123, 16) should be 11 (the slide's power-of-2 example)."
''',
       solution='''
def h(k, m):
    return k % m

for k in [42, 17, 82, 37, 55, 99]:
    print(k, "->", h(k, 10))
''', hints=["In Python the remainder operator is %.", "return k % m"], success="That's the whole division method: one % per operation."),
  ]},
  {"id": "multiplication", "heading": "Hashing by multiplication", "blocks": [
    D("Multiplication method", "**h(k) = ⌊ m · (k·A mod 1) ⌋**, with a constant 0 < A < 1. Three steps: multiply k by A, keep only the **fractional part** (that's what 'mod 1' means: 13.657 → 0.657), multiply by m and round down (⌊ ⌋ = floor). A common choice is A ≈ 0.6180339887, related to the golden ratio.", slide="Definition"),
    ST("Poon's example: k = 123456, m = 1000, A ≈ 0.6180339887", [
      lines(["h(k) = ⌊ m · (k·A mod 1) ⌋"], 0, "Three steps. The nice thing: m can be anything, even a power of 2, because the fractional part mixes all the digits of k."),
      lines(["h(k) = ⌊ m · (k·A mod 1) ⌋", "1. k·A = 123456 × 0.6180339887 = 76207.525…"], 1, "Step 1, multiply by A."),
      lines(["h(k) = ⌊ m · (k·A mod 1) ⌋", "1. k·A = 123456 × 0.6180339887 = 76207.525…", "2. fractional part: 0.525…"], 2, "Step 2, 'mod 1': throw away the whole-number part 76207 and keep 0.525…"),
      lines(["h(k) = ⌊ m · (k·A mod 1) ⌋", "1. k·A = 123456 × 0.6180339887 = 76207.525…", "2. fractional part: 0.525…", "3. m × 0.525… = 525.…  → floor → 525"], 3, "Step 3, scale to the table and round down. So h(123456) = **525**: slot 525 of 1000."),
    ]),
    CMP(("Division", "h(k) = k mod m", "brand"), ("Multiplication", "h(k) = ⌊m·(kA mod 1)⌋", "amber"), [
      ("Speed", "one remainder", "a multiply, a subtract, a multiply"),
      ("Choice of m", "matters a lot: use a prime", "barely matters; powers of 2 are fine"),
      ("On the exam", "trace inserts with it", "compute one value step by step"),
    ], "The two hash functions in the lecture.", slide="Division vs multiplication"),
    C("Compute h(10) with m = 100 and A = 0.618 (use the rounded A).", "10 × 0.618 = 6.18 → fractional part 0.18 → 100 × 0.18 = 18 → **h(10) = 18**."),
  ]},
  {"id": "chaining", "heading": "Collision resolution: chaining", "blocks": [
    D("Chaining", "Each slot T[j] holds a **linked list** (a chain) of all the key-value pairs that hash to j. A collision just makes that chain one node longer. This is the librarian's Phase 3.", slide="Definition"),
    D("Insert at head", "A new pair goes at the **front** of its chain: point the new node at the old first node, then make T[j] point at the new node. That's O(1) no matter how long the chain is (no walking to the end)."),
    ST("The same six inserts, with chaining (insert at head)", chaining_frames()),
    F(fig_chain_table(), "The finished table as real linked-list nodes (CLRS p. 257 style). Each node is key | value | next. T[2] points to 82, whose next points to 42; 42's next is null. Hover any node.", slide="Chains as linked-list nodes"),
    P("**Now follow the actual code.** The next player runs `insert` and `search` line by line. The left side lights up the line that is executing; the right side shows what that line just did to the table; the chips under the code are the variables at that moment. Pause any time, or open it full screen.", slide="Code, line by line"),
    TRACE("insert and search, line by line", chaining_trace()),
    E("Appendix: how real HashMaps keep keys unique", "Poon's slides assume insert() is only called with a new key. Java's HashMap instead does:\n\n1. j = h(k)                              O(1)\n2. walk chain T[j]; if k is found, replace its value with v    O(α)\n3. if k wasn't found, insert (k, v) at the head             O(1)\n\nThat's why map.put(\"Alice\", 99) after put(\"Alice\", 95) leaves ONE Alice, with 99.", slide="Unique keys in practice"),
    C("Chaining, insert at head, m = 10. Insert 12, 22, 32 in that order. What does chain 2 look like?", "T[2] → 32 → 22 → 12. The newest is always first."),
    PY("Your turn: a chained hash table", "Finish `insert` (at the head) and `search` for a table of m Python lists. Each list is a chain of (key, value) tuples.",
       '''
m = 10
T = [[] for _ in range(m)]

def insert(k, v):
    j = k % m
    # put (k, v) at the FRONT of chain T[j]
    pass

def search(k):
    j = k % m
    # walk chain T[j]; return the value for k, or None
    return None

for k, v in [(42, 'a'), (17, 'b'), (82, 'c'), (37, 'd'), (55, 'e'), (99, 'f')]:
    insert(k, v)
print(T[2], T[7])          # expect [(82, 'c'), (42, 'a')] [(37, 'd'), (17, 'b')]
print(search(17), search(64))  # expect b None
''',
       check='''
assert T[2] == [(82, 'c'), (42, 'a')], f"T[2] should be [(82, 'c'), (42, 'a')] (82 inserted at the head). Got {T[2]}."
assert T[7] == [(37, 'd'), (17, 'b')], f"T[7] should be [(37, 'd'), (17, 'b')]. Got {T[7]}."
assert search(42) == 'a' and search(17) == 'b', "search should walk past the head to find 42 and 17."
assert search(64) is None, "search(64) should return None: chain 4 is empty."
''',
       solution='''
m = 10
T = [[] for _ in range(m)]

def insert(k, v):
    j = k % m
    T[j].insert(0, (k, v))

def search(k):
    j = k % m
    for key, val in T[j]:
        if key == k:
            return val
    return None

for k, v in [(42, 'a'), (17, 'b'), (82, 'c'), (37, 'd'), (55, 'e'), (99, 'f')]:
    insert(k, v)
print(T[2], T[7])
print(search(17), search(64))
''', hints=["list.insert(0, x) puts x at the front.", "In search, loop `for key, val in T[j]:` and return val when key == k."], success="You just built the core of every dict and Map."),
  ]},
  {"id": "runtime", "heading": "How fast? Load factor, resizing, amortized O(1)", "blocks": [
    T(["Operation", "Steps", "Time"], [
      ["insert(k, v)", "j = h(k); put (k, v) at head of T[j]", "O(1) + O(1) = **O(1)**"],
      ["delete(k)", "j = h(k); walk T[j], unlink the node with key k", "O(1) + **O(chain length)**"],
      ["search(k)", "j = h(k); walk T[j] looking for k", "O(1) + **O(chain length)**"],
    ], title="Runtime of chaining (insert at head)", slide="Runtime, first pass"),
    D("Load factor α", "The average chain length: **α = n / m**, where n = number of pairs stored and m = number of slots. Under simple uniform hashing, a search walks about α nodes, so search and delete are **O(α)**.", slide="Load factor"),
    F(fig_alpha(), "Same m = 10 slots, more and more items. The chains grow with α, and so does search time. Count the blocks under each slot: that's the chain a search may have to walk.", slide="α, pictured"),
    P("**The problem:** α = n/m, and n keeps growing, so with a fixed m, O(α) is really O(n). **The fix:** we control m. When the table gets too full, make it bigger.", slide="α grows with n… unless we grow m"),
    D("Resizing (rehashing)", "Pick a fixed limit, like **α_max = 0.75**. When an insert pushes α above it, create a new array of size **2m** and re-insert every pair (their slots change, because h depends on m). Doubling m halves α. The copy costs O(n)."),
    TRACE("Resizing, line by line", resize_trace()),
    D("Amortized time", "An accounting method: spread the cost of the rare expensive step (the O(n) resize) over all the cheap operations around it. If the **average** cost per operation stays constant, we say the operation is **amortized O(1)**. The librarian 'counts the cost of that copy by spreading a little of it over all the many fast searches'."),
    F(fig_amortized(), "48 inserts into a table that starts at m = 4 and doubles past α = 0.75. Most inserts cost 1 (green). The few that trigger a resize (red) cost n, but they get twice as rare each time, so the average (dashed line) stays small and flat. Hover any bar.", slide="Amortized O(1), pictured"),
    T(["Operation", "Worst single call", "Amortized"], [
      ["insert", "O(n) (the call that triggers a resize)", "**O(1)**"],
      ["search", "O(α), kept small by resizing", "**O(1)**"],
      ["delete", "O(α), kept small by resizing", "**O(1)**"],
    ], title="The bottom line (assuming simple uniform hashing)", slide="Final runtimes"),
    TRAP("Amortized O(1) is not 'every call is O(1)'. One insert can cost O(n) when it triggers a resize; the promise is about the **average over many calls**. And it rests on SUHA: a terrible hash function that sends everything to one slot makes search O(n) no matter how big m is.", "Exam", slide="Trap: amortized ≠ always"),
    C("n = 30 pairs, m = 10 slots. What is α, and about how many nodes does a search walk?", "α = 30/10 = **3**, so about 3 nodes."),
    C("α_max = 0.75 and m = 8. On which insert (which n) does the table resize, and to what size?", "When α > 0.75: 6/8 = 0.75 is still OK, 7/8 = 0.875 is over. So the **7th** insert triggers a resize to **m = 16**."),
  ]},
  {"id": "apps", "heading": "Where hash tables show up", "blocks": [
    CARDS([
      ("Language internals", "everywhere", ["Python dict, JavaScript Map / objects, Java HashMap.", "`obj[key]` is a hash lookup."], "brand"),
      ("Databases", "indexes", ["Find the record with ID 1234 without scanning the table."], "green"),
      ("Caches", "speed", ["Browser: key = image URL → value = the file.", "Web apps: key = query text → value = result."], "amber"),
      ("Deduplication", "storage", ["Cloud drives hash each file; identical files share one stored copy."], "red"),
    ], "Poon's applications slide.", slide="Applications"),
    WORLD("**Where you've already met this** In your own Tauri/React apps, every `useMemo` cache, every `new Map()`, every lookup by ID in a normalized store is a hash table. When a Map feels 'instant' with 100,000 entries, this chapter is the reason; when a bad key (like an object whose hash is always the same) makes it crawl, so is the load factor."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Dictionary ADT", "Store key-value pairs; insert, delete, search by key."],
      ["Key / value", "What you look up by / what you get back."],
      ["Universe U, |U|", "Every possible key / how many there are."],
      ["Direct-address table", "Array of size |U|; T[k] holds key k's value. O(1) but huge."],
      ["Hash table", "Array of m ≪ |U| slots; index computed by h(k)."],
      ["Hash function h", "Maps any key to a slot 0..m−1: deterministic, fast, uniform."],
      ["Collision", "Two different keys with the same hash value."],
      ["SUHA", "Assume every key is equally likely to land in any slot."],
      ["Division method", "h(k) = k mod m; choose m prime, not a power of 2."],
      ["Multiplication method", "h(k) = ⌊m·(kA mod 1)⌋, A ≈ 0.618."],
      ["Chaining", "Each slot holds a linked list of the pairs that hash there."],
      ["Load factor α", "n / m: average chain length."],
      ["Resizing", "When α > α_max, double m and re-insert everything: O(n)."],
      ["Amortized O(1)", "Average cost per operation is constant even though rare calls cost O(n)."],
    ]),
  ]},
 ],
 "exercises": [
  MC("which-slot", "Hash by division", "m = 7. What is h(52) with the division method?", ["3", "2", "5", "7"], 0,
     ["Yes: 52 = 7·7 + 3.", "52 mod 7 is not 2; 7·7 = 49, and 52 − 49 = 3.", "Check: 7·7 = 49, remainder 3.", "A slot number is always 0..m−1, so it can't be 7."],
     "**3.** 52 mod 7: 7 × 7 = 49, 52 − 49 = 3.", "Tracing inserts with k mod m is the most likely exam question on this lecture.", ref="division"),
  MC("chain-order", "Insert at head", "m = 10, chaining, insert at head. Insert 14, 24, 34 in that order. What is chain 4?", ["34 → 24 → 14", "14 → 24 → 34", "34 only", "14 only"], 0,
     ["Yes: each new key goes to the front.", "That's insert at TAIL. Poon's version inserts at the head.", "Chaining keeps all three; nothing is overwritten.", "Chaining keeps all three."],
     "**34 → 24 → 14.**", "Insert at head is what makes insert O(1).", ref="chaining"),
  MC("power2", "Pick m", "You need a table for about 2,000 items, kept about 75% full. Which m is the best choice?", ["2663", "2048", "2667", "2000"], 0,
     ["Yes: 2000 / 0.75 ≈ 2667, and 2663 is a nearby prime (Poon's own example).", "2048 = 2¹¹, a power of 2: mod keeps only the low 11 bits of the key.", "Right size, but 2667 = 3 × 7 × 127 isn't prime.", "At m = 2000 the table would be 100% full (α = 1), not 75%."],
     "**2663**: about 2000 / 0.75, and prime.", "Poon's rule: prime, not close to a power of 2.", ref="division"),
  MC("alpha", "Load factor", "A chained table has m = 20 slots and n = 50 pairs. What is α?", ["2.5", "0.4", "70", "30"], 0,
     ["Yes: n / m = 50 / 20.", "That's m / n, upside down.", "That's n + m.", "That's n − m."],
     "**α = 50 / 20 = 2.5.**", "α is the number that turns 'O(chain length)' into something you can compute.", ref="runtime"),
  MC("amortized", "What does amortized O(1) promise?", "Hash table insert is amortized O(1). Which statement is true?", ["Some single inserts can cost O(n), but the average over many inserts is O(1)", "Every insert is O(1)", "Insert is O(n) on average", "Insert never resizes the table"], 0,
     ["Right: the resize is O(n), but rare.", "The insert that triggers a resize copies all n items.", "The average is constant, not linear.", "Resizing is exactly what keeps α small."],
     "Rare O(n) resizes, averaged over many O(1) inserts, give O(1) per insert.", "The exam likes to test the difference between worst case and amortized.", ref="runtime"),
  MC("direct-why", "Why not direct addressing?", "Why don't we use a direct-address table for 9-digit student IDs?", ["The array needs ~1 billion slots for ~40,000 students", "Its operations are O(n)", "It can't store integers", "It has too many collisions"], 0,
     ["Yes: space proportional to |U|, not to n.", "Its operations are all O(1).", "It stores integer keys by design.", "It never collides: each key has its own slot."],
     "The space is |U|, about a billion slots, almost all null.", "This is exactly the problem hashing exists to solve.", ref="direct"),
  FILL("mult", "Hash by multiplication", "m = 1000, A = 0.5. What is h(7)? (Compute ⌊m · (kA mod 1)⌋.)", ["500"],
       ["k·A = 7 × 0.5 = 3.5.", "The fractional part of 3.5 is 0.5.", "1000 × 0.5 = 500, floor is 500."],
       ["7 × 0.5 = 3.5 → fractional part 0.5 → 1000 × 0.5 = 500 → **h(7) = 500**."],
       "The three steps are always the same: multiply, keep the fraction, scale and floor.", ref="multiplication"),
 ],
}

for e in g["exercises"]:
    if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
build(g)
