"""Figures for CS 146 chapter 2: ADTs, stacks, queues, linked lists, loop
invariants, insertion sort. 480 units wide."""
import math
from figs146 import *

W = 480
DASH = " stroke-dasharray='4 3'"


def path_map(title, steps, footer=None):
    """A vertical chapter map: (name, plain, result, tone)."""
    s = T(10, 20, "This chapter, in order:", 12, MUTE) + T(10, 40, title, 15, INK, weight=700)
    y0, rh = 58, 50
    for i, (a, b, c, tone) in enumerate(steps):
        y = y0 + i * rh
        inner = num_badge(22, y + 19, i + 1) + box(42, y, 290, 38, "", tone=tone, r=9)
        inner += T(56, y + 17, a, 13, TONE[tone][2] if tone != "plain" else INK, weight=700) + T(56, y + 31, b, 10.5, MUTE)
        inner += T(470, y + 24, c, 12.5, INK, "end", 700, mono=True)
        if i < len(steps) - 1:
            inner += arrow(22, y + 31, 22, y + rh + 7)
        s += g(f"{i + 1}. {a}: {b}.", inner)
    y = y0 + len(steps) * rh
    if footer:
        s += box(10, y + 4, 460, 40, "", tone="green", r=10) + T(240, y + 29, footer, 12, GREENF, "middle", 700)
        y += 50
    return fig(s, W, y + 6)


def chapter_map():
    return path_map("What does it do, and is it right?", [
        ("ADT", "a contract: what, not how", "push / pop …", "plain"),
        ("Stack", "last in, first out", "O(1)", "brand"),
        ("Queue", "first in, first out", "O(1) with %", "green"),
        ("Linked list", "boxes and arrows", "O(1) splice", "amber"),
        ("Loop invariant", "prove a loop is right", "3 steps", "brand"),
        ("Insertion sort", "the first real sort", "Ω(n) … O(n²)", "green"),
    ], "Project 1 uses #6. The midterm uses all six.")


def adt_contract():
    s = T(10, 18, "One contract, many ways to build it.", 14, INK, weight=700)
    s += g("Your code only talks to the contract: the four operations and what they promise.",
           box(90, 34, 300, 64, "", tone="brand", r=12) + T(240, 58, "Stack ADT (the contract)", 13, BRANDF, "middle", 700) +
           T(240, 82, "push(x) · pop() · peek() · isEmpty()", 12.5, INK, "middle", mono=True))
    s += g("Your program on top: it uses push and pop and never looks inside.",
           box(160, 118, 160, 32, "your code", tone="plain", size=12.5))
    s += line(240, 98, 240, 118, AXIS)
    s += g("Implementation 1: an array plus a 'top' index.",
           arrow(170, 160, 110, 196) + box(20, 198, 190, 70, "", tone="amber", r=10) + T(115, 220, "array + top", 13, AMBERF, "middle", 700) +
           cells(40, 230, [4, 7, 1, None], 36, 28, {2: "amber"}, idx=False, size=12))
    s += g("Implementation 2: a linked list, top = head node.",
           arrow(310, 160, 370, 196) + box(270, 198, 190, 70, "", tone="green", r=10) + T(365, 220, "linked list + head", 13, GREENF, "middle", 700) +
           box(284, 234, 36, 24, "1", tone="green", size=12, mono=True) + arrow(322, 246, 344, 246) + box(346, 234, 36, 24, "7", tone="plain", size=12, mono=True) + arrow(384, 246, 406, 246) + box(408, 234, 36, 24, "4", tone="plain", size=12, mono=True))
    s += T(240, 292, "Swap one for the other: your code doesn't change.", 12, INK, "middle", 600)
    s += T(240, 310, "Like a car's pedals: gas or electric, same pedals.", 11.5, MUTE, "middle")
    return fig(s, W, 318)


