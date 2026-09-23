/**
 * Drills for HIST 15 · Abolitionism and Women's Rights: leaders, strategies, the 1840 split, Seneca Falls.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "hist15/12-reform";

const QUIZ = [
  { s: "abolition", p: "The abolitionism of the 1830s is best defined as a movement for…", ok: "Immediate emancipation", bad: ["Gradual emancipation", "Colonization in Africa", "Ending only the slave trade"], why: "The lecture's one-word definition: immediate." },
  { s: "abolition", p: "Which were the lecture's three abolitionist strategies?", ok: "Speaking, writing and petitions", bad: ["Voting, lobbying and strikes", "Boycotts, riots and lawsuits", "Colonization, compensation and gradualism"], why: "Most abolitionists, and all women, couldn't vote." },
  { s: "abolition", p: "William Lloyd Garrison founded The Liberator in…", ok: "1831", bad: ["1829", "1840", "1848"], why: "And the New England Anti-Slavery Society in 1832." },
  { s: "abolition", p: "Who was the first woman to address a mixed audience of men and women, in 1832?", ok: "Maria Stewart", bad: ["Lucretia Mott", "Angelina Grimké", "Sojourner Truth"], why: "'It is not the color of the skin that makes the man…'" },
  { s: "abolition", p: "David Walker published his Appeal in…", ok: "1829", bad: ["1831", "1837", "1848"], why: "The first abolitionist publication on the lecture's list; he died in 1830." },
  { s: "grimke", p: "The Grimké sisters were unusual because they were…", ok: "White women from a South Carolina slaveholding family", bad: ["Formerly enslaved people from Virginia", "Quaker men from Philadelphia", "British abolitionists"], why: "The only southern white women abolitionists." },
  { s: "grimke", p: "Angelina Grimké argued that rights are founded on…", ok: "Being a moral human being, not on sex", bad: ["Owning property", "Religious membership", "Citizenship by birth"], why: "'Whatever it is morally right for man to do, it is morally right for woman to do.'" },
  { s: "womensrights", p: "Under coverture, a married woman could NOT…", ok: "Own property, testify in court, or make contracts", bad: ["Attend church", "Raise children", "Read or write"], why: "Her legal identity was absorbed by her husband's." },
  { s: "womensrights", p: "Why did the abolition movement split in 1840?", ok: "Disagreement over women's role in the movement", bad: ["Disagreement over the Mexican War", "A fight over colonization", "Garrison's death"], why: "The objectors formed the American and Foreign Anti-Slavery Society." },
  { s: "womensrights", p: "Where did Lucretia Mott and Elizabeth Cady Stanton meet?", ok: "At the World Anti-Slavery Convention in London, 1840", bad: ["At Seneca Falls, 1848", "In Boston, 1831", "At the New York legislature, 1854"], why: "Women delegates were refused seats." },
  { s: "womensrights", p: "Lucretia Mott founded which organization in 1833?", ok: "The Philadelphia Female Anti-Slavery Society", bad: ["The National Woman Suffrage Association", "The American Colonization Society", "The New England Anti-Slavery Society"], why: "Women organized their own societies." },
  { s: "womensrights", p: "Susan B. Anthony met Elizabeth Cady Stanton in…", ok: "1851", bad: ["1840", "1848", "1869"], why: "Anthony, a Quaker temperance activist, became the organizer." },
  { s: "senecafalls", p: "The Seneca Falls convention was held in…", ok: "1848, in New York", bad: ["1840, in London", "1833, in Philadelphia", "1860, in Albany"], why: "July 19 and 20, 1848." },
  { s: "senecafalls", p: "The Declaration of Sentiments was modeled on…", ok: "The Declaration of Independence", bad: ["The Constitution", "The Liberator", "The Bill of Rights"], why: "'All men and women are created equal.'" },
  { s: "senecafalls", p: "Which Seneca Falls resolution was the most controversial?", ok: "The demand for women's right to vote", bad: ["Equal access to education", "Property rights", "Temperance"], why: "It passed after Frederick Douglass spoke for it." },
  { s: "senecafalls", p: "New York's 1860 law gave married women…", ok: "Rights to their own wages and joint custody of their children", bad: ["The right to vote", "Seats in the legislature", "The right to divorce freely"], why: "After Stanton addressed the legislature in 1854." },
];

const ORDER = [
  { e: "Walker's Appeal", y: "1829", n: 1829 },
  { e: "The Liberator founded", y: "1831", n: 1831 },
  { e: "Philadelphia Female Anti-Slavery Society", y: "1833", n: 1833 },
  { e: "Movement splits; London convention", y: "1840", n: 1840 },
  { e: "Seneca Falls convention", y: "1848", n: 1848 },
  { e: "Anthony meets Stanton", y: "1851", n: 1851 },
  { e: "New York married women's law", y: "1860", n: 1860 },
];

export const drills: Drill[] = [
  ...(["abolition", "grimke", "womensrights", "senecafalls", "quiz"] as string[]).map((sec) => ({
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
