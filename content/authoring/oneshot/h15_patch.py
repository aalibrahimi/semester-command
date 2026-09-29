"""Fill lecture gaps in the two older HIST 15 chapters (8, 11) and clean em
dashes in all three older ones (6, 8, 11). Reads the committed JSON, drops
ids, inserts blocks, rebuilds (new stable ids)."""
import json, subprocess
from h15common import *

def load(slug):
    raw = subprocess.run(["git", "-C", REPO, "show", f"HEAD:src/study/guides/hist15--{slug}.json"], capture_output=True, text=True, check=True).stdout
    g = clean(json.loads(raw))
    for s in g["sections"]:
        for b in s["blocks"]:
            b.pop("id", None)
    return g

def sec(g, sid):
    return next(s for s in g["sections"] if s["id"] == sid)

def insert_after(s, pred, *blocks):
    i = next(k for k, b in enumerate(s["blocks"]) if pred(b))
    s["blocks"][i + 1:i + 1] = list(blocks)

def text(b):
    return b.get("md") or b.get("body") or b.get("prompt") or b.get("caption") or b.get("term") or ""

# ── Walker: clean only ────────────────────────────────────────────────────
build(load("6-walker"))

# ── Chapter 8: Articles and Constitution ─────────────────────────────────
g = load("8-confederation-to-constitution")
g["sourceNote"] += " Also Dr. Jeffrey's 'Articles of Confederation and the Constitution' slides and Class Discussion #3 (Sep 9)."

a = sec(g, "articles")
insert_after(a, lambda b: b.get("term", "").startswith("Could NOT raise"),
    CARDS([
        ("Money and trade", "no power", ["Could not tax; could only ask states for money.", "Could not regulate trade between the states."], "red"),
        ("Holding it together", "no teeth", ["Could not force delegates to attend.", "No way to settle conflicts between states.", "No help in a crisis (think Shays's Rebellion)."], "amber"),
        ("Structure and votes", "hard to act", ["No executive, no national courts.", "7 states to pass ordinary laws, 9 for war and treaties, 13 to amend."], "brand"),
    ], "The lecture's list of the Articles' limits, grouped. When a quiz asks 'which was a weakness of the Articles?', the answer is on one of these cards.", slide="The limits, lecture version"),
    D("State constitutions (1776 to 1780)", "While the Articles kept the national government weak, each state wrote its own constitution. The lecture's features: government rests on the **consent of the governed**; **weak governors** and strong elected **assemblies** (fear of another king); **seven states** added a **bill of rights**; voting was tied to owning **property**. **Example:** the states, not Congress, were where real power sat in the 1780s."),
)

c = sec(g, "changed")
insert_after(c, lambda b: "Virginia Plan" in text(b),
    CMP(("Virginia Plan", "James Madison · favors big states", "brand"), ("New Jersey Plan", "William Paterson · favors small states", "amber"), [
        ("Branches", "Three: legislative, executive, judicial", "Kept Congress as the center, with a weak executive"),
        ("Congress", "**Two houses**, both by population", "**One house**, one vote per state"),
        ("Executive", "Chosen by Congress", "A **three-person** executive elected by Congress"),
        ("New powers", "Broad national power, veto over state laws", "Add power to **tax**, regulate **trade**, and use **force** on states"),
    ], "The two plans on the lecture slides. The Great Compromise took the Virginia Plan's population-based House and the New Jersey Plan's equal-vote Senate.", slide="Two plans"),
    D("Montesquieu, The Spirit of the Laws (1748)", "A French writer who argued liberty is safe only when lawmaking, enforcing and judging are held by **separate** powers. **Example:** the Virginia Plan's three branches, and the checks between them, come from him."),
)
insert_after(c, lambda b: b["type"] == "table",
    TL("From the Articles to the Constitution, 1777 to 1791", [
        ("1777", "Articles drafted"),
        ("1781", "Articles ratified", "amber"),
        ("1786–87", "Shays's Rebellion", "red"),
        ("May 1787", "Convention opens", "brand"),
        ("Sept 1787", "Constitution signed", "brand"),
        ("1788", "Ninth state ratifies", "green"),
        ("1791", "Bill of Rights", "green"),
    ], [
        (0, "**1777.** Congress drafts the Articles: a 'league of friendship' with one branch and no power to tax.", 15),
        (1, "**1781.** All thirteen states finally ratify. The national government can ask, but not require.", 15),
        (2, "**1786 to 1787.** Farmers in Massachusetts, crushed by debt and state taxes, rise up. Congress **cannot help**. Elites panic.", 10),
        (3, "**May 1787.** Delegates meet in Philadelphia to fix the Articles, and instead write a new plan: Virginia vs New Jersey.", 45),
        (4, "**September 1787.** The Constitution is signed: three branches, taxing power, the Great Compromise, the three-fifths clause.", 75),
        (5, "**1788.** New Hampshire is the **ninth** state to ratify, so the Constitution takes effect. Federalists win, narrowly.", 80),
        (6, "**1791.** The Bill of Rights, promised to win over Anti-Federalists, is ratified.", 80),
    ], meter={"label": "Power of the national government (a rough picture)", "tone": "brand", "low": "league", "high": "strong"}),
)

