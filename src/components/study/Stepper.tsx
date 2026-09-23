/**
 * Stepper: an animation of one mechanic (a trace, a tree growing, a
 * derivation line by line) that plays by itself and loops, like a short
 * video, with pause, step and speed controls.
 *
 * Called by: GuideBlocks (inline in the chapter) and StudySlides.tsx (one
 * frame per slide, via FrameView, with the controls hidden).
 * Calls: nothing.
 *
 * How it moves: array and rows frames give every item an identity (its
 * value plus which occurrence of that value it is), and each item is
 * positioned absolutely. Between frames an item keeps its identity, so a
 * swap, a shift, or a copy from one pile into the output is drawn as the
 * item sliding there, not as a jump cut. Pointer arrows (low, mid, i, j…)
 * slide too. Tree levels fade in as they appear.
 *
 * Playback: it plays while at least 40% of it is on screen and pauses
 * itself when scrolled away. Each frame stays up long enough to read its
 * caption (longer captions stay longer), then the next one plays; after
 * the last frame it holds a moment and starts over. Reduced-motion users
 * start paused. The thin bar under the picture is the current frame's time.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Frame } from "@/study/types";
import { Inline } from "./Blocks";

/* ── Grid frames (array, rows): items that slide ─────────────────────────── */

interface GridRow {
  label?: string;
  offset?: number;
  at?: number[];
  cells: (number | string | null)[];
  hl?: number[];
  done?: number[];
  dim?: number[];
}

function toRows(frame: Extract<Frame, { kind: "array" | "rows" }>): { rows: GridRow[]; ptrs: [string, number, number][] } {
  if (frame.kind === "array") {
    return {
      rows: [{ cells: frame.cells, hl: frame.hl, done: frame.done, dim: frame.dim }],
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

function Grid({ frame, large }: { frame: Extract<Frame, { kind: "array" | "rows" }>; large?: boolean }) {
  const { rows, ptrs } = toRows(frame);
  const cols = Math.max(1, ...rows.map((r) => (r.at?.length ? Math.max(...r.at) + 1 : r.cells.length + (r.offset ?? 0))));
  const cellH = large ? 56 : 42;
  const labelW = rows.some((r) => r.label) ? (large ? 72 : 56) : 0;
  const ptrRows = new Set(ptrs.map(([, r]) => r));
  // Vertical layout: each row, then room for its pointers if it has any.
  const tops: number[] = [];
  let y = 0;
  for (let r = 0; r < rows.length; r++) {
    tops.push(y);
    y += cellH + (ptrRows.has(r) ? (large ? 40 : 34) + Math.max(0, maxStackRef(ptrs, r) - 1) * 14 : 10);
  }
  const height = y;

  // Identity: value + occurrence, counted row-major, so items keep their key
  // when they move.
  const seen = new Map<string, number>();
  const items: { key: string; label: string; r: number; c: number; state: "hl" | "done" | "dim" | "plain" }[] = [];
  rows.forEach((row, r) =>
    row.cells.forEach((v, c) => {
      if (v === null || v === "") return;
      const base = String(v);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const state = row.hl?.includes(c) ? "hl" : row.done?.includes(c) ? "done" : row.dim?.includes(c) ? "dim" : "plain";
      items.push({ key: `${base}~${n}`, label: base, r, c: row.at?.[c] ?? c + (row.offset ?? 0), state });
    }),
  );
  // Empty slots (null) are drawn as dashed outlines, fixed in place.
  const slots: { r: number; c: number }[] = [];
  rows.forEach((row, r) => row.cells.forEach((v, c) => v === null && slots.push({ r, c: row.at?.[c] ?? c + (row.offset ?? 0) })));

  // Pointers at the same cell stack under each other; each keeps its own
  // key (its label) so it slides on its own.
  const stackAt = new Map<string, number>();
  const ptrPos = ptrs.map(([label, r, c]) => {
    const k = `${r}:${c}`;
    const n = stackAt.get(k) ?? 0;
    stackAt.set(k, n + 1);
    return { label, r, c: c + (rows[r]?.offset ?? 0), n };
  });
  const left = (c: number) => `calc(${labelW}px + (100% - ${labelW}px) * ${c} / ${cols})`;
  const width = `calc((100% - ${labelW}px) / ${cols} - 6px)`;
  const maxW = labelW + cols * (large ? 64 : 50);

  return (
    <div className="relative mx-auto w-full" style={{ height, maxWidth: maxW }}>
      {rows.map((row, r) =>
        row.label ? (
          <div key={`l${r}`} className="absolute left-0 flex items-center font-mono text-2xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ top: tops[r], height: cellH, width: labelW - 8 }}>
            {row.label}
          </div>
        ) : null,
      )}
      {slots.map(({ r, c }) => (
        <div key={`s${r}:${c}`} className="absolute rounded-md border border-dashed border-border/70" style={{ top: tops[r], left: left(c), width, height: cellH }} />
      ))}
      {items.map((it) => (
        <div
          key={it.key}
          data-numeric
          className={cn(
            "absolute flex items-center justify-center rounded-md border font-mono tabular-nums",
            "transition-[top,left,background-color,border-color,color,opacity] duration-500 ease-in-out motion-reduce:transition-none",
            large ? "text-lg" : "text-sm",
            it.state === "hl" && "border-brand bg-brand/15 font-semibold text-foreground",
            it.state === "done" && "border-on-track/50 bg-on-track/10 text-foreground",
            it.state === "dim" && "border-dashed border-border/60 bg-transparent text-muted-foreground/35",
            it.state === "plain" && "border-border bg-card text-foreground/85",
          )}
          style={{ top: tops[it.r], left: left(it.c), width, height: cellH }}
        >
          {it.label}
        </div>
      ))}
      {ptrPos.map((p) => (
        <div
          key={`p:${p.label}`}
          className="absolute flex flex-col items-center text-brand-fg transition-[top,left] duration-500 ease-in-out motion-reduce:transition-none"
          style={{ top: tops[p.r] + cellH + 2 + (p.n > 0 ? 12 + p.n * 14 : 0), left: left(p.c), width }}
        >
          {p.n === 0 && <span className="text-[11px] leading-none">▲</span>}
          <span className={cn("whitespace-nowrap font-mono font-semibold leading-tight", large ? "text-sm" : "text-2xs")}>{p.label}</span>
        </div>
      ))}
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
              "flex items-center justify-center rounded-md border font-mono tabular-nums transition-colors duration-500",
              large ? "h-14 min-w-14 px-3 text-lg" : "h-10 min-w-10 px-2 text-sm",
              hl ? "border-brand bg-brand/15 text-foreground" : done ? "border-on-track/50 bg-on-track/10 text-foreground" : "border-border bg-card text-foreground/80",
            )}
          >
            {c}
          </div>
        );
      })}
    </div>
  );
}

