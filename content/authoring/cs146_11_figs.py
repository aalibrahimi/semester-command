"""SVG figures for CS 146 Lecture 11 (hash tables)."""
A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"
MONO = "font-family='ui-monospace, SFMono-Regular, monospace'"


def soft(col, a):
    return col[:-1] + f" / {a})"


BOOKS = {  # title: (letters, color)
    "Bible": (5, A),
    "Dracula": (7, R),
    "Odyssey": (7, G),
    "The Great Gatsby": (14, Y),
    "Pride and Prejudice": (17, "rgb(var(--accent-fg))"),
}


def spine(x, y, w, h, col, label=None, fs=9):
    s = (f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='2' fill='{soft(col, 0.85)}' stroke='{col}' stroke-width='1'/>"
         f"<line x1='{x + 2}' y1='{y + 5}' x2='{x + w - 2}' y2='{y + 5}' stroke='white' stroke-opacity='0.6'/>"
         f"<line x1='{x + 2}' y1='{y + h - 5}' x2='{x + w - 2}' y2='{y + h - 5}' stroke='white' stroke-opacity='0.6'/>")
    if label:
        s += f"<text x='{x + w / 2}' y='{y + h + 12}' text-anchor='middle' font-size='{fs}'>{label}</text>"
    return s


# ── Phase 1: 1,000 cubbies, 5 books ────────────────────────────────────────
def fig_phase1():
    out = [f"<g {FONT}>"]
    out.append("<text x='20' y='22' font-size='14' font-weight='800'>Phase 1: one reserved cubby per book</text>")
    out.append("<text x='20' y='40' font-size='11.5' opacity='0.7'>1,000 cubbies on the wall. Only the first 5 are ever used.</text>")
    cols, rows, cw, ch, x0, y0 = 40, 12, 14, 16, 20, 56
    skip_rows = {0: range(5, 40)}
    reserved = {0: ("Bible", A), 1: ("Dracula", R), 2: ("Odyssey", G), 3: ("The Great Gatsby", Y), 4: ("Pride and Prejudice", A)}
    out.append("<g><title>Most of the wall: empty cubbies reserved for books the library does not have. This is the waste.</title>")
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            if i in reserved or (r == 0 and c >= 5):
                continue
            out.append(f"<rect x='{x0 + c * cw}' y='{y0 + r * ch}' width='{cw - 2}' height='{ch - 2}' rx='2' fill='none' stroke='currentColor' stroke-opacity='0.18'/>")
    out.append("</g>")
    for i, (name, col) in reserved.items():
        c, r = i % cols, i // cols
        out.append(f"<g><title>Cubby {i}: reserved for '{name}'. Go straight there to find it.</title>")
        out.append(f"<rect x='{x0 + c * cw}' y='{y0 + r * ch}' width='{cw - 2}' height='{ch - 2}' rx='2' fill='{soft(col, 0.25)}' stroke='{col}' stroke-width='1.3'/>")
        out.append(f"<rect x='{x0 + c * cw + 3}' y='{y0 + r * ch + 2}' width='{cw - 8}' height='{ch - 6}' rx='1' fill='{col}'/></g>")
    out.append(f"<text x='{x0 + 80}' y='{y0 + 12}' font-size='11.5' font-weight='700' fill='{G}'>← the 5 used cubbies: search = walk straight to the book, O(1)</text>")
    yb = y0 + rows * ch + 20
    out.append(f"<text x='{x0}' y='{yb}' font-size='11.5' opacity='0.8'>About 480 of the 1,000 cubbies shown; the real wall keeps going.</text>")
    out.append(f"<rect x='{x0}' y='{yb + 10}' width='560' height='16' rx='8' fill='{soft(R, 0.15)}' stroke='{R}' stroke-width='1'/>"
               f"<rect x='{x0}' y='{yb + 10}' width='3' height='16' rx='1.5' fill='{G}'/>"
               f"<text x='{x0 + 566}' y='{yb + 22}' font-size='11' fill='{R}' font-weight='700'>995 wasted</text>"
               f"<text x='{x0 + 8}' y='{yb + 22}' font-size='10.5'>used: 0.5%</text>")
    out.append("</g>")
    return "".join(out), f"0 0 660 {yb + 40}"


