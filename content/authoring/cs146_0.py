from c146common import *

SLUG = "0-notation"
OG = old_guide(SLUG)

def sec(sid):
    return old_section(SLUG, sid)

def swap(blocks, pred, new):
    out = []
    for b in blocks:
        if pred(b):
            if new is not None:
                out.extend(new if isinstance(new, list) else [new])
        else:
            out.append(b)
    return out

halve = [aframe(list(range(1, 17)), "Start with n = 16 items. How many times can you cut it in half before one is left?", note="16 left")]
lo, hi, k = 0, 15, 0
while hi > lo:
    k += 1
    hi = lo + (hi - lo + 1) // 2 - 1
    left = hi - lo + 1
    halve.append(aframe(list(range(1, 17)), f"Halving #{k}: keep half, throw half away. {left} left." + (" Done: one item. That took 4 halvings, so log₂ 16 = 4." if left == 1 else ""), dim=[i for i in range(16) if i > hi], done=[0] if left == 1 else None, note=f"{left} left after {k} halving{'s' if k > 1 else ''}"))

why = sec("why")
why = swap(why, lambda b: b["type"] == "definition", None)
why = swap(why, lambda b: b["type"] == "prose" and b["md"].startswith("- **n**"), DG("roadmap", {
    "eyebrow": "The language of CS 146", "question": "Eight symbols, each with a **for-loop** behind it",
    "steps": [
        {"title": "n", "sub": "the size of the input", "result": "n = 8"},
        {"title": "2ⁿ, n², 2ⁱ", "sub": "exponents: repeated multiplication", "result": "2⁵ = 32", "tone": "brand"},
        {"title": "log n", "sub": "how many times you can halve n", "result": "log₂ 16 = 4", "tone": "green"},
        {"title": "Σ", "sub": "a for-loop that adds", "result": "1+…+n", "tone": "amber"},
        {"title": "n^(log_b a)", "sub": "an exponent that happens to be a log", "result": "n^(log₂ 8) = n³", "tone": "brand"},
        {"title": "T(n)", "sub": "a function that returns 'how many steps'", "result": "T(8)"},
        {"title": "O(g(n))", "sub": "grows no faster than g", "result": "O(n²)", "tone": "green"},
        {"title": "Induction", "sub": "prove it for every n", "result": "n → n + 1", "tone": "amber"}]},
    "Every lecture after this one is written in these eight symbols. One section each, in this order.", slide="The eight symbols"))

exps = swap(sec("exponents"), lambda b: b["type"] == "figure", DG("levels", {"rows": [
    {"label": "2⁰ = 1", "parts": [16], "partLabel": "", "total": "1 piece"},
    {"label": "2¹ = 2", "parts": [8] * 2, "partLabel": "", "total": "2 pieces"},
    {"label": "2² = 4", "parts": [4] * 4, "partLabel": "", "total": "4 pieces"},
    {"label": "2³ = 8", "parts": [2] * 8, "partLabel": "", "total": "8 pieces"},
    {"label": "2⁴ = 16", "parts": [1] * 16, "partLabel": "", "total": "16 pieces", "tone": "green"}],
    "summary": "Split every piece in two, i times → **2ⁱ** pieces", "detail": "merge sort's recursion tree is exactly this picture"},
    "Each row doubles the row above: row i has 2ⁱ pieces.", slide="Doubling makes powers of 2"))

logs = swap(sec("log"), lambda b: b["type"] == "stepper", ST("Halving 16 down to 1", halve))
logs.insert(1, WORLD("**log n is why big systems stay fast.** A sorted list of a billion usernames needs only about 30 checks to find one (binary search). Database indexes, 'git bisect', and every balanced tree you'll meet later in CS 146 are built on this halving."))

sums = swap(sec("sum"), lambda b: b["type"] == "figure", DG("levels", {"rows": [
    {"label": f"i = {k}", "parts": [k, 6 - k], "ghostFrom": 1, "partLabel": "", "total": f"+ {k}", "tone": "brand"} for k in range(1, 6)],
    "summary": "1 + 2 + 3 + 4 + 5 = 15 = 5 · 6 / 2", "detail": "the staircase is half of a 5 × 6 rectangle: 1 + 2 + … + n = n(n + 1)/2"},
    "The sum as a staircase: row i is i blocks long. Flip a copy into the empty part and together they fill a 5 × 6 rectangle, so one staircase is half of it.", slide="Why n(n+1)/2"))

bigo = sec("bigo")
figs = [b for b in bigo if b["type"] == "figure"]
bigo = swap(bigo, lambda b: b["type"] == "figure" and "six shapes" in b["caption"], SIM("growth", "Race the six shapes: drag the plot's right edge, then slide the input size to a million and read the real time for each shape.", {"xmax": 12, "n": 1000000}))
bigo = swap(bigo, lambda b: b["type"] == "figure", DG("bigo", {"fa": 5, "fb": 10, "c": 6, "n0": 10, "xmax": 16, "summary": "Left of n₀: no promises. Right of n₀: f(n) ≤ c·g(n) forever. That's all **f(n) = O(g(n))** says."},
    "The definition as one picture: past the point n₀, the algorithm's cost f(n) never rises above c times g(n) again.", slide="The definition as a picture"))

g = dict(OG)
g = clean(g)
g["sections"] = [
    {"id": "why", "heading": OG["sections"][0]["heading"], "blocks": why},
] + [
    {"id": s["id"], "heading": clean(s["heading"]), "blocks": {"exponents": exps, "log": logs, "sum": sums, "bigo": bigo}.get(s["id"], sec(s["id"]))}
    for s in OG["sections"][1:]
]
for s in g["sections"]:
    for b in s["blocks"]:
        b.pop("id", None)
terms = {b["term"] for s in g["sections"] for b in s["blocks"] if b["type"] == "definition"}
for s in g["sections"]:
    for b in s["blocks"]:
        if "related" in b:
            b["related"] = [r for r in b["related"] if r in terms]
            if not b["related"]:
                b.pop("related")
g["exercises"] = old_exercises(SLUG)
build(g)
