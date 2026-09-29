import { describe, expect, it } from "vitest";
import { coveringGuide, lectureRef, lessonRanges, studyCourseForCode } from "./lectureCoverage";

describe("lectureCoverage", () => {
  it("reads the lecture or week number out of real Canvas file names", () => {
    expect(lectureRef("Lecture 12_ Binary Search Trees.pdf")).toEqual({ kind: "lecture", n: 12 });
    expect(lectureRef("LING 112 - Week 7 - X-bar theory.pdf")).toEqual({ kind: "week", n: 7 });
    expect(lectureRef("lec_5 slides.pdf")).toEqual({ kind: "lecture", n: 5 });
    expect(lectureRef("Handout on theta roles.pdf")).toBeNull();
  });
  it("reads ranges from a guide's lessons", () => {
    expect(lessonRanges("Lectures 2–3")).toEqual([{ kind: "lecture", lo: 2, hi: 3 }]);
    expect(lessonRanges("Lectures 4-5")).toEqual([{ kind: "lecture", lo: 4, hi: 5 }]);
    expect(lessonRanges("Week 7")).toEqual([{ kind: "week", lo: 7, hi: 7 }]);
  });
  it("matches a file to the chapter that covers it, and only that kind", () => {
    const guides = [
      { id: "cs146/2-adts", lessons: "Lectures 2–3" },
      { id: "cs146/11-hash-tables", lessons: "Lecture 11" },
      { id: "ling112/7-x-bar", lessons: "Week 7" },
    ];
    expect(coveringGuide(lectureRef("Lecture 3_ Loop Invariants.pdf"), guides)).toBe("cs146/2-adts");
    expect(coveringGuide(lectureRef("Lecture 12_ Binary Search Trees.pdf"), guides)).toBeUndefined();
    expect(coveringGuide(lectureRef("LING 112 - Week 7 - X-bar theory.pdf"), guides)).toBe("ling112/7-x-bar");
    expect(coveringGuide({ kind: "lecture", n: 7 }, guides)).toBeUndefined();
  });
  it("maps a Canvas course code to the study course", () => {
    expect(studyCourseForCode("FA26: CS-146 Sec 03 - Data Structures and Algorithms")?.slug).toBe("cs146");
    expect(studyCourseForCode("FA26: LING-112 Sec 01 - Intro to Syntax")?.slug).toBe("ling112");
    expect(studyCourseForCode("Some club")).toBeUndefined();
  });
});
