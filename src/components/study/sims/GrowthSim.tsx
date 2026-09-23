/**
 * GrowthSim: the Big-O classes as curves you can race, and as real time.
 *
 * params: { n?: number (the table's input size, default 1e6),
 *           xmax?: number (the plot's right edge, default 20),
 *           slowC?: number, fastC?: number (the race's constants) }
 *
 * Three panels, one idea each:
 *   1. The curves. 1, log n, n, n log n, n², 2ⁿ on the same axes for small
 *      n. Drag the right edge and watch 2ⁿ and n² leave the chart.
 *   2. Real time. Pick an input size; every class is turned into seconds
 *      on a computer doing a billion simple steps a second, with a
 *      real-world name for that size ("a class roster").
 *   3. The race. A careful n² algorithm (small constant) against a sloppy
 *      n log n one (big constant): who wins at small n, and where they
 *      cross. This is why real libraries run insertion sort on tiny arrays
 *      and merge sort on big ones.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dial, LABEL, num, type SimProps } from "./index";

interface Cls {
  key: string;
  label: string;
  f: (n: number) => number;
  color: string;
  example: string;
}

const CLASSES: Cls[] = [
  { key: "1", label: "O(1)", f: () => 1, color: "rgb(var(--on-track))", example: "read a[i], push onto a stack" },
  { key: "log", label: "O(log n)", f: (n) => Math.max(1, Math.log2(n)), color: "rgb(var(--on-track) / 0.65)", example: "binary search, heap insert" },
  { key: "n", label: "O(n)", f: (n) => n, color: "rgb(var(--accent))", example: "one pass: find the max, partition" },
  { key: "nlog", label: "O(n log n)", f: (n) => n * Math.max(1, Math.log2(n)), color: "rgb(var(--accent) / 0.6)", example: "merge sort, heap sort" },
  { key: "n2", label: "O(n²)", f: (n) => n * n, color: "rgb(var(--at-risk))", example: "insertion sort on reversed input, all pairs" },
  { key: "2n", label: "O(2ⁿ)", f: (n) => 2 ** n, color: "rgb(var(--critical))", example: "try every subset" },
];

/** Real-world sizes for the table dial (log10 steps). */
const SIZES: { n: number; what: string }[] = [
  { n: 10, what: "the students in a study group" },
  { n: 100, what: "a class roster" },
  { n: 1_000, what: "your photo library for one trip" },
  { n: 10_000, what: "the words in a long essay" },
  { n: 100_000, what: "the books in a big library branch" },
  { n: 1_000_000, what: "the contacts at a mid-size company, or one million tweets" },
  { n: 10_000_000, what: "the songs in a large music catalog" },
  { n: 100_000_000, what: "the videos uploaded to a big platform in a few weeks" },
  { n: 1_000_000_000, what: "every search typed into a big search engine in a few hours" },
];

const OPS_PER_SEC = 1e9;

function human(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds > 1e20) return "longer than the universe has existed";
  if (seconds < 1e-6) return `${(seconds * 1e9).toPrecision(2)} ns`;
  if (seconds < 1e-3) return `${(seconds * 1e6).toPrecision(2)} µs`;
  if (seconds < 1) return `${(seconds * 1e3).toPrecision(2)} ms`;
  if (seconds < 60) return `${seconds.toPrecision(2)} s`;
  if (seconds < 3600) return `${(seconds / 60).toPrecision(2)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toPrecision(2)} hours`;
  if (seconds < 86400 * 365) return `${(seconds / 86400).toPrecision(2)} days`;
  const years = seconds / (86400 * 365);
  if (years > 1.4e10) return "longer than the universe has existed";
  if (years < 1e6) return `${Math.round(years).toLocaleString()} years`;
  return `${years.toExponential(1)} years`;
}

function feel(seconds: number): { tone: "ok" | "meh" | "bad"; word: string } {
  if (seconds < 0.1) return { tone: "ok", word: "instant" };
  if (seconds < 10) return { tone: "meh", word: "you notice" };
  return { tone: "bad", word: "unusable" };
}

function opsText(v: number): string {
  if (!Number.isFinite(v) || v > 1e300) return "≈ ∞";
  if (v < 1e6) return Math.round(v).toLocaleString();
  return v.toExponential(1).replace("e+", " × 10^");
}

