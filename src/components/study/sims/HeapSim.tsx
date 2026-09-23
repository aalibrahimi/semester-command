/**
 * HeapSim: a max-heap you operate yourself. insert trickles a value up,
 * extractMax moves the last value to the root and trickles it down
 * (heapify). Each swap is its own frame, shown on the tree and the array
 * at once, so "the array IS the tree" is something you watch.
 *
 * params: { array?: number[] (must already be a max-heap; default is the
 * slide's [9, 8, 7, 5, 3, 2]) }
 *
 * The counter compares the swaps an operation needed with ⌊log₂ n⌋, the
 * height of the tree: no operation can ever need more swaps than that,
 * which is the whole reason a priority queue is O(log n).
 */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN, BTN_SOLID, CTRL, LABEL, type SimProps } from "./index";

interface Frame {
  a: number[];
  hl: number[];
  note: string;
}

function isMaxHeap(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) if (a[Math.floor((i - 1) / 2)] < a[i]) return false;
  return true;
}

function buildHeap(input: number[]): number[] {
  const a = input.slice();
  const sink = (i: number) => {
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < a.length && a[l] > a[m]) m = l;
      if (r < a.length && a[r] > a[m]) m = r;
      if (m === i) return;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
    }
  };
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) sink(i);
  return a;
}

function insertFrames(start: number[], v: number): Frame[] {
  const a = [...start, v];
  const f: Frame[] = [{ a: a.slice(), hl: [a.length - 1], note: `insert(${v}): put it at the end, a[${a.length - 1}]. The tree stays complete, but ${v} may be bigger than its parent.` }];
  let i = a.length - 1;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (a[p] >= a[i]) {
      f.push({ a: a.slice(), hl: [i, p], note: `Parent a[${p}] = ${a[p]} ≥ ${a[i]}. Heap property holds: stop.` });
      return f;
    }
    [a[p], a[i]] = [a[i], a[p]];
    f.push({ a: a.slice(), hl: [p, i], note: `Parent a[${p}] was smaller: swap. ${a[p]} moves up to index ${p} (parent = ⌊(${i} − 1) / 2⌋ = ${p}).` });
    i = p;
  }
  f.push({ a: a.slice(), hl: [0], note: `${a[0]} reached the root: it is the new maximum.` });
  return f;
}

function extractFrames(start: number[]): Frame[] {
  const a = start.slice();
  const max = a[0];
  const last = a.pop() as number;
  const f: Frame[] = [];
  if (a.length === 0) return [{ a: [], hl: [], note: `extractMax() → ${max}. The heap is now empty.` }];
  a[0] = last;
  f.push({ a: a.slice(), hl: [0], note: `extractMax() → ${max}. Move the last value (${last}) to the root so the tree stays complete. Now heapify(a, 0).` });
  let i = 0;
  for (;;) {
    const l = 2 * i + 1;
    const r = l + 1;
    let m = i;
    if (l < a.length && a[l] > a[m]) m = l;
    if (r < a.length && a[r] > a[m]) m = r;
    if (m === i) {
      f.push({ a: a.slice(), hl: [i], note: l < a.length ? `a[${i}] = ${a[i]} is at least as big as its children. Stop.` : `a[${i}] is a leaf now. Stop.` });
      return f;
    }
    const kids = [l, r].filter((x) => x < a.length).map((x) => `a[${x}] = ${a[x]}`).join(", ");
    [a[i], a[m]] = [a[m], a[i]];
    f.push({ a: a.slice(), hl: [i, m], note: `Children: ${kids}. The larger is at ${m}: swap. ${a[m]} sinks to index ${m}.` });
    i = m;
  }
}