disc = {"id": "discussion", "heading": "Class Discussion #3: the Constitution and 'Are We to Be a Nation?'", "blocks": [
    P("**The two discussion questions (Sep 9).** (1) Analyze a **specific power** in the Article of the Constitution you were assigned, and cite it (Article, Section, Clause). (2) Using the PBS documentary *Liberty!*, Episode 6, 'Are We to Be a Nation? 1783–1788', discuss the **debate** over the Constitution: its **benefits and drawbacks**, with examples.", slide="The questions"),
    T(["Article", "Branch or topic", "One power to analyze"], [
        ["I", "Congress", "Section 8: 'To lay and collect Taxes, Duties, Imposts and Excises'"],
        ["II", "The President", "Section 2: commander in chief; makes treaties with two-thirds of the Senate"],
        ["III", "The courts", "Section 2: judicial power over cases under the Constitution and federal laws"],
        ["IV", "The states", "Section 1: full faith and credit for other states' records and court rulings"],
        ["V", "Amendments", "Two-thirds of Congress to propose, three-fourths of states to ratify"],
        ["VI", "Supremacy", "Clause 2: the Constitution and federal laws are 'the supreme Law of the Land'"],
        ["VII", "Ratification", "Nine states' conventions to put it into effect"],
    ], title="One power per Article (with the citation format)", slide="Powers by Article"),
    WHEN("**Your exercise was on Article I, Section 8, the power to tax.** The strong version ties the power back to the problem it solved: under the Articles Congress could only **ask** states for money, so war debts and soldiers went unpaid. Clause 1 lets Congress tax individuals directly 'to pay the Debts and provide for the common Defence and general Welfare'."),
    CMP(("Benefits (Federalists)", "Madison, Hamilton, Jay", "green"), ("Drawbacks (Anti-Federalists)", "Patrick Henry, George Mason", "red"), [
        ("Money", "A government that can tax can pay its debts and army", "Distant officials taxing people directly, like Parliament did"),
        ("Order", "Can answer a Shays's Rebellion or a foreign threat", "A strong central power and standing army threaten liberty"),
        ("Rights", "Separated powers and checks protect liberty", "**No bill of rights** in the original text"),
        ("Size", "A large republic balances many factions (Federalist 10)", "Only small republics stay close to the people"),
    ], "The debate the documentary follows, point by point. For Q2, pick one row from each side and give an example.", slide="The ratification debate"),
    C("What citation format does the discussion ask for when you name a power?", "Article, Section, Clause, for example **Article I, Section 8, Clause 1** (the taxing power)."),
    C("Give one benefit and one drawback of the Constitution from the ratification debate.", "Benefit: Congress can **tax** and pay debts / keep order. Drawback: **no bill of rights** in the original, and a strong central government far from the people."),
]}
qi = next(i for i, s in enumerate(g["sections"]) if s["id"] == "quiz")
g["sections"].insert(qi, disc)
g["exercises"].append(EX("article-power", "Discussion #3 Q1: analyze a power with a citation",
    "In 4 to 5 sentences, analyze Congress's power to tax, with the citation, and explain why the framers gave it.",
    ["Start with the exact citation and the words of the clause.", "Then the 'why': what failed under the Articles without it?", "End with one consequence or limit (direct taxes had to be apportioned by population, which is where the three-fifths clause matters)."],
    ["Article I, Section 8, Clause 1 gives Congress power 'to lay and collect Taxes, Duties, Imposts and Excises, to pay the Debts and provide for the common Defence and general Welfare of the United States'.",
     "The framers added it because under the Articles of Confederation Congress could only request money from the states, which mostly refused.",
     "Without revenue the government could not pay its war debts or soldiers, or respond to crises like Shays's Rebellion.",
     "The taxing power let the national government act directly on citizens instead of begging the states.",
     "It was also one of the Anti-Federalists' biggest fears, since it recalled Parliament's taxes before the Revolution."],
    "Reading a clause, citing it exactly, and explaining the problem it solves is the everyday work of lawyers, policy analysts and journalists.", ref="discussion"))
