/**
 * Calendar — month + agenda view of every due date (SPEC.md §5, screen 3).
 *
 * Called by: the router, at "/calendar".
 * Calls: ScreenHeader, EmptyState. From M4: the `.ics` export command.
 *
 * TODO(M3): month grid and agenda list.
 * TODO(M4): "Export semester" writes an .ics via `src-tauri/src/ical.rs`. Each
 * event carries a stable UID — `canvas-assignment-{id}@semester-command` — so
 * re-exporting after a sync updates the existing events in the user's real
 * calendar instead of duplicating every one of them.
 */
import { CalendarDays } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";

export default function Calendar() {
  return (
    <>
      <ScreenHeader
        title="Calendar"
        subtitle="Every due date across every course."
        actions={
          <Button variant="outline" size="sm" disabled>
            Export semester (.ics)
          </Button>
        }
      />
      <EmptyState
        icon={CalendarDays}
        title="No due dates yet"
        description="Due dates arrive with the first sync. They also work under the calendar-feed fallback, which needs no login at all — it just cannot see grades."
      />
    </>
  );
}
