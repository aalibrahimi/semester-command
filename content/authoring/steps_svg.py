"""Six illustrations for LING 124's 'speech to text in six steps' map."""
import math, json

INK = "currentColor"
MUTE = "rgb(var(--muted-foreground))"
GRID = "rgb(var(--foreground) / 0.08)"
AXIS = "rgb(var(--foreground) / 0.4)"
PANEL = "rgb(var(--foreground) / 0.035)"
PANEL_B = "rgb(var(--foreground) / 0.12)"
BRAND = "rgb(var(--accent))"
BRANDF = "rgb(var(--accent-fg))"
GREEN = "rgb(var(--on-track))"
GREENF = "rgb(var(--on-track-fg))"
AMBER = "rgb(var(--at-risk))"
AMBERF = "rgb(var(--at-risk-fg))"
RED = "rgb(var(--critical))"
FONT = "font-family='ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'"
MONO = "font-family='ui-monospace, SFMono-Regular, Menlo, monospace'"

def f(x): return f"{x:.1f}".rstrip("0").rstrip(".")

def path(pts):
    return "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts)

def text(x, y, s, size=12, fill=INK, anchor="start", weight=400, mono=False, extra=""):
    return f"<text x='{f(x)}' y='{f(y)}' font-size='{f(size*1.15)}' fill='{fill}' text-anchor='{anchor}' font-weight='{weight}' {MONO if mono else FONT} {extra}>{s}</text>"

def panel(x, y, w, h, r=12):
    return f"<rect x='{f(x)}' y='{f(y)}' width='{f(w)}' height='{f(h)}' rx='{r}' fill='{PANEL}' stroke='{PANEL_B}'/>"

def badge(n, x=22, y=24):
    return (f"<circle cx='{x}' cy='{y}' r='13' fill='{BRAND}'/>" + text(x, y + 4.5, str(n), 13, "white", "middle", 700))

def arrow(x1, y1, x2, y2, color=AXIS, w=1.6, mid="arrowS"):
    return f"<line x1='{f(x1)}' y1='{f(y1)}' x2='{f(x2)}' y2='{f(y2)}' stroke='{color}' stroke-width='{w}' marker-end='url(#{mid})'/>"

def defs(uid):
    return (f"<defs>"
            f"<marker id='arrowS{uid}' viewBox='0 0 10 10' refX='8.5' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'><path d='M0 0 L10 5 L0 10 z' fill='{AXIS}'/></marker>"
            f"<marker id='arrowB{uid}' viewBox='0 0 10 10' refX='8.5' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'><path d='M0 0 L10 5 L0 10 z' fill='{BRAND}'/></marker>"
            f"<linearGradient id='fade{uid}' x1='0' x2='1'><stop offset='0' stop-color='{BRAND}' stop-opacity='0.9'/><stop offset='1' stop-color='{BRAND}' stop-opacity='0.15'/></linearGradient>"
            f"</defs>")

def wrap(uid, body, title):
    b = body.replace("url(#arrowS)", f"url(#arrowS{uid})").replace("url(#arrowB)", f"url(#arrowB{uid})").replace("url(#fade)", f"url(#fade{uid})")
    return defs(uid) + f"<g {FONT}>" + badge_title(title) + b + "</g>"

def badge_title(t):
    return ""

def g(title, inner):
    return f"<g><title>{title}</title>{inner}</g>"

W, H = 680, 270