# ── Phase 2: 10 cubbies, count letters, mod 10 ─────────────────────────────
def cubby_row(x0, y0, contents, hl=None, w=56, h=62, chains=None):
    """contents: {slot: [(title, col), ...]} drawn as spines inside/hanging from each cubby."""
    out = []
    for s in range(10):
        x = x0 + s * (w + 4)
        stroke = R if hl == s else "currentColor"
        op = "1" if hl == s else "0.35"
        out.append(f"<rect x='{x}' y='{y0}' width='{w}' height='{h}' rx='6' fill='{soft(R, 0.08) if hl == s else 'none'}' stroke='{stroke}' stroke-opacity='{op}' stroke-width='{1.8 if hl == s else 1.2}'/>")
        out.append(f"<text x='{x + w / 2}' y='{y0 + h + 16}' text-anchor='middle' font-size='12' font-weight='700' fill='{A}'>{s}</text>")
        items = contents.get(s, [])
        for k, (title, col) in enumerate(items):
            if k == 0:
                out.append(f"<g><title>Cubby {s}: '{title}'.</title>" + spine(x + w / 2 - 8, y0 + 8, 16, h - 16, col) + "</g>")
            else:  # hanging on the chain
                yy = y0 + h + 22 + (k - 1) * 58
                out.append(f"<g><title>Chained to cubby {s}: '{title}'.</title>"
                           f"<line x1='{x + w / 2}' y1='{yy - 22 + (0 if k > 1 else 0)}' x2='{x + w / 2}' y2='{yy + 4}' stroke='currentColor' stroke-width='2' stroke-dasharray='3 2' opacity='0.7'/>"
                           + spine(x + w / 2 - 8, yy + 4, 16, 44, col) + "</g>")
    return "".join(out)


def fig_phase2():
    out = [f"<g {FONT}>"]
    out.append("<text x='20' y='22' font-size='14' font-weight='800'>Phase 2: 10 cubbies, and a rule that picks the cubby</text>")
    out.append(f"<text x='20' y='42' font-size='12' opacity='0.8'>Rule: count the letters in the title, keep only the last digit (letters mod 10). That digit is the cubby.</text>")
    rows = [("Bible", 5, A), ("The Great Gatsby", 14, Y), ("Odyssey", 7, G), ("Dracula", 7, R), ("Pride and Prejudice", 17, "rgb(var(--muted-foreground))")]
    y = 64
    for t, n, col in rows:
        slot = n % 10
        clash = t in ("Dracula", "Pride and Prejudice")
        out.append(f"<g><title>'{t}' has {n} letters (spaces don't count). {n} mod 10 = {slot}, so it goes to cubby {slot}.{' Cubby 7 is already taken: collision!' if clash else ''}</title>"
                   f"<rect x='20' y='{y - 13}' width='10' height='16' rx='2' fill='{col}'/>"
                   f"<text x='38' y='{y}' font-size='13' font-weight='600'>{t}</text>"
                   f"<text x='228' y='{y}' font-size='12.5' {MONO}>{n} letters</text>"
                   f"<text x='318' y='{y}' font-size='12.5' {MONO}>→ {n} mod 10 = </text>"
                   f"<text x='438' y='{y}' font-size='13' font-weight='800' fill='{R if clash else A}' {MONO}>{slot}</text>"
                   + (f"<text x='460' y='{y}' font-size='11.5' font-weight='700' fill='{R}'>collision with Odyssey!</text>" if clash else "") + "</g>")
        y += 24
    out.append(cubby_row(20, y + 10, {5: [("Bible", A)], 4: [("The Great Gatsby", Y)], 7: [("Odyssey", G)]}, hl=7))
    yy = y + 10 + 62 + 34
    out.append(f"<text x='20' y='{yy}' font-size='12' fill='{G}' font-weight='700'>Works: only 10 cubbies, no waste, still one step to the right cubby.</text>")
    out.append(f"<text x='20' y='{yy + 18}' font-size='12' fill='{R}' font-weight='700'>Breaks: Dracula and Pride and Prejudice also land on cubby 7, which holds only one book.</text>")
    out.append("</g>")
    return "".join(out), f"0 0 660 {yy + 30}"


