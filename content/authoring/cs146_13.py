"""CS 146 Lecture 13: AVL trees. Built from Poon's Lecture 13 slides
(Mon Oct 5, revised the same day with a cascading-delete example) and
Homework 13. Every height, balance, case and rotation comes from
cs146_13_trace.py, which is a real AVL implementation checked against the
slides' examples and random trees."""
from c146common import *  # noqa
from h15common import ROAD
from cs146_traces import TRACE
from cs146_13_trace import (INSERT_CODE, B, H, Tree, build, delete_trace, frame, from_shape, heights_frames, insert_trace, levels, node)
from cs146_12_trace import _T

A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"
MONO = "font-family='ui-monospace, SFMono-Regular, monospace'"


def soft(col, a):
    return col[:-1] + f" / {a})"


# ── traces ──────────────────────────────────────────────────────────────────

def seq_trace(ks, brief_after=99):
    tree, tr = Tree(), _T()
    cases = []
    for i, k in enumerate(ks):
        _, c = insert_trace(tree, k, tr, brief=i >= brief_after)
        cases.append(c)
    return tr.out(INSERT_CODE), cases, tree.t


EX1, _, _ = seq_trace([30, 20, 10])
EX2, _, _ = seq_trace([30, 10, 20])
HW13_KEYS = [15, 20, 25, 10, 8]
HW1, HW1_CASES, HW1_T = seq_trace(HW13_KEYS, brief_after=2)
HW_STEPS = []
for i in range(len(HW13_KEYS)):
    t = build(HW13_KEYS[: i + 1])
    HW_STEPS.append((HW13_KEYS[i], HW1_CASES[i], levels(t)))

CASCADE_SPEC = (50, (20, 10, (30, None, 40)), (70, (60, 55, None), (80, 75, (90, None, 95))))
_casc = Tree(from_shape(CASCADE_SPEC))
_ctr, CASCADE_SETS = delete_trace(_casc, 10)
CASCADE = _ctr.frames
assert CASCADE_SETS == 2

HEIGHT_FRAMES, _ = heights_frames()


def rotation_frames():
    """rightRotate(30) on 30(20(10, 25), 40): 25 is the 'blue triangle' that
    changes parent. Then leftRotate(20) undoes it."""
    before = from_shape((30, (20, 10, 25), 40))
    from cs146_13_trace import right_rotate, left_rotate
    fr = [frame(before, "x = 30, y = 30's left child 20. Every key in 20's right subtree (here just 25) is between 20 and 30: bigger than y, smaller than x.", hl=[30, 20], b_for=set())]
    fr.append(frame(before, "rightRotate(30), step 1: y = x.left (20), temp = y.right (25). That middle subtree is the piece that has to change parents.", hl=[25], path=[30, 20], b_for=set()))
    after = right_rotate(before)
    fr.append(frame(after, "Step 2: y.right = x and x.left = temp. 20 is on top, 30 is its right child, and 25 moved over to be 30's LEFT child. 25 is still between 20 and 30, so the BST order is kept.", hl=[20], done=[25], b_for=set()))
    fr.append(frame(after, "Step 3: update heights, CHILD first (30 is now lower), then the parent (20). Step 4: return y, the new root of this subtree. Three pointer changes: O(1).", hl=[30, 20], b_for={30, 20}))
    back = left_rotate(after)
    fr.append(frame(back, "leftRotate(20) is the mirror image and undoes it: 30 back on top, 25 back under 20. A rotation never changes the in-order sequence: 10, 20, 25, 30, 40.", hl=[30], done=[25], b_for=set()))
    return fr


