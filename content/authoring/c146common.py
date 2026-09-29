"""Shared bits for the CS 146 rewrite: output path, old-block loader,
callout helpers, the tree-frame helper."""
import json, subprocess, sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
import gb
from gb import *  # noqa

from _paths import REPO as _REPO
REPO = str(_REPO)
gb.OUT = REPO + "/src/study/guides"

_cache = {}
def old_guide(slug):
    """The CS 146 guide as it was before the from-zero rewrite (a snapshot of
    the JSON at that point), so rewrite scripts can reuse its blocks."""
    if slug not in _cache:
        from _paths import SNAPSHOTS
        _cache[slug] = json.load(open(SNAPSHOTS / f"cs146--{slug}.json"))
    return _cache[slug]

def old_section(slug, sid):
    for s in old_guide(slug)["sections"]:
        if s["id"] == sid:
            out = []
            for b in s["blocks"]:
                b = dict(b); b.pop("id", None)
                out.append(clean(b))
            return out
    raise KeyError(sid)

def old_block(slug, sid, pred):
    for b in old_section(slug, sid):
        if pred(b):
            return b
    raise KeyError(sid)

def old_exercises(slug):
    return [clean(dict(e)) for e in old_guide(slug)["exercises"]]

def clean(o):
    """Remove em dashes anywhere in a block or exercise."""
    if isinstance(o, str):
        return o.replace(" — ", ": ").replace("—", ", ")
    if isinstance(o, list):
        return [clean(x) for x in o]
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    return o

def WHY(md, slide=None):
    b = {"type": "prose", "md": md, "label": "why"}
    if slide: b["slide"] = slide
    return b
def WORLD(md, slide=None):
    b = {"type": "prose", "md": md, "label": "world"}
    if slide: b["slide"] = slide
    return b
def THINK(md, slide=None):
    b = {"type": "prose", "md": md, "label": "think"}
    if slide: b["slide"] = slide
    return b
def WHEN(md, slide=None):
    b = {"type": "prose", "md": md, "label": "when"}
    if slide: b["slide"] = slide
    return b

def F(svg_vb, caption, slide=None, notes=None):
    svg, vb = svg_vb
    b = {"type": "figure", "svg": svg, "viewBox": vb, "caption": caption}
    if slide: b["slide"] = slide
    if notes: b["slideNotes"] = notes
    return b

def tree(levels, caption):
    """levels: list of (nodes, hl?, work?)"""
    lv = []
    for L in levels:
        nodes, *rest = L
        d = {"nodes": nodes}
        if rest and rest[0]: d["hl"] = True
        if len(rest) > 1 and rest[1]: d["work"] = rest[1]
        lv.append(d)
    return {"kind": "tree", "levels": lv, "caption": caption}

def with_code(ex):
    """Split 'prompt\\n\\ncode' into prompt + code field so code keeps its lines."""
    if "code" not in ex and "\n\n" in ex["prompt"]:
        p, c = ex["prompt"].split("\n\n", 1)
        ex["prompt"], ex["code"] = p, c
    return ex


# ── Animation frame builders (Stepper animates these: items slide) ────────

def aframe(cells, caption, hl=None, done=None, dim=None, ptrs=None, note=None, warn=None):
    f = {"kind": "array", "cells": list(cells), "caption": caption}
    if hl: f["hl"] = hl
    if done: f["done"] = done
    if warn: f["warn"] = warn
    if dim: f["dim"] = dim
    if ptrs: f["ptrs"] = ptrs
    if note: f["note"] = note
    return f

def rframe(rows, caption, ptrs=None, note=None):
    """rows: list of dicts {label, cells, hl, done, dim}."""
    f = {"kind": "rows", "rows": rows, "caption": caption}
    if ptrs: f["ptrs"] = ptrs
    if note: f["note"] = note
    return f

