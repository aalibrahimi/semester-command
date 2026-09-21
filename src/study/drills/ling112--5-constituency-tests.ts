/**
 * Drills for LING 112 · Constituency tests: pick the pro-form, judge a
 * movement result, use fragment answers, and pull apart an ambiguity.
 * Sentence: "Those tall spies in the garden will quickly stash the evidence
 * after midnight" (the handout's), plus a few others.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling112/5-constituency-tests";

export const drills: Drill[] = [
  {
    id: "sub!proform",
    guideId: G,
    sectionRef: "sub",
    title: "Which pro-form replaces it?",
    skill: "NP → she/they/it; N-bar → one(s); VP → do so; PP → there/then.",
    gen(r) {
      const items = [
        { s: "[Those tall spies in the garden] will stash the evidence.", ok: "they (NP)", bad: ["ones (N-bar)", "do so (VP)", "there (PP)"], why: "The whole subject, determiner included, is an NP: 'They will stash the evidence.'" },
        { s: "Those tall [spies in the garden] will stash the evidence.", ok: "ones (N-bar)", bad: ["they (NP)", "there (PP)", "do so (VP)"], why: "Noun plus its dependents, minus the determiner and adjective: 'those tall ones'." },
        { s: "Those spies will [stash the evidence after midnight].", ok: "do so (VP)", bad: ["it (NP)", "then (PP)", "ones (N-bar)"], why: "Verb plus its dependents: 'Those spies will do so.'" },
        { s: "Those spies will stash the evidence [after midnight].", ok: "then (PP)", bad: ["it (NP)", "do so (VP)", "there (PP)"], why: "A time PP is replaced by 'then'; 'there' is for place." },
        { s: "The spies are hiding [in the garden].", ok: "there (PP)", bad: ["then (PP)", "it (NP)", "do so (VP)"], why: "A place PP is replaced by 'there'." },
        { s: "Those spies will stash [the evidence] after midnight.", ok: "it (NP)", bad: ["ones (N-bar)", "do so (VP)", "there (PP)"], why: "A full NP object: 'stash it after midnight'." },
      ];
      const it = r.pick(items);
      return {
        prompt: `Substitution test. In "${it.s}", the bracketed string can be replaced by…`,
        answer: choice(r, it.ok, it.bad, { correct: it.why }),
        steps: ["Match the pro-form to the category: NP → pronoun, N-bar → one(s), VP → do so, PP → there/then.", it.why],
        hint: "Does the bracket include the determiner? If yes it is an NP (pronoun); if the determiner is outside, it is an N-bar (one/ones).",
      };
    },
  },
  {
    id: "move!judge",
    guideId: G,
    sectionRef: "move",
    title: "Movement: does it survive?",
    skill: "Topicalize or cleft the string; a constituent moves as a unit, a non-constituent leaves wreckage.",
    gen(r) {
      const items = [
        { str: "the evidence", moved: "The evidence, those tall spies will quickly stash after midnight.", ok: true },
        { str: "after midnight", moved: "After midnight, those tall spies will stash the evidence.", ok: true },
        { str: "stash the", moved: "*Stash the, those spies will evidence after midnight.", ok: false },
        { str: "spies in", moved: "*It's spies in that those tall the garden will stash the evidence.", ok: false },
        { str: "in the garden", moved: "It's in the garden that the spies are hiding.", ok: true },
        { str: "the evidence after", moved: "*It's the evidence after that those spies will stash midnight.", ok: false },
        { str: "tall spies", moved: "*Tall spies, those in the garden will stash the evidence.", ok: false },
      ];
      const it = r.pick(items);
      const yes = "Grammatical: the string moved as a unit, so it is a constituent";
      const no = "Ungrammatical: the string cannot move as a unit, so it is not a constituent";
      return {
        prompt: `Movement test on **${it.str}**: "${it.moved}" Is the result grammatical, and what does that show?`,
        answer: choice(r, it.ok ? yes : no, [it.ok ? no : yes, "Ungrammatical, but movement tests only work on NPs so it shows nothing"], {
          correct: it.ok ? "Topicalization / clefting fronts a whole constituent." : "Pieces of two different phrases cannot be fronted together; the leftovers make no sense.",
          wrong: [it.ok ? "Read it aloud: it is a well-formed English sentence with the string at the front." : "Read it aloud: the leftover words no longer form a sentence. That wreckage is the test failing.", "Movement (topicalization and it-clefting) works for NPs, PPs and more; a failure is evidence, not a limitation."],
        }),
        steps: ["Front the string (topicalization) or put it in 'It's X that …' (clefting).", it.ok ? `"${it.moved}" is fine: ${it.str} is a constituent.` : `"${it.moved}" is wreckage: ${it.str} is not a constituent (it straddles two phrases).`],
      };
    },
  },
  {
    id: "frag!answer",
    guideId: G,
    sectionRef: "frag",
    title: "Fragment answers",
    skill: "If a string can stand alone as the answer to a question, it is a constituent.",
    gen(r) {
      const items = [
        { q: "Who will stash the evidence?", ok: "Those tall spies in the garden. (NP)", bad: ["Those tall. (not a constituent)", "Spies in. (not a constituent)"] },
        { q: "Where are the spies?", ok: "In the garden. (PP)", bad: ["The garden will. (not a constituent)", "In the. (not a constituent)"] },
        { q: "What will they stash?", ok: "The evidence. (NP)", bad: ["Stash the evidence. (that answers a different question)", "Evidence after. (not a constituent)"] },
        { q: "When will they stash it?", ok: "After midnight. (PP)", bad: ["The evidence after. (not a constituent)", "Midnight stash. (not a constituent)"] },
        { q: "What will those spies do?", ok: "Quickly stash the evidence after midnight. (VP)", bad: ["Will quickly. (not a constituent)", "Stash the. (not a constituent)"] },
      ];
      const it = r.pick(items);
      return {
        prompt: `Sentence: "Those tall spies in the garden will quickly stash the evidence after midnight." Fragment test: **${it.q}** Which fragment is a well-formed answer, and therefore a constituent?`,
        answer: choice(r, it.ok, it.bad, { correct: "A fragment answer must be a whole constituent; pieces of two phrases can't stand alone." }),
        steps: ["Ask the question, answer with just the string. If it sounds like a complete answer, the string is a constituent.", `Here: ${it.ok}`],
      };
    },
  },
  {
    id: "ambig!two",
    guideId: G,
    sectionRef: "ambig",
    title: "Structural ambiguity: which reading?",
    skill: "The tests pull two structures apart: what a pro-form or fragment replaces tells you where the PP attaches.",
    gen(r) {
      const items = [
        {
          s: "The spy saw the man with the telescope.",
          test: "Substitution: 'The spy saw him with the telescope.'",
          ok: "The spy used the telescope: [with the telescope] modifies the VP, so 'him' replaces just 'the man'",
          bad: ["The man had the telescope: 'him' replaced 'the man with the telescope'", "Both readings survive this substitution"],
        },
        {
          s: "The spy saw the man with the telescope.",
          test: "Substitution: 'The spy saw him.' (and 'him' = the man with the telescope)",
          ok: "The man had the telescope: [the man with the telescope] is one NP, replaced whole",
          bad: ["The spy used the telescope: 'him' replaced only 'the man'", "Neither reading: the sentence is not ambiguous"],
        },
        {
          s: "Those spies stashed the evidence in the garden.",
          test: "Fragment: 'What did they stash?' — 'The evidence in the garden.'",
          ok: "[the evidence in the garden] is one NP: the evidence that was in the garden",
          bad: ["'In the garden' says where the stashing happened", "The fragment shows nothing about attachment"],
        },
        {
          s: "Those spies stashed the evidence in the garden.",
          test: "Movement: 'In the garden, those spies stashed the evidence.'",
          ok: "[in the garden] moved alone, so it is a VP-level PP: where the stashing happened",
          bad: ["It shows the PP is inside the NP 'the evidence in the garden'", "Movement can't apply to PPs"],
        },
      ];
      const it = r.pick(items);
      return {
        prompt: `"${it.s}" is ambiguous. ${it.test} Which reading does this test result pick out?`,
        answer: choice(r, it.ok, it.bad, { correct: "What the pro-form or fragment covers, or what moves alone, is exactly the constituent in that reading." }),
        steps: ["Two readings = two trees. In one the PP is inside the NP; in the other it attaches to the VP.", `The test shows: ${it.ok}.`],
        hint: "Ask what the pronoun or fragment includes. If it swallows the PP, the PP is inside the NP.",
      };
    },
  },
];
