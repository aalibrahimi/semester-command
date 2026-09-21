/**
 * Drills for HIST 15 · David Walker's Appeal: what each quoted phrase does,
 * the 1830s forces in order, and rubric checklists for Q1 and Q2.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "hist15/6-walker";

export const drills: Drill[] = [
  {
    id: "argument!phrase",
    guideId: G,
    sectionRef: "argument",
    title: "What does this phrase do in the argument?",
    skill: "Quote, then explain: each phrase is a link in the chain, and Q1 wants you to say which.",
    gen(r) {
      const items = [
        { q: "'Republican Land of Liberty!!!!!!' (six exclamation points)", ok: "Irony: the nation's own self-description becomes the indictment", bad: ["Praise for American freedom", "A call to emigrate", "A description of Boston"] },
        { q: "'the most degraded, wretched, and abject set of beings that ever lived'", ok: "Names the condition, then blames white America for it (not self-hatred)", bad: ["Self-hatred toward Black Americans", "A description of enslaved Africans before the slave trade", "An argument for gradual emancipation"] },
        { q: "'a man of colour, who holds the low office of a Constable, or one who sits in a Juror Box'", ok: "Proof: even the lowest rungs of citizenship are closed", bad: ["A demand for a Black president", "Evidence that some Black men held office", "A complaint about the courts specifically"] },
        { q: "'Had I not rather die, or be put to death, than to be a slave'", ok: "Claims the Revolution's own words (Patrick Henry) for Black Americans", bad: ["A threat to commit suicide", "A rejection of religion", "An endorsement of colonization"] },
        { q: "'Every dog must have its day, the American's is coming to an end'", ok: "Warning: divine judgment is coming; be ready", bad: ["A joke about pets", "A prediction that slavery will fade on its own", "An appeal to Congress"] },
        { q: "'being Christians, enlightened and sensible, they are completely prepared for such hellish cruelties'", ok: "Attacks white Christianity: it organized and justified the cruelty instead of preventing it", bad: ["Praises Christian missionaries", "Argues that religion is irrelevant", "Calls Black Americans to convert"] },
        { q: "'See your Declaration Americans!!! Do you understand your own language?'", ok: "The climax: quotes the Declaration back at the nation as a charge sheet", bad: ["A request for citizenship papers", "A criticism of American English", "An appeal to the British"] },
        { q: "'My dearly beloved Brethren and Fellow Citizens'", ok: "Addresses Black readers first (as citizens, a word the law denied) and lets white America overhear", bad: ["Addresses white reformers", "Addresses Congress", "Addresses the Colonization Society"] },
      ];
      const it = r.pick(items);
      return {
        prompt: `In Walker's Appeal, what does this phrase do? **${it.q}**`,
        answer: choice(r, it.ok, it.bad, { correct: "Chain: name the condition → assign the blame → prove it → invoke the Revolution → indict Christianity → indict the Declaration." }),
        steps: ["Every paragraph is one link in the chain.", `This phrase: ${it.ok}.`],
        hint: "Which link of the chain is this: naming, blaming, proving, or convicting?",
      };
    },
  },
  {
    id: "context!order",
    guideId: G,
    sectionRef: "context",
    title: "The timeline around the Appeal",
    skill: "Put the causes and effects in order (Q2 needs two causes and one effect).",
    gen(r) {
      const events = [
        { e: "Cotton gin", y: 1793 },
        { e: "American Colonization Society founded", y: 1816 },
        { e: "Missouri Compromise", y: 1820 },
        { e: "Denmark Vesey conspiracy in Charleston", y: 1822 },
        { e: "Freedom's Journal, first Black newspaper", y: 1827 },
        { e: "Walker publishes the Appeal", y: 1829 },
        { e: "Garrison's The Liberator begins", y: 1831 },
        { e: "Nat Turner's rebellion", y: 1831 },
      ];
      const pick = r.sample(events, 4).sort((a, b) => a.y - b.y);
      const shuffled = r.shuffle(pick);
      return {
        prompt: `Put these in chronological order (earliest first; type the numbers): ${shuffled.map((e, i) => `**${i + 1}** ${e.e}`).join("; ")}.`,
        answer: { kind: "sequence", items: pick.map((e) => String(shuffled.indexOf(e) + 1)), placeholder: "e.g. 3, 1, 4, 2" },
        steps: pick.map((e) => `${e.y}: ${e.e}`),
        hint: "Anchor on 1829, the Appeal. Which of these are before it (causes) and which after (effects)?",
        diagnose(input) {
          const got = input.split(/[,;→>\s]+/).filter(Boolean).map(Number);
          const want = pick.map((e) => shuffled.indexOf(e) + 1);
          if (got.length === want.length && got.every((g, i) => g === want[want.length - 1 - i])) return "Exactly reversed: earliest first.";
          const wi = pick.findIndex((e) => e.e.includes("Appeal"));
          const gi = got.indexOf(shuffled.findIndex((e) => e.e.includes("Appeal")) + 1);
          if (wi >= 0 && gi >= 0 && gi !== wi) return "Place the Appeal (1829) first, then sort the rest as before-or-after it: colonization, Missouri, Vesey and Freedom's Journal come before; The Liberator and Nat Turner come after.";
          return undefined;
        },
      };
    },
  },
  {
    id: "answers!q1",
    guideId: G,
    sectionRef: "answers",
    title: "Q1 rubric check (write it first)",
    skill: "Write the 4 to 5 sentence Q1 answer in the scratchpad, then check it against what a 10/10 contains.",
    gen() {
      return {
        prompt: "Write your **Q1** answer (Walker's argument + key phrases, 4 to 5 sentences) in the section scratchpad first. Then tick what it actually contains.",
        answer: {
          kind: "checklist",
          items: [
            "Names who, what, when: David Walker, a free Black man in Boston, the Appeal, 1829",
            "States the central claim: Black Americans have been degraded by white America's hypocrisy, not by any defect of their own",
            "Quotes at least two phrases **in quotation marks**",
            "After each quote, one sentence saying what that phrase does for the argument",
            "Ends with what he wants readers to do or his warning (God's judgment, be ready)",
            "Uses your own sentences, not the model answer's (Turnitin)",
          ],
        },
        steps: ["Her rubric rewards one thing above all: quote, then explain.", "Three quoted phrases each followed by a sentence is a 10/10; general statements without quotes score 6 to 7."],
        hint: "Count your quotation marks. Fewer than two pairs means you are in the 6 to 7 band.",
      };
    },
  },
  {
    id: "answers!q2",
    guideId: G,
    sectionRef: "answers",
    title: "Q2 rubric check (write it first)",
    skill: "Write the 2 to 3 sentence Q2 answer, then check that it names specific 1820s to 30s forces and says why context matters.",
    gen() {
      return {
        prompt: "Write your **Q2** answer (1830s context, 2 to 3 sentences) in the scratchpad first. Then tick what it contains.",
        answer: {
          kind: "checklist",
          items: [
            "Names at least two specific forces: slavery expanding (cotton boom, internal slave trade, Missouri 1820), colonization as the mainstream answer (ACS 1816), Southern fear since Vesey (1822), or the new Black public (Freedom's Journal 1827)",
            "Says how each force shows up in the text (e.g. he rejects colonization; he addresses 'coloured citizens' as a public)",
            "One sentence on why context deepens the reading: it turns 'he was angry' into 'he was answering specific arguments'",
            "Specific names, dates or events, not 'the times were hard'",
          ],
        },
        steps: ["Two causes plus one effect, in sentences, is the Q2 answer.", "The final sentence is worth writing on purpose: it is what 'why does context matter' asks for."],
      };
    },
  },
];
