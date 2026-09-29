/**
 * sortvid.js: a small engine for code + animation videos of sorting
 * algorithms. A video page runs the real algorithm through a recorder,
 * which takes one snapshot per step (where every item is, what color it is,
 * which code lines ran, the caption). render(t) then eases between
 * consecutive snapshots, so items glide from one state to the next.
 *
 * A page includes this file, then calls
 *   video({ title, sub, code, build(rec) { ... } })
 * and gets window.render / window.DURATION for content/video/render.mjs.
 *
 * Layout (1280 × 720): code panel on the left, stage on the right, the
 * caption bubble along the bottom, a progress bar on the very bottom edge.
 */
const W = 1280, H = 720;
const C = { bg: "#0e1014", card: "#171a21", line: "#2a2f3a", fg: "#e8ebf1", mute: "#8d95a5",
  blue: "#5b8def", green: "#34c38f", amber: "#f0a93b", red: "#ef5a6f", violet: "#a78bfa", slate: "#3a4150" };
const F = "font-family='Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'";
const M = "font-family='ui-monospace, SFMono-Regular, Menlo, monospace'";
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function txt(x, y, s, o = {}) {
  return `<text x='${x}' y='${y}' ${o.mono ? M : F} font-size='${o.size || 20}' font-weight='${o.w || 500}' fill='${o.fill || C.fg}' text-anchor='${o.anchor || "start"}' opacity='${o.op ?? 1}'>${o.raw ? s : esc(s)}</text>`;
}
function rect(x, y, w, h, o = {}) {
  return `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${o.r ?? 10}' fill='${o.fill || "none"}' stroke='${o.stroke || "none"}' stroke-width='${o.sw || 1.5}' opacity='${o.op ?? 1}' ${o.dash ? `stroke-dasharray='${o.dash}'` : ""}/>`;
}
function soft(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mix(h1, h2, t) {
  if (h1 === h2 || !h1.startsWith("#") || !h2.startsWith("#")) return t < .5 ? h1 : h2;
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

/* ── Syntax colors for the code panel (Python) ─────────────────────────── */
function hl(line) {
  const out = [];
  const re = /(#.*$)|("[^"]*"|'[^']*')|\b(def|if|else|elif|while|for|in|return|and|or|not|range|len|True|None)\b|\b(\d+)\b|([A-Za-z_]\w*)(?=\()/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    out.push(esc(line.slice(last, m.index)));
    const [s] = m;
    const col = m[1] ? C.mute : m[2] ? C.green : m[3] ? C.violet : m[4] ? C.amber : "#56c2d6";
    out.push(`<tspan fill='${col}'${m[1] ? " font-style='italic'" : ""}>${esc(s)}</tspan>`);
    last = m.index + s.length;
  }
  out.push(esc(line.slice(last)));
  return out.join("");
}

/* ── Recorder ──────────────────────────────────────────────────────────── */
class Rec {
  constructor() { this.marks = []; this.snaps = []; this.items = {}; this.ptrs = []; this.zones = []; this.extra = ""; this.vars = ""; }
  /** Set or update one item: {kind: "bar"|"node"|"cell", x, y, val, fill, op, ring}. */
  set(id, props) { this.items[id] = { ...(this.items[id] || { op: 1, fill: C.slate }), ...props }; }
  get(id) { return this.items[id]; }
  /** A chapter chip for the video block: starts at the next snapshot. */
  mark(label) { this.marks.push({ label, at: this.snaps.length }); }
  snap(cap, lines = [], dur = 2.6, o = {}) {
    this.snaps.push({ cap, lines, dur, items: structuredClone(this.items), ptrs: structuredClone(this.ptrs),
      zones: structuredClone(this.zones), extra: this.extra, vars: this.vars, card: o.card || null });
  }
  card(title, sub, dur = 4, cap = "") { this.snaps.push({ card: { title, sub }, dur, cap, lines: [], items: {}, ptrs: [], zones: [], extra: "", vars: "" }); }
}

/* ── Drawing ───────────────────────────────────────────────────────────── */
function drawItem(it) {
  if (it.op <= 0.01) return "";
  const ring = it.ring ? `stroke='${it.ring}' stroke-width='4'` : `stroke='${soft("#ffffff", .08)}' stroke-width='1.5'`;
  if (it.kind === "bar") {
    const h = it.h, w = it.w || 56;
    return `<g opacity='${it.op}'><rect x='${it.x - w / 2}' y='${it.y - h}' width='${w}' height='${h}' rx='10' fill='${it.fill}' ${ring}/>` +
      txt(it.x, it.y - h - 12, it.val, { size: it.fs || 22, w: 800, mono: true, anchor: "middle" }) + "</g>";
  }
  if (it.kind === "node") {
    const r = it.r || 30;
    return `<g opacity='${it.op}'><circle cx='${it.x}' cy='${it.y}' r='${r}' fill='${it.fill}' ${ring}/>` +
      txt(it.x, it.y + 8, it.val, { size: 22, w: 800, mono: true, anchor: "middle" }) + "</g>";
  }
  const s = it.s || 52;
  return `<g opacity='${it.op}'><rect x='${it.x - s / 2}' y='${it.y - s / 2}' width='${s}' height='${s}' rx='10' fill='${it.fill}' ${ring}/>` +
    txt(it.x, it.y + 7, it.val, { size: 20, w: 800, mono: true, anchor: "middle" }) + "</g>";
}

function between(a, b, p) {
  const out = {};
  for (const id of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = a?.[id], y = b?.[id];
    if (!x) { out[id] = { ...y, op: y.op * p }; continue; }
    if (!y) { out[id] = { ...x, op: x.op * (1 - p) }; continue; }
    out[id] = { ...y, x: lerp(x.x, y.x, p), y: lerp(x.y, y.y, p), h: lerp(x.h ?? 0, y.h ?? 0, p), op: lerp(x.op, y.op, p),
      fill: mix(x.fill, y.fill, p), ring: p < .5 ? x.ring : y.ring };
  }
  return out;
}

function ptrsBetween(a, b, p) {
  const out = [];
  for (const q of b) {
    const o = a.find((z) => z.label === q.label && z.y === q.y);
    out.push(o ? { ...q, x: lerp(o.x, q.x, p) } : { ...q, op: p });
  }
  for (const o of a) if (!b.find((z) => z.label === o.label && z.y === o.y)) out.push({ ...o, op: 1 - p });
  return out;
}

function drawPtr(q) {
  const op = q.op ?? 1, col = q.col || C.blue;
  const up = q.up; // arrow pointing up at the item above
  const y = q.y;
  return `<g opacity='${op}'><path d='M${q.x - 8} ${up ? y + 10 : y - 10} L${q.x + 8} ${up ? y + 10 : y - 10} L${q.x} ${y} Z' fill='${col}'/>` +
    rect(q.x - (q.label.length * 5.5 + 12), up ? y + 14 : y - 44, q.label.length * 11 + 24, 30, { r: 15, fill: soft(col, .18), stroke: col, sw: 1.2 }) +
    txt(q.x, up ? y + 35 : y - 23, q.label, { size: 16, w: 700, mono: true, anchor: "middle", fill: col }) + "</g>";
}

function drawZone(z, op) {
  return `<g opacity='${op * (z.op ?? 1)}'>${rect(z.x, z.y, z.w, z.h, { r: 14, fill: soft(z.col, .08), stroke: soft(z.col, .6), dash: "6 5" })}` +
    (z.label ? txt(z.x + 12, z.y + 24, z.label, { size: 15, w: 700, fill: z.col, mono: true }) : "") + "</g>";
}

function codePanel(code, lines, vars) {
  const L = code.replace(/\n$/, "").split("\n");
  const lh = Math.min(27, 440 / L.length), x0 = 40, y0 = 118, fs = lh > 24 ? 16.5 : 15;
  let g = rect(x0 - 12, y0 - 34, 450, L.length * lh + 58, { r: 16, fill: C.card, stroke: C.line });
  L.forEach((line, i) => {
    const on = lines.includes(i + 1);
    const y = y0 + i * lh;
    if (on) g += rect(x0 - 12, y - lh + 7, 450, lh, { r: 0, fill: soft(C.blue, .16) }) + `<rect x='${x0 - 12}' y='${y - lh + 7}' width='4' height='${lh}' fill='${C.blue}'/>`;
    g += txt(x0 + 8, y, String(i + 1), { size: 13, fill: on ? C.blue : soft(C.mute, .7), mono: true, anchor: "end" });
    g += `<text x='${x0 + 22}' y='${y}' ${M} font-size='${fs}' fill='${on ? C.fg : "#b9c0cc"}' xml:space='preserve'>${hl(line)}</text>`;
  });
  if (vars) g += txt(x0, y0 + L.length * lh + 60, vars, { size: 17, mono: true, fill: C.amber, w: 700 });
  return g;
}

function caption(s, op) {
  if (!s || op <= 0) return "";
  const size = s.length > 88 ? 18 : s.length > 76 ? 19.5 : 21;
  return `<g opacity='${op}'>${rect(80, 624, 1120, 70, { r: 18, fill: soft(C.card, .97), stroke: C.line })}` +
    txt(640, 667, s, { size, anchor: "middle", w: 500, raw: true }) + "</g>";
}
/** Caption markup: **bold** → heavier white. */
function capMarkup(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, `<tspan font-weight='800' fill='#ffffff'>$1</tspan>`); }

/** A row of colored keys, top right of the stage. */
function legend(pairs) {
  let x = 1240, g = "";
  for (const [label, col] of [...pairs].reverse()) {
    const w = label.length * 8.6 + 34;
    x -= w;
    g += rect(x, 58, 14, 14, { r: 4, fill: col }) + txt(x + 20, 70, label, { size: 14, fill: C.mute });
  }
  return g;
}

/* ── Assembly ──────────────────────────────────────────────────────────── */
function video({ title, sub, code, build }) {
  const rec = new Rec();
  build(rec);
  const S = rec.snaps;
  let t = 0;
  for (const s of S) { s.t0 = t; t += s.dur; }
  const DURATION = t + 0.5;
  window.CHAPTERS = rec.marks.map((m) => ({ t: Math.round(S[Math.min(m.at, S.length - 1)].t0), label: m.label }));

  function render(T) {
    let k = S.findIndex((s) => T >= s.t0 && T < s.t0 + s.dur);
    if (k < 0) k = S.length - 1;
    const s = S[k], prev = S[k - 1] && !S[k - 1].card ? S[k - 1] : null;
    const L = T - s.t0;
    const move = Math.min(0.9, Math.max(0.35, s.dur * 0.4));
    const p = prev ? ease(L / move) : 1;
    let out = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'><rect width='${W}' height='${H}' fill='${C.bg}'/>`;
    if (s.card) {
      const op = clamp(L / .6) * (1 - clamp((L - s.dur + .6) / .6));
      out += `<g opacity='${op}'>${txt(640, 318, s.card.title, { size: 64, w: 800, anchor: "middle" })}${txt(640, 368, s.card.sub, { size: 24, fill: C.mute, anchor: "middle" })}</g>`;
      if (s.cap) out += caption(capMarkup(s.cap), op);
    } else {
      out += txt(40, 50, title, { size: 26, w: 800 }) + txt(40, 76, sub, { size: 15, fill: C.mute });
      out += codePanel(code, s.lines, s.vars);
      const zop = prev ? p : 1;
      if (prev && prev.extra !== s.extra) out += `<g opacity='${1 - p}'>${prev.extra}</g><g opacity='${p}'>${s.extra}</g>`;
      else out += s.extra;
      for (const z of prev ? prev.zones : []) if (!s.zones.find((y) => JSON.stringify(y) === JSON.stringify(z))) out += drawZone(z, 1 - zop);
      for (const z of s.zones) out += drawZone(z, prev && prev.zones.find((y) => JSON.stringify(y) === JSON.stringify(z)) ? 1 : zop);
      const items = prev ? between(prev.items, s.items, p) : s.items;
      // draw moving items last so they pass over the others
      const ids = Object.keys(items).sort((a, b) => (items[a].z || 0) - (items[b].z || 0));
      for (const id of ids) out += drawItem(items[id]);
      for (const q of prev ? ptrsBetween(prev.ptrs, s.ptrs, p) : s.ptrs) out += drawPtr(q);
      const cop = prev && prev.cap === s.cap ? 1 : clamp(L / .35);
      out += caption(capMarkup(s.cap), cop);
    }
    out += `<rect x='0' y='${H - 4}' width='${W * T / DURATION}' height='4' fill='${C.blue}'/></svg>`;
    document.getElementById("stage").innerHTML = out;
  }
  window.render = render;
  window.DURATION = DURATION;
  render(0);
}
