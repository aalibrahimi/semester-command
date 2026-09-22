/**
 * Practice - the "Do it yourself" section at the end of a chapter.
 *
 * Called by: StudyRead (the section's "Do it yourself" exercises).
 * Calls: Inline (from Blocks).
 *
 * Each exercise is a card the reader works on paper first. A scratch box
 * keeps their working (localStorage, per exercise, best-effort). Hints open
 * one rung at a time : nudge → the usual mistake → how to think about it,
 * and only then the worked solution.
 *
 * Three kinds, all with a Submit button so you commit to an answer first:
 *   pick-one      choose, Submit, get that choice's feedback, Try again
 *   fill-in       type, Submit (or Enter), checked against `accept`
 *                 (numbers within 1%); two misses open the first hint
 *   write-it-out  type your answer, Submit reveals the worked solution
 *                 and you mark yourself: got it / not yet
 */
import { useEffect, useState } from "react";
import { Check, ChevronRight, Compass, CornerDownLeft, Eye, Lightbulb, RotateCcw, Send, TriangleAlert, X } from "lucide-react";
import { norm } from "@/study/drill";
import { cn } from "@/lib/utils";
import type { GuideExercise as Exercise } from "@/study/guide";
import { Inline } from "./Blocks";
import { CodeHighlight } from "./CodeHighlight";

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
    /* storage unavailable : scratch stays in memory */
  }
}

/** Fill-in check: normalised text match, or numbers within 1%. */
function matches(input: string, accept: string[]): boolean {
  const a = norm(input).replace(/\s+/g, "");
  if (!a) return false;
  const num = (x: string) => {
    const m = x.replace(/[, ]/g, "").match(/^-?\d*\.?\d+(e-?\d+)?/i);
    return m ? Number(m[0]) : NaN;
  };
  return accept.some((acc) => {
    const b = norm(acc).replace(/\s+/g, "");
    if (a === b) return true;
    const x = num(a);
    const y = num(b);
    if (!Number.isNaN(x) && !Number.isNaN(y) && a.replace(/^-?[\d.,e]+/i, "") === b.replace(/^-?[\d.,e]+/i, "")) {
      return Math.abs(x - y) <= Math.max(1e-9, Math.abs(y) * 0.01);
    }
    return false;
  });
}

const SUBMIT = "flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40";
const GHOST = "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost";

