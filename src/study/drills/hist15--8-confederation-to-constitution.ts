/**
 * Drills for HIST 15 · Articles to Constitution: quiz-style questions from
 * the chapter's section headings, the Articles vs Constitution table, and
 * the 1780s to 90s timeline.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "hist15/8-confederation-to-constitution";

const QUIZ = [
  { s: "articles", p: "Under the Articles of Confederation, how many states were needed to amend the document?", ok: "All thirteen", bad: ["Nine of thirteen", "A simple majority", "Two-thirds"], why: "Each state was sovereign; one state could block any change, and one always did." },
  { s: "articles", p: "Under the Articles, how many states had to agree to declare war, make treaties or borrow money?", ok: "Nine of thirteen", bad: ["All thirteen", "Seven", "A majority in Congress by population"], why: "Nine for important acts; unanimity only to amend." },
  { s: "articles", p: "Which of these could the Confederation Congress NOT do?", ok: "Tax", bad: ["Declare war", "Coin money", "Run a post office"], why: "It could only request money from the states, who mostly ignored the requests." },
  { s: "articles", p: "How many branches did the Articles government have?", ok: "One: a Congress, with no executive and no national courts", bad: ["Three, like the Constitution", "Two: Congress and a president", "None: a committee of governors"], why: "Congress did everything, which meant it could do little." },
  { s: "articles", p: "Voting in the Confederation Congress was…", ok: "One state, one vote, regardless of population", bad: ["By population", "Two votes per state", "Weighted by tax contribution"], why: "A sovereign state could not be outvoted by a bigger neighbour: the league premise." },
  { s: "failed", p: "Which event most directly pushed reluctant states toward the Philadelphia Convention?", ok: "Shays's Rebellion (1786 to 87)", bad: ["The Whiskey Rebellion", "The Boston Tea Party", "Nat Turner's rebellion"], why: "It showed the national government could not respond to armed unrest even at a federal arsenal." },
  { s: "failed", p: "Why could the Articles never be fixed from the inside?", ok: "Amendment required unanimous consent, and one state always refused", bad: ["Congress met too rarely", "The president vetoed every amendment", "The courts struck the amendments down"], why: "Every proposed tax amendment died to a single state's veto." },
  { s: "changed", p: "Which plan proposed representation by population in both houses, and who drafted it?", ok: "The Virginia Plan, drafted by James Madison", bad: ["The New Jersey Plan, by William Paterson", "The Connecticut Plan, by Roger Sherman", "The Virginia Plan, by Thomas Jefferson"], why: "Presented by Edmund Randolph, written by Madison; small states answered with the New Jersey Plan." },
  { s: "changed", p: "The Three-fifths Compromise gave the South…", ok: "More House seats and electoral votes than its free population warranted", bad: ["The right to import enslaved people forever", "Three-fifths of the Senate", "A veto over tariffs"], why: "About a third more, by counting enslaved people who had no political rights." },
  { s: "changed", p: "Under the Constitution, amendments require…", ok: "Two-thirds of Congress plus three-fourths of the states", bad: ["All thirteen states", "A simple majority of Congress", "Nine of thirteen state conventions"], why: "Compare the Articles: all thirteen." },
  { s: "changed", p: "The Constitution took effect when which state ratified, and when?", ok: "New Hampshire, the ninth state, June 1788", bad: ["Virginia, the tenth, 1789", "Delaware, the first, 1787", "Rhode Island, the thirteenth, 1790"], why: "Nine of thirteen conventions were needed." },
  { s: "changed", p: "The Northwest Ordinance of 1787 is significant because it…", ok: "Set the process for territories to become equal states and banned slavery north of the Ohio", bad: ["Created the Electoral College", "Ended the international slave trade", "Established the Supreme Court"], why: "The Confederation Congress's one lasting achievement." },
  { s: "changed", p: "Until what year did the Constitution protect the international slave trade from Congress?", ok: "1808", bad: ["1791", "1820", "1865"], why: "Twenty years after ratification." },
  { s: "objected", p: "What did Anti-Federalists most successfully demand as a condition of ratification?", ok: "A Bill of Rights", bad: ["A weaker president", "One state, one vote in the Senate", "Abolishing the standing army"], why: "Added as the first ten amendments in 1791." },
  { s: "objected", p: "Federalist No. 10 argued a large republic was better than a small one because…", ok: "Many factions mean no single faction can form a majority and oppress the rest", bad: ["Large republics have stronger armies", "Small republics cannot tax", "Montesquieu said so"], why: "Madison reversed the political theory of the day." },
  { s: "objected", p: "Which Anti-Federalist objection drew on Montesquieu?", ok: "Republics only work in small territories where representatives know their constituents", bad: ["The president would become a king", "The document had no Bill of Rights", "The Constitution favoured creditors"], why: "The 'size' objection: a continental republic looked like a contradiction." },
  { s: "stability", p: "Name the parts of Hamilton's program.", ok: "Funding the debt at par, assuming state debts, a national bank (plus the excise and tariff)", bad: ["Free land in the West, a navy, an end to the slave trade", "Abolishing the national debt, no bank, low tariffs", "State banks, paper money, debt forgiveness"], why: "Purpose: establish the nation's credit and give wealthy creditors a stake in the federal government." },
  { s: "stability", p: "The 'Dinner Table Bargain' traded what for what?", ok: "Southern votes for assumption of state debts, in exchange for the capital on the Potomac", bad: ["A national bank for a Bill of Rights", "The tariff for the Northwest Ordinance", "Jay's Treaty for the excise tax"], why: "Jefferson, Madison and Hamilton, 1790." },
  { s: "stability", p: "Why can a historian call the Whiskey Rebellion a source of stability?", ok: "Its suppression proved the new government could enforce federal law with force, unlike the Articles government in Shays's Rebellion", bad: ["It ended the excise tax", "It united the two parties", "It led to the Bill of Rights"], why: "Seven years after Shays, the contrast was the point." },
  { s: "stability", p: "Which action of Washington's became a precedent later written into the Constitution?", ok: "Retiring after two terms (the 22nd Amendment, 1951)", bad: ["Vetoing the bank", "Refusing a cabinet", "Declaring neutrality"], why: "Unwritten rule until FDR broke it." },
  { s: "stability", p: "Federalists vs Democratic-Republicans on the Constitution:", ok: "Federalists: loose construction ('necessary and proper'); Republicans: strict construction", bad: ["Both loose construction", "Federalists strict; Republicans loose", "Neither had a position"], why: "The bank fight turned on exactly this." },
  { s: "stability", p: "The Virginia and Kentucky Resolutions (1798) responded to…", ok: "The Alien and Sedition Acts, claiming states could nullify federal law", bad: ["Jay's Treaty", "The Whiskey Rebellion", "Hamilton's bank"], why: "Jefferson and Madison's answer to the Federalist crackdown." },
];

const TABLE = [
  { row: "Nature of the union", a: "League of sovereign states", c: "Federal republic; national law supreme" },
  { row: "Taxation", a: "Request money from the states", c: "Congress taxes directly" },
  { row: "Commerce", a: "No power", c: "Congress regulates interstate and foreign commerce" },
  { row: "Executive", a: "None", c: "A single President" },
  { row: "Courts", a: "None", c: "Supreme Court plus federal courts" },
  { row: "Amendment", a: "All 13 states", c: "2/3 Congress + 3/4 states" },
  { row: "Approved by", a: "State legislatures, unanimously", c: "9 of 13 state conventions" },
  { row: "Voting in Congress", a: "One state, one vote", c: "House by population; Senate 2 per state" },
];

const TIMELINE = [
  { e: "Articles of Confederation ratified", y: 1781 },
  { e: "Treaty of Paris ends the war", y: 1783 },
  { e: "Shays's Rebellion", y: 1786 },
  { e: "Philadelphia Convention; Northwest Ordinance", y: 1787 },
  { e: "New Hampshire ratifies; Constitution in effect", y: 1788 },
  { e: "Washington inaugurated", y: 1789 },
  { e: "Bill of Rights ratified", y: 1791 },
  { e: "Whiskey Rebellion suppressed", y: 1794 },
  { e: "Alien and Sedition Acts", y: 1798 },
];

export const drills: Drill[] = [
  ...(["articles", "failed", "changed", "objected", "stability", "quiz"] as const).map((sec) => ({
    id: `${sec}!quiz`,
    guideId: G,
    sectionRef: sec,
    title: sec === "quiz" ? "Quiz #1, any heading" : "Quiz-style question",
    skill: "Fifteen multiple choice in thirty minutes: two minutes each, drawn from these headings.",
    gen(r: Parameters<Drill["gen"]>[0]) {
      const pool = sec === "quiz" ? QUIZ : QUIZ.filter((q) => q.s === sec);
      const q = r.pick(pool);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  })),
  {
    id: "changed!table",
    guideId: G,
    sectionRef: "changed",
    title: "Articles vs Constitution",
    skill: "The comparison table, row by row.",
    gen(r) {
      const t = r.pick(TABLE);
      const askA = r.next() < 0.5;
      const ok = askA ? t.a : t.c;
      const others = TABLE.filter((x) => x !== t).map((x) => (askA ? x.a : x.c));
      return {
        prompt: `**${t.row}** under the ${askA ? "Articles (1781)" : "Constitution (1788)"}:`,
        answer: choice(r, ok, [askA ? t.c : t.a, ...r.sample(others, 2)], { correct: `Articles: ${t.a}. Constitution: ${t.c}.` }),
        steps: [`${t.row}: Articles = ${t.a}; Constitution = ${t.c}.`],
      };
    },
  },
  {
    id: "why!timeline",
    guideId: G,
    sectionRef: "why",
    title: "The 1780s to 90s in order",
    skill: "Sequence the events from the Articles to the Alien and Sedition Acts.",
    gen(r) {
      const pick = r.sample(TIMELINE, 4).sort((a, b) => a.y - b.y);
      const shuffled = r.shuffle(pick);
      return {
        prompt: `Order these, earliest first (type the numbers): ${shuffled.map((e, i) => `**${i + 1}** ${e.e}`).join("; ")}.`,
        answer: { kind: "sequence", items: pick.map((e) => String(shuffled.indexOf(e) + 1)) },
        steps: pick.map((e) => `${e.y}: ${e.e}`),
        hint: "Anchors: Articles 1781, Shays 1786, Convention 1787, in effect 1788, Bill of Rights 1791.",
      };
    },
  },
];
