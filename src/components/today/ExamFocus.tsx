/**
 * ExamFocus: the top of Today in the two weeks before an exam.
 *
 * Called by: components/today/TodayView.tsx.
 * Calls: study/readiness (scores and the 20-minute plan), study/mastery,
 * study/lectureQueue (posted lectures with no chapter yet), study/oral.
 *
 * One card per exam within EXAM_WINDOW_DAYS, nearest first: days left,
 * how ready you are, and the first steps of today's plan, so the study
 * plan leads the page instead of sitting below the assignments.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Brain, Gauge, Mic, Presentation, Target, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/study";
import { upcomingExams } from "@/study/examWindow";
import { drillsForGuide } from "@/study/drills";
import { summariesForCourse } from "@/study/loadGuides";
import { attemptsRecent, reviewsAll, sectionsAll } from "@/study/mastery";
import { oralConcepts } from "@/study/oral";
import { readiness, type PlanStep, type Readiness } from "@/study/readiness";
import { useLectureQueue } from "@/study/lectureQueue";

const STEP_ICON: Record<PlanStep["kind"], typeof Target> = { drill: Target, reread: BookOpen, read: BookOpen, recall: Brain };

export function ExamFocus() {
  const [exams] = useState(() => upcomingExams());
  const [ready, setReady] = useState<Map<string, Readiness>>(new Map());
  const { waiting } = useLectureQueue();

  useEffect(() => {
    if (exams.length === 0) return;
    let alive = true;
    void Promise.all([sectionsAll(), attemptsRecent(3000), reviewsAll()]).then(([sections, attempts, reviews]) => {
      if (!alive) return;
      const m = new Map<string, Readiness>();
      for (const { c } of exams) {
        const guides = summariesForCourse(c.slug, c.guides);
        const drillSections = new Set(guides.flatMap((g) => drillsForGuide(g.id).map((d) => `${g.id}#${d.sectionRef}`)));
        m.set(c.slug, readiness({ guides, sections, attempts, reviews, drillSections }));
      }
      setReady(m);
    });
    return () => {
      alive = false;
    };
  }, [exams]);

  if (exams.length === 0) return null;

  return (
    <div className={cn("grid gap-5", exams.length > 1 && "lg:grid-cols-2", exams.length > 2 && "2xl:grid-cols-3")}>
      {exams.map(({ c, days }) => {
        const r = ready.get(c.slug);
        const pct = Math.round((r?.overall ?? 0) * 100);
        const posted = waiting.filter((w) => w.course?.slug === c.slug);
        const urgent = days <= 3;
        return (
          <section key={c.slug} className={cn("flex flex-col rounded-2xl border p-5 shadow-card", urgent ? "border-critical/40 bg-critical/[0.04]" : "border-brand/40 bg-brand/[0.04]")}>
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <span data-numeric className={cn("font-display text-4xl font-semibold leading-none tabular-nums", urgent ? "text-critical-fg" : "text-brand-fg")}>
                  {days}
                </span>
                <span className="mt-1 text-2xs text-muted-foreground">{days === 1 ? "day" : "days"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Exam coming up</div>
                <h2 className="truncate font-display text-lg font-semibold tracking-tight">
                  {c.code} {c.exam.label}
                </h2>
                <div className="text-2xs text-muted-foreground">{formatDate(c.exam.date)}</div>
              </div>
              <Link to={`/study/${c.slug}/ready`} className="flex shrink-0 flex-col items-end" title="How ready you are, topic by topic">
                <span data-numeric className="font-display text-2xl font-semibold tabular-nums">{r ? `${pct}%` : "·"}</span>
                <span className="text-2xs text-muted-foreground">ready</span>
              </Link>
            </div>

            {r && (
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-fill-ghost">
                <div className="bg-on-track" style={{ width: `${(r.counts.ready / Math.max(1, r.topics.length)) * 100}%` }} />
                <div className="bg-brand" style={{ width: `${(r.counts.ok / Math.max(1, r.topics.length)) * 100}%` }} />
                <div className="bg-at-risk" style={{ width: `${(r.counts.shaky / Math.max(1, r.topics.length)) * 100}%` }} />
                <div className="bg-critical" style={{ width: `${(r.counts.weak / Math.max(1, r.topics.length)) * 100}%` }} />
              </div>
            )}

            <div className="mt-4 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Today's 20 minutes</div>
            <ol className="mt-2 flex flex-col gap-1.5">
              {(r?.plan ?? []).slice(0, 3).map((s, i) => {
                const Icon = STEP_ICON[s.kind];
                return (
                  <li key={s.to}>
                    <Link to={s.to} className="group flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:border-brand/50">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-solid font-mono text-2xs text-primary-foreground">{i + 1}</span>
                      <Icon className="h-3.5 w-3.5 shrink-0 text-brand-fg" />
                      <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
                      <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">{s.minutes}m</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
              {r && r.plan.length === 0 && <li className="text-sm text-muted-foreground">No weak topics left. Take a mock exam to prove it.</li>}
            </ol>

            {posted.length > 0 && (
              <Link to="/study/lectures" className="mt-3 flex items-center gap-2 rounded-lg border border-at-risk/40 bg-at-risk/[0.06] px-3 py-2 text-xs text-at-risk-fg hover:bg-at-risk/[0.1]">
                <Presentation className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  {posted.length === 1 ? `${posted[0].label ?? posted[0].row.name} is posted but has no chapter yet` : `${posted.length} posted lectures have no chapter yet`}
                </span>
              </Link>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/study/${c.slug}/ready`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost">
                <Gauge className="h-3.5 w-3.5" /> Topic by topic
              </Link>
              {oralConcepts(c.slug).length > 0 ? (
                <Link to={`/study/${c.slug}/oral`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost">
                  <Mic className="h-3.5 w-3.5" /> Oral practice
                </Link>
              ) : (
                <Link to={`/study/${c.slug}/exam`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost">
                  <Timer className="h-3.5 w-3.5" /> Mock exam
                </Link>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
