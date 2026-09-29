/**
 * StudyOral: practice for an oral exam, the way it is actually run.
 *
 * Route: /study/:course/oral (courses with material in study/oral.ts)
 *
 * Called by: the router; linked from the course's Next exam card.
 * Calls: study/oral (concepts, problems, checklists). Records audio with
 * the browser's MediaRecorder when the microphone is allowed.
 *
 * One round = two timed parts. Explain: the concept, out loud, in 2
 * minutes. Apply: a fresh problem, out loud, in 3 minutes. After each part,
 * tick what you actually said against the checklist of a complete answer,
 * then compare with the model answer. Recording is optional: hearing
 * yourself is the fastest way to catch the "um, it's like, the thing" gaps.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Circle, Mic, MicOff, Pause, Play, RotateCcw, Shuffle, Square } from "lucide-react";
import { Inline } from "@/components/study/Blocks";
import { cn } from "@/lib/utils";
import { courseBySlug, daysUntil } from "@/study";
import { ORAL_APPLY_SECONDS, ORAL_EXPLAIN_SECONDS, oralConcepts, type OralConcept, type OralProblem } from "@/study/oral";

type Phase = "choose" | "explain" | "explain-check" | "apply" | "apply-check" | "done";

interface Round {
  concept: string;
  explain: number;
  explainOf: number;
  apply: number;
  applyOf: number;
  problem: number;
  at: string;
}

const HISTORY_KEY = "oral-history";
function readHistory(): Round[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Round[]) : [];
  } catch {
    return [];
  }
}
function saveRound(r: Round) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...readHistory(), r].slice(-200)));
  } catch {
    /* practice still works without history */
  }
}

/* ── Recording ─────────────────────────────────────────────────────────── */

function useRecorder() {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [on, setOn] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
        });
      };
      r.start();
      rec.current = r;
      setOn(true);
    } catch {
      setError("The microphone isn't available, so this round won't be recorded. Say it out loud anyway: that's the part that counts.");
    }
  }, []);

  const stop = useCallback(() => {
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    rec.current = null;
    setOn(false);
  }, []);

  const clear = useCallback(() => {
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, []);

  useEffect(() => () => {
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }, []);

  return { on, url, error, start, stop, clear };
}

/* ── Timer ─────────────────────────────────────────────────────────────── */

function useCountdown(seconds: number, running: boolean) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [running, paused]);
  const reset = useCallback((s: number) => {
    setLeft(s);
    setPaused(false);
  }, []);
  return { left, paused, setPaused, reset };
}

