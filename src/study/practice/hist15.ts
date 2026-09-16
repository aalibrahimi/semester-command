import type { Exercise } from "../types";

/**
 * HIST 15 · "Do it yourself" sets. Shaped like the in-class exercises (read a
 * source, state its argument and context under a timer) and the textbook-style
 * quizzes (cause → effect, sequence, 'which of these').
 */
export const hist15Practice: Record<string, Exercise[]> = {
  "6-walker": [
    {
      id: "argument-in-four",
      title: "Write the Q1 answer cold",
      prompt: "Without looking at the model answer: in 4–5 sentences, state Walker's central argument in the Appeal and quote or closely paraphrase two key phrases that carry it. Write it in your scratch box, then time yourself reading it aloud — it should take under 45 seconds.",
      hints: [
        "An argument is a claim plus the reason. Walker's claim is about what enslaved and free Black Americans should do or believe; his reasons come from religion and from the Declaration of Independence. Start your first sentence with 'Walker argues that…'.",
        "The usual weak answer summarizes what the text is *about* (slavery is bad) instead of what it *argues* (a specific claim with a warrant). Grader's test: could someone disagree with your sentence? If not, it's a topic, not an argument.",
        "Frame: (1) the claim, (2) the religious warrant — God's justice, (3) the American warrant — the Declaration turned against its authors, (4) the threat or prophecy, (5) one sentence on who he's addressing. Two quoted phrases go inside sentences 2–4.",
      ],
      solution: [
        "Walker argues that slavery in America is not merely cruel but a sin against God and a betrayal of the nation's own founding principles, and that Black Americans are entitled — even obligated — to resist it.",
        "He grounds this first in religion: God is just and 'will not suffer us, always to be oppressed', so the system carries its own judgment.",
        "He then turns the Declaration of Independence on white readers, quoting its 'all men are created equal' back at them to expose the contradiction.",
        "The Appeal is also a warning: 'every dog must have its day, the American's is coming to an end' — he predicts consequences if the nation does not change.",
        "He addresses 'the coloured citizens of the world' directly, urging unity, literacy, and self-respect rather than passive endurance.",
      ],
      why: "'What is this text arguing, and how?' is the one question every history, law, policy, and journalism job asks of every document. The timed version is the in-class exercise; the untimed version is your whole future in reading critically.",
    },
    {
      id: "context-two",
      title: "Context in two sentences (Q2)",
      prompt: "In 2–3 sentences, name two things about the 1820s–30s that shaped Walker and explain how each shows up in the Appeal. Use specific names or events, not 'the times were hard'.",
      choices: [
        { text: "Walker was shaped by the Civil War and Emancipation, which he anticipates in the text.", feedback: "Wrong decade by thirty years. The Appeal is 1829; the Civil War is 1861. Anachronism is the most common context error — anchor the date first." },
        { text: "Walker was shaped by the Second Great Awakening's evangelical language of sin and judgment, and by the expansion of cotton slavery after the Missouri Compromise, which made the system look permanent and pushed free Black activists toward militancy.", feedback: "Right. Both are specific, datable, and you can point to where each appears in the text — the religious warrant and the urgency." },
        { text: "Walker was shaped by the Revolution, whose ideals he admired without reservation.", feedback: "Half right: he uses the Revolution's ideals — but as a weapon against their authors, not in admiration. Context has to explain the *stance*, not just the source." },
      ],
      answer: 1,
      hints: [
        "Anchor the date: 1829, Boston. What religious movement is at its height? What is happening to slavery's geography (cotton, the Missouri Compromise of 1820)? What does a free Black community in a Northern city look like?",
        "The frequent error is generic context ('there was a lot of racism'). The grader wants something you can *date* and *connect to a line in the text*.",
        "Two-sentence shape: 'First, [dated event/movement], which appears in the Appeal as [feature]. Second, [dated event], which explains [feature].'",
      ],
      solution: [
        "The Second Great Awakening (1820s–30s) filled public speech with the language of sin, judgment, and repentance; Walker's warrant that God 'will not suffer' oppression forever comes straight from that revival vocabulary.",
        "The cotton boom and the Missouri Compromise (1820) extended slavery westward and made it look permanent; that closing horizon is why Walker abandons gradualism for urgency and threat.",
        "(Also usable: Boston's free Black community and the rise of Black print culture — Freedom's Journal, 1827 — which made a pamphlet like the Appeal possible to write and distribute.)",
      ],
      why: "Reading a source without its date is how misinformation works — the same words mean different things in 1829 and 1929. 'When was this written, and what was happening?' is the first move of any competent reader of anything.",
    },
  ],

  "8-confederation-to-constitution": [
    {
      id: "cause-chain",
      title: "Build the cause chain",
      prompt: "Arrange these into a cause-and-effect chain with one connecting phrase between each pair: Shays's Rebellion · no power to tax under the Articles · Philadelphia Convention · unanimous-consent rule for amendments · failed tax amendments of 1781 and 1783 · war debt unpaid. Start with the structural flaw and end with the Convention.",
      hints: [
        "Ask of each item: is this a rule, a consequence of a rule, or an event that consequences produced? Rules come first, events last.",
        "The common error is putting Shays's Rebellion first because it's the most dramatic. It's the *trigger*, not the *cause* — it happens near the end of the chain, and it only matters because the earlier links made the government unable to respond.",
        "Chain shape: rule (no tax power) → attempt to fix (amendments) blocked by rule (unanimity) → consequence (debt unpaid, soldiers unpaid, farmers taxed by states) → event (Shays) → response (Convention).",
      ],
      solution: [
        "The Articles gave Congress no power to tax → so the war debt went unpaid and states taxed their own citizens hard to cover it.",
        "Congress tried to fix this with tax amendments in 1781 and 1783 → but the unanimous-consent rule let one state (Rhode Island, then New York) kill each one.",
        "Unpaid debts and heavy state taxes fell on farmers → Shays's Rebellion (1786–87), which the national government could not put down.",
        "That failure frightened elites in every state → the Philadelphia Convention (May 1787), which had been called to amend the Articles and instead replaced them.",
      ],
      why: "Chains like this are what historians mean by 'explanation' — and what a quiz means by 'why did X fail'. The skill transfers directly to reading any policy failure: find the rule that made the fix impossible, then the event that made the failure visible.",
    },
    {
      id: "which-plan",
      title: "Who wanted what, and what did they get?",
      prompt: "Fill a three-column table for the Virginia Plan, the New Jersey Plan, and the Great Compromise: what representation each proposed, whose interest it served, and what survived into the Constitution. Then do the same for the Three-fifths Compromise in one row.",
      hints: [
        "Representation means: how many seats does a state get, and in how many houses? Ask 'by population or by state?' for each plan, for each house.",
        "The frequent slip is thinking the Great Compromise picked one plan. It split the difference: one house by population (Virginia's idea), one house equal (New Jersey's idea).",
        "For three-fifths: who benefits from counting enslaved people at all? The states that had them — for seats and electoral votes — even though those people had no vote. That's the 'whose interest' column.",
      ],
      solution: [
        "Virginia Plan (Madison, presented by Randolph): both houses by population; served large states; survived as the House of Representatives and the general shape of a strong national government.",
        "New Jersey Plan (Paterson): one house, equal votes per state; served small states; survived as the Senate (two per state).",
        "Great Compromise (Connecticut, Sherman): House by population, Senate equal; served both by giving each a house; survived whole.",
        "Three-fifths Compromise: count three of every five enslaved people for representation and taxation; served Southern states with extra House seats and electoral votes; survived until the Fourteenth Amendment (1868).",
      ],
      why: "Every legislature in the world is a version of this argument — how to weigh people against places — and the U.S. Senate and Electoral College still carry the 1787 answer. Understanding the deal is understanding why American elections work the way they do.",
    },
  ],

  "11-market-revolution": [
    {
      id: "four-steps",
      title: "Cherokee removal: the four legal steps, in your own words",
      prompt: "Write the removal story as four dated steps — each a sentence naming the actor, the action, and what it changed — then one sentence on why the Supreme Court's ruling didn't stop it.",
      hints: [
        "The four steps are in the chapter: the Cherokee constitution, the Indian Removal Act, Worcester v. Georgia, and the Treaty of New Echota, then the Trail of Tears as the outcome. Put a year on each.",
        "The common error is treating Worcester v. Georgia as a defeat for the Cherokee. They *won* the case. The point is that winning in court changed nothing on the ground — which is the sentence the question is really asking for.",
        "Actor · action · change: 'In 1830, Congress passed the Indian Removal Act, which authorized the president to negotiate removal treaties.' Same shape for each.",
      ],
      solution: [
        "1827: The Cherokee Nation adopted a written constitution modeled on the U.S. one, asserting itself as a sovereign nation within Georgia's borders — which Georgia refused to accept.",
        "1830: Congress passed the Indian Removal Act, signed by Jackson, authorizing removal treaties that would exchange eastern lands for territory west of the Mississippi.",
        "1832: In Worcester v. Georgia the Supreme Court (Marshall) ruled that Georgia's laws had no force in Cherokee territory — only the federal government could deal with the Nation.",
        "1835: A small unauthorized faction (the Treaty Party) signed the Treaty of New Echota ceding all Cherokee land; the elected government under John Ross protested with nearly 16,000 signatures, and the Senate ratified it anyway.",
        "The ruling didn't stop removal because the president declined to enforce it: a court decision without executive enforcement is words. The result was the Trail of Tears, 1838–39.",
      ],
      why: "'Who enforces it?' is the question behind every court ruling, treaty, and law — and this is the textbook case of the answer being 'no one'. It comes up again in Reconstruction, in civil rights, and in every present-day story where a ruling is ignored.",
    },
    {
      id: "lowell-why",
      title: "Explain a system, then explain why it ended",
      prompt: "In one paragraph: what was the Lowell system (who worked, under what arrangement, why those workers), and in a second paragraph, the two-step reason it ended. Name at least one date in each paragraph.",
      hints: [
        "Paragraph 1 needs: the Boston Manufacturing Company (Waltham 1813, Lowell 1820s), the integrated mill, young farm women, boardinghouses with supervision, and the owners' reasons for that workforce.",
        "The usual thin answer says 'conditions were bad so it ended'. The chapter gives a *mechanism*: wage cuts → strikes (1834, 1836) → owners find a workforce that can't leave → Irish immigrants in the 1840s.",
        "Second paragraph shape: cause (falling cloth prices → wage cuts) → response (the women organized) → owners' counter-move (replace them with families who needed the wages permanently).",
      ],
      solution: [
        "The Lowell system was the labor arrangement of the first integrated textile mills (Francis Cabot Lowell's Boston Manufacturing Company, Waltham 1813; Lowell, Mass. from the 1820s): young unmarried women from New England farms lived in company boardinghouses under matrons, curfews, and church attendance, working long shifts for wages. Owners chose them because they were available, cheap, temporary, and — with the boardinghouse system — 'respectable' enough that families would send them, and because they would not form a permanent working class.",
        "It ended in two steps. First, competition and falling cloth prices led owners to cut wages and speed up work; the women struck in 1834 and 1836 and published their case (the Lowell Offering shows the culture that made organizing possible). Second, rather than restore wages, owners turned in the 1840s to Irish immigrant families who needed the jobs permanently and could not go home to the farm — ending the 'mill girl' era.",
      ],
      why: "This is the first American version of a pattern that repeats in every industry: a workforce chosen because it seems temporary and compliant, organizing when squeezed, and being replaced. Recognizing the pattern is what lets you read today's labor news historically.",
    },
  ],
};
