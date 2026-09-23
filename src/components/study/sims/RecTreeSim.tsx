/**
 * RecTreeSim: build a recursion tree from T(n) = a·T(n/b) + n^k and watch
 * where the work piles up. The master method, as a picture.
 *
 * params: { a?: number (default 2), b?: number (default 2), k?: number
 * (default 1), n?: number (default 64) }
 *
 * Three dials set the recurrence. The picture has one row per level of the
 * tree: how many calls sit on that level (aⁱ), how big each one is (n/bⁱ),
 * and the level's total work aⁱ·(n/bⁱ)^k as a bar. The bars tell the story
 * the master method tells in symbols:
 *   bars shrink going down → the root's work wins   → case 3, Θ(f(n))
 *   bars all equal        → every level counts     → case 2, Θ(n^k log n)
 *   bars grow going down  → the leaves' work wins   → case 1, Θ(n^(log_b a))
 * The level ratio a / b^k is printed, because it is the whole test:
 * below 1, equal to 1, above 1.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dial, LABEL, num, type SimProps } from "./index";

const K_CHOICES = [0, 0.5, 1, 1.5, 2, 3];

function fmtNum(v: number): string {
  if (v >= 1e6) return v.toExponential(1).replace("e+", "e");
  if (Number.isInteger(v)) return v.toLocaleString();
  return v < 10 ? v.toFixed(2).replace(/\.?0+$/, "") : Math.round(v).toLocaleString();
}

function fText(k: number): string {
  if (k === 0) return "1";
  if (k === 1) return "n";
  if (k === 0.5) return "√n";
  if (k === 1.5) return "n^1.5";
  return `n^${k}`;
}

function nPow(e: number): string {
  const r = Math.round(e * 100) / 100;
  if (Math.abs(r) < 1e-9) return "1";
  if (Math.abs(r - 1) < 1e-9) return "n";
  if (Math.abs(r - 2) < 1e-9) return "n²";
  if (Math.abs(r - 3) < 1e-9) return "n³";
  return `n^${r}`;
}

export function RecTreeSim({ params }: SimProps) {
  const [a, setA] = useState(num(params, "a", 2));
  const [b, setB] = useState(num(params, "b", 2));
  const [kIdx, setKIdx] = useState(Math.max(0, K_CHOICES.indexOf(num(params, "k", 1))));
  const k = K_CHOICES[kIdx];
  const [n, setN] = useState(num(params, "n", 64));

  const levels = Math.max(1, Math.floor(Math.log(n) / Math.log(b) + 1e-9));
  const rows = Array.from({ length: levels + 1 }, (_, i) => {
    const calls = a ** i;
    const each = n / b ** i;
    const work = i === levels ? calls * 1 : calls * each ** k;
    return { i, calls, each, work, leaf: i === levels };
  });
  const maxWork = Math.max(...rows.map((r) => r.work));
  const total = rows.reduce((s, r) => s + r.work, 0);
  const ratio = a / b ** k;
  const crit = Math.log(a) / Math.log(b);
  const eps = 1e-9;
  const kase = Math.abs(k - crit) < eps ? 2 : k < crit ? 1 : 3;
  const answer = kase === 1 ? `Θ(${nPow(crit)})` : kase === 2 ? (k === 0 ? "Θ(log n)" : `Θ(${nPow(k)} log n)`) : `Θ(${fText(k)})`;
  const recurrence = `T(n) = ${a === 1 ? "" : a}T(n/${b}) + ${fText(k)}`;

  const known: Record<string, string> = {
    "1,2,0": "binary search",
    "2,2,1": "merge sort (and quicksort's best case)",
    "2,2,0": "walking every node of a balanced tree",
    "4,2,1": "the slide's case 1 example",
    "4,2,2": "the slide's case 2 example",
    "4,2,3": "the slide's case 3 example",
    "7,2,2": "Strassen's matrix multiply (a famous speed-up)",
    "3,2,1": "Karatsuba multiplication of huge numbers",
  };
  const name = known[`${a},${b},${k}`];

  /* The tree sketch: first three levels, drawn as boxes. */
  const W = 640;
  const sketchLevels = Math.min(3, levels + 1);
  const H = 26 + sketchLevels * 46;
  const shown = (i: number) => Math.min(a ** i, 9);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <Dial label="a · how many recursive calls" value={a} min={1} max={8} onChange={setA} />
        <Dial label="b · each call gets n / b" value={b} min={2} max={4} onChange={setB} />
        <Dial label="f(n) · work outside the calls" value={kIdx} min={0} max={K_CHOICES.length - 1} onChange={setKIdx} format={(i) => fText(K_CHOICES[i])} />
        <Dial label="n · input size for the picture" value={n} min={8} max={4096} step={8} onChange={setN} />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2">
        <span className="font-mono text-base font-semibold">{recurrence}</span>
        {name && <span className="text-xs text-muted-foreground">this is {name}</span>}
      </div>

      {/* Sketch */}
      <div>
        <div className={LABEL}>The top of the tree (each box is one call; the number is its input size)</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-auto w-full" role="img" aria-label="Recursion tree sketch">
          <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11" fill="currentColor">
            {Array.from({ length: sketchLevels }, (_, i) => {
              const count = shown(i);
              const more = a ** i - count;
              const bw = Math.min(90, (W - 40) / Math.max(count, 1) - 8);
              return (
                <g key={i}>
                  {Array.from({ length: count }, (_, j) => {
                    const x = 20 + ((W - 40) / count) * (j + 0.5);
                    const y = 14 + i * 46;
                    const parentCount = i === 0 ? 0 : shown(i - 1);
                    const pj = i === 0 ? 0 : Math.min(parentCount - 1, Math.floor(j / Math.max(1, count / parentCount)));
                    const px = 20 + ((W - 40) / Math.max(parentCount, 1)) * (pj + 0.5);
                    return (
                      <g key={j}>
                        {i > 0 && <line x1={px} y1={y - 22} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.3" />}
                        <rect x={x - bw / 2} y={y} width={bw} height={22} rx={6} fill="rgb(var(--accent) / 0.12)" stroke="rgb(var(--accent) / 0.6)" />
                        <text x={x} y={y + 15} textAnchor="middle">
                          {i === 0 ? "n" : `n/${b ** i}`}
                        </text>
                      </g>
                    );
                  })}
                  {more > 0 && (
                    <text x={W - 8} y={14 + i * 46 + 15} textAnchor="end" fillOpacity="0.6" fontFamily="ui-sans-serif, system-ui">
                      +{more} more
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Work per level */}
      <div>
        <div className={LABEL}>Work on each level = (number of calls) × f(size of each call)</div>
        <div className="mt-1.5 flex flex-col gap-1">
          {rows.map((r) => (
            <div key={r.i} className="grid grid-cols-[3.2rem_1fr_7rem] items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{r.leaf ? "leaves" : `level ${r.i}`}</span>
              <span className="relative h-5 overflow-hidden rounded bg-fill-ghost">
                <span
                  className={cn("absolute inset-y-0 left-0 rounded", kase === 1 ? "bg-at-risk/70" : kase === 3 ? "bg-brand/70" : "bg-on-track/70")}
                  style={{ width: `${Math.max(1.5, (r.work / maxWork) * 100)}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center font-mono text-2xs text-foreground/80">
                  {fmtNum(r.calls)} × {r.leaf ? "1" : `f(${fmtNum(r.each)})`}
                </span>
              </span>
              <span data-numeric className="text-right font-mono">{fmtNum(r.work)}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 text-right font-mono text-2xs text-muted-foreground">total ≈ {fmtNum(total)}</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 px-3 py-2">
          <div className={LABEL}>Level ratio a / bᵏ</div>
          <div className="font-mono text-lg font-semibold">{fmtNum(ratio)}</div>
          <div className="text-2xs text-muted-foreground">each level does this many times the one above</div>
        </div>
        <div className="rounded-lg border border-border/60 px-3 py-2">
          <div className={LABEL}>Watershed n^(log_b a)</div>
          <div className="font-mono text-lg font-semibold">{nPow(crit)}</div>
          <div className="text-2xs text-muted-foreground">the leaves' total work, vs f(n) = {fText(k)}</div>
        </div>
        <div
          className={cn(
            "rounded-lg border px-3 py-2",
            kase === 1 ? "border-at-risk/40 bg-at-risk/[0.07]" : kase === 3 ? "border-brand/40 bg-brand/[0.07]" : "border-on-track/40 bg-on-track/[0.07]",
          )}
        >
          <div className={LABEL}>Master method</div>
          <div className="font-mono text-lg font-semibold">
            Case {kase}: {answer}
          </div>
          <div className="text-2xs text-muted-foreground">
            {kase === 1 && "bars grow going down: the leaves win"}
            {kase === 2 && "bars are all equal: every level counts, times log n levels"}
            {kase === 3 && "bars shrink going down: the root's work wins"}
          </div>
        </div>
      </div>
    </div>
  );
}