def fig_phase3():
    out = [f"<g {FONT}>"]
    out.append("<text x='20' y='22' font-size='14' font-weight='800'>Phase 3: a chain hangs from any cubby that needs more room</text>")
    out.append("<text x='20' y='42' font-size='12' opacity='0.8'>Same 10 cubbies, same rule. A second or third book gets clipped onto that cubby's chain.</text>")
    out.append(cubby_row(20, 76, {5: [("Bible", A)], 4: [("The Great Gatsby", Y)], 7: [("Odyssey", G), ("Dracula", R), ("Pride and Prejudice", "rgb(var(--muted-foreground))")]}))
    x7 = 20 + 7 * 60 + 28
    out.append(f"<g><title>search('Dracula'): the rule says cubby 7. Look at Odyssey (no), follow the chain to Dracula (yes).</title>"
               f"<text x='{x7 + 26}' y='184' font-size='12' font-weight='700' fill='{R}'>← Dracula</text>"
               f"<text x='{x7 + 26}' y='242' font-size='12' font-weight='700' fill='rgb(var(--muted-foreground))'>← Pride and Prejudice</text>"
               f"<text x='{x7}' y='70' text-anchor='middle' font-size='12' font-weight='700' fill='{G}'>Odyssey ↓</text></g>")
    out.append(f"<g><title>The search walk.</title><rect x='20' y='272' width='620' height='52' rx='10' fill='{soft(A, 0.07)}' stroke='{A}' stroke-opacity='0.5'/>"
               f"<text x='34' y='292' font-size='12.5' font-weight='700'>search(\"Dracula\"):</text>"
               f"<text x='34' y='312' font-size='12' {MONO}>rule → cubby 7 · Odyssey? no → follow chain · Dracula? yes, found (2 looks)</text></g>")
    out.append("</g>")
    return "".join(out), "0 0 660 336"


