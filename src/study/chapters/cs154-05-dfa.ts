import type { Chapter, Frame } from "../types";

/**
 * CS 154 · Lessons 5–7 — Deterministic finite automata: what one is, its
 * structure and workflow, analyzing and designing them, the formal definition.
 * Built from Lesson 5 (Sep 9), Lesson 6 (Sep 14), Lesson 7 (Sep 16, recording)
 * slides, Assignment 3 (JFLAP), and Chen's "template" for every machine class.
 */

type St = { id: string; x: number; y: number; accept?: boolean; initial?: boolean; hl?: boolean; loopBelow?: boolean };
type Ed = { from: string; to: string; label: string; bend?: number };

/** Tiny state-diagram renderer so every DFA in this chapter is drawn the same way. */
function dfa(states: St[], edges: Ed[]): string {
  const R = 20;
  const pos = Object.fromEntries(states.map((s) => [s.id, s]));
  const out: string[] = [
    `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>`,
  ];
  for (const e of edges) {
    const a = pos[e.from], b = pos[e.to];
    if (e.from === e.to) {
      const d = a.loopBelow ? -1 : 1;
      out.push(`<path d="M${a.x - 10} ${a.y - d * (R - 2)} C ${a.x - 26} ${a.y - d * (R + 34)}, ${a.x + 26} ${a.y - d * (R + 34)}, ${a.x + 10} ${a.y - d * (R - 2)}" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah)"/>`);
      out.push(`<text x="${a.x}" y="${a.y - d * (R + 30) + (a.loopBelow ? 8 : 0)}" text-anchor="middle" font-size="12">${e.label}</text>`);
      continue;
    }
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const bend = e.bend ?? 0;
    const sx = a.x + ux * R, sy = a.y + uy * R, ex = b.x - ux * (R + 2), ey = b.y - uy * (R + 2);
    const mx = (sx + ex) / 2 - uy * bend, my = (sy + ey) / 2 + ux * bend;
    out.push(`<path d="M${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah)"/>`);
    out.push(`<text x="${mx - uy * 10}" y="${my + ux * 10 + 4}" text-anchor="middle" font-size="12">${e.label}</text>`);
  }
  for (const s of states) {
    const stroke = s.hl ? "rgb(59 130 246)" : "currentColor";
    if (s.initial) out.push(`<path d="M${s.x - R - 26} ${s.y - 10} L${s.x - R - 26} ${s.y + 10} L${s.x - R - 2} ${s.y} z" fill="${stroke}" opacity=".8"/>`);
    out.push(`<circle cx="${s.x}" cy="${s.y}" r="${R}" fill="${s.hl ? "rgb(59 130 246 / 0.15)" : "none"}" stroke="${stroke}" stroke-width="${s.hl ? 2.5 : 1.5}"/>`);
    if (s.accept) out.push(`<circle cx="${s.x}" cy="${s.y}" r="${R - 4}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`);
    out.push(`<text x="${s.x}" y="${s.y + 4}" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace">${s.id}</text>`);
  }
  return `<g fill="currentColor" font-family="ui-sans-serif, system-ui">${out.join("")}</g>`;
}

const abbStates = (hl?: string): St[] => [
  { id: "q0", x: 60, y: 90, initial: true, hl: hl === "q0" },
  { id: "q1", x: 180, y: 90, hl: hl === "q1" },
  { id: "q2", x: 300, y: 90, hl: hl === "q2" },
  { id: "q3", x: 420, y: 90, accept: true, hl: hl === "q3" },
  { id: "q4", x: 240, y: 180, hl: hl === "q4", loopBelow: true },
];
const abbEdges: Ed[] = [
  { from: "q0", to: "q1", label: "a" }, { from: "q1", to: "q2", label: "b" }, { from: "q2", to: "q3", label: "b" },
  { from: "q0", to: "q4", label: "b" }, { from: "q1", to: "q4", label: "a" }, { from: "q2", to: "q4", label: "a" }, { from: "q3", to: "q4", label: "a, b" },
  { from: "q4", to: "q4", label: "a, b" },
];

