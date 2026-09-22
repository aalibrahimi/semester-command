/**
 * Python worker: runs the reader's code with Pyodide (CPython compiled to
 * WebAssembly) off the main thread, so a slow cell or an infinite loop never
 * freezes the app. The page can always kill this worker and start a new one.
 *
 * Called by: lib/python/runner.ts, via postMessage.
 * Calls: Pyodide from the jsDelivr CDN (first run downloads it once, the
 * browser caches it after that), and whatever packages the code imports
 * (numpy, matplotlib, scipy, pandas load on demand).
 *
 * One run = setup code (hidden) + the reader's code + check code (hidden),
 * all in one fresh namespace, so every run starts clean and a run can't be
 * passed by leftovers from the last one. Plots: matplotlib uses the Agg
 * backend and plt.show() is replaced with "save every open figure as a PNG
 * and send it back".
 */

const PYODIDE_VERSION = "314.0.7";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export interface RunRequest {
  id: number;
  setup?: string;
  code: string;
  check?: string;
}

export type RunResponse =
  | { id: number; kind: "status"; text: string }
  | {
      id: number;
      kind: "done";
      stdout: string;
      /** Traceback trimmed to the reader's own lines, or null. */
      error: string | null;
      /** PNGs as base64 (no data: prefix). */
      figures: string[];
      /** null = no check ran; true = passed; string = what's wrong. */
      check: true | string | null;
      ms: number;
    };

interface Pyodide {
  runPythonAsync(code: string, opts?: { globals?: unknown; filename?: string }): Promise<unknown>;
  loadPackage(names: string[], opts?: { messageCallback?: (m: string) => void; errorCallback?: (m: string) => void }): Promise<unknown>;
  setStdout(o: { batched: (s: string) => void }): void;
  setStderr(o: { batched: (s: string) => void }): void;
  globals: { get(name: string): unknown };
  toPy(v: unknown): unknown;
}

let py: Promise<Pyodide> | null = null;
const loaded = new Set<string>();

/** Pyodide packages this code imports. Only the ones the labs use. */
const PACKAGES: Record<string, string> = { numpy: "numpy", matplotlib: "matplotlib", scipy: "scipy", pandas: "pandas", nltk: "nltk" };
export function packagesFor(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/^\s*(?:import|from)\s+([A-Za-z_]\w*)/gm)) {
    const pkg = PACKAGES[m[1]];
    if (pkg) out.add(pkg);
  }
  // Plotting pulls numpy in; scipy needs numpy too. Pyodide resolves those itself.
  return [...out];
}

function load(post: (text: string) => void): Promise<Pyodide> {
  if (!py) {
    py = (async () => {
      post("Loading Python (first run only, about 10 seconds)…");
      const mod = (await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)) as {
        loadPyodide: (o: { indexURL: string }) => Promise<Pyodide>;
      };
      const p = await mod.loadPyodide({ indexURL: INDEX_URL });
      // Helpers live in their own module so the reader's namespace stays clean.
      await p.runPythonAsync(HELPERS, { filename: "<setup>" });
      return p;
    })();
    py.catch(() => (py = null));
  }
  return py;
}

/** Figure capture and the "assert" helpers checks use. */
const HELPERS = String.raw`
import sys, io, base64, types
_sc = types.ModuleType("_sc")
sys.modules["_sc"] = _sc
_sc.figures = []
_sc.shown = []

def _show(*a, **k):
    # Remember the open figures in the order they were shown; render them
    # at the end so a check can still inspect them.
    import matplotlib.pyplot as plt
    for num in plt.get_fignums():
        fig = plt.figure(num)
        if fig not in _sc.shown:
            _sc.shown.append(fig)

def _capture():
    if "matplotlib.pyplot" not in sys.modules:
        return
    import matplotlib.pyplot as plt
    figs = list(_sc.shown) + [plt.figure(n) for n in plt.get_fignums() if plt.figure(n) not in _sc.shown]
    import warnings
    for fig in figs:
        buf = io.BytesIO()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
        _sc.figures.append(base64.b64encode(buf.getvalue()).decode())
    _sc.shown.clear()
    plt.close("all")

def _last():
    """The most recent figure (for checks), or None."""
    import matplotlib.pyplot as plt
    if plt.get_fignums():
        return plt.figure(plt.get_fignums()[-1])
    return _sc.shown[-1] if _sc.shown else None

def _patch_plt():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.show = _show
    plt.close("all")
    _sc.shown.clear()

import os
os.environ["MPLBACKEND"] = "Agg"

_sc.capture = _capture
_sc.last = _last
_sc.patch_plt = _patch_plt
`;

