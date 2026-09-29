/**
 * Calendar month view, overview layout: the compact grid with the side panel
 * of due items, and the chips that show each item's state.
 */
import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { courseHsla } from "@/lib/courseColor";
import { academicOn } from "@/lib/academicCalendar";
import { dateTime, dueClock, relativeDue } from "@/lib/format";
import { courseFull } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/types";
import { dateKey } from "@/components/calendar/time";
import { dueState, STATE_CHIP, STATE_LABEL, type DueState } from "@/components/calendar/dueState";

/**
 * The Overview layout of the month: a calm grid of dots (course color = to
 * do, red ring = missing, faint = done) with one short label per day, and a
 * side panel with full, untruncated titles: the selected day (today to
 * start; click any day), what's coming up, and what's missing. The
 * Detailed layout stays the default; this is the "where do I stand" view.
 */
export function OverviewLayout({
  cells,
  weeks,
  month,
  today,
  byDate,
  visible,
  isDone,
  labelOf,
}: {
  cells: Date[];
  weeks: number;
  month: number;
  today: Date;
  byDate: Map<string, CalendarItem[]>;
  visible: CalendarItem[];
  isDone: (i: CalendarItem) => boolean;
  labelOf: (i: CalendarItem) => string;
}) {
  const now = today.getTime();
  const [selected, setSelected] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const stateOf = (i: CalendarItem) => dueState(i, isDone(i), now);

  const dayList = byDate.get(dateKey(selected)) ?? [];
  const upcoming = visible
    .filter((i) => {
      const st = stateOf(i);
      return st === "soon" || st === "upcoming";
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 6);
  const missing = visible.filter((i) => stateOf(i) === "overdue").sort((a, b) => b.dueAt.localeCompare(a.dueAt));
  const dayTitle = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(selected);
  const shortDate = (iso: string) => new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));

  return (
    <div className="flex min-h-0 flex-1 gap-5">
      {/* The grid */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="grid grid-cols-7 gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-3">
              {d}
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7 gap-2" style={{ gridTemplateRows: `repeat(${weeks}, minmax(96px, 1fr))` }}>
          {cells.map((day) => {
            const inMonth = day.getMonth() === month;
            const isToday = dateKey(day) === dateKey(today);
            const isSel = dateKey(day) === dateKey(selected);
            const past = day.getTime() < startOfToday;
            const list = byDate.get(dateKey(day)) ?? [];
            const miss = list.filter((i) => stateOf(i) === "overdue");
            const open = list.filter((i) => {
              const st = stateOf(i);
              return st === "soon" || st === "upcoming";
            });
            const rest = list.filter((i) => {
              const st = stateOf(i);
              return st === "done" || st === "past";
            });
            const special = academicOn(day)[0];
            const label = miss.length ? `${miss.length} missing` : open.length ? `${open.length} due` : special ? special.label : "";
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={isSel}
                aria-label={`${new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(day)}${label ? `, ${label}` : ""}`}
                className={cn(
                  "flex min-w-0 flex-col justify-between rounded-xl bg-card px-3 pb-3 pt-2.5 text-left shadow-card ring-1 ring-inset transition-[box-shadow,background-color] duration-micro hover:ring-brand/40",
                  isSel ? "bg-brand/[0.07] ring-2 ring-brand" : "ring-border/60",
                  !inMonth && "opacity-45",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    data-numeric
                    className={cn(
                      "font-mono text-[15px] font-semibold tabular-nums",
                      isToday ? "text-brand-fg" : past ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {label && (
                    <span
                      className={cn(
                        "truncate text-[11.5px] font-semibold",
                        miss.length ? "text-critical-fg" : open.length ? "text-brand-fg" : "text-at-risk-fg",
                      )}
                    >
                      {label}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {open.map((i) => (
                    <span key={i.assignmentId} className="h-3 w-3 rounded-full" style={{ backgroundColor: courseHsla(i.courseId, 0.95) }} />
                  ))}
                  {miss.map((i) => (
                    <span key={i.assignmentId} className="h-3 w-3 rounded-full ring-2 ring-inset ring-critical" />
                  ))}
                  {rest.map((i) => (
                    <span key={i.assignmentId} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: courseHsla(i.courseId, 0.35) }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-5 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" /> to do (course color)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-inset ring-critical" /> missing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/25" /> done
          </span>
          <span className="ml-auto">Click a day to see it on the right.</span>
        </div>
      </div>

      {/* The panel */}
      <aside className="flex w-[380px] shrink-0 flex-col gap-3 overflow-y-auto">
        <PanelSection
          title={dayTitle}
          badge={dateKey(selected) === dateKey(today) ? "Today" : undefined}
          empty="Nothing due this day."
          rows={dayList.map((i) => ({ item: i, sub: `${labelOf(i)} · ${dueClock(i.dueAt)}`, state: stateOf(i) }))}
        />
        <PanelSection
          title="Coming up"
          empty="Nothing left to do. Nice."
          rows={upcoming.map((i) => ({ item: i, sub: `${labelOf(i)} · ${shortDate(i.dueAt)}`, state: stateOf(i) }))}
        />
        {missing.length > 0 && (
          <PanelSection
            title={`Missing · ${missing.length}`}
            tone="critical"
            empty=""
            rows={missing.map((i) => ({ item: i, sub: `${labelOf(i)} · ${shortDate(i.dueAt)}`, state: stateOf(i) }))}
          />
        )}
      </aside>
    </div>
  );
}

function PanelSection({
  title,
  badge,
  empty,
  rows,
  tone,
}: {
  title: string;
  badge?: string;
  empty: string;
  rows: { item: CalendarItem; sub: string; state: DueState }[];
  tone?: "critical";
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 shadow-card",
        tone === "critical" ? "border-critical/25 bg-critical/[0.04]" : "border-border/70 bg-card",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={cn("font-display text-[15px] font-semibold", tone === "critical" && "text-critical-fg")}>{title}</h2>
        {badge && <span className="text-xs font-semibold text-brand-fg">{badge}</span>}
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      {rows.map(({ item, sub, state }) => (
        <Link key={item.assignmentId} to={`/courses/${item.courseId}`} className="group flex items-center gap-3 rounded-lg">
          <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: courseHsla(item.courseId, 0.95) }} />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block text-sm font-medium leading-snug group-hover:underline",
                state === "done" || state === "past" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {item.name ?? "Untitled"}
            </span>
            <span className="block text-xs text-muted-foreground">{sub}</span>
          </span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATE_CHIP[state])}>
            {state === "done" ? (item.graded ? "Graded" : item.submitted ? "Submitted" : "Done") : STATE_LABEL[state]}
          </span>
        </Link>
      ))}
    </section>
  );
}

/** One due date inside a day cell: course color bar, course code, title.
 *  Hover for the whole story. */
export function DueChip({ item, label, state, roomy }: { item: CalendarItem; label: string; state: DueState; roomy?: boolean }) {
  const done = state === "done" || state === "past";
  const overdue = state === "overdue";
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <Link
          to={`/courses/${item.courseId}`}
          className={cn(
            "group relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-md py-1 pl-2.5 pr-1.5 transition-[background-color,box-shadow,opacity] duration-micro hover:shadow-card",
            roomy ? "text-[13px]" : "text-[12px]",
            done && "opacity-70 hover:opacity-100",
            overdue && "ring-1 ring-inset ring-critical/45",
          )}
          style={{ backgroundColor: overdue ? undefined : courseHsla(item.courseId, done ? 0.06 : 0.13) }}
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: overdue ? "rgb(var(--critical))" : courseHsla(item.courseId, done ? 0.4 : 0.95) }} />
          {overdue && <span aria-hidden className="absolute inset-0 bg-critical/[0.09]" />}
          {state === "done" ? (
            <CheckCircle2 className="relative h-3.5 w-3.5 shrink-0 text-on-track-fg" />
          ) : overdue ? (
            <AlertCircle className="relative h-3.5 w-3.5 shrink-0 text-critical-fg" />
          ) : null}
          <span className="relative shrink-0 font-mono text-[10.5px] font-semibold tracking-tight text-muted-foreground">{label}</span>
          <span className={cn("relative min-w-0 truncate font-medium", done ? "text-muted-foreground" : "text-foreground")}>{item.name ?? "Untitled"}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-sm rounded-xl border border-border/70 bg-popover p-0 text-popover-foreground shadow-elevated">
        <div className="flex">
          <span className="w-1 shrink-0" style={{ backgroundColor: courseHsla(item.courseId, 0.95) }} />
          <div className="flex min-w-0 flex-col gap-1.5 px-3.5 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="truncate">{courseFull(item.courseCode) || label}</span>
            </div>
            <div className="text-sm font-semibold leading-snug">{item.name ?? "Untitled"}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {dateTime(item.dueAt)}
              </span>
              <span data-numeric className="font-mono tabular-nums">{relativeDue(item.dueAt)}</span>
              {item.pointsPossible != null && <span data-numeric className="font-mono tabular-nums">{item.pointsPossible} pts</span>}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATE_CHIP[state])}>
                {state === "done" ? (item.graded ? "Graded" : item.submitted ? "Submitted" : "Marked done") : STATE_LABEL[state]}
              </span>
              {item.source !== "api" && <span className="text-[11px] text-muted-foreground">from {item.source}</span>}
              <span className="ml-auto text-[11px] text-muted-foreground">Click to open the course</span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