def plates():
    s = T(10, 18, "A stack: you can only touch the TOP.", 14, INK, weight=700)
    vals = ["A", "B", "C", "D"]
    base = 250
    for i, v in enumerate(vals):
        y = base - (i + 1) * 36
        tone = "brand" if i == 3 else "plain"
        s += g(f"Plate {v}: pushed {['first', 'second', 'third', 'last'][i]}." + (" It's on top, so it's the only one you can reach." if i == 3 else ""),
               f"<ellipse cx='130' cy='{y + 16}' rx='92' ry='14' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.4'/>" +
               T(130, y + 21, v, 13, TONE[tone][2] if tone != "plain" else INK, "middle", 700))
    s += line(30, base + 4, 230, base + 4, AXIS, 2)
    s += g("push(E): E goes on the top. One step, no matter how many plates.", curve_arrow(270, 80, 190, 96, -40, brand=True) + T(276, 76, "push(E)", 13, BRANDF, weight=700, mono=True) + T(276, 94, "goes on top: O(1)", 11.5, MUTE))
    s += g("pop(): takes the top plate off. The last one pushed comes out first: LIFO.", curve_arrow(200, 120, 290, 150, -30) + T(296, 150, "pop() → D", 13, INK, weight=700, mono=True) + T(296, 168, "last in, first out", 11.5, MUTE))
    s += g("In memory: an array and one index, top. top = −1 means empty.",
           T(10, 290, "in memory:", 11.5, MUTE) + cells(90, 274, ["A", "B", "C", "D", None, None], 40, 30, {3: "brand"}, size=12.5) + pointer(90 + 3.5 * 40, 318, "top = 3", "brand", up=True))
    return fig(s, W, 372)


def checkout():
    s = T(10, 18, "A queue: join at the back, leave from the front.", 14, INK, weight=700)
    people = ["A", "B", "C", "D"]
    for i, p in enumerate(people):
        x = 110 + i * 70
        tone = "green" if i == 0 else ("amber" if i == 3 else "plain")
        s += g(f"{p}: arrived {['first', 'second', 'third', 'last'][i]}." + (" At the front, so served next." if i == 0 else "") + (" At the back." if i == 3 else ""),
               f"<circle cx='{x + 24}' cy='58' r='13' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.4'/>" +
               f"<rect x='{x + 6}' y='74' width='36' height='42' rx='12' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.4'/>" +
               T(x + 24, 101, p, 14, TONE[tone][2] if tone != "plain" else INK, "middle", 700))
    s += g("The register: dequeue() serves whoever is at the front.", box(10, 60, 70, 56, "register", tone="plain", size=11.5) + arrow(108, 96, 84, 96, brand=True) + T(8, 136, "dequeue() → A", 11.5, BRANDF, "start", 700, mono=True))
    s += g("enqueue(E): the new person joins at the back.", arrow(440, 96, 410, 96) + T(470, 136, "enqueue(E)", 12, INK, "end", 700, mono=True))
    s += T(240, 162, "first in, first out (FIFO)", 13, INK, "middle", 600)
    s += g("The naive array queue keeps the front at index 0, so every dequeue shifts everyone left: n moves.",
           box(10, 180, 460, 88, "", tone="red", r=10) + T(22, 200, "Naive array: front stays at index 0", 12.5, REDF, weight=700) +
           cells(22, 212, ["B", "C", "D", None], 44, 28, idx=False, size=12) +
           "".join(curve_arrow(22 + i * 44 + 30, 244, 22 + (i - 1) * 44 + 30, 244, 14, w=1.2) for i in range(1, 3)) +
           T(210, 232, "every dequeue: shift all", 12, INK) + T(210, 250, "left = O(n). Too slow.", 12, REDF, weight=700))
    return fig(s, W, 276)


