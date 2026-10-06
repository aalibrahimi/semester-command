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

/* ── Oracles: CS 146 Lecture 12 (binary search trees) ─────────────────── */

describe("oracle: binary search trees", () => {
  const G = "cs146/12-binary-search-trees";
  // An independent BST: parent pointers in a Map, no recursion shared with the drill.
  type T = { root?: number; l: Map<number, number>; r: Map<number, number> };
  const make = (keys: number[]): T => {
    const t: T = { l: new Map(), r: new Map() };
    for (const k of keys) {
      if (t.root === undefined) { t.root = k; continue; }
      let x = t.root;
      for (;;) {
        const side = k < x ? t.l : t.r;
        const next = side.get(x);
        if (next === undefined) { side.set(x, k); break; }
        x = next;
      }
    }
    return t;
  };
  const walk = (t: T, x: number | undefined, kind: string, out: number[] = []): number[] => {
    if (x === undefined) return out;
    if (kind === "pre") out.push(x);
    walk(t, t.l.get(x), kind, out);
    if (kind === "in") out.push(x);
    walk(t, t.r.get(x), kind, out);
    if (kind === "post") out.push(x);
    return out;
  };
  const depth = (t: T, x: number | undefined): number => (x === undefined ? -1 : 1 + Math.max(depth(t, t.l.get(x)), depth(t, t.r.get(x))));
  const keysOf = (p: string) => nums(p.split("Insert")[1].split("(in that order)")[0]);
  const seq = (i: DrillInstance) => nums(answerOf(i));

  it("traversal!order matches the named traversal", () => {
    for (const inst of instances(G, "traversal!order")) {
      const t = make(keysOf(inst.prompt));
      const kind = inst.prompt.match(/its (in|pre|post)-order/)![1];
      expect(seq(inst)).toEqual(walk(t, t.root, kind));
    }
  });
  it("search!path follows smaller-left, bigger-right from the root", () => {
    for (const inst of instances(G, "search!path")) {
      const t = make(keysOf(inst.prompt));
      const k = nums(inst.prompt.split("search(root,")[1])[0];
      const path: number[] = [];
      let x = t.root;
      while (x !== undefined) { path.push(x); if (x === k) break; x = (k < x ? t.l : t.r).get(x); }
      expect(seq(inst)).toEqual(path);
    }
  });
  it("insert!parent names the node the new key hangs from", () => {
    for (const inst of instances(G, "insert!parent")) {
      const keys = keysOf(inst.prompt);
      const k = nums(inst.prompt.split("Now insert")[1])[0];
      const t = make([...keys, k]);
      const [side, p] = [answerOf(inst).startsWith("left") ? t.l : t.r, nums(answerOf(inst))[0]];
      expect(side.get(p)).toBe(k);
    }
  });
  it("delete!replace is the smallest key bigger than the deleted one", () => {
    for (const inst of instances(G, "delete!replace")) {
      const keys = keysOf(inst.prompt);
      const d = nums(inst.prompt.split("Now delete")[1])[0];
      const t = make(keys);
      expect(t.l.has(d) && t.r.has(d)).toBe(true);
      expect(Number(answerOf(inst))).toBe(Math.min(...keys.filter((x) => x > d)));
    }
  });
  it("search!successor is the next key in sorted order", () => {
    for (const inst of instances(G, "search!successor")) {
      const keys = keysOf(inst.prompt);
      const k = nums(inst.prompt.split("successor of")[1])[0];
      expect(Number(answerOf(inst))).toBe(Math.min(...keys.filter((x) => x > k)));
    }
  });
  it("runtime!height counts edges on the longest path", () => {
    for (const inst of instances(G, "runtime!height")) {
      const t = make(keysOf(inst.prompt));
      expect(Number(answerOf(inst))).toBe(depth(t, t.root));
    }
  });
});

/* ── Oracles: CS 146 Lecture 13 (AVL trees) ─────────────────────────── */

