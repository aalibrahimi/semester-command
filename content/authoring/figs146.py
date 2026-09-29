"""Drawing primitives for the CS 146 figures. Everything themes itself:
text is currentColor, fills are CSS-var tints, so dark and light both work.
Wrap meaningful parts in g(title, ...) so the slide view can build them up
one at a time and hovering explains each part."""
import math
from steps_svg import INK, MUTE, GRID, AXIS, PANEL, PANEL_B, BRAND, BRANDF, GREEN, GREENF, AMBER, AMBERF, RED, FONT, MONO, f, path, text, g, defs

REDF = "rgb(var(--critical-fg))"
# Softer, more modern tones: light tinted fills, faint outlines.
TONE = {
    "brand": ("rgb(var(--accent) / 0.11)", "rgb(var(--accent) / 0.35)", BRANDF),
    "green": ("rgb(var(--on-track) / 0.12)", "rgb(var(--on-track) / 0.38)", GREENF),
    "amber": ("rgb(var(--at-risk) / 0.12)", "rgb(var(--at-risk) / 0.4)", AMBERF),
    "red": ("rgb(var(--critical) / 0.10)", "rgb(var(--critical) / 0.38)", REDF),
    "plain": ("rgb(var(--foreground) / 0.035)", "rgb(var(--foreground) / 0.10)", INK),
    "ghost": ("none", "rgb(var(--foreground) / 0.18)", MUTE),
}
APPFONT = "font-family='inherit'"
APPMONO = "font-family='Geist Mono Variable, ui-monospace, SFMono-Regular, Menlo, monospace'"

_uid = [0]

def fig(body, w, h):
    """Wrap a figure body: markers with unique ids, the font. Returns (svg, viewBox)."""
    _uid[0] += 1
    u = f"c{_uid[0]}"
    b = body.replace("url(#arrowS)", f"url(#arrowS{u})").replace("url(#arrowB)", f"url(#arrowB{u})")
    b = b.replace(FONT, APPFONT).replace(MONO, APPMONO)
    return defs(u) + f"<g {APPFONT}>" + b + "</g>", f"0 0 {w} {h}"

def T(x, y, s, size=12, fill=INK, anchor="start", weight=400, mono=False, extra=""):
    # SVG collapses leading spaces; keep code indentation with no-break spaces.
    import re
    s = re.sub(r"^ +| {2,}", lambda m: "\u00a0" * len(m.group()), s)
    return text(x, y, s, size, fill, anchor, weight, mono, extra)

def lines_(x, y, rows, size=11.5, fill=INK, anchor="start", lh=16, weight=400, mono=False):
    return "".join(T(x, y + i * lh, r, size, fill, anchor, weight, mono) for i, r in enumerate(rows))

def box(x, y, w, h, label="", sub=None, tone="plain", size=13, r=12, weight=600, mono=False, dashed=False, subsize=10.5):
    fill, stroke, tf = TONE[tone]
    dash = " stroke-dasharray='4 3'" if dashed else ""
    s = f"<rect x='{f(x)}' y='{f(y)}' width='{f(w)}' height='{f(h)}' rx='{r}' fill='{fill}' stroke='{stroke}' stroke-width='1'{dash}/>"
    if label:
        cy = y + h / 2 + (size * 0.4 if not sub else -2)
        s += T(x + w / 2, cy, label, size, tf if tone not in ("plain",) else INK, "middle", weight, mono)
    if sub:
        s += T(x + w / 2, y + h / 2 + 14, sub, subsize, MUTE, "middle")
    return s

def arrow(x1, y1, x2, y2, color="rgb(var(--foreground) / 0.3)", w=1.4, brand=False, dashed=False):
    m = "arrowB" if brand else "arrowS"
    c = BRAND if brand else color
    d = " stroke-dasharray='4 3'" if dashed else ""
    return f"<line x1='{f(x1)}' y1='{f(y1)}' x2='{f(x2)}' y2='{f(y2)}' stroke='{c}' stroke-width='{w}' stroke-linecap='round' marker-end='url(#{m})'{d}/>"

def curve_arrow(x1, y1, x2, y2, bend=-30, brand=False, w=1.5):
    m = "arrowB" if brand else "arrowS"
    c = BRAND if brand else AXIS
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2 + bend
    return f"<path d='M{f(x1)} {f(y1)} Q{f(mx)} {f(my)} {f(x2)} {f(y2)}' fill='none' stroke='{c}' stroke-width='{w}' marker-end='url(#{m})'/>"

def line(x1, y1, x2, y2, color=AXIS, w=1.2, dashed=False, op=None):
    d = " stroke-dasharray='4 3'" if dashed else ""
    o = f" stroke-opacity='{op}'" if op is not None else ""
    return f"<line x1='{f(x1)}' y1='{f(y1)}' x2='{f(x2)}' y2='{f(y2)}' stroke='{color}' stroke-width='{w}'{d}{o}/>"

