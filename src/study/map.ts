/**
 * map.ts — the concept graph behind the Map view (wireframe D). Pure.
 *
 * Nodes are the guide's definition blocks. An edge A → B means "A is
 * defined using B": B's term appears in A's body (case-insensitive, whole
 * word where the term is alphabetic), or B's term is listed in A.related.
 *
 * Layout is a small deterministic force simulation — seeded by node order,
 * no randomness — so the same guide always draws the same picture.
 */
import type { DefinitionBlock, Guide } from "./guide";
import { isDue, sectionStatus, type GuideMastery, type SectionStatus } from "./mastery";
import { isShaky } from "./recall";

export interface MapNode {
  id: string; // block id
  term: string;
  sectionId: string;
  sectionIndex: number;
  bullet: number;
  def: DefinitionBlock;
}
export interface MapEdge {
  from: string;
  to: string;
}
export interface ConceptGraph {
  nodes: MapNode[];
  edges: MapEdge[];
  /** out[id] = ids this node is defined using; in[id] = ids that use it. */
  out: Record<string, string[]>;
  in: Record<string, string[]>;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The term as a matcher: whole-word for alphabetic terms, plain substring for symbols. */
function matcher(term: string): RegExp {
  const t = term.trim();
  // Drop a trailing symbol variant so "Alphabet Σ" also matches "alphabet".
  const core = t.replace(/\s+\S{1,3}$/, (m) => (/^[\s\p{L}]+$/u.test(m) ? m : "")).trim() || t;
  const alpha = /^[\p{L}\s-]+$/u.test(core);
  return new RegExp(alpha ? `(^|[^\\p{L}])${esc(core)}(s|es)?(?![\\p{L}])` : esc(core), "iu");
}

export function buildGraph(guide: Guide): ConceptGraph {
  const nodes: MapNode[] = [];
  guide.sections.forEach((s, si) =>
    s.blocks.forEach((b, bi) => {
      if (b.type === "definition") nodes.push({ id: b.id, term: b.term, sectionId: s.id, sectionIndex: si, bullet: bi + 1, def: b });
    }),
  );
  const byTerm = new Map(nodes.map((n) => [n.term.toLowerCase(), n]));
  const matchers = nodes.map((n) => ({ n, re: matcher(n.term) }));
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  const add = (from: string, to: string) => {
    if (from === to || seen.has(`${from}>${to}`)) return;
    seen.add(`${from}>${to}`);
    edges.push({ from, to });
  };
  for (const a of nodes) {
    const body = a.def.body.replace(/\*\*/g, "");
    for (const { n: b, re } of matchers) if (b !== a && b.term.length >= 2 && re.test(body)) add(a.id, b.id);
    for (const rel of a.def.related ?? []) {
      const b = byTerm.get(rel.toLowerCase());
      if (b) add(a.id, b.id);
    }
  }
  const out: Record<string, string[]> = {};
  const inn: Record<string, string[]> = {};
  for (const n of nodes) {
    out[n.id] = [];
    inn[n.id] = [];
  }
  for (const e of edges) {
    out[e.from].push(e.to);
    inn[e.to].push(e.from);
  }
  return { nodes, edges, out, in: inn };
}

/* ── Mastery per node ───────────────────────────────────────────────────── */

export type NodeStatus = SectionStatus;

/** Section status, unless the node's own cards say otherwise. */
export function nodeStatus(m: GuideMastery, n: MapNode): NodeStatus {
  const cards = [m.reviews[`${n.id}#tb`], m.reviews[`${n.id}#bt`]].filter(Boolean);
  if (cards.some(isShaky)) return "shaky";
  if (cards.length === 2 && cards.every((r) => !isDue(r) && r!.reps > 0)) return "mastered";
  return sectionStatus(m, n.sectionId);
}

/* ── Layout ─────────────────────────────────────────────────────────────── */

export interface Placed extends MapNode {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const NODE_H = 44;
export function nodeWidth(term: string): number {
  return term.length > 15 ? 132 : 120;
}

/**
 * Deterministic force layout: nodes start on a circle in section order, then
 * springs along edges, repulsion between all pairs, a pull to the centre,
 * and a rectangle-aware minimum distance. ~250 steps is plenty for < 60 nodes.
 */
export function layout(g: ConceptGraph, width: number, height: number): Placed[] {
  const n = g.nodes.length;
  if (!n) return [];
  const cx = width / 2, cy = height / 2;
  const R = Math.min(width, height) * 0.38;
  const p = g.nodes.map((node, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { ...node, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), w: nodeWidth(node.term), h: NODE_H, vx: 0, vy: 0 };
  });
  const idx = new Map(p.map((q, i) => [q.id, i]));
  const spring = 150, k = 0.02, rep = 26_000, gravity = 0.012;
  for (let step = 0; step < 250; step++) {
    const t = 1 - step / 250;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const a = p[i], b = p[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = (i - j) * 0.5; dy = 0.5; d2 = 0.5; }
        const d = Math.sqrt(d2);
        // Rectangle-aware: push harder when boxes would overlap.
        const minDx = (a.w + b.w) / 2 + 24, minDy = a.h + 24;
        const overlap = Math.abs(dx) < minDx && Math.abs(dy) < minDy;
        const f = (rep / d2) * (overlap ? 4 : 1);
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
    for (const e of g.edges) {
      const a = p[idx.get(e.from)!], b = p[idx.get(e.to)!];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1, Math.hypot(dx, dy));
      const f = k * (d - spring);
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
    for (const q of p) {
      q.vx += (cx - q.x) * gravity;
      q.vy += (cy - q.y) * gravity;
      q.x += q.vx * 0.5 * t + q.vx * 0.05;
      q.y += q.vy * 0.5 * t + q.vy * 0.05;
      q.vx *= 0.6; q.vy *= 0.6;
    }
  }
  // Normalise into the box with a margin.
  const m = 16;
  const minX = Math.min(...p.map((q) => q.x - q.w / 2)), maxX = Math.max(...p.map((q) => q.x + q.w / 2));
  const minY = Math.min(...p.map((q) => q.y - q.h / 2)), maxY = Math.max(...p.map((q) => q.y + q.h / 2));
  const sx = (width - 2 * m) / Math.max(1, maxX - minX), sy = (height - 2 * m) / Math.max(1, maxY - minY);
  const s = Math.min(1, sx, sy);
  const ox = (width - (maxX - minX) * s) / 2 - minX * s, oy = (height - (maxY - minY) * s) / 2 - minY * s;
  return p.map(({ vx: _vx, vy: _vy, ...q }) => ({ ...q, x: q.x * s + ox, y: q.y * s + oy }));
}

/** A node plus everything one edge away, either direction — the drill cluster. */
export function cluster(g: ConceptGraph, id: string): string[] {
  return [...new Set([id, ...g.out[id], ...g.in[id]])];
}