def fig_rotation():
    """The generic picture: rightRotate(x) with subtrees A (< y), T2 (between), C (> x)."""
    def tri(cx, cy, label, col, tip):
        return (f"<g><title>{tip}</title><path d='M{cx} {cy} L{cx - 30} {cy + 52} L{cx + 30} {cy + 52} Z' fill='{soft(col, 0.18)}' stroke='{col}' stroke-width='1.4'/>"
                f"<text x='{cx}' y='{cy + 40}' text-anchor='middle' font-size='12' font-weight='700' fill='{col}' {MONO}>{label}</text></g>")

    def circ(cx, cy, label, col):
        return (f"<circle cx='{cx}' cy='{cy}' r='17' fill='{soft(col, 0.22)}' stroke='{col}' stroke-width='2'/>"
                f"<text x='{cx}' y='{cy + 5}' text-anchor='middle' font-size='14' font-weight='800' {MONO}>{label}</text>")

    def edge(x1, y1, x2, y2):
        return f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='currentColor' stroke-opacity='0.4' stroke-width='1.5'/>"

    o = [f"<g {FONT}>", "<text x='20' y='24' font-size='14' font-weight='800'>rightRotate(x): y moves up, the middle subtree changes parents</text>"]
    # before
    o.append("<text x='120' y='52' text-anchor='middle' font-size='12' opacity='0.7'>before (x is left-heavy)</text>")
    o.append(edge(150, 80, 100, 135) + edge(150, 80, 205, 135) + edge(100, 135, 65, 178) + edge(100, 135, 135, 178))
    o.append(circ(150, 80, "x", A) + circ(100, 135, "y", G))
    o.append(tri(65, 178, "A", G, "A: everything smaller than y") + tri(135, 178, "T2", Y, "T2: between y and x. This is the piece that moves.") + tri(205, 152, "C", R, "C: everything bigger than x"))
    # arrow
    o.append(f"<path d='M262 150 L318 150' stroke='{A}' stroke-width='2.5' marker-end='url(#arr)'/><text x='290' y='140' text-anchor='middle' font-size='11' fill='{A}' font-weight='700'>O(1)</text>")
    o.append(f"<defs><marker id='arr' markerWidth='8' markerHeight='8' refX='6' refY='4' orient='auto'><path d='M0 0 L8 4 L0 8 Z' fill='{A}'/></marker></defs>")
    # after
    o.append("<text x='440' y='52' text-anchor='middle' font-size='12' opacity='0.7'>after</text>")
    o.append(edge(420, 80, 365, 135) + edge(420, 80, 470, 135) + edge(470, 135, 435, 178) + edge(470, 135, 505, 178))
    o.append(circ(420, 80, "y", G) + circ(470, 135, "x", A))
    o.append(tri(365, 152, "A", G, "A stays y's left subtree") + tri(435, 178, "T2", Y, "T2 is now x's LEFT subtree: still bigger than y, smaller than x") + tri(505, 178, "C", R, "C stays x's right subtree"))
    o.append("<text x='20' y='262' font-size='11.5' opacity='0.85'>In-order before and after: A, y, T2, x, C. Same order, so the BST property holds. leftRotate is the mirror image.</text>")
    o.append("</g>")
    return "".join(o), "0 0 560 276"


def fig_cases():
    """The four insert formations (Poon's table, slide 51)."""
    def mini(ox, title, path, col):
        # path: 'LL' etc. Draw node -> child -> grandchild (the new key)
        pts = [(ox + 60, 60)]
        dx = {"L": -34, "R": 34}
        for step in path:
            x, y = pts[-1]
            pts.append((x + dx[step], y + 48))
        g = f"<text x='{ox + 60}' y='32' text-anchor='middle' font-size='15' font-weight='800' fill='{col}'>{title}</text>"
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            g += f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='{col}' stroke-width='2'/>"
        labels = ["node", "child", "new"]
        for (x, y), lab in zip(pts, labels):
            g += f"<circle cx='{x}' cy='{y}' r='14' fill='{soft(col, 0.18) if lab != 'new' else soft(G, 0.3)}' stroke='{col if lab != 'new' else G}' stroke-width='1.6'/>"
            g += f"<text x='{x}' y='{y + 30}' text-anchor='middle' font-size='9.5' opacity='0.75'>{lab}</text>"
        fix = {"LL": "rightRotate(node)", "RR": "leftRotate(node)", "LR": "leftRotate(child), then rightRotate(node)", "RL": "rightRotate(child), then leftRotate(node)"}[title]
        g += f"<text x='{ox + 60}' y='196' text-anchor='middle' font-size='10.5' {MONO}>{fix.split(', then ')[0]}</text>"
        if ", then " in fix:
            g += f"<text x='{ox + 60}' y='212' text-anchor='middle' font-size='10.5' {MONO}>then {fix.split(', then ')[1]}</text>"
        return g
    o = [f"<g {FONT}>"]
    o.append(mini(0, "LL", "LL", A) + mini(140, "LR", "LR", Y) + mini(280, "RR", "RR", A) + mini(420, "RL", "RL", Y))
    o.append("<text x='20' y='244' font-size='11.5' opacity='0.85'>Read the two steps from the unbalanced node down toward the new key. Straight line (LL, RR): one rotation. Zig-zag (LR, RL): two.</text>")
    o.append("</g>")
    return "".join(o), "0 0 560 258"


