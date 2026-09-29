"""Code + animation traces for the CS 146 sorting chapters.

Each function runs the real algorithm and records, for every frame of the
picture, which code lines just ran and what the variables hold. The code on
the left is the same Python the chapter's "Your turn" exercises ask for.

Returns (frames, trace) pairs for TRACE() in the chapter scripts.
"""
from c146common import aframe, rframe, hframe


class _T:
    def __init__(self):
        self.frames, self.lines, self.vars = [], [], []

    def add(self, frame, lines, vs):
        self.frames.append(frame)
        self.lines.append(list(lines))
        self.vars.append({k: str(v) for k, v in vs.items()})

    def out(self, code):
        return self.frames, {"code": code, "lines": self.lines, "vars": self.vars}


def _l(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


# ── Insertion sort (Lectures 2-3) ───────────────────────────────────────────

INSERTION_CODE = """def insertion_sort(a):
    for j in range(1, len(a)):
        key = a[j]
        i = j - 1
        while i >= 0 and a[i] > key:
            a[i + 1] = a[i]     # slide right
            i -= 1
        a[i + 1] = key          # drop in
"""


def insertion_trace(arr):
    a = list(arr)
    n = len(a)
    t = _T()

    def fr(cap, hole=None, key=None, keycol=0, hl=(), done=0, j=None):
        cells = [None if k == hole else a[k] for k in range(n)]
        rows = [
            {"label": "key", "cells": [key] if key is not None else [""], "at": [keycol]},
            {"label": "a", "cells": cells, "hl": list(hl), "done": [k for k in range(done) if k != hole and k not in hl]},
        ]
        return rframe(rows, cap, {"j": [1, j]} if j is not None else None)

    t.add(fr(f"insertion_sort({_l(arr)}). a[0] alone is a sorted hand (green). The loop on line 2 hands us one new card at a time.", done=1), [1], {"a": _l(a)})
    for j in range(1, n):
        key = a[j]
        t.add(fr(f"Line 2 sets j = {j}. Line 3 lifts the key, {key}, out of the array, leaving a hole.", hole=j, key=key, keycol=j, done=j, j=j), [2, 3], {"j": j, "key": key})
        i = j - 1
        t.add(fr(f"Line 4: i = j − 1 = {i}. i points at the card just left of the hole.", hole=j, key=key, keycol=j, done=j, hl=[i], j=j), [4], {"j": j, "key": key, "i": i})
        hole = j
        while i >= 0 and a[i] > key:
            t.add(fr(f"Line 5 checks: i ≥ 0 and a[{i}] = {a[i]} > {key}? **Yes**, so the loop body runs.", hole=hole, key=key, keycol=hole, done=j + 1, hl=[i], j=j), [5], {"j": j, "key": key, "i": i, "a[i]": a[i]})
            a[i + 1] = a[i]
            a[i] = None
            hole = i
            t.add(fr(f"Line 6 copies {a[i + 1]} one slot right, into the hole. The hole is now at index {i}. Line 7 moves i left.", hole=hole, key=key, keycol=hole, done=j + 1, hl=[i + 1], j=j), [6, 7], {"j": j, "key": key, "i": i - 1})
            i -= 1
        why = (f"a[{i}] = {a[i]} > {key}? **No**, so the loop stops." if i >= 0 else "i = −1: nothing left to compare, so the loop stops.")
        t.add(fr(f"Line 5 checks again: {why}", hole=hole, key=key, keycol=hole, done=j + 1, hl=[i] if i >= 0 else [], j=j), [5], {"j": j, "key": key, "i": i})
        a[i + 1] = key
        t.add(fr(f"Line 8 drops {key} into the hole at index {i + 1}. Now a[0..{j}] is sorted.", done=j + 1, hl=[i + 1], j=j), [8], {"j": j, "a": _l(a)})
    t.add(fr(f"j ran past the end, so the for loop on line 2 is done. Sorted: {_l(a)}.", done=n), [2], {"a": _l(a)})
    return t.out(INSERTION_CODE)


# ── Merge (Lecture 4) ───────────────────────────────────────────────────────

MERGE_CODE = """def merge(left, right):
    out = []
    i, j = 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    out.extend(left[i:])     # leftovers
    out.extend(right[j:])
    return out
"""


def merge_trace(L, R):
    t = _T()
    out = []
    i = j = 0
    n = len(L) + len(R)

    def fr(cap, hl_l=(), hl_r=()):
        rows = [
            {"label": "left", "cells": [v if k >= i else None for k, v in enumerate(L)], "hl": list(hl_l)},
            {"label": "right", "cells": [v if k >= j else None for k, v in enumerate(R)], "hl": list(hl_r)},
            {"label": "out", "cells": out + [None] * (n - len(out)), "done": list(range(len(out)))},
        ]
        p = {}
        if i < len(L): p["i"] = [0, i]
        if j < len(R): p["j"] = [1, j]
        return rframe(rows, cap, p)

    t.add(fr(f"merge({_l(L)}, {_l(R)}). Both inputs are already sorted. Lines 2 and 3: an empty output, and two fingers i and j at the front of each pile."), [1, 2, 3], {"i": 0, "j": 0, "out": "[]"})
    while i < len(L) and j < len(R):
        a, b = L[i], R[j]
        t.add(fr(f"Line 4: both piles still have cards, so keep going. Line 5 compares the fronts: left[{i}] = {a} ≤ right[{j}] = {b}? **{'Yes' if a <= b else 'No'}**.", [i], [j]), [4, 5], {"i": i, "j": j, "L[i]": a, "R[j]": b})
        if a <= b:
            out.append(a); i += 1
            t.add(fr(f"Lines 6 and 7: {a} goes to the output and i moves forward. j stays put."), [6, 7], {"i": i, "j": j, "out": _l(out)})
        else:
            out.append(b); j += 1
            t.add(fr(f"Lines 9 and 10: {b} goes to the output and j moves forward. i stays put."), [8, 9, 10], {"i": i, "j": j, "out": _l(out)})
    empty = "left" if i >= len(L) else "right"
    t.add(fr(f"Line 4 fails: {empty} is empty, so the loop ends. Whatever is left in the other pile is already sorted and bigger than everything in out."), [4], {"i": i, "j": j})
    rest_l, rest_r = L[i:], R[j:]
    out += rest_l; i = len(L)
    out += rest_r; j = len(R)
    t.add(fr(f"Lines 11 and 12 copy the leftovers ({_l(rest_l + rest_r)}) straight across, no comparisons. Line 13 returns {_l(out)}. Every card moved exactly once: **O(n)**."), [11, 12, 13], {"out": _l(out)})
    return t.out(MERGE_CODE)


# ── Merge sort's recursion (Lectures 4 and 6) ───────────────────────────────

MERGESORT_CODE = """def merge_sort(a, lo, hi):
    if lo >= hi:
        return                  # 0 or 1 item
    mid = (lo + hi) // 2
    merge_sort(a, lo, mid)      # left half
    merge_sort(a, mid + 1, hi)  # right half
    merge(a, lo, mid, hi)       # combine
"""


def mergesort_trace(arr):
    a = list(arr)
    n = len(a)
    t = _T()
    stack = []
    sorted_runs = set()

    def st():
        return " → ".join(f"ms({lo},{hi})" for lo, hi in stack) or "(empty)"

    def fr(cap, lo, hi, hl=()):
        dim = [k for k in range(n) if k < lo or k > hi]
        done = sorted(k for k in sorted_runs if lo <= k <= hi and k not in hl)
        return aframe(a, cap, hl=list(hl), done=done, dim=dim, ptrs={"lo": lo, "hi": hi})

    def ms(lo, hi):
        stack.append((lo, hi))
        if lo >= hi:
            t.add(fr(f"merge_sort({lo}, {hi}): one item, {a[lo]}. Line 2 is true, so line 3 returns right away. A single item is already sorted.", lo, hi, [lo]), [1, 2, 3], {"lo": lo, "hi": hi, "stack": st()})
            sorted_runs.add(lo)
            stack.pop()
            return
        mid = (lo + hi) // 2
        t.add(fr(f"merge_sort({lo}, {hi}) on {_l(a[lo:hi + 1])}. Line 4: mid = ({lo} + {hi}) // 2 = {mid}. Now line 5 calls itself on the left half, a[{lo}..{mid}]. This call **waits** until that one returns.", lo, hi), [1, 4, 5], {"lo": lo, "hi": hi, "mid": mid, "stack": st()})
        ms(lo, mid)
        t.add(fr(f"Back in merge_sort({lo}, {hi}): the left half is sorted. Line 6 calls itself on the right half, a[{mid + 1}..{hi}].", lo, hi), [6], {"lo": lo, "hi": hi, "mid": mid, "stack": st()})
        ms(mid + 1, hi)
        a[lo:hi + 1] = sorted(a[lo:hi + 1])
        for k in range(lo, hi + 1):
            sorted_runs.add(k)
        t.add(fr(f"Back in merge_sort({lo}, {hi}) again: both halves are sorted, so line 7 merges them. a[{lo}..{hi}] is now {_l(a[lo:hi + 1])}. This call returns to whoever called it.", lo, hi, list(range(lo, hi + 1))), [7], {"lo": lo, "hi": hi, "stack": st()})
        stack.pop()

    ms(0, n - 1)
    t.add(aframe(a, f"The very first call returned: {_l(a)} is sorted. Notice the pattern: calls go DOWN until one item is left, then merges happen on the way back UP. That's the recursion tree, walked left to right.", done=list(range(n))), [7], {"stack": "(empty)"})
    return t.out(MERGESORT_CODE)


# ── heapify (Lecture 8) ─────────────────────────────────────────────────────

HEAPIFY_CODE = """def heapify(a, i, n):
    while True:
        l, r = 2 * i + 1, 2 * i + 2
        largest = i
        if l < n and a[l] > a[largest]:
            largest = l
        if r < n and a[r] > a[largest]:
            largest = r
        if largest == i:
            return
        a[i], a[largest] = a[largest], a[i]
        i = largest
"""


def heapify_trace(arr, i):
    a = list(arr)
    n = len(a)
    t = _T()
    t.add(hframe(a, f"heapify(a, {i}, {n}): a[{i}] = {a[i]} may be smaller than a child. Both subtrees under it are already heaps, so only {a[i]} is out of place.", n, [i]), [1], {"i": i, "n": n})
    while True:
        l, r = 2 * i + 1, 2 * i + 2
        t.add(hframe(a, f"Line 3: the children of index {i} are at {l} and {r}" + (" (both past the end of the heap)." if l >= n else (f" (only {l} exists)." if r >= n else ".")) + f" Line 4 starts with largest = {i}.", n, [i]), [2, 3, 4], {"i": i, "l": l, "r": r, "largest": i})
        big = i
        if l < n:
            win = a[l] > a[big]
            t.add(hframe(a, f"Line 5: is the left child a[{l}] = {a[l]} bigger than a[{big}] = {a[big]}? **{'Yes' if win else 'No'}**." + (f" Line 6: largest = {l}." if win else ""), n, [i, l]), [5, 6] if win else [5], {"i": i, "largest": l if win else big})
            if win: big = l
        if r < n:
            win = a[r] > a[big]
            t.add(hframe(a, f"Line 7: is the right child a[{r}] = {a[r]} bigger than a[{big}] = {a[big]}? **{'Yes' if win else 'No'}**." + (f" Line 8: largest = {r}." if win else ""), n, [big, r]), [7, 8] if win else [7], {"i": i, "largest": r if win else big})
            if win: big = r
        if big == i:
            t.add(hframe(a, f"Line 9: largest is still {i}, so {a[i]} is at least as big as its children. Line 10 returns: the heap is fixed.", n, [i]), [9, 10], {"i": i, "largest": big})
            break
        t.add(hframe(a, f"Line 9: largest = {big}, not {i}. Line 11 swaps a[{i}] = {a[i]} with a[{big}] = {a[big]}: the bigger child moves up.", n, [i, big]), [9, 11], {"i": i, "largest": big})
        a[i], a[big] = a[big], a[i]
        i = big
        t.add(hframe(a, f"Line 12: i = {big}. The sinking value, {a[i]}, is now at index {i}. Back to the top of the loop to check its new children.", n, [i]), [12], {"i": i, "a": _l(a)})
    return t.out(HEAPIFY_CODE)


# ── partition (Lecture 9) ───────────────────────────────────────────────────

PARTITION_CODE = """def partition(a, low, high):
    pivot = a[high]
    i = low - 1
    for j in range(low, high):
        if a[j] <= pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[high] = a[high], a[i + 1]
    return i + 1
"""


def partition_trace(arr, low, high):
    a = list(arr)
    t = _T()
    pivot = a[high]
    i = low - 1

    def fr(cap, hl=(), j=None, final=False):
        done = list(range(low, i + 1))
        warn = [] if final else list(range(i + 1, j if j is not None else high))
        dim = [k for k in range(len(a)) if k < low or k > high]
        p = {}
        if i >= low: p["i"] = i
        if j is not None and j < high: p["j"] = j
        if not final: p["pivot"] = high
        return aframe(a, cap, hl=list(hl), done=done, warn=warn, dim=dim, ptrs=p)

    t.add(fr(f"partition(a, {low}, {high}). Line 2: pivot = a[{high}] = {pivot}. Line 3: i = {i}, so the green '≤ {pivot}' zone starts out empty.", [high], low), [1, 2, 3], {"pivot": pivot, "i": i})
    for j in range(low, high):
        small = a[j] <= pivot
        t.add(fr(f"Line 4: j = {j}. Line 5: is a[{j}] = {a[j]} ≤ {pivot}? **{'Yes' if small else 'No'}**." + ("" if small else f" Skip the body: {a[j]} joins the amber '> {pivot}' zone just by being walked past."), [j], j), [4, 5], {"pivot": pivot, "i": i, "j": j, "a[j]": a[j]})
        if small:
            i += 1
            a[i], a[j] = a[j], a[i]
            t.add(fr(f"Line 6: i = {i}. Line 7 swaps a[{i}] and a[{j}]" + (" (the same slot, so nothing visibly moves)" if i == j else "") + f". The green zone is now a[{low}..{i}].", [i], j + 1), [6, 7], {"pivot": pivot, "i": i, "j": j, "a": _l(a)})
    t.add(fr(f"The for loop is done (j reached {high}, the pivot). Line 8 swaps the pivot into a[i + 1] = a[{i + 1}], right after the green zone.", [high, i + 1], high), [8], {"pivot": pivot, "i": i})
    a[i + 1], a[high] = a[high], a[i + 1]
    p = i + 1
    t.add(aframe(a, f"Line 9 returns {p}. {pivot} sits at its FINAL sorted position: everything left of it is ≤ {pivot}, everything right is bigger.",
                 hl=[p], done=list(range(low, p)), warn=list(range(p + 1, high + 1)), dim=[k for k in range(len(a)) if k < low or k > high], ptrs={"return": p}),
          [9], {"pivot": pivot, "return": p, "a": _l(a)})
    return t.out(PARTITION_CODE)


# ── quicksort's recursion (Lecture 9) ───────────────────────────────────────

QUICKSORT_CODE = """def quicksort(a, lo, hi):
    if lo < hi:
        p = partition(a, lo, hi)
        quicksort(a, lo, p - 1)     # left of pivot
        quicksort(a, p + 1, hi)     # right of pivot
"""


def quicksort_trace(arr):
    a = list(arr)
    n = len(a)
    t = _T()
    final = set()
    stack = []

    def st():
        return " → ".join(f"qs({lo},{hi})" for lo, hi in stack)

    def fr(cap, lo, hi, hl=()):
        dim = [k for k in range(n) if (k < lo or k > hi) and k not in final]
        return aframe(a, cap, hl=list(hl), done=sorted(k for k in final if k not in hl), dim=dim, ptrs={"lo": lo, "hi": hi} if lo <= hi else None)

    def qs(lo, hi):
        stack.append((lo, hi))
        if lo >= hi:
            if lo == hi:
                final.add(lo)
                t.add(fr(f"quicksort({lo}, {hi}): lo < hi is false (one item), so this call does nothing. a[{lo}] = {a[lo]} is final.", lo, hi), [1, 2], {"lo": lo, "hi": hi, "stack": st()})
            else:
                t.add(fr(f"quicksort({lo}, {hi}): an empty range (lo > hi). Line 2 is false, return at once.", lo, hi), [1, 2], {"lo": lo, "hi": hi, "stack": st()})
            stack.pop()
            return
        pivot = a[hi]
        t.add(fr(f"quicksort({lo}, {hi}) on {_l(a[lo:hi + 1])}. Line 2: lo < hi, so line 3 partitions around the last item, {pivot}.", lo, hi, [hi]), [1, 2, 3], {"lo": lo, "hi": hi, "pivot": pivot, "stack": st()})
        i = lo - 1
        for j in range(lo, hi):
            if a[j] <= pivot:
                i += 1
                a[i], a[j] = a[j], a[i]
        a[i + 1], a[hi] = a[hi], a[i + 1]
        p = i + 1
        final.add(p)
        t.add(fr(f"partition returned p = {p}: {pivot} is final. Line 4 now sorts the left side, a[{lo}..{p - 1}]. This call waits.", lo, hi, [p]), [3, 4], {"lo": lo, "hi": hi, "p": p, "stack": st()})
        qs(lo, p - 1)
        t.add(fr(f"Back in quicksort({lo}, {hi}): the left side is done. Line 5 sorts the right side, a[{p + 1}..{hi}].", lo, hi, [p]), [5], {"lo": lo, "hi": hi, "p": p, "stack": st()})
        qs(p + 1, hi)
        stack.pop()

    qs(0, n - 1)
    t.add(aframe(a, f"The first call returned: {_l(a)}. There is no merge step: each partition already put its pivot in place, and the two sides never mix again.", done=list(range(n))), [5], {"stack": "(empty)"})
    return t.out(QUICKSORT_CODE)



# ── Lecture 10: bucket, counting, radix ─────────────────────────────────────

BUCKET_CODE = """def bucket_sort(a):
    n = len(a)
    buckets = [[] for _ in range(n)]
    for x in a:
        buckets[int(n * x)].append(x)
    for b in buckets:
        insertion_sort(b)
    out = []
    for b in buckets:
        out += b
    return out
"""


def _fmt(x):
    return f"{x:.2f}".lstrip("0")


def bucket_trace(arr):
    n = len(arr)
    t = _T()
    buckets = [[] for _ in range(n)]
    out = []

    def fr(cap, hl_a=(), hl_b=None, done_a=()):
        rows = [{"label": "a", "cells": [_fmt(x) for x in arr], "hl": list(hl_a), "done": list(done_a)}]
        for i, b in enumerate(buckets):
            r = {"label": f"B{i}", "cells": [_fmt(x) for x in b] + [None] * (3 - len(b))}
            if hl_b is not None and hl_b[0] == i:
                r["hl"] = [hl_b[1]]
            rows.append(r)
        if out:
            rows.append({"label": "out", "cells": [_fmt(x) for x in out], "done": list(range(len(out)))})
        return rframe(rows, cap)

    t.add(fr(f"bucket_sort on the slide's {n} numbers, all in [0, 1). Lines 2 and 3: n = {n}, so make {n} empty buckets. Bucket i holds the range [i/{n}, (i+1)/{n})."), [1, 2, 3], {"n": n})
    for idx, x in enumerate(arr):
        i = int(n * x + 1e-9)
        buckets[i].append(x)
        t.add(fr(f"Line 5: {_fmt(x)} goes to bucket ⌊{n} × {_fmt(x)}⌋ = ⌊{n * x:.1f}⌋ = **{i}**. No comparisons: arithmetic picks the bucket.", [idx], (i, len(buckets[i]) - 1), range(idx)), [4, 5], {"x": _fmt(x), "n * x": f"{n * x:.1f}", "bucket": i})
    for i, b in enumerate(buckets):
        if len(b) > 1:
            before = [_fmt(x) for x in b]
            b.sort()
            t.add(fr(f"Line 7: bucket {i} has {len(b)} items ({', '.join(before)}). Insertion sort puts them in order. Buckets are tiny, so this is cheap.", done_a=range(n), hl_b=(i, 0)), [6, 7], {"b": f"B{i}", "size": len(b)})
    t.add(fr("The other buckets have 0 or 1 items: already sorted, nothing to do.", done_a=range(n)), [6, 7], {})
    for i, b in enumerate(buckets):
        if b:
            out.extend(b)
    t.add(fr(f"Lines 9 and 10: glue the buckets together in order, 0 to {n - 1}. Every bucket's range is below the next one's, so the result is sorted.", done_a=range(n)), [8, 9, 10, 11], {"out": "[" + ", ".join(_fmt(x) for x in out) + "]"})
    return t.out(BUCKET_CODE)


COUNTING_CODE = """def counting_sort(a, k):
    count = [0] * (k + 1)
    output = [None] * len(a)
    for x in a:
        count[x] += 1
    for v in range(1, k + 1):
        count[v] += count[v - 1]
    for j in reversed(range(len(a))):
        x = a[j]
        output[count[x] - 1] = x
        count[x] -= 1
    return output
"""


def counting_trace(arr, k):
    a = list(arr)
    n = len(a)
    t = _T()
    count = [0] * (k + 1)
    output = [None] * n

    def fr(cap, hl_a=(), hl_c=(), hl_o=(), done_a=()):
        rows = [
            {"label": "a", "cells": a, "hl": list(hl_a), "done": list(done_a)},
            {"label": "count", "cells": list(count), "hl": list(hl_c)},
            {"label": "output", "cells": list(output), "hl": list(hl_o), "done": [i for i in range(n) if output[i] is not None and i not in hl_o]},
        ]
        return rframe(rows, cap)

    t.add(fr(f"counting_sort({_l(a)}, k = {k}). Step 0: count has k + 1 = {k + 1} zeros (one per value 0..{k}); output has n = {n} empty seats."), [1, 2, 3], {"n": n, "k": k})
    for i, x in enumerate(a):
        count[x] += 1
        t.add(fr(f"Step 1: a[{i}] = {x}, so count[{x}] goes up by one, to {count[x]}.", [i], [x], (), range(i)), [4, 5], {"x": x, f"count[{x}]": count[x]})
    t.add(fr(f"Step 1 done: count = {_l(count)} says how many of each value there are: " + ", ".join(f"{c} × {v}" for v, c in enumerate(count)) + "."), [4], {"count": _l(count)})
    for v in range(1, k + 1):
        old = count[v]
        count[v] += count[v - 1]
        t.add(fr(f"Step 2: count[{v}] = count[{v - 1}] + count[{v}] = {count[v - 1]} + {old} = **{count[v]}**. Now {count[v]} items are ≤ {v}.", (), [v - 1, v]), [6, 7], {"v": v, "count": _l(count)})
    t.add(fr(f"Step 2 done: count = {_l(count)} is the cumulative count. Read it as seats: the {count[0]} zeros take seats 0..{count[0] - 1}, and value v's last seat is count[v] − 1."), [6], {"count": _l(count)})
    for j in range(n - 1, -1, -1):
        x = a[j]
        seat = count[x] - 1
        output[seat] = x
        count[x] -= 1
        t.add(fr(f"Step 3, j = {j}: x = {x}. Its seat is count[{x}] − 1 = {seat + 1} − 1 = **{seat}**. Place it, then count[{x}] drops to {count[x]} so the next {x} takes the seat before.", [j], [x], [seat]), [8, 9, 10, 11], {"j": j, "x": x, "seat": seat, "count": _l(count)})
    t.add(fr(f"Done: output = {_l(output)}. Walking j backwards is what keeps equal values in their original order (stable): the last {a[n - 1]} in a got the last seat for its value."), [12], {"output": _l(output)})
    return t.out(COUNTING_CODE)


RADIX_CODE = """def radix_sort(a, d):
    for p in range(d):   # 1s, 10s, 100s
        a = stable_sort(a, digit, p)
    return a

def digit(x, p):
    return (x // 10 ** p) % 10
"""


def radix_trace(arr, d):
    a = list(arr)
    t = _T()
    names = ["1s", "10s", "100s", "1000s"]

    def show(x, p):
        s = str(x).zfill(d)
        i = d - 1 - p
        return s[:i] + "[" + s[i] + "]" + s[i + 1:]

    def fr(cap, p=None, hl=()):
        rows = [{"label": "a", "cells": [show(x, p) if p is not None else str(x).zfill(d) for x in a], "hl": list(hl)}]
        return rframe(rows, cap)

    t.add(fr(f"radix_sort({_l(a)}, d = {d}). Every number has {d} digits. We sort by ONE digit at a time, starting from the right."), [1], {"d": d})
    for p in range(d):
        digits = [(x // 10 ** p) % 10 for x in a]
        t.add(fr(f"Pass {p + 1}: look only at the {names[p]} digit (in brackets): {', '.join(map(str, digits))}.", p), [2, 6, 7], {"p": p, "digits": _l(digits)})
        a = sorted(a, key=lambda x: (x // 10 ** p) % 10)
        t.add(fr(f"Line 3: sort stably by that digit. Ties keep their previous order, which is what the earlier passes built. a = {_l([str(x).zfill(d) for x in a])}.", p, range(len(a))), [3], {"p": p, "a": _l(a)})
    t.add(fr(f"After {d} passes the whole array is sorted: {_l(a)}. d passes × Θ(n + b) each = Θ(d(n + b))."), [4], {"a": _l(a)})
    return t.out(RADIX_CODE)


def TRACE(title, pair):
    """A stepper block with the code panel on the left."""
    from c146common import ST
    frames, trace = pair
    b = ST(title, frames)
    b["trace"] = trace
    return b
