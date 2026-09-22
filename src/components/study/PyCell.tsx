/**
 * PyCell: a Python cell you type in and run inside the app, with instant
 * feedback. The "Do it yourself" of the Python chapters.
 *
 * Called by: GuideBlocks (guide blocks of type "code").
 * Calls: lib/python/runner (Pyodide in a worker), localStorage (your code
 * and whether you passed, per cell, best-effort).
 *
 * What a run shows, in reading order:
 *   1. what your code printed
 *   2. any plots (plt.show() or a figure left open)
 *   3. an error, with the line that failed and what that error means in
 *      plain words
 *   4. the verdict from the hidden check: "Correct" plus why it matters,
 *      or "Not yet" plus the exact thing that's off
 *
 * Keys: Cmd/Ctrl+Enter runs, Tab indents four spaces, Enter keeps the
 * indent and adds one after a line ending in ":", Shift+Tab dedents.
 *
 * The editor is a transparent textarea over a highlighted <pre> with the
 * same font metrics: native editing (undo, selection, IME) with colors.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Eye, Lightbulb, Loader2, Play, RotateCcw, Square, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { runPython, stopPython, type RunResult } from "@/lib/python/runner";
import type { CodeBlock } from "@/study/guide";
import { Inline } from "./Blocks";

const KEY = (id: string) => `sc.py.${id}`;
const PASS = (id: string) => `sc.py.pass.${id}`;

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    /* storage unavailable: the cell still works, it just forgets */
  }
}

/* ── Python highlighting ─────────────────────────────────────────────────── */

