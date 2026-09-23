/**
 * Drills for HIST 15 · Slavery and the Making of America, "The Downward
 * Spiral": quiz-style questions per section and the spiral in order.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "hist15/1-slavery";

const QUIZ = [
  { s: "map", p: "The documentary's main argument about early American slavery is that…", ok: "It began undefined and was turned, law by law, into a race-based, lifelong, hereditary system", bad: ["It was fully defined by law from the first arrivals in 1619", "It existed only in the Southern colonies", "It ended in the North before 1700"], why: "That slide is the 'downward spiral'." },
  { s: "map", p: "The film calls slavery in American history…", ok: "'No sideshow… it was the main event'", bad: ["A regional exception", "A minor labor system", "A purely Southern enterprise"], why: "The series argues slavery was central to building the whole nation, North included." },
  { s: "newamsterdam", p: "The first eleven enslaved men in New Amsterdam were owned by…", ok: "The Dutch West India Company", bad: ["Individual Dutch farmers", "The Church", "The English crown"], why: "They were company slaves, bought to build the colony." },
  { s: "newamsterdam", p: "An 'Atlantic Creole' was…", ok: "A person of African descent from the Atlantic world, often with European names, languages and Christianity", bad: ["A white indentured servant from the Caribbean", "A Native American ally of the Dutch", "A Dutch planter born in the colonies"], why: "Names like Anthony Portuguese and John d'Angola show that mixture." },
  { s: "newamsterdam", p: "What did 'half freedom' (1644) give the first eleven?", ok: "Their own land to farm, in exchange for tribute and labor when called, while their children stayed enslaved", bad: ["Full citizenship", "Passage back to Africa", "Freedom for their children only"], why: "The Company calculated it made more money this way." },
  { s: "newamsterdam", p: "The first recorded marriage between Black people in New Amsterdam (1641) was…", ok: "Anthony van Angola and Lucie d'Angola", bad: ["Emanuel and Frances Driggus", "John Punch and a free woman", "Pedro Negretto and Lucie d'Angola"], why: "Marriage was a way to claim ground." },
  { s: "newamsterdam", p: "Why could enslaved people in 1630s New Amsterdam sue and earn wages?", ok: "There were no laws yet defining slavery, and Europeans depended on their labor", bad: ["Dutch law guaranteed them citizenship", "They were technically indentured servants", "The English crown required it"], why: "No legal structure meant room to negotiate." },
  { s: "chesapeake", p: "In 1640, John Punch and two white servants ran away. Their sentences were…", ok: "Extra years for the white men; servitude for life for Punch", bad: ["Life servitude for all three", "Extra years for all three", "Death for Punch, freedom for the others"], why: "The film's 'turning point': race decides who can go free." },
  { s: "chesapeake", p: "Virginia's 1662 law said a child is bond or free according to…", ok: "The condition of the mother", bad: ["The condition of the father", "The child's religion", "Where the child was born"], why: "Slavery became hereditary; white fathers could own their own children." },
  { s: "chesapeake", p: "Why did Chesapeake planters turn to indentured servants?", ok: "Tobacco needed labor and Virginia's Native nations were strong enough to resist forced labor", bad: ["Africans were not available until 1700", "English law banned slavery", "Servants were cheaper than land"], why: "More tobacco meant more profit for investors in England." },
  { s: "chesapeake", p: "What happened to Emanuel Driggus's family in 1657?", ok: "Captain Pott fell into debt and sold two of his children", bad: ["They were all freed", "They were sent to New Amsterdam", "Emanuel was sentenced to life servitude"], why: "A family's future hung on one master's finances." },
  { s: "carolina", p: "Which colony was the first 'slave society' (slavery at the center of the economy)?", ok: "Carolina", bad: ["New York", "Massachusetts", "Maryland"], why: "Racial slavery was in its 1669 constitution; rice made it pay." },
  { s: "carolina", p: "Many of Carolina's first white settlers came from…", ok: "Barbados, a sugar colony of some 50,000 enslaved people", bad: ["New Amsterdam", "Spanish Florida", "Massachusetts Bay"], why: "The plantation system was 'transplanted like a kind of virus'." },
  { s: "carolina", p: "Carolina rice depended on…", ok: "The knowledge of enslaved West Africans who had grown it for centuries", bad: ["English farming manuals", "Native American techniques only", "Machines imported from Holland"], why: "Once they showed planters how, the economy grew within a generation." },
  { s: "carolina", p: "By the 1720s in the Carolina lowcountry, enslaved Black people…", ok: "Outnumbered whites more than two to one", bad: ["Were a small minority", "Were mostly free", "Had been moved to Georgia"], why: "Fear of the majority drove harsher laws and policing." },
  { s: "stono", p: "The Stono Rebellion (1739) was led by…", ok: "Jemmy, an enslaved man from Angola", bad: ["John Punch", "Anthony van Angola", "Emanuel Driggus"], why: "A work crew, many of them Angolans, near the Stono River." },
  { s: "stono", p: "Where were the Stono rebels heading?", ok: "Spanish Florida, where the governor had promised freedom (Fort Mose)", bad: ["Charleston, to seize the port", "The Appalachian Mountains", "New York"], why: "They hoped to reach freedom, not conquer the colony." },
  { s: "stono", p: "South Carolina's response after Stono was to…", ok: "Combine its slave laws into one black code controlling nearly every part of enslaved life", bad: ["Abolish the slave trade", "Free all Angolans", "Give enslaved people Sundays off"], why: "The end point of the spiral: total legal control." },
];

const SPIRAL = [
  { e: "The first eleven arrive in New Amsterdam", y: "1620s", n: 1625 },
  { e: "John Punch sentenced to life", y: "1640", n: 1640 },
  { e: "Half freedom for the eleven", y: "1644", n: 1644 },
  { e: "Virginia: child follows the mother", y: "1662", n: 1662 },
  { e: "Carolina's constitution sanctions slavery", y: "1669", n: 1669 },
  { e: "Enslaved people are a 2 to 1 majority in the lowcountry", y: "1720s", n: 1725 },
  { e: "Stono Rebellion", y: "1739", n: 1739 },
];

export const drills: Drill[] = [
  ...(["map", "newamsterdam", "chesapeake", "carolina", "stono", "quiz"] as const).map((sec) => ({
    id: `${sec}!quiz`,
    guideId: G,
    sectionRef: sec,
    title: sec === "quiz" ? "Any part of the film" : "Quiz-style question",
    skill: "Multiple choice on 'The Downward Spiral': New Amsterdam, the Chesapeake, Carolina, Stono.",
    gen(r: Parameters<Drill["gen"]>[0]) {
      const pool = sec === "quiz" ? QUIZ : QUIZ.filter((q) => q.s === sec);
      const q = r.pick(pool);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  })),
  {
    id: "map!order",
    guideId: G,
    sectionRef: "map",
    title: "The spiral in order",
    skill: "Put the film's turning points in order, earliest first.",
    gen(r) {
      const pick = r.sample(SPIRAL, 4).sort((a, b) => a.n - b.n);
      const shuffled = r.shuffle(pick);
      return {
        prompt: `Order these, earliest first (type the numbers): ${shuffled.map((e, i) => `**${i + 1}** ${e.e}`).join("; ")}.`,
        answer: { kind: "sequence", items: pick.map((e) => String(shuffled.indexOf(e) + 1)) },
        steps: pick.map((e) => `${e.y}: ${e.e}`),
        hint: "New Amsterdam first, then the Chesapeake courts and laws, then Carolina, then Stono.",
      };
    },
  },
];