export function GrowthSim({ params }: SimProps) {
  const [xmax, setXmax] = useState(num(params, "xmax", 20));
  const startIdx = Math.max(0, SIZES.findIndex((s) => s.n >= num(params, "n", 1_000_000)));
  const [sizeIdx, setSizeIdx] = useState(startIdx);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [slowC, setSlowC] = useState(num(params, "slowC", 50));
  const [fastC, setFastC] = useState(num(params, "fastC", 2));

  /* Panel 1: curves. The y axis is fixed so the fast growers leave it. */
  const W = 440;
  const H = 250;
  const pad = { l: 40, r: 70, t: 14, b: 30 };
  const ymax = Math.max(60, xmax * xmax * 0.6);
  const xOf = (n: number) => pad.l + ((n - 1) / (xmax - 1)) * (W - pad.l - pad.r);
  const yOf = (v: number) => H - pad.b - (Math.min(v, ymax * 1.2) / ymax) * (H - pad.t - pad.b);
  const curves = CLASSES.map((c) => {
        const pts: string[] = [];
        const steps = 120;
        for (let s = 0; s <= steps; s++) {
          const n = 1 + ((xmax - 1) * s) / steps;
          const v = c.f(n);
          pts.push(`${xOf(n).toFixed(1)},${yOf(v).toFixed(1)}`);
          if (v > ymax * 1.2) break;
        }
        // Label where the curve leaves the plot (top or right edge).
        let lx = xmax;
        if (c.f(xmax) > ymax) {
          let lo = 1;
          let hi = xmax;
          for (let it = 0; it < 30; it++) {
            const mid = (lo + hi) / 2;
            if (c.f(mid) > ymax) hi = mid;
            else lo = mid;
          }
          lx = lo;
        }
        return { c, d: `M${pts.join(" L")}`, lx: xOf(lx), ly: yOf(Math.min(c.f(lx), ymax)) };
      });

  // Nudge right-edge labels apart so 1 and log n don't overprint.
  const labelY = new Map<string, number>();
  const edge = curves.filter((k) => !hidden.has(k.c.key) && k.lx >= xOf(xmax) - 1).sort((p, q) => q.ly - p.ly);
  let lastY = Infinity;
  for (const k of edge) {
    const y = Math.min(k.ly, lastY - 13);
    labelY.set(k.c.key, y);
    lastY = y;
  }

  /* Panel 2: time at a real size. */
  const size = SIZES[sizeIdx];

  /* Panel 3: the race. slow = slowC · n log n, fast = fastC · n². */
  let cross = 0;
  for (let n = 2; n < 100_000; n++) {
    if (fastC * n * n > slowC * n * Math.log2(n)) {
      cross = n;
      break;
    }
  }
  const raceNs = [8, 16, 64, 256, 1024, 1_000_000];

  return (
    <div className="flex flex-col gap-5">
      {/* 1 */}
      <section className="flex flex-col gap-2">
        <div className={LABEL}>1 · The shapes (steps on the y axis, input size n on the x axis)</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[560px]" role="img" aria-label="Growth curves">
          <g fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="currentColor">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={yOf(t * ymax)} y2={yOf(t * ymax)} stroke="rgb(var(--foreground) / 0.08)" />
                <text x={pad.l - 6} y={yOf(t * ymax) + 4} textAnchor="end" fillOpacity="0.55">
                  {Math.round(t * ymax)}
                </text>
              </g>
            ))}
            <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="rgb(var(--foreground) / 0.4)" />
            <text x={(W + pad.l) / 2} y={H - 6} textAnchor="middle" fillOpacity="0.6">
              n = 1 … {xmax}
            </text>
            <clipPath id="growth-clip">
              <rect x={pad.l} y={pad.t - 4} width={W - pad.l - pad.r} height={H - pad.t - pad.b + 4} />
            </clipPath>
            <g clipPath="url(#growth-clip)">
              {curves.map(({ c, d }) =>
                hidden.has(c.key) ? null : <path key={c.key} d={d} fill="none" stroke={c.color} strokeWidth={2.4} strokeLinecap="round" />,
              )}
            </g>
            {curves.map(({ c, lx, ly }) =>
              hidden.has(c.key) ? null : (
                <text key={c.key} x={Math.min(lx + 4, W - pad.r + 4)} y={Math.max(labelY.get(c.key) ?? ly, pad.t + 8) + 4} fontSize="12" fontWeight="600" fill={c.color}>
                  {c.label.replace("O(", "").replace(/\)$/, "")}
                </text>
              ),
            )}
          </g>
        </svg>
        <div className="flex flex-wrap gap-1.5">
          {CLASSES.map((c) => {
            const off = hidden.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setHidden((h) => { const x = new Set(h); if (off) x.delete(c.key); else x.add(c.key); return x; })}
                className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs", off ? "border-border/50 text-muted-foreground/60" : "border-border text-foreground")}
                title={c.example}
              >
                <span className="h-2 w-3 rounded-sm" style={{ background: off ? "transparent" : c.color, outline: off ? "1px solid currentColor" : undefined }} />
                {c.label}
              </button>
            );
          })}
        </div>
        <Dial label="Plot up to n =" value={xmax} min={5} max={60} onChange={setXmax} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          At n = 5 the curves are close together. Drag right: 2ⁿ shoots off the chart almost at once, then n², while log n stays near the floor.
          That shape difference, not the exact numbers, is what Big-O is about.
        </p>
      </section>

      {/* 2 */}
      <section className="flex flex-col gap-2">
        <div className={LABEL}>2 · The same classes as real time (a computer doing 10⁹ steps per second)</div>
        <Dial label="Input size n" value={sizeIdx} min={0} max={SIZES.length - 1} onChange={setSizeIdx} format={(i) => SIZES[i].n.toLocaleString()} />
        <div className="text-xs text-muted-foreground">
          n = {size.n.toLocaleString()} is about <span className="font-medium text-foreground">{size.what}</span>.
        </div>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-fill-ghost/60 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Class</th>
                <th className="px-3 py-1.5 text-right font-medium">Steps</th>
                <th className="px-3 py-1.5 text-right font-medium">Time</th>
                <th className="hidden px-3 py-1.5 text-left font-medium sm:table-cell">Feels</th>
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((c) => {
                const ops = c.f(size.n);
                const s = ops / OPS_PER_SEC;
                const fl = feel(s);
                return (
                  <tr key={c.key} className="border-t border-border/50">
                    <td className="px-3 py-1.5 font-mono text-xs">
                      <span className="mr-2 inline-block h-2 w-3 rounded-sm align-middle" style={{ background: c.color }} />
                      {c.label}
                      <div className="font-sans text-2xs text-muted-foreground">{c.example}</div>
                    </td>
                    <td data-numeric className="px-3 py-1.5 text-right font-mono text-xs">{opsText(ops)}</td>
                    <td data-numeric className="px-3 py-1.5 text-right font-mono text-xs font-medium">{human(s)}</td>
                    <td className="hidden px-3 py-1.5 sm:table-cell">
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-2xs font-semibold",
                          fl.tone === "ok" && "bg-on-track/15 text-on-track-fg",
                          fl.tone === "meh" && "bg-at-risk/15 text-at-risk-fg",
                          fl.tone === "bad" && "bg-critical/15 text-critical-fg",
                        )}
                      >
                        {fl.word}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3 */}
      <section className="flex flex-col gap-2">
        <div className={LABEL}>3 · The race: a careful n² against a sloppy n log n</div>
        <div className="flex flex-wrap gap-4">
          <Dial label="Careful n² algorithm: steps = c · n², c =" value={fastC} min={1} max={20} onChange={setFastC} />
          <Dial label="Sloppy n log n algorithm: steps = c · n log n, c =" value={slowC} min={1} max={200} onChange={setSlowC} />
        </div>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-fill-ghost/60 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">n</th>
                <th className="px-3 py-1.5 text-right font-medium">{fastC}·n²</th>
                <th className="px-3 py-1.5 text-right font-medium">{slowC}·n log n</th>
                <th className="px-3 py-1.5 text-left font-medium">Winner</th>
              </tr>
            </thead>
            <tbody>
              {raceNs.map((n) => {
                const a = fastC * n * n;
                const b = slowC * n * Math.log2(n);
                return (
                  <tr key={n} className="border-t border-border/50">
                    <td data-numeric className="px-3 py-1.5 font-mono text-xs">{n.toLocaleString()}</td>
                    <td data-numeric className={cn("px-3 py-1.5 text-right font-mono text-xs", a <= b && "font-semibold text-on-track-fg")}>{opsText(a)}</td>
                    <td data-numeric className={cn("px-3 py-1.5 text-right font-mono text-xs", b < a && "font-semibold text-on-track-fg")}>{opsText(b)}</td>
                    <td className="px-3 py-1.5 text-xs">{a <= b ? "n² (small n: constants win)" : "n log n (big n: shape wins)"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2 text-sm leading-relaxed">
          {cross > 0 ? (
            <>
              They cross at about <b>n = {cross}</b>. Below that the n² algorithm is faster; above it the n log n one wins and never looks back.
              Real sorting libraries use exactly this: insertion sort for tiny pieces, merge sort or quicksort for everything else.
            </>
          ) : (
            <>With these constants the n² algorithm stays ahead past n = 100,000. Raise its constant: eventually the shape always wins.</>
          )}
        </div>
      </section>
    </div>
  );
}
