/**
 * Drills for LING 112 · Syntactic categories: assign a category using the
 * handout's tests (frames, affixes), including the 'very' trap and
 * the closed classes (D, C, Aux, Mod, P).
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling112/2-categories";

const CATS = ["N", "V", "Adj", "Adv", "P", "D", "C", "Aux", "Mod"];

const WORDS: { w: string; frame: string; cat: string; why: string }[] = [
  { w: "granola", frame: "They bought some granola.", cat: "N", why: "Follows a determiner (some __); takes plural -s in principle; 'no granola' works." },
  { w: "joy", frame: "Her joy was obvious.", cat: "N", why: "Follows a determiner (her __). Not a person or place, and still a noun: the test is the frame, not the meaning." },
  { w: "action", frame: "The action surprised us.", cat: "N", why: "'The __' frame; -(t)ion is a noun suffix." },
  { w: "they", frame: "They left early.", cat: "N", why: "Pronouns are nouns on this handout: they stand where an NP stands." },
  { w: "arrive", frame: "The guests will arrive soon.", cat: "V", why: "Follows a modal (will __); takes -ed, -ing; can be negated with not." },
  { w: "spray", frame: "Please spray the plants.", cat: "V", why: "Takes -ed/-ing; follows 'to' and 'will'; 'the spray' would be the noun use, a different word." },
  { w: "know", frame: "We know the answer.", cat: "V", why: "Follows a subject, takes -s (knows), -ing." },
  { w: "stable", frame: "The stable government survived.", cat: "Adj", why: "Sits between D and N (the __ government); 'very stable' works; -er/-est possible." },
  { w: "legal", frame: "A legal decision was made.", cat: "Adj", why: "Between D and N; 'very legal'; -al is an adjective suffix." },
  { w: "fake", frame: "That fake smile fooled nobody.", cat: "Adj", why: "Between D and N (that __ smile)." },
  { w: "badly", frame: "He sang badly.", cat: "Adv", why: "-ly; 'very badly' works; CANNOT sit between D and N (*the badly song)." },
  { w: "often", frame: "She often reads.", cat: "Adv", why: "'very often' works; cannot sit between D and N." },
  { w: "tomorrow", frame: "We leave tomorrow.", cat: "Adv", why: "Modifies the verb phrase; can't go between D and N as a modifier here." },
  { w: "through", frame: "They walked through the park.", cat: "P", why: "Takes an NP complement (through [the park]); closed class." },
  { w: "into", frame: "She went into the house.", cat: "P", why: "Followed by exactly one NP." },
  { w: "the", frame: "The dog barked.", cat: "D", why: "Comes before the noun (and any adjective); closed class." },
  { w: "every", frame: "Every student passed.", cat: "D", why: "Same slot as 'the': every __ N." },
  { w: "thirteen", frame: "Thirteen students passed.", cat: "D", why: "The handout lists numerals as determiners: they fill the D slot." },
  { w: "his", frame: "His car is red.", cat: "D", why: "Possessive determiner: fills the slot of 'the'." },
  { w: "that", frame: "I know that she left.", cat: "C", why: "Introduces a clause: complementizer. (Compare 'that dog', where it is D.)" },
  { w: "whether", frame: "I wonder whether it rained.", cat: "C", why: "Introduces an embedded clause." },
  { w: "if", frame: "Ask if she is coming.", cat: "C", why: "Complementizer introducing the embedded question." },
  { w: "have", frame: "They have left.", cat: "Aux", why: "Auxiliary before a participle; not the main verb 'have' meaning possess." },
  { w: "is", frame: "She is running.", cat: "Aux", why: "Form of 'be' before -ing verb: auxiliary." },
  { w: "will", frame: "It will rain.", cat: "Mod", why: "Modal: no -s, no -ing, followed by a bare verb." },
  { w: "might", frame: "He might call.", cat: "Mod", why: "Modal: followed by a bare verb, no inflection." },
];

export const drills: Drill[] = [
  {
    id: "tests!assign",
    guideId: G,
    sectionRef: "tests",
    title: "Assign the category",
    skill: "Use the frame, not the meaning: D __ N, very __, will __, takes -s/-ed/-ly.",
    gen(r) {
      const it = r.pick(WORDS);
      return {
        prompt: `What is the category of **${it.w}** in: "${it.frame}"?`,
        answer: choice(r, it.cat, r.sample(CATS.filter((c) => c !== it.cat), 3), { correct: it.why }),
        steps: ["Run the tests: does it sit between D and N (Adj)? after 'very' but not between D and N (Adv)? after a modal (V)? before an NP (P)? before the whole clause (C)?", it.why],
        hint: "Try to put it in 'the __ dog', after 'very', and after 'will'. Each frame rules categories in or out.",
        diagnose(input) {
          const picked = input;
          if ((it.cat === "Adj" && picked.includes("Adv")) || (it.cat === "Adv" && picked.includes("Adj"))) return "'very' does not separate Adj from Adv: both take it. Use the D __ N frame: adjectives fit ('the quick run'), adverbs don't (*'the quickly run').";
          if (it.cat === "N" && picked.includes("V")) return "Check the frame: it follows a determiner or stands as a subject/object, which is a noun position. A verb would take -ed/-ing and follow a modal.";
          if (it.cat === "D" && picked.includes("Adj")) return "Determiners fill the slot of 'the' and come before any adjective; an adjective can't replace 'the' ('big dog barked' is not the same frame).";
          if (it.cat === "C" && picked.includes("D")) return "Here it introduces a whole clause, not a noun. 'that dog' would be D; 'that she left' is C.";
          if (it.cat === "Mod" && picked.includes("Aux")) return "Modals never inflect (no -s, no -ing) and take a bare verb; auxiliaries (have, be, do) inflect and take participles.";
          return undefined;
        },
      };
    },
  },
  {
    id: "list!closed",
    guideId: G,
    sectionRef: "list",
    title: "Open or closed class?",
    skill: "N, V, Adj, Adv take new members; D, P, C, Aux, Mod do not.",
    gen(r) {
      const open = ["N", "V", "Adj", "Adv"];
      const closed = ["D", "P", "C", "Aux", "Mod"];
      const cat = r.pick([...open, ...closed]);
      const isOpen = open.includes(cat);
      return {
        prompt: `Is **${cat}** an open class or a closed class?`,
        answer: choice(r, isOpen ? "Open: new members are coined all the time" : "Closed: a small fixed list, new members almost never", [isOpen ? "Closed: a small fixed list, new members almost never" : "Open: new members are coined all the time"], {
          correct: isOpen ? `${cat} gets new words constantly (google, selfie, chill, sus).` : `${cat} is a short list you could write out: no new ones appear.`,
        }),
        steps: [`Open classes: N, V, Adj, Adv. Closed: D, P, C, Aux, Mod.`, `${cat} is ${isOpen ? "open" : "closed"}.`],
      };
    },
  },
  {
    id: "tests!affix",
    guideId: G,
    sectionRef: "tests",
    title: "Which category does the affix point to?",
    skill: "Morphological tests: -ness/-tion → N, -ize/-ify → V, -able/-ful/-ish → Adj, -ly → Adv, -er/-est → Adj.",
    gen(r) {
      const items = [
        { a: "-ness (kindness)", cat: "N" },
        { a: "-(t)ion (creation)", cat: "N" },
        { a: "-ment (movement)", cat: "N" },
        { a: "-ize (realize)", cat: "V" },
        { a: "-ify (clarify)", cat: "V" },
        { a: "-ate (activate)", cat: "V" },
        { a: "-able (readable)", cat: "Adj" },
        { a: "-ful (hopeful)", cat: "Adj" },
        { a: "-ish (reddish)", cat: "Adj" },
        { a: "-est (fastest)", cat: "Adj" },
        { a: "-ly (quickly)", cat: "Adv" },
        { a: "plural -s (cats)", cat: "N" },
        { a: "-ing after 'is' (is running)", cat: "V" },
      ];
      const it = r.pick(items);
      return {
        prompt: `The affix **${it.a}** is a sign of which category?`,
        answer: choice(r, it.cat, ["N", "V", "Adj", "Adv"].filter((c) => c !== it.cat)),
        steps: [`Derivational and inflectional affixes are category-specific: ${it.a} attaches to ${it.cat}.`],
      };
    },
  },
];
