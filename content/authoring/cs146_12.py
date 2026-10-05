"""CS 146 · Lecture 12: Binary search trees, from zero."""
import copy
from c146common import *  # noqa
from h15common import CARDS, ROAD
from cs146_traces import TRACE
from cs146_12_figs import fig_property, fig_shapes, fig_terms
from cs146_12_trace import (bframe, build as bst_build, degenerate_frames, delete_plain, delete_trace, height, inorder, inorder_trace, insert_plain, insert_trace,
                            minmax_frames, order_frames, postorder, preorder, search_trace, successor_frames)

# ── HW 12, computed ─────────────────────────────────────────────────────────
HW_KEYS = [8, 3, 10, 1, 6, 14, 4, 7, 13]
HW = bst_build(HW_KEYS)
HW_PRE, HW_IN, HW_POST = preorder(HW), inorder(HW), postorder(HW)
_after6 = delete_plain(copy.deepcopy(HW), 6)
_after8 = delete_plain(copy.deepcopy(_after6), 8)


def L(xs):
    return ", ".join(map(str, xs))


def levels(t):
    """'8 | 3, 10 | 1, 6, 14 | 4, 7, 13' with each node's side, for answers."""
    out, row = [], [(t, None, None)]
    while row:
        out.append(", ".join(f"{n['k']}" + (f" ({'L' if side == 'l' else 'R'} of {p})" if p is not None else "") for n, p, side in row))
        row = [(c, n["k"], s) for n, _, _ in row for s, c in (("l", n["l"]), ("r", n["r"])) if c]
    return "\n".join(f"  level {i}: {r}" for i, r in enumerate(out))


def build_frames(keys):
    fr, t = [], None
    for i, k in enumerate(keys):
        path, n = [], t
        while n:
            path.append(n["k"])
            n = n["l"] if k < n["k"] else n["r"]
        t = insert_plain(t, k)
        how = "the first key is the root" if not path else f"{' → '.join(map(str, path))}, then an empty spot on the {'left' if k < path[-1] else 'right'} of {path[-1]}"
        fr.append(bframe(t, f"insert({k}): {how}.", hl=[k], path=path))
    fr.append(bframe(t, f"The finished tree. Check it with an in-order walk: {L(inorder(t))}, sorted.", done=inorder(t)))
    return fr


INS_PAIR, _T10 = insert_trace(10)
DEL5, _ = delete_trace(5)
DEL7, _ = delete_trace(7)
DEL3, _ = delete_trace(3)

