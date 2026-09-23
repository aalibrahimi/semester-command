/**
 * Stepper — a click-through animation of one mechanic (a trace, a tree
 * growing, a derivation line by line).
 *
 * Called by: Blocks.tsx (inline in the chapter) and StudySlides.tsx (one
 * frame per slide, with the controls hidden).
 * Calls: nothing.
 *
 * The frame renderers are the only place the three frame kinds are drawn, so
 * a frame looks identical in the book and on the slide.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Frame } from "@/study/types";
import { Inline } from "./Blocks";

export function FrameView({ frame, large }: { frame: Frame; large?: boolean }) {
  switch (frame.kind) {
    case "array":
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-1.5">
            {frame.cells.map((c, i) => {
              const hl = frame.hl?.includes(i);
              const done = frame.done?.includes(i);
              return (
                <div
                  key={i}
                  data-numeric
                  className={cn(
                    "flex items-center justify-center rounded-md border font-mono tabular-nums transition-colors duration-micro",
                    large ? "h-14 min-w-14 px-3 text-lg" : "h-10 min-w-10 px-2 text-sm",
                    hl
                      ? "border-brand bg-brand/15 text-foreground"
                      : done
                        ? "border-on-track/50 bg-on-track/10 text-foreground"
                        : "border-border bg-card text-foreground/80",
                  )}
                >
                  {c}
                </div>
              );
            })}
          </div>
          {frame.note && <div className="font-mono text-xs text-muted-foreground">{frame.note}</div>}
        </div>
      );

    case "tree":
      return (
        <div className="flex flex-col gap-2.5">
          {frame.levels.map((lvl, li) => (
            <div key={li} className="flex items-center gap-3">
              <span className="w-12 shrink-0 font-mono text-2xs text-muted-foreground">lvl {li}</span>
              <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-1">
                {lvl.nodes.map((n, ni) => (
                  <span
                    key={ni}
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 font-mono text-2xs",
                      lvl.hl ? "border-brand bg-brand/15" : "border-border bg-card text-foreground/80",
                      large && "px-2 py-1 text-xs",
                    )}
                  >
                    {n}
                  </span>
                ))}
              </div>
              {lvl.work && (
                <span
                  className={cn(
                    "w-36 shrink-0 text-right font-mono text-2xs",
                    lvl.hl ? "text-brand-fg" : "text-muted-foreground",
                  )}
                >
                  {lvl.work}
                </span>
              )}
            </div>
          ))}
        </div>
      );

    case "lines":
      return (
        <div className="flex flex-col gap-1">
          {frame.lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono transition-colors duration-micro",
                large ? "text-sm" : "text-xs",
                i === frame.active
                  ? "bg-brand/12 text-foreground ring-1 ring-brand/40"
                  : i < frame.active
                    ? "text-foreground/70"
                    : "text-muted-foreground/40",
              )}
            >
              {line}
            </div>
          ))}
        </div>
      );
  }
}

export function Stepper({ title, frames }: { title: string; frames: Frame[] }) {
  const [i, setI] = useState(0);
  const frame = frames[i];
  const last = i === frames.length - 1;
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-card">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5">
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Step through</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        <span data-numeric className="font-mono text-2xs text-muted-foreground">
          {i + 1} / {frames.length}
        </span>
      </div>
      <div className="px-4 py-5">
        <FrameView frame={frame} />
      </div>
      <div className="border-t border-border/60 px-4 py-3">
        <p className="min-h-[2.5rem] text-[15px] leading-relaxed text-foreground/90">
          <Inline text={frame.caption} />
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <button
            type="button"
            onClick={() => (last ? setI(0) : setI((v) => v + 1))}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity duration-micro hover:opacity-90"
          >
            {last ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" /> Replay
              </>
            ) : (
              <>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
