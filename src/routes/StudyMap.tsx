/**
 * StudyMap — the Map view of a guide (wireframe D): the bold terms as a
 * graph, coloured by mastery, with a detail rail for the selected term.
 *
 * Route: /study/:course/:chapter/map (?n=<blockId> selects a node)
 * Called by: the router, the view tab strip.
 * Calls: study/map (graph + layout), study/mastery, GuideChrome.
 *
 * Nodes are rounded rects 120×44 (132 for long terms), 13px label. Colours
 * reuse the Read rail's mastery tokens: on-track (mastered), at-risk
 * (shaky), muted (unread), brand (selected). Edges A → B read "A is
 * defined using B". Nodes are keyboard-focusable buttons.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertOctagon, BookOpen, Layers } from "lucide-react";
import { Inline } from "@/components/study/Blocks";
import { GuideTopRow } from "@/components/study/GuideChrome";
import { cn } from "@/lib/utils";
import { courseBySlug } from "@/study";
import type { TrapBlock } from "@/study/guide";
import { guideById } from "@/study/loadGuides";
import { buildGraph, cluster, layout, nodeStatus, type NodeStatus, type Placed } from "@/study/map";
import { useMastery } from "@/study/mastery";

const FILL: Record<NodeStatus | "selected", { fill: string; stroke: string; text: string }> = {
  mastered: { fill: "rgb(var(--on-track) / 0.14)", stroke: "rgb(var(--on-track))", text: "rgb(var(--on-track-fg))" },
  shaky: { fill: "rgb(var(--at-risk) / 0.14)", stroke: "rgb(var(--at-risk))", text: "rgb(var(--at-risk-fg))" },
  unread: { fill: "rgb(var(--muted-foreground) / 0.08)", stroke: "rgb(var(--muted-foreground) / 0.5)", text: "currentColor" },
  selected: { fill: "rgb(var(--accent) / 0.16)", stroke: "rgb(var(--accent))", text: "rgb(var(--accent-fg))" },
};

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

  if (!course) return <Navigate to="/study" replace />;
  if (!guide || !graph) return <Navigate to={`/study/${course.slug}`} replace />;

  const selectedId = params.get("n");
  const select = (id: string | null) => setParams(id ? { n: id } : {});
  const byId = new Map(placed.map((p) => [p.id, p]));
  const sel = selectedId ? byId.get(selectedId) : undefined;
  const status = (p: Placed) => nodeStatus(mastery, p);
  const neighbours = sel ? cluster(graph, sel.id).filter((id) => id !== sel.id) : [];
  const shakyNeighbours = neighbours.map((id) => byId.get(id)!).filter((p) => p && status(p) === "shaky");
  const trapsInSection: TrapBlock[] = sel ? (guide.sections[sel.sectionIndex].blocks.filter((b) => b.type === "trap") as TrapBlock[]) : [];

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
        <div ref={boxRef} className="relative min-h-0 min-w-0 flex-1" onClick={(e) => e.target === e.currentTarget && select(null)}>
          {placed.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground">This guide has no definition blocks to map.</p>
          ) : (
            <svg width={box.w} height={box.h} className="block" role="group" aria-label="Concept map">
              <defs>
                <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="rgb(var(--muted-foreground) / 0.6)" />
                </marker>
                <marker id="map-arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="rgb(var(--accent))" />
                </marker>
              </defs>
              {graph.edges.map((e) => {
                const a = byId.get(e.from), b = byId.get(e.to);
                if (!a || !b) return null;
                const hi = sel && (e.from === sel.id || e.to === sel.id);
                const { x1, y1, x2, y2 } = anchor(a, b);
                return (
                  <line
                    key={`${e.from}>${e.to}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={hi ? "rgb(var(--accent))" : "rgb(var(--muted-foreground) / 0.35)"}
                    strokeWidth={hi ? 1.75 : 1}
                    markerEnd={hi ? "url(#map-arrow-hi)" : "url(#map-arrow)"}
                    opacity={sel && !hi ? 0.35 : 1}
                  />
                );
              })}
              {placed.map((p) => {
                const st = sel?.id === p.id ? "selected" : status(p);
                const c = FILL[st];
                const dim = sel && sel.id !== p.id && !neighbours.includes(p.id);
                return (
                  <g
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.term} — ${status(p)}${sel?.id === p.id ? ", selected" : ""}`}
                    aria-pressed={sel?.id === p.id}
                    transform={`translate(${p.x - p.w / 2}, ${p.y - p.h / 2})`}
                    className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-[2.5]"
                    opacity={dim ? 0.45 : 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      select(p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        select(p.id);
                      }
                    }}
                  >
                    <rect width={p.w} height={p.h} rx={10} fill={c.fill} stroke={c.stroke} strokeWidth={st === "selected" ? 2 : 1.5} />
                    <text x={p.w / 2} y={p.h / 2 + 4.5} textAnchor="middle" fontSize={13} fill={c.text} className="select-none font-medium">
                      {fitLabel(p.term, p.w)}
                      <title>{p.term}</title>
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* ── Right rail ──────────────────────────────────────────────── */}
        <aside className="hidden w-[380px] shrink-0 flex-col overflow-y-auto border-l border-border bg-fill-ghost/40 xl:flex" style={{ padding: "24px 20px" }}>
          {sel ? (
            <>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                §{sel.sectionIndex + 1} · {guide.sections[sel.sectionIndex].heading}
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">{sel.term}</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                <Inline text={sel.def.body} />
              </p>

              <Chips title="Defined using" ids={graph.out[sel.id]} byId={byId} status={status} onPick={select} empty="nothing in this guide" />
              <Chips title="Used by" ids={graph.in[sel.id]} byId={byId} status={status} onPick={select} empty="no other term uses it" />

              {trapsInSection.length > 0 && (
                <div className="mt-5">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-brand-fg">Costs points · this section</div>
                  <ul className="mt-1.5 flex flex-col gap-2">
                    {trapsInSection.map((t) => (
                      <li key={t.id} className="rounded-lg border border-brand/40 bg-brand/[0.08] px-3 py-2 text-xs leading-relaxed">
                        <span className="mr-1 inline-flex items-center gap-1 font-mono text-[11px] text-brand-fg">
                          <AlertOctagon className="h-3 w-3" /> {t.source}
                          {t.points && ` · ${t.points}`}
                        </span>
                        <Inline text={t.body.replace(/^\*\*[^*]+\*\*\s*/, "")} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-5 text-xs text-muted-foreground">
                {shakyNeighbours.length ? (
                  <>
                    Shaky neighbours: <span className="text-at-risk-fg">{shakyNeighbours.map((p) => p.term).join(", ")}</span>
                  </>
                ) : neighbours.length ? (
                  "No shaky neighbours."
                ) : (
                  "No neighbours — this term stands alone."
                )}
              </p>

              <div className="mt-5 flex gap-2">
                <Link
                  to={`/study/${guide.id}?s=${sel.sectionId}&at=${encodeURIComponent(sel.id)}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Read §{sel.sectionIndex + 1}
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(`/study/${guide.id}/recall?focus=${encodeURIComponent(cluster(graph, sel.id).join(","))}`)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-solid px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <Layers className="h-3.5 w-3.5" /> Drill this cluster
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Pick a term</div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Click a node to see its definition, what it's built from, what builds on it, and the traps in its section. {graph.nodes.length} terms ·{" "}
                {graph.edges.length} links.
              </p>
              <ul className="mt-4 flex flex-col gap-1 text-xs">
                {(["mastered", "shaky", "unread"] as const).map((s) => (
                  <li key={s} className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-block h-3 w-5 rounded-[3px] border" style={{ background: FILL[s].fill, borderColor: FILL[s].stroke }} />
                    {s} · {placed.filter((p) => status(p) === s).length}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Chips({
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
    <div className="mt-5">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{title}</div>
      {ids.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors duration-micro hover:bg-fill-ghost",
                  st === "mastered" ? "border-on-track/50 text-on-track-fg" : st === "shaky" ? "border-at-risk/50 text-at-risk-fg" : "border-border text-foreground/85",
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
