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
 * - **Syllabus**: the Syllabi hub's viewer for this course only.
 * - **Grades**: target, grade scale, hide, and the layout below.
 * - **People**: the Contacts cards for this course only.
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { AssignmentSheet } from "@/components/grade/AssignmentSheet";
import { CourseOverview } from "@/components/course/CourseOverview";
import { classify, dueWhen } from "@/lib/courseWork";
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
import {
  courseDetail,
  saveManualAssignment,
  saveManualGroup,
  setCourseHidden,
  setGradeScale,
  setTarget,
  whatDoINeed,
} from "@/lib/ipc";
import { stripShouting } from "@/lib/stripShouting";
import { announceCoursesChanged } from "@/hooks/useCourses";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { courseShort, parseCourseLabel } from "@/lib/courseLabel";
import { courseHsla } from "@/lib/courseColor";
import { digestFor } from "@/lib/syllabusDigest";
import { courseBySlug, daysUntil } from "@/study";
import type { Course as StudyCourseDef } from "@/study/types";
import { StudyCourseView } from "./StudyCourse";
import { CourseSyllabusPanel } from "./Syllabi";
import { CoursePeoplePanel } from "./Contacts";
import { setNickname, useNicknames } from "@/lib/localPrefs";
import { dueShort, pct, points } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AssignmentDetail,
  CourseDetailPayload,
  GroupDetail,
  SolverAnswer,
} from "@/types";

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

/** Categorical hues for the donut segments — the same family as course
 *  identity colors, applied per group here. */
const SEGMENT_HUES = [217, 330, 172, 282, 48, 255, 200];

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
              this course to count{floor.note ? ` — ${floor.note}` : "."}{" "}
              {maxBelowFloor
                ? "Even a perfect run from here lands below it — talk to the professor and your advisor about options this week, not at finals."
                : "Passing the class below that line means retaking it for degree credit — check the Graduation tab before deprioritizing this course."}
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
              {pct(s.grade.canvasCurrentPct)} — a gap of{" "}
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
              it in a group — they still show in the list and in Triage meanwhile.
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

function segmentsOf(groups: GroupDetail[], mode: string): SegmentInfo[] {
  // `sharePct` arrives computed from grades.rs — this function only assigns
  // hues and flags. The weight normalisation that used to live here was the
  // §10 violation ("a percentage computed in TypeScript is a bug").
  return groups
    .map((g, i) => ({
      group: g,
      share: g.sharePct,
      hue: SEGMENT_HUES[i % SEGMENT_HUES.length],
      graded: g.gradedCount > 0,
      zeroWeightWithWork: mode === "weighted" && (g.weight ?? 0) === 0 && g.totalCount > 0,
    }))
    .sort((a, b) => b.share - a.share);
}