def ring():
    s = T(10, 18, "The fix: let the queue wrap around.", 14, INK, weight=700)
    cx, cy, R = 150, 150, 90
    N = 8
    vals = ["G", None, None, None, "C", "D", "E", "F"]   # head=4, tail=0 after wrap
    head, tail = 4, 0
    for i in range(N):
        ang = -math.pi / 2 + i * 2 * math.pi / N
        x, y = cx + R * math.cos(ang), cy + R * math.sin(ang)
        tone = "green" if vals[i] else "ghost"
        if i == head: tone = "brand"
        s += g(f"Slot {i}: " + (f"holds {vals[i]}." if vals[i] else "free.") + (" head: the next dequeue reads here." if i == head else "") + (" tail: the newest item." if i == tail else ""),
               f"<circle cx='{f(x)}' cy='{f(y)}' r='22' fill='{TONE[tone][0]}' stroke='{TONE[tone][1]}' stroke-width='1.4'{DASH if not vals[i] else ''}/>" +
               T(x, y + 5, vals[i] or "", 14, TONE[tone][2], "middle", 700) + T(cx + (R + 34) * math.cos(ang), cy + (R + 34) * math.sin(ang) + 4, str(i), 11, MUTE, "middle", mono=True))
    s += curve_arrow(cx + 40, cy - 30, cx + 40, cy + 30, 30, w=1.3) + T(cx, cy + 4, "wraps", 11.5, MUTE, "middle")
    s += T(cx, cy + 20, "around", 11.5, MUTE, "middle")
    s += g("head = 4 (C is the oldest), tail = 0 (G was just added, and it wrapped past the end).",
           T(290, 70, "head = 4", 14, BRANDF, weight=700, mono=True) + T(290, 88, "next dequeue: C", 12, MUTE) +
           T(290, 124, "tail = 0", 14, GREENF, weight=700, mono=True) + T(290, 142, "G wrapped to slot 0:", 12, MUTE) + T(290, 158, "(7 + 1) % 8 = 0", 12, INK, mono=True))
    s += g("Both operations just move an index with % capacity: O(1), nothing ever shifts.",
           box(282, 170, 188, 112, "", tone="brand", r=10) + T(294, 190, "enqueue moves tail:", 11.5, MUTE) + T(294, 207, "(tail + 1) % 8", 12, INK, mono=True) + T(294, 229, "dequeue moves head:", 11.5, MUTE) + T(294, 246, "(head + 1) % 8", 12, INK, mono=True) + T(294, 270, "both O(1)", 12, BRANDF, weight=700))
    s += T(240, 308, "Logical order: C, D, E, F, G (start at head, go around).", 12, INK, "middle", 600)
    return fig(s, W, 318)


def lockers_train():
    s = T(10, 18, "Array = numbered lockers. Linked list = a train.", 14, INK, weight=700)
    s += T(10, 74, "array", 12, MUTE)
    s += g("An array: every item sits right next to the one before it, so item k's spot can be computed. get(k) is one jump.",
           cells(60, 52, [12, 7, 30, 5, 18, 9], 58, 34, {4: "brand"}, size=13) + curve_arrow(90, 50, 60 + 4.5 * 58, 50, -22, brand=True) + T(60 + 4.5 * 58 + 8, 14, "", 1) +
           T(470, 118, "get(4): one jump, O(1)", 12, BRANDF, "end", 700))
    s += T(10, 160, "linked", 12, MUTE)
    xs = [60, 140, 220, 300, 380]
    vals = [12, 7, 30, 5, 18]
    inner = ""
    for i, (x, v) in enumerate(zip(xs, vals)):
        tone = "brand" if i == 4 else "plain"
        inner += box(x, 142, 38, 32, str(v), tone=tone, size=13, mono=True, r=6) + box(x + 38, 142, 20, 32, "", tone="plain", r=4)
        inner += f"<circle cx='{x + 48}' cy='158' r='3' fill='{INK}'/>"
        if i < 4:
            inner += arrow(x + 50, 158, xs[i + 1] - 2, 158)
    inner += T(438 + 6, 163, "", 1)
    s += g("A linked list: each node holds a value and the address of the next node. To reach node 4 you must follow 4 arrows from head.",
           T(60, 132, "head", 11.5, MUTE) + inner +
           "".join(T(x + 29, 196, f"hop {i}", 10.5, AMBERF, "middle") for i, x in enumerate(xs[1:], 1)) + T(470, 222, "get(4): walk 4 hops, O(n)", 12, AMBERF, "end", 700))
    s += g("But inserting in the middle: the array must shift everything after; the list rewires two arrows.",
           box(10, 236, 460, 52, "", tone="plain", r=10) +
           T(22, 256, "insert in the middle:", 12, INK, weight=700) + T(22, 276, "array shifts everything after: O(n)", 11.5, MUTE) +
           T(458, 256, "list: rewire 2 arrows", 11.5, GREENF, "end", 700) + T(458, 276, "O(1) once you're there", 11.5, MUTE, "end"))
    return fig(s, W, 296)


