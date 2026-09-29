import { describe, expect, it } from "vitest";
import type { ChapterLike } from "./guideSummary";
import type { GuideSection } from "./guide";
import type { AttemptRecord, ReviewRecord, SectionRecord } from "./mastery";
import { levelOf, readiness } from "./readiness";
import { missCount, needsReteach, reteachBlock } from "./reteach";

const NOW = new Date("2026-10-01T12:00:00");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const G: ChapterLike = {
  id: "cs146/9-quicksort",
  course: "cs146",
  lessons: "Lecture 9",
  title: "Quicksort",
  sections: [
    { id: "why", heading: "Start here" },
    { id: "partition", heading: "partition" },
    { id: "quicksort", heading: "quicksort" },
    { id: "analysis", heading: "How fast?" },
    { id: "words", heading: "Words from this chapter" },
  ],
};

function att(sectionId: string, correct: boolean, daysAgo = 1, drillId = `${sectionId}!x`): AttemptRecord {
  return { guideId: G.id, sectionId, drillId, seed: 1, correct, input: null, expected: null, diagnosis: null, ms: null, at: ago(daysAgo), source: "read" };
}
function sec(sectionId: string, status: SectionRecord["status"], daysAgo = 1): SectionRecord {
  return { guideId: G.id, sectionId, status, scratch: null, updatedAt: ago(daysAgo) };
}
const base = { guides: [G], sections: [] as SectionRecord[], attempts: [] as AttemptRecord[], reviews: [] as ReviewRecord[], drillSections: new Set([`${G.id}#partition`]), now: NOW };

describe("readiness", () => {
  it("counts only teaching sections as topics", () => {
    const r = readiness(base);
    expect(r.topics.map((t) => t.sectionId)).toEqual(["partition", "quicksort", "analysis"]);
    expect(r.counts.new).toBe(3);
    expect(r.overall).toBe(0);
  });

  it("drill accuracy dominates once there are enough answers", () => {
    const good = readiness({ ...base, attempts: [att("partition", true), att("partition", true), att("partition", true), att("partition", true)] });
    const bad = readiness({ ...base, sections: [sec("partition", "mastered")], attempts: [att("partition", false), att("partition", false), att("partition", false), att("partition", false)] });
    expect(good.topics[0].level).toBe("ok");
    expect(bad.topics[0].level).toBe("weak");
    expect(bad.topics[0].evidence[0]).toBe("0 of 4 drills right lately");
  });

  it("newer answers weigh more than old ones", () => {
    const improving = readiness({ ...base, attempts: [att("partition", false, 5), att("partition", false, 4), att("partition", true, 2), att("partition", true, 1)] });
    const slipping = readiness({ ...base, attempts: [att("partition", true, 5), att("partition", true, 4), att("partition", false, 2), att("partition", false, 1)] });
    expect(improving.topics[0].score).toBeGreaterThan(slipping.topics[0].score);
  });

  it("ignores drill answers older than three weeks", () => {
    const r = readiness({ ...base, attempts: [att("partition", false, 30)] });
    expect(r.topics[0].tries).toBe(0);
  });

  it("overdue cards and staleness lower the score", () => {
    const fresh = readiness({ ...base, sections: [sec("quicksort", "mastered", 1)] });
    const stale = readiness({ ...base, sections: [sec("quicksort", "mastered", 15)] });
    const review: ReviewRecord = { guideId: G.id, itemId: "quicksort.ab12cd34", lastSeen: ago(1), misses: 0, nextDue: ago(1), ease: 2.5, intervalDays: 1, reps: 1 };
    const due = readiness({ ...base, sections: [sec("quicksort", "mastered", 1)], reviews: [review] });
    const q = (r: typeof fresh) => r.topics.find((t) => t.sectionId === "quicksort")!;
    expect(q(stale).score).toBeLessThan(q(fresh).score);
    expect(q(due).score).toBeLessThan(q(fresh).score);
    expect(q(due).due).toBe(1);
    expect(q(stale).evidence).toContain("not practiced in 15 days");
  });

  it("weak spots put misunderstandings before untouched topics", () => {
    const r = readiness({ ...base, sections: [sec("analysis", "shaky")], attempts: [att("partition", false), att("partition", false)] });
    expect(r.weak.map((t) => t.sectionId)).toEqual(["partition", "analysis", "quicksort"]);
  });

  it("the plan fits in 20 minutes and uses drills when a topic has them", () => {
    const r = readiness({ ...base, sections: [sec("analysis", "shaky")], attempts: [att("partition", false), att("partition", false)] });
    const total = r.plan.reduce((s, p) => s + p.minutes, 0);
    expect(total).toBeLessThanOrEqual(20);
    expect(r.plan[0]).toMatchObject({ kind: "drill", to: `/study/${G.id}?s=partition&focus=1` });
    expect(r.plan[1].kind).toBe("reread");
  });

  it("levelOf thresholds", () => {
    expect(levelOf(0.9, false)).toBe("new");
    expect([0.2, 0.5, 0.7, 0.9].map((x) => levelOf(x, true))).toEqual(["weak", "shaky", "ok", "ready"]);
  });
});

describe("reteach", () => {
  const S: GuideSection[] = [
    {
      id: "partition",
      heading: "partition",
      blocks: [
        { type: "definition", id: "partition.1", term: "partition", body: "..." },
        { type: "stepper", id: "partition.2", title: "partition(a, 0, 4) on [9, 3, 1, 7, 5]", frames: [] },
        { type: "stepper", id: "partition.3", title: "partition, line by line", frames: [], trace: { code: "x", lines: [] } },
      ] as unknown as GuideSection["blocks"],
    },
  ];
  it("waits for the second miss on the same drill", () => {
    const one = [att("partition", false, 1, "partition!p")];
    const two = [...one, att("partition", true, 1, "partition!p"), att("partition", false, 0, "partition!p"), att("partition", false, 0, "partition!other")];
    expect(needsReteach(one, "partition", "partition!p")).toBe(false);
    expect(needsReteach(two, "partition", "partition!p")).toBe(true);
    expect(missCount(two, "partition", "partition!p")).toBe(2);
  });
  it("prefers the code + animation stepper, then honors a drill's own hint", () => {
    expect((reteachBlock(S, "partition") as { id: string }).id).toBe("partition.3");
    expect((reteachBlock(S, "partition", "[9, 3, 1") as { id: string }).id).toBe("partition.2");
    expect(reteachBlock(S, "missing")).toBeUndefined();
  });
});
