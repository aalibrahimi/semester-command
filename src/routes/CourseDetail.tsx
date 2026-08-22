/**
 * CourseDetail — one course, in full (SPEC.md §5, screen 2).
 *
 * Called by: the router, at "/courses/:courseId".
 * Calls: ipc `course_detail` / `what_do_i_need` / `set_target`.
 *
 * The only screen allowed to use the 48px display size, and only on the
 * current grade (§9.2). Layout: current vs projected side by side with the
 * gap labelled, the Grade Gap bar, groups with weights, the full assignment
 * list, and the "what do I need" solver.
 *
 * Every percentage on this screen came out of `grades.rs` (§10). The
 * reconciliation banner renders whenever our current differs from Canvas's
 * by more than 0.1 — we never silently prefer either number (§4.2).
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, Calculator, Eye, EyeOff, GraduationCap, Target } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { AssignmentSheet } from "@/components/grade/AssignmentSheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { courseDetail, setCourseHidden, setTarget, whatDoINeed } from "@/lib/ipc";
import { announceCoursesChanged } from "@/hooks/useCourses";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { parseCourseLabel } from "@/lib/courseLabel";
import { dateTime, pct, points } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssignmentDetail, CourseDetailPayload, SolverAnswer } from "@/types";

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

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const [data, setData] = useState<CourseDetailPayload | null>(null);
  const [missingCourse, setMissingCourse] = useState(false);
  const [solverOpen, setSolverOpen] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

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
    refresh();
  }, [refresh]);

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
  const floor = floorForCanvasCourse(s.courseCode);
  // The degree-floor verdicts. "Current below" is the emergency; "projected
  // below" early in a term is normal (most work ungraded) so it only warns
  // when there is a current grade to trust.
  const currentBelowFloor =
    floor !== null && s.grade.currentPct !== null && s.grade.currentPct < floor.pct;
  const maxBelowFloor = floor !== null && s.maxPossiblePct < floor.pct;

  const pickTarget = (letter: string) => {
    const found = TARGETS.find(([l]) => l === letter);
    if (!found || !courseId) return;
    setTarget(courseId, found[1], found[0])
      .then(() => {
        refresh();
        announceCoursesChanged(); // a new target can flip the sidebar dot
      })
      .catch(() => toast.error("Could not save the target."));
  };

  return (
    <>
      <ScreenHeader
        title={parseCourseLabel(s.courseCode ?? s.name).code ?? parseCourseLabel(s.courseCode ?? s.name).title}
        subtitle={(() => {
          const l = parseCourseLabel(s.courseCode ?? s.name);
          return l.code && l.title !== l.code ? l.title : undefined;
        })()}
        actions={
          <div className="flex items-center gap-2">
            {/* Hide/unhide — a view preference, not a deletion. */}
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
            {/* Target picker — the marker on every bar. */}
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

      {/* Bento: numbers wide, groups beside them, assignments full width. */}
      <div className="mx-8 mb-10 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Degree-floor warning: the class grade and the DEGREE are different
            ledgers — below the floor this course stops counting toward
            graduation no matter what the course target says. */}
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

        {/* ── The numbers (§4.2: both, always) ──────────────────────────── */}
        <Card
          className={cn(
            "rounded-3xl border-border/60 shadow-card",
            groups.length > 0 ? "xl:col-span-2" : "xl:col-span-3",
          )}
        >
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <div className="font-display text-display font-semibold leading-none tabular-nums">
                  {pct(s.grade.currentPct)}
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  current{s.currentLetter ? ` · ${s.currentLetter}` : ""} — ungraded work excluded
                </div>
              </div>
              <div>
                <div className="font-mono text-3xl font-medium tabular-nums text-muted-foreground">
                  {pct(s.grade.projectedPct)}
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  projected · {s.projectedLetter} — if you stopped today
                </div>
              </div>
              {s.grade.gapPct !== null && s.grade.gapPct > 0.05 && (
                <div className="mb-1 rounded-lg bg-at-risk/10 px-3 py-1.5 text-xs text-at-risk-fg">
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
                best still possible:{" "}
                <span data-numeric className="font-mono">{pct(s.maxPossiblePct)}</span>
              </span>
              <span>
                grading:{" "}
                {s.grade.mode === "weighted" ? "weighted groups" : "total points"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Groups ────────────────────────────────────────────────────── */}
        {groups.length > 0 && (
          <Card className="rounded-3xl border-border/60 shadow-card xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assignment groups</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {groups.map((g) => (
                <div key={g.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{g.name ?? "Unnamed group"}</span>
                  {s.grade.mode === "weighted" && (
                    <span data-numeric className="w-16 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {g.weight !== null ? `${g.weight.toFixed(0)}%` : "—"}
                    </span>
                  )}
                  <span data-numeric className="w-20 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {g.gradedCount}/{g.totalCount} graded
                  </span>
                  <span data-numeric className="w-16 text-right font-mono text-sm tabular-nums">
                    {pct(g.currentPct)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Assignments ───────────────────────────────────────────────── */}
        <Card className="rounded-3xl border-border/60 shadow-card xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assignments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5">
            {assignments.map((a) => (
              <AssignmentRowItem key={a.id} a={a} onOpen={() => setOpenAssignmentId(a.id)} />
            ))}
          </CardContent>
        </Card>
      </div>

      <SolverDialog
        open={solverOpen}
        onOpenChange={setSolverOpen}
        courseId={s.id}
        defaultTargetPct={s.targetPct}
        assignments={assignments.filter((a) => a.score === null && !a.excused && !a.omitted)}
      />

      {/* Sheet, not Dialog: the list stays visible behind it (§9.5). Looked
          up by id so a refresh (estimate edit) updates the open sheet too. */}
      <AssignmentSheet
        assignment={assignments.find((a) => a.id === openAssignmentId) ?? null}
        onOpenChange={(open) => !open && setOpenAssignmentId(null)}
        onChanged={refresh}
      />
    </>
  );
}

function AssignmentRowItem({ a, onOpen }: { a: AssignmentDetail; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-micro hover:bg-fill-ghost/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate">{a.name ?? "Untitled"}</span>
          {a.missing && <span className="chip bg-critical/10 text-2xs text-critical-fg">missing</span>}
          {a.late && <span className="chip bg-at-risk/10 text-2xs text-at-risk-fg">late</span>}
          {a.excused && <span className="chip bg-fill-ghost text-2xs text-muted-foreground">excused</span>}
          {a.source !== "api" && (
            <Badge variant="secondary" className="text-2xs">{a.source}</Badge>
          )}
        </div>
        <div className="text-2xs text-muted-foreground">{dateTime(a.dueAt)}</div>
      </div>
      <span data-numeric className="w-20 shrink-0 text-right font-mono text-2xs tabular-nums text-muted-foreground">
        {a.impactPct > 0 ? `${a.impactPct.toFixed(1)}% of grade` : ""}
      </span>
      <span
        data-numeric
        className={cn(
          "w-20 shrink-0 text-right font-mono text-sm tabular-nums",
          a.score === null && "text-muted-foreground",
        )}
      >
        {points(a.score, a.pointsPossible)}
      </span>
    </button>
  );
}

/**
 * The "what do I need" panel (§4.3). Pick a target and a scope; the answer is
 * blunt on purpose — including the two edges (unreachable → ceiling,
 * already-locked → floor).
 */
function SolverDialog({
  open,
  onOpenChange,
  courseId,
  defaultTargetPct,
  assignments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  defaultTargetPct: number;
  assignments: AssignmentDetail[];
}) {
  const [targetPct, setTargetPct] = useState(String(defaultTargetPct));
  const [scope, setScope] = useState<string>("everything");
  const [answer, setAnswer] = useState<SolverAnswer | null>(null);

  useEffect(() => {
    if (!open) return;
    // Clearing the stale answer while the solver round-trips to Rust — an
    // external-system sync, not a derivable value.
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
                  {a.name ?? "Untitled"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {answer && <SolverResult answer={answer} />}
      </DialogContent>
    </Dialog>
  );
}

function SolverResult({ answer }: { answer: SolverAnswer }) {
  if (answer.outcome === "required") {
    return (
      <div className="rounded-xl bg-fill-ghost p-4">
        <div className="font-mono text-3xl font-medium tabular-nums">
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
