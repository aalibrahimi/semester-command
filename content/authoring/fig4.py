"""Figures for CS 146 chapter 4: Big-O in practice, divide and conquer, merge sort.
Drawn 480 units wide: the Read column is about that many pixels, so a font
size of 12 here is about 12px on screen."""
import math
from figs146 import *

W = 480


def chapter_map():
    steps = [
        ("Count steps", "not seconds", "T(n) = 2n + 3", "plain"),
        ("Keep the shape", "drop the details", "O(n)", "brand"),
        ("Halve it", "binary search", "O(log n)", "green"),
        ("Divide & conquer", "split, solve, combine", "a recipe", "amber"),
        ("Merge sort", "halve, then merge", "O(n log n)", "brand"),
    ]
    s = T(10, 20, "The question this chapter answers:", 12, MUTE)
    s += T(10, 40, "Is it fast, before you run it?", 15, INK, weight=700)
    y0, rh = 58, 52
    for i, (a, b, c, tone) in enumerate(steps):
        y = y0 + i * rh
        inner = num_badge(22, y + 20, i + 1)
        inner += box(42, y, 268, 40, "", tone=tone, r=9)
        inner += T(56, y + 18, a, 13, TONE[tone][2] if tone != "plain" else INK, weight=700) + T(56, y + 33, b, 10.5, MUTE)
        inner += T(470, y + 25, c, 13, INK, "end", 700, mono=True)
        if i < len(steps) - 1:
            inner += arrow(22, y + 32, 22, y + rh + 8)
        s += g(f"Step {i + 1}: {a} ({b}). Result: {c}.", inner)
    yb = y0 + 5 * rh + 6
    s += g("Where it pays off: sorting a million items takes about 20 million steps instead of a trillion.",
           box(10, yb, 460, 46, "", tone="green", r=10) +
           T(240, yb + 20, "1,000,000 items: merge sort ≈ 20 million steps,", 12, GREENF, "middle", 700) +
           T(240, yb + 37, "insertion sort ≈ 1 trillion steps", 12, GREENF, "middle", 700))
    return fig(s, W, yb + 54)


def counting():
    code = [("int sum = 0;", "1"), ("for (i = 0; i < n; i++)", "n + 1"), ("    sum += a[i];", "n"), ("return sum;", "1")]
    s = box(10, 8, 460, 164, "", tone="plain")
    s += T(24, 30, "code", 11, MUTE) + T(456, 30, "runs this many times", 11, MUTE, "end")
    for i, (c, k) in enumerate(code):
        y = 56 + i * 24
        s += g(f"'{c.strip()}' runs {k} times.", T(24, y, c, 13, INK, mono=True) + T(456, y, k, 13, BRANDF, "end", 700, mono=True))
    s += g("Add the counts: 1 + (n + 1) + n + 1 = 2n + 3.",
           line(24, 140, 456, 140, AXIS) + T(24, 162, "add them up", 12, MUTE) + T(456, 162, "T(n) = 2n + 3", 15, BRANDF, "end", 700, mono=True))
    x0, y0 = 50, 360
    s += plot_axes(x0, y0, 400, 150, "", "steps")
    ns = [2, 4, 8, 16]
    mx = 2 * 16 + 3
    bars = ""
    for i, n in enumerate(ns):
        h = (2 * n + 3) / mx * 140
        bx = x0 + 30 + i * 92
        bars += bar(bx, y0 - h, 52, h, "brand") + T(bx + 26, y0 - h - 6, str(2 * n + 3), 13, BRANDF, "middle", 700, mono=True) + T(bx + 26, y0 + 17, f"n = {n}", 12, MUTE, "middle", mono=True)
    s += g("Double n and the step count about doubles. That is what 'linear' means.", bars)
    s += T(240, y0 + 40, "double n → about double the steps: linear", 12, INK, "middle", 600)
    return fig(s, W, y0 + 50)