def bs_frames(vals, target):
    """Binary search, one look per two frames: pick mid, then drop a half."""
    fr = []
    lo, hi = 0, len(vals) - 1
    n = len(vals)
    dim = lambda: [i for i in range(n) if i < lo or i > hi]
    fr.append(aframe(vals, f"Find {target}. The list is sorted. low and high mark the part that could still hold {target}: right now, all {n} items.", dim=dim(), ptrs={"low": lo, "high": hi}, note=f"{hi - lo + 1} candidates"))
    look = 0
    while lo <= hi:
        look += 1
        mid = (lo + hi) // 2
        if vals[mid] == target:
            fr.append(aframe(vals, f"Look {look}: mid = ({lo} + {hi}) / 2 = {mid}. a[{mid}] = {vals[mid]}. Found it, after {look} looks. A left-to-right scan would have needed {mid + 1}.", done=[mid], dim=dim(), ptrs={"low": lo, "mid": mid, "high": hi}, note=f"found at index {mid}"))
            break
        fr.append(aframe(vals, f"Look {look}: mid = ({lo} + {hi}) / 2 = {mid}. a[{mid}] = {vals[mid]}, which is {'bigger' if vals[mid] > target else 'smaller'} than {target}.", hl=[mid], dim=dim(), ptrs={"low": lo, "mid": mid, "high": hi}, note=f"{hi - lo + 1} candidates"))
        if vals[mid] > target:
            hi = mid - 1
            why = f"So {target} can only be LEFT of index {mid}. high = mid − 1 = {hi}. Half the candidates are gone in one comparison."
        else:
            lo = mid + 1
            why = f"So {target} can only be RIGHT of index {mid}. low = mid + 1 = {lo}. Half the candidates are gone in one comparison."
        fr.append(aframe(vals, why, dim=dim(), ptrs={"low": lo, "high": hi}, note=f"{hi - lo + 1} candidates left"))
    return fr

def merge_frames(L, R):
    """Two sorted piles merging into an output row; items fly down."""
    out = [None] * (len(L) + len(R))
    Lc, Rc = list(L), list(R)
    i = j = k = 0
    def rows(hl_l=(), hl_r=(), done_k=None):
        return [
            {"label": "left", "cells": [v if idx >= i else None for idx, v in enumerate(Lc)], "hl": list(hl_l)},
            {"label": "right", "cells": [v if idx >= j else None for idx, v in enumerate(Rc)], "hl": list(hl_r)},
            {"label": "out", "cells": list(out), "done": list(range(k))},
        ]
    def P():
        p = {}
        if i < len(Lc): p["i"] = [0, i]
        if j < len(Rc): p["j"] = [1, j]
        p["k"] = [2, min(k, len(out) - 1)]
        return p
    fr = [rframe(rows(), "Two sorted piles and an empty output. Finger i is on the left pile's front, j on the right pile's front, k on the next output slot.", P())]
    while i < len(Lc) and j < len(Rc):
        a, b = Lc[i], Rc[j]
        fr.append(rframe(rows([i], [j]), f"Compare the two fronts: {a} vs {b}. The smaller one, {min(a, b)}, is the smallest item left anywhere.", P()))
        if a <= b:
            out[k] = a; i += 1
        else:
            out[k] = b; j += 1
        k += 1
        fr.append(rframe(rows(), f"{min(a, b)} moves to the output. Only that pile's finger moves forward.", P()))
    rest = "left" if i < len(Lc) else "right"
    while i < len(Lc):
        out[k] = Lc[i]; i += 1; k += 1
    while j < len(Rc):
        out[k] = Rc[j]; j += 1; k += 1
    fr.append(rframe(rows(), f"The other pile ran out, so the rest of the {rest} pile is copied down in order, no comparisons needed. Every item was copied exactly once: {len(out)} copies, O(n).", {}))
    return fr

