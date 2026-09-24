/**
 * Stepper: an animation of one mechanic (a trace, a tree growing, a
 * derivation line by line) that plays by itself and loops, like a short
 * video, with pause, step and speed controls.
 *
 * Called by: GuideBlocks (inline in the chapter) and StudySlides.tsx (one
 * frame per slide, via FrameView, with the controls hidden).
 * Calls: nothing.
 *
 * How it moves: array, rows and heap frames give every item an identity
 * (its value plus which occurrence of that value it is), and each item is
 * positioned absolutely. Between frames an item keeps its identity, so a
 * swap, a shift, or a copy from one pile into the output is drawn as the
 * item sliding there, not as a jump cut. Pointer chips (low, mid, i, j…)
 * slide too. Tree levels fade in as they appear.
 *
 * Where to look: the frame's caption is a speech bubble that sits just
 * above the picture and slides sideways to whatever is happening (the
 * highlighted items, else the pointers), so your eyes stay in one place
 * instead of jumping between the picture and a caption underneath.
 *
 * Playback: it plays while at least 40% of it is on screen and pauses
 * itself when scrolled away. Each frame stays up long enough to read its
 * caption, then the next one plays; after the last frame it holds a
 * moment and starts over. Reduced-motion users start paused. The
 * segmented bar is the whole animation; the current segment fills.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Frame } from "@/study/types";
import { Inline } from "./Blocks";

const EASE = "duration-700 ease-[cubic-bezier(.33,1,.68,1)] motion-reduce:transition-none";

/**
 * FLIP motion for everything in `root` marked data-flip="<key>": after each
 * render, any item whose position changed is animated from where it was to
 * where it is, along a gentle arc (items moving right rise, items moving
 * left dip), so two items trading places pass each other instead of
 * overlapping. Positions are measured, so it works for any layout.
 */
function useFlip(root: RefObject<HTMLElement | null>, lift: number) {
  const prev = useRef(new Map<string, { left: number; top: number }>());
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, { left: number; top: number }>();
    // Positions relative to the stage, so scrolling the page isn't "motion".
    const base = el.getBoundingClientRect();
    el.querySelectorAll<HTMLElement>("[data-flip]").forEach((node) => {
      const key = node.dataset.flip as string;
      const b = node.getBoundingClientRect();
      const r = { left: b.left - base.left, top: b.top - base.top };
      next.set(key, r);
      const old = prev.current.get(key);
      if (!old || reduce || typeof node.animate !== "function") return;
      const dx = old.left - r.left;
      const dy = old.top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const arc = Math.abs(dy) < 4 ? Math.min(lift, Math.abs(dx) * 0.35) * (dx < 0 ? -1 : 1) : 0;
      node.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: `translate(${dx / 2}px, ${dy / 2 + arc}px)`, offset: 0.5 },
          { transform: "translate(0, 0)" },
        ],
        { duration: 750, easing: "cubic-bezier(.45,0,.2,1)" },
      );
    });
    prev.current = next;
  });
}

/* ── The speech bubble ──────────────────────────────────────────────────── */

/**
 * The caption, placed above the picture at horizontal position `x` (a CSS
 * length within the stage). The bubble itself is clamped inside the stage;
 * its little tail points at x exactly.
 */
function Bubble({ text, x, minH }: { text: string; x: string; minH: number }) {
  const W = 400;
  return (
    <div className="relative flex w-full flex-col justify-end" style={{ minHeight: minH }}>
      <div
        className={cn("w-fit max-w-full transition-[margin-left]", EASE)}
        style={{ marginLeft: `clamp(0px, calc(${x} - ${W / 2}px), calc(100% - min(${W}px, 100%)))`, maxWidth: W }}
      >
        <div
          key={text}
          className="rounded-xl border border-brand/30 bg-popover px-3.5 py-2.5 text-[14px] leading-relaxed text-foreground shadow-elevated duration-500 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 motion-reduce:animate-none"
        >
          <Inline text={text} />
        </div>
      </div>
      <div className="relative h-3">
        <span
          className={cn("absolute top-[-6px] h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-brand/30 bg-popover transition-[left]", EASE)}
          style={{ left: x }}
        />
      </div>
    </div>
  );
}

/* ── Grid frames (array, rows): items that slide ─────────────────────────── */

interface GridRow {
  label?: string;
  offset?: number;
  at?: number[];
  cells: (number | string | null)[];
  hl?: number[];
  done?: number[];
  warn?: number[];
  dim?: number[];
}

