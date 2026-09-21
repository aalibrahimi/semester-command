/**
 * Drills for HIST 15 · Market revolution, Lowell, Cherokee removal: quiz-style
 * questions per section, the Slater vs Lowell table, and the removal timeline.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "hist15/11-market-revolution";

const QUIZ = [
  { s: "why", p: "The 'market revolution' is best described as…", ok: "The shift from local, household and barter economies to a national cash economy, enabled by transportation, credit and factories", bad: ["The adoption of the gold standard", "The end of slavery in the North", "The founding of the New York Stock Exchange"], why: "People produced for sale and bought what they needed with cash." },
  { s: "why", p: "Which three things together enabled the market revolution?", ok: "Transportation, credit (banks), and factories", bad: ["Railroads, the telegraph, and the income tax", "Slavery, tariffs, and the Bank War", "Canals, the cotton gin, and universal suffrage"], why: "The lecture's framing: move goods, finance them, make them." },
  { s: "transport", p: "Which project most reduced the cost of moving goods between the Great Lakes and New York City, and when was it finished?", ok: "The Erie Canal, 1825", bad: ["The National Road, 1811", "The Baltimore & Ohio Railroad, 1830", "Fulton's Clermont, 1807"], why: "363 miles from the Hudson to Lake Erie, built by New York State under DeWitt Clinton." },
  { s: "transport", p: "Robert Fulton's Clermont (1807) mattered because…", ok: "Steamboats could go upstream, making New Orleans the outlet for the whole interior and cutting upstream freight costs about 90%", bad: ["It was the first railroad locomotive", "It carried the first transatlantic mail", "It opened the Erie Canal"], why: "By the 1820s steamboats ran up the Mississippi and Ohio." },
  { s: "transport", p: "The federal National Road ran…", ok: "From Maryland west toward Illinois, begun 1811", bad: ["From Boston to New York", "Along the Erie Canal", "From Charleston to New Orleans"], why: "The one federally funded road of the era." },
  { s: "transport", p: "Why did railroads outcompete canals by the 1840s?", ok: "They did not freeze in winter and did not need a river", bad: ["They were cheaper to build", "Canals were banned", "They were federally owned"], why: "3,000 miles of track by 1840, mostly in the Northeast." },
  { s: "factories", p: "Who built the first integrated cotton mill (raw cotton to finished cloth) in the United States?", ok: "Francis Cabot Lowell's Boston Manufacturing Company at Waltham, 1813", bad: ["Samuel Slater in Rhode Island, 1793", "Eli Whitney in Connecticut", "The Lowell Offering company, 1840"], why: "Slater's mills only spun thread." },
  { s: "factories", p: "The Lowell Offering was…", ok: "A literary magazine written and published by the women who worked in the Lowell mills", bad: ["The company's wage schedule", "A strike manifesto", "A recruitment pamphlet for Irish workers"], why: "Part of the 'respectable' boardinghouse culture the owners advertised." },
  { s: "factories", p: "Why did Lowell's owners recruit farm daughters specifically?", ok: "An available, cheap, temporary, 'respectable' workforce that would not form a permanent working class", bad: ["They were the only workers with textile skills", "State law required it", "Farm families demanded it"], why: "Wage cuts led to strikes in 1834 and 1836; Irish families replaced them." },
  { s: "factories", p: "Slater's Rhode Island system employed…", ok: "Whole families, including children, in small spinning mills", bad: ["Young single women in boardinghouses", "Enslaved workers", "Skilled British weavers only"], why: "Contrast with Lowell's boardinghouse system." },
  { s: "economy", p: "The 'cult of domesticity' / separate spheres refers to…", ok: "The middle-class ideal of men in the public world of work and women in the private home", bad: ["A religious revival movement", "Boardinghouse rules at Lowell", "A farming cooperative"], why: "Work moved out of the home, and the ideal followed." },
  { s: "economy", p: "The Second Great Awakening's 'burned-over district' was…", ok: "Along the Erie Canal in upstate New York, where Charles Finney's revivals spread", bad: ["The cotton South", "The Ohio River valley", "The Lowell mill towns"], why: "The canal carried people, goods and revivalism." },
  { s: "economy", p: "'Wage labor' as a new social fact meant…", ok: "For the first time large numbers of Americans worked for someone else for cash: the start of a working class", bad: ["Slavery was ending", "Farmers stopped growing food", "Wages were fixed by Congress"], why: "Alongside a new middle class of clerks and professionals." },
  { s: "cherokee", p: "Which president signed the Indian Removal Act, and when?", ok: "Andrew Jackson, 1830", bad: ["James Monroe, 1823", "Martin Van Buren, 1838", "John Quincy Adams, 1828"], why: "His signature policy, passed narrowly." },
  { s: "cherokee", p: "What did Worcester v. Georgia (1832) decide?", ok: "The Cherokee Nation was a distinct community where Georgia's laws had no force; only the federal government could deal with it", bad: ["Georgia could seize Cherokee land", "The Cherokee were U.S. citizens", "Removal was unconstitutional"], why: "John Marshall's ruling; Jackson declined to enforce it." },
  { s: "cherokee", p: "The Treaty of New Echota (1835) was controversial because…", ok: "It was signed by a small unauthorized faction (the Treaty Party), not the elected government under John Ross", bad: ["It paid nothing", "It was signed by Georgia, not the U.S.", "It moved the Cherokee to Florida"], why: "Ross's government protested with a petition of nearly 16,000 signatures." },
  { s: "cherokee", p: "The Trail of Tears (1838 to 39): roughly how many died?", ok: "About 4,000 of about 16,000", bad: ["About 400", "About 12,000", "Nearly all"], why: "General Winfield Scott's troops marched them roughly 1,000 miles to present-day Oklahoma." },
  { s: "cherokee", p: "Who led the Treaty Party that signed New Echota?", ok: "Major Ridge, John Ridge and Elias Boudinot", bad: ["John Ross", "Sequoyah", "Winfield Scott"], why: "Ross led the elected government that opposed it." },
];

const REMOVAL = [
  { e: "Cherokee constitution adopted", y: 1827 },
  { e: "Indian Removal Act", y: 1830 },
  { e: "Worcester v. Georgia", y: 1832 },
  { e: "Treaty of New Echota", y: 1835 },
  { e: "Trail of Tears", y: 1838 },
];

const TRANSPORT = [
  { e: "Cotton gin", y: 1793 },
  { e: "Fulton's Clermont steamboat", y: 1807 },
  { e: "National Road begun", y: 1811 },
  { e: "Waltham mill (Boston Manufacturing Co.)", y: 1813 },
  { e: "Erie Canal completed", y: 1825 },
  { e: "Baltimore & Ohio Railroad", y: 1830 },
];

export const drills: Drill[] = [
  ...(["why", "transport", "factories", "economy", "cherokee", "quiz"] as const).map((sec) => ({
    id: `${sec}!quiz`,
    guideId: G,
    sectionRef: sec,
    title: sec === "quiz" ? "Quiz #2, any heading" : "Quiz-style question",
    skill: "Multiple choice on lecture content: the Market Revolution, Lowell, and Cherokee removal.",
    gen(r: Parameters<Drill["gen"]>[0]) {
      const pool = sec === "quiz" ? QUIZ : QUIZ.filter((q) => q.s === sec);
      const q = r.pick(pool);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad, { correct: q.why }), steps: [q.why] };
    },
  })),
  {
    id: "cherokee!order",
    guideId: G,
    sectionRef: "cherokee",
    title: "Cherokee removal in order",
    skill: "Constitution → Removal Act → Worcester → New Echota → Trail of Tears.",
    gen(r) {
      const shuffled = r.shuffle(REMOVAL);
      return {
        prompt: `Order these, earliest first (type the numbers): ${shuffled.map((e, i) => `**${i + 1}** ${e.e}`).join("; ")}.`,
        answer: { kind: "sequence", items: REMOVAL.map((e) => String(shuffled.indexOf(e) + 1)) },
        steps: REMOVAL.map((e) => `${e.y}: ${e.e}`),
        hint: "The Cherokee organized first (1827); Jackson's act came in 1830; the court ruled in 1832; the fake treaty 1835; the march 1838.",
      };
    },
  },
  {
    id: "transport!order",
    guideId: G,
    sectionRef: "transport",
    title: "The transportation revolution in order",
    skill: "Roads, steamboats, canals, railroads: which came when.",
    gen(r) {
      const pick = r.sample(TRANSPORT, 4).sort((a, b) => a.y - b.y);
      const shuffled = r.shuffle(pick);
      return {
        prompt: `Order these, earliest first (type the numbers): ${shuffled.map((e, i) => `**${i + 1}** ${e.e}`).join("; ")}.`,
        answer: { kind: "sequence", items: pick.map((e) => String(shuffled.indexOf(e) + 1)) },
        steps: pick.map((e) => `${e.y}: ${e.e}`),
      };
    },
  },
  {
    id: "factories!table",
    guideId: G,
    sectionRef: "factories",
    title: "Slater vs Lowell",
    skill: "Product, scale, workers, housing: which system is which.",
    gen(r) {
      const rows = [
        { k: "Product", s: "Thread only (spinning)", l: "Finished cloth (spinning + weaving)" },
        { k: "Scale", s: "Small mills", l: "Large integrated factories, corporate ownership" },
        { k: "Workers", s: "Whole families, including children", l: "Young single women, later Irish families" },
        { k: "Housing", s: "Family cottages", l: "Company boardinghouses with rules" },
      ];
      const t = r.pick(rows);
      const askS = r.next() < 0.5;
      const ok = askS ? t.s : t.l;
      return {
        prompt: `**${t.k}** in the ${askS ? "Slater / Rhode Island" : "Lowell / Waltham"} system:`,
        answer: choice(r, ok, [askS ? t.l : t.s, ...r.sample(rows.filter((x) => x !== t).map((x) => (askS ? x.s : x.l)), 2)], { correct: `Slater: ${t.s}. Lowell: ${t.l}.` }),
        steps: [`${t.k}: Slater = ${t.s}; Lowell = ${t.l}.`],
      };
    },
  },
];
