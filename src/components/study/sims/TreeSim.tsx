/**
 * TreeSim — type a bracketed sentence, get the tree; click a node to see
 * the constituent it dominates and which test would show it.
 *
 * params: { bracket?: string }
 *
 * Notation: [Label child child …], words are bare tokens. Example:
 * [S [NP [D the] [N dog]] [VP [V chased] [NP [D the] [N cat]]]]. Unbalanced
 * brackets are reported rather than drawn. Selecting a node highlights the
 * words it spans, prints them as a string, and suggests the pro-form for
 * its category (NP → it/they, VP → do so, PP → there/then, N' → one(s)).
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CTRL, LABEL, str, type SimProps } from "./index";

interface Node {
  label: string;
  children: Node[];
  word?: string;
  id: number;
  x: number;
  depth: number;
  span: [number, number];
}

const DEFAULT = "[S [NP [D those] [Adj tall] [N spies]] [VP [V will] [VP [V stash] [NP [D the] [N evidence]] [PP [P after] [NP [N midnight]]]]]]";

function parse(src: string): { root: Node | null; error: string | null; leaves: string[] } {
  let i = 0;
  let id = 0;
  const leaves: string[] = [];
  const s = src.trim();
  const skip = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  const node = (depth: number): Node => {
    skip();
    if (s[i] !== "[") throw new Error(`expected [ at ${i}`);
    i++;
    skip();
    let label = "";
    while (i < s.length && !/[\s[\]]/.test(s[i])) label += s[i++];
    if (!label) throw new Error(`a bracket needs a label at ${i}`);
    const n: Node = { label, children: [], id: id++, x: 0, depth, span: [leaves.length, leaves.length] };
    for (;;) {
      skip();
      if (i >= s.length) throw new Error(`missing ] for ${label}`);
      if (s[i] === "]") {
        i++;
        break;
      }
      if (s[i] === "[") n.children.push(node(depth + 1));
      else {
        let w = "";
        while (i < s.length && !/[\s[\]]/.test(s[i])) w += s[i++];
        n.children.push({ label: w, children: [], word: w, id: id++, x: 0, depth: depth + 1, span: [leaves.length, leaves.length + 1] });
        leaves.push(w);
      }
    }
    n.span = [n.span[0], leaves.length];
    return n;
  };
  try {
    const root = node(0);
    skip();
    if (i < s.length) throw new Error(`extra text after the tree at ${i}`);
    return { root, error: null, leaves };
  } catch (e) {
    return { root: null, error: (e as Error).message, leaves };
  }
}

function layout(root: Node): { nodes: Node[]; width: number; depth: number } {
  const nodes: Node[] = [];
  let x = 0;
  let depth = 0;
  const place = (n: Node) => {
    depth = Math.max(depth, n.depth);
    if (n.children.length === 0) {
      n.x = x++;
    } else {
      for (const c of n.children) place(c);
      n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2;
    }
    nodes.push(n);
  };
  place(root);
  return { nodes, width: x, depth };
}

const PROFORM: Record<string, string> = {
  NP: "a pronoun: it / they / she / him",
  "N'": "one / ones",
  Nbar: "one / ones",
  VP: "do so (too)",
  PP: "there (place) / then (time)",
  AdjP: "so ('very tall' → 'so')",
  AP: "so",
  S: "a clause: 'so' after think, or it-clefting on its parts",
  CP: "'so' or 'that' after think",
};

export function TreeSim({ params }: SimProps) {
  const [text, setText] = useState(str(params, "bracket", DEFAULT));
  const [sel, setSel] = useState<number | null>(null);
  const parsed = useMemo(() => parse(text), [text]);
  const laid = useMemo(() => (parsed.root ? layout(parsed.root) : null), [parsed]);

  const colW = 64;
  const rowH = 52;
  const W = laid ? Math.max(320, laid.width * colW + 40) : 320;
  const H = laid ? (laid.depth + 1) * rowH + 30 : 120;
  const selected = laid?.nodes.find((n) => n.id === sel) ?? null;
  const spanWords = selected ? parsed.leaves.slice(selected.span[0], selected.span[1]) : [];

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={LABEL}>Bracketed sentence · [Label child child …]</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} spellCheck={false} className={cn(CTRL, "resize-y leading-relaxed", parsed.error && "border-critical")} aria-label="Bracket notation" />
      </label>
      {parsed.error && <div className="text-2xs text-critical-fg">Can't draw it: {parsed.error}. Every [ needs a label and a matching ].</div>}
      {laid && (
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full" style={{ maxWidth: W }} role="img" aria-label="Syntax tree">
            <g fontFamily="ui-sans-serif, system-ui" fontSize="13" fill="currentColor">
              {laid.nodes.map((n) =>
                n.children.map((c) => (
                  <line key={`${n.id}-${c.id}`} x1={20 + n.x * colW + colW / 2} y1={22 + n.depth * rowH + 8} x2={20 + c.x * colW + colW / 2} y2={22 + c.depth * rowH - 12} stroke="currentColor" strokeOpacity={selected && c.span[0] >= selected.span[0] && c.span[1] <= selected.span[1] ? 0.9 : 0.35} strokeWidth={selected && c.span[0] >= selected.span[0] && c.span[1] <= selected.span[1] ? 1.8 : 1.2} />
                )),
              )}
              {laid.nodes.map((n) => {
                const inSel = selected && n.span[0] >= selected.span[0] && n.span[1] <= selected.span[1];
                const isSel = n.id === sel;
                return (
                  <g key={n.id} onClick={() => setSel(n.word ? sel : isSel ? null : n.id)} style={{ cursor: n.word ? "default" : "pointer" }}>
                    {isSel && <rect x={20 + n.x * colW + 6} y={22 + n.depth * rowH - 14} width={colW - 12} height={22} rx="6" fill="rgb(var(--accent) / 0.18)" stroke="rgb(var(--accent))" />}
                    <text x={20 + n.x * colW + colW / 2} y={22 + n.depth * rowH + 2} textAnchor="middle" fontWeight={n.word ? 400 : 600} fontStyle={n.word ? "italic" : "normal"} fill={inSel ? (n.word ? "rgb(var(--accent-fg))" : "currentColor") : "currentColor"} fillOpacity={selected && !inSel ? 0.45 : 1}>
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}
      <div className="rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2 text-sm leading-relaxed">
        {selected ? (
          <>
            <b>{selected.label}</b> dominates <span className="font-medium">"{spanWords.join(" ")}"</span> ({spanWords.length} word{spanWords.length === 1 ? "" : "s"}).{" "}
            {PROFORM[selected.label] ? `Substitution test: replace it with ${PROFORM[selected.label]}. ` : ""}
            Movement: try fronting it or "It's {spanWords.join(" ")} that …". Fragment: can "{spanWords.join(" ")}" answer a question by itself?
          </>
        ) : (
          <span className="text-muted-foreground">Click a phrase label (S, NP, VP, PP…) to see the words it dominates and the test that would show it is a constituent.</span>
        )}
      </div>
    </div>
  );
}
