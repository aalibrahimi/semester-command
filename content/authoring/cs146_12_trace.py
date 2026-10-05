"""Binary search tree steppers and code traces for CS 146 Lecture 12.

Trees are nested dicts {"k": key, "l": left, "r": right}. Every function
runs the real operation and records one frame per step, so the pictures
can't disagree with the algorithm. The code panels are Poon's pseudocode
from the slides, written as Python.
"""
import copy

# ── Tree helpers ────────────────────────────────────────────────────────────


def node(k, l=None, r=None):
    return {"k": k, "l": l, "r": r}


def insert_plain(t, k):
    if t is None:
        return node(k)
    if k < t["k"]:
        t["l"] = insert_plain(t["l"], k)
    else:
        t["r"] = insert_plain(t["r"], k)
    return t


def build(keys):
    t = None
    for k in keys:
        t = insert_plain(t, k)
    return t


def clean(t):
    """The frame form: drop empty children so the JSON stays small."""
    if t is None:
        return None
    out = {"k": t["k"]}
    if t["l"]:
        out["l"] = clean(t["l"])
    if t["r"]:
        out["r"] = clean(t["r"])
    return out


def inorder(t):
    return [] if t is None else inorder(t["l"]) + [t["k"]] + inorder(t["r"])


def preorder(t):
    return [] if t is None else [t["k"]] + preorder(t["l"]) + preorder(t["r"])


def postorder(t):
    return [] if t is None else postorder(t["l"]) + postorder(t["r"]) + [t["k"]]


def height(t):
    """Edges on the longest root-to-leaf path (Poon's definition); empty = -1."""
    return -1 if t is None else 1 + max(height(t["l"]), height(t["r"]))


def delete_plain(t, k):
    if t is None:
        return None
    if k < t["k"]:
        t["l"] = delete_plain(t["l"], k)
    elif k > t["k"]:
        t["r"] = delete_plain(t["r"], k)
    else:
        if t["l"] is None:
            return t["r"]
        if t["r"] is None:
            return t["l"]
        s = t["r"]
        while s["l"]:
            s = s["l"]
        t["k"] = s["k"]
        t["r"] = delete_plain(t["r"], s["k"])
    return t


# Poon's running example (the CLRS tree with 5 in place of 4)
EXAMPLE_KEYS = [15, 6, 18, 3, 7, 17, 20, 2, 5, 13, 9]


def example():
    return build(EXAMPLE_KEYS)


def bframe(t, caption, hl=None, path=None, done=None, warn=None, out=None, out_label=None, note=None):
    f = {"kind": "bst", "root": clean(t), "caption": caption}
    if hl: f["hl"] = list(hl)
    if path: f["path"] = list(path)
    if done: f["done"] = list(done)
    if warn: f["warn"] = list(warn)
    if out is not None: f["out"] = list(out)
    if out_label: f["outLabel"] = out_label
    if note: f["note"] = note
    return f


class _T:
    def __init__(self):
        self.frames, self.lines, self.vars = [], [], []

    def add(self, frame, lines, vs):
        self.frames.append(frame)
        self.lines.append(list(lines))
        self.vars.append({k: str(v) for k, v in vs.items()})

    def out(self, code):
        return self.frames, {"code": code, "lines": self.lines, "vars": self.vars}


# ── search ─────────────────────────────────────────────────────────────────

SEARCH_CODE = """def search(root, key):
    if root is None or root.key == key:
        return root
    if key < root.key:
        return search(root.left, key)
    if key > root.key:
        return search(root.right, key)
"""


