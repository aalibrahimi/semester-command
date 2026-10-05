"""AVL trees for CS 146 Lecture 13: a real AVL implementation that records
stepper frames as it runs, so every height, balance, case and rotation in
the chapter is computed, not typed.

Poon's conventions (Lecture 13 slides):
  H(node) = edges on the longest path down to a leaf; H(null) = -1, a new
            leaf has H = 0.
  B(node) = H(left) - H(right). |B| <= 1 is balanced; B > 1 left-heavy,
            B < -1 right-heavy.
  insert: BST insert, then go back up updating H and rebalancing with the
          LL / LR / RR / RL table (decided by comparing the new key with the
          heavy child's key). Duplicates are ignored.
  delete: BST delete (successor for two children), then go back up updating
          H and rebalancing; the case is decided by B(y) of the heavier child
          (LL if B(y) >= 0, LR if < 0; RR if B(y) <= 0, RL if > 0).
"""
from cs146_12_trace import _T


def node(k):
    return {"k": k, "l": None, "r": None, "h": 0}


def H(n):
    return -1 if n is None else n["h"]


def B(n):
    return H(n["l"]) - H(n["r"])


def fix_h(n):
    n["h"] = 1 + max(H(n["l"]), H(n["r"]))


def right_rotate(x):
    y = x["l"]
    temp = y["r"]
    y["r"] = x
    x["l"] = temp
    fix_h(x)          # child first
    fix_h(y)
    return y


def left_rotate(x):
    y = x["r"]
    temp = y["l"]
    y["l"] = x
    x["r"] = temp
    fix_h(x)
    fix_h(y)
    return y


def plain(t):
    """{k, l, r} only: what the bst frame draws."""
    if t is None:
        return None
    return {"k": t["k"], "l": plain(t["l"]), "r": plain(t["r"])}


def keys(t, out=None):
    out = [] if out is None else out
    if t:
        keys(t["l"], out); out.append(t["k"]); keys(t["r"], out)
    return out


def walk_nodes(t):
    if t:
        yield t
        yield from walk_nodes(t["l"])
        yield from walk_nodes(t["r"])


def tags(t, b_for=None):
    """'H 2 · B +1' under every node (B only for nodes in b_for, when given)."""
    out = {}
    for n in walk_nodes(t):
        s = f"H {n['h']}"
        if b_for is None or n["k"] in b_for:
            s += f" · B {B(n):+d}".replace("+0", "0")
        out[str(n["k"])] = s
    return out


def frame(t, caption, hl=None, path=None, done=None, warn=None, note=None, b_for=None):
    f = {"kind": "bst", "root": plain(t), "caption": caption, "tags": tags(t, b_for)}
    if hl: f["hl"] = list(hl)
    if path: f["path"] = list(path)
    if done: f["done"] = list(done)
    if warn: f["warn"] = list(warn)
    if note: f["note"] = note
    return f


def is_avl(t):
    """BST order + |B| <= 1 + stored heights correct, everywhere."""
    ks = keys(t)
    if ks != sorted(ks) or len(set(ks)) != len(ks):
        return False
    for n in walk_nodes(t):
        if abs(B(n)) > 1 or n["h"] != 1 + max(H(n["l"]), H(n["r"])):
            return False
    return True


# ── plain (no frames) insert and delete, used for checking and HW answers ──

def insert_plain(t, k):
    if t is None:
        return node(k)
    if k < t["k"]:
        t["l"] = insert_plain(t["l"], k)
    elif k > t["k"]:
        t["r"] = insert_plain(t["r"], k)
    else:
        return t
    fix_h(t)
    b = B(t)
    if b > 1:
        if k < t["l"]["k"]:
            return right_rotate(t)
        t["l"] = left_rotate(t["l"])
        return right_rotate(t)
    if b < -1:
        if k > t["r"]["k"]:
            return left_rotate(t)
        t["r"] = right_rotate(t["r"])
        return left_rotate(t)
    return t


def build(ks):
    t = None
    for k in ks:
        t = insert_plain(t, k)
    return t


def rebalance_delete(t):
    fix_h(t)
    b = B(t)
    if b > 1:
        if B(t["l"]) >= 0:
            return right_rotate(t)
        t["l"] = left_rotate(t["l"])
        return right_rotate(t)
    if b < -1:
        if B(t["r"]) <= 0:
            return left_rotate(t)
        t["r"] = right_rotate(t["r"])
        return left_rotate(t)
    return t


