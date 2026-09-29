/**
 * Calendar agenda view: the list of upcoming items grouped by day, plus the
 * upcoming school breaks card.
 */
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/layout/EmptyState";
import { upcomingAcademic } from "@/lib/academicCalendar";
import { relativeDue } from "@/lib/format";
import { courseShort } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/types";

export function AgendaView({ items }: { items: CalendarItem[] }) {
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
      <UpcomingBreaks />
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

/** The university's rhythm, on the page students actually check daily:
 *  next holiday, when winter break starts, finals week. */
function UpcomingBreaks() {
  const [today] = useState(() => new Date());
  const upcoming = upcomingAcademic(today, 3).filter((u) => u.span.kind !== "milestone");
  if (upcoming.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-fill-ghost/40 px-3 py-2">
      <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        Breaks &amp; holidays
      </span>
      {upcoming.map(({ span, startsInDays }) => (
        <span key={span.label} className="chip gap-1.5 bg-card text-2xs">
          <span className="font-medium">{span.label}</span>
          <span data-numeric className="font-mono tabular-nums text-muted-foreground">
            {new Date(span.start + "T00:00").toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
            {startsInDays === 0
              ? " · now"
              : ` · in ${startsInDays} day${startsInDays === 1 ? "" : "s"}`}
          </span>
        </span>
      ))}
    </div>
  );
}