def bigo_def():
    x0, y0, w, h = 44, 250, 410, 220
    xmax, ymax = 16, 100
    s = plot_axes(x0, y0, w, h, "", "steps") + T(x0 + w, y0 + 34, "n (input size) →", 12, MUTE, "end")
    for k in range(0, 17, 4):
        s += T(x0 + k / xmax * w, y0 + 17, str(k), 11, MUTE, "middle", mono=True)
    n0x = x0 + 10 / xmax * w
    s += g("Right of n₀ = 10 (green): f(n) never goes above c·g(n) again.",
           f"<rect x='{f(n0x)}' y='{f(y0 - h)}' width='{f(x0 + w - n0x)}' height='{h}' fill='rgb(var(--on-track) / 0.10)'/>" +
           line(n0x, y0, n0x, y0 - h, GREEN, 1.4, dashed=True) + T(n0x + 6, y0 - h + 16, "n₀ = 10", 12, GREENF, "start", 700) +
           T(n0x + 6, y0 - h + 32, "from here on,", 11, GREENF) + T(n0x + 6, y0 - h + 46, "f stays under", 11, GREENF))
    s += g("f(n) = 5n + 10, the algorithm's real step count.", fn_path(lambda n: 5 * n + 10, x0, y0, w, h, xmax, ymax, color=BRAND, width=2.8))
    s += g("c·g(n) = 6n: g(n) = n scaled by c = 6. It starts below f but crosses it at n = 10.", fn_path(lambda n: 6 * n, x0, y0, w, h, xmax, ymax, color=AMBER, width=2.6, dashed=True))
    ly = y0 + 62
    s += g("The definition, in words.",
           line(20, ly, 46, ly, BRAND, 2.8) + T(54, ly + 4, "f(n) = 5n + 10", 13, INK, mono=True) +
           f"<line x1='250' y1='{ly}' x2='276' y2='{ly}' stroke='{AMBER}' stroke-width='2.6' stroke-dasharray='6 4'/>" + T(284, ly + 4, "c·g(n) = 6n", 13, INK, mono=True) +
           box(10, ly + 16, 460, 58, "", tone="brand", r=10) +
           T(240, ly + 39, "f(n) = O(g(n)): past some n₀, f(n) ≤ c·g(n) forever.", 12.5, BRANDF, "middle", 700) +
           T(240, ly + 60, "Here c = 6, n₀ = 10, g(n) = n, so 5n + 10 = O(n).", 12.5, INK, "middle", 600))
    return fig(s, W, ly + 82)


def o_omega_theta():
    s = ""
    panels = [
        ("O", "ceiling", "at most", "amber"),
        ("Ω", "floor", "at least", "green"),
        ("Θ", "sandwich", "exactly", "brand"),
    ]
    for i, (sym, word, plain, tone) in enumerate(panels):
        x = 6 + i * 158
        inner = box(x, 6, 150, 208, "", tone="plain")
        inner += T(x + 12, 36, sym, 24, TONE[tone][2], weight=700) + T(x + 138, 34, word, 13, INK, "end", 700)
        px, py, pw, ph = x + 14, 150, 124, 96
        inner += line(px, py, px + pw, py, AXIS) + line(px, py, px, py - ph, AXIS)
        f_ = lambda n: 0.5 * n + 1.2 * math.sin(n * 0.9) + 3.5
        inner += fn_path(f_, px, py, pw, ph, 10, 10, color=BRAND, width=2.6)
        if i in (0, 2):
            inner += fn_path(lambda n: 0.8 * n + 4.8, px, py, pw, ph, 10, 10, color=AMBER, width=2.2, dashed=True)
        if i in (1, 2):
            inner += fn_path(lambda n: 0.3 * n + 1, px, py, pw, ph, 10, 10, color=GREEN, width=2.2, dashed=True)
        inner += T(x + 12, 176, f"f grows {plain}", 12, INK, weight=600) + T(x + 12, 194, "as fast as g", 12, INK, weight=600)
        s += g(f"{sym}: the {word}. f grows {plain} as fast as g.", inner)
    s += T(10, 236, "Blue: f(n), your algorithm.  Dashed: c·g(n), the bound.", 12, MUTE)
    return fig(s, W, 246)


def halving():
    vals = [2, 5, 8, 12, 16, 23, 38, 41, 56, 62, 71, 77, 83, 88, 91, 99]
    target = 23
    s = T(10, 18, "Find 23 in 16 sorted numbers.", 14, INK, weight=700)
    lo, hi = 0, 15
    cw, x = 27.5, 20
    y = 34
    step = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        found = vals[mid] == target
        row = T(12, y + 20, str(step + 1), 12, MUTE, "end", 700, mono=True)
        for i, v in enumerate(vals):
            t = "ghost" if (i < lo or i > hi) else "plain"
            if i == mid: t = "green" if found else "brand"
            row += box(x + i * cw, y, cw - 3, 30, "" if t == "ghost" else str(v), tone=t, size=11.5, r=5, mono=True, weight=700 if t in ("brand", "green") else 400, dashed=(t == "ghost"))
        verdict = "middle is 23: found it!" if found else (f"middle is {vals[mid]}, too big → keep the LEFT half" if vals[mid] > target else f"middle is {vals[mid]}, too small → keep the RIGHT half")
        row += T(x, y + 48, f"{hi - lo + 1} left · {verdict}", 12, GREENF if found else INK, weight=700 if found else 400)
        s += g(f"Look {step + 1}: {hi - lo + 1} candidates. {verdict}.", row)
        if found: break
        if vals[mid] > target: hi = mid - 1
        else: lo = mid + 1
        y += 64
        step += 1
    y += 84
    s += g("The worst case looks at ranges of 16, 8, 4, 2, 1: five looks, which is log₂ 16 + 1.",
           T(10, y, "Worst case: 16 → 8 → 4 → 2 → 1 = 5 looks (log₂ 16 + 1).", 12, MUTE))
    s += g("Double the items and you add ONE look.",
           box(10, y + 12, 460, 42, "", tone="brand", r=10) + T(240, y + 38, "Double the items → only ONE more look.", 12.5, BRANDF, "middle", 700))
    return fig(s, W, y + 62)


