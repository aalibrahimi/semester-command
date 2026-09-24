/**
 * StudyCourse — one course: its lectures (the book) and its exam tab
 * (route "/study/:course").
 *
 * Called by: the router.
 * Calls: src/study.
 *
 * Wide layout: the chapters on the left, a sticky rail on the right that
 * always answers "how far am I, what's next, when is the exam".
 * Lectures tab: every written chapter with its bar and a checklist of its
 * sections (click one to jump in), then the lectures still to be written.
 * Exam tab: format, alerts, checklist, with the dates in the rail.
 */
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDot,
  Clock,
  Info,
  PencilLine,
  Presentation,
  RotateCcw,
  Target,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { guidesForCourse } from "@/study/loadGuides";
import { courseBySlug, daysUntil, formatDate } from "@/study";
import type { Course } from "@/study/types";
import type { Guide } from "@/study/guide";
import type { SectionStatus } from "@/study/mastery";
import type { Action } from "@/study/plan";
import { ago, stopRoute, type ChapterProgress, type CourseProgress } from "@/study/progress";
import { ProgressBar } from "@/components/study/ProgressBar";
import { courseTick } from "@/components/study/courseTick";
import { useCourses } from "@/hooks/useCourses";
import { parseCourseLabel } from "@/lib/courseLabel";
import { useCourseData } from "@/hooks/useCourseStudy";

const KIND_LABEL: Record<Action["kind"], string> = { drill: "Drill", recall: "Recall", reread: "Reread", read: "Read", mock: "Mock", mistakes: "Mistakes" };


const H2 = "text-2xs font-semibold uppercase tracking-wider text-foreground/70";
const CARD = "rounded-xl border border-foreground/15 bg-card shadow-sm";

/**
 * /study/:course: the study guide now lives on the course's own page
 * (Study tab), so this route forwards there when Canvas knows the course.
 * Without a synced course (fresh install, calendar-feed only) the guide
 * still opens here on its own.
 */
export default function StudyCourse() {
  const { course: slug } = useParams();
  const c = courseBySlug(slug);
  const { courses, loaded } = useCourses();
  if (!c) return <Navigate to="/" replace />;
  const canvas = courses.find((x) => parseCourseLabel(x.courseCode ?? x.name).code?.toLowerCase().replace(/[^a-z0-9]/g, "") === c.slug);
  if (canvas) return <Navigate to={`/courses/${canvas.id}?tab=study`} replace />;
  if (!loaded) return null;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 pb-16 pt-6">
      <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Today
      </Link>

      <div className="mt-4 flex items-start gap-3">
        <span aria-hidden className="mt-1.5 h-10 w-1 shrink-0 rounded-full" style={courseTick(c.slug)} />
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {c.code} <span className="font-sans text-base font-normal text-muted-foreground">{c.title}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{c.instructor}</p>
        </div>
      </div>

      <StudyCourseView key={c.slug} c={c} />
    </div>
  );
}

/**
 * The course's study material: Lectures / Exam tabs, the chapter list and
 * the rail. Used by the /study/:course page and, embedded, by the Study tab
 * of a course's page (CourseDetail).
 */
