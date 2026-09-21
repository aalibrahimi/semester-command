/**
 * SortSim — insertion sort, merge sort, buildHeap and heapSort on YOUR
 * array, one step at a time, with the counts Poon asks for.
 *
 * params: { algorithm?: "insertion" | "merge" | "buildheap" | "heapsort",
 * array?: number[] }
 *
 * The array is typed in; every algorithm is recorded as a list of frames
 * (array state, highlighted indexes, settled indexes, a one-line note),
 * then played with Prev / Next / Play. Comparisons and moves are counted
 * as they happen, so "how many shifts on reversed input" is something you
 * watch rather than take on faith. Heaps also show the array as a tree.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN, BTN_SOLID, CTRL, LABEL, str, type SimProps } from "./index";

type Algo = "insertion" | "merge" | "buildheap" | "heapsort";

interface Frame {
  a: number[];
  hl: number[];
  done: number[];
  note: string;
  comps: number;
  moves: number;
  /** Merge sort: the current [lo, hi] window. */
  win?: [number, number];
}

function record(algo: Algo, input: number[]): Frame[] {
  const a = input.slice();
  const frames: Frame[] = [];
  let comps = 0;
  let moves = 0;
  const push = (hl: number[], note: string, done: number[] = [], win?: [number, number]) => frames.push({ a: a.slice(), hl, done, note, comps, moves, win });
  const n = a.length;
  push([], "Start.");

  if (algo === "insertion") {
    for (let j = 1; j < n; j++) {
      const key = a[j];
      let i = j - 1;
      push([j], `j = ${j}: key = ${key}. a[0..${j - 1}] is sorted.`, range(0, j - 1));
      while (i >= 0) {
        comps++;
        if (a[i] > key) {
          a[i + 1] = a[i];
          moves++;
          push([i, i + 1], `a[${i}] = ${a[i]} > ${key}: shift right.`, range(0, j - 1));
          i--;
        } else {
          push([i], `a[${i}] = ${a[i]} ≤ ${key}: stop.`, range(0, j - 1));
          break;
        }
      }
      a[i + 1] = key;
      push([i + 1], `Drop ${key} into slot ${i + 1}. a[0..${j}] sorted.`, range(0, j));
    }
    push([], `Sorted. ${comps} comparisons, ${moves} shifts.`, range(0, n - 1));
    return frames;
  }

  if (algo === "merge") {
    const tmp = a.slice();
    const sort = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const mid = Math.floor((lo + hi) / 2);
      push(range(lo, hi), `Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}].`, [], [lo, hi]);
      sort(lo, mid);
      sort(mid + 1, hi);
      let i = lo;
      let j = mid + 1;
      let k = lo;
      push(range(lo, hi), `Merge [${lo}..${mid}] with [${mid + 1}..${hi}].`, [], [lo, hi]);
      while (i <= mid && j <= hi) {
        comps++;
        if (a[i] <= a[j]) tmp[k++] = a[i++];
        else tmp[k++] = a[j++];
        moves++;
      }
      while (i <= mid) {
        tmp[k++] = a[i++];
        moves++;
      }
      while (j <= hi) {
        tmp[k++] = a[j++];
        moves++;
      }
      for (let x = lo; x <= hi; x++) a[x] = tmp[x];
      push(range(lo, hi), `[${lo}..${hi}] merged: ${a.slice(lo, hi + 1).join(", ")}.`, range(lo, hi), [lo, hi]);
    };
    sort(0, n - 1);
    push([], `Sorted. ${comps} comparisons, ${moves} element copies. Levels: ${Math.ceil(Math.log2(Math.max(2, n)))}.`, range(0, n - 1));
    return frames;
  }

  // Heaps (max-heap, 0-based).
  const heapify = (i: number, size: number, doneIdx: number[]) => {
    for (;;) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let largest = i;
      if (l < size) {
        comps++;
        if (a[l] > a[largest]) largest = l;
      }
      if (r < size) {
        comps++;
        if (a[r] > a[largest]) largest = r;
      }
      if (largest === i) {
        push([i], `heapify(${i}): a[${i}] = ${a[i]} ≥ its children. Done.`, doneIdx);
        return;
      }
      push([i, largest], `heapify(${i}): swap ${a[i]} with larger child ${a[largest]} (index ${largest}).`, doneIdx);
      [a[i], a[largest]] = [a[largest], a[i]];
      moves++;
      i = largest;
    }
  };
  const build = () => {
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(i, n, []);
    push([], `buildHeap done: every parent ≥ its children. ${comps} comparisons, ${moves} swaps.`, []);
  };
  if (algo === "buildheap") {
    push([], `Last non-leaf is ⌊${n}/2⌋ − 1 = ${Math.floor(n / 2) - 1}. Walk it down to 0.`);
    build();
    return frames;
  }
  build();
  for (let end = n - 1; end > 0; end--) {
    push([0, end], `Swap max ${a[0]} to slot ${end}; heap shrinks to ${end}.`, range(end + 1, n - 1));
    [a[0], a[end]] = [a[end], a[0]];
    moves++;
    heapify(0, end, range(end, n - 1));
  }
  push([], `heapSort done. ${comps} comparisons, ${moves} swaps.`, range(0, n - 1));
  return frames;
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

