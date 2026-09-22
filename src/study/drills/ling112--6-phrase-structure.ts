/**
 * Drills for LING 112 · Phrase structure: reading rule notation, the null
 * D, what fills T, where a CP or PP attaches, and bracketing whole
 * sentences from the Week 6 handout (checked structurally, so spacing,
 * capitals and ∅ spellings don't matter).
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling112/6-phrase-structure";

/* ── Bracket checking ─────────────────────────────────────────────────── */

const NULLS = new Set(["∅", "ø", "0", "null", "Ø", "e", "zero"]);

/** Canonical form of a bracketing: labels upper-cased, words lower-cased,
 *  every spelling of the null D turned into ∅, whitespace collapsed. */
export function canonBracket(src: string): string | null {
  const toks = src.replace(/\[/g, " [ ").replace(/\]/g, " ] ").trim().split(/\s+/).filter(Boolean);
  let i = 0;
  const node = (): string => {
    if (toks[i] !== "[") throw new Error("expected [");
    i++;
    const label = (toks[i++] ?? "").toUpperCase();
    if (!label || label === "[" || label === "]") throw new Error("missing label");
    const kids: string[] = [];
    while (i < toks.length && toks[i] !== "]") {
      if (toks[i] === "[") kids.push(node());
      else {
        const w = toks[i++].toLowerCase();
        kids.push(NULLS.has(w) ? "∅" : w);
      }
    }
    if (toks[i] !== "]") throw new Error("missing ]");
    i++;
    return `[${label} ${kids.join(" ")}]`;
  };
  try {
    const out = node();
    return i === toks.length ? out : null;
  } catch {
    return null;
  }
}

const SENTENCES: { s: string; model: string; notes: string[] }[] = [
  {
    s: "The young officer inspected the brand new license.",
    model: "[TP [DP [D The] [NP [AdjP [Adj young]] [N officer]]] [T PAST] [VP [V inspected] [DP [D the] [NP [AdjP [AdvP [Adv brand]] [Adj new]] [N license]]]]]",
    notes: ["T = PAST: no auxiliary, *inspected* is past.", "*brand* modifies *new*: [AdjP [AdvP [Adv brand]] [Adj new]]."],
  },
  {
    s: "Sarah will run the race.",
    model: "[TP [DP [D ∅] [NP [N Sarah]]] [T will] [VP [V run] [DP [D the] [NP [N race]]]]]",
    notes: ["*Sarah* is a name: D = ∅.", "*will* is in T, outside the VP (Sarah will do so, too)."],
  },
  {
    s: "Sarah ran the race.",
    model: "[TP [DP [D ∅] [NP [N Sarah]]] [T PAST] [VP [V ran] [DP [D the] [NP [N race]]]]]",
    notes: ["No auxiliary, so T = PAST.", "*ran* stays in V."],
  },
  {
    s: "The spies hid in the garden.",
    model: "[TP [DP [D The] [NP [N spies]]] [T PAST] [VP [V hid] [PP [P in] [DP [D the] [NP [N garden]]]]]]",
    notes: ["T = PAST.", "PP → P DP: [PP [P in] [DP [D the] [NP [N garden]]]]."],
  },
  {
    s: "The bear savored red berries.",
    model: "[TP [DP [D The] [NP [N bear]]] [T PAST] [VP [V savored] [DP [D ∅] [NP [AdjP [Adj red]] [N berries]]]]]",
    notes: ["*berries* is a bare plural: D = ∅.", "*red* is an AdjP inside the NP."],
  },
  {
    s: "Nadia will carefully hand a vase to the buyer.",
    model: "[TP [DP [D ∅] [NP [N Nadia]]] [T will] [VP [AdvP [Adv carefully]] [V hand] [DP [D a] [NP [N vase]]] [PP [P to] [DP [D the] [NP [N buyer]]]]]]",
    notes: ["*carefully* is an AdvP before V, inside the VP.", "Two dependents after *hand*: the DP object and the PP *to the buyer*."],
  },
];

/* ── Drills ───────────────────────────────────────────────────────────── */

