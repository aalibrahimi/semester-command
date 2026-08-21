/**
 * StatTile — a big-number card in the reference's overview style: icon chip,
 * quiet label, display-weight number, optional delta pill.
 *
 * Called by: the dev preview now; Triage and CourseDetail headers in M3.
 * Calls: nothing.
 *
 * The number is the whole tile; everything else whispers. Delta pills use the
 * signal palette because a delta on a grade *is* risk information — this is
 * not the place for decorative green.
 */
import { cn } from "@/lib/utils";

export interface StatTileProps {
  icon?: React.ComponentType<{ className?: string }>;
  /** Quiet label above the number: "Projected standing". */
  label: string;
  /** The big number, already formatted ("87.2%", "12", "3h 40m"). */
  value: string;
  /** Small text under/beside the delta: "vs last sync". */
  caption?: string;
  /** Delta pill. `tone` picks the signal colour pair. */
  delta?: { text: string; tone: "up" | "down" | "flat" };
  className?: string;
}

const DELTA_TONE = {
  up: "bg-on-track/10 text-on-track-fg",
  down: "bg-critical/10 text-critical-fg",
  flat: "bg-fill-ghost text-muted-foreground",
} as const;

export function StatTile({ icon: Icon, label, value, caption, delta, className }: StatTileProps) {
  return (
    <div className={cn("panel flex flex-col gap-3 p-5", className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fill-ghost">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span data-numeric className="font-mono text-xl font-semibold tracking-tight">
          {value}
        </span>
        {delta && <span className={cn("chip", DELTA_TONE[delta.tone])}>{delta.text}</span>}
      </div>

      {caption && <span className="text-2xs text-muted-foreground">{caption}</span>}
    </div>
  );
}