def dc_recipe():
    s = ""
    L, R, C = 130, 350, 240
    s += g("The problem: sort 8 numbers.", box(C - 90, 6, 180, 36, "7 3 9 1 4 8 2 6", tone="plain", size=13, mono=True))
    def lab(n, y, a, b):
        return num_badge(C - 42, y, n) + T(C - 26, y + 5, a, 13, INK, weight=700)
    s += g("1 · DIVIDE: cut it into smaller copies of the SAME problem.",
           lab(1, 62, "Divide", "same problem") + arrow(C - 40, 44, L, 82) + arrow(C + 40, 44, R, 82) +
           box(L - 75, 84, 150, 34, "7 3 9 1", tone="amber", mono=True) + box(R - 75, 84, 150, 34, "4 8 2 6", tone="amber", mono=True))
    s += g("2 · CONQUER: solve each piece the same way (recursion), until a piece is small enough to be obvious: the base case.",
           lab(2, 142, "Conquer", "recursion") + arrow(L, 120, L, 162) + arrow(R, 120, R, 162) +
           box(L - 75, 164, 150, 34, "1 3 7 9", tone="green", mono=True) + box(R - 75, 164, 150, 34, "2 4 6 8", tone="green", mono=True))
    s += g("3 · COMBINE: glue the solved pieces into the answer. For merge sort this is the merge step.",
           lab(3, 222, "Combine", "merge") + arrow(L, 200, C - 40, 242, brand=True) + arrow(R, 200, C + 40, 242, brand=True) +
           box(C - 105, 244, 210, 36, "1 2 3 4 6 7 8 9", tone="brand", mono=True))
    s += T(10, 306, "Binary search uses the same recipe, but conquers only", 11.5, MUTE) + T(10, 322, "ONE half and has nothing to combine.", 11.5, MUTE)
    return fig(s, W, 330)


def merge_fingers():
    s = T(10, 18, "Two sorted piles. The smallest item left is", 13, INK, weight=700) + T(10, 36, "always at the FRONT of one of them.", 13, INK, weight=700)
    xL, xR, y, cw = 20, 260, 72, 48
    s += T(xL, y - 8, "left pile", 12, MUTE) + T(xR, y - 8, "right pile", 12, MUTE)
    s += g("Already taken: 2 and 5 from the left, 3 from the right (grayed out).",
           cells(xL, y, [2, 5], cw, 36, {0: "ghost", 1: "ghost"}, idx=False) + cells(xR, y, [3], cw, 36, {0: "ghost"}, idx=False) +
           cells(xL + 3 * cw, y, [12], cw, 36, idx=False) + cells(xR + 2 * cw, y, [9, 10], cw, 36, idx=False))
    s += g("Finger i is on 8 (left's front). Finger j is on 6 (right's front).",
           cells(xL + 2 * cw, y, [8], cw, 36, {0: "brand"}, idx=False) + cells(xR + cw, y, [6], cw, 36, {0: "brand"}, idx=False) +
           pointer(xL + 2.5 * cw, y + 36, "i", "brand") + pointer(xR + 1.5 * cw, y + 36, "j", "brand"))
    s += g("Compare the two fronts: 6 < 8, so 6 goes next. Only j moves.",
           box(140, 158, 200, 34, "6 < 8 → take 6", tone="green", size=13, mono=True))
    s += T(20, 222, "output (always sorted)", 12, MUTE)
    s += g("The output fills left to right. Each item is copied exactly once: about n steps in total.",
           cells(20, 230, [2, 3, 5, 6, None, None, None, None], 55, 34, {3: "green"}, idx=False))
    s += T(20, 290, "One copy per step, never twice → merging is O(n).", 12, INK, weight=600)
    return fig(s, W, 300)


