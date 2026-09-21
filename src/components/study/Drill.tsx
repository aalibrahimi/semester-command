/**
 * Drill — "Put it to the test": generated, checked practice right after a
 * section's blocks, and the full-screen focus mode built on the same card.
 *
 * Called by: StudyRead (panel under the section, focus overlay).
 * Calls: study/drill.ts (generate + grade), study/mastery.ts (attempt log,
 * section status), Inline (from Blocks).
 *
 * Loop: fresh instance → answer → checked at once. Right: a short "why" and
 * Next. Wrong: the drill names the mistake when it can, then one retry, a
 * nudge, and only then the worked solution. Every answer is logged, and a
 * run of GOAL correct answers in a section offers "Got it".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Eye, Lightbulb, Maximize2, RotateCcw, Target, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Drill, DrillAnswer, DrillInstance, GradeResult } from "@/study/drill";
import { grade as gradeAnswer, randomSeed, rng } from "@/study/drill";
import { drillStats, recordAttempt, setSectionStatus, type GuideMastery } from "@/study/mastery";
import { Inline } from "./Blocks";

/** Correct answers in a row that count as "you can do this section". */
export const GOAL = 5;

const BODY = "text-[15px] leading-[1.75] text-foreground/90";

/* ── Picking the next drill: weakest first, then variety ────────────────── */

function pickNext(drills: Drill[], mastery: GuideMastery, sectionId: string, avoid?: string): Drill {
  if (drills.length === 1) return drills[0];
  const scored = drills
    .filter((d) => d.id !== avoid)
    .map((d) => {
      const s = drillStats(mastery, sectionId, d.id);
      return { d, key: s.streak * 10 + Math.min(s.tries, 9) };
    })
    .sort((a, b) => a.key - b.key);
  // Among the weakest few, vary.
  const floor = scored[0].key;
  const pool = scored.filter((x) => x.key === floor);
  return pool[Math.floor(Math.random() * pool.length)].d;
}

/* ── Answer inputs ─────────────────────────────────────────────────────── */

export function AnswerInput({
  answer,
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  answer: DrillAnswer;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, answer]);

  if (answer.kind === "choice") {
    return (
      <ol className="flex flex-col gap-2">
        {answer.options.map((o, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(String(i));
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-micro",
                value === String(i) ? "border-brand bg-brand/[0.08]" : "border-border/70 hover:bg-fill-ghost/60",
                disabled && "opacity-80",
              )}
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-2xs">{String.fromCharCode(65 + i)}</span>
              <span className="min-w-0">
                <Inline text={o} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    );
  }

  if (answer.kind === "checklist") {
    const ticked = new Set(value ? value.split(",").map(Number) : []);
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Read your answer back. Tick what it contains, honestly.</p>
        {answer.items.map((it, i) => (
          <label key={i} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/70 px-3 py-2 text-sm hover:bg-fill-ghost/60", ticked.has(i) && "border-brand/60 bg-brand/[0.06]")}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={ticked.has(i)}
              onChange={(e) => {
                const next = new Set(ticked);
                if (e.target.checked) next.add(i);
                else next.delete(i);
                onChange([...next].sort((a, b) => a - b).join(","));
              }}
              className="mt-1 accent-[rgb(var(--brand))]"
            />
            <span className="min-w-0">
              <Inline text={it} />
            </span>
          </label>
        ))}
      </div>
    );
  }

  const placeholder =
    answer.kind === "number"
      ? answer.unit
        ? `number, in ${answer.unit}`
        : "number"
      : answer.kind === "set"
        ? (answer.placeholder ?? "items, comma-separated, any order")
        : answer.kind === "sequence"
          ? (answer.placeholder ?? "in order, comma-separated")
          : answer.kind === "custom"
            ? (answer.placeholder ?? "your answer")
            : (answer.placeholder ?? "your answer");
  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 font-mono text-[13.5px] outline-none focus:border-brand/60 disabled:opacity-70"
      />
      {answer.kind === "number" && answer.unit && <span className="shrink-0 font-mono text-xs text-muted-foreground">{answer.unit}</span>}
    </div>
  );
}

/* ── One drill card ────────────────────────────────────────────────────── */

type Phase = "answering" | "right" | "wrong" | "revealed";

interface CardState {
  drill: Drill;
  seed: number;
  inst: DrillInstance;
  shownAt: number;
}

