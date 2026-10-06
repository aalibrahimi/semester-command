import { describe, expect, it } from "vitest";
import { blankOk, boldPhrases, compare, contentWords, coverage, covers, keysForSelection, makeBlanks, nudge, pickKeys, sentenceWith, verdictOf } from "./explainCheck";

const BAL = "**B(node) = H(left child) − H(right child).** Left minus right, in that order. If B is −1, 0 or 1, the node is balanced. **B > 1**: left-heavy. **B < −1**: right-heavy.";
const STACK = "A container where you add and remove at the **same end**, the top. The last item pushed is the first popped: **LIFO** (last in, first out). Operations: **push**, **pop**, **peek**, **isEmpty**.";

describe("words", () => {
  it("stems and keeps symbols", () => {
    expect(contentWords("The heights of the children")).toEqual(["height", "child"]);
    expect(contentWords("It is O(n²), not O(n).")).toEqual(["o(n²)", "o(n)"]);
    expect(contentWords("H(null) = −1")).toEqual(["null", "equal", "minus", "1"]);
    expect(contentWords("H(left child)")).toEqual(["left", "child"]);
    expect(contentWords("left-heavy")).toEqual(["left", "heavy"]);
  });
  it("finds bold phrases, de-duplicated and trimmed", () => {
    expect(boldPhrases(STACK)).toEqual(["same end", "LIFO", "push", "pop", "peek", "isEmpty"]);
    expect(boldPhrases("**a** and **A.**")).toEqual(["a"]);
  });
  it("picks specific words when nothing is bold", () => {
    const k = pickKeys("Merge writes into a temporary array of size n, so it uses O(n) extra space.");
    expect(k).toContain("o(n)");
    expect(k.length).toBeLessThanOrEqual(3);
  });
  it("takes a selection's keys from bold phrases inside it", () => {
    expect(keysForSelection("The last item pushed is the first popped: LIFO (last in, first out).", STACK)).toEqual(["LIFO"]);
    expect(keysForSelection("A container where you add", STACK).length).toBeGreaterThan(0);
  });
});

describe("blanks", () => {
  it("blanks each key once, in reading order", () => {
    const p = makeBlanks(STACK, ["LIFO", "same end"]);
    const blanks = p.filter((x) => "blank" in x) as { blank: number; answer: string }[];
    expect(blanks.map((b) => b.answer)).toEqual(["same end", "LIFO"]);
    expect(p.map((x) => ("text" in x ? x.text : x.answer)).join("")).toBe(STACK.replace(/\*\*/g, ""));
  });
  it("skips keys that aren't in the text", () => {
    expect(makeBlanks("nothing here", ["LIFO"]).every((x) => "text" in x)).toBe(true);
  });
  it("forgives case, punctuation, minus signs and small typos", () => {
    expect(blankOk("lifo", "LIFO")).toBe(true);
    expect(blankOk("Same End.", "same end")).toBe(true);
    expect(blankOk("B < -1", "B < −1")).toBe(true);
    expect(blankOk("isEmty", "isEmpty")).toBe(true);
    expect(blankOk("FIFO", "LIFO")).toBe(false);
    expect(blankOk("", "LIFO")).toBe(false);
  });
});

describe("own words", () => {
  const keys = ["B(node) = H(left child) − H(right child)", "B > 1", "B < −1"];
  it("credits meaning across wording", () => {
    const formula = "B(node) = H(left child) − H(right child)";
    expect(covers("B is H(left) minus H(right)", formula)).toBe(true);
    expect(covers("the height on the left take away the height on the right", formula)).toBe(false);
    expect(covers("B < -1 is right heavy", "B > 1")).toBe(false);
    expect(covers("if it's bigger than 1 it's left-heavy", "B > 1")).toBe(true);
    expect(covers("less than negative one means right heavy", "B < −1")).toBe(true);
    expect(blankOk("H(left child) - H(right child)", "B(node) = H(left child) − H(right child)")).toBe(true);
    expect(blankOk("H(left)", "B(node) = H(left child) − H(right child)")).toBe(false);
    expect(covers("Balance is the height of the left child minus the height of the right child", "H(left child) − H(right child)")).toBe(true);
    expect(covers("last in first out", "last in, first out")).toBe(true);
    expect(covers("first in first out", "LIFO")).toBe(false);
  });
  it("scores coverage and names what's missing", () => {
    const c = coverage("B(node) = H(left child) - H(right child), and B > 1 is left heavy", keys);
    expect(c.covered).toHaveLength(2);
    expect(c.missed).toEqual(["B < −1"]);
    expect(c.score).toBeCloseTo(2 / 3);
    expect(verdictOf(c.score, 3)).toBe("almost");
    expect(nudge(c)).toContain("one idea away");
    expect(verdictOf(1, 3)).toBe("right");
    expect(verdictOf(0, 3)).toBe("wrong");
  });
  it("finds the hint sentence", () => {
    expect(sentenceWith(BAL, "left-heavy")).toBe("B > 1: left-heavy.");
    expect(sentenceWith(BAL, "nonexistent")).toBeNull();
  });
  it("compares with the last attempt", () => {
    const now = coverage("push and pop at the same end, LIFO", ["same end", "LIFO", "peek"]);
    const cmp = compare(["LIFO", "peek"], 1 / 3, now);
    expect(cmp.gained).toEqual(["LIFO"]);
    expect(cmp.stuck).toEqual(["peek"]);
    expect(cmp.slipped).toEqual([]);
    expect(cmp.delta).toBeCloseTo(1 / 3);
  });
});