# ── Step 1: sound is air pressure going up and down ──────────────────────
def step1():
    s = ""
    # speaker head (simple profile)
    head = ("M70 150 C70 110 95 86 128 86 C160 86 178 108 178 136 L186 150 L178 156 L180 168 "
            "L174 172 L176 184 C176 196 164 200 150 198 L146 214 L96 214 L100 190 C82 180 70 168 70 150 Z")
    s += g("A person talking: the vocal folds push air out in puffs.",
           f"<path d='{head}' fill='rgb(var(--foreground) / 0.08)' stroke='{AXIS}' stroke-width='1.4'/>"
           f"<path d='M176 160 L184 160' stroke='{AXIS}' stroke-width='1.6' stroke-linecap='round'/>")
    # air molecules: an even grid, each column pushed sideways by the wave -> bands
    parts = ""
    lam = 44.0
    for i in range(62):
        x_rest = 200 + i * 4.3
        dx = -13 * math.sin(2 * math.pi * (x_rest - 200) / lam)
        dens = math.cos(2 * math.pi * (x_rest - 200) / lam)
        for r in range(15):
            y = 72 + r * 9.6 + (i % 2) * 4.8
            op = 0.35 + 0.55 * max(0.0, dens)
            parts += f"<circle cx='{f(x_rest + dx)}' cy='{f(y)}' r='1.7' fill='{BRAND}' opacity='{op:.2f}'/>"
    s += g("Air molecules bunch up (squeezed: high pressure) and spread out (stretched: low pressure). The bands travel outward.", parts)
    # pressure trace under the particles
    tr = [(200 + i, 226 - 9 * math.cos(2 * math.pi * i / lam)) for i in range(0, 262)]
    s += g("Pressure along the way: high where squeezed, low where stretched.", f"<path d='{path(tr)}' fill='none' stroke='{BRAND}' stroke-opacity='0.6' stroke-width='1.4'/>")
    s += text(200 + 44 * 2, 62, "squeezed", 10, BRANDF, "middle", 600) + text(200 + 44 * 3.5, 62, "stretched", 10, MUTE, "middle")
    s += arrow(200, 250, 460, 250, AXIS, 1.4, "arrowS") + text(330, 266, "the ripple travels to the listener", 10.5, MUTE, "middle")
    # graph
    x0, y0, w, h = 486, 70, 176, 140
    s += panel(x0 - 8, y0 - 26, w + 16, h + 52)
    s += text(x0, y0 - 8, "Waveform", 12, INK, "start", 600) + text(x0 + w, y0 - 8, "pressure", 10, MUTE, "end")
    mid = y0 + h / 2
    grid = "".join(f"<line x1='{x0}' y1='{f(y0+i*h/4)}' x2='{x0+w}' y2='{f(y0+i*h/4)}' stroke='{GRID}'/>" for i in range(5))
    pts = [(x0 + t * w, mid - 48 * math.sin(2 * math.pi * 3 * t) * (0.8 + 0.2 * math.cos(2 * math.pi * t))) for t in [i / 200 for i in range(201)]]
    s += g("The waveform: pressure (up and down) plotted against time (left to right).",
           grid + f"<line x1='{x0}' y1='{f(mid)}' x2='{x0+w}' y2='{f(mid)}' stroke='{AXIS}' stroke-dasharray='3 3'/>"
           f"<path d='{path(pts)}' fill='none' stroke='{BRAND}' stroke-width='2.4' stroke-linejoin='round'/>")
    s += text(x0 + w, y0 + h + 16, "time →", 10.5, MUTE, "end") 
    s += text(x0 + 30, y0 + 12, "high", 10, BRANDF) + text(x0 + 30, y0 + h - 4, "low", 10, MUTE)
    s += arrow(438, 140, 474, 140, BRAND, 1.8, "arrowB")
    return s

