/**
 * CourseOverview: the Overview tab of a course's page.
 *
 * Called by: routes/CourseDetail.tsx.
 * Calls: study progress/plan (via StudyCourse's useCourseData), ipc syllabi
 * for office hours.
 *
 * Same shape as Today, scoped to one course: one "Do next" list on the left
 * (missing, then due soon, then later, then what to study) and a column of
 * small cards on the right (next exam, this week, how the grade is made,
 * office hours). Rows open the assignment sheet; study rows open the guide.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { courseHsla } from "@/lib/courseColor";
import { syllabi } from "@/lib/ipc";
import { extractFacts } from "@/lib/syllabusFacts";
import { digestFor } from "@/lib/syllabusDigest";
import { parseCourseLabel } from "@/lib/courseLabel";
import { guidesForCourse } from "@/study/loadGuides";
import { daysUntil, formatDate } from "@/study";
import type { Course } from "@/study/types";
import { useCourseData } from "@/hooks/useCourseStudy";
import { DoNextLabel as Label, DoNextRow as Row } from "./DoNext";
import { classify, isDone } from "@/lib/courseWork";
import type { AssignmentDetail, CourseSummary, GroupDetail, InstructorRow } from "@/types";

const DAY = 86_400_000;


function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(d);
}

function whenText(a: AssignmentDetail, now: number): string {
  if (!a.dueAt) return "no due date";
  const d = new Date(a.dueAt);
  const t = d.getTime();
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  if (t < now) return `was due ${dayLabel(d)}`;
  const days = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()) / DAY);
  if (days === 0) return `due today, ${time}`;
  if (days === 1) return `due tomorrow, ${time}`;
  return `due ${dayLabel(d)}`;
}

function weightText(a: AssignmentDetail): string | null {
  if (a.impactPct >= 1) return `${a.impactPct.toFixed(a.impactPct >= 10 ? 0 : 1)}% of grade`;
  if (a.pointsPossible) return `${a.pointsPossible} pts`;
  return null;
}

const CARD = "flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-card";
const CARD_H = "font-display text-[15px] font-semibold";

export function CourseOverview({
  summary: s,
  label,
  assignments,
  groups,
  instructors,
  study,
  onOpen,
  onSeeAll,
}: {
  summary: CourseSummary;
  label: string;
  assignments: AssignmentDetail[];
  groups: GroupDetail[];
  instructors: InstructorRow[];
  study: Course | undefined;
  onOpen: (id: string) => void;
  onSeeAll: () => void;
}) {
  const [now] = useState(() => Date.now());
  const color = courseHsla(s.id, 0.95);
  const { missing, soon, later } = useMemo(() => classify(assignments, now), [assignments, now]);

  const guides = useMemo(() => (study ? guidesForCourse(study.slug, study.guides) : []), [study]);
  const { prog, actions } = useCourseData(study, guides);
  const studyRows = actions.filter((a) => a.kind === "read" || a.kind === "reread" || a.kind === "drill").slice(0, 2);

  const [officeHours, setOfficeHours] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    syllabi()
      .then((all) => {
        const c = all.find((x) => x.courseId === s.id);
        const text = c?.files.map((f) => f.extractedText ?? "").join("\n") ?? "";
        if (alive) setOfficeHours(text.trim() ? extractFacts(text).officeHours : null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [s.id]);

  const nothing = missing.length + soon.length + later.length + studyRows.length === 0;
  const shownMissing = missing.slice(0, 4);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* ── Do next ─────────────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card px-5 pb-2 pt-4 shadow-card">
        <div className="flex items-baseline justify-between gap-3 pb-1">
          <h2 className="font-display text-lg font-semibold">Do next in {label}</h2>
          <button type="button" onClick={onSeeAll} className="text-[12.5px] font-medium text-brand-fg hover:underline">
            All assignments
          </button>
        </div>
        {nothing && <p className="py-8 text-center text-sm text-muted-foreground">Nothing to do in this course right now.</p>}
        {missing.length > 0 && (
          <>
            <Label tone="missing">Missing</Label>
            {shownMissing.map((a) => (
              <Row key={a.id} color={color} title={a.name ?? "Untitled"} sub={[whenText(a, now), weightText(a)].filter(Boolean).join(" · ")} kind="missing" onOpen={() => onOpen(a.id)} cta="Open" />
            ))}
            {missing.length > shownMissing.length && (
              <button type="button" onClick={onSeeAll} className="w-fit px-5 pb-1 pt-2 text-[12.5px] font-medium text-brand-fg hover:underline">
                + {missing.length - shownMissing.length} more missing
              </button>
            )}
          </>
        )}
        {soon.length > 0 && (
          <>
            <Label tone="soon">Due this week</Label>
            {soon.map((a) => (
              <Row key={a.id} color={color} title={a.name ?? "Untitled"} sub={[whenText(a, now), weightText(a)].filter(Boolean).join(" · ")} kind={new Date(a.dueAt as string).getTime() - now < 2 * DAY ? "soon" : "todo"} onOpen={() => onOpen(a.id)} cta="Open" />
            ))}
          </>
        )}
        {later.length > 0 && (
          <>
            <Label tone="todo">Coming up</Label>
            {later.slice(0, 4).map((a) => (
              <Row key={a.id} color={color} title={a.name ?? "Untitled"} sub={[whenText(a, now), weightText(a)].filter(Boolean).join(" · ")} kind="todo" onOpen={() => onOpen(a.id)} cta="Open" />
            ))}
          </>
        )}
        {studyRows.length > 0 && (
          <>
            <Label tone="study">Study next</Label>
            {studyRows.map((a) => (
              <Row key={a.to} color={color} title={a.title.replace(/^[A-Za-z0-9 ]+: /, "")} sub={`${a.minutes} min · ${a.reason.split(" · ")[0]}`} kind="study" to={a.to} cta={a.kind === "drill" ? "Practice" : "Read"} />
            ))}
          </>
        )}
      </section>

      {/* ── The column ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4">
        {study && <ExamCard study={study} studied={prog ? `${prog.mastered} of ${prog.total}` : null} pct={prog?.pct ?? 0} color={color} />}
        <WeekCard assignments={assignments} now={now} />
        <GradeMakeupCard groups={groups} study={study} courseId={s.id} />
        <OfficeHoursCard officeHours={officeHours} instructors={instructors} study={study} courseCode={s.courseCode} />
      </div>
    </div>
  );
}

function ExamCard({ study, studied, pct, color }: { study: Course; studied: string | null; pct: number; color: string }) {
  const days = daysUntil(study.exam.date);
  const tone = days <= 7 ? "text-critical-fg" : days <= 21 ? "text-at-risk-fg" : "text-foreground";
  return (
    <section className={CARD}>
      <h2 className={CARD_H}>Next exam</h2>
      <div className="flex items-baseline gap-2.5">
        <span data-numeric className={cn("font-mono text-[34px] font-semibold leading-none tabular-nums", tone)}>
          {Math.max(0, days)}
        </span>
        <span className="text-sm text-muted-foreground">
          {days === 1 ? "day" : "days"} to {study.exam.label} · {formatDate(study.exam.date, "short")}
        </span>
      </div>
      {studied && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Study sections mastered</span>
            <span data-numeric className="font-mono tabular-nums">{studied}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }} />
          </div>
        </div>
      )}
      <div className="flex gap-4 text-[13px] font-medium">
        <Link to={`/study/${study.slug}/exam`} className="text-brand-fg hover:underline">
          Take a mock exam
        </Link>
        <Link to={`/study/${study.slug}/recall`} className="text-muted-foreground hover:text-foreground hover:underline">
          Recall all
        </Link>
      </div>
    </section>
  );
}

/** Sunday to Saturday of the current week: a bar per day, tall when a lot
 *  is due, red when something that day was missed. */
