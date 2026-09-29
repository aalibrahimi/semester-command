/**
 * StudyReady: "am I ready for the exam?" for one course.
 *
 * Route: /study/:course/ready
 *
 * Called by: the router; linked from the course's Next exam card.
 * Calls: study/readiness (the scoring and the 20-minute plan), study/mastery
 * (sections, attempts, reviews), study/loadGuides (summaries), study/drills.
 *
 * Three things on one page: how ready you are overall, what to do in the
 * next 20 minutes, and every exam topic with its own score and the reasons
 * behind it, so a number is never a mystery.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, Brain, Clock, Gauge, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { courseBySlug, daysUntil } from "@/study";
import { drillsForGuide } from "@/study/drills";
import { summariesForCourse, useGuideIndexVersion } from "@/study/loadGuides";
import { attemptsRecent, reviewsAll, sectionsAll } from "@/study/mastery";
import { readiness, type Level, type PlanStep, type Readiness, type TopicScore } from "@/study/readiness";
import { PageHeader } from "@/components/layout/PageHeader";

const LEVEL: Record<Level, { label: string; text: string; bar: string; chip: string }> = {
  ready: { label: "Ready", text: "text-on-track-fg", bar: "bg-on-track", chip: "bg-on-track/15 text-on-track-fg" },
  ok: { label: "Getting there", text: "text-brand-fg", bar: "bg-brand", chip: "bg-brand/[0.12] text-brand-fg" },
  shaky: { label: "Shaky", text: "text-at-risk-fg", bar: "bg-at-risk", chip: "bg-at-risk/15 text-at-risk-fg" },
  weak: { label: "Weak", text: "text-critical-fg", bar: "bg-critical", chip: "bg-critical/15 text-critical-fg" },
  new: { label: "Not started", text: "text-muted-foreground", bar: "bg-muted-foreground/40", chip: "bg-fill-ghost text-muted-foreground" },
};
const ORDER: Level[] = ["ready", "ok", "shaky", "weak", "new"];
const STEP_ICON: Record<PlanStep["kind"], typeof Target> = { drill: Target, reread: BookOpen, read: BookOpen, recall: Brain };
const NONE: TopicScore[] = [];

export default function StudyReady() {
  const { course: slug } = useParams();
  const course = courseBySlug(slug);
  const v = useGuideIndexVersion();
  const guides = useMemo(() => (course ? summariesForCourse(course.slug, course.guides) : []), [course, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const [r, setR] = useState<Readiness | null>(null);

  useEffect(() => {
    if (!course) return;
    let alive = true;
    void Promise.all([sectionsAll(), attemptsRecent(3000), reviewsAll()]).then(([sections, attempts, reviews]) => {
      if (!alive) return;
      const drillSections = new Set(guides.flatMap((g) => drillsForGuide(g.id).map((d) => `${g.id}#${d.sectionRef}`)));
      setR(readiness({ guides, sections, attempts, reviews, drillSections }));
    });
    return () => {
      alive = false;
    };
  }, [course, guides]);

  const byChapter = useMemo(() => {
    const m = new Map<string, TopicScore[]>();
    for (const t of r?.topics ?? NONE) m.set(t.guideId, [...(m.get(t.guideId) ?? []), t]);
    return [...m.entries()];
  }, [r]);

  if (!course) return <Navigate to="/" replace />;
  const days = daysUntil(course.exam.date);
  const pct = Math.round((r?.overall ?? 0) * 100);
  const total = r?.topics.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-8 pb-20 pt-6 2xl:px-10">
      <PageHeader
        back={{ to: `/study/${course.slug}`, label: course.code }}
        icon={Gauge}
        title={`Ready for the ${course.exam.label}?`}
        actions={
          <Link to={`/study/${course.slug}/exam`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost">
            <Layers className="h-3.5 w-3.5" /> Take a mock exam
          </Link>
        }
      >
        {days < 0 ? "This exam has passed." : days === 0 ? "The exam is today." : `${days} day${days === 1 ? "" : "s"} to go.`} Every topic on the exam, scored from what you've actually done: how you marked each section, your recent drill answers, and your recall cards.
      </PageHeader>

      {/* ── Overall ───────────────────────────────────────────────────── */}
      <section className="mt-6 grid gap-5 rounded-2xl border border-border/70 bg-card p-6 shadow-card md:grid-cols-[auto_1fr] md:items-center">
        <Ring pct={pct} />
        <div className="min-w-0">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-fill-ghost">
            {ORDER.map((l) =>
              r && r.counts[l] > 0 ? <div key={l} className={cn("h-full transition-[width] duration-700", LEVEL[l].bar)} style={{ width: `${(r.counts[l] / total) * 100}%` }} /> : null,
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ORDER.map((l) => (
              <span key={l} className={cn("chip", LEVEL[l].chip)}>
                {LEVEL[l].label} <span className="font-mono">{r?.counts[l] ?? 0}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {total} topics across {guides.length} chapters. {course.exam.covers}
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── Left: the plan and the weak spots ───────────────────────── */}
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-brand/40 bg-brand/[0.04] p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Clock className="h-4 w-4 text-brand-fg" /> Your 20 minutes today
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Weakest topics first. Do them in order; each one opens right where you need it.</p>
            {r && r.plan.length === 0 ? (
              <p className="mt-4 text-sm">Nothing weak left. Take a mock exam to prove it under time pressure.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-2">
                {(r?.plan ?? []).map((s, i) => {
                  const Icon = STEP_ICON[s.kind];
                  return (
                    <li key={s.to}>
                      <Link to={s.to} className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-brand/50">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-solid font-mono text-xs font-semibold text-primary-foreground">{i + 1}</span>
                        <Icon className="h-4 w-4 shrink-0 text-brand-fg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{s.title}</span>
                          <span className="block truncate text-2xs text-muted-foreground">{s.why}</span>
                        </span>
                        <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">
                          {s.minutes} min
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-semibold tracking-tight">Weak spots</h2>
            <p className="mt-1 text-sm text-muted-foreground">Topics you've started but keep missing come first: those are misunderstandings, not gaps.</p>
            <ul className="mt-4 flex flex-col gap-3">
              {(r?.weak ?? []).map((t) => (
                <li key={t.guideId + t.sectionId}>
                  <Link to={`/study/${t.guideId}?s=${t.sectionId}`} className="block rounded-xl border border-border/60 px-4 py-3 hover:bg-fill-ghost/60">
                    <div className="flex items-center gap-2">
                      <span className={cn("chip shrink-0", LEVEL[t.level].chip)}>{LEVEL[t.level].label}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.heading}</span>
                    </div>
                    <div className="mt-1 truncate text-2xs text-muted-foreground">
                      {t.chapter} · {t.evidence.join(" · ")}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Right: every topic ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">Every exam topic</h2>
          <div className="mt-4 flex flex-col gap-6">
            {byChapter.map(([gid, ts]) => (
              <div key={gid}>
                <div className="mb-2 flex items-baseline gap-2">
                  <Link to={`/study/${gid}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                    {ts[0].chapter}
                  </Link>
                  <span data-numeric className="font-mono text-2xs text-muted-foreground">
                    {Math.round((ts.reduce((s, t) => s + t.score, 0) / ts.length) * 100)}%
                  </span>
                </div>
                <ul className="flex flex-col">
                  {ts.map((t) => (
                    <li key={t.sectionId}>
                      <Link to={`/study/${t.guideId}?s=${t.sectionId}`} title={t.evidence.join(" · ")} className="grid grid-cols-[minmax(0,1fr)_120px_92px] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-fill-ghost/60">
                        <span className="truncate text-sm text-foreground/90">{t.heading}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-fill-ghost">
                          <span className={cn("block h-full rounded-full", LEVEL[t.level].bar)} style={{ width: `${Math.max(t.level === "new" ? 0 : 4, t.score * 100)}%` }} />
                        </span>
                        <span className={cn("text-right text-2xs font-medium", LEVEL[t.level].text)}>{LEVEL[t.level].label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" strokeWidth="12" className="stroke-fill-ghost" />
        <circle cx="66" cy="66" r={r} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-brand transition-[stroke-dashoffset] duration-1000" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span data-numeric className="font-display text-3xl font-semibold">
          {pct}%
        </span>
        <span className="text-2xs text-muted-foreground">ready</span>
      </div>
    </div>
  );
}
