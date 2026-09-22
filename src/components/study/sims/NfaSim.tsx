/**
 * NfaSim — run an NFA the way Chen draws it: when there is more than one
 * possible transition, the machine copies itself and every copy (process)
 * carries on alone; a process with no transition halts and rejects; the
 * string is accepted if at least one process accepts.
 *
 * params: { start: string, accept: string[], delta: Record<state,
 * Record<symbol, string[]>>, input?: string, tests?: string[],
 * layout?: Record<state, [x, y]> (0..1 of the drawing, optional) }
 *
 * Symbol "λ" is a λ-transition: it moves without consuming a symbol.
 * Left: the diagram with every state some process is in lit up. Below: the
 * tape, Step / Run / Reset, the set of active states after each symbol
 * (which is exactly the subset construction's view), and the process list:
 * each path with its verdict and the reason.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, StepForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN, BTN_SOLID, CTRL, LABEL, str, strs, type SimProps } from "./index";

const LAMBDA = new Set(["λ", "lambda", "L", "ε", "e"]);

interface Nfa {
  states: string[];
  start: string;
  accept: Set<string>;
  alphabet: string[];
  /** state → symbol ("λ" for lambda) → targets */
  delta: Map<string, Map<string, string[]>>;
}

function parse(text: string, start: string, accept: string[]): { m: Nfa; bad: string[] } {
  const states = new Set<string>([start]);
  const alphabet = new Set<string>();
  const delta = new Map<string, Map<string, string[]>>();
  const bad: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(\S+)\s+(\S+)\s+(?:→|->|>)?\s*(\S+)$/);
    if (!m) {
      bad.push(line);
      continue;
    }
    const [, f, syms, t] = m;
    states.add(f);
    states.add(t);
    for (const s0 of syms.split(",").filter(Boolean)) {
      const s = LAMBDA.has(s0) ? "λ" : s0;
      if (s !== "λ") alphabet.add(s);
      if (!delta.has(f)) delta.set(f, new Map());
      const row = delta.get(f)!;
      const list = row.get(s) ?? [];
      if (!list.includes(t)) list.push(t);
      row.set(s, list);
    }
  }
  for (const a of accept) if (a) states.add(a);
  return { m: { states: [...states], start, accept: new Set(accept.filter(Boolean)), alphabet: [...alphabet].sort(), delta }, bad };
}

const next = (m: Nfa, q: string, s: string) => m.delta.get(q)?.get(s) ?? [];

function closure(m: Nfa, set: Iterable<string>): Set<string> {
  const out = new Set(set);
  const stack = [...out];
  while (stack.length) {
    const q = stack.pop()!;
    for (const t of next(m, q, "λ")) if (!out.has(t)) {
      out.add(t);
      stack.push(t);
    }
  }
  return out;
}

/** Active states after 0, 1, …, n symbols (λ-closed). */
function sets(m: Nfa, w: string): Set<string>[] {
  const out = [closure(m, [m.start])];
  for (const c of w) {
    const nx = new Set<string>();
    for (const q of out[out.length - 1]) for (const t of next(m, q, c)) nx.add(t);
    out.push(closure(m, nx));
  }
  return out;
}

interface Process {
  /** Alternating states and the symbol used to move: q0 -b- q1 -a- q4 */
  steps: { state: string; via?: string }[];
  consumed: number;
  verdict: "accept" | "reject";
  why: string;
}

function processes(m: Nfa, w: string, cap = 40): { list: Process[]; capped: boolean } {
  const list: Process[] = [];
  let capped = false;
  const go = (steps: { state: string; via?: string }[], i: number, lamSeen: Set<string>) => {
    if (list.length >= cap) {
      capped = true;
      return;
    }
    const q = steps[steps.length - 1].state;
    const moves: { to: string; via: string; consume: boolean }[] = [];
    for (const t of next(m, q, "λ")) if (!lamSeen.has(t)) moves.push({ to: t, via: "λ", consume: false });
    if (i < w.length) for (const t of next(m, q, w[i])) moves.push({ to: t, via: w[i], consume: true });
    if (moves.length === 0) {
      const all = i === w.length;
      const acc = all && m.accept.has(q);
      list.push({
        steps,
        consumed: i,
        verdict: acc ? "accept" : "reject",
        why: acc ? `all symbols consumed, halted in accepting ${q}` : !all ? `no transition from ${q} on '${w[i]}': symbol ${i + 1} not consumed` : `all consumed, but ${q} is not accepting`,
      });
      return;
    }
    for (const mv of moves) {
      const seen = mv.consume ? new Set<string>([mv.to]) : new Set([...lamSeen, mv.to]);
      go([...steps, { state: mv.to, via: mv.via }], mv.consume ? i + 1 : i, seen);
    }
  };
  go([{ state: m.start }], 0, new Set([m.start]));
  return { list, capped };
}

