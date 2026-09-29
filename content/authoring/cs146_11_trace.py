"""Code-trace steppers for CS 146 Lecture 11 (code left, picture right)."""
from c146common import rframe

CHAIN_CODE = """def h(k):
    return k % m        # m = 10

def insert(k, v):
    j = h(k)
    node = Node(k, v)
    node.next = T[j]    # old head
    T[j] = node         # new head

def search(k):
    j = h(k)
    node = T[j]
    while node is not None:
        if node.key == k:
            return node.value
        node = node.next
    return None
"""


def _rows(T, m, node=None, hl=None, extra_hl=None):
    rows = []
    for i in range(m):
        c = [str(k) for k in T[i]]
        r = {"label": f"T[{i}]", "cells": c + [None] * (3 - len(c))}
        if hl and hl[0] == i:
            r["hl"] = [hl[1]]
        if extra_hl and extra_hl[0] == i:
            r["done"] = [extra_hl[1]]
        rows.append(r)
    if node is not None:
        c = [str(x) for x in node]
        rows.append({"label": "node", "cells": c + [None] * (3 - len(c)), "hl": [0]})
    return rows


def chaining_trace():
    m = 10
    T = [[] for _ in range(m)]
    V = {}
    frames, lines, vars_ = [], [], []

    def add(rows, cap, ln, vs):
        frames.append(rframe(rows, cap)); lines.append(ln); vars_.append(vs)

    add(_rows(T, m), "An empty table of m = 10 chains. Watch the lit line on the left: that's the line running right now.", [1, 2], {"m": "10"})
    for k, v in [(42, "a"), (17, "b"), (82, "c"), (37, "d")]:
        V[k] = v
        j = k % m
        add(_rows(T, m), f"insert({k}, '{v}'): first compute the slot. h({k}) = {k} % 10 = **{j}**.", [4, 5, 1, 2], {"k": str(k), "v": f"'{v}'", "j": str(j)})
        add(_rows(T, m, node=[k]), f"Make a new node holding ({k}, '{v}'). It isn't in the table yet.", [6], {"k": str(k), "v": f"'{v}'", "j": str(j), "node": f"({k}, '{v}')"})
        old = T[j]
        cap = (f"node.next = T[{j}]: the new node points at the old head, {old[0]}. Nothing is overwritten." if old
               else f"node.next = T[{j}]: chain {j} is empty, so next is null.")
        add(_rows(T, m, node=[k] + old), cap, [7], {"k": str(k), "j": str(j), "node.next": str(old[0]) if old else "null"})
        T[j] = [k] + old
        add(_rows(T, m, hl=(j, 0)), f"T[{j}] = node: the new node is now the head of chain {j}. Two pointer moves, no walking: **O(1)**.", [8], {"k": str(k), "j": str(j), f"T[{j}]": " → ".join(map(str, T[j]))})
    # search 17
    add(_rows(T, m), "search(17): compute the slot. h(17) = 17 % 10 = **7**.", [10, 11, 1, 2], {"k": "17", "j": "7"})
    add(_rows(T, m, hl=(7, 0)), "node = T[7]: start at the head of chain 7, which is 37.", [12], {"k": "17", "j": "7", "node": "37"})
    add(_rows(T, m, hl=(7, 0)), "node isn't null, so check it: is 37 == 17? No.", [13, 14], {"k": "17", "node.key": "37"})
    add(_rows(T, m, hl=(7, 1)), "node = node.next: move one step down the chain, to 17.", [16], {"k": "17", "node": "17"})
    add(_rows(T, m, hl=(7, 1)), "Is 17 == 17? Yes: return 'b'. It took 2 looks because chain 7 has length 2.", [13, 14, 15], {"k": "17", "node.key": "17", "return": "'b'"})
    add(_rows(T, m), "search(64): h(64) = 4, and T[4] is empty, so node = null.", [10, 11, 12], {"k": "64", "j": "4", "node": "null"})
    add(_rows(T, m), "The while loop never runs: return None. An empty chain costs one look.", [13, 17], {"k": "64", "return": "None"})
    return frames, {"code": CHAIN_CODE, "lines": lines, "vars": vars_}


