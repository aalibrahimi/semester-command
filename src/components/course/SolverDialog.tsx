/**
 * The 'what do I need?' dialog: solves for the score needed on remaining
 * work to hit a target grade.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { whatDoINeed } from "@/lib/ipc";
import { stripShouting } from "@/lib/stripShouting";
import { points } from "@/lib/format";
import type { AssignmentDetail, SolverAnswer } from "@/types";

export function SolverDialog({
  open,
  onOpenChange,
  courseId,
  targets,
  defaultTargetPct,
  maxPossiblePct,
  assignments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  targets: [string, number][];
  defaultTargetPct: number;
  maxPossiblePct: number;
  assignments: AssignmentDetail[];
}) {
  const [targetPct, setTargetPct] = useState(String(defaultTargetPct));
  const [scope, setScope] = useState<string>("everything");
  const [answer, setAnswer] = useState<SolverAnswer | null>(null);

  useEffect(() => {
    if (!open) return;
    // Clearing the stale answer while the solver round-trips to Rust.
    // oxlint-disable-next-line set-state-in-effect
    setAnswer(null);
    const target = Number.parseFloat(targetPct);
    if (Number.isNaN(target)) return;
    whatDoINeed(courseId, target, scope === "everything" ? null : scope)
      .then(setAnswer)
      .catch(() => toast.error("Solver failed: try re-syncing."));
  }, [open, targetPct, scope, courseId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What do I need?</DialogTitle>
          <DialogDescription>
            Every other ungraded assignment is held at zero: the honest baseline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={targetPct} onValueChange={setTargetPct}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map(([letter, cutoff]) => (
                <SelectItem key={letter} value={String(cutoff)}>
                  {letter} ({cutoff}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everything">Average on everything left</SelectItem>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {stripShouting(a.name).title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {answer && <SolverResult answer={answer} />}

        {/* "Best still possible" lives here, with the decision — not spread
            across the hero (§ design review). */}
        <p className="text-2xs text-muted-foreground">
          Best still possible in this course:{" "}
          <span data-numeric className="font-mono tabular-nums text-foreground">
            {maxPossiblePct.toFixed(1)}%
          </span>{" "}
          with perfect scores on everything remaining.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SolverResult({ answer }: { answer: SolverAnswer }) {
  if (answer.outcome === "required") {
    return (
      <div className="rounded-xl bg-fill-ghost p-4">
        <div data-numeric className="font-mono text-3xl font-medium tabular-nums">
          {answer.pct.toFixed(1)}%
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          needed
          {answer.pointsNeeded !== null && answer.pointsPossible !== null && (
            <>
              {" "}
              that's{" "}
              <span data-numeric className="font-mono text-foreground">
                {points(Math.ceil(answer.pointsNeeded * 10) / 10, answer.pointsPossible)}
              </span>{" "}
              points
            </>
          )}
        </p>
      </div>
    );
  }
  if (answer.outcome === "unreachable") {
    return (
      <div className="rounded-xl bg-critical/10 p-4">
        <div className="text-sm font-medium text-critical-fg">Not reachable from here.</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Highest possible grade:{" "}
          <span data-numeric className="font-mono text-foreground">
            {answer.bestPossiblePct.toFixed(1)}% ({answer.bestPossibleLetter})
          </span>
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-on-track/10 p-4">
      <div className="text-sm font-medium text-on-track-fg">Already locked in.</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Even scoring zero on everything left you finish at{" "}
        <span data-numeric className="font-mono text-foreground">
          {answer.floorPct.toFixed(1)}% ({answer.floorLetter})
        </span>
      </p>
    </div>
  );
}

/* ── Grade scale editor (§4.4) ───────────────────────────────────────────── */