/** Tracing "abb" and "aba" through the {abb} DFA: one configuration per frame. */
const traceFrames: Frame[] = [
  { kind: "lines", lines: ["timeframe 0", "tape:  [a] b  b      cursor on the first cell", "state: q0  (initial)", "result: Reject"], active: 2, caption: "**Start configuration.** The string abb sits on the tape, the cursor is on the leftmost cell, the control unit is in the initial state q0, and the result is Reject until proven otherwise. Every DFA run starts exactly like this." },
  { kind: "lines", lines: ["timeframe 1", "read a · (q0, a) → q1", "tape:   a [b] b", "state: q1"], active: 1, caption: "One transition: read the symbol under the cursor (a), look up the pair (current state, symbol) = (q0, a), move to the state it gives (q1), and **consume** the symbol — the cursor moves right. It never moves left." },
  { kind: "lines", lines: ["timeframe 2", "read b · (q1, b) → q2", "tape:   a  b [b]", "state: q2"], active: 1, caption: "Read b. (q1, b) → q2. Cursor right." },
  { kind: "lines", lines: ["timeframe 3", "read b · (q2, b) → q3", "tape:   a  b  b [ ]", "state: q3  — accepting"], active: 1, caption: "Read the last b. (q2, b) → q3. The cursor is now past the end: **all symbols consumed**, so the machine **halts**." },
  { kind: "lines", lines: ["halted: all symbols consumed  ✓", "in an accepting state (q3)?  ✓", "result: ACCEPT", "abb ∈ L(M)"], active: 2, caption: "Accept needs both: consumed everything *and* ended in an accepting (double-circle) state. Both true. abb ∈ L(M)." },
  { kind: "lines", lines: ["now run  a b a", "t1: (q0, a) → q1", "t2: (q1, b) → q2", "t3: (q2, a) → q4", "halted, in q4 — not accepting → REJECT"], active: 3, caption: "Same machine, input aba. The third symbol is an a, and (q2, a) sends us to q4 — the **trap**. q4 loops on everything and isn't accepting, so once you're in, you're done: reject. Note the machine still consumed every symbol; it rejected because of *where it ended*, not because it got stuck." },
];

/** Designing the DFA for "starts with a", step by step. */
const designFrames: Frame[] = [
  { kind: "lines", lines: ["L = { aw | w ∈ Σ∗ }  over Σ = {a, b}", "L̄ = {λ} ∪ { bw | w ∈ Σ∗ }"], active: 0, caption: "**Step 1: write L and L̄ in set-builder before drawing anything.** Strings that start with a. The complement — what to *reject* — is the empty string plus everything that starts with b. Knowing the reject side is half the machine." },
  { kind: "lines", lines: ["spine: q0 —a→ q1", "q1 is accepting (we've seen the a)", "q1 loops on a, b (anything after is fine)"], active: 0, caption: "**Step 2: draw the spine** — the walk that accepts strings in L. One a gets us to q1; after that, anything goes, so q1 loops on both symbols and is accepting." },
  { kind: "lines", lines: ["q0 on b → ?", "a string starting with b can never recover", "send it to a trap: q0 —b→ q2, q2 loops on a, b, not accepting"], active: 2, caption: "**Step 3: send everything else to the trap.** From q0, a b means the string starts with b — no later symbol can fix that. So b goes to a non-accepting state that loops forever. Chen calls it 'hell'." },
  { kind: "lines", lines: ["is λ ∈ L?  no — λ doesn't start with a", "so q0 must NOT be accepting"], active: 1, caption: "**Step 4: check λ.** The empty string ends the run in q0 with nothing read. λ isn't in L, so q0 stays non-accepting. (If L contained λ, the initial state would have to be accepting.)" },
  { kind: "lines", lines: ["every (state, symbol) has exactly one arrow?", "q0: a→q1, b→q2 ✓", "q1: a→q1, b→q1 ✓", "q2: a→q2, b→q2 ✓"], active: 0, caption: "**Step 5: totality check.** Every state must have exactly one outgoing arrow per symbol. Missing arrows are the number-one bug in student DFAs; JFLAP won't warn you." },
  { kind: "lines", lines: ["test from Σ∗ only:", "a → q1 accept ✓   ab → q1 accept ✓", "b → q2 reject ✓   λ → q0 reject ✓", "ba → q2 reject ✓"], active: 0, caption: "**Step 6: test** with strings from L, strings from L̄, and λ — never with symbols outside Σ. Chen's two ways to break a design: a string from L that's rejected, or a string from L̄ that's accepted. If neither exists among your tests, submit. (You can never *prove* it by testing — Σ∗ is infinite.)" },
];

