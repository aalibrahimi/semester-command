from c146common import *
import fig6

FG = fig6.figures6()
SLUG = "6-recurrences"
O = lambda sid, pred: old_block(SLUG, sid, pred)

g = {
 "id": "cs146/6-recurrences",
 "course": "cs146",
 "lessons": "Lecture 6",
 "title": "Recurrences: reading them, unrolling them, the recursion tree, and substitution",
 "summary": "Read a recurrence as a sentence about one call, compute one by hand, solve it by drawing the recursion tree and adding row by row, and prove the answer with substitution. The master method shortcut gets its own chapter next.",
 "estimatedMinutes": 70,
 "sourceNote": "Lecture 6 'Recurrences: Substitution, Recursion Tree' (Sep 9) slides, HW 6, CLRS 4.3–4.4. Real-world notes are general industry practice.",
 "requires": ["cs146/0-notation", "cs146/4-big-o-merge-sort"],
 "sections": [
  {"id": "map", "heading": "The big picture: timing a function that calls itself", "blocks": [
    P("A loop is easy to time: count how many times it runs. A **recursive** function is harder, because its cost depends on the cost of the calls it makes, which depend on the calls *they* make. A **recurrence** is the tool for that. This chapter: write one, compute one, and solve one two ways.", slide="What this chapter answers"),
    DG("roadmap", {"eyebrow": "The question", "question": "How long does a **recursive** function take?", "steps": [
        {"title": "Read T(n)", "sub": "a sentence about ONE call", "result": "2T(n/2) + kn"},
        {"title": "Unroll it", "sub": "plug in n = 8 by hand", "result": "T(8) = 32", "tone": "amber"},
        {"title": "Recursion tree", "sub": "add up the work row by row", "result": "kn × log n", "tone": "brand"},
        {"title": "Substitution", "sub": "prove the guess by induction", "result": "c ≥ k", "tone": "green"},
        {"title": "Next chapter", "sub": "the master method shortcut", "result": "3 cases"}]},
       "The chapter in five steps. The last one, the master method, is the next chapter.", slide="Five steps"),
    O("why", lambda b: b.get("label") == "why"),
    O("why", lambda b: b["type"] == "trap"),
  ]},
  {"id": "read", "heading": "Step 1: read a recurrence as a sentence", "blocks": [
    D("Recurrence", "An equation that describes a function's cost **in terms of its own cost on smaller inputs**, plus a **base case** that stops it. Example: T(n) = 2T(n/2) + kn, T(1) = 1."),
    DG("formula", {"parts": [{"text": "T(n) ="}, {"text": "2", "tone": "amber", "label": "how many calls"}, {"text": "T("}, {"text": "n/2", "tone": "green", "label": "size of each call"}, {"text": ") +"}, {"text": "kn", "tone": "brand", "label": "work in THIS call"}],
       "code": [{"code": "mergeSort(a):"}, {"code": "  if n == 1: return", "tag": "T(1) = 1"}, {"code": "  mergeSort(left half)", "tag": "T(n/2)", "tone": "green"}, {"code": "  mergeSort(right half)", "tag": "T(n/2)", "tone": "green"}, {"code": "  merge(left, right)", "tag": "kn", "tone": "brand"}],
       "note": "Two half-size calls plus the merge: that's the whole recurrence."},
       "Merge sort's recurrence, piece by piece, next to the line of code each piece comes from.", slide="Reading T(n) = 2T(n/2) + kn"),
    THINK("**Read it out loud as one sentence.** 'To handle n things, I make **2** calls on **n/2** things each, and do **kn** work myself.' The recurrence only describes ONE call; the T(n/2) terms stand for everything the smaller calls do."),
    O("read", lambda b: b["type"] == "example"),
    O("read", lambda b: b["type"] == "prose" and "Why only one level" in b["md"]),
    P("A few more, read out loud:"),
    O("read", lambda b: b["type"] == "prose" and "3T(n/5) + 17" in b["md"]),
    WORLD("**Anything recursive has a recurrence.** Computing a folder's total size: the folder's own files plus a recursive call on each subfolder. Rendering a web page's tree of components: each component plus its children. The FFT that turns sound into a spectrum (you'll meet it in LING 124) is T(n) = 2T(n/2) + n, exactly merge sort's shape, which is why it's fast enough to run live on your phone's microphone."),
    O("read", lambda b: b["type"] == "check"),
  ]},
  {"id": "unroll", "heading": "Step 2: compute one by hand (n = 8)", "blocks": [
    O("unroll", lambda b: b["type"] == "prose" and "dumbest" in b["md"]),
    O("unroll", lambda b: b["type"] == "stepper"),
    O("unroll", lambda b: b["type"] == "prose" and "Two things" in b["md"]),
    PY("Your turn: let the computer unroll it", "Write `T(n)` exactly as the recurrence says: T(1) = 1, otherwise T(n) = 2·T(n/2) + n (use `n // 2`). Then compare it with n·log₂ n + n for powers of 2.",
       '''
import math

def T(n):
    # base case: T(1) = 1
    # otherwise: two calls on n // 2, plus n of your own work
    return 0

for n in [1, 2, 4, 8, 16, 1024]:
    print(f"n = {n:5}:  T(n) = {T(n):6}   n·log2(n) + n = {round(n * math.log2(n) + n):6}")
''',
       check='''
assert T(1) == 1, "T(1) should be 1: that's the base case."
assert T(2) == 4, f"T(2) = 2·T(1) + 2 = 4. Got {T(2)}."
assert T(8) == 32, f"T(8) = 2·T(4) + 8 = 2·12 + 8 = 32. Got {T(8)}."
assert T(1024) == 1024 * 10 + 1024, f"T(1024) should be 1024·10 + 1024 = 11264. Got {T(1024)}."
''',
       solution='''
import math

def T(n):
    if n == 1:
        return 1
    return 2 * T(n // 2) + n

for n in [1, 2, 4, 8, 16, 1024]:
    print(f"n = {n:5}:  T(n) = {T(n):6}   n·log2(n) + n = {round(n * math.log2(n) + n):6}")
''',
       hints=["Start with `if n == 1: return 1`.", "Then `return 2 * T(n // 2) + n`.", "The function calls itself exactly like the recurrence does."],
       success="The two columns match exactly: T(n) = n log₂ n + n. The recursion tree below shows why."),
  ]},
  {"id": "tree", "heading": "Step 3: the recursion tree (add it up row by row)", "blocks": [
    D("Recursion tree", "A drawing of every call: each box is one call, under it are the calls it makes, and inside it is the work that call does **itself** (the f(n) part). Total cost = the sum of all boxes = the sum of the **rows**."),
    WHY("**Why add by rows?** Every box in a row has the same size and does the same work, so a row is just (number of boxes) × (work per box). That turns a huge sum into a short one."),
    DG("levels", {"rows": [
        {"label": "level 0", "parts": [8], "partLabel": "kn", "total": "kn"},
        {"label": "level 1", "parts": [4, 4], "partLabel": "kn/2", "total": "kn"},
        {"label": "level 2", "parts": [2, 2, 2, 2], "partLabel": "kn/4", "total": "kn"},
        {"label": "level 3", "parts": [1] * 8, "partLabel": "", "total": "kn", "tone": "green"}],
       "summary": "(log₂ n + 1) rows × kn per row", "detail": "= kn log n + kn = O(n log n)"},
       "Merge sort's tree, row by row. Going down, the number of calls doubles but each call's own work halves, so every row costs exactly kn.", slide="Row by row"),
    O("tree", lambda b: b["type"] == "stepper"),
    O("tree", lambda b: b["type"] == "table"),
    O("tree", lambda b: b["type"] == "prose" and "level i is the one" in b["md"]),
    O("tree", lambda b: b["type"] == "example" and "depth" in b["title"]),
    O("tree", lambda b: b["type"] == "example" and "slide 27" in b["title"]),
    THINK("**The recipe for any tree.** Make a table with one row per level and four columns: number of nodes (aⁱ), size of each (n/bⁱ), work per node (f of that size), total (multiply). Fill level 0, 1, 2, then write the general level i. Count levels (log_b n + 1). Add up the totals."),
    P("**When the rows are NOT all equal.** Merge sort is the special case where every row costs the same. Change a or b and the rows grow or shrink. Poon works two on slides 28–33:", slide="Trees where rows grow or shrink"),
    O("tree", lambda b: b["type"] == "example" and "Three subproblems" in b["title"]),
    O("tree", lambda b: b["type"] == "example" and "third the size" in b["title"]),
    DG("cards", {"cards": [
        {"title": "3T(n/2) + kn", "badge": "rows grow ×3/2", "tone": "amber", "viz": [1, 1.5, 2.25, 3.4], "lines": ["the **leaves** win"]},
        {"title": "2T(n/2) + kn", "badge": "rows equal", "tone": "green", "viz": [2, 2, 2, 2], "lines": ["**every row** counts"]},
        {"title": "2T(n/3) + kn", "badge": "rows shrink ×2/3", "tone": "brand", "viz": [3.4, 2.27, 1.5, 1], "lines": ["the **root** wins"]}],
       "note": "Each bar is one row's total work, root at the top. This picture is the whole idea behind the master method."},
       "Row totals for three recurrences.", slide="Three shapes"),
    SIM("rectree", "Set a, b and f(n) and watch the rows. Start at merge sort (2, 2, n): equal bars. Then set a = 3 (rows grow) and b = 3 with a = 2 (rows shrink). The level ratio a/bᵏ tells you which, before you draw anything.", {"a": 2, "b": 2, "k": 1, "n": 64}),
    PY("See the rows", "This prints the recursion-tree table for T(n) = a·T(n/b) + n^k and plots each row's total. Run it for merge sort, then change `a`, `b`, `k` to 3, 2, 1 and to 2, 3, 1 and watch the shape of the bars change.",
       '''
import math
import matplotlib.pyplot as plt

a, b, k = 2, 2, 1        # T(n) = a·T(n/b) + n^k
n = 256

levels = round(math.log(n, b))
totals = []
print(f"{'level':>5} {'nodes':>7} {'size':>8} {'work/node':>10} {'row total':>10}")
for i in range(levels + 1):
    nodes = a ** i
    size = n / b ** i
    work = size ** k if i < levels else 1     # leaves cost 1 each
    totals.append(nodes * work)
    print(f"{i:>5} {nodes:>7} {size:>8.2f} {work:>10.2f} {nodes * work:>10.1f}")
print("total ≈", round(sum(totals)))

plt.barh(range(len(totals)), totals)
plt.gca().invert_yaxis()
plt.xlabel("row total"); plt.ylabel("level (0 = root)")
plt.title(f"T(n) = {a}T(n/{b}) + n^{k}")
plt.show()
'''),
    O("tree", lambda b: b["type"] == "check"),
  ]},
  {"id": "substitution", "heading": "Step 4: substitution (guess, then prove it)", "blocks": [
    O("substitution", lambda b: b.get("label") == "why"),
    DG("roadmap", {"eyebrow": "Substitution = induction", "question": "Prove T(n) = 2T(n/2) + kn is O(n log n)", "steps": [
        {"title": "Guess", "sub": "from the tree", "result": "T(n) ≤ c·n log n"},
        {"title": "Assume", "sub": "true for the smaller input", "result": "T(n/2) ≤ c(n/2) log(n/2)"},
        {"title": "Substitute", "sub": "plug in, simplify", "result": "≤ c·n log n − cn + kn", "tone": "amber"},
        {"title": "Prove", "sub": "the leftover must be ≤ 0", "result": "c ≥ k ✓", "tone": "green"}]},
       "The whole method on merge sort. The leftover −cn + kn is the only thing between you and the guess.", slide="Four steps"),
    O("substitution", lambda b: b["type"] == "definition" and b["term"] == "Guess"),
    O("substitution", lambda b: b["type"] == "definition" and b["term"] == "Inductive assumption"),
    O("substitution", lambda b: b["type"] == "definition" and b["term"] == "Substitute"),
    O("substitution", lambda b: b["type"] == "definition" and b["term"] == "Prove"),
    O("substitution", lambda b: b["type"] == "example"),
    O("substitution", lambda b: b["type"] == "prose" and "stuck on" in b["md"]),
    WHEN("**Use the tree** to discover the answer. **Use substitution** when a question says 'prove' or 'show', or to double-check a guess. **Use the master method** (next chapter) when the recurrence has the shape aT(n/b) + f(n) and you just need the answer fast."),
    O("substitution", lambda b: b["type"] == "check"),
  ]},
  {"id": "hw", "heading": "HW 6, solved in full", "blocks": [
    P("Cover the answer, try it, then compare. This is the shape of the midterm's recurrence-tree question."),
    O("hw", lambda b: b["type"] == "example" and "HW 6" in b["title"]),
    C("Explain in one sentence why every level of merge sort's tree costs the same.", "The number of nodes doubles each level while the work per node halves, and 2ⁱ · (kn/2ⁱ) = kn."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Recurrence", "a cost written in terms of the same cost on smaller inputs, plus a base case"],
      ["Base case", "the input small enough to cost a fixed amount, like T(1) = 1"],
      ["Unrolling", "plugging the recurrence into itself until you hit the base case"],
      ["Recursion tree", "one box per call, the call's own work inside; total = sum of the rows"],
      ["Level i", "the row i steps below the root: aⁱ calls of size n/bⁱ"],
      ["Depth", "number of rows: log_b n + 1 when the size shrinks by b each level"],
      ["Substitution", "guess the answer, then prove it by induction"],
    ]),
  ]},
 ],
}

