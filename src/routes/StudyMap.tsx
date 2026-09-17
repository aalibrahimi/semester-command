/**
 * StudyMap — the Map view of a guide (wireframe D): the bold terms as a
 * graph, coloured by mastery, with a detail rail for the selected term.
 *
 * Route: /study/:course/:chapter/map (?n=<blockId> selects a node)
 * Called by: the router, the view tab strip.
 * Calls: study/map (graph + layout), study/mastery, GuideChrome, GuideBlockView.
 *
 * Nodes are rounded rects 120×44 (132 for long terms), 13px label; mastered
 * green tint + stroke, shaky orange, unread card background + border stroke,
 * selected accent with a 2px stroke and a 600 label. Edges are 1.5px border-
 * token lines behind the nodes, arrowheads only while the graph is small.
 * Drag pans, wheel zooms, clicking empty space keeps the selection. On load
 * the shaky node with the most shaky neighbours is selected, else the first
 * definition of the first section.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Layers } from "lucide-react";
import { Inline } from "@/components/study/Blocks";
import { GuideBlockView } from "@/components/study/GuideBlocks";
import { GuideTopRow } from "@/components/study/GuideChrome";
import { cn } from "@/lib/utils";
import { courseBySlug } from "@/study";
import type { TrapBlock } from "@/study/guide";
import { guideById } from "@/study/loadGuides";
import { buildGraph, cluster, layout, nodeStatus, type ConceptGraph, type NodeStatus, type Placed } from "@/study/map";
import { useMastery, type GuideMastery } from "@/study/mastery";

const FILL: Record<NodeStatus | "selected", { fill: string; stroke: string; text: string }> = {
  mastered: { fill: "rgb(var(--on-track) / 0.14)", stroke: "rgb(var(--on-track))", text: "rgb(var(--on-track-fg))" },
  shaky: { fill: "rgb(var(--at-risk) / 0.14)", stroke: "rgb(var(--at-risk))", text: "rgb(var(--at-risk-fg))" },
  unread: { fill: "rgb(var(--card))", stroke: "rgb(var(--border))", text: "currentColor" },
  selected: { fill: "rgb(var(--accent) / 0.16)", stroke: "rgb(var(--accent))", text: "rgb(var(--accent-fg))" },
};
const ARROWS_UNDER = 25;

function fitLabel(term: string, w: number): string {
  const max = Math.floor((w - 20) / 7.2); // ~7.2px per char at 13px
  return term.length <= max ? term : term.slice(0, max - 1).trimEnd() + "…";
}

/** Edge endpoints on the rectangle borders, not the centres. */
function anchor(a: Placed, b: Placed): { x1: number; y1: number; x2: number; y2: number } {
  const clip = (from: Placed, to: Placed) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const sx = Math.abs(dx) > 0 ? from.w / 2 / Math.abs(dx) : Infinity, sy = Math.abs(dy) > 0 ? from.h / 2 / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    return { x: from.x + dx * s, y: from.y + dy * s };
  };
  const p = clip(a, b), q = clip(b, a);
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
}

/** The node to open with: most shaky neighbours among shaky nodes, else the first definition. */
function defaultSelection(g: ConceptGraph, m: GuideMastery): string | undefined {
  const shaky = g.nodes.filter((n) => nodeStatus(m, n) === "shaky");
  if (shaky.length) {
    const score = (id: string) => cluster(g, id).filter((x) => x !== id && nodeStatus(m, g.nodes.find((n) => n.id === x)!) === "shaky").length;
    return [...shaky].sort((a, b) => score(b.id) - score(a.id))[0].id;
  }
  return g.nodes[0]?.id;
}

