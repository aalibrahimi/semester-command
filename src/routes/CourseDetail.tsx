/**
 * CourseDetail — one course, in full (SPEC.md §5, screen 2).
 *
 * Called by: the router, at "/courses/:courseId".
 * Calls: ScreenHeader, EmptyState. From M3: GradeGapBar, WhatDoINeedDialog,
 * the assignment table and the rubric Sheet.
 *
 * This screen is the only place `text-display` (48px) is allowed to appear, and
 * only on the current course grade (§9.2).
 *
 * Layout, once M2 and M3 land:
 *   - Current vs. projected, side by side, with the gap between them labelled.
 *     The gap is the motivation, so it is a first-class element, not a caption.
 *   - The Grade Gap bar (§9.3).
 *   - Assignment groups with weights and per-group percentages.
 *   - Full assignment list with scores; rubric criteria in a right-hand Sheet
 *     so the list stays visible behind it.
 *   - The "what do I need" solver panel.
 *
 * TODO(M2): grade queries via `get_course_grades`.
 * TODO(M3): everything above.
 */
import { useParams } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <>
      <ScreenHeader title="Course" subtitle={courseId ? `Canvas course ${courseId}` : undefined} />
      <EmptyState
        icon={GraduationCap}
        title="Nothing synced for this course"
        description="Current and projected grades, assignment groups, the Grade Gap bar and the “what do I need” solver all live here once the grade engine lands in M2."
      />
    </>
  );
}
