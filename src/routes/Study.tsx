/**
 * Study — the course list (route "/study").
 *
 * Called by: the router.
 * Calls: src/study.
 *
 * One row per course: what's written, what's next, when the exam is. The
 * teaching lives one level down; this screen only has to answer "where do I
 * go tonight".
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, BookOpen, CalendarClock, CheckCircle2, ChevronRight, ListX, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { courses, daysUntil, formatDate } from "@/study";
import { guidesForCourse } from "@/study/loadGuides";
import { ago, courseProgress, stopRoute, type CourseProgress } from "@/study/progress";
import { attemptsRecent, examsRecent, reviewsAll, sectionsAll, type AttemptRecord } from "@/study/mastery";
import { plan, type Action } from "@/study/plan";
import { ProgressBar } from "@/components/study/ProgressBar";

const HUES: Record<string, number> = { hist15: 330, cs146: 217, ling112: 282, ling124: 172, ling115: 48, cs154: 200 };
export const courseTick = (slug: string) => ({ backgroundColor: `hsl(${HUES[slug] ?? 200} 60% 60% / 0.9)` });

/** Progress for every course, from the section rows. null until loaded. */
export function useAllProgress(): Record<string, CourseProgress> | null {
  const [by, setBy] = useState<Record<string, CourseProgress> | null>(null);
  useEffect(() => {
    let alive = true;
    void sectionsAll().then((rows) => {
      if (!alive) return;
      const out: Record<string, CourseProgress> = {};
      for (const c of courses) out[c.slug] = courseProgress(guidesForCourse(c.slug, c.guides), rows);
      setBy(out);
    });
    return () => {
      alive = false;
    };
  }, []);
  return by;
}

