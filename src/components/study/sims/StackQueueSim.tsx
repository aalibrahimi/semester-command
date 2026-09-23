/**
 * StackQueueSim: push and pop on a real array, with the pointers visible.
 *
 * params: { mode?: "stack" | "queue" | "naive", capacity?: number (default 6) }
 *
 *   stack  an array plus `top` (starts at −1). push: top++, write. pop:
 *          read, top−−. Overflow when top = capacity − 1, underflow at −1.
 *   queue  the circular buffer from Lecture 2: `head`, `tail`, `size`,
 *          and both indexes wrap with % capacity. Every operation is O(1).
 *   naive  the queue that keeps the front at index 0, so every dequeue
 *          shifts everything left. A move counter shows the O(n) cost the
 *          circular buffer exists to avoid.
 *
 * Every button writes one line to the log saying exactly what changed, in
 * the same words as Poon's pseudocode.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BTN, BTN_SOLID, LABEL, num, str, type SimProps } from "./index";

type Mode = "stack" | "queue" | "naive";

interface State {
  slots: (number | null)[];
  top: number;
  head: number;
  tail: number;
  size: number;
  next: number;
  moves: number;
  log: string[];
}

function fresh(cap: number): State {
  return { slots: Array(cap).fill(null), top: -1, head: 0, tail: 0, size: 0, next: 10, moves: 0, log: [] };
}

export function StackQueueSim({ params }: SimProps) {
  const [mode, setMode] = useState<Mode>((str(params, "mode", "stack") as Mode) || "stack");
  const cap = Math.min(10, Math.max(3, num(params, "capacity", 6)));
  const [s, setS] = useState<State>(() => fresh(cap));

  const say = (st: State, line: string, bad = false): State => ({ ...st, log: [(bad ? "✗ " : "") + line, ...st.log].slice(0, 6) });

  const add = () => {
    setS((st) => {
      const v = st.next;
      const slots = st.slots.slice();
      if (mode === "stack") {
        if (st.top === cap - 1) return say(st, `push(${v}): overflow, top is already ${cap - 1} (the last slot).`, true);
        slots[st.top + 1] = v;
        return say({ ...st, slots, top: st.top + 1, next: v + 10 }, `push(${v}): top ${st.top} → ${st.top + 1}, a[${st.top + 1}] = ${v}. One step.`);
      }
      if (st.size === cap) return say(st, `enqueue(${v}): the queue is full (size = ${cap}).`, true);
      if (mode === "queue") {
        slots[st.tail] = v;
        const tail = (st.tail + 1) % cap;
        return say(
          { ...st, slots, tail, size: st.size + 1, next: v + 10 },
          `enqueue(${v}): a[tail = ${st.tail}] = ${v}, tail = (${st.tail} + 1) % ${cap} = ${tail}. One step.`,
        );
      }
      slots[st.size] = v;
      return say({ ...st, slots, size: st.size + 1, next: v + 10 }, `enqueue(${v}): write at the end, a[${st.size}] = ${v}. One step.`);
    });
  };

  const remove = () => {
    setS((st) => {
      const slots = st.slots.slice();
      if (mode === "stack") {
        if (st.top === -1) return say(st, "pop(): underflow, the stack is empty (top = −1).", true);
        const v = slots[st.top];
        slots[st.top] = null;
        return say({ ...st, slots, top: st.top - 1 }, `pop() → ${v}: read a[${st.top}], top ${st.top} → ${st.top - 1}. One step.`);
      }
      if (st.size === 0) return say(st, "dequeue(): the queue is empty.", true);
      if (mode === "queue") {
        const v = slots[st.head];
        slots[st.head] = null;
        const head = (st.head + 1) % cap;
        return say({ ...st, slots, head, size: st.size - 1 }, `dequeue() → ${v}: read a[head = ${st.head}], head = (${st.head} + 1) % ${cap} = ${head}. One step, nothing moves.`);
      }
      const v = slots[0];
      for (let i = 1; i < st.size; i++) slots[i - 1] = slots[i];
      slots[st.size - 1] = null;
      const shifted = st.size - 1;
      return say(
        { ...st, slots, size: st.size - 1, moves: st.moves + shifted },
        `dequeue() → ${v}: read a[0], then shift ${shifted} element${shifted === 1 ? "" : "s"} one slot left. ${shifted + 1} steps.`,
      );
    });
  };

  const peek = () => {
    setS((st) => {
      if (mode === "stack") return st.top === -1 ? say(st, "peek(): empty.", true) : say(st, `peek() → ${st.slots[st.top]} (a[top = ${st.top}]), nothing changes.`);
      if (st.size === 0) return say(st, "peek(): empty.", true);
      const i = mode === "queue" ? st.head : 0;
      return say(st, `peek() → ${st.slots[i]} (a[${i}], the front), nothing changes.`);
    });
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setS(fresh(cap));
  };

  const count = mode === "stack" ? s.top + 1 : s.size;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["stack", "Stack (array + top)"],
            ["queue", "Queue (circular buffer)"],
            ["naive", "Queue (naive, shifts)"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn("rounded-full border px-3 py-1 text-xs", mode === m ? "border-transparent bg-brand-solid font-medium text-white" : "border-border text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* The array */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1.5 pb-1 pt-6">
          {s.slots.map((v, i) => {
            const isTop = mode === "stack" && i === s.top;
            const isHead = mode === "queue" ? i === s.head && s.size > 0 : mode === "naive" && i === 0 && s.size > 0;
            const isTail = mode === "queue" ? i === s.tail : mode === "naive" && i === s.size;
            return (
              <div key={i} className="relative flex w-14 flex-col items-center">
                <div className="absolute -top-5 flex gap-1 text-2xs font-semibold">
                  {isTop && <span className="rounded bg-brand/15 px-1 text-brand-fg">top</span>}
                  {isHead && <span className="rounded bg-on-track/15 px-1 text-on-track-fg">head</span>}
                  {isTail && s.size < cap && <span className="rounded bg-at-risk/15 px-1 text-at-risk-fg">tail</span>}
                </div>
                <div
                  className={cn(
                    "flex h-12 w-14 items-center justify-center rounded-lg border font-mono text-sm transition-colors duration-micro",
                    v === null ? "border-dashed border-border/70 text-muted-foreground/40" : "border-brand/50 bg-brand/[0.1] font-semibold",
                    (isTop || isHead) && "ring-2 ring-brand/50",
                  )}
                >
                  {v ?? "·"}
                </div>
                <span className="mt-1 font-mono text-2xs text-muted-foreground">[{i}]</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_SOLID} onClick={add}>
          {mode === "stack" ? "push" : "enqueue"}({s.next})
        </button>
        <button type="button" className={BTN} onClick={remove}>
          {mode === "stack" ? "pop()" : "dequeue()"}
        </button>
        <button type="button" className={BTN} onClick={peek}>
          peek()
        </button>
        <button type="button" className={BTN} onClick={() => setS(fresh(cap))}>
          Reset
        </button>
        <span data-numeric className="ml-auto font-mono text-2xs text-muted-foreground">
          {mode === "stack" && `top = ${s.top} · `}
          {mode === "queue" && `head = ${s.head} · tail = ${s.tail} · `}
          size = {count} / {cap}
          {mode === "naive" && ` · elements moved by shifting: ${s.moves}`}
        </span>
      </div>

      <div className="rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2">
        <div className={LABEL}>What just happened</div>
        {s.log.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {mode === "stack" && "Press push a few times, then pop. The newest item always comes out first (LIFO), like a stack of plates."}
            {mode === "queue" && "Enqueue until it's full, dequeue two, then enqueue again: watch tail wrap around to index 0. Nothing ever shifts."}
            {mode === "naive" && "Fill it, then dequeue a few times and watch the moves counter. Every dequeue slides the whole line forward, like a checkout line where everyone steps up."}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 font-mono text-xs">
            {s.log.map((l, i) => (
              <li key={i} className={cn(i === 0 ? "text-foreground" : "text-muted-foreground", l.startsWith("✗") && i === 0 && "text-critical-fg")}>
                {l}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
