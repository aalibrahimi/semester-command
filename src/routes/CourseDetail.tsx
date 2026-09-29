/**
 * CourseDetail — one course, in full (SPEC.md §5, screen 2).
 *
 * Called by: the router, at "/courses/:courseId" (`?solver=1` auto-opens the
 * solver — triage's quick action lands there).
 * Calls: ipc `course_detail` / `what_do_i_need` / `set_target`; localPrefs
 * for the nickname.
 *
 * One page per course, five tabs (the tab is in the URL, ?tab=…):
 * - **Overview** (default): Today's layout for this one course. A "Do next"
 *   list (missing, due this week, coming up, study next) and a column of
 *   small cards: next exam, this week, how the grade is made, office hours.
 *   See components/course/CourseOverview.tsx.
 * - **Study**: the course's study guide (StudyCourseView, embedded).
 * - **Syllabus**: the course's syllabus viewer (SyllabusPanel).
 * - **Grades**: target, grade scale, hide, and the layout below.
 * - **People**: the course's instructors (PeoplePanel).
 * The header carries the state as pills (missing, next due, next exam) and
 * the solver button; warnings sit above every tab.
 *
 * Grades tab layout (design review):
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
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, BookOpen, Calculator, Eye, EyeOff, GraduationCap, SlidersHorizontal, Target } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { AssignmentSheet } from "@/components/grade/AssignmentSheet";
import { CourseOverview } from "@/components/course/CourseOverview";
import { classify, dueWhen } from "@/lib/courseWork";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { courseDetail, setCourseHidden, setTarget } from "@/lib/ipc";
import { announceCoursesChanged } from "@/hooks/useCourses";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { courseShort, parseCourseLabel } from "@/lib/courseLabel";
import { courseHsla } from "@/lib/courseColor";
import { digestFor } from "@/lib/syllabusDigest";
import { courseBySlug, daysUntil } from "@/study";
import type { Course as StudyCourseDef } from "@/study/types";
import { StudyCourseView } from "@/routes/StudyCourse";
import { CourseSyllabusPanel } from "@/components/course/SyllabusPanel";
import { CoursePeoplePanel } from "@/components/course/PeoplePanel";
import { useNicknames } from "@/lib/localPrefs";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssignmentDetail, CourseDetailPayload } from "@/types";
import { TitleWithNickname } from "@/components/course/TitleWithNickname";
import { CompositionCard } from "@/components/course/CompositionCard";
import { GroupedAssignments } from "@/components/course/AssignmentList";
import { SolverDialog } from "@/components/course/SolverDialog";
import { ScaleDialog } from "@/components/course/ScaleDialog";
import { AddAssignmentDialog } from "@/components/course/AddAssignmentDialog";

/** Letter → percent options for the target picker, from THIS course's scale
 *  (custom cutoffs included — §4.4). D-range targets are left out; nobody
 *  aims for a D on purpose, and the list stays scannable. */
function targetsFrom(scale: [number, string][]): [string, number][] {
  const options = scale
    .filter(([cutoff]) => cutoff >= 70)
    .map(([cutoff, letter]) => [letter, cutoff] as [string, number]);
  // A degenerate custom scale (everything under 70) still needs choices.
  return options.length > 0
    ? options
    : scale.map(([cutoff, letter]) => [letter, cutoff] as [string, number]);
}

/** The course page's tabs, in order. */
const COURSE_TABS = ["overview", "study", "syllabus", "grades", "people"] as const;
type CourseTab = (typeof COURSE_TABS)[number];
const TAB_LABEL: Record<CourseTab, string> = { overview: "Overview", study: "Study", syllabus: "Syllabus", grades: "Grades", people: "People" };