export function StudyCourseView({ c, embedded }: { c: Course; embedded?: boolean }) {
  const [guides] = useState(() => guidesForCourse(c.slug, c.guides));
  const [tab, setTab] = useState<"lectures" | "exam">("lectures");
  const { prog, actions } = useCourseData(c, guides);

  const warns = c.alerts?.filter((a) => a.kind === "warn") ?? [];
  const infos = c.alerts?.filter((a) => a.kind === "info") ?? [];

  return (
    <div>
      <div className={cn("flex gap-1 border-b border-foreground/15", embedded ? "mt-0" : "mt-6")}>
        {(["lectures", "exam"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors duration-micro",
              tab === t ? "border-brand font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "lectures" ? "Lectures" : "Exam"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Main column ─────────────────────────────────────────────── */}
        {tab === "lectures" ? (
          <div className="flex min-w-0 flex-col gap-8">
            {guides.length > 0 && (
              <section>
                <h2 className={H2}>Written</h2>
                <ul className="mt-2 flex flex-col gap-3">
                  {guides.map((ch) => (
                    <ChapterCard key={ch.id} ch={ch} cp={prog?.chapters.find((x) => x.guideId === ch.id)} here={prog?.next?.guideId === ch.id} nextSection={prog?.next?.sectionId} guides={guides} />
                  ))}
                </ul>
              </section>
            )}

            {c.planned.length > 0 && (
              <section>
                <h2 className={H2}>{guides.length > 0 ? "Still to write" : "Planned"}</h2>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {c.planned.map((p, i) => (
                    <li key={i} className="flex items-baseline gap-3 rounded-lg border border-dashed border-foreground/20 px-3.5 py-2.5 text-sm text-muted-foreground">
                      <span className="w-20 shrink-0 font-mono text-2xs">{p.label}</span>
                      <span className="min-w-0">{p.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-8">
            <section>
              <h2 className={H2}>How {c.instructor.split(" ").pop()} tests</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-foreground/90">{c.howTheyTest}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight">{c.exam.label}</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">{c.exam.format}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/80">Covers: </span>
                {c.exam.covers}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.weights.map((w) => (
                  <span key={w.label} className="chip bg-fill-ghost text-muted-foreground">
                    {w.label} <span className="font-mono text-foreground/80">{w.pct}</span>
                  </span>
                ))}
              </div>
            </section>

            {warns.length > 0 && (
              <section className="rounded-xl border border-at-risk/35 bg-at-risk/[0.06] px-4 py-3">
                <h2 className="text-2xs font-medium uppercase tracking-wider text-at-risk-fg">Fix these first</h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {warns.map((a, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-at-risk-fg" /> <span>{a.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className={H2}>Before the exam, you can…</h2>
              <ul className="mt-2 grid gap-x-6 gap-y-2 xl:grid-cols-2">
                {c.checklist.map((it, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                    <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" /> <span>{it}</span>
                  </li>
                ))}
              </ul>
            </section>

            {infos.length > 0 && (
              <section>
                <h2 className={H2}>Good to know</h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {infos.map((a, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/80">
                      <Info className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> <span>{a.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* ── Rail ────────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          {prog && prog.total > 0 && <ProgressCard prog={prog} />}
          <ExamCard c={c} />
          {tab === "lectures" && actions.length > 0 && <DoNextCard actions={actions} />}
          <DatesCard c={c} all={tab === "exam"} />
          <Link to="/study/mistakes" className={cn(CARD, "flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors duration-micro hover:bg-fill-ghost/60")}>
            Mistake log: every drill you missed
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

/* ── Chapter card ───────────────────────────────────────────────────────── */

const STATUS_ICON: Record<SectionStatus, { icon: typeof Circle; cls: string; label: string }> = {
  mastered: { icon: CheckCircle2, cls: "text-on-track-fg", label: "done" },
  shaky: { icon: CircleDot, cls: "text-at-risk-fg", label: "shaky" },
  unread: { icon: Circle, cls: "text-foreground/40", label: "not started" },
};

function ChapterCard({ ch, cp, here, nextSection, guides }: { ch: Guide; cp?: ChapterProgress; here: boolean; nextSection?: string; guides: Guide[] }) {
  const started = cp ? cp.mastered + cp.shaky > 0 : false;
  return (
    <li className={cn("rounded-xl border bg-card px-5 py-4 shadow-sm", here ? "border-brand ring-2 ring-brand/25" : "border-foreground/15")}>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xs text-muted-foreground">{ch.lessons}</span>
        <span className="flex items-center gap-1 font-mono text-2xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {ch.estimatedMinutes} min
        </span>
        {ch.exercises.length ? (
          <span className="flex items-center gap-1 font-mono text-2xs text-brand-fg">
            <PencilLine className="h-3 w-3" /> {ch.exercises.length} to do yourself
          </span>
        ) : null}
        {cp?.done ? (
          <span className="ml-auto flex items-center gap-1 text-2xs font-medium text-on-track-fg">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        ) : here ? (
          <span className="ml-auto rounded-full bg-brand/20 px-2 py-0.5 text-2xs font-semibold text-brand-fg">Continue here</span>
        ) : null}
      </div>

      <div className="mt-1 grid gap-x-8 gap-y-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left: what the chapter is */}
        <div className="min-w-0">
          <div className="text-base font-medium">{ch.title}</div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ch.summary}</p>
          {ch.requires.length > 0 && (
            <p className="mt-1.5 text-2xs text-muted-foreground">
              Read first:{" "}
              {ch.requires.map((r, i) => {
                const req = guides.find((x) => x.id === r);
                return (
                  <span key={r}>
                    {i > 0 && ", "}
                    <Link to={`/study/${r}`} className="underline underline-offset-2 hover:text-foreground">
                      {req?.lessons ?? r}
                    </Link>
                  </span>
                );
              })}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              to={cp?.next && started ? stopRoute(cp.next) : `/study/${ch.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <BookOpen className="h-3.5 w-3.5" /> {cp?.done ? "Review" : started ? `Resume at ${cp?.next?.index}` : "Read"}
            </Link>
            <Link to={`/study/${ch.id}/slides`} className="flex items-center gap-1.5 rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium text-foreground/90 hover:bg-fill-ghost">
              <Presentation className="h-3.5 w-3.5" /> Slides
            </Link>
            <Link to={`/study/${ch.id}/recall`} className="flex items-center gap-1.5 rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium text-foreground/90 hover:bg-fill-ghost">
              <RotateCcw className="h-3.5 w-3.5" /> Recall
            </Link>
          </div>
        </div>

        {/* Right: the sections, as a checklist */}
        {cp && (
          <div className="min-w-0 xl:border-l xl:border-foreground/10 xl:pl-6">
            <div className="flex items-center gap-3">
              <ProgressBar p={cp} className="flex-1" />
              <span data-numeric className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
                {cp.mastered}/{cp.total}
                {cp.shaky > 0 ? ` · ${cp.shaky} shaky` : ""}
              </span>
            </div>
            <ol className="mt-2 flex flex-col">
              {cp.sections.map((s, i) => {
                const S = STATUS_ICON[s.status];
                const isNext = here && s.id === nextSection;
                return (
                  <li key={s.id}>
                    <Link
                      to={`/study/${ch.id}?s=${s.id}`}
                      title={`${s.heading} (${S.label})`}
                      className={cn(
                        "group -mx-2 flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors duration-micro hover:bg-fill-ghost/70",
                        isNext && "bg-brand/[0.15] font-medium",
                      )}
                    >
                      <S.icon className={cn("h-3.5 w-3.5 shrink-0", S.cls)} />
                      <span className="w-4 shrink-0 font-mono text-2xs text-muted-foreground">{i + 1}</span>
                      <span className={cn("min-w-0 flex-1 truncate", s.status === "mastered" ? "text-muted-foreground" : "text-foreground/90")}>{s.heading}</span>
                      {isNext && <span className="shrink-0 text-2xs font-medium text-brand-fg">next</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </li>
  );
}

/* ── Rail cards ─────────────────────────────────────────────────────────── */

function ProgressCard({ prog }: { prog: CourseProgress }) {
  const chaptersDone = prog.chapters.filter((x) => x.done).length;
  return (
    <section className={cn(CARD, "px-4 py-3.5")}>
      <div className="flex items-baseline justify-between">
        <h2 className={H2}>Your progress</h2>
        <span data-numeric className="font-display text-2xl font-semibold tabular-nums">
          {prog.pct}%
        </span>
      </div>
      <ProgressBar p={prog} className="mt-2 h-2.5" />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { n: prog.mastered, l: "done", dot: "bg-on-track" },
          { n: prog.shaky, l: "shaky", dot: "bg-at-risk/60" },
          { n: prog.total - prog.mastered - prog.shaky, l: "to go", dot: "bg-foreground/15 ring-1 ring-foreground/30" },
        ].map((x) => (
          <div key={x.l} className="flex flex-col-reverse rounded-lg border border-foreground/10 bg-foreground/[0.04] py-1.5">
            <dt className="flex items-center justify-center gap-1 text-2xs text-muted-foreground">
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", x.dot)} />
              {x.l}
            </dt>
            <dd data-numeric className="font-mono text-base font-semibold tabular-nums">
              {x.n}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-2xs text-muted-foreground">
        <span data-numeric className="font-mono">
          {chaptersDone}/{prog.chapters.length}
        </span>{" "}
        chapters finished{prog.last ? ` · last studied ${ago(prog.last.at)}` : ""}
      </p>
      {prog.next ? (
        <Link to={stopRoute(prog.next)} className="group mt-3 block rounded-lg border border-brand/40 bg-brand/[0.12] px-3 py-2.5 transition-colors duration-micro hover:bg-brand/[0.18]">
          <div className="text-2xs font-medium uppercase tracking-wider text-brand-fg">{prog.next.status === "shaky" ? "Fix next" : "Up next"}</div>
          <div className="mt-0.5 text-sm font-medium leading-snug">{prog.next.heading}</div>
          <div className="mt-1 flex items-center justify-between gap-2 text-2xs text-muted-foreground">
            <span className="truncate">
              {prog.next.guideLessons}, section {prog.next.index}
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-brand-solid px-2 py-1 font-medium text-primary-foreground group-hover:opacity-90">
              Continue <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-on-track-fg">
          <CheckCircle2 className="h-4 w-4" /> Every written chapter done.
        </p>
      )}
    </section>
  );
}

function ExamCard({ c }: { c: Course }) {
  const days = daysUntil(c.exam.date);
  const tone = days <= 7 ? "text-critical-fg" : days <= 21 ? "text-at-risk-fg" : "text-foreground";
  return (
    <section className={cn(CARD, "px-4 py-3.5")}>
      <h2 className={H2}>Next exam</h2>
      <div className="mt-1.5 flex items-end gap-3">
        <div className="text-center">
          <div data-numeric className={cn("font-display text-3xl font-semibold leading-none tabular-nums", tone)}>
            {Math.max(0, days)}
          </div>
          <div className="mt-1 text-2xs text-muted-foreground">{days === 1 ? "day" : "days"}</div>
        </div>
        <div className="min-w-0 pb-0.5">
          <div className="truncate text-sm font-medium">{c.exam.label}</div>
          <div className="text-2xs text-muted-foreground">{formatDate(c.exam.date)}</div>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-2xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground/80">Covers: </span>
        {c.exam.covers}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to={`/study/${c.slug}/exam`} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
          <Timer className="h-3.5 w-3.5" /> Mock exam
        </Link>
        <Link to={`/study/${c.slug}/recall`} className="flex items-center justify-center gap-1.5 rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost">
          <RotateCcw className="h-3.5 w-3.5" /> Recall all
        </Link>
      </div>
    </section>
  );
}

function DoNextCard({ actions }: { actions: Action[] }) {
  return (
    <section className={CARD}>
      <h2 className={cn(H2, "flex items-center gap-1.5 px-4 pt-3.5")}>
        <Target className="h-3.5 w-3.5 text-brand-fg" /> Do next
      </h2>
      <ol className="mt-1.5 divide-y divide-foreground/10 pb-1">
        {actions.map((a) => (
          <li key={a.to}>
            <Link to={a.to} className="group flex items-center gap-2.5 px-4 py-2 transition-colors duration-micro hover:bg-fill-ghost/60">
              <span className="w-14 shrink-0 rounded bg-foreground/10 px-1 py-px text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">{KIND_LABEL[a.kind]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs">{a.title.replace(/^[A-Za-z ]+: /, "")}</span>
                <span className="block truncate text-2xs text-muted-foreground">
                  {a.minutes} min · {a.reason.split(" · ")[0]}
                </span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DatesCard({ c, all }: { c: Course; all: boolean }) {
  const rows = c.deadlines.map((d) => ({ ...d, days: daysUntil(d.date) }));
  const shown = all ? rows : rows.filter((d) => d.days >= 0).slice(0, 5);
  if (shown.length === 0) return null;
  return (
    <section className={cn(CARD, "px-4 py-3.5")}>
      <h2 className={cn(H2, "flex items-center gap-1.5")}>
        <CalendarClock className="h-3.5 w-3.5" /> {all ? "Dates" : "Coming up"}
      </h2>
      <ol className="mt-2 flex flex-col">
        {shown.map((d, i) => (
          <li key={i} className="flex items-baseline gap-3 border-b border-foreground/10 py-1.5 text-xs last:border-0">
            <span
              data-numeric
              className={cn(
                "w-12 shrink-0 whitespace-nowrap font-mono text-2xs",
                d.days < 0 ? "text-muted-foreground/50 line-through" : d.days <= 2 ? "text-critical-fg" : d.days <= 7 ? "text-at-risk-fg" : "text-muted-foreground",
              )}
            >
              {formatDate(d.date, "short")}
            </span>
            <span className={cn("min-w-0 flex-1", d.kind === "exam" && "font-semibold")}>{d.label}</span>
            {d.weight && <span className="shrink-0 font-mono text-2xs text-muted-foreground">{d.weight}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
