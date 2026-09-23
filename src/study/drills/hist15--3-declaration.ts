/**
 * Drills for HIST 15 · The Declaration of Independence: the crisis, the vote, the ideas, the limits.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "hist15/3-declaration";

const QUIZ = [
  { s: "crisis", p: "The lecture calls the years 1754 to 1775…", ok: "The colonial crisis", bad: ["The Critical Period", "The Market Revolution", "The Great Awakening"], why: "From the French and Indian War to the Revolution." },
  { s: "crisis", p: "Which was NOT one of the lecture's colonial grievances?", ok: "The abolition of slavery in the colonies", bad: ["Taxation such as the Stamp Act", "Closing Boston's port", "The Quartering Act"], why: "The grievances were taxes, suspended courts, military rule, the closed port and quartering." },
  { s: "crisis", p: "In July 1775 Congress…", ok: "Sent a petition to the Crown asking for peace", bad: ["Declared independence", "Ratified the Articles of Confederation", "Closed Boston's port"], why: "The King refused it and declared the colonies in rebellion." },
  { s: "crisis", p: "Where did colonial delegates meet in September 1774?", ok: "Philadelphia", bad: ["Boston", "New York", "Williamsburg"], why: "The First Continental Congress." },
  { s: "crisis", p: "Which colonies held back when Lee proposed independence?", ok: "Pennsylvania, Maryland, New York and South Carolina", bad: ["Virginia, Massachusetts, Georgia and Delaware", "New Jersey, Connecticut, Rhode Island and Georgia", "All four New England colonies"], why: "New York was the last to sign on, by July 15, 1776." },
  { s: "crisis", p: "Who drafted the Declaration of Independence?", ok: "Thomas Jefferson", bad: ["Richard Henry Lee", "John Locke", "James Madison"], why: "Lee moved independence; Jefferson wrote the draft." },
  { s: "ideas", p: "Locke's Second Treatise (1690) listed natural rights as…", ok: "Life, liberty and property", bad: ["Life, liberty and the pursuit of happiness", "Speech, press and religion", "Trial by jury and habeas corpus"], why: "Jefferson changed property to the pursuit of happiness." },
  { s: "ideas", p: "The 'social compact' means…", ok: "Government is an agreement that protects people's rights in exchange for their consent", bad: ["The colonies' trade agreement with Britain", "A treaty between the states", "The king's divine right to rule"], why: "Break the deal and the people may replace the government." },
  { s: "ideas", p: "Which 1689 English document limited the king's power to tax without Parliament?", ok: "The English Bill of Rights", bad: ["The Magna Carta", "The Mayflower Compact", "The Stamp Act"], why: "One of the lecture's two foundations." },
  { s: "document", p: "The longest part of the Declaration is…", ok: "The list of grievances against the King", bad: ["The preamble on rights", "The conclusion", "The list of signers' states"], why: "27 grievances as evidence." },
  { s: "document", p: "The Declaration's preamble ('We hold these truths…') works like…", ok: "The rule: what government owes its people", bad: ["The evidence against the King", "The verdict of independence", "A list of the signers"], why: "Rule (preamble), evidence (grievances), verdict (conclusion)." },
  { s: "limits", p: "The Declaration's equality did not extend to…", ok: "Native Americans, women and enslaved people", bad: ["Property-owning white men", "Members of Congress", "Colonial governors"], why: "The lecture's three excluded groups." },
  { s: "limits", p: "Jefferson's draft passage attacking the slave trade was…", ok: "Cut by Congress to keep the southern colonies on board", bad: ["Expanded into a ban on slavery", "Moved into the Constitution", "Written by the King"], why: "A compromise on slavery." },
];

const ORDER = [
  { e: "French and Indian War begins", y: "1754", n: 1754 },
  { e: "Stamp Act", y: "1765", n: 1765 },
  { e: "Tea Act", y: "1773", n: 1773 },
  { e: "Boston's port closed; Congress meets in Philadelphia", y: "1774", n: 1774 },
  { e: "Petition to the Crown", y: "1775", n: 1775 },
  { e: "Declaration adopted", y: "1776", n: 1776 },
];

export const drills: Drill[] = [
  ...(["crisis", "ideas", "document", "limits"] as string[]).map((sec) => ({
    id: `${sec}!quiz`,
    guideId: G,
    sectionRef: sec,
    title: sec === "quiz" ? "Any part of the chapter" : "Quiz-style question",
    skill: "Multiple choice on the lecture content.",
    gen(r: Parameters<Drill["gen"]>[0]) {
      const pool = QUIZ.filter((q) => q.s === sec || sec === "quiz");
      const q = r.pick(pool);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  })),
  {
    id: "map!order",
    guideId: G,
    sectionRef: "map",
    title: "Put the events in order",
    skill: "The chapter's timeline, earliest first.",
    gen(r) {
      const pick = r.sample(ORDER, 4).sort((a, b) => a.n - b.n);
      const shuffled = r.shuffle(pick);
      return {
        prompt: `Order these, earliest first (type the numbers): ${shuffled.map((e, i) => `**${i + 1}** ${e.e}`).join("; ")}.`,
        answer: { kind: "sequence", items: pick.map((e) => String(shuffled.indexOf(e) + 1)) },
        steps: pick.map((e) => `${e.y}: ${e.e}`),
      };
    },
  },
];
