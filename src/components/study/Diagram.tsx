/**
 * Diagram: explanatory pictures built from the app's own UI (cards, chips,
 * bars) instead of a drawn SVG, so they look like the rest of the app and
 * reflow with the column. One component per `kind`; each takes plain data
 * from the guide JSON (see DiagramBlock in study/guide.ts).
 *
 * Called by: GuideBlocks (book and slides).
 * Calls: Inline for inline markup in labels.
 *
 * Kinds:
 *   roadmap    numbered steps with a result chip each, and an optional
 *              "pay-off" comparison with bars
 *   codecount  code with a count badge per line, the total, and a small bar
 *              chart of the total for a few n
 *   cards      side-by-side cards, each with an optional tiny chart
 *              (ceiling / floor / sandwich / bars)
 *   levels     one row of bars per level, with each row's total (parts from
 *              `ghostFrom` on are drawn as faint outlines)
 *   bigo       f(n) against c·g(n) with the n₀ region shaded
 *   formula    a big formula whose parts are colored chips with labels,
 *              and optional code lines tagged with the part they produce
 *   compare    two sides point by point (a T-chart): left/right headers,
 *              then rows of {label, left, right}
 */
import { cn } from "@/lib/utils";
import { Inline } from "./Blocks";

type Tone = "brand" | "green" | "amber" | "red" | "plain";

const TONE_TEXT: Record<Tone, string> = {
  brand: "text-brand-fg",
  green: "text-on-track-fg",
  amber: "text-at-risk-fg",
  red: "text-critical-fg",
  plain: "text-foreground",
};
const TONE_SOFT: Record<Tone, string> = {
  brand: "bg-brand/10 ring-brand/25",
  green: "bg-on-track/10 ring-on-track/25",
  amber: "bg-at-risk/10 ring-at-risk/25",
  red: "bg-critical/10 ring-critical/25",
  plain: "bg-fill-ghost/60 ring-border",
};
const TONE_SOLID: Record<Tone, string> = {
  brand: "bg-brand",
  green: "bg-on-track",
  amber: "bg-at-risk",
  red: "bg-critical",
  plain: "bg-foreground/40",
};
const TONE_STROKE: Record<Tone, string> = {
  brand: "rgb(var(--accent))",
  green: "rgb(var(--on-track))",
  amber: "rgb(var(--at-risk))",
  red: "rgb(var(--critical))",
  plain: "rgb(var(--foreground) / 0.5)",
};

function tone(t: unknown): Tone {
  return t === "brand" || t === "green" || t === "amber" || t === "red" ? t : "plain";
}
const S = (v: unknown, d = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : d);
const N = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const A = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : []);

/* ── roadmap ────────────────────────────────────────────────────────────── */

