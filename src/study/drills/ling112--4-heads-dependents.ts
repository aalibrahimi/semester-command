/**
 * Drills for LING 112 · Heads and dependents: complement or adjunct by the
 * four diagnostics, the head of a phrase, and head-directionality
 * predictions.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling112/4-heads-dependents";

export const drills: Drill[] = [
  {
    id: "comp!which",
    guideId: G,
    sectionRef: "comp",
    title: "Complement or adjunct?",
    skill: "Obligatory, limited in number, adjacent, selected by the head = complement; otherwise adjunct.",
    gen(r) {
      const items = [
        { h: "into", d: "the house", s: "into [the house]", ok: "Complement", why: "A preposition takes exactly one NP complement; drop it and 'into' is stranded." },
        { h: "drafted", d: "a new screenplay", s: "drafted [a new screenplay]", ok: "Complement", why: "'draft' selects an object: *'She drafted' is incomplete." },
        { h: "serenaded", d: "in the garden", s: "quietly serenaded his beloved [in the garden] with a guitar", ok: "Adjunct", why: "Optional, not adjacent to the verb, not selected, and you could add more PPs without limit." },
        { h: "serenaded", d: "his beloved", s: "quietly serenaded [his beloved] in the garden", ok: "Complement", why: "Obligatory, adjacent, selected: the object." },
        { h: "yawned", d: "loudly", s: "yawned [loudly] yesterday", ok: "Adjunct", why: "'yawn' takes no object; adverbials are optional and stackable." },
        { h: "fond", d: "of chocolate", s: "fond [of chocolate]", ok: "Complement", why: "'fond' selects exactly the preposition 'of': *'fond' alone is incomplete." },
        { h: "resort", d: "to violence", s: "resort [to violence]", ok: "Complement", why: "The head selects the exact preposition 'to'." },
        { h: "student", d: "of physics", s: "a student [of physics]", ok: "Complement", why: "'student' selects an 'of' phrase naming the field: 'student of physics' vs 'student with long hair'." },
        { h: "student", d: "with long hair", s: "a student [with long hair]", ok: "Adjunct", why: "Not selected, optional, could be stacked: 'with long hair from Ohio in a hurry'." },
        { h: "put", d: "on the table", s: "put the book [on the table]", ok: "Complement", why: "'put' requires a location: *'She put the book' is incomplete." },
        { h: "slept", d: "for an hour", s: "slept [for an hour]", ok: "Adjunct", why: "Optional, unlimited: 'slept for an hour on Tuesday in the barn'." },
        { h: "gave", d: "a present", s: "gave Mary [a present]", ok: "Complement", why: "'give' selects two objects; both are complements." },
      ];
      const it = r.pick(items);
      return {
        prompt: `In "${it.s}", is the bracketed phrase a **complement** or an **adjunct** of *${it.h}*?`,
        answer: choice(r, it.ok, [it.ok === "Complement" ? "Adjunct" : "Complement"], { correct: it.why, wrong: [it.ok === "Complement" ? "Run the four tests: is it obligatory? Is the number fixed by the head? Is it adjacent? Does the head select its category or exact preposition? Complements say yes." : "Run the four tests: it is optional, could be repeated, need not be adjacent, and the head does not select it. Those are adjunct answers."] }),
        steps: ["Four diagnostics: obligatory? limited number? adjacent? selected by the head?", it.why],
        hint: "Delete it. Does the sentence still feel complete? Then try adding two more of the same kind.",
      };
    },
  },
  {
    id: "args!head",
    guideId: G,
    sectionRef: "args",
    title: "Find the head",
    skill: "The head is the word the phrase is a kind of; it decides the category and selects the rest.",
    gen(r) {
      const items = [
        { p: "the tall spies in the garden", ok: "spies", bad: ["tall", "garden", "the"], why: "The phrase is a kind of spies (an NP); everything else describes them." },
        { p: "quickly stash the evidence", ok: "stash", bad: ["quickly", "evidence", "the"], why: "It is a VP: a kind of stashing." },
        { p: "very fond of chocolate", ok: "fond", bad: ["very", "chocolate", "of"], why: "An AdjP: 'very' modifies fond, 'of chocolate' is fond's complement." },
        { p: "right under the bridge", ok: "under", bad: ["bridge", "right", "the"], why: "A PP: 'right' modifies the preposition, 'the bridge' is its complement." },
        { p: "extremely carefully", ok: "carefully", bad: ["extremely"], why: "An AdvP: 'extremely' is the degree modifier of carefully." },
        { p: "a picture of a robot", ok: "picture", bad: ["robot", "a", "of"], why: "An NP: a kind of picture; 'of a robot' is the complement." },
        { p: "will leave tomorrow", ok: "will", bad: ["leave", "tomorrow"], why: "On the handout the modal heads the clause-level phrase (T/Mod); the VP 'leave tomorrow' is its complement." },
      ];
      const it = r.pick(items);
      return {
        prompt: `What is the **head** of the phrase "${it.p}"?`,
        answer: choice(r, it.ok, it.bad, { correct: it.why }),
        steps: ["Ask: this phrase is a kind of what? That word is the head, and it gives the phrase its category.", it.why],
      };
    },
  },
  {
    id: "dir!predict",
    guideId: G,
    sectionRef: "dir",
    title: "Predict the order from head-directionality",
    skill: "Head-initial languages put V before O, P before NP, N before PP; head-final languages flip all three.",
    gen(r) {
      const langs = [
        { l: "Japanese", init: false, ev: "SOV with postpositions" },
        { l: "Korean", init: false, ev: "SOV with postpositions (bang-eseo, 'room-in')" },
        { l: "Turkish", init: false, ev: "SOV with postpositions" },
        { l: "Hindi/Urdu", init: false, ev: "SOV with postpositions" },
        { l: "English", init: true, ev: "SVO with prepositions" },
        { l: "Spanish", init: true, ev: "SVO with prepositions" },
        { l: "Arabic", init: true, ev: "verb-first / SVO with prepositions" },
        { l: "Tagalog", init: true, ev: "verb-initial with prepositions" },
      ];
      const L = r.pick(langs);
      const q = r.pick([
        { ask: "does 'picture of a robot' come out as [robot-of] picture or picture [of robot]?", initial: "picture [of robot]: N before its PP complement", final: "[robot-of] picture: the PP complement before N" },
        { ask: "does the object come before or after the verb?", initial: "After the verb (V then O)", final: "Before the verb (O then V)" },
        { ask: "adpositions come before or after their NP?", initial: "Before: prepositions", final: "After: postpositions" },
      ]);
      const ok = L.init ? q.initial : q.final;
      const wrong = L.init ? q.final : q.initial;
      return {
        prompt: `**${L.l}** is ${L.ev}. Predict: ${q.ask}`,
        answer: choice(r, ok, [wrong, "It varies phrase by phrase; nothing can be predicted"], { correct: `${L.l} is head-${L.init ? "initial" : "final"} throughout, so every head-complement pair follows the same order.` }),
        steps: [`${L.ev} shows the setting: head-${L.init ? "initial" : "final"}.`, `The parameter applies to every head-complement pair: ${ok}.`],
        hint: "One parameter, all phrases. Read the setting off the V-O order and the adposition type.",
      };
    },
  },
];