/** This Canvas course's study guide, if one exists ("CS-146" → cs146). */
function studyCourseFor(courseCode: string | null): StudyCourseDef | undefined {
  const code = parseCourseLabel(courseCode).code;
  return code ? courseBySlug(code.toLowerCase().replace(/[^a-z0-9]/g, "")) : undefined;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CourseDetailPayload | null>(null);
  const [missingCourse, setMissingCourse] = useState(false);
  const [solverOpen, setSolverOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  // The page's tabs live in the URL (?tab=study) so a link can open one.
  const tabParam = searchParams.get("tab");
  const tab: CourseTab = (COURSE_TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as CourseTab) : "overview";
  const pickTab = (t: CourseTab) => {
    const next = new URLSearchParams(searchParams);
    if (t === "overview") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };
  const nicknames = useNicknames();
  const [now] = useState(() => Date.now());

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
      const next = new URLSearchParams(searchParams);
      next.delete("solver");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (missingCourse) {
    return (
      <>
        <ScreenHeader title="Course" />
        <EmptyState
          icon={GraduationCap}
          title="Course not found"
          description="This course isn't in the local database: it may have been removed on Canvas, or sync hasn't seen it yet."
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
  const targets = targetsFrom(data.scale);
  const label = parseCourseLabel(s.courseCode ?? s.name);
  const nickname = nicknames[s.id];
  const floor = floorForCanvasCourse(s.courseCode);
  const anyGraded = assignments.some((a) => a.score !== null);
  const currentBelowFloor =
    floor !== null && s.grade.currentPct !== null && s.grade.currentPct < floor.pct;
  const maxBelowFloor = floor !== null && s.maxPossiblePct < floor.pct;

  const pickTarget = (letter: string) => {
    const found = targets.find(([l]) => l === letter);
    if (!found || !courseId) return;
    setTarget(courseId, found[1], found[0])
      .then(() => {
        refresh();
        announceCoursesChanged();
      })
      .catch(() => toast.error("Could not save the target."));
  };

  const study = studyCourseFor(s.courseCode);
  const color = courseHsla(s.id, 0.95);
  const shortCode = label.code ?? courseShort(s.courseCode ?? s.name);
  const prof = data.instructors.find((p) => p.starred) ?? data.instructors.find((p) => p.role === "teacher");
  const digest = digestFor(label.code);
  const profName = prof?.name ?? digest?.instructor ?? study?.instructor ?? null;
  const { missing, soon } = classify(assignments, now);
  const nextDue = soon[0];
  const examDays = study ? daysUntil(study.exam.date) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-8 pb-12 pt-7">
      {/* ── Header: who and when on a small line, the name big, the
          state of things as pills on the right. ─────────────────── */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-medium text-foreground/80">{shortCode}</span>
            {profName && <span>· {profName}</span>}
            {digest && <span>· {digest.meets}{digest.room ? `, ${digest.room}` : ""}</span>}
            {s.hidden && <span className="rounded-full bg-fill-ghost px-2 py-px text-2xs">hidden</span>}
          </span>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
            <TitleWithNickname courseId={s.id} nickname={nickname} fallback={label.title || shortCode} />
          </h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
          {missing.length > 0 && (
            <button type="button" onClick={() => pickTab("overview")} className="rounded-full bg-critical/[0.12] px-3 py-1.5 font-semibold text-critical-fg">
              {missing.length} missing
            </button>
          )}
          {nextDue && (
            <span className="max-w-[20rem] truncate rounded-full bg-at-risk/15 px-3 py-1.5 font-semibold text-at-risk-fg">
              {nextDue.name ?? "Next item"} {dueWhen(nextDue.dueAt as string, now)}
            </span>
          )}
          {study && examDays !== null && examDays >= 0 && (
            <span className="rounded-full bg-foreground/[0.06] px-3 py-1.5 font-semibold text-muted-foreground">
              {study.exam.label.replace(/\s*\(.*\)$/, "")} in {examDays} day{examDays === 1 ? "" : "s"}
            </span>
          )}
          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setSolverOpen(true)} disabled={!s.gradeable}>
            <Calculator className="mr-1.5 h-3.5 w-3.5" />
            What do I need?
          </Button>
        </div>
      </div>

      {/* Warnings live above every tab — a degree-floor problem or a
          math mismatch must be unmissable whichever view is on. */}
      <div className="flex flex-col gap-3 empty:hidden">
        {/* Degree-floor warning: class grade and DEGREE are different ledgers. */}
        {(currentBelowFloor || maxBelowFloor) && floor && (
          <Alert className="border-critical/50">
            <AlertTriangle className="h-4 w-4 text-critical-fg" />
            <AlertTitle>
              {maxBelowFloor
                ? "This course can no longer meet the degree minimum"
                : `Current grade is below the ${floor.letter} degree floor`}
            </AlertTitle>
            <AlertDescription>
              The degree requires <strong>{floor.letter}</strong> ({floor.pct}%) or better for
              this course to count{floor.note ? `: ${floor.note}` : "."}{" "}
              {maxBelowFloor
                ? "Even a perfect run from here lands below it: talk to the professor and your advisor about options this week, not at finals."
                : "Passing the class below that line means retaking it for degree credit: check the Graduation tab before deprioritizing this course."}
            </AlertDescription>
          </Alert>
        )}

        {/* Reconciliation warning (§4.2): our math vs Canvas's, never silent. */}
        {s.grade.reconciliationDelta !== null && (
          <Alert className="border-at-risk/40">
            <AlertTriangle className="h-4 w-4 text-at-risk-fg" />
            <AlertTitle>Our math disagrees with Canvas here</AlertTitle>
            <AlertDescription>
              We compute {pct(s.grade.currentPct)} but Canvas reports{" "}
              {pct(s.grade.canvasCurrentPct)} a gap of{" "}
              {Math.abs(s.grade.reconciliationDelta).toFixed(1)} points. This usually means an
              unmodelled course rule (dropped-lowest, a curve). Trust Canvas's number until this
              banner clears, and treat the solver as approximate for this course.
            </AlertDescription>
          </Alert>
        )}

        {/* Weighted course with orphan assignments: they cannot count. Say
            so once, loudly — a manual assignment that silently moves nothing
            is worse than no manual assignment at all. */}
        {data.uncountedCount > 0 && (
          <Alert className="border-at-risk/40">
            <AlertTriangle className="h-4 w-4 text-at-risk-fg" />
            <AlertTitle>
              {data.uncountedCount} assignment{data.uncountedCount === 1 ? " doesn't" : "s don't"}{" "}
              count toward this grade
            </AlertTitle>
            <AlertDescription>
              This course grades by weighted groups, and assignments outside a weighted group
              (added by hand or from the calendar feed) can't contribute. Edit each one and put
              it in a group: they still show in the list and in Triage meanwhile.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div role="tablist" aria-label="Course sections" className="flex w-fit items-center gap-1 rounded-full bg-fill-ghost p-1">
        {COURSE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => pickTab(t)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-4 text-[13.5px] transition-colors duration-micro",
              tab === t ? "bg-card font-semibold text-foreground shadow-card" : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABEL[t]}
            {t === "overview" && missing.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-critical" />}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <CourseOverview
          summary={s}
          label={nickname ?? shortCode}
          assignments={assignments}
          groups={groups}
          instructors={data.instructors}
          study={study}
          onOpen={setOpenAssignmentId}
          onSeeAll={() => pickTab("grades")}
        />
      )}

      {tab === "study" &&
        (study ? (
          <StudyCourseView key={study.slug} c={study} embedded />
        ) : (
          <EmptyState icon={BookOpen} title="No study guide for this course yet" description="Study guides are written per course from its lectures; this one hasn't been started." />
        ))}

      {tab === "syllabus" && <CourseSyllabusPanel courseId={s.id} courseCode={s.courseCode} />}

      {tab === "people" && <CoursePeoplePanel course={s} label={nickname ?? shortCode} />}

      {tab === "grades" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={s.targetLetter} onValueChange={pickTarget}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <Target className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targets.map(([letter, cutoff]) => (
                  <SelectItem key={letter} value={letter}>
                    Target {letter} ({cutoff}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScaleOpen(true)}
              title={data.customScale ? "Custom grade scale in use: edit it" : "Edit this course's grade scale (professor curves, custom cutoffs)"}
            >
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Grade scale
              {data.customScale && <span className="ml-1 text-2xs text-brand-fg">custom</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                if (!courseId) return;
                setCourseHidden(courseId, !s.hidden)
                  .then(() => {
                    announceCoursesChanged();
                    refresh();
                    toast.success(s.hidden ? "Course restored everywhere." : "Course hidden. Its data stays synced; unhide it from Courses.");
                  })
                  .catch(() => toast.error("Could not update the course."));
              }}
              title={s.hidden ? "Unhide this course" : "Hide this course everywhere"}
            >
              {s.hidden ? <Eye className="mr-1.5 h-4 w-4" /> : <EyeOff className="mr-1.5 h-4 w-4" />}
              {s.hidden ? "Unhide course" : "Hide course"}
            </Button>
          </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
                      current{s.currentLetter ? ` · ${s.currentLetter}` : ""} ungraded work
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
                      projected · {s.projectedLetter} if you stopped today
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
            centerLabel={anyGraded ? pct(s.grade.currentPct) : "–"}
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
          onAdd={() => setAddOpen(true)}
        />
      </div>
        </div>
      )}

      <SolverDialog
        open={solverOpen}
        onOpenChange={setSolverOpen}
        courseId={s.id}
        targets={targets}
        defaultTargetPct={s.targetPct}
        maxPossiblePct={s.maxPossiblePct}
        assignments={assignments.filter((a) => a.score === null && !a.excused && !a.omitted)}
      />

      <ScaleDialog
        open={scaleOpen}
        onOpenChange={setScaleOpen}
        courseId={s.id}
        scale={data.scale}
        customScale={data.customScale}
        onSaved={() => {
          refresh();
          announceCoursesChanged();
        }}
      />

      <AddAssignmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        courseId={s.id}
        weighted={s.grade.mode === "weighted"}
        groups={groups}
        onSaved={() => {
          refresh();
          announceCoursesChanged();
        }}
      />

      <AssignmentSheet
        assignment={assignments.find((a) => a.id === openAssignmentId) ?? null}
        onOpenChange={(open) => !open && setOpenAssignmentId(null)}
        onChanged={refresh}
      />
    </div>
  );
}

/* ── Header nickname ─────────────────────────────────────────────────────── */

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
  })}: current and projected appear the moment a score lands.`;
}