build(g)

# ── Chapter 11: Market Revolution, Lowell, Cherokee ──────────────────────
g = load("11-market-revolution")
g["sourceNote"] += " Checked against Dr. Jeffrey's 'Market Revolution' (15 slides) and 'Cherokee & Abolitionism' slides."

w = sec(g, "why")
w["blocks"][1:1] = [
    D("Commercialization", "Producing goods to **sell** for cash rather than to use at home or trade with neighbors. **Example:** a farm family that once made its own cloth now grows wheat for market and buys cloth."),
    D("Industrialization", "Making goods in **factories** with machines and wage workers instead of by hand at home. **Example:** the Lowell mills turning raw cotton into finished cloth."),
    D("Transportation revolution", "Canals, steamboats and railroads that made moving goods fast and cheap. The lecture's point: it is what **made the market revolution possible**, by connecting farms to distant markets."),
]

f = sec(g, "factories")
insert_after(f, lambda b: b["type"] == "prose" and "farm" in text(b),
    CARDS([
        ("Who", "1830s", ["About **5,000 women** worked in Lowell's mills.", "Mostly single farm daughters, ages **16 to 23**."], "brand"),
        ("Hours and pay", "6 × 12", ["**Six days** a week, about **12 hours** a day.", "About **$2 to $3 a week** after board."], "amber"),
        ("Why they came", "choice", ["Help their families, save for marriage, pay for schooling.", "Independence: money of their own, away from home."], "green"),
    ], "Lowell by the lecture's numbers.", slide="Lowell by the numbers"),
    TL("Lowell: rise, strikes, and replacement", [
        ("1813", "Waltham mill"),
        ("1823", "Lowell mills open", "green"),
        ("1830s", "5,000 women at work"),
        ("1834", "Wage cut → turnout", "red"),
        ("1836", "Board raised → turnout", "red"),
        ("1837", "Depression", "amber"),
        ("1840s–50s", "Irish immigrants replace them"),
    ], [
        (0, "**1813.** Francis Cabot Lowell's Boston Manufacturing Company opens the first mill that turns raw cotton into cloth under one roof.", 50),
        (1, "**1820s.** The company builds a whole mill town on the Merrimack River and names it **Lowell**.", 55),
        (2, "**1830s.** About 5,000 young women live in company boardinghouses and work 12-hour days for $2 to $3 a week.", 60),
        (3, "**1834.** Cloth prices fall and owners **cut wages about 15%**. The women walk out: a 'turnout'. It fails, but they have organized.", 45),
        (4, "**1836.** Owners raise the price of **board**, a wage cut in disguise. A bigger turnout follows.", 35),
        (5, "**1837.** A depression hits. With jobs scarce, workers lose leverage.", 20),
        (6, "**1840s to 1850s.** Owners replace the Yankee women with **Irish immigrants** who had fewer choices and accepted lower pay.", 10),
    ], meter={"label": "The women's bargaining power (a rough picture)", "tone": "amber", "low": "none", "high": "strong"}),
)

e = sec(g, "economy")
insert_after(e, lambda b: b.get("term", "").startswith("Separate spheres"),
    D("True Womanhood", "The middle-class ideal of the perfect woman: **pious, pure, submissive, and domestic**. Her job was to make the home a moral refuge from the market. **Example:** the image on the Market Revolution exercise."),
    D("Godey's Lady's Book", "The most popular women's magazine of the era (from 1830), with fashion plates, fiction and household advice. It **spread** the separate-spheres and True Womanhood ideals to middle-class homes. **Example:** the second image on the Sep 14 exercise."),
    CARDS([
        ("Paid labor", "wages", ["Factory hands, clerks, day laborers.", "Work set by the **clock** and the bell, not the sun."], "brand"),
        ("Unpaid labor", "the home", ["Housework, childcare, farm work by wives and daughters.", "Essential, but no longer counted as 'work'."], "amber"),
        ("Enslaved labor", "forced", ["Grew the cotton that fed the mills.", "The market revolution ran on it."], "red"),
    ], "The lecture's three kinds of labor in the new economy.", slide="Three kinds of labor"),
)

