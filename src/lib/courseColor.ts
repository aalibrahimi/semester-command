/**
 * courseColor — a stable, GUARANTEED-distinct identity color per course.
 *
 * Called by: Triage (queue rows, group headers), anywhere telling courses
 * apart at a glance matters.
 * Calls: nothing.
 *
 * Identity is a different channel from risk: the signal palette
 * (green/amber/red) answers "how is it going", these answer "which class".
 * The palette below keeps its distance from the signal hues and — the
 * lesson of v1 — from *itself*: hashing ids into similar blues made three
 * courses indistinguishable. Colors are now dealt from a spread-out deck to
 * courses in sorted-id order, so two courses can only share a color once
 * the deck runs out (7 distinct entries; a semester has 4–6 courses).
 *
 * Stability: sorted course-id order is deterministic, so a course keeps its
 * color across renders and sessions as long as the enrolled set is stable —
 * which, within a semester, it is.
 */
import type { CSSProperties } from "react";

/** The deck. Hue/saturation/lightness chosen for mutual distance and for
 *  distance from on-track (~160), at-risk (~38), critical (~350). */
const DECK: [number, number, number][] = [
  [217, 70, 62], // blue
  [330, 65, 64], // pink
  [172, 55, 48], // teal
  [282, 60, 66], // violet
  [48, 65, 55], //  gold — warmer than at-risk amber's context, chip-only
  [200, 15, 70], // silver — the deliberate neutral
  [255, 60, 70], // periwinkle-adjacent, last resort
];

/** Every course id ever asked about, in insertion order. */
const seen = new Set<string>();

/** Seed the full roster before rows render (useCourses does this on every
 *  dashboard load), so a late-arriving id can't reshuffle assignments
 *  mid-session. */
export function registerCourses(ids: string[]): void {
  for (const id of ids) seen.add(id);
}

function slotOf(courseId: string): [number, number, number] {
  seen.add(courseId);
  // Sorted order, not insertion order: deterministic across mount order and
  // across screens, so CS-146 is the same color everywhere.
  const index = [...seen].sort().indexOf(courseId);
  return DECK[index % DECK.length];
}

/** The identity tick beside a row. */
export function tickStyle(courseId: string): CSSProperties {
  const [h, s, l] = slotOf(courseId);
  return { backgroundColor: `hsl(${h} ${s}% ${l}% / 0.85)` };
}

/** The tinted chip behind a course code. Text stays the normal foreground —
 *  the tint identifies, the text carries the information. */
export function chipStyle(courseId: string): CSSProperties {
  const [h, s, l] = slotOf(courseId);
  return {
    backgroundColor: `hsl(${h} ${s}% ${l}% / 0.16)`,
    border: `1px solid hsl(${h} ${s}% ${l}% / 0.45)`,
  };
}