/** Reading the formal definition of the abb machine. */
const formalFrames: Frame[] = [
  { kind: "lines", lines: ["M = (Q, Σ, δ, q₀, F)", "five things, in this order, in parentheses"], active: 0, caption: "The formal definition is a 5-tuple. Every piece is something from Lessons 1–2. Read it one component at a time." },
  { kind: "lines", lines: ["Q = {q0, q1, q2, q3, q4}", "the finite set of STATES"], active: 0, caption: "**Q**: the states — a finite set (that's the 'Finite' in DFA)." },
  { kind: "lines", lines: ["Σ = {a, b}", "the input ALPHABET"], active: 0, caption: "**Σ**: the alphabet, a nonempty finite set of symbols (Lesson 3)." },
  { kind: "lines", lines: ["δ : Q × Σ → Q", "a TOTAL function: (state, symbol) ↦ next state"], active: 0, caption: "**δ**: the transition function. Domain Q × Σ — the Cartesian product of states and symbols (Lesson 2). Range Q. **Total**: defined for every pair — that's what 'Deterministic' means: from any state, on any symbol, exactly one next state. The arrows in the picture are δ drawn." },
  { kind: "lines", lines: ["δ as a table:", "      a    b", "q0   q1   q4", "q1   q4   q2", "q2   q4   q3", "q3   q4   q4", "q4   q4   q4"], active: 0, caption: "Chen also writes δ as a table: rows are states, columns are symbols, each cell is the next state. Every cell filled = total. This is the same information as the diagram, and he may ask for either form." },
  { kind: "lines", lines: ["q₀ ∈ Q", "the INITIAL state — exactly one"], active: 0, caption: "**q₀**: the initial state, a member of Q. Exactly one. It's marked by the triangle, not by its name — a state called q₀ isn't initial unless it has the triangle." },
  { kind: "lines", lines: ["F ⊆ Q,  F = {q3}", "the set of ACCEPTING (final) states — zero or more"], active: 0, caption: "**F**: the accepting states, a subset of Q. Zero or more (a DFA with F = ϕ accepts nothing). Double circles in the picture." },
  { kind: "lines", lines: ["M = ({q0,q1,q2,q3,q4}, {a,b}, δ, q0, {q3})", "L(M) = {abb}"], active: 0, caption: "All together. When he asks 'give the formal definition of this DFA', this line plus the δ table is the full answer." },
];