def splice():
    s = T(10, 18, "Insert X after B: two writes, in THIS order.", 14, INK, weight=700)

    def chain(y, x_ptr_to, extra=""):
        out = ""
        xs = {"A": 20, "B": 130, "C": 260, "D": 370}
        for k, x in xs.items():
            out += box(x, y, 36, 30, k, tone="plain", size=13, mono=True, r=6) + box(x + 36, y, 18, 30, "", tone="plain", r=4) + f"<circle cx='{x + 45}' cy='{y + 15}' r='3' fill='{INK}'/>"
        out += arrow(20 + 47, y + 15, 128, y + 15) + arrow(370 + 47, y + 15, 450, y + 15) + T(454, y + 20, "∅", 13, MUTE)
        out += x_ptr_to + extra
        return out, xs

    y1 = 50
    c1, xs = chain(y1, arrow(130 + 47, y1 + 15, 258, y1 + 15) + arrow(260 + 47, y1 + 15, 368, y1 + 15))
    s += g("Before: A → B → C → D. X is a new node, not linked yet.",
           T(10, y1 - 8, "before", 11.5, MUTE) + c1 + box(195, y1 + 48, 36, 30, "X", tone="brand", size=13, mono=True, r=6) + box(231, y1 + 48, 18, 30, "", tone="brand", r=4))
    y2 = 150
    c2, _ = chain(y2, arrow(130 + 47, y2 + 15, 258, y2 + 15) + arrow(260 + 47, y2 + 15, 368, y2 + 15))
    s += g("① X.next = B.next: X now points at C too. Nothing is lost yet.",
           T(10, y2 - 8, "① X.next = B.next", 12.5, BRANDF, weight=700, mono=True) + c2 +
           box(195, y2 + 44, 36, 30, "X", tone="brand", size=13, mono=True, r=6) + box(231, y2 + 44, 18, 30, "", tone="brand", r=4) + f"<circle cx='240' cy='{y2 + 59}' r='3' fill='{BRAND}'/>" +
           arrow(244, y2 + 52, 272, y2 + 32, brand=True))
    y3 = 250
    c3, _ = chain(y3, "", arrow(307, y3 + 15, 368, y3 + 15))
    s += g("② B.next = X: B skips to X, and X leads on to C. Done: A → B → X → C → D, in O(1).",
           T(10, y3 - 8, "② B.next = X", 12.5, GREENF, weight=700, mono=True) + c3 +
           box(195, y3 + 44, 36, 30, "X", tone="green", size=13, mono=True, r=6) + box(231, y3 + 44, 18, 30, "", tone="green", r=4) + f"<circle cx='240' cy='{y3 + 59}' r='3' fill='{GREEN}'/>" +
           arrow(177, y3 + 20, 200, y3 + 42, color=GREEN, w=2) + arrow(244, y3 + 52, 272, y3 + 32, color=GREEN, w=2))
    s += g("Do ② first and C's address is overwritten before anything else holds it: C and D are lost.",
           box(10, 334, 460, 36, "", tone="red", r=8) + T(240, 357, "Swap the order and C, D are lost forever.", 12.5, REDF, "middle", 700))
    return fig(s, W, 378)


def invariant_lego():
    s = T(10, 18, "The invariant: the LEFT part is always sorted.", 14, INK, weight=700)
    rows = [
        ("Initialization (base case)", ("j = 1: a[0..0] is one item,", "and one item is sorted."), [8, 5, 2, 6, 9], 1, "plain"),
        ("Maintenance (inductive step)", ("sorted before the round, key", "slides in, still sorted after."), [2, 5, 8, 6, 9], 3, "plain"),
        ("Termination (conclusion)", ("stops at j = n: a[0..n−1],", "the WHOLE array, is sorted."), [2, 5, 6, 8, 9], 5, "plain"),
    ]
    for k, (name, why, vals, j, _) in enumerate(rows):
        y = 40 + k * 96
        tones = {i: "green" for i in range(j)}
        if j < len(vals): tones[j] = "brand"
        inner = num_badge(20, y + 8, k + 1) + T(38, y + 13, name, 13, INK, weight=700)
        inner += cells(38, y + 26, vals, 44, 32, tones, idx=False, size=13)
        if j < len(vals):
            inner += T(38 + j * 44 + 22, y + 74, "key", 11, BRANDF, "middle", 700)
        inner += T(38 + 5 * 44 + 14, y + 38, "sorted part: a[0.." + str(j - 1) + "]", 11.5, GREENF, weight=700)
        inner += T(38 + 5 * 44 + 14, y + 56, why[0], 11, MUTE) + T(38 + 5 * 44 + 14, y + 70, why[1], 11, MUTE)
        s += g(f"{name}: {why[0]} {why[1]}", inner)
    s += T(240, 336, "Like a Lego tower: solid at the start, still solid after each brick.", 11.5, MUTE, "middle")
    return fig(s, W, 344)


