/**
 * courseWork: the Do next list and header pills on every course page and
 * on Today. Wrong here means a missing assignment hides or "due tomorrow"
 * shows up a day early.
 */
import { describe, expect, it } from "vitest";
import type { AssignmentDetail } from "@/types";
import { calendarDays, classify, dueWhen, isDone } from "./courseWork";

const at = (s: string) => new Date(s).getTime();
function a(over: Partial<AssignmentDetail>): AssignmentDetail {
  return { id: "1", name: "x", dueAt: null, submitted: false, score: null, missing: false, excused: false, omitted: false, pointsPossible: 10, ...over } as AssignmentDetail;
}

describe("isDone", () => {
  it("is true once submitted or graded", () => {
    expect(isDone(a({ submitted: true }))).toBe(true);
    expect(isDone(a({ score: 8 }))).toBe(true);
    expect(isDone(a({}))).toBe(false);
  });
});

describe("classify", () => {
  const now = at("2026-09-29T12:00:00-07:00");
  const list = [
    a({ id: "1", name: "late", dueAt: "2026-09-27T23:59:00-07:00" }),
    a({ id: "2", name: "late, ungraded", dueAt: "2026-09-28T23:59:00-07:00", pointsPossible: 0 }),
    a({ id: "3", name: "flagged missing, 0 pts", dueAt: "2026-09-26T23:59:00-07:00", pointsPossible: 0, missing: true }),
    a({ id: "4", name: "Friday", dueAt: "2026-10-02T23:59:00-07:00" }),
    a({ id: "5", name: "tomorrow", dueAt: "2026-09-30T12:00:00-07:00" }),
    a({ id: "6", name: "in 2 weeks", dueAt: "2026-10-13T09:00:00-07:00" }),
    a({ id: "7", name: "in 4 weeks", dueAt: "2026-10-27T09:00:00-07:00" }),
    a({ id: "8", name: "done", dueAt: "2026-09-30T12:00:00-07:00", submitted: true }),
    a({ id: "9", name: "excused", dueAt: "2026-09-27T12:00:00-07:00", excused: true }),
    a({ id: "10", name: "undated" }),
  ];
  const { missing, soon, later } = classify(list, now);
  it("missing: past due and worth points (or flagged), newest first", () => {
    expect(missing.map((x) => x.id)).toEqual(["1", "3"]);
  });
  it("soon: the next 7 days, earliest first", () => {
    expect(soon.map((x) => x.id)).toEqual(["5", "4"]);
  });
  it("later: 7 to 21 days out", () => {
    expect(later.map((x) => x.id)).toEqual(["6"]);
  });
  it("never shows done, excused or undated work", () => {
    const all = [...missing, ...soon, ...later].map((x) => x.id);
    for (const id of ["8", "9", "10"]) expect(all).not.toContain(id);
  });
});

describe("dueWhen", () => {
  const noon = at("2026-09-29T12:00:00-07:00");
  it("today, tomorrow, weekday, overdue", () => {
    expect(dueWhen("2026-09-29T23:59:00-07:00", noon)).toBe("due today");
    expect(dueWhen("2026-09-30T08:00:00-07:00", noon)).toBe("due tomorrow");
    expect(dueWhen("2026-10-02T08:00:00-07:00", noon)).toBe("due Fri");
    expect(dueWhen("2026-09-28T08:00:00-07:00", noon)).toBe("overdue");
  });
  it("counts calendar days across the spring daylight-saving switch", () => {
    // 2027-03-14 is 23 hours long in Pacific time.
    const sat = at("2027-03-13T20:00:00-08:00");
    expect(dueWhen("2027-03-14T10:00:00-07:00", sat)).toBe("due tomorrow");
    expect(dueWhen("2027-03-15T10:00:00-07:00", sat)).toBe("due Mon");
  });
  it("and across the fall switch", () => {
    const sat = at("2026-10-31T20:00:00-07:00");
    expect(dueWhen("2026-11-01T10:00:00-08:00", sat)).toBe("due tomorrow");
  });
});

describe("calendarDays", () => {
  it("is 0 later today, 1 tomorrow, -1 yesterday", () => {
    const now = at("2026-09-29T09:00:00-07:00");
    expect(calendarDays(new Date("2026-09-29T23:00:00-07:00"), now)).toBe(0);
    expect(calendarDays(new Date("2026-09-30T00:30:00-07:00"), now)).toBe(1);
    expect(calendarDays(new Date("2026-09-28T23:00:00-07:00"), now)).toBe(-1);
  });
});
