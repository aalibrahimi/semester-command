/**
 * Drills for CS 146 · AVL trees: the balance factor B = H(left) − H(right)
 * on a plain BST, naming the insert case (LL, LR, RR, RL), the root after a
 * run of AVL inserts, and the height an AVL tree keeps on sorted input.
 *
 * Poon's conventions: H(null) = −1, a leaf has H = 0; duplicates are
 * ignored; the insert case is picked by comparing the new key with the
 * heavy child's key.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs146/13-avl-trees";

interface N {
  k: number;
  l: N | null;
  r: N | null;
  h: number;
}

const H = (n: N | null) => (n ? n.h : -1);
const B = (n: N) => H(n.l) - H(n.r);
const fix = (n: N) => {
  n.h = 1 + Math.max(H(n.l), H(n.r));
};
function rightRotate(x: N): N {
  const y = x.l!;
  x.l = y.r;
  y.r = x;
  fix(x);
  fix(y);
  return y;
}
function leftRotate(x: N): N {
  const y = x.r!;
  x.r = y.l;
  y.l = x;
  fix(x);
  fix(y);
  return y;
}

/** AVL insert. `seen` collects the case of the one rotation set, if any. */
function avlInsert(t: N | null, k: number, seen: string[] = []): N {
  if (!t) return { k, l: null, r: null, h: 0 };
  if (k < t.k) t.l = avlInsert(t.l, k, seen);
  else if (k > t.k) t.r = avlInsert(t.r, k, seen);
  else return t;
  fix(t);
  const b = B(t);
  if (b > 1) {
    if (k < t.l!.k) {
      seen.push(`LL at ${t.k}`);
      return rightRotate(t);
    }
    seen.push(`LR at ${t.k}`);
    t.l = leftRotate(t.l!);
    return rightRotate(t);
  }
  if (b < -1) {
    if (k > t.r!.k) {
      seen.push(`RR at ${t.k}`);
      return leftRotate(t);
    }
    seen.push(`RL at ${t.k}`);
    t.r = rightRotate(t.r!);
    return leftRotate(t);
  }
  return t;
}
const avlBuild = (ks: number[]) => ks.reduce<N | null>((t, k) => avlInsert(t, k), null);

/** Plain BST insert (no balancing), heights kept. */
function bstInsert(t: N | null, k: number): N {
  if (!t) return { k, l: null, r: null, h: 0 };
  if (k < t.k) t.l = bstInsert(t.l, k);
  else t.r = bstInsert(t.r, k);
  fix(t);
  return t;
}
const bstBuild = (ks: number[]) => ks.reduce<N | null>((t, k) => bstInsert(t, k), null);

function nodes(t: N | null, out: N[] = []): N[] {
  if (t) {
    out.push(t);
    nodes(t.l, out);
    nodes(t.r, out);
  }
  return out;
}

const list = (xs: number[]) => xs.join(", ");
const sgn = (x: number) => (x < 0 ? `−${-x}` : String(x));

function distinctKeys(r: Rng, n: number): number[] {
  return r.sample(
    Array.from({ length: 98 }, (_, i) => i + 1),
    n,
  );
}

