/**
 * GradeGapBar — the signature element (SPEC.md §9.3). Not a generic progress
 * bar.
 *
 * Called by: CourseDetail and course cards (M3); the dev preview until then.
 * Calls: motion for the springs, Tooltip for the exact-points hovers.
 *
 * One horizontal track, three regions:
 *
 * ```
 * ├──────────── earned ────────────┼─── still winnable ───┼─ lost ─┤
 * 0%                          projected              max possible  100%
 * ```
 *
 * - **Earned** — solid fill in the course's signal colour. Points banked: this
 *   is where you land if you stop working today (the projected grade).
 * - **Still winnable** — a low-opacity diagonal hatch (SVG `<pattern>`). The
 *   grade still in play. It looks unstable because it is.
 * - **Lost** — points already forfeited to missed or low-scored work, in
 *   `--locked`. Flat, dead, unclickable.
 *
 * The target grade is a thin vertical marker across the track. When projected
 * crosses it, marker and bar snap to on-track with a brief spring — that
 * transition is the emotional payoff of the entire app, so it springs
 * (`springy()`), never fades.
 *
 * All percentages arrive computed from Rust. This component does zero grade
 * math — it cannot even derive "lost", it just draws `100 − maxPossiblePct`.
 */
import { motion } from "motion/react";
import { springy, useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SignalStatus } from "@/types";

/** Track fill per status — the vivid fill tier, not `-fg` (a bar is a
 *  graphical object, WCAG 1.4.11). */
const FILL: Record<SignalStatus, string> = {
  onTrack: "bg-on-track",
  atRisk: "bg-at-risk",
  critical: "bg-critical",
  locked: "bg-locked",
};

/** Matching stroke for the hatch lines, as raw CSS colour references so the
 *  SVG pattern can use them. */
const HATCH_STROKE: Record<SignalStatus, string> = {
  onTrack: "rgb(var(--on-track))",
  atRisk: "rgb(var(--at-risk))",
  critical: "rgb(var(--critical))",
  locked: "rgb(var(--locked))",
};

export interface GradeGapBarProps {
  /** Projected grade — the right edge of the solid "earned" region. */
  projectedPct: number;
  /** Best still-achievable grade — the right edge of the hatched region.
   *  Everything beyond it is lost. */
  maxPossiblePct: number;
  /** Target grade, drawn as the vertical marker. Omit to hide the marker. */
  targetPct?: number;
  /** Degree floor: below this the course stops counting toward the degree
   *  (C-/C from the requirement). Drawn as a short red tick at the base of
   *  the track — a hard line, visually distinct from the aspirational
   *  target marker above it. */
  floorPct?: number;
  /** Label for the floor tooltip, e.g. "C- required for the major". */
  floorLabel?: string;
  /** The course's standing, computed in Rust. Drives every colour here. */
  status: SignalStatus;
  /** Track height. The compact size is for course cards. */
  size?: "default" | "compact";
  className?: string;
}

export function GradeGapBar({
  projectedPct,
  maxPossiblePct,
  targetPct,
  floorPct,
  floorLabel,
  status,
  size = "default",
  className,
}: GradeGapBarProps) {
  const reduced = useReducedMotion();
  const spring = springy(reduced);

  const earned = clamp(projectedPct);
  const winnableEnd = clamp(Math.max(maxPossiblePct, earned));
  const lost = 100 - winnableEnd;

  // The moment of the app: projected has crossed the target. The whole track
  // flips to on-track regardless of the status it arrived with.
  const hitTarget = targetPct !== undefined && earned >= targetPct;
  const effective: SignalStatus = hitTarget ? "onTrack" : status;

  const h = size === "compact" ? "h-2" : "h-3";
  // One pattern per status so two bars on screen never share (and fight over)
  // a pattern id.
  const patternId = `gap-hatch-${effective}`;

  return (
    <div className={cn("relative", className)}>
      <div
        role="img"
        aria-label={`Projected ${earned.toFixed(1)}%, best possible ${winnableEnd.toFixed(1)}%${
          targetPct !== undefined ? `, target ${targetPct.toFixed(0)}%` : ""
        }`}
        className={cn("relative flex w-full overflow-hidden rounded-full bg-fill-ghost", h)}
      >
        {/* Earned — solid, banked. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={cn("h-full", FILL[effective])}
              initial={{ width: 0 }}
              animate={{ width: `${earned}%` }}
              transition={spring}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            Earned — projected {earned.toFixed(1)}% if you stop here
          </TooltipContent>
        </Tooltip>

        {/* Still winnable — hatched, unstable. */}
        {winnableEnd > earned && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                className="hatch-unstable h-full"
                initial={{ width: 0 }}
                animate={{ width: `${winnableEnd - earned}%` }}
                transition={spring}
              >
                <svg className="h-full w-full" aria-hidden preserveAspectRatio="none">
                  <defs>
                    <pattern
                      id={patternId}
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke={HATCH_STROKE[effective]}
                        strokeWidth="2.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#${patternId})`} />
                </svg>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top">
              Still winnable — up to {winnableEnd.toFixed(1)}% is in play
            </TooltipContent>
          </Tooltip>
        )}

        {/* Lost — flat, dead. No hover affordance beyond the tooltip; there is
            nothing to do about these points, which is the point. */}
        {lost > 0.05 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-full flex-1 bg-locked/40" />
            </TooltipTrigger>
            <TooltipContent side="top">
              Lost — {lost.toFixed(1)} points already forfeited
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Degree floor. Below the track, in critical red, always: unlike the
          target this line is not aspirational — under it the course stops
          counting toward the degree. */}
      {floorPct !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              aria-hidden
              className="absolute -bottom-1.5 h-2 w-0.5 rounded-full bg-critical"
              style={{ left: `${clamp(floorPct)}%` }}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {floorLabel ?? `Degree floor ${floorPct.toFixed(0)}%`}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Target marker. Sits above the track so it reads as a goal line, not a
          fourth region. Springs to on-track together with the bar. */}
      {targetPct !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              aria-hidden
              className={cn(
                "absolute -top-1 bottom-[-4px] w-0.5 rounded-full",
                hitTarget ? "bg-on-track" : "bg-brand",
              )}
              initial={false}
              animate={{ left: `${clamp(targetPct)}%` }}
              transition={spring}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            Target {targetPct.toFixed(0)}%{hitTarget ? " — met" : ""}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n));
}