export default function StudyMap() {
  const { course: cslug, chapter: chslug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const course = courseBySlug(cslug);
  const guide = guideById(cslug && chslug ? `${cslug}/${chslug}` : undefined);
  const mastery = useMastery(guide?.id ?? "");

  const graph = useMemo(() => (guide ? buildGraph(guide) : null), [guide]);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const placed = useMemo(() => (graph && box.w ? layout(graph, box.w, box.h) : []), [graph, box]);

  // Pan / zoom, in screen space.
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  // Default selection once mastery is known.
  const selectedId = params.get("n");
  useEffect(() => {
    if (!graph || selectedId || !mastery.loaded) return;
    const d = defaultSelection(graph, mastery);
    if (d) setParams({ n: d }, { replace: true });
  }, [graph, selectedId, mastery, setParams]);

  if (!course) return <Navigate to="/study" replace />;
  if (!guide || !graph) return <Navigate to={`/study/${course.slug}`} replace />;

  const select = (id: string) => setParams({ n: id });
  const byId = new Map(placed.map((p) => [p.id, p]));
  const sel = selectedId ? byId.get(selectedId) : undefined;
  const status = (p: Placed) => nodeStatus(mastery, p);
  const neighbours = sel ? cluster(graph, sel.id).filter((id) => id !== sel.id) : [];
  const shakyNeighbours = neighbours.map((id) => byId.get(id)!).filter((p) => p && status(p) === "shaky");
  const trapsInSection: TrapBlock[] = sel ? (guide.sections[sel.sectionIndex].blocks.filter((b) => b.type === "trap") as TrapBlock[]) : [];
  const arrows = graph.nodes.length < ARROWS_UNDER;

  const onWheel = (e: React.WheelEvent) => {
    const k = Math.min(3, Math.max(0.4, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
    const r = boxRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    // Zoom about the cursor.
    setView({ k, x: mx - ((mx - view.x) * k) / view.k, y: my - ((my - view.y) * k) / view.k });
  };
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border/60 px-5 pb-3 pt-4">
        <GuideTopRow
          guide={guide}
          courseCode={course.code}
          active="map"
          right={<span className="text-xs text-muted-foreground">nodes are the guide's bold terms · edges are 'is defined using' · color = mastery</span>}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Graph ───────────────────────────────────────────────────── */}
        <div
          ref={boxRef}
          className="relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden"
          style={{ cursor: drag.current ? "grabbing" : "grab" }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {placed.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground">This guide has no definition blocks to map.</p>
          ) : (
            <svg width={box.w} height={box.h} className="block" role="group" aria-label="Concept map">
              <defs>
                <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="rgb(var(--border))" />
                </marker>
                <marker id="map-arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="rgb(var(--accent))" />
                </marker>
              </defs>
              <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
                {graph.edges.map((e) => {
                  const a = byId.get(e.from), b = byId.get(e.to);
                  if (!a || !b) return null;
                  const hi = sel && (e.from === sel.id || e.to === sel.id);
                  const { x1, y1, x2, y2 } = anchor(a, b);
                  return (
                    <line
                      key={`${e.from}>${e.to}`}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={hi ? "rgb(var(--accent))" : "rgb(var(--border))"}
                      strokeWidth={1.5}
                      markerEnd={arrows ? (hi ? "url(#map-arrow-hi)" : "url(#map-arrow)") : undefined}
                      opacity={sel && !hi ? 0.5 : 1}
                    />
                  );
                })}
                {placed.map((p) => {
                  const isSel = sel?.id === p.id;
                  const st = isSel ? "selected" : status(p);
                  const c = FILL[st];
                  const dim = sel && !isSel && !neighbours.includes(p.id);
                  return (
                    <g
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${p.term} — ${status(p)}${isSel ? ", selected" : ""}`}
                      aria-pressed={isSel}
                      transform={`translate(${p.x - p.w / 2}, ${p.y - p.h / 2})`}
                      className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-[2.5]"
                      opacity={dim ? 0.55 : 1}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => select(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          select(p.id);
                        }
                      }}
                    >
                      <rect width={p.w} height={p.h} rx={10} fill={c.fill} stroke={c.stroke} strokeWidth={isSel ? 2 : 1.5} />
                      <text x={p.w / 2} y={p.h / 2 + 4.5} textAnchor="middle" fontSize={13} fontWeight={isSel ? 600 : 500} fill={c.text} className="select-none">
                        {fitLabel(p.term, p.w)}
                        <title>{p.term}</title>
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
          {/* Legend, bottom-left */}
          <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-3 text-[11px] text-muted-foreground">
            {(["mastered", "shaky", "unread"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-[3px] border" style={{ background: FILL[s].fill, borderColor: FILL[s].stroke }} />
                {s}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-[3px] border-2" style={{ background: FILL.selected.fill, borderColor: FILL.selected.stroke }} />
              selected
            </span>
            <span>· drag to pan · wheel to zoom</span>
          </div>
        </div>

        {/* ── Right rail ──────────────────────────────────────────────── */}
        <aside className="hidden w-[380px] shrink-0 flex-col overflow-y-auto border-l border-border bg-fill-ghost/40 xl:flex" style={{ padding: "24px 20px" }}>
          {sel ? (
            <>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-brand-fg">Selected · §{sel.sectionIndex + 1}</div>
              <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{sel.term}</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                <Inline text={sel.def.body} />
              </p>

              <ChipTile title="Defined using" ids={graph.out[sel.id]} byId={byId} status={status} onPick={select} empty="nothing in this guide" />
              <ChipTile title="Used by" ids={graph.in[sel.id]} byId={byId} status={status} onPick={select} empty="no other term uses it" />

              {trapsInSection.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  {trapsInSection.map((t) => (
                    <GuideBlockView key={t.id} block={t} />
                  ))}
                </div>
              )}

              {shakyNeighbours.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Shaky neighbours: <span className="text-at-risk-fg">{shakyNeighbours.map((p) => p.term).join(", ")}</span>
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <Link
                  to={`/study/${guide.id}?s=${sel.sectionId}&at=${encodeURIComponent(sel.id)}`}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-fill-ghost"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Read §{sel.sectionIndex + 1}
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(`/study/${guide.id}/recall?focus=${encodeURIComponent(cluster(graph, sel.id).join(","))}`)}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand/60 px-3 text-xs font-medium text-brand-fg hover:bg-brand/10"
                >
                  <Layers className="h-3.5 w-3.5" /> Drill this cluster
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Pick a term</div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {graph.nodes.length === 0
                  ? "This guide has no definition blocks, so there is nothing to map."
                  : `Click a node to see its definition, what it's built from, what builds on it, and the traps in its section. ${graph.nodes.length} terms · ${graph.edges.length} links.`}
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ChipTile({
  title, ids, byId, status, onPick, empty,
}: {
  title: string;
  ids: string[];
  byId: Map<string, Placed>;
  status: (p: Placed) => NodeStatus;
  onPick: (id: string) => void;
  empty: string;
}) {
  return (
    <div className="mt-4 rounded-[10px] border border-border bg-card px-3.5 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{title}</div>
      {ids.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            const st = status(p);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id)}
                className={cn(
                  "rounded-xl border px-2.5 py-1 text-xs transition-colors duration-micro hover:bg-fill-ghost",
                  st === "shaky" ? "border-at-risk/60 text-at-risk-fg" : st === "mastered" ? "border-on-track/50 text-foreground/90" : "border-border text-foreground/85",
                )}
              >
                {p.term}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
