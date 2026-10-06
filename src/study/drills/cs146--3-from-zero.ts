/**
 * Drills for CS 146 · Lecture 3 from zero: count insertion sort's shifts on
 * a small array, place a key into a sorted hand, and turn halvings into
 * log n and n log n step counts.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "cs146/3-from-zero";

function shifts(arr: number[]): number {
  const a = [...arr];
  let s = 0;
  for (let j = 1; j < a.length; j++) {
    const key = a[j];
    let i = j - 1;
    while (i >= 0 && a[i] > key) {
      a[i + 1] = a[i];
      i--;
      s++;
    }
    a[i + 1] = key;
  }
  return s;
}

const list = (xs: number[]) => xs.join(", ");

export const drills: Drill[] = [
  {
    id: "count!shifts",
    guideId: G,
    sectionRef: "count",
    title: "Count the shifts",
    skill: "Run insertion sort by hand and count how many times an item slides right.",
    gen(r) {
      const n = r.int(4, 6);
      const a = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], n);
      const s = shifts(a);
      // per pass, for the worked steps
      const steps: string[] = [];
      const b = [...a];
      for (let j = 1; j < b.length; j++) {
        const key = b[j];
        let i = j - 1;
        const passed: number[] = [];
        while (i >= 0 && b[i] > key) {
          passed.push(b[i]);
          b[i + 1] = b[i];
          i--;
        }
        b[i + 1] = key;
        steps.push(`Key ${key}: slides past ${passed.length ? passed.join(", ") : "nothing"} → ${passed.length} shift${passed.length === 1 ? "" : "s"}. Hand: [${b.slice(0, j + 1).join(", ")}].`);
      }
      steps.push(`Total: ${s} shifts. (Reversed would be n(n−1)/2 = ${(n * (n - 1)) / 2}; sorted would be 0.)`);
      return {
        prompt: `Insertion sort on [${list(a)}]. How many shifts (items slid one spot right) does it make in total?`,
        answer: { kind: "number", value: s },
        steps,
        hint: "For each new key, count how many items in the hand are bigger than it. Those are exactly the ones it slides past.",
        diagnose: (x) => (Number(x) === (n * (n - 1)) / 2 && s !== Number(x) ? "That's the worst case formula. This array isn't reversed: count each key's bigger items." : undefined),
      };
    },
  },
  {
    id: "cards!place",
    guideId: G,
    sectionRef: "cards",
    title: "Where does the key go?",
    skill: "Insert one key into a sorted hand and give the new hand.",
    gen(r) {
      const hand = r.sample([2, 4, 6, 8, 10, 12, 14, 16, 18], r.int(3, 5)).sort((x, y) => x - y);
      let key = r.int(1, 19);
      while (hand.includes(key)) key = r.int(1, 19);
      const out = [...hand, key].sort((x, y) => x - y);
      const passed = hand.filter((h) => h > key);
      return {
        prompt: `The sorted hand is [${list(hand)}] and the key is ${key}. Write the hand after this pass.`,
        answer: { kind: "sequence", items: out.map(String) },
        steps: [passed.length ? `${key} slides left past ${[...passed].reverse().join(", ")} (each one moves one spot right).` : `${key} is bigger than everything in the hand: no shifts.`, `It drops into the gap: [${list(out)}].`],
        hint: "Only the cards bigger than the key move. The key lands right after the last card that is smaller.",
      };
    },
  },
  {
    id: "logs!steps",
    guideId: G,
    sectionRef: "logs",
    title: "log n or n log n?",
    skill: "Turn n into log₂ n and n log₂ n, and pick which one an algorithm costs.",
    gen(r) {
      const k = r.int(3, 10);
      const n = 2 ** k;
      const which = r.pick(["bs", "ms"] as const);
      const right = which === "bs" ? k : n * k;
      const wrong = which === "bs" ? [n * k, n, n * n] : [k, n, n * n];
      return {
        prompt:
          which === "bs"
            ? `Binary search on ${n.toLocaleString("en-US")} sorted items throws away half each look. About how many looks, in the worst case, as a power-of-2 count (log₂ n)?`
            : `Merge sort on ${n.toLocaleString("en-US")} items has log₂ n merge levels and touches all n items on each. How many steps is that (n log₂ n)?`,
        answer: choice(r, right.toLocaleString("en-US"), wrong.map((w) => w.toLocaleString("en-US"))),
        steps: [`log₂ ${n} = ${k}, because 2^${k} = ${n} (${k} halvings to get down to 1).`, which === "bs" ? `Binary search: one look per halving → about ${k} looks: O(log n).` : `Merge sort: ${k} levels × ${n} items = ${(n * k).toLocaleString("en-US")}: O(n log n).`],
        hint: which === "bs" ? "It keeps only ONE half each time." : "It keeps BOTH halves and merges all of them on every level.",
      };
    },
  },
];
