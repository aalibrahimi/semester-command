/**
 * CourseDetail — one course, in full (SPEC.md §5, screen 2).
 *
 * Called by: the router, at "/courses/:courseId" (`?solver=1` auto-opens the
 * solver — triage's quick action lands there).
 * Calls: ipc `course_detail` / `what_do_i_need` / `set_target`; localPrefs
 * for the nickname.
 *
 * Design-review layout:
 * - **Grade hero** — current vs projected + the gap bar, but ONLY once at
 *   least one item is graded. Before that: "No grades posted yet" and when
 *   the first graded work lands. Never 0.0%, never a projected F, never an
 *   empty hatched bar. "Best still possible" lives in the solver dialog.
 * - **Composition card** — the app's one donut: assignment-group weights,
 *   muted segments for groups with nothing graded, current grade in the
 *   center. The legend IS the group summary; hover highlights, click
 *   filters the list. Zero-weight groups that contain assignments always
 *   carry a "0% of grade" warning chip.
 * - **Assignment list** — grouped by assignment group, heaviest first,
 *   collapsible, sticky headers. Within groups by due date, undated last.
 *   Strict row grid: title (flex) · due ("Wed 10:30a", fixed) · impact bar
 *   (fixed) · points (fixed, right, mono). Title shouting like [REQUIRED]
 *   demotes to a quiet outline chip.
 *
 * Every percentage came out of `grades.rs` (§10); this file arranges.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Pencil,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { AssignmentSheet } from "@/components/grade/AssignmentSheet";
import { ImpactBar } from "@/components/triage/ImpactBar";
import { urgencyTier } from "@/lib/urgency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { courseDetail, setCourseHidden, setTarget, whatDoINeed } from "@/lib/ipc";
import { announceCoursesChanged } from "@/hooks/useCourses";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { parseCourseLabel } from "@/lib/courseLabel";
import { setNickname, useNicknames } from "@/lib/localPrefs";
import { dueShort, pct, points } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AssignmentDetail,
  CourseDetailPayload,
  GroupDetail,
  SolverAnswer,
} from "@/types";

/** Letter → percent for the target picker. Mirrors DEFAULT_SCALE in Rust. */
const TARGETS: [string, number][] = [
  ["A", 93],
  ["A-", 90],
  ["B+", 87],
  ["B", 83],
  ["B-", 80],
  ["C+", 77],
  ["C", 73],
  ["C-", 70],
];

/** Categorical hues for the donut segments — the same family as course
 *  identity colors, applied per group here. */
