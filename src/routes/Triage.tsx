/**
 * Triage — the default screen (§5, screen 1), as a bento dashboard.
 *
 * Called by: the router, at "/".
 * Calls: ipc triage_rows / set_estimate / calendar_items / debug_dump (the
 * what-changed widget's source); useCourses; localPrefs (nicknames, done).
 *
 * The brief is still one sentence: open the laptop, look at the top-left
 * tile, start working. Design-review refinements live here:
 *
 * - Inline impact bars: fill = share of final grade, colored by urgency
 *   tier. The bar compares; the mono number states.
 * - Rank numbers only in the flat Ranked view — they are non-sequential
 *   inside groups, and a non-sequential rank is noise.
 * - Stat tiles are click-to-filter toggles on the queue.
 * - Row hover reveals quick actions (open in Canvas, solver, mark done);
 *   the estimate carries a dashed-underline edit affordance.
 * - Keyboard: j/k move · e estimate · o open in Canvas · x done · Enter
 *   opens the sheet.
 * - Right rail: week timeline, workload-by-day, what-changed.
 *
 * Ranking still happens in `src-tauri/src/triage.rs`, never here (§10).
 * "Done" marks and nicknames are view state (localStorage) by design.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronDown,
  CircleAlert,
  Calculator,
  ExternalLink,
  Inbox,
  ListChecks,
  Sparkles,
  Timer,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { CourseStatusDot } from "@/components/layout/CourseStatusDot";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { AssignmentSheet } from "@/components/grade/AssignmentSheet";
import { ImpactBar } from "@/components/triage/ImpactBar";
import { Briefing } from "@/components/triage/Briefing";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { urgencyTier } from "@/lib/urgency";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { springy, useReducedMotion } from "@/hooks/useReducedMotion";
import { useCourses } from "@/hooks/useCourses";
import { calendarItems, courseDetail, debugDump, setEstimate, triageRows } from "@/lib/ipc";
import { dueShort, minutes, pct, relativeDue } from "@/lib/format";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { courseShort } from "@/lib/courseLabel";
import { chipStyle, tickStyle } from "@/lib/courseColor";
import { setDone, useDoneSet, useNicknames } from "@/lib/localPrefs";
import { cn } from "@/lib/utils";
import type { AssignmentDetail, CalendarItem, TriageRow } from "@/types";

type QueueView = "ranked" | "course" | "due";
const QUEUE_VIEW_KEY = "triage-queue-view";
const LAYOUT_KEY = "triage-layout";
type TileFilter = null | "week" | "missing";
type Layout = "brief" | "board";

export default function Triage() {
  const [rows, setRows] = useState<TriageRow[] | null>(null);
  const [week, setWeek] = useState<CalendarItem[]>([]);
  // Unfiltered calendar items — standings needs submitted ones too, to show
  // per-course "2 of 3 in" progress for the week.
  const [allItems, setAllItems] = useState<CalendarItem[]>([]);
  const [openAssignment, setOpenAssignment] = useState<AssignmentDetail | null>(null);
  const [view, setView] = useState<QueueView>(() => {
    const v = localStorage.getItem(QUEUE_VIEW_KEY);
    return v === "course" || v === "due" ? v : "ranked";
  });
  const [filter, setFilter] = useState<TileFilter>(null);
  const [layout, setLayout] = useState<Layout>(() =>
    localStorage.getItem(LAYOUT_KEY) === "board" ? "board" : "brief",
  );
  const [selIdx, setSelIdx] = useState(0);
  const [estimateEditId, setEstimateEditId] = useState<string | null>(null);
  const { courses, openTotal, dueThisWeek, loaded } = useCourses();
  const nicknames = useNicknames();
  const doneSet = useDoneSet();
  const navigate = useNavigate();
  // Captured once per mount so filters compute purely during render.
  const [mountNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    triageRows()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    refresh();
    const now = Date.now();
    calendarItems()
      .then((items) => {
        setAllItems(items);
        return setWeek(
          items
            .filter((i) => !i.submitted && !i.graded)
            .filter((i) => {
              const t = new Date(i.dueAt).getTime();
              return t > now && t < now + 7 * 86_400_000;
            })
            .slice(0, 8),
        );
      })
      .catch(() => {});
  }, [refresh]);

  /** Nickname-aware short label for a course. */
  const labelOf = useCallback(
    (courseId: string, courseCode: string | null) =>
      nicknames[courseId] ?? courseShort(courseCode),
    [nicknames],
  );

  // Done marks and tile filters are view-layer subtraction, never mutation.
  const visibleRows = useMemo(() => {
    if (rows === null) return null;
    let out = rows.filter((r) => !doneSet.has(r.assignmentId));
    if (filter === "week") {
      const horizon = mountNow + 7 * 86_400_000;
      out = out.filter((r) => {
        if (!r.dueAt) return false;
        const t = new Date(r.dueAt).getTime();
        return t < horizon;
      });
    } else if (filter === "missing") {
      out = out.filter((r) => r.state === "missing");
    }
    return out;
  }, [rows, doneSet, filter, mountNow]);

  // Per-course pulse for standings: of everything due this week (from the
  // start of today), how much is already turned in. Submission state comes
  // straight from Canvas data — nothing computed here but counting.
  const weekProgress = useMemo(() => {
    const startOfToday = new Date(mountNow);
    startOfToday.setHours(0, 0, 0, 0);
    const start = startOfToday.getTime();
    const end = mountNow + 7 * 86_400_000;
    const map = new Map<string, { total: number; done: number }>();
    for (const i of allItems) {
      const t = new Date(i.dueAt).getTime();
      if (Number.isNaN(t) || t < start || t >= end) continue;
      const cur = map.get(i.courseId) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (i.submitted || i.graded) cur.done += 1;
      map.set(i.courseId, cur);
    }
    return map;
  }, [allItems, mountNow]);

  // The week's items regardless of the active tile filter — the hover
  // preview on "due this week" must show the same set its click filters to.
  const weekRows = useMemo(() => {
    if (rows === null) return [];
    const horizon = mountNow + 7 * 86_400_000;
    return rows
      .filter((r) => !doneSet.has(r.assignmentId))
      .filter((r) => r.dueAt !== null && new Date(r.dueAt).getTime() < horizon);
  }, [rows, doneSet, mountNow]);

  const pickView = (v: QueueView) => {
    setView(v);
    localStorage.setItem(QUEUE_VIEW_KEY, v);
  };

  const pickLayout = (l: Layout) => {
    setLayout(l);
    localStorage.setItem(LAYOUT_KEY, l);
    // Stat-tile filters have no UI in the brief — never filter invisibly.
    if (l === "brief") setFilter(null);
  };

  /** Groups in display order — also the keyboard traversal order. */
  const groups = useMemo(() => {
    const queue = visibleRows?.slice(1) ?? [];
    return buildGroups(queue, view, labelOf);
  }, [visibleRows, view, labelOf]);

  const displayOrder = useMemo(() => {
    const flat = groups.flatMap((g) => g.rows);
    return visibleRows && visibleRows.length > 0 ? [visibleRows[0], ...flat] : flat;
  }, [groups, visibleRows]);

  const openSheet = useCallback((row: TriageRow) => {
    courseDetail(row.courseId)
      .then((d) => {
        const a = d.assignments.find((x) => x.id === row.assignmentId);
        if (a) setOpenAssignment(a);
        else toast.error("Could not load that assignment.");
      })
      .catch(() => toast.error("Could not load that assignment."));
  }, []);

  const markDone = useCallback((row: TriageRow) => {
    setDone(row.assignmentId, true);
    toast.success(`Done: ${row.name ?? "assignment"}`, {
      action: { label: "Undo", onClick: () => setDone(row.assignmentId, false) },
    });
  }, []);

  // Keyboard: j/k move · e estimate · o open · x done · Enter sheet. Dormant
  // while typing anywhere or while the sheet is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (openAssignment !== null) return;
      // The brief has no selection cursor; j/k/e/o/x belong to the board.
      if (layout !== "board") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const sel = displayOrder[selIdx];
      switch (e.key) {
        case "j":
          e.preventDefault();
          setSelIdx((i) => Math.min(displayOrder.length - 1, i + 1));
          break;
        case "k":
          e.preventDefault();
          setSelIdx((i) => Math.max(0, i - 1));
          break;
        case "e":
          if (sel) {
            e.preventDefault();
            setEstimateEditId(sel.assignmentId);
          }
          break;
        case "o":
          if (sel?.htmlUrl) {
            e.preventDefault();
            void openUrl(sel.htmlUrl);
          }
          break;
        case "x":
          if (sel) {
            e.preventDefault();
            markDone(sel);
          }
          break;
        case "Enter":
          if (sel) {
            e.preventDefault();
            openSheet(sel);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [displayOrder, selIdx, openAssignment, markDone, openSheet, layout]);

  const visible = courses.filter((c) => !c.hidden && c.gradeable);
  const missingTotal = visible.reduce((n, c) => n + c.missingCount, 0);
  const anyGraded = visible.some((c) => c.grade.currentPct !== null);
  const anyEstimates = (visibleRows ?? []).some((r) => r.estMinutes !== null);
  // Pre-grade standings rows show the next dated item instead of a bar.
  const nextDueOf = (courseId: string): string | null => {
    const dues = (visibleRows ?? [])
      .filter((r) => r.courseId === courseId && r.dueAt !== null)
      .map((r) => r.dueAt as string)
      .sort();
    return dues[0] ?? null;
  };

  if (visibleRows === null || !loaded) {
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

  if (visibleRows.length === 0) {
    return (
      <>
        <ScreenHeader title="Triage" subtitle="Ranked by what it costs you to skip." />
        <EmptyState
          icon={ListChecks}
          title={filter ? "Nothing matches this filter" : "Nothing to triage"}
          description={
            filter
              ? "Clear the stat-tile filter to see the whole queue."
              : "Everything gradeable is submitted. Either you're ahead, or a sync is due — check the footer for when Canvas was last read."
          }
          action={
            filter ? (
              <Button variant="outline" onClick={() => setFilter(null)}>
                Clear filter
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/courses">See your courses</Link>
              </Button>
            )
          }
        />
      </>
    );
  }

  const [hero, ...queue] = visibleRows;

  const layoutToggle = (
    <Tabs value={layout} onValueChange={(v) => pickLayout(v === "board" ? "board" : "brief")}>
      <TabsList className="h-8">
        <TabsTrigger value="brief" className="text-xs">
          Brief
        </TabsTrigger>
        <TabsTrigger value="board" className="text-xs">
          Board
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  if (layout === "brief") {
    return (
      <>
        <ScreenHeader
          title="Triage"
          subtitle="Your day, talked through."
          actions={layoutToggle}
        />
        <Briefing
          rows={visibleRows}
          courses={visible}
          openTotal={openTotal}
          dueThisWeek={dueThisWeek}
          labelOf={labelOf}
          onOpen={openSheet}
          onShowBoard={() => pickLayout("board")}
        />
        <AssignmentSheet
          assignment={openAssignment}
          onOpenChange={(open) => !open && setOpenAssignment(null)}
          onChanged={refresh}
        />
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        title="Triage"
        subtitle="Ranked by what it costs you to skip."
        actions={layoutToggle}
      />

      <div className="mx-8 mb-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {/* ── Hero: the one thing to start now ─────────────────────────── */}
        <HeroTile
          row={hero}
          label={labelOf(hero.courseId, hero.courseCode)}
          selected={selIdx === 0}
          estimateEditId={estimateEditId}
          onEstimateConsumed={() => setEstimateEditId(null)}
          onEstimateSaved={refresh}
          onDone={() => markDone(hero)}
        />

        {/* ── Standings ────────────────────────────────────────────────── */}
        <Tile label="Standings" icon={ListChecks}>
          <div className="flex flex-col gap-2.5">
            {visible.map((c) => {
              const wk = weekProgress.get(c.id);
              const hasWeek = wk !== undefined && wk.total > 0;
              const nextDue = nextDueOf(c.id);
              const label = nicknames[c.id] ?? courseShort(c.courseCode ?? c.name);
              // Everything still open in this course, for the hover panel —
              // dated items first (soonest up), undated trailing.
              const courseItems = (rows ?? [])
                .filter((r) => r.courseId === c.id && !doneSet.has(r.assignmentId))
                .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

              const rowBody =
                c.grade.currentPct !== null ? (
                  <Link to={`/courses/${c.id}`} className="group block">
                    <div className="flex items-center gap-2">
                      <CourseStatusDot status={c.status} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium group-hover:underline">
                        {label}
                      </span>
                      <span
                        data-numeric
                        className="font-mono text-xs tabular-nums text-muted-foreground"
                      >
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
                ) : (
                  /* Pre-grade: ONE aligned line per course — dot, name,
                     dotted leader, week bar, fraction, next deadline. */
                  <Link to={`/courses/${c.id}`} className="group flex items-center gap-2">
                    <CourseStatusDot status={c.status} />
                    <span className="min-w-0 shrink truncate text-xs font-medium group-hover:underline">
                      {label}
                    </span>
                    <span
                      aria-hidden
                      className="min-w-3 flex-1 -translate-y-[2px] border-b border-dotted border-border group-hover:border-muted-foreground/50"
                    />
                    {hasWeek && wk && (
                      <>
                        <span
                          aria-hidden
                          className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-fill-ghost"
                        >
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              wk.done === wk.total ? "bg-on-track/80" : "bg-brand/60",
                            )}
                            style={{ width: `${(wk.done / wk.total) * 100}%` }}
                          />
                        </span>
                        <span
                          data-numeric
                          className={cn(
                            "shrink-0 font-mono text-xs tabular-nums",
                            wk.done === wk.total ? "text-on-track-fg" : "text-muted-foreground",
                          )}
                        >
                          {wk.done}/{wk.total} in
                        </span>
                      </>
                    )}
                    <span
                      data-numeric
                      className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground/70"
                    >
                      {nextDue ? dueShort(nextDue) : "—"}
                    </span>
                    {c.missingCount > 0 && (
                      <span className="shrink-0 text-2xs text-critical-fg">
                        {c.missingCount} missing
                      </span>
                    )}
                  </Link>
                );

              return (
                <Tooltip key={c.id}>
                  <TooltipTrigger asChild>
                    <div>{rowBody}</div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="w-80 p-3">
                    <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                      {label} · open work
                    </p>
                    {courseItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nothing open — all caught up here.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {courseItems.slice(0, 10).map((r) => {
                          const past =
                            r.state !== "open" ||
                            (r.dueAt !== null && new Date(r.dueAt).getTime() < mountNow);
                          return (
                            <div key={r.assignmentId} className="flex items-baseline gap-2">
                              <span className="min-w-0 flex-1 truncate text-xs">
                                {stripShouting(r.name).title}
                              </span>
                              <span
                                data-numeric
                                className={cn(
                                  "shrink-0 font-mono text-2xs tabular-nums",
                                  past ? "text-critical-fg" : "text-muted-foreground",
                                )}
                              >
                                {r.dueAt ? dueShort(r.dueAt) : "no date"}
                              </span>
                            </div>
                          );
                        })}
                        {courseItems.length > 10 && (
                          <p className="mt-1 text-2xs text-muted-foreground/70">
                            +{courseItems.length - 10} more — click through to the course
                          </p>
                        )}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {!anyGraded && visible.length > 0 && (
              <p className="mt-0.5 text-2xs text-muted-foreground/70">
                No grades posted yet — standing bars appear as scores land.
              </p>
            )}
          </div>
        </Tile>

        {/* ── Stat tiles: click-to-filter toggles ──────────────────────── */}
        <div className="grid grid-cols-3 gap-4 xl:grid-cols-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-full min-w-0">
                <StatMini
                  label="due this week"
                  value={dueThisWeek}
                  icon={CalendarClock}
                  zeroLabel="nothing due this week"
                  active={filter === "week"}
                  onClick={() => setFilter((f) => (f === "week" ? null : "week"))}
                />
              </div>
            </TooltipTrigger>
            {weekRows.length > 0 && (
              <TooltipContent side="left" className="w-80 p-3">
                <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                  Due this week
                </p>
                <div className="flex flex-col gap-1">
                  {weekRows.slice(0, 12).map((r) => (
                    <div key={r.assignmentId} className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs">
                        {stripShouting(r.name).title}
                      </span>
                      <span className="shrink-0 text-2xs text-muted-foreground">
                        {labelOf(r.courseId, r.courseCode)}
                      </span>
                      <span
                        data-numeric
                        className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground"
                      >
                        {dueShort(r.dueAt)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-2xs text-muted-foreground/70">
                  {weekRows.length > 12 && `+${weekRows.length - 12} more · `}click the tile to
                  filter the queue
                </p>
              </TooltipContent>
            )}
          </Tooltip>
          <StatMini
            label="open items"
            value={openTotal}
            icon={Inbox}
            active={filter === null}
            onClick={() => setFilter(null)}
          />
          <StatMini
            label="missing"
            value={missingTotal}
            icon={CircleAlert}
            tone={missingTotal > 0 ? "critical" : undefined}
            zeroLabel="nothing missing"
            active={filter === "missing"}
            onClick={() => setFilter((f) => (f === "missing" ? null : "missing"))}
          />
        </div>

        {/* ── The queue ────────────────────────────────────────────────── */}
        <Tile
          label={
            filter
              ? `Queue · ${filter === "week" ? "due this week" : "missing"} only · ${queue.length} shown`
              : `Queue · showing ${queue.length} of ${openTotal} open`
          }
          icon={ListChecks}
          className="xl:col-span-3"
          padded={false}
          actions={<ViewToggle view={view} onPick={pickView} />}
        >
          <QueueGroups
            groups={groups}
            showEstimates={anyEstimates}
            onEstimate={(r) => setEstimateEditId(r.assignmentId)}
            showRanks={view === "ranked"}
            rankOf={new Map(queue.map((r, i) => [r.assignmentId, i + 2]))}
            selectedId={displayOrder[selIdx]?.assignmentId ?? null}
            labelOf={labelOf}
            grouped={view === "course"}
            estimateEditId={estimateEditId}
            onEstimateConsumed={() => setEstimateEditId(null)}
            onEstimateSaved={refresh}
            onOpen={openSheet}
            onDone={markDone}
            onSolver={(r) => navigate(`/courses/${r.courseId}?solver=1`)}
          />
        </Tile>

        {/* ── Right rail: week · workload · what changed ───────────────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <Tile label="Next 7 days" icon={CalendarClock}>
            {week.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing due in the next week.</p>
            ) : (
              <WeekAhead items={week} labelOf={labelOf} />
            )}
          </Tile>
          <Tile label="Workload by day" icon={Timer}>
            <WorkloadByDay rows={visibleRows} />
          </Tile>
          <Tile label="What changed" icon={Sparkles}>
            <WhatChanged labelOf={labelOf} />
          </Tile>
        </div>
      </div>

      <AssignmentSheet
        assignment={openAssignment}
        onOpenChange={(open) => !open && setOpenAssignment(null)}
        onChanged={refresh}
      />
    </>
  );
}

/* ── Grouping (display order = keyboard order) ───────────────────────────── */

interface QueueGroup {
  key: string;
  heading: React.ReactNode;
  rows: TriageRow[];
}

function buildGroups(
  queue: TriageRow[],
  view: QueueView,
  labelOf: (courseId: string, courseCode: string | null) => string,
): QueueGroup[] {
  if (view === "ranked") return [{ key: "all", heading: null, rows: queue }];

  if (view === "course") {
    const byCourse = new Map<string, TriageRow[]>();
    for (const r of queue) byCourse.set(r.courseId, [...(byCourse.get(r.courseId) ?? []), r]);
    return [...byCourse.entries()].map(([courseId, rows]) => {
      const nextDue = rows
        .map((r) => r.dueAt)
        .filter((d): d is string => d !== null)
        .sort()[0];
      return {
        key: courseId,
        heading: (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="h-3 w-[3px] shrink-0 rounded-full" style={tickStyle(courseId)} />
            <span className="truncate text-xs font-semibold text-foreground/90">
              {labelOf(courseId, rows[0].courseCode)}
            </span>
            <span className="shrink-0 whitespace-nowrap text-2xs text-muted-foreground">
              {rows.length} item{rows.length === 1 ? "" : "s"}
              {nextDue && (
                <>
                  {" "}
                  · next due{" "}
                  <span data-numeric className="font-mono tabular-nums">
                    {relativeDue(nextDue)}
                  </span>
                </>
              )}
            </span>
          </span>
        ),
        rows,
      };
    });
  }

  // by due
  const nowRef = new Date().setSeconds(0, 0);
  const daysOf = (r: TriageRow): number | null => {
    if (!r.dueAt) return null;
    const t = new Date(r.dueAt).getTime();
    return Number.isNaN(t) ? null : (t - nowRef) / 86_400_000;
  };
  const buckets = [
    { key: "today", label: "Due today", test: (d: number | null) => d !== null && d <= 0.999 },
    { key: "weekb", label: "This week", test: (d: number | null) => d !== null && d <= 7 },
    { key: "later", label: "Further out", test: (d: number | null) => d !== null },
    { key: "undated", label: "No due date", test: (d: number | null) => d === null },
  ];
  const used = new Set<string>();
  const out: QueueGroup[] = [];
  for (const b of buckets) {
    const rows = queue
      .filter((r) => !used.has(r.assignmentId) && b.test(daysOf(r)))
      .sort((a, b2) => (a.dueAt ?? "9").localeCompare(b2.dueAt ?? "9"));
    rows.forEach((r) => used.add(r.assignmentId));
    if (rows.length > 0) {
      out.push({
        key: b.key,
        heading: (
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {b.label} · {rows.length}
          </span>
        ),
        rows,
      });
    }
  }
  return out;
}

function ViewToggle({ view, onPick }: { view: QueueView; onPick: (v: QueueView) => void }) {
  return (
    <div className="flex items-center rounded-md border border-border/60 p-0.5">
      {(
        [
          ["ranked", "Ranked"],
          ["course", "By course"],
          ["due", "By due"],
        ] as [QueueView, string][]
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className={cn(
            "rounded px-2 py-0.5 text-2xs font-medium transition-colors duration-micro",
            view === v
              ? "bg-fill-ghost-selected text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function QueueGroups({
  groups,
  showEstimates,
  onEstimate,
  showRanks,
  rankOf,
  selectedId,
  grouped,
  labelOf,
  estimateEditId,
  onEstimateConsumed,
  onEstimateSaved,
  onOpen,
  onDone,
  onSolver,
}: {
  groups: QueueGroup[];
  showEstimates: boolean;
  onEstimate: (r: TriageRow) => void;
  showRanks: boolean;
  rankOf: Map<string, number>;
  selectedId: string | null;
  grouped: boolean;
  labelOf: (courseId: string, courseCode: string | null) => string;
  estimateEditId: string | null;
  onEstimateConsumed: () => void;
  onEstimateSaved: () => void;
  onOpen: (r: TriageRow) => void;
  onDone: (r: TriageRow) => void;
  onSolver: (r: TriageRow) => void;
}) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col">
      {groups.map((g) => {
        const isCollapsed = collapsedKeys.has(g.key);
        return (
          <div key={g.key}>
            {g.heading && (
              <button
                type="button"
                onClick={() => toggle(g.key)}
                // Sticky: the group you're scrolled into stays named.
                className="sticky top-0 z-10 flex w-full items-center gap-2 border-t border-border bg-elevated px-4 py-2 text-left transition-colors duration-micro hover:bg-fill-ghost"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-micro",
                    isCollapsed && "-rotate-90",
                  )}
                />
                {g.heading}
              </button>
            )}
            {!isCollapsed &&
              g.rows.map((row) => (
                <QueueRow
                  key={row.assignmentId}
                  row={row}
                  showEstimate={showEstimates}
                  onEstimate={() => onEstimate(row)}
                  rank={showRanks ? (rankOf.get(row.assignmentId) ?? 0) : null}
                  selected={row.assignmentId === selectedId}
                  grouped={grouped}
                  label={labelOf(row.courseId, row.courseCode)}
                  estimateEditId={estimateEditId}
                  onEstimateConsumed={onEstimateConsumed}
                  onEstimateSaved={onEstimateSaved}
                  onOpen={() => onOpen(row)}
                  onDone={() => onDone(row)}
                  onSolver={() => onSolver(row)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

/* ── Tiles ───────────────────────────────────────────────────────────────── */

function Tile({
  label,
  icon: Icon,
  children,
  className,
  padded = true,
  actions,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-3xl border border-border/60 bg-card shadow-card",
        padded ? "p-4" : "pt-4",
        className,
      )}
    >
      <div className={cn("mb-2.5 flex items-center justify-between gap-2", !padded && "px-4")}>
        <h2 className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function HeroTile({
  row,
  label,
  selected,
  estimateEditId,
  onEstimateConsumed,
  onEstimateSaved,
  onDone,
}: {
  row: TriageRow;
  label: string;
  selected: boolean;
  estimateEditId: string | null;
  onEstimateConsumed: () => void;
  onEstimateSaved: () => void;
  onDone: () => void;
}) {
  const pinned = row.state !== "open";
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-3xl border p-5 shadow-card xl:col-span-2",
        pinned ? "border-critical/40 bg-critical/5" : "border-brand/25 bg-brand/5",
        selected && "ring-2 ring-ring",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Up next
        </span>
        {pinned && (
          <span className="chip bg-critical/10 text-2xs text-critical-fg">
            {row.state === "missing" ? "missing" : "overdue"}
          </span>
        )}
        <button
          type="button"
          onClick={onDone}
          title="Mark done (x)"
          className="ml-auto rounded-md p-1 text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-on-track-fg"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>

      <h2 className="mt-2 font-display text-2xl font-semibold leading-snug">
        {stripShouting(row.name).title}
      </h2>
      <div className="mt-1 flex flex-wrap items-baseline gap-3 text-sm text-muted-foreground">
        <Link to={`/courses/${row.courseId}`} className="font-medium hover:underline">
          {label}
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
          <EstimateCell
            row={row}
            onSaved={onEstimateSaved}
            prominent
            forceEdit={estimateEditId === row.assignmentId}
            onEditConsumed={onEstimateConsumed}
          />
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
  zeroLabel,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "critical";
  /** When set, a zero renders as this quiet all-clear line instead of a
   *  full tile — good news shouldn't weigh as much as open work. */
  zeroLabel?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  if (value === 0 && zeroLabel && !active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-full w-full min-w-0 items-center gap-1.5 rounded-3xl border border-border/60 bg-card px-4 py-2.5 text-left shadow-card transition-colors duration-micro hover:border-muted-foreground/40"
        title="Click to filter the queue"
      >
        <Check className="h-3 w-3 shrink-0 text-on-track-fg" />
        <span className="truncate text-2xs text-muted-foreground">{zeroLabel}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full w-full min-w-0 flex-col justify-center rounded-3xl border bg-card px-4 py-3 text-left shadow-card transition-colors duration-micro hover:border-muted-foreground/40",
        tone === "critical" ? "border-critical/40" : "border-border/60",
        active && "border-brand/60 bg-brand/5",
      )}
      title={active ? "Filtering the queue — click to clear" : "Click to filter the queue"}
    >
      <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
        {active && <span className="ml-auto text-2xs normal-case text-brand-fg">filtering</span>}
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
    </button>
  );
}

/* ── Queue row ───────────────────────────────────────────────────────────── */

/** "[REQUIRED] Homework 1" → title without the shouting + the chip text. */
function stripShouting(name: string | null): { title: string; flags: string[] } {
  const raw = name ?? "Untitled";
  const flags: string[] = [];
  const title = raw
    .replace(/\[([A-Z][A-Z !]{2,})\]/g, (_, f: string) => {
      flags.push(f.trim().toLowerCase());
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
  return { title: title || raw, flags };
}

function QueueRow({
  row,
  showEstimate,
  onEstimate,
  rank,
  selected,
  grouped,
  label,
  estimateEditId,
  onEstimateConsumed,
  onEstimateSaved,
  onOpen,
  onDone,
  onSolver,
}: {
  row: TriageRow;
  /** True once any row has an estimate — the column exists or it doesn't. */
  showEstimate: boolean;
  onEstimate: () => void;
  /** Null = ranks hidden in this view (non-sequential ranks are noise). */
  rank: number | null;
  selected: boolean;
  grouped: boolean;
  label: string;
  estimateEditId: string | null;
  onEstimateConsumed: () => void;
  onEstimateSaved: () => void;
  onOpen: () => void;
  onDone: () => void;
  onSolver: () => void;
}) {
  const reduced = useReducedMotion();
  const pinned = row.state !== "open";
  const { title, flags } = stripShouting(row.name);

  // Urgency gradient, hottest first: overdue (dark red, says "overdue") →
  // due within hours (bright red) → due within 72h (amber due text) →
  // normal → far-off/undated (dimmed). Color lives in the text and chips,
  // never in row washes — tinted rows over colored lines read as mud.
  const [nowMs] = useState(() => Date.now());
  const hoursLeft =
    row.dueAt !== null ? (new Date(row.dueAt).getTime() - nowMs) / 3_600_000 : null;
  const overdue = pinned || (hoursLeft !== null && hoursLeft <= 0);
  const imminent = !overdue && hoursLeft !== null && hoursLeft <= 6;
  const soon = !overdue && !imminent && hoursLeft !== null && hoursLeft <= 72;
  const dueToday = soon && (hoursLeft as number) <= 24;
  const distant = !overdue && !imminent && !soon && (hoursLeft === null || hoursLeft > 7 * 24);

  return (
    <motion.div
      layout
      transition={springy(reduced)}
      onClick={onOpen}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 border-t border-border/60 py-2.5 pl-5 pr-4 transition-colors duration-micro hover:bg-fill-ghost/50",
        overdue && "bg-critical/[0.07]",
        selected && "bg-fill-ghost/60 ring-1 ring-inset ring-ring",
      )}
    >
      {/* Identity tick: which class, before you've read a word. */}
      <span
        aria-hidden
        className="absolute bottom-2 left-1.5 top-2 w-[3px] rounded-full"
        style={tickStyle(row.courseId)}
      />
      {rank !== null && (
        <span
          data-numeric
          className="w-5 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground"
        >
          {rank}
        </span>
      )}

      {/* One line: title + exception chips, then fixed columns. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn("truncate text-sm", distant && "text-foreground/70")}>{title}</span>
        {overdue && (
          <span className="chip shrink-0 bg-critical/25 text-2xs font-semibold text-critical-fg/90">
            {row.state === "missing" ? "missing" : "overdue"}
          </span>
        )}
        {imminent && (
          <span className="chip shrink-0 bg-critical/15 text-2xs font-semibold text-critical-fg">
            due in {Math.max(1, Math.ceil(hoursLeft as number))}h
          </span>
        )}
        {dueToday && (
          <span className="chip shrink-0 bg-at-risk/15 text-2xs font-medium text-at-risk-fg">
            due today
          </span>
        )}
        {flags.map((f) => (
          <span
            key={f}
            className="chip shrink-0 border border-border/70 bg-transparent text-2xs text-muted-foreground"
          >
            {f}
          </span>
        ))}
      </div>

      {!grouped && (
        <Link
          to={`/courses/${row.courseId}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded px-1.5 py-0.5 text-2xs font-medium text-foreground/80 hover:underline"
          style={chipStyle(row.courseId)}
        >
          {label}
        </Link>
      )}

      <span
        data-numeric
        title={row.dueAt ? undefined : "no due date"}
        className={cn(
          "w-16 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums text-muted-foreground",
          overdue && "font-medium text-critical-fg/75",
          imminent && "font-semibold text-critical-fg",
          soon && "font-medium text-at-risk-fg",
          distant && "text-muted-foreground/50",
        )}
      >
        {row.dueAt ? relativeDue(row.dueAt) : "—"}
      </span>

      <ImpactBar
        impactPct={row.impactPct}
        tier={urgencyTier(row.state, row.dueAt)}
        className="hidden md:flex"
      />

      {(showEstimate || row.estMinutes !== null || estimateEditId === row.assignmentId) && (
        <span onClick={(e) => e.stopPropagation()}>
          <EstimateCell
            row={row}
            onSaved={onEstimateSaved}
            forceEdit={estimateEditId === row.assignmentId}
            onEditConsumed={onEstimateConsumed}
          />
        </span>
      )}

      {/* Hover quick actions, floating over the estimate end of the row. */}
      <span
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-border/60 bg-elevated p-0.5 opacity-0 shadow-card transition-opacity duration-micro group-hover:opacity-100"
      >
        {row.htmlUrl && (
          <QuickAction title="Open in Canvas (o)" onClick={() => void openUrl(row.htmlUrl as string)}>
            <ExternalLink className="h-3.5 w-3.5" />
          </QuickAction>
        )}
        <QuickAction title="What do I need? (solver)" onClick={onSolver}>
          <Calculator className="h-3.5 w-3.5" />
        </QuickAction>
        {!showEstimate && row.estMinutes === null && (
          <QuickAction title="Add time estimate (e)" onClick={onEstimate}>
            <Timer className="h-3.5 w-3.5" />
          </QuickAction>
        )}
        <QuickAction title="Mark done (x)" onClick={onDone} success>
          <Check className="h-3.5 w-3.5" />
        </QuickAction>
      </span>
    </motion.div>
  );
}

function QuickAction({
  title,
  onClick,
  success,
  children,
}: {
  title: string;
  onClick: () => void;
  success?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost",
        success ? "hover:text-on-track-fg" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Inline-editable estimate: dashed underline = "you can edit this". */
function EstimateCell({
  row,
  onSaved,
  prominent,
  forceEdit,
  onEditConsumed,
}: {
  row: TriageRow;
  onSaved: () => void;
  prominent?: boolean;
  /** Keyboard 'e' lands here: start editing when true. */
  forceEdit?: boolean;
  onEditConsumed?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (forceEdit && !editing) {
      // Synchronising with the keyboard layer: 'e' lands as a prop change
      // and must open the editor.
      // oxlint-disable-next-line set-state-in-effect
      setValue(row.estMinutes?.toString() ?? "");
      setEditing(true);
      onEditConsumed?.();
    }
  }, [forceEdit, editing, row.estMinutes, onEditConsumed]);

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
          "shrink-0 rounded-md text-right font-mono text-xs tabular-nums text-muted-foreground underline decoration-border decoration-dashed underline-offset-4 transition-colors duration-micro hover:text-foreground hover:decoration-muted-foreground",
          prominent
            ? "flex items-center gap-1 border border-border/60 px-2.5 py-1.5 no-underline"
            : "w-14 px-1.5 py-1",
        )}
        title="Your time estimate — click to edit (e)"
      >
        {prominent && <Timer className="h-3 w-3" />}
        {prominent && row.estMinutes === null ? "add estimate" : minutes(row.estMinutes)}
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
      className="w-14 shrink-0 rounded-md border border-brand bg-transparent px-1.5 py-1 text-right font-mono text-xs tabular-nums outline-none"
    />
  );
}

/* ── Rail widgets ────────────────────────────────────────────────────────── */

/**
 * The week as an editorial timeline: hairline spine, date leaves, dotted
 * leaders tying titles to course labels, due clocks.
 */
function WeekAhead({
  items,
  labelOf,
}: {
  items: CalendarItem[];
  labelOf: (courseId: string, courseCode: string | null) => string;
}) {
  const byDay = new Map<string, { date: Date; items: CalendarItem[] }>();
  for (const item of items) {
    const d = new Date(item.dueAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = byDay.get(key) ?? { date: d, items: [] };
    bucket.items.push(item);
    byDay.set(key, bucket);
  }
  const [todayKey] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
  });
  const [tomorrowKey] = useState(() => {
    const n = new Date(Date.now() + 86_400_000);
    return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
  });

  return (
    <div className="relative flex flex-col gap-3">
      <div aria-hidden className="absolute bottom-2 left-[17px] top-2 w-px bg-border" />
      {[...byDay.entries()].map(([key, { date, items: dayItems }]) => {
        const tier = key === todayKey ? "today" : key === tomorrowKey ? "soon" : "later";
        return (
          <div key={key} className="relative flex gap-3">
            <div
              className={cn(
                "z-10 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border leading-none",
                tier === "today" && "border-at-risk/50 bg-at-risk/15 text-at-risk-fg",
                tier === "soon" && "border-at-risk/40 bg-card text-at-risk-fg",
                tier === "later" && "border-border bg-card text-muted-foreground",
              )}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wide">
                {tier === "today" ? "now" : date.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span data-numeric className="font-mono text-sm font-semibold tabular-nums">
                {date.getDate()}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              {dayItems.map((i) => (
                <Link
                  key={i.assignmentId}
                  to={`/courses/${i.courseId}`}
                  className="group flex items-baseline gap-2 rounded-md px-1 py-0.5 transition-colors duration-micro hover:bg-fill-ghost"
                >
                  <span className="min-w-0 shrink truncate text-xs text-foreground/90 group-hover:text-foreground">
                    {stripShouting(i.name).title}
                  </span>
                  <span
                    aria-hidden
                    className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border group-hover:border-muted-foreground/50"
                  />
                  <span
                    data-numeric
                    className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60"
                  >
                    {dueClock(i.dueAt)}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-muted-foreground group-hover:text-foreground/80">
                    {labelOf(i.courseId, i.courseCode)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Estimated hours per day for the next 7 days — a linear bar per day, never
 *  a donut (§5: one donut in the whole app, and it isn't here). */
function WorkloadByDay({ rows }: { rows: TriageRow[] }) {
  const [start] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const dayStart = start + i * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    const dayRows = rows.filter((r) => {
      if (!r.dueAt) return false;
      const t = new Date(r.dueAt).getTime();
      return t >= dayStart && t < dayEnd;
    });
    const mins = dayRows.reduce((s, r) => s + (r.estMinutes ?? 60), 0);
    const unestimated = dayRows.filter((r) => r.estMinutes === null).length;
    return { date: new Date(dayStart), mins, count: dayRows.length, unestimated };
  });
  const maxMins = Math.max(60, ...days.map((d) => d.mins));
  const anyUnestimated = days.some((d) => d.unestimated > 0);

  if (days.every((d) => d.count === 0)) {
    return <p className="text-xs text-muted-foreground">Nothing due in the next week.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {days.map((d) => (
        <div key={d.date.toISOString()} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d.date.toLocaleDateString(undefined, { weekday: "short" })}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-fill-ghost" aria-hidden>
            <span
              className={cn(
                "block h-full rounded-full",
                d.mins / 60 >= 4 ? "bg-at-risk/80" : "bg-brand/60",
              )}
              style={{ width: `${(d.mins / maxMins) * 100}%` }}
            />
          </span>
          <span
            data-numeric
            className="w-12 shrink-0 whitespace-nowrap text-right font-mono text-2xs tabular-nums text-muted-foreground"
          >
            {d.count > 0 ? minutes(d.mins) : "—"}
          </span>
        </div>
      ))}
      {anyUnestimated && (
        <p className="mt-1 text-2xs text-muted-foreground/70">
          Unestimated items counted at 1h — add estimates to sharpen this.
        </p>
      )}
    </div>
  );
}

/** Grades posted recently, with the score — sourced from the local DB dump
 *  (already-synced data; nothing here re-fetches Canvas). */
function WhatChanged({
  labelOf,
}: {
  labelOf: (courseId: string, courseCode: string | null) => string;
}) {
  const [items, setItems] = useState<
    { id: string; courseId: string; courseCode: string | null; name: string; text: string }[] | null
  >(null);

  useEffect(() => {
    debugDump()
      .then((d) => {
        const cutoff = new Date(Date.now() - 10 * 86_400_000).toISOString();
        const nameOf = new Map(d.assignments.map((a) => [a.id, a] as const));
        const codeOf = new Map(d.courses.map((c) => [c.id, c.courseCode] as const));
        const recent = d.submissions
          .filter((s) => s.gradedAt !== null && s.gradedAt > cutoff && s.score !== null)
          .sort((a, b) => (b.gradedAt ?? "").localeCompare(a.gradedAt ?? ""))
          .slice(0, 8)
          .flatMap((s) => {
            const a = nameOf.get(s.assignmentId);
            if (!a) return [];
            return [
              {
                id: s.assignmentId,
                courseId: a.courseId,
                courseCode: codeOf.get(a.courseId) ?? null,
                name: stripShouting(a.name).title,
                text:
                  a.pointsPossible !== null
                    ? `scored ${s.score}/${a.pointsPossible}`
                    : `scored ${s.score}`,
              },
            ];
          });
        setItems(recent);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <Skeleton className="h-16 rounded-lg" />;
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No grades posted in the last 10 days. When one lands, it shows here with the score.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {items.map((i) => (
        <Link
          key={i.id}
          to={`/courses/${i.courseId}`}
          className="group flex items-baseline gap-2 rounded-md px-1 py-0.5 transition-colors duration-micro hover:bg-fill-ghost"
        >
          <span className="min-w-0 shrink truncate text-xs">{i.name}</span>
          <span
            aria-hidden
            className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
          />
          <span data-numeric className="shrink-0 font-mono text-2xs tabular-nums">
            {i.text}
          </span>
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
            {labelOf(i.courseId, i.courseCode)}
          </span>
        </Link>
      ))}
    </div>
  );
}

/** "11:59p" — the compact clock for agenda rows. Presentation only. */
function dueClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "p" : "a";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
}
