/**
 * Date and time helpers shared by the calendar views: day keys, week math,
 * minute labels, block categories and the lane layout for overlapping
 * blocks.
 */
import type { PlannerBlock } from "@/types";

/** Local-date key ("2026-8-21") — due dates render on the user's wall-clock
 *  day, which is the whole point of a calendar. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/* ── Week planner ────────────────────────────────────────────────────────── */

export const HOUR_H = 48; // px per hour

/** The calendar's color language: COLOR MEANS COURSE for coursework — a
 *  class and a study session for the same course wear the same hue (class:
 *  strong fill, solid edge; study: faint fill, dashed edge). Everything
 *  else gets one hue per life-category: fitness green, work copper,
 *  personal a quiet slate; red is deadlines only, purple only a study
 *  session with no course. Hues deliberately dodge the course-color deck
 *  (217/330/172/282/48/200/255) so nothing masquerades as a course. */
export const CATEGORY = {
  class: { label: "Classes", dot: "hsl(217 70% 58%)" },
  study: { label: "Study", dot: "hsl(258 60% 62%)" },
  fitness: { label: "Fitness", dot: "hsl(145 50% 42%)" },
  work: { label: "Work", dot: "hsl(25 60% 48%)" },
  personal: { label: "Personal", dot: "hsl(222 12% 55%)" },
  deadline: { label: "Deadlines", dot: "hsl(350 70% 58%)" },
} as const;

export type Category = keyof typeof CATEGORY;

/** Which category a block filters and colors under. */
export function categoryOf(b: PlannerBlock): Category {
  if (b.kind === "class") return "class";
  if (b.kind === "study") return "study";
  return b.category ?? "personal";
}

/** Fill/border for the non-course categories. */
export function catStyle(cat: Category): React.CSSProperties {
  const dot = CATEGORY[cat].dot;
  return {
    backgroundColor: dot.replace(")", " / 0.14)"),
    borderColor: dot.replace(")", " / 0.45)"),
  };
}

/** Local YYYY-MM-DD, no UTC surprises. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday of the week containing `d` (planner weeks start Monday). */
export function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export function minLabel(min: number): string {
  const h = Math.floor(min / 60);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${h >= 12 ? "p" : "a"}`;
}

/** "8 AM" / "12 PM" — the time gutter's voice (reference design). */
export function hourLabel(hour: number): string {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${hour >= 12 ? "PM" : "AM"}`;
}

export function minToInput(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function inputToMin(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Greedy lane assignment so overlapping blocks share the column width. */
export function withLanes<T extends { startMin: number; endMin: number }>(
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

export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
