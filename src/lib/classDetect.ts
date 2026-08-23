/**
 * classDetect — shared state and filtering for class-time detection.
 *
 * The Calendar week view auto-runs detection once per app session; the
 * Syllabi page re-arms it after a new import so fresh syllabus text gets a
 * second chance. Both filter candidates against blocks already on the grid,
 * with the same tolerance, so "found N" toasts and the review dialog can
 * never disagree about what counts as new.
 */

import type { ClassSlotCandidate, PlannerBlock } from "@/types";

let attempted = false;

export function autoDetectAttempted(): boolean {
  return attempted;
}

export function markAutoDetectAttempted(): void {
  attempted = true;
}

/** Re-arm the once-per-session auto-run — call when new syllabus text lands. */
export function resetAutoDetect(): void {
  attempted = false;
}

/** Candidates not already confirmed on the grid. A slot counts as existing
 *  when the same course meets the same weekday within 20 minutes — syllabus
 *  times and Canvas event times rarely agree to the minute. */
export function newCandidates(
  candidates: ClassSlotCandidate[],
  blocks: PlannerBlock[],
): ClassSlotCandidate[] {
  return candidates.filter(
    (c) =>
      !blocks.some(
        (b) =>
          b.kind === "class" &&
          b.courseId === c.courseId &&
          b.weekday === c.weekday &&
          Math.abs(b.startMin - c.startMin) < 20,
      ),
  );
}