# ── Step 2: sampling ──────────────────────────────────────────────────────
def step2():
    s = ""
    x0, y0, w, h = 40, 50, 600, 120
    mid = y0 + h / 2
    s += panel(x0 - 14, y0 - 20, w + 28, h + 40)
    s += "".join(f"<line x1='{x0}' y1='{f(y0+i*h/4)}' x2='{x0+w}' y2='{f(y0+i*h/4)}' stroke='{GRID}'/>" for i in range(5))
    s += f"<line x1='{x0}' y1='{f(mid)}' x2='{x0+w}' y2='{f(mid)}' stroke='{AXIS}'/>"
    wave = lambda t: math.sin(2 * math.pi * 2 * t) * 0.75 + 0.25 * math.sin(2 * math.pi * 6 * t + 0.6)
    pts = [(x0 + t * w, mid - 52 * wave(t)) for t in [i / 400 for i in range(401)]]
    s += g("The real sound: smooth, with a value at every instant.", f"<path d='{path(pts)}' fill='none' stroke='{BRAND}' stroke-opacity='0.35' stroke-width='2'/>")
    N = 24
    stems = ""
    vals = []
    for n in range(N + 1):
        t = n / N
        v = wave(t)
        vals.append(v)
        x = x0 + t * w
        y = mid - 52 * v
        stems += f"<line x1='{f(x)}' y1='{f(mid)}' x2='{f(x)}' y2='{f(y)}' stroke='{BRAND}' stroke-width='1.4'/><circle cx='{f(x)}' cy='{f(y)}' r='3.6' fill='{BRAND}' stroke='rgb(var(--card))' stroke-width='1.2'/>"
    s += g("Sampling: measure the height at regular moments. Each dot is one stored number.", stems)
    # Ts bracket
    xa, xb = x0 + 3 * w / N, x0 + 4 * w / N
    s += g("Tₛ: the time between two measurements (Tₛ = 1 / Fₛ).",
           f"<path d='M{f(xa)} {y0+h+8} L{f(xa)} {y0+h+14} L{f(xb)} {y0+h+14} L{f(xb)} {y0+h+8}' fill='none' stroke='{AMBER}' stroke-width='1.5'/>" + text((xa + xb) / 2, y0 + h + 27, "Tₛ", 11, AMBERF, "middle", 600))
    # numbers row
    row = ""
    bx, by = 40, 218
    for i in range(10):
        row += f"<rect x='{bx + i*60}' y='{by}' width='54' height='26' rx='6' fill='rgb(var(--card))' stroke='{PANEL_B}'/>" + text(bx + i * 60 + 27, by + 17, f"{vals[i]:+.2f}", 11, INK, "middle", 500, True)
    row += text(bx + 600, by + 17, "…", 14, MUTE, "middle")
    s += g("What the computer actually keeps: a list of numbers, x[0], x[1], x[2]…", row)
    s += text(40, by - 8, "stored as:  x[0]   x[1]   x[2]   …", 10.5, MUTE, "start", 500, True)
    s += text(640, 30, "Fₛ = 16,000 measurements per second", 11.5, BRANDF, "end", 600)
    return s

