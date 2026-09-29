/**
 * The rail beside the week view that lists what is on today.
 */
import { Link } from "react-router-dom";
import { noClassSpan } from "@/lib/academicCalendar";
import { courseShort } from "@/lib/courseLabel";
import { cn } from "@/lib/utils";
import type { CalendarItem, PlannerBlock } from "@/types";
import { localDateKey, minLabel, CATEGORY } from "@/components/calendar/time";

/**
 * Today's agenda — the week distilled to "what does TODAY hold", beside the
 * grid on wide windows. Deadlines and blocks interleaved in time order,
 * each with its category (or course) dot.
 */
export function TodayAgendaRail({
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
