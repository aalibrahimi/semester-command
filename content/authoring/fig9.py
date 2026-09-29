"""Figures for CS 146 chapter 9: quicksort. 480 wide."""
import math
from figs146 import *
from fig2 import path_map

W = 480


def chapter_map():
    return path_map("Sort in place by picking a pivot.", [
        ("Pivot", "one item goes to its final spot", "the idea", "plain"),
        ("partition", "small left, big right", "O(n)", "brand"),
        ("quicksort", "partition, then recurse", "3 lines", "green"),
        ("Analysis", "depends on the pivot", "n log n … n²", "amber"),
        ("In practice", "how libraries avoid n²", "random pivot", "plain"),
    ], "Usually the fastest sort in practice.")


def heights():
    s = T(10, 18, "Poon's analogy: line up a class by height.", 14, INK, weight=700)
    before = [5, 8, 3, 9, 2, 7, 6]
    pivot = 6
    def people(vals, y0, piv_idx, label, cap):
        out = T(10, y0 - 76, label, 12, MUTE, weight=600)
        for k, h in enumerate(vals):
            x = 40 + k * 60
            ht = 20 + h * 7
            tone = "brand" if k == piv_idx else ("green" if h <= pivot and label.startswith("after") else ("amber" if label.startswith("after") else "plain"))
            out += f"<circle cx='{x + 18}' cy='{y0 - ht - 9}' r='8' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.3'/>"
            out += f"<rect x='{x + 8}' y='{y0 - ht}' width='20' height='{ht}' rx='6' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.3'/>"
            out += T(x + 18, y0 + 16, str(h), 11.5, TONE[tone][2] if tone != "plain" else MUTE, "middle", 700)
        return g(cap, out)
    s += people(before, 130, 6, "before: the pivot is the last student (height 6)", "Before: a messy line. The last student (height 6) is the pivot.")
    after = [5, 3, 2, 6, 8, 9, 7]
    s += people(after, 262, 3, "after partition", "After partition: everyone shorter is left of the pivot, everyone taller is right. The pivot is exactly where it will be in the final sorted line.")
    s += T(40 + 3 * 60 + 18, 290, "final spot", 11.5, BRANDF, "middle", 700)
    s += T(40 + 1 * 60 + 18, 290, "≤ 6 (still messy)", 11, GREENF, "middle")
    s += T(40 + 5 * 60 + 18, 290, "> 6 (still messy)", 11, AMBERF, "middle")
    return fig(s, W, 300)


def regions():
    s = T(10, 18, "partition's four zones, in the middle of the loop", 14, INK, weight=700)
    vals = [3, 1, 2, 9, 7, 8, 4, 6, 5]
    tones = {0: "green", 1: "green", 2: "green", 3: "amber", 4: "amber", 5: "amber", 8: "brand"}
    x0 = 24
    s += g("The array, somewhere in the middle of partition(a, 0, 8). The pivot is 5 (last).", cells(x0, 50, vals, 48, 38, tones, size=14))
    s += g("i (the boundary) is the last index of the ≤ pivot zone.", pointer(x0 + 2.5 * 48, 101, "i", "green"))
    s += g("j (the scout) is the next item to check.", pointer(x0 + 6.5 * 48, 101, "j", "brand"))
    zones = [(0, 3, "≤ pivot", "green"), (3, 6, "> pivot", "amber"), (6, 8, "not checked yet", "plain"), (8, 9, "pivot", "brand")]
    for a, b, lab, tone in zones:
        xa, xb = x0 + a * 48 + 2, x0 + b * 48 - 2
        s += g(f"Zone: {lab}.", line(xa, 162, xb, 162, TONE[tone][1] if tone != "plain" else AXIS, 3) + T((xa + xb) / 2, 180, lab, 11.5, TONE[tone][2] if tone != "plain" else MUTE, "middle", 700))
    s += g("Each step: look at a[j]. Small? i++ and swap it into the green zone. Big? just move j on.",
           box(10, 196, 460, 58, "", tone="plain", r=10) +
           T(24, 218, "a[j] ≤ pivot → i++, swap a[i] ↔ a[j]  (green grows)", 12, INK, mono=True) +
           T(24, 240, "a[j] > pivot  → do nothing          (amber grows)", 12, INK, mono=True))
    return fig(s, W, 262)


def shapes():
    s = T(10, 18, "The pivot decides the shape of the recursion.", 14, INK, weight=700)
    # balanced
    s += T(120, 44, "good pivots: halves", 12.5, GREENF, "middle", 700)
    for lvl in range(4):
        cnt = 2 ** lvl
        y = 62 + lvl * 34
        for k in range(cnt):
            w = 200 / cnt - 4
            x = 20 + k * (200 / cnt)
            s += bar(x, y, w, 22, "green")
    s += T(120, 210, "log n levels × n = n log n", 12, INK, "middle", 600)
    # lopsided
    s += T(360, 44, "bad pivots: n−1 and 0", 12.5, REDF, "middle", 700)
    for lvl in range(6):
        y = 62 + lvl * 23
        w = 200 - lvl * 32
        s += bar(260, y, w, 17, "red")
    s += T(360, 210, "n levels × n = n²", 12, INK, "middle", 600)
    s += g("Sorted input with the last element as pivot always gives the lopsided shape.",
           box(10, 226, 460, 40, "", tone="red", r=10) + T(240, 251, "Lomuto on SORTED input: pivot is always the max → n²", 12.5, REDF, "middle", 700))
    return fig(s, W, 274)


def figures():
    return {"map": chapter_map(), "heights": heights(), "regions": regions(), "shapes": shapes()}