# ── Step 3: split into simple waves ───────────────────────────────────────
def step3():
    s = ""
    # complex wave on left
    x0, y0, w, h = 30, 64, 190, 110
    mid = y0 + h / 2
    comps = [(1.0, 1, 0), (0.55, 2, 0.4), (0.3, 3, 1.1)]
    total = lambda t: sum(a * math.cos(2 * math.pi * k * 2 * t + p) for a, k, p in comps)
    s += panel(x0 - 10, y0 - 34, w + 20, h + 58)
    s += text(x0, y0 - 14, "A vowel (complex wave)", 12, INK, "start", 600)
    s += f"<line x1='{x0}' y1='{f(mid)}' x2='{x0+w}' y2='{f(mid)}' stroke='{AXIS}' stroke-dasharray='3 3'/>"
    pts = [(x0 + t * w, mid - 27 * total(t)) for t in [i / 300 for i in range(301)]]
    s += g("The sound we recorded: it repeats, but its shape is bumpy.", f"<path d='{path(pts)}' fill='none' stroke='{BRAND}' stroke-width='2.4' stroke-linejoin='round'/>")
    s += text(x0 + w / 2, y0 + h + 16, "=", 22, MUTE, "middle", 300, extra="opacity='0'")
    s += arrow(232, 118, 262, 118, BRAND, 1.8, "arrowB") + text(247, 108, "is", 11, MUTE, "middle")
    # three simple waves stacked
    cx0, cw = 276, 190
    cols = [BRAND, GREEN, AMBER]
    names = ["F₀ (the pitch)", "2·F₀", "3·F₀"]
    for i, (a, k, p) in enumerate(comps):
        yy = 46 + i * 66
        m = yy + 30
        s += f"<rect x='{cx0-8}' y='{yy-4}' width='{cw+16}' height='56' rx='10' fill='{PANEL}' stroke='{PANEL_B}'/>"
        pts = [(cx0 + t * cw, m - 17 * a * math.cos(2 * math.pi * k * 2 * t + p)) for t in [j / 200 for j in range(201)]]
        s += g(f"Simple wave #{i+1}: a plain cosine at {names[i]}.", f"<path d='{path(pts)}' fill='none' stroke='{cols[i]}' stroke-width='2'/>" + text(cx0 - 2, yy + 8, names[i], 9.5, cols[i], "start", 600))
        if i < 2:
            s += text(cx0 + cw / 2, yy + 62, "+", 15, MUTE, "middle", 600)
    # spectrum on right
    sx0, sy0, sw, sh = 520, 58, 140, 140
    s += arrow(482, 118, 508, 118, BRAND, 1.8, "arrowB")
    s += panel(sx0 - 10, sy0 - 28, sw + 20, sh + 60)
    s += text(sx0, sy0 - 10, "Spectrum", 12, INK, "start", 600) + text(sx0 + sw, sy0 - 10, "the recipe", 9.5, MUTE, "end")
    base = sy0 + sh
    s += f"<line x1='{sx0}' y1='{base}' x2='{sx0+sw}' y2='{base}' stroke='{AXIS}'/>"
    stems = ""
    for i, (a, k, p) in enumerate(comps):
        x = sx0 + 24 + i * 42
        y = base - a * 110
        stems += f"<line x1='{x}' y1='{base}' x2='{x}' y2='{f(y)}' stroke='{cols[i]}' stroke-width='5' stroke-linecap='round'/>" + text(x, base + 15, ["F₀", "2F₀", "3F₀"][i], 10.5, MUTE, "middle")
    s += g("One bar per simple wave: where it is (frequency) and how strong it is (amplitude).", stems)
    s += text(sx0 + sw, base + 32, "frequency →", 10.5, MUTE, "end")
    return s

