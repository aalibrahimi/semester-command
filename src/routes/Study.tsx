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
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { courses, daysUntil, formatDate } from "@/study";

const HUES: Record<string, number> = { hist15: 330, cs146: 217, ling112: 282, ling124: 172, ling115: 48, cs154: 200 };
export const courseTick = (slug: string) => ({ backgroundColor: `hsl(${HUES[slug] ?? 200} 60% 60% / 0.9)` });

export default function Study() {
  const soon = courses
    .flatMap((c) => c.deadlines.map((d) => ({ ...d, course: c, days: daysUntil(d.date) })))
    .filter((d) => d.days >= 0 && d.days <= 7 && d.kind !== "other")
    .sort((a, b) => a.days - b.days);

  return (
    <div className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-7">
      <h1 className="font-display text-xl font-semibold tracking-tight">Study</h1>
      <p className="mt-1 text-sm text-muted-foreground">Each course is a book of lectures, and every lecture also plays as slides.</p>

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
            const written = c.chapters.length;
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
