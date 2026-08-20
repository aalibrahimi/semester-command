/**
 * CourseStatusDot — the signal-coloured dot beside every course in the sidebar.
 *
 * Called by: Sidebar (both expanded and collapsed).
 * Calls: nothing.
 *
 * This is the smallest component in the app and close to the most important
 * one. §5: "you should be able to tell which class is in trouble without
 * leaving whatever screen you're on", and the dots are the one thing that must
 * survive collapsing the sidebar to a rail.
 *
 * Colour is never decoration here — it maps to `SignalStatus`, which Rust
 * computed. The component does not decide what colour a course is; it only
 * knows how to draw the answer.
 */
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SignalStatus } from "@/types";

/** Fill class per status. Fills, not `-fg` variants: a 8px dot is a graphical
 *  object (WCAG 1.4.11, 3:1), not text. */
const FILL: Record<SignalStatus, string> = {
  onTrack: "bg-on-track",
  atRisk: "bg-at-risk",
  critical: "bg-critical",
  locked: "bg-locked",
};

/** Screen-reader and tooltip wording. Colour alone must never be the only
 *  channel carrying the meaning (§9.7). */
const LABEL: Record<SignalStatus, string> = {
  onTrack: "On track — projected grade meets your target",
  atRisk: "At risk — within 5 points of falling short",
  critical: "Critical — target no longer reachable, or work is missing",
  locked: "Locked — graded and final",
};

export interface CourseStatusDotProps {
  status: SignalStatus;
  /** Adds a soft halo. Reserved for `critical`, so a class in real trouble is
   *  findable in peripheral vision. */
  emphasize?: boolean;
  className?: string;
}

export function CourseStatusDot({ status, emphasize, className }: CourseStatusDotProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={LABEL[status]}
          className={cn(
            "inline-block h-2 w-2 shrink-0 rounded-full",
            FILL[status],
            emphasize && status === "critical" && "ring-2 ring-critical/30",
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="right">{LABEL[status]}</TooltipContent>
    </Tooltip>
  );
}