function toRows(frame: Extract<Frame, { kind: "array" | "rows" }>): { rows: GridRow[]; ptrs: [string, number, number][] } {
  if (frame.kind === "array") {
    return {
      rows: [{ cells: frame.cells, hl: frame.hl, done: frame.done, warn: frame.warn, dim: frame.dim }],
      ptrs: Object.entries(frame.ptrs ?? {}).map(([k, i]) => [k, 0, i]),
    };
  }
  return { rows: frame.rows, ptrs: Object.entries(frame.ptrs ?? {}).map(([k, [r, i]]) => [k, r, i]) };
}

/** The deepest pointer stack on row r (two labels on one cell = 2). */
function maxStackRef(ptrs: [string, number, number][], r: number): number {
  const n = new Map<number, number>();
  for (const [, pr, c] of ptrs) if (pr === r) n.set(c, (n.get(c) ?? 0) + 1);
  return Math.max(0, ...n.values());
}

/** Old content packs a whole list into one cell ("L: 2 5 8"); those can't slide. */
function slidable(rows: GridRow[]): boolean {
  return rows.every((r) => r.cells.length <= 24 && r.cells.every((c) => c === null || String(c).length <= 5));
}

type CellState = "hl" | "done" | "warn" | "dim" | "plain";

const CELL: Record<CellState, string> = {
  hl: "scale-[1.06] border-transparent bg-brand-solid text-white shadow-elevated ring-4 ring-brand/20",
  done: "border-on-track/40 bg-on-track/15 text-on-track-fg",
  warn: "border-at-risk/40 bg-at-risk/15 text-at-risk-fg",
  dim: "scale-95 border-dashed border-border/70 bg-transparent text-muted-foreground/40",
  plain: "border-border/80 bg-card text-foreground shadow-card",
};

