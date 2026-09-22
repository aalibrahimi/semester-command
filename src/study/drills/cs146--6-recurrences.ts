/**
 * Drills for CS 146 · Recurrences: write T(n) from a description, count
 * leaves and levels in the recursion tree, and apply the master method
 * (including the "does not apply" cases Poon grades).
 */
import type { Drill } from "../drill";
import { choice, fmt } from "../drill";

const G = "cs146/6-recurrences";

export const drills: Drill[] = [
  {
    id: "read!write",
    guideId: G,
    sectionRef: "read",
    title: "Write the recurrence",
    skill: "Subproblems × T(size) + work outside the calls.",
    gen(r) {
      const cases = [
        { d: "Split into two halves, recurse on both, then merge in linear time.", ok: "T(n) = 2T(n/2) + n", bad: ["T(n) = T(n/2) + n", "T(n) = 2T(n/2) + 1", "T(n) = 2T(n − 1) + n"] },
        { d: "Check the middle element, then recurse on one half (binary search).", ok: "T(n) = T(n/2) + 1", bad: ["T(n) = 2T(n/2) + 1", "T(n) = T(n/2) + n", "T(n) = T(n − 1) + 1"] },
        { d: "Do constant work, then recurse on the input minus one element.", ok: "T(n) = T(n − 1) + 1", bad: ["T(n) = T(n/2) + 1", "T(n) = T(n − 1) + n", "T(n) = 2T(n − 1) + 1"] },
        { d: "Scan the whole array (linear), then recurse on the input minus one element.", ok: "T(n) = T(n − 1) + n", bad: ["T(n) = T(n − 1) + 1", "T(n) = 2T(n/2) + n", "T(n) = T(n/2) + n"] },
        { d: "Split into three thirds, recurse on all three, then do linear work to combine.", ok: "T(n) = 3T(n/3) + n", bad: ["T(n) = T(n/3) + n", "T(n) = 3T(n/3) + 1", "T(n) = 3T(n/2) + n"] },
        { d: "Split in half, recurse on both halves, then do quadratic work to combine.", ok: "T(n) = 2T(n/2) + n²", bad: ["T(n) = 2T(n/2) + n", "T(n) = 4T(n/2) + n", "T(n) = 2T(n²) + n"] },
        { d: "Make two recursive calls each on the input minus one (naive Fibonacci shape), plus constant work.", ok: "T(n) = 2T(n − 1) + 1", bad: ["T(n) = 2T(n/2) + 1", "T(n) = T(n − 1) + 1", "T(n) = T(n − 1) + T(n − 2)"] },
      ];
      const c = r.pick(cases);
      return {
        prompt: `Write the recurrence: **${c.d}**`,
        answer: choice(r, c.ok, c.bad, { correct: "Number of calls × T(size of each) + the work done outside the calls." }),
        steps: ["Count the recursive calls (a), the size each gets (n/b or n−1), and the non-recursive work (f(n)).", `That gives ${c.ok}.`],
      };
    },
  },
  {
    id: "tree!counts",
    guideId: G,
    sectionRef: "tree",
    title: "Levels, leaves, and work per level",
    skill: "aT(n/b): level i has aⁱ nodes of size n/bⁱ; depth log_b n; leaves a^(log_b n).",
    gen(r) {
      const a = r.pick([1, 2, 2, 3, 4]);
      const b = r.pick([2, 2, 3]);
      const k = r.int(2, 4);
      const n = b ** k;
      const mode = r.pick(["levels", "leaves", "nodes"]);
      if (mode === "levels")
        return {
          prompt: `T(n) = ${a === 1 ? "" : a}T(n/${b}) + n, with n = ${n}. How many levels of recursion until size 1 (not counting level 0 as a step)?`,
          answer: { kind: "number", value: k },
          steps: [`Sizes: ${n} → ${n / b} → … → 1, dividing by ${b} each level.`, `log_${b} ${n} = ${k}.`],
        };
      if (mode === "leaves")
        return {
          prompt: `T(n) = ${a === 1 ? "" : a}T(n/${b}) + n, with n = ${n}. How many leaves (size-1 subproblems) does the recursion tree have?`,
          answer: { kind: "number", value: a ** k },
          steps: [`Depth = log_${b} ${n} = ${k}. Each level multiplies the node count by ${a}.`, `Leaves = ${a}^${k} = ${fmt(a ** k)}. In general a^(log_b n) = n^(log_b a).`],
          hint: "Nodes multiply by a per level; count the levels first.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.-]/g, ""));
            if (v === n && a !== b) return `n leaves only when a = b (as in merge sort). Here a = ${a}, b = ${b}: leaves = ${a}^${k}.`;
            if (v === a * k) return "You multiplied a by the depth. Each level multiplies by a, so it is a raised to the depth.";
            return undefined;
          },
        };
      const i = r.int(1, k);
      const okText = `${a ** i} subproblems of size ${n / b ** i}`;
      const cands = [
        `${a * i} subproblems of size ${n / b ** i}`,
        `${a ** i} subproblems of size ${n / (b * i)}`,
        `${b ** i} subproblems of size ${n / a ** i || n}`,
        `${a ** i} subproblems of size ${n}`,
        `${a ** (i + 1)} subproblems of size ${n / b ** i}`,
        `1 subproblem of size ${n / b ** i}`,
      ].filter((c, idx, arr) => c !== okText && arr.indexOf(c) === idx);
      return {
        prompt: `T(n) = ${a === 1 ? "" : a}T(n/${b}) + n, with n = ${n}. At level ${i}, how many subproblems are there, and what size is each?`,
        answer: choice(r, okText, cands.slice(0, 3), {
          correct: `Level i has aⁱ nodes, each of size n/bⁱ: ${a}^${i} = ${a ** i}, ${n}/${b}^${i} = ${n / b ** i}.`,
        }),
        steps: [`Each level: ×${a} nodes, ÷${b} size.`, `Level ${i}: ${a ** i} nodes of size ${n / b ** i}. Work at that level: ${a ** i} × ${n / b ** i} = ${(a ** i * n) / b ** i}.`],
      };
    },
  },
  {
    id: "master!case",
    guideId: G,
    sectionRef: "master",
    title: "Master method: which case, what answer",
    skill: "Compare f(n) to n^(log_b a); polynomially smaller, equal, or larger; or say 'does not apply'.",
    gen(r) {
      const cases = [
        { t: "T(n) = 2T(n/2) + n", w: "n¹ = n", cmp: "equal", ans: "Θ(n log n)", note: "Case 2: merge sort." },
        { t: "T(n) = 2T(n/2) + 1", w: "n", cmp: "f smaller", ans: "Θ(n)", note: "Case 1: leaves dominate." },
        { t: "T(n) = 2T(n/2) + n²", w: "n", cmp: "f larger", ans: "Θ(n²)", note: "Case 3: the root dominates (regularity holds)." },
        { t: "T(n) = T(n/2) + 1", w: "n⁰ = 1", cmp: "equal", ans: "Θ(log n)", note: "Case 2: binary search." },
        { t: "T(n) = 4T(n/2) + n", w: "n² (log₂ 4 = 2)", cmp: "f smaller", ans: "Θ(n²)", note: "Case 1." },
        { t: "T(n) = 4T(n/2) + n²", w: "n²", cmp: "equal", ans: "Θ(n² log n)", note: "Case 2." },
        { t: "T(n) = 8T(n/2) + n²", w: "n³ (log₂ 8 = 3)", cmp: "f smaller", ans: "Θ(n³)", note: "Case 1." },
        { t: "T(n) = 3T(n/3) + n", w: "n¹ = n", cmp: "equal", ans: "Θ(n log n)", note: "Case 2." },
        { t: "T(n) = T(n/2) + n", w: "n⁰ = 1", cmp: "f larger", ans: "Θ(n)", note: "Case 3." },
        { t: "T(n) = 9T(n/3) + n", w: "n² (log₃ 9 = 2)", cmp: "f smaller", ans: "Θ(n²)", note: "Case 1." },
        { t: "T(n) = 2T(n/2) + n/log n", w: "n", cmp: "gap not polynomial", ans: "Does not apply", note: "f is smaller than n only by a log factor: between Case 1 and Case 2. The graded answer is 'does not apply'." },
        { t: "T(n) = T(n − 1) + 1", w: "not the shape", cmp: "not aT(n/b)", ans: "Does not apply", note: "Subtracting, not dividing. Unroll it instead: Θ(n)." },
        { t: "T(n) = n·T(n/2) + n²", w: "not the shape", cmp: "a is not constant", ans: "Does not apply", note: "a must be a constant ≥ 1." },
      ];
      const c = r.pick(cases);
      const answers = ["Θ(n)", "Θ(n log n)", "Θ(n²)", "Θ(n² log n)", "Θ(n³)", "Θ(log n)", "Does not apply"].filter((x) => x !== c.ans);
      return {
        prompt: `**${c.t}**. By the master method, T(n) = ?`,
        answer: choice(r, c.ans, r.sample(answers, 3), { correct: `Watershed n^(log_b a) = ${c.w}; f(n) is ${c.cmp}. ${c.note}` }),
        steps: [
          "First check the shape: constant a ≥ 1, b > 1, subproblem exactly n/b. If not, the theorem is silent.",
          `Watershed: n^(log_b a) = ${c.w}.`,
          `Compare f(n): ${c.cmp}. ${c.note}`,
        ],
        hint: "Compute log_b a first. Then ask whether f(n) is polynomially smaller, equal, or polynomially larger than n to that power.",
      };
    },
  },
  {
    id: "master!watershed",
    guideId: G,
    sectionRef: "master",
    title: "The watershed exponent",
    skill: "log_b a, computed exactly.",
    gen(r) {
      const pairs = [
        [2, 2, 1],
        [4, 2, 2],
        [8, 2, 3],
        [1, 2, 0],
        [3, 3, 1],
        [9, 3, 2],
        [16, 4, 2],
        [16, 2, 4],
        [27, 3, 3],
      ];
      const [a, b, e] = r.pick(pairs);
      return {
        prompt: `T(n) = ${a}T(n/${b}) + f(n). What is the exponent in the watershed n^(log_b a)? (Give log_${b} ${a}.)`,
        answer: { kind: "number", value: e },
        steps: [`log_${b} ${a}: ${b} to what power is ${a}?`, `${b}^${e} = ${a}, so the watershed is n^${e}${e === 0 ? " = 1" : e === 1 ? " = n" : ""}.`],
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.-]/g, ""));
          if (v === a / b) return "You divided a by b. The watershed uses log_b a: b raised to what gives a?";
          if (v === Math.log2(a) && b !== 2) return `That is log₂ ${a}. The base is b = ${b}.`;
          return undefined;
        },
      };
    },
  },

  {
    id: "unroll!value",
    guideId: G,
    sectionRef: "unroll",
    title: "Solve it by hand",
    skill: "T(n) = 2T(n/2) + n with T(1) = 1 gives n log₂ n + n; compute it for a real n.",
    gen(r) {
      const n = r.pick([2, 4, 8, 16, 32]);
      const k = Math.log2(n);
      const val = n * k + n;
      return {
        prompt: `T(n) = 2T(n/2) + n, T(1) = 1. Compute **T(${n})** exactly.`,
        answer: { kind: "number", value: val },
        steps: [
          "Work up from the base case: T(1) = 1.",
          ...Array.from({ length: k }, (_, i) => {
            const m = 2 ** (i + 1);
            const prev = (m / 2) * Math.log2(m / 2) + m / 2;
            return `T(${m}) = 2·T(${m / 2}) + ${m} = 2·${prev} + ${m} = ${m * Math.log2(m) + m}.`;
          }),
          `Pattern: T(n) = n·log₂ n + n. Here ${n}·${k} + ${n} = ${val}. The n log n is the levels × work per level; the extra n is the leaves.`,
        ],
        hint: "Start at T(1) = 1 and double up: T(2), T(4), …",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9]/g, ""));
          if (v === n * k) return `${n * k} is n log₂ n, the merging work. The leaves (T(1) = 1 each, ${n} of them) add another ${n}.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "substitution!step",
    guideId: G,
    sectionRef: "substitution",
    title: "Substitution: the moves",
    skill: "Guess, assume for the smaller input, substitute, and show it is ≤ c·(guess) for some c.",
    gen(r) {
      const qs = [
        { p: "Substitution for T(n) = 2T(n/2) + kn, guessing O(n log n). What do you assume?", ok: "T(n/2) ≤ c·(n/2)·log(n/2)", bad: ["T(n) ≤ c·n log n (the thing to prove)", "T(n/2) = n/2", "T(1) = c"] },
        { p: "After substituting: T(n) ≤ c·n·log(n/2) + kn. What is log(n/2)?", ok: "log n − 1", bad: ["(log n)/2", "log n − 2", "log n"] },
        { p: "You reach T(n) ≤ c·n log n − c·n + kn. What must hold for the guess to be confirmed?", ok: "−c·n + kn ≤ 0, i.e. c ≥ k", bad: ["c = k exactly", "c ≤ k", "k = 0"] },
        { p: "Binary search: T(n) = T(n/2) + 1, guess T(n) ≤ c·log n. After substitution you get T(n) ≤ c·log n − c + 1. Condition on c?", ok: "c ≥ 1", bad: ["c ≤ 1", "c = 0", "Any c works"] },
        { p: "What is the substitution method, at bottom?", ok: "Induction: the assumption for n/2 is the inductive hypothesis", bad: ["A tree drawing", "Trial and error with numbers", "The master theorem in disguise"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: ["Guess → assume for the smaller input → substitute → show ≤ c·guess for some c.", `Answer: ${q.ok}.`] };
    },
  },
];
