/**
 * Calendar — agenda view of every due date (SPEC.md §5, screen 3).
 *
 * Called by: the router, at "/calendar".
 * Calls: ipc `calendar_items`.
 *
 * Agenda first: for "what's due when", a chronological list grouped by day
 * answers faster than a month grid. TODO(M3 polish): the month grid.
 * TODO(M4): "Export semester" writes an .ics via `src-tauri/src/ical.rs`
 * with stable UIDs (`canvas-assignment-{id}@semester-command`) so re-exports
 * update rather than duplicate.
 */
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { calendarItems } from "@/lib/ipc";
import { relativeDue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/types";

export default function Calendar() {
  const [items, setItems] = useState<CalendarItem[] | null>(null);

  useEffect(() => {
    calendarItems()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  // Show from three days back — a just-missed deadline is still information.
  // Captured once per mount so render stays pure (the list refetches on
  // navigation anyway).
  const [cutoff] = useState(() => Date.now() - 3 * 86_400_000);

  // Group items by calendar day, locale-formatted. Grouping is presentation,
  // not grade math — allowed out here.
  const upcoming = (items ?? []).filter((i) => new Date(i.dueAt).getTime() > cutoff);
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of upcoming) {
    const day = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(item.dueAt));
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  return (
    <>
      <ScreenHeader
        title="Calendar"
        subtitle="Every due date across every course."
        actions={
          <Button variant="outline" size="sm" disabled title="Lands in M4">
            Export semester (.ics)
          </Button>
        }
      />

      {items === null ? (
        <div className="mx-8 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : byDay.size === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming due dates"
          description="Nothing dated is coming up. Due dates arrive with sync — and also work under the calendar-feed fallback, which needs no login at all."
        />
      ) : (
        <div className="mx-8 mb-10 flex flex-col gap-5">
          {[...byDay.entries()].map(([day, dayItems]) => (
            <section key={day}>
              <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {day}
              </h2>
              <div className="flex flex-col gap-1">
                {dayItems.map((item) => (
                  <div
                    key={item.assignmentId}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-2 shadow-card"
                  >
                    <Link
                      to={`/courses/${item.courseId}`}
                      className="w-40 shrink-0 truncate font-mono text-xs text-muted-foreground hover:underline"
                    >
                      {item.courseCode ?? "—"}
                    </Link>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        (item.submitted || item.graded) && "text-muted-foreground line-through",
                      )}
                    >
                      {item.name ?? "Untitled"}
                    </span>
                    {item.source !== "api" && (
                      <span className="chip bg-fill-ghost text-2xs text-muted-foreground">
                        {item.source}
                      </span>
                    )}
                    <span data-numeric className="w-24 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {relativeDue(item.dueAt)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