function WeekCard({ assignments, now }: { assignments: AssignmentDetail[]; now: number }) {
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const byDay = new Map<string, AssignmentDetail[]>();
  for (const a of assignments) {
    if (!a.dueAt || a.excused || a.omitted) continue;
    const k = key(new Date(a.dueAt));
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const weight = (a: AssignmentDetail) => Math.max(1, a.impactPct);
  const loads = days.map((d) => (byDay.get(key(d)) ?? []).reduce((n, a) => n + weight(a), 0));
  const max = Math.max(1, ...loads);
  const todayKey = key(today);
  const missed = (d: Date) => (byDay.get(key(d)) ?? []).some((a) => !isDone(a) && new Date(a.dueAt as string).getTime() < now && (a.pointsPossible ?? 0) > 0);
  const open = (d: Date) => (byDay.get(key(d)) ?? []).some((a) => !isDone(a) && new Date(a.dueAt as string).getTime() >= now);
  const count = days.reduce((n, d) => n + (byDay.get(key(d))?.length ?? 0), 0);
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
            className={cn("rounded-[4px]", missed(d) ? "bg-critical/35" : open(d) ? "bg-at-risk/40" : loads[i] > 0 ? "bg-foreground/15" : "bg-foreground/[0.07]")}
            style={{ height: `${loads[i] > 0 ? 18 + (loads[i] / max) * 82 : 6}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {count === 0 ? "Nothing due in this course this week." : "Taller means more of your grade is due that day. Red: missed. Amber: still open."}
      </p>
    </section>
  );
}

function GradeMakeupCard({ groups, study, courseId }: { groups: GroupDetail[]; study: Course | undefined; courseId: string }) {
  const parts = groups.filter((g) => g.sharePct > 0).sort((a, b) => b.sharePct - a.sharePct);
  const rows: { label: string; value: string; share: number }[] =
    parts.length > 0
      ? parts.map((g) => ({ label: g.name ?? "Unnamed group", value: `${g.sharePct.toFixed(g.sharePct % 1 ? 1 : 0)}%`, share: g.sharePct }))
      : (study?.weights ?? []).map((w) => ({ label: w.label, value: w.pct, share: 0 }));
  if (rows.length === 0) return null;
  return (
    <section className={CARD}>
      <h2 className={CARD_H}>How your grade is made</h2>
      {parts.length > 0 && (
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {parts.map((g, i) => (
            <span key={g.id} style={{ width: `${g.sharePct}%`, backgroundColor: courseHsla(courseId, Math.max(0.25, 0.95 - i * 0.2)) }} />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 text-[13.5px]">
            <span className="min-w-0 truncate text-muted-foreground">{r.label}</span>
            <span data-numeric className="shrink-0 font-medium tabular-nums">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OfficeHoursCard({
  officeHours: mined,
  instructors,
  study,
  courseCode,
}: {
  officeHours: string | null;
  instructors: InstructorRow[];
  study: Course | undefined;
  courseCode: string | null;
}) {
  const digest = digestFor(parseCourseLabel(courseCode).code);
  const prof = instructors.find((p) => p.starred) ?? instructors.find((p) => p.role === "teacher");
  const name = prof?.name ?? digest?.instructor ?? study?.instructor ?? null;
  // The hand-written digest beats a line the miner guessed at.
  const lines = digest?.officeHours.length ? digest.officeHours : mined ? [mined] : [];
  if (!name && lines.length === 0) return null;
  return (
    <section className={CARD}>
      <h2 className={CARD_H}>Office hours</h2>
      {name && <div className="text-[13.5px] font-medium">{name}</div>}
      <div className="flex flex-col gap-0.5 text-[13px] leading-relaxed text-muted-foreground">
        {lines.length > 0 ? lines.map((l) => <span key={l}>{l}</span>) : <span>Not found in the syllabus yet. See the Syllabus tab.</span>}
      </div>
      {digest?.contactNote && <div className="text-[13px] leading-relaxed text-muted-foreground">{digest.contactNote}</div>}
    </section>
  );
}
