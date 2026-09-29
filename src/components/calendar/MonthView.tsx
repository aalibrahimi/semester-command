/**
 * Calendar month view: the month grid (detailed layout) with its saved
 * layout and hidden-item settings.
 */
import { useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, LayoutGrid, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDoneSet, useNicknames } from "@/lib/localPrefs";
import { courseHsla } from "@/lib/courseColor";
import { academicOn } from "@/lib/academicCalendar";
import { courseShort } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/types";
import { dateKey } from "@/components/calendar/time";
import { OverviewLayout, DueChip } from "@/components/calendar/MonthOverview";
import { dueState } from "@/components/calendar/dueState";

/** Hidden-course filter for the month grid, per viewer. */
const MONTH_HIDDEN_KEY = "calendar-month-hidden";

function readHidden(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(MONTH_HIDDEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

type MonthLayout = "detailed" | "overview";

const MONTH_LAYOUT_KEY = "calendar-month-layout";

function readLayout(): MonthLayout {
  try {
    return localStorage.getItem(MONTH_LAYOUT_KEY) === "overview" ? "overview" : "detailed";
  } catch {
    return "detailed";
  }
}

/**
 * The month grid. Fills the window; every chip carries its course's color
 * (a left bar and a faint wash) so a week reads by class at a glance.
 * Finished work fades with a check instead of shouting with a strikethrough;
 * missed work turns red. Hover any chip for the full details; a crowded day
 * opens its whole list from "+N more". The legend doubles as a filter.
 */
export function MonthView({ items, controls }: { items: CalendarItem[]; controls: React.ReactNode }) {
  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [today] = useState(() => new Date());
  const now = today.getTime();
  const nicknames = useNicknames();
  const doneSet = useDoneSet();
  const [hidden, setHidden] = useState<Set<string>>(readHidden);
  const [layout, setLayout] = useState<MonthLayout>(readLayout);
  const pickLayout = (l: MonthLayout) => {
    setLayout(l);
    try {
      localStorage.setItem(MONTH_LAYOUT_KEY, l);
    } catch {
      /* per-viewer convenience only */
    }
  };

  const toggleCourse = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(MONTH_HIDDEN_KEY, JSON.stringify([...next]));
      } catch {
        /* per-viewer convenience only */
      }
      return next;
    });
  };

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const monthName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(anchor);

  // Weeks start Sunday, matching Canvas's own calendar. Only as many weeks
  // as the month needs (4 to 6), so the rows can be tall.
  const firstCell = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((new Date(year, month, 1).getDay() + daysInMonth) / 7);
  const cells: Date[] = Array.from(
    { length: weeks * 7 },
    (_, i) => new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + i),
  );

  const isDone = (i: CalendarItem) => i.submitted || i.graded || doneSet.has(i.assignmentId);
  const labelOf = (i: CalendarItem) => nicknames[i.courseId] ?? courseShort(i.courseCode);

  // Courses present in the data, for the legend.
  const courses = useMemo(() => {
    const m = new Map<string, CalendarItem>();
    for (const i of items) if (!m.has(i.courseId)) m.set(i.courseId, i);
    return [...m.values()].sort((a, b) => courseShort(a.courseCode).localeCompare(courseShort(b.courseCode)));
  }, [items]);

  const visible = items.filter((i) => !hidden.has(i.courseId));
  const byDate = new Map<string, CalendarItem[]>();
  for (const item of visible) {
    const key = dateKey(new Date(item.dueAt));
    byDate.set(key, [...(byDate.get(key) ?? []), item]);
  }
  for (const list of byDate.values()) list.sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || a.dueAt.localeCompare(b.dueAt));

  const inThisMonth = visible.filter((i) => {
    const d = new Date(i.dueAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const left = inThisMonth.filter((i) => !isDone(i) && new Date(i.dueAt).getTime() >= now).length;
  const missing = inThisMonth.filter((i) => dueState(i, isDone(i), now) === "overdue").length;
  const doneCount = inThisMonth.filter(isDone).length;
  const perCourse = (id: string) => inThisMonth.filter((i) => i.courseId === id).length;

  const MAX = 4;

  return (
    <div className="mx-6 mb-8 mt-6 flex flex-col gap-4" style={{ minHeight: "max(720px, calc(100dvh - 7rem))" }}>
      {/* One header row: the month and its navigation, the month in
          numbers, then the view switch and export. Replaces the screen
          title block so the grid gets the height. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Previous month" onClick={() => setAnchor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="min-w-[13rem] text-center font-display text-2xl font-semibold tracking-tight">
            {monthName} <span className="font-normal text-muted-foreground">{year}</span>
          </h1>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Next month" onClick={() => setAnchor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2 h-8 rounded-full px-3.5 text-xs" onClick={() => setAnchor(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand/10 px-3 py-1 font-medium text-brand-fg">
            <span data-numeric className="font-mono font-semibold tabular-nums">{left}</span> still to do
          </span>
          {missing > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-critical/[0.12] px-3 py-1 font-medium text-critical-fg">
              <AlertCircle className="h-3.5 w-3.5" />
              <span data-numeric className="font-mono font-semibold tabular-nums">{missing}</span> missing
            </span>
          )}
          <span className="rounded-full bg-on-track/[0.12] px-3 py-1 font-medium text-on-track-fg">
            <span data-numeric className="font-mono font-semibold tabular-nums">{doneCount}</span> done
          </span>
        </div>
        <div className="ml-auto">{controls}</div>
      </div>

      {/* Legend and filter (one chip per course, in its color), and the
          Detailed / Overview switch. */}
      <div className="flex flex-wrap items-center gap-2">
      {courses.length > 1 && (
        <>
          {courses.map((c) => {
            const off = hidden.has(c.courseId);
            return (
              <button
                key={c.courseId}
                type="button"
                onClick={() => toggleCourse(c.courseId)}
                aria-pressed={!off}
                title={off ? "Show this course" : "Hide this course"}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-micro",
                  off ? "border-dashed border-border text-muted-foreground/60" : "border-transparent text-foreground shadow-card",
                )}
                style={off ? undefined : { backgroundColor: courseHsla(c.courseId, 0.14) }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: courseHsla(c.courseId, off ? 0.3 : 0.95) }} />
                {labelOf(c)}
                <span data-numeric className="font-mono text-2xs tabular-nums text-muted-foreground">{perCourse(c.courseId)}</span>
              </button>
            );
          })}
        </>
      )}
        <div className="ml-auto flex items-center rounded-full bg-fill-ghost p-0.5 text-xs" role="group" aria-label="Month layout">
          {(["detailed", "overview"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={layout === l}
              onClick={() => pickLayout(l)}
              title={l === "detailed" ? "Every item in the grid" : "Dots in the grid, full titles in a side panel"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors duration-micro",
                layout === l ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l === "detailed" ? <LayoutGrid className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
              {l === "detailed" ? "Detailed" : "Overview"}
            </button>
          ))}
        </div>
      </div>

      {layout === "overview" ? (
        <OverviewLayout
          cells={cells}
          weeks={weeks}
          month={month}
          today={today}
          byDate={byDate}
          visible={visible}
          isDone={isDone}
          labelOf={labelOf}
        />
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          <div className="grid grid-cols-7 border-b border-border/60">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, k) => (
              <div
                key={d}
                className={cn(
                  "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider",
                  k === today.getDay() && month === today.getMonth() && year === today.getFullYear() ? "text-brand-fg" : "text-muted-foreground",
                )}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(132px, 1fr))` }}>
            {cells.map((day, idx) => {
              const inMonth = day.getMonth() === month;
              const isToday = dateKey(day) === dateKey(today);
              const isPast = day.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              const dayItems = byDate.get(dateKey(day)) ?? [];
              const open = dayItems.filter((i) => { const st = dueState(i, isDone(i), now); return st !== "done" && st !== "past"; }).length;
              const special = academicOn(day).slice(0, 1);
              const shown = dayItems.slice(0, special.length ? MAX - 1 : MAX);
              const extra = dayItems.length - shown.length;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative flex min-w-0 flex-col gap-1 border-border/50 p-2",
                    idx % 7 !== 6 && "border-r",
                    idx < cells.length - 7 && "border-b",
                    weekend && inMonth && "bg-fill-ghost/35",
                    !inMonth && "bg-fill-ghost/50",
                    isToday && "bg-brand/[0.05]",
                  )}
                >
                  {isToday && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-inset ring-brand/60" />}
                  <div className="flex items-center justify-between gap-1">
                    <span
                      data-numeric
                      className={cn(
                        "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 font-mono text-[13px] font-semibold tabular-nums",
                        isToday ? "bg-brand-solid text-white shadow-card" : !inMonth ? "text-muted-foreground/40" : isPast ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {open > 0 && inMonth && (
                      <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", isPast ? "bg-critical/[0.12] text-critical-fg" : "bg-foreground/[0.06] text-muted-foreground")}>
                        {open} due
                      </span>
                    )}
                  </div>
                  <div className={cn("flex min-w-0 flex-col gap-1", !inMonth && "opacity-55")}>
                    {special.map((s) => (
                      <div
                        key={s.label}
                        title={s.label}
                        className={cn(
                          "truncate rounded-md px-2 py-1 text-[11.5px] font-medium",
                          s.kind === "holiday" || s.kind === "break" ? "bg-at-risk/15 text-at-risk-fg" : "bg-foreground/[0.06] text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </div>
                    ))}
                    {shown.map((item) => (
                      <DueChip key={item.assignmentId} item={item} label={labelOf(item)} state={dueState(item, isDone(item), now)} />
                    ))}
                    {extra > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="w-fit rounded-md px-2 py-0.5 text-left text-[11.5px] font-semibold text-muted-foreground hover:bg-fill-ghost hover:text-foreground">
                            +{extra} more
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80 rounded-xl p-3 shadow-elevated">
                          <div className="mb-2 text-xs font-semibold text-muted-foreground">
                            {new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(day)}
                          </div>
                          <div className="flex flex-col gap-1">
                            {dayItems.map((item) => (
                              <DueChip key={item.assignmentId} item={item} label={labelOf(item)} state={dueState(item, isDone(item), now)} roomy />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
