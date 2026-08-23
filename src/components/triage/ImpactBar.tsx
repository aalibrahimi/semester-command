/**
 * ImpactBar — the inline "share of your final grade" bar (§5 design review).
 *
 * Called by: Triage queue rows, CourseDetail assignment rows.
 * Calls: nothing.
 *
 * A fixed-width track whose fill length IS the percentage of the final grade
 * at stake — a 40% final visually dwarfs a 2% discussion post, which is the
 * entire point. Fill color follows the signal palette by urgency tier:
 * critical for missing/overdue, amber inside 72 hours, muted otherwise.
 * Green is deliberately absent — an undone assignment is never "good".
 *
 * The number renders beside the bar in mono; the bar is the comparison, the
 * number is the fact. Linear bars only — the app's single donut lives on
 * course detail (§5).
 */
import { cn } from "@/lib/utils";
import type { UrgencyTier } from "@/lib/urgency";

const FILL: Record<UrgencyTier, string> = {
  pinned: "bg-critical",
  soon: "bg-at-risk",
  later: "bg-locked/70",
};

export function ImpactBar({
  impactPct,
  tier,
  width = 140,
  className,
}: {
  /** Percentage points of the final grade at stake (0–100). */
  impactPct: number;
  tier: UrgencyTier;
  /** Track width in px — fixed per column so rows align (§ strict grid). */
  width?: number;
  className?: string;
}) {
  const fill = Math.min(100, Math.max(0, impactPct));
  return (
    <span
      className={cn("flex shrink-0 items-center gap-2", className)}
      style={{ width: `${width + 52}px` }}
    >
      <span
        className="h-1.5 overflow-hidden rounded-full bg-fill-ghost"
        style={{ width: `${width}px` }}
        aria-hidden
      >
        <span
          className={cn("block h-full rounded-full", FILL[tier])}
          style={{ width: `${fill}%` }}
        />
      </span>
      <span
        data-numeric
        className={cn(
          "w-11 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums",
          impactPct <= 0.05 ? "text-muted-foreground/40" : "text-muted-foreground",
        )}
      >
        {/* Zero impact is the absence of a fact — a dash, not "0.0%"
            repeated down the column. */}
        {impactPct > 0.05 ? `${impactPct.toFixed(1)}%` : "—"}
      </span>
    </span>
  );
}
