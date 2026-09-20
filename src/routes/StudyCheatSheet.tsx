/**
 * StudyCheatSheet — the Cheat sheet view of a guide (wireframe C): one
 * non-scrolling screen of tiles in three equal columns, paginated when a
 * guide won't fit, printable.
 *
 * Route: /study/:course/:chapter/cheatsheet (?p=<page>)
 * Called by: the router, the view tab strip.
 * Calls: study/cheatsheet (tile classification), GuideChrome, Inline.
 *
 * Layout is measure-then-place: the filtered tiles render once in an
 * invisible column-width probe, their heights are read, and a greedy packer
 * fills pages — each tile into its preferred column if it fits, else the
 * shortest column, else the next page. Text never shrinks below 12px; a
 * guide that needs more room gets more pages.
 *
 * Print: `window.print()` (the platform path). A `beforeprint` listener
 * switches the body to "all pages, stacked", and globals.css hides the rest
 * of the app and forces white/black under @media print.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Inline } from "@/components/study/Blocks";
import { CodeHighlight } from "@/components/study/CodeHighlight";
import { GuideTopRow } from "@/components/study/GuideChrome";
import { cn } from "@/lib/utils";
import { courseBySlug } from "@/study";
import { tilesFor, trapLine, type ChipKey, type Tile } from "@/study/cheatsheet";
import { guideById } from "@/study/loadGuides";

const GAP = 14;
const COLS = 3;
const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "definitions", label: "definitions" },
  { key: "notation", label: "notation" },
  { key: "traps", label: "traps" },
  { key: "examples", label: "examples" },
];
const DEFAULT_CHIPS: Record<ChipKey, boolean> = { definitions: true, notation: true, traps: true, examples: false };

/* ── Tile rendering ─────────────────────────────────────────────────────── */

const LABEL = "mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground";
const TILE = "rounded-[10px] border border-border bg-card px-4 py-3.5";
const LINE = "text-xs leading-snug";