olds = {e["id"]: e for e in old_exercises(SLUG)}
g["exercises"] = [
  MC("rec-read", "Read it out loud", "What does T(n) = 3T(n/4) + n² say?", ["Three steps, then n/4 calls, then n² more", "Each call makes 3 recursive calls on n/4 items and does n² work itself", "The answer is 3n/4 + n²", "It makes 4 calls on n/3 items"], 1,
     ["The order is: number of calls, size of each, own work.", "Right: a = 3 calls, each of size n/4, plus n² of its own work.", "A recurrence isn't the answer; it's the rule for one call.", "That swaps a and b."],
     ["The number in front of T is how many calls.", "The fraction inside T is the size of each call.", "The added term is the call's own work."], "Reading the three parts correctly is the first line of every master-method and tree answer.", ref="read"),
  FILL("rec-unroll", "Unroll it", "With T(1) = 1 and T(n) = 2T(n/2) + n, what is T(4)?", ["12"],
     ["Compute T(2) first.", "T(2) = 2·T(1) + 2 = 4.", "T(4) = 2·T(2) + 4."], ["T(2) = 2·1 + 2 = 4.", "T(4) = 2·4 + 4 = 12.", "Check: n log₂ n + n = 4·2 + 4 = 12."], "Unrolling small cases is the fastest way to sanity-check any formula you derive.", ref="unroll"),
  FILL("rec-rows", "Count the rows", "Merge sort on n = 64: how many rows does the recursion tree have (including the leaf row)?", ["7"],
     ["Sizes: 64, 32, 16, 8, 4, 2, 1.", "Count them.", "log₂ 64 + 1."], ["Sizes halve from 64 to 1: 64, 32, 16, 8, 4, 2, 1.", "That's 7 rows.", "= log₂ 64 + 1 = 6 + 1."], "The '+ 1' is the leaf row; in Big-O it disappears, but on a tree-table question it counts.", ref="tree"),
  MC("rec-leveli", "Level i's total", "For T(n) = 4T(n/2) + n, what is the total work on level i?", ["n", "4ⁱ · n", "2ⁱ · n", "n / 2ⁱ"], 2,
     ["That's merge sort's; here there are 4 calls per node, not 2.", "Don't forget each call's size shrinks too.", "Right: 4ⁱ nodes × n/2ⁱ each = (4/2)ⁱ n = 2ⁱ n. The rows double.", "That's the size of ONE node, not the row total."],
     ["Nodes on level i: 4ⁱ.", "Size of each: n/2ⁱ, and f(size) = size.", "Multiply: 4ⁱ · n/2ⁱ = 2ⁱ n."], "Rows that grow means the leaves dominate: this recurrence is Θ(n²). The next chapter gets there in one line.", ref="tree"),
  FILL("rec-level2", "Rows that grow", "For T(n) = 3T(n/2) + kn, the level-2 row costs how many times kn? (Give a decimal.)", ["2.25", "9/4"],
     ["Level 2 has 3² = 9 nodes.", "Each has size n/4, so work k·n/4.", "9 · kn/4 = (9/4) kn."], ["Nodes: 9.", "Work each: kn/4.", "Row: 9kn/4 = 2.25 kn."], "(3/2)ⁱ growth per row is why this recurrence ends up Θ(n^(log₂ 3)) ≈ n^1.58: Karatsuba's fast multiplication.", ref="tree"),
  MC("rec-subst", "The leftover", "In the substitution proof for T(n) = 2T(n/2) + kn, you reach T(n) ≤ c·n log n − cn + kn. What makes the proof work?", ["Nothing; the proof fails", "Choosing c ≥ k, so −cn + kn ≤ 0", "Choosing c = 0", "Dropping the kn because it's lower order"], 1,
     ["It works for the right c.", "Right: then the leftover is never positive, and T(n) ≤ c·n log n.", "c = 0 would claim T(n) ≤ 0.", "In a proof you can't just drop terms; you have to show they're ≤ 0."],
     ["What's standing between you and c·n log n?", "The leftover −cn + kn.", "It's ≤ 0 exactly when c ≥ k."], "Substitution is the one method that gives a real proof; the leftover step is where marks are won or lost.", ref="substitution"),
  olds["write-recurrence"], olds["tree-table"],
]

build(g)