export function FrameView({ frame, large }: { frame: Frame; large?: boolean }) {
  switch (frame.kind) {
    case "array":
    case "rows": {
      const { rows } = toRows(frame);
      return (
        <div className="flex flex-col items-center gap-3">
          {slidable(rows) ? <Grid frame={frame} large={large} /> : frame.kind === "array" ? <FlowArray frame={frame} large={large} /> : <Grid frame={frame} large={large} />}
          {frame.note && <div className="font-mono text-xs text-muted-foreground">{frame.note}</div>}
        </div>
      );
    }

    case "tree":
      return (
        <div className="flex flex-col gap-2.5">
          {frame.levels.map((lvl, li) => (
            <div key={li} className="flex items-center gap-3 duration-500 animate-in fade-in-0 slide-in-from-top-2 motion-reduce:animate-none">
              <span className="w-12 shrink-0 font-mono text-2xs text-muted-foreground">lvl {li}</span>
              <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-1">
                {lvl.nodes.map((n, ni) => (
                  <span
                    key={ni}
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 font-mono text-2xs transition-colors duration-500",
                      lvl.hl ? "border-brand bg-brand/15" : "border-border bg-card text-foreground/80",
                      large ? "px-2 py-1 text-xs" : "text-xs",
                    )}
                  >
                    {n}
                  </span>
                ))}
              </div>
              {lvl.work && <span className={cn("w-36 shrink-0 text-right font-mono text-2xs", lvl.hl ? "text-brand-fg" : "text-muted-foreground")}>{lvl.work}</span>}
            </div>
          ))}
        </div>
      );

    case "lines":
      return (
        <div className="flex flex-col gap-1">
          {frame.lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono transition-colors duration-500",
                large ? "text-sm" : "text-[13px]",
                i === frame.active ? "bg-brand/12 text-foreground ring-1 ring-brand/40" : i < frame.active ? "text-foreground/70" : "text-muted-foreground/40",
                i === frame.active && "duration-500 animate-in fade-in-0 motion-reduce:animate-none",
              )}
            >
              {line}
            </div>
          ))}
        </div>
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

  // Only play while on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Advance, and loop back to the start after the last frame.
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((v) => (v + 1) % frames.length), dwell);
    return () => clearTimeout(t);
  }, [running, i, dwell, frames.length]);

  const step = (d: number) => {
    setPlaying(false);
    setI((v) => (v + d + frames.length) % frames.length);
  };

  return (
    <div ref={ref} className="rounded-xl border border-border/70 bg-card shadow-card">
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3">
        <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-brand-fg">
          <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-brand" : "bg-muted-foreground/50")} />
          Animation
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        <span data-numeric className="font-mono text-2xs text-muted-foreground">
          {i + 1} / {frames.length}
        </span>
      </div>

      <div className="px-5 py-6">
        <FrameView frame={frame} />
      </div>

      {/* This frame's time. */}
      <div className="h-0.5 bg-fill-ghost">
        <div
          key={`${i}-${speed}`}
          className="h-full origin-left animate-frame-progress bg-brand/70"
          style={{ animationDuration: `${dwell}ms`, animationPlayState: running ? "running" : "paused" }}
        />
      </div>

      <div className="px-5 py-4">
        <p className="min-h-[3rem] text-[15px] leading-relaxed text-foreground/90">
          <Inline text={frame.caption} />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity duration-micro hover:opacity-90"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => step(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-fill-ghost hover:text-foreground" aria-label="Previous step">
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <button type="button" onClick={() => step(1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-fill-ghost hover:text-foreground" aria-label="Next step">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setI(0);
              setPlaying(true);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-fill-ghost hover:text-foreground"
            aria-label="Restart"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex" aria-label="Jump to step">
              {frames.map((_, k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setI(k);
                  }}
                  aria-label={`Step ${k + 1}`}
                  className={cn("h-1.5 rounded-full transition-all duration-300", k === i ? "w-4 bg-brand" : "w-1.5 bg-foreground/20 hover:bg-foreground/40")}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length])}
              className="rounded-md border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground hover:text-foreground"
              title="Playback speed"
            >
              {speed}×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