function TileView({ tile }: { tile: Tile }) {
  switch (tile.kind) {
    case "definitions":
      return (
        <section className={TILE} aria-label="Definitions">
          <div className={LABEL}>{tile.label}</div>
          <ul className="flex flex-col gap-1.5">
            {tile.items.map((d) => (
              <li key={d.id} className={LINE}>
                <span className="font-semibold text-foreground">{d.term}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="text-foreground/85">
                  <Inline text={d.body} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
    case "lookalike":
      return (
        <section className={TILE} aria-label="Things that look alike">
          <div className={LABEL}>{tile.label}</div>
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1.5">
            {tile.table.columns.map((c, i) => (
              <div key={`h${i}`} className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
                {c}
              </div>
            ))}
            {tile.table.rows.flatMap((r, i) =>
              r.map((c, j) => (
                <div key={`${i}-${j}`} className={cn(LINE, j === 0 && "font-mono font-medium", j === 2 && "font-mono text-muted-foreground")}>
                  <Inline text={c} />
                </div>
              )),
            )}
          </div>
        </section>
      );
    case "trapPoints":
      return (
        <section className={cn(TILE, "border-brand/40 bg-brand/[0.08]")} aria-label="Points at stake">
          <div className={cn(LABEL, "text-brand-fg")}>{tile.label}</div>
          <ul className="flex flex-col gap-1">
            {tile.items.map((t) => (
              <li key={t.id} className={cn(LINE, "flex gap-2")}>
                <span className="shrink-0 font-mono font-semibold text-brand-fg">{t.points}</span>
                <span className="text-muted-foreground">{t.source}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    case "operations":
      return (
        <section className={TILE} aria-label={tile.label}>
          <div className={LABEL}>{tile.label}</div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-3 gap-y-1.5">
            {tile.table.rows.map((r, i) => (
              <RowPair key={i} left={r[0] ?? ""} right={r.slice(1).join(" · ")} monoLeft />
            ))}
          </div>
        </section>
      );
    case "notation": {
      const n = tile.table.columns.length;
      return (
        <section className={TILE} aria-label={tile.label}>
          <div className={LABEL}>{tile.label}</div>
          <div className="grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${n - 1}, minmax(0,1.3fr))` }}>
            {tile.table.columns.map((c, i) => (
              <div key={`h${i}`} className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
                {c}
              </div>
            ))}
            {tile.table.rows.flatMap((r, i) =>
              r.map((c, j) => (
                <div key={`${i}-${j}`} className={cn(LINE, j === 0 ? "text-foreground" : "font-mono text-foreground/85")}>
                  <Inline text={c} />
                </div>
              )),
            )}
          </div>
        </section>
      );
    }
    case "traps":
      return (
        <section className={cn(TILE, "border-brand/40 bg-brand/[0.08]")} aria-label="Costs points">
          <div className={cn(LABEL, "text-brand-fg")}>{tile.label}</div>
          <ul className="flex flex-col gap-1.5">
            {tile.items.map((t) => (
              <li key={t.id} className={LINE}>
                <span className="font-mono text-[11px] text-brand-fg">{t.source}</span>
                {t.points && <span className="ml-1 font-mono text-[11px] text-brand-fg">{t.points}</span>}
                <span className="text-muted-foreground"> · </span>
                <span className="text-foreground/85">
                  <Inline text={trapLine(t)} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
    case "example":
      return (
        <section className={TILE} aria-label={tile.label}>
          <div className={LABEL}>{tile.label}</div>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-snug text-foreground/85"><CodeHighlight text={tile.example.body} /></pre>
          {tile.example.answer && <div className="mt-1.5 font-mono text-xs text-on-track-fg">= {tile.example.answer}</div>}
        </section>
      );
  }
}

function RowPair({ left, right, monoLeft }: { left: string; right: string; monoLeft: boolean }) {
  return (
    <>
      <div className={cn(LINE, monoLeft ? "font-mono font-medium text-foreground" : "text-foreground")}>
        <Inline text={left} />
      </div>
      <div className={cn(LINE, monoLeft ? "text-foreground/85" : "font-mono text-foreground/85")}>
        <Inline text={right} />
      </div>
    </>
  );
}

/* ── Packing ────────────────────────────────────────────────────────────── */

type Page = Tile[][]; // page → column → tiles

function pack(tiles: Tile[], heights: Map<string, number>, pageHeight: number): Page[] {
  const pages: Page[] = [];
  let cols: Tile[][] = [[], [], []];
  let used = [0, 0, 0];
  const fits = (c: number, h: number) => used[c] + (used[c] ? GAP : 0) + h <= pageHeight;
  const place = (c: number, t: Tile, h: number) => {
    used[c] += (used[c] ? GAP : 0) + h;
    cols[c].push(t);
  };
  for (const t of tiles) {
    const h = heights.get(t.id) ?? 0;
    if (fits(t.column, h)) {
      place(t.column, t, h);
      continue;
    }
    const shortest = [0, 1, 2].filter((c) => fits(c, h)).sort((a, b) => used[a] - used[b])[0];
    if (shortest !== undefined) {
      place(shortest, t, h);
      continue;
    }
    // Nothing fits: new page. A tile taller than a page still goes on its own page (never shrink text).
    if (cols.some((c) => c.length)) {
      pages.push(cols);
      cols = [[], [], []];
      used = [0, 0, 0];
    }
    place(t.column, t, h);
  }
  if (cols.some((c) => c.length)) pages.push(cols);
  return pages.length ? pages : [[[], [], []]];
}

/* ── The view ───────────────────────────────────────────────────────────── */

export default function StudyCheatSheet() {
  const { course: cslug, chapter: chslug } = useParams();
  const [params, setParams] = useSearchParams();
  const course = courseBySlug(cslug);
  const guide = guideById(cslug && chslug ? `${cslug}/${chslug}` : undefined);

  const [chips, setChips] = useState<Record<ChipKey, boolean>>(DEFAULT_CHIPS);
  const allTiles = useMemo(() => (guide ? tilesFor(guide) : []), [guide]);
  const tiles = useMemo(() => allTiles.filter((t) => chips[t.chip]), [allTiles, chips]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [heights, setHeights] = useState<Map<string, number>>(new Map());
  const [printing, setPrinting] = useState(false);

  // Available body box — re-measured on resize.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tile heights at column width — read from the probe after layout.
  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe || !box.w) return;
    const next = new Map<string, number>();
    for (const el of Array.from(probe.children) as HTMLElement[]) next.set(el.dataset.tile!, el.getBoundingClientRect().height);
    setHeights(next);
  }, [tiles, box.w]);

  useEffect(() => {
    const on = () => setPrinting(true);
    const off = () => setPrinting(false);
    window.addEventListener("beforeprint", on);
    window.addEventListener("afterprint", off);
    return () => {
      window.removeEventListener("beforeprint", on);
      window.removeEventListener("afterprint", off);
    };
  }, []);

  if (!course) return <Navigate to="/study" replace />;
  if (!guide) return <Navigate to={`/study/${course.slug}`} replace />;

  const colW = box.w ? (box.w - GAP * (COLS - 1)) / COLS : 0;
  // 32px reserved for the page-nav row so the last tile never overlaps it.
  const pages = box.h && heights.size ? pack(tiles, heights, box.h - 32) : [[tiles.filter((t) => t.column === 0), tiles.filter((t) => t.column === 1), tiles.filter((t) => t.column === 2)]];
  const pageIdx = Math.min(Math.max(0, Number(params.get("p") ?? 0)), pages.length - 1);
  const goPage = (i: number) => setParams(i === 0 ? {} : { p: String(i) });
  const toggle = (k: ChipKey) => {
    setChips((c) => ({ ...c, [k]: !c[k] }));
    goPage(0);
  };

  const renderPage = (page: Page, key: string) => (
    <div key={key} className="grid flex-1 grid-cols-3 items-start" style={{ gap: GAP }}>
      {page.map((col, ci) => (
        <div key={ci} className="flex min-w-0 flex-col" style={{ gap: GAP }}>
          {col.map((t) => (
            <TileView key={t.id} tile={t} />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="border-b border-border/60 px-5 pb-3 pt-4 print:hidden">
        <GuideTopRow
          guide={guide}
          courseCode={course.code}
          active="cheatsheet"
          right={
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground">show:</span>
              {CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={chips[c.key]}
                  onClick={() => toggle(c.key)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors duration-micro",
                    chips[c.key] ? "border-brand/60 bg-brand/10 text-brand-fg" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  // Paint the all-pages layout before the print dialog snapshots the page.
                  setPrinting(true);
                  setTimeout(() => window.print(), 80);
                }}
                aria-label="Print or save as PDF"
                className="ml-1 flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost"
              >
                <Printer className="h-3.5 w-3.5" /> Print / PDF
              </button>
            </div>
          }
        />
      </header>

      {/* ── Body: one page, no scroll ────────────────────────────────── */}
      <div ref={bodyRef} className="cheatsheet-print-root relative min-h-0 flex-1 overflow-hidden" style={{ padding: 20 }}>
        {printing ? (
          <div className="flex flex-col" style={{ gap: 24 }}>
            <div className="text-xs text-muted-foreground">
              {course.code} · {guide.lessons} · {guide.title}
            </div>
            {pages.map((pg, i) => renderPage(pg, `print-${i}`))}
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {renderPage(pages[pageIdx], `page-${pageIdx}`)}
            {pages.length > 1 && (
              <div className="mt-2 flex shrink-0 items-center justify-end gap-2 print:hidden">
                <button type="button" aria-label="Previous page" onClick={() => goPage(pageIdx - 1)} disabled={pageIdx === 0} className="rounded-md border border-border p-1 hover:bg-fill-ghost disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span data-numeric className="font-mono text-2xs text-muted-foreground">
                  page {pageIdx + 1} / {pages.length}
                </span>
                <button type="button" aria-label="Next page" onClick={() => goPage(pageIdx + 1)} disabled={pageIdx === pages.length - 1} className="rounded-md border border-border p-1 hover:bg-fill-ghost disabled:opacity-40">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {tiles.length === 0 && <p className="text-sm text-muted-foreground">Nothing to show — turn a filter back on.</p>}
          </div>
        )}

        {/* Probe: every filtered tile at column width, invisible, for measuring. */}
        <div ref={probeRef} aria-hidden className="pointer-events-none absolute left-0 top-0 flex flex-col opacity-0" style={{ width: colW || 300, gap: GAP, visibility: "hidden" }}>
          {tiles.map((t) => (
            <div key={t.id} data-tile={t.id}>
              <TileView tile={t} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
