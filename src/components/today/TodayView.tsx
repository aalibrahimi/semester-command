/**
 * TodayView: the home page.
 *
 * Called by: routes/Triage.tsx.
 * Calls: lib/briefing for the greeting, study progress and plan (all
 * courses), the inbox store, DoNext rows shared with the course page.
 *
 * One ranked answer to "what do I do now", in the same shape as each
 * course's Overview tab:
 * - Header: the date, the greeting, and the state of things as pills
 *   (missing, due in the next 7 days, the nearest exam).
 * - Do next (left): Missing (worth points; costliest first), Due this week
 *   (Rust's rank order), then everything else on demand, then Study next
 *   (the study plan's top reads and drills across every course).
 * - A column of small cards (right): This week (a bar per day, red where
 *   something was missed), Courses (grade and study progress, each a link
 *   to its course page), and the latest Inbox items.
 * Every grade number arrives computed from Rust (§10); this file arranges.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DoNextLabel, DoNextRow } from "@/components/course/DoNext";
import { firstNameOf, greeting } from "@/lib/briefing";
import { courseHsla } from "@/lib/courseColor";
import { kindMeta, useInbox, when } from "@/lib/inbox";
import { stripShouting } from "@/lib/stripShouting";
import { cn } from "@/lib/utils";
import { courses as studyCourses, daysUntil } from "@/study";
import type { Course as StudyCourse } from "@/study/types";
import type { Guide } from "@/study/guide";
import { guidesForCourse } from "@/study/loadGuides";
import { attemptsRecent, examsRecent, reviewsAll, sectionsAll } from "@/study/mastery";
import { plan, type Action } from "@/study/plan";
import { courseProgress } from "@/study/progress";
import type { CourseSummary, TriageRow } from "@/types";

const DAY = 86_400_000;

/** "CS-146" and "CS 146" both become "cs146". */
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(d);
}

function rowSub(r: TriageRow, label: string, now: number): string {
  const parts = [label];
  if (r.dueAt) {
    const d = new Date(r.dueAt);
    const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const days = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / DAY);
    parts.push(
      d.getTime() < now ? `was due ${dayLabel(d)}` : days === 0 ? `due today, ${time}` : days === 1 ? `due tomorrow, ${time}` : `due ${dayLabel(d)}`,
    );
  } else parts.push("no due date");
  if (r.impactPct >= 1) parts.push(`${r.impactPct.toFixed(r.impactPct >= 10 ? 0 : 1)}% of grade`);
  else if (r.pointsPossible) parts.push(`${r.pointsPossible} pts`);
  return parts.join(" · ");
}

