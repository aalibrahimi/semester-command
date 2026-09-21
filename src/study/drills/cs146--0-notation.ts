/**
 * Drills for CS 146 · Notation: logs as halvings, Σ as a loop, and reading
 * Big-O off a polynomial.
 */
import type { Drill } from "../drill";
import { choice, fmt } from "../drill";

const G = "cs146/0-notation";

export const drills: Drill[] = [
  {
    id: "log!halvings",
    guideId: G,
    sectionRef: "log",
    title: "log as halvings",
    skill: "log_b n is how many times you can divide n by b before hitting 1.",
    gen(r) {
      const b = r.pick([2, 2, 2, 3, 4, 10]);
      const k = r.int(2, b === 2 ? 12 : 5);
      const n = b ** k;
      const mode = r.next() < 0.7;
      if (mode)
        return {
          prompt: `What is **log${b === 2 ? "₂" : b === 3 ? "₃" : b === 4 ? "₄" : "₁₀"} ${fmt(n)}**?`,
          answer: { kind: "number", value: k },
          steps: [`Ask: ${b} to what power is ${fmt(n)}?`, `${b}^${k} = ${fmt(n)}, so the answer is ${k}. Equivalently, ${fmt(n)} can be divided by ${b} exactly ${k} times before reaching 1.`],
          hint: `Keep dividing by ${b} and count.`,
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.-]/g, ""));
            if (v === n / b) return `You divided once. log counts *how many* divisions by ${b} it takes to reach 1.`;
            if (v === k - 1 || v === k + 1) return "Off by one. Count divisions until the value is 1, not until it is below 1 or still above 1.";
            return undefined;
          },
        };
      const m = 2 ** r.int(3, 10);
      const which = r.pick(["half", "double"]);
      return {
        prompt: `log₂ ${fmt(m)} = ${Math.log2(m)}. Without a calculator, what is **log₂ ${fmt(which === "half" ? m / 2 : m * 2)}**?`,
        answer: { kind: "number", value: which === "half" ? Math.log2(m) - 1 : Math.log2(m) + 1 },
        steps: [`${which === "half" ? "Halving" : "Doubling"} the argument ${which === "half" ? "removes" : "adds"} one halving.`, `log₂(${fmt(m)}${which === "half" ? "/2" : "·2"}) = log₂ ${fmt(m)} ${which === "half" ? "− 1" : "+ 1"} = ${which === "half" ? Math.log2(m) - 1 : Math.log2(m) + 1}.`],
        hint: "log(xy) = log x + log y, and log 2 = 1.",
      };
    },
  },
  {
    id: "sum!gauss",
    guideId: G,
    sectionRef: "sum",
    title: "The staircase sum",
    skill: "1 + 2 + … + n = n(n+1)/2, read off a Σ or a nested loop.",
    gen(r) {
      const n = r.pick([10, 20, 50, 99, 100, 200, 1000, 7, 15]);
      const upto = r.next() < 0.5 ? n : n - 1;
      const val = (upto * (upto + 1)) / 2;
      const asLoop = r.next() < 0.4;
      return {
        prompt: asLoop
          ? `How many times does \`sum += 1\` run?`
          : `Evaluate **Σ i for i = 1 to ${upto}** (that is, 1 + 2 + … + ${upto}).`,
        code: asLoop ? `for (int i = 0; i < ${upto + 1}; i++)\n  for (int j = 0; j < i; j++)\n    sum += 1;` : undefined,
        answer: { kind: "number", value: val },
        steps: [
          asLoop ? `For each i the inner loop runs i times: 0 + 1 + 2 + … + ${upto}.` : `The one identity to memorize: 1 + 2 + … + n = n(n+1)/2.`,
          `${upto}·${upto + 1}/2 = ${fmt(val)}.`,
        ],
        hint: "Pair the first and last terms: each pair sums to the same thing.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.-]/g, ""));
          if (v === upto * (upto + 1)) return "You forgot the /2. n(n+1) counts every pair twice.";
          if (v === (upto * (upto - 1)) / 2) return `That is 1 + … + ${upto - 1}. The sum runs up to ${upto} inclusive: n(n+1)/2 with n = ${upto}.`;
          if (v === upto * upto) return "n² is the square, not the staircase. The staircase is about half of that: n(n+1)/2.";
          return undefined;
        },
      };
    },
  },
  {
    id: "bigo!simplify",
    guideId: G,
    sectionRef: "bigo",
    title: "Simplest Big-O",
    skill: "Keep the fastest-growing term, drop its coefficient.",
    gen(r) {
      const terms = [
        { t: "n³", o: "O(n³)" },
        { t: "n²", o: "O(n²)" },
        { t: "n log n", o: "O(n log n)" },
        { t: "n", o: "O(n)" },
        { t: "log n", o: "O(log n)" },
        { t: "2ⁿ", o: "O(2ⁿ)" },
      ];
      const order = ["log n", "n", "n log n", "n²", "n³", "2ⁿ"];
      const picked = r.sample(terms, r.int(2, 3)).sort((a, b) => order.indexOf(b.t) - order.indexOf(a.t));
      const coefs = picked.map(() => r.int(2, 500));
      const f = picked.map((p, i) => `${coefs[i]}${p.t}`).join(" + ") + ` + ${r.int(1, 99)}`;
      const top = picked[0];
      const wrong = terms.filter((t) => t !== top).map((t) => t.o);
      return {
        prompt: `f(n) = **${f}**. What is the simplest Big-O?`,
        answer: choice(r, top.o, r.sample(wrong, 3), {
          correct: `The ${top.t} term grows fastest; the ${coefs[0]} is a constant factor and the rest is lower order.`,
        }),
        steps: [`Growth order: log n < n < n log n < n² < n³ < 2ⁿ.`, `Fastest term here: ${coefs[0]}${top.t}. Drop the coefficient and the lower-order terms: ${top.o}.`],
        hint: "Only the fastest-growing term survives, and constants in front never matter.",
      };
    },
  },
  {
    id: "bigo!constants",
    guideId: G,
    sectionRef: "bigo",
    title: "Find c and n₀",
    skill: "f(n) = O(g(n)) means f(n) ≤ c·g(n) for all n ≥ n₀: Poon's proof pattern.",
    gen(r) {
      const a = r.int(2, 9);
      const b = r.int(1, 30);
      const c = a + 1;
      const n0 = b; // a n + b <= (a+1) n  <=>  b <= n
      return {
        prompt: `Show **${a}n + ${b} = O(n)** with c = ${c}. What is the smallest whole n₀ that works, i.e. ${a}n + ${b} ≤ ${c}n for all n ≥ n₀?`,
        answer: { kind: "number", value: n0 },
        steps: [`Write the inequality: ${a}n + ${b} ≤ ${c}n.`, `Subtract ${a}n: ${b} ≤ n.`, `So it holds from n₀ = ${b} on.`],
        hint: "Move the n terms to one side and see what is left.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.-]/g, ""));
          if (v === 1) return `n₀ = 1 only works if ${a}·1 + ${b} ≤ ${c}·1, i.e. ${a + b} ≤ ${c}. It doesn't. Solve the inequality for n.`;
          if (v === b + 1) return "One too many: the inequality is ≤, so n = b itself already satisfies it.";
          return undefined;
        },
      };
    },
  },
];