describe("oracle: AVL trees", () => {
  const G = "cs146/13-avl-trees";
  // Independent AVL: nodes in a Map keyed by key, recursive, recomputes
  // heights from scratch instead of trusting stored ones.
  type T = { k: number; l?: T; r?: T };
  const ht = (t?: T): number => (t ? 1 + Math.max(ht(t.l), ht(t.r)) : -1);
  const bal = (t: T) => ht(t.l) - ht(t.r);
  const rr = (x: T): T => { const y = x.l!; x.l = y.r; y.r = x; return y; };
  const lr = (x: T): T => { const y = x.r!; x.r = y.l; y.l = x; return y; };
  const ins = (t: T | undefined, k: number, log: string[]): T => {
    if (!t) return { k };
    if (k < t.k) t.l = ins(t.l, k, log);
    else if (k > t.k) t.r = ins(t.r, k, log);
    else return t;
    const b = bal(t);
    if (b > 1) { if (k < t.l!.k) { log.push("LL"); return rr(t); } log.push("LR"); t.l = lr(t.l!); return rr(t); }
    if (b < -1) { if (k > t.r!.k) { log.push("RR"); return lr(t); } log.push("RL"); t.r = rr(t.r!); return lr(t); }
    return t;
  };
  const bst = (ks: number[]) => { let root: T | undefined; for (const k of ks) { if (!root) { root = { k }; continue; } let x = root; for (;;) { const side = k < x.k ? "l" : "r"; if (!x[side]) { x[side] = { k }; break; } x = x[side]!; } } return root!; };
  const findT = (t: T | undefined, k: number): T | undefined => (!t || t.k === k ? t : findT(k < t.k ? t.l : t.r, k));
  const keysOf = (p: string) => nums(p.split("Insert")[1].split("(in that order)")[0]);

  it("balance!b is H(left) − H(right) on the plain BST", () => {
    for (const inst of instances(G, "balance!b")) {
      const t = bst(keysOf(inst.prompt));
      const k = nums(inst.prompt.split("B(")[1])[0];
      expect(Number(answerOf(inst).replace("−", "-"))).toBe(bal(findT(t, k)!));
    }
  });
  it("insert!case names the one rotation the last key causes", () => {
    for (const inst of instances(G, "insert!case")) {
      const keys = keysOf(inst.prompt);
      const log: string[] = [];
      let t: T | undefined;
      for (const k of keys) t = ins(t, k, log);
      expect(log.length).toBe(1);
      expect(answerOf(inst)).toBe(log[0]);
    }
  });
  it("hw!root is the root after all AVL inserts", () => {
    for (const inst of instances(G, "hw!root")) {
      let t: T | undefined;
      for (const k of keysOf(inst.prompt)) t = ins(t, k, []);
      expect(Number(answerOf(inst))).toBe(t!.k);
    }
  });
  it("runtime!height matches a from-scratch AVL build of 1..n", () => {
    for (const inst of instances(G, "runtime!height")) {
      const n = nums(inst.prompt.split("…,")[1])[0];
      let t: T | undefined;
      for (let k = 1; k <= n; k++) t = ins(t, k, []);
      expect(Number(answerOf(inst))).toBe(ht(t));
    }
  });
});

/* ── Oracles: CS 146 Lecture 3 from zero ─────────────────────────────── */

describe("oracle: Lecture 3 from zero", () => {
  const G = "cs146/3-from-zero";
  it("count!shifts equals the number of inversions", () => {
    for (const inst of instances(G, "count!shifts")) {
      const a = nums(inst.prompt.split("[")[1].split("]")[0]);
      let inv = 0;
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++;
      expect(Number(answerOf(inst))).toBe(inv);
    }
  });
  it("cards!place is the hand plus the key, sorted", () => {
    for (const inst of instances(G, "cards!place")) {
      const hand = nums(inst.prompt.split("[")[1].split("]")[0]);
      const key = nums(inst.prompt.split("key is")[1])[0];
      expect(nums(answerOf(inst))).toEqual([...hand, key].sort((x, y) => x - y));
    }
  });
  it("logs!steps is log2 n for binary search and n log2 n for merge sort", () => {
    for (const inst of instances(G, "logs!steps")) {
      const n = Number(inst.prompt.match(/on ([\d,]+)/)![1].replace(/,/g, ""));
      const k = Math.log2(n);
      const want = inst.prompt.startsWith("Binary") ? k : n * k;
      expect(Number(answerOf(inst).replace(/,/g, ""))).toBe(want);
    }
  });
});

describe("linear-time sort oracles (recomputed from the prompt)", () => {
  const G = "cs146/10-linear-sorts";
  const arrays = (s: string) => [...s.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].split(",").map((x) => Number(x.trim())));

  it("counting!cumulative is a left-to-right running total", () => {
    for (const i of instances(G, "counting!cumulative")) {
      const [c] = arrays(i.prompt);
      let run = 0;
      expect(answerOf(i)).toBe(c.map((x) => (run += x)).join(" → "));
    }
  });

  it("counting!seat equals the stable position of the last element", () => {
    for (const i of instances(G, "counting!seat")) {
      const [a] = arrays(i.prompt);
      const x = a[a.length - 1];
      // The last copy of x takes the last seat among the x's in sorted order.
      const sorted = [...a].sort((p, q) => p - q);
      expect(Number(answerOf(i))).toBe(sorted.lastIndexOf(x));
    }
  });

  it("radix!pass is a stable sort on one digit", () => {
    for (const i of instances(G, "radix!pass")) {
      const [a] = arrays(i.prompt);
      const p = i.prompt.includes("100s") ? 2 : i.prompt.includes("10s") ? 1 : 0;
      const d = (x: number) => Math.floor(x / 10 ** p) % 10;
      const buckets: number[][] = Array.from({ length: 10 }, () => []);
      for (const x of a) buckets[d(x)].push(x);
      expect(answerOf(i)).toBe(buckets.flat().join(" → "));
    }
  });

  it("bucket!index is the floor of n·x", () => {
    for (const i of instances(G, "bucket!index")) {
      const n = Number(/n = (\d+)/.exec(i.prompt)![1]);
      const x = Number(/does (\d*\.\d+)/.exec(i.prompt)![1]);
      expect(Number(answerOf(i))).toBe(Math.floor(n * x + 1e-9));
    }
  });
});
