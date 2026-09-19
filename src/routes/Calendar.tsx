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
import { useCallback, useEffect, useMemo, useState } from "react";
import { save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Plus, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  calendarItems,
  deletePlannerBlock,
  detectClassSlots,
  exportSemesterIcs,
  plannerBlocks,
  savePlannerBlock,
} from "@/lib/ipc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useCourses } from "@/hooks/useCourses";
import { useNicknames } from "@/lib/localPrefs";
import { courseHsla, tickStyle } from "@/lib/courseColor";
import { parseCourseLabel } from "@/lib/courseLabel";
import { academicOn, noClassSpan, upcomingAcademic } from "@/lib/academicCalendar";
import {
  autoDetectAttempted,
  markAutoDetectAttempted,
  newCandidates,
} from "@/lib/classDetect";
import { relativeDue } from "@/lib/format";
import { courseShort } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CalendarItem, ClassSlotCandidate, PlannerBlock } from "@/types";

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
      ) : view === "week" ? (
        /* The week planner works with zero due dates — class times and
           study blocks are its own data, not Canvas's. */
        <WeekView items={items} />
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
                {academicOn(day).slice(0, 1).map((s) => (
                  <div
                    key={s.label}
                    className={cn(
                      "mt-0.5 truncate rounded px-1 py-0.5 text-2xs leading-tight",
                      s.kind === "holiday" || s.kind === "break"
                        ? "bg-at-risk/10 text-at-risk-fg"
                        : "bg-fill-ghost text-muted-foreground",
                    )}
                    title={s.label}
                  >
                    {s.label}
                  </div>
                ))}
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

/* ── Week planner ────────────────────────────────────────────────────────── */

const HOUR_H = 48; // px per hour

/** The calendar's color language: COLOR MEANS COURSE. A class and a study
 *  session for the same course wear the same hue — class as a strong fill
 *  with a solid edge, study as a faint fill with a dashed edge. Green is
 *  reserved for genuinely personal blocks (gym, work), red for deadlines,
 *  purple only for study sessions linked to no course. The legend's dots
 *  are category emblems (classes are really per-course colors). */
const CATEGORY = {
  class: { label: "Classes", dot: "hsl(217 70% 58%)" },
  study: { label: "Study", dot: "hsl(258 60% 62%)" },
  event: { label: "Personal", dot: "hsl(150 45% 45%)" },
  deadline: { label: "Deadlines", dot: "hsl(350 70% 58%)" },
} as const;
type Category = keyof typeof CATEGORY;

/** Fill/border for the non-class block kinds. */
function kindStyle(kind: "study" | "event"): React.CSSProperties {
  const dot = CATEGORY[kind].dot;
  return {
    backgroundColor: dot.replace(")", " / 0.14)"),
    borderColor: dot.replace(")", " / 0.45)"),
  };
}

/** Local YYYY-MM-DD, no UTC surprises. */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday of the week containing `d` (planner weeks start Monday). */
function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

function minLabel(min: number): string {
  const h = Math.floor(min / 60);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${h >= 12 ? "p" : "a"}`;
}

/** "8 AM" / "12 PM" — the time gutter's voice (reference design). */
function hourLabel(hour: number): string {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${hour >= 12 ? "PM" : "AM"}`;
}

function minToInput(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function inputToMin(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Greedy lane assignment so overlapping blocks share the column width. */
function withLanes<T extends { startMin: number; endMin: number }>(
  blocks: T[],
): (T & { lane: number; lanes: number })[] {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);
  const laneEnds: number[] = [];
  const placed = sorted.map((b) => {
    let lane = laneEnds.findIndex((end) => end <= b.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = b.endMin;
    return { ...b, lane, lanes: 1 };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((p) => ({ ...p, lanes }));
}

/**
 * The weekly planner: class meeting slots + personal blocks on a time grid,
 * with the week's due dates as a strip atop each day. Click an empty slot to
 * add a block (a two-hour gap becomes a gym or homework session in two
 * clicks); click a block to edit or delete it.
 *
 * Class meeting times are user-entered: Canvas has no API for them — SJSU
 * keeps schedules in MySJSU — so the grid asks once and remembers weekly.
 */
function WeekView({ items }: { items: CalendarItem[] }) {
  const [anchor, setAnchor] = useState(() => mondayOf(new Date()));
  const [blocks, setBlocks] = useState<PlannerBlock[]>([]);
  const [blocksLoaded, setBlocksLoaded] = useState(false);
  const [dialog, setDialog] = useState<
    | { mode: "create"; weekday: number; date: string; startMin: number }
    | { mode: "edit"; block: PlannerBlock }
    | null
  >(null);
  const [now, setNow] = useState(() => new Date());
  const [detect, setDetect] = useState<
    | { phase: "loading" }
    | { phase: "review"; candidates: ClassSlotCandidate[]; canvasChecked: boolean }
    | null
  >(null);
  // Legend chips double as filters — hidden categories vanish from the grid
  // and the agenda rail. Session-scoped on purpose: a filter that survives a
  // restart is a filter you forgot about.
  const [hiddenCats, setHiddenCats] = useState<Set<Category>>(new Set());
  const toggleCat = (c: Category) =>
    setHiddenCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  const { courses } = useCourses();
  const nicknames = useNicknames();

  const refresh = useCallback(() => {
    plannerBlocks()
      .then((b) => {
        setBlocks(b);
        setBlocksLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // The now-line creeps; a minute of drift is invisible.
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [anchor],
  );

  // The grid fits the life on it: 8am–9pm baseline, stretched (never
  // shrunk) to cover the earliest and latest block anywhere in the week's
  // roster. A 7am–11pm grid over a 9-to-8 schedule is mostly empty rows.
  const [START_HOUR, END_HOUR, GRID_H] = useMemo(() => {
    let earliest = 8 * 60;
    let latest = 21 * 60;
    for (const b of blocks) {
      earliest = Math.min(earliest, b.startMin);
      latest = Math.max(latest, b.endMin);
    }
    const s = Math.max(6, Math.floor(earliest / 60));
    const e = Math.min(24, Math.ceil(latest / 60));
    return [s, e, (e - s) * HOUR_H];
  }, [blocks]);

  const runDetect = useCallback(
    (auto: boolean) => {
      if (!auto) setDetect({ phase: "loading" });
      detectClassSlots()
        .then((r) => {
          const fresh = newCandidates(r.candidates, blocks);
          if (auto && fresh.length === 0) return;
          setDetect({ phase: "review", candidates: fresh, canvasChecked: r.canvasChecked });
        })
        .catch(() => {
          if (auto) return;
          setDetect(null);
          toast.error("Detection failed — try again after a sync.");
        });
    },
    [blocks],
  );

  // "Automatically populate": an empty grid runs detection unprompted and
  // opens the review dialog when meeting times turn up.
  useEffect(() => {
    if (!blocksLoaded || autoDetectAttempted()) return;
    if (blocks.some((b) => b.kind === "class")) return;
    markAutoDetectAttempted();
    // oxlint-disable-next-line set-state-in-effect -- state changes only after the backend round-trip
    runDetect(true);
  }, [blocksLoaded, blocks, runDetect]);

  // Which course does a study block belong to? Prefer the stored link;
  // fall back to reading the title ("Study — LING 112 · syntax trees" →
  // LING-112), so blocks created before study sessions could carry a
  // course still get that course's color. Display-level inference only.
  const courseOfStudy = useCallback(
    (b: PlannerBlock): string | null => {
      if (b.kind !== "study") return null;
      if (b.courseId) return b.courseId;
      const norm = (s: string) =>
        s.toUpperCase().replace(/[—–-]/g, " ").replace(/\s+/g, " ");
      const title = norm(b.title);
      for (const c of courses) {
        const code = parseCourseLabel(c.courseCode ?? c.name).code;
        if (code && title.includes(norm(code))) return c.id;
      }
      return null;
    },
    [courses],
  );

  /** One block's identity color — the dot in the rail, the left edge on
   *  the grid. Course hue when the block has one, category color when not. */
  const dotFor = useCallback(
    (b: PlannerBlock): string => {
      if (b.kind === "class" && b.courseId) return courseHsla(b.courseId, 0.9);
      const study = courseOfStudy(b);
      if (study) return courseHsla(study, 0.9);
      return CATEGORY[b.kind].dot;
    },
    [courseOfStudy],
  );

  const labelFor = useCallback(
    (b: PlannerBlock) => {
      if (b.kind === "class" && b.courseId) {
        return nicknames[b.courseId] ?? b.title;
      }
      if (b.kind === "study") {
        // Purple already says "study" — a "Study — " prefix just eats the
        // half of the block where the actual subject would fit.
        const trimmed = b.title.replace(/^study\s*[—–-]\s*/i, "").trim();
        return trimmed || b.title;
      }
      return b.title;
    },
    [nicknames],
  );

  const dueByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const i of items) {
      if (i.submitted || i.graded) continue;
      const key = localDateKey(new Date(i.dueAt));
      map.set(key, [...(map.get(key) ?? []), i]);
    }
    return map;
  }, [items]);

  const openCreate = (weekday: number, date: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const min = START_HOUR * 60 + ((e.clientY - rect.top) / HOUR_H) * 60;
    const snapped = Math.max(
      START_HOUR * 60,
      Math.min(END_HOUR * 60 - 30, Math.round(min / 30) * 30),
    );
    setDialog({ mode: "create", weekday, date, startMin: snapped });
  };

  const todayKey = localDateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="mx-8 mb-10">
      {/* ── Toolbar row 1: where in time we are ─────────────────────────── */}
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex items-center overflow-hidden rounded-lg border border-border/60 bg-card shadow-card">
          <button
            type="button"
            onClick={() => setAnchor((a) => addDays(a, -7))}
            className="px-2 py-1.5 text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
            title="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            data-numeric
            className="border-x border-border/60 px-3 py-1.5 font-mono text-xs font-medium tabular-nums"
          >
            {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {days[6].toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => setAnchor((a) => addDays(a, 7))}
            className="px-2 py-1.5 text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
            title="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAnchor(mondayOf(new Date()))}>
          Today
        </Button>
      </div>

      {/* ── Toolbar row 2: what's shown + the actions ───────────────────── */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {(Object.keys(CATEGORY) as Category[]).map((c) => {
          const off = hiddenCats.has(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCat(c)}
              title={off ? `Show ${CATEGORY[c].label.toLowerCase()}` : `Hide ${CATEGORY[c].label.toLowerCase()}`}
              className={cn(
                "chip gap-1.5 border border-border/60 bg-card text-2xs font-medium transition-opacity duration-micro",
                off && "opacity-40",
              )}
            >
              {/* Study's emblem is a ring: study blocks take their course's
                  hue (faint fill, dashed edge), so a solid purple dot would
                  promise a color the grid rarely shows. */}
              <span
                aria-hidden
                className={cn("h-2 w-2 rounded-full", c === "study" && "border-2 bg-transparent")}
                style={
                  c === "study"
                    ? { borderColor: CATEGORY[c].dot }
                    : { backgroundColor: CATEGORY[c].dot }
                }
              />
              {CATEGORY[c].label}
            </button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => runDetect(false)}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Detect class times
        </Button>
        <Button
          size="sm"
          onClick={() =>
            setDialog({
              mode: "create",
              weekday: (new Date().getDay() + 6) % 7,
              date: localDateKey(new Date()),
              startMin: Math.min(END_HOUR * 60 - 60, Math.max(START_HOUR * 60, nowMin + 30)),
            })
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add block
        </Button>
      </div>

      {blocks.filter((b) => b.kind === "class").length === 0 && (
        <div className="mb-2 rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          No class meeting times yet — hit{" "}
          <span className="font-medium text-foreground/80">Detect class times</span> to pull them
          from Canvas events and imported syllabi, or click any empty slot to add one by hand.
        </div>
      )}

      <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-card">
        <div className="grid min-w-[880px] grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          {/* Header row: day names + due strips. */}
          <div className="border-b border-border/60" />
          {days.map((d) => {
            const key = localDateKey(d);
            const due = hiddenCats.has("deadline") ? [] : (dueByDay.get(key) ?? []);
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={cn(
                  "border-b border-l border-border/40 px-2 py-2",
                  isToday && "bg-brand/[0.06]",
                )}
              >
                <div className="flex flex-col leading-tight">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      isToday ? "text-brand-fg" : "text-muted-foreground",
                    )}
                  >
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span
                    data-numeric
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      isToday && "text-brand-fg",
                    )}
                  >
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                {academicOn(d).map((s) => (
                  <div
                    key={s.label}
                    className={cn(
                      "mt-0.5 truncate rounded px-1 py-px text-[10px] leading-tight",
                      s.kind === "holiday" || s.kind === "break"
                        ? "bg-at-risk/10 text-at-risk-fg"
                        : "bg-fill-ghost text-muted-foreground",
                    )}
                    title={s.noClasses ? `${s.label} — no class meetings` : s.label}
                  >
                    {s.label}
                    {s.noClasses && s.kind !== "break" ? " · no class" : ""}
                  </div>
                ))}
                {/* Due strip: the day's deadlines as banners above the time
                    grid (reference design) — deadlines are facts about the
                    day, not one-hour blocks at 11:59pm. */}
                {due.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {due.slice(0, 3).map((item) => (
                      <Link
                        key={item.assignmentId}
                        to={`/courses/${item.courseId}`}
                        className="truncate rounded-md border-l-2 border-critical bg-critical/10 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-critical-fg hover:bg-critical/20"
                        title={`${item.name ?? "Untitled"} · due ${minLabel(new Date(item.dueAt).getHours() * 60 + new Date(item.dueAt).getMinutes())}`}
                      >
                        {/* Course first: a truncated "Quiz #1 (Chapter 8 an…"
                            says less than "HIST-15 · Quiz #1". */}
                        <span className="font-semibold">{courseShort(item.courseCode)}</span>
                        {" · "}
                        {item.name ?? "Untitled"}
                      </Link>
                    ))}
                    {due.length > 3 && (
                      <span className="px-1 text-[10px] text-muted-foreground">
                        +{due.length - 3} more due
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Time gutter */}
          <div className="relative" style={{ height: GRID_H }}>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <span
                key={i}
                data-numeric
                className="absolute right-2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground/60"
                style={{ top: i * HOUR_H }}
              >
                {i === 0 ? "" : hourLabel(START_HOUR + i)}
              </span>
            ))}
            {/* The current time, named in the gutter beside the now-line. */}
            {days.some((d) => localDateKey(d) === todayKey) &&
              nowMin >= START_HOUR * 60 &&
              nowMin <= END_HOUR * 60 && (
                <span
                  data-numeric
                  className="absolute right-2 z-20 -translate-y-1/2 rounded bg-brand px-1 py-px font-mono text-[9px] font-semibold tabular-nums text-white"
                  style={{ top: ((nowMin - START_HOUR * 60) / 60) * HOUR_H }}
                >
                  {minLabel(nowMin)}
                </span>
              )}
          </div>

          {/* Day columns */}
          {days.map((d, dayIdx) => {
            const key = localDateKey(d);
            const isToday = key === todayKey;
            // Classes don't meet on holidays, finals days, or breaks — hide
            // the weekly class blocks there so the grid tells the truth.
            const noClass = noClassSpan(d);
            const dayBlocks = withLanes(
              blocks
                .filter((b) => !hiddenCats.has(b.kind))
                .filter((b) =>
                  b.date
                    ? b.date === key
                    : b.weekday === dayIdx && !(noClass && b.kind === "class"),
                ),
            );
            return (
              <div
                key={key}
                className={cn(
                  "relative cursor-crosshair border-l border-border/40",
                  isToday && "bg-brand/[0.04]",
                  // Weekends recede a step — the eye should land on the
                  // teaching week first.
                  !isToday && dayIdx >= 5 && "bg-fill-ghost/25",
                  noClass && "bg-fill-ghost/40",
                )}
                style={{ height: GRID_H }}
                onClick={(e) => openCreate(dayIdx, key, e)}
                title="Click to add a block here"
              >
                {/* Hour lines */}
                {Array.from({ length: END_HOUR - START_HOUR - 1 }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute left-0 right-0 border-t border-border/30"
                    style={{ top: (i + 1) * HOUR_H }}
                  />
                ))}

                {/* Now line — brand blue with a leading dot (reference
                    design); red stays reserved for deadlines. */}
                {isToday && nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60 && (
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 z-20 border-t-2 border-brand"
                    style={{ top: ((nowMin - START_HOUR * 60) / 60) * HOUR_H }}
                  >
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-brand" />
                  </span>
                )}

                {/* Blocks */}
                {dayBlocks.map((b) => {
                  const top = Math.max(0, ((b.startMin - START_HOUR * 60) / 60) * HOUR_H);
                  const height = Math.max(
                    18,
                    ((Math.min(b.endMin, END_HOUR * 60) -
                      Math.max(b.startMin, START_HOUR * 60)) /
                      60) *
                      HOUR_H,
                  );
                  const width = 100 / b.lanes;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialog({ mode: "edit", block: b });
                      }}
                      className="absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left leading-tight transition-opacity duration-micro hover:opacity-80"
                      style={(() => {
                        // Inset from the column edges and the neighbor below
                        // — breathing room is most of what "clean" means on
                        // a dense grid.
                        const frame = {
                          top: top + 1,
                          height: height - 3,
                          left: `calc(${b.lane * width}% + 2px)`,
                          width: `calc(${width}% - 6px)`,
                        };
                        // Color = course; intensity + edge style = kind.
                        // Class: strong fill, solid edge. Study: faint fill,
                        // dashed edge, SAME hue as its course's class.
                        const study = courseOfStudy(b);
                        if (b.kind === "class" && b.courseId) {
                          return {
                            ...frame,
                            backgroundColor: courseHsla(b.courseId, 0.16),
                            borderLeftColor: courseHsla(b.courseId, 0.9),
                          };
                        }
                        if (study) {
                          return {
                            ...frame,
                            backgroundColor: courseHsla(study, 0.08),
                            borderLeftColor: courseHsla(study, 0.9),
                            borderLeftStyle: "dashed" as const,
                          };
                        }
                        return {
                          ...frame,
                          ...kindStyle(b.kind === "study" ? "study" : "event"),
                          borderLeftColor: CATEGORY[b.kind].dot,
                          ...(b.kind === "study" ? { borderLeftStyle: "dashed" as const } : {}),
                        };
                      })()}
                      title={`${labelFor(b)} · ${minLabel(b.startMin)}–${minLabel(b.endMin)}${b.location ? ` · ${b.location}` : ""}`}
                    >
                      <span className="block truncate text-[11px] font-semibold">
                        {labelFor(b)}
                      </span>
                      {height >= 34 && (
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {minLabel(b.startMin)}–{minLabel(b.endMin)}
                        </span>
                      )}
                      {height >= 46 && b.location && (
                        <span className="block truncate text-[10px] text-muted-foreground/80">
                          {b.location}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Today's agenda rail (reference design) ──────────────────────── */}
      <TodayAgendaRail
        now={now}
        blocks={blocks.filter((b) => !hiddenCats.has(b.kind))}
        due={hiddenCats.has("deadline") ? [] : (dueByDay.get(todayKey) ?? [])}
        labelFor={labelFor}
        dotFor={dotFor}
      />
      </div>

      <p className="mt-2 text-2xs text-muted-foreground">
        Click any empty slot to add a class meeting, a study session, or a personal block — a
        two-hour gap is a gym or homework session waiting to be claimed. Class times repeat
        weekly; study and personal blocks can be one-off or weekly.
      </p>

      {dialog && (
        <BlockDialog
          dialog={dialog}
          courses={courses.filter((c) => !c.hidden && c.gradeable)}
          nicknames={nicknames}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}

      {detect && (
        <DetectDialog
          detect={detect}
          labelOf={(courseId, code) => nicknames[courseId] ?? courseShort(code ?? "")}
          onClose={() => setDetect(null)}
          onSaved={() => {
            setDetect(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Today's agenda — the week distilled to "what does TODAY hold", beside the
 * grid on wide windows. Deadlines and blocks interleaved in time order,
 * each with its category (or course) dot.
 */
function TodayAgendaRail({
  now,
  blocks,
  due,
  labelFor,
  dotFor,
}: {
  now: Date;
  blocks: PlannerBlock[];
  due: CalendarItem[];
  labelFor: (b: PlannerBlock) => string;
  dotFor: (b: PlannerBlock) => string;
}) {
  const todayKey = localDateKey(now);
  const todayWeekIdx = (now.getDay() + 6) % 7;
  const noClass = noClassSpan(now);

  type AgendaEntry = {
    key: string;
    atMin: number;
    dot: string;
    title: string;
    detail: string;
    courseId: string | null;
    past: boolean;
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const entries: AgendaEntry[] = [
    ...blocks
      .filter((b) =>
        b.date ? b.date === todayKey : b.weekday === todayWeekIdx && !(noClass && b.kind === "class"),
      )
      .map((b) => ({
        key: `b${b.id}`,
        atMin: b.startMin,
        dot: dotFor(b),
        title: labelFor(b),
        detail: `${minLabel(b.startMin)}–${minLabel(b.endMin)}${b.location ? ` · ${b.location}` : ""}`,
        courseId: b.kind === "class" ? b.courseId : null,
        past: b.endMin < nowMin,
      })),
    ...due.map((i) => {
      const d = new Date(i.dueAt);
      const atMin = d.getHours() * 60 + d.getMinutes();
      return {
        key: `d${i.assignmentId}`,
        atMin,
        dot: CATEGORY.deadline.dot,
        title: i.name ?? "Untitled",
        detail: `due ${minLabel(atMin)} · ${courseShort(i.courseCode)}`,
        courseId: i.courseId,
        past: atMin < nowMin,
      };
    }),
  ].sort((a, b) => a.atMin - b.atMin);

  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-border/60 bg-card p-4 shadow-card xl:block">
      <h3 className="font-display text-sm font-semibold tracking-tight">Today's agenda</h3>
      <p className="text-2xs text-muted-foreground">
        {now.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      {noClass && (
        <p className="mt-2 rounded-lg bg-at-risk/10 px-2 py-1 text-2xs text-at-risk-fg">
          {noClass.label} — no class meetings today.
        </p>
      )}
      {entries.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nothing scheduled and nothing due today.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {entries.map((e) => {
            const body = (
              <span className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: e.dot }}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-xs font-medium",
                      e.past && "text-muted-foreground line-through decoration-border",
                    )}
                  >
                    {e.title}
                  </span>
                  <span
                    data-numeric
                    className="block truncate font-mono text-2xs tabular-nums text-muted-foreground"
                  >
                    {e.detail}
                  </span>
                </span>
              </span>
            );
            return e.courseId ? (
              <Link
                key={e.key}
                to={`/courses/${e.courseId}`}
                className="rounded-lg px-1 py-0.5 transition-colors duration-micro hover:bg-fill-ghost"
              >
                {body}
              </Link>
            ) : (
              <span key={e.key} className="px-1 py-0.5">
                {body}
              </span>
            );
          })}
        </div>
      )}
    </aside>
  );
}

/** Review detected class slots and save the checked ones as weekly blocks. */
function DetectDialog({
  detect,
  labelOf,
  onClose,
  onSaved,
}: {
  detect:
    | { phase: "loading" }
    | { phase: "review"; candidates: ClassSlotCandidate[]; canvasChecked: boolean };
  labelOf: (courseId: string, code: string | null) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(() =>
    detect.phase === "review" ? new Set(detect.candidates.map((_, i) => i)) : new Set(),
  );
  const [busy, setBusy] = useState(false);

  const saveAll = () => {
    if (detect.phase !== "review") return;
    const picked = detect.candidates.filter((_, i) => checked.has(i));
    setBusy(true);
    Promise.all(
      picked.map((c) =>
        savePlannerBlock({
          kind: "class",
          courseId: c.courseId,
          title: labelOf(c.courseId, c.courseCode),
          location: c.location,
          weekday: c.weekday,
          date: null,
          startMin: c.startMin,
          endMin: c.endMin,
          note: null,
        }),
      ),
    )
      .then(() => {
        toast.success(
          "Added " + picked.length + " class slot" + (picked.length === 1 ? "" : "s") + " to your week.",
        );
        onSaved();
      })
      .catch(() => toast.error("Some slots failed to save."))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detected class times</DialogTitle>
          <DialogDescription>
            From Canvas calendar events and imported syllabi. Uncheck anything that looks wrong —
            nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        {detect.phase === "loading" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Checking Canvas events and syllabi…
          </p>
        ) : detect.candidates.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">
            <p>
              Nothing new detected
              {detect.canvasChecked
                ? ""
                : " — Canvas session expired, so only imported syllabi were checked"}
              . SJSU rarely publishes meeting times to Canvas, so two ways forward:
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs">
              <li>Import your syllabus PDFs (Syllabi tab) — most state the meeting pattern.</li>
              <li>Or click any empty slot on the grid and enter times from MySJSU once.</li>
            </ul>
          </div>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {!detect.canvasChecked && (
              <p className="mb-1 text-2xs text-muted-foreground">
                Canvas session expired — these came from imported syllabi only.
              </p>
            )}
            {detect.candidates.map((c, i) => (
              <label
                key={c.courseId + "-" + c.weekday + "-" + c.startMin}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 hover:bg-white/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={(e) => {
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      return next;
                    });
                  }}
                />
                <span
                  className="h-4 w-1 shrink-0 rounded-full"
                  style={tickStyle(c.courseId)}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {labelOf(c.courseId, c.courseCode)}
                </span>
                <span className="shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                  {WEEKDAY_NAMES[c.weekday]} {minLabel(c.startMin)}–{minLabel(c.endMin)}
                </span>
                {c.location && (
                  <span className="max-w-24 shrink-0 truncate text-2xs text-muted-foreground">
                    {c.location}
                  </span>
                )}
                <span className="shrink-0 rounded border border-border/70 px-1 py-px text-2xs text-muted-foreground">
                  {c.source}
                </span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {detect.phase === "review" && detect.candidates.length > 0 && (
            <Button size="sm" onClick={saveAll} disabled={busy || checked.size === 0}>
              {busy
                ? "Adding…"
                : "Add " + checked.size + " slot" + (checked.size === 1 ? "" : "s")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Create/edit one planner block: class meeting (weekly, course-linked) or
 *  personal event (weekly or one-off). */
function BlockDialog({
  dialog,
  courses,
  nicknames,
  onClose,
  onSaved,
}: {
  dialog:
    | { mode: "create"; weekday: number; date: string; startMin: number }
    | { mode: "edit"; block: PlannerBlock };
  courses: { id: string; courseCode: string | null; name: string | null }[];
  nicknames: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const NO_COURSE = "__none";
  const editing = dialog.mode === "edit" ? dialog.block : null;
  const [kind, setKind] = useState<"class" | "study" | "event">(editing?.kind ?? "event");
  const [courseId, setCourseId] = useState<string>(editing?.courseId ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [repeat, setRepeat] = useState<"weekly" | "once">(
    editing ? (editing.weekday !== null ? "weekly" : "once") : "once",
  );
  const [weekday, setWeekday] = useState<number>(
    editing?.weekday ?? (dialog.mode === "create" ? dialog.weekday : 0),
  );
  const [date, setDate] = useState<string>(
    editing?.date ?? (dialog.mode === "create" ? dialog.date : ""),
  );
  const [start, setStart] = useState(
    minToInput(editing?.startMin ?? (dialog.mode === "create" ? dialog.startMin : 9 * 60)),
  );
  const [end, setEnd] = useState(
    minToInput(editing?.endMin ?? (dialog.mode === "create" ? dialog.startMin + 60 : 10 * 60)),
  );
  const [busy, setBusy] = useState(false);

  const courseLabel = (c: { id: string; courseCode: string | null; name: string | null }) =>
    nicknames[c.id] ?? courseShort(c.courseCode ?? c.name);

  const save = () => {
    const startMin = inputToMin(start);
    const endMin = inputToMin(end);
    if (startMin === null || endMin === null) {
      toast.error("Times look wrong — use HH:MM.");
      return;
    }
    if (kind === "class" && courseId === "") {
      toast.error("Pick which course this class meeting belongs to.");
      return;
    }
    const picked = courses.find((c) => c.id === courseId);
    const resolvedTitle =
      kind === "class" && title.trim() === "" && picked
        ? `${courseLabel(picked)} class`
        : title;
    setBusy(true);
    savePlannerBlock({
      id: editing?.id,
      kind,
      // Study keeps its (optional) course link — that's what colors it.
      courseId: kind === "event" ? null : courseId || null,
      title: resolvedTitle,
      location: location.trim() === "" ? null : location.trim(),
      weekday: repeat === "weekly" || kind === "class" ? weekday : null,
      date: repeat === "once" && kind !== "class" ? date : null,
      startMin,
      endMin,
    })
      .then(onSaved)
      .catch((e: unknown) =>
        toast.error(String((e as { message?: string })?.message ?? "Could not save the block.")),
      )
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (!editing) return;
    setBusy(true);
    deletePlannerBlock(editing.id)
      .then(onSaved)
      .catch(() => toast.error("Could not delete the block."))
      .finally(() => setBusy(false));
  };

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit block" : "Add to your week"}</DialogTitle>
          <DialogDescription>
            Class meetings repeat weekly and wear their course color. Study sessions go purple,
            personal blocks green — gym, work, anything.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Select
              value={kind}
              onValueChange={(v) => setKind(v === "class" ? "class" : v === "study" ? "study" : "event")}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Personal</SelectItem>
                <SelectItem value="study">Study session</SelectItem>
                <SelectItem value="class">Class time</SelectItem>
              </SelectContent>
            </Select>
            {kind === "class" ? (
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {courseLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "study" ? "Study — CS 146 · review session…" : "Gym · work · …"}
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </div>

          {kind === "class" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Label (optional — defaults to the course name)"
              className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}

          {/* A study session linked to its course wears that course's color
              on the grid — same hue as the class, fainter. */}
          {kind === "study" && (
            <Select
              value={courseId === "" ? NO_COURSE : courseId}
              onValueChange={(v) => setCourseId(v === NO_COURSE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Course (for the color)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COURSE}>No course — general study</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {courseLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2">
            {kind !== "class" && (
              <Select
                value={repeat}
                onValueChange={(v) => setRepeat(v === "weekly" ? "weekly" : "once")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Just once</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                </SelectContent>
              </Select>
            )}
            {kind === "class" || repeat === "weekly" ? (
              <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((w, i) => (
                    <SelectItem key={w} value={String(i)}>
                      {w}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              step={900}
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              step={900}
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional) — MacQuarrie Hall 225, SRAC…"
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <DialogFooter className="gap-2">
          {editing && (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={busy}
              className="mr-auto text-critical-fg"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