def search_trace(key, t=None):
    t = t or example()
    tr = _T()
    path = []
    cur = t
    tr.add(bframe(t, f"search(root, {key}). Start at the root and compare. Every step goes down ONE level, left or right."), [1], {"key": key})
    while True:
        if cur is None:
            tr.add(bframe(t, f"root is None: we fell off the tree. {key} is not in it. Return None.", path=path), [2, 3], {"key": key, "root": "None"})
            break
        path.append(cur["k"])
        if cur["k"] == key:
            tr.add(bframe(t, f"root.key == {key}: found it. Return this node. {len(path)} nodes looked at, one per level.", hl=[key], path=path[:-1]), [2, 3], {"key": key, "root.key": cur["k"]})
            break
        go = "left" if key < cur["k"] else "right"
        tr.add(bframe(t, f"{key} {'<' if go == 'left' else '>'} {cur['k']}, so everything that could match is in the {go} subtree. The other side is never looked at.", hl=[cur["k"]], path=path[:-1]),
               [2, 4, 5] if go == "left" else [2, 4, 6, 7], {"key": key, "root.key": cur["k"], "go": go})
        cur = cur["l"] if go == "left" else cur["r"]
    return tr.out(SEARCH_CODE)


# ── traversals ─────────────────────────────────────────────────────────────

INORDER_CODE = """def inorder(node):
    if node is None:
        return
    inorder(node.left)     # 1. everything smaller
    visit(node)            # 2. this node
    inorder(node.right)    # 3. everything bigger
"""


def inorder_trace(t=None):
    t = t or example()
    tr = _T()
    out = []
    tr.add(bframe(t, "In-order: left subtree, then the node, then the right subtree. Watch the output row fill up in sorted order.", out=[], out_label="in-order"), [1], {})

    def go(n, stack):
        if n is None:
            return
        tr.add(bframe(t, f"inorder({n['k']}): before visiting {n['k']}, finish its whole LEFT subtree first." + (" It has none." if not n["l"] else ""), hl=[n["k"]], path=stack, done=out, out=out, out_label="in-order"), [1, 2, 4], {"node": n["k"], "waiting": " → ".join(map(str, stack)) or "-"})
        go(n["l"], stack + [n["k"]])
        out.append(n["k"])
        tr.add(bframe(t, f"Left side done: visit {n['k']}. Output so far: {', '.join(map(str, out))}.", hl=[n["k"]], path=stack, done=out[:-1], out=out, out_label="in-order"), [5], {"node": n["k"], "visited": len(out)})
        go(n["r"], stack + [n["k"]])

    go(t, [])
    tr.add(bframe(t, f"Done: {', '.join(map(str, out))}. In-order on a BST always comes out SORTED: that's the BST property, read left to right.", done=out, out=out, out_label="in-order"), [6], {"visited": len(out)})
    return tr.out(INORDER_CODE)


def order_frames(kind, t=None):
    """Pre- or post-order as a plain stepper: the output row grows node by node."""
    t = t or example()
    seq = preorder(t) if kind == "pre" else postorder(t)
    rule = "visit the node FIRST, then its left subtree, then its right" if kind == "pre" else "left subtree, then right subtree, and the node LAST"
    fr = [bframe(t, f"{'Pre' if kind == 'pre' else 'Post'}-order: {rule}.", out=[], out_label=f"{kind}-order")]
    for i, k in enumerate(seq):
        why = ""
        if kind == "pre":
            why = "the root comes first" if i == 0 else "a node is written the moment you arrive at it"
        else:
            why = "a node is written only after both of its subtrees are finished"
        fr.append(bframe(t, f"Visit {k}: {why}.", hl=[k], done=seq[:i], out=seq[: i + 1], out_label=f"{kind}-order"))
    fr.append(bframe(t, f"{'Pre' if kind == 'pre' else 'Post'}-order: {', '.join(map(str, seq))}." + (" The root is always FIRST." if kind == "pre" else " The root is always LAST."), done=seq, out=seq, out_label=f"{kind}-order"))
    return fr


# ── min / max / successor ──────────────────────────────────────────────────

def minmax_frames(t=None):
    t = t or example()
    fr = [bframe(t, "The minimum: start at the root and keep going LEFT until there is no left child.")]
    path, n = [], t
    while n:
        path.append(n["k"])
        fr.append(bframe(t, f"At {n['k']}: " + (f"it has a left child ({n['l']['k']}), keep going." if n["l"] else f"no left child. {n['k']} is the minimum."), hl=[n["k"]], path=path[:-1]))
        n = n["l"]
    path, n = [], t
    fr.append(bframe(t, "The maximum: the same walk to the RIGHT."))
    while n:
        path.append(n["k"])
        n = n["r"]
    fr.append(bframe(t, f"Right, right, right: {' → '.join(map(str, path))}. The maximum is {path[-1]}. Both walks follow ONE path: O(h).", hl=[path[-1]], path=path[:-1]))
    return fr


