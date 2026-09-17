/**
 * StudyCourse — one course: its lectures (the book) and its exam tab
 * (route "/study/:course").
 *
 * Called by: the router.
 * Calls: src/study.
 *
 * Lectures tab: written chapters as openable rows (Read / Slides), then the
 * lectures still to be written, so the semester's shape is visible.
 * Exam tab: the practical stuff that used to crowd the teaching — format,
 * dates, alerts, checklist.
 */
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BookOpen, Clock, Info, Presentation, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { guidesForCourse } from "@/study/loadGuides";
import { courseBySlug, daysUntil, formatDate } from "@/study";
import { courseTick } from "./Study";

export default function StudyCourse() {
  const { course: slug } = useParams();
  const c = courseBySlug(slug);
  const guides = c ? guidesForCourse(c.slug, c.guides) : [];
  const [tab, setTab] = useState<"lectures" | "exam">("lectures");
  if (!c) return <Navigate to="/study" replace />;

  const examDays = daysUntil(c.exam.date);
  const warns = c.alerts?.filter((a) => a.kind === "warn") ?? [];
  const infos = c.alerts?.filter((a) => a.kind === "info") ?? [];

  return (
    <div className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-6">
      <Link to="/study" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All courses
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

      <div className="mt-6 flex gap-1 border-b border-border/60">
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

      {tab === "lectures" ? (
        <div className="mt-6 flex flex-col gap-8">
          {guides.length > 0 && (
            <section>
              <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Written</h2>
              <ul className="mt-2 flex flex-col gap-3">
                {guides.map((ch) => (
                  <li key={ch.id} className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
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
                    </div>
                    <div className="mt-0.5 text-base font-medium">{ch.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ch.summary}</p>
                    {ch.requires.length > 0 && (
                      <p className="mt-1 text-2xs text-muted-foreground">
                        Read first:{" "}
                        {ch.requires.map((r) => {
                          const req = guides.find((x) => x.id === r);
                          return (
                            <Link key={r} to={`/study/${r}`} className="underline underline-offset-2 hover:text-foreground">
                              {req?.lessons ?? r}
                            </Link>
                          );
                        })}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Link
                        to={`/study/${ch.id}`}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        <BookOpen className="h-3.5 w-3.5" /> Read
                      </Link>
                      <Link
                        to={`/study/${ch.id}/slides`}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/90 hover:bg-fill-ghost"
                      >
                        <Presentation className="h-3.5 w-3.5" /> Slides
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.planned.length > 0 && (
            <section>
              <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                {guides.length > 0 ? "Still to write" : "Planned"}
              </h2>
              <ul className="mt-2 divide-y divide-border/50 rounded-xl border border-dashed border-border/70">
                {c.planned.map((p, i) => (
                  <li key={i} className="flex items-baseline gap-3 px-4 py-2.5 text-sm text-muted-foreground">
                    <span className="w-24 shrink-0 font-mono text-2xs">{p.label}</span>
                    <span>{p.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <section>
            <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">How {c.instructor.split(" ").pop()} tests</h2>
            <p className="mt-2 text-[15px] leading-[1.75] text-foreground/90">{c.howTheyTest}</p>
          </section>

          <section>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-lg font-semibold tracking-tight">{c.exam.label}</h2>
              <span data-numeric className={cn("font-mono text-xs", examDays <= 7 ? "text-critical-fg" : examDays <= 21 ? "text-at-risk-fg" : "text-muted-foreground")}>
                {formatDate(c.exam.date)} · {examDays <= 0 ? "now" : `${examDays} days`}
              </span>
            </div>
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
            <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Dates</h2>
            <ol className="mt-2 flex flex-col">
              {c.deadlines.map((d, i) => {
                const days = daysUntil(d.date);
                return (
                  <li key={i} className="flex items-baseline gap-3 border-b border-border/50 py-2 text-sm last:border-0">
                    <span data-numeric className={cn("w-12 shrink-0 whitespace-nowrap font-mono text-2xs", days < 0 ? "text-muted-foreground/50 line-through" : days <= 2 ? "text-critical-fg" : days <= 7 ? "text-at-risk-fg" : "text-muted-foreground")}>
                      {formatDate(d.date, "short")}
                    </span>
                    <span className={cn("min-w-0 flex-1", d.kind === "exam" && "font-semibold")}>{d.label}</span>
                    {d.weight && <span className="shrink-0 font-mono text-2xs text-muted-foreground">{d.weight}</span>}
                  </li>
                );
              })}
            </ol>
          </section>

          <section>
            <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Before the exam, you can…</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {c.checklist.map((it, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                  <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" /> <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>

          {infos.length > 0 && (
            <section>
              <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Good to know</h2>
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
    </div>
  );
}