function Tree({ a, hl }: { a: number[]; hl: number[] }) {
  const size = a.length;
  const depth = Math.floor(Math.log2(Math.max(1, size))) + 1;
  const W = 480;
  const H = 30 + depth * 50;
  const pos = (i: number) => {
    const lvl = Math.floor(Math.log2(i + 1));
    const idxIn = i - (2 ** lvl - 1);
    const count = 2 ** lvl;
    return { x: (W / (count + 1)) * (idxIn + 1), y: 24 + lvl * 50 };
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[480px]" role="img" aria-label="Heap as a tree">
      <g fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="currentColor">
        {a.map((_, i) => {
          if (i === 0) return null;
          const p = pos(Math.floor((i - 1) / 2));
          const c = pos(i);
          const on = hl.includes(i) && hl.includes(Math.floor((i - 1) / 2));
          return <line key={i} x1={p.x} y1={p.y} x2={c.x} y2={c.y} stroke={on ? "rgb(var(--accent))" : "currentColor"} strokeOpacity={on ? 1 : 0.35} strokeWidth={on ? 2 : 1} />;
        })}
        {a.map((v, i) => {
          const c = pos(i);
          const on = hl.includes(i);
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="16" fill={on ? "rgb(var(--accent) / 0.2)" : "rgb(var(--card))"} stroke={on ? "rgb(var(--accent))" : "currentColor"} strokeWidth={on ? 2.2 : 1.2} />
              <text x={c.x} y={c.y + 4} textAnchor="middle" fontWeight={on ? 700 : 500}>
                {v}
              </text>
              <text x={c.x + 18} y={c.y - 10} fontSize="9" fillOpacity="0.5">
                {i}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function HeapSim({ params }: SimProps) {
  const init = Array.isArray(params.array) && params.array.every((x) => typeof x === "number") ? (params.array as number[]).slice(0, 15) : [9, 8, 7, 5, 3, 2];
  const [heap, setHeap] = useState<number[]>(isMaxHeap(init) ? init : buildHeap(init));
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [k, setK] = useState(0);
  const [val, setVal] = useState("10");
  const [lastSwaps, setLastSwaps] = useState<number | null>(null);

  // The heap the next operation starts from: the end of the last animation.
  const base = frames ? frames[frames.length - 1].a : heap;
  const cur: Frame = frames ? frames[k] : { a: heap, hl: [], note: "" };
  const done = !frames || k >= frames.length - 1;

  useEffect(() => {
    if (!frames || k >= frames.length - 1) return;
    const t = setTimeout(() => setK((x) => x + 1), 1100);
    return () => clearTimeout(t);
  }, [frames, k]);

  const run = (fs: Frame[]) => {
    setFrames(fs);
    setK(0);
    setLastSwaps(fs.filter((f) => f.note.includes("swap")).length);
  };

  const v = Number(val);
  const canInsert = done && val.trim() !== "" && Number.isFinite(v) && base.length < 15;
  const height = Math.floor(Math.log2(Math.max(1, cur.a.length)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Value</span>
          <input value={val} onChange={(e) => setVal(e.target.value)} className={cn(CTRL, "w-20")} inputMode="numeric" aria-label="Value to insert" />
        </label>
        <button type="button" className={BTN_SOLID} disabled={!canInsert} onClick={() => run(insertFrames(base, v))}>
          insert({val || "?"})
        </button>
        <button type="button" className={BTN} disabled={!done || base.length === 0} onClick={() => run(extractFrames(base))}>
          extractMax()
        </button>
        <button type="button" className={BTN} disabled={!done} onClick={() => { setHeap(isMaxHeap(init) ? init : buildHeap(init)); setFrames(null); setLastSwaps(null); }}>
          Reset
        </button>
        {frames && (
          <span className="ml-auto flex items-center gap-1">
            <button type="button" className={BTN} disabled={k === 0} onClick={() => setK((x) => x - 1)} aria-label="Previous step">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span data-numeric className="font-mono text-2xs text-muted-foreground">
              step {k + 1}/{frames.length}
            </span>
            <button type="button" className={BTN} disabled={k >= frames.length - 1} onClick={() => setK((x) => x + 1)} aria-label="Next step">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      <Tree a={cur.a} hl={cur.hl} />

      <div className="flex flex-wrap justify-center gap-1">
        {cur.a.map((x, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={cn("flex h-9 w-10 items-center justify-center rounded-md border font-mono text-sm", cur.hl.includes(i) ? "border-brand bg-brand/[0.15] font-semibold" : "border-border/70")}>{x}</div>
            <span className="font-mono text-2xs text-muted-foreground">{i}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2 text-sm leading-relaxed">
        {cur.note || "Insert a big number (try 10) and watch it climb. Then extractMax and watch the replacement sink. Children of i are 2i + 1 and 2i + 2; the parent is ⌊(i − 1) / 2⌋."}
        {done && lastSwaps !== null && (
          <div className="mt-1 text-xs text-muted-foreground">
            That took {lastSwaps} swap{lastSwaps === 1 ? "" : "s"}. The tree has height ⌊log₂ {cur.a.length}⌋ = {height}, so no insert or extractMax can ever take more than {height}.
          </div>
        )}
      </div>
    </div>
  );
}