function ExerciseCard({ ex, n, storageKey }: { ex: Exercise; n: number; storageKey: string }) {
  const [rung, setRung] = useState(0); // how many hints are open
  const [solved, setSolved] = useState(false);
  const [selected, setSelected] = useState<number | null>(null); // highlighted, not yet submitted
  const [picked, setPicked] = useState<number | null>(null); // submitted choice
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [typed, setTyped] = useState("");
  const [fill, setFill] = useState<"idle" | "right" | "wrong">("idle");
  const [misses, setMisses] = useState(0);
  const [self, setSelf] = useState<"got" | "not" | null>(null);
  const [work, setWork] = useState(() => load(storageKey));
  const [showWork, setShowWork] = useState(() => !!load(storageKey));
  useEffect(() => save(storageKey, work), [storageKey, work]);

  const reset = () => {
    setRung(0);
    setSolved(false);
    setSelected(null);
    setPicked(null);
    setWrongPicks([]);
    setTyped("");
    setFill("idle");
    setMisses(0);
    setSelf(null);
  };
  const isChoice = !!ex.choices;
  const isFill = !isChoice && !!ex.accept?.length;
  const isOpen = !isChoice && !isFill;
  const correct = (isChoice && picked !== null && picked === ex.answer) || (isFill && fill === "right");

  const submitChoice = () => {
    if (selected === null) return;
    setPicked(selected);
    if (selected !== ex.answer) setWrongPicks((w) => (w.includes(selected) ? w : [...w, selected]));
  };
  const submitFill = () => {
    if (!typed.trim()) return;
    if (matches(typed, ex.accept ?? [])) setFill("right");
    else {
      setFill("wrong");
      setMisses((m) => {
        if (m + 1 >= 2) setRung((r) => Math.max(r, 1));
        return m + 1;
      });
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-card">
      <div className="flex items-baseline gap-3 border-b border-border/60 px-4 py-3">
        <span data-numeric className="font-mono text-xs text-muted-foreground">
          {n}
        </span>
        <div className="min-w-0 flex-1 text-sm font-medium">{ex.title}</div>
        {correct && <span className="flex items-center gap-1 text-2xs font-semibold text-on-track-fg"><Check className="h-3.5 w-3.5" /> correct</span>}
        {(rung > 0 || solved || picked !== null || fill !== "idle" || self !== null) && (
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
            <CodeHighlight text={ex.code} />
          </pre>
        )}

        {/* Pick-one: choose, then Submit */}
        {isChoice && (
          <div className="flex flex-col gap-2.5">
            <ol className="flex flex-col gap-2">
              {ex.choices!.map((c, i) => {
                // Only a submitted choice changes colour; a wrong pick must not reveal the right one.
                const state = picked === i ? (i === ex.answer ? "right" : "wrong") : wrongPicks.includes(i) ? "tried" : selected === i ? "selected" : "idle";
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={correct || state === "tried"}
                      onClick={() => {
                        setSelected(i);
                        if (picked !== null && picked !== ex.answer) setPicked(null);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-micro",
                        state === "right"
                          ? "border-on-track/60 bg-on-track/[0.1]"
                          : state === "wrong"
                            ? "border-at-risk/60 bg-at-risk/[0.1]"
                            : state === "selected"
                              ? "border-brand bg-brand/[0.1] ring-1 ring-brand/30"
                              : state === "tried"
                                ? "border-foreground/10 text-muted-foreground line-through decoration-at-risk/60"
                                : "border-foreground/15 hover:bg-fill-ghost/60",
                      )}
                    >
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-2xs", state === "selected" ? "border-brand bg-brand text-primary-foreground" : "border-foreground/25")}>
                        {state === "right" ? <Check className="h-3 w-3 text-on-track-fg" /> : state === "wrong" || state === "tried" ? <X className="h-3 w-3 text-at-risk-fg" /> : String.fromCharCode(65 + i)}
                      </span>
                      <span className="min-w-0">
                        <Inline text={c.text} />
                      </span>
                    </button>
                    {picked === i && (
                      <p className={cn("mt-1.5 pl-8 text-sm leading-relaxed", i === ex.answer ? "text-on-track-fg" : "text-at-risk-fg")}>
                        <Inline text={c.feedback} />
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            {!correct && (
              <div className="flex items-center gap-2">
                <button type="button" className={SUBMIT} disabled={selected === null || picked === selected} onClick={submitChoice}>
                  <Send className="h-3.5 w-3.5" /> Submit answer
                </button>
                {picked !== null && picked !== ex.answer && <span className="text-xs text-muted-foreground">Not quite. Read the feedback, pick again, and resubmit.</span>}
                {selected === null && picked === null && <span className="text-xs text-muted-foreground">Pick one, then submit.</span>}
              </div>
            )}
          </div>
        )}

        {/* Fill in the blank */}
        {isFill && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  if (fill === "wrong") setFill("idle");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitFill();
                }}
                disabled={fill === "right"}
                placeholder="Type your answer"
                aria-label="Your answer"
                className={cn(
                  "min-w-[14rem] flex-1 rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none",
                  fill === "right" ? "border-on-track/60 bg-on-track/[0.06]" : fill === "wrong" ? "border-at-risk/60" : "border-foreground/20 focus:border-brand/60",
                )}
              />
              {fill !== "right" && (
                <button type="button" className={SUBMIT} disabled={!typed.trim()} onClick={submitFill}>
                  <CornerDownLeft className="h-3.5 w-3.5" /> Submit
                </button>
              )}
            </div>
            {fill === "right" && (
              <p className="flex items-center gap-1.5 text-sm text-on-track-fg">
                <Check className="h-4 w-4" /> Correct. Open the full working below to check your steps.
              </p>
            )}
            {fill === "wrong" && (
              <p className="flex items-center gap-1.5 text-sm text-at-risk-fg">
                <X className="h-4 w-4" /> Not quite{misses >= 2 ? ". A hint is open below." : ". Try again, or take a hint."}
              </p>
            )}
          </div>
        )}

        {/* Write it out: submit your own answer, then compare */}
        {isOpen && !solved && (
          <div className="flex flex-col gap-2">
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              rows={3}
              placeholder="Write your answer here, then submit to compare with the worked solution."
              aria-label="Your answer"
              className="w-full resize-y rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand/60"
            />
            <div>
              <button type="button" className={SUBMIT} disabled={!typed.trim()} onClick={() => setSolved(true)}>
                <Send className="h-3.5 w-3.5" /> Submit and compare
              </button>
            </div>
          </div>
        )}

        {/* Scratch space: tucked away for quick questions, opens on demand */}
        {!isOpen && !showWork && (
          <button type="button" onClick={() => setShowWork(true)} className="self-start text-2xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            + scratch space for your working
          </button>
        )}
        {!isOpen && showWork && (
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
        )}

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
                {rung === 0 ? "I'm stuck, nudge me" : rung === 1 ? "Still stuck: what's the usual mistake?" : "Show me how to think about it"}
              </button>
            )}
            {!solved && (!isOpen || rung === RUNGS.length) && (
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
            {isOpen && typed.trim() && (
              <div className="rounded-lg border border-foreground/15 bg-foreground/[0.03] px-3.5 py-2.5">
                <div className="mb-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Your answer</div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{typed}</p>
              </div>
            )}
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
            {isOpen && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Did your answer match?</span>
                <button type="button" onClick={() => setSelf("got")} className={cn(GHOST, self === "got" && "border-on-track/60 bg-on-track/[0.1] text-on-track-fg")}>
                  <Check className="h-3.5 w-3.5" /> Got it
                </button>
                <button type="button" onClick={() => setSelf("not")} className={cn(GHOST, self === "not" && "border-at-risk/60 bg-at-risk/[0.1] text-at-risk-fg")}>
                  <X className="h-3.5 w-3.5" /> Not yet
                </button>
                {self === "not" && <span className="text-xs text-muted-foreground">Reset and try it again tomorrow; the hints stay.</span>}
              </div>
            )}
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
        Try each one yourself and press Submit. The hints are a ladder: the first only tells you where to start. A wrong pick tells you what
        that particular mistake usually means.
      </p>
      {exercises.map((ex, i) => (
        <ExerciseCard key={ex.id} ex={ex} n={i + 1} storageKey={`study:work:${scope}/${ex.id}`} />
      ))}
    </div>
  );
}
