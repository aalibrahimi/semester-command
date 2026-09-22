/**
 * Drills for CS 154 · Lesson 8, NFA introduction: Chen's true/false set,
 * accept or reject by processes, the set of active states after a prefix,
 * L(M) of small NFAs, and the determinism / equivalence definitions.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "cs154/8-nfa-intro";

type Delta = Record<string, Record<string, string[]>>;
interface Machine {
  name: string;
  desc: string;
  start: string;
  accept: string[];
  delta: Delta;
  lang: string;
}

const MACHINES: Machine[] = [
  {
    name: "Example 1",
    desc: "q0 -a→ q1 -b→ q2 -b→ q3, q3 accepting, no other arrows",
    start: "q0",
    accept: ["q3"],
    delta: { q0: { a: ["q1"] }, q1: { b: ["q2"] }, q2: { b: ["q3"] } },
    lang: "{abb}",
  },
  {
    name: "Example 2",
    desc: "q0 -b→ q1; q1 -a→ q2 and q1 -a→ q4; q2 -a→ q3; q4 loops on b; q3, q4 accepting",
    start: "q0",
    accept: ["q3", "q4"],
    delta: { q0: { b: ["q1"] }, q1: { a: ["q2", "q4"] }, q2: { a: ["q3"] }, q4: { b: ["q4"] } },
    lang: "{baa} ∪ {b a bⁿ : n ≥ 0}",
  },
  {
    name: "M₃",
    desc: "q0 loops on a; q0 -a→ q2; q0 -b→ q1; q1 loops on b; q1 -a→ q2; q2 loops on a; q2 accepting",
    start: "q0",
    accept: ["q2"],
    delta: { q0: { a: ["q0", "q2"], b: ["q1"] }, q1: { b: ["q1"], a: ["q2"] }, q2: { a: ["q2"] } },
    lang: "{aⁿ bᵐ aᵏ : n ≥ 0, m ≥ 0, k ≥ 1}",
  },
  {
    name: "ends in ab",
    desc: "q0 loops on a and b; q0 -a→ q1; q1 -b→ q2; q2 accepting",
    start: "q0",
    accept: ["q2"],
    delta: { q0: { a: ["q0", "q1"], b: ["q0"] }, q1: { b: ["q2"] } },
    lang: "{w ab : w ∈ {a, b}*}",
  },
];

function activeAfter(m: Machine, w: string): string[] {
  let cur = new Set([m.start]);
  for (const c of w) {
    const nx = new Set<string>();
    for (const q of cur) for (const t of m.delta[q]?.[c] ?? []) nx.add(t);
    cur = nx;
  }
  return [...cur].sort();
}

const accepts = (m: Machine, w: string) => activeAfter(m, w).some((q) => m.accept.includes(q));

export const drills: Drill[] = [
  {
    id: "practice!tf",
    guideId: G,
    sectionRef: "practice",
    title: "Chen's true / false",
    skill: "Answer the ten Lesson 8 statements and say why.",
    gen(r) {
      const items: [string, boolean, string][] = [
        ["You can read and write on an NFA's input tape.", false, "The tape is read only."],
        ["During an NFA's run, the cursor can move back after moving right.", false, "Left to right only, one symbol per move."],
        ["An NFA must have at least one accepting state.", false, "With none it is still an NFA; L(M) = ϕ."],
        ["An NFA must have one and only one initial state.", true, "Exactly one q₀."],
        ["If an NFA halts, all symbols must have been consumed.", false, "It can halt on 'no transition' with symbols left."],
        ["If during a timeframe there is no transition, the NFA halts.", true, "Violation #1: that process halts (and rejects)."],
        ["If an NFA is in an accepting state, the NFA halts.", false, "It keeps reading while there is input and an arrow."],
        ["If an NFA is in an accepting state, the input string is accepted.", false, "Needs h ∧ c ∧ f: also halted with all symbols consumed."],
        ["An NFA rejects a string if one of its processes rejects it.", false, "It rejects only if every process rejects."],
        ["NFAs' transition graphs are more complex than DFAs'.", false, "Generally simpler: no trap state needed."],
        ["A DFA is deterministic.", true, "Exactly one transition at every timeframe, which is ≤ 1."],
        ["A machine with a state that has zero arrows for some symbol cannot be deterministic.", false, "Deterministic means at most one; zero is allowed. It just isn't a DFA."],
      ];
      const [s, t, why] = r.pick(items);
      return {
        prompt: `True or false: ${s}`,
        answer: choice(r, t ? "True" : "False", [t ? "False" : "True"], { correct: why }),
        steps: [why],
      };
    },
  },
  {
    id: "ex2!accept",
    guideId: G,
    sectionRef: "ex2",
    title: "Accept or reject?",
    skill: "Run an NFA on a string with processes and decide.",
    gen(r) {
      const m = r.pick(MACHINES.slice(1));
      const len = r.int(1, 5);
      let w = "";
      for (let i = 0; i < len; i++) w += r.pick(["a", "b"]);
      if (r.next() < 0.35) w = r.pick(m.name === "Example 2" ? ["ba", "baa", "babb", "bab"] : m.name === "M₃" ? ["a", "aba", "bba", "aabaa"] : ["ab", "aab", "bab", "abab"]);
      const ok = accepts(m, w);
      const trail: string[] = [];
      let cur = [m.start];
      trail.push(`start {${cur.join(", ")}}`);
      for (const c of w) {
        cur = activeAfter(m, w.slice(0, trail.length));
        trail.push(`after '${c}': {${cur.join(", ") || "none, all halted"}}`);
      }
      return {
        prompt: `NFA (${m.name}): ${m.desc}. Input **${w}**. Accept or reject?`,
        answer: choice(r, ok ? "Accept" : "Reject", [ok ? "Reject" : "Accept"], {
          correct: ok ? "At least one process ends in an accepting state with every symbol consumed." : "Every process either got stuck with symbols left or ended in a non-accepting state.",
        }),
        steps: [...trail, ok ? "The final set contains an accepting state → ACCEPT." : "No accepting state in the final set → REJECT."],
        hint: "Track the set of states the processes are in after each symbol.",
      };
    },
  },
  {
    id: "flow!set",
    guideId: G,
    sectionRef: "flow",
    title: "Which states are active?",
    skill: "Write the set of states the processes are in after reading a prefix.",
    gen(r) {
      const m = r.pick(MACHINES.slice(1));
      const pre = r.pick(m.name === "Example 2" ? ["b", "ba", "baa", "bab"] : m.name === "M₃" ? ["a", "aa", "ab", "aba"] : ["a", "ab", "aa", "aba"]);
      const set = activeAfter(m, pre);
      return {
        prompt: `NFA (${m.name}): ${m.desc}. After reading **${pre}**, which states are the processes in? (comma-separated; write none if all halted)`,
        answer: set.length ? { kind: "set", items: set } : { kind: "text", accept: ["none", "∅", "ϕ", "{}", "empty"] },
        steps: [...pre.split("").map((_, i) => `after '${pre.slice(0, i + 1)}': {${activeAfter(m, pre.slice(0, i + 1)).join(", ") || "none"}}`)],
        hint: "From every state in the current set, follow every arrow for the next symbol. States with no arrow drop out.",
      };
    },
  },
  {
    id: "practice!lang",
    guideId: G,
    sectionRef: "practice",
    title: "What is L(M)?",
    skill: "Read a small NFA and write its language in set-builder form.",
    gen(r) {
      const bank = [
        ...MACHINES.map((m) => ({ q: m.desc, ok: m.lang })),
        { q: "one state q, NOT accepting, no arrows", ok: "ϕ" },
        { q: "one state q, accepting, no arrows", ok: "{λ}" },
        { q: "one state q, accepting, loops on a and b", ok: "{a, b}*" },
      ];
      const it = r.pick(bank);
      const others = bank.filter((b) => b.ok !== it.ok).map((b) => b.ok);
      return {
        prompt: `Σ = {a, b}. NFA: ${it.q}. L(M) = ?`,
        answer: choice(r, it.ok, r.sample(others, 3)),
        steps: ["List the paths from q₀ to an accepting state, and what they read.", `L(M) = ${it.ok}.`],
        hint: "Try λ first, then the shortest strings. Every accepted string is a path from q₀ to an accepting state that uses up the input.",
      };
    },
  },
  {
    id: "terms!defs",
    guideId: G,
    sectionRef: "terms",
    title: "Definitions",
    skill: "State determinism and machine equivalence exactly.",
    gen(r) {
      const items = [
        { q: "M₁ and M₂ are equivalent iff…", ok: "L(M₁) = L(M₂) over Σ", bad: ["they both accept some string w", "they have the same number of states", "they are both DFAs"] },
        { q: "A machine is deterministic iff at every timeframe there are…", ok: "no more than one (0 or 1) possible transitions", bad: ["exactly one possible transition", "at least one possible transition", "exactly two possible transitions"] },
        { q: "A DFA has, at every timeframe…", ok: "exactly one possible transition (δ is total)", bad: ["0 or 1 possible transitions", "any number of transitions", "at least two transitions"] },
        { q: "'Computation' is…", ok: "the sequence of configurations from start until the machine halts", bad: ["the final state only", "the set of accepted strings", "the transition function"] },
      ];
      const it = r.pick(items);
      return { prompt: it.q, answer: choice(r, it.ok, it.bad), steps: [`${it.ok}.`] };
    },
  },
];
