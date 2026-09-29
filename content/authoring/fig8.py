"""Figures for CS 146 chapter 8: heaps, heapSort, priority queues. 480 wide."""
import math
from figs146 import *
from fig2 import path_map

W = 480


def chapter_map():
    return path_map("Always hand over the most urgent thing.", [
        ("Priority queue", "the contract: take the max", "take the max", "plain"),
        ("Heap", "a tree stored in an array", "parent ≥ kids", "brand"),
        ("heapify", "let one value sink", "O(log n)", "amber"),
        ("buildHeap", "heapify from the bottom up", "O(n)", "green"),
        ("heapSort", "pull the max out n times", "O(n log n)", "brand"),
    ], "Heap sort: n log n with no extra memory.")


def triage():
    s = T(10, 18, "Emergency room: who goes next?", 14, INK, weight=700)
    pts = [("A", 2), ("B", 9), ("C", 4), ("D", 7)]
    s += T(10, 44, "arrived in this order →", 11.5, MUTE)
    for i, (p, u) in enumerate(pts):
        x = 30 + i * 110
        tone = "red" if u >= 9 else ("amber" if u >= 7 else "plain")
        s += g(f"Patient {p}, urgency {u}.",
               f"<circle cx='{x + 30}' cy='74' r='12' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.4'/>" +
               f"<rect x='{x + 12}' y='88' width='36' height='38' rx='12' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.4'/>" +
               T(x + 30, 113, p, 13, TONE[tone][2] if tone != "plain" else INK, "middle", 700) + T(x + 30, 146, f"urgency {u}", 11.5, TONE[tone][2] if tone != "plain" else MUTE, "middle", 700))
    s += g("A plain queue serves by arrival: A first, even though B is critical.",
           box(10, 164, 460, 44, "", tone="red", r=10) + T(22, 184, "Queue (FIFO):", 12.5, REDF, weight=700) + T(22, 200, "A, B, C, D  → the critical patient waits", 12, INK, mono=True))
    s += g("A priority queue serves by urgency: B, then D, then C, then A. That's what a heap does fast.",
           box(10, 216, 460, 44, "", tone="green", r=10) + T(22, 236, "Priority queue:", 12.5, GREENF, weight=700) + T(22, 252, "B (9), D (7), C (4), A (2)  → most urgent first", 12, INK, mono=True))
    s += T(10, 282, "Patients keep arriving, so re-sorting everyone each time is too slow.", 11.5, MUTE)
    return fig(s, W, 290)


def array_tree():
    a = [16, 14, 10, 8, 7, 9, 3, 2, 4, 1]
    s = T(10, 18, "One heap, two views. Only the array exists.", 14, INK, weight=700)
    tones = {0: "red", 1: "green", 3: "amber", 4: "amber"}
    s += g("The tree you draw: level by level, left to right. Hover the colored nodes.",
           heap_tree(a, 240, 50, 440, 50, tones=tones, r=16))
    y = 236
    s += g("The array that actually sits in memory: the same values read level by level.",
           cells(20, y, a, 44, 34, {0: "red", 1: "green", 3: "amber", 4: "amber"}, size=13))
    s += g("Children of index 1: 2·1 + 1 = 3 and 2·1 + 2 = 4. No pointers needed, just arithmetic.",
           curve_arrow(20 + 1.5 * 44, y - 2, 20 + 3.5 * 44, y - 2, -24, w=1.6) + curve_arrow(20 + 1.5 * 44, y - 2, 20 + 4.5 * 44, y - 2, -36, w=1.6))
    s += g("The formulas (0-based).",
           box(10, 300, 460, 60, "", tone="brand", r=10) +
           T(24, 322, "left child = 2i + 1", 12.5, INK, mono=True) + T(260, 322, "right child = 2i + 2", 12.5, INK, mono=True) +
           T(24, 344, "parent = ⌊(i − 1) / 2⌋", 12.5, INK, mono=True) + T(260, 344, "first leaf = ⌊n / 2⌋", 12.5, INK, mono=True))
    return fig(s, W, 368)


def build_cost():
    s = T(10, 18, "Why buildHeap is O(n), not O(n log n)", 14, INK, weight=700)
    s += T(10, 38, "n = 15. Most nodes sit near the bottom and can barely sink.", 12, MUTE)
    rows = [(1, 4, "root"), (2, 3, ""), (4, 2, ""), (8, 1, ""), (16, 0, "leaves")]
    rows = [(1, 3), (2, 2), (4, 1), (8, 0)]
    y0 = 60
    total = 0
    for k, (cnt, dist) in enumerate(rows):
        y = y0 + k * 46
        inner = T(10, y + 20, f"{cnt} node{'s' if cnt > 1 else ''}", 12, INK, weight=600)
        inner += bar(92, y + 4, cnt * 20, 24, "brand")
        inner += T(270, y + 20, f"× sink ≤ {dist}", 12, AMBERF, weight=700, mono=True)
        inner += T(470, y + 20, f"= {cnt * dist}", 13, INK, "end", 700, mono=True)
        total += cnt * dist
        s += g(f"{cnt} nodes at this level, each can sink at most {dist} levels: {cnt * dist} swaps at most.", inner)
    s += g(f"Total at most {total} swaps for 15 nodes: about n, not n log n.",
           box(10, 250, 460, 50, "", tone="green", r=10) +
           T(240, 272, f"total ≤ 0 + 4 + 4 + 3 = {total} swaps for n = 15", 13, GREENF, "middle", 700, mono=True) +
           T(240, 291, "half the nodes are leaves and never move: O(n)", 12, INK, "middle"))
    return fig(s, W, 308)


def sort_split():
    s = T(10, 18, "heapSort keeps one array in two parts.", 14, INK, weight=700)
    a = [6, 5, 3, 4, 2, 1, 7]
    s += g("Left: still a max-heap (blue). Right: already sorted, in final position (green).",
           cells(40, 44, a, 56, 40, {0: "brand", 1: "brand", 2: "brand", 3: "brand", 4: "brand", 5: "brand", 6: "green"}, size=15))
    s += line(40 + 6 * 56 - 1, 36, 40 + 6 * 56 - 1, 100, BRAND, 2, dashed=True)
    s += T(40 + 3 * 56, 112, "heap (size 6)", 12, BRANDF, "middle", 700) + T(40 + 6.5 * 56, 112, "sorted", 12, GREENF, "middle", 700)
    s += g("Each round: swap the root (the max of the heap) with the heap's last item, move the wall left by one, heapify the root.",
           box(10, 128, 460, 76, "", tone="plain", r=10) +
           T(24, 150, "each round:", 12, MUTE) +
           T(24, 170, "1. swap a[0] ↔ a[end]", 12, INK, mono=True) + T(260, 170, "max to its final spot", 11.5, MUTE) +
           T(24, 190, "2. end − 1; heapify(a, 0)", 12, INK, mono=True) + T(260, 190, "fix the new root: log n", 11.5, MUTE))
    s += T(240, 226, "No second array anywhere: O(1) extra space.", 12.5, INK, "middle", 600)
    return fig(s, W, 236)


def figures():
    return {"map": chapter_map(), "triage": triage(), "arraytree": array_tree(), "build": build_cost(), "split": sort_split()}