def ms_frames(arr):
    """Merge sort as items moving: down one row per level of splitting,
    then back up one row per level of merging, in sorted order. Values must
    be distinct (each item is tracked by its value)."""
    n = len(arr)
    segs = {}
    leafdepth = [0] * n
    def build(lo, hi, d):
        segs.setdefault(d, []).append((lo, hi))
        if lo == hi:
            leafdepth[lo] = d
            return
        mid = (lo + hi) // 2
        build(lo, mid, d + 1); build(mid + 1, hi, d + 1)
    build(0, n - 1, 0)
    D = max(segs)
    # Tidy-tree layout: every piece gets a span as wide as its fully split
    # form (items + gaps), children side by side under it, and the piece's
    # items centered in its span. Rows share one set of columns, so a piece
    # sits right under the piece it came from.
    def span(lo, hi):
        leaves = sum(1 for d in segs for (a, b) in segs[d] if a == b and lo <= a <= hi)
        return (hi - lo + 1) + leaves - 1
    start = {}
    def place(lo, hi, x):
        w = span(lo, hi)
        start[(lo, hi)] = x + (w - (hi - lo + 1)) / 2
        if lo == hi:
            return
        mid = (lo + hi) // 2
        place(lo, mid, x)
        place(mid + 1, hi, x + span(lo, mid) + 1)
    place(0, n - 1, 0)
    cols = span(0, n - 1)

    def col(slot, r):
        for (lo, hi) in segs[r]:
            if lo <= slot <= hi:
                return start[(lo, hi)] + slot - lo
        raise KeyError((slot, r))

    def frame_from(placement, caption, hl_row):
        rows = []
        for r in range(D + 1):
            items = sorted((c, v) for v, (rr, c) in placement.items() if rr == r)
            row = {"label": f"lvl {r}", "cells": [v for _, v in items], "at": [c for c, _ in items]}
            if r == hl_row:
                row["hl"] = list(range(len(items)))
            rows.append(row)
        # an invisible anchor keeps the grid as wide as the whole tree
        rows[0]["cells"].append("")
        rows[0]["at"].append(cols - 1)
        return rframe(rows, caption)

    frames = []
    for k in range(D + 1):
        pl = {}
        for i, v in enumerate(arr):
            r = min(k, leafdepth[i])
            pl[v] = (r, col(i, r))
        if k == 0:
            cap = f"Merge sort on {arr}. Going DOWN it only splits; there are no comparisons yet."
        elif k < D:
            cap = "Split every piece in the middle (the left half gets the extra item). A piece of size 1 stops: it's already sorted."
        else:
            cap = "Every piece is size 1: the base case. Now the real work starts, coming back UP."
        frames.append(frame_from(pl, cap, k))
    vals = list(arr)
    for k in range(D - 1, -1, -1):
        merged = []
        for (lo, hi) in segs[k]:
            if lo != hi:
                vals[lo:hi + 1] = sorted(vals[lo:hi + 1])
                merged.append(vals[lo:hi + 1])
        pl = {}
        for slot, v in enumerate(vals):
            inside = any(lo <= slot <= hi and lo != hi for (lo, hi) in segs[k])
            r = k if inside else leafdepth[slot]
            if not inside and leafdepth[slot] < k:
                r = leafdepth[slot]
            pl[v] = (r, col(slot, r))
        cap = ("Merge each pair of sorted neighbors: " + ", ".join(str(m) for m in merged) + ". Every comparison merge sort makes happens here, on the way up." if k > 0
               else f"The last merge: {vals}. Sorted. {D} levels of merging, each touching all {n} items: about n log n work.")
        frames.append(frame_from(pl, cap, k))
    return frames


def ins_frames(arr):
    """Insertion sort with the key lifted out: bigger items slide right into
    the hole, then the key drops in."""
    a = list(arr)
    n = len(a)
    def fr(hole=None, key=None, keycol=None, hl=(), done=0, cap="", ptrs=None):
        cells = [None if i == hole else a[i] for i in range(n)]
        rows = [
            {"label": "key", "cells": [key] if key is not None else [""], "at": [keycol if keycol is not None else 0]},
            {"label": "a", "cells": cells, "hl": list(hl), "done": [i for i in range(done) if i != hole and i not in hl]},
        ]
        return rframe(rows, cap, ptrs)
    frames = [fr(done=1, cap=f"Insertion sort on {arr}. The first item alone counts as a sorted hand (green).")]
    for j in range(1, n):
        key = a[j]
        frames.append(fr(hole=j, key=key, keycol=j, done=j, cap=f"j = {j}: lift the key, {key}, out of the array. Everything left of the hole, a[0..{j - 1}], is sorted.", ptrs={"j": [1, j]}))
        i = j - 1
        while i >= 0 and a[i] > key:
            a[i + 1] = a[i]
            a[i] = None
            frames.append(fr(hole=i, key=key, keycol=i, done=j + 1, hl=[i + 1], cap=f"{a[i + 1]} > {key}: slide {a[i + 1]} one slot right. The hole moves left.", ptrs={"j": [1, j]}))
            i -= 1
        a[i + 1] = key
        stop = f"{a[i]} ≤ {key}: stop." if i >= 0 else "Nothing left to compare: stop."
        frames.append(fr(done=j + 1, hl=[i + 1], cap=f"{stop} Drop {key} into the hole at index {i + 1}. Now a[0..{j}] is sorted.", ptrs={"j": [1, j]}))
    frames.append(fr(done=n, cap=f"Sorted: {a}. Each key slid left past every bigger item before it."))
    return frames