export const cs154Dfa: Chapter = {
  slug: "5-dfa",
  label: "Lessons 5–7",
  title: "DFAs: what one is, how it runs, how to analyze and design one",
  source: "Lesson 5 (Sep 9), Lesson 6 (Sep 14), Lesson 7 (Sep 16) slides, Assignment 3, JFLAP.",
  goal: "Explain what a DFA is and what question it answers; describe its structure and workflow in Chen's ♥ sentences; trace a string through a DFA; read L(M) off a diagram; design a DFA from a set-builder description with a trap and a totality check; write the formal 5-tuple and δ table.",
  minutes: 75,
  requires: ["3-strings-languages"],
  sections: [
    {
      id: "why",
      title: "What a DFA is, from zero",
      blocks: [
        { id: "why-1", t: "why", slide: "A yes/no machine with no memory", title: "The idea", text: "Imagine the simplest possible machine that reads a string and answers **yes or no**. It reads one symbol at a time, left to right, never going back. It has no notepad, no counter, no memory of what it read — except for one thing: *which of a handful of states it's currently in*. Each symbol it reads moves it from its current state to another, following fixed rules. When the string runs out, it looks at which state it's standing in: if that's one of the marked 'yes' states, the answer is yes. That's a **deterministic finite automaton**. It's the weakest machine in the course, and the point of Lessons 5–7 is to see exactly what such a thing can and can't do." },
        { id: "why-2", t: "p", slide: "How it connects to Lessons 3–4", text: "The set of strings a machine says yes to is its **language**, L(M). So 'what can a DFA do' really means 'which languages can a DFA recognize'. A DFA for the language {strings that start with a} is a machine that says yes to exactly those strings. Designing a DFA = building a yes/no machine for a given language. Analyzing a DFA = figuring out which language a given machine says yes to." },
        { id: "why-3", t: "list", slide: "The ♥ definitions", items: [
          "♥ **Automaton**: a mathematical model of a computation device (plural *automata*). An imaginary model used to solve real problems.",
          "♥ **Associated language** L(M): the set of all strings that automaton M accepts. w ∈ L(M) means M accepts w; w ∉ L(M) means M rejects w.",
          "♥ **DFA** = **Deterministic Finite Automaton**. *Finite*: the number of states is finite. *Deterministic*: from every state, every symbol leads to exactly one next state (Lesson 7).",
        ] },
        { id: "why-4", t: "prof", title: "Chen's template — he will reuse it for NFA, PDA, and TM", text: "Every machine class gets the same seven-part treatment: (1) justification and name, (2) structure, (3) workflow — start configuration, each timeframe, halting, accept/reject, (4) examples — in action, analyze, design, (5) formal definition, (6) power versus the previous class, (7) what's next. Learn this order once and every later lesson is familiar." },
      ],
    },
    {
      id: "structure",
      title: "Structure: three blocks",
      blocks: [
        { id: "str-1", t: "list", slide: "Input tape, control unit, result", items: [
          "**Input tape**: a row of cells, one symbol each. Bounded on the left, unbounded on the right. Read-only. A **read head** (cursor) reads one symbol and moves right, *consuming* it — it never moves back. The tape can signal end-of-input.",
          "**Control unit**: the 'brain', drawn as a directed graph (Lesson 2). Vertices are **states** — finitely many. Exactly one **initial state**, marked with a triangle (the *name* q₀ doesn't make a state initial; the triangle does). Zero or more **accepting** (final) states, drawn as double circles. The initial state may also be accepting. Edges are **transitions**, labelled with the symbol that triggers them; 'a, b' on one edge means a *or* b.",
          "**Result**: Accept or Reject. Nothing else.",
        ] },
        { id: "str-2", t: "figure", slide: "The Lesson 6 example: L(M) = {abb}", viewBox: "0 0 480 270", caption: "Five states. Triangle = initial (q0). Double circle = accepting (q3). q4 is the trap: every arrow into it stays there. Only the walk a, b, b from q0 reaches q3.", svg: dfa(abbStates(), abbEdges) },
        { id: "str-3", t: "try", q: "True or false (Lesson 5 exercises): a DFA must have at least one accepting state. A state named q₀ is the initial state. A timeframe is one second. 'a, b' on an edge means a or b.", a: "False — zero or more; with none it accepts nothing. False — the triangle marks it, not the name. False — the clock speed is irrelevant. True." },
      ],
    },
    {
      id: "workflow",
      title: "Workflow: running the machine",
      blocks: [
        { id: "wf-1", t: "stepper", slide: true, title: "Tracing abb (accept) and aba (reject) through the {abb} DFA", frames: traceFrames },
        { id: "wf-2", t: "list", slide: "The ♥ workflow sentences", items: [
          "**Start configuration**: clock at timeframe 0; input string on the tape with the cursor on the leftmost cell; control unit in the initial state; result = Reject.",
          "**Each timeframe, one transition**: read the current symbol; IF (current state, current symbol) THEN move to the next state AND consume the symbol (cursor right).",
          "♥ A DFA **halts** iff all input symbols are consumed. (c ⟺ h)",
          "♥ A DFA **accepts** a string iff it halts with all symbols consumed AND it is in an accepting state. ((c ∧ f) ⟺ a)",
          "♥ A DFA **rejects** iff at least one symbol is not consumed OR it is not in an accepting state. ((¬c ∨ ¬f) ⟺ ¬a — De Morgan applied to the line above.)",
        ] },
        { id: "wf-3", t: "def", term: "Configuration", text: "A snapshot at one timeframe: tape contents and cursor position, current state, the timeframe number, current result. From a configuration you can continue the run without knowing anything else. Chen builds every later machine (NFA, PDA, TM) by changing what goes in the configuration — so this word matters more than it looks." },
      ],
    },
    {
      id: "analyze",
      title: "Analyze: given M, find L(M)",
      blocks: [
        { id: "an-1", t: "p", slide: "Follow the accepting walks", text: "To read a language off a diagram: start at the initial state and follow every walk that ends in an accepting state without falling into a trap. Each such walk is a family of strings; loops give you exponents. In the {abb} machine, the only walk to q3 is a, b, b, so L(M) = {abb}. If q3 looped on a and b, the language would be { abbw | w ∈ Σ∗ }." },
        { id: "an-2", t: "list", slide: "Named states you'll see everywhere", items: [
          "**Trap** ('hell', black hole): a non-accepting state whose every transition loops back to itself. Once in, never out. Used to reject the strings in L̄. Chen: 'the CS equivalent of Go to hell!'",
          "**'Heaven'**: an accepting state that loops on everything — accepts whatever reaches it. Used for 'anything after this is fine'.",
          "**Complement DFA**: to recognize L̄ from a DFA for L, **swap** accepting and non-accepting states. This works only because a DFA is total — every string ends in exactly one state, so flipping the labels flips every answer.",
        ] },
        { id: "an-3", t: "figure", slide: "Even number of a's", viewBox: "0 0 300 170", caption: "Two states; a toggles between them, b changes nothing. The initial state is accepting because λ has zero a's — and zero is even. No trap needed: every string over {a, b} has either an even or an odd count.", svg: dfa(
          [{ id: "q0", x: 70, y: 100, initial: true, accept: true }, { id: "q1", x: 230, y: 100 }],
          [{ from: "q0", to: "q1", label: "a", bend: -22 }, { from: "q1", to: "q0", label: "a", bend: -22 }, { from: "q0", to: "q0", label: "b" }, { from: "q1", to: "q1", label: "b" }],
        ) },
        { id: "an-4", t: "try", q: "In the even-a's machine, what's L(M) in set-builder, and what does swapping the accepting states give you?", a: "L(M) = { w ∈ {a,b}∗ | the number of a's in w is even }. Swapping makes q1 accepting and q0 not: odd number of a's — the complement." },
      ],
    },
    {
      id: "design",
      title: "Design: given L, build M",
      blocks: [
        { id: "de-1", t: "stepper", slide: true, title: "Designing 'starts with a' in six steps", frames: designFrames },
        { id: "de-2", t: "figure", slide: "The result", viewBox: "0 0 360 190", caption: "L = { aw | w ∈ Σ∗ }. q1 is heaven; q2 is hell. Every state has one a-arrow and one b-arrow.", svg: dfa(
          [{ id: "q0", x: 60, y: 90, initial: true }, { id: "q1", x: 200, y: 60, accept: true }, { id: "q2", x: 200, y: 150 }],
          [{ from: "q0", to: "q1", label: "a" }, { from: "q0", to: "q2", label: "b" }, { from: "q1", to: "q1", label: "a, b" }, { from: "q2", to: "q2", label: "a, b" }],
        ) },
        { id: "de-3", t: "worked", slide: "The Lesson 6 design set (redo each cold)", title: "Seven small languages over Σ = {a, b}", problem: "Describe the DFA for each.", steps: [
          "**L = ϕ**: one non-accepting state looping on a, b (all hell). **L = Σ∗**: one accepting state looping on a, b (all heaven).",
          "**L = {λ}**: q0 accepting; any symbol → hell. **L = Σ⁺**: q0 non-accepting → q1 accepting on a or b; q1 loops.",
          "**L = {a}**: q0 —a→ q1 (accepting); q0 —b→ hell; q1 —a, b→ hell.",
          "**L = { aw | w ∈ Σ⁺ }** (starts with a, at least 2 symbols): like 'starts with a' but q1 is *not* accepting; q1 —a, b→ q2 accepting, q2 loops. The string 'a' alone must be rejected.",
          "**L = { aⁿ | n ≥ 0 }**: q0 accepting, loops on a; b → hell. For n ≥ 1: q0 non-accepting —a→ q1 accepting (loops on a); b → hell from both.",
          "**Even number of a's**: the two-state toggle above.",
        ] },
        { id: "de-4", t: "warn", title: "The two bugs that lose the most points", text: "(1) A missing arrow: some state has no transition for some symbol. A DFA must be total. Check every state against every symbol before you finish. (2) Forgetting λ: if λ ∈ L, the initial state must be accepting; if λ ∉ L, it must not be. Always test λ explicitly." },
        { id: "de-5", t: "list", slide: "JFLAP (Assignment 3 was 9 points of this)", items: [
          "JFLAP7.1.jar from the course home page. Finite Automaton → draw states with the state tool; right-click a state to set Initial or Final.",
          "Each transition is **one symbol**. For 'a or b', add two transitions between the same states — JFLAP stacks the labels.",
          "Input → Multiple Run lets you test a batch of strings at once. Test strings from L, strings from L̄, and λ (leave the input empty).",
          "Undo is unreliable; save often.",
        ] },
        { id: "de-6", t: "try", q: "Assignment 3 style: design a DFA for L = { (ba)ⁿ | n ≥ 0 } over {a, b}, and describe the DFA for L̄.", a: "q0 (initial, accepting) —b→ q1 —a→ q0. q0 —a→ hell; q1 —b→ hell; hell loops on a, b. Accepts λ, ba, baba, … For L̄: swap — q1 and hell become accepting, q0 becomes non-accepting." },
        { id: "de-7", t: "try", q: "Over Σ = {1}: strings with an even number of 1's. Set-builder and DFA.", a: "L = { 1ⁿ | n even } = { 1²ᵏ | k ≥ 0 }. q0 (initial, accepting) —1→ q1 —1→ q0. No trap needed — every string over {1} has even or odd length." },
      ],
    },
    {
      id: "formal",
      title: "The formal definition (Lesson 7)",
      blocks: [
        { id: "fm-1", t: "stepper", slide: true, title: "M = (Q, Σ, δ, q₀, F), one component at a time", frames: formalFrames },
        { id: "fm-2", t: "why", slide: "Why 'deterministic' means 'δ is total'", title: "Determinism", text: "From Lesson 2: a **total** function has an output for every domain element. δ's domain is Q × Σ — every (state, symbol) pair — so a total δ means the machine always knows exactly one next state. No choices, no dead ends: that's *deterministic*. Lesson 8 will relax this: an NFA's δ maps to a *set* of states (range 2^Q, the power set from Lesson 2) and may be undefined for some pairs. Every piece of the definition is a knob Chen will turn later." },
        { id: "fm-3", t: "p", slide: "What if the input has a symbol not in Σ?", text: "It can't. The input string is by definition in Σ∗. Asking what a DFA over {a, b} does on 'abc' is a category error, not a hard case — which is why the design steps say to test only with strings from Σ∗." },
        { id: "fm-4", t: "p", slide: "The limitation that motivates everything after", text: "A DFA has no memory beyond its current state, and it has finitely many states. So it can't count without bound. Try to design a DFA for the celebrity language { aⁿbⁿ | n ≥ 0 }: you'd need to remember how many a's you saw, for *any* n, with a fixed number of states — impossible. Lesson 12 proves that (the pumping lemma). Every later machine class exists to add a kind of memory the DFA lacks." },
        { id: "fm-5", t: "def", term: "DFA in one paragraph", text: "M = (Q, Σ, δ, q₀, F): finite states, an alphabet, a total transition function Q × Σ → Q, one initial state, a set of accepting states. Run: start in q₀ on the leftmost symbol; each step reads a symbol, follows δ, consumes it; halt when all symbols are consumed; accept iff halted in F. L(M) is the set of accepted strings. Analyze by following accepting walks; design by writing L and L̄, drawing the spine, sending the rest to a trap, checking λ and totality; complement by swapping accepting states." },
      ],
    },
  ],
};
