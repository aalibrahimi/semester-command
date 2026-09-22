/**
 * runner: the page's handle on the Python worker. One shared worker for the
 * whole app (Python takes a few seconds to boot, so we boot it once), and a
 * queue so two cells never run at the same time.
 *
 * Called by: components/study/PyCell.tsx.
 * Calls: lib/python/worker.ts.
 *
 * stop() is the escape hatch for `while True:`. A worker stuck in Python
 * can't be interrupted from outside, so stop() terminates it and the next
 * run starts a fresh one (Python reloads from the browser cache, ~2 s).
 */
import type { RunRequest, RunResponse } from "./worker";

export type RunResult = Extract<RunResponse, { kind: "done" }>;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { onStatus: (s: string) => void; resolve: (r: RunResult) => void }>();
let chain: Promise<unknown> = Promise.resolve();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<RunResponse>) => {
      const m = e.data;
      const p = pending.get(m.id);
      if (!p) return;
      if (m.kind === "status") p.onStatus(m.text);
      else {
        pending.delete(m.id);
        p.resolve(m);
      }
    };
  }
  return worker;
}

/** Run one cell. Resolves when Python finishes (or stop() is called). */
export function runPython(
  req: Omit<RunRequest, "id">,
  onStatus: (s: string) => void = () => {},
): Promise<RunResult> {
  const run = () =>
    new Promise<RunResult>((resolve) => {
      const id = nextId++;
      pending.set(id, { onStatus, resolve });
      getWorker().postMessage({ id, ...req } satisfies RunRequest);
    });
  const p = chain.then(run, run);
  chain = p;
  return p;
}

/** Kill whatever is running. Every pending run resolves as stopped. */
export function stopPython() {
  worker?.terminate();
  worker = null;
  for (const [id, p] of pending) {
    p.resolve({ id, kind: "done", stdout: "", error: "Stopped. (Python restarts on your next run.)", figures: [], check: null, ms: 0 });
  }
  pending.clear();
  chain = Promise.resolve();
}