def delete_plain(t, k):
    if t is None:
        return None
    if k < t["k"]:
        t["l"] = delete_plain(t["l"], k)
    elif k > t["k"]:
        t["r"] = delete_plain(t["r"], k)
    else:
        if t["l"] is None or t["r"] is None:
            t = t["l"] or t["r"]
        else:
            s = t["r"]
            while s["l"]:
                s = s["l"]
            t["k"] = s["k"]
            t["r"] = delete_plain(t["r"], s["k"])
    if t is None:
        return None
    return rebalance_delete(t)


def from_shape(spec):
    """A tree from nested tuples (key, left, right), heights filled in. For
    the slide's hand-drawn starting trees."""
    if spec is None:
        return None
    if isinstance(spec, int):
        spec = (spec, None, None)
    k, l, r = spec
    n = {"k": k, "l": from_shape(l), "r": from_shape(r), "h": 0}
    fix_h(n)
    return n


def clone(t):
    return None if t is None else {"k": t["k"], "l": clone(t["l"]), "r": clone(t["r"]), "h": t["h"]}


def levels(t):
    """'Level 0: 20 (H 2, B +1) · Level 1: …' for exercise answers."""
    rows, q, d = [], [t], 0
    while any(q):
        rows.append(f"Level {d}: " + ", ".join(f"{n['k']} (H {n['h']}, B {B(n):+d})".replace("+0", "0") for n in q if n))
        q = [c for n in q if n for c in (n["l"], n["r"])]
        d += 1
    return "\n".join(rows)


# ── recorded insert ─────────────────────────────────────────────────────────

INSERT_CODE = """def insert(node, key):
    if node is None:
        return Node(key)               # new leaf, H = 0
    if key < node.key:
        node.left = insert(node.left, key)
    elif key > node.key:
        node.right = insert(node.right, key)
    else:
        return node                    # ignore duplicates
    node.h = 1 + max(H(node.left), H(node.right))
    b = H(node.left) - H(node.right)
    if b > 1:                          # left-heavy
        if key < node.left.key:        # LL
            return right_rotate(node)
        node.left = left_rotate(node.left)     # LR
        return right_rotate(node)
    if b < -1:                         # right-heavy
        if key > node.right.key:       # RR
            return left_rotate(node)
        node.right = right_rotate(node.right)  # RL
        return left_rotate(node)
    return node
"""


class Tree:
    """Holds the whole tree so a frame can be drawn in the middle of an
    operation; `relink` does what the recursive return does (the parent
    re-points its child link at the subtree's new root)."""
    def __init__(self, t=None):
        self.t = t

    def relink(self, parent, old, new):
        if parent is None:
            self.t = new
        elif parent["l"] is old:
            parent["l"] = new
        else:
            parent["r"] = new


