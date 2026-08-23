/**
 * urgency — the tier that colors impact bars (§5 design review).
 *
 * Called by: ImpactBar consumers (Triage, CourseDetail).
 * Calls: nothing.
 *
 * critical for missing/overdue, amber inside 72 hours, muted otherwise.
 * Green is deliberately absent — an undone assignment is never "good".
 */
export type UrgencyTier = "pinned" | "soon" | "later";

export function urgencyTier(state: string, dueAt: string | null): UrgencyTier {
  if (state === "missing" || state === "overdue") return "pinned";
  if (dueAt) {
    const ms = new Date(dueAt).getTime() - Date.now();
    if (!Number.isNaN(ms) && ms < 72 * 3600_000) return "soon";
  }
  return "later";
}