RESIZE_CODE = """def insert(k, v):
    global n
    if (n + 1) / m > 0.75:   # too full?
        resize(2 * m)
    j = k % m
    T[j].insert(0, (k, v))   # at head
    n += 1

def resize(new_m):
    global T, m
    old = T
    T = [[] for _ in range(new_m)]
    m = new_m
    for chain in old:
        for (k, v) in chain:
            T[k % m].insert(0, (k, v))
"""


def _rrows(T, m, old=None, hl=None):
    rows = []
    if old is not None:
        for i, ch in enumerate(old):
            c = [str(k) for k in ch]
            rows.append({"label": f"old[{i}]", "cells": c + [None] * (2 - len(c)), "dim": list(range(len(c)))})
        rows.append({"label": "", "cells": [""]})
    for i in range(m):
        c = [str(k) for k in T[i]]
        r = {"label": f"T[{i}]", "cells": c + [None] * (2 - len(c))}
        if hl and hl[0] == i:
            r["hl"] = [hl[1]]
        rows.append(r)
    return rows


def resize_trace():
    m, n = 4, 0
    T = [[] for _ in range(m)]
    frames, lines, vars_ = [], [], []

    def add(rows, cap, ln, vs):
        frames.append(rframe(rows, cap)); lines.append(ln); vars_.append(vs)

    add(_rrows(T, m), "Start with m = 4 empty chains and α_max = 0.75. We'll insert 5, 12, 7, then 20.", [1], {"n": "0", "m": "4"})
    for k in [5, 12, 7]:
        a = (n + 1) / m
        add(_rrows(T, m), f"insert({k}): check first. (n + 1) / m = {n + 1}/{m} = {a:.2f}. Not above 0.75, so no resize.", [3], {"k": str(k), "n": str(n), "m": str(m), "(n+1)/m": f"{a:.2f}"})
        j = k % m
        T[j] = [k] + T[j]
        n += 1
        add(_rrows(T, m, hl=(j, 0)), f"j = {k} % {m} = {j}. Put {k} at the head of chain {j}, and n becomes {n}.", [5, 6, 7], {"k": str(k), "j": str(j), "n": str(n), "α": f"{n}/{m} = {n / m:.2f}"})
    add(_rrows(T, m), "insert(20): (n + 1) / m = 4/4 = 1.00. That's above 0.75: this insert would overfill the table.", [3], {"k": "20", "n": "3", "m": "4", "(n+1)/m": "1.00"})
    add(_rrows(T, m), "So call resize(2 * m) = resize(8) BEFORE inserting 20.", [4, 9], {"new_m": "8"})
    old = T
    T = [[] for _ in range(8)]
    m = 8
    add(_rrows(T, m, old=old), "Keep the old chains as `old`, make 8 new empty chains, set m = 8. Every key has to be re-hashed, because k % 8 is not k % 4.", [11, 12, 13], {"m": "8", "old": "4 chains"})
    for i, ch in enumerate(old):
        for k in list(ch):
            j = k % m
            T[j] = [k] + T[j]
            old[i] = [x for x in old[i] if x != k]
            add(_rrows(T, m, old=old, hl=(j, 0)), f"Re-insert {k}: {k} % 8 = {j} (it was in slot {k % 4} before). Every key is copied once: resize is **O(n)**.", [14, 15, 16], {"k": str(k), "k % 8": str(j)})
    j = 20 % 8
    T[j] = [20] + T[j]
    n += 1
    add(_rrows(T, m, hl=(j, 0)), f"Back in insert: j = 20 % 8 = {j}, add 20 at the head, n = 4. Now α = 4/8 = 0.50: short chains again.", [5, 6, 7], {"k": "20", "j": str(j), "n": "4", "α": "0.50"})
    return frames, {"code": RESIZE_CODE, "lines": lines, "vars": vars_}
