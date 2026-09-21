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
import { AlertTriangle, BookOpen, ChevronRight, ListX, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { courses, daysUntil, formatDate } from "@/study";
import { guidesForCourse } from "@/study/loadGuides";
import { studySectionsAll } from "@/lib/ipc";
import { attemptsRecent, examsRecent, reviewsAll, sectionsAll, type AttemptRecord } from "@/study/mastery";
import { plan, type Action } from "@/study/plan";

const HUES: Record<string, number> = { hist15: 330, cs146: 217, ling112: 282, ling124: 172, ling115: 48, cs154: 200 };
export const courseTick = (slug: string) => ({ backgroundColor: `hsl(${HUES[slug] ?? 200} 60% 60% / 0.9)` });

/** Per-course reading progress: mastered / total sections across the
 *  written chapters. Counts come from the mastery store's section rows;
 *  totals from the guide content itself. */
function useCourseProgress(): Record<string, { mastered: number; shaky: number; total: number }> {
  const [bySlug, setBySlug] = useState<Record<string, { mastered: number; shaky: number; total: number }>>({});

  useEffect(() => {
    let alive = true;
    void studySectionsAll().then((rows) => {
      if (!alive) return;
      const byGuide = new Map<string, { mastered: number; shaky: number }>();
      for (const r of rows) {
        const g = byGuide.get(r.guideId) ?? { mastered: 0, shaky: 0 };
        if (r.status === "mastered") g.mastered += 1;
        else if (r.status === "shaky") g.shaky += 1;
        byGuide.set(r.guideId, g);
      }
      const out: Record<string, { mastered: number; shaky: number; total: number }> = {};
      for (const c of courses) {
        const guides = guidesForCourse(c.slug, c.guides);
        const total = guides.reduce((s, g) => s + g.sections.length, 0);
        let mastered = 0;
        let shaky = 0;
        for (const g of guides) {
          const counts = byGuide.get(g.id);
          if (counts) {
            mastered += counts.mastered;
            shaky += counts.shaky;
          }
        }
        out[c.slug] = { mastered, shaky, total };
      }
      setBySlug(out);
    });
    return () => {
      alive = false;
    };
  }, []);

  return bySlug;
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
  const progress = useCourseProgress();
  const soon = courses
    .flatMap((c) => c.deadlines.map((d) => ({ ...d, course: c, days: daysUntil(d.date) })))
    .filter((d) => d.days >= 0 && d.days <= 7 && d.kind !== "other")
    .sort((a, b) => a.days - b.days);

  return (
    <div className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-7">
      <h1 className="font-display text-xl font-semibold tracking-tight">Study</h1>
      <p className="mt-1 text-sm text-muted-foreground">Each course is a book of lectures, and every lecture also plays as slides.</p>

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
            return (
              <li key={c.slug}>
                <Link
                  to={`/study/${c.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3.5 transition-colors duration-micro hover:bg-fill-ghost/60"
                >
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
                    <CourseProgressBar p={progress[c.slug]} />
                  </div>
                  {warns > 0 && (
                    <span className="chip shrink-0 bg-at-risk/10 text-at-risk-fg">
                      <AlertTriangle className="h-3 w-3" /> {warns}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** A quiet two-tone strip: mastered solid, shaky faded, the rest empty.
 *  Absent entirely until something has been read — an all-empty bar on
 *  every row would just be furniture. */
function CourseProgressBar({ p }: { p?: { mastered: number; shaky: number; total: number } }) {
  if (!p || p.total === 0 || (p.mastered === 0 && p.shaky === 0)) return null;
  const masteredPct = (p.mastered / p.total) * 100;
  const shakyPct = (p.shaky / p.total) * 100;
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1 w-40 overflow-hidden rounded-full bg-fill-ghost">
        <div className="flex h-full">
          <div className="h-full bg-on-track" style={{ width: `${masteredPct}%` }} />
          <div className="h-full bg-at-risk/50" style={{ width: `${shakyPct}%` }} />
        </div>
      </div>
      <span data-numeric className="font-mono text-2xs tabular-nums text-muted-foreground">
        {p.mastered}/{p.total} mastered
      </span>
    </div>
  );
}