def successor_frames(t=None):
    t = t or example()
    fr = []
    # Case 1: 6 has a right child
    fr.append(bframe(t, "Successor of 6 = the next key in sorted order (7). Case 1: 6 HAS a right child, so the successor is the minimum of that right subtree.", hl=[6]))
    fr.append(bframe(t, "Go to the right child, 7, then left as far as possible. 7 has no left child, so the successor of 6 is 7.", hl=[7], path=[6]))
    # Case 1 again: 15
    fr.append(bframe(t, "Successor of 15: right child 18, then left as far as possible: 17. So 17.", hl=[17], path=[15, 18]))
    # Case 2, Poon's top-down version (updated slides, Oct 1): search from the
    # root toward the target; every LEFT step records that node as the
    # candidate, right steps leave it alone.
    for key in (13, 20):
        fr.append(bframe(t, f"Successor of {key}. Case 2: {key} has NO right child. Start at the ROOT and search for {key}. Every time you step LEFT, that node becomes the candidate.", hl=[key]))
        cand, n, path = None, t, []
        while n["k"] != key:
            path.append(n["k"])
            if key < n["k"]:
                cand = n["k"]
                fr.append(bframe(t, f"{key} < {n['k']}: step LEFT, so {n['k']} is now the candidate (it's bigger than {key}, and we're heading into its smaller side).", hl=[n["k"]], path=path[:-1], note=f"candidate = {cand}"))
                n = n["l"]
            else:
                fr.append(bframe(t, f"{key} > {n['k']}: step RIGHT. {n['k']} is smaller than {key}, so it can't be the successor. Candidate stays {cand if cand is not None else 'none'}.", hl=[n["k"]], path=path[:-1], note=f"candidate = {cand if cand is not None else 'none'}"))
                n = n["r"]
        if cand is None:
            fr.append(bframe(t, f"Reached {key} and we never stepped left: {key} is the maximum, so it has no successor.", hl=[key], path=path))
        else:
            fr.append(bframe(t, f"Reached {key}. The last candidate, {cand}, is the successor (sorted order: …, {key}, {cand}, …).", hl=[cand], path=path, done=[key]))
    return fr


# ── insert ─────────────────────────────────────────────────────────────────

INSERT_CODE = """def insert(root, key):
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    else:
        root.right = insert(root.right, key)
    return root    # lets the caller re-link
"""


def insert_trace(key, t=None):
    t = t or example()
    tr = _T()
    path, n = [], t
    tr.add(bframe(t, f"insert(root, {key}). A new key always becomes a LEAF. Walk down exactly like search, until the spot is empty."), [1], {"key": key})
    while n:
        path.append(n["k"])
        go = "left" if key < n["k"] else "right"
        nxt = n["l"] if go == "left" else n["r"]
        tr.add(bframe(t, f"{key} {'<' if go == 'left' else '≥'} {n['k']}: go {go}." + ("" if nxt else f" {n['k']}.{go} is empty, so that's where {key} goes."), hl=[n["k"]], path=path[:-1]), [2, 4, 5] if go == "left" else [2, 4, 6, 7], {"key": key, "root.key": n["k"]})
        n = nxt
    t2 = insert_plain(copy.deepcopy(t), key)
    tr.add(bframe(t2, f"root is None: line 3 makes a new Node({key}) and returns it. The caller stores it in {path[-1]}.{'left' if key < path[-1] else 'right'}.", hl=[key], path=path), [2, 3], {"key": key, "new": key})
    tr.add(bframe(t2, "Every call returns its root, so each parent re-links the same child it had (nothing changes above the new leaf). Still a BST: the in-order is still sorted.", done=[key], path=path), [8], {"in-order": ", ".join(map(str, inorder(t2)))})
    return tr.out(INSERT_CODE), t2


# ── delete ─────────────────────────────────────────────────────────────────