function make(drill: Drill, seed = randomSeed()): CardState {
  return { drill, seed, inst: drill.gen(rng(seed)), shownAt: Date.now() };
}

/** A specific instance to open with (the mistake log's "retry this exact problem"). */
export interface DrillReplay {
  drillId: string;
  seed: number;
}

export function DrillCard({
  guide,
  sectionId,
  drills,
  mastery,
  onAnswered,
  compact,
  source = "read",
  replay,
}: {
  guide: { id: string };
  sectionId: string;
  drills: Drill[];
  mastery: GuideMastery;
  onAnswered?: (correct: boolean) => void;
  compact?: boolean;
  source?: "read" | "focus";
  replay?: DrillReplay;
}) {
  const fromReplay = () => {
    const d = replay && drills.find((x) => x.id === replay.drillId);
    return d ? make(d, replay.seed) : make(pickNext(drills, mastery, sectionId));
  };
  const [card, setCard] = useState<CardState>(fromReplay);
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [diagnosis, setDiagnosis] = useState<string | undefined>();
  const [retries, setRetries] = useState(0);
  const [hint, setHint] = useState(false);
  const [why, setWhy] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  // New section (or a replay request) → new card.
  useEffect(() => {
    setCard(fromReplay());
    setValue("");
    setPhase("answering");
    setResult(null);
    setDiagnosis(undefined);
    setRetries(0);
    setHint(false);
    setWhy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, drills, replay?.drillId, replay?.seed]);

  const next = useCallback(() => {
    setCard(make(pickNext(drills, mastery, sectionId, card.drill.id)));
    setValue("");
    setPhase("answering");
    setResult(null);
    setDiagnosis(undefined);
    setRetries(0);
    setHint(false);
    setWhy(false);
  }, [drills, mastery, sectionId, card.drill.id]);

  const submit = useCallback(async () => {
    if (phase !== "answering" || value.trim() === "") return;
    const g = gradeAnswer(card.inst.answer, value);
    // Diagnose sees what the reader meant: the option's text for a choice, the raw input otherwise.
    const meant = card.inst.answer.kind === "choice" ? (card.inst.answer.options[Number(value)] ?? value) : value;
    const diag = g.correct ? undefined : card.inst.diagnose?.(meant);
    setResult(g);
    setDiagnosis(diag);
    setPhase(g.correct ? "right" : "wrong");
    onAnswered?.(g.correct);
    await recordAttempt({
      guideId: guide.id,
      sectionId,
      drillId: card.drill.id,
      seed: card.seed,
      correct: g.correct,
      input: g.input,
      expected: g.expected,
      diagnosis: diag ?? null,
      ms: Date.now() - card.shownAt,
      source,
    });
  }, [phase, value, card, guide.id, sectionId, onAnswered, source]);

  // Enter advances once the answer is checked.
  useEffect(() => {
    if (phase === "answering") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (phase === "right" || phase === "revealed")) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next]);

  const a = card.inst.answer;
  const fb = a.kind === "choice" && result ? a.feedback?.[Number(value)] : undefined;
  const missing = a.kind === "checklist" && phase === "wrong" ? a.items.filter((_, i) => !value.split(",").map(Number).includes(i)) : [];
  const stats = drillStats(mastery, sectionId, card.drill.id);

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-card">
      <div className="flex items-baseline gap-3 border-b border-border/60 px-4 py-3">
        <Zap className="h-3.5 w-3.5 shrink-0 self-center text-brand-fg" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{card.drill.title}</div>
          {!compact && <div className="text-2xs text-muted-foreground">{card.drill.skill}</div>}
        </div>
        {stats.tries > 0 && (
          <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground" title="right / tried, this drill">
            {stats.correct}/{stats.tries}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <p className={BODY}>
          <Inline text={card.inst.prompt} />
        </p>
        {card.inst.code && (
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background px-3.5 py-3 font-mono text-[12.5px] leading-relaxed">{card.inst.code}</pre>
        )}

        <AnswerInput answer={a} value={value} onChange={setValue} onSubmit={() => void submit()} disabled={phase !== "answering"} />

        {/* Hint (only while answering, only on request) */}
        {hint && card.inst.hint && phase === "answering" && (
          <aside className="rounded-lg border border-brand/30 bg-brand/[0.06] px-3.5 py-2.5 text-sm leading-relaxed">
            <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-brand-fg">Nudge</span>
            <Inline text={card.inst.hint} />
          </aside>
        )}

        {/* Verdict */}
        {phase === "right" && result && (
          <div className="rounded-lg border border-on-track/50 bg-on-track/[0.08] px-3.5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-on-track-fg">
              <Check className="h-4 w-4" /> Right.
              {fb && (
                <span className="font-normal text-foreground/80">
                  <Inline text={fb} />
                </span>
              )}
            </div>
            {!why ? (
              <button type="button" onClick={() => setWhy(true)} className="mt-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline">
                Show why, step by step
              </button>
            ) : (
              <Steps steps={card.inst.steps} />
            )}
          </div>
        )}

        {phase === "wrong" && result && (
          <div className="rounded-lg border border-at-risk/50 bg-at-risk/[0.08] px-3.5 py-3">
            <div className="flex items-start gap-2 text-sm">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-at-risk-fg" />
              <div className="min-w-0">
                <div className="font-medium text-at-risk-fg">Not yet.</div>
                {diagnosis ? (
                  <p className="mt-0.5 leading-relaxed text-foreground/90">
                    <Inline text={diagnosis} />
                  </p>
                ) : fb ? (
                  <p className="mt-0.5 leading-relaxed text-foreground/90">
                    <Inline text={fb} />
                  </p>
                ) : missing.length > 0 ? (
                  <div className="mt-0.5 leading-relaxed text-foreground/90">
                    Your answer is missing:
                    <ul className="mt-1 list-disc pl-5">
                      {missing.map((m, i) => (
                        <li key={i}>
                          <Inline text={m} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-0.5 leading-relaxed text-foreground/90">
                    You answered <code className="rounded bg-background px-1 font-mono text-[12.5px]">{result.input || "nothing"}</code>. Look at what the question is
                    actually asking for, then try once more.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === "revealed" && result && (
          <div className="rounded-lg border border-border bg-fill-ghost/60 px-3.5 py-3">
            <div className="text-sm">
              <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Answer</span>
              <span className="font-medium">
                <Inline text={result.expected} />
              </span>
            </div>
            <Steps steps={card.inst.steps} />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {phase === "answering" && (
            <>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={value.trim() === ""}
                className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Check <kbd className="ml-1 font-mono text-2xs opacity-60">↵</kbd>
              </button>
              {card.inst.hint && !hint && (
                <button type="button" onClick={() => setHint(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
                  <Lightbulb className="h-3.5 w-3.5" /> Nudge me
                </button>
              )}
              {retries > 0 && <span className="text-2xs text-muted-foreground">Try {retries + 1}</span>}
            </>
          )}
          {phase === "wrong" && (
            <>
              {retries < 1 && a.kind !== "choice" && (
                <button
                  type="button"
                  onClick={() => {
                    setRetries((r) => r + 1);
                    setPhase("answering");
                    setResult(null);
                    if (card.inst.hint) setHint(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Try once more
                </button>
              )}
              <button type="button" onClick={() => setPhase("revealed")} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
                <Eye className="h-3.5 w-3.5" /> Show the working
              </button>
            </>
          )}
          {(phase === "right" || phase === "revealed") && (
            <button ref={nextRef} type="button" onClick={next} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
              {phase === "revealed" ? "Another one like it" : "Next"} <ArrowRight className="h-3.5 w-3.5" /> <kbd className="ml-1 font-mono text-2xs opacity-60">↵</kbd>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-2 flex flex-col gap-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
          <span data-numeric className="mt-[0.2em] w-4 shrink-0 text-right font-mono text-2xs text-muted-foreground">
            {i + 1}
          </span>
          <span className="min-w-0">
            <Inline text={s} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ── Streak / goal strip ───────────────────────────────────────────────── */

function Goal({ streak, tries, correct }: { streak: number; tries: number; correct: number }) {
  const reached = streak >= GOAL;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" aria-label={`${Math.min(streak, GOAL)} of ${GOAL} in a row`}>
        {Array.from({ length: GOAL }, (_, i) => (
          <span key={i} className={cn("h-2 w-6 rounded-full transition-colors duration-micro", i < streak ? "bg-on-track" : "bg-border")} />
        ))}
      </div>
      <span data-numeric className="font-mono text-2xs text-muted-foreground">
        {reached ? `${streak} in a row` : `${streak} / ${GOAL} in a row`}
        {tries > 0 && ` · ${correct}/${tries} overall`}
      </span>
    </div>
  );
}

/* ── The panel under a section ─────────────────────────────────────────── */

export function DrillPanel({
  guide,
  sectionId,
  drills,
  mastery,
  onFocus,
  replay,
}: {
  guide: { id: string };
  sectionId: string;
  drills: Drill[];
  mastery: GuideMastery;
  onFocus: () => void;
  replay?: DrillReplay;
}) {
  const stats = drillStats(mastery, sectionId);
  const reached = stats.streak >= GOAL;
  const status = mastery.sections[sectionId]?.status ?? "unread";
  return (
    <section id="drills" className="mt-10">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Target className="h-4 w-4 text-brand-fg" /> Put it to the test
        </h3>
        <span className="text-2xs text-muted-foreground">
          {drills.length} {drills.length === 1 ? "drill" : "drills"}, endless variants
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Goal streak={stats.streak} tries={stats.tries} correct={stats.correct} />
          <button type="button" onClick={onFocus} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost" title="Just the drill, full screen">
            <Maximize2 className="h-3.5 w-3.5" /> Focus
          </button>
        </div>
      </div>
      <p className={cn(BODY, "mb-4 text-muted-foreground")}>
        You just read it. Now do it, before it fades. Each answer is checked the moment you submit; a miss tells you what went wrong, not just that it did.
      </p>
      {replay && (
        <p className="mb-2 text-2xs text-muted-foreground">Replaying the exact problem you missed. After this one, fresh variants.</p>
      )}
      <DrillCard guide={guide} sectionId={sectionId} drills={drills} mastery={mastery} replay={replay} />
      {reached && status !== "mastered" && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-on-track/50 bg-on-track/[0.08] px-3.5 py-2.5 text-sm">
          <Check className="h-4 w-4 text-on-track-fg" />
          <span>
            {GOAL} in a row. You can do this section.
          </span>
          <button
            type="button"
            onClick={() => void setSectionStatus(guide.id, sectionId, "mastered")}
            className="ml-auto rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Mark Got it
          </button>
        </div>
      )}
    </section>
  );
}

/* ── Focus mode: the drill and nothing else ────────────────────────────── */

export function DrillFocus({
  guide,
  sectionHeading,
  sectionId,
  drills,
  mastery,
  onExit,
}: {
  guide: { id: string; title: string };
  sectionHeading: string;
  sectionId: string;
  drills: Drill[];
  mastery: GuideMastery;
  onExit: () => void;
}) {
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  const [session, setSession] = useState({ tries: 0, correct: 0 });
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);
  const stats = drillStats(mastery, sectionId);
  const secs = Math.floor((now - started) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const reached = stats.streak >= GOAL;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-4 border-b border-border/60 px-6 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{sectionHeading}</div>
          <div className="truncate text-2xs text-muted-foreground">{guide.title}</div>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <Goal streak={stats.streak} tries={stats.tries} correct={stats.correct} />
          <span data-numeric className="font-mono text-xs text-muted-foreground">
            {mm}:{ss}
          </span>
          <span data-numeric className="font-mono text-2xs text-muted-foreground">
            this run {session.correct}/{session.tries}
          </span>
          <button type="button" onClick={onExit} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost">
            <X className="h-3.5 w-3.5" /> Exit <kbd className="ml-1 font-mono text-2xs opacity-60">esc</kbd>
          </button>
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[720px]">
          <DrillCard
            guide={guide}
            sectionId={sectionId}
            drills={drills}
            mastery={mastery}
            source="focus"
            onAnswered={(ok) => setSession((s) => ({ tries: s.tries + 1, correct: s.correct + (ok ? 1 : 0) }))}
          />
          {reached && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-on-track/50 bg-on-track/[0.08] px-3.5 py-2.5 text-sm">
              <Check className="h-4 w-4 text-on-track-fg" /> {GOAL} in a row. Keep going, or exit and mark the section Got it.
              <button
                type="button"
                onClick={() => {
                  void setSectionStatus(guide.id, sectionId, "mastered");
                  onExit();
                }}
                className="ml-auto rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Got it, exit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Drills for one section, from a guide's set. */
export function drillsFor(all: Drill[] | undefined, sectionId: string): Drill[] {
  return (all ?? []).filter((d) => d.sectionRef === sectionId);
}

export type { Drill };