def stack_frames(cap, ops):
    """Array stack: ops like ('push', 10) or ('pop',)."""
    a = [None] * cap
    top = -1
    frames = []
    def f(caption, hl=()):
        return rframe([{"cells": list(a), "hl": list(hl)}], caption, {"top": [0, top]} if top >= 0 else None, note=f"top = {top}" + (" (empty)" if top < 0 else ""))
    frames.append(f(f"An empty array stack with room for {cap}. top = −1 means nothing is there yet."))
    for op in ops:
        if op[0] == "push":
            top += 1
            a[top] = op[1]
            frames.append(f(f"push({op[1]}): top goes up to {top}, and {op[1]} is written at a[{top}]. One step, O(1).", [top]))
        else:
            v = a[top]
            a[top] = None
            top -= 1
            frames.append(f(f"pop() returns {v}, the most recent item, and top goes down to {top}. Last in, first out.", []))
    return frames


def cqueue_frames(cap, ops):
    """Circular array queue with head and size; ops like ('enq', 'A') / ('deq',)."""
    a = [None] * cap
    head = size = 0
    frames = []
    def f(caption, hl=()):
        p = {"head": [0, head]}
        tail = (head + size - 1) % cap
        if size:
            p["tail"] = [0, tail]
        return rframe([{"cells": list(a), "hl": list(hl)}], caption, p, note=f"head = {head}, size = {size}")
    frames.append(f(f"An empty circular queue, capacity {cap}. head is where the next dequeue reads."))
    for op in ops:
        if op[0] == "enq":
            k = (head + size) % cap
            a[k] = op[1]
            size += 1
            wrap = f" ({head} + {size - 1}) % {cap} = {k}: it wrapped around to the front!" if head + size - 1 >= cap else ""
            frames.append(f(f"enqueue({op[1]}): write at (head + size) % {cap} = {k}.{wrap}", [k]))
        else:
            v = a[head]
            a[head] = None
            old = head
            head = (head + 1) % cap
            size -= 1
            frames.append(f(f"dequeue() returns {v} from a[{old}]; head moves to ({old} + 1) % {cap} = {head}. Nothing shifts.", []))
    return frames


# ── Heap animations ─────────────────────────────────────────────────────────

def hframe(a, caption, size=None, hl=None, note=None):
    f = {"kind": "heap", "a": list(a), "caption": caption}
    if size is not None and size != len(a): f["size"] = size
    if hl: f["hl"] = hl
    if note: f["note"] = note
    return f

def _sink(a, i, n, fr, why="", compact=False):
    while True:
        l, r = 2 * i + 1, 2 * i + 2
        big = i
        if l < n and a[l] > a[big]: big = l
        if r < n and a[r] > a[big]: big = r
        kids = ", ".join(f"{a[c]}" for c in (l, r) if c < n)
        if big == i:
            if compact:
                return
            fr.append(hframe(a, (f"{a[i]} is at least as big as its children ({kids}). The heap property holds: stop." if l < n else f"{a[i]} reached a leaf (index {i} has no children). Stop.") + why, n, [i]))
            return
        if compact:
            v, w = a[i], a[big]
            a[i], a[big] = a[big], a[i]
            fr.append(hframe(a, f"{v} is smaller than its bigger child {w}: swap. {v} sinks to index {big}.", n, [i, big]))
            i = big
            continue
        fr.append(hframe(a, f"heapify({i}): {a[i]} vs its children ({kids}). The largest is {a[big]} at index {big}, and it's bigger than {a[i]}.", n, [i, big]))
        a[i], a[big] = a[big], a[i]
        fr.append(hframe(a, f"Swap: {a[i]} moves up, {a[big]} sinks to index {big}. Keep going from there.", n, [big]))
        i = big

def heapify_frames(a, i):
    a = list(a)
    fr = [hframe(a, f"heapify(a, {i}): a[{i}] = {a[i]} is smaller than a child, but both subtrees below it are already heaps. Let it sink.", len(a), [i])]
    _sink(a, i, len(a), fr)
    return fr

def buildheap_frames(a):
    a = list(a)
    n = len(a)
    first = n // 2 - 1
    fr = [hframe(a, f"buildHeap on {a}. Leaves (index {n // 2} and up) are already tiny heaps. Start at the last non-leaf, index {first}, and walk back to the root.", n)]
    for i in range(first, -1, -1):
        before = list(a)
        fr.append(hframe(a, f"heapify({i}): fix the subtree rooted at index {i} (value {a[i]}).", n, [i]))
        _sink(a, i, n, fr, compact=True)
        if a == before:
            fr[-1]["caption"] += " It's already bigger than its children: nothing moves."
    fr.append(hframe(a, f"Done: {a} is a max-heap. Every parent ≥ its children, and the max, {a[0]}, is at the root.", n, [0]))
    return fr

