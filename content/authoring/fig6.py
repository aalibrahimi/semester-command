"""Figures for CS 146 chapter 6 (recurrences: reading, unrolling, recursion
tree, substitution) and chapter 7 (master method). 480 units wide."""
import math
from figs146 import *
from fig2 import path_map

W = 480


# ── Chapter 6 ────────────────────────────────────────────────────────────

def map6():
    return path_map("How long does a recursive function take?", [
        ("Read T(n)", "a sentence about ONE call", "2T(n/2) + kn", "plain"),
        ("Unroll it", "plug in n = 8 by hand", "T(8) = 24k + 8", "amber"),
        ("Recursion tree", "add up the work row by row", "kn × log n", "brand"),
        ("Substitution", "prove the guess by induction", "c ≥ k", "green"),
        ("Next chapter", "the master method shortcut", "3 cases", "plain"),
    ])


def anatomy(generic=False):
    """T(n) = 2T(n/2) + kn with each part labeled, next to the code it came from."""
    s = ""
    if generic:
        parts = [("T(n) = ", INK, None), ("a", AMBERF, "a: how many recursive calls"), ("T(n/", INK, None), ("b", GREENF, "n/b: the size of each call"), (")  +  ", INK, None), ("f(n)", BRANDF, "f(n): the work done in THIS call, outside the recursion")]
    else:
        parts = [("T(n) = ", INK, None), ("2", AMBERF, "2: how many recursive calls"), ("T(n/", INK, None), ("2", GREENF, "n/2: the size of each call"), (")  +  ", INK, None), ("kn", BRANDF, "kn: the merge, the work done in THIS call")]
    cw = 22 * 1.15 * 0.6
    x, y = 30, 50
    centers = []
    for txt, col, _ in parts:
        s += T(x, y, txt.replace(")  +  ", ") + "), 22, col, weight=700, mono=True)
        n = len(txt.replace(")  +  ", ") + "))
        if col != INK:
            centers.append(x + n * cw / 2)
        x += n * cw
    labs = [("how many calls", AMBER, AMBERF, "a" if generic else "2"), ("size of each call", GREEN, GREENF, "n/b" if generic else "n/2"), ("work in THIS call", BRAND, BRANDF, "f(n)" if generic else "kn")]
    for i, (lab, c, cf, sym) in enumerate(labs):
        lx = centers[i]
        ty = 92 + i * 30
        s += g(f"{sym}: {lab}.", line(lx, 58, lx, ty - 13, c, 1.6) + f"<circle cx='{f(lx)}' cy='58' r='3' fill='{c}'/>" + T(lx, ty, lab, 12.5, cf, "middle", 700))
    if not generic:
        code = [("mergeSort(a):", None), ("  if n == 1: return      ", "T(1) = 1"), ("  mergeSort(left half)   ", "T(n/2)"), ("  mergeSort(right half)  ", "T(n/2)"), ("  merge(left, right)     ", "kn")]
        s += box(10, 184, 460, 148, "", tone="plain")
        for i, (c, k) in enumerate(code):
            yy = 210 + i * 25
            s += T(24, yy, c, 12.5, INK, mono=True)
            if k:
                col = GREENF if "n/2" in k else (BRANDF if k == "kn" else MUTE)
                s += g(f"This line costs {k}.", T(456, yy, k, 12.5, col, "end", 700, mono=True))
        s += T(240, 352, "Two half-size calls plus the merge: the whole recurrence.", 12, INK, "middle", 600)
        return fig(s, W, 362)
    s += T(240, 196, "Merge sort: a = 2, b = 2, f(n) = n.   Binary search: a = 1, b = 2, f(n) = 1.", 11.5, MUTE, "middle")
    return fig(s, W, 206)