DELETE_CODE = """def delete(root, key):
    if root is None:
        return None
    if key < root.key:
        root.left = delete(root.left, key)
    elif key > root.key:
        root.right = delete(root.right, key)
    else:                          # found it
        if root.left is None:      # 0 or 1 child
            return root.right
        if root.right is None:
            return root.left
        s = find_min(root.right)   # 2 children
        root.key = s.key           # copy successor up
        root.right = delete(root.right, s.key)
    return root
"""


def delete_trace(key, t=None):
    t = t or example()
    tr = _T()
    path, n = [], t
    while n and n["k"] != key:
        path.append(n["k"])
        n = n["l"] if key < n["k"] else n["r"]
    kids = [c["k"] for c in (n["l"], n["r"]) if c]
    case = {0: "a leaf", 1: "one child", 2: "two children"}[len(kids)]
    tr.add(bframe(t, f"delete(root, {key}). First find it, the same walk as search: {' → '.join(map(str, path + [key]))}.", path=path, hl=[key]), [1, 4, 5, 6, 7], {"key": key, "path": " → ".join(map(str, path))})
    tr.add(bframe(t, f"Found {key} (line 8). It has {case}" + (f" ({', '.join(map(str, kids))})" if kids else "") + ".", warn=[key], path=path), [8], {"key": key, "children": len(kids)})
    if len(kids) < 2:
        t2 = delete_plain(copy.deepcopy(t), key)
        if not kids:
            cap = f"Case 1, a leaf: root.left is None, so return root.right, which is None. {path[-1]}'s link becomes None and {key} is gone."
        else:
            cap = f"Case 2, one child: return the child, {kids[0]}. The parent {path[-1]} now points straight at {kids[0]}, and {key}'s whole subtree moves up one level with it."
        tr.add(bframe(t2, cap, hl=kids or None, path=path), [9, 10] if n["l"] is None else [11, 12], {"returned": kids[0] if kids else "None"})
        tr.add(bframe(t2, f"Still a BST. In-order: {', '.join(map(str, inorder(t2)))}.", done=inorder(t2)), [16], {})
        return tr.out(DELETE_CODE), t2
    # two children
    s = n["r"]
    spath = [s["k"]]
    while s["l"]:
        s = s["l"]
        spath.append(s["k"])
    sk = s["k"]
    tr.add(bframe(t, f"Case 3, two children. We can't just unlink {key}. Find its SUCCESSOR: the minimum of its right subtree. Go right to {n['r']['k']}, then left as far as possible: {sk}.", warn=[key], hl=[sk], path=path + [key] + spath[:-1]), [13], {"key": key, "s": sk})
    # Keys identify nodes, so the copy-up step is drawn on the original tree:
    # the successor lit, the node being replaced in amber.
    tr.add(bframe(t, f"Copy the successor's key UP into {key}'s node (line 14). {sk} is the smallest key bigger than everything on the left, and smaller than everything else on the right, so it fits exactly where {key} was.", hl=[sk], warn=[key], path=path), [14], {"root.key": f"{key} → {sk}"})
    t2 = delete_plain(copy.deepcopy(t), key)
    tr.add(bframe(t2, f"Line 15: delete the old {sk} from the right subtree. It has at most one child (it had no left child, or it wouldn't be the minimum), so this is always Case 1 or 2.", hl=[sk], path=path), [15], {"deleted": sk})
    tr.add(bframe(t2, f"Done: {key} is gone, {sk} took its place. In-order still sorted: {', '.join(map(str, inorder(t2)))}.", done=inorder(t2)), [16], {})
    return tr.out(DELETE_CODE), t2


# ── height: balanced vs degenerate ─────────────────────────────────────────

def degenerate_frames(keys):
    fr = []
    t = None
    for i, k in enumerate(keys):
        t = insert_plain(t, k)
        fr.append(bframe(t, f"insert({k})" + (": the first key is the root." if i == 0 else f": bigger than everything so far, so it goes right, right, right… Height is now {height(t)}."), hl=[k], path=keys[:i]))
    fr.append(bframe(t, f"{len(keys)} keys inserted in sorted order give a tree of height {height(t)} = n − 1. It's a linked list wearing a tree costume: search is O(n).", done=keys))
    return fr
