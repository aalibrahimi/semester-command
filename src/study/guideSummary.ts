/**
 * guideSummary: the part of a guide that lists, progress bars and the study
 * plan need, without the blocks. The full guide (every figure, animation and
 * exercise) is loaded only when a chapter is opened (loadGuides.ts).
 *
 * Called by: scripts/guide-index.ts (build time), loadGuides.ts (a guide
 * that arrives from the Railway content cache is summarized on the fly),
 * scripts/content-sync.ts (stores the summary next to each guide).
 */
import type { Guide } from "./guide";

export interface GuideSummary {
  id: string;
  course: string;
  lessons: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  requires: string[];
  sections: { id: string; heading: string }[];
  exerciseCount: number;
  /** SHA-256 of the guide's JSON file (bundled copy) or of the stored body. */
  sha: string;
}

/**
 * What progress and the study plan read from a chapter. Both a full Guide
 * and a GuideSummary fit, so callers pass whichever they have.
 */
export interface ChapterLike {
  id: string;
  course: string;
  lessons: string;
  title: string;
  sections: { id: string; heading: string }[];
}

export function summarize(g: Guide, sha: string): GuideSummary {
  return {
    id: g.id,
    course: g.course,
    lessons: g.lessons,
    title: g.title,
    summary: g.summary,
    estimatedMinutes: g.estimatedMinutes,
    requires: g.requires ?? [],
    sections: g.sections.map((s) => ({ id: s.id, heading: s.heading })),
    exerciseCount: g.exercises?.length ?? 0,
    sha,
  };
}
