from c146common import *
import fig6

FG = fig6.figures7()
SLUG = "6-recurrences"
O = lambda sid, pred: old_block(SLUG, sid, pred)

CANON = O("master", lambda b: b["type"] == "stepper")

g = {
 "id": "cs146/7-master-method",
 "course": "cs146",
 "lessons": "Lecture 7",
 "title": "The master method: solve a recurrence in five moves",
 "summary": "Match T(n) = aT(n/b) + f(n), compute the watershed n^(log_b a), compare it with f(n), read off the case and the Θ answer, and recognize the recurrences where the master method does not apply (including Case 3's regularity check).",
 "estimatedMinutes": 60,
 "sourceNote": "Lecture 7 'Recurrences: Master Method' (Sep 14) slides, HW 7, CLRS 4.5. The case table is given on the midterm and final. Real-world notes are general industry practice.",
 "requires": ["cs146/6-recurrences"],
 "sections": [
  {"id": "map", "heading": "The big picture: a shortcut for the tree", "blocks": [
    P("Last chapter you solved recurrences by drawing a tree and adding rows. That works, but it takes a page. For the most common shape, T(n) = aT(n/b) + f(n), someone drew the tree once in general and wrote down the answer as **three cases**. The master method is looking up your recurrence in that table.", slide="What this chapter answers"),
    DG("roadmap", {"eyebrow": "The shortcut", "question": "Solve T(n) = aT(n/b) + f(n) in **five moves**", "steps": [
        {"title": "Match the shape", "sub": "read off a, b, f(n)", "result": "a, b, f(n)"},
        {"title": "Watershed", "sub": "the leaves' total work", "result": "n^(log_b a)", "tone": "amber"},
        {"title": "Compare", "sub": "f(n) vs the watershed", "result": "<  =  >", "tone": "brand"},
        {"title": "Answer", "sub": "one of three cases", "result": "Θ(…)", "tone": "green"},
        {"title": "Limits", "sub": "when it doesn't apply", "result": "say so", "tone": "red"}]},
       "Five moves, every time. Poon gives you the case table on the midterm and final; what he grades is doing these moves and justifying the case.", slide="Five moves"),
    WHY("**Why learn a shortcut?** Speed and certainty. In an exam, an interview, or a design meeting, you want 'this is n log n' in ten seconds, not ten minutes. Poon's last slide adds a bonus: the case tells you **where the time goes**, which tells you what to optimize."),
  ]},
  {"id": "shape", "heading": "Move 1: match the shape", "blocks": [
    D("Master method shape", "T(n) = **a**·T(n/**b**) + **f(n)**, where a ≥ 1 and b > 1 are **constants** and f(n) is positive. a = number of calls, n/b = size of each, f(n) = the work each call does outside its recursive calls (dividing and combining)."),
    DG("formula", {"parts": [{"text": "T(n) ="}, {"text": "a", "tone": "amber", "label": "how many calls"}, {"text": "T("}, {"text": "n/b", "tone": "green", "label": "size of each call"}, {"text": ") +"}, {"text": "f(n)", "tone": "brand", "label": "work outside the calls"}],
       "note": "Merge sort: a = 2, b = 2, f(n) = n. Binary search: a = 1, b = 2, f(n) = 1."},
       "The three things to read off. Write them down before anything else; Poon's answer key always starts with 'a = …, b = …, f(n) = …'.", slide="a, b, f(n)"),
    T(["Algorithm", "Recurrence", "a", "b", "f(n)"], [
      ["Binary search", "T(n/2) + 1", "1", "2", "1"],
      ["Merge sort", "2T(n/2) + n", "2", "2", "n"],
      ["Lecture 7, case 1", "4T(n/2) + n", "4", "2", "n"],
      ["Lecture 7, case 3", "4T(n/2) + n³", "4", "2", "n³"],
      ["HW 7 #3", "27T(n/3) + n³", "27", "3", "n³"],
    ], title="Reading a, b, f(n)", slide="Five examples"),
    C("Read a, b and f(n) from T(n) = 16T(n/4) + n².", "a = 16 calls, each of size n/4 so b = 4, and f(n) = n²."),
  ]},
  {"id": "watershed", "heading": "Move 2: the watershed n^(log_b a) is the leaves' work", "blocks": [
    D("Watershed function", "n^(log_b a). It equals the **number of leaves** in the recursion tree, so it measures the total work done at the bottom. CLRS (and Poon) call it the watershed: the dividing line f(n) is compared against."),
    F(FG["leaves"], "Where the formula comes from. Each level multiplies the number of calls by a; the tree is log_b n levels deep; so the bottom row has a^(log_b n) leaves, which is the same number as n^(log_b a). (Lecture 7 slide 21.)", slide="Counting the leaves"),
    T(["a, b", "log_b a", "Watershed"], [
      ["a = 1, b = 2", "0", "n⁰ = 1"],
      ["a = 2, b = 2", "1", "n"],
      ["a = 4, b = 2", "2", "n²"],
      ["a = 8, b = 2", "3", "n³"],
      ["a = 9, b = 3", "2", "n²"],
      ["a = 2, b = 4", "½", "√n"],
      ["a = 7, b = 2", "≈ 2.81", "n^2.81"],
    ], title="Watersheds you'll see (log_b a = 'b to what power gives a?')", slide="Computing log_b a"),
    THINK("**Computing log_b a without a calculator:** ask 'b to what power is a?' 2 to what is 8? 3. So log₂ 8 = 3 and the watershed is n³. When it's not a whole number (log₂ 7), you only need to know whether it's bigger or smaller than f's exponent: 2² = 4 < 7 < 8 = 2³, so log₂ 7 is between 2 and 3."),
    C("What's the watershed for T(n) = 2T(n/4) + f(n)?", "log₄ 2 = ½ (4^½ = 2), so the watershed is n^½ = √n."),
  ]},
  {"id": "master", "heading": "Moves 3 and 4: compare, then read off the case", "blocks": [
    DG("cards", {"cards": [
        {"title": "Case 1", "badge": "leaves heavier", "tone": "amber", "viz": [1, 3], "lines": ["Θ(n^(log_b a))", "4T(n/2) + n: n vs n²"]},
        {"title": "Case 2", "badge": "balanced", "tone": "green", "viz": [2, 2], "lines": ["Θ(n^(log_b a) · log n)", "2T(n/2) + n: n vs n"]},
        {"title": "Case 3", "badge": "root heavier", "tone": "brand", "viz": [3, 1], "lines": ["Θ(f(n))", "4T(n/2) + n³: n³ vs n²"]}],
       "note": "Top bar: the root's work f(n). Bottom bar: the leaves' work n^(log_b a). Whoever is polynomially bigger wins; a tie picks up a log n."},
       "The whole method is a tug-of-war between the root and the leaves.", slide="Root vs leaves"),
    O("master", lambda b: b["type"] == "table"),
    F(FG["flow"], "The decision, as a flowchart. Always check the shape first; always check regularity if you land in Case 3.", slide="The decision"),
    O("master", lambda b: b["type"] == "prose" and "Polynomially smaller" in b["md"]),
    F(FG["ruler"], "'Polynomially' means the EXPONENTS differ by a fixed amount ε > 0. A log factor changes the formula but not the exponent, so it never counts as a gap.", slide="Exponents, not formulas"),
    CANON,
    SIM("rectree", "Set the dials to each canonical example: (4, 2, n), (4, 2, n²), (4, 2, n³). The bars grow, stay flat, then shrink, and the panel names the case. Then try merge sort (2, 2, n) and binary search (1, 2, 1).", {"a": 4, "b": 2, "k": 1, "n": 64}),
    THINK("**The answer in each case is 'whoever wins'.** Case 1: the leaves win, answer = the watershed. Case 3: the root wins, answer = f(n). Case 2: a tie, so every one of the log n levels contributes equally: watershed × log n. You never need to memorize the answers separately from that picture."),
    O("master", lambda b: b["type"] == "prose" and b["md"].startswith("- Match the shape")),
    PY("Your turn: a master-method checker", "Write `case(a, b, k)` for T(n) = a·T(n/b) + n^k. Return 1, 2 or 3. Compare k with the watershed exponent `math.log(a, b)`; treat them as equal when they're within 1e-9 (floating point).",
       '''
import math

def case(a, b, k):
    w = math.log(a, b)      # the watershed exponent, log_b a
    # compare k with w: smaller -> 1, equal (within 1e-9) -> 2, bigger -> 3
    return 0

for a, b, k, name in [(1, 2, 0, "binary search"), (2, 2, 1, "merge sort"), (4, 2, 1, "4T(n/2)+n"),
                      (4, 2, 3, "4T(n/2)+n^3"), (7, 2, 3, "7T(n/2)+n^3"), (2, 4, 0.5, "2T(n/4)+sqrt n")]:
    print(f"{name:15} watershed n^{math.log(a, b):.2f}  ->  case {case(a, b, k)}")
''',
       check='''
assert case(2, 2, 1) == 2, "Merge sort: watershed n¹, f = n¹, equal → case 2."
assert case(1, 2, 0) == 2, "Binary search: watershed n⁰ = 1, f = 1 → case 2 (Θ(log n))."
assert case(4, 2, 1) == 1, "4T(n/2) + n: watershed n², f = n is smaller → case 1."
assert case(4, 2, 3) == 3, "4T(n/2) + n³: watershed n², f = n³ is bigger → case 3."
assert case(8, 2, 2) == 1, "8T(n/2) + n²: watershed n³ → case 1."
assert case(27, 3, 3) == 2, "27T(n/3) + n³: log₃ 27 = 3, equal to k → case 2."
assert case(125, 5, 3) == 2, "125T(n/5) + n³: log₅ 125 = 3, but math.log(125, 5) gives 3.0000000000000004. Compare with a tolerance of 1e-9."
assert case(2, 4, 0.5) == 2, "2T(n/4) + √n: log₄ 2 = 0.5 → case 2."
''',
       solution='''
import math

def case(a, b, k):
    w = math.log(a, b)
    if abs(k - w) < 1e-9:
        return 2
    return 1 if k < w else 3

for a, b, k, name in [(1, 2, 0, "binary search"), (2, 2, 1, "merge sort"), (4, 2, 1, "4T(n/2)+n"),
                      (4, 2, 3, "4T(n/2)+n^3"), (7, 2, 3, "7T(n/2)+n^3"), (2, 4, 0.5, "2T(n/4)+sqrt n")]:
    print(f"{name:15} watershed n^{math.log(a, b):.2f}  ->  case {case(a, b, k)}")
''',
       hints=["First: `if abs(k - w) < 1e-9: return 2`.", "Otherwise the smaller exponent loses: `return 1 if k < w else 3`.", "math.log(125, 5) comes out as 3.0000000000000004, not 3: that is why the tolerance matters."],
       success="For polynomial f(n) = n^k that's the whole decision. Case 3's regularity always holds for plain n^k, which is why it only bites on strange f(n)."),
    PY("See it: measure the exponent", "Proof that the cases are real: this computes T(n) directly for three recurrences and prints T(2n)/T(n). If T(n) grows like n^p, doubling n multiplies T by about 2^p. Watch case 1 approach 4 (n²), case 2 approach 2 (with a slow log drift), and case 3 approach 8 (n³).",
       '''
from functools import lru_cache

def make(a, b, k):
    @lru_cache(None)
    def T(n):
        if n <= 1:
            return 1
        return a * T(n // b) + n ** k
    return T

for a, b, k, label in [(4, 2, 1, "case 1: 4T(n/2)+n   expect n² → ratio 4"),
                       (2, 2, 1, "case 2: 2T(n/2)+n   expect n log n → ratio just over 2"),
                       (4, 2, 3, "case 3: 4T(n/2)+n³  expect n³ → ratio 8")]:
    T = make(a, b, k)
    ratios = [T(2 * n) / T(n) for n in (2 ** 10, 2 ** 14, 2 ** 18)]
    print(label)
    print("   T(2n)/T(n) at n = 2^10, 2^14, 2^18:", [round(r, 3) for r in ratios])
'''),
    O("master", lambda b: b["type"] == "definition" and b["term"] == "Master theorem"),
  ]},
  {"id": "limits", "heading": "Move 5: know when it does NOT apply", "blocks": [
    P("The theorem is silent outside its shape and its three cases. Poon grades 'does not apply, because …' as a full answer, so saying it (with the reason) is worth points, not a cop-out.", slide="When it's silent"),
    O("master", lambda b: b["type"] == "definition" and b["term"].startswith("a is not")),
    O("master", lambda b: b["type"] == "definition" and b["term"].startswith("The subproblem")),
    O("master", lambda b: b["type"] == "definition" and b["term"].startswith("The gap")),
    O("master", lambda b: b["type"] == "definition" and b["term"].startswith("Case 3 without")),
    O("master", lambda b: b.get("label") == "why" and "regularity" in b["md"]),
    E("Checking regularity (Lecture 7 slide 30)", "T(n) = 4T(n/2) + n³. Case 3 by exponents (n³ vs n²).\n\nRegularity asks: a·f(n/b) ≤ c·f(n) for some c < 1?\n\n  4·(n/2)³ = 4·n³/8 = n³/2 ≤ c·n³ with c = ½ < 1  ✓\n\nThe next level down does half the work: the root really dominates.", answer="Θ(n³)", slide="Regularity, worked"),
    TRAP("Writing an answer for T(n) = 2T(n/2) + n/log n or T(n) = T(n − 1) + 1 using a case. The first has only a log gap; the second doesn't divide n at all. Both: 'the master method does not apply', plus the reason.", "HW 7, Midterm", slide="The 'does not apply' trap"),
    C("Does the master method apply to T(n) = n·T(n/2) + n²? Why?", "No: a = n is not a constant."),
  ]},
  {"id": "hw", "heading": "HW 7, solved in full", "blocks": [
    P("These are the questions the midterm will look like. Cover each answer, do the five moves, then compare."),
    O("hw", lambda b: b["type"] == "example" and "8T(n/2)" in b["title"]),
    O("hw", lambda b: b["type"] == "example" and "7T(n/2)" in b["title"]),
    O("hw", lambda b: b["type"] == "example" and "27T(n/3)" in b["title"]),
    O("hw", lambda b: b["type"] == "example" and "log n" in b["title"]),
  ]},
  {"id": "practice", "heading": "Practice set", "blocks": [
    P("Say the case (or 'does not apply') and the answer. Use Test me on the right to check each one."),
  ] + [b for b in old_section(SLUG, "practice") if b["type"] == "check" and "merge sort's tree" not in b["prompt"]]},
  {"id": "pro", "heading": "Why engineers care: the case names the bottleneck", "blocks": [
    WORLD("**Poon's 'professional applications' slide, made concrete.** Big-number libraries (Python's own integers are one) multiply huge numbers with **Karatsuba**, T(n) = 3T(n/2) + n: Case 1, Θ(n^1.58), beating the schoolbook n². **Strassen's** matrix multiply is 7T(n/2) + n²: Case 1, Θ(n^2.81) instead of n³. The **FFT** behind audio and image processing is 2T(n/2) + n: Case 2, Θ(n log n). In each, cutting the number of recursive calls (a) was the whole breakthrough.", slide="Real recurrences"),
    WHEN("**Read the case as advice.** Case 1 (leaves win): the cost is in the sheer number of subproblems, so reduce a or split into smaller pieces; speeding up the combine step won't help. Case 3 (root wins): the combine step is the bottleneck, so make f(n) cheaper and leave the recursion alone. Case 2: both matter equally.", slide="The case is a diagnosis"),
    C("An algorithm is T(n) = 2T(n/2) + n². A teammate wants to cut it to 1 recursive call. Will that change the Big-O?", "Watershed n (a = 2) vs f = n²: Case 3, Θ(n²). The root's n² dominates, so changing a doesn't change the answer. Make the n² combine step faster instead."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Master method", "a table lookup for T(n) = aT(n/b) + f(n): three cases"],
      ["a, b, f(n)", "number of calls, shrink factor, own work per call"],
      ["Watershed", "n^(log_b a), the number of leaves = the leaves' total work"],
      ["Polynomially smaller/larger", "the exponents differ by a fixed ε > 0 (a log factor doesn't count)"],
      ["Case 1 / 2 / 3", "leaves win / tie (× log n) / root wins"],
      ["Regularity", "Case 3's check: a·f(n/b) ≤ c·f(n) with c < 1, so work really shrinks going down"],
    ]),
  ]},
 ],
}