/**
 * Turn a Pyodide traceback into what a person needs: which of *their* lines
 * failed (with the line itself, since code run from a string has no source
 * to quote) and the final "SomeError: message" line. Pyodide's own frames
 * are dropped.
 */
function trimTraceback(msg: string, code: string): string {
  const lines = msg.split("\n");
  const src = code.split("\n");
  const keep: string[] = [];
  for (const l of lines) {
    const m = l.match(/^\s*File "<cell>", line (\d+)(?:, in (.+))?/);
    if (!m) continue;
    const n = Number(m[1]);
    const where = m[2] && m[2] !== "<module>" ? ` (inside ${m[2]})` : "";
    keep.push(`Line ${n}${where}:  ${(src[n - 1] ?? "").trim()}`);
  }
  const last = lines.filter((l) => l.trim()).pop() ?? msg;
  return keep.length ? `${keep.join("\n")}\n${last}` : last;
}

self.onmessage = async (e: MessageEvent<RunRequest>) => {
  const { id, setup, code, check } = e.data;
  const post = (m: RunResponse) => (self as unknown as Worker).postMessage(m);
  const status = (text: string) => post({ id, kind: "status", text });
  const t0 = performance.now();
  let stdout = "";
  let error: string | null = null;
  let checkResult: true | string | null = null;

  try {
    const p = await load(status);
    p.setStdout({ batched: (s) => (stdout += s + "\n") });
    p.setStderr({ batched: (s) => (stdout += s + "\n") });
    const all = [setup ?? "", code, check ?? ""].join("\n");
    const wanted = packagesFor(all).filter((n) => !loaded.has(n));
    if (wanted.length) {
      status(`Loading ${wanted.join(", ")} (first time only)…`);
      await p.loadPackage(wanted, { messageCallback: () => {}, errorCallback: (m) => status(m) });
      for (const n of wanted) loaded.add(n);
    }
    status("Running…");
    const ns = (p.globals.get("dict") as () => unknown)();
    await p.runPythonAsync("import _sc\n_sc.figures.clear()", { filename: "<setup>" });
    if (/matplotlib/.test(all)) await p.runPythonAsync("import _sc\n_sc.patch_plt()", { filename: "<setup>" });
    if (setup) await p.runPythonAsync(setup, { globals: ns, filename: "<setup>" });
    try {
      await p.runPythonAsync(code, { globals: ns, filename: "<cell>" });
    } catch (err) {
      error = trimTraceback(String((err as Error).message ?? err), code);
    }
    if (!error && check) {
      try {
        await p.runPythonAsync(check, { globals: ns, filename: "<check>" });
        checkResult = true;
      } catch (err) {
        const msg = String((err as Error).message ?? err);
        const m = msg.match(/AssertionError: ([\s\S]*)$/);
        checkResult = m ? m[1].trim() : `Your code ran, but the checker hit an error: ${msg.split("\n").filter(Boolean).pop()}`;
      }
    }
    await p.runPythonAsync("import _sc\n_sc.capture()", { filename: "<setup>" });
    const figs = (p.globals.get("_sc") as { figures: { toJs(): string[] } }).figures.toJs();
    post({ id, kind: "done", stdout: stdout.replace(/\n$/, ""), error, figures: [...figs], check: checkResult, ms: Math.round(performance.now() - t0) });
  } catch (err) {
    post({
      id,
      kind: "done",
      stdout,
      error: `Python could not start: ${String((err as Error).message ?? err)}. Check the internet connection (the first run downloads Python).`,
      figures: [],
      check: null,
      ms: Math.round(performance.now() - t0),
    });
  }
};
