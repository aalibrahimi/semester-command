/**
 * StudyExam — a timed mock exam for one course, in the professor's shape.
 *
 * Route: /study/:course/exam
 *
 * Called by: the router, StudyCourse ("Mock exam").
 * Calls: study/exam.ts (build, grade, breakdown), study/drills, study/mastery
 * (attempt log with source "exam", exam record, Recall routing), AnswerInput
 * and Steps from components/study/Drill.
 *
 * Three phases. Intro: format, question count, clock, Start. Running: one
 * question per screen, no feedback until the end, a countdown, Enter to
 * submit and move on; the clock running out submits what is there. Results:
 * score, weakest sections first with links into the book, every miss with
 * the diagnosis and the worked solution, and the misses pushed to the front
 * of Recall (their section's checks get an "Again").
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Clock, FileCheck2, Play, RotateCcw, X } from "lucide-react";
import { AnswerInput, Steps } from "@/components/study/Drill";
import { Inline } from "@/components/study/Blocks";
import { cn } from "@/lib/utils";
import { courseBySlug, formatDate, daysUntil } from "@/study";
import type { CheckBlock } from "@/study/guide";
import { drillsForGuide } from "@/study/drills";
import { breakdown as buildBreakdown, buildExam, examFormat, gradeItem, type ExamAnswer, type ExamItem } from "@/study/exam";
import { guidesForCourse } from "@/study/loadGuides";
import { recordAttempt, recordExam, recordReview } from "@/study/mastery";

const BODY = "text-[15px] leading-[1.75] text-foreground/90";

function clock(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

type Phase = "intro" | "running" | "results";

export default function StudyExam() {
  const { course: cslug } = useParams();
  const course = courseBySlug(cslug);
  const guides = useMemo(() => (course ? guidesForCourse(course.slug, course.guides) : []), [course]);
  const fmt = examFormat(course?.slug ?? "");
  const pool = useMemo(() => guides.map((g) => ({ guide: g, drills: drillsForGuide(g.id) })).filter((x) => x.drills.length > 0), [guides]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [length, setLength] = useState<"short" | "full">("full");
  const [items, setItems] = useState<ExamItem[]>([]);
  const [answers, setAnswers] = useState<(ExamAnswer | null)[]>([]);
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [left, setLeft] = useState(0);
  const startedAt = useRef<string>("");
  const shownAt = useRef(0);
  const total = useRef(0);
  const [saved, setSaved] = useState(false);

  const n = length === "full" ? fmt.questions : Math.max(5, Math.round(fmt.questions / 2));

  const start = () => {
    const built = buildExam(pool, n);
    setItems(built);
    setAnswers(built.map(() => null));
    setI(0);
    setValue("");
    total.current = built.length * fmt.secondsPer;
    setLeft(total.current);
    startedAt.current = new Date().toISOString();
    shownAt.current = Date.now();
    setSaved(false);
    setPhase("running");
  };

  const finish = useCallback(
    (finalAnswers: (ExamAnswer | null)[]) => {
      setAnswers(finalAnswers);
      setPhase("results");
    },
    [],
  );

  const submit = useCallback(() => {
    if (phase !== "running") return;
    const it = items[i];
    const a = gradeItem(it, value, Date.now() - shownAt.current);
    const next = answers.slice();
    next[i] = a;
    void recordAttempt({
      guideId: it.guideId,
      sectionId: it.sectionId,
      drillId: it.drill.id,
      seed: it.seed,
      correct: a.correct,
      input: a.input,
      expected: a.expected,
      diagnosis: a.diagnosis ?? null,
      ms: a.ms,
      source: "exam",
    });
    if (i + 1 >= items.length) finish(next);
    else {
      setAnswers(next);
      setI(i + 1);
      setValue("");
      shownAt.current = Date.now();
    }
  }, [phase, items, i, value, answers, finish]);

  // Countdown; hitting zero submits what is there.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish(answers);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  // Persist the result once, and push misses to the front of Recall.
  useEffect(() => {
    if (phase !== "results" || saved || !course) return;
    setSaved(true);
    const correct = answers.filter((a) => a?.correct).length;
    const bd = buildBreakdown(items, answers);
    void recordExam({
      course: course.slug,
      startedAt: startedAt.current,
      finishedAt: new Date().toISOString(),
      total: items.length,
      correct,
      seconds: total.current - left,
      breakdown: JSON.stringify(bd),
    });
    const missedSections = new Set(items.filter((_, k) => !answers[k]?.correct).map((it) => `${it.guideId}#${it.sectionId}`));
    for (const key of missedSections) {
      const [gid, sid] = key.split("#");
      const g = guides.find((x) => x.id === gid);
      const sec = g?.sections.find((s) => s.id === sid);
      const checks = (sec?.blocks.filter((b): b is CheckBlock => b.type === "check") ?? []).slice(0, 2);
      for (const c of checks) void recordReview(gid, c.id, 0);
    }
  }, [phase, saved, answers, items, course, guides, left]);

  if (!course) return <Navigate to="/" replace />;

  const days = daysUntil(course.exam.date);

  /* ── Intro ─────────────────────────────────────────────────────────── */
  if (phase === "intro") {
    const totalDrills = pool.reduce((s, p) => s + p.drills.length, 0);
    return (
      <div className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-6">
        <Link to={`/study/${course.slug}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {course.code}
        </Link>
        <h1 className="mt-3 font-display text-xl font-semibold tracking-tight">Mock exam · {course.code}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {course.exam.label} is {formatDate(course.exam.date)} ({days <= 0 ? "now" : `${days} days`}). This is a rehearsal in the same shape.
        </p>

        <section className="mt-6 rounded-xl border border-border/60 bg-card px-5 py-4">
          <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">How {course.instructor.split(" ").pop()} tests</h2>
          <p className={cn(BODY, "mt-1.5")}>{fmt.blurb}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{course.exam.format}</p>
        </section>

        <section className="mt-5 rounded-xl border border-border/60 bg-card px-5 py-4">
          <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">This mock</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["full", "short"] as const).map((l) => {
              const q = l === "full" ? fmt.questions : Math.max(5, Math.round(fmt.questions / 2));
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={cn("rounded-lg border px-3 py-2 text-left text-sm", length === l ? "border-brand bg-brand/[0.08]" : "border-border/70 hover:bg-fill-ghost/60")}
                >
                  <div className="font-medium">{l === "full" ? "Full length" : "Short"}</div>
                  <div className="text-2xs text-muted-foreground">
                    {q} questions · {clock(q * fmt.secondsPer)}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Drawn from {totalDrills} drills across {pool.length} written chapter{pool.length === 1 ? "" : "s"}, spread evenly and shuffled. No feedback until the end. Unanswered when the clock
            runs out counts as wrong. Every miss goes to the front of Recall.
          </p>
          {pool.length < guides.length && (
            <p className="mt-2 text-2xs text-at-risk-fg">
              {guides.length - pool.length} written chapter{guides.length - pool.length === 1 ? " has" : "s have"} no drills yet and can't be tested here.
            </p>
          )}
        </section>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={pool.length === 0}
            className="flex items-center gap-2 rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <Play className="h-4 w-4" /> Start the clock
          </button>
          <span className="text-2xs text-muted-foreground">Paper and pen next to you, like the real one.</span>
        </div>
      </div>
    );
  }

  /* ── Running ───────────────────────────────────────────────────────── */
  if (phase === "running") {
    const it = items[i];
    const warn = left <= 60;
    return (
      <div className="mx-auto flex w-full max-w-[820px] flex-col px-8 pb-16 pt-6">
        <header className="flex items-center gap-4 border-b border-border/60 pb-3">
          <div className="min-w-0">
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Mock exam · {course.code}</div>
            <div className="truncate text-sm font-medium">
              Question {i + 1} of {items.length}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex gap-0.5" aria-hidden>
              {items.map((_, k) => (
                <span key={k} className={cn("h-1.5 w-3 rounded-full", k < i ? "bg-foreground/40" : k === i ? "bg-brand" : "bg-border")} />
              ))}
            </div>
            <span data-numeric className={cn("flex items-center gap-1.5 font-mono text-sm", warn ? "text-critical-fg" : "text-muted-foreground")}>
              <Clock className="h-3.5 w-3.5" /> {clock(left)}
            </span>
          </div>
        </header>

        <div className="mt-8 rounded-xl border border-border/70 bg-card shadow-card">
          <div className="border-b border-border/60 px-5 py-3 text-2xs text-muted-foreground">
            {it.guideTitle} · {it.sectionHeading}
          </div>
          <div className="flex flex-col gap-4 px-5 py-5">
            <p className={BODY}>
              <Inline text={it.inst.prompt} />
            </p>
            {it.inst.code && <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background px-3.5 py-3 font-mono text-[12.5px] leading-relaxed">{it.inst.code}</pre>}
            <AnswerInput answer={it.inst.answer} value={value} onChange={setValue} onSubmit={submit} disabled={false} />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={submit}
                className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                {i + 1 >= items.length ? "Submit exam" : "Next question"} <ArrowRight className="h-3.5 w-3.5" /> <kbd className="ml-1 font-mono text-2xs opacity-60">↵</kbd>
              </button>
              <span className="text-2xs text-muted-foreground">{value.trim() === "" ? "Blank counts as wrong." : "No feedback until the end."}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Results ───────────────────────────────────────────────────────── */
  const correct = answers.filter((a) => a?.correct).length;
  const pct = items.length ? Math.round((100 * correct) / items.length) : 0;
  const bd = buildBreakdown(items, answers);
  const misses = items.map((it, k) => ({ it, a: answers[k], k })).filter((x) => !x.a?.correct);
  const used = total.current - left;

  return (
    <div className="mx-auto w-full max-w-[820px] px-8 pb-16 pt-6">
      <Link to={`/study/${course.slug}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {course.code}
      </Link>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Mock exam · {course.code}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clock(used)} used of {clock(total.current)}.
          </p>
        </div>
        <div className={cn("ml-auto rounded-xl border px-5 py-3 text-right", pct >= 85 ? "border-on-track/50 bg-on-track/[0.08]" : pct >= 70 ? "border-at-risk/50 bg-at-risk/[0.08]" : "border-critical/50 bg-critical/[0.08]")}>
          <div data-numeric className="font-display text-3xl font-semibold tracking-tight">
            {correct}/{items.length}
          </div>
          <div className="text-2xs text-muted-foreground">{pct}% · {pct >= 85 ? "exam-ready on this material" : pct >= 70 ? "passing, not safe" : "not yet"}</div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">By section, weakest first</h2>
        <ul className="mt-2 divide-y divide-border/50 rounded-xl border border-border/60 bg-card">
          {bd.map((b) => {
            const g = guides.find((x) => x.id === b.guideId);
            const sec = g?.sections.find((s) => s.id === b.sectionId);
            const p = b.correct / b.asked;
            return (
              <li key={`${b.guideId}#${b.sectionId}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span data-numeric className={cn("w-10 shrink-0 font-mono text-xs", p === 1 ? "text-on-track-fg" : p >= 0.5 ? "text-at-risk-fg" : "text-critical-fg")}>
                  {b.correct}/{b.asked}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted-foreground">{g?.title ?? b.guideId} · </span>
                  {sec?.heading ?? b.sectionId}
                </span>
                <Link to={`/study/${b.guideId}?s=${b.sectionId}`} className="shrink-0 text-2xs text-brand-fg underline-offset-2 hover:underline">
                  {p < 1 ? "Reread and drill" : "Read"}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {misses.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            What you missed ({misses.length}) · now at the front of Recall
          </h2>
          <ol className="mt-2 flex flex-col gap-3">
            {misses.map(({ it, a, k }) => (
              <MissCard key={k} n={k + 1} item={it} answer={a} />
            ))}
          </ol>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setPhase("intro")} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
          <RotateCcw className="h-3.5 w-3.5" /> Take another
        </button>
        <Link to={`/study/${course.slug}`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
          <FileCheck2 className="h-3.5 w-3.5" /> Back to {course.code}
        </Link>
      </div>
    </div>
  );
}

function MissCard({ n, item, answer }: { n: number; item: ExamItem; answer: ExamAnswer | null }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-border/70 bg-card">
      <div className="flex items-baseline gap-3 border-b border-border/60 px-4 py-2.5">
        <span data-numeric className="font-mono text-xs text-muted-foreground">
          {n}
        </span>
        <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">
          {item.guideTitle} · {item.sectionHeading}
        </span>
        <Link to={`/study/${item.guideId}?s=${item.sectionId}`} className="shrink-0 text-2xs text-brand-fg underline-offset-2 hover:underline">
          Reread
        </Link>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <p className="text-sm leading-relaxed">
          <Inline text={item.inst.prompt} />
        </p>
        {item.inst.code && <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-[12px] leading-relaxed">{item.inst.code}</pre>}
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-start gap-2 text-at-risk-fg">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You: <span className="font-mono text-[12.5px]">{answer?.input || "blank"}</span>
              {answer?.diagnosis && (
                <span className="text-foreground/85">
                  {" "}
                  · <Inline text={answer.diagnosis} />
                </span>
              )}
            </span>
          </div>
          <div className="flex items-start gap-2 text-on-track-fg">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Answer: <Inline text={answer?.expected ?? ""} />
            </span>
          </div>
        </div>
        {open ? <Steps steps={item.inst.steps} /> : (
          <button type="button" onClick={() => setOpen(true)} className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
            Show the working
          </button>
        )}
      </div>
    </li>
  );
}