def heapsort_frames(a):
    a = list(a)
    n = len(a)
    fr = [hframe(a, f"heapSort starts from a max-heap: {a}. The biggest item, {a[0]}, is at the root.", n, [0])]
    for end in range(n - 1, 0, -1):
        fr.append(hframe(a, f"Swap the root ({a[0]}) with the last item of the heap ({a[end]}, index {end}).", end + 1, [0, end]))
        a[0], a[end] = a[end], a[0]
        fr.append(hframe(a, f"{a[end]} is now in its final place at the end (green). The heap shrinks to {end} items; the new root {a[0]} sinks to where it belongs.", end, [0]))
        _sink(a, 0, end, fr, compact=True)
    fr.append(hframe(a, f"Sorted: {a}. n rounds of swap + heapify, each O(log n): O(n log n), all inside one array.", 0))
    return fr

def extract_frames(a):
    a = list(a)
    n = len(a)
    mx = a[0]
    fr = [hframe(a, f"extract() on {a}: the answer is the root, {mx}.", n, [0])]
    a[0], a[n - 1] = a[n - 1], a[0]
    fr.append(hframe(a, f"Move the LAST item ({a[0]}) to the root so the tree stays complete, and take {mx} out.", n - 1, [0]))
    _sink(a, 0, n - 1, fr)
    fr.append(hframe(a[: n - 1], f"extract() returned {mx}. The heap {a[: n - 1]} is valid again after at most log n swaps.", n - 1))
    return fr

def insert_frames(a, v):
    a = list(a) + [v]
    n = len(a)
    i = n - 1
    fr = [hframe(a, f"insert({v}): put it at the end, index {i}, so the tree stays complete. But {v} may be bigger than its parent.", n, [i])]
    while i > 0:
        p = (i - 1) // 2
        if a[p] >= a[i]:
            fr.append(hframe(a, f"Parent {a[p]} ≥ {a[i]}: the heap property holds. Stop.", n, [i, p]))
            return fr
        fr.append(hframe(a, f"Parent {a[p]} (index {p} = ⌊({i} − 1) / 2⌋) is smaller than {a[i]}.", n, [i, p]))
        a[p], a[i] = a[i], a[p]
        fr.append(hframe(a, f"Swap: {a[p]} trickles up to index {p}.", n, [p]))
        i = p
    fr.append(hframe(a, f"{a[0]} reached the root: it's the new maximum. At most log n swaps.", n, [0]))
    return fr


def DG(kind, data, caption, slide=None):
    """A diagram built from the app's own UI (components/study/Diagram.tsx)."""
    b = {"type": "diagram", "kind": kind, "data": data, "caption": caption}
    if slide: b["slide"] = slide
    return b


def dc_frames(arr):
    """Divide and conquer as motion: split, sort each half, merge."""
    n = len(arr)
    h = n // 2
    L, R = arr[:h], arr[h:]
    cols = n + 1
    def row(label, vals=None, at=None, **kw):
        r = {"label": label, "cells": vals or [], "at": at or []}
        r.update(kw)
        return r
    full = list(range(n))
    at_full = [0.5 + i for i in range(n)]
    at_split = [i for i in range(h)] + [h + 1 + i for i in range(n - h)]
    empty = lambda lab: row(lab)
    fr = []
    fr.append(rframe([row("problem", list(arr), at_full), empty("divide"), empty("conquer"), empty("combine")],
                     f"The problem: sort these {n} numbers. Too many to do in one go, so use the recipe."))
    fr.append(rframe([empty("problem"), row("divide", L + R, at_split, hl=list(range(n))), empty("conquer"), empty("combine")],
                     f"1 · DIVIDE: cut it into two smaller copies of the same problem: {L} and {R}."))
    fr.append(rframe([empty("problem"), empty("divide"), row("conquer", sorted(L) + sorted(R), at_split, done=list(range(n))), empty("combine")],
                     f"2 · CONQUER: solve each half the same way (recursion). Now each half is sorted: {sorted(L)} and {sorted(R)}."))
    fr.append(rframe([empty("problem"), empty("divide"), empty("conquer"), row("combine", sorted(arr), at_full, hl=list(range(n)))],
                     f"3 · COMBINE: merge the two sorted halves into the answer, {sorted(arr)}. For merge sort, this step is where the work is."))
    # keep the grid as wide as the split layout
    for f in fr:
        f["rows"][0]["cells"].append("")
        f["rows"][0]["at"].append(cols - 1)
    return fr


