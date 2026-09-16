/**
 * Practice — the "Do it yourself" section at the end of a chapter.
 *
 * Called by: StudyChapter.
 * Calls: Inline (from Blocks).
 *
 * Each exercise is a card the reader works on paper first. A scratch box
 * keeps their working (localStorage, per exercise, best-effort). Hints open
 * one rung at a time — nudge → the usual mistake → how to think about it —
 * and only then the worked solution. Pick-one exercises give feedback per
 * wrong choice, so a mistake teaches instead of just failing.
 */
import { useEffect, useState } from "react";
import { Check, ChevronRight, Compass, Eye, Lightbulb, RotateCcw, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/study/types";
import { Inline } from "./Blocks";

const BODY = "text-[15px] leading-[1.75] text-foreground/90";
const RUNGS = [
  { label: "Nudge", icon: Lightbulb, cls: "text-brand-fg", box: "border-brand/30 bg-brand/[0.06]" },
  { label: "The usual mistake", icon: TriangleAlert, cls: "text-at-risk-fg", box: "border-at-risk/35 bg-at-risk/[0.07]" },
  { label: "How to think about it", icon: Compass, cls: "text-brand-fg", box: "border-brand/30 bg-brand/[0.06]" },
] as const;

function load(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function save(key: string, v: string) {
  try {
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable — scratch stays in memory */
  }
}

function ExerciseCard({ ex, n, storageKey }: { ex: Exercise; n: number; storageKey: string }) {
  const [rung, setRung] = useState(0); // how many hints are open
  const [solved, setSolved] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [work, setWork] = useState(() => load(storageKey));
  useEffect(() => save(storageKey, work), [storageKey, work]);

  const reset = () => {
    setRung(0);
    setSolved(false);
    setPicked(null);
  };
  const isChoice = !!ex.choices;
  const correct = isChoice && picked !== null && picked === ex.answer;

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-card">
      <div className="flex items-baseline gap-3 border-b border-border/60 px-4 py-3">
        <span data-numeric className="font-mono text-xs text-muted-foreground">
          {n}
        </span>
        <div className="min-w-0 flex-1 text-sm font-medium">{ex.title}</div>
        {(rung > 0 || solved || picked !== null) && (
          <button type="button" onClick={reset} className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> reset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <p className={BODY}>
          <Inline text={ex.prompt} />
        </p>
        {ex.code && (
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background px-3.5 py-3 font-mono text-[12.5px] leading-relaxed">
            {ex.code}
          </pre>
        )}

        {/* Pick-one */}
        {isChoice && (
          <ol className="flex flex-col gap-2">
            {ex.choices!.map((c, i) => {
              // Only the picked choice changes colour — a wrong pick must not reveal the right one.
              const state = picked !== i ? "idle" : i === ex.answer ? "right" : "wrong";
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={correct}
                    onClick={() => setPicked(i)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-micro",
                      state === "right"
                        ? "border-on-track/50 bg-on-track/[0.08]"
                        : state === "wrong"
                          ? "border-at-risk/50 bg-at-risk/[0.08]"
                          : "border-border/70 hover:bg-fill-ghost/60",
                    )}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-2xs">
                      {state === "right" ? <Check className="h-3 w-3 text-on-track-fg" /> : state === "wrong" ? <X className="h-3 w-3 text-at-risk-fg" /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0">
                      <Inline text={c.text} />
                    </span>
                  </button>
                  {picked === i && (
                    <p className={cn("mt-1.5 pl-7 text-sm leading-relaxed", i === ex.answer ? "text-on-track-fg" : "text-at-risk-fg")}>
                      <Inline text={c.feedback} />
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {/* Scratch space */}
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wider text-muted-foreground">Your working (kept on this device)</span>
          <textarea
            value={work}
            onChange={(e) => setWork(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="Do it on paper first. Then note your answer or where you got stuck…"
            className="w-full resize-y rounded-lg border border-border/70 bg-background px-3 py-2 font-mono text-[12.5px] leading-relaxed outline-none focus:border-brand/50"
          />
        </label>

        {/* Hint ladder */}
        <div className="flex flex-col gap-2">
          {RUNGS.slice(0, rung).map((r, i) => (
            <aside key={i} className={cn("rounded-lg border px-3.5 py-3", r.box)}>
              <div className={cn("mb-1 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider", r.cls)}>
                <r.icon className="h-3.5 w-3.5" /> {r.label}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                <Inline text={ex.hints[i]} />
              </p>
            </aside>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            {rung < RUNGS.length && !solved && (
              <button
                type="button"
                onClick={() => setRung((r) => r + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {rung === 0 ? "I'm stuck — nudge me" : rung === 1 ? "Still stuck — what's the usual mistake?" : "Show me how to think about it"}
              </button>
            )}
            {!solved && (
              <button
                type="button"
                onClick={() => setSolved(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                  rung === RUNGS.length || correct ? "bg-brand-solid text-primary-foreground hover:opacity-90" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Eye className="h-3.5 w-3.5" /> {correct ? "See the full working" : "Show the solution"}
              </button>
            )}
          </div>
        </div>

        {/* Solution + why */}
        {solved && (
          <div className="flex flex-col gap-4 border-t border-border/60 pt-4">
            <div>
              <div className="mb-2 text-2xs font-medium uppercase tracking-wider text-on-track-fg">Worked solution</div>
              <ol className="flex flex-col gap-2.5">
                {ex.solution.map((s, i) => (
                  <li key={i} className={cn("flex gap-3", BODY)}>
                    <span data-numeric className="mt-[0.35em] w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <Inline text={s} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <aside className="rounded-lg border border-border bg-fill-ghost/60 px-3.5 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                <ChevronRight className="h-3.5 w-3.5" /> Why this matters outside the exam
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                <Inline text={ex.why} />
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export function Practice({ exercises, scope }: { exercises: Exercise[]; scope: string }) {
  return (
    <div className="flex flex-col gap-6">
      <p className={cn(BODY, "text-muted-foreground")}>
        Paper first. Work each one before opening anything — the hints are a ladder, and the first rung only tells you where to start. If a
        pick-one goes wrong, the feedback says what that particular mistake usually means.
      </p>
      {exercises.map((ex, i) => (
        <ExerciseCard key={ex.id} ex={ex} n={i + 1} storageKey={`study:work:${scope}/${ex.id}`} />
      ))}
    </div>
  );
}
