"""SVG figures for CS 146 Lecture 10 (linear-time sorts)."""
A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"
MONO = "font-family='ui-monospace, SFMono-Regular, monospace'"


def soft(col, a):
    return col[:-1] + f" / {a})"


def _box(x, y, label, col, open_=False, tip=""):
    s = f"<g><title>{tip}</title>"
    s += f"<rect x='{x}' y='{y}' width='56' height='46' rx='6' fill='{soft(col, 0.14)}' stroke='{col}' stroke-width='1.4'/>"
    if open_:
        s += f"<path d='M{x - 4} {y} L{x + 10} {y - 16} L{x + 66} {y - 16} L{x + 60} {y}' fill='{soft(col, 0.08)}' stroke='{col}' stroke-width='1.2'/>"
        s += f"<text x='{x + 28}' y='{y + 30}' text-anchor='middle' font-size='18' font-weight='800' {MONO}>{label}</text>"
    else:
        s += f"<text x='{x + 28}' y='{y + 31}' text-anchor='middle' font-size='20' font-weight='800' opacity='0.55'>?</text>"
    return s + "</g>"


def fig_boxes():
    """Comparison sorts weigh closed boxes; non-comparison sorts open them."""
    o = [f"<g {FONT}>"]
    o.append("<text x='20' y='24' font-size='14' font-weight='800'>Comparison sorts: boxes stay closed</text>")
    o.append("<text x='20' y='42' font-size='11.5' opacity='0.7'>The only question allowed: which of these two is lighter?</text>")
    for i in range(4):
        o.append(_box(24 + i * 72, 64, "", A, tip="A closed box. A comparison sort can't see what's inside; it can only compare two boxes."))
    o.append(f"<g><title>One comparison answers one yes/no question. Sorting n items this way needs at least about n log n of them in the worst case.</title>"
             f"<path d='M52 122 Q88 146 124 122' fill='none' stroke='{Y}' stroke-width='1.6' stroke-dasharray='4 3'/>"
             f"<text x='88' y='160' text-anchor='middle' font-size='12' font-weight='700' fill='{Y}'>A &lt; B ?</text></g>")
    o.append(f"<text x='20' y='196' font-size='12'>Insertion, merge, heap, quicksort: <tspan font-weight='800' fill='{R}'>Ω(n log n)</tspan> comparisons, no way around it.</text>")

    x0 = 360
    o.append(f"<text x='{x0}' y='24' font-size='14' font-weight='800'>Linear-time sorts: open the boxes</text>")
    o.append(f"<text x='{x0}' y='42' font-size='11.5' opacity='0.7'>Read the value, then compute where it goes.</text>")
    vals = [3, 0, 2, 1]
    for i, v in enumerate(vals):
        o.append(_box(x0 + 4 + i * 72, 64, str(v), G, open_=True, tip=f"An opened box: the value is {v}, so it can go straight to slot {v}. No comparison needed."))
    # target slots
    for s in range(4):
        o.append(f"<g><title>Slot {s} of the output.</title><rect x='{x0 + 4 + s * 72}' y='150' width='56' height='30' rx='5' fill='none' stroke='currentColor' stroke-opacity='0.35'/>"
                 f"<text x='{x0 + 32 + s * 72}' y='196' text-anchor='middle' font-size='10.5' opacity='0.6' {MONO}>{s}</text></g>")
    for i, v in enumerate(vals):
        x1, x2 = x0 + 32 + i * 72, x0 + 32 + v * 72
        o.append(f"<path d='M{x1} 112 C{x1} 132 {x2} 128 {x2} 148' fill='none' stroke='{G}' stroke-width='1.5' marker-end='url(#ah10)'/>")
    o.append(f"<defs><marker id='ah10' viewBox='0 0 8 8' refX='7' refY='4' markerWidth='7' markerHeight='7' orient='auto'><path d='M0 0 L8 4 L0 8 Z' fill='{G}'/></marker></defs>")
    o.append(f"<text x='{x0}' y='222' font-size='12'>Counting, radix, bucket: <tspan font-weight='800' fill='{G}'>Θ(n)</tspan> when the values are small or evenly spread.</text>")
    o.append("</g>")
    return "".join(o), "0 0 700 236"


def fig_seats():
    """Counting sort's cumulative count as reserved seats in the output."""
    a = [4, 1, 0, 2, 1, 0]
    cum = [2, 4, 5, 5, 6]
    cols = [A, G, Y, R, "rgb(var(--accent-fg))"]
    o = [f"<g {FONT}>"]
    o.append("<text x='20' y='24' font-size='14' font-weight='800'>Cumulative count = seats saved in the output</text>")
    o.append(f"<text x='20' y='42' font-size='11.5' opacity='0.7'>a = [4, 1, 0, 2, 1, 0], k = 4. count after step 2: [2, 4, 5, 5, 6]</text>")
    x0, y0, w = 90, 70, 70
    o.append(f"<text x='20' y='{y0 + 26}' font-size='12' font-weight='700' {MONO}>output</text>")
    start = 0
    grp = 0
    for v in range(5):
        end = cum[v]
        for s in range(start, end):
            o.append(f"<g><title>Seat {s}: saved for a {v}. count[{v}] = {cum[v]} means {cum[v]} items are ≤ {v}, so the {v}s end at seat {cum[v] - 1}.</title>"
                     f"<rect x='{x0 + s * w}' y='{y0}' width='{w - 6}' height='40' rx='6' fill='{soft(cols[v], 0.16)}' stroke='{cols[v]}' stroke-width='1.4'/>"
                     f"<text x='{x0 + s * w + (w - 6) / 2}' y='{y0 + 26}' text-anchor='middle' font-size='16' font-weight='800' {MONO}>{v}</text></g>")
        if end > start:
            mid = x0 + (start * w + end * w - 6) / 2
            o.append(f"<path d='M{x0 + start * w} {y0 + 52} L{x0 + start * w} {y0 + 58} L{x0 + end * w - 6} {y0 + 58} L{x0 + end * w - 6} {y0 + 52}' fill='none' stroke='{cols[v]}' stroke-width='1.3'/>")
            o.append(f"<text x='{mid}' y='{y0 + 76 + (16 if grp % 2 else 0)}' text-anchor='middle' font-size='11' fill='{cols[v]}' font-weight='700'>count[{v}] = {cum[v]}</text>")
            grp += 1
        start = end
    for s in range(6):
        o.append(f"<text x='{x0 + s * w + (w - 6) / 2}' y='{y0 - 6}' text-anchor='middle' font-size='10' opacity='0.55' {MONO}>{s}</text>")
    o.append(f"<g><title>No 3s in the input: count[3] = count[2] = 5, so zero seats are saved for 3.</title><text x='20' y='{y0 + 118}' font-size='11.5' opacity='0.85'>No 3s: count[3] = count[2] = 5, so zero seats.</text><text x='20' y='{y0 + 134}' font-size='11.5' opacity='0.85'>Value v's seats end at index count[v] − 1.</text></g>")
    o.append("</g>")
    return "".join(o), "0 0 520 214"
