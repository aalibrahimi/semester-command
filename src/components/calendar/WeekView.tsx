/**
 * Calendar week view: the hour grid with class meetings, study blocks and
 * due items, drag to create or move blocks.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { detectClassSlots, plannerBlocks } from "@/lib/ipc";
import { useCourses } from "@/hooks/useCourses";
import { useNicknames } from "@/lib/localPrefs";
import { courseHsla } from "@/lib/courseColor";
import { parseCourseLabel } from "@/lib/courseLabel";
import { academicOn, noClassSpan } from "@/lib/academicCalendar";
import {
  autoDetectAttempted,
  markAutoDetectAttempted,
  newCandidates,
} from "@/lib/classDetect";
import { courseShort } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CalendarItem, ClassSlotCandidate, PlannerBlock } from "@/types";
import { mondayOf, type Category, HOUR_H, CATEGORY, categoryOf, localDateKey, addDays, minLabel, hourLabel, withLanes, catStyle } from "@/components/calendar/time";
import { TodayAgendaRail } from "@/components/calendar/TodayAgendaRail";
import { BlockDialog } from "@/components/calendar/BlockDialog";
import { DetectDialog } from "@/components/calendar/DetectDialog";

/**
 * The weekly planner: class meeting slots + personal blocks on a time grid,
 * with the week's due dates as a strip atop each day. Click an empty slot to
 * add a block (a two-hour gap becomes a gym or homework session in two
 * clicks); click a block to edit or delete it.
 *
 * Class meeting times are user-entered: Canvas has no API for them — SJSU
 * keeps schedules in MySJSU — so the grid asks once and remembers weekly.
 */
export function WeekView({ items }: { items: CalendarItem[] }) {
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
      return CATEGORY[categoryOf(b)].dot;
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
                .filter((b) => !hiddenCats.has(categoryOf(b)))
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
                        const cat = categoryOf(b);
                        return {
                          ...frame,
                          ...catStyle(cat),
                          borderLeftColor: CATEGORY[cat].dot,
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
        blocks={blocks.filter((b) => !hiddenCats.has(categoryOf(b)))}
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
