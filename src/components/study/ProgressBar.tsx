/**
 * ProgressBar — the segmented done / shaky / not-started strip used on Study
 * home, the course page and the reader rail.
 */
import { cn } from "@/lib/utils";

/** Segmented bar: mastered solid, shaky faded, the rest empty. */
export function ProgressBar({ p, className }: { p: { mastered: number; shaky: number; total: number }; className?: string }) {
  const m = p.total ? (p.mastered / p.total) * 100 : 0;
  const s = p.total ? (p.shaky / p.total) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={p.total}
      aria-valuenow={p.mastered}
      aria-label={`${p.mastered} of ${p.total} sections done`}
      className={cn("h-1.5 overflow-hidden rounded-full bg-foreground/10", className)}
    >
      <div className="flex h-full">
        <div className="h-full bg-on-track transition-[width] duration-500" style={{ width: `${m}%` }} />
        <div className="h-full bg-at-risk/60 transition-[width] duration-500" style={{ width: `${s}%` }} />
      </div>
    </div>
  );
}
