/**
 * DfaSim — run a DFA, and build your own.
 *
 * params: { states: string[], start: string, accept: string[], alphabet:
 * string[], delta: Record<state, Record<symbol, state>>, input?: string,
 * editable?: boolean, tests?: string[] }
 *
 * Left: the diagram (states on a ring, initial triangle, double circles,
 * labelled arrows, self-loops), the current state lit. Right: the machine
 * as text you can edit ("q0 a q1", one transition per line) with a totality
 * check, and the tape with Step / Run / Reset. Below: a test set with the
 * verdict for each string, so a design can be checked against L and L̄
 * the way Chen's six steps say to.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, StepForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN, BTN_SOLID, CTRL, LABEL, str, strs, type SimProps } from "./index";

interface Machine {
  states: string[];
  start: string;
  accept: Set<string>;
  alphabet: string[];
  delta: Map<string, Map<string, string>>;
}

function parseDelta(text: string): { rules: [string, string, string][]; bad: string[] } {
  const rules: [string, string, string][] = [];
  const bad: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(\S+)\s*[-,:]?\s*([^\s→>-]+)\s*(?:→|->|>)?\s*(\S+)$/);
    if (!m) {
      bad.push(line);
      continue;
    }
    const [, from, syms, to] = m;
    for (const sym of syms.split(/[,]/).map((x) => x.trim()).filter(Boolean)) rules.push([from, sym, to]);
  }
  return { rules, bad };
}

function build(rules: [string, string, string][], start: string, accept: string[]): Machine {
  const states = new Set<string>([start]);
  const alphabet = new Set<string>();
  const delta = new Map<string, Map<string, string>>();
  for (const [f, s, t] of rules) {
    states.add(f);
    states.add(t);
    alphabet.add(s);
    if (!delta.has(f)) delta.set(f, new Map());
    delta.get(f)!.set(s, t);
  }
  for (const a of accept) if (a) states.add(a);
  return { states: [...states], start, accept: new Set(accept.filter(Boolean)), alphabet: [...alphabet].sort(), delta };
}

function missing(m: Machine): [string, string][] {
  const out: [string, string][] = [];
  for (const q of m.states) for (const a of m.alphabet) if (!m.delta.get(q)?.has(a)) out.push([q, a]);
  return out;
}

function run(m: Machine, w: string): { path: (string | null)[]; stuckAt: number } {
  const path: (string | null)[] = [m.start];
  let q: string | null = m.start;
  for (let i = 0; i < w.length; i++) {
    q = q === null ? null : (m.delta.get(q)?.get(w[i]) ?? null);
    path.push(q);
    if (q === null) return { path, stuckAt: i };
  }
  return { path, stuckAt: -1 };
}

function verdict(m: Machine, w: string): "accept" | "reject" | "stuck" {
  const r = run(m, w);
  if (r.stuckAt >= 0) return "stuck";
  const last = r.path[r.path.length - 1];
  return last !== null && m.accept.has(last) ? "accept" : "reject";
}

/* ── Diagram ───────────────────────────────────────────────────────────── */

