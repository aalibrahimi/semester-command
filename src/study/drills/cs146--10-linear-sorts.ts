/**
 * Drills for CS 146 · Linear-time sorts: bucket index, counting sort's
 * count / cumulative count / seat, radix passes, runtimes, and picking the
 * right sort for the data.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs146/10-linear-sorts";

function ints(r: Rng, n: number, k: number): number[] {
  return Array.from({ length: n }, () => r.int(0, k));
}
const L = (xs: (number | string)[]) => `[${xs.join(", ")}]`;

export function counts(a: number[], k: number): number[] {
  const c = new Array(k + 1).fill(0);
  for (const x of a) c[x]++;
  return c;
}
export function cumulative(c: number[]): number[] {
  const out = [...c];
  for (let v = 1; v < out.length; v++) out[v] += out[v - 1];
  return out;
}
/** One stable pass of radix sort on digit p (0 = 1s). */
export function radixPass(a: number[], p: number): number[] {
  const d = (x: number) => Math.floor(x / 10 ** p) % 10;
  return a.map((x, i) => ({ x, i })).sort((u, v) => d(u.x) - d(v.x) || u.i - v.i).map((o) => o.x);
}

const SCENARIOS: { text: string; answer: "Counting sort" | "Radix sort" | "Bucket sort" | "A comparison sort (merge sort)"; why: string }[] = [
  { text: "the ages (0 to 120) of 5 million users", answer: "Counting sort", why: "Integers in a small range: k = 120 ≪ n, so Θ(n + k) = Θ(n)." },
  { text: "exam scores from 0 to 100 for a class of 300", answer: "Counting sort", why: "Small integer range, Poon's own example." },
  { text: "a billion 32-bit IP addresses", answer: "Radix sort", why: "Fixed-size integers: d = 4 bytes in base 256, so Θ(4(n + 256)) = Θ(n)." },
  { text: "10 million 9-digit student IDs", answer: "Radix sort", why: "Integers with a fixed number of digits; counting sort would need a count array of a billion slots." },
  { text: "1 million random decimals drawn evenly from [0, 1)", answer: "Bucket sort", why: "Evenly spread over a known range: about one per bucket, Θ(n) on average." },
  { text: "product names (strings of any length) for a catalog", answer: "A comparison sort (merge sort)", why: "Not integers, no fixed digit count, no even spread: compare them." },
  { text: "stock prices that cluster around a few popular values", answer: "A comparison sort (merge sort)", why: "Not evenly spread, so buckets overflow; not small integers either." },
];