function Clock({ left, total }: { left: number; total: number }) {
  const over = left < 0;
  const shown = Math.abs(left);
  const r = 58, c = 2 * Math.PI * r;
  const frac = over ? 1 : Math.max(0, left / total);
  return (
    <div className="relative h-[148px] w-[148px] shrink-0">
      <svg viewBox="0 0 148 148" className="h-full w-full -rotate-90">
        <circle cx="74" cy="74" r={r} fill="none" strokeWidth="10" className="stroke-fill-ghost" />
        <circle cx="74" cy="74" r={r} fill="none" strokeWidth="10" strokeLinecap="round" className={cn("transition-[stroke-dashoffset] duration-1000 ease-linear", over ? "stroke-critical" : left <= 20 ? "stroke-at-risk" : "stroke-brand")} strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span data-numeric className={cn("font-mono text-3xl font-semibold tabular-nums", over && "text-critical-fg")}>
          {over ? "+" : ""}
          {Math.floor(shown / 60)}:{String(shown % 60).padStart(2, "0")}
        </span>
        <span className="text-2xs text-muted-foreground">{over ? "over time" : "left"}</span>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function StudyOral() {
  const { course: slug } = useParams();
  const course = courseBySlug(slug);
  const concepts = useMemo(() => oralConcepts(course?.slug), [course]);
  const [phase, setPhase] = useState<Phase>("choose");
  const [concept, setConcept] = useState<OralConcept | null>(null);
  const [problemIx, setProblemIx] = useState(0);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [explainScore, setExplainScore] = useState<[number, number]>([0, 0]);
  const [history, setHistory] = useState<Round[]>(readHistory);
  const recorder = useRecorder();
  const timed = phase === "explain" || phase === "apply";
  const total = phase === "apply" ? ORAL_APPLY_SECONDS : ORAL_EXPLAIN_SECONDS;
  const clock = useCountdown(total, timed);

  if (!course) return <Navigate to="/" replace />;
  if (concepts.length === 0) return <Navigate to={`/study/${course.slug}`} replace />;

  const problem: OralProblem | undefined = concept?.problems[problemIx];
  const lastFor = (id: string) => [...history].reverse().find((h) => h.concept === id);

  const begin = (c: OralConcept) => {
    // A fresh problem: not the one used last time for this concept.
    const last = lastFor(c.id)?.problem;
    const options = c.problems.map((_, i) => i).filter((i) => c.problems.length === 1 || i !== last);
    setConcept(c);
    setProblemIx(options[Math.floor(Math.random() * options.length)]);
    setTicked(new Set());
    recorder.clear();
    clock.reset(ORAL_EXPLAIN_SECONDS);
    setPhase("explain");
  };
  const toCheck = (next: Phase) => {
    recorder.stop();
    setTicked(new Set());
    setPhase(next);
  };
  const toApply = () => {
    setExplainScore([ticked.size, concept!.points.length]);
    setTicked(new Set());
    recorder.clear();
    clock.reset(ORAL_APPLY_SECONDS);
    setPhase("apply");
  };
  const finish = () => {
    const r: Round = { concept: concept!.id, explain: explainScore[0], explainOf: explainScore[1], apply: ticked.size, applyOf: problem!.checklist.length, problem: problemIx, at: new Date().toISOString() };
    saveRound(r);
    setHistory(readHistory());
    setPhase("done");
  };
  const toggle = (i: number) => setTicked((s) => {
    const n = new Set(s);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    return n;
  });

  const days = daysUntil(course.exam.date);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-6">
      <Link to={`/study/${course.slug}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {course.code}
      </Link>
      <h1 className="mt-3 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
        <Mic className="h-5 w-5 text-brand-fg" /> Oral exam practice
      </h1>
      <p className="mt-1 max-w-[80ch] text-sm text-muted-foreground">
        {course.exam.format} {days >= 0 && `${days} day${days === 1 ? "" : "s"} to go.`} Each round: explain a concept out loud in 2 minutes, then apply it to a fresh problem in 3. Speak, don't type.
      </p>

      {phase !== "choose" && concept && (
        <Stepper phase={phase} />
      )}

      {/* ── Choose ───────────────────────────────────────────────────── */}
      {phase === "choose" && (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">Pick your concept</h2>
            <button type="button" onClick={() => begin(concepts[Math.floor(Math.random() * concepts.length)])} className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost">
              <Shuffle className="h-3.5 w-3.5" /> Surprise me
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {concepts.map((c) => {
              const last = lastFor(c.id);
              return (
                <button key={c.id} type="button" onClick={() => begin(c)} className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 text-left shadow-card transition-colors hover:border-brand/50">
                  <span className="text-base font-semibold">{c.title}</span>
                  <span className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.prompt}</span>
                  <span className="mt-3 flex items-center gap-2 text-2xs text-muted-foreground">
                    {last ? (
                      <>
                        Last time: explained {last.explain}/{last.explainOf}, applied {last.apply}/{last.applyOf}
                      </>
                    ) : (
                      <>Not practiced yet</>
                    )}
                    <ArrowRight className="ml-auto h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Timed parts ──────────────────────────────────────────────── */}
      {timed && concept && (
        <section className="mt-6 rounded-2xl border border-border/70 bg-card p-6 shadow-card">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Clock left={clock.left} total={total} />
            <div className="min-w-0 flex-1">
              <div className="text-2xs font-medium uppercase tracking-wider text-brand-fg">{phase === "explain" ? "Part 1 · Explain" : "Part 2 · Apply it live"}</div>
              <p className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight">
                <Inline text={phase === "explain" ? concept.prompt : problem!.task} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {phase === "explain"
                  ? "Out loud, as if she just asked you. Definition first, then why it matters, then an example, then how you'd know."
                  : "Talk through every step and name the test you're using. 'How do you know?' is always the next question."}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {!recorder.on ? (
                  <button type="button" onClick={() => void recorder.start()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
                    <Circle className="h-3.5 w-3.5 fill-critical text-critical" /> Record myself
                  </button>
                ) : (
                  <button type="button" onClick={recorder.stop} className="flex items-center gap-1.5 rounded-lg border border-critical/50 bg-critical/10 px-3 py-2 text-xs font-medium text-critical-fg">
                    <Square className="h-3.5 w-3.5 fill-current" /> Recording… stop
                  </button>
                )}
                <button type="button" onClick={() => clock.setPaused(!clock.paused)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
                  {clock.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />} {clock.paused ? "Resume" : "Pause"}
                </button>
                <button type="button" onClick={() => toCheck(phase === "explain" ? "explain-check" : "apply-check")} className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
                  <Check className="h-3.5 w-3.5" /> I'm done, check me
                </button>
              </div>
              {recorder.error && (
                <p className="mt-3 flex items-start gap-2 text-2xs text-muted-foreground">
                  <MicOff className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {recorder.error}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Checks ───────────────────────────────────────────────────── */}
      {(phase === "explain-check" || phase === "apply-check") && concept && (
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold tracking-tight">Tick what you actually said</h2>
            <p className="mt-1 text-sm text-muted-foreground">Be strict: if you only hinted at it, leave it unticked.</p>
            {recorder.url && (
              <div className="mt-4">
                <div className="mb-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Your answer</div>
                <audio controls src={recorder.url} className="w-full" />
              </div>
            )}
            <ul className="mt-4 flex flex-col gap-2">
              {(phase === "explain-check" ? concept.points.map((p) => `**${p.label}.** ${p.detail}`) : problem!.checklist).map((item, i) => (
                <li key={i}>
                  <button type="button" onClick={() => toggle(i)} className={cn("flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-relaxed transition-colors", ticked.has(i) ? "border-on-track/50 bg-on-track/[0.08]" : "border-border/70 hover:bg-fill-ghost/60")}>
                    <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", ticked.has(i) ? "border-on-track bg-on-track text-background" : "border-foreground/30")}>
                      {ticked.has(i) && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <Inline text={item} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-5">
            {phase === "apply-check" && (
              <div className="rounded-2xl border border-brand/40 bg-brand/[0.04] p-6">
                <h2 className="font-display text-lg font-semibold tracking-tight">A model answer</h2>
                <p className="mt-2 text-sm leading-relaxed">
                  <Inline text={problem!.model} />
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-card">
              <div className="text-sm">
                You covered <span className="font-semibold">{ticked.size}</span> of {phase === "explain-check" ? concept.points.length : problem!.checklist.length}.
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {phase === "explain-check" ? "Whatever you missed, say it once out loud now, then go on to the live problem." : "Anything unticked is what she'll ask about next. Say it once now."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={phase === "explain-check" ? toApply : finish} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
                  {phase === "explain-check" ? "On to the live problem" : "Finish the round"} <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <Link to={`/study/${concept.guideId}?s=${concept.sectionId}`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
                  <BookOpen className="h-3.5 w-3.5" /> Review the chapter
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Done ─────────────────────────────────────────────────────── */}
      {phase === "done" && concept && (
        <section className="mt-6 rounded-2xl border border-border/70 bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">Round done: {concept.title}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Score label="Explain" got={explainScore[0]} of={explainScore[1]} />
            <Score label="Apply" got={ticked.size} of={problem!.checklist.length} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Rounds get easier fast: by the third time through a concept, most people cover everything. Try the same one again with a new problem, or switch.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => begin(concept)} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
              <RotateCcw className="h-3.5 w-3.5" /> Same concept, new problem
            </button>
            <button type="button" onClick={() => setPhase("choose")} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
              Pick another concept
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Stepper({ phase }: { phase: Phase }) {
  const steps: [Phase[], string][] = [
    [["explain"], "Explain · 2 min"],
    [["explain-check"], "Check"],
    [["apply"], "Apply · 3 min"],
    [["apply-check"], "Check"],
    [["done"], "Done"],
  ];
  const at = steps.findIndex(([ps]) => ps.includes(phase));
  return (
    <ol className="mt-5 flex flex-wrap items-center gap-2 text-2xs">
      {steps.map(([, label], i) => (
        <li key={i} className={cn("chip", i === at ? "bg-brand/[0.14] text-brand-fg" : i < at ? "bg-on-track/15 text-on-track-fg" : "bg-fill-ghost text-muted-foreground")}>
          {i < at && <Check className="h-3 w-3" />} {label}
        </li>
      ))}
    </ol>
  );
}

function Score({ label, got, of }: { label: string; got: number; of: number }) {
  const pct = of ? Math.round((got / of) * 100) : 0;
  return (
    <div className="rounded-xl border border-border/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span data-numeric className="font-display text-2xl font-semibold">
          {got}/{of}
        </span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-ghost">
        <div className={cn("h-full rounded-full", pct >= 80 ? "bg-on-track" : pct >= 50 ? "bg-at-risk" : "bg-critical")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