function Roadmap({ d }: { d: Record<string, unknown> }) {
  const steps = A(d.steps);
  const payoff = d.payoff && typeof d.payoff === "object" ? (d.payoff as Record<string, unknown>) : null;
  const bars = payoff ? A(payoff.bars) : [];
  const max = Math.max(1, ...bars.map((b) => N(b.value)));
  return (
    <div className="flex flex-col gap-6">
      {d.question !== undefined && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{S(d.eyebrow, "The question")}</div>
          <div className="mt-1 font-display text-xl font-semibold tracking-tight">
            <Inline text={S(d.question)} />
          </div>
        </div>
      )}
      <ol className="relative flex flex-col gap-3">
        <span aria-hidden className="absolute bottom-5 left-[15px] top-5 w-px bg-gradient-to-b from-brand/60 via-brand/25 to-transparent" />
        {steps.map((s, k) => {
          const t = tone(s.tone);
          return (
            <li key={k} className="relative flex items-center gap-4">
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-solid text-sm font-semibold text-white shadow-card ring-4 ring-card">{k + 1}</span>
              <div className="flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-card">
                <div className="min-w-0 flex-1">
                  <div className={cn("font-semibold", TONE_TEXT[t])}>{S(s.title)}</div>
                  <div className="text-sm text-muted-foreground">
                    <Inline text={S(s.sub)} />
                  </div>
                </div>
                {s.result !== undefined && (
                  <span className={cn("shrink-0 rounded-lg px-2.5 py-1 font-mono text-[13px] font-semibold ring-1", TONE_SOFT[t], TONE_TEXT[t])}>{S(s.result)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {payoff && (
        <div className="rounded-2xl bg-gradient-to-br from-on-track/15 via-on-track/5 to-transparent p-4 ring-1 ring-on-track/25">
          <div className="text-sm font-semibold text-on-track-fg">
            <Inline text={S(payoff.title)} />
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {bars.map((b, k) => {
              const t = tone(b.tone);
              const pct = Math.max(1.5, (Math.log10(N(b.value) + 1) / Math.log10(max + 1)) * 100);
              return (
                <div key={k} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate font-medium">{S(b.label)}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
                    <span className={cn("block h-full rounded-full", TONE_SOLID[t])} style={{ width: `${pct}%` }} />
                  </span>
                  <span className={cn("font-mono text-[13px] font-semibold", TONE_TEXT[t])}>{S(b.display)}</span>
                </div>
              );
            })}
          </div>
          {payoff.note !== undefined && <div className="mt-2 text-xs text-muted-foreground">{S(payoff.note)}</div>}
        </div>
      )}
    </div>
  );
}

/* ── codecount ──────────────────────────────────────────────────────────── */

function CodeCount({ d }: { d: Record<string, unknown> }) {
  const lines = A(d.lines);
  const bars = A(d.bars);
  const max = Math.max(1, ...bars.map((b) => N(b.value)));
  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{S(d.codeLabel, "code")}</span>
          <span>{S(d.countLabel, "runs")}</span>
        </div>
        <div className="py-1.5">
          {lines.map((l, k) => (
            <div key={k} className="group flex items-center gap-3 px-4 py-1.5 hover:bg-fill-ghost/60">
              <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted-foreground/60">{k + 1}</span>
              <code className="min-w-0 flex-1 whitespace-pre font-mono text-[13.5px]">{S(l.code)}</code>
              {l.count !== undefined && <span className="shrink-0 rounded-md bg-brand/[0.12] px-2 py-0.5 font-mono text-xs font-semibold text-brand-fg">{S(l.count)}</span>}
            </div>
          ))}
        </div>
        {d.total !== undefined && (
          <div className="flex items-center justify-between border-t border-border/60 bg-brand/[0.06] px-4 py-2.5">
            <span className="text-sm text-muted-foreground">{S(d.totalLabel, "add them up")}</span>
            <span className="font-mono text-base font-bold text-brand-fg">{S(d.total)}</span>
          </div>
        )}
      </div>
      {bars.length > 0 && (
        <div className="flex flex-col rounded-xl border border-border/70 bg-card p-4 shadow-card">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{S(d.barsLabel, "steps")}</div>
          <div className="mt-3 flex min-h-[150px] flex-1 items-end gap-3">
            {bars.map((b, k) => (
              <div key={k} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-brand-fg">{S(b.display, S(b.value))}</span>
                <span className="w-full rounded-t-lg bg-gradient-to-t from-brand/70 to-brand/30" style={{ height: `${(N(b.value) / max) * 120 + 6}px` }} />
                <span className="font-mono text-[11px] text-muted-foreground">{S(b.label)}</span>
              </div>
            ))}
          </div>
          {d.barsNote !== undefined && (
            <div className="mt-3 text-sm font-medium">
              <Inline text={S(d.barsNote)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── cards ──────────────────────────────────────────────────────────────── */

function MiniChart({ viz, t }: { viz: unknown; t: Tone }) {
  const W = 160;
  const H = 70;
  const f = (x: number) => 0.45 * x + 1.1 * Math.sin(x * 0.9) + 2.4;
  const path = (fn: (x: number) => number) =>
    Array.from({ length: 41 }, (_, i) => {
      const x = (i / 40) * 10;
      return `${i ? "L" : "M"}${((x / 10) * W).toFixed(1)} ${(H - (fn(x) / 9) * H).toFixed(1)}`;
    }).join(" ");
  if (Array.isArray(viz)) {
    const vals = viz.map((v) => N(v));
    const max = Math.max(1, ...vals);
    return (
      <div className="flex h-[70px] flex-col justify-center gap-1">
        {vals.map((v, k) => (
          <span key={k} className="mx-auto block h-2.5 rounded-full" style={{ width: `${(v / max) * 100}%`, background: TONE_STROKE[t], opacity: 0.75 }} />
        ))}
      </div>
    );
  }
  if (viz !== "ceiling" && viz !== "floor" && viz !== "sandwich") return null;
  const upper = viz !== "floor";
  const lower = viz !== "ceiling";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[70px] w-full" aria-hidden>
      {upper && <path d={path((x) => 0.75 * x + 4.2)} fill="none" stroke={TONE_STROKE.amber} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />}
      {lower && <path d={path((x) => 0.3 * x + 0.8)} fill="none" stroke={TONE_STROKE.green} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />}
      <path d={path(f)} fill="none" stroke={TONE_STROKE.brand} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function Cards({ d }: { d: Record<string, unknown> }) {
  const cards = A(d.cards);
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("grid gap-3", cards.length === 3 || cards.length > 4 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {cards.map((c, k) => {
          const t = tone(c.tone);
          const lines = Array.isArray(c.lines) ? (c.lines as unknown[]).map((x) => S(x)) : [];
          return (
            <div key={k} className={cn("flex flex-col gap-2 rounded-xl p-4 ring-1", TONE_SOFT[t])}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("font-display text-lg font-semibold tracking-tight", TONE_TEXT[t])}>{S(c.title)}</span>
                {c.badge !== undefined && <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-card">{S(c.badge)}</span>}
              </div>
              {c.viz !== undefined && <MiniChart viz={c.viz} t={t} />}
              {lines.map((l, i) => (
                <div key={i} className={cn("text-sm leading-snug", i === 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                  <Inline text={l} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {d.note !== undefined && (
        <div className="text-sm text-muted-foreground">
          <Inline text={S(d.note)} />
        </div>
      )}
    </div>
  );
}

/* ── levels ─────────────────────────────────────────────────────────────── */

function Levels({ d }: { d: Record<string, unknown> }) {
  const rows = A(d.rows);
  const unit = Math.max(1, ...rows.map((r) => (Array.isArray(r.parts) ? (r.parts as unknown[]).reduce<number>((s, x) => s + N(x), 0) : 0)));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {rows.map((r, k) => {
          const t = tone(r.tone ?? "brand");
          const parts = Array.isArray(r.parts) ? (r.parts as unknown[]).map((x) => N(x)) : [];
          return (
            <div key={k} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{S(r.label)}</span>
              <div className="flex gap-1">
                {parts.map((p, i) => (
                  <span
                    key={i}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-lg font-mono text-xs font-semibold",
                      typeof r.ghostFrom === "number" && i >= r.ghostFrom ? "border border-dashed border-border bg-transparent text-muted-foreground" : cn("ring-1", TONE_SOFT[t], TONE_TEXT[t]),
                    )}
                    style={{ width: `${(p / unit) * 100}%` }}
                  >
                    {parts.length <= 8 ? S(r.partLabel, String(p)) : ""}
                  </span>
                ))}
              </div>
              <span className={cn("text-right font-mono text-sm font-bold", TONE_TEXT[t])}>{S(r.total)}</span>
            </div>
          );
        })}
      </div>
      {d.summary !== undefined && (
        <div className="rounded-xl bg-gradient-to-r from-brand/15 to-brand/5 px-4 py-3 text-center ring-1 ring-brand/25">
          <div className="font-semibold text-brand-fg">
            <Inline text={S(d.summary)} />
          </div>
          {d.detail !== undefined && (
            <div className="mt-0.5 font-mono text-sm">
              <Inline text={S(d.detail)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── bigo ───────────────────────────────────────────────────────────────── */

function BigO({ d }: { d: Record<string, unknown> }) {
  // f(n) = fa·n + fb, bound = c·n, crossing at n0.
  const fa = N(d.fa, 5);
  const fb = N(d.fb, 10);
  const c = N(d.c, 6);
  const n0 = N(d.n0, 10);
  const xmax = N(d.xmax, 16);
  const W = 460;
  const H = 230;
  const pad = { l: 34, r: 10, t: 12, b: 26 };
  const ymax = Math.max(fa * xmax + fb, c * xmax) * 1.05;
  const X = (n: number) => pad.l + (n / xmax) * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - (v / ymax) * (H - pad.t - pad.b);
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[620px]" role="img" aria-label="f(n) against c·g(n)">
        <defs>
          <linearGradient id="bigo-zone" x1="0" x2="1">
            <stop offset="0" stopColor="rgb(var(--on-track))" stopOpacity="0.18" />
            <stop offset="1" stopColor="rgb(var(--on-track))" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={Y(ymax * t)} y2={Y(ymax * t)} stroke="rgb(var(--foreground) / 0.07)" />
        ))}
        <rect x={X(n0)} y={pad.t} width={X(xmax) - X(n0)} height={H - pad.t - pad.b} fill="url(#bigo-zone)" rx="8" />
        <line x1={X(n0)} x2={X(n0)} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--on-track))" strokeDasharray="4 4" />
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="rgb(var(--foreground) / 0.25)" />
        <path d={`M${X(0)} ${Y(fb)} L${X(xmax)} ${Y(fa * xmax + fb)}`} stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d={`M${X(0)} ${Y(0)} L${X(xmax)} ${Y(c * xmax)}`} stroke="rgb(var(--at-risk))" strokeWidth="2.6" strokeDasharray="7 5" strokeLinecap="round" fill="none" />
        <circle cx={X(n0)} cy={Y(c * n0)} r="5" fill="rgb(var(--card))" stroke="rgb(var(--on-track))" strokeWidth="2.5" />
        {[0, xmax / 4, xmax / 2, (3 * xmax) / 4, xmax].map((n) => (
          <text key={n} x={X(n)} y={H - 8} textAnchor="middle" fontSize="11" fill="rgb(var(--muted-foreground))" fontFamily="inherit">
            {n}
          </text>
        ))}
        <text x={X(n0) + 8} y={pad.t + 16} fontSize="12" fontWeight="600" fill="rgb(var(--on-track-fg))" fontFamily="inherit">
          n₀ = {n0}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 font-mono text-brand-fg ring-1 ring-brand/25">
          <span className="h-0.5 w-4 rounded bg-brand" /> f(n) = {S(d.fLabel, `${fa}n + ${fb}`)}
        </span>
        <span className="flex items-center gap-2 rounded-full bg-at-risk/10 px-3 py-1 font-mono text-at-risk-fg ring-1 ring-at-risk/25">
          <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-at-risk" /> c·g(n) = {S(d.gLabel, `${c}n`)}
        </span>
        <span className="flex items-center gap-2 rounded-full bg-on-track/10 px-3 py-1 text-on-track-fg ring-1 ring-on-track/25">
          <span className="h-3 w-3 rounded-sm bg-on-track/40" /> from n₀ on, f stays under
        </span>
      </div>
      {d.summary !== undefined && (
        <div className="rounded-xl bg-fill-ghost/60 px-4 py-3 text-sm ring-1 ring-border">
          <Inline text={S(d.summary)} />
        </div>
      )}
    </div>
  );
}

/* ── formula ────────────────────────────────────────────────────────────── */

function Formula({ d }: { d: Record<string, unknown> }) {
  const parts = A(d.parts);
  const code = A(d.code);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-center gap-x-1.5 gap-y-3 py-2">
        {parts.map((p, k) => {
          const t = p.tone !== undefined ? tone(p.tone) : null;
          return (
            <div key={k} className="flex flex-col items-center gap-2">
              <span className={cn("rounded-xl px-2 py-1 font-mono text-2xl font-bold sm:text-3xl", t ? cn(TONE_SOFT[t], TONE_TEXT[t], "ring-1") : "text-foreground")}>{S(p.text)}</span>
              {p.label !== undefined && t && (
                <span className={cn("max-w-[9rem] text-center text-xs font-semibold leading-tight", TONE_TEXT[t])}>
                  <span className="mx-auto mb-1 block h-3 w-px bg-current opacity-50" />
                  {S(p.label)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {code.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60 shadow-card">
          {code.map((l, k) => {
            const t = l.tone !== undefined ? tone(l.tone) : null;
            return (
              <div key={k} className="flex items-center gap-3 border-b border-border/40 px-4 py-2 last:border-0">
                <code className="min-w-0 flex-1 whitespace-pre font-mono text-[13.5px]">{S(l.code)}</code>
                {l.tag !== undefined && <span className={cn("shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1", t ? cn(TONE_SOFT[t], TONE_TEXT[t]) : "bg-fill-ghost text-muted-foreground ring-border")}>{S(l.tag)}</span>}
              </div>
            );
          })}
        </div>
      )}
      {d.note !== undefined && (
        <div className="text-center text-sm font-medium">
          <Inline text={S(d.note)} />
        </div>
      )}
    </div>
  );
}

/* ── compare ────────────────────────────────────────────────────────────── */

/**
 * Two things side by side, point by point: a colored header per side, then
 * one row per point with its label as a small eyebrow. Reads like a
 * T-chart; on a narrow screen the sides stack.
 */
function Compare({ d }: { d: Record<string, unknown> }) {
  const sides = [d.left, d.right].map((v) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {}));
  const rows = A(d.rows);
  const tones = sides.map((s, k) => tone(s.tone ?? (k === 0 ? "brand" : "amber")));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {sides.map((s, k) => (
          <div key={k} className={cn("rounded-xl px-4 py-3 ring-1", TONE_SOFT[tones[k]])}>
            <div className={cn("font-display text-lg font-semibold tracking-tight", TONE_TEXT[tones[k]])}>
              <Inline text={S(s.title)} />
            </div>
            {s.sub !== undefined && (
              <div className="text-sm text-muted-foreground">
                <Inline text={S(s.sub)} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r, k) => (
          <div key={k} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-card">
            {r.label !== undefined && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{S(r.label)}</div>}
            <div className="grid gap-3 sm:grid-cols-2">
              {[r.left, r.right].map((v, i) => (
                <div key={i} className="flex gap-2.5 text-[14.5px] leading-snug">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_SOLID[tones[i]])} />
                  <span className="min-w-0">
                    <Inline text={S(v)} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {d.note !== undefined && (
        <div className="text-sm font-medium">
          <Inline text={S(d.note)} />
        </div>
      )}
    </div>
  );
}

export function Diagram({ kind, data }: { kind: string; data: Record<string, unknown> }) {
  switch (kind) {
    case "roadmap":
      return <Roadmap d={data} />;
    case "codecount":
      return <CodeCount d={data} />;
    case "cards":
      return <Cards d={data} />;
    case "levels":
      return <Levels d={data} />;
    case "bigo":
      return <BigO d={data} />;
    case "formula":
      return <Formula d={data} />;
    case "compare":
      return <Compare d={data} />;
    default:
      return <div className="text-xs text-at-risk-fg">Unknown diagram "{kind}".</div>;
  }
}

