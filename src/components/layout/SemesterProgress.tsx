/**
 * SemesterProgress — weeks elapsed vs. weeks remaining, in the header (§9.5).
 *
 * Called by: AppShell.
 * Calls: nothing. Term dates arrive as props.
 *
 * The reason this exists: "the semester is long" is a feeling, "you have five
 * weeks" is a number. Reframing one into the other is the entire job, which is
 * why the remaining count is the loud part and the bar is the quiet part.
 *
 * TODO(M1): term start/end come from `courses.term` once sync populates it.
 * Until then AppShell passes nothing and this renders nothing — better than
 * inventing a semester.
 */
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface SemesterProgressProps {
  /** ISO date the term began. */
  startsAt?: string | null;
  /** ISO date the term ends. */
  endsAt?: string | null;
  /** Injectable for tests and for the dev preview page. */
  now?: Date;
}

export function SemesterProgress({ startsAt, endsAt, now = new Date() }: SemesterProgressProps) {
  if (!startsAt || !endsAt) return null;

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const t = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const elapsedPct = Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100));
  const weeksLeft = Math.max(0, Math.ceil((end - t) / (7 * 86_400_000)));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2.5" aria-label="Semester progress">
          <Progress value={elapsedPct} className="h-1 w-28" />
          <span data-numeric className="whitespace-nowrap font-mono text-2xs text-muted-foreground">
            {weeksLeft}w left
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {elapsedPct.toFixed(0)}% of the term elapsed · {weeksLeft} weeks remaining
      </TooltipContent>
    </Tooltip>
  );
}