const TOKEN =
  /(#[^\n]*)|([rbfRBF]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'))|(\b(?:def|return|if|elif|else|for|while|in|not|and|or|is|import|from|as|with|try|except|finally|raise|class|lambda|None|True|False|break|continue|pass|yield|global|assert)\b)|(\b\d+(?:\.\d+)?(?:e-?\d+)?j?\b)|([A-Za-z_]\w*(?=\())/g;
const HL: Record<number, string> = {
  1: "italic text-muted-foreground",
  2: "text-on-track-fg",
  3: "font-semibold text-brand-fg",
  4: "text-at-risk-fg",
  5: "text-foreground",
};

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of code.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    const g = m.slice(1).findIndex((x) => x !== undefined) + 1;
    out.push(
      <span key={k++} className={cn(HL[g], g === 5 && "underline decoration-foreground/15 underline-offset-2")}>
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  out.push(code.slice(last) + "\n");
  return out;
}

/* ── Errors, in plain words ──────────────────────────────────────────────── */

const ERROR_HELP: [RegExp, string][] = [
  [/'NoneType'/, "A variable is still `None`. That usually means a `None` placeholder in the starter code hasn't been replaced yet, or a function is missing its `return`."],
  [/must be string or compiled pattern/, "The regex pattern isn't text yet (it's probably still `None`). Write it as a raw string in quotes: `r\"...\"`."],
  [/NameError: name '(\w+)'/, "Python doesn't know the name **$1**. Either it's spelled differently where you made it, or you use it before the line that creates it. Names are case-sensitive: `X` and `x` are different."],
  [/IndentationError|TabError/, "The spaces at the start of a line are wrong. Every line inside a `for`, `if`, or `def` must be pushed in by the same amount (4 spaces), and lines after the block go back out."],
  [/SyntaxError/, "Python couldn't read the line as code. Look for a missing `:` at the end of `for`/`if`/`def`, an unclosed `(` or `[` or quote, or `=` where you meant `==`."],
  [/IndexError/, "You asked for a position that doesn't exist. A list of length 5 has positions 0 to 4, so `x[5]` is one past the end. Negative positions count from the end: `x[-1]` is the last item."],
  [/KeyError: (.+)/, "That key isn't in the dictionary: $1. Look it up with `d.get(key, 0)` to get a default instead of an error, or check with `if key in d:` first."],
  [/TypeError: .*not callable/, "You put `(...)` after something that isn't a function. Often a variable that has the same name as a function, like `sum = 3` and later `sum(...)`."],
  [/TypeError: can only concatenate str/, "You glued text and a number with `+`. Use an f-string instead: `f\"total: {n}\"`, or convert with `str(n)`."],
  [/TypeError/, "A value is the wrong kind for what you did with it (text where a number was needed, a list where one item was needed). Print the variable and its `type(...)` to see what it really is."],
  [/ValueError: operands could not be broadcast|shapes .* not aligned/, "Two numpy arrays have different lengths. When you add or multiply arrays, they must be the same size. Check `len(a)` and `len(b)`."],
  [/ValueError: x and y must have same first dimension/, "`ax.plot(x, y)` needs x and y to be the same length. Usually the time axis was made with a different duration or sampling rate than the signal."],
  [/ValueError/, "The value has the right kind but a bad content, like `int(\"abc\")` or unpacking 3 things into 2 names."],
  [/AttributeError: .*'(\w+)' object has no attribute '(\w+)'/, "A **$1** doesn't have **.$2**. Check the spelling, and check that the variable holds what you think (print its `type(...)`)."],
  [/ZeroDivisionError/, "Something was divided by zero. Usually a count or a length that turned out to be 0."],
  [/ModuleNotFoundError: No module named '(\w+)'/, "The package **$1** isn't available here. This cell can use numpy, matplotlib, scipy, pandas, re, math, and collections."],
];

function explain(error: string): string | null {
  for (const [re, text] of ERROR_HELP) {
    const m = error.match(re);
    if (m) return text.replace(/\$(\d)/g, (_, i: string) => m[Number(i)] ?? "");
  }
  return null;
}

/* ── The cell ────────────────────────────────────────────────────────────── */

export function PyCell({ block, children }: { block: CodeBlock; children?: ReactNode }) {
  const [code, setCode] = useState(() => load(KEY(block.id)) ?? block.starter);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [passed, setPassed] = useState(() => load(PASS(block.id)) === "1");
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [tries, setTries] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLPreElement>(null);

  useEffect(() => {
    save(KEY(block.id), code === block.starter ? null : code);
  }, [code, block.id, block.starter]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setStatus("Starting…");
    const r = await runPython({ setup: block.setup, code, check: block.check }, setStatus);
    setResult(r);
    setRunning(false);
    setStatus("");
    if (block.check) {
      setTries((t) => t + 1);
      if (r.check === true) {
        setPassed(true);
        save(PASS(block.id), "1");
      }
    }
  };

  const stop = () => {
    stopPython();
    setRunning(false);
    setStatus("");
  };

  const reset = () => {
    setCode(block.starter);
    setResult(null);
  };

  /** Editor keys: run, indent, auto-indent. */
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: t, value } = ta;
    const edit = (text: string, from: number, to: number, caret: number) => {
      // execCommand keeps native undo working; fall back to a plain set.
      ta.setSelectionRange(from, to);
      if (!document.execCommand("insertText", false, text)) {
        setCode(value.slice(0, from) + text + value.slice(to));
      }
      requestAnimationFrame(() => ta.setSelectionRange(caret, caret));
    };
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void run();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      edit("    ", s, t, s + 4);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const lead = value.slice(lineStart).match(/^ {1,4}/)?.[0].length ?? 0;
      if (lead) edit("", lineStart, lineStart + lead, Math.max(lineStart, s - lead));
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const line = value.slice(lineStart, s);
      let indent = line.match(/^ */)?.[0] ?? "";
      if (/:\s*(#.*)?$/.test(line)) indent += "    ";
      edit("\n" + indent, s, t, s + 1 + indent.length);
    }
  };

  const syncScroll = () => {
    if (pre.current && area.current) {
      pre.current.scrollTop = area.current.scrollTop;
      pre.current.scrollLeft = area.current.scrollLeft;
    }
  };

  const lineCount = code.split("\n").length;
  const help = result?.error ? explain(result.error) : null;
  const verdict = result?.check ?? null;
  const hintList = block.hints ?? [];

  return (
    <section
      id={block.id}
      className={cn(
        "scroll-mt-6 overflow-hidden rounded-xl border bg-card shadow-card",
        passed ? "border-on-track/45" : "border-foreground/15",
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-foreground/10 px-4 py-2.5">
        <span className="rounded-md bg-brand/15 px-1.5 py-0.5 font-mono text-2xs font-semibold text-brand-fg">Python</span>
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          {block.check ? "Your turn" : "Try it"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{block.title.replace(/^(your turn|try it):\s*/i, "")}</span>
        {passed && (
          <span className="flex items-center gap-1 rounded-full bg-on-track/15 px-2 py-0.5 text-2xs font-semibold text-on-track-fg">
            <Check className="h-3 w-3" /> Passed
          </span>
        )}
      </header>

      {/* Task */}
      <div className="px-4 pt-3">{children}</div>

      {/* Editor */}
      <div className="mx-4 mt-3 flex overflow-hidden rounded-lg border border-foreground/15 bg-foreground/[0.035] font-mono text-[13px] leading-[1.6]">
        <div aria-hidden className="select-none border-r border-foreground/10 px-2 py-2.5 text-right text-muted-foreground/60">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <pre
            ref={pre}
            aria-hidden
            className="pointer-events-none m-0 overflow-hidden whitespace-pre px-3 py-2.5 text-foreground/90"
          >
            {highlight(code)}
          </pre>
          <textarea
            ref={area}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKey}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={`Python code: ${block.title}`}
            wrap="off"
            className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-2.5 text-transparent caret-foreground outline-none selection:bg-brand/25"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {running ? (
          <button type="button" onClick={stop} className="flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-3.5 py-1.5 text-xs font-medium text-critical-fg hover:bg-critical/15">
            <Square className="h-3.5 w-3.5" /> Stop
          </button>
        ) : (
          <button type="button" onClick={() => void run()} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Play className="h-3.5 w-3.5" /> {block.check ? "Run and check" : "Run"}
          </button>
        )}
        <span className="text-2xs text-muted-foreground">Cmd/Ctrl + Enter</span>
        <div className="flex-1" />
        {hintList.length > 0 && hints < hintList.length && (
          <button type="button" onClick={() => setHints((h) => h + 1)} className="flex items-center gap-1.5 rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost">
            <Lightbulb className="h-3.5 w-3.5" /> Hint {hints + 1} of {hintList.length}
          </button>
        )}
        {block.solution && (
          <button
            type="button"
            onClick={() => setShowSolution((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost"
            title={tries === 0 && !passed ? "Give it one real try first" : undefined}
          >
            <Eye className="h-3.5 w-3.5" /> {showSolution ? "Hide answer" : "Show answer"}
          </button>
        )}
        <button type="button" onClick={reset} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground" title="Put the starting code back">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Hints */}
      {hints > 0 && (
        <ol className="mx-4 mb-3 flex flex-col gap-2">
          {hintList.slice(0, hints).map((h, i) => (
            <li key={i} className="flex gap-2 rounded-lg border border-brand/30 bg-brand/[0.06] px-3 py-2 text-sm">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-fg" />
              <span>
                <Inline text={h} />
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Solution */}
      {showSolution && block.solution && (
        <div className="mx-4 mb-3 overflow-hidden rounded-lg border border-on-track/30">
          <div className="flex items-center gap-2 bg-on-track/[0.08] px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-on-track-fg">
            One way to write it
            <div className="flex-1" />
            <button type="button" onClick={() => setCode(block.solution ?? "")} className="rounded-md px-1.5 py-0.5 normal-case tracking-normal hover:bg-on-track/15">
              Put it in the editor
            </button>
          </div>
          <pre className="m-0 overflow-x-auto px-3 py-2 font-mono text-[13px] leading-[1.6]">{highlight(block.solution)}</pre>
        </div>
      )}

      {/* Output */}
      {(running || result) && (
        <div className="border-t border-foreground/10 bg-foreground/[0.02] px-4 py-3">
          {running ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status}
            </div>
          ) : (
            result && (
              <div className="flex flex-col gap-3">
                {result.stdout && (
                  <div>
                    <div className="mb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Printed</div>
                    <pre className="m-0 max-h-72 overflow-auto rounded-lg bg-foreground/[0.04] px-3 py-2 font-mono text-[12.5px] leading-[1.55]">{result.stdout}</pre>
                  </div>
                )}
                {result.figures.map((f, i) => (
                  <img key={i} src={`data:image/png;base64,${f}`} alt={`Plot ${i + 1} from your code`} className="max-w-full rounded-lg border border-foreground/10 bg-white" />
                ))}
                {result.error && (
                  <div className="rounded-lg border border-critical/35 bg-critical/[0.07] px-3 py-2.5">
                    <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-critical-fg">
                      <TriangleAlert className="h-3.5 w-3.5" /> Error
                    </div>
                    <pre className="m-0 whitespace-pre-wrap font-mono text-[12.5px] leading-[1.55]">{result.error}</pre>
                    {help && (
                      <p className="mt-2 border-t border-critical/20 pt-2 text-sm leading-relaxed">
                        <span className="font-semibold">What this means: </span>
                        <Inline text={help} />
                      </p>
                    )}
                  </div>
                )}
                {verdict === true && (
                  <div className="rounded-lg border border-on-track/35 bg-on-track/[0.08] px-3 py-2.5 text-sm">
                    <div className="mb-0.5 flex items-center gap-1.5 font-semibold text-on-track-fg">
                      <Check className="h-4 w-4" /> Correct
                    </div>
                    {block.success && <Inline text={block.success} />}
                  </div>
                )}
                {typeof verdict === "string" && (
                  <div className="rounded-lg border border-at-risk/40 bg-at-risk/[0.08] px-3 py-2.5 text-sm">
                    <div className="mb-0.5 font-semibold text-at-risk-fg">Not yet</div>
                    <Inline text={verdict} />
                    {tries >= 2 && hints === 0 && hintList.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">Stuck? Open Hint 1 above.</div>
                    )}
                  </div>
                )}
                {!result.stdout && !result.error && result.figures.length === 0 && verdict === null && (
                  <div className="text-xs text-muted-foreground">Ran with no output. Use `print(...)` to see a value.</div>
                )}
                <div className="text-2xs text-muted-foreground/70">Ran in {(result.ms / 1000).toFixed(1)} s</div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
