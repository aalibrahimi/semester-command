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
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, ChevronRight, ListX, Target } from "lucide-react";
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

function NextPanel() {
  const { actions, mistakes, loaded } = usePlan();
  if (!loaded) return null;
  const total = actions.reduce((s, a) => s + a.minutes, 0);
  return (
    <section className="mt-8">
      <div className="flex items-baseline gap-3">
        <h2 className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          <Target className="h-3.5 w-3.5 text-brand-fg" /> What to do now
        </h2>
        {actions.length > 0 && (
          <span data-numeric className="font-mono text-2xs text-muted-foreground">
            ~{total} min
          </span>
        )}
        <Link to="/study/mistakes" className="ml-auto flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground">
          <ListX className="h-3.5 w-3.5" /> {mistakes > 0 ? `${mistakes} mistake${mistakes === 1 ? "" : "s"} this week` : "Mistake log"}
        </Link>
      </div>
      {actions.length === 0 ? (
        <p className="mt-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
          Nothing pressing. Open a course and read the next section, or drill one you finished.
        </p>
      ) : (
        <ol className="mt-2 divide-y divide-border/50 rounded-xl border border-border/60 bg-card">
          {actions.map((a, i) => (
            <li key={a.to}>
              <Link to={a.to} className="group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-micro hover:bg-fill-ghost/60">
                <span data-numeric className="w-4 shrink-0 font-mono text-2xs text-muted-foreground">
                  {i + 1}
                </span>
                <span aria-hidden className="h-4 w-1 shrink-0 rounded-full" style={courseTick(a.course.slug)} />
                <span className="w-16 shrink-0 text-2xs font-semibold text-foreground/80">{a.course.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    <span className="mr-1.5 rounded bg-fill-ghost px-1 py-px font-mono text-2xs uppercase tracking-wider text-muted-foreground">{KIND_LABEL[a.kind]}</span>
                    {a.title.replace(/^[A-Za-z ]+: /, "")}
                  </span>
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
  const soon = courses
    .flatMap((c) => c.deadlines.map((d) => ({ ...d, course: c, days: daysUntil(d.date) })))
    .filter((d) => d.days >= 0 && d.days <= 7 && d.kind !== "other")
    .sort((a, b) => a.days - b.days);

  return (
    <div className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-7">
      <h1 className="font-display text-xl font-semibold tracking-tight">Study</h1>
      <p className="mt-1 text-sm text-muted-foreground">Each course is a book of lectures, and every lecture also plays as slides.</p>

      <OverallProgress progress={progress} />

      <NextPanel />

      {soon.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Due this week</h2>
          <ul className="mt-2 divide-y divide-border/50 rounded-xl border border-border/60 bg-card">
            {soon.map((d, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span aria-hidden className="h-4 w-1 shrink-0 rounded-full" style={courseTick(d.course.slug)} />
                <span className="w-16 shrink-0 text-2xs font-semibold text-foreground/80">{d.course.code}</span>
                <span className="min-w-0 flex-1 truncate">{d.label}</span>
                <span
                  data-numeric
                  className={cn("shrink-0 font-mono text-2xs", d.days <= 1 ? "text-critical-fg" : d.days <= 3 ? "text-at-risk-fg" : "text-muted-foreground")}
                >
                  {d.days === 0 ? "today" : d.days === 1 ? "tomorrow" : formatDate(d.date, "short")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Courses</h2>
        <ul className="mt-2 flex flex-col gap-3">
          {courses.map((c) => {
            const days = daysUntil(c.exam.date);
            const warns = c.alerts?.filter((a) => a.kind === "warn").length ?? 0;
            const written = c.guides.length;
            const p = progress?.[c.slug];
            return (
              <li key={c.slug} className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <Link to={`/study/${c.slug}`} className="group flex items-center gap-4 px-4 pb-2.5 pt-3.5 transition-colors duration-micro hover:bg-fill-ghost/60">
                  <span aria-hidden className="h-9 w-1 shrink-0 rounded-full" style={courseTick(c.slug)} />
                  <div className="w-[7.5rem] shrink-0">
                    <div className="font-display text-base font-semibold tracking-tight">{c.code}</div>
                    <div className="truncate text-2xs text-muted-foreground">{c.instructor}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      {written > 0 ? (
                        <span>
                          {written} chapter{written === 1 ? "" : "s"} written · {c.planned.length} to come
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Chapters coming · {c.planned.length} planned</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-2xs text-muted-foreground">
                      {c.exam.label} · {formatDate(c.exam.date)} ·{" "}
                      <span data-numeric className={cn("font-mono", days <= 7 ? "text-critical-fg" : days <= 21 ? "text-at-risk-fg" : "")}>
                        {days <= 0 ? "now" : `${days} days`}
                      </span>
                    </div>
                  </div>
                  {warns > 0 && (
                    <span className="chip shrink-0 bg-at-risk/10 text-at-risk-fg">
                      <AlertTriangle className="h-3 w-3" /> {warns}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
                </Link>
                {p && p.total > 0 && <CourseProgressRow p={p} />}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Under each course: the bar, the count, and where to pick up. */
function CourseProgressRow({ p }: { p: CourseProgress }) {
  const done = p.next === null;
  return (
    <div className="border-t border-border/50 px-4 pb-3 pt-2.5 pl-9">
      <div className="flex items-center gap-3">
        <ProgressBar p={p} className="flex-1" />
        <span data-numeric className="w-[9.5rem] shrink-0 text-right font-mono text-2xs tabular-nums text-muted-foreground">
          {p.mastered}/{p.total} done · <span className={cn(p.pct > 0 && "text-on-track-fg")}>{p.pct}%</span>
        </span>
      </div>
      {done ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-on-track-fg">
          <CheckCircle2 className="h-3.5 w-3.5" /> Every written chapter done. Keep it fresh with recall.
        </div>
      ) : (
        p.next && (
          <Link to={stopRoute(p.next)} className="group mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 text-xs transition-colors duration-micro hover:bg-fill-ghost/60">
            <span className="shrink-0 font-medium text-brand-fg">{p.next.status === "shaky" ? "Fix next" : p.mastered + p.shaky === 0 ? "Start" : "Next"}</span>
            <span className="min-w-0 flex-1 truncate">
              {p.next.heading}
              <span className="text-muted-foreground"> · {p.next.guideLessons}, section {p.next.index}</span>
            </span>
            {p.last && <span className="hidden shrink-0 text-2xs text-muted-foreground sm:inline">last studied {ago(p.last.at)}</span>}
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-brand-solid px-2 py-1 text-2xs font-medium text-primary-foreground group-hover:opacity-90">
              Continue <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        )
      )}
    </div>
  );
}

/** One bar for the whole semester, plus the per-course split underneath. */
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
    <section className="mt-6 rounded-xl border border-border/60 bg-card px-4 py-3.5">
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Semester progress</h2>
        <span data-numeric className="ml-auto font-display text-lg font-semibold tabular-nums">
          {pct}%
        </span>
      </div>
      <ProgressBar p={{ mastered, shaky, total }} className="mt-2 h-2.5" />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-on-track" />
          <span data-numeric className="font-mono">{mastered}</span> sections done
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-at-risk/60" />
          <span data-numeric className="font-mono">{shaky}</span> shaky
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-fill-ghost ring-1 ring-border" />
          <span data-numeric className="font-mono">{total - mastered - shaky}</span> not started
        </span>
        <span className="ml-auto">
          <span data-numeric className="font-mono">{chaptersDone}/{chapters}</span> chapters finished
        </span>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-2">
        {courses.map((c) => {
          const p = progress[c.slug];
          return (
            <Link key={c.slug} to={`/study/${c.slug}`} className="group min-w-0" title={`${c.code}: ${p?.mastered ?? 0} of ${p?.total ?? 0} sections done`}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-2xs font-semibold text-foreground/80 group-hover:text-foreground">{c.code}</span>
                <span data-numeric className="font-mono text-2xs text-muted-foreground">
                  {p && p.total > 0 ? `${p.pct}%` : "–"}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-fill-ghost">
                <div className="h-full rounded-full" style={{ width: `${p?.pct ?? 0}%`, ...courseTick(c.slug) }} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
