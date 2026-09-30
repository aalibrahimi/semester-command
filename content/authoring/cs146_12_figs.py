"""SVG figures for CS 146 Lecture 12 (binary search trees)."""
from cs146_12_trace import build, example, EXAMPLE_KEYS

A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"
MONO = "font-family='ui-monospace, SFMono-Regular, monospace'"


def soft(col, a):
    return col[:-1] + f" / {a})"


def place(t, x0, y0, w, row):
    """{key: (x, y, parent)} with x from in-order position, y from depth."""
    order, out = [], {}

    def walk(n, d, parent):
        if not n:
            return
        walk(n["l"], d + 1, n["k"])
        order.append((n["k"], d, parent))
        walk(n["r"], d + 1, n["k"])
    walk(t, 0, None)
    for i, (k, d, p) in enumerate(order):
        out[k] = (x0 + (i + 0.5) * w / len(order), y0 + d * row, p)
    return out


def draw_tree(t, x0, y0, w, row, r=15, fill=None, stroke=None, tips=None, edge=None):
    fill = fill or {}
    stroke = stroke or {}
    tips = tips or {}
    edge = edge or {}
    pos = place(t, x0, y0, w, row)
    o = []
    for k, (x, y, p) in pos.items():
        if p is not None:
            px, py, _ = pos[p]
            col = edge.get(k, "currentColor")
            o.append(f"<line x1='{px}' y1='{py}' x2='{x}' y2='{y}' stroke='{col}' stroke-opacity='{0.9 if k in edge else 0.35}' stroke-width='{2.2 if k in edge else 1.4}'/>")
    for k, (x, y, p) in pos.items():
        col = stroke.get(k, "currentColor")
        o.append(f"<g><title>{tips.get(k, f'Key {k}')}</title><circle cx='{x}' cy='{y}' r='{r}' fill='{fill.get(k, 'rgb(var(--card))')}' stroke='{col}' stroke-opacity='{1 if k in stroke else 0.45}' stroke-width='{2 if k in stroke else 1.3}'/>"
                 f"<text x='{x}' y='{y + 4.5}' text-anchor='middle' font-size='12.5' font-weight='700' {MONO}>{k}</text></g>")
    return "".join(o), pos


def fig_terms():
    """Poon's example tree with the vocabulary labeled."""
    t = example()
    tips = {15: "The root: the top-most node. Depth 0.", 6: "Root of the left subtree (a subtree is a tree inside the tree).", 9: "A leaf: no children. Depth 4, the deepest node, so the tree's height is 4.",
            2: "A leaf.", 5: "A leaf.", 17: "A leaf.", 20: "A leaf.", 7: "Parent of 13; child of 6.", 13: "Child of 7, parent of 9.", 3: "Parent of 2 and 5.", 18: "Parent of 17 and 20."}
    fill = {15: soft(A, 0.25), 9: soft(G, 0.25), 2: soft(G, 0.25), 5: soft(G, 0.25), 17: soft(G, 0.25), 20: soft(G, 0.25)}
    stroke = {15: A, 9: G, 2: G, 5: G, 17: G, 20: G}
    body, pos = draw_tree(t, 30, 50, 460, 52, fill=fill, stroke=stroke, tips=tips)
    o = [f"<g {FONT}>", "<text x='20' y='22' font-size='14' font-weight='800'>Poon's example tree, labeled</text>", body]
    # subtree box around 6's subtree
    xs = [pos[k][0] for k in (2, 3, 5, 6, 7, 13, 9)]
    o.append(f"<g><title>The subtree rooted at 6: 6 and everything below it. It is a tree on its own, with its own root.</title><rect x='{min(xs) - 22}' y='{pos[6][1] - 22}' width='{max(xs) - min(xs) + 44}' height='{pos[9][1] - pos[6][1] + 44}' rx='14' fill='{soft(A, 0.05)}' stroke='{A}' stroke-dasharray='5 4' stroke-opacity='0.6'/></g>")
    o.append(f"<text x='{min(xs) - 18}' y='{pos[6][1] - 28}' font-size='11' fill='{A}' font-weight='700'>subtree rooted at 6</text>")
    o.append(f"<text x='{pos[15][0] + 22}' y='{pos[15][1] + 4}' font-size='11' fill='{A}' font-weight='700'>root (depth 0)</text>")
    o.append(f"<text x='{pos[9][0] + 20}' y='{pos[9][1] + 4}' font-size='11' fill='{G}' font-weight='700'>leaf at depth 4 → height 4</text>")
    # depth ruler
    for d in range(5):
        o.append(f"<text x='505' y='{50 + d * 52 + 4}' font-size='10.5' opacity='0.6' {MONO}>depth {d}</text>")
    o.append(f"<text x='20' y='{50 + 4 * 52 + 42}' font-size='11.5' opacity='0.8'>Green = leaves (no children). Height = edges on the longest root-to-leaf path: 15 → 6 → 7 → 13 → 9.</text>")
    o.append("</g>")
    return "".join(o), "0 0 580 318"