function CompositionCard({
  groups,
  mode,
  centerLabel,
  hoverGroupId,
  onHover,
  filterGroupId,
  onFilter,
}: {
  groups: GroupDetail[];
  mode: string;
  centerLabel: string;
  hoverGroupId: string | null;
  onHover: (id: string | null) => void;
  filterGroupId: string | null;
  onFilter: (id: string) => void;
}) {
  const segments = useMemo(() => segmentsOf(groups, mode), [groups, mode]);

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
  onAdd,
}: {
  groups: GroupDetail[];
  assignments: AssignmentDetail[];
  mode: string;
  hoverGroupId: string | null;
  filterGroupId: string | null;
  onClearFilter: () => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
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
          sharePct: 0,
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
        <div className="flex items-center gap-3">
          {filterGroupId && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-2xs text-brand-fg underline underline-offset-2"
            >
              Clear group filter
            </button>
          )}
          <button
            type="button"
            onClick={onAdd}
            title="Add an assignment by hand — the syllabus knows things Canvas doesn't yet"
            className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors duration-micro hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>

      {/* Column labels, once — the numbers below explain themselves. */}
      <div className={cn(ROW_GRID, "px-5 pb-1")}>
        <span />
        <span className="text-right text-2xs uppercase tracking-wider text-muted-foreground/70">
          due
        </span>
        <span className="hidden text-right text-2xs uppercase tracking-wider text-muted-foreground/70 md:block">
          grade impact
        </span>
        <span className="text-right text-2xs uppercase tracking-wider text-muted-foreground/70">
          score
        </span>
      </div>

      <div className="flex flex-col pb-2">
        {ordered.map(({ group, rows }) => {
          const isCollapsed = collapsed.has(group.id);
          return (
            <div
              key={group.id}
              className={cn(hoverGroupId === group.id && "bg-fill-ghost/30")}
            >
              {/* Sticky group header, on the same grid as the rows. */}
              <button
                type="button"
                onClick={() => toggle(group.id)}
                className={cn(
                  ROW_GRID,
                  "sticky top-0 z-10 w-full border-t border-border/60 bg-card px-5 py-2 text-left transition-colors duration-micro hover:bg-fill-ghost",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-micro",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <span className="min-w-0 truncate text-xs font-semibold">
                    {group.name ?? "Unnamed group"}
                  </span>
                  <span
                    data-numeric
                    className="shrink-0 whitespace-nowrap font-mono text-2xs tabular-nums text-muted-foreground"
                  >
                    {group.gradedCount}/{group.totalCount} graded
                  </span>
                </span>
                <span />
                <span
                  data-numeric
                  className="hidden whitespace-nowrap text-right font-mono text-2xs tabular-nums text-muted-foreground md:block"
                >
                  {mode === "weighted" && group.weight !== null
                    ? `${group.weight.toFixed(0)}% of grade`
                    : ""}
                </span>
                <span
                  data-numeric
                  className="whitespace-nowrap text-right font-mono text-xs tabular-nums"
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

/** One grid template shared by the label row, group headers, and assignment
 *  rows — every number lands in a true column. The impact column collapses
 *  on narrow windows (its cells carry hidden/md too). */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_100px_84px] items-center gap-3 md:grid-cols-[minmax(0,1fr)_100px_150px_84px]";

function byDueUndatedLast(a: AssignmentDetail, b: AssignmentDetail): number {
  // Undated items never float to the top: they sort after everything dated.
  return (a.dueAt ?? "9999") .localeCompare(b.dueAt ?? "9999");
}

/** Row state, told once by a dot instead of a crowd of chips. Chips stay
 *  for true exceptions (missing, late, excused, [REQUIRED]). */
function rowStatus(a: AssignmentDetail): { cls: string; label: string; settled: boolean } {
  if (a.excused || a.omitted)
    return { cls: "bg-muted-foreground/30", label: "Excused", settled: true };
  if (a.score !== null) return { cls: "bg-on-track", label: "Graded", settled: true };
  if (a.submitted)
    return { cls: "bg-brand", label: "Submitted — awaiting grade", settled: true };
  const overdue = a.dueAt !== null && new Date(a.dueAt).getTime() < Date.now();
  if (a.missing || overdue) return { cls: "bg-critical", label: "Not turned in", settled: false };
  if (urgencyTier("open", a.dueAt) === "soon")
    return { cls: "bg-at-risk", label: "Due within 72 hours", settled: false };
  return {
    cls: "border border-muted-foreground/40 bg-transparent",
    label: "Upcoming",
    settled: false,
  };
}

/** Strict row grid via ROW_GRID: dot + title · due · impact · score. */
function AssignmentRow({ a, onOpen }: { a: AssignmentDetail; onOpen: () => void }) {
  const { title, flags } = stripShouting(a.name);
  const status = rowStatus(a);
  const dueTone = status.settled
    ? "text-muted-foreground/50"
    : status.cls === "bg-critical"
      ? "text-critical-fg"
      : status.cls === "bg-at-risk"
        ? "text-at-risk-fg"
        : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        ROW_GRID,
        "w-full border-t border-border/30 px-5 py-1.5 text-left transition-colors duration-micro hover:bg-fill-ghost/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          title={status.label}
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.cls)}
        />
        <span className={cn("truncate text-sm", status.settled && "text-muted-foreground")}>
          {title}
        </span>
        {a.missing && (
          <span className="chip shrink-0 bg-critical/10 text-2xs text-critical-fg">missing</span>
        )}
        {a.late && (
          <span className="chip shrink-0 bg-at-risk/10 text-2xs text-at-risk-fg">late</span>
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
          "whitespace-nowrap text-right font-mono text-xs tabular-nums",
          a.dueAt ? dueTone : "text-muted-foreground/40",
        )}
      >
        {a.dueAt ? dueShort(a.dueAt) : "—"}
      </span>
      <span className="hidden justify-end md:flex">
        {a.impactPct > 0.05 ? (
          <ImpactBar
            impactPct={a.impactPct}
            tier={a.score !== null ? "later" : urgencyTier(a.missing ? "missing" : "open", a.dueAt)}
            width={96}
          />
        ) : (
          /* Zero impact is the absence of a fact — a dash, not "0.0%". */
          <span data-numeric className="font-mono text-xs tabular-nums text-muted-foreground/40">
            —
          </span>
        )}
      </span>
      <span
        data-numeric
        className={cn(
          "whitespace-nowrap text-right font-mono text-sm tabular-nums",
          a.score === null && "text-muted-foreground",
        )}
      >
        {a.score === null && !a.pointsPossible ? "—" : points(a.score, a.pointsPossible)}
      </span>
    </button>
  );
}

/* ── Solver ──────────────────────────────────────────────────────────────── */

function SolverDialog({
  open,
  onOpenChange,
  courseId,
  targets,
  defaultTargetPct,
  maxPossiblePct,
  assignments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  targets: [string, number][];
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
              {targets.map(([letter, cutoff]) => (
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

/* ── Grade scale editor (§4.4) ───────────────────────────────────────────── */

/** Edit this course's letter cutoffs — SJSU professors curve, and the
 *  default scale lying about it poisons every letter in the app. Rows are
 *  edited as text and validated in Rust on save. */
function ScaleDialog({
  open,
  onOpenChange,
  courseId,
  scale,
  customScale,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  scale: [number, string][];
  customScale: boolean;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<{ letter: string; cutoff: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    // Reseeding the editor from the live scale each time it opens.
    // oxlint-disable-next-line set-state-in-effect
    setRows(scale.map(([cutoff, letter]) => ({ letter, cutoff: String(cutoff) })));
  }, [open, scale]);

  const save = () => {
    const parsed: [number, string][] = [];
    for (const r of rows) {
      if (r.letter.trim() === "" && r.cutoff.trim() === "") continue; // deleted row
      const cutoff = Number.parseFloat(r.cutoff);
      if (Number.isNaN(cutoff) || cutoff < 0 || cutoff > 110 || r.letter.trim() === "") {
        toast.error("Each row needs a letter and a cutoff between 0 and 110.");
        return;
      }
      parsed.push([cutoff, r.letter.trim()]);
    }
    if (parsed.length === 0) {
      toast.error("A scale needs at least one cutoff.");
      return;
    }
    setGradeScale(courseId, parsed)
      .then(() => {
        onOpenChange(false);
        onSaved();
        toast.success("Scale saved — every letter in this course now uses it.");
      })
      .catch((e: unknown) => toast.error(String(e)));
  };

  const reset = () => {
    setGradeScale(courseId, null)
      .then(() => {
        onOpenChange(false);
        onSaved();
        toast.success("Back to the standard scale.");
      })
      .catch(() => toast.error("Could not reset the scale."));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Grade scale</DialogTitle>
          <DialogDescription>
            The cutoffs letters are computed with, for this course only. Blank out both fields
            to drop a row.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[72px_1fr] gap-2">
              <input
                value={r.letter}
                onChange={(e) =>
                  setRows((cur) => cur.map((row, j) => (j === i ? { ...row, letter: e.target.value } : row)))
                }
                placeholder="A-"
                className="rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-brand"
              />
              <input
                value={r.cutoff}
                onChange={(e) =>
                  setRows((cur) => cur.map((row, j) => (j === i ? { ...row, cutoff: e.target.value } : row)))
                }
                placeholder="90"
                inputMode="decimal"
                className="rounded-md border border-border bg-transparent px-2 py-1 font-mono text-sm tabular-nums outline-none focus-visible:border-brand"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((cur) => [...cur, { letter: "", cutoff: "" }])}
            className="mt-1 flex items-center gap-1 self-start text-2xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add a cutoff
          </button>
        </div>

        <div className="flex items-center justify-between">
          {customScale ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Use the default
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={save}>
            Save scale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Manual assignment entry (§3 — first-class under Tier 2) ─────────────── */

/** Add an assignment by hand: name, group, due date, points. In a weighted
 *  course the group choice is mandatory — an ungrouped assignment cannot
 *  count toward the grade, and this dialog refuses to create one silently.
 *  "New group…" creates the group (with a weight) in the same save. */
function AddAssignmentDialog({
  open,
  onOpenChange,
  courseId,
  weighted,
  groups,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  weighted: boolean;
  groups: GroupDetail[];
  onSaved: () => void;
}) {
  const NEW_GROUP = "__new";
  const NO_GROUP = "__none";
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(weighted ? (groups[0]?.id ?? NEW_GROUP) : NO_GROUP);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupWeight, setNewGroupWeight] = useState("");
  const [due, setDue] = useState("");
  const [pointsStr, setPointsStr] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (name.trim() === "") {
      toast.error("Give the assignment a name.");
      return;
    }
    const pts = pointsStr.trim() === "" ? undefined : Number.parseFloat(pointsStr);
    if (pts !== undefined && (Number.isNaN(pts) || pts < 0)) {
      toast.error("Points must be a plain non-negative number.");
      return;
    }
    if (weighted && groupId === NO_GROUP) {
      toast.error("Pick a group — ungrouped work can't count in a weighted course.");
      return;
    }
    setSaving(true);
    try {
      let resolvedGroup: string | undefined =
        groupId === NO_GROUP ? undefined : groupId === NEW_GROUP ? undefined : groupId;
      if (groupId === NEW_GROUP) {
        if (newGroupName.trim() === "") {
          toast.error("Name the new group.");
          setSaving(false);
          return;
        }
        const w = newGroupWeight.trim() === "" ? undefined : Number.parseFloat(newGroupWeight);
        if (weighted && (w === undefined || Number.isNaN(w) || w <= 0)) {
          toast.error("A weighted course needs the new group's weight (e.g. 20).");
          setSaving(false);
          return;
        }
        resolvedGroup = await saveManualGroup({
          courseId,
          name: newGroupName.trim(),
          groupWeight: w,
        });
      }
      // datetime-local gives local wall time; store the instant it names.
      const dueAt = due ? new Date(due).toISOString() : undefined;
      await saveManualAssignment({
        courseId,
        groupId: resolvedGroup,
        name: name.trim(),
        dueAt,
        pointsPossible: pts,
      });
      onOpenChange(false);
      onSaved();
      setName("");
      setDue("");
      setPointsStr("");
      toast.success("Added. It's marked manual until Canvas confirms it.");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add an assignment</DialogTitle>
          <DialogDescription>
            For work the syllabus knows about but Canvas doesn't show yet — or everything, if
            you're running on the calendar feed. Manual rows survive every sync.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Assignment name"
            className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand"
          />

          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!weighted && <SelectItem value={NO_GROUP}>No group</SelectItem>}
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name ?? "Unnamed group"}
                  {g.weight !== null ? ` (${g.weight.toFixed(0)}%)` : ""}
                </SelectItem>
              ))}
              <SelectItem value={NEW_GROUP}>New group…</SelectItem>
            </SelectContent>
          </Select>

          {groupId === NEW_GROUP && (
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand"
              />
              <input
                value={newGroupWeight}
                onChange={(e) => setNewGroupWeight(e.target.value)}
                placeholder={weighted ? "weight %" : "weight"}
                inputMode="decimal"
                className="rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:border-brand"
              />
            </div>
          )}

          <div className="grid grid-cols-[1fr_88px] gap-2">
            <input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand"
            />
            <input
              value={pointsStr}
              onChange={(e) => setPointsStr(e.target.value)}
              placeholder="points"
              inputMode="decimal"
              className="rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:border-brand"
            />
          </div>
        </div>

        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Add assignment"}
        </Button>
      </DialogContent>
    </Dialog>
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