def insert_trace(tree, key, tr=None, brief=False):
    """Insert `key` into `tree` (a Tree), recording frames into tr (a _T).
    brief: fewer frames, for the later keys of a long sequence."""
    tr = tr or _T()
    stack, n = [], tree.t
    v = {"key": key}
    if not brief:
        tr.add(frame(tree.t, f"insert({key}). Step 1 is a plain BST insert: walk down (smaller left, bigger right) to an empty spot.") if tree.t else
               {"kind": "bst", "root": None, "caption": f"insert({key}) into an empty tree."}, [1], v)
    while n:
        stack.append(n)
        go = "left" if key < n["k"] else "right"
        if not brief:
            tr.add(frame(tree.t, f"{key} {'<' if go == 'left' else '>'} {n['k']}: go {go}.", hl=[n["k"]], path=[s["k"] for s in stack[:-1]]), [4, 5] if go == "left" else [4, 6, 7], {**v, "node.key": n["k"]})
        n = n["l"] if go == "left" else n["r"]
    new = node(key)
    if not stack:
        tree.t = new
    elif key < stack[-1]["k"]:
        stack[-1]["l"] = new
    else:
        stack[-1]["r"] = new
    tr.add(frame(tree.t, f"Empty spot: {key} becomes a new leaf with H = 0." + ("" if not stack else f" Now step 2: go back UP the path, updating H and checking B at every node."), hl=[key], path=[s["k"] for s in stack], b_for={key}), [2, 3], v)
    checked = {key}
    rotated = None
    for i in range(len(stack) - 1, -1, -1):
        x = stack[i]
        parent = stack[i - 1] if i > 0 else None
        fix_h(x)
        checked.add(x["k"])
        b = B(x)
        if abs(b) <= 1:
            if not brief:
                tr.add(frame(tree.t, f"Back at {x['k']}: H = 1 + max(H(left), H(right)) = {x['h']}, B = {H(x['l'])} − ({H(x['r'])}) = {b}. Balanced, keep going up.".replace("− (-", "− (−").replace("= -", "= −"), hl=[x["k"]], path=[s["k"] for s in stack[:i]], b_for=checked), [10, 11, 22], {**v, "node.key": x["k"], "b": b})
            continue
        side = "left" if b > 1 else "right"
        child = x["l"] if b > 1 else x["r"]
        outer = (key < child["k"]) if b > 1 else (key > child["k"])
        case = ("LL" if outer else "LR") if b > 1 else ("RR" if outer else "RL")
        tr.add(frame(tree.t, f"At {x['k']}: B = {b}. **Imbalance!** {x['k']} is {side}-heavy. The new key {key} went into the {side} child {child['k']}'s {'outer' if outer else 'inner'} side ({'left' if (key < child['k']) else 'right'} of {child['k']}): case **{case}**.", hl=[x["k"]], warn=[x["k"]], path=[s["k"] for s in stack[:i]], b_for=checked),
               [10, 11, 12, 13] if b > 1 else [10, 11, 17, 18], {**v, "node.key": x["k"], "b": b})
        if case in ("LR", "RL"):
            rot = "left_rotate" if case == "LR" else "right_rotate"
            newc = left_rotate(child) if case == "LR" else right_rotate(child)
            if b > 1: x["l"] = newc
            else: x["r"] = newc
            tr.add(frame(tree.t, f"{case} needs two rotations. First {rot}({child['k']}): now the heavy side is straight, the same shape as case {'LL' if case == 'LR' else 'RR'}.", hl=[newc["k"]], warn=[x["k"]], b_for=checked | {newc["k"]}), [15] if case == "LR" else [20], {**v, "node.key": x["k"]})
        y = right_rotate(x) if b > 1 else left_rotate(x)
        tree.relink(parent, x, y)
        rot = "right_rotate" if b > 1 else "left_rotate"
        tr.add(frame(tree.t, f"{rot}({x['k']}): {y['k']} moves up and {x['k']} becomes its {'right' if b > 1 else 'left'} child. Heights are updated child first, then parent. The subtree is balanced again.", hl=[y["k"]], done=[x["k"]], b_for={n2['k'] for n2 in walk_nodes(y)} | checked), [16] if case in ("LL", "LR") and case == "LR" else [14] if case == "LL" else [19] if case == "RR" else [21], {**v})
        rotated = case
        # after one rotation set on insert, heights above are back to what they were: no more rotations
        for j in range(i - 1, -1, -1):
            fix_h(stack[j])
        break
    if tree.t:
        tr.add(frame(tree.t, f"Done inserting {key}." + (f" One rotation set ({rotated}) fixed it, and the heights above are back to what they were, so nothing else changes." if rotated else " No rotation needed: every node on the path has |B| ≤ 1."), done=[key], b_for=None), [22], v)
    assert is_avl(tree.t), keys(tree.t)
    return tr, rotated


# ── recorded delete (for the cascading example) ────────────────────────────

