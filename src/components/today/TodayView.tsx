/**
 * TodayView — the home page (default Triage layout).
 *
 * Called by: routes/Triage.tsx.
 * Calls: lib/briefing for the speaking voice, GradeGapBar, courseColor.
 *
 * Layout (per Ali's reference): greeting + "academic pulse" hero across the
 * top, then Focus for today (top three triage rows) and Course health in
 * the main column, with an Upcoming agenda rail on the right. Every number
 * arrives computed from Rust (§10); this file arranges and phrases.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Inbox,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { casualDue, firstNameOf, greeting } from "@/lib/briefing";
import { tickStyle } from "@/lib/courseColor";
import { dueClock, dueShort, pct } from "@/lib/format";
import { stripShouting } from "@/lib/stripShouting";
import { cn } from "@/lib/utils";
import type { CalendarItem, CourseSummary, SignalStatus, TriageRow } from "@/types";

export function TodayView({
  rows,
  courses,
  openTotal,
  missingTotal,
  overallPct,
  weekRows,
  weekItems,
  labelOf,
  userName,
  onOpen,
  onDone,
}: {
  /** Triage rows, done-filtered, Rust-ranked — index 0 is the answer. */
  rows: TriageRow[];
  /** Visible live courses, risk-sorted in Rust. */
  courses: CourseSummary[];
  openTotal: number;
  missingTotal: number;
  overallPct: number | null;
  /** Open rows due in the next 7 days (the one shared definition). */
  weekRows: TriageRow[];
  /** Calendar agenda items for the rail (unsubmitted, next 7 days). */
  weekItems: CalendarItem[];
  labelOf: (courseId: string, courseCode: string | null) => string;
  userName: string | null;
  onOpen: (row: TriageRow) => void;
  /** Local done-mark (view state) — the check that appears on row hover. */
  onDone: (row: TriageRow) => void;
}) {
  const now = new Date();
  const first = firstNameOf(userName);
  // The full ranked queue lives behind one honest button — three focused
  // rows by default, everything on demand, still one visual language.
  const [showAll, setShowAll] = useState(false);
  const focusRows = showAll ? rows : rows.slice(0, 3);

  return (
    <div className="mx-8 mb-10 grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* ── Hero: greeting + academic pulse ─────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-6 rounded-3xl border border-border/60 bg-card p-6 shadow-card md:flex-row md:items-center xl:col-span-3">
        <div className="min-w-0 md:w-72 md:shrink-0">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
            {greeting(now)}
            {first ? (
              <>
                , <span className="text-brand-fg">{first}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{encouragement(rows, courses)}</p>
        </div>

        <div className="hidden h-16 w-px shrink-0 bg-border/60 md:block" />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            Your academic pulse
          </span>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PulseStat icon={Inbox} value={String(openTotal)} label="open items" />
            <PulseStat
              icon={CircleAlert}
              value={String(missingTotal)}
              label="missing"
              tone={missingTotal > 0 ? "critical" : "good"}
            />
            <OverallRing pct={overallPct} />
            <WeekBars weekRows={weekRows} now={now} />
          </div>
        </div>
      </section>

      {/* ── Focus for today ─────────────────────────────────────────────── */}
      <section className="min-w-0 rounded-3xl border border-border/60 bg-card p-5 shadow-card xl:col-span-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Focus for today</h2>
          <span className="text-2xs text-muted-foreground">
            {rows.length > 3 && !showAll
              ? `top 3 of ${rows.length} — ranked by what skipping costs`
              : "ranked by what skipping costs"}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nothing open. Either you're ahead, or a sync is due — check the footer.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2">
              {focusRows.map((r) => (
                <FocusRow
                  key={r.assignmentId}
                  row={r}
                  label={labelOf(r.courseId, r.courseCode)}
                  onOpen={() => onOpen(r)}
                  onDone={() => onDone(r)}
                  now={now}
                />
              ))}
            </div>
            {rows.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                className="mt-3 w-full rounded-xl border border-dashed border-border/60 py-2 text-center text-xs font-medium text-muted-foreground transition-colors duration-micro hover:border-border hover:text-foreground"
              >
                {showAll ? "Show the top 3" : `Show all ${rows.length} open items`}
              </button>
            )}
          </>
        )}
      </section>

      {/* ── Upcoming rail ───────────────────────────────────────────────── */}
      <section className="min-w-0 rounded-3xl border border-border/60 bg-card p-5 shadow-card xl:row-span-2">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Upcoming</h2>
          <Link
            to="/calendar"
            className="flex items-center gap-1 text-2xs font-medium text-brand-fg hover:underline"
          >
            View calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <UpcomingAgenda items={weekItems} labelOf={labelOf} now={now} />
      </section>

      {/* ── Course health ───────────────────────────────────────────────── */}
      <section className="min-w-0 rounded-3xl border border-border/60 bg-card p-5 shadow-card xl:col-span-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Course health</h2>
          <Link
            to="/courses"
            className="flex items-center gap-1 text-2xs font-medium text-brand-fg hover:underline"
          >
            View all courses <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-2xs text-muted-foreground">Your courses at a glance, riskiest first.</p>

        <div className="mt-3 flex flex-col">
          {courses.map((c) => (
            <CourseHealthRow key={c.id} course={c} label={labelOf(c.id, c.courseCode)} nextOf={rows} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Hero pieces ─────────────────────────────────────────────────────────── */

/** The hero's one sentence, keyed to real state — never a random platitude. */
function encouragement(rows: TriageRow[], courses: CourseSummary[]): string {
  const missing = rows.filter((r) => r.state !== "open").length;
  if (missing > 0)
    return `${missing} item${missing === 1 ? " is" : "s are"} past due — clear those first, everything else can wait.`;
  if (rows.length === 0) return "All caught up. Genuinely — there's nothing open.";
  const critical = courses.filter((c) => c.status === "critical").length;
  if (critical > 0)
    return "One course needs real attention this week — it's at the top of the health list.";
  return "Steady as-is. Start with the top of the focus list and the week takes care of itself.";
}

function PulseStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  tone?: "critical" | "good";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-fill-ghost/60 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          tone === "critical" ? "bg-critical/15 text-critical-fg" : "bg-brand/10 text-brand-fg",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div data-numeric className="font-mono text-xl font-semibold leading-none tabular-nums">
          {value}
        </div>
        <div className="mt-1 truncate text-2xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/** The overall ring — mean current % across live courses, from Rust. */
function OverallRing({ pct: overall }: { pct: number | null }) {
  const R = 15;
  const C = 2 * Math.PI * R;
  const frac = overall === null ? 0 : Math.min(100, Math.max(0, overall)) / 100;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-fill-ghost/60 px-4 py-3">
      <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden className="shrink-0 -rotate-90">
        <circle cx="19" cy="19" r={R} fill="none" strokeWidth="5" className="stroke-border" />
        {overall !== null && (
          <circle
            cx="19"
            cy="19"
            r={R}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${frac * C} ${C}`}
            className="stroke-on-track"
          />
        )}
      </svg>
      <div className="min-w-0">
        <div data-numeric className="font-mono text-xl font-semibold leading-none tabular-nums">
          {overall === null ? "—" : `${overall.toFixed(1)}%`}
        </div>
        <div className="mt-1 truncate text-2xs text-muted-foreground">overall</div>
      </div>
    </div>
  );
}

/** Seven slim bars, one per day ahead — how the week's load is shaped.
 *  Item counts, not invented hours. */
function WeekBars({ weekRows, now }: { weekRows: TriageRow[]; now: Date }) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = start + i * 86_400_000;
    const to = from + 86_400_000;
    const count = weekRows.filter((r) => {
      const t = r.dueAt ? new Date(r.dueAt).getTime() : Number.NaN;
      return t >= from && t < to;
    }).length;
    return { date: new Date(from), count, today: i === 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex min-w-0 flex-col justify-between gap-1 rounded-2xl bg-fill-ghost/60 px-4 py-3">
      <span className="text-2xs text-muted-foreground">this week</span>
      <div className="flex items-end justify-between gap-1.5">
        {days.map((d) => (
          <div key={d.date.getTime()} className="flex flex-1 flex-col items-center gap-1" title={`${d.count} due`}>
            <span
              className={cn(
                "w-full rounded-sm",
                d.count === 0 ? "bg-border/70" : d.today ? "bg-brand" : "bg-brand/45",
              )}
              style={{ height: `${4 + (d.count / max) * 18}px` }}
            />
            <span className={cn("text-[9px] leading-none", d.today ? "font-semibold text-foreground" : "text-muted-foreground/70")}>
              {d.date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Focus rows ──────────────────────────────────────────────────────────── */

function FocusRow({
  row,
  label,
  onOpen,
  onDone,
  now,
}: {
  row: TriageRow;
  label: string;
  onOpen: () => void;
  onDone: () => void;
  now: Date;
}) {
  const chip = statusChip(row, now);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border/50 px-4 py-3 text-left transition-colors duration-micro hover:bg-fill-ghost/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={tickStyle(row.courseId)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{stripShouting(row.name).title}</span>
        <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
          {label} · {casualDue(row.dueAt, now)}
          {row.impactPct > 0.05 && <> · worth {row.impactPct.toFixed(1)}% of the grade</>}
        </span>
      </span>
      <span className={cn("chip shrink-0 whitespace-nowrap text-2xs font-medium", chip.cls)}>{chip.text}</span>
      <span data-numeric className="w-14 shrink-0 text-right font-mono text-2xs tabular-nums text-muted-foreground">
        {row.dueAt ? dueShort(row.dueAt) : "—"}
      </span>
      <button
        type="button"
        title="Mark done"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity duration-micro hover:bg-fill-ghost hover:text-on-track-fg group-hover:opacity-100"
      >
        <Check className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
    </div>
  );
}

function statusChip(row: TriageRow, now: Date): { text: string; cls: string } {
  if (row.state === "missing") return { text: "Missing", cls: "bg-critical/15 text-critical-fg" };
  if (row.state === "overdue") return { text: "Overdue", cls: "bg-critical/15 text-critical-fg" };
  const hours = row.dueAt ? (new Date(row.dueAt).getTime() - now.getTime()) / 3_600_000 : null;
  if (hours === null) return { text: "No date", cls: "bg-fill-ghost text-muted-foreground" };
  if (hours <= 0) return { text: "Overdue", cls: "bg-critical/15 text-critical-fg" };
  if (hours <= 24) return { text: "Due today", cls: "bg-at-risk/15 text-at-risk-fg" };
  if (hours <= 48) return { text: "Due tomorrow", cls: "bg-at-risk/15 text-at-risk-fg" };
  return { text: `Due in ${Math.ceil(hours / 24)} days`, cls: "bg-fill-ghost text-muted-foreground" };
}

/* ── Course health ───────────────────────────────────────────────────────── */

const SIGNAL_TEXT: Record<SignalStatus, { text: string; cls: string }> = {
  critical: { text: "Needs attention", cls: "text-critical-fg" },
  atRisk: { text: "Watch closely", cls: "text-at-risk-fg" },
  onTrack: { text: "On track", cls: "text-on-track-fg" },
  locked: { text: "Wrapped up", cls: "text-muted-foreground" },
};

function TrendIcon({ status }: { status: SignalStatus }) {
  if (status === "critical") return <TrendingDown className="h-4 w-4 text-critical-fg" />;
  if (status === "onTrack") return <TrendingUp className="h-4 w-4 text-on-track-fg" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function CourseHealthRow({
  course: c,
  label,
  nextOf,
}: {
  course: CourseSummary;
  label: string;
  nextOf: TriageRow[];
}) {
  const signal = SIGNAL_TEXT[c.status];
  // The course's next dated open item, from the already-ranked triage rows.
  const next = nextOf
    .filter((r) => r.courseId === c.id && r.dueAt !== null)
    .sort((a, b) => (a.dueAt as string).localeCompare(b.dueAt as string))[0];

  return (
    <Link
      to={`/courses/${c.id}`}
      className="group grid grid-cols-[auto_minmax(0,9rem)_auto_minmax(0,1fr)_minmax(0,12rem)_auto] items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-micro hover:bg-fill-ghost/60"
    >
      <span aria-hidden className="h-3 w-3 shrink-0 rounded-md" style={tickStyle(c.id)} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-2xs text-muted-foreground">
          {c.name && c.name !== label ? c.name : (c.term ?? "")}
        </span>
      </span>
      <span className="w-16 text-right">
        <span data-numeric className="block font-mono text-sm font-medium tabular-nums">
          {pct(c.grade.currentPct)}
        </span>
        <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">current</span>
      </span>
      <GradeGapBar
        projectedPct={c.grade.projectedPct}
        maxPossiblePct={c.maxPossiblePct}
        targetPct={c.targetPct}
        status={c.status}
        size="compact"
      />
      <span className="hidden min-w-0 md:block">
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", signal.cls)}>
          <TrendIcon status={c.status} />
          {signal.text}
        </span>
        <span className="block truncate text-2xs text-muted-foreground">
          {next
            ? `Next: ${stripShouting(next.name).title} · ${dueShort(next.dueAt as string)}`
            : c.openCount > 0
              ? `${c.openCount} open, none dated`
              : "Nothing open"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
    </Link>
  );
}

/* ── Upcoming rail ───────────────────────────────────────────────────────── */

function UpcomingAgenda({
  items,
  labelOf,
  now,
}: {
  items: CalendarItem[];
  labelOf: (courseId: string, courseCode: string | null) => string;
  now: Date;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing due in the next week.</p>;
  }

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const todayKey = dayKey(now);
  const tomorrowKey = dayKey(new Date(now.getTime() + 86_400_000));

  const byDay = new Map<string, { date: Date; items: CalendarItem[] }>();
  for (const item of items) {
    const d = new Date(item.dueAt);
    const key = dayKey(d);
    const bucket = byDay.get(key) ?? { date: d, items: [] };
    bucket.items.push(item);
    byDay.set(key, bucket);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byDay.entries()].map(([key, { date, items: dayItems }]) => (
        <div key={key}>
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className={cn("text-xs font-semibold", key === todayKey && "text-brand-fg")}>
              {key === todayKey ? "Today" : key === tomorrowKey ? "Tomorrow" : date.toLocaleDateString(undefined, { weekday: "long" })}
            </span>
            <span className="text-2xs text-muted-foreground">
              {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {dayItems.map((i) => (
              <Link
                key={i.assignmentId}
                to={`/courses/${i.courseId}`}
                className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors duration-micro hover:bg-fill-ghost"
              >
                <span data-numeric className="w-12 shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
                  {dueClock(i.dueAt)}
                </span>
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={tickStyle(i.courseId)} />
                <span className="min-w-0 flex-1 truncate text-xs group-hover:text-foreground">
                  {stripShouting(i.name).title}
                </span>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {labelOf(i.courseId, i.courseCode)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