function Diagram({ m, current, lastEdge }: { m: Machine; current: string | null; lastEdge: [string, string] | null }) {
  const n = m.states.length;
  const W = 420;
  const H = 260;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 44;
  const pos = new Map<string, { x: number; y: number }>();
  m.states.forEach((s, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    pos.set(s, { x: n === 1 ? cx : cx + R * Math.cos(a), y: n === 1 ? cy : cy + R * Math.sin(a) });
  });
  // Group edges by (from,to) and merge labels.
  const edges = new Map<string, { from: string; to: string; syms: string[] }>();
  for (const [f, row] of m.delta) for (const [s, t] of row) {
    const k = `${f}→${t}`;
    const e = edges.get(k) ?? { from: f, to: t, syms: [] };
    e.syms.push(s);
    edges.set(k, e);
  }
  const rad = 20;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[520px]" role="img" aria-label="State diagram">
      <defs>
        <marker id="dfaSimArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      <g fill="currentColor" fontFamily="ui-sans-serif, system-ui" fontSize="12">
        {[...edges.values()].map((e) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const active = lastEdge && lastEdge[0] === e.from && lastEdge[1] === e.to;
          const stroke = active ? "rgb(var(--accent))" : "currentColor";
          if (e.from === e.to) {
            const lx = a.x;
            const ly = a.y - rad - 18;
            return (
              <g key={`${e.from}-${e.to}`}>
                <path d={`M ${a.x - 8} ${a.y - rad + 2} C ${a.x - 26} ${a.y - rad - 30}, ${a.x + 26} ${a.y - rad - 30}, ${a.x + 8} ${a.y - rad + 2}`} fill="none" stroke={stroke} strokeWidth={active ? 2.2 : 1.4} markerEnd="url(#dfaSimArrow)" />
                <text x={lx} y={ly - 8} textAnchor="middle" fill={stroke}>
                  {e.syms.join(", ")}
                </text>
              </g>
            );
          }
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const ux = dx / d;
          const uy = dy / d;
          // Curve if the reverse edge exists.
          const twoWay = edges.has(`${e.to}→${e.from}`);
          const bend = twoWay ? 22 : 0;
          const nx = -uy;
          const ny = ux;
          const sx = a.x + ux * rad + nx * (twoWay ? 4 : 0);
          const sy = a.y + uy * rad + ny * (twoWay ? 4 : 0);
          const ex = b.x - ux * (rad + 2) + nx * (twoWay ? 4 : 0);
          const ey = b.y - uy * (rad + 2) + ny * (twoWay ? 4 : 0);
          const mx = (sx + ex) / 2 + nx * bend;
          const my = (sy + ey) / 2 + ny * bend;
          return (
            <g key={`${e.from}-${e.to}`}>
              <path d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`} fill="none" stroke={stroke} strokeWidth={active ? 2.2 : 1.4} markerEnd="url(#dfaSimArrow)" />
              <text x={mx + nx * 10} y={my + ny * 10 + 4} textAnchor="middle" fill={stroke}>
                {e.syms.join(", ")}
              </text>
            </g>
          );
        })}
        {m.states.map((s) => {
          const p = pos.get(s)!;
          const isCur = s === current;
          const acc = m.accept.has(s);
          return (
            <g key={s}>
              {s === m.start && <path d={`M ${p.x - rad - 22} ${p.y - 9} L ${p.x - rad - 22} ${p.y + 9} L ${p.x - rad - 4} ${p.y} z`} fill={isCur ? "rgb(var(--accent))" : "currentColor"} />}
              <circle cx={p.x} cy={p.y} r={rad} fill={isCur ? "rgb(var(--accent) / 0.18)" : "rgb(var(--card))"} stroke={isCur ? "rgb(var(--accent))" : "currentColor"} strokeWidth={isCur ? 2.2 : 1.4} />
              {acc && <circle cx={p.x} cy={p.y} r={rad - 4} fill="none" stroke={isCur ? "rgb(var(--accent))" : "currentColor"} strokeWidth={1.2} />}
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontWeight={isCur ? 600 : 400} fill={isCur ? "rgb(var(--accent-fg))" : "currentColor"}>
                {s}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ── The sim ───────────────────────────────────────────────────────────── */

const DEFAULT_DELTA = "q0 a q1\nq0 b q2\nq1 a,b q1\nq2 a,b q2";

export function DfaSim({ params }: SimProps) {
  const initialDelta = useMemo(() => {
    const d = params.delta;
    if (d && typeof d === "object") {
      const lines: string[] = [];
      for (const [f, row] of Object.entries(d as Record<string, Record<string, string>>)) {
        const byTarget = new Map<string, string[]>();
        for (const [s, t] of Object.entries(row)) byTarget.set(t, [...(byTarget.get(t) ?? []), s]);
        for (const [t, syms] of byTarget) lines.push(`${f} ${syms.join(",")} ${t}`);
      }
      return lines.join("\n");
    }
    return DEFAULT_DELTA;
  }, [params]);
  const editable = params.editable !== false;
  const [text, setText] = useState(initialDelta);
  const [start, setStart] = useState(str(params, "start", "q0"));
  const [accept, setAccept] = useState(strs(params, "accept", ["q1"]).join(", "));
  const [input, setInput] = useState(str(params, "input", "abba"));
  const [pos, setPos] = useState(0);

  const parsed = useMemo(() => parseDelta(text), [text]);
  const m = useMemo(
    () =>
      build(
        parsed.rules,
        start.trim() || "q0",
        accept
          .split(/[,\s]+/)
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    [parsed, start, accept],
  );
  const gaps = useMemo(() => missing(m), [m]);
  const clean = input.replace(/\s+/g, "");
  const badSyms = [...new Set(clean.split("").filter((c) => !m.alphabet.includes(c)))];
  const r = useMemo(() => run(m, clean), [m, clean]);
  // Edits reset the run; a test-set click runs the whole string at once.
  const runAll = useRef(false);
  useEffect(() => {
    setPos(runAll.current ? clean.length : 0);
    runAll.current = false;
  }, [clean, text, start, accept]);

  const current = r.path[Math.min(pos, r.path.length - 1)] ?? null;
  const lastEdge: [string, string] | null = pos > 0 && r.path[pos - 1] && r.path[pos] ? [r.path[pos - 1]!, r.path[pos]!] : null;
  const done = pos >= clean.length || (r.stuckAt >= 0 && pos > r.stuckAt);
  const v = verdict(m, clean);
  const tests = strs(params, "tests", ["", "a", "b", "aa", "ab", "ba", "bb", "aba", "bab", "abb"]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Diagram m={m} current={current} lastEdge={lastEdge} />
          {/* Tape */}
          <div className="flex flex-wrap items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="input string (empty = λ)" className={cn(CTRL, "w-40")} aria-label="Input string" />
            <button type="button" className={BTN} onClick={() => setPos(0)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button type="button" className={BTN_SOLID} disabled={done} onClick={() => setPos((p) => p + 1)}>
              <StepForward className="h-3.5 w-3.5" /> Step
            </button>
            <button type="button" className={BTN} disabled={done} onClick={() => setPos(clean.length)}>
              <Play className="h-3.5 w-3.5" /> Run
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1 font-mono text-sm">
            <span className={LABEL}>tape</span>
            {clean.length === 0 ? (
              <span className="ml-2 text-muted-foreground">λ</span>
            ) : (
              clean.split("").map((c, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded border",
                    i < pos ? "border-border/50 text-muted-foreground/60" : i === pos && !done ? "border-brand bg-brand/[0.1] text-brand-fg" : "border-border",
                    badSyms.includes(c) && "border-critical text-critical-fg",
                  )}
                >
                  {c}
                </span>
              ))
            )}
            <span className="ml-3 text-xs text-muted-foreground">
              state <span className="font-medium text-foreground">{current ?? "stuck"}</span> · step {Math.min(pos, clean.length)}/{clean.length}
            </span>
          </div>
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              !done ? "border-border/60 text-muted-foreground" : v === "accept" ? "border-on-track/50 bg-on-track/[0.08] text-on-track-fg" : v === "reject" ? "border-at-risk/50 bg-at-risk/[0.08] text-at-risk-fg" : "border-critical/50 bg-critical/[0.08] text-critical-fg",
            )}
          >
            {!done
              ? "Result: Reject until proven otherwise (start configuration)."
              : v === "accept"
                ? `Accept: all ${clean.length} symbol${clean.length === 1 ? "" : "s"} consumed and ${current} is accepting.`
                : v === "reject"
                  ? `Reject: halted in ${current}, which is not accepting.`
                  : `Stuck: no transition from ${r.path[r.stuckAt]} on '${clean[r.stuckAt]}'. A DFA must be total; add the arrow (a trap state works).`}
          </div>
        </div>

        {/* Definition */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-1">
            <span className={LABEL}>δ · one transition per line</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={!editable}
              rows={5}
              spellCheck={false}
              className={cn(CTRL, "resize-y leading-relaxed")}
              aria-label="Transitions"
            />
          </label>
          <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={LABEL}>q₀</span>
              <input value={start} onChange={(e) => setStart(e.target.value)} readOnly={!editable} className={CTRL} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>F (accepting)</span>
              <input value={accept} onChange={(e) => setAccept(e.target.value)} readOnly={!editable} className={CTRL} />
            </label>
          </div>
          <div className="text-2xs leading-relaxed text-muted-foreground">
            Q = {"{"}
            {m.states.join(", ")}
            {"}"} · Σ = {"{"}
            {m.alphabet.join(", ")}
            {"}"} · {m.states.length * m.alphabet.length} arrows needed, {[...m.delta.values()].reduce((s, row) => s + row.size, 0)} drawn
          </div>
          {parsed.bad.length > 0 && <div className="text-2xs text-critical-fg">Can't read: {parsed.bad.join(" · ")} (write "q0 a q1" or "q0 a,b q1")</div>}
          {gaps.length > 0 ? (
            <div className="rounded-lg border border-at-risk/40 bg-at-risk/[0.06] px-2.5 py-1.5 text-2xs text-at-risk-fg">
              Not total: {gaps.slice(0, 4).map(([q, a]) => `(${q}, ${a})`).join(", ")}
              {gaps.length > 4 ? ` +${gaps.length - 4}` : ""} missing.
            </div>
          ) : (
            <div className="rounded-lg border border-on-track/40 bg-on-track/[0.06] px-2.5 py-1.5 text-2xs text-on-track-fg">Total: every (state, symbol) has exactly one arrow.</div>
          )}
          {m.accept.size === 0 && <div className="text-2xs text-muted-foreground">No accepting state: L(M) = ϕ.</div>}
          </div>
        </div>
      </div>

      {/* Test set */}
      <div>
        <span className={LABEL}>Test set · λ first</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {tests.map((w) => {
            const vv = verdict(m, w);
            return (
              <button
                key={w || "λ"}
                type="button"
                onClick={() => {
                  runAll.current = true;
                  setInput(w);
                }}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-xs",
                  vv === "accept" ? "border-on-track/50 bg-on-track/[0.08] text-on-track-fg" : vv === "reject" ? "border-border/70 text-muted-foreground" : "border-critical/50 text-critical-fg",
                )}
                title={vv}
              >
                {w || "λ"} {vv === "accept" ? "✓" : vv === "reject" ? "✗" : "?"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
