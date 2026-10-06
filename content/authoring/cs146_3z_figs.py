"""Figures for the slow Lecture 3 chapter: the O / Omega / Theta sandwich,
the growth curves, and log n vs n log n as pictures. Every number drawn is
computed here."""
import math

A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"
MONO = "font-family='ui-monospace, SFMono-Regular, monospace'"


def soft(col, a):
    return col[:-1] + f" / {a})"


def _path(fn, x0, x1, y0, sx, sy, n0=1, n1=20, steps=80):
    pts = []
    for i in range(steps + 1):
        n = n0 + (n1 - n0) * i / steps
        pts.append((x0 + (n - n0) * sx, y0 - fn(n) * sy))
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)


def fig_bounds():
    """f(n) = 3n² + 10n + 20 between 3n² (below) and 5n² (above) past n₀."""
    f = lambda n: 3 * n * n + 10 * n + 20
    lo = lambda n: 3 * n * n
    hi = lambda n: 5 * n * n
    # n0 where 5n² >= f(n): 2n² >= 10n + 20 → n >= 6.53 → 7
    n0 = next(n for n in range(1, 50) if hi(n) >= f(n))
    X0, X1, Y0 = 60, 520, 270
    N1 = 14
    sx = (X1 - X0) / (N1 - 1)
    sy = 230 / hi(N1)
    o = [f"<g {FONT}>", "<text x='20' y='22' font-size='14' font-weight='800'>Θ means 'sandwiched': a floor and a ceiling of the same shape</text>"]
    o.append(f"<line x1='{X0}' y1='{Y0}' x2='{X1 + 10}' y2='{Y0}' stroke='currentColor' stroke-opacity='0.4'/><line x1='{X0}' y1='{Y0}' x2='{X0}' y2='34' stroke='currentColor' stroke-opacity='0.4'/>")
    o.append(f"<text x='{X1 + 4}' y='{Y0 + 16}' font-size='11' opacity='0.7'>n (input size)</text><text x='{X0 - 8}' y='44' font-size='11' opacity='0.7' text-anchor='end'>steps</text>")
    nx = X0 + (n0 - 1) * sx
    o.append(f"<rect x='{nx}' y='34' width='{X1 - nx}' height='{Y0 - 34}' fill='{soft(A, 0.05)}'/>")
    o.append(f"<line x1='{nx}' y1='34' x2='{nx}' y2='{Y0}' stroke='{A}' stroke-dasharray='4 4'/><text x='{nx + 4}' y='{Y0 - 6}' font-size='11' fill='{A}' font-weight='700'>n₀ = {n0}</text>")
    o.append(f"<g><title>Ceiling: 5n². Past n₀, f never goes above it. That's the O part.</title><path d='{_path(hi, X0, X1, Y0, sx, sy, 1, N1)}' fill='none' stroke='{R}' stroke-width='2'/></g>")
    o.append(f"<g><title>Floor: 3n². f never goes below it. That's the Ω part.</title><path d='{_path(lo, X0, X1, Y0, sx, sy, 1, N1)}' fill='none' stroke='{G}' stroke-width='2'/></g>")
    o.append(f"<g><title>f(n) = 3n² + 10n + 20, the real step count.</title><path d='{_path(f, X0, X1, Y0, sx, sy, 1, N1)}' fill='none' stroke='currentColor' stroke-width='3'/></g>")
    ye = lambda fn: Y0 - fn(N1) * sy
    o.append(f"<text x='{X1 + 6}' y='{ye(hi) + 4}' font-size='12' fill='{R}' font-weight='700'>5n²  ceiling → O(n²)</text>")
    o.append(f"<text x='{X1 + 6}' y='{ye(f) + 4}' font-size='12' font-weight='700'>f(n)</text>")
    o.append(f"<text x='{X1 + 6}' y='{ye(lo) + 4}' font-size='12' fill='{G}' font-weight='700'>3n²  floor → Ω(n²)</text>")
    o.append(f"<text x='20' y='{Y0 + 36}' font-size='12'>Both bounds are n² times a constant, so f(n) = <tspan font-weight='800' fill='{A}'>Θ(n²)</tspan>. The +10n + 20 stops mattering once n is past n₀.</text>")
    o.append("</g>")
    return "".join(o), "0 0 700 320"


