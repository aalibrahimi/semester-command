/**
 * Drills for CS 154 · DFAs: trace a machine, decide accept/reject, read a
 * language off a machine, the λ and totality checks, and the 5-tuple.
 * Machines are generated over Chen's celebrity alphabet Σ = {a, b}.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs154/5-dfa";

interface Machine {
  states: string[];
  start: string;
  accept: string[];
  /** delta[state][symbol] */
  delta: Record<string, Record<string, string>>;
  describe: string;
  /** Set-builder description of L(M). */
  lang: string;
}

/** A few named machines with known languages, plus random 3-state ones. */
function known(r: Rng): Machine {
  const ms: Machine[] = [
    {
      states: ["q0", "q1"],
      start: "q0",
      accept: ["q0"],
      delta: { q0: { a: "q1", b: "q0" }, q1: { a: "q0", b: "q1" } },
      describe: "q0 (initial, accepting) —a→ q1, q0 —b→ q0; q1 —a→ q0, q1 —b→ q1",
      lang: "{ w ∈ {a,b}∗ | w has an even number of a's }",
    },
    {
      states: ["q0", "q1", "q2"],
      start: "q0",
      accept: ["q1"],
      delta: { q0: { a: "q1", b: "q2" }, q1: { a: "q1", b: "q1" }, q2: { a: "q2", b: "q2" } },
      describe: "q0 (initial) —a→ q1, q0 —b→ q2; q1 (accepting) loops on a, b; q2 loops on a, b",
      lang: "{ aw | w ∈ Σ∗ } (strings that start with a)",
    },
    {
      states: ["q0", "q1", "q2"],
      start: "q0",
      accept: ["q2"],
      delta: { q0: { a: "q1", b: "q0" }, q1: { a: "q1", b: "q2" }, q2: { a: "q1", b: "q0" } },
      describe: "q0 (initial) —a→ q1, q0 —b→ q0; q1 —a→ q1, q1 —b→ q2; q2 (accepting) —a→ q1, q2 —b→ q0",
      lang: "{ wab | w ∈ Σ∗ } (strings that end in ab)",
    },
    {
      states: ["q0", "q1", "q2"],
      start: "q0",
      accept: ["q2"],
      delta: { q0: { a: "q0", b: "q1" }, q1: { a: "q0", b: "q2" }, q2: { a: "q2", b: "q2" } },
      describe: "q0 (initial) —a→ q0, q0 —b→ q1; q1 —a→ q0, q1 —b→ q2; q2 (accepting) loops on a, b",
      lang: "{ w ∈ Σ∗ | w contains bb }",
    },
    {
      states: ["q0", "q1", "q2"],
      start: "q0",
      accept: ["q0"],
      delta: { q0: { a: "q1", b: "q2" }, q1: { a: "q2", b: "q2" }, q2: { a: "q2", b: "q2" } },
      describe: "q0 (initial, accepting) —a→ q1, q0 —b→ q2; q1 —a, b→ q2; q2 loops on a, b",
      lang: "{λ} (only the empty string)",
    },
    {
      states: ["q0", "q1", "hell"],
      start: "q0",
      accept: ["q0"],
      delta: { q0: { a: "hell", b: "q1" }, q1: { a: "q0", b: "hell" }, hell: { a: "hell", b: "hell" } },
      describe: "q0 (initial, accepting) —b→ q1, q0 —a→ hell; q1 —a→ q0, q1 —b→ hell; hell loops on a, b",
      lang: "{ (ba)ⁿ | n ≥ 0 }",
    },
  ];
  return r.pick(ms);
}

function run(m: Machine, w: string): string[] {
  const path = [m.start];
  let s = m.start;
  for (const c of w) {
    s = m.delta[s][c];
    path.push(s);
  }
  return path;
}

function randomString(r: Rng, lo: number, hi: number): string {
  const n = r.int(lo, hi);
  let w = "";
  for (let i = 0; i < n; i++) w += r.pick(["a", "b"]);
  return w;
}

const show = (w: string) => (w === "" ? "λ" : w);

