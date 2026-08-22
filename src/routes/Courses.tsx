/**
 * Courses — the index that the sidebar's "Courses" nav item points at.
 *
 * Called by: the router, at "/courses".
 * Calls: useCourses, GradeGapBar.
 *
 * NOTE: §5 lists four screens and this is not one of them — it exists because
 * the sidebar nav needs a destination when no course is selected. It stays
 * deliberately thin: a grid of course cards, sorted by risk in Rust, routing
 * into Course detail. If it starts growing analytics, that work belongs on
 * Course detail instead.
 */
import { Eye, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { CourseStatusDot } from "@/components/layout/CourseStatusDot";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { announceCoursesChanged, useCourses } from "@/hooks/useCourses";
import { setCourseHidden } from "@/lib/ipc";
import { pct } from "@/lib/format";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { parseCourseLabel } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CourseSummary } from "@/types";

export default function Courses() {
  const { courses: allCourses, loaded, refresh } = useCourses();
  const courses = allCourses.filter((c) => !c.hidden);
  const hidden = allCourses.filter((c) => c.hidden);

  return (
    <>
      <ScreenHeader title="Courses" subtitle="Active enrollments, sorted by risk." />

      {!loaded ? (
        <div className="mx-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : allCourses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses synced"
          description="Once Canvas is connected, every active course appears here and in the sidebar, sorted by which one is closest to falling short of your target."
          action={
            <Button asChild>
              <Link to="/settings">Connect Canvas</Link>
            </Button>
          }
        />
      ) : (
        <div className="mx-8 mb-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Rust sorts by risk, so index 0 is the course most worth
                worrying about — it gets the full-width feature tile. */}
            {courses.map((c, i) => (
              <CourseCard key={c.id} course={c} featured={i === 0 && courses.length > 2} />
            ))}
          </div>

          {/* Hidden courses: present but quiet, one click to restore. */}
          {hidden.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                {hidden.length} hidden course{hidden.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-2 flex flex-col gap-1">
                {hidden.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 px-4 py-2 text-sm text-muted-foreground"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {c.courseCode ?? c.name ?? c.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void setCourseHidden(c.id, false).then(() => {
                          announceCoursesChanged();
                          void refresh();
                        })
                      }
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Unhide
                    </Button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </>
  );
}

function CourseCard({ course: c, featured }: { course: CourseSummary; featured?: boolean }) {
  const label = parseCourseLabel(c.courseCode ?? c.name ?? c.id);
  const graded = c.grade.currentPct !== null;
  return (
    <Link
      to={`/courses/${c.id}`}
      className={cn(
        // Editorial zinc: hairline border, tight radius, no soft shadow —
        // sharpness is the styling.
        "group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors duration-micro hover:border-muted-foreground/40",
        featured && "lg:col-span-2 p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <CourseStatusDot status={c.status} emphasize className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn("font-mono font-semibold tracking-tight", featured ? "text-lg" : "text-sm")}>
              {label.code ?? label.title}
            </span>
            {label.term && (
              <span className="text-2xs font-medium uppercase tracking-[0.15em] text-muted-foreground/70">
                {label.term}
              </span>
            )}
          </div>
          {label.code && label.title !== label.code && (
            <div className="truncate text-xs text-muted-foreground">{label.title}</div>
          )}
        </div>
        {c.source !== "api" && (
          <Badge variant="secondary" className="text-2xs">
            {c.source}
          </Badge>
        )}
      </div>

      {c.gradeable ? (
        <>
          {/* Current vs projected (§4.2). Week one gets honest words, not an
              alarming pair of zeros: no grades yet means "—", said plainly. */}
          <div className="flex items-baseline gap-4 font-mono tabular-nums">
            {graded ? (
              <>
                <div>
                  <span className="text-xl font-medium">{pct(c.grade.currentPct)}</span>
                  <span className="ml-1.5 text-2xs text-muted-foreground">current</span>
                </div>
                <div>
                  <span className="text-xl font-medium text-muted-foreground">
                    {pct(c.grade.projectedPct)}
                  </span>
                  <span className="ml-1.5 text-2xs text-muted-foreground">projected</span>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                nothing graded yet
              </span>
            )}
            <span className="ml-auto text-2xs text-muted-foreground">
              target {c.targetLetter} ({c.targetPct.toFixed(0)}%)
            </span>
          </div>
          <GradeGapBar
            projectedPct={c.grade.projectedPct}
            maxPossiblePct={c.maxPossiblePct}
            targetPct={c.targetPct}
            floorPct={floorForCanvasCourse(c.courseCode)?.pct}
            floorLabel={
              floorForCanvasCourse(c.courseCode)
                ? `${floorForCanvasCourse(c.courseCode)?.letter} required for degree credit`
                : undefined
            }
            status={c.status}
            size={featured ? "default" : "compact"}
          />
          <div className="flex gap-3 text-2xs text-muted-foreground">
            {c.openCount > 0 && <span>{c.openCount} open</span>}
            {c.missingCount > 0 && (
              <span className="text-critical-fg">{c.missingCount} missing</span>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          No graded work — announcements or resources only.
        </p>
      )}
    </Link>
  );
}
