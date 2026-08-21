/**
 * Triage — the default screen (SPEC.md §5, screen 1).
 *
 * Called by: the router, at "/".
 * Calls: ipc `triage_rows` / `set_estimate`; TriageRow rendering is local.
 *
 * The whole design brief for this screen is one sentence: open the laptop,
 * look at row one, start working. Anything that does not serve that belongs
 * on another screen — no chart, no summary card, no greeting.
 *
 * Ranking happens in `src-tauri/src/triage.rs`, never here (§10). Rows arrive
 * pre-sorted: pinned (missing/overdue) first, then by score. The estimate is
 * the one editable cell — it is the denominator of the score, so editing it
 * visibly reorders the list, which is exactly the feedback loop §5 wants.
 */
import { useCallback, useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { springy, useReducedMotion } from "@/hooks/useReducedMotion";
import { setEstimate, triageRows } from "@/lib/ipc";
import { minutes, relativeDue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TriageRow, TriageState } from "@/types";

const STATE_CHIP: Record<TriageState, { label: string; cls: string }> = {
  missing: { label: "missing", cls: "bg-critical/10 text-critical-fg" },
  overdue: { label: "overdue", cls: "bg-critical/10 text-critical-fg" },
  open: { label: "not submitted", cls: "bg-fill-ghost text-muted-foreground" },
};

export default function Triage() {
  const [rows, setRows] = useState<TriageRow[] | null>(null);

  const refresh = useCallback(() => {
    triageRows()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <ScreenHeader
        title="Triage"
        subtitle="Everything not yet submitted, ranked by what it costs you to skip."
      />

      {rows === null ? (
        <div className="mx-8 flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing to triage"
          description="Everything gradeable is submitted. Either you're ahead, or a sync is due — check the footer for when Canvas was last read."
          action={
            <Button asChild variant="outline">
              <Link to="/courses">See your courses</Link>
            </Button>
          }
        />
      ) : (
        <div className="mx-8 mb-8 flex flex-col gap-1.5">
          {rows.map((row, i) => (
            <TriageRowItem key={row.assignmentId} row={row} rank={i + 1} onEstimateSaved={refresh} />
          ))}
        </div>
      )}
    </>
  );
}

function TriageRowItem({
  row,
  rank,
  onEstimateSaved,
}: {
  row: TriageRow;
  rank: number;
  onEstimateSaved: () => void;
}) {
  const reduced = useReducedMotion();
  const pinned = row.state !== "open";
  const chip = STATE_CHIP[row.state];

  return (
    // `layout` is the point: when an estimate edit or a sync changes priority,
    // rows visibly slide to their new position — that movement is information
    // (§9.4).
    <motion.div
      layout
      transition={springy(reduced)}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-card",
        pinned ? "border-critical/40" : "border-border/60",
      )}
    >
      <span
        data-numeric
        className={cn(
          "w-6 shrink-0 text-center font-mono text-sm tabular-nums",
          rank === 1 ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{row.name ?? "Untitled"}</span>
          <span className={cn("chip shrink-0 text-2xs", chip.cls)}>{chip.label}</span>
        </div>
        <div className="mt-0.5 flex gap-2 text-2xs text-muted-foreground">
          <Link to={`/courses/${row.courseId}`} className="shrink-0 hover:underline">
            {row.courseCode ?? "—"}
          </Link>
          <span data-numeric className={cn("font-mono", pinned && "text-critical-fg")}>
            {relativeDue(row.dueAt)}
          </span>
        </div>
      </div>

      {/* The headline: share of the final grade at stake. */}
      <div className="w-28 shrink-0 text-right">
        <span data-numeric className="font-mono text-sm font-medium tabular-nums">
          {row.impactPct.toFixed(1)}%
        </span>
        <div className="text-2xs text-muted-foreground">of final grade</div>
      </div>

      <EstimateCell row={row} onSaved={onEstimateSaved} />
    </motion.div>
  );
}

/** The inline-editable time estimate (§5) — minutes in, "1h 30m" out. */
function EstimateCell({ row, onSaved }: { row: TriageRow; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const save = () => {
    const trimmed = value.trim();
    const mins = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (mins !== null && (Number.isNaN(mins) || mins < 0)) {
      toast.error("Estimates are minutes — plain numbers only.");
      return;
    }
    setEstimate(row.assignmentId, mins)
      .then(() => {
        setEditing(false);
        onSaved(); // re-rank: the estimate is the score's denominator
      })
      .catch(() => toast.error("Could not save the estimate."));
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(row.estMinutes?.toString() ?? "");
          setEditing(true);
        }}
        className="w-16 shrink-0 rounded-md px-2 py-1 text-right font-mono text-xs tabular-nums text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
        title="Your time estimate — click to edit"
      >
        {minutes(row.estMinutes)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
      placeholder="min"
      className="w-16 shrink-0 rounded-md border border-brand bg-transparent px-2 py-1 text-right font-mono text-xs tabular-nums outline-none"
    />
  );
}