def merge_hourglass():
    rows_down = [[[50, 20, 60, 30, 10]], [[50, 20, 60], [30, 10]], [[50, 20], [60], [30], [10]], [[50], [20]]]
    rows_up = [[[20, 50], [60], [30], [10]], [[20, 50, 60], [10, 30]], [[10, 20, 30, 50, 60]]]
    cw, gap, CX = 34, 22, 290

    def row(groups, y, tone, start=None):
        total = sum(len(gg) * cw for gg in groups) + (len(groups) - 1) * gap
        x = CX - total / 2 if start is None else start
        out, pos = "", []
        for gg in groups:
            out += cells(x, y, gg, cw, 28, {i: tone for i in range(len(gg))}, idx=False, size=12.5)
            pos.append((x + len(gg) * cw / 2, y))
            x += len(gg) * cw + gap
        return out, pos

    def edges(parents, kids, pairs, color):
        return "".join(line(parents[p][0], parents[p][1] + 28, kids[k][0], kids[k][1], color, 1.2) for p, k in pairs)

    s = T(10, 22, "DOWN:", 13, AMBERF, weight=700) + T(10, 38, "split", 12, AMBERF) + T(10, 54, "(no work)", 11, MUTE)
    ys = [10, 58, 106, 154]
    caps = ["Start: M([50, 20, 60, 30, 10]).", "Split in the middle. The left half gets the extra item.", "Keep splitting. [60], [30], [10] are single items: the base case, already sorted.", "[50, 20] splits into [50] and [20]. Every piece is now size 1."]
    prev = None
    down_pairs = [None, [(0, 0), (0, 1)], [(0, 0), (0, 1), (1, 2), (1, 3)], [(0, 0), (0, 1)]]
    for k, groups in enumerate(rows_down):
        if k == 3:
            r, pos = row(groups, ys[k], "amber", start=prev[0][0] - cw - gap / 2)
        else:
            r, pos = row(groups, ys[k], "amber")
        e = edges(prev, pos, down_pairs[k], AXIS) if prev else ""
        s += g(caps[k], e + r)
        prev = pos
    s += line(10, 200, 470, 200, "rgb(var(--foreground) / 0.15)", 1, dashed=True)
    s += T(10, 226, "UP:", 13, BRANDF, weight=700) + T(10, 242, "merge", 12, BRANDF) + T(10, 258, "(all the", 11, MUTE) + T(10, 272, "work)", 11, MUTE)
    yu = [214, 270, 326]
    caps = ["Merge [50] and [20] → [20, 50]. The first real comparison.", "Merge [20, 50] with [60] → [20, 50, 60]. Merge [30] with [10] → [10, 30].", "Merge the two halves → [10, 20, 30, 50, 60]. Sorted."]
    up_pairs = [None, [(0, 0), (1, 0), (2, 1), (3, 1)], [(0, 0), (1, 0)]]
    pp = None
    for k, groups in enumerate(rows_up):
        r, pos = row(groups, yu[k], "brand" if k == 2 else "green")
        e = edges(pp, pos, up_pairs[k], BRAND) if pp else ""
        s += g(caps[k], e + r)
        pp = pos
    s += T(240, 384, "Every comparison happens on the way UP.", 12.5, INK, "middle", 600)
    return fig(s, W, 394)


def levels_cost():
    s = T(10, 18, "n = 8: every level costs 8.", 14, INK, weight=700)
    groups = [[8], [4, 4], [2, 2, 2, 2], [1] * 8]
    unit = 44
    caps = ["The whole array: 8 items.", "Two halves of 4. Merging them later touches 4 + 4 = 8 items.", "Four pieces of 2: merging costs 2 + 2 + 2 + 2 = 8.", "Eight single items: the base case. Nothing to merge here."]
    for k, gr in enumerate(groups):
        y = 34 + k * 46
        x = 62
        r = T(54, y + 20, f"level {k}", 11, MUTE, "end", mono=True)
        for sz in gr:
            r += box(x, y, sz * unit - 5, 30, f"{sz}", tone="brand" if k < 3 else "green", size=12.5, r=6, mono=True)
            x += sz * unit
        r += T(x + 2, y + 20, "=8", 13, BRANDF if k < 3 else GREENF, weight=700, mono=True)
        s += g(caps[k], r)
    s += g("Levels that do merging: 8 → 4 → 2 → 1 is 3 halvings, and log₂ 8 = 3.",
           T(62, 234, "3 levels of merging (8 → 4 → 2 → 1), and log₂ 8 = 3", 12, BRANDF, weight=700))
    s += g("Multiply: n per level times log n levels = n log n. For n = 8 that's 8 × 3 = 24.",
           box(10, 248, 460, 50, "", tone="brand", r=10) +
           T(240, 270, "total ≈ n per level × log₂ n levels = n log n", 13, BRANDF, "middle", 700) +
           T(240, 289, "for n = 8: 8 × 3 = 24", 12.5, INK, "middle", 600, mono=True))
    return fig(s, W, 306)


def figures():
    return {
        "map": chapter_map(),
        "counting": counting(),
        "bigo": bigo_def(),
        "ooth": o_omega_theta(),
        "halving": halving(),
        "dc": dc_recipe(),
        "fingers": merge_fingers(),
        "hourglass": merge_hourglass(),
        "levels": levels_cost(),
    }