def ref(guide, sec):
    return f"/study/cs146/{guide}?s={sec}"


L = lambda xs: ", ".join(map(str, xs))

g = {
 "id": "cs146/13-avl-trees",
 "course": "cs146",
 "lessons": "Lecture 13",
 "title": "AVL trees: heights, balance, rotations, insert and delete",
 "summary": "Why a plain BST can turn into a linked list; height H and balance B = H(left) − H(right) at every node; the AVL property |B| ≤ 1; rightRotate and leftRotate in O(1); insert's four cases (LL, LR, RR, RL) and why it needs at most one rotation set; delete's cases decided by the heavier child's balance and why it can cascade up to the root; everything O(log n), guaranteed.",
 "estimatedMinutes": 70,
 "sourceNote": "Lecture 13 'AVL Trees' (Mon Oct 5) slides as revised the same day (with the cascading-delete example) and Homework 13. The H and B values on Lecture 12's tree, Examples 1 and 2 (30, 20, 10 and 30, 10, 20), the rotation pseudocode, both case tables, the insert and delete pseudocode and the cascading delete of 10 are Poon's. Every tree in this chapter is computed by an AVL implementation (cs146_13_trace.py) that reproduces his examples exactly.",
 "requires": ["cs146/12-binary-search-trees"],
 "sections": [
  {"id": "map", "heading": "The big picture: a BST that can't go bad", "blocks": [
    P("Lecture 12 ended on a problem. A BST is fast when it's bushy, but its shape depends on the order keys arrive. Insert 2, 3, 4, 6, … in sorted order and every key goes right: the tree becomes a **linked list**, and search, insert and delete all slow down to **O(n)**. An **AVL tree** is a BST that checks its own shape after every insert and delete and fixes it on the spot, so its height stays about log n **no matter what order the keys come in**.", slide="The problem with BSTs"),
    T(["", "Shape", "Height", "search / insert / delete"], [
      ["BST, keys in mixed order", "bushy", "about log n", "O(log n)"],
      ["BST, keys in sorted order", "a chain", "n − 1", "**O(n)**"],
      ["AVL tree, any order", "always bushy", "O(log n), guaranteed", "**O(log n)**"],
    ], title="Why AVL trees exist", slide="Performance depends on balance"),
    ROAD("Keep the tree balanced automatically", [
      ("Measure balance", "height H and balance B at each node", "the numbers", "brand"),
      ("The AVL rule", "|B| ≤ 1 at every node", "the promise", "green"),
      ("Rotations", "rightRotate, leftRotate in O(1)", "the fix", "amber"),
      ("Insert", "BST insert, then fix going up: LL LR RR RL", "at most one fix", "brand"),
      ("Delete", "BST delete, then fix going up", "can cascade", "red"),
    ], "Lecture 13's agenda, in order.", eyebrow="Lecture 13 agenda", slide="The plan"),
    {"type": "video", "src": "/study-videos/cs146-avl.mp4", "slide": "Watch it first",
     "caption": "AVL insert as a 95-second animation, with H and B under every node: Poon's Example 2 (the zig-zag LR case, two rotations), then all of HW 13 Problem 1. Use the chips to jump, or slow it to 0.75×.",
     "chapters": [{"t": 4, "label": "Case LR"}, {"t": 40, "label": "HW 13 Problem 1"}, {"t": 91, "label": "Runtime"}]},
    WHY("**Why it matters** This is the last lecture before the midterm (Mon Oct 12), and Poon's HW 13 asks you to insert keys by hand, write the balance factor, and name the case. Every 'sorted map' in real software is a self-balancing tree like this one, because nobody can promise their keys won't arrive sorted."),
  ]},
  {"id": "balance", "heading": "Measuring balance: H and B", "blocks": [
    D("Height H(node)", "The number of **edges** on the longest path from the node down to a leaf. A leaf has **H = 0**. An empty spot (null) has **H(null) = −1**. Same 'count edges' rule as Lecture 12's tree height."),
    D("Balance B(node)", "**B(node) = H(left child) − H(right child).** Left minus right, in that order. If B is −1, 0 or 1, the node is balanced. **B > 1**: left-heavy. **B < −1**: right-heavy."),
    {**ST("Heights and balances on Lecture 12's tree (slides 12 to 17)", HEIGHT_FRAMES), "resources": [{"label": "Heights and depth (Lecture 12 chapter)", "url": ref("12-binary-search-trees", "terms"), "kind": "chapter"}]},
    E("Why H(null) = −1", "13 has a left child 9 and no right child.\n\n  B(13) = H(9) − H(null) = 0 − (−1) = 1\n\nWith H(null) = −1, a leaf works out too: H(leaf) = 1 + max(−1, −1) = 0. The −1 makes one formula work for every node.", answer="B(13) = 1"),
    THINK("**Store H in every node.** Poon's AVL nodes keep their height as a field. Then B(node) is just two lookups and a subtraction: **O(1)**. Without the stored heights you'd have to walk the whole subtree to measure it, which would wreck the O(log n) we're after."),
    TRAP("Two sign and counting slips cost points: writing B as right − left (Poon's is **left − right**, so left-heavy is positive), and counting **nodes** instead of edges for H (a leaf is 0, not 1; an empty child is −1, not 0).", "HW 13, Midterm"),
  ]},
  {"id": "property", "heading": "The AVL property: |B| ≤ 1 everywhere", "blocks": [
    D("AVL tree", "A BST where, **for every node**, the heights of its left and right subtrees differ by at most 1. Two rules at once: the **BST property** (left smaller, right bigger) and the **AVL property** (|B(x)| ≤ 1 for every x)."),
    P("Lecture 12's example tree is a valid BST but **not** an AVL tree: B(15) = H(6) − H(18) = 3 − 1 = 2. Imbalance can hide anywhere, which is why it's measured at **every** node, not just the root."),
    WHY("**Why 'at most 1' is enough** Requiring perfectly equal heights would be impossible for most sizes (try 2 nodes). Allowing a difference of 1 is loose enough to keep up cheaply and still tight enough that the height can't grow beyond O(log n)."),
    C("A node's left subtree has height 2 and its right child is null. What is its B, and is the AVL property OK?", "B = 2 − (−1) = **3**. Not balanced: it's left-heavy and needs fixing."),
  ]},
  {"id": "rotations", "heading": "Rotations: the O(1) fix", "blocks": [
    P("A **rotation** swaps a parent and child's places (the parent-child relationship is reversed) while keeping the BST order. If x is **left-heavy**, `rightRotate(x)` moves weight to the right: its left child y comes up. If x is **right-heavy**, `leftRotate(x)` does the mirror image.", slide="What a rotation does"),
    F(fig_rotation(), "rightRotate(x): y comes up, x goes down to the right, and the middle subtree T2 (keys between y and x) becomes x's left child. Hover each piece."),
    ST("rightRotate(30), step by step, then leftRotate undoes it", rotation_frames()),
    E("rightRotate pseudocode (slide 30; leftRotate is the mirror)", "rightRotate(x):\n  y = x.left            // step 1: the nodes involved\n  temp = y.right\n  y.right = x           // step 2: rotate\n  x.left = temp\n  x.h = 1 + max(x.left.h, x.right.h)   // step 3: CHILD first\n  y.h = 1 + max(y.left.h, y.right.h)   //         then parent\n  return y              // step 4: new root of this subtree", answer="O(1)"),
    TRAP("Updating heights in the wrong order. After the rotation x is BELOW y, so x's height must be recomputed first; y's height depends on it. Update y first and y uses x's stale height.", "Lecture 13 slide 29"),
    TRAP("Forgetting the middle subtree (temp). If you just set y.right = x, y now has two right children and the old y.right is lost. It has to become x's left child.", "Lecture 13 slides 27 to 28"),
  ]},
  {"id": "insert", "heading": "Insert: go down, then fix on the way up", "blocks": [
    P("**Step 1:** a plain BST insert: walk down and add the key as a new leaf (H = 0). **Step 2:** go back **up** the same path. At every node: update H = 1 + max(H(left), H(right)), compute B, and rebalance if |B| > 1.", slide="insert strategy"),
    TRACE("Example 1: insert 30, 20, 10 (case LL)", EX1),
    TRACE("Example 2: insert 30, 10, 20 (case LR: two rotations)", EX2),
    T(["Case", "B(node)", "Formation (from the node toward the new key)", "Rotation set"], [
      ["**LL**", "> 1, left-heavy", "left child, then its left", "rightRotate(node)"],
      ["**LR**", "> 1, left-heavy", "left child, then its right", "leftRotate(node.left), then rightRotate(node)"],
      ["**RR**", "< −1, right-heavy", "right child, then its right", "leftRotate(node)"],
      ["**RL**", "< −1, right-heavy", "right child, then its left", "rightRotate(node.right), then leftRotate(node)"],
    ], title="Insert cases (Poon's slide 51)", slide="Insert cases"),
    F(fig_cases(), "The four formations. In the code, the case is chosen by comparing the new key with the heavy child's key: smaller than the left child means LL, bigger means LR (mirror for the right)."),
    THINK("**Naming the case in two seconds:** stand at the unbalanced node and say which way you go to reach the new key, twice. Left, left: LL. Left, right: LR. A straight line needs one rotation; a zig-zag needs two, because the first rotation straightens it into the straight-line case."),
    TRAP("Fixing a zig-zag (LR or RL) with a single rotation. Slide 46 shows it: rightRotate(30) on 30, 10, 20 just moves the heaviness to the other side, and the tree is still unbalanced. Straighten first (leftRotate the child), then rotate the node.", "Lecture 13 slide 46, HW 13"),
    P("**Runtime.** Down: O(log n), because the tree's height is O(log n). Up: O(1) work at each of O(log n) nodes. Total **O(log n)**. And insert needs **at most one rotation set**: the rotation puts the subtree back to the height it had before the insert, so nothing above it changes."),
  ]},
  {"id": "hw", "heading": "HW 13, worked", "blocks": [
    P(f"**Problem 1:** insert {L(HW13_KEYS)} into an empty AVL tree, showing every node's balance and the rotation used. Step through it, then check the table."),
    TRACE(f"HW 13 Problem 1: insert {L(HW13_KEYS)}", HW1),
    T(["Insert", "Rotation", "Tree afterwards (level by level, H and B per node)"], [[str(k), c or "none", lv.replace("\n", " · ")] for k, c, lv in HW_STEPS], title="HW 13 Problem 1, every step (computed)"),
    E("Problem 2: getBalance", "static int getBalance(Node n) {\n    return height(n.left) - height(n.right);\n}\n\nheight(null) is already −1 in the template, so a missing child needs no special case. On the template's tree: node 30 has left 20 (H 0) and no right: 0 − (−1) = 1. Node 20: (−1) − (−1) = 0.", answer="height(n.left) - height(n.right)"),
    E("Problem 3: which case if 10 is inserted?", "The tree is 30 with a left child 20. Insert 10: 10 < 30 go left, 10 < 20 go left, so 10 becomes 20's left child.\n\nBack up at 30: H(20) = 1, H(null) = −1, so B(30) = 2: left-heavy. From 30 toward 10 the path is left, then left.", answer="LL (fix: rightRotate(30))"),
  ]},
  {"id": "delete", "heading": "Delete: same idea, but it can cascade", "blocks": [
    P("**Step 1:** a plain BST delete (Lecture 12's three cases, successor for two children). **Step 2:** go back up the path, updating H and rebalancing. The difference is how the case is chosen: deleting removes weight from one side, so you look at the **other** side, the heavier child y, and its balance B(y).", slide="delete strategy"),
    T(["Case", "B(x)", "Heavier child y", "B(y)", "Rotation set"], [
      ["**LL**", "> 1", "left of x", "**≥ 0** (left-heavy or balanced)", "rightRotate(x)"],
      ["**LR**", "> 1", "left of x", "**< 0** (right-heavy)", "leftRotate(y), then rightRotate(x)"],
      ["**RR**", "< −1", "right of x", "**≤ 0** (right-heavy or balanced)", "leftRotate(x)"],
      ["**RL**", "< −1", "right of x", "**> 0** (left-heavy)", "rightRotate(y), then leftRotate(x)"],
    ], title="Delete cases (Poon's slide 68)", slide="Delete cases"),
    ST("Cascading delete: delete(10) needs two rotation sets", CASCADE),
    D("Why delete can cascade", "A rotation after a delete can leave the subtree **one shorter** than before. That height loss travels up, and a node higher up can become unbalanced too. So delete may need a rotation set at **several levels, all the way to the root**: up to O(log n) of them."),
    T(["", "insert", "delete"], [
      ["Rotation sets needed", "**at most 1**", "up to **O(log n)** (cascading)"],
      ["Why", "the fix restores the subtree's old height", "the fix can shrink the subtree's height"],
      ["Case decided by", "where the new key went (compare keys)", "B(y) of the heavier child"],
      ["Total time", "O(log n)", "O(log n)"],
    ], title="Insert vs delete (slide 71)"),
    TRAP("Using the insert rule (compare the key) to pick a delete case. After a delete there is no new key on the heavy side; you decide with B(y). And note the ≥ 0 / ≤ 0: a balanced y (B(y) = 0) is a single-rotation case on delete.", "Lecture 13 slide 71"),
  ]},
  {"id": "runtime", "heading": "How fast? O(log n), guaranteed", "blocks": [
    T(["Operation", "Plain BST", "AVL tree"], [
      ["search", "O(h): O(n) worst", "**O(log n)**"],
      ["insert", "O(h): O(n) worst", "**O(log n)** (≤ 1 rotation set)"],
      ["delete", "O(h): O(n) worst", "**O(log n)** (rotations can cascade, still O(log n))"],
      ["min, max, successor", "O(h)", "**O(log n)**"],
      ["one rotation", "", "**O(1)**"],
      ["in-order traversal", "O(n)", "O(n)"],
    ], title="The payoff"),
    P("The whole point: an AVL tree is still a BST, so every operation is O(h). The AVL property just guarantees **h = O(log n)**, so O(h) becomes O(log n) even for the sorted input that ruins a plain BST."),
    C("You insert 1, 2, 3, …, 1000 in order into an AVL tree. Is search O(n)?", "No. The rotations keep it balanced: height stays about log₂ 1000 ≈ 10, so search is **O(log n)**. A plain BST would be a 1000-node chain."),
  ]},
  {"id": "apps", "heading": "Where balanced trees show up", "blocks": [
    WORLD("**Sorted maps and sets.** Java's `TreeMap` and `TreeSet`, and C++'s `std::map`, are self-balancing BSTs (red-black trees, a close cousin of AVL that allows a little more imbalance in exchange for fewer rotations). They promise O(log n) no matter the insertion order, which is exactly what this lecture builds."),
    WORLD("**Anywhere keys arrive in order.** Timestamps, auto-increment ids and sorted imports all arrive sorted, the exact input that turns a plain BST into a list. Databases index such keys with balanced trees (B-trees, a wider relative) for the same reason."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Height H", "Edges on the longest path down to a leaf. Leaf 0, null −1."],
      ["Balance B", "H(left) − H(right). Balanced if −1, 0 or 1."],
      ["Left-heavy / right-heavy", "B > 1 / B < −1."],
      ["AVL tree", "A BST with |B| ≤ 1 at every node. Height O(log n)."],
      ["rightRotate / leftRotate", "Swap a node with its left / right child, moving the middle subtree over. O(1)."],
      ["LL, RR", "Straight-line imbalance: one rotation."],
      ["LR, RL", "Zig-zag imbalance: two rotations (straighten, then rotate)."],
      ["Rotation set", "The one or two rotations that fix one node."],
      ["Cascading", "Delete's fix can shrink a subtree and unbalance nodes above: up to O(log n) rotation sets."],
    ]),
  ]},
 ],
 "exercises": [
  MC("b-sign", "Which way is B?", "Poon's balance factor B(node) is…", ["H(left) − H(right)", "H(right) − H(left)", "size(left) − size(right)", "depth(left) − depth(right)"], 0,
     ["Yes: left minus right, so left-heavy is positive.", "That's the opposite sign; on the exam B = 2 would come out as −2.", "B compares heights, not node counts.", "Depth is measured from the root; B uses heights of the subtrees."],
     "**H(left) − H(right)**.", "Every AVL question starts with computing B.", ref="balance"),
  FILL("h-leaf", "Height of nothing", "In Poon's convention, what is H(null)?", ["-1", "−1", "negative one", "minus one"],
       ["A leaf has H = 0.", "H(leaf) = 1 + max(H(null), H(null)).", "For that to come out 0, H(null) must be…"],
       ["**−1**, so that a leaf gets 1 + max(−1, −1) = 0."], "It makes the B formula work at every node.", ref="balance"),
  MC("case-name", "Name the case", "Insert 50, 30, 40 into an empty AVL tree. Which case fixes it?", ["LR", "LL", "RL", "RR"], 0,
     ["Yes: from 50, the path to 40 goes left (30) then right. Zig-zag on the left: LR.", "LL would be 50, 30, 20 (left, left).", "RL starts by going right.", "RR is two right steps."],
     "**LR**: leftRotate(30), then rightRotate(50). Root becomes 40.", "Exactly the shape of HW 13 Problem 3 style questions.", ref="insert"),
  MC("one-rotation", "Insert vs delete", "Which statement is true?", ["Insert needs at most one rotation set; delete may need several", "Delete needs at most one rotation set; insert may need several", "Both always need exactly one", "Neither ever rotates more than once in total"], 0,
     ["Yes: insert's fix restores the old height; delete's can shrink it and cascade.", "It's the other way round.", "Many inserts need no rotation at all.", "LR and RL cases already use two rotations in one set, and deletes can cascade."],
     "**Insert: at most 1 rotation set. Delete: up to O(log n).**", "Poon's 'comparing insert to delete' slide.", ref="delete"),
  FILL("rotate-cost", "Rotation cost", "What is the running time of one rotation, in Big-O?", ["O(1)", "o(1)", "constant", "1"],
       ["Count the pointer changes in rightRotate.", "It doesn't depend on how big the tree is.", "Three pointer assignments and two height updates."],
       ["**O(1)**: a fixed number of pointer and height updates."], "That's why fixing the tree doesn't cost more than the O(log n) walk.", ref="rotations"),
 ],
}

for e in g["exercises"]:
    if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
build_guide = gb.build
build_guide(g)
