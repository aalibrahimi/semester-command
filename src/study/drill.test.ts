/**
 * Grading and the seeded random source. A grading bug marks right answers
 * wrong (or wrong ones right), which is worse than no drill at all, so each
 * answer kind is pinned down here with the inputs a real person types.
 */
import { describe, expect, it } from "vitest";
import { choice, grade, norm, rng, type DrillAnswer } from "./drill";

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = rng(42), b = rng(42);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });
  it("int stays inside [lo, hi] and reaches both ends", () => {
    const r = rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });
  it("shuffle and sample keep the elements", () => {
    const r = rng(1);
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    const s = r.sample([1, 2, 3, 4, 5], 3);
    expect(new Set(s).size).toBe(3);
  });
});

describe("norm", () => {
  it("folds case, spaces, curly quotes and long dashes", () => {
    expect(norm("  Don’t  Stop ")).toBe("don't stop");
    expect(norm("a – b")).toBe("a - b");
    expect(norm("1 , 2 → 3")).toBe("1,2→3");
  });
});

const num = (value: number, tolerance?: number): DrillAnswer => ({ kind: "number", value, tolerance });

describe("grade: number", () => {
  it("accepts plain, comma-grouped, fraction and power forms", () => {
    expect(grade(num(1000), "1,000").correct).toBe(true);
    expect(grade(num(0.5), "1/2").correct).toBe(true);
    expect(grade(num(4096), "2^12").correct).toBe(true);
    expect(grade(num(4096), "2**12").correct).toBe(true);
    expect(grade(num(-3), "−3").correct).toBe(true); // a pasted minus sign
  });
  it("ignores a trailing unit", () => {
    expect(grade(num(8000), "8000 Hz").correct).toBe(true);
  });
  it("respects the tolerance", () => {
    expect(grade(num(2.5, 0.011), "2.51").correct).toBe(true);
    expect(grade(num(2.5, 0.011), "2.52").correct).toBe(false);
  });
  it("rejects empty and non-numeric input", () => {
    expect(grade(num(0), "").correct).toBe(false);
    expect(grade(num(3), "three").correct).toBe(false);
  });
});

describe("grade: text", () => {
  it("matches any accepted spelling, case-insensitively", () => {
    const a: DrillAnswer = { kind: "text", accept: ["Theta(n log n)", "Θ(n log n)"] };
    expect(grade(a, "θ(N LOG N)").correct).toBe(true);
    expect(grade(a, "O(n log n)").correct).toBe(false);
  });
});

describe("grade: set and sequence", () => {
  const set: DrillAnswer = { kind: "set", items: ["NP", "VP", "PP"] };
  const seq: DrillAnswer = { kind: "sequence", items: ["34", "24", "14"] };
  it("set ignores order but not duplicates or missing items", () => {
    expect(grade(set, "pp, np, vp").correct).toBe(true);
    expect(grade(set, "NP VP PP").correct).toBe(true);
    expect(grade(set, "NP, NP, VP").correct).toBe(false);
    expect(grade(set, "NP, VP").correct).toBe(false);
  });
  it("sequence needs the exact order, with any separator", () => {
    expect(grade(seq, "34, 24, 14").correct).toBe(true);
    expect(grade(seq, "34 → 24 → 14").correct).toBe(true);
    expect(grade(seq, "34 -> 24 -> 14").correct).toBe(true);
    expect(grade(seq, "34 24 14").correct).toBe(true);
    expect(grade(seq, "14, 24, 34").correct).toBe(false);
  });
});

describe("grade: choice, checklist, custom", () => {
  it("choice compares the option index", () => {
    const a: DrillAnswer = { kind: "choice", options: ["x", "y"], correct: 1 };
    expect(grade(a, "1").correct).toBe(true);
    expect(grade(a, "0").correct).toBe(false);
  });
  it("checklist needs every item ticked", () => {
    const a: DrillAnswer = { kind: "checklist", items: ["a", "b", "c"] };
    expect(grade(a, "0,1,2").correct).toBe(true);
    expect(grade(a, "0,2").correct).toBe(false);
  });
  it("custom never throws out to the reader", () => {
    const a: DrillAnswer = { kind: "custom", display: "x", check: () => { throw new Error("boom"); } };
    expect(grade(a, "anything").correct).toBe(false);
  });
});

describe("choice()", () => {
  it("drops duplicate distractors and points at the right option", () => {
    for (let s = 0; s < 50; s++) {
      const a = choice(rng(s), "right", ["wrong", "right", "wrong", "other"]);
      if (a.kind !== "choice") throw new Error("kind");
      expect(a.options[a.correct]).toBe("right");
      expect(new Set(a.options).size).toBe(a.options.length);
      expect(a.options.length).toBe(3);
    }
  });
});