ch = sec(g, "cherokee")
for b in ch["blocks"]:
    if b.get("term", "").startswith("The Trail of Tears"):
        b["body"] = b["body"].replace("roughly 1,000 miles", "about 1,200 miles (the lecture's figure; routes varied)")
insert_after(ch, lambda b: b.get("term", "").startswith("Indian Removal Act"),
    D("Cherokee Nation v. Georgia (1831)", "The Cherokee sued Georgia in the Supreme Court. Chief Justice Marshall called them a **'domestic dependent nation'**, not a foreign nation, so they **could not sue** there. The case was dismissed. **Example:** the loss that led to Worcester v. Georgia a year later."),
)
insert_after(ch, lambda b: b.get("term", "").startswith("Treaty of New Echota"),
    CARDS([
        ("Andrew Jackson", "President", ["Signed the Indian Removal Act (1830).", "Would not enforce Worcester v. Georgia."], "red"),
        ("John Ross", "Principal Chief", ["Led the elected Cherokee government against removal.", "His 1836 petition to Congress was never reviewed."], "green"),
        ("Samuel Worcester", "missionary", ["Jailed by Georgia for living on Cherokee land without a state license.", "His case, Worcester v. Georgia (1832), won."], "brand"),
        ("Major Ridge, John Ridge, Elias Boudinot", "Treaty Party", ["Decided removal was unavoidable.", "Signed the Treaty of New Echota (1835) without authority."], "amber"),
    ], "The lecture's key people.", slide="Who's who"),
    TL("Cherokee removal, 1827 to 1839", [
        ("1827", "Cherokee constitution", "green"),
        ("1830", "Indian Removal Act", "red"),
        ("1831", "Cherokee Nation v. Georgia"),
        ("1832", "Worcester v. Georgia", "green"),
        ("1835", "Treaty of New Echota", "red"),
        ("1836", "Ross's petition ignored"),
        ("1838–39", "Trail of Tears", "red"),
    ], [
        (0, "**1827.** The Cherokee adopt a written constitution and declare themselves a nation inside Georgia's borders.", 100),
        (1, "**1830.** Jackson signs the **Indian Removal Act**: land in the West in exchange for Native land in the East.", 90),
        (2, "**1831.** The Cherokee sue Georgia. The Court calls them a 'domestic dependent nation' that cannot sue as a foreign one.", 85),
        (3, "**1832.** In **Worcester v. Georgia** the Cherokee **win**: Georgia's laws have no force on their land. Jackson won't enforce it.", 80),
        (4, "**1835.** A small unauthorized faction signs the **Treaty of New Echota**, giving up all Cherokee land.", 40),
        (5, "**1836.** John Ross petitions Congress against the treaty. The petition is **never reviewed**; the Senate ratifies the treaty.", 25),
        (6, "**1838 to 1839.** The army forces the Cherokee west, about 1,200 miles. About **4,000** die on the **Trail of Tears**.", 0),
    ], meter={"label": "Cherokee homeland still held in the East (a rough picture)", "tone": "green", "low": "none", "high": "all"}),
)
g["exercises"].append(MC("cnvg-mc", "Which case?", "Which Supreme Court case called the Cherokee a 'domestic dependent nation' and dismissed their suit?",
    ["Cherokee Nation v. Georgia (1831)", "Worcester v. Georgia (1832)", "Marbury v. Madison (1803)", "McGirt v. Oklahoma (2020)"], 0,
    ["Right: the Cherokee lost this one; they won the next year.", "Worcester is the one they won.", "Marbury is about judicial review.", "McGirt is a modern case about Creek land."],
    ["Cherokee Nation v. Georgia (1831)."], "The two Georgia cases are easy to mix up on a quiz: lost in 1831, won in 1832.", ref="cherokee"))
build(g)