function Grid({ frame, large, caption, minH }: { frame: Extract<Frame, { kind: "array" | "rows" }>; large?: boolean; caption?: string; minH: number }) {
  const { rows, ptrs } = toRows(frame);
  const cols = Math.max(1, ...rows.map((r) => (r.at?.length ? Math.max(...r.at) + 1 : r.cells.length + (r.offset ?? 0))));
  const cellH = large ? 56 : 44;
  const labelW = rows.some((r) => r.label) ? (large ? 72 : 52) : 0;
  const ptrRows = new Set(ptrs.map(([, r]) => r));
  const tops: number[] = [];
  let y = 0;
  for (let r = 0; r < rows.length; r++) {
    tops.push(y);
    y += cellH + (ptrRows.has(r) ? (large ? 40 : 34) + Math.max(0, maxStackRef(ptrs, r) - 1) * 22 : 12);
  }
  const height = y;

  const seen = new Map<string, number>();
  const items: { key: string; label: string; r: number; c: number; state: CellState }[] = [];
  rows.forEach((row, r) =>
    row.cells.forEach((v, c) => {
      if (v === null || v === "") return;
      const base = String(v);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const state: CellState = row.hl?.includes(c) ? "hl" : row.done?.includes(c) ? "done" : row.warn?.includes(c) ? "warn" : row.dim?.includes(c) ? "dim" : "plain";
      items.push({ key: `${base}~${n}`, label: base, r, c: row.at?.[c] ?? c + (row.offset ?? 0), state });
    }),
  );
  const slots: { r: number; c: number }[] = [];
  rows.forEach((row, r) => row.cells.forEach((v, c) => v === null && slots.push({ r, c: row.at?.[c] ?? c + (row.offset ?? 0) })));

  const stackAt = new Map<string, number>();
  const ptrPos = ptrs.map(([label, r, c]) => {
    const k = `${r}:${c}`;
    const n = stackAt.get(k) ?? 0;
    stackAt.set(k, n + 1);
    return { label, r, c: c + (rows[r]?.offset ?? 0), n };
  });

  const left = (c: number) => `calc(${labelW}px + (100% - ${labelW}px) * ${c} / ${cols})`;
  const width = `calc((100% - ${labelW}px) / ${cols} - 6px)`;
  const maxW = labelW + cols * (large ? 66 : 54);

  // Where the bubble points: the highlighted items, else the pointers,
  // else the settled items, else the middle.
  const focus = items.filter((i) => i.state === "hl").map((i) => i.c);
  const focusCols = focus.length ? focus : ptrPos.length ? ptrPos.map((p) => p.c) : items.filter((i) => i.state === "done").map((i) => i.c);
  const fc = focusCols.length ? (Math.min(...focusCols) + Math.max(...focusCols)) / 2 : (cols - 1) / 2;
  const bubbleX = `calc(${labelW}px + (100% - ${labelW}px) * ${fc + 0.5} / ${cols} - 3px)`;
  const stage = useRef<HTMLDivElement>(null);
  useFlip(stage, 26);

  return (
    <div className="mx-auto flex w-full flex-col" style={{ maxWidth: maxW }}>
      {caption !== undefined && <Bubble text={caption} x={bubbleX} minH={minH} />}
      <div ref={stage} className="relative w-full transition-[height] duration-500" style={{ height }}>
        {rows.map((row, r) =>
          row.label ? (
            <div key={`l${r}`} className="absolute left-0 flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ top: tops[r], height: cellH, width: labelW - 8 }}>
              {row.label}
            </div>
          ) : null,
        )}
        {slots.map(({ r, c }) => (
          <div key={`s${r}:${c}`} className="absolute rounded-xl border border-dashed border-border/80 bg-fill-ghost/40" style={{ top: tops[r], left: left(c), width, height: cellH }} />
        ))}
        {items.map((it) => (
          <div key={it.key} data-flip={it.key} className="absolute" style={{ top: tops[it.r], left: left(it.c), width, height: cellH }}>
            <div
              data-numeric
              className={cn(
                "flex h-full w-full items-center justify-center rounded-xl border font-mono font-semibold tabular-nums",
                "transition-[background-color,border-color,color,opacity,transform,box-shadow]",
                EASE,
                large ? "text-lg" : "text-[15px]",
                CELL[it.state],
              )}
            >
              {it.label}
            </div>
          </div>
        ))}
        {ptrPos.map((p) => (
          <div
            key={`p:${p.label}`}
            className={cn("absolute flex flex-col items-center transition-[top,left]", EASE)}
            style={{ top: tops[p.r] + cellH + 4 + p.n * 22, left: left(p.c), width }}
          >
            {p.n === 0 && <span className="mb-0.5 h-0 w-0 border-x-[5px] border-b-[6px] border-x-transparent border-b-brand/70" />}
            <span className={cn("whitespace-nowrap rounded-full bg-brand/15 px-2 py-px font-mono font-semibold text-brand-fg", large ? "text-sm" : "text-[11px]")}>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Heap frames: the tree and the array, moving together ─────────────────── */

function HeapView({ frame, large, caption, minH }: { frame: Extract<Frame, { kind: "heap" }>; large?: boolean; caption?: string; minH: number }) {
  const a = frame.a;
  const n = a.length;
  const size = frame.size ?? n;
  const depth = Math.floor(Math.log2(Math.max(1, n))) + 1;
  const rowH = large ? 66 : 58;
  const r = large ? 22 : 19;
  const treeH = depth * rowH;
  const pos = (i: number) => {
    const lvl = Math.floor(Math.log2(i + 1));
    const k = i - (2 ** lvl - 1);
    return { x: ((k + 0.5) / 2 ** lvl) * 100, y: r + 4 + lvl * rowH };
  };
  const seen = new Map<number, number>();
  const ids = a.map((v) => {
    const c = (seen.get(v) ?? 0) + 1;
    seen.set(v, c);
    return `${v}~${c}`;
  });
  const hl = new Set(frame.hl ?? []);
  const done = new Set(frame.done ?? []);
  for (let i = size; i < n; i++) done.add(i);
  const cellW = large ? 52 : 42;
  const focus = [...hl].filter((i) => i < size);
  const fx = focus.length ? (Math.min(...focus.map((i) => pos(i).x)) + Math.max(...focus.map((i) => pos(i).x))) / 2 : 50;
  const stage = useRef<HTMLDivElement>(null);
  useFlip(stage, 22);

  return (
    <div ref={stage} className="flex w-full flex-col items-center gap-5">
      <div className="flex w-full max-w-[560px] flex-col">
        {caption !== undefined && <Bubble text={caption} x={`${fx}%`} minH={minH} />}
        <div className="relative w-full" style={{ height: treeH }}>
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 100 ${treeH}`} preserveAspectRatio="none" aria-hidden>
            {a.map((_, i) => {
              if (i === 0 || i >= size) return null;
              const p = pos(Math.floor((i - 1) / 2));
              const c = pos(i);
              const on = hl.has(i) && hl.has(Math.floor((i - 1) / 2));
              return <line key={i} x1={p.x} y1={p.y} x2={c.x} y2={c.y} vectorEffect="non-scaling-stroke" stroke={on ? "rgb(var(--accent))" : "rgb(var(--foreground) / 0.18)"} strokeWidth={on ? 3 : 1.5} strokeLinecap="round" />;
            })}
          </svg>
          {a.map((v, i) => {
            const p = pos(i);
            return (
              <div key={ids[i]} data-flip={`t:${ids[i]}`} className="absolute" style={{ left: `calc(${p.x}% - ${r}px)`, top: p.y - r, width: r * 2, height: r * 2 }}>
                <div
                  data-numeric
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-full border font-mono font-semibold",
                    "transition-[opacity,background-color,border-color,box-shadow,transform]",
                    EASE,
                    large ? "text-base" : "text-sm",
                    CELL[hl.has(i) ? "hl" : "plain"],
                    i >= size && "opacity-0",
                  )}
                >
                  {v}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative" style={{ width: n * (cellW + 5), height: cellW + 14 }}>
        {a.map((v, i) => (
          <div key={ids[i]} data-flip={`a:${ids[i]}`} className="absolute" style={{ left: i * (cellW + 5), top: 0 }}>
            <div
              data-numeric
              className={cn("flex items-center justify-center rounded-lg border font-mono font-semibold tabular-nums transition-colors duration-500", large ? "text-base" : "text-sm", CELL[hl.has(i) ? "hl" : done.has(i) ? "done" : "plain"])}
              style={{ width: cellW, height: cellW - 8 }}
            >
              {v}
            </div>
          </div>
        ))}
        {a.map((_, i) => (
          <span key={`i${i}`} className="absolute text-center font-mono text-[10px] text-muted-foreground" style={{ left: i * (cellW + 5), top: cellW - 4, width: cellW }}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Timeline frames: a story moving along a line of dates ───────────────── */

const DOT_TONE: Record<string, string> = {
  brand: "bg-brand-solid ring-brand/25",
  green: "bg-on-track ring-on-track/25",
  amber: "bg-at-risk ring-at-risk/25",
  red: "bg-critical ring-critical/25",
};
const BAR_TONE: Record<string, string> = {
  brand: "from-brand/80 to-brand/50",
  green: "from-on-track/80 to-on-track/50",
  amber: "from-at-risk/80 to-at-risk/50",
  red: "from-critical/80 to-critical/50",
};

/**
 * The events sit at even spacing (history's dates are lumpy; even spacing
 * keeps every label readable). The filled part of the line and the marker
 * slide to the current event; the bubble follows them.
 */
function TimelineView({ frame, large, caption, minH }: { frame: Extract<Frame, { kind: "timeline" }>; large?: boolean; caption?: string; minH: number }) {
  const ev = frame.events;
  const n = Math.max(1, ev.length);
  const at = Math.min(Math.max(0, frame.at), n - 1);
  const x = (k: number) => ((k + 0.5) / n) * 100;
  const m = frame.meter;
  const mv = m ? Math.min(100, Math.max(0, m.value)) : 0;
  return (
    <div className="w-full overflow-x-auto">
      <div className="mx-auto flex flex-col" style={{ minWidth: n * 88 }}>
        {caption !== undefined && <Bubble text={caption} x={`${x(at)}%`} minH={minH} />}
        <div className="relative" style={{ height: large ? 170 : 140 }}>
          {/* the line, and the part already travelled */}
          <span className="absolute top-[38px] h-1 rounded-full bg-foreground/10" style={{ left: `${x(0)}%`, right: `${100 - x(n - 1)}%` }} />
          <span className={cn("absolute top-[38px] h-1 rounded-full bg-gradient-to-r from-brand/40 to-brand transition-[width]", EASE)} style={{ left: `${x(0)}%`, width: `${x(at) - x(0)}%` }} />
          {ev.map((e, k) => {
            const state = k < at ? "past" : k === at ? "now" : "future";
            const t = e.tone ?? "brand";
            return (
              <div
                key={k}
                className={cn("absolute top-0 flex -translate-x-1/2 flex-col items-center text-center transition-opacity", EASE, state === "future" && "opacity-40")}
                style={{ left: `${x(k)}%`, width: `${100 / n}%` }}
              >
                <span data-numeric className={cn("font-mono font-semibold tabular-nums transition-colors duration-500", large ? "text-sm" : "text-xs", state === "now" ? "text-brand-fg" : "text-muted-foreground")}>
                  {e.year}
                </span>
                <span className="mt-2 flex h-5 items-center justify-center">
                  <span
                    className={cn(
                      "block rounded-full ring-4 transition-all",
                      EASE,
                      state === "now" ? cn("h-5 w-5 shadow-elevated", DOT_TONE[t]) : state === "past" ? cn("h-3 w-3 ring-transparent", DOT_TONE[t]) : "h-3 w-3 bg-foreground/25 ring-transparent",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "mt-3 rounded-lg px-1.5 py-1 leading-snug transition-all",
                    EASE,
                    large ? "text-sm" : "text-[12.5px]",
                    state === "now" ? "bg-card font-semibold text-foreground shadow-card ring-1 ring-brand/30" : "text-foreground/75",
                  )}
                >
                  {e.title}
                </span>
              </div>
            );
          })}
        </div>
        {m && (
          <div className="mx-auto mt-1 flex w-full max-w-[640px] flex-col gap-1.5 rounded-xl bg-card/80 px-4 py-3 shadow-card ring-1 ring-border/60">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-semibold text-foreground">{m.label}</span>
              <span data-numeric className="font-mono text-muted-foreground">{Math.round(mv)}%</span>
            </div>
            <span className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
              <span className={cn("block h-full rounded-full bg-gradient-to-r transition-[width]", EASE, BAR_TONE[m.tone ?? "brand"])} style={{ width: `${Math.max(2, mv)}%` }} />
            </span>
            {(m.low || m.high) && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{m.low}</span>
                <span>{m.high}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** The old flow layout, for cells too long to slide. */
function FlowArray({ frame, large }: { frame: Extract<Frame, { kind: "array" }>; large?: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {frame.cells.map((c, i) => {
        const hl = frame.hl?.includes(i);
        const done = frame.done?.includes(i);
        return (
          <div
            key={i}
            data-numeric
            className={cn(
              "flex items-center justify-center rounded-xl border font-mono tabular-nums transition-colors duration-500",
              large ? "h-14 min-w-14 px-3 text-lg" : "h-11 min-w-11 px-2.5 text-sm",
              CELL[hl ? "hl" : done ? "done" : "plain"],
            )}
          >
            {c}
          </div>
        );
      })}
    </div>
  );
}

/**
 * One frame. With `caption`, the caption is drawn as a bubble pointing at
 * the action (the Stepper does this); without it (slides), just the picture.
 */
export function FrameView({ frame, large, caption, minH = 0 }: { frame: Frame; large?: boolean; caption?: string; minH?: number }) {
  const top = (node: ReactNode) => (
    <div className="flex w-full flex-col gap-1">
      {caption !== undefined && <Bubble text={caption} x="50%" minH={minH} />}
      {node}
    </div>
  );
  switch (frame.kind) {
    case "array":
    case "rows": {
      const { rows } = toRows(frame);
      const note = frame.note && <div className="text-center font-mono text-xs text-muted-foreground">{frame.note}</div>;
      if (!slidable(rows) && frame.kind === "array") {
        return top(
          <div className="flex flex-col items-center gap-3">
            <FlowArray frame={frame} large={large} />
            {note}
          </div>,
        );
      }
      return (
        <div className="flex w-full flex-col gap-3">
          <Grid frame={frame} large={large} caption={caption} minH={minH} />
          {note}
        </div>
      );
    }

    case "heap":
      return (
        <div className="flex w-full flex-col gap-3">
          <HeapView frame={frame} large={large} caption={caption} minH={minH} />
          {frame.note && <div className="text-center font-mono text-xs text-muted-foreground">{frame.note}</div>}
        </div>
      );

    case "tree":
      return top(
        <div className="flex flex-col gap-2.5">
          {frame.levels.map((lvl, li) => (
            <div key={li} className="flex items-center gap-3 duration-500 animate-in fade-in-0 slide-in-from-top-2 motion-reduce:animate-none">
              <span className="w-12 shrink-0 font-mono text-2xs text-muted-foreground">lvl {li}</span>
              <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-1.5">
                {lvl.nodes.map((n, ni) => (
                  <span
                    key={ni}
                    className={cn(
                      "rounded-lg border px-2 py-1 font-mono transition-colors duration-500",
                      lvl.hl ? "border-transparent bg-brand-solid text-white shadow-card" : "border-border/80 bg-card text-foreground/85 shadow-card",
                      large ? "text-sm" : "text-xs",
                    )}
                  >
                    {n}
                  </span>
                ))}
              </div>
              {lvl.work && <span className={cn("w-36 shrink-0 text-right font-mono text-xs", lvl.hl ? "font-semibold text-brand-fg" : "text-muted-foreground")}>{lvl.work}</span>}
            </div>
          ))}
        </div>,
      );

    case "timeline":
      return <TimelineView frame={frame} large={large} caption={caption} minH={minH} />;

    case "lines":
      return top(
        <div className="flex flex-col gap-1">
          {frame.lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 font-mono transition-colors duration-500",
                large ? "text-sm" : "text-[13px]",
                i === frame.active ? "bg-brand/[0.12] text-foreground ring-1 ring-brand/40 animate-in fade-in-0 motion-reduce:animate-none" : i < frame.active ? "text-foreground/70" : "text-muted-foreground/40",
              )}
            >
              {line}
            </div>
          ))}
        </div>,
      );
  }
}

/* ── The player ─────────────────────────────────────────────────────────── */

const SPEEDS = [0.5, 1, 1.5, 2] as const;

/** How long a frame stays up: enough to read its caption. */
function dwellMs(caption: string, speed: number): number {
  const base = Math.min(8000, Math.max(2600, 1600 + caption.length * 32));
  return base / speed;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function Stepper({ title, frames }: { title: string; frames: Frame[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
  const [speed, setSpeed] = useState<number>(1);
  const ref = useRef<HTMLDivElement>(null);
  const frame = frames[i];
  const last = i === frames.length - 1;
  const running = playing && visible;
  const dwell = dwellMs(frame.caption, speed) + (last ? 1500 / speed : 0);
  // Reserve room for the longest caption so the picture never jumps.
  const longest = Math.max(...frames.map((f) => f.caption.length));
  const minH = 26 + Math.ceil(longest / 52) * 23;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((v) => (v + 1) % frames.length), dwell);
    return () => clearTimeout(t);
  }, [running, i, dwell, frames.length]);

  const go = (k: number) => {
    setPlaying(false);
    setI(((k % frames.length) + frames.length) % frames.length);
  };

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      <div className="flex items-center gap-3 px-5 pb-1 pt-4">
        <span className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-fg">
          <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-brand" : "bg-muted-foreground/50")} />
          Animation
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
      </div>

      {/* The stage: a faint dot grid, the bubble, the picture. */}
      <div className="px-5 pb-6 pt-3" style={{ backgroundImage: "radial-gradient(rgb(var(--foreground) / 0.07) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
        <FrameView frame={frame} caption={frame.caption} minH={minH} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 border-t border-border/60 bg-fill-ghost/30 px-4 py-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-solid text-white shadow-card transition-transform duration-micro hover:scale-105"
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        <button type="button" onClick={() => go(i - 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-fill-ghost hover:text-foreground" aria-label="Previous step" title="Previous step">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => go(i + 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-fill-ghost hover:text-foreground" aria-label="Next step" title="Next step">
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* One segment per frame; the current one fills over its dwell time. */}
        <div className="flex min-w-0 flex-1 items-center gap-1" aria-label="Steps">
          {frames.map((_, k) => (
            <button key={k} type="button" onClick={() => go(k)} aria-label={`Step ${k + 1}`} className="group relative h-4 min-w-[6px] flex-1">
              <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/10 group-hover:bg-foreground/20">
                {k < i && <span className="absolute inset-0 bg-brand/60" />}
                {k === i && (
                  <span
                    key={`${i}-${speed}-${running}`}
                    className={cn("absolute inset-0 origin-left bg-brand", running && "animate-frame-progress")}
                    style={running ? { animationDuration: `${dwell}ms` } : undefined}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">
          {i + 1}/{frames.length}
        </span>
        <button
          type="button"
          onClick={() => {
            setI(0);
            setPlaying(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-fill-ghost hover:text-foreground"
          aria-label="Restart"
          title="Restart"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length])}
          className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-2xs text-muted-foreground hover:text-foreground"
          title="Playback speed"
        >
          {speed}×
        </button>
      </div>
    </div>
  );
}
