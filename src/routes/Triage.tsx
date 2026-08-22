/**
 * Triage — the default screen (§5, screen 1), as a bento dashboard.
 *
 * Called by: the router, at "/".
 * Calls: ipc triage_rows / set_estimate / calendar_items; useCourses.
 *
 * The brief is still one sentence: open the laptop, look at the top-left
 * tile, start working. The bento grid exists to make the *rest* of the
 * picture — standings, the week, the counts — visible in the same viewport
 * without the hero losing primacy.
 *
 * Grid contract (xl, 4 columns):
 *
 * ```
 * ┌────────────────────┬──────────┬──────────┐
 * │  UP NEXT (hero)    │ standings│  stats   │
 * │  2 × 2             │  1 col   │  stack   │
 * ├────────────────────┴───────┬──┴──────────┤
 * │  THE QUEUE (ranked list)   │ next 7 days │
 * │  3 cols                    │   1 col     │
 * └────────────────────────────┴─────────────┘
 * ```
 *
 * Below xl everything stacks full-width in priority order. Ranking still
 * happens in `src-tauri/src/triage.rs`, never here (§10).
 */
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CalendarClock, CircleAlert, Inbox, ListChecks, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { CourseStatusDot } from "@/components/layout/CourseStatusDot";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { springy, useReducedMotion } from "@/hooks/useReducedMotion";
import { useCourses } from "@/hooks/useCourses";
import { calendarItems, setEstimate, triageRows } from "@/lib/ipc";
import { minutes, pct, relativeDue } from "@/lib/format";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { cn } from "@/lib/utils";
import type { CalendarItem, TriageRow, TriageState } from "@/types";

const STATE_CHIP: Record<TriageState, { label: string; cls: string }> = {
  missing: { label: "missing", cls: "bg-critical/10 text-critical-fg" },
  overdue: { label: "overdue", cls: "bg-critical/10 text-critical-fg" },
  open: { label: "not submitted", cls: "bg-fill-ghost text-muted-foreground" },
};