# ── Direct-address table (CLRS p. 254 style) ────────────────────────────────
def fig_direct():
    out = [f"<g {FONT}>"]
    # universe blob
    out.append(f"<g><title>U, the universe: every key that could ever exist. Here just 0 to 9.</title>"
               f"<ellipse cx='150' cy='150' rx='130' ry='112' fill='{soft(A, 0.05)}' stroke='currentColor' stroke-opacity='0.4'/>"
               f"<text x='40' y='56' font-size='13' font-weight='800'>U (universe of keys)</text></g>")
    out.append(f"<g><title>K, the actual keys in use: 2, 3, 5, 8.</title><ellipse cx='175' cy='175' rx='66' ry='54' fill='{soft(G, 0.12)}' stroke='{G}' stroke-width='1.5'/>"
               f"<text x='150' y='242' font-size='12' font-weight='800' fill='{G}'>K (actual keys)</text></g>")
    unused = {0: (70, 110), 1: (110, 80), 4: (70, 170), 6: (95, 215), 7: (205, 90), 9: (245, 100)}
    used = {2: (150, 160), 3: (195, 150), 5: (160, 195), 8: (205, 195)}
    for k, (x, y) in unused.items():
        out.append(f"<text x='{x}' y='{y}' font-size='14' opacity='0.5' text-anchor='middle'>{k}</text>")
    # table
    tx, ty, rh = 420, 30, 26
    for i in range(10):
        y = ty + i * rh
        has = i in used
        out.append(f"<g><title>T[{i}]{': holds the value for key ' + str(i) if has else ': null (no key ' + str(i) + ' stored)'}</title>"
                   f"<rect x='{tx}' y='{y}' width='70' height='{rh}' fill='{soft(G, 0.14) if has else 'none'}' stroke='currentColor' stroke-opacity='0.5'/>"
                   f"<text x='{tx - 10}' y='{y + 17}' text-anchor='end' font-size='12' fill='{A}' font-weight='700'>{i}</text>"
                   + (f"<text x='{tx + 35}' y='{y + 17}' text-anchor='middle' font-size='12' {MONO}>•</text>" if has else f"<text x='{tx + 35}' y='{y + 17}' text-anchor='middle' font-size='11' opacity='0.45' {MONO}>null</text>")
                   + "</g>")
        if has:
            out.append(f"<rect x='{tx + 110}' y='{y + 3}' width='90' height='{rh - 6}' rx='4' fill='{soft(Y, 0.15)}' stroke='{Y}'/><text x='{tx + 155}' y='{y + 17}' text-anchor='middle' font-size='11' {MONO}>key {i} | data</text>"
                       f"<line x1='{tx + 40}' y1='{y + 13}' x2='{tx + 108}' y2='{y + 13}' stroke='{Y}' stroke-width='1.3'/>")
    for k, (x, y) in used.items():
        ty_k = ty + k * rh + 13
        out.append(f"<g><title>Key {k} goes straight to slot {k}. The key IS the index.</title><text x='{x}' y='{y}' font-size='15' font-weight='800' text-anchor='middle' fill='{G}'>{k}</text>"
                   f"<line x1='{x + 8}' y1='{y - 5}' x2='{tx - 4}' y2='{ty_k}' stroke='{G}' stroke-width='1.2' stroke-opacity='0.8'/></g>")
    out.append(f"<text x='{tx + 35}' y='{ty + 10 * rh + 20}' text-anchor='middle' font-size='13' font-weight='800'>T</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 310"


def fig_ids():
    out = [f"<g {FONT}>"]
    out.append("<text x='20' y='22' font-size='14' font-weight='800'>Direct addressing with SJSU student IDs</text>")
    out.append("<text x='20' y='42' font-size='12' opacity='0.8'>9-digit IDs → an array with about 1,000,000,000 slots. SJSU has about 40,000 students.</text>")
    # 1000 dots grid (each dot = 1,000,000 slots)
    x0, y0, s = 20, 58, 12
    for i in range(1000):
        c, r = i % 50, i // 50
        col = G if i == 0 else "currentColor"
        op = "1" if i == 0 else "0.16"
        out.append(f"<rect x='{x0 + c * s}' y='{y0 + r * s}' width='{s - 3}' height='{s - 3}' rx='2' fill='{col}' fill-opacity='{op}'/>")
    yb = y0 + 20 * s + 18
    out.append(f"<g><title>Each square is 1,000,000 array slots. All 40,000 real students fit in a tiny corner of ONE square.</title>"
               f"<rect x='{x0}' y='{yb - 10}' width='9' height='9' rx='2' fill='{G}'/><text x='{x0 + 16}' y='{yb - 2}' font-size='12'>1 square = 1,000,000 slots. All 40,000 students use 4% of the first square.</text></g>")
    out.append(f"<text x='{x0}' y='{yb + 20}' font-size='12' fill='{R}' font-weight='700'>99.996% of the array is null. Fast, but the memory bill is absurd.</text>")
    out.append("</g>")
    return "".join(out), f"0 0 660 {yb + 34}"


# ── Hash function picture (CLRS p. 256 style) ───────────────────────────────
def fig_hash(collide=True):
    out = [f"<g {FONT}>"]
    out.append(f"<g><title>U: a huge universe of possible keys (every book title, every student ID…).</title><ellipse cx='150' cy='150' rx='135' ry='118' fill='{soft(A, 0.05)}' stroke='currentColor' stroke-opacity='0.4'/>"
               f"<text x='40' y='50' font-size='13' font-weight='800'>U (huge)</text></g>")
    out.append(f"<g><title>K: the few keys actually stored.</title><ellipse cx='165' cy='170' rx='78' ry='66' fill='{soft(G, 0.12)}' stroke='{G}' stroke-width='1.5'/>"
               f"<text x='130' y='250' font-size='12' font-weight='800' fill='{G}'>K (actual keys)</text></g>")
    keys = {"k₁": (130, 140, 1), "k₂": (185, 130, 3), "k₃": (140, 190, 6), "k₄": (200, 185, 5), "k₅": (170, 215, 3 if collide else 7)}
    tx, ty, rh, m = 460, 40, 26, 8
    out.append(f"<g><title>h, the hash function: computes a slot number from any key.</title><rect x='318' y='128' width='70' height='44' rx='10' fill='{soft(Y, 0.18)}' stroke='{Y}' stroke-width='1.6'/>"
               f"<text x='353' y='156' text-anchor='middle' font-size='16' font-weight='800' {MONO}>h(k)</text></g>")
    for i in range(m):
        y = ty + i * rh
        full = i in [v[2] for v in keys.values()]
        hit = collide and i == 3
        out.append(f"<rect x='{tx}' y='{y}' width='70' height='{rh}' fill='{soft(R, 0.16) if hit else (soft(G, 0.12) if full else 'none')}' stroke='{R if hit else 'currentColor'}' stroke-opacity='{1 if hit else 0.5}'/>"
                   f"<text x='{tx - 10}' y='{y + 17}' text-anchor='end' font-size='12' font-weight='700' fill='{A}'>{i}</text>")
    for k, (x, y, slot) in keys.items():
        c = R if (collide and slot == 3) else G
        ys = ty + slot * rh + 13
        out.append(f"<g><title>{k} → h({k}) = {slot}</title><text x='{x}' y='{y}' font-size='14' font-weight='800' text-anchor='middle' fill='{c}'>{k}</text>"
                   f"<path d='M{x + 12} {y - 5} Q 280 {y - 5}, 318 {140 + (y - 130) / 8:.0f}' fill='none' stroke='{c}' stroke-width='1.2' stroke-opacity='0.8'/>"
                   f"<path d='M388 {140 + (y - 130) / 8:.0f} Q 420 {ys}, {tx - 4} {ys}' fill='none' stroke='{c}' stroke-width='1.2' stroke-opacity='0.8'/></g>")
    out.append(f"<text x='{tx + 35}' y='{ty + m * rh + 20}' text-anchor='middle' font-size='13' font-weight='800'>T[0..m−1]</text>")
    if collide:
        out.append(f"<g><title>Two different keys, one slot: a collision.</title><text x='{tx + 80}' y='{ty + 3 * rh + 17}' font-size='12' font-weight='800' fill='{R}'>← collision</text></g>")
    out.append("</g>")
    return "".join(out), "0 0 660 300"


# ── Powers of two vs primes ─────────────────────────────────────────────────
def fig_bits():
    out = [f"<g {FONT}>"]
    bits = "01111011"
    out.append("<text x='20' y='22' font-size='14' font-weight='800'>Why m = 16 (a power of 2) is a bad table size</text>")
    out.append(f"<text x='20' y='44' font-size='12.5'>k = 123 in binary:</text>")
    for i, b in enumerate(bits):
        kept = i >= 4
        x = 150 + i * 36
        out.append(f"<g><title>{'Kept by mod 16: one of the last 4 bits.' if kept else 'Thrown away by mod 16: this bit never affects the slot.'}</title>"
                   f"<rect x='{x}' y='28' width='30' height='30' rx='5' fill='{soft(G, 0.2) if kept else 'none'}' stroke='{G if kept else 'currentColor'}' stroke-opacity='{1 if kept else 0.35}' stroke-dasharray='{'0' if kept else '4 3'}'/>"
                   f"<text x='{x + 15}' y='49' text-anchor='middle' font-size='16' font-weight='700' opacity='{1 if kept else 0.4}' {MONO}>{b}</text></g>")
    out.append(f"<text x='150' y='80' font-size='11.5' opacity='0.7'>ignored by mod 16</text><text x='300' y='80' font-size='11.5' font-weight='700' fill='{G}'>123 mod 16 = 1011₂ = 11</text>")
    out.append(f"<text x='20' y='112' font-size='12.5'>So every key with the same last 4 bits lands in the same slot, no matter what the rest of the key is:</text>")
    for j, k in enumerate([11, 27, 43, 123, 251]):
        out.append(f"<text x='{40 + j * 118}' y='138' font-size='13' {MONO}>{k} → {k % 16}</text>")
    out.append(f"<text x='20' y='170' font-size='12.5' font-weight='700' fill='{G}'>Better: a prime m not close to a power of 2. Then every bit of k changes the slot.</text>")
    out.append(f"<text x='20' y='192' font-size='12' opacity='0.8'>Slide example: 2,000 items at 75% full → m ≈ 2000 / 0.75 = 2667 → pick the nearby prime 2663.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 206"


# ── Chaining: detailed linked-list nodes ────────────────────────────────────
def node(x, y, k, v, col, last=False):
    s = (f"<rect x='{x}' y='{y}' width='92' height='30' rx='6' fill='{soft(col, 0.14)}' stroke='{col}' stroke-width='1.4'/>"
         f"<line x1='{x + 34}' y1='{y}' x2='{x + 34}' y2='{y + 30}' stroke='{col}' stroke-opacity='0.6'/><line x1='{x + 66}' y1='{y}' x2='{x + 66}' y2='{y + 30}' stroke='{col}' stroke-opacity='0.6'/>"
         f"<text x='{x + 17}' y='{y + 20}' text-anchor='middle' font-size='13' font-weight='800' {MONO}>{k}</text>"
         f"<text x='{x + 50}' y='{y + 20}' text-anchor='middle' font-size='12' {MONO}>'{v}'</text>")
    if last:
        s += f"<text x='{x + 79}' y='{y + 20}' text-anchor='middle' font-size='10' opacity='0.6' {MONO}>/</text>"
    else:
        s += f"<circle cx='{x + 79}' cy='{y + 15}' r='3' fill='{col}'/>"
    return s


def fig_chain_table():
    out = [f"<g {FONT}>"]
    out.append("<text x='20' y='20' font-size='14' font-weight='800'>The finished table: m = 10, h(k) = k mod 10, chaining, insert at head</text>")
    chains = {2: [(82, "c"), (42, "a")], 5: [(55, "e")], 7: [(37, "d"), (17, "b")], 9: [(99, "f")]}
    tx, ty, rh = 60, 36, 30
    for i in range(10):
        y = ty + i * rh
        ch = chains.get(i)
        out.append(f"<rect x='{tx}' y='{y}' width='40' height='{rh}' fill='{soft(A, 0.08) if ch else 'none'}' stroke='currentColor' stroke-opacity='0.5'/>"
                   f"<text x='{tx - 10}' y='{y + 20}' text-anchor='end' font-size='12' font-weight='700' fill='{A}'>{i}</text>")
        if not ch:
            out.append(f"<text x='{tx + 20}' y='{y + 19}' text-anchor='middle' font-size='10' opacity='0.45' {MONO}>/</text>")
            continue
        out.append(f"<circle cx='{tx + 20}' cy='{y + 15}' r='3' fill='{A}'/>")
        x = tx + 70
        out.append(f"<line x1='{tx + 23}' y1='{y + 15}' x2='{x - 3}' y2='{y + 15}' stroke='{A}' stroke-width='1.4' marker-end='url(#chA)'/>")
        for j, (k, v) in enumerate(ch):
            col = G if j == 0 else Y
            last = j == len(ch) - 1
            out.append(f"<g><title>Node ({k}, '{v}'): key | value | next pointer.{' Newest: it was inserted at the head.' if j == 0 and len(ch) > 1 else ''}</title>" + node(x, y, k, v, col, last) + "</g>")
            if not last:
                out.append(f"<line x1='{x + 82}' y1='{y + 15}' x2='{x + 118}' y2='{y + 15}' stroke='currentColor' stroke-width='1.4' marker-end='url(#chA)'/>")
            x += 122
    out.insert(1, f"<defs><marker id='chA' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='6' markerHeight='6' orient='auto'><path d='M0 0L10 5L0 10z' fill='currentColor'/></marker></defs>")
    lx = 400
    out.append(f"<g><title>How to read a node.</title><rect x='{lx}' y='60' width='240' height='108' rx='10' fill='{soft(A, 0.05)}' stroke='currentColor' stroke-opacity='0.25'/>"
               f"<text x='{lx + 12}' y='80' font-size='12' font-weight='800'>Reading one node</text>" + node(lx + 12, 90, 82, "c", G)
               + f"<text x='{lx + 12}' y='140' font-size='11' {MONO}>key | value | next</text>"
               f"<text x='{lx + 12}' y='158' font-size='11' opacity='0.75'>'/' = next is null (end of chain)</text></g>")
    out.append(f"<g><title>Green nodes were inserted last, so they sit at the head.</title><text x='{lx}' y='200' font-size='12' fill='{G}' font-weight='700'>green = newest, at the head</text>"
               f"<text x='{lx}' y='220' font-size='12' fill='{Y}' font-weight='700'>amber = pushed back by a newer key</text></g>")
    out.append("</g>")
    return "".join(out), "0 0 660 346"


# ── Load factor gauge ───────────────────────────────────────────────────────
def fig_alpha():
    out = [f"<g {FONT}>"]
    out.append("<text x='20' y='22' font-size='14' font-weight='800'>Load factor α = n / m: how many items per slot, on average</text>")
    cases = [(5, 10, G, "α = 0.5: chains are tiny"), (10, 10, Y, "α = 1: about one item per slot"), (30, 10, R, "α = 3: search walks ~3 nodes")]
    y = 46
    for n, m, col, lab in cases:
        per = [n // m + (1 if i < n % m else 0) for i in range(m)]
        # distribute a bit unevenly for realism
        out.append(f"<text x='20' y='{y + 14}' font-size='12.5' font-weight='700' fill='{col}'>n = {n}, m = {m}</text><text x='20' y='{y + 30}' font-size='11.5' opacity='0.8'>{lab}</text>")
        for i in range(m):
            x = 200 + i * 42
            out.append(f"<rect x='{x}' y='{y}' width='34' height='14' rx='3' fill='none' stroke='currentColor' stroke-opacity='0.45'/>")
            for d in range(per[i]):
                out.append(f"<rect x='{x + 6}' y='{y + 18 + d * 9}' width='22' height='7' rx='2' fill='{col}' fill-opacity='0.8'/>")
        y += 18 + max(per) * 9 + 28
    out.append("</g>")
    return "".join(out), f"0 0 660 {y}"


# ── Amortized cost chart ────────────────────────────────────────────────────
def fig_amortized():
    out = [f"<g {FONT}>"]
    out.append("<text x='20' y='22' font-size='14' font-weight='800'>Cost of each insert, with resizing when α passes 0.75</text>")
    m, n, costs, resizes = 4, 0, [], []
    for i in range(1, 49):
        n += 1
        c = 1
        if n / m > 0.75:
            c += n  # copy everything
            resizes.append((i, m, 2 * m))
            m *= 2
        costs.append(c)
    base, x0, bw = 250, 30, 11
    maxc = max(costs)
    out.append(f"<line x1='{x0}' y1='{base}' x2='{x0 + len(costs) * bw}' y2='{base}' stroke='currentColor' stroke-opacity='0.4'/>")
    for i, c in enumerate(costs):
        h = c / maxc * 190
        big = c > 1
        out.append(f"<g><title>Insert #{i + 1}: cost {c}{' (includes copying ' + str(c - 1) + ' items into a table twice as big)' if big else ''}</title>"
                   f"<rect x='{x0 + i * bw}' y='{base - max(h, 3)}' width='{bw - 3}' height='{max(h, 3)}' rx='2' fill='{R if big else G}' fill-opacity='{0.85 if big else 0.7}'/></g>")
    total = sum(costs)
    avg = total / len(costs)
    ya = base - avg / maxc * 190
    out.append(f"<line x1='{x0}' y1='{ya}' x2='{x0 + len(costs) * bw}' y2='{ya}' stroke='{A}' stroke-width='2' stroke-dasharray='6 4'/>"
               f"<text x='{x0 + len(costs) * bw - 4}' y='{ya - 8}' text-anchor='end' font-size='12' font-weight='800' fill='{A}'>average ≈ {avg:.1f} per insert</text>")
    for (i, a, b) in resizes[-3:]:
        out.append(f"<text x='{x0 + (i - 1) * bw + 4}' y='{base - costs[i - 1] / maxc * 190 - 6}' text-anchor='middle' font-size='10' fill='{R}'>{a}→{b}</text>")
    out.append(f"<text x='{x0}' y='{base + 20}' font-size='11.5' opacity='0.8'>48 inserts from m = 4. Green: normal insert, cost 1. Red: an insert that triggered a resize (copy all n).</text>")
    out.append(f"<text x='{x0}' y='{base + 38}' font-size='11.5' opacity='0.8'>Spikes grow but get twice as far apart, so the average stays a small constant.</text>")
    out.append("</g>")
    return "".join(out), "0 0 660 300"
