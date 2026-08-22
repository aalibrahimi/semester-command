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
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calendarItems, exportSemesterIcs } from "@/lib/ipc";
import { relativeDue } from "@/lib/format";
import { courseShort } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/types";

type View = "agenda" | "month";
const VIEW_KEY = "calendar-view";

export default function Calendar() {
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [view, setView] = useState<View>(() =>
    localStorage.getItem(VIEW_KEY) === "month" ? "month" : "agenda",
  );

  useEffect(() => {
    calendarItems()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const pickView = (v: string) => {
    const next: View = v === "month" ? "month" : "agenda";
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  return (
    <>
      <ScreenHeader
        title="Calendar"
        subtitle="Every due date across every course."
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={pickView}>
              <TabsList className="h-8">
                <TabsTrigger value="agenda" className="text-xs">
                  Agenda
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
                        `Exported ${n} due date${n === 1 ? "" : "s"}. Import the file into Google Calendar or Outlook — re-exporting later updates the same events.`,
                      ),
                    )
                    .catch(() => toast.error("Export failed."));
                });
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export (.ics)
            </Button>
          </div>
        }
      />

      {items === null ? (
        <div className="mx-8 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No due dates yet"
          description="Due dates arrive with sync — and also work under the calendar-feed fallback, which needs no login at all."
        />
      ) : view === "agenda" ? (
        <AgendaView items={items} />
      ) : (
        <MonthView items={items} />
      )}
    </>
  );
}

/* ── Agenda ──────────────────────────────────────────────────────────────── */

function AgendaView({ items }: { items: CalendarItem[] }) {
  // From three days back — a just-missed deadline is still information.
  const [cutoff] = useState(() => Date.now() - 3 * 86_400_000);
  const upcoming = items.filter((i) => new Date(i.dueAt).getTime() > cutoff);

  const byDay = new Map<string, CalendarItem[]>();
  for (const item of upcoming) {
    const day = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(item.dueAt));
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  if (byDay.size === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No upcoming due dates"
        description="Nothing dated is coming up — switch to Month to look further out."
      />
    );
  }

  return (
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
                  className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground hover:underline"
                >
                  {courseShort(item.courseCode)}
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
                <span
                  data-numeric
                  className="w-24 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground"
                >
                  {relativeDue(item.dueAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ── Month grid ──────────────────────────────────────────────────────────── */

function MonthView({ items }: { items: CalendarItem[] }) {
  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [today] = useState(() => new Date());

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(anchor);

  // Weeks start Sunday, matching Canvas's own calendar.
  const firstCell = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const cells: Date[] = Array.from(
    { length: 42 },
    (_, i) => new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + i),
  );

  const byDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dateKey(new Date(item.dueAt));
    byDate.set(key, [...(byDate.get(key) ?? []), item]);
  }

  return (
    <div className="mx-8 mb-10">
      <div className="mb-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date(year, month - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="w-44 text-center font-display text-sm font-semibold">{monthLabel}</span>
        <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date(year, month + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => setAnchor(new Date(today.getFullYear(), today.getMonth(), 1))}
        >
          Today
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <div className="grid grid-cols-7 border-b border-border/60 bg-fill-ghost/60">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const inMonth = day.getMonth() === month;
            const isToday = dateKey(day) === dateKey(today);
            const dayItems = byDate.get(dateKey(day)) ?? [];
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-24 border-b border-r border-border/40 p-1.5 last:border-r-0",
                  !inMonth && "bg-fill-ghost/30",
                )}
              >
                <span
                  data-numeric
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-2xs tabular-nums",
                    isToday
                      ? "bg-brand font-semibold text-white"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {dayItems.slice(0, 3).map((item) => (
                    <Tooltip key={item.assignmentId}>
                      <TooltipTrigger asChild>
                        <Link
                          to={`/courses/${item.courseId}`}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-2xs leading-tight transition-colors duration-micro",
                            item.submitted || item.graded
                              ? "bg-fill-ghost text-muted-foreground line-through"
                              : "bg-brand/10 text-brand-fg hover:bg-brand/20",
                          )}
                        >
                          {item.name ?? "Untitled"}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {courseShort(item.courseCode)} · {item.name ?? "Untitled"}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {dayItems.length > 3 && (
                    <span className="px-1 text-2xs text-muted-foreground">
                      +{dayItems.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Local-date key ("2026-8-21") — due dates render on the user's wall-clock
 *  day, which is the whole point of a calendar. */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