def partition_frames(a, low, high, intro=True):
    """Lomuto partition as motion: green ≤ pivot zone, amber > pivot zone."""
    a = list(a)
    pivot = a[high]
    i = low - 1
    fr = []
    def f(cap, hl=(), jj=None, final=False):
        done = list(range(low, i + 1))
        warn = list(range(i + 1, jj if jj is not None else high)) if not final else []
        dim = [k for k in range(len(a)) if k < low or k > high]
        p = {}
        if i >= low: p["i"] = i
        if jj is not None and jj < high: p["j"] = jj
        if not final: p["pivot"] = high
        return aframe(a, cap, hl=list(hl), done=done, warn=warn, dim=dim, ptrs=p, note=f"i = {i}" + (f", j = {jj}" if jj is not None and jj < high else ""))
    if intro:
        fr.append(f(f"partition(a, {low}, {high}): the pivot is the LAST item, {pivot}. i = {i} (the '≤ pivot' zone is empty). j will scout from {low} to {high - 1}.", hl=[high], jj=low))
    for j in range(low, high):
        if a[j] <= pivot:
            fr.append(f(f"j = {j}: {a[j]} ≤ {pivot}. It belongs in the green zone: i++ → {i + 1}, then swap a[{i + 1}] and a[{j}].", hl=[j], jj=j))
            i += 1
            a[i], a[j] = a[j], a[i]
            fr.append(f(f"The green '≤ {pivot}' zone grew to a[{low}..{i}].", hl=[i], jj=j + 1))
        else:
            fr.append(f(f"j = {j}: {a[j]} > {pivot}. Leave it: it joins the amber '> {pivot}' zone. Only j moves on.", hl=[j], jj=j))
    fr.append(f(f"The scout is done. Last move: swap the pivot into a[i + 1] = a[{i + 1}], right after the green zone.", hl=[high, i + 1], jj=high))
    a[i + 1], a[high] = a[high], a[i + 1]
    p = i + 1
    last = aframe(a, f"{pivot} is now at index {p}, its FINAL sorted position: everything left is ≤ {pivot}, everything right is > {pivot}. Return {p}.",
                  done=[k for k in range(low, p)], warn=[k for k in range(p + 1, high + 1)], hl=[p],
                  dim=[k for k in range(len(a)) if k < low or k > high], ptrs={"return": p})
    fr.append(last)
    return fr


def quicksort_frames(a):
    """quicksort, one frame before and after each partition."""
    a = list(a)
    n = len(a)
    final = set()
    fr = [aframe(a, f"quicksort(a, 0, {n - 1}) on {a}. Each call partitions its range, which puts ONE pivot in its final spot, then recurses on the two sides.", ptrs={"low": 0, "high": n - 1})]
    def qs(lo, hi):
        if lo > hi:
            return
        if lo == hi:
            final.add(lo)
            fr.append(aframe(a, f"quicksort({lo}, {hi}): one item is already sorted (base case). a[{lo}] = {a[lo]} is final.", done=sorted(final), dim=[k for k in range(n) if k < lo or k > hi], ptrs={"low": lo}))
            return
        fr.append(aframe(a, f"quicksort({lo}, {hi}): work only on a[{lo}..{hi}]. Pivot = a[{hi}] = {a[hi]}.", hl=[hi], done=sorted(final), dim=[k for k in range(n) if (k < lo or k > hi) and k not in final], ptrs={"low": lo, "high": hi}))
        pivot = a[hi]
        i = lo - 1
        for j in range(lo, hi):
            if a[j] <= pivot:
                i += 1
                a[i], a[j] = a[j], a[i]
        a[i + 1], a[hi] = a[hi], a[i + 1]
        p = i + 1
        final.add(p)
        fr.append(aframe(a, f"After partition: {pivot} lands at index {p}, final. Left of it ≤ {pivot}, right of it > {pivot}. Now recurse on each side.", hl=[p], done=sorted(final - {p}), dim=[k for k in range(n) if (k < lo or k > hi) and k not in final], ptrs={"p": p}))
        qs(lo, p - 1)
        qs(p + 1, hi)
    qs(0, n - 1)
    fr.append(aframe(a, f"Sorted: {a}, in place. No merge step was ever needed: once both sides of every pivot are sorted, everything is.", done=list(range(n))))
    return fr
