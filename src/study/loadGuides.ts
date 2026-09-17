/**
 * loadGuides — the bundled guides (src/study/guides/*.json), as typed objects.
 *
 * Called by: StudyRead (and the later Cheat sheet / Recall / Map views),
 * StudyCourse for chapter lists.
 * Calls: nothing — Vite inlines the JSON at build time via import.meta.glob.
 *
 * The JSON is generated from src/study/chapters by `npm run migrate:guides`
 * (a prebuild step); `check:guides` fails CI when it is stale. Until the
 * flip to JSON-canonical after Phase 4, edit the chapters, not these files.
 */
import type { Guide } from "./guide";

const modules = import.meta.glob<{ default: Guide }>("./guides/*.json", { eager: true });

const byId = new Map<string, Guide>();
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith("/index.json")) continue;
  const g = mod.default;
  if (g && typeof g === "object" && "id" in g) byId.set(g.id, g);
}

export function guideById(id: string | undefined): Guide | undefined {
  return id ? byId.get(id) : undefined;
}

/** Guides for one course, in the order courses.ts lists their chapters. */
export function guidesForCourse(course: string, order: string[]): Guide[] {
  return order.map((slug) => byId.get(`${course}/${slug}`)).filter((g): g is Guide => !!g);
}

export const allGuides: Guide[] = [...byId.values()];
