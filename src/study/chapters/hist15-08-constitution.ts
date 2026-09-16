import type { Chapter } from "../types";

/**
 * HIST 15 · Chapters 8–9 — the Quiz #1 reading, written as the textbook
 * replacement (the reader opted out of The American Promise). Organized
 * around the exact section headings Dr. Jeffrey assigned, because the quiz
 * is written from those sections.
 */
export const hist15Constitution: Chapter = {
  slug: "8-confederation-to-constitution",
  label: "Ch. 8–9",
  title: "From Confederation to Constitution, and the 1790s",
  source: "The American Promise ch. 8 (assigned sections) and ch. 9 ('sources of political stability in the 1790s'); the Sep 2 lecture; the PBS documentary 'Are We to Be a Nation?'. This is Quiz #1.",
  goal: "Answer any multiple-choice question on why the Articles failed, what the Constitution changed, why people objected, and what held the 1790s together — with the names, dates and terms a textbook quiz uses.",
  minutes: 60,
  sections: [
    {
      id: "why",
      title: "The story in one paragraph",
      blocks: [
        { id: "why-1", t: "p", slide: "The arc", text: "In 1776 thirteen colonies declared independence together but did not want to be one country — they'd just fought a king, and a strong central government looked like another king. So they built the weakest national government they could: the **Articles of Confederation**. Within six years it couldn't pay its debts, couldn't protect its borders, and couldn't stop an armed uprising in Massachusetts. In 1787 a convention meant to *revise* it instead threw it out and wrote the **Constitution**, which created a real national government. Roughly half the country thought that was a betrayal of the Revolution. They lost the ratification fight but won a **Bill of Rights**. Then in the 1790s Washington and Hamilton made the new government work — and in doing so split the country into its first two political parties." },
        { id: "why-2", t: "prof", title: "How the quiz will ask it", text: "Quiz #1 is 15 multiple-choice questions in 30 minutes, drawn from four section headings in ch. 8 and one in ch. 9. Each heading below IS a section heading from the book. A textbook quiz asks: what did X do, why did Y fail, who argued Z, what year. Read each section for the bolded terms and the named people — those are the answer choices." },
      ],
    },
    {
      id: "articles",
      title: "What kind of government did the Articles of Confederation create?",
      blocks: [
        { id: "art-1", t: "p", slide: "A league, not a nation", text: "The Articles were drafted by the Continental Congress in 1777 and finally ratified by all thirteen states in 1781. The document calls the union a **'firm league of friendship'** — that phrase matters, because it tells you what they were building: an alliance of thirteen sovereign states, not a nation. Each state kept 'its sovereignty, freedom, and independence.'" },
        { id: "art-2", t: "list", slide: "The structure", items: [
          "**One branch only**: a Congress. No president (no executive), no national courts (no judiciary). Congress did everything, which meant it could do little.",
          "**One state, one vote**, regardless of population. Virginia and Delaware counted the same.",
          "**Nine of thirteen** states had to agree to pass anything important (declare war, make treaties, borrow money).",
          "**All thirteen** had to agree to amend the Articles. One state could block any change — and one always did.",
        ] },
        { id: "art-3", t: "list", slide: "What Congress could and could not do", items: [
          "**Could**: declare war and make peace, conduct diplomacy and sign treaties, coin money, run a post office, manage the western territories.",
          "**Could NOT tax.** It could only *request* money from the states, who mostly ignored the requests.",
          "**Could NOT regulate commerce** between states or with other countries. States taxed each other's goods.",
          "**Could NOT raise an army** on its own; it depended on state militias.",
        ] },
        { id: "art-4", t: "p", slide: "Its one big success: the West", text: "The Articles government did get one thing enduringly right. The **Land Ordinance of 1785** laid the survey grid — townships six miles square, sections of 640 acres, one section per township reserved for schools — that still shapes the Midwest from an airplane window. The **Northwest Ordinance of 1787** set the process by which a territory becomes a state (a governor, then a legislature at 5,000 free men, then statehood at 60,000 on equal footing with the original states) and **banned slavery north of the Ohio River**. That ban is the first federal limit on slavery and the seed of the free-state/slave-state divide." },
        { id: "art-5", t: "try", q: "Why did the Articles require unanimous consent to amend, and what did that guarantee?", a: "Because each state was sovereign and no state would accept being outvoted on the rules of the league. It guaranteed the Articles could never be fixed from inside: every proposed tax amendment (1781, 1783) died because a single state (Rhode Island, then New York) refused." },
      ],
    },
    {
      id: "failed",
      title: "Why did the Articles of Confederation fail?",
      blocks: [
        { id: "fail-1", t: "why", slide: "Four failures, one cause", title: "One cause", text: "Every failure below traces to the same design choice: a government that couldn't tax or compel. Remember that and you can reconstruct the list on the quiz." },
        { id: "fail-2", t: "list", slide: "Money", items: [
          "The war left a huge debt owed to soldiers, suppliers, and foreign lenders (France, the Dutch). Congress had no way to pay it — it couldn't tax.",
          "Congress had printed paper money ('Continentals') during the war that became worthless: 'not worth a Continental' entered the language.",
          "States printed their own money and put tariffs on goods from neighboring states. There was no national economy, just thirteen quarreling ones.",
        ] },
        { id: "fail-3", t: "list", slide: "Weakness abroad", items: [
          "Britain kept its forts in the Northwest (Detroit, Niagara) in violation of the 1783 peace treaty, and Congress couldn't force them out.",
          "Spain closed the Mississippi River to American trade in 1784, strangling western farmers. Congress had no leverage.",
          "Barbary pirates seized American ships in the Mediterranean; Britain no longer protected them and Congress had no navy.",
        ] },
        { id: "fail-4", t: "p", slide: "Shays's Rebellion, 1786–87 — the shock", text: "Massachusetts tried to pay its war debt with heavy taxes in hard money. Farmers in the western part of the state, many of them Revolutionary War veterans, couldn't pay and were losing their farms in debt court. Led by **Daniel Shays**, a former captain, they closed the courts by force and marched on the federal arsenal at Springfield in January 1787. The Confederation government could do nothing — it had no army and no money. Massachusetts put the rising down with a privately funded militia. To the country's elites, this was the proof: a government that couldn't protect a federal arsenal from its own citizens wasn't a government. Washington wrote that he was 'mortified beyond expression.'" },
        { id: "fail-5", t: "p", slide: "From Annapolis to Philadelphia", text: "In September 1786 a meeting at **Annapolis** to fix trade problems drew only five states — too few to do anything — but the delegates (including **Alexander Hamilton** and **James Madison**) called for a new convention in Philadelphia in May 1787 'to render the federal constitution adequate.' Shays's Rebellion, happening at that exact moment, got Congress to endorse it. Fifty-five delegates from twelve states came (Rhode Island refused). Their instructions were to *revise* the Articles. They locked the doors and wrote a new government instead." },
        { id: "fail-6", t: "try", q: "Which event most directly persuaded reluctant states and Congress to support the Philadelphia Convention?", a: "Shays's Rebellion (winter 1786–87). It showed the national government couldn't respond to armed unrest even at a federal arsenal, and it frightened property-owning elites in every state." },
      ],
    },
    {
      id: "changed",
      title: "How did the Constitution change the nation's form of government?",
      blocks: [
        { id: "ch-1", t: "p", slide: "The big shift: federal, not confederal", text: "The Articles made a league of states; the Constitution made a **federal republic** — a national government with direct power over individual citizens (it can tax *you*, not just ask your state), supreme over state law in its own sphere (the **supremacy clause**, Article VI), and able to do the two things the Articles couldn't: **tax** and **regulate commerce**. Power was divided between nation and states — that division is what 'federalism' means." },
        { id: "ch-2", t: "list", slide: "Three branches, checks and balances", items: [
          "**Legislative** (Article I): a two-house Congress with enumerated powers, plus the 'necessary and proper' clause that lets it stretch them.",
          "**Executive** (Article II): a single **President**, chosen by an **Electoral College**, commander in chief, able to veto laws.",
          "**Judicial** (Article III): a **Supreme Court** and lower federal courts.",
          "Each branch checks the others: Congress passes laws, the President can veto, Congress can override; the President appoints judges, the Senate confirms; and so on. The design assumes people are ambitious and sets ambition against ambition (Madison, Federalist 51).",
        ] },
        { id: "ch-3", t: "p", slide: "The Great Compromise", text: "The convention nearly broke over representation. Madison's **Virginia Plan** proposed two houses both apportioned by population — big states would dominate. The **New Jersey Plan** (William Paterson) kept one vote per state. Roger Sherman's **Connecticut Compromise** (the 'Great Compromise') split it: the **House** apportioned by population, the **Senate** with two members per state regardless of size. That's why Wyoming and California each have two senators today." },
        { id: "ch-4", t: "p", slide: "The compromises over slavery", text: "The word 'slavery' appears nowhere in the Constitution, but three clauses protect it. The **Three-fifths Compromise**: for both representation in the House and direct taxes, enslaved people would be counted as three-fifths of a person — giving southern states extra seats and extra electoral votes for people who could not vote. Congress could not ban the **international slave trade** until **1808** (Article I, Section 9). And the **fugitive slave clause** (Article IV) required that people escaping slavery be returned even from free states. These were the price of getting South Carolina and Georgia to sign. They are also exactly the gap David Walker will attack in 1829 — keep this section in mind for Friday's exercise." },
        { id: "ch-5", t: "p", slide: "Ratification by the people, not the legislatures", text: "The convention required approval by **nine of thirteen** states (not all, as the Articles demanded) and by **special conventions** elected for the purpose rather than by state legislatures. Two reasons: the legislatures would lose power and would likely vote no, and a document that opens 'We the People' needed the people's direct consent to claim authority above the states." },
        { id: "ch-6", t: "table", slide: "Articles vs Constitution, side by side", rows: [
          ["", "Articles (1781)", "Constitution (1788)"],
          ["Nature of union", "League of sovereign states", "Federal republic; national law supreme"],
          ["Branches", "Congress only", "Legislative, executive, judicial"],
          ["Voting in Congress", "One state, one vote", "House by population; Senate 2 per state"],
          ["Taxation", "Request from states", "Congress taxes directly"],
          ["Commerce", "No power", "Congress regulates interstate & foreign"],
          ["Executive", "None", "President"],
          ["Courts", "None", "Supreme Court + federal courts"],
          ["Amend", "All 13 states", "2/3 Congress + 3/4 states"],
          ["Approved by", "State legislatures, unanimously", "9 of 13 state conventions"],
        ] },
        { id: "ch-7", t: "try", q: "What did the Three-fifths Compromise give the South, concretely?", a: "More seats in the House and more electoral votes than its free population warranted — about a third more, by counting enslaved people who had no political rights. It's why Virginians held the presidency for 32 of the first 36 years." },
      ],
    },
    {
      id: "objected",
      title: "Why did so many Americans object to the Constitution?",
      blocks: [
        { id: "obj-1", t: "p", slide: "Anti-Federalists: the Revolution's logic turned on the Constitution", text: "The people who opposed ratification called themselves the true heirs of 1776 and got stuck with the name their opponents gave them: **Anti-Federalists**. Their leaders included **Patrick Henry** ('I smell a rat'), **George Mason** (who had written Virginia's Declaration of Rights and refused to sign the Constitution), **Richard Henry Lee**, and Governor **George Clinton** of New York. Their base was small farmers, debtors, and the western backcountry." },
        { id: "obj-2", t: "list", slide: "Their objections", items: [
          "**Consolidation**: a distant, powerful central government would swallow the states and become the tyranny they'd just escaped. The President looked like a king; the Senate like an aristocracy.",
          "**Size**: the political theory of the day (Montesquieu) said republics only work in small territories where representatives know their constituents. A continental republic was a contradiction.",
          "**Standing army** and the power to tax — the two things Britain had used against them.",
          "**Class**: the document favored the wealthy creditor class and was written in secret by elites.",
          "**No Bill of Rights** — the objection that stuck. The Constitution listed the government's powers but not the people's protections: no guarantee of speech, press, religion, jury trial.",
        ] },
        { id: "obj-3", t: "p", slide: "Federalists: the answer", text: "Supporters — **Federalists** — had the better organization, the newspapers, and Washington's endorsement. **Hamilton, Madison, and John Jay** wrote 85 essays as 'Publius', *The Federalist*, to win New York. The most famous, **Federalist No. 10**, flips the size objection: a *large* republic is *safer*, because with so many competing factions no single one can seize control. To win the close states, Federalists promised to add a bill of rights by amendment once the Constitution was in place." },
        { id: "obj-4", t: "p", slide: "Ratification and the Bill of Rights", text: "Delaware ratified first (December 1787). **New Hampshire** was the ninth, in June 1788, making it law — but the union was meaningless without Virginia and New York, which ratified narrowly (89–79 and 30–27) on the promise of amendments. Madison then drafted the amendments himself in the first Congress; ten were ratified as the **Bill of Rights** in **1791**. North Carolina and Rhode Island only joined after seeing them." },
        { id: "obj-5", t: "prof", title: "The documentary's framing", text: "'Are We to Be a Nation? 1783–1788' is built as the Federalist–Anti-Federalist debate. If a quiz question asks what the documentary presents as the central question, it's whether thirteen states would consent to become one nation under a government strong enough to govern — and the Anti-Federalists' answer, that liberty is safer close to home, is treated as a serious argument, not a mistake." },
        { id: "obj-6", t: "try", q: "Federalist No. 10 argued that a large republic was better than a small one. Why?", a: "Because a large republic contains many factions (interests), so no single faction can form a majority and oppress the rest; and a larger pool of candidates yields better representatives. This reversed the Anti-Federalist (Montesquieu) claim that republics must be small." },
      ],
    },
    {
      id: "conclusion",
      title: "Conclusion of chapter 8: what the Constitution settled and what it didn't",
      blocks: [
        { id: "con-1", t: "p", slide: "Settled and unsettled", text: "By 1789 the United States had a government that could tax, trade, defend itself, and enforce its laws — the things the Articles couldn't. What it had *not* settled: how far federal power reached versus the states (the argument of the 1790s and of 1861), and slavery, which the compromises deferred rather than resolved. The textbook's conclusion makes this point: the Constitution was a framework, and the fights over what it meant began immediately." },
      ],
    },
    {
      id: "stability",
      title: "Ch. 9 — What were the sources of political stability in the 1790s?",
      blocks: [
        { id: "st-1", t: "why", slide: "Why this is the assigned section", title: "The question the section answers", text: "A brand-new government under a document half the country had opposed could easily have collapsed. It didn't. The section asks why. The answer has five parts, and the quiz will ask about each." },
        { id: "st-2", t: "p", slide: "1 · Washington", text: "**George Washington** was elected unanimously by the Electoral College in 1789 — the only president ever to be. He knew every act set a precedent and chose carefully: he created a **cabinet** (Jefferson at State, Hamilton at Treasury, Knox at War, Randolph as Attorney General), insisted on the plain title 'Mr. President' over 'His Highness', toured the states to make the office visible, and retired after **two terms** — a limit followed until FDR and then written into the 22nd Amendment. His **Farewell Address** (1796) warned against permanent foreign alliances and against political parties." },
        { id: "st-3", t: "p", slide: "2 · The Bill of Rights and the Judiciary Act", text: "The first Congress did two things that reconciled the losers of ratification. It passed the **Bill of Rights** (1791), answering the Anti-Federalists' main complaint. And the **Judiciary Act of 1789** built the court system the Constitution had only sketched: a **Supreme Court** of six justices, thirteen district courts, and three circuit courts — with the federal courts able to review state court decisions on federal questions." },
        { id: "st-4", t: "p", slide: "3 · Hamilton's financial program", text: "Treasury Secretary **Alexander Hamilton** set out to make the national government's credit sound and to bind the wealthy to its success. His *Report on Public Credit* (1790) proposed **funding** the national debt at full face value (paying bondholders in full, even speculators who'd bought bonds cheap) and **assuming** the states' war debts. Then a **national bank** — the **Bank of the United States** (1791) — to hold government funds and issue a stable currency; an **excise tax** on whiskey; and a **tariff** on imports to protect American manufacturing (his *Report on Manufactures*). The logic: creditors who are owed money by the government want the government to survive." },
        { id: "st-5", t: "p", slide: "The Dinner Table Bargain", text: "Assumption of state debts stalled — Virginia had already paid its debts and didn't want to pay Massachusetts's. In June 1790, over dinner, **Jefferson and Madison agreed to deliver southern votes for assumption** in exchange for Hamilton delivering northern votes to put the permanent **national capital on the Potomac** — Washington, D.C. Both sides got what they wanted; the deal is a textbook staple." },
        { id: "st-6", t: "p", slide: "4 · The Whiskey Rebellion, 1794 — Shays's Rebellion answered", text: "Hamilton's whiskey excise fell hardest on western Pennsylvania farmers who turned grain into whiskey because it was the only way to get it to market. In 1794 they tarred and feathered tax collectors and gathered by the thousands. Washington personally led a **13,000-man militia** west; the rebels dissolved before it arrived. Compare 1787: under the Articles, Shays's men closed courts and the national government watched. Under the Constitution, the government marched. That contrast is the whole point of the section." },
        { id: "st-7", t: "p", slide: "5 · Prosperity and expansion", text: "The 1790s were economically good: European wars (after 1793) made American ships the neutral carriers of the Atlantic, exports boomed, and the population grew fast and moved west (Kentucky 1792, Tennessee 1796). A government that presides over growth gets the credit." },
        { id: "st-8", t: "table", slide: "How stability turned into the first parties", rows: [
          ["", "Federalists", "Democratic-Republicans"],
          ["Leaders", "Hamilton, Adams, Washington (in practice)", "Jefferson, Madison"],
          ["Economy", "Commerce, manufacturing, the Bank, funded debt", "Agriculture; the Bank is unconstitutional"],
          ["Constitution", "Loose construction ('necessary and proper')", "Strict construction"],
          ["Foreign policy", "Pro-British (trade); Jay's Treaty 1795", "Pro-French (the Revolution)"],
          ["Base", "Merchants, New England, cities", "Farmers, South, West"],
          ["Crisis", "Alien and Sedition Acts 1798", "Virginia & Kentucky Resolutions (states can nullify)"],
        ] },
        { id: "st-9", t: "p", text: "The section you were assigned stops at stability, but the quiz might reach into what followed: the party split over Hamilton's bank and the French Revolution, **Jay's Treaty** (1795, avoided war with Britain but looked like surrender to Jeffersonians), the **XYZ Affair** (1797–98, French demands for bribes → Quasi-War), and the **Alien and Sedition Acts** (1798, jailing Republican editors) answered by Jefferson and Madison's **Virginia and Kentucky Resolutions**. If a question names one of those, put it on the Federalist or Republican side using the table." },
        { id: "st-10", t: "try", q: "Name three parts of Hamilton's program and the purpose that connected them.", a: "Funding the national debt at par, assuming state debts, and a national bank (also the excise and tariff). Purpose: establish the nation's credit and give wealthy creditors a stake in the federal government's survival." },
        { id: "st-11", t: "try", q: "Why does a historian call the Whiskey Rebellion a 'source of stability' rather than a threat to it?", a: "Because its suppression demonstrated that the new government could enforce federal law with force — precisely what the Articles government had failed to do in Shays's Rebellion seven years earlier." },
      ],
    },
    {
      id: "quiz",
      title: "Quiz #1 rehearsal",
      blocks: [
        { id: "q-0", t: "prof", title: "How to take it", text: "Open book, 30 minutes, 15 questions, ONE attempt, one question per page (you can go back). Two minutes per question. Keep this chapter open in another window and use the browser's find. Take the Practice Quiz at the top of Canvas first to confirm your browser works." },
        { id: "q-1", t: "try", q: "Under the Articles, how many states were needed to amend the document?", a: "All thirteen (unanimous)." },
        { id: "q-2", t: "try", q: "Which plan proposed representation by population in both houses, and who wrote it?", a: "The Virginia Plan, drafted by James Madison (presented by Edmund Randolph)." },
        { id: "q-3", t: "try", q: "The Northwest Ordinance of 1787 is significant because it…", a: "Set the process for territories to become equal states and banned slavery north of the Ohio River." },
        { id: "q-4", t: "try", q: "Which state's ratification made the Constitution take effect, and in what year?", a: "New Hampshire, the ninth state, June 1788." },
        { id: "q-5", t: "try", q: "What did Anti-Federalists most successfully demand as a condition of ratification?", a: "A Bill of Rights — added as the first ten amendments in 1791." },
        { id: "q-6", t: "try", q: "The 'Dinner Table Bargain' traded what for what?", a: "Southern votes for Hamilton's assumption of state debts, in exchange for locating the national capital on the Potomac." },
        { id: "q-7", t: "try", q: "Which of Washington's actions became a precedent later written into the Constitution?", a: "Retiring after two terms (the 22nd Amendment, 1951)." },
        { id: "q-8", t: "try", q: "Until what year did the Constitution protect the international slave trade from Congress?", a: "1808." },
      ],
    },
  ],
};