olds = {e["id"]: e for e in old_exercises(SLUG)}
g["exercises"] = [
  FILL("ms-water", "The watershed", "T(n) = 9T(n/3) + n. What is log_b a? (the watershed's exponent)", ["2"],
     ["b = 3, a = 9.", "3 to what power is 9?", "3² = 9."], ["a = 9, b = 3.", "log₃ 9 = 2.", "Watershed n²."], "Computing log_b a fast is half the master method.", ref="watershed"),
  MC("ms-9n", "Which case: 9T(n/3) + n", "T(n) = 9T(n/3) + n.", ["Case 1, Θ(n²)", "Case 2, Θ(n log n)", "Case 3, Θ(n)", "Does not apply"], 0,
     ["Right: f = n¹ is polynomially smaller than n² (ε = 1). The leaves win.", "Case 2 needs f equal to the watershed n².", "Case 3 needs f bigger than n².", "It has the right shape with constants a = 9, b = 3."],
     ["Watershed: n^(log₃ 9) = n².", "Compare n with n²: exponent 1 vs 2.", "Smaller by ε = 1: Case 1, answer = watershed."], "This is CLRS's first master-method example.", ref="master"),
  MC("ms-3n2", "Which case: 3T(n/4) + n²", "T(n) = 3T(n/4) + n².", ["Case 1, Θ(n^0.79)", "Case 2, Θ(n² log n)", "Case 3, Θ(n²)", "Does not apply"], 2,
     ["n² is bigger than the watershed, not smaller.", "The watershed is n^(log₄ 3) ≈ n^0.79, not n².", "Right: n² beats n^0.79 by ε ≈ 1.2, and regularity holds: 3(n/4)² = (3/16)n² ≤ c·n² with c = 3/16.", "Shape and constants are fine."],
     ["log₄ 3: 4^0.79 ≈ 3.", "n² vs n^0.79: f is bigger.", "Check regularity: 3·(n/4)² = 3n²/16."], "Case 3 means the root's combine step is the bottleneck.", ref="master"),
  MC("ms-nlog", "Log gap", "T(n) = 2T(n/2) + n / log n.", ["Case 1, Θ(n)", "Case 2, Θ(n log n)", "Case 3", "Does not apply"], 3,
     ["n/log n is smaller than n, but only by a log factor: not polynomially.", "It's not equal to n either.", "f is smaller, not bigger.", "Right: the gap is a log, not n^ε, so it falls between the cases."],
     ["Watershed: n.", "f = n/log n: same exponent 1.", "No ε > 0 gap → does not apply."], "Poon's slide 28 example. Saying 'does not apply, because the gap is only a log factor' is the full-credit answer.", ref="limits"),
  MC("ms-sub1", "Subtract, not divide", "T(n) = T(n − 1) + 1.", ["Case 2, Θ(log n)", "Case 1, Θ(n)", "Does not apply: the subproblem is n − 1, not n/b", "Case 3, Θ(1)"], 2,
     ["It never divides n.", "The answer IS Θ(n), but not from the master method.", "Right. (Unroll it: n steps, Θ(n). It's a loop in disguise.)", "The master method needs n/b."],
     ["Is the subproblem size n/b for a constant b > 1?", "No, it's n − 1.", "So the theorem is silent; unroll instead."], "Recursion that shrinks by 1 (like a linked-list walk) is linear; the master method is only for shrinking by a factor.", ref="limits"),
  FILL("ms-4n2", "Case 2 answer", "T(n) = 4T(n/2) + n². Give the Θ answer, like n^2 log n.", ["n^2 log n", "n² log n", "Θ(n^2 log n)", "Θ(n² log n)", "n^2logn", "n^2 * log n"],
     ["Watershed: n^(log₂ 4).", "log₂ 4 = 2: watershed n². f = n²: equal.", "Case 2: watershed × log n."], ["a = 4, b = 2, f = n².", "Watershed n², equal to f: Case 2.", "Θ(n² log n)."], "Lecture 7's case 2 example.", ref="master"),
  MC("ms-bottleneck", "Read the case as advice", "Your algorithm is Case 1 of the master method. Where should you spend optimization effort?", ["Making the divide/combine step f(n) faster", "Reducing the number of subproblems a (or shrinking them faster)", "Nowhere; Case 1 is optimal", "Adding a base case"], 1,
     ["In Case 1 the leaves dominate; f(n) barely matters.", "Right: the leaf count n^(log_b a) is the cost, so reduce a or raise b. That's exactly Karatsuba's and Strassen's trick.", "Case 1 just says where the time goes.", "It already has one."],
     ["Case 1: who wins the tug-of-war?", "The leaves.", "The number of leaves depends on a and b."], "Poon's slide 36: the case tells you where the bottleneck is.", ref="pro"),
  olds["master-mix"],
]

build(g)
