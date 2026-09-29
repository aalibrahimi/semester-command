/**
 * Drill correctness. Two layers:
 *
 * 1. Every drill, many seeds: the accepted answer grades as correct when
 *    typed back, choices are well formed, diagnose() never throws.
 *    (scripts/check-drills.ts does a wider version of this in verify.)
 * 2. Oracles: for the drills where a wrong generator would teach the wrong
 *    algorithm, the answer is recomputed here from the PROMPT with an
 *    independent implementation, so a bug in the drill's own helper can't
 *    hide behind itself.
 */
import { describe, expect, it } from "vitest";
import { expectedText, grade, rng, type DrillAnswer, type DrillInstance } from "../drill";
import { allDrills } from "./index";

function typed(a: DrillAnswer): string {
  switch (a.kind) {
    case "number": return String(a.value);
    case "text": return a.accept[0];
    case "set":
    case "sequence": return a.items.join(", ");
    case "choice": return String(a.correct);
    case "checklist": return a.items.map((_, i) => i).join(",");
    case "custom": return a.display;
  }
}

const SEEDS = 60;
function instances(guideId: string, id: string): DrillInstance[] {
  const d = allDrills().find((x) => x.guideId === guideId && x.id === id);
  if (!d) throw new Error(`no drill ${guideId} ${id}`);
  return Array.from({ length: SEEDS }, (_, s) => d.gen(rng(1000 + s)));
}
const nums = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const answerOf = (i: DrillInstance) => expectedText(i.answer);

describe("every drill is self-consistent", () => {
  for (const d of allDrills()) {
    it(`${d.guideId} ${d.id}`, () => {
      for (let s = 0; s < 40; s++) {
        const inst = d.gen(rng(s));
        expect(inst.prompt.trim().length).toBeGreaterThan(0);
        expect(grade(inst.answer, typed(inst.answer)).correct).toBe(true);
        if (inst.answer.kind === "choice") {
          const { options, correct } = inst.answer;
          expect(options.length).toBeGreaterThanOrEqual(2);
          expect(new Set(options).size).toBe(options.length);
          expect(correct).toBeGreaterThanOrEqual(0);
          expect(correct).toBeLessThan(options.length);
        }
        expect(() => inst.diagnose?.("0")).not.toThrow();
        expect(() => inst.diagnose?.("")).not.toThrow();
      }
    });
  }
});

/* ── Oracles: CS 146 Lecture 9 (Lomuto partition) ────────────────────── */

function lomuto(a: number[], lo: number, hi: number): number {
  const x = a[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) if (a[j] <= x) { i++; [a[i], a[j]] = [a[j], a[i]]; }
  [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
  return i + 1;
}
const arrayIn = (prompt: string) => (prompt.match(/\[([^\]]+)\]/)?.[1] ?? "").split(",").map((x) => Number(x.trim()));

describe("oracle: quicksort partition", () => {
  it("partition!result leaves the array Lomuto leaves", () => {
    for (const inst of instances("cs146/9-quicksort", "partition!result")) {
      const a = arrayIn(inst.prompt);
      lomuto(a, 0, a.length - 1);
      expect(answerOf(inst).split(" → ").map(Number)).toEqual(a);
    }
  });
  it("partition!return is the pivot's final index", () => {
    for (const inst of instances("cs146/9-quicksort", "partition!return")) {
      const a = arrayIn(inst.prompt);
      const [lo, hi] = nums(inst.prompt.slice(inst.prompt.indexOf("partition(a,"))).slice(0, 2);
      expect(Number(answerOf(inst))).toBe(lomuto(a, lo, hi));
    }
  });
  it("partition!comparisons is high - low", () => {
    for (const inst of instances("cs146/9-quicksort", "partition!comparisons")) {
      const [lo, hi] = nums(inst.prompt);
      expect(Number(answerOf(inst))).toBe(hi - lo);
    }
  });
});

/* ── Oracles: CS 146 Lecture 11 (hash tables) ────────────────────────── */

describe("oracle: hash tables", () => {
  it("division!slot is k mod m", () => {
    for (const inst of instances("cs146/11-hash-tables", "division!slot")) {
      const [m, k] = nums(inst.prompt);
      expect(Number(answerOf(inst))).toBe(k % m);
    }
  });
  it("division!collide names two keys with the same slot", () => {
    for (const inst of instances("cs146/11-hash-tables", "division!collide")) {
      const keys = nums(inst.prompt.split("Insert")[1]);
      const [a, b] = nums(answerOf(inst));
      expect(keys).toContain(a);
      expect(keys).toContain(b);
      expect(a % 10).toBe(b % 10);
      const slots = keys.map((k) => k % 10);
      expect(slots.filter((s) => s === a % 10).length).toBe(2); // exactly one collision
    }
  });
  it("chaining!chain lists the slot's keys newest first", () => {
    for (const inst of instances("cs146/11-hash-tables", "chaining!chain")) {
      const seq = nums(inst.prompt.split("Insert")[1].split("in that order")[0]);
      const slot = nums(inst.prompt.split("Write chain")[1])[0];
      const want = seq.filter((k) => k % 10 === slot).reverse();
      expect(answerOf(inst).split(" → ").map(Number)).toEqual(want);
    }
  });
  it("runtime!alpha is n / m", () => {
    for (const inst of instances("cs146/11-hash-tables", "runtime!alpha")) {
      const [m, n] = nums(inst.prompt);
      expect(Number(answerOf(inst))).toBeCloseTo(n / m, 2);
    }
  });
  it("runtime!resize is the first n with n / m > 0.75", () => {
    for (const inst of instances("cs146/11-hash-tables", "runtime!resize")) {
      const m = nums(inst.prompt.split("m =")[1])[0];
      const n = Number(answerOf(inst));
      expect(n / m).toBeGreaterThan(0.75);
      expect((n - 1) / m).toBeLessThanOrEqual(0.75);
    }
  });
  it("multiplication!h follows floor(m * frac(k * A))", () => {
    for (const inst of instances("cs146/11-hash-tables", "multiplication!h")) {
      const [m, A, k] = nums(inst.prompt);
      const p = k * A;
      expect(Number(answerOf(inst))).toBe(Math.floor(m * (p - Math.floor(p)) + 1e-9));
    }
  });
  it("library!cubby counts letters, not spaces", () => {
    for (const inst of instances("cs146/11-hash-tables", "library!cubby")) {
      const title = inst.prompt.match(/\*([^*]+)\*/)?.[1] ?? "";
      expect(Number(answerOf(inst))).toBe(title.replace(/[^A-Za-z]/g, "").length % 10);
    }
  });
});