/** The "next 45 minutes" list: exam pressure × weakness, from the stores. */
function usePlan(): { actions: Action[]; mistakes: number; loaded: boolean } {
  const [state, setState] = useState<{ actions: Action[]; mistakes: number; loaded: boolean }>({ actions: [], mistakes: 0, loaded: false });
  useEffect(() => {
    let alive = true;
    void Promise.all([sectionsAll(), attemptsRecent(2000), reviewsAll(), examsRecent()]).then(([sections, attempts, reviews, exams]) => {
      if (!alive) return;
      const guidesByCourse: Record<string, ReturnType<typeof guidesForCourse>> = {};
      for (const c of courses) guidesByCourse[c.slug] = guidesForCourse(c.slug, c.guides);
      const actions = plan({ courses, guidesByCourse, sections, attempts, reviews, exams });
      const weekAgo = Date.now() - 7 * 86_400_000;
      const mistakes = attempts.filter((a: AttemptRecord) => !a.correct && new Date(a.at).getTime() > weekAgo).length;
      setState({ actions, mistakes, loaded: true });
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

const KIND_LABEL: Record<Action["kind"], string> = { drill: "Drill", recall: "Recall", reread: "Reread", read: "Read", mock: "Mock exam", mistakes: "Mistakes" };

const H2 = "text-2xs font-semibold uppercase tracking-wider text-foreground/70";
const CARD = "rounded-xl border border-foreground/15 bg-card shadow-sm";

function NextPanel({ actions, loaded }: { actions: Action[]; loaded: boolean }) {
  if (!loaded) return null;
  const total = actions.reduce((s, a) => s + a.minutes, 0);
  return (
    <section>
      <div className="flex items-baseline gap-3">
        <h2 className={cn(H2, "flex items-center gap-1.5")}>
          <Target className="h-3.5 w-3.5 text-brand-fg" /> What to do now
        </h2>
        {actions.length > 0 && (
          <span data-numeric className="font-mono text-2xs text-muted-foreground">
            ~{total} min
          </span>
        )}
      </div>
      {actions.length === 0 ? (
        <p className={cn(CARD, "mt-2 px-4 py-3 text-sm text-muted-foreground")}>Nothing pressing. Open a course and read the next section, or drill one you finished.</p>
      ) : (
        <ol className={cn(CARD, "mt-2 divide-y divide-foreground/10")}>
          {actions.map((a, i) => (
            <li key={a.to}>
              <Link to={a.to} className="group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-micro hover:bg-fill-ghost/60">
                <span data-numeric className="w-4 shrink-0 font-mono text-2xs text-muted-foreground">
                  {i + 1}
                </span>
                <span aria-hidden className="h-6 w-1 shrink-0 rounded-full" style={courseTick(a.course.slug)} />
                <span className="w-16 shrink-0 text-2xs font-semibold text-foreground/85">{a.course.code}</span>
                <span className="w-20 shrink-0 rounded bg-foreground/10 px-1 py-px text-center font-mono text-2xs uppercase tracking-wider text-foreground/70">{KIND_LABEL[a.kind]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{a.title.replace(/^[A-Za-z ]+: /, "")}</span>
                  <span className="block truncate text-2xs text-muted-foreground">{a.reason}</span>
                </span>
                <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">
                  {a.minutes} min
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function Study() {
  const progress = useAllProgress();
  const { actions, mistakes, loaded } = usePlan();
  const soon = courses
    .flatMap((c) => c.deadlines.map((d) => ({ ...d, course: c, days: daysUntil(d.date) })))
    .filter((d) => d.days >= 0 && d.days <= 7 && d.kind !== "other")
    .sort((a, b) => a.days - b.days);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 pb-16 pt-7">
      <h1 className="font-display text-xl font-semibold tracking-tight">Study</h1>
      <p className="mt-1 text-sm text-muted-foreground">Each course is a book of lectures, and every lecture also plays as slides.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-8">
          <NextPanel actions={actions} loaded={loaded} />

          <section>
            <h2 className={H2}>Courses</h2>
            <ul className="mt-2 grid gap-3 xl:grid-cols-2">
              {courses.map((c) => (
                <CourseCard key={c.slug} c={c} p={progress?.[c.slug]} />
              ))}
            </ul>
          </section>
        </div>

        {/* ── Rail ────────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          <OverallProgress progress={progress} />

          <section className={cn(CARD, "px-4 py-3.5")}>
            <h2 className={cn(H2, "flex items-center gap-1.5")}>
              <CalendarClock className="h-3.5 w-3.5" /> Due this week
            </h2>
            {soon.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nothing due in the next 7 days.</p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {soon.map((d, i) => (
                  <li key={i} className="flex items-center gap-2.5 border-b border-foreground/10 py-1.5 text-xs last:border-0">
                    <span aria-hidden className="h-4 w-1 shrink-0 rounded-full" style={courseTick(d.course.slug)} />
                    <span className="w-14 shrink-0 text-2xs font-semibold text-foreground/85">{d.course.code}</span>
                    <span className="min-w-0 flex-1 truncate" title={d.label}>
                      {d.label}
                    </span>
                    <span data-numeric className={cn("shrink-0 font-mono text-2xs", d.days <= 1 ? "text-critical-fg" : d.days <= 3 ? "text-at-risk-fg" : "text-muted-foreground")}>
                      {d.days === 0 ? "today" : d.days === 1 ? "tomorrow" : formatDate(d.date, "short")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Link to="/study/mistakes" className={cn(CARD, "group flex items-center gap-3 px-4 py-3 transition-colors duration-micro hover:bg-fill-ghost/60")}>
            <ListX className={cn("h-4 w-4 shrink-0", mistakes > 0 ? "text-at-risk-fg" : "text-muted-foreground")} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Mistake log</span>
              <span className="block text-2xs text-muted-foreground">
                {mistakes > 0 ? `${mistakes} wrong answer${mistakes === 1 ? "" : "s"} this week to retry` : "No misses this week"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

/** One course: who, when the exam is, how far along, where to pick up. */
function CourseCard({ c, p }: { c: (typeof courses)[number]; p?: CourseProgress }) {
  const days = daysUntil(c.exam.date);
  const warns = c.alerts?.filter((a) => a.kind === "warn").length ?? 0;
  const written = c.guides.length;
  const done = p && p.total > 0 && p.next === null;
  return (
    <li className={cn(CARD, "flex flex-col overflow-hidden")}>
      <Link to={`/study/${c.slug}`} className="group flex items-start gap-3 px-4 pb-3 pt-3.5 transition-colors duration-micro hover:bg-fill-ghost/60">
        <span aria-hidden className="mt-0.5 h-10 w-1 shrink-0 rounded-full" style={courseTick(c.slug)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base font-semibold tracking-tight">{c.code}</span>
            <span className="truncate text-2xs text-muted-foreground">{c.instructor}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/85">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            {written > 0 ? (
              <span>
                {written} chapter{written === 1 ? "" : "s"} written · {c.planned.length} to come
              </span>
            ) : (
              <span className="text-muted-foreground">Chapters coming · {c.planned.length} planned</span>
            )}
          </div>
          <div className="mt-0.5 truncate text-2xs text-muted-foreground">
            {c.exam.label} · {formatDate(c.exam.date)}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span data-numeric className={cn("font-mono text-sm font-semibold", days <= 7 ? "text-critical-fg" : days <= 21 ? "text-at-risk-fg" : "text-foreground/80")}>
            {days <= 0 ? "now" : `${days}d`}
          </span>
          {warns > 0 && (
            <span className="chip bg-at-risk/10 text-at-risk-fg">
              <AlertTriangle className="h-3 w-3" /> {warns}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-auto border-t border-foreground/10 px-4 pb-3.5 pt-3">
        {p && p.total > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <ProgressBar p={p} className="h-2 flex-1" />
              <span data-numeric className="shrink-0 font-mono text-xs font-semibold tabular-nums">
                {p.pct}%
              </span>
            </div>
            <div className="mt-1 flex justify-between text-2xs text-muted-foreground">
              <span data-numeric className="font-mono">
                {p.mastered}/{p.total} sections{p.shaky > 0 ? ` · ${p.shaky} shaky` : ""}
              </span>
              {p.last && <span>last studied {ago(p.last.at)}</span>}
            </div>
            {done ? (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-on-track-fg">
                <CheckCircle2 className="h-3.5 w-3.5" /> Every written chapter done. Keep it fresh with recall.
              </div>
            ) : (
              p.next && (
                <Link to={stopRoute(p.next)} className="group mt-2.5 flex items-center gap-2.5 rounded-lg border border-brand/40 bg-brand/[0.12] px-3 py-2 transition-colors duration-micro hover:bg-brand/[0.18]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-2xs font-semibold uppercase tracking-wider text-brand-fg">
                      {p.next.status === "shaky" ? "Fix next" : p.mastered + p.shaky === 0 ? "Start here" : "Up next"}
                    </span>
                    <span className="block truncate text-sm font-medium">{p.next.heading}</span>
                    <span className="block truncate text-2xs text-muted-foreground">
                      {p.next.guideLessons}, section {p.next.index}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-brand-solid px-2.5 py-1.5 text-xs font-medium text-primary-foreground group-hover:opacity-90">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              )
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No chapters written yet.</p>
        )}
      </div>
    </li>
  );
}

/** One bar for the whole semester, plus a bar per course underneath. */
function OverallProgress({ progress }: { progress: Record<string, CourseProgress> | null }) {
  if (!progress) return null;
  const all = Object.values(progress);
  const total = all.reduce((s, p) => s + p.total, 0);
  if (total === 0) return null;
  const mastered = all.reduce((s, p) => s + p.mastered, 0);
  const shaky = all.reduce((s, p) => s + p.shaky, 0);
  const pct = Math.round((mastered / total) * 100);
  const chaptersDone = all.reduce((s, p) => s + p.chapters.filter((c) => c.done).length, 0);
  const chapters = all.reduce((s, p) => s + p.chapters.length, 0);
  return (
    <section className={cn(CARD, "px-4 py-3.5")}>
      <div className="flex items-baseline justify-between">
        <h2 className={H2}>Semester progress</h2>
        <span data-numeric className="font-display text-2xl font-semibold tabular-nums">
          {pct}%
        </span>
      </div>
      <ProgressBar p={{ mastered, shaky, total }} className="mt-2 h-2.5" />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { n: mastered, l: "done", dot: "bg-on-track" },
          { n: shaky, l: "shaky", dot: "bg-at-risk/60" },
          { n: total - mastered - shaky, l: "to go", dot: "bg-foreground/15 ring-1 ring-foreground/30" },
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
          {chaptersDone}/{chapters}
        </span>{" "}
        chapters finished · {mastered}/{total} sections
      </p>
      <ul className="mt-3 flex flex-col gap-2.5 border-t border-foreground/10 pt-3">
        {courses.map((c) => {
          const p = progress[c.slug];
          return (
            <li key={c.slug}>
              <Link to={`/study/${c.slug}`} className="group block" title={`${c.code}: ${p?.mastered ?? 0} of ${p?.total ?? 0} sections done`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground/85 group-hover:text-foreground">{c.code}</span>
                  <span data-numeric className="font-mono text-2xs text-muted-foreground">
                    {p && p.total > 0 ? `${p.mastered}/${p.total} · ${p.pct}%` : "no chapters yet"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${p?.pct ?? 0}%`, ...courseTick(c.slug) }} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
