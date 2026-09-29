/**
 * Where a due item stands (done, missing, due soon...), with the label and
 * chip colors the month views use for each state.
 */
import type { CalendarItem } from "@/types";

export type DueState = "done" | "overdue" | "past" | "soon" | "upcoming";

/** One word for where an item stands, from the viewer's point of view. */
export function dueState(item: CalendarItem, done: boolean, now: number): DueState {
  if (done) return "done";
  const t = new Date(item.dueAt).getTime();
  // Zero-point items (checklists, "review the assignment list") can't be
  // missed in any way that matters, so they fade instead of turning red.
  if (t < now) return item.pointsPossible ? "overdue" : "past";
  if (t - now < 48 * 3_600_000) return "soon";
  return "upcoming";
}

export const STATE_LABEL: Record<DueState, string> = {
  done: "Done",
  overdue: "Missing",
  past: "Past, no points",
  soon: "Due soon",
  upcoming: "Upcoming",
};

export const STATE_CHIP: Record<DueState, string> = {
  done: "bg-on-track/15 text-on-track-fg",
  overdue: "bg-critical/15 text-critical-fg",
  past: "bg-foreground/[0.07] text-muted-foreground",
  soon: "bg-at-risk/15 text-at-risk-fg",
  upcoming: "bg-brand/[0.12] text-brand-fg",
};