const SEGMENT_HUES = [217, 330, 172, 282, 48, 255, 200];

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CourseDetailPayload | null>(null);
  const [missingCourse, setMissingCourse] = useState(false);
  const [solverOpen, setSolverOpen] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  const nicknames = useNicknames();

  const refresh = useCallback(() => {
    if (!courseId) return;
    courseDetail(courseId)
      .then(setData)
      .catch(() => setMissingCourse(true));
  }, [courseId]);

  useEffect(() => {
    // Synchronising with the Rust backend on route change; the resets stop
    // the previous course's numbers flashing under the new URL.
    // oxlint-disable-next-line set-state-in-effect
    setData(null);
    setMissingCourse(false);
    setFilterGroupId(null);
    refresh();
  }, [refresh]);

  // Triage's solver quick-action arrives as ?solver=1.
  useEffect(() => {
    if (searchParams.get("solver") === "1") {
      // oxlint-disable-next-line set-state-in-effect
      setSolverOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (missingCourse) {
    return (
      <>
        <ScreenHeader title="Course" />
        <EmptyState
          icon={GraduationCap}
          title="Course not found"
          description="This course isn't in the local database — it may have been removed on Canvas, or sync hasn't seen it yet."
        />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <ScreenHeader title="Course" />
        <div className="mx-8 flex flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </>
    );
  }

  const { summary: s, groups, assignments } = data;
  const label = parseCourseLabel(s.courseCode ?? s.name);
  const nickname = nicknames[s.id];
  const floor = floorForCanvasCourse(s.courseCode);
  const anyGraded = assignments.some((a) => a.score !== null);
  const currentBelowFloor =
    floor !== null && s.grade.currentPct !== null && s.grade.currentPct < floor.pct;
  const maxBelowFloor = floor !== null && s.maxPossiblePct < floor.pct;

  const pickTarget = (letter: string) => {
    const found = TARGETS.find(([l]) => l === letter);
    if (!found || !courseId) return;
    setTarget(courseId, found[1], found[0])
      .then(() => {
        refresh();
        announceCoursesChanged();
      })
      .catch(() => toast.error("Could not save the target."));
  };

  return (
    <>
      <ScreenHeader
        title={
          <TitleWithNickname
            courseId={s.id}
            nickname={nickname}
            fallback={label.code ?? label.title}
          />
        }
        subtitle={label.code && label.title !== label.code ? label.title : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!courseId) return;
                setCourseHidden(courseId, !s.hidden)
                  .then(() => {
                    announceCoursesChanged();
                    refresh();
                    toast.success(
                      s.hidden
                        ? "Course restored everywhere."
                        : "Course hidden — its data stays synced. Unhide from Courses.",
                    );
                  })
                  .catch(() => toast.error("Could not update the course."));
              }}
              title={s.hidden ? "Unhide this course" : "Hide this course everywhere"}
            >
              {s.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Select value={s.targetLetter} onValueChange={pickTarget}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <Target className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGETS.map(([letter, cutoff]) => (
                  <SelectItem key={letter} value={letter}>
                    Target {letter} ({cutoff}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setSolverOpen(true)} disabled={!s.gradeable}>
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
              What do I need?
            </Button>
          </div>
        }
      />

      <div className="mx-8 mb-10 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Degree-floor warning: class grade and DEGREE are different ledgers. */}
        {(currentBelowFloor || maxBelowFloor) && floor && (
          <Alert className="border-critical/50 xl:col-span-3">
            <AlertTriangle className="h-4 w-4 text-critical-fg" />
            <AlertTitle>
              {maxBelowFloor
                ? "This course can no longer meet the degree minimum"
                : `Current grade is below the ${floor.letter} degree floor`}
            </AlertTitle>
            <AlertDescription>
              The degree requires <strong>{floor.letter}</strong> ({floor.pct}%) or better for
              this course to count{floor.note ? ` — ${floor.note}` : "."}{" "}
              {maxBelowFloor
                ? "Even a perfect run from here lands below it — talk to the professor and your advisor about options this week, not at finals."
                : "Passing the class below that line means retaking it for degree credit — check the Graduation tab before deprioritizing this course."}
            </AlertDescription>
          </Alert>
        )}

        {/* Reconciliation warning (§4.2): our math vs Canvas's, never silent. */}
        {s.grade.reconciliationDelta !== null && (
          <Alert className="border-at-risk/40 xl:col-span-3">
            <AlertTriangle className="h-4 w-4 text-at-risk-fg" />
            <AlertTitle>Our math disagrees with Canvas here</AlertTitle>
            <AlertDescription>
              We compute {pct(s.grade.currentPct)} but Canvas reports{" "}
              {pct(s.grade.canvasCurrentPct)} — a gap of{" "}
              {Math.abs(s.grade.reconciliationDelta).toFixed(1)} points. This usually means an
              unmodelled course rule (dropped-lowest, a curve). Trust Canvas's number until this
              banner clears, and treat the solver as approximate for this course.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Grade hero (§ design review: honest empty state) ──────────── */}
        <Card
          className={cn(
            "rounded-3xl border-border/60 shadow-card",
            groups.length > 0 ? "xl:col-span-2" : "xl:col-span-3",
          )}
        >
          <CardContent className="flex h-full flex-col gap-5 pt-6">
            {anyGraded ? (
              <>
                <div className="flex flex-wrap items-end gap-8">
                  <div>
                    <div
                      data-numeric
                      className="font-display text-display font-semibold leading-none tabular-nums"
                    >
                      {pct(s.grade.currentPct)}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      current{s.currentLetter ? ` · ${s.currentLetter}` : ""} — ungraded work
                      excluded
                    </div>
                  </div>
                  <div>
                    <div
                      data-numeric
                      className="font-mono text-3xl font-medium tabular-nums text-muted-foreground"
                    >
                      {pct(s.grade.projectedPct)}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      projected · {s.projectedLetter} — if you stopped today
                    </div>
                  </div>
                  {s.grade.gapPct !== null && s.grade.gapPct > 0.05 && (
                    <div className="mb-1 whitespace-nowrap rounded-lg bg-at-risk/10 px-3 py-1.5 text-xs text-at-risk-fg">
                      {s.grade.gapPct.toFixed(1)} points still in play
                    </div>
                  )}
                </div>
                <GradeGapBar
                  projectedPct={s.grade.projectedPct}
                  maxPossiblePct={s.maxPossiblePct}
                  targetPct={s.targetPct}
                  floorPct={floor?.pct}
                  floorLabel={
                    floor ? `${floor.letter} required for degree credit (${floor.pct}%)` : undefined
                  }
                  status={s.status}
                />
                <div className="flex justify-between text-2xs text-muted-foreground">
                  <span>
                    target: {s.targetLetter} ({s.targetPct.toFixed(0)}%)
                  </span>
                  <span>
                    grading: {s.grade.mode === "weighted" ? "weighted groups" : "total points"}
                  </span>
                </div>
              </>
            ) : (
              /* Nothing graded: current is mathematically undefined. Say so —
                 never 0.0%, never a projected F, never an empty hatched bar. */
              <div className="flex h-full flex-col items-start justify-center gap-2 py-6">
                <div className="font-display text-2xl font-semibold">No grades posted yet</div>
                <p className="max-w-md text-sm text-muted-foreground">
                  {firstDueLabel(assignments) ??
                    "Grades appear here the moment the first item is scored."}
                </p>
                <p className="text-2xs text-muted-foreground">
                  Target {s.targetLetter} ({s.targetPct.toFixed(0)}%) ·{" "}
                  {s.grade.mode === "weighted" ? "weighted groups" : "total points"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Composition (the app's one donut) ─────────────────────────── */}
        {groups.length > 0 && (
          <CompositionCard
            groups={groups}
            mode={s.grade.mode}
            centerLabel={anyGraded ? pct(s.grade.currentPct) : "—"}
            assignments={assignments}
            hoverGroupId={hoverGroupId}
            onHover={setHoverGroupId}
            filterGroupId={filterGroupId}
            onFilter={(id) => setFilterGroupId((cur) => (cur === id ? null : id))}
          />
        )}

        {/* ── Assignments, grouped (§ design review strict grid) ────────── */}
        <GroupedAssignments
          groups={groups}
          assignments={assignments}
          mode={s.grade.mode}
          hoverGroupId={hoverGroupId}
          filterGroupId={filterGroupId}
          onClearFilter={() => setFilterGroupId(null)}
          onOpen={setOpenAssignmentId}
        />
      </div>

      <SolverDialog
        open={solverOpen}
        onOpenChange={setSolverOpen}
        courseId={s.id}
        defaultTargetPct={s.targetPct}
        maxPossiblePct={s.maxPossiblePct}
        assignments={assignments.filter((a) => a.score === null && !a.excused && !a.omitted)}
      />

      <AssignmentSheet
        assignment={assignments.find((a) => a.id === openAssignmentId) ?? null}
        onOpenChange={(open) => !open && setOpenAssignmentId(null)}
        onChanged={refresh}
      />
    </>
  );
}

/* ── Header nickname ─────────────────────────────────────────────────────── */

/** The course title with an inline nickname editor: the pencil appears on
 *  hover; the nickname is view-layer state used everywhere. */
function TitleWithNickname({
  courseId,
  nickname,
  fallback,
}: {
  courseId: string;
  nickname: string | undefined;
  fallback: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setNickname(courseId, value);
          setEditing(false);
          announceCoursesChanged();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder={fallback}
        className="w-64 rounded-md border border-brand bg-transparent px-2 py-0.5 font-display text-xl font-semibold outline-none"
      />
    );
  }
  return (
    <span className="group inline-flex items-center gap-2">
      {nickname ?? fallback}
      <button
        type="button"
        onClick={() => {
          setValue(nickname ?? "");
          setEditing(true);
        }}
        title="Set a nickname — used everywhere in place of the Canvas name"
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity duration-micro hover:bg-fill-ghost group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/* ── Composition donut ───────────────────────────────────────────────────── */

interface SegmentInfo {
  group: GroupDetail;
  share: number; // 0–100, share of the course
  hue: number;
  graded: boolean;
  zeroWeightWithWork: boolean;
}

function segmentsOf(
  groups: GroupDetail[],
  mode: string,
  assignments: AssignmentDetail[],
): SegmentInfo[] {
  const pointsOf = (g: GroupDetail) =>
    assignments
      .filter((a) => a.groupId === g.id)
      .reduce((s, a) => s + (a.pointsPossible ?? 0), 0);
  const totalPoints = groups.reduce((s, g) => s + pointsOf(g), 0);
  const totalWeight = groups.reduce((s, g) => s + (g.weight ?? 0), 0);

  return groups
    .map((g, i) => {
      const share =
        mode === "weighted"
          ? totalWeight > 0
            ? ((g.weight ?? 0) / totalWeight) * 100
            : 0
          : totalPoints > 0
            ? (pointsOf(g) / totalPoints) * 100
            : 0;
      return {
        group: g,
        share,
        hue: SEGMENT_HUES[i % SEGMENT_HUES.length],
        graded: g.gradedCount > 0,
        zeroWeightWithWork: mode === "weighted" && (g.weight ?? 0) === 0 && g.totalCount > 0,
      };
    })
    .sort((a, b) => b.share - a.share);
}

function CompositionCard({
  groups,
  mode,
  centerLabel,
  assignments,
  hoverGroupId,
  onHover,
  filterGroupId,
  onFilter,
}: {
  groups: GroupDetail[];
  mode: string;
  centerLabel: string;
  assignments: AssignmentDetail[];
  hoverGroupId: string | null;
  onHover: (id: string | null) => void;
  filterGroupId: string | null;
  onFilter: (id: string) => void;
}) {
  const segments = useMemo(
    () => segmentsOf(groups, mode, assignments),
    [groups, mode, assignments],
  );

  // Donut geometry: r=54, stroke 16, circumference splits by share. Offsets
  // are precomputed so render stays pure.
  const R = 54;
  const C = 2 * Math.PI * R;
  const withOffsets = useMemo(
    () =>
      segments.reduce<{ seg: SegmentInfo; len: number; offset: number }[]>((out, seg) => {
        const len = (seg.share / 100) * C;
        const prev = out[out.length - 1];
        out.push({ seg, len, offset: prev ? prev.offset + prev.len : 0 });
        return out;
      }, []),
    [segments, C],
  );

  return (
    <Card className="rounded-3xl border-border/60 shadow-card xl:col-span-1">
      <CardContent className="flex h-full flex-col gap-4 pt-6">
        <h3 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Composition
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Grade composition">
              {withOffsets.map(({ seg, len, offset }) => (
                <circle
                  key={seg.group.id}
                  cx="75"
                  cy="75"
                  r={R}
                  fill="none"
                  strokeWidth={hoverGroupId === seg.group.id ? 20 : 16}
                  stroke={
                    seg.graded
                      ? `hsl(${seg.hue} 60% 58%)`
                      : `hsl(${seg.hue} 25% 40% / 0.35)`
                  }
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 75 75)"
                  className="cursor-pointer transition-all duration-micro"
                  onMouseEnter={() => onHover(seg.group.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onFilter(seg.group.id)}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span data-numeric className="font-mono text-xl font-semibold tabular-nums">
                {centerLabel}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                current
              </span>
            </div>
          </div>
        </div>

        {/* Legend = the group summary. No separate groups panel exists. */}
        <div className="flex flex-col gap-0.5">
          {segments.map((seg) => (
            <button
              key={seg.group.id}
              type="button"
              onMouseEnter={() => onHover(seg.group.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onFilter(seg.group.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-micro",
                hoverGroupId === seg.group.id && "bg-fill-ghost",
                filterGroupId === seg.group.id && "bg-fill-ghost-selected",
              )}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{
                  backgroundColor: seg.graded
                    ? `hsl(${seg.hue} 60% 58%)`
                    : `hsl(${seg.hue} 25% 40% / 0.45)`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-xs">
                {seg.group.name ?? "Unnamed group"}
              </span>
              {seg.zeroWeightWithWork && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="chip shrink-0 whitespace-nowrap border border-at-risk/40 bg-at-risk/10 text-2xs text-at-risk-fg">
                      0% of grade
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60">
                    This group contains {seg.group.totalCount} assignment
                    {seg.group.totalCount === 1 ? "" : "s"} but carries zero weight — either the
                    instructor's real choice, or a sync artifact worth checking.
                  </TooltipContent>
                </Tooltip>
              )}
              <span
                data-numeric
                className="w-14 shrink-0 whitespace-nowrap text-right font-mono text-2xs tabular-nums text-muted-foreground"
              >
                {seg.group.gradedCount}/{seg.group.totalCount}
              </span>
              <span
                data-numeric
                className="w-11 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums"
              >
                {seg.share.toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Grouped assignment list ─────────────────────────────────────────────── */

function GroupedAssignments({
  groups,
  assignments,
  mode,
  hoverGroupId,
  filterGroupId,
  onClearFilter,
  onOpen,
}: {
  groups: GroupDetail[];
  assignments: AssignmentDetail[];
  mode: string;
  hoverGroupId: string | null;
  filterGroupId: string | null;
  onClearFilter: () => void;
  onOpen: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Heaviest weight first; the synthetic "ungrouped" section trails.
  const ordered = useMemo(() => {
    const withRows = groups
      .map((g) => ({
        group: g,
        rows: assignments
          .filter((a) => a.groupId === g.id)
          .sort(byDueUndatedLast),
      }))
      .filter((g) => g.rows.length > 0)
      .sort((a, b) => (b.group.weight ?? -1) - (a.group.weight ?? -1));
    const orphans = assignments.filter((a) => !groups.some((g) => g.id === a.groupId));
    if (orphans.length > 0) {
      withRows.push({
        group: {
          id: "__ungrouped",
          name: "Ungrouped",
          weight: null,
          currentPct: null,
          gradedCount: orphans.filter((a) => a.score !== null).length,
          totalCount: orphans.length,
        },
        rows: [...orphans].sort(byDueUndatedLast),
      });
    }
    return filterGroupId ? withRows.filter((g) => g.group.id === filterGroupId) : withRows;
  }, [groups, assignments, filterGroupId]);

  return (
    <Card className="rounded-3xl border-border/60 pt-4 shadow-card xl:col-span-3">
      <div className="mb-1 flex items-center justify-between px-5">
        <h3 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Assignments
        </h3>
        {filterGroupId && (
          <button
            type="button"
            onClick={onClearFilter}
            className="text-2xs text-brand-fg underline underline-offset-2"
          >
            Clear group filter
          </button>
        )}
      </div>
      <div className="flex flex-col pb-2">
        {ordered.map(({ group, rows }) => {
          const isCollapsed = collapsed.has(group.id);
          return (
            <div
              key={group.id}
              className={cn(hoverGroupId === group.id && "bg-fill-ghost/30")}
            >
              {/* Sticky group header: name · weight · graded count. */}
              <button
                type="button"
                onClick={() => toggle(group.id)}
                className="sticky top-0 z-10 flex w-full items-center gap-2 border-t border-border/60 bg-card px-5 py-2 text-left transition-colors duration-micro hover:bg-fill-ghost"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-micro",
                    isCollapsed && "-rotate-90",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                  {group.name ?? "Unnamed group"}
                </span>
                {mode === "weighted" && (
                  <span
                    data-numeric
                    className="w-16 shrink-0 whitespace-nowrap text-right font-mono text-2xs tabular-nums text-muted-foreground"
                  >
                    {group.weight !== null ? `${group.weight.toFixed(0)}% wt` : "—"}
                  </span>
                )}
                <span
                  data-numeric
                  className="w-20 shrink-0 whitespace-nowrap text-right font-mono text-2xs tabular-nums text-muted-foreground"
                >
                  {group.gradedCount}/{group.totalCount} graded
                </span>
                <span
                  data-numeric
                  className="w-14 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums"
                >
                  {pct(group.currentPct)}
                </span>
              </button>
              {!isCollapsed && rows.map((a) => <AssignmentRow key={a.id} a={a} onOpen={() => onOpen(a.id)} />)}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function byDueUndatedLast(a: AssignmentDetail, b: AssignmentDetail): number {
  // Undated items never float to the top: they sort after everything dated.
  return (a.dueAt ?? "9999") .localeCompare(b.dueAt ?? "9999");
}

/** "[REQUIRED] Homework 1" → clean title + quiet chips. */
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

/** Strict row grid: title (flex) · due (fixed) · impact bar (fixed) ·
 *  points (fixed, right, mono). Badges are exceptions only. */
function AssignmentRow({ a, onOpen }: { a: AssignmentDetail; onOpen: () => void }) {
  const { title, flags } = stripShouting(a.name);
  const state = a.missing ? "missing" : "open";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-t border-border/30 px-5 py-1.5 text-left transition-colors duration-micro hover:bg-fill-ghost/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm">{title}</span>
        {a.missing && (
          <span className="chip shrink-0 bg-critical/10 text-2xs text-critical-fg">missing</span>
        )}
        {a.late && (
          <span className="chip shrink-0 bg-at-risk/10 text-2xs text-at-risk-fg">late</span>
        )}
        {a.score !== null && (
          <span className="chip shrink-0 border border-on-track/30 bg-transparent text-2xs text-on-track-fg">
            graded
          </span>
        )}
        {a.excused && (
          <span className="chip shrink-0 bg-fill-ghost text-2xs text-muted-foreground">excused</span>
        )}
        {flags.map((f) => (
          <span
            key={f}
            className="chip shrink-0 border border-border/70 bg-transparent text-2xs text-muted-foreground"
          >
            {f}
          </span>
        ))}
        {a.source !== "api" && (
          <Badge variant="secondary" className="shrink-0 text-2xs">
            {a.source}
          </Badge>
        )}
      </span>
      <span
        data-numeric
        className={cn(
          "w-24 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums",
          a.dueAt ? "text-muted-foreground" : "text-muted-foreground/50",
        )}
      >
        {dueShort(a.dueAt)}
      </span>
      <ImpactBar
        impactPct={a.impactPct}
        tier={a.score !== null ? "later" : urgencyTier(state, a.dueAt)}
        width={110}
        className="hidden md:flex"
      />
      <span
        data-numeric
        className={cn(
          "w-16 shrink-0 whitespace-nowrap text-right font-mono text-sm tabular-nums",
          a.score === null && "text-muted-foreground",
        )}
      >
        {points(a.score, a.pointsPossible)}
      </span>
    </button>
  );
}

/* ── Solver ──────────────────────────────────────────────────────────────── */

function SolverDialog({
  open,
  onOpenChange,
  courseId,
  defaultTargetPct,
  maxPossiblePct,
  assignments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  defaultTargetPct: number;
  maxPossiblePct: number;
  assignments: AssignmentDetail[];
}) {
  const [targetPct, setTargetPct] = useState(String(defaultTargetPct));
  const [scope, setScope] = useState<string>("everything");
  const [answer, setAnswer] = useState<SolverAnswer | null>(null);

  useEffect(() => {
    if (!open) return;
    // Clearing the stale answer while the solver round-trips to Rust.
    // oxlint-disable-next-line set-state-in-effect
    setAnswer(null);
    const target = Number.parseFloat(targetPct);
    if (Number.isNaN(target)) return;
    whatDoINeed(courseId, target, scope === "everything" ? null : scope)
      .then(setAnswer)
      .catch(() => toast.error("Solver failed — try re-syncing."));
  }, [open, targetPct, scope, courseId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What do I need?</DialogTitle>
          <DialogDescription>
            Every other ungraded assignment is held at zero — the honest baseline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={targetPct} onValueChange={setTargetPct}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGETS.map(([letter, cutoff]) => (
                <SelectItem key={letter} value={String(cutoff)}>
                  {letter} ({cutoff}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everything">Average on everything left</SelectItem>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {stripShouting(a.name).title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {answer && <SolverResult answer={answer} />}

        {/* "Best still possible" lives here, with the decision — not spread
            across the hero (§ design review). */}
        <p className="text-2xs text-muted-foreground">
          Best still possible in this course:{" "}
          <span data-numeric className="font-mono tabular-nums text-foreground">
            {maxPossiblePct.toFixed(1)}%
          </span>{" "}
          with perfect scores on everything remaining.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SolverResult({ answer }: { answer: SolverAnswer }) {
  if (answer.outcome === "required") {
    return (
      <div className="rounded-xl bg-fill-ghost p-4">
        <div data-numeric className="font-mono text-3xl font-medium tabular-nums">
          {answer.pct.toFixed(1)}%
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          needed
          {answer.pointsNeeded !== null && answer.pointsPossible !== null && (
            <>
              {" "}
              — that's{" "}
              <span data-numeric className="font-mono text-foreground">
                {points(Math.ceil(answer.pointsNeeded * 10) / 10, answer.pointsPossible)}
              </span>{" "}
              points
            </>
          )}
        </p>
      </div>
    );
  }
  if (answer.outcome === "unreachable") {
    return (
      <div className="rounded-xl bg-critical/10 p-4">
        <div className="text-sm font-medium text-critical-fg">Not reachable from here.</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Highest possible grade:{" "}
          <span data-numeric className="font-mono text-foreground">
            {answer.bestPossiblePct.toFixed(1)}% ({answer.bestPossibleLetter})
          </span>
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-on-track/10 p-4">
      <div className="text-sm font-medium text-on-track-fg">Already locked in.</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Even scoring zero on everything left you finish at{" "}
        <span data-numeric className="font-mono text-foreground">
          {answer.floorPct.toFixed(1)}% ({answer.floorLetter})
        </span>
      </p>
    </div>
  );
}

/** "First grades expected after Wed Sep 3" — from the earliest due date. */
function firstDueLabel(assignments: AssignmentDetail[]): string | null {
  const first = assignments
    .map((a) => a.dueAt)
    .filter((d): d is string => d !== null)
    .sort()[0];
  if (!first) return null;
  const d = new Date(first);
  if (Number.isNaN(d.getTime())) return null;
  return `First graded work expected after ${d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} — current and projected appear the moment a score lands.`;
}