# ── Step 4: slices and spectrogram ────────────────────────────────────────
def step4():
    s = ""
    x0, y0, w, h = 30, 40, 620, 70
    mid = y0 + h / 2
    import random
    random.seed(7)
    env = lambda t: 0.15 + 0.85 * math.exp(-((t - 0.28) / 0.12) ** 2) + 0.7 * math.exp(-((t - 0.7) / 0.1) ** 2)
    pts = []
    for i in range(801):
        t = i / 800
        v = env(t) * (math.sin(2 * math.pi * 38 * t) * 0.7 + 0.3 * math.sin(2 * math.pi * 97 * t)) + random.gauss(0, 0.04)
        pts.append((x0 + t * w, mid - 30 * v))
    s += panel(x0 - 12, y0 - 14, w + 24, h + 28)
    s += g("A whole recording: a sentence, which changes from moment to moment.", f"<path d='{path(pts)}' fill='none' stroke='{BRAND}' stroke-width='1.1' stroke-opacity='0.85'/>")
    # windows
    wins = ""
    for i in range(8):
        cx = x0 + 40 + i * 76
        hw = 44
        hump = [(cx - hw + j * 2 * hw / 60, y0 + h + 4 - 26 * (0.54 - 0.46 * math.cos(2 * math.pi * j / 60))) for j in range(61)]
        col = AMBER if i == 3 else "rgb(var(--foreground) / 0.3)"
        wins += f"<path d='{path(hump)}' fill='{'rgb(var(--at-risk) / 0.15)' if i == 3 else 'none'}' stroke='{col}' stroke-width='{1.8 if i == 3 else 1.1}'/>"
    s += g("Overlapping slices, about 25 ms long, each faded in and out (a Hamming window).", wins)
    s += text(x0 + 40 + 3 * 76, y0 + h + 22, "one slice ≈ 25 ms", 10.5, AMBERF, "middle", 600)
    # arrow down from highlighted slice to mini spectrum
    cx = x0 + 40 + 3 * 76
    s += arrow(cx, y0 + h + 28, cx, 172, AMBER, 1.6, "arrowS")
    # mini spectrum of that slice
    msx, msy = cx - 58, 176
    ms = f"<rect x='{msx}' y='{msy}' width='116' height='70' rx='8' fill='rgb(var(--card))' stroke='{PANEL_B}'/>"
    for j in range(14):
        hgt = 50 * (0.9 * math.exp(-((j - 3) / 2.2) ** 2) + 0.5 * math.exp(-((j - 9) / 2) ** 2)) + 3
        ms += f"<rect x='{msx + 8 + j*7.4}' y='{f(msy + 62 - hgt)}' width='5' height='{f(hgt)}' rx='1.5' fill='{AMBER}'/>"
    s += g("The DFT of that one slice: how strong each frequency is right then.", ms + text(msx + 58, msy + 84, "its spectrum", 10.5, MUTE, "middle"))
    # spectrogram
    gx, gy, gw, gh = 400, 150, 250, 100
    spec = f"<rect x='{gx}' y='{gy}' width='{gw}' height='{gh}' rx='8' fill='rgb(var(--card))' stroke='{PANEL_B}'/>"
    cols, rows = 34, 14
    for c in range(cols):
        t = c / (cols - 1)
        for r in range(rows):
            fr = r / (rows - 1)
            e = env(t) * (0.9 * math.exp(-((fr - (0.2 + 0.05 * math.sin(6 * t))) / 0.1) ** 2) + 0.6 * math.exp(-((fr - (0.6 - 0.15 * t)) / 0.09) ** 2))
            op = min(0.95, 0.05 + e)
            spec += f"<rect x='{f(gx + 6 + c * (gw - 12) / cols)}' y='{f(gy + gh - 6 - (r + 1) * (gh - 12) / rows)}' width='{f((gw - 12) / cols - 0.6)}' height='{f((gh - 12) / rows - 0.6)}' fill='{BRAND}' opacity='{op:.2f}'/>"
    s += g("Every slice's spectrum, placed side by side in time: the spectrogram. Dark = strong.", spec)
    s += text(gx, gy - 8, "Spectrogram: all slices side by side", 11.5, INK, "start", 600)
    s += text(gx + gw, gy + gh + 15, "time →", 10.5, MUTE, "end") + text(gx - 6, gy + 12, "freq", 10.5, MUTE, "end")
    s += arrow(cx + 64, 210, gx - 8, 210, BRAND, 1.6, "arrowB")
    return s