g = {
 "id": "cs146/12-binary-search-trees",
 "course": "cs146",
 "lessons": "Lecture 12",
 "title": "Binary search trees: search, traversal, insert and delete",
 "summary": "Why ordered data needs more than a hash table; the tree vocabulary and the BST property; search, min, max and successor; in-, pre- and post-order traversal; insert as a new leaf; the three delete cases (leaf, one child, two children with the successor); and why every operation is O(h), which is O(log n) balanced and O(n) when keys arrive sorted.",
 "estimatedMinutes": 75,
 "sourceNote": "Lecture 12 'Binary Search Trees' (Wed Sep 30) slides and HW 12, CLRS 10.4 and 12.1 to 12.3. The example tree (15 at the root), insert 10, the deletes of 5, 7 and 3, the traversal orders, the product-price tree and the applications are Poon's. HW 12 answers are computed by the script that builds this chapter.",
 "requires": ["cs146/4-big-o-merge-sort", "cs146/11-hash-tables"],
 "sections": [
  {"id": "map", "heading": "The big picture: fast AND in order", "blocks": [
    P("Last lecture's hash table does search, insert and delete in O(1). But it scatters keys on purpose, so it has **no order**. Ask it 'which products cost between $20 and $50?' or 'what's the cheapest?' and it has to look at every single item: O(n). A sorted array is great at order but slow to change. A **binary search tree** gets most of both.", slide="What this chapter answers"),
    T(["", "search", "insert", "delete", "min / max / range"], [
      ["Sorted array", "O(log n) binary search", "O(n) shifting", "O(n) shifting", "fast: it's sorted"],
      ["Hash table (chaining)", "O(1) amortized", "O(1) amortized", "O(1) amortized", "**O(n)**: full scan"],
      ["Binary search tree", "O(h)", "O(h)", "O(h)", "O(h), in order"],
    ], title="Poon's performance table, plus the BST row (h = the tree's height)", slide="Performance"),
    ROAD("Keep data sorted AND cheap to change", [
      ("Tree words", "root, leaf, depth, height", "the vocabulary", "brand"),
      ("The BST property", "left smaller, right bigger", "the one rule", "green"),
      ("Search and walk", "search, min, max, successor, traversals", "one path down"),
      ("Insert and delete", "new leaf; three delete cases", "the exam's traces", "amber"),
      ("Runtime", "everything is O(h)", "balanced vs degenerate", "red"),
    ], "The lecture's parts, in order.", eyebrow="Lecture 12 agenda", slide="The plan"),
    {"type": "video", "src": "/study-videos/cs146-bst.mp4", "slide": "Watch it first",
     "caption": "The lecture's mechanics as a 90-second animation: building Poon's example tree, insert 10, then the three delete cases on the original tree. Use the chips to jump, or slow it to 0.75×.",
     "chapters": [{"t": 0, "label": "Build the tree"}, {"t": 26, "label": "Insert 10"}, {"t": 38, "label": "Delete a leaf"}, {"t": 51, "label": "One child"}, {"t": 64, "label": "Two children"}, {"t": 88, "label": "Runtime"}]},
    WHY("**Why it matters** Every 'sorted map' you'll use (Java's `TreeMap`, a database index answering `WHERE age > 25`) is a balanced BST underneath. The midterm traces insert and delete on a tree by hand, and next lecture (AVL trees) only makes sense once this one does."),
  ]},
  {"id": "terms", "heading": "Tree words, one at a time", "blocks": [
    D("Tree", "A set of **nodes** connected by edges in a hierarchy. Each node can have zero or more children, and every node except the top one has **exactly one parent**. Unlike an array or list, it isn't a line: it branches."),
    D("Node", "One item in the tree: a **key**, often a **value**, and pointers to its children."),
    D("Root, parent, child, leaf", "The **root** is the top-most node. A node is the **parent** of the nodes it points to, its **children**. A **leaf** has no children."),
    D("Subtree", "A node and everything below it. It is a tree on its own, with its own root."),
    D("Depth and height", "A node's **depth** is the number of edges from the root down to it (the root has depth 0). The tree's **height** is the number of edges on the longest path from the root to a leaf."),
    F(fig_terms(), "Poon's example tree with every word on it. Hover any node. The deepest leaf, 9, is at depth 4, so the height is 4.", slide="The words, drawn"),
    D("Binary tree", "A tree where every node has **at most two** children, called the **left child** and the **right child**."),
    C("In Poon's example tree, what is the depth of 13, and is it a leaf?", "Depth **3** (15 → 6 → 7 → 13). Not a leaf: it has a left child, 9."),
    C("What is the height of a tree with only a root?", "**0**: the longest root-to-leaf path has no edges. (An empty tree is usually given height −1.)"),
  ]},
  {"id": "property", "heading": "The BST property: the one rule", "blocks": [
    D("BST property", "For **every** node x: every key in x's **left subtree** is **less** than x.key, and every key in x's **right subtree** is **greater**. A tree where this holds at every node is a **binary search tree**.", slide="Definition"),
    F(fig_property(), "The rule at node 6: the whole left subtree (2, 3, 5) is smaller, the whole right subtree (7, 9, 13) is bigger. Hover the nodes.", slide="The rule, drawn"),
    TRAP("The rule is about whole **subtrees**, not just children. A tree where every left child is smaller than its parent and every right child bigger can still break the BST property: put 16 as the right child of 13 in the example, and 16 is bigger than 13 but sits in 15's LEFT subtree, where everything must be smaller than 15.", "Exam", slide="Trap: subtrees, not children"),
    P("**Duplicates.** Most BST implementations simply ignore an insert of a key that's already there (Poon's slide). When many items share a key, the node stores a list instead, like his product example below."),
    E("Poon's product example", "Key = price. Each node keeps the list of products at that price.\n\n          $50 [Chair]\n         /          \\\n   $20 [Book]      $80 [Desk]\n    /      \\             \\\n$10 [...]  $35 [Lamp]    $90 [Monitor, headphones]\n\nclass BSTNode {\n  double price;             // the key\n  List<Product> products;   // the value\n  BSTNode left, right;\n}\n\n'Everything from $20 to $50' = walk just the part of the tree between those keys.", slide="Keys and values"),
    C("Is this a BST? Root 10, left child 5, right child 12, and 5's right child is 11.", "**No.** 11 is in 10's LEFT subtree but 11 > 10. Every key left of 10 must be smaller than 10."),
  ]},
  {"id": "search", "heading": "Search, min, max and successor", "blocks": [
    P("**The search idea.** Compare with the node you're at. Equal: found. Smaller: the key can only be on the left. Bigger: only on the right. Each comparison throws away a whole subtree, exactly like binary search throws away half an array.", slide="The idea"),
    TRACE("search(root, 13), line by line", search_trace(13)),
    TRACE("search(root, 16): a key that isn't there", search_trace(16)),
    ST("Min and max: keep going left, keep going right", minmax_frames()),
    D("Successor and predecessor", "The **successor** of a key is the next bigger key in the tree (the smallest key greater than it). The **predecessor** is the next smaller one. In sorted order 2, 3, 5, 6, 7, 9, 13, 15, …, the successor of 13 is 15."),
    T(["Case", "Where the successor is", "Example"], [
      ["The node has a right child", "the **minimum of its right subtree**: go right once, then left all the way", "successor(6) = 7; successor(15) = 17"],
      ["No right child", "the **lowest ancestor whose left child is also an ancestor**. Poon's way to find it: search from the **root** toward the node; every time you step **left**, that node becomes the candidate (overwrite the old one); right steps change nothing. When you reach the node, the candidate is the successor", "successor(13) = 15; successor(9) = 13"],
      ["No right child, and you never stepped left", "it's the maximum: no successor", "successor(20) = none"],
    ], title="Finding the successor (Poon's two cases, as in his updated Oct 1 slides)", slide="Successor cases"),
    THINK("**Why the left steps?** Stepping left at a node means the target is SMALLER than that node, so that node is a bigger key that could come next. The last left step is the closest such node: the smallest key that is still bigger than the target. Right steps pass nodes that are smaller than the target, which can never be its successor."),
    {**ST("The successor, both cases", successor_frames()), "resources": [
      {"label": "Poon's video: successor of 9 (Canvas)", "url": "https://sjsu.instructure.com/courses/1629570/files/89088667", "kind": "video"},
      {"label": "Poon's video: successor of 13 (Canvas)", "url": "https://sjsu.instructure.com/courses/1629570/files/89088648", "kind": "video"},
      {"label": "BST visualizer (USFCA)", "url": "https://www.cs.usfca.edu/~galles/visualization/BST.html", "kind": "site"}]},
    C("In the example tree, what is the successor of 5?", "5 has no right child, so search from the root: 5 < 15, step left (candidate 15); 5 < 6, step left (candidate 6); 5 > 3, step right (no change); reached 5. Successor = **6**."),
    C("What is the predecessor of 15?", "The mirror rule: the maximum of the LEFT subtree. Go left to 6, then right as far as possible: 7, 13. Predecessor = **13**."),
  ]},
  {"id": "traversal", "heading": "Traversals: visiting every node", "blocks": [
    D("Traversal", "Visiting every node of the tree exactly once, in some order. The three orders differ only in **when** the node itself is visited compared with its two subtrees."),
    T(["Order", "Steps", "On the example tree"], [
      ["**In-order**", "left subtree, **node**, right subtree", L(inorder(bst_build([15, 6, 18, 3, 7, 17, 20, 2, 5, 13, 9])))],
      ["**Pre-order**", "**node**, left subtree, right subtree", L(preorder(bst_build([15, 6, 18, 3, 7, 17, 20, 2, 5, 13, 9])))],
      ["**Post-order**", "left subtree, right subtree, **node**", L(postorder(bst_build([15, 6, 18, 3, 7, 17, 20, 2, 5, 13, 9])))],
    ], title="The three traversals (Poon's answers)", slide="Three orders"),
    TRACE("In-order, call by call: why it comes out sorted", inorder_trace()),
    ST("Pre-order: the node first", order_frames("pre")),
    ST("Post-order: the node last", order_frames("post")),
    THINK("**Two quick checks for the exam.** In-order on a BST is always sorted (if yours isn't, you made a mistake). Pre-order always starts with the root; post-order always ends with it."),
    C(f"HW 12 Question 2: using the tree from inserting {L(HW_KEYS)}, give the pre-order, in-order and post-order.", f"Pre-order: **{L(HW_PRE)}**.\n\nIn-order: **{L(HW_IN)}** (sorted, as it must be).\n\nPost-order: **{L(HW_POST)}**."),
    PY("Your turn: the three traversals", "Write `inorder`, `preorder` and `postorder` that return lists of keys. Nodes are small objects with `key`, `left` and `right`.",
       '''
class Node:
    def __init__(self, key, left=None, right=None):
        self.key, self.left, self.right = key, left, right

def inorder(n):
    return []   # left, node, right

def preorder(n):
    return []   # node, left, right

def postorder(n):
    return []   # left, right, node

t = Node(15, Node(6, Node(3, Node(2), Node(5)), Node(7, None, Node(13, Node(9)))), Node(18, Node(17), Node(20)))
print(inorder(t)); print(preorder(t)); print(postorder(t))
''',
       check='''
t = Node(15, Node(6, Node(3, Node(2), Node(5)), Node(7, None, Node(13, Node(9)))), Node(18, Node(17), Node(20)))
assert inorder(t) == [2, 3, 5, 6, 7, 9, 13, 15, 17, 18, 20], "In-order should come out sorted."
assert preorder(t) == [15, 6, 3, 2, 5, 7, 13, 9, 18, 17, 20], "Pre-order starts with the root, 15."
assert postorder(t) == [2, 5, 3, 9, 13, 7, 6, 17, 20, 18, 15], "Post-order ends with the root, 15."
assert inorder(None) == [], "An empty tree gives an empty list."
''',
       solution='''
class Node:
    def __init__(self, key, left=None, right=None):
        self.key, self.left, self.right = key, left, right

def inorder(n):
    return [] if n is None else inorder(n.left) + [n.key] + inorder(n.right)

def preorder(n):
    return [] if n is None else [n.key] + preorder(n.left) + preorder(n.right)

def postorder(n):
    return [] if n is None else postorder(n.left) + postorder(n.right) + [n.key]

t = Node(15, Node(6, Node(3, Node(2), Node(5)), Node(7, None, Node(13, Node(9)))), Node(18, Node(17), Node(20)))
print(inorder(t)); print(preorder(t)); print(postorder(t))
''', hints=["Every one starts with the same base case: `if n is None: return []`.", "In-order: `inorder(n.left) + [n.key] + inorder(n.right)`.", "Pre and post just move `[n.key]` to the front or the back."],
       success="Three lines each, and the only difference is where the node goes."),
  ]},
  {"id": "insert", "heading": "Insert: a new key becomes a leaf", "blocks": [
    D("Insert", "Walk down exactly like search. When you reach an empty spot, put the new node there. A new key **always becomes a leaf**; nothing already in the tree moves.", slide="Definition"),
    {**TRACE("insert(root, 10): the slide's example, line by line", INS_PAIR), "resources": [
      {"label": "Poon's video: what happens when insert() returns (Canvas)", "url": "https://sjsu.instructure.com/courses/1629570/files/89089843", "kind": "video"}]},
    THINK("**How the new node gets linked in (Poon's added slide).** The recursion bottoms out at an empty spot and returns the new node. That return lands in the call running on the new node's **parent**, which does `root.left = …` or `root.right = …` and links it in. Every ancestor above also reassigns its child link as the recursion unwinds, but with the same pointer it already had, so nothing else changes. That's why insert (and delete) **return** a node: Java passes references by value, so returning the new subtree root is how the caller learns about the change."),
    P("**Why insert returns root.** In Java (and Python), reassigning a parameter inside a function doesn't change the caller's variable. So each call **returns** the root of its subtree, and the caller stores it back: `root.left = insert(root.left, key)`. Where nothing changed, the same child is stored back. At the empty spot, the returned node is the new one, and that's how it gets linked in (Poon's 'node relinking' slide).", slide="Why return root"),
    ST(f"HW 12 Question 1: inserting {L(HW_KEYS)} into an empty tree", build_frames(HW_KEYS)),
    C(f"HW 12 Question 1: after inserting {L(HW_KEYS)}, describe the tree level by level.", f"Each node with the side it hangs on:\n\n{levels(HW)}\n\nIn-order check: {L(HW_IN)}."),
    C("Insert 16 into the example tree. Where does it go?", "16 > 15 → right to 18; 16 < 18 → left to 17; 16 < 17 → 17's left is empty. **16 becomes the left child of 17.**"),
  ]},
  {"id": "delete", "heading": "Delete: three cases", "blocks": [
    T(["Case", "What to do", "Poon's example"], [
      ["**Leaf** (no children)", "just remove it: the parent's link becomes null", "delete 5"],
      ["**One child**", "the child takes its place: the parent points straight at the child", "delete 7 (child 13)"],
      ["**Two children**", "copy the **successor's** key into the node, then delete the successor from the right subtree", "delete 3 (successor 5)"],
    ], title="The three delete cases", slide="Three cases"),
    TRACE("delete(root, 5): a leaf", DEL5),
    TRACE("delete(root, 7): one child", DEL7),
    TRACE("delete(root, 3): two children, using the successor", DEL3),
    THINK("**Why the successor works.** The successor is the smallest key in the right subtree. That makes it bigger than everything on the left and smaller than everything else on the right: exactly the rule the replaced node had to follow. And it has no left child (it's a minimum), so removing it is always the easy case, never another two-children case."),
    TRAP("Two slips cost points here. Taking the successor from the LEFT subtree (that's the predecessor; also valid, but not what Poon's code does, so your answer won't match). And forgetting the second step: after copying the successor's key up, the old successor node still has to be deleted, or the key appears twice.", "Exam", slide="Trap: the two-children case"),
    C(f"HW 12 Question 3a: in the tree from inserting {L(HW_KEYS)}, delete 6.", f"6 has two children (4 and 7). Its successor is the minimum of its right subtree: **7**. Copy 7 up into 6's node, then delete the old 7 (a leaf). The tree:\n\n{levels(_after6)}"),
    C("HW 12 Question 3b: then delete 8.", f"8 is the root with two children. Successor = minimum of the right subtree = **10** (10 has no left child). Copy 10 up, delete the old 10 (it has one child, 14, which moves up). The tree:\n\n{levels(_after8)}\n\nIn-order: {L(inorder(_after8))}."),
  ]},
  {"id": "runtime", "heading": "How fast? It depends on the height", "blocks": [
    P("**Every operation walks one path.** search, insert, delete, min, max and successor all go from the root down one branch (successor sometimes up one branch). A path is at most as long as the tree is tall, so each is **O(h)**.", slide="Everything is O(h)"),
    F(fig_shapes(), "The same seven keys. Inserted in a mixed order they make a bushy tree of height 2. Inserted in sorted order, every key goes right and the tree is a linked list of height 6.", slide="Balanced vs degenerate"),
    T(["Shape", "Height h", "Every operation", "When it happens"], [
      ["**Balanced**", "about log₂ n", "**O(log n)**", "keys arrive in a mixed order (15, 6, 7, 13, 9, …)"],
      ["**Degenerate**", "n − 1", "**O(n)**", "keys arrive sorted (2, 3, 5, 6, …) or reverse sorted"],
    ], title="Performance depends on the insertion order (Poon's slide)", slide="Best and worst"),
    ST("Sorted insertions build a linked list", degenerate_frames([1, 2, 3, 4, 5, 6, 7])),
    C("HW 12 Question 4: give 7 insertions into an empty BST that produce the maximum possible height. What is the height, and what does search cost?", "Insert them **in sorted order**, e.g. 1, 2, 3, 4, 5, 6, 7 (reverse order works too). Every key goes right, so the tree is a chain: height **6** (n − 1 edges). Search may walk the whole chain: **O(n)**."),
    WHEN("**Next lecture: AVL trees.** A plain BST can't stop you from inserting sorted data. An AVL tree rebalances itself after every insert and delete, so its height stays O(log n) no matter what order the keys come in."),
  ]},
  {"id": "apps", "heading": "Where BSTs show up", "blocks": [
    CARDS([
      ("Sorted maps and sets", "languages", ["Java's TreeMap and TreeSet (balanced BSTs).", "Keys come back in order; floor/ceiling queries are O(log n)."], "brand"),
      ("Database indexes", "range queries", ["`SELECT * FROM users WHERE age > 25;`", "A hash index can't answer that without a full scan; an ordered index walks just the matching part."], "green"),
      ("Memory and file systems", "ordered by address", ["Track allocated blocks sorted by address.", "Finding a free block or merging neighbours is a quick ordered lookup."], "amber"),
    ], "Poon's applications slide.", slide="Applications"),
    WORLD("**Where you've already met this.** In an app, 'show my assignments due between Monday and Friday, earliest first' is a range query over dates. With the data in a hash map, you'd sort everything every time; with an ordered index (a balanced BST or its cousin, the B-tree), you walk just that week."),
  ]},
  {"id": "words", "heading": "Words from this chapter", "blocks": [
    WORDS([
      ["Node / root / leaf", "One item / the top node / a node with no children."],
      ["Parent / child / subtree", "A node and the nodes it points to / a node and everything below it."],
      ["Depth / height", "Edges from the root to a node / edges on the longest root-to-leaf path."],
      ["Binary tree", "Every node has at most two children, left and right."],
      ["BST property", "Left subtree < node < right subtree, at every node."],
      ["Successor / predecessor", "Next bigger key / next smaller key."],
      ["In- / pre- / post-order", "Node in the middle / first / last. In-order on a BST is sorted."],
      ["Degenerate tree", "A BST that became a chain (sorted input): height n − 1."],
      ["Balanced tree", "Height about log n, so every operation is O(log n)."],
    ]),
  ]},
 ],
 "exercises": [
  MC("inorder-sorted", "Which traversal is sorted?", "Which traversal of a BST always lists the keys in increasing order?", ["In-order", "Pre-order", "Post-order", "Level by level"], 0,
     ["Yes: left, node, right is the BST property read left to right.", "Pre-order starts with the root, which is rarely the smallest key.", "Post-order ends with the root.", "Level order goes top to bottom, not smallest to largest."],
     "**In-order.**", "A free self-check on any traversal question.", ref="traversal"),
  MC("delete-two", "Two children", "Deleting a node with two children, Poon's code replaces its key with…", ["its successor (min of the right subtree)", "its left child", "its parent", "the tree's maximum"], 0,
     ["Yes, then deletes the successor from the right subtree.", "That would break the BST property whenever the left child has a right subtree.", "The parent isn't in the node's subtree at all.", "The maximum is usually far away and would break the order."],
     "**Its successor**, copied up; then the old successor node is deleted.", "The most traced delete case on the exam.", ref="delete"),
  MC("height-sorted", "Sorted inserts", "You insert 10 keys in increasing order into an empty BST. What is its height?", ["9", "3", "10", "4"], 0,
     ["Yes: a chain of 10 nodes has 9 edges.", "That's about log₂ 10, the balanced height.", "Height counts edges, not nodes.", "Not balanced: every key went right."],
     "**9** = n − 1: the degenerate case.", "Why the next lecture (AVL) exists.", ref="runtime"),
  MC("successor-case2", "Successor without a right child", "In Poon's example, what is the successor of 9? (9 is 13's left child and has no children.)", ["13", "15", "7", "none"], 0,
     ["Yes: searching from the root, the left steps are at 15 and then 13. The last one, 13, is the successor.", "15 was a candidate, but 13 replaced it (the last left step wins).", "7 is smaller than 9: we stepped RIGHT at 7.", "9 isn't the maximum: we stepped left on the way down."],
     "**13**: search from the root (15 left, 6 right, 7 right, 13 left). The last left step was at 13.", "Case 2 of the successor rule.", ref="search"),
  FILL("search-count", "Count the comparisons", "In Poon's example tree, how many nodes does search(root, 9) look at, including 9 itself?", ["5", "five"],
       ["Write the path: start at 15.", "9 < 15 go left; 9 > 6 go right; 9 > 7 go right; 9 < 13 go left.", "Count the nodes on 15 → 6 → 7 → 13 → 9."],
       ["15 → 6 → 7 → 13 → 9: **5** nodes, one per level down to depth 4."],
       "O(h) made concrete: one node per level.", ref="search"),
 ],
}

for e in g["exercises"]:
    if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
build(g)