def fig_growth():
    """log n, n, n log n, n² for n = 1..32 on one chart, plus the n = 1,000,000 numbers."""
    X0, X1, Y0, TOP = 60, 470, 270, 40
    N1 = 32
    curves = [("n²", lambda n: n * n, R), ("n log n", lambda n: n * math.log2(n), Y), ("n", lambda n: n, A), ("log n", lambda n: math.log2(n), G)]
    ymax = 32 * math.log2(32) * 1.5  # clip n² off the top on purpose
    sx = (X1 - X0) / (N1 - 1)
    sy = (Y0 - TOP) / ymax
    o = [f"<g {FONT}>", "<text x='20' y='22' font-size='14' font-weight='800'>How the four shapes grow (n from 1 to 32)</text>"]
    o.append(f"<defs><clipPath id='gclip'><rect x='{X0}' y='{TOP}' width='{X1 - X0 + 2}' height='{Y0 - TOP}'/></clipPath></defs>")
    o.append(f"<line x1='{X0}' y1='{Y0}' x2='{X1}' y2='{Y0}' stroke='currentColor' stroke-opacity='0.4'/><line x1='{X0}' y1='{Y0}' x2='{X0}' y2='{TOP}' stroke='currentColor' stroke-opacity='0.4'/>")
    o.append(f"<text x='{X1}' y='{Y0 + 16}' font-size='11' opacity='0.7' text-anchor='end'>n</text><text x='{X0 - 8}' y='{TOP + 8}' font-size='11' opacity='0.7' text-anchor='end'>steps</text>")
    for name, fn, col in curves:
        o.append(f"<g clip-path='url(#gclip)'><title>{name}</title><path d='{_path(fn, X0, X1, Y0, sx, sy, 1, N1, 120)}' fill='none' stroke='{col}' stroke-width='2.6'/></g>")
    labels = {"n²": (X0 + 7.3 * sx * 1.0, TOP + 10), "n log n": (X1 - 70, Y0 - 160 * sy - 6), "n": (X1 - 14, Y0 - 32 * sy - 6), "log n": (X1 - 34, Y0 - 5 * sy - 8)}
    for name, fn, col in curves:
        x, y = labels[name]
        o.append(f"<text x='{x}' y='{y}' font-size='12' font-weight='800' fill='{col}'>{name}</text>")
    # the table at n = 1,000,000
    n = 1_000_000
    rows = [("log n", f"{math.log2(n):.0f}", G), ("n", "1,000,000", A), ("n log n", f"{n * math.log2(n) / 1e6:.0f} million", Y), ("n²", "1,000,000,000,000", R)]
    o.append(f"<text x='500' y='70' font-size='12' font-weight='800'>Steps at n = 1,000,000</text>")
    for i, (name, val, col) in enumerate(rows):
        y = 98 + i * 30
        o.append(f"<text x='500' y='{y}' font-size='12' font-weight='700' fill='{col}'>{name}</text><text x='690' y='{y}' font-size='12' text-anchor='end' {MONO}>{val}</text>")
    o.append(f"<text x='500' y='{98 + 4 * 30}' font-size='11' opacity='0.75'>log n barely moves. n log n is only</text>")
    o.append(f"<text x='500' y='{98 + 4 * 30 + 16}' font-size='11' opacity='0.75'>20 times n. n² is a million times n.</text>")
    o.append("</g>")
    return "".join(o), "0 0 710 300"


def fig_paths():
    """log n = one path down a halving tree; n log n = the whole tree, every level touched."""
    o = [f"<g {FONT}>", "<text x='20' y='22' font-size='14' font-weight='800'>Same 16 items, same 4 halvings, very different work</text>"]

    def tree(ox, title, sub, path_only, col):
        g = f"<text x='{ox + 150}' y='52' text-anchor='middle' font-size='13' font-weight='800' fill='{col}'>{title}</text><text x='{ox + 150}' y='68' text-anchor='middle' font-size='11' opacity='0.75'>{sub}</text>"
        lv_y = [90, 128, 166, 204, 242]
        for d, y in enumerate(lv_y):
            pieces = 2 ** d
            w = 300 / pieces
            for p in range(pieces):
                on = (not path_only) or p == 0
                x = ox + p * w
                g += f"<rect x='{x + 1.5:.1f}' y='{y}' width='{w - 3:.1f}' height='22' rx='4' fill='{soft(col, 0.28) if on else 'none'}' stroke='{col if on else 'currentColor'}' stroke-opacity='{0.9 if on else 0.18}'/>"
                if pieces <= 4 or (on and path_only):
                    g += f"<text x='{x + w / 2:.1f}' y='{y + 15}' text-anchor='middle' font-size='10' {MONO}>{16 // pieces}</text>"
            work = "1 look" if path_only else ("0" if pieces == 16 else "16")
            g += f"<text x='{ox + 310}' y='{y + 15}' font-size='10.5' {MONO} fill='{col}'>{work}</text>"
        total = "one look per level: at most 5 looks (log₂ 16 + 1)" if path_only else "merging: 16 + 16 + 16 + 16 = 64 = 16 × log₂ 16"
        g += f"<text x='{ox + 150}' y='290' text-anchor='middle' font-size='11'>{total}</text>"
        return g

    o.append(tree(20, "O(log n): binary search", "keep ONE half, ignore the other", True, G))
    o.append(tree(380, "O(n log n): merge sort", "keep BOTH halves, all n items every level", False, Y))
    o.append(f"<text x='20' y='322' font-size='12'>Both have log₂ 16 = 4 levels of halving. Binary search walks <tspan font-weight='800' fill='{G}'>one path</tspan> (one look per level);</text>")
    o.append(f"<text x='20' y='340' font-size='12'>merge sort does <tspan font-weight='800' fill='{Y}'>all n items on every level</tspan>.</text>")
    o.append("</g>")
    return "".join(o), "0 0 720 352"