# ── Step 5: measure pitch + features ──────────────────────────────────────
def step5():
    s = ""
    # slice spectrum with harmonic comb
    x0, y0, w, h = 30, 52, 250, 150
    s += panel(x0 - 12, y0 - 30, w + 24, h + 56)
    s += text(x0, y0 - 10, "One slice's spectrum", 12, INK, "start", 600)
    base = y0 + h
    s += f"<line x1='{x0}' y1='{base}' x2='{x0+w}' y2='{base}' stroke='{AXIS}'/>"
    envf = lambda fr: 0.95 * math.exp(-((fr - 0.18) / 0.09) ** 2) + 0.6 * math.exp(-((fr - 0.55) / 0.1) ** 2) + 0.08
    comb = ""
    for k in range(1, 22):
        fr = k / 23
        a = envf(fr)
        x = x0 + fr * w
        comb += f"<line x1='{f(x)}' y1='{base}' x2='{f(x)}' y2='{f(base - a * 120)}' stroke='{BRAND}' stroke-width='2.2' stroke-linecap='round'/>"
    s += g("Thin lines = harmonics, evenly spaced. Their spacing is the pitch (F0).", comb)
    envp = [(x0 + fr * w, base - envf(fr) * 120 - 6) for fr in [i / 200 for i in range(201)]]
    s += g("The smooth outline over the lines = the mouth shape (formants). This is what tells vowels apart.", f"<path d='{path(envp)}' fill='none' stroke='{GREEN}' stroke-width='2.4' stroke-dasharray='6 4'/>")
    xa, xb = x0 + w / 23 * 5, x0 + w / 23 * 6
    s += f"<path d='M{f(xa)} {base+8} L{f(xa)} {base+13} L{f(xb)} {base+13} L{f(xb)} {base+8}' fill='none' stroke='{AMBER}' stroke-width='1.6'/>" + text((xa + xb) / 2, base + 26, "F0", 11, AMBERF, "middle", 700)
    s += text(x0 + w * 0.36, y0 + 22, "formants (mouth shape)", 10, GREENF, "start", 600)
    # outputs
    s += arrow(300, 100, 350, 76, AMBER, 1.6, "arrowS") + arrow(300, 150, 350, 170, GREEN, 1.6, "arrowS")
    # pitch card
    s += f"<rect x='352' y='40' width='136' height='64' rx='10' fill='rgb(var(--at-risk) / 0.1)' stroke='{AMBER}'/>"
    s += text(420, 62, "Pitch", 11, AMBERF, "middle", 600) + text(420, 88, "F0 ≈ 120 Hz", 14, INK, "middle", 700)
    # pitch track
    pts = [(496 + i * 1.6, 72 - 14 * math.sin(i / 16) - 6 * math.cos(i / 7)) for i in range(92)]
    s += g("Measured every 10 ms, the pitch becomes a contour: this is intonation.", f"<path d='{path(pts)}' fill='none' stroke='{AMBER}' stroke-width='2.2' stroke-linecap='round'/>" + text(570, 106, "pitch over time", 10, MUTE, "middle"))
    # feature vector
    fx, fy = 356, 128
    s += text(fx, fy - 6, "Features (MFCCs)", 11, GREENF, "start", 600)
    vec = ""
    vals = [0.9, -0.6, 0.4, 0.75, -0.3, 0.2, -0.5, 0.35, 0.1, -0.2, 0.3, -0.1, 0.15]
    for i, v in enumerate(vals):
        vec += f"<rect x='{fx + i*23}' y='{fy}' width='20' height='40' rx='4' fill='{GREEN}' opacity='{0.25 + 0.7*abs(v):.2f}'/>" + text(fx + i * 23 + 10, fy + 54, str(i + 1), 9, MUTE, "middle", 500, True)
    s += g("13 numbers that describe the slice's outline, the same for every speaker saying the same vowel.", vec)
    s += text(fx, fy + 76, "13 numbers per slice, every 10 ms", 10.5, MUTE)
    return s