function parseArray(s: string): number[] | null {
  const xs = s
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  if (xs.length < 2 || xs.length > 12 || xs.some((x) => !Number.isFinite(x))) return null;
  return xs;
}

function HeapTree({ a, hl, size }: { a: number[]; hl: number[]; size: number }) {
  const depth = Math.floor(Math.log2(Math.max(1, size))) + 1;
  const W = 420;
  const H = 40 + depth * 44;
  const pos = (i: number) => {
    const lvl = Math.floor(Math.log2(i + 1));
    const idxIn = i - (2 ** lvl - 1);
    const count = 2 ** lvl;
    return { x: (W / (count + 1)) * (idxIn + 1), y: 24 + lvl * 44 };
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[420px]" role="img" aria-label="Heap as a tree">
      <g fontFamily="ui-sans-serif, system-ui" fontSize="11" fill="currentColor">
        {a.slice(0, size).map((_, i) => {
          if (i === 0) return null;
          const p = pos(Math.floor((i - 1) / 2));
          const c = pos(i);
          return <line key={i} x1={p.x} y1={p.y} x2={c.x} y2={c.y} stroke="currentColor" strokeOpacity="0.35" />;
        })}
        {a.slice(0, size).map((v, i) => {
          const c = pos(i);
          const on = hl.includes(i);
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="14" fill={on ? "rgb(var(--accent) / 0.18)" : "rgb(var(--card))"} stroke={on ? "rgb(var(--accent))" : "currentColor"} strokeWidth={on ? 2 : 1.2} />
              <text x={c.x} y={c.y + 4} textAnchor="middle" fontWeight={on ? 600 : 400}>
                {v}
              </text>
              <text x={c.x + 16} y={c.y - 8} fontSize="9" fillOpacity="0.5">
                {i}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function SortSim({ params }: SimProps) {
  const [algo, setAlgo] = useState<Algo>((str(params, "algorithm", "insertion") as Algo) || "insertion");
  const initial = Array.isArray(params.array) && params.array.every((x) => typeof x === "number") ? (params.array as number[]) : [7, 3, 9, 1, 4, 8, 2];
  const [text, setText] = useState(initial.join(", "));
  const arr = useMemo(() => parseArray(text), [text]);
  const frames = useMemo(() => (arr ? record(algo, arr) : []), [algo, arr]);
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setK(0);
    setPlaying(false);
  }, [frames]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setK((x) => (x + 1 >= frames.length ? (setPlaying(false), x) : x + 1)), 700);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  const f = frames[Math.min(k, frames.length - 1)];
  const heapish = algo === "buildheap" || algo === "heapsort";
  const heapSize = heapish && f ? (algo === "heapsort" ? f.a.length - f.done.length : f.a.length) : 0;
  const max = arr ? Math.max(...arr) : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className={LABEL}>Algorithm</span>
          <div className="flex flex-wrap gap-1">
            {(["insertion", "merge", "buildheap", "heapsort"] as Algo[]).map((x) => (
              <button key={x} type="button" onClick={() => setAlgo(x)} className={cn("rounded-md border px-2 py-1 text-xs", algo === x ? "border-brand bg-brand/[0.1] text-brand-fg" : "border-border/70 hover:bg-fill-ghost")}>
                {x === "buildheap" ? "buildHeap" : x === "heapsort" ? "heapSort" : x + " sort"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex w-full flex-col gap-1">
          <span className={LABEL}>Your array (2 to 12 numbers)</span>
          <input value={text} onChange={(e) => setText(e.target.value)} className={cn(CTRL, "w-full", !arr && "border-critical")} spellCheck={false} />
        </label>
      </div>

      {f && (
        <>
          <div className="flex items-end gap-1.5" aria-label="Array">
            {f.a.map((v, i) => {
              const on = f.hl.includes(i);
              const done = f.done.includes(i);
              const inWin = !f.win || (i >= f.win[0] && i <= f.win[1]);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn("w-full rounded-t-md border transition-all duration-micro", on ? "border-brand bg-brand/[0.25]" : done ? "border-on-track/60 bg-on-track/[0.18]" : "border-border/70 bg-fill-ghost", !inWin && "opacity-35")}
                    style={{ height: `${18 + (Math.max(0, v) / Math.max(1, max)) * 70}px` }}
                  />
                  <span data-numeric className={cn("font-mono text-xs", on && "font-semibold text-brand-fg")}>
                    {v}
                  </span>
                  <span className="font-mono text-2xs text-muted-foreground/60">{i}</span>
                </div>
              );
            })}
          </div>
          {heapish && <HeapTree a={f.a} hl={f.hl} size={heapSize} />}
          <div className="rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2 text-sm leading-relaxed">{f.note}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BTN} onClick={() => setK(0)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button type="button" className={BTN} disabled={k === 0} onClick={() => setK((x) => Math.max(0, x - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button type="button" className={BTN_SOLID} disabled={k >= frames.length - 1} onClick={() => setK((x) => Math.min(frames.length - 1, x + 1))}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button type="button" className={BTN} disabled={k >= frames.length - 1} onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {playing ? "Pause" : "Play"}
            </button>
            <span data-numeric className="ml-auto font-mono text-2xs text-muted-foreground">
              step {k + 1}/{frames.length} · {f.comps} comparisons · {f.moves} {algo === "merge" ? "copies" : heapish ? "swaps" : "shifts"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
