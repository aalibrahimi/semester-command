/**
 * Triage — the default screen (SPEC.md §5, screen 1).
 *
 * Called by: the router, at "/".
 * Calls: ScreenHeader, EmptyState. From M3 it calls `useTriage()`.
 *
 * The whole design brief for this screen is one sentence: open the laptop, look
 * at row one, start working. Anything that does not serve that belongs on
 * another screen — which is why there is no chart here, no summary card, and no
 * greeting.
 *
 * Ranking (implemented in `src-tauri/src/triage.rs`, never here):
 *   score        = (grade_impact × urgency) / est_hours
 *   grade_impact = points_possible × effective_group_weight
 *   urgency      = 1 / max(days_until_due, 0.5)
 *
 * TODO(M3): render the ranked list, with overdue-but-open items pinned to the
 * top in `--critical` and rows reordering via motion's `layout` prop when a
 * sync changes priority.
 */
import { ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";

export default function Triage() {
  return (
    <>
      <ScreenHeader
        title="Triage"
        subtitle="Everything not yet submitted, ranked by what it costs you to skip."
      />
      <EmptyState
        icon={ListChecks}
        title="Nothing to triage yet"
        description={
          <>
            Triage ranks unsubmitted work by how much of your final grade is at stake divided by
            how long it takes. It needs coursework first — connect Canvas, or paste your calendar
            feed URL if SJSU's SSO is being difficult.
          </>
        }
        action={
          <Button asChild>
            <Link to="/settings">Connect Canvas</Link>
          </Button>
        }
      />
    </>
  );
}