export default function Triage() {
  const [rows, setRows] = useState<TriageRow[] | null>(null);
  const [week, setWeek] = useState<CalendarItem[]>([]);
  const { courses, openTotal, dueThisWeek, loaded } = useCourses();

  const refresh = useCallback(() => {
    triageRows()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    refresh();
    const now = Date.now();
    calendarItems()
      .then((items) =>
        setWeek(
          items
            .filter((i) => !i.submitted && !i.graded)
            .filter((i) => {
              const t = new Date(i.dueAt).getTime();
              return t > now && t < now + 7 * 86_400_000;
            })
            .slice(0, 8),
        ),
      )
      .catch(() => {});
  }, [refresh]);

  const visible = courses.filter((c) => !c.hidden && c.gradeable);
  const missingTotal = visible.reduce((n, c) => n + c.missingCount, 0);

  if (rows === null || !loaded) {
    return (
      <>
        <ScreenHeader title="Triage" subtitle="Ranked by what it costs you to skip." />
        <div className="mx-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <Skeleton className="h-56 rounded-3xl xl:col-span-2" />
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl xl:col-span-3" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <ScreenHeader title="Triage" subtitle="Ranked by what it costs you to skip." />
        <EmptyState
          icon={ListChecks}
          title="Nothing to triage"
          description="Everything gradeable is submitted. Either you're ahead, or a sync is due — check the footer for when Canvas was last read."
          action={
            <Button asChild variant="outline">
              <Link to="/courses">See your courses</Link>
            </Button>
          }
        />
      </>
    );
  }

  const [hero, ...queue] = rows;

  return (
    <>
      <ScreenHeader title="Triage" subtitle="Ranked by what it costs you to skip." />

      <div className="mx-8 mb-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {/* ── Hero: the one thing to start now ─────────────────────────── */}
        <HeroTile row={hero} onEstimateSaved={refresh} />

        {/* ── Standings ────────────────────────────────────────────────── */}
        <Tile label="Standings" icon={ListChecks} className="xl:row-span-1">
          <div className="flex flex-col gap-2.5">
            {visible.map((c) => (
              <Link key={c.id} to={`/courses/${c.id}`} className="group">
                <div className="flex items-center gap-2">
                  <CourseStatusDot status={c.status} />
                  <span className="min-w-0 flex-1 truncate text-xs group-hover:underline">
                    {c.courseCode ?? c.name}
                  </span>
                  <span data-numeric className="font-mono text-xs tabular-nums text-muted-foreground">
                    {pct(c.grade.currentPct)}
                  </span>
                </div>
                <GradeGapBar
                  projectedPct={c.grade.projectedPct}
                  maxPossiblePct={c.maxPossiblePct}
                  targetPct={c.targetPct}
                  floorPct={floorForCanvasCourse(c.courseCode)?.pct}
                  status={c.status}
                  size="compact"
                  className="mt-1"
                />
              </Link>
            ))}
          </div>
        </Tile>

        {/* ── Stat stack ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 xl:grid-cols-1">
          <StatMini label="due this week" value={dueThisWeek} icon={CalendarClock} />
          <StatMini label="open items" value={openTotal} icon={Inbox} />
          <StatMini
            label="missing"
            value={missingTotal}
            icon={CircleAlert}
            tone={missingTotal > 0 ? "critical" : undefined}
          />
        </div>

        {/* ── The queue ────────────────────────────────────────────────── */}
        <Tile
          label={`Queue · ${queue.length} more`}
          icon={ListChecks}
          className="xl:col-span-3"
          padded={false}
        >
          <div className="flex flex-col">
            {queue.map((row, i) => (
              <QueueRow key={row.assignmentId} row={row} rank={i + 2} onEstimateSaved={refresh} />
            ))}
            {queue.length === 0 && (
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                Just the one item — clear it and you're done.
              </p>
            )}
          </div>
        </Tile>

        {/* ── Next 7 days ──────────────────────────────────────────────── */}
        <Tile label="Next 7 days" icon={CalendarClock}>
          {week.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing due in the next week.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {week.map((i) => (
                <Link
                  key={i.assignmentId}
                  to={`/courses/${i.courseId}`}
                  className="flex items-baseline gap-2 rounded-md px-1 py-0.5 hover:bg-fill-ghost"
                >
                  <span className="min-w-0 flex-1 truncate text-xs">{i.name ?? "Untitled"}</span>
                  <span data-numeric className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
                    {relativeDue(i.dueAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Tile>
      </div>
    </>
  );
}

/* ── Tiles ───────────────────────────────────────────────────────────────── */

/** The shared bento tile: one shape, one border, one label style. */
function Tile({
  label,
  icon: Icon,
  children,
  className,
  padded = true,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-3xl border border-border/60 bg-card shadow-card",
        padded ? "p-4" : "pt-4",
        className,
      )}
    >
      <h2
        className={cn(
          "mb-2.5 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground",
          !padded && "px-4",
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </h2>
      {children}
    </section>
  );
}

/** Rank #1, given the room it deserves: this is the "start working" tile. */
function HeroTile({ row, onEstimateSaved }: { row: TriageRow; onEstimateSaved: () => void }) {
  const chip = STATE_CHIP[row.state];
  const pinned = row.state !== "open";

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-3xl border p-5 shadow-card xl:col-span-2",
        pinned ? "border-critical/40 bg-critical/5" : "border-brand/25 bg-brand/5",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Up next
        </span>
        <span className={cn("chip text-2xs", chip.cls)}>{chip.label}</span>
      </div>

      <h2 className="mt-2 font-display text-2xl font-semibold leading-snug">
        {row.name ?? "Untitled"}
      </h2>
      <div className="mt-1 flex flex-wrap items-baseline gap-3 text-sm text-muted-foreground">
        <Link to={`/courses/${row.courseId}`} className="hover:underline">
          {row.courseCode ?? "—"}
        </Link>
        <span data-numeric className={cn("font-mono tabular-nums", pinned && "text-critical-fg")}>
          {relativeDue(row.dueAt)}
        </span>
      </div>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <div data-numeric className="font-mono text-3xl font-medium tabular-nums">
            {row.impactPct.toFixed(1)}%
          </div>
          <div className="text-2xs text-muted-foreground">of your final grade riding on this</div>
        </div>
        <div className="flex items-center gap-2">
          <EstimateCell row={row} onSaved={onEstimateSaved} prominent />
          <Button asChild size="sm">
            <Link to={`/courses/${row.courseId}`}>
              Open course <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatMini({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "critical";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-center rounded-3xl border border-border/60 bg-card px-4 py-3 shadow-card",
        tone === "critical" && "border-critical/40",
      )}
    >
      <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        data-numeric
        className={cn(
          "mt-0.5 font-mono text-2xl font-medium tabular-nums",
          tone === "critical" && value > 0 && "text-critical-fg",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** One compact queue row. `layout` keeps reorders visible — that motion is
 *  information (§9.4). */
function QueueRow({
  row,
  rank,
  onEstimateSaved,
}: {
  row: TriageRow;
  rank: number;
  onEstimateSaved: () => void;
}) {
  const reduced = useReducedMotion();
  const chip = STATE_CHIP[row.state];
  const pinned = row.state !== "open";

  return (
    <motion.div
      layout
      transition={springy(reduced)}
      className={cn(
        "flex items-center gap-3 border-t border-border/40 px-4 py-2",
        pinned && "bg-critical/5",
      )}
    >
      <span
        data-numeric
        className="w-5 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground"
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm">{row.name ?? "Untitled"}</span>
          <span className={cn("chip shrink-0 text-2xs", chip.cls)}>{chip.label}</span>
        </div>
        <div className="mt-0.5 flex gap-2 text-2xs text-muted-foreground">
          <Link to={`/courses/${row.courseId}`} className="shrink-0 hover:underline">
            {row.courseCode ?? "—"}
          </Link>
          <span data-numeric className={cn("font-mono", pinned && "text-critical-fg")}>
            {relativeDue(row.dueAt)}
          </span>
        </div>
      </div>
      <span data-numeric className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">
        {row.impactPct.toFixed(1)}%
      </span>
      <EstimateCell row={row} onSaved={onEstimateSaved} />
    </motion.div>
  );
}

/** The inline-editable time estimate (§5) — minutes in, "1h 30m" out.
 *  Editing re-ranks the list: the estimate is the score's denominator. */
function EstimateCell({
  row,
  onSaved,
  prominent,
}: {
  row: TriageRow;
  onSaved: () => void;
  prominent?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const save = () => {
    const trimmed = value.trim();
    const mins = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (mins !== null && (Number.isNaN(mins) || mins < 0)) {
      toast.error("Estimates are minutes — plain numbers only.");
      return;
    }
    setEstimate(row.assignmentId, mins)
      .then(() => {
        setEditing(false);
        onSaved();
      })
      .catch(() => toast.error("Could not save the estimate."));
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(row.estMinutes?.toString() ?? "");
          setEditing(true);
        }}
        className={cn(
          "shrink-0 rounded-md text-right font-mono text-xs tabular-nums text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground",
          prominent
            ? "flex items-center gap-1 border border-border/60 px-2.5 py-1.5"
            : "w-16 px-2 py-1",
        )}
        title="Your time estimate — click to edit"
      >
        {prominent && <Timer className="h-3 w-3" />}
        {minutes(row.estMinutes)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
      placeholder="min"
      className="w-16 shrink-0 rounded-md border border-brand bg-transparent px-2 py-1 text-right font-mono text-xs tabular-nums outline-none"
    />
  );
}
