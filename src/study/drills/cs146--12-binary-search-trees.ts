/**
 * Drills for CS 146 · Binary search trees: build a tree from an insertion
 * order, then trace the three traversals, a search path, where an insert
 * lands, what replaces a deleted node with two children, the successor of
 * a key, and the height of the finished tree.
 *
 * Every question starts from "insert these keys, in this order, into an
 * empty BST", the same setup as Homework 12, so the tree is never a
 * picture you have to trust: you build it yourself on paper.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs146/12-binary-search-trees";

/* ── A tiny BST, used only to generate questions ──────────────────────── */

interface N {
  k: number;
  l: N | null;
  r: N | null;
}

function insert(t: N | null, k: number): N {
  if (!t) return { k, l: null, r: null };
  if (k < t.k) t.l = insert(t.l, k);
  else t.r = insert(t.r, k);
  return t;
}
const build = (keys: number[]) => keys.reduce<N | null>((t, k) => insert(t, k), null);

function order(t: N | null, kind: "in" | "pre" | "post", out: number[] = []): number[] {
  if (!t) return out;
  if (kind === "pre") out.push(t.k);
  order(t.l, kind, out);
  if (kind === "in") out.push(t.k);
  order(t.r, kind, out);
  if (kind === "post") out.push(t.k);
  return out;
}

/** Height in edges; the empty tree is -1, a single node is 0. */
const height = (t: N | null): number => (t ? 1 + Math.max(height(t.l), height(t.r)) : -1);

/** Keys looked at by search(root, k), in order, and whether k was found. */
function searchPath(t: N | null, k: number): { path: number[]; found: boolean } {
  const path: number[] = [];
  while (t) {
    path.push(t.k);
    if (k === t.k) return { path, found: true };
    t = k < t.k ? t.l : t.r;
  }
  return { path, found: false };
}

function find(t: N | null, k: number): N | null {
  while (t && t.k !== k) t = k < t.k ? t.l : t.r;
  return t;
}

/** n distinct keys in 1..99, in an order that gives a bushy (not chain) tree. */
function bushyKeys(r: Rng, n: number, maxH: number): number[] {
  for (;;) {
    const pool = Array.from({ length: 99 }, (_, i) => i + 1);
    const keys = r.sample(pool, n);
    const t = build(keys);
    const h = height(t);
    if (h >= 2 && h <= maxH) return keys;
  }
}

const list = (xs: number[]) => xs.join(", ");
const nums = (s: string) => (s.match(/-?\d+/g) ?? []).map(Number);
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const TRAVERSAL_RULE: Record<"in" | "pre" | "post", string> = {
  in: "left subtree, node, right subtree",
  pre: "node, left subtree, right subtree",
  post: "left subtree, right subtree, node",
};