export const drills: Drill[] = [
  {
    id: "bucket!index",
    guideId: G,
    sectionRef: "bucket",
    title: "Which bucket?",
    skill: "Compute ⌊n · x⌋ for bucket sort.",
    gen(r) {
      const n = r.pick([4, 5, 8, 10]);
      const x = r.int(1, 99) / 100;
      const b = Math.floor(n * x + 1e-9);
      return {
        prompt: `Bucket sort with n = ${n} buckets over [0, 1). Which bucket does ${x.toFixed(2)} go to?`,
        answer: { kind: "number", value: b },
        steps: [`n · x = ${n} × ${x.toFixed(2)} = ${(n * x).toFixed(2)}.`, `Round down: bucket ${b}.`],
        hint: "Multiply by n, then drop everything after the decimal point.",
        diagnose: (s) => (Number(s) === Math.round(n * x) && Math.round(n * x) !== b ? "You rounded to the nearest whole number. Bucket sort rounds DOWN (floor)." : Number(s) >= n ? `There are only ${n} buckets, numbered 0 to ${n - 1}.` : undefined),
      };
    },
  },
  {
    id: "counting!count",
    guideId: G,
    sectionRef: "counting",
    title: "Step 1: the count array",
    skill: "Count how many times each value 0..k appears.",
    gen(r) {
      const k = r.int(3, 5);
      const a = ints(r, r.int(6, 8), k);
      const c = counts(a, k);
      return {
        prompt: `Counting sort, a = ${L(a)}, k = ${k}. What is count after step 1 (frequencies)?`,
        answer: { kind: "sequence", items: c.map(String), placeholder: "e.g. 2, 1, 0, 3" },
        steps: c.map((x, v) => `${x} × ${v}`).concat([`count = ${L(c)} (it has k + 1 = ${k + 1} entries).`]),
        hint: `count has one slot per value 0..${k}; tally each element.`,
        diagnose: (s) => (s.split(/[,\s]+/).filter(Boolean).length === a.length ? "That has n entries. count has one entry per possible VALUE (k + 1 of them)." : undefined),
      };
    },
  },
  {
    id: "counting!cumulative",
    guideId: G,
    sectionRef: "counting",
    title: "Step 2: cumulative count",
    skill: "Turn frequencies into 'how many are ≤ v'.",
    gen(r) {
      const k = r.int(3, 5);
      const c = Array.from({ length: k + 1 }, () => r.int(0, 3));
      const cum = cumulative(c);
      return {
        prompt: `After step 1, count = ${L(c)}. What is count after step 2 (cumulative)?`,
        answer: { kind: "sequence", items: cum.map(String), placeholder: "e.g. 1, 3, 3, 5" },
        steps: cum.map((x, v) => (v === 0 ? `count[0] stays ${x}.` : `count[${v}] = ${cum[v - 1]} + ${c[v]} = ${x}.`)),
        hint: "Running total, left to right: each entry adds the new total before it.",
        diagnose: (s) => {
          const got = s.split(/[,\s]+/).filter(Boolean).join(",");
          const fromRight = [...c].reverse().map((_, i, arr) => arr.slice(0, i + 1).reduce((x, y) => x + y, 0)).reverse().join(",");
          return got === fromRight ? "You added from the right. The cumulative count runs left to right: count[v] = how many items are ≤ v." : undefined;
        },
      };
    },
  },
  {
    id: "counting!seat",
    guideId: G,
    sectionRef: "counting",
    title: "Step 3: which seat?",
    skill: "Place the next element walking backwards: seat = count[x] − 1.",
    gen(r) {
      const k = r.int(3, 5);
      let a = ints(r, r.int(5, 8), k);
      if (a.every((x) => x === a[0])) a = [...a.slice(1), (a[0] + 1) % (k + 1)];
      const cum = cumulative(counts(a, k));
      const x = a[a.length - 1];
      return {
        prompt: `a = ${L(a)}, k = ${k}, cumulative count = ${L(cum)}. Step 3 starts at the END of a. At which output index does a[${a.length - 1}] = ${x} go?`,
        answer: { kind: "number", value: cum[x] - 1 },
        steps: [`x = ${x}, count[${x}] = ${cum[x]}: ${cum[x]} items are ≤ ${x}.`, `Seats start at 0, so its seat is ${cum[x]} − 1 = ${cum[x] - 1}.`, `Then count[${x}] drops to ${cum[x] - 1}.`],
        hint: "Look up count[x], then subtract one.",
        diagnose: (s) => (Number(s) === cum[x] ? "That's count[x] itself. Seats are numbered from 0: subtract one." : undefined),
      };
    },
  },
  {
    id: "counting!runtime",
    guideId: G,
    sectionRef: "counting",
    title: "Is counting sort linear here?",
    skill: "Judge Θ(n + k) from n and k.",
    gen(r) {
      const cases = [
        { n: "1,000,000", k: "100", ok: true, why: "k ≪ n, so Θ(n + k) = Θ(n)." },
        { n: "100", k: "100,000,000", ok: false, why: "k = n⁴: the count array alone has 100 million slots." },
        { n: "50,000", k: "255", ok: true, why: "k is a constant (pixel values), so Θ(n)." },
        { n: "1,000", k: "10¹²", ok: false, why: "k dwarfs n; use radix sort or a comparison sort." },
      ];
      const c = r.pick(cases);
      return {
        prompt: `Counting sort on n = ${c.n} integers whose values go up to k = ${c.k}. Does it run in linear time in n?`,
        answer: choice(r, c.ok ? "Yes" : "No", [c.ok ? "No" : "Yes"]),
        steps: [`Counting sort is Θ(n + k).`, c.why],
      };
    },
  },
  {
    id: "radix!pass",
    guideId: G,
    sectionRef: "radix",
    title: "One radix pass",
    skill: "Stable-sort a list by one digit, keeping ties in order.",
    gen(r) {
      const a: number[] = [];
      while (a.length < 6) {
        const x = r.int(100, 999);
        if (!a.includes(x)) a.push(x);
      }
      const p = r.int(0, 2);
      // Make sure at least one tie on the digit, so stability matters.
      const d = (x: number) => Math.floor(x / 10 ** p) % 10;
      if (new Set(a.map(d)).size === a.length) a[5] = a[5] - d(a[5]) * 10 ** p + d(a[0]) * 10 ** p;
      const out = radixPass(a, p);
      const name = ["1s", "10s", "100s"][p];
      return {
        prompt: `One stable pass of radix sort on the ${name} digit. Input: ${L(a)}. What is the list after this pass?`,
        answer: { kind: "sequence", items: out.map(String), placeholder: "e.g. 720, 355, 436" },
        steps: [`${name} digits: ${a.map((x) => `${x} → ${d(x)}`).join(", ")}.`, "Sort by that digit only; equal digits keep their input order.", `Result: ${L(out)}.`],
        hint: `Look only at the ${name} digit. Ties stay in the order they came in.`,
        diagnose: (s) => {
          const got = s.split(/[,\s]+/).filter(Boolean).map(Number);
          const byWhole = [...a].sort((x, y) => d(x) - d(y) || x - y);
          return got.join(",") === byWhole.join(",") && byWhole.join(",") !== out.join(",") ? "You broke ties by the whole number. A stable pass keeps tied items in their INPUT order." : undefined;
        },
      };
    },
  },
  {
    id: "radix!time",
    guideId: G,
    sectionRef: "radix",
    title: "Radix sort's cost",
    skill: "Count passes and per-pass cost: Θ(d(n + b)).",
    gen(r) {
      const d = r.int(3, 9);
      return {
        prompt: `Radix sort in base 10 on numbers with ${d} digits. How many passes does it make?`,
        answer: { kind: "number", value: d },
        steps: ["One stable counting-sort pass per digit.", `${d} digits → ${d} passes, each Θ(n + 10).`, `Total Θ(${d}(n + 10)) = Θ(n).`],
      };
    },
  },
  {
    id: "choose!sort",
    guideId: G,
    sectionRef: "choose",
    title: "Pick the sort",
    skill: "Match the data to counting, radix, bucket, or a comparison sort.",
    gen(r) {
      const s = r.pick(SCENARIOS);
      const all = ["Counting sort", "Radix sort", "Bucket sort", "A comparison sort (merge sort)"];
      return {
        prompt: `Which sort fits best: ${s.text}?`,
        answer: choice(r, s.answer, all.filter((x) => x !== s.answer)),
        steps: [s.why],
      };
    },
  },
];