def fig_property():
    """The BST property at node 6: left subtree smaller, right subtree bigger."""
    t = example()
    left = {2, 3, 5}
    right = {7, 13, 9}
    fill = {k: soft(G, 0.25) for k in left} | {k: soft(Y, 0.25) for k in right} | {6: soft(A, 0.3)}
    stroke = {k: G for k in left} | {k: Y for k in right} | {6: A}
    tips = {k: f"{k} is in 6's LEFT subtree, so {k} < 6." for k in left} | {k: f"{k} is in 6's RIGHT subtree, so {k} > 6." for k in right} | {6: "Node x = 6. The rule holds at EVERY node, not just here."}
    body, pos = draw_tree(t, 30, 50, 460, 52, fill=fill, stroke=stroke, tips=tips)
    o = [f"<g {FONT}>", "<text x='20' y='22' font-size='14' font-weight='800'>The BST property, checked at node 6</text>", body]
    o.append(f"<text x='20' y='{50 + 4 * 52 + 38}' font-size='12'><tspan fill='{G}' font-weight='700'>2, 3, 5</tspan> (left subtree) &lt; <tspan fill='{A}' font-weight='800'>6</tspan> &lt; <tspan fill='{Y}' font-weight='700'>7, 9, 13</tspan> (right subtree). Not just the children: the WHOLE subtrees.</text>")
    o.append(f"<text x='20' y='{50 + 4 * 52 + 58}' font-size='11.5' opacity='0.8'>That's why 9 must sit under 6's right side even though it's two levels down.</text>")
    o.append("</g>")
    return "".join(o), "0 0 560 330"


def fig_shapes():
    """Same 7 keys, two insertion orders: balanced vs degenerate."""
    bal = build([4, 2, 6, 1, 3, 5, 7])
    deg = build([1, 2, 3, 4, 5, 6, 7])
    b1, _ = draw_tree(bal, 20, 60, 260, 56, fill={k: soft(G, 0.18) for k in range(1, 8)}, stroke={k: G for k in range(1, 8)})
    b2, _ = draw_tree(deg, 300, 60, 280, 30, r=12, fill={k: soft(R, 0.15) for k in range(1, 8)}, stroke={k: R for k in range(1, 8)})
    o = [f"<g {FONT}>", "<text x='20' y='24' font-size='14' font-weight='800'>Same 7 keys, two insertion orders</text>"]
    o.append(f"<text x='20' y='44' font-size='12' fill='{G}' font-weight='700'>insert 4, 2, 6, 1, 3, 5, 7 → height 2</text>")
    o.append(f"<text x='310' y='44' font-size='12' fill='{R}' font-weight='700'>insert 1, 2, 3, 4, 5, 6, 7 → height 6</text>")
    o.append(b1 + b2)
    o.append(f"<text x='20' y='292' font-size='12'>Balanced: every operation walks at most <tspan font-weight='800' fill='{G}'>log₂ n</tspan> levels. Sorted input: a linked list, <tspan font-weight='800' fill='{R}'>n − 1</tspan> levels.</text>")
    o.append("</g>")
    return "".join(o), "0 0 600 306"