export const drills: Drill[] = [
  {
    id: "traversal!order",
    guideId: G,
    sectionRef: "traversal",
    title: "Write the traversal",
    skill: "Build a BST from an insertion order, then list its in-, pre- or post-order.",
    gen(r) {
      const keys = bushyKeys(r, r.int(6, 8), 4);
      const t = build(keys);
      const kind = r.pick(["in", "pre", "post"] as const);
      const want = order(t, kind);
      const name = `${kind}-order`;
      const other = (["in", "pre", "post"] as const).filter((x) => x !== kind);
      return {
        prompt: `Insert ${list(keys)} (in that order) into an empty BST. Write its ${name} traversal.`,
        answer: { kind: "sequence", items: want.map(String) },
        steps: [
          `Build it: ${keys[0]} is the root; each later key walks down (smaller left, bigger right) and becomes a leaf.`,
          `${name[0].toUpperCase() + name.slice(1)} means: ${TRAVERSAL_RULE[kind]}.`,
          `Result: ${list(want)}.`,
          kind === "in" ? "Check: in-order of a BST is always sorted." : `Check: ${kind === "pre" ? "pre-order starts" : "post-order ends"} with the root, ${keys[0]}.`,
        ],
        hint: kind === "in" ? "In-order of ANY BST is the keys in sorted order." : `Where does the root ${keys[0]} go: first or last?`,
        diagnose(s) {
          const got = nums(s);
          for (const o of other) if (same(got, order(t, o))) return `That is the ${o}-order. ${name} is ${TRAVERSAL_RULE[kind]}.`;
          if (same(got, keys)) return "That is the insertion order, not a traversal. Build the tree first, then walk it.";
          return undefined;
        },
      };
    },
  },
  {
    id: "search!path",
    guideId: G,
    sectionRef: "search",
    title: "Trace a search",
    skill: "List every node search(root, k) looks at, found or not.",
    gen(r) {
      const keys = bushyKeys(r, r.int(7, 9), 4);
      const t = build(keys);
      const hit = r.next() < 0.6;
      let k: number;
      if (hit) {
        // pick a deep key so the path is interesting
        const deep = keys.filter((x) => searchPath(t, x).path.length >= 3);
        k = r.pick(deep.length ? deep : keys);
      } else {
        do k = r.int(1, 99);
        while (keys.includes(k) || searchPath(t, k).path.length < 3);
      }
      const { path, found } = searchPath(t, k);
      const steps = path.map((x) => (x === k ? `${x}: found.` : `${x}: ${k} ${k < x ? "<" : ">"} ${x}, go ${k < x ? "left" : "right"}.`));
      if (!found) steps.push(`The next child is empty (NIL), so ${k} is not in the tree.`);
      return {
        prompt: `Insert ${list(keys)} (in that order) into an empty BST. Then run search(root, ${k}). List every key it looks at, in order.`,
        answer: { kind: "sequence", items: path.map(String) },
        steps,
        hint: "Start at the root. Compare, then go left if smaller, right if bigger. Stop at the key or at an empty spot.",
        diagnose(s) {
          const got = nums(s);
          if (got.length && got[0] !== keys[0]) return `Every search starts at the root, which is the first key inserted: ${keys[0]}.`;
          if (!found && got[got.length - 1] === k) return `${k} was never inserted, so the search can't look at it. It ends at the last real node.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "insert!parent",
    guideId: G,
    sectionRef: "insert",
    title: "Where does it land?",
    skill: "Walk the tree to find the new key's parent and which side it hangs on.",
    gen(r) {
      const keys = bushyKeys(r, r.int(6, 8), 4);
      const t = build(keys);
      let k: number;
      do k = r.int(1, 99);
      while (keys.includes(k) || searchPath(t, k).path.length < 3);
      const { path } = searchPath(t, k);
      const p = path[path.length - 1];
      const side = k < p ? "left" : "right";
      const ans = `${side} child of ${p}`;
      const wrong = new Set<string>([`${side === "left" ? "right" : "left"} child of ${p}`]);
      if (path.length >= 2) wrong.add(`${side} child of ${path[path.length - 2]}`);
      for (const x of r.shuffle(keys)) {
        if (wrong.size >= 3) break;
        if (x !== p) wrong.add(`${r.pick(["left", "right"])} child of ${x}`);
      }
      wrong.delete(ans);
      return {
        prompt: `Insert ${list(keys)} (in that order) into an empty BST. Now insert ${k}. Where does it go?`,
        answer: choice(r, ans, [...wrong].slice(0, 3)),
        steps: path.map((x) => `${x}: ${k} ${k < x ? "<" : ">"} ${x}, go ${k < x ? "left" : "right"}.`).concat([`That ${side} spot of ${p} is empty, so ${k} becomes the ${side} child of ${p}. A new key is always a leaf.`]),
        hint: "Insert is a search that fails: follow the search for the key, and it goes where the search falls off.",
      };
    },
  },
  {
    id: "delete!replace",
    guideId: G,
    sectionRef: "delete",
    title: "Delete with two children",
    skill: "Find the successor that replaces a deleted node with two children.",
    gen(r) {
      for (;;) {
        const keys = bushyKeys(r, r.int(7, 9), 4);
        const t = build(keys);
        const two = keys.filter((x) => {
          const n = find(t, x);
          return n && n.l && n.r;
        });
        if (!two.length) continue;
        const d = r.pick(two);
        const n = find(t, d)!;
        let s = n.r!;
        const walk = [s.k];
        while (s.l) {
          s = s.l;
          walk.push(s.k);
        }
        const succ = s.k;
        let pred = n.l!;
        while (pred.r) pred = pred.r;
        return {
          prompt: `Insert ${list(keys)} (in that order) into an empty BST. Now delete ${d}, which has two children. Using Poon's method, which key takes ${d}'s place?`,
          answer: { kind: "number", value: succ },
          steps: [
            `${d} has two children, so replace it with its successor: the minimum of its right subtree.`,
            `Go right once to ${n.r!.k}, then left as far as possible: ${walk.join(" → ")}.`,
            `The successor is ${succ}. Copy ${succ} into ${d}'s spot, then delete the old ${succ} node (it has no left child, so that delete is an easy case).`,
          ],
          hint: "Right once, then left all the way down.",
          diagnose(s) {
            const v = Number(s);
            if (v === pred.k) return `${pred.k} is the predecessor (max of the LEFT subtree). That also keeps the order, but Poon's method uses the successor.`;
            if (v === n.r!.k && v !== succ) return `${v} is only the right child. Keep going left from there until you can't.`;
            if (v === n.l!.k) return "The left child would leave its own right subtree out of order.";
            return undefined;
          },
        };
      }
    },
  },
  {
    id: "search!successor",
    guideId: G,
    sectionRef: "search",
    title: "Find the successor",
    skill: "Find the next bigger key using the two successor cases.",
    gen(r) {
      const keys = bushyKeys(r, r.int(7, 9), 4);
      const t = build(keys);
      const sorted = order(t, "in");
      const k = r.pick(sorted.slice(0, -1));
      const n = find(t, k)!;
      const succ = sorted[sorted.indexOf(k) + 1];
      const steps: string[] = [];
      if (n.r) {
        let s = n.r;
        const walk = [s.k];
        while (s.l) {
          s = s.l;
          walk.push(s.k);
        }
        steps.push(`Case 1: ${k} has a right child, so the successor is the minimum of that right subtree.`, `Right once, then left all the way: ${walk.join(" → ")}.`);
      } else {
        const path = searchPath(t, k).path;
        // Poon's top-down Case 2 (updated Lecture 12 slides): search from the
        // root; each LEFT step makes that node the candidate.
        steps.push(`Case 2: ${k} has no right child. Search from the root toward ${k}; every LEFT step makes that node the candidate.`);
        for (const x of path.slice(0, -1)) {
          steps.push(k < x ? `${k} < ${x}: step left, candidate = ${x}.` : `${k} > ${x}: step right, candidate unchanged.`);
        }
        steps.push(`Reached ${k}: the last candidate is the successor.`);
      }
      steps.push(`Successor of ${k} = ${succ}. Check: it's the next number after ${k} in sorted order.`);
      return {
        prompt: `Insert ${list(keys)} (in that order) into an empty BST. What is the successor of ${k}?`,
        answer: { kind: "number", value: succ },
        steps,
        hint: "The successor is simply the next bigger key. The tree just tells you how to find it without sorting.",
        diagnose(s) {
          const v = Number(s);
          if (n.r && v === n.r.k && v !== succ) return `${v} is the right child. From there, keep going left until you can't.`;
          if (v === sorted[sorted.indexOf(k) - 1]) return "That's the predecessor (next smaller). The successor is next bigger.";
          return undefined;
        },
      };
    },
  },
  {
    id: "runtime!height",
    guideId: G,
    sectionRef: "runtime",
    title: "How tall is it?",
    skill: "Build a BST and count its height in edges, including the sorted-input worst case.",
    gen(r) {
      const sortedCase = r.next() < 0.25;
      const keys = sortedCase ? Array.from({ length: r.int(5, 8) }, (_, i) => 10 * (i + 1) + r.int(0, 5)) : bushyKeys(r, r.int(6, 9), 5);
      const t = build(keys);
      const h = height(t);
      const deepest = order(t, "in").reduce((best, x) => (searchPath(t, x).path.length > searchPath(t, best).path.length ? x : best), keys[0]);
      return {
        prompt: `Insert ${list(keys)} (in that order) into an empty BST. What is its height (edges on the longest root-to-leaf path)?`,
        answer: { kind: "number", value: h },
        steps: sortedCase
          ? [`The keys arrive in increasing order, so every key goes right: the tree is a chain.`, `${keys.length} nodes in a chain have ${keys.length - 1} edges, so the height is ${h} = n − 1.`]
          : [`Build it; the deepest leaf is ${deepest}.`, `Path: ${searchPath(t, deepest).path.join(" → ")}.`, `That's ${h} edges, so the height is ${h}.`],
        hint: "Height counts edges, not nodes. A single node has height 0.",
        diagnose: (s) => (Number(s) === h + 1 ? "You counted nodes on the path. Height counts the edges between them, one fewer." : undefined),
      };
    },
  },
];