export const drills: Drill[] = [
  {
    id: "workflow!trace",
    guideId: G,
    sectionRef: "workflow",
    title: "Trace the run",
    skill: "Start configuration, one transition per symbol, the state after each: the workflow Chen grades.",
    gen(r) {
      const m = known(r);
      const w = randomString(r, 3, 5);
      const path = run(m, w);
      return {
        prompt: `M: ${m.describe}. Run M on **${w}**. List the state after each symbol, in order (start with the initial state).`,
        answer: { kind: "sequence", items: path, placeholder: "e.g. q0, q1, q1, q2" },
        steps: [
          `Start configuration: state ${m.start}, cursor on the first symbol.`,
          ...w.split("").map((c, i) => `Read ${c}: (${path[i]}, ${c}) → ${path[i + 1]}.`),
          `All symbols consumed, halted in ${path[path.length - 1]}: ${m.accept.includes(path[path.length - 1]) ? "accepting, so M accepts " + w : "not accepting, so M rejects " + w}.`,
        ],
        hint: "Look up (current state, current symbol) in δ, move, consume. Never go back.",
        diagnose(input) {
          const got = input.split(/[,;→>\s]+/).filter(Boolean);
          if (got.length === path.length - 1 && got.every((g, i) => g === path[i + 1])) return "Your transitions are right, but the list should begin with the initial state (the state before any symbol is read).";
          if (got.length !== path.length) return `A run on ${w.length} symbols visits ${w.length + 1} states: the start state plus one per symbol. You listed ${got.length}.`;
          const first = got.findIndex((g, i) => g !== path[i]);
          if (first > 0) return `Correct up to ${path[first - 1]}. Then the symbol is ${w[first - 1]}, and δ(${path[first - 1]}, ${w[first - 1]}) = ${path[first]}, not ${got[first]}.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "workflow!accept",
    guideId: G,
    sectionRef: "workflow",
    title: "Accept or reject?",
    skill: "Accept iff all symbols consumed AND the final state is accepting (Chen's ♥ sentence).",
    gen(r) {
      const m = known(r);
      const w = r.next() < 0.15 ? "" : randomString(r, 1, 5);
      const path = run(m, w);
      const last = path[path.length - 1];
      const acc = m.accept.includes(last);
      return {
        prompt: `M: ${m.describe}. Does M accept **${show(w)}**?`,
        answer: choice(r, acc ? "Accept" : "Reject", [acc ? "Reject" : "Accept"], {
          correct: `The run ends in ${last}, which is ${acc ? "" : "not "}an accepting state.`,
          wrong: [acc ? `The run ends in ${last}, an accepting state, with every symbol consumed. Both halves of the ♥ sentence hold.` : `The run ends in ${last}, which is not accepting. Consuming every symbol is necessary but not sufficient.`],
        }),
        steps: [`Trace: ${path.join(" → ")}.`, `Halts in ${last}. ${acc ? "Accepting" : "Not accepting"} → ${acc ? "accept" : "reject"}.`, w === "" ? "λ has no symbols: the run never leaves the initial state, so λ ∈ L(M) exactly when the initial state is accepting." : "Acceptance is decided only where the run ENDS."],
      };
    },
  },
  {
    id: "analyze!language",
    guideId: G,
    sectionRef: "analyze",
    title: "Read L(M) off the machine",
    skill: "Follow the accepting walks; loops become exponents; name the language in set-builder.",
    gen(r) {
      const m = known(r);
      const others = [
        "{ w ∈ {a,b}∗ | w has an even number of a's }",
        "{ aw | w ∈ Σ∗ } (strings that start with a)",
        "{ wab | w ∈ Σ∗ } (strings that end in ab)",
        "{ w ∈ Σ∗ | w contains bb }",
        "{λ} (only the empty string)",
        "{ (ba)ⁿ | n ≥ 0 }",
        "{ w ∈ {a,b}∗ | w has an odd number of a's }",
        "Σ∗ (every string)",
      ].filter((x) => x !== m.lang);
      return {
        prompt: `M: ${m.describe}. What is L(M)?`,
        answer: choice(r, m.lang, r.sample(others, 3), { correct: "Every walk from the initial state that ends in an accepting state is a family of strings; together they are L(M)." }),
        steps: [`Start at ${m.start}. Accepting states: ${m.accept.join(", ")}.`, `Ask which strings end there: test λ, a, b, ab, ba, aa, bb against the transitions.`, `The pattern that fits is ${m.lang}.`],
        hint: "Test a few short strings, including λ. Which ones end in a double circle?",
      };
    },
  },
  {
    id: "design!lambda",
    guideId: G,
    sectionRef: "design",
    title: "The λ check",
    skill: "λ ∈ L exactly when the initial state is accepting: the bug that costs the most points.",
    gen(r) {
      const langs = [
        { l: "{ aw | w ∈ Σ∗ }", inL: false, why: "λ does not start with a (it has no first symbol)" },
        { l: "{ w | w has an even number of a's }", inL: true, why: "zero a's is an even number" },
        { l: "{ (ab)ⁿ | n ≥ 0 }", inL: true, why: "n = 0 gives λ" },
        { l: "{ (ab)ⁿ | n ≥ 1 }", inL: false, why: "n starts at 1, so the shortest string is ab" },
        { l: "{ w | w contains bb }", inL: false, why: "λ contains nothing" },
        { l: "Σ⁺", inL: false, why: "Σ⁺ excludes λ by definition" },
        { l: "{ w | |w| is a multiple of 3 }", inL: true, why: "|λ| = 0, and 0 is a multiple of 3" },
        { l: "{ w | w ends in b }", inL: false, why: "λ has no last symbol" },
      ];
      const c = r.pick(langs);
      const yes = "Yes, so the initial state must be accepting";
      const no = "No, so the initial state must NOT be accepting";
      return {
        prompt: `You are designing a DFA for L = **${c.l}** over Σ = {a, b}. Is λ ∈ L, and what does that force?`,
        answer: choice(r, c.inL ? yes : no, [c.inL ? no : yes], { correct: `Because ${c.why}.` }),
        steps: [`On λ the machine reads nothing and halts in the initial state.`, `So λ ∈ L(M) ⟺ the initial state is accepting.`, `Here ${c.why}, so ${c.inL ? "mark q₀ accepting" : "leave q₀ non-accepting"}.`],
        hint: "Run the empty string: the machine never moves. Where does it halt?",
      };
    },
  },
  {
    id: "design!totality",
    guideId: G,
    sectionRef: "design",
    title: "The totality check",
    skill: "A DFA needs exactly one arrow per (state, symbol): |Q|·|Σ| transitions, no more, no fewer.",
    gen(r) {
      const q = r.int(2, 6);
      const sigma = r.pick([2, 2, 3]);
      const drawn = q * sigma - r.int(1, 3);
      const mode = r.next() < 0.5;
      if (mode)
        return {
          prompt: `A DFA has **${q} states** over an alphabet of **${sigma} symbols**. How many transitions must its diagram have to be total?`,
          answer: { kind: "number", value: q * sigma, unit: "transitions" },
          steps: [`δ : Q × Σ → Q is a total function, so every pair (state, symbol) gets exactly one arrow.`, `|Q × Σ| = ${q} × ${sigma} = ${q * sigma}.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (v === q + sigma) return "You added. Each state needs an arrow for *each* symbol: multiply.";
            if (v === q * q) return "That is |Q|², the number of possible state pairs. Arrows are indexed by (state, symbol), not (state, state).";
            return undefined;
          },
        };
      return {
        prompt: `You drew **${drawn} transitions** for a DFA with ${q} states over ${sigma} symbols, one arrow per label. Is the machine total?`,
        answer: choice(r, `No: ${q * sigma - drawn} (state, symbol) pair${q * sigma - drawn > 1 ? "s have" : " has"} no arrow`, ["Yes, every state has at least one outgoing arrow", "Yes, as long as the accepting states are reachable"], {
          correct: `Total needs ${q} × ${sigma} = ${q * sigma} arrows.`,
          wrong: ["'At least one' is not enough: every state needs an arrow for every symbol.", "Reachability is a different question. Totality is about δ being defined everywhere."],
        }),
        steps: [`Needed: |Q|·|Σ| = ${q * sigma}.`, `Drawn: ${drawn}. Missing ${q * sigma - drawn}: some state has no arrow for some symbol, so the machine would get stuck (not allowed in a DFA).`, "Fix: send the missing pairs to a trap."],
      };
    },
  },
  {
    id: "formal!tuple",
    guideId: G,
    sectionRef: "formal",
    title: "The 5-tuple, component by component",
    skill: "Name each part of M = (Q, Σ, δ, q₀, F) and δ's domain and range.",
    gen(r) {
      const qs = [
        { p: "In M = (Q, Σ, δ, q₀, F), what is the **domain** of δ?", ok: "Q × Σ (every state paired with every symbol)", bad: ["Q (the states)", "Σ∗ (every string)", "Q × Q"] },
        { p: "In M = (Q, Σ, δ, q₀, F), what is the **range** of δ?", ok: "Q (one next state)", bad: ["2^Q (a set of states)", "Q × Σ", "{Accept, Reject}"] },
        { p: "Which component of the 5-tuple must be a **subset of Q**?", ok: "F, the accepting states", bad: ["q₀, the initial state (it is an element of Q, not a subset)", "Σ, the alphabet", "δ, the transition function"] },
        { p: "What makes the machine **deterministic**?", ok: "δ is a total function Q × Σ → Q: every (state, symbol) has exactly one next state", bad: ["It has exactly one accepting state", "It has no loops", "Its alphabet has two symbols"] },
        { p: "Which of these is **not** required of a DFA?", ok: "At least one accepting state", bad: ["Exactly one initial state", "A finite set of states", "A total transition function"] },
        { p: "Why can no DFA recognise { aⁿbⁿ | n ≥ 0 }?", ok: "It would have to count the a's without bound, and a finite set of states cannot remember an unbounded count", bad: ["Because the language is infinite", "Because it contains λ", "Because the alphabet has two symbols"] },
      ];
      const q = r.pick(qs);
      return {
        prompt: q.p,
        answer: choice(r, q.ok, q.bad),
        steps: ["Q: finite states. Σ: alphabet. δ: Q × Σ → Q, total. q₀ ∈ Q. F ⊆ Q.", `So: ${q.ok}.`],
      };
    },
  },
];