function Diagram({ m, lit, layout }: { m: Nfa; lit: Set<string>; layout?: Record<string, [number, number]> }) {
  const W = 440;
  const H = 250;
  const rad = 19;
  const n = m.states.length;
  const pos = new Map<string, { x: number; y: number }>();
  m.states.forEach((s, i) => {
    const l = layout?.[s];
    if (l) pos.set(s, { x: 30 + l[0] * (W - 60), y: 30 + l[1] * (H - 60) });
    else {
      const a = (2 * Math.PI * i) / n - Math.PI;
      pos.set(s, { x: W / 2 + (W / 2 - 50) * Math.cos(a), y: H / 2 + (H / 2 - 40) * Math.sin(a) });
    }
  });
  const edges = new Map<string, { from: string; to: string; syms: string[] }>();
  for (const [f, row] of m.delta)
    for (const [s, ts] of row)
      for (const t of ts) {
        const k = `${f}→${t}`;
        const e = edges.get(k) ?? { from: f, to: t, syms: [] };
        e.syms.push(s);
        edges.set(k, e);
      }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[540px]" role="img" aria-label="NFA diagram">
      <defs>
        <marker id="nfaSimArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      <g fill="currentColor" fontFamily="ui-sans-serif, system-ui" fontSize="12">
        {[...edges.values()].map((e) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const label = e.syms.join(", ");
          const isLam = e.syms.includes("λ");
          if (e.from === e.to)
            return (
              <g key={`${e.from}-${e.to}`}>
                <path d={`M ${a.x - 8} ${a.y - rad + 2} C ${a.x - 26} ${a.y - rad - 30}, ${a.x + 26} ${a.y - rad - 30}, ${a.x + 8} ${a.y - rad + 2}`} fill="none" stroke="currentColor" strokeWidth={1.4} markerEnd="url(#nfaSimArrow)" />
                <text x={a.x} y={a.y - rad - 26} textAnchor="middle">
                  {label}
                </text>
              </g>
            );
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const ux = dx / d;
          const uy = dy / d;
          const twoWay = edges.has(`${e.to}→${e.from}`);
          const nx = -uy;
          const ny = ux;
          const bend = twoWay ? 20 : 0;
          const sx = a.x + ux * rad;
          const sy = a.y + uy * rad;
          const ex = b.x - ux * (rad + 2);
          const ey = b.y - uy * (rad + 2);
          const mx = (sx + ex) / 2 + nx * bend;
          const my = (sy + ey) / 2 + ny * bend;
          return (
            <g key={`${e.from}-${e.to}`}>
              <path d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`} fill="none" stroke="currentColor" strokeWidth={1.4} strokeDasharray={isLam ? "4 3" : undefined} markerEnd="url(#nfaSimArrow)" />
              <text x={mx + nx * 11} y={my + ny * 11 + 4} textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}
        {m.states.map((s) => {
          const p = pos.get(s)!;
          const on = lit.has(s);
          return (
            <g key={s}>
              {s === m.start && <path d={`M ${p.x - rad - 20} ${p.y - 9} L ${p.x - rad - 20} ${p.y + 9} L ${p.x - rad - 3} ${p.y} z`} fill="currentColor" />}
              <circle cx={p.x} cy={p.y} r={rad} fill={on ? "rgb(var(--accent) / 0.2)" : "rgb(var(--card))"} stroke={on ? "rgb(var(--accent))" : "currentColor"} strokeWidth={on ? 2.2 : 1.4} />
              {m.accept.has(s) && <circle cx={p.x} cy={p.y} r={rad - 4} fill="none" stroke={on ? "rgb(var(--accent))" : "currentColor"} strokeWidth={1.2} />}
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontWeight={on ? 600 : 400} fill={on ? "rgb(var(--accent-fg))" : "currentColor"}>
                {s}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function deltaText(d: unknown): string {
  if (!d || typeof d !== "object") return "q0 a q0\nq0 b q0\nq0 a q1\nq1 b q2";
  const lines: string[] = [];
  for (const [f, row] of Object.entries(d as Record<string, Record<string, string[] | string>>))
    for (const [s, ts] of Object.entries(row)) for (const t of Array.isArray(ts) ? ts : [ts]) lines.push(`${f} ${s} ${t}`);
  return lines.join("\n");
}

const fmtSet = (s: Set<string>) => (s.size ? `{${[...s].join(", ")}}` : "∅ (every process has halted)");

export function NfaSim({ params }: SimProps) {
  const [text, setText] = useState(() => deltaText(params.delta));
  const [start, setStart] = useState(str(params, "start", "q0"));
  const [accept, setAccept] = useState(strs(params, "accept", ["q2"]).join(", "));
  const [input, setInput] = useState(str(params, "input", "ab"));
  const [pos, setPos] = useState(0);
  const layout = (params.layout && typeof params.layout === "object" ? params.layout : undefined) as Record<string, [number, number]> | undefined;

  const { m, bad } = useMemo(() => parse(text, start.trim() || "q0", accept.split(/[,\s]+/).filter(Boolean)), [text, start, accept]);
  const w = input.replace(/\s+/g, "");
  const S = useMemo(() => sets(m, w), [m, w]);
  const P = useMemo(() => processes(m, w), [m, w]);
  const runAll = useRef(false);
  useEffect(() => {
    setPos(runAll.current ? w.length : 0);
    runAll.current = false;
  }, [w, text, start, accept]);

  const done = pos >= w.length;
  const accepted = P.list.some((p) => p.verdict === "accept");
  const tests = strs(params, "tests", ["", "a", "b", "ab", "ba", "aab", "abb"]);
  const verdictOf = (x: string) => processes(m, x.replace(/\s+/g, "")).list.some((p) => p.verdict === "accept");

  return (
    <div className="flex flex-col gap-4">
      <Diagram m={m} lit={S[Math.min(pos, S.length - 1)]} layout={layout} />
      <div className="flex flex-wrap items-center gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="input (empty = λ)" className={cn(CTRL, "w-40")} aria-label="Input string" />
        <button type="button" className={BTN} onClick={() => setPos(0)}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
        <button type="button" className={BTN_SOLID} disabled={done} onClick={() => setPos((p) => p + 1)}>
          <StepForward className="h-3.5 w-3.5" /> Step
        </button>
        <button type="button" className={BTN} disabled={done} onClick={() => setPos(w.length)}>
          <Play className="h-3.5 w-3.5" /> Run
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1 font-mono text-sm">
        <span className={LABEL}>tape</span>
        {w.length === 0 ? (
          <span className="ml-2 text-muted-foreground">λ</span>
        ) : (
          w.split("").map((c, i) => (
            <span key={i} className={cn("flex h-7 w-7 items-center justify-center rounded border", i < pos ? "border-border/50 text-muted-foreground/60" : i === pos && !done ? "border-brand bg-brand/[0.1] text-brand-fg" : "border-border")}>
              {c}
            </span>
          ))
        )}
      </div>
      <div className="rounded-lg border border-foreground/15 px-3 py-2 font-mono text-xs leading-relaxed">
        {S.slice(0, pos + 1).map((s, k) => (
          <div key={k} className={cn(k === pos ? "text-foreground" : "text-muted-foreground")}>
            {k === 0 ? "start" : `after '${w[k - 1]}'`}: processes in {fmtSet(s)}
          </div>
        ))}
      </div>
      {done && (
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>
            Processes ({P.list.length}
            {P.capped ? "+, capped" : ""})
          </span>
          {P.list.map((p, k) => (
            <div key={k} className={cn("flex flex-wrap items-baseline gap-x-2 rounded-md border px-2.5 py-1.5 text-xs", p.verdict === "accept" ? "border-on-track/50 bg-on-track/[0.08]" : "border-foreground/15")}>
              <span className="font-mono">
                #{k + 1}{" "}
                {p.steps.map((s, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-muted-foreground"> –{s.via}→ </span>}
                    {s.state}
                  </span>
                ))}
              </span>
              <span className={cn("font-medium", p.verdict === "accept" ? "text-on-track-fg" : "text-muted-foreground")}>{p.verdict}</span>
              <span className="text-muted-foreground">({p.why})</span>
            </div>
          ))}
          <div className={cn("rounded-lg border px-3 py-2 text-sm", accepted ? "border-on-track/50 bg-on-track/[0.08] text-on-track-fg" : "border-at-risk/50 bg-at-risk/[0.08] text-at-risk-fg")}>
            {accepted ? "Accept: at least one process accepts." : "Reject: every process rejects."}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Transitions · one per line</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} spellCheck={false} className={cn(CTRL, "resize-y leading-relaxed")} aria-label="Transitions" />
        </label>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={LABEL}>q₀</span>
              <input value={start} onChange={(e) => setStart(e.target.value)} className={CTRL} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>F (accepting)</span>
              <input value={accept} onChange={(e) => setAccept(e.target.value)} className={CTRL} />
            </label>
          </div>
          <div className="text-2xs text-muted-foreground">
            Write "q0 a q1". Repeat a state and symbol with a new target for a second arrow; use λ as the symbol for a λ-move. A missing arrow is allowed: a process that needs it halts and rejects.
          </div>
          {bad.length > 0 && <div className="text-2xs text-critical-fg">Can't read: {bad.join(" · ")}</div>}
        </div>
      </div>
      <div>
        <span className={LABEL}>Test set · λ first</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {tests.map((t) => {
            const ok = verdictOf(t);
            return (
              <button
                key={t || "λ"}
                type="button"
                onClick={() => {
                  runAll.current = true;
                  setInput(t);
                }}
                className={cn("rounded-md border px-2 py-0.5 font-mono text-xs", ok ? "border-on-track/50 bg-on-track/[0.08] text-on-track-fg" : "border-border/70 text-muted-foreground")}
              >
                {t || "λ"} {ok ? "✓" : "✗"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
