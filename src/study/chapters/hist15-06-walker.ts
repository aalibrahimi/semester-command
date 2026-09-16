import type { Chapter } from "../types";

/**
 * HIST 15 · Week 6 — David Walker's Appeal (1829). The homework exercise due
 * Fri Sep 18: two short answers on a 40-minute timer. Built from the
 * 3-page Schlager Anthology excerpt in the Week 6 module and the assignment
 * prompt on the Week 6–7 Assignment List.
 */
export const hist15Walker: Chapter = {
  slug: "6-walker",
  label: "Week 6",
  title: "David Walker's Appeal to the Coloured Citizens of the World",
  source: "The 3-page excerpt in the Week 6–7 module (Royles, Schlager Anthology, 2021, pp. 143–145) and Dr. Jeffrey's two exercise questions.",
  goal: "Read the excerpt with the tools to see its argument, then write the two exercise answers — Q1 (argument + key phrases, 4–5 sentences) and Q2 (1830s context, 2–3 sentences) — before you open the 40-minute timer.",
  minutes: 45,
  sections: [
    {
      id: "how",
      title: "How the exercise works (read this first)",
      blocks: [
        { id: "how-1", t: "prof", title: "The mechanics", text: "Canvas quiz, 2 questions, 40 minutes, 20 points, due Friday 11:59pm. When you advance from Q1 to Q2, **Q1 locks**. So: write both answers in a text file first, then open the quiz, paste Q1, advance, paste Q2, submit. Ten minutes inside the timer, not forty." },
        { id: "how-2", t: "list", slide: "The two questions, in her words", items: [
          "**Q1 (10 pts):** What is his argument? What important words or phrases can you identify that help you understand his argument? Discuss how these words or phrases help you understand his argument. Write four to five sentences explaining Walker's argument as presented in the excerpt.",
          "**Q2 (10 pts):** Connect Walker's writing to the historical context of the 1830s. What is happening in the United States that is shaping Walker's perspective? Two to three sentences connecting the argument to its context. Include why historical context provides a deeper understanding of Walker's argument.",
        ] },
        { id: "how-3", t: "p", text: "Her rubric rewards one thing above all: **quote, then explain**. 'Identify' means copy the phrase in quotation marks; 'discuss' means one sentence on what that phrase does for the argument. Three quoted phrases each followed by a sentence is a 10/10 answer. General statements without quotes score in the 6–7 band." },
      ],
    },
    {
      id: "who",
      title: "Who Walker was and what the Appeal is",
      blocks: [
        { id: "who-1", t: "p", slide: "The man", text: "**David Walker** was born free in Wilmington, North Carolina, around 1796 — free because his mother was free, even though his father was enslaved. He traveled through the South, saw slavery up close, and settled in **Boston** in the 1820s, where he ran a used-clothing shop near the docks, joined the Massachusetts General Colored Association, and wrote for *Freedom's Journal*, the first Black-owned newspaper in the country (1827)." },
        { id: "who-2", t: "p", slide: "The pamphlet", text: "In September **1829** he published the *Appeal to the Coloured Citizens of the World*, a 76-page pamphlet in four 'Articles'. He revised it twice; the third edition came out in June 1830. He got it into the South by sewing copies into the linings of coats he sold to Black sailors. Georgia and Louisiana passed laws against it; Georgia put a price on his head — $10,000 alive, $1,000 dead. He died in Boston in August 1830, probably of tuberculosis, though many believed he was poisoned." },
        { id: "who-3", t: "p", slide: "Its audience", text: "Notice the title: *to the Coloured Citizens of the World*. He is not writing to white reformers to persuade them. He is writing to Black people — enslaved and free — to wake them up, and letting white America overhear. The headnote in your excerpt says exactly this: he 'encouraged his fellow African Americans… to see themselves as human beings and to do something to elevate themselves from their wretched state.'" },
      ],
    },
    {
      id: "argument",
      title: "The argument, paragraph by paragraph",
      blocks: [
        { id: "arg-1", t: "why", slide: "The argument in one sentence", title: "The spine", text: "White Christian Americans, who declare that all men are created equal, have made Black Americans the most degraded people in history — and that hypocrisy, not any defect in Black people, is the sin; God will end it, and Black Americans must be ready to act." },
        { id: "arg-2", t: "p", slide: "Paragraph 1: the claim of degradation", text: "He opens 'My dearly beloved Brethren and Fellow Citizens' — *citizens*, a word the law denied them — and says that having traveled the country he is convinced that 'we, (coloured people of these United States,) are the **most degraded, wretched, and abject set of beings that ever lived** since the world began.' This is not self-hatred. Read the next line: he prays 'that none like us ever may live again.' He is naming a condition that was *done* to them, and the rest of the excerpt says by whom." },
        { id: "arg-3", t: "p", slide: "Paragraph 2: the sarcasm that carries the argument", text: "'Can our condition be any worse?' Then the phrase to quote: he writes to awaken his brethren to inquire into 'our miseries and wretchedness in this **Republican Land of Liberty!!!!!!**' — six exclamation points. That's the whole argument compressed into irony: a country that calls itself the land of liberty holds millions in slavery. Every time he says 'Republican' or 'Liberty' in the excerpt, he means the opposite." },
        { id: "arg-4", t: "p", slide: "Paragraph 3: the evidence — total exclusion", text: "He challenges white Americans who say Black people are 'comparatively satisfied.' He doesn't ask them to show him a Black president or senator — he asks for 'a man of colour, who holds the low office of a **Constable**, or one who sits in a **Juror Box**, even on a case of one of his wretched brethren, throughout this great Republic.' The lowest rungs of citizenship are closed. That's his evidence for 'most degraded': not just enslavement, but the exclusion of even free Black people from every office of a republic." },
        { id: "arg-5", t: "p", slide: "Paragraph 4: the Patrick Henry move", text: "'Had I not rather **die, or be put to death, than to be a slave** to any tyrant, who takes not only my own, but my wife and children's lives by the inches?' Every reader in 1829 heard Patrick Henry's 'give me liberty or give me death.' Walker is claiming the Revolution's own words. Then the warning: 'God will not suffer us, always to be oppressed… **Every dog must have its day**, the American's is coming to an end.' This is why the South banned the pamphlet and why even some white abolitionists were 'appalled' (your headnote's word): he does not rule out violence." },
        { id: "arg-6", t: "p", slide: "Paragraph 5: Christians worse than heathens", text: "He turns to religion. As 'heathens' the Europeans 'were bad enough,' but 'being **Christians, enlightened and sensible**, they are completely prepared for such **hellish cruelties**' — taking 'vessel loads of men, women and children' and throwing them into the sea. The point: Christianity should have made them better and instead gave them the organization and the self-justification to be worse. This is an attack on the churches that blessed slavery." },
        { id: "arg-7", t: "p", slide: "Paragraph 6: the Declaration, quoted back", text: "The climax. '**See your Declaration Americans!!! Do you understand your own language?**' He quotes it: 'We hold these truths to be self evident — that ALL MEN ARE CREATED EQUAL!!' and tells them to 'compare your own language above… with your cruelties and murders inflicted by your cruel and unmerciful fathers and yourselves on our fathers and on us — men who have never given your fathers or you the least provocation.' Then the comparison that ends the excerpt: 'was your sufferings under Great Britain, **one hundredth part** as cruel and tyrannical as you have rendered ours under you?' If a tax on tea justified a revolution, what does slavery justify?" },
        { id: "arg-8", t: "table", slide: "The six phrases to quote, and what each does", rows: [
          ["Phrase", "What it does in the argument"],
          ["'most degraded, wretched, and abject set of beings that ever lived'", "States the condition; the rest of the text assigns the blame to white America, not to Black people"],
          ["'this Republican Land of Liberty!!!!!!'", "Sarcasm: the nation's self-description is the indictment"],
          ["'the low office of a Constable, or… a Juror Box'", "Evidence: exclusion from even the lowest citizenship, free or enslaved"],
          ["'had I not rather die… than to be a slave'", "Claims the Revolution's own rhetoric (Patrick Henry); warns of resistance"],
          ["'being Christians… completely prepared for such hellish cruelties'", "Indicts the churches: faith made the cruelty organized, not gentler"],
          ["'See your Declaration Americans!!! Do you understand your own language?'", "Turns the founding document into a charge sheet; 1776's logic demands abolition"],
        ] },
      ],
    },
    {
      id: "context",
      title: "The 1830s: what was shaping Walker",
      blocks: [
        { id: "ctx-1", t: "why", slide: "Why context is the second question", title: "Why she asks", text: "Read alone, the Appeal is a fiery voice. Read against its moment, it's a precise response to four things happening at once. Q2 wants two or three of these, plus a sentence on why knowing them deepens the reading." },
        { id: "ctx-2", t: "p", slide: "1 · Slavery was growing, not dying", text: "In 1776 many founders assumed slavery would fade. By 1829 it was expanding: the cotton gin (1793), the cotton boom, and the market revolution (your next chapter) made enslaved labor more valuable than ever. The **internal slave trade** moved roughly a million people from Virginia and Maryland to the Deep South, breaking families. Walker's 'lives by the inches' and 'wife and children' are about that trade. Missouri had just entered as a slave state (1820) — slavery was moving west, not shrinking." },
        { id: "ctx-3", t: "p", slide: "2 · Colonization vs. immediate abolition", text: "The respectable white anti-slavery position in the 1820s was **colonization** — the American Colonization Society (1816) wanted to free enslaved people gradually and ship them to Liberia. Walker attacks this idea directly elsewhere in the Appeal ('America is more our country than it is the whites'). His pamphlet helped push young white reformers toward **immediatism**: William Lloyd Garrison began *The Liberator* in January **1831**, sixteen months after the Appeal, calling for immediate, uncompensated emancipation." },
        { id: "ctx-4", t: "p", slide: "3 · Fear and repression in the South", text: "The Appeal arrived as the South was already frightened: Denmark Vesey's alleged conspiracy in Charleston (1822) had led to executions and new laws. Southern states responded to Walker by banning the pamphlet, forbidding Black sailors to leave their ships in port, and tightening laws against teaching enslaved people to read. Then in August **1831**, **Nat Turner's** rebellion in Virginia killed about sixty white people — and to slaveholders, Walker's 'every dog must have its day' looked like prophecy. The result was a harder, more defensive pro-slavery South." },
        { id: "ctx-5", t: "p", slide: "4 · A free Black public sphere in the North", text: "Walker wrote from Boston because there was a community there to write for: free Black churches, mutual-aid societies, the Massachusetts General Colored Association he belonged to, and **Freedom's Journal** (1827), the first Black newspaper. The Appeal's audience — 'coloured citizens' — existed as an organized public for the first time. That's why he addresses them, not white reformers." },
        { id: "ctx-6", t: "p", slide: "Why context deepens the reading (the sentence Q2 requires)", text: "Without the context, the Appeal reads as anger. With it, the Appeal reads as a strategic document: it rejects colonization, it quotes the Declaration at a nation that was expanding slavery westward, it speaks to a Black public that had just come into existence, and it does so knowing the South would try to kill him for it — which it did. Context turns 'he was angry' into 'he was answering the specific arguments and events of 1829.'" },
      ],
    },
    {
      id: "answers",
      title: "Model answers — write yours first, then compare",
      blocks: [
        { id: "ans-1", t: "warn", title: "Use these as a template, not a copy", text: "The exercise goes through Turnitin. Write your own sentences with your own choice of quotes; use these to check that your answer has the right parts. Her AI policy: don't have AI write the argument for you — which is why this chapter teaches the argument instead of just handing you a paragraph." },
        { id: "ans-2", t: "worked", slide: "Q1 — the shape of a 10/10 answer", title: "Q1: argument and key phrases (4–5 sentences)", problem: "Skeleton: (1) who/what/when → (2) the central claim → (3–4) two or three quoted phrases, each followed by what it shows → (5) what he wants readers to do / his warning.", steps: [
          "Sentence 1: In his 1829 Appeal, David Walker, a free Black man in Boston, argues that Black Americans have been made 'the most degraded, wretched, and abject set of beings that ever lived' — not by nature but by white Americans who profess liberty.",
          "Sentence 2: His central charge is hypocrisy: he calls the country 'this Republican Land of Liberty!!!!!!' with six exclamation points, and the sarcasm shows that the nation's own language is the indictment.",
          "Sentence 3: He proves the degradation by asking white Americans to show him even 'a man of colour, who holds the low office of a Constable, or one who sits in a Juror Box' — Black people are shut out of even the lowest rung of citizenship.",
          "Sentence 4: He then turns the Revolution against its heirs: 'See your Declaration Americans!!! Do you understand your own language?' — if 'all men are created equal' justified rebelling over taxes, it condemns slavery a hundred times over.",
          "Sentence 5: The argument ends as a warning as much as a plea — 'Every dog must have its day, the American's is coming to an end' — which is why the pamphlet was banned in the South and unsettled even white abolitionists.",
        ] },
        { id: "ans-3", t: "worked", slide: "Q2 — the shape of a 10/10 answer", title: "Q2: historical context (2–3 sentences)", problem: "Skeleton: (1) two or three specific things happening → (2) how they shape the text → (3) why context deepens the reading.", steps: [
          "Sentence 1: Walker wrote as slavery was expanding rather than fading — the cotton boom and the internal slave trade were moving a million people into the Deep South, and Missouri had just entered the Union as a slave state — while the mainstream white anti-slavery position was colonization, shipping free Black people to Africa rather than granting them citizenship.",
          "Sentence 2: That is why the Appeal is addressed to 'coloured citizens' rather than to white reformers, why it insists on America as a Black homeland, and why it quotes the Declaration at a nation that was building new slave states; it helped push Garrison's Liberator (1831) toward immediate abolition and, after Nat Turner's rebellion the same year, hardened the South's repression.",
          "Sentence 3: Knowing the context turns the Appeal from a cry of anger into a precise rebuttal of the arguments of 1829 — colonization, gradualism, and the claim that enslaved people were 'comparatively satisfied' — which is a deeper reading than the words alone allow.",
        ] },
        { id: "ans-4", t: "try", q: "The anthology's own question: what portions of Walker's Appeal might have read as ominously threatening to white readers?", a: "'Had I not rather die, or be put to death, than to be a slave'; 'God will not suffer us, always to be oppressed… Every dog must have its day, the American's is coming to an end'; and 'some of you… believe that we will never throw off your murderous government' — read as an open door to violent resistance, which is why Georgia banned the pamphlet and priced his head." },
      ],
    },
  ],
};