def cells(x, y, vals, cw=40, ch=36, tones=None, idx=True, idx0=0, size=14, idxsize=9.5, gap=0):
    """A row of array cells. tones: {i: tone}. Returns svg."""
    tones = tones or {}
    s = ""
    for i, v in enumerate(vals):
        t = tones.get(i, "plain")
        cx = x + i * (cw + gap)
        s += box(cx + 2, y, cw - 4, ch, "" if v is None else str(v), tone=t, size=size, r=8, weight=600 if t != "plain" else 500, mono=True, dashed=(v is None))
        if idx:
            s += T(cx + cw / 2, y + ch + 13, str(i + idx0), idxsize, MUTE, "middle", mono=True)
    return s

def cell_x(x, i, cw=40, gap=0):
    return x + i * (cw + gap) + cw / 2

def pointer(cx, y, label, tone="brand", up=True):
    """A labeled arrow pointing at a cell: from below (up=True) or above."""
    _, stroke, tf = TONE[tone]
    if up:
        return arrow(cx, y + 26, cx, y + 4, color=stroke) + T(cx, y + 40, label, 11, tf, "middle", 700)
    return arrow(cx, y - 26, cx, y - 4, color=stroke) + T(cx, y - 31, label, 11, tf, "middle", 700)

def node(cx, cy, label, tone="plain", r=16, size=13, idx=None):
    fill, stroke, tf = TONE[tone]
    if tone == "plain":
        fill = "rgb(var(--card))"
        stroke = "rgb(var(--foreground) / 0.45)"
    s = f"<circle cx='{f(cx)}' cy='{f(cy)}' r='{r}' fill='{fill}' stroke='{stroke}' stroke-width='1.2'/>"
    s += T(cx, cy + size * 0.38, str(label), size, tf if tone != "plain" else INK, "middle", 600)
    if idx is not None:
        s += T(cx + r + 2, cy - r + 4, str(idx), 9, MUTE)
    return s

def heap_pos(i, cx, y0, width, dy):
    lvl = int(math.floor(math.log2(i + 1)))
    k = i - (2 ** lvl - 1)
    cnt = 2 ** lvl
    x = cx - width / 2 + width * (k + 0.5) / cnt
    return x, y0 + lvl * dy

def heap_tree(vals, cx, y0, width, dy, tones=None, r=16, idx=True, hl_edges=()):
    tones = tones or {}
    s = ""
    for i in range(1, len(vals)):
        p = (i - 1) // 2
        x1, y1 = heap_pos(p, cx, y0, width, dy)
        x2, y2 = heap_pos(i, cx, y0, width, dy)
        on = (p, i) in hl_edges
        s += line(x1, y1, x2, y2, BRAND if on else "rgb(var(--foreground) / 0.35)", 2.2 if on else 1.2)
    for i, v in enumerate(vals):
        x, y = heap_pos(i, cx, y0, width, dy)
        s += node(x, y, v, tones.get(i, "plain"), r, idx=i if idx else None)
    return s

def bar(x, y, w, h, tone="brand", r=3):
    fill, stroke, _ = TONE[tone]
    return f"<rect x='{f(x)}' y='{f(y)}' width='{f(max(w, 0.5))}' height='{f(h)}' rx='{r}' fill='{fill}' stroke='{stroke}'/>"

def plot_axes(x0, y0, w, h, xlabel="", ylabel=""):
    s = line(x0, y0, x0 + w, y0, AXIS, 1.3) + line(x0, y0, x0, y0 - h, AXIS, 1.3)
    if xlabel:
        s += T(x0 + w, y0 + 18, xlabel, 11, MUTE, "end")
    if ylabel:
        s += T(x0 - 6, y0 - h - 6, ylabel, 11, MUTE, "start")
    return s

def fn_path(fn, x0, y0, w, h, xmax, ymax, n=120, color=BRAND, width=2.4, dashed=False, xmin=0):
    pts = []
    for i in range(n + 1):
        xv = xmin + (xmax - xmin) * i / n
        yv = fn(xv)
        if yv > ymax * 1.15:
            pts.append((x0 + (xv - xmin) / (xmax - xmin) * w, y0 - h * 1.15))
            break
        pts.append((x0 + (xv - xmin) / (xmax - xmin) * w, y0 - yv / ymax * h))
    d = " stroke-dasharray='6 4'" if dashed else ""
    return f"<path d='{path(pts)}' fill='none' stroke='{color}' stroke-width='{width}' stroke-linecap='round'{d}/>"

def chip(x, y, label, tone="brand", size=11, anchor="start", pad=7):
    fill, stroke, tf = TONE[tone]
    w = len(label) * size * 0.58 + 2 * pad
    bx = x if anchor == "start" else (x - w / 2 if anchor == "middle" else x - w)
    return f"<rect x='{f(bx)}' y='{f(y - size - 3)}' width='{f(w)}' height='{f(size + 9)}' rx='{(size + 9) / 2}' fill='{fill}' stroke='{stroke}'/>" + T(bx + w / 2, y + 1, label, size, tf, "middle", 700)

def num_badge(x, y, n, r=11):
    return f"<circle cx='{f(x)}' cy='{f(y)}' r='{r}' fill='{BRAND}'/>" + T(x, y + 4, str(n), 11.5, "white", "middle", 700)