export const drills: Drill[] = [
  {
    id: "balance!b",
    guideId: G,
    sectionRef: "balance",
    title: "Compute B",
    skill: "Build a plain BST, then compute B(node) = H(left) − H(right) with H(null) = −1.",
    gen(r) {
      for (;;) {
        const keys = distinctKeys(r, r.int(5, 8));
        const t = bstBuild(keys)!;
        const candidates = nodes(t).filter((n) => n.l || n.r);
        if (!candidates.length) continue;
        // prefer an interesting node: unbalanced or with one missing child
        const pick = r.pick(candidates.filter((n) => Math.abs(B(n)) > 1 || !n.l || !n.r).length ? candidates.filter((n) => Math.abs(B(n)) > 1 || !n.l || !n.r) : candidates);
        const b = B(pick);
        return {
          prompt: `Insert ${list(keys)} (in that order) into an empty plain BST (no balancing). What is B(${pick.k}) = H(left) − H(right)?`,
          answer: { kind: "number", value: b },
          steps: [
            `${pick.k}'s left child: ${pick.l ? `${pick.l.k}, with H = ${pick.l.h}` : "none, so H(null) = −1"}.`,
            `${pick.k}'s right child: ${pick.r ? `${pick.r.k}, with H = ${pick.r.h}` : "none, so H(null) = −1"}.`,
            `B(${pick.k}) = ${sgn(H(pick.l))} − (${sgn(H(pick.r))}) = ${sgn(b)}. ${Math.abs(b) <= 1 ? "Balanced." : b > 1 ? "Left-heavy: an AVL tree would rotate here." : "Right-heavy: an AVL tree would rotate here."}`,
          ],
          hint: "H counts edges down to the deepest leaf. A missing child counts as −1, not 0.",
          diagnose(s) {
            const v = Number(String(s).replace("−", "-"));
            if (v === -b && b !== 0) return "Right sign flipped: Poon's B is LEFT minus RIGHT.";
            const h0 = (n: N | null) => (n ? n.h : 0);
            if (v === h0(pick.l) - h0(pick.r) && v !== b) return "A missing child has H = −1, not 0.";
            return undefined;
          },
        };
      }
    },
  },
  {
    id: "insert!case",
    guideId: G,
    sectionRef: "insert",
    title: "Name the case",
    skill: "Spot which insert causes an imbalance and name it LL, LR, RR or RL.",
    gen(r) {
      for (;;) {
        const keys = distinctKeys(r, r.int(3, 6));
        const t = avlBuild(keys.slice(0, -1));
        const seen: string[] = [];
        avlInsert(t, keys[keys.length - 1], seen);
        // the earlier inserts must not have rotated, so the shape is easy to draw
        const early: string[] = [];
        keys.slice(0, -1).reduce<N | null>((u, k) => avlInsert(u, k, early), null);
        if (seen.length !== 1 || early.length) continue;
        const [cs, , at] = seen[0].split(" ");
        const last = keys[keys.length - 1];
        const fixes: Record<string, string> = { LL: `rightRotate(${at})`, RR: `leftRotate(${at})`, LR: `leftRotate(${at}'s left child), then rightRotate(${at})`, RL: `rightRotate(${at}'s right child), then leftRotate(${at})` };
        return {
          prompt: `Insert ${list(keys)} (in that order) into an empty AVL tree. The last insert, ${last}, unbalances node ${at}. Which case is it?`,
          answer: choice(r, cs, ["LL", "LR", "RR", "RL"].filter((c) => c !== cs)),
          steps: [
            `Before ${last}, no rotation was needed: the tree is just the BST of ${list(keys.slice(0, -1))}.`,
            `${last} lands as a new leaf. Going back up, ${at} gets |B| = 2.`,
            `From ${at}, the path to ${last} goes ${cs[0] === "L" ? "left" : "right"}, then ${cs[1] === "L" ? "left" : "right"}: case ${cs}.`,
            `Fix: ${fixes[cs]}.`,
          ],
          hint: "Stand at the unbalanced node and say which way you step to reach the new key, twice.",
          diagnose(s) {
            const c = String(s).toUpperCase();
            if (c.length === 2 && c[0] === cs[1] && c[1] === cs[0] && c !== cs) return "You read the path bottom-up. Start at the unbalanced node and go DOWN toward the new key.";
            return undefined;
          },
        };
      }
    },
  },
  {
    id: "hw!root",
    guideId: G,
    sectionRef: "hw",
    title: "Who ends up on top?",
    skill: "Run a sequence of AVL inserts with rotations and find the final root.",
    gen(r) {
      for (;;) {
        const keys = distinctKeys(r, r.int(4, 7));
        const seen: string[] = [];
        let t: N | null = null;
        for (const k of keys) t = avlInsert(t, k, seen);
        if (!seen.length || t!.k === keys[0]) continue;
        return {
          prompt: `Insert ${list(keys)} (in that order) into an empty AVL tree. Which key is the root at the end?`,
          answer: { kind: "number", value: t!.k },
          steps: [...seen.map((s) => `Rotation: case ${s.replace(" at ", " at node ")}.`), `Final root: ${t!.k}.`],
          hint: "Insert one key at a time; after each, check B going back up and rotate the first unbalanced node you meet.",
          diagnose: (s) => (Number(s) === keys[0] ? `${keys[0]} was the first root, but a rotation moved it down. AVL trees don't keep the first key on top.` : undefined),
        };
      }
    },
  },
  {
    id: "runtime!height",
    guideId: G,
    sectionRef: "runtime",
    title: "Sorted input, balanced anyway",
    skill: "See that an AVL tree stays O(log n) tall on sorted input, where a BST would be a chain.",
    gen(r) {
      const n = r.int(4, 15);
      const keys = Array.from({ length: n }, (_, i) => i + 1);
      const t = avlBuild(keys)!;
      return {
        prompt: `Insert 1, 2, 3, …, ${n} in increasing order into an empty AVL tree. What is the root's height H at the end?`,
        answer: { kind: "number", value: t.h },
        steps: [
          `Every insert goes to the far right, so RR rotations keep firing and pull the middle up.`,
          `The result is as bushy as possible: H = ${t.h}, about log₂ ${n}.`,
          `A plain BST on the same input would be a chain with H = ${n - 1}.`,
        ],
        hint: "Try it for n = 3 first: 1, 2, 3 makes one RR rotation and 2 ends on top.",
        diagnose: (s) => (Number(s) === n - 1 ? "That's the plain BST's height (a chain). The AVL rotations keep it balanced." : Number(s) === t.h + 1 ? "Height counts edges, not nodes." : undefined),
      };
    },
  },
];