def delete_trace(tree, key, tr=None):
    """Delete `key` (leaf or one-child cases, which is all the slide example
    needs), then walk up updating H and rebalancing with the delete table."""
    tr = tr or _T()
    stack, n = [], tree.t
    while n and n["k"] != key:
        stack.append(n)
        n = n["l"] if key < n["k"] else n["r"]
    assert n is not None and (n["l"] is None or n["r"] is None), "trace handles leaf / one child only"
    tr.add(frame(tree.t, f"delete({key}). Step 1 is a plain BST delete: find {key} and remove it ({'a leaf' if not (n['l'] or n['r']) else 'one child takes its place'}).", hl=[key], warn=[key], path=[s["k"] for s in stack]), [], {"key": key})
    repl = n["l"] or n["r"]
    tree.relink(stack[-1] if stack else None, n, repl)
    checked = set()
    sets = 0
    for i in range(len(stack) - 1, -1, -1):
        x = stack[i]
        parent = stack[i - 1] if i > 0 else None
        old_h = x["h"]
        fix_h(x)
        checked.add(x["k"])
        b = B(x)
        if abs(b) <= 1:
            tr.add(frame(tree.t, f"Up to {x['k']}: H = {x['h']}" + (f" (was {old_h}: the height loss keeps travelling up)" if x["h"] != old_h else "") + f", B = {b}. Balanced.".replace("= -", "= −"), hl=[x["k"]], path=[s["k"] for s in stack[:i]], b_for=checked), [], {"key": key})
            continue
        heavy = x["l"] if b > 1 else x["r"]
        by = B(heavy)
        if b > 1:
            case = "LL" if by >= 0 else "LR"
        else:
            case = "RR" if by <= 0 else "RL"
        rule = ("B(y) ≥ 0" if case == "LL" else "B(y) < 0") if b > 1 else ("B(y) ≤ 0" if case == "RR" else "B(y) > 0")
        tr.add(frame(tree.t, f"Up to {x['k']}: B = {b}. **Imbalance.** The heavier child is y = {heavy['k']} with B(y) = {by}, so {rule}: case **{case}**.".replace("= -", "= −"), hl=[x["k"]], warn=[x["k"]], path=[s["k"] for s in stack[:i]], b_for=checked | {heavy["k"]}), [], {"key": key})
        if case in ("LR", "RL"):
            newc = left_rotate(heavy) if case == "LR" else right_rotate(heavy)
            if b > 1: x["l"] = newc
            else: x["r"] = newc
        y = right_rotate(x) if b > 1 else left_rotate(x)
        tree.relink(parent, x, y)
        sets += 1
        rot = {"LL": f"rightRotate({x['k']})", "RR": f"leftRotate({x['k']})", "LR": f"leftRotate({heavy['k']}), rightRotate({x['k']})", "RL": f"rightRotate({heavy['k']}), leftRotate({x['k']})"}[case]
        tr.add(frame(tree.t, f"{'First' if sets == 1 else 'Second (cascading)'} rotation set: {rot}. {y['k']} takes {x['k']}'s place. This subtree is now {y['h']} tall" + (f", down from {old_h}: the parent above may now be unbalanced too." if y["h"] < old_h else "."), hl=[y["k"]], done=[x["k"]], path=[s["k"] for s in stack[:i]], b_for=checked | {m["k"] for m in walk_nodes(y)}), [], {"key": key})
        stack[i] = y
    tr.add(frame(tree.t, f"Final tree after delete({key}): {sets} rotation set{'s' if sets != 1 else ''}. Every node has |B| ≤ 1 again.", b_for=None), [], {"key": key})
    assert is_avl(tree.t)
    return tr, sets


# ── standalone frames ──────────────────────────────────────────────────────

def heights_frames():
    """Lecture 13 slides 12 to 17 on Lecture 12's example tree."""
    from cs146_12_trace import EXAMPLE_KEYS
    t = None
    # plain BST insert (no balancing): the example tree is NOT an AVL tree
    def bst_ins(t, k):
        if t is None:
            return node(k)
        if k < t["k"]: t["l"] = bst_ins(t["l"], k)
        else: t["r"] = bst_ins(t["r"], k)
        fix_h(t)
        return t
    for k in EXAMPLE_KEYS:
        t = bst_ins(t, k)
    fr = [frame(t, "Lecture 12's example tree, with every node's height H. A leaf has H = 0. H(node) = edges on the longest path down to a leaf.", b_for=set())]
    for k, note in [(6, "B(6) = H(3) − H(7) = 1 − 2 = −1. Balanced."), (13, "B(13) = H(9) − H(null) = 0 − (−1) = 1. Balanced."), (9, "B(9) = H(null) − H(null) = −1 − (−1) = 0. Balanced."), (15, "B(15) = H(6) − H(18) = 3 − 1 = 2. NOT balanced: this tree is a BST but not an AVL tree.")]:
        fr.append(frame(t, note, hl=[k], warn=[k] if k == 15 else None, b_for={k}))
    return fr, t
