/**
 * Drills for CS 146 · Hash tables: division hashing, collisions, chaining
 * with insert at head, load factor, resize trigger, multiplication hashing,
 * and the library analogy's letters-mod-10 rule.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs146/11-hash-tables";

function distinct(r: Rng, n: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const v = r.int(lo, hi);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

const TITLES = ["Hamlet", "Moby Dick", "Emma", "Beloved", "Frankenstein", "Jane Eyre", "Ulysses", "The Hobbit", "Middlemarch", "Walden", "Persuasion", "Dune"];

export const drills: Drill[] = [
  {
    id: "library!cubby",
    guideId: G,
    sectionRef: "library",
    title: "Which cubby?",
    skill: "Run the librarian's rule: count the letters (no spaces), take mod 10.",
    gen(r) {
      const t = r.pick(TITLES);
      const n = t.replace(/\s/g, "").length;
      return {
        prompt: `With Poon's Phase 2 rule (letters mod 10, spaces don't count), which cubby does *${t}* go to?`,
        answer: { kind: "number", value: n % 10 },
        steps: [`'${t}' has ${n} letters.`, `${n} mod 10 = ${n % 10}.`],
        hint: "Count only letters, then keep the last digit.",
        diagnose: (s) => (Number(s) === n ? `${n} is the letter count; the cubby is that count mod 10.` : undefined),
      };
    },
  },
  {
    id: "division!slot",
    guideId: G,
    sectionRef: "division",
    title: "Hash by division",
    skill: "Compute h(k) = k mod m for any key and table size.",
    gen(r) {
      const m = r.pick([7, 10, 11, 13, 16]);
      const k = r.int(20, 250);
      const q = Math.floor(k / m);
      return {
        prompt: `m = ${m}. What is h(${k}) = ${k} mod ${m}?`,
        answer: { kind: "number", value: k % m },
        steps: [`${m} × ${q} = ${m * q}.`, `${k} − ${m * q} = ${k % m}.`, `h(${k}) = ${k % m}.`],
        hint: "Find the biggest multiple of m that fits, then take what's left over.",
        diagnose: (s) => (Number(s) === q ? `${q} is the quotient (how many times ${m} fits). mod wants the remainder.` : Number(s) >= m ? `A slot is always between 0 and ${m - 1}.` : undefined),
      };
    },
  },
  {
    id: "division!collide",
    guideId: G,
    sectionRef: "division",
    title: "Spot the collision",
    skill: "Hash a list of keys and find the two that share a slot.",
    gen(r) {
      const m = 10;
      const slot = r.int(0, 9);
      const a = slot + 10 * r.int(1, 4);
      let b = slot + 10 * r.int(5, 9);
      const others = distinct(r, 2, 10, 99).filter((x) => x % 10 !== slot);
      while (others.length < 2) others.push((slot + 3 + others.length) % 10 + 10 * r.int(1, 9));
      if (b === a) b += 10;
      const keys = r.shuffle([a, b, ...others.slice(0, 2)]);
      const ans = `${Math.min(a, b)} and ${Math.max(a, b)}`;
      const wrong = [`${keys[0]} and ${keys[1]}`, `${keys[2]} and ${keys[3]}`, "No collision"].filter((w) => w !== ans && w !== `${Math.max(a, b)} and ${Math.min(a, b)}`);
      return {
        prompt: `m = ${m}, h(k) = k mod 10. Insert ${keys.join(", ")}. Which two keys collide?`,
        answer: choice(r, ans, wrong.slice(0, 3)),
        steps: keys.map((k) => `h(${k}) = ${k % m}`).concat([`${a} and ${b} both land in slot ${slot}.`]),
      };
    },
  },
  {
    id: "chaining!chain",
    guideId: G,
    sectionRef: "chaining",
    title: "Build the chain",
    skill: "Chaining with insert at head: write the chain for one slot after a sequence of inserts.",
    gen(r) {
      const slot = r.int(0, 9);
      const n = r.int(3, 4);
      const ks = distinct(r, n, 1, 9).map((d) => d * 10 + slot);
      const filler = distinct(r, 2, 10, 99).filter((x) => x % 10 !== slot);
      const seq = r.shuffle([...ks, ...filler]);
      const chainKeys = seq.filter((k) => k % 10 === slot).reverse();
      return {
        prompt: `m = 10, chaining, insert at head. Insert ${seq.join(", ")} in that order. Write chain ${slot} from head to tail.`,
        answer: { kind: "sequence", items: chainKeys.map(String), placeholder: "e.g. 52, 32, 12" },
        steps: [
          `Keys that hash to ${slot}: ${seq.filter((k) => k % 10 === slot).join(", ")} (in insert order).`,
          "Each new one goes to the FRONT, so the last inserted is first.",
          `Chain ${slot}: ${chainKeys.join(" → ")}.`,
        ],
        diagnose: (s) => {
          const got = s.split(/[,→>\s]+/).filter(Boolean).join(",");
          return got === [...chainKeys].reverse().join(",") ? "That's insert-at-TAIL order. With insert at head, the newest key is first." : undefined;
        },
      };
    },
  },
  {
    id: "runtime!alpha",
    guideId: G,
    sectionRef: "runtime",
    title: "Load factor",
    skill: "Compute α = n / m.",
    gen(r) {
      const m = r.pick([8, 10, 16, 20, 25]);
      const n = r.int(4, 60);
      const a = n / m;
      return {
        prompt: `A chained hash table has m = ${m} slots and n = ${n} pairs. What is the load factor α? (up to 2 decimals)`,
        answer: { kind: "number", value: Math.round(a * 100) / 100, tolerance: 0.011 },
        steps: [`α = n / m = ${n} / ${m} = ${a.toFixed(2)}.`, `A search walks about ${a.toFixed(1)} nodes on average.`],
        diagnose: (s) => (Math.abs(Number(s) - m / n) < 0.02 ? "That's m / n, upside down. α = n / m." : undefined),
      };
    },
  },
  {
    id: "runtime!resize",
    guideId: G,
    sectionRef: "runtime",
    title: "When does it resize?",
    skill: "Find which insert pushes α above α_max, and the new table size.",
    gen(r) {
      const m = r.pick([4, 8, 10, 16, 20]);
      const amax = 0.75;
      let n = 1;
      while (n / m <= amax) n++;
      return {
        prompt: `α_max = 0.75 and the table starts with m = ${m}, empty. Which insert (the n-th) is the first to push α above 0.75?`,
        answer: { kind: "number", value: n },
        steps: [`${n - 1}/${m} = ${((n - 1) / m).toFixed(3)} ≤ 0.75, still fine.`, `${n}/${m} = ${(n / m).toFixed(3)} > 0.75, so insert #${n} triggers the resize to m = ${2 * m}.`],
      };
    },
  },
  {
    id: "multiplication!h",
    guideId: G,
    sectionRef: "multiplication",
    title: "Hash by multiplication",
    skill: "Compute ⌊m · (kA mod 1)⌋ in three steps.",
    gen(r) {
      const A = r.pick([0.25, 0.5, 0.75, 0.618, 0.2]);
      const m = r.pick([10, 100, 1000]);
      const k = r.int(2, 40);
      const prod = k * A;
      const frac = prod - Math.floor(prod);
      const h = Math.floor(m * frac + 1e-9);
      return {
        prompt: `m = ${m}, A = ${A}. What is h(${k}) = ⌊m · (k·A mod 1)⌋?`,
        answer: { kind: "number", value: h },
        steps: [`k·A = ${k} × ${A} = ${+prod.toFixed(4)}.`, `Fractional part: ${+frac.toFixed(4)}.`, `m × ${+frac.toFixed(4)} = ${+(m * frac).toFixed(3)} → floor → ${h}.`],
        diagnose: (s) => (Number(s) === Math.floor(m * prod) ? "You skipped 'mod 1': keep only the fractional part of k·A before scaling." : undefined),
      };
    },
  },
];