/** Study progress and the plan, across every study course. */
function useStudy(): { actions: Action[]; pctBySlug: Map<string, number> } {
  const [state, setState] = useState<{ actions: Action[]; pctBySlug: Map<string, number> }>({ actions: [], pctBySlug: new Map() });
  useEffect(() => {
    let alive = true;
    const guidesByCourse: Record<string, Guide[]> = {};
    for (const c of studyCourses) guidesByCourse[c.slug] = guidesForCourse(c.slug, c.guides);
    void Promise.all([sectionsAll(), attemptsRecent(2000), reviewsAll(), examsRecent()])
      .then(([sections, attempts, reviews, exams]) => {
        if (!alive) return;
        const pctBySlug = new Map<string, number>();
        for (const c of studyCourses) {
          const g = guidesByCourse[c.slug];
          if (g.length) pctBySlug.set(c.slug, courseProgress(g, sections).pct);
        }
        const actions = plan({ courses: studyCourses, guidesByCourse, sections, attempts, reviews, exams }, 6).filter(
          (a) => a.kind === "read" || a.kind === "reread" || a.kind === "drill",
        );
        setState({ actions: actions.slice(0, 3), pctBySlug });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export function TodayView({
  rows,
  courses,
  weekRows,
  labelOf,
  userName,
  onOpen,
  onDone,
}: {
  /** Triage rows, done-filtered, Rust-ranked: index 0 is the answer. */
  rows: TriageRow[];
  /** Visible live courses, risk-sorted in Rust. */
  courses: CourseSummary[];
  /** Open rows due in the next 7 days (the one shared definition). */
  weekRows: TriageRow[];
  labelOf: (courseId: string, courseCode: string | null) => string;
  userName: string | null;
  onOpen: (row: TriageRow) => void;
  /** Local done-mark (view state). */
  onDone: (row: TriageRow) => void;
}) {
  const [nowDate] = useState(() => new Date());
  const now = nowDate.getTime();
  const first = firstNameOf(userName);
  const [showAll, setShowAll] = useState(false);
  const [allMissing, setAllMissing] = useState(false);
  const { actions, pctBySlug } = useStudy();

  const { missing, soon, later } = useMemo(() => {
    // Missing work with nothing at stake (0 points) is not "pinned" in
    // Rust; it stays out of the red list. Rust's rank order throughout, so
    // the missing item that costs the most comes first.
    const missing = rows.filter((r) => r.state !== "open" && r.pinned);
    const weekIds = new Set(weekRows.map((r) => r.assignmentId));
    const soon = rows.filter((r) => r.state === "open" && weekIds.has(r.assignmentId));
    const later = rows.filter((r) => r.state === "open" && !weekIds.has(r.assignmentId));
    return { missing, soon, later };
  }, [rows, weekRows]);

  const study = (slugOf: StudyCourse) => courses.find((c) => norm(labelOf(c.id, c.courseCode)) === slugOf.slug || norm(c.courseCode).includes(slugOf.slug));
  const nextExam = studyCourses
    .map((c) => ({ c, days: daysUntil(c.exam.date) }))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  const colorOf = (courseId: string) => courseHsla(courseId, 0.95);
  const shownMissing = allMissing ? missing : missing.slice(0, 4);

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-8 pb-12 pt-7">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">
            {nowDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
            {greeting(nowDate)}
            {first ? `, ${first}` : ""}
          </h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
          {missing.length > 0 && (
            <span className="rounded-full bg-critical/[0.12] px-3 py-1.5 font-semibold text-critical-fg">{missing.length} missing</span>
          )}
          <span className="rounded-full bg-brand/10 px-3 py-1.5 font-semibold text-brand-fg">
            {weekRows.length} due in the next 7 days
          </span>
          {nextExam && (
            <Link
              to={study(nextExam.c) ? `/courses/${study(nextExam.c)?.id}` : `/study/${nextExam.c.slug}`}
              className="rounded-full bg-foreground/[0.06] px-3 py-1.5 font-semibold text-muted-foreground hover:text-foreground"
            >
              Next exam: {nextExam.c.code.replace(" ", "-")} {nextExam.c.exam.label.replace(/\s*\(.*\)$/, "").toLowerCase()}{" "}
              {nextExam.days === 0 ? "today" : `in ${nextExam.days} day${nextExam.days === 1 ? "" : "s"}`}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Do next ─────────────────────────────────────────────── */}
        <section className="flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card px-5 pb-2 pt-4 shadow-card">
          <div className="flex items-baseline justify-between gap-3 pb-1">
            <h2 className="font-display text-lg font-semibold">Do next</h2>
            <span className="flex items-baseline gap-3 text-[12.5px] text-muted-foreground">
              <span className="hidden lg:inline">Missing work first, then what&apos;s due, then what to study</span>
              <Link to="/done" className="font-medium text-brand-fg hover:underline">
                Finished work
              </Link>
            </span>
          </div>

          {rows.length === 0 && actions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing open. Either you&apos;re ahead, or a sync is due.</p>
          )}

          {missing.length > 0 && (
            <>
              <DoNextLabel tone="missing">Missing</DoNextLabel>
              {shownMissing.map((r) => (
                <DoNextRow
                  key={r.assignmentId}
                  color={colorOf(r.courseId)}
                  title={stripShouting(r.name).title}
                  sub={rowSub(r, labelOf(r.courseId, r.courseCode), now)}
                  kind="missing"
                  onOpen={() => onOpen(r)}
                  onDone={() => onDone(r)}
                  cta="Open"
                />
              ))}
              {missing.length > 4 && (
                <button type="button" onClick={() => setAllMissing((v) => !v)} className="w-fit px-5 pb-1 pt-2 text-[12.5px] font-medium text-brand-fg hover:underline">
                  {allMissing ? "Show fewer" : `+ ${missing.length - 4} more missing`}
                </button>
              )}
            </>
          )}

          {soon.length > 0 && (
            <>
              <DoNextLabel tone="soon">Due this week</DoNextLabel>
              {soon.map((r) => (
                <DoNextRow
                  key={r.assignmentId}
                  color={colorOf(r.courseId)}
                  title={stripShouting(r.name).title}
                  sub={rowSub(r, labelOf(r.courseId, r.courseCode), now)}
                  kind={r.dueAt && new Date(r.dueAt).getTime() - now < 2 * DAY ? "soon" : "todo"}
                  onOpen={() => onOpen(r)}
                  onDone={() => onDone(r)}
                  cta="Open"
                />
              ))}
            </>
          )}

          {later.length > 0 &&
            (showAll ? (
              <>
                <DoNextLabel tone="todo">Later</DoNextLabel>
                {later.map((r) => (
                  <DoNextRow
                    key={r.assignmentId}
                    color={colorOf(r.courseId)}
                    title={stripShouting(r.name).title}
                    sub={rowSub(r, labelOf(r.courseId, r.courseCode), now)}
                    kind="todo"
                    onOpen={() => onOpen(r)}
                    onDone={() => onDone(r)}
                    cta="Open"
                  />
                ))}
              </>
            ) : null)}

          {actions.length > 0 && (
            <>
              <DoNextLabel tone="study">Study next</DoNextLabel>
              {actions.map((a) => {
                const c = study(a.course);
                return (
                  <DoNextRow
                    key={a.to}
                    color={c ? colorOf(c.id) : "rgb(var(--foreground) / 0.3)"}
                    title={a.title.replace(/^[A-Za-z0-9 ]+: /, "")}
                    sub={`${a.course.code.replace(" ", "-")} · ${a.minutes} min · ${a.reason.split(" · ")[0]}`}
                    kind="study"
                    to={a.to}
                    cta={a.kind === "drill" ? "Practice" : "Read"}
                  />
                );
              })}
            </>
          )}

          {later.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="my-2 w-full rounded-xl border border-dashed border-border/70 py-2 text-center text-xs font-medium text-muted-foreground transition-colors duration-micro hover:border-border hover:text-foreground"
            >
              {showAll ? "Hide later work" : `Show ${later.length} more open item${later.length === 1 ? "" : "s"} due later`}
            </button>
          )}
        </section>

        {/* ── The column ──────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <WeekCard rows={rows} now={nowDate} />
          <CoursesCard courses={courses} labelOf={labelOf} pctBySlug={pctBySlug} />
          <InboxCard />
        </div>
      </div>
    </div>
  );
}

const CARD = "flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-card";
const CARD_H = "font-display text-[15px] font-semibold";

/** Sunday to Saturday of this week, across every course: a bar per day
 *  sized by how much of your grade is due, red where something was
 *  missed, amber where work is still open. */
function WeekCard({ rows, now }: { rows: TriageRow[]; now: Date }) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const byDay = new Map<string, TriageRow[]>();
  for (const r of rows) {
    if (!r.dueAt) continue;
    const k = key(new Date(r.dueAt));
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }
  const load = (d: Date) => (byDay.get(key(d)) ?? []).reduce((n, r) => n + Math.max(1, r.impactPct), 0);
  const loads = days.map(load);
  const max = Math.max(1, ...loads);
  const todayKey = key(now);
  const missed = (d: Date) => (byDay.get(key(d)) ?? []).some((r) => r.state !== "open" && r.pinned);
  return (
    <section className={CARD}>
      <h2 className={CARD_H}>This week</h2>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11.5px] text-muted-foreground">
        {days.map((d) => (
          <span key={`l${key(d)}`} className={cn(key(d) === todayKey && "font-semibold text-brand-fg")}>
            {"SMTWTFS"[d.getDay()]}
          </span>
        ))}
        {days.map((d) => (
          <span
            key={`n${key(d)}`}
            data-numeric
            className={cn("mx-auto rounded-full px-1.5 font-mono tabular-nums", key(d) === todayKey ? "bg-brand-solid text-white" : "text-foreground/80")}
          >
            {d.getDate()}
          </span>
        ))}
      </div>
      <div className="grid h-14 grid-cols-7 items-end gap-1.5">
        {days.map((d, i) => (
          <span
            key={`b${key(d)}`}
            title={`${byDay.get(key(d))?.length ?? 0} open`}
            className={cn("rounded-[4px]", missed(d) ? "bg-critical/35" : loads[i] > 0 ? "bg-at-risk/40" : "bg-foreground/[0.07]")}
            style={{ height: `${loads[i] > 0 ? 18 + (loads[i] / max) * 82 : 6}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Taller means more of your grade is due that day. Red: missed. Amber: still open.</p>
    </section>
  );
}

function CoursesCard({
  courses,
  labelOf,
  pctBySlug,
}: {
  courses: CourseSummary[];
  labelOf: (courseId: string, courseCode: string | null) => string;
  pctBySlug: Map<string, number>;
}) {
  return (
    <section className={CARD}>
      <div className="flex items-baseline justify-between">
        <h2 className={CARD_H}>Courses</h2>
        <span className="text-xs text-muted-foreground">study · grade</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {courses.map((c) => {
          const slug = studyCourses.find((s) => norm(c.courseCode).includes(s.slug))?.slug;
          const studyPct = slug ? pctBySlug.get(slug) : undefined;
          return (
            <Link key={c.id} to={`/courses/${c.id}`} className="group flex items-center gap-2.5 text-[13.5px]">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: courseHsla(c.id, 0.95) }} />
              <span className="w-[76px] shrink-0 truncate font-medium group-hover:underline">{labelOf(c.id, c.courseCode)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10" title={studyPct === undefined ? "No study guide" : `${studyPct}% of study sections mastered`}>
                {studyPct !== undefined && <span className="block h-full rounded-full" style={{ width: `${Math.max(3, studyPct)}%`, backgroundColor: courseHsla(c.id, 0.95) }} />}
              </span>
              <span data-numeric className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {c.grade.currentPct === null ? "–" : `${c.grade.currentPct.toFixed(0)}%`}
              </span>
              {c.missingCount > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-critical" title={`${c.missingCount} missing`} />}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function InboxCard() {
  const { items, unread } = useInbox();
  const latest = items.slice(0, 3);
  return (
    <section className={CARD}>
      <div className="flex items-baseline justify-between">
        <h2 className={CARD_H}>Inbox</h2>
        {unread > 0 && <span className="text-xs font-semibold text-brand-fg">{unread} unread</span>}
      </div>
      {latest.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing new.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {latest.map((it) => {
            const meta = kindMeta(it.kind);
            return (
              <div key={it.id} className="flex items-start gap-2.5">
                <span aria-hidden className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", meta.bar)} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13.5px] leading-snug", it.readAt ? "text-muted-foreground" : "font-medium")}>{it.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {meta.label} · {when(it.createdAt)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Link to="/inbox" className="flex items-center gap-1 text-[12.5px] font-medium text-brand-fg hover:underline">
        Open inbox <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