def cards():
    s = T(10, 18, "Insertion sort = sorting cards in your hand.", 14, INK, weight=700)
    s += g("Your hand so far is sorted: 2, 5, 8. The next card from the deck is 6: that's the key.",
           cells(40, 90, [2, 5, 8, None, 9], 56, 44, {0: "green", 1: "green", 2: "green"}, idx=False, size=15) +
           T(40, 80, "sorted hand", 11.5, GREENF, weight=700) + T(40 + 4 * 56, 80, "deck", 11.5, MUTE))
    s += g("Lift the key out, leaving a hole.", box(40 + 3 * 56 + 6, 34, 44, 40, "6", tone="brand", size=15, mono=True, r=8) + T(40 + 3 * 56, 60, "key →", 11.5, BRANDF, "end", 700))
    s += g("8 > 6: shift 8 one slot right, into the hole.", curve_arrow(40 + 2.5 * 56, 138, 40 + 3.5 * 56, 138, 22, brand=True) + T(40 + 3 * 56, 172, "shift 8 →", 11.5, BRANDF, "middle", 700))
    s += g("5 ≤ 6: stop. Drop 6 into the hole at index 2.", T(40 + 1.5 * 56, 172, "5 ≤ 6: stop", 11.5, GREENF, "middle", 700))
    s += g("After: 2, 5, 6, 8 is sorted, and the hand grew by one.",
           T(40, 208, "after this round", 11.5, MUTE) + cells(40, 216, [2, 5, 6, 8, 9], 56, 40, {0: "green", 1: "green", 2: "green", 3: "green"}, idx=False, size=15))
    s += T(240, 280, "Each round, the key walks left past bigger cards.", 12, INK, "middle", 600)
    return fig(s, W, 290)


def best_worst():
    s = T(10, 18, "Shifts per key, n = 8", 14, INK, weight=700)
    x0 = 40
    s += g("Already sorted: every key is already in place. 0 shifts each, 1 comparison each: about n steps, Ω(n).",
           T(x0, 38, "already sorted input", 12.5, GREENF, "start", 700) + "".join(bar(x0 + i * 52, 50, 44, 18, "green") + T(x0 + i * 52 + 22, 63, "0", 11, GREENF, "middle", 700, mono=True) for i in range(7)) +
           T(x0, 88, "total shifts: 0  →  about n steps: Ω(n)", 12, GREENF, weight=600))
    inner = T(x0, 112, "reversed input", 12.5, REDF, "start", 700)
    for i in range(7):
        h = (i + 1) * 20
        inner += bar(x0 + i * 52, 250 - h, 44, h, "red") + T(x0 + i * 52 + 22, 250 - h - 5, str(i + 1), 12, REDF, "middle", 700, mono=True)
    inner += line(x0 - 4, 250, x0 + 7 * 52, 250, AXIS)
    s += g("Reversed: key number k must walk past all k earlier items: 1 + 2 + … + 7 = 28 = n(n−1)/2. That's O(n²).",
           inner + T(x0, 274, "total shifts: 1 + 2 + … + 7 = 28 = n(n−1)/2  →  O(n²)", 12, REDF, weight=600))
    s += T(x0, 296, "The triangle is half a square: that's where n²/2 comes from.", 11.5, MUTE)
    return fig(s, W, 304)


def figures():
    return {
        "map": chapter_map(), "adt": adt_contract(), "plates": plates(), "checkout": checkout(), "ring": ring(),
        "lockers": lockers_train(), "splice": splice(), "lego": invariant_lego(), "cards": cards(), "bestworst": best_worst(),
    }