export const drills: Drill[] = [
  {
    id: "read!marks",
    guideId: G,
    sectionRef: "read",
    title: "Can this rule build it?",
    skill: "Read ( ), + and / in a rule and decide whether a phrase fits.",
    gen(r) {
      const items = [
        { rule: "PP → P DP", phrase: "*in*", ok: false, why: "DP has no parentheses, so it is required. A bare *in* is not a PP by this rule." },
        { rule: "PP → P DP", phrase: "*in the garden*", ok: true, why: "P (*in*) followed by a DP (*the garden*)." },
        { rule: "AdjP → (AdvP+) Adj", phrase: "*very very tall*", ok: true, why: "The + lets AdvPs stack: two AdvPs then the Adj." },
        { rule: "AdjP → (AdvP+) Adj", phrase: "*tall very*", ok: false, why: "The AdvPs come before the Adj, not after. Order matters in a rule." },
        { rule: "DP → (DP) D NP", phrase: "*the cat*", ok: true, why: "The possessor DP is optional; D (*the*) + NP (*cat*)." },
        { rule: "DP → (DP) D NP", phrase: "*the*", ok: false, why: "NP has no parentheses: it is required." },
        { rule: "TP → DP T VP", phrase: "*will run the race*", ok: false, why: "DP (the subject) is required. There is no subject here." },
        { rule: "CP → C TP", phrase: "*that she left*", ok: true, why: "C (*that*) followed by a whole sentence (TP)." },
        { rule: "VP → (AdvP+) V (DP) (DP / PP) …", phrase: "*give him a book to Sam*", ok: false, why: "The slash means one or the other: a second DP (*a book*) OR a PP, but here *him* is the first DP, *a book* the second, and *to Sam* would be a third. Too many." },
      ];
      const it = r.pick(items);
      const yes = "Yes, the rule builds it";
      const no = "No";
      return {
        prompt: `Rule: \`${it.rule}\`. Can this rule build ${it.phrase}?`,
        answer: choice(r, it.ok ? yes : no, [it.ok ? no : yes], { correct: it.why }),
        steps: ["No parentheses = required. ( ) = optional. + = can repeat. / = one or the other.", it.why],
        hint: "Go through the right side of the rule piece by piece and match each word.",
      };
    },
  },
  {
    id: "dp!d",
    guideId: G,
    sectionRef: "dp",
    title: "What goes in D?",
    skill: "Find the determiner of a nominal, or write ∅ when it is silent.",
    gen(r) {
      const items = [
        { np: "Nadia", d: "∅", why: "A name has a null determiner." },
        { np: "berries", d: "∅", why: "A bare plural has a null determiner." },
        { np: "those tall spies", d: "those", why: "*those* is the determiner; *tall spies* is the NP." },
        { np: "each piece", d: "each", why: "*each* is a determiner." },
        { np: "a fragile vase", d: "a", why: "*a* is the determiner; *fragile vase* is the NP." },
        { np: "night (in *at night*)", d: "∅", why: "No determiner is heard, so D is ∅." },
        { np: "that unlucky man", d: "that", why: "*that* is the determiner." },
        { np: "water", d: "∅", why: "A mass noun with no determiner: null D." },
      ];
      const it = r.pick(items);
      const accept = it.d === "∅" ? ["∅", "ø", "0", "null", "empty", "zero", "none"] : [it.d];
      return {
        prompt: `In the DP **${it.np}**, what fills D? (Type the word, or ∅ / 0 / null if it is silent.)`,
        answer: { kind: "text", accept, placeholder: "the / a / ∅ …" },
        steps: ["Every nominal is a DP: [DP [D …] [NP …]].", it.why, `D = ${it.d}.`],
        diagnose(input) {
          const v = input.trim().toLowerCase();
          if (it.d === "∅" && (v === "" || v === it.np.toLowerCase())) return "The noun itself is the head of the NP, not the D. When no determiner is heard, D is still there, just empty: ∅.";
          if (it.d !== "∅" && ["∅", "0", "null"].includes(v)) return `There is a determiner you can hear here: *${it.d}*.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "tp!t",
    guideId: G,
    sectionRef: "tp",
    title: "What goes in T?",
    skill: "Fill T with the modal or auxiliary, or with PAST / PRES when there is none.",
    gen(r) {
      const items = [
        { s: "The thief tripped that unlucky man.", t: "PAST" },
        { s: "Nadia will carefully hand a vase to the buyer.", t: "will" },
        { s: "The owner very clearly adores each piece.", t: "PRES" },
        { s: "She had left rather quietly.", t: "had" },
        { s: "The bear savored a huge dinner.", t: "PAST" },
        { s: "Sarah can run the race.", t: "can" },
        { s: "The spies hide in the garden.", t: "PRES" },
        { s: "We heard a dubious rumor.", t: "PAST" },
      ];
      const it = r.pick(items);
      const accept = [it.t.toLowerCase(), ...(it.t === "PAST" ? ["past", "-ed", "[past]"] : it.t === "PRES" ? ["pres", "present", "[pres]"] : [])];
      return {
        prompt: `*${it.s}* What fills **T**?`,
        answer: { kind: "text", accept, placeholder: "will / PAST / PRES …" },
        steps: ["Is there a modal or auxiliary (will, can, had, is)? If so, it is T.", it.t === "PAST" || it.t === "PRES" ? `No auxiliary here, so T is just the tense: ${it.t}. The verb stays in V.` : `Yes: *${it.t}* is T.`],
        diagnose(input) {
          const v = input.trim().toLowerCase();
          if ((it.t === "PAST" || it.t === "PRES") && it.s.toLowerCase().split(/\W+/).includes(v)) return "That is the main verb; it stays in V. With no auxiliary, T holds only the tense: PAST or PRES.";
          if (it.t !== "PAST" && it.t !== "PRES" && (v === "past" || v === "pres")) return `There is an auxiliary you can see: *${it.t}* sits in T.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "cp!where",
    guideId: G,
    sectionRef: "cp",
    title: "Where does the CP (or PP) attach?",
    skill: "Decide whether a CP or PP belongs to the verb (in VP) or to a noun (in NP).",
    gen(r) {
      const items = [
        { s: "Henry said **that she had left**.", ok: "In the VP, as what Henry said (after V)", bad: "In an NP, describing a noun", why: "It is what was said: the verb's dependent. *Henry said it/so.*" },
        { s: "We heard a dubious rumor **that he threw the game**.", ok: "In the NP, after *rumor*", bad: "In the VP, after *heard*", why: "It says what the rumor was. *We heard it* replaces rumor + CP together." },
        { s: "The owner adores each piece **in her collection**.", ok: "In the NP, after *piece*", bad: "In the VP, as an adjunct of *adores*", why: "It says which piece. *The owner adores it* swallows the PP." },
        { s: "Nadia handed a vase to the buyer **in the morning**.", ok: "In the VP, as a time adjunct", bad: "In the NP of *buyer*", why: "It says when the handing happened, not which buyer. *Nadia did so in the morning.*" },
        { s: "The bear savored a huge dinner **of very round red berries**.", ok: "In the NP, after *dinner*", bad: "In the VP, after the object", why: "It says what the dinner was made of. *The bear savored it* includes the PP." },
      ];
      const it = r.pick(items);
      return {
        prompt: `Where does the bold part attach? ${it.s}`,
        answer: choice(r, it.ok, [it.bad], { correct: it.why }),
        steps: ["Ask: does it describe the noun (which one / what kind), or the event (how, when, where, what was said)?", "Check with a pronoun: if *it* can replace the noun *and* the bold part together, the bold part is inside that DP.", it.why],
      };
    },
  },
  {
    id: "ambig!reading",
    guideId: G,
    sectionRef: "ambig",
    title: "Match the reading to the tree",
    skill: "For an ambiguous sentence, say which attachment gives which meaning.",
    gen(r) {
      const items = [
        { q: "*The thief tripped that unlucky man with a cane.* Meaning: the thief used a cane.", ok: "PP in the VP, sister of the object DP", bad: "PP inside the object's NP" },
        { q: "*The thief tripped that unlucky man with a cane.* Meaning: the man was holding a cane.", ok: "PP inside the object's NP", bad: "PP in the VP, sister of the object DP" },
        { q: "*I saw the spy with binoculars.* Meaning: I used binoculars.", ok: "PP in the VP, sister of the object DP", bad: "PP inside the object's NP" },
        { q: "*I saw the spy with binoculars.* Meaning: the spy had binoculars.", ok: "PP inside the object's NP", bad: "PP in the VP, sister of the object DP" },
      ];
      const it = r.pick(items);
      return {
        prompt: `${it.q} Which structure?`,
        answer: choice(r, it.ok, [it.bad], { correct: "Instrument (how the action was done) → the PP belongs to the verb. Description of the person → the PP belongs to the noun." }),
        steps: ["Does the PP say how the action happened, or describe the noun?", "How → VP. Describes the noun → inside the NP.", "Check: replace the object with *him*. If *him* must include the PP to keep the meaning, the PP is in the NP."],
      };
    },
  },
  {
    id: "draw!bracket",
    guideId: G,
    sectionRef: "draw",
    title: "Bracket the whole sentence",
    skill: "Write the full labelled bracketing with Dr. Nie's rules: TP, DP with D, T, VP.",
    gen(r) {
      const it = r.pick(SENTENCES);
      const want = canonBracket(it.model);
      return {
        prompt: `Bracket the whole sentence with our rules: **${it.s}** (Labels: TP DP D NP N T VP V PP P AdjP Adj AdvP Adv. Write ∅ or 0 for a silent D, PAST/PRES for T.)`,
        answer: {
          kind: "custom",
          check: (input) => canonBracket(input) === want,
          display: it.model,
          placeholder: "[TP [DP [D …] [NP [N …]]] [T …] [VP [V …] …]]",
        },
        steps: ["1. Find T (auxiliary, or PAST/PRES).", "2. Subject DP before T; VP after.", "3. Split each DP into D + NP (∅ when silent).", ...it.notes, `Answer: ${it.model}`],
        hint: "Start from [TP [DP …] [T …] [VP …]] and fill in one piece at a time. Every DP needs a D, even ∅.",
        diagnose(input) {
          const c = canonBracket(input);
          if (!c) return "The brackets don't balance or a bracket is missing its label. Every [ needs a label right after it and a matching ].";
          if (!/\[T /.test(c)) return "No T. Every sentence is TP → DP T VP; with no auxiliary, T is PAST or PRES.";
          if (/\[DP \[N/.test(c) || /\[DP \[NP/.test(c)) return "A DP is missing its D. Names and bare plurals get [D ∅].";
          if (/^\[S /.test(c)) return "The sentence is a TP in this class, not S.";
          return undefined;
        },
      };
    },
  },
];
