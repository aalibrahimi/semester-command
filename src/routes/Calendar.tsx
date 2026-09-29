/**
 * Calendar — month grid + agenda view of every due date (§5, screen 3).
 *
 * Called by: the router, at "/calendar".
 * Calls: ipc `calendar_items`.
 *
 * Two views, toggled and remembered (localStorage): **Agenda** answers
 * "what's due next" as a chronological list; **Month** answers "what does my
 * week/month look like" spatially. Date grouping is presentation, not grade
 * math — allowed out here (§10).
 *
 * TODO(M4): "Export semester" writes an .ics via `src-tauri/src/ical.rs`
 * with stable UIDs (`canvas-assignment-{id}@semester-command`) so re-exports
 * update rather than duplicate.
 */
import { useEffect, useState } from "react";
import { save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { CalendarDays, Download } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calendarItems, exportSemesterIcs } from "@/lib/ipc";
import type { CalendarItem } from "@/types";
import { WeekView } from "@/components/calendar/WeekView";
import { AgendaView } from "@/components/calendar/AgendaView";
import { MonthView } from "@/components/calendar/MonthView";

type View = "agenda" | "week" | "month";
const VIEW_KEY = "calendar-view";

export default function Calendar() {
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [view, setView] = useState<View>(() => {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "month" || v === "week" ? v : "agenda";
  });

  useEffect(() => {
    calendarItems()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const pickView = (v: string) => {
    const next: View = v === "month" ? "month" : v === "week" ? "week" : "agenda";
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const controls = (
    <div className="flex items-center gap-2">
      <Tabs value={view} onValueChange={pickView}>
        <TabsList className="h-8">
          <TabsTrigger value="agenda" className="text-xs">
            Agenda
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs">
            Week
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs">
            Month
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Stable UIDs mean re-importing after a sync UPDATES events
          // in the user's real calendar instead of duplicating them.
          void saveFileDialog({
            defaultPath: "semester-command.ics",
            filters: [{ name: "Calendar", extensions: ["ics"] }],
          }).then((path) => {
            if (!path) return;
            exportSemesterIcs(path)
              .then((n) =>
                toast.success(
                  `Exported ${n} due date${n === 1 ? "" : "s"}. Import the file into Google Calendar or Outlook. Re-exporting later updates the same events.`,
                ),
              )
              .catch(() => toast.error("Export failed."));
          });
        }}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" /> Export (.ics)
      </Button>
    </div>
  );
  const monthMode = view === "month" && items !== null && items.length > 0;

  return (
    <>
      {!monthMode && (
        <ScreenHeader title="Calendar" subtitle="Every due date across every course." actions={controls} />
      )}

      {items === null ? (
        <div className="mx-8 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : view === "week" ? (
        /* The week planner works with zero due dates — class times and
           study blocks are its own data, not Canvas's. */
        <WeekView items={items} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No due dates yet"
          description="Due dates arrive with sync, and also work under the calendar-feed fallback, which needs no login at all."
        />
      ) : view === "agenda" ? (
        <AgendaView items={items} />
      ) : (
        <MonthView items={items} controls={controls} />
      )}
    </>
  );
}

/* ── Agenda ──────────────────────────────────────────────────────────────── */