def tree_levels():
    """Merge sort's recursion tree with the work in each node and each row's total."""
    s = T(10, 18, "Write each call's own work, then add each ROW.", 13, INK, weight=700)
    rows = [(1, "kn"), (2, "kn/2"), (4, "kn/4"), (8, "kn/8")]
    CX, width = 225, 310
    for lvl, (cnt, lab) in enumerate(rows):
        y = 40 + lvl * 62
        inner = T(10, y + 20, f"level {lvl}", 11, MUTE, mono=True)
        bw = min(84, width / cnt - 6)
        for j in range(cnt):
            x = CX - width / 2 + width * (j + 0.5) / cnt
            if lvl > 0:
                px = CX - width / 2 + width * (j // 2 + 0.5) / (cnt // 2)
                inner += line(px, y - 30, x, y, "rgb(var(--foreground) / 0.3)", 1)
            inner += box(x - bw / 2, y, bw, 30, lab if cnt <= 4 else "", tone="brand" if lvl < 3 else "green", size=11.5 if cnt <= 2 else 10.5, mono=True, r=6)
        inner += T(470, y + 20, "= kn", 14, BRANDF if lvl < 3 else GREENF, "end", 700, mono=True)
        how = ["1 call × kn", "2 calls × kn/2", "4 calls × kn/4", "8 calls × kn/8"][lvl]
        s += g(f"Level {lvl}: {how} = kn.", inner + T(470, y + 36, how, 10.5, MUTE, "end"))
    s += g("The number of calls doubles while each call's work halves, so every row costs kn.",
           T(10, 300, "calls double, work per call halves → every row costs kn", 12, INK, weight=600))
    s += g("Rows: sizes n, n/2, …, 1 → log₂ n + 1 rows. Total = kn(log n + 1) = O(n log n).",
           box(10, 312, 460, 50, "", tone="brand", r=10) +
           T(240, 334, "log₂ n + 1 rows × kn per row", 13, BRANDF, "middle", 700) +
           T(240, 353, "= kn log n + kn = O(n log n)", 13, INK, "middle", 600, mono=True))
    return fig(s, W, 370)


def three_shapes():
    """Row cost by level for three recurrences: grow, equal, shrink."""
    s = ""
    panels = [
        ("3T(n/2) + kn", "rows GROW ×3/2", "the leaves win", [1, 1.5, 2.25, 3.4], "amber"),
        ("2T(n/2) + kn", "rows EQUAL", "every row counts", [1, 1, 1, 1], "green"),
        ("2T(n/3) + kn", "rows SHRINK ×2/3", "the root wins", [1, 0.67, 0.44, 0.3], "brand"),
    ]
    for i, (rec, what, who, vals, tone) in enumerate(panels):
        x = 6 + i * 158
        inner = box(x, 6, 150, 222, "", tone="plain")
        inner += T(x + 75, 30, rec, 12, INK, "middle", 700, mono=True)
        for k, v in enumerate(vals):
            bw = v / 3.4 * 120
            inner += bar(x + 75 - bw / 2, 48 + k * 30, bw, 22, tone) + T(x + 10, 64 + k * 30, str(k), 10, MUTE, mono=True)
        inner += T(x + 75, 186, what, 12, TONE[tone][2], "middle", 700) + T(x + 75, 206, who, 12, INK, "middle")
        s += g(f"{rec}: {what}, so {who}.", inner)
    s += T(10, 250, "Each bar is one row's total work (top = root, bottom = deeper).", 12, MUTE)
    s += T(10, 268, "This picture is the whole idea behind the master method.", 12, INK, weight=600)
    return fig(s, W, 276)


def substitution_flow():
    steps = [
        ("1 Guess", "T(n) ≤ c · n log n", "from the tree", "plain"),
        ("2 Assume", "T(n/2) ≤ c · (n/2) log(n/2)", "true for smaller inputs", "plain"),
        ("3 Substitute", "T(n) ≤ c·n log n − cn + kn", "plug in, simplify", "amber"),
        ("4 Prove", "−cn + kn ≤ 0  ⟺  c ≥ k", "pick c = k: done", "green"),
    ]
    s = T(10, 18, "Substitution = induction, in four boxes.", 14, INK, weight=700)
    for i, (a, b, c, tone) in enumerate(steps):
        y = 34 + i * 70
        inner = box(10, y, 460, 54, "", tone=tone, r=10) + T(24, y + 22, a, 13, INK if tone == "plain" else TONE[tone][2], weight=700) + T(24, y + 42, c, 11, MUTE)
        inner += T(456, y + 32, b, 13, INK, "end", 600, mono=True)
        if i < 3:
            inner += arrow(240, y + 55, 240, y + 68)
        s += g(f"Step {a}: {b} ({c}).", inner)
    s += T(240, 330, "The leftover −cn + kn is the only thing between you and the guess.", 11.5, MUTE, "middle")
    return fig(s, W, 340)


# ── Chapter 7 ────────────────────────────────────────────────────────────

def map7():
    return path_map("Solve a recurrence in five moves.", [
        ("Match the shape", "T(n) = aT(n/b) + f(n)", "a, b, f(n)", "plain"),
        ("Watershed", "the leaves' work", "n^(log_b a)", "amber"),
        ("Compare", "f(n) vs the watershed", "<  =  >", "brand"),
        ("Answer", "one of three cases", "Θ(…)", "green"),
        ("Limits", "when it doesn't apply", "say so", "red"),
    ], "On the midterm and final, Poon gives you the case table.")


def leaves():
    s = T(10, 18, "Why n^(log_b a) = the work at the leaves", 14, INK, weight=700)
    # a = 3 tree, 3 levels
    CX, width = 240, 440
    lv = [1, 3, 9]
    for k, cnt in enumerate(lv):
        y = 44 + k * 58
        inner = ""
        for j in range(cnt):
            x = CX - width / 2 + width * (j + 0.5) / cnt
            if k:
                px = CX - width / 2 + width * (j // 3 + 0.5) / (cnt // 3)
                inner += line(px, y - 30, x, y - 12, "rgb(var(--foreground) / 0.3)", 1)
            inner += node(x, y, ["n", "n/b", "·"][k], "brand" if k < 2 else "green", r=13 if k < 2 else 10, size=11 if k < 2 else 9)
        inner += T(10, y + 4, f"{['1', 'a', 'a²'][k]}", 12, MUTE, weight=700)
        s += g(["The root: 1 call of size n.", "Level 1: a calls, each of size n/b (here a = 3).", "Level 2: a² calls of size n/b². Keep going until size 1."][k], inner)
    s += T(240, 186, "⋮", 16, MUTE, "middle")
    s += g("The tree stops when n/bᵏ = 1, so its depth is k = log_b n.",
           box(10, 200, 460, 34, "", tone="plain", r=8) + T(240, 222, "stop when n / bᵏ = 1  →  depth k = log_b n", 12.5, INK, "middle", 600, mono=True))
    s += g("Leaves = a^(depth) = a^(log_b n), and by a log rule that equals n^(log_b a). Each leaf does O(1) work.",
           box(10, 244, 460, 56, "", tone="green", r=10) + T(240, 266, "leaves = a^(log_b n) = n^(log_b a)", 14, GREENF, "middle", 700, mono=True) +
           T(240, 288, "each leaf costs O(1), so leaf work ≈ n^(log_b a)", 12, INK, "middle"))
    s += T(240, 322, "Merge sort: a = 2, b = 2 → n^(log₂ 2) = n leaves.", 12, MUTE, "middle")
    return fig(s, W, 332)


def seesaw():
    s = T(10, 18, "The master method is a tug-of-war.", 14, INK, weight=700)
    s += T(10, 38, "root work f(n)  vs  leaf work n^(log_b a)", 12, MUTE, mono=True)
    cases = [
        ("Case 1", "leaves heavier", "Θ(n^(log_b a))", "4T(n/2) + n: n vs n²", 0.35, 1.0, "amber"),
        ("Case 2", "balanced", "Θ(n^(log_b a) · log n)", "2T(n/2) + n: n vs n", 0.7, 0.7, "green"),
        ("Case 3", "root heavier", "Θ(f(n))", "4T(n/2) + n³: n³ vs n²", 1.0, 0.35, "brand"),
    ]
    for i, (name, what, ans, ex, fw, lw, tone) in enumerate(cases):
        y = 56 + i * 94
        inner = box(10, y, 460, 84, "", tone="plain", r=10)
        inner += T(24, y + 22, name, 13.5, TONE[tone][2], weight=700) + T(92, y + 22, what, 13, INK, weight=600)
        inner += T(456, y + 22, ans, 12.5, TONE[tone][2], "end", 700, mono=True)
        inner += T(24, y + 46, "f(n)", 11, MUTE, mono=True) + bar(84, y + 36, fw * 200, 14, "brand")
        inner += T(24, y + 66, "leaves", 11, MUTE, mono=True) + bar(84, y + 56, lw * 200, 14, "amber")
        inner += T(456, y + 62, ex, 11, MUTE, "end", mono=True)
        s += g(f"{name}: {what}. Answer {ans}. Example {ex}.", inner)
    return fig(s, W, 342)


def flowchart():
    s = ""
    def q(y, text, tone="plain", h=40):
        return box(60, y, 360, h, "", tone=tone, r=10) + T(240, y + h / 2 + 5, text, 12.5, INK if tone == "plain" else TONE[tone][2], "middle", 700)
    s += g("First: is it the shape aT(n/b) + f(n) with a constant a ≥ 1 and a constant b > 1? If not, the master method is silent.",
           q(8, "Shape aT(n/b) + f(n)? a, b constants?") + arrow(420, 28, 446, 28) + T(452, 20, "no", 11, REDF, weight=700) + T(470, 36, "✗", 14, REDF, "end", 700))
    s += arrow(240, 48, 240, 66) + T(248, 62, "yes", 11, GREENF, weight=700)
    s += g("Compute the watershed n^(log_b a).", q(68, "Compute n^(log_b a)", "amber"))
    s += arrow(240, 108, 240, 126)
    s += g("Compare exponents of f(n) and the watershed.", q(128, "Compare f(n) with it", "brand"))
    cols = [(90, "smaller by ε", "Case 1", "Θ(n^(log_b a))", "amber"), (240, "same", "Case 2", "Θ(n^(log_b a) log n)", "green"), (390, "bigger by ε", "Case 3*", "Θ(f(n))", "brand")]
    for x, cond, name, ans, tone in cols:
        s += g(f"If f(n) is {cond} than the watershed: {name}, {ans}.",
               arrow(240, 168, x, 196) +
               box(x - 72, 198, 144, 70, "", tone=tone, r=10) + T(x, 216, "f " + cond, 10.5, MUTE, "middle") + T(x, 238, name, 13, TONE[tone][2], "middle", 700) + T(x, 258, ans, 9.5, INK, "middle", mono=True))
    s += g("Only a log factor apart (like n vs n/log n or n log n)? Not polynomial: the master method does not apply.",
           box(10, 282, 460, 40, "", tone="red", r=10) + T(240, 307, "only a log factor apart? → does NOT apply", 12.5, REDF, "middle", 700))
    s += T(10, 340, "* Case 3 also needs regularity: a·f(n/b) ≤ c·f(n) with c < 1.", 11.5, MUTE)
    return fig(s, W, 348)


def exponent_ruler():
    s = T(10, 18, "Compare EXPONENTS, not formulas.", 14, INK, weight=700)
    x0, x1, y = 40, 440, 90
    def X(e): return x0 + (e - 0) / 3 * (x1 - x0)
    s += line(x0, y, x1, y, AXIS, 1.6)
    for e in [0, 0.5, 1, 1.5, 2, 2.5, 3]:
        s += line(X(e), y - 5, X(e), y + 5, AXIS) + T(X(e), y + 22, f"n^{e:g}" if e not in (0, 1) else ("1" if e == 0 else "n"), 11, MUTE, "middle", mono=True)
    s += g("Watershed for 4T(n/2): n^(log₂ 4) = n².", line(X(2), y - 36, X(2), y + 6, AMBER, 2.4) + T(X(2), y - 42, "watershed n²", 12, AMBERF, "middle", 700))
    s += g("f(n) = n: exponent 1, a whole unit below 2 (ε = 1). Case 1.", f"<circle cx='{f(X(1))}' cy='{y}' r='7' fill='{BRAND}'/>" + T(X(1), y - 14, "f = n", 12, BRANDF, "middle", 700))
    s += g("f(n) = n³: exponent 3, a whole unit above 2 (ε = 1). Case 3.", f"<circle cx='{f(X(3))}' cy='{y}' r='7' fill='{BRAND}'/>" + T(X(3), y - 14, "f = n³", 12, BRANDF, "middle", 700))
    s += g("A log factor changes the formula but not the exponent: n²/log n sits right against n², with no fixed gap ε.",
           box(10, 136, 460, 64, "", tone="red", r=10) +
           T(24, 158, "n² / log n  or  n² log n:", 12.5, REDF, weight=700, mono=True) +
           T(24, 178, "same exponent 2, just nudged by a log. No gap ε > 0,", 12, INK) +
           T(24, 194, "so neither Case 1 nor Case 3: does not apply.", 12, INK))
    s += T(10, 222, "(n² log n is its own exception: the tree gives Θ(n² log² n).)", 11, MUTE)
    return fig(s, W, 230)


def figures6():
    return {"map": map6(), "anatomy": anatomy(), "tree": tree_levels(), "shapes": three_shapes(), "subst": substitution_flow()}


def figures7():
    return {"map": map7(), "anatomy": anatomy(generic=True), "leaves": leaves(), "seesaw": seesaw(), "flow": flowchart(), "ruler": exponent_ruler(), "shapes": three_shapes()}


def figures():
    d = {"6" + k: v for k, v in figures6().items()}
    d.update({"7" + k: v for k, v in figures7().items()})
    return d