# ── Step 6: model guesses words ───────────────────────────────────────────
def step6():
    s = ""
    # stack of feature columns
    fx, fy = 30, 60
    cols = ""
    import random
    random.seed(3)
    for c in range(12):
        for r in range(13):
            cols += f"<rect x='{fx + c*14}' y='{fy + r*11}' width='12' height='9.5' rx='2' fill='{GREEN}' opacity='{0.15 + 0.8*random.random():.2f}'/>"
    s += g("The feature columns from step 5, one per 10 ms slice.", cols)
    s += text(fx, fy - 12, "features over time", 11.5, INK, "start", 600) + text(fx + 84, fy + 160, "time →", 10.5, MUTE, "middle")
    s += arrow(206, 130, 244, 130, BRAND, 1.8, "arrowB")
    # model box with network
    mx, my, mw, mh = 252, 44, 190, 176
    s += f"<rect x='{mx}' y='{my}' width='{mw}' height='{mh}' rx='14' fill='rgb(var(--accent) / 0.08)' stroke='{BRAND}' stroke-width='1.4'/>"
    layers = [5, 7, 7, 4]
    nodes = []
    for li, n in enumerate(layers):
        x = mx + 30 + li * 43
        col = []
        for j in range(n):
            y = my + 30 + (j + 0.5) * (mh - 60) / n
            col.append((x, y))
        nodes.append(col)
    edges = ""
    for a, b in zip(nodes, nodes[1:]):
        for (x1, y1) in a:
            for (x2, y2) in b:
                edges += f"<line x1='{f(x1)}' y1='{f(y1)}' x2='{f(x2)}' y2='{f(y2)}' stroke='{BRAND}' stroke-opacity='0.18' stroke-width='0.8'/>"
    dots = "".join(f"<circle cx='{f(x)}' cy='{f(y)}' r='4.2' fill='rgb(var(--card))' stroke='{BRAND}' stroke-width='1.6'/>" for col in nodes for (x, y) in col)
    s += g("A trained model (older systems: HMMs; today: neural networks) maps the numbers to sounds and words.", edges + dots)
    s += text(mx + mw / 2, my + mh - 10, "model", 11.5, BRANDF, "middle", 600)
    s += arrow(450, 130, 486, 130, BRAND, 1.8, "arrowB")
    # output text with confidence
    ox, oy = 494, 72
    s += f"<rect x='{ox}' y='{oy}' width='168' height='52' rx='12' fill='rgb(var(--card))' stroke='{PANEL_B}'/>"
    s += text(ox + 84, oy + 33, "“hello world”", 17, INK, "middle", 700)
    words = [("hello", 0.94), ("yellow", 0.04), ("world", 0.91), ("word", 0.07)]
    bars = ""
    for i, (wd, p) in enumerate(words):
        y = oy + 76 + i * 20
        bars += text(ox, y + 9, wd, 11, INK if p > 0.5 else MUTE, "start", 600 if p > 0.5 else 400)
        bars += f"<rect x='{ox+58}' y='{y}' width='92' height='10' rx='5' fill='rgb(var(--foreground) / 0.08)'/><rect x='{ox+58}' y='{y}' width='{f(92*p)}' height='10' rx='5' fill='{GREEN if p > 0.5 else AMBER}'/>"
        bars += text(ox + 168, y + 9, f"{int(p*100)}%", 10, MUTE, "end", 500, True)
    s += g("It picks the most likely words. Its mistakes are counted with WER (word error rate).", bars)
    return s

STEPS = [
 (1, "Sound is air pressure going up and down", step1, "Your voice pushes air into squeezed and stretched bands that travel outward. Plot the pressure at one spot over time and you get the waveform."),
 (2, "The computer measures it thousands of times a second", step2, "The smooth wave is measured at regular moments (every Tₛ seconds). Only the dots are kept: a list of numbers."),
 (3, "Any sound is simple waves added together", step3, "A bumpy vowel wave is exactly a sum of plain cosines at F₀, 2F₀, 3F₀… The spectrum is the recipe: one bar per simple wave."),
 (4, "Cut into slices, find the simple waves in each", step4, "Slide a ~25 ms window along the recording, take the DFT of each slice, and stack the spectra side by side: the spectrogram."),
 (5, "Measure pitch and a short list of numbers", step5, "From one slice: the spacing of the harmonics gives the pitch (F0); the smooth outline (formants) becomes 13 MFCC numbers."),
 (6, "A model reads the numbers and guesses the words", step6, "The feature columns go into a trained model, which outputs the most likely words. Its mistakes are measured with word error rate."),
]

def figures():
    out = []
    for n, title, fn, cap in STEPS:
        body = fn()
        uid = f"s{n}"
        svg = defs(uid) + f"<g {FONT}>" + body.replace("url(#arrowS)", f"url(#arrowS{uid})").replace("url(#arrowB)", f"url(#arrowB{uid})") + "</g>"
        out.append((n, title, svg, cap))
    return out

if __name__ == "__main__":
    import sys
    for n, t, svg, cap in figures():
        open(__import__("_paths").PREVIEW / f"step{n}.svg", "w").write(
            f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' style='color:#111;background:#fff'>" + svg.replace("rgb(var(--foreground) / ", "rgba(20,22,31,").replace("rgb(var(--foreground))", "#14161f") + "</svg>")
    print("ok")
