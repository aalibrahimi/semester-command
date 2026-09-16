import type { Chapter } from "../types";

/**
 * HIST 15 · Ch. 11 + lectures — the Quiz #2 material: the market revolution
 * (assigned section, pp. 302–322), the Lowell mills, and Cherokee removal
 * (Sep 14 and Sep 16 lectures). Written as replacement reading.
 */
export const hist15Market: Chapter = {
  slug: "11-market-revolution",
  label: "Ch. 11 + lectures",
  title: "The Market Revolution, Lowell, and Cherokee Removal",
  source: "The American Promise ch. 11, 'What economic developments reshaped the American economy after 1815?' (pp. 302–317, 320–322); the Sep 14 Market Revolution lecture/exercise; the Sep 16 Cherokee Removal lecture. This is Quiz #2 (10 MC, 20 min, due Oct 5).",
  goal: "Explain what the market revolution was and name its parts; describe the Lowell system and why it ended; tell the Cherokee removal story with its four legal steps.",
  minutes: 50,
  sections: [
    {
      id: "why",
      title: "What 'market revolution' means",
      blocks: [
        { id: "why-1", t: "why", slide: "The term", title: "Why the textbook uses this phrase, not 'industrial revolution'", text: "In 1800 most American families grew or made most of what they used and bartered for the rest with neighbors. By 1840 most families sold something — wheat, cotton, cloth, their labor — for cash and bought what they needed from strangers far away. That shift, from local household economies to a national economy of cash and long-distance trade, is the **market revolution**. Factories are part of it but not the center; the center is that ordinary people started producing *for the market*. A quiz question asking for the best description wants that." },
        { id: "why-2", t: "prof", title: "The exercise she gave on Sep 14", text: "The in-class exercise asked you to work from the assigned section and the lecture. Quiz #2 says it 'pertains to lecture content of the Market Revolution, Lowell Mills, and Cherokee removal' plus ch. 11 — so the three sections below are the three things the ten questions will be about." },
      ],
    },
    {
      id: "transport",
      title: "The transportation revolution",
      blocks: [
        { id: "tr-1", t: "p", slide: "Why transport came first", text: "A farmer in Ohio in 1815 couldn't sell wheat in New York — hauling it over the mountains cost more than the wheat was worth. Cut the cost of moving goods and every farm becomes a business. That is what happened between 1815 and 1840, in four waves." },
        { id: "tr-2", t: "list", slide: "Four waves", items: [
          "**Turnpikes and roads** (1790s–1820s): private toll roads; the federal **National Road** from Maryland west to Illinois, begun 1811.",
          "**Steamboats**: Robert **Fulton**'s *Clermont* on the Hudson (1807). By the 1820s steamboats ran *up* the Mississippi and Ohio, making New Orleans the outlet for the whole interior. Upstream freight costs fell by 90%.",
          "**Canals**: the **Erie Canal** (New York, finished **1825**, 363 miles from the Hudson to Lake Erie), built by the state under Governor DeWitt Clinton. It cut freight costs between Buffalo and New York City from $100 a ton to about $10 and made New York the nation's commercial capital. Other states rushed to copy it; many went broke.",
          "**Railroads**: the Baltimore & Ohio (1830) was the first; by 1840 there were 3,000 miles of track, mostly in the Northeast. Railroads didn't freeze in winter and didn't need a river.",
        ] },
        { id: "tr-3", t: "p", text: "The federal government's role was contested: Madison vetoed a federal canal bill (1817) as unconstitutional, so states and private companies built most of it — which is why the 'internal improvements' question becomes a party issue (Whigs for, Democrats against). The Supreme Court did help: *Gibbons v. Ogden* (1824) struck down a state steamboat monopoly and gave Congress control over interstate commerce." },
      ],
    },
    {
      id: "factories",
      title: "Factories and the Lowell system",
      blocks: [
        { id: "f-1", t: "p", slide: "From Slater to Lowell", text: "**Samuel Slater**, an English mechanic who memorized the design of British spinning machines (exporting them was illegal), built the first American water-powered textile mill at Pawtucket, Rhode Island, in **1790**. Slater's mills spun thread and hired whole families, children included. The bigger step came from **Francis Cabot Lowell**, a Boston merchant who toured British mills in 1810, memorized the power loom, and in **1813** opened the Boston Manufacturing Company at Waltham — the first mill in the world to take raw cotton in one end and finished cloth out the other. After his death his partners built a whole planned city on the Merrimack River and named it **Lowell, Massachusetts** (1820s)." },
        { id: "f-2", t: "p", slide: "The Lowell mill girls", text: "Lowell's founders needed a workforce and didn't want an English-style permanent factory class. Their answer: recruit **young, unmarried women from New England farms** — daughters with nothing to do at home now that cloth was cheaper to buy than make. The mills offered wages (higher than domestic service), company **boardinghouses** with matrons, curfews, mandatory church, and a respectable reputation, so farm families would send their daughters. The women worked twelve to thirteen hours a day, six days a week, typically for a few years before marrying. Some published a literary magazine, the ***Lowell Offering***. To visitors like Charles Dickens (1842), Lowell looked like the humane alternative to Manchester." },
        { id: "f-3", t: "p", slide: "Why the system ended", text: "In the 1830s competition drove owners to cut wages and speed up the machines. The women organized: 'turn-outs' (strikes) in **1834** and **1836**, and in the 1840s the Lowell Female Labor Reform Association petitioned for a ten-hour day. The owners' response was to replace them. From the mid-1840s **Irish immigrant families**, fleeing the famine, took the jobs at lower pay, and the boardinghouse experiment ended. Lowell became the ordinary factory town its founders had tried to avoid." },
        { id: "f-4", t: "table", slide: "Slater system vs Lowell (Waltham) system", rows: [
          ["", "Slater / Rhode Island", "Lowell / Waltham"],
          ["Product", "Thread (spinning only)", "Finished cloth (spinning + weaving)"],
          ["Scale", "Small mills", "Large integrated factories, corporate ownership"],
          ["Workers", "Whole families, incl. children", "Young single women, later Irish families"],
          ["Housing", "Family cottages", "Company boardinghouses with rules"],
        ] },
        { id: "f-5", t: "try", q: "Why did Lowell's owners recruit farm daughters specifically, and what replaced them?", a: "They were an available, inexpensive, temporary, 'respectable' workforce — the boardinghouse system reassured families — and they wouldn't form a permanent working class. Wage cuts led to strikes in 1834 and 1836; in the 1840s Irish immigrant labor replaced them." },
      ],
    },
    {
      id: "economy",
      title: "Banks, credit, cotton, and the social effects",
      blocks: [
        { id: "e-1", t: "p", slide: "Money and panics", text: "A market economy runs on credit. The **Second Bank of the United States** (chartered **1816**) tried to discipline the hundreds of state banks issuing their own paper money. When it tightened credit in 1819 after a land-speculation boom, the result was the **Panic of 1819** — the first modern depression, with foreclosures across the West and lasting hatred of the Bank (Andrew Jackson's). The **Panic of 1837** repeated the pattern on a larger scale." },
        { id: "e-2", t: "p", slide: "Cotton ties it all together — and to slavery", text: "The market revolution was not a Northern story. Eli Whitney's **cotton gin** (1793) made short-staple cotton profitable; cotton became the nation's biggest export; Northern mills spun Southern cotton grown by enslaved labor; Western farms fed the mills' workers. The textbook's point: the same economic transformation that built Lowell made slavery *more* entrenched and more valuable, which is why the 1830s abolitionists (Walker, Garrison) faced a slavery that was expanding, not fading." },
        { id: "e-3", t: "list", slide: "Social effects the textbook names", items: [
          "**Wage labor**: for the first time large numbers of Americans worked for someone else for cash — the start of a working class.",
          "**Separate spheres**: as work moved out of the home, the middle-class ideal split into men in the 'public' world of work and women in the 'private' home — the cult of domesticity.",
          "**A middle class**: clerks, shopkeepers, professionals — defined by respectability, education, and consumer goods.",
          "**Reform and revival**: the **Second Great Awakening** (Charles Finney's revivals in the 'burned-over district' along the Erie Canal) preached that people could perfect themselves and society — feeding temperance, abolition, and women's rights, which are the next three lectures.",
        ] },
      ],
    },
    {
      id: "cherokee",
      title: "Cherokee Removal (the Sep 16 lecture)",
      blocks: [
        { id: "ck-1", t: "why", slide: "Why it's in this unit", title: "Why the textbook puts Indian removal next to the market revolution", text: "Because it's the same story from the other side: cotton land. The market revolution made Georgia's and Alabama's land enormously valuable for cotton, and the Cherokee were sitting on it." },
        { id: "ck-2", t: "p", slide: "The 'civilized' tribe", text: "The **Cherokee** of north Georgia had done exactly what Jefferson's policy asked Native nations to do: they farmed, built roads and schools, some owned enslaved people, **Sequoyah** invented a written syllabary (1821), they published a bilingual newspaper (the ***Cherokee Phoenix***, 1828), and in **1827** they adopted a written constitution modeled on the U.S. one, declaring themselves a sovereign nation. Georgia's answer was to declare that constitution void and extend state law over Cherokee land. Then, in 1829, **gold** was found at Dahlonega." },
        { id: "ck-3", t: "list", slide: "The four legal steps — know the order", items: [
          "**Indian Removal Act (1830)**: Andrew Jackson's signature policy, passed narrowly. It authorized the president to exchange lands west of the Mississippi for Native lands in the East and to pay for the move. 'Voluntary' on paper.",
          "**Worcester v. Georgia (1832)**: Chief Justice **John Marshall** ruled that the Cherokee Nation was 'a distinct community' in which 'the laws of Georgia can have no force' — only the federal government could deal with Indian nations. Jackson refused to enforce it (the line 'John Marshall has made his decision; now let him enforce it' is probably apocryphal but captures his position).",
          "**Treaty of New Echota (1835)**: a small faction (the 'Treaty Party' — **Major Ridge**, John Ridge, **Elias Boudinot**) signed away all Cherokee land for $5 million and land in Indian Territory. The elected government under Principal Chief **John Ross** protested; nearly 16,000 Cherokee signed a petition against it. The Senate ratified it by one vote.",
          "**The Trail of Tears (1838–39)**: General **Winfield Scott** and 7,000 troops rounded the Cherokee into stockades and marched them roughly 1,000 miles to present-day Oklahoma. Of about 16,000, roughly **4,000 died** of disease, exposure, and starvation. The Treaty Party leaders were assassinated in 1839 by Ross supporters.",
        ] },
        { id: "ck-4", t: "p", text: "The other 'Five Civilized Tribes' — Choctaw, Chickasaw, Creek, Seminole — were removed in the same decade; the Seminole fought a seven-year war in Florida rather than go. The lecture title is 'Cherokee Removal' because the Cherokee case is the one where every argument the United States made for civilizing Native people was met, and the removal happened anyway." },
        { id: "ck-5", t: "try", q: "What did Worcester v. Georgia decide, and why didn't it save the Cherokee?", a: "That the Cherokee Nation was a distinct political community where Georgia's laws had no force — only the federal government could deal with it. It didn't matter because President Jackson declined to enforce the ruling, and removal proceeded through the Treaty of New Echota (1835) and the Trail of Tears (1838–39)." },
        { id: "ck-6", t: "try", q: "Put these in order: Trail of Tears, Indian Removal Act, Worcester v. Georgia, Treaty of New Echota, Cherokee constitution.", a: "Cherokee constitution (1827) → Indian Removal Act (1830) → Worcester v. Georgia (1832) → Treaty of New Echota (1835) → Trail of Tears (1838–39)." },
      ],
    },
    {
      id: "quiz",
      title: "Quiz #2 rehearsal",
      blocks: [
        { id: "q-1", t: "try", q: "Which project most reduced the cost of moving goods between the Great Lakes and New York City, and when was it finished?", a: "The Erie Canal, 1825." },
        { id: "q-2", t: "try", q: "The 'market revolution' is best described as…", a: "The shift from local, household and barter economies to a national economy in which people produced for sale and bought what they needed with cash — enabled by transportation, credit, and factories." },
        { id: "q-3", t: "try", q: "Who built the first integrated cotton mill (raw cotton to finished cloth) in the United States?", a: "Francis Cabot Lowell's Boston Manufacturing Company at Waltham, 1813." },
        { id: "q-4", t: "try", q: "The Lowell Offering was…", a: "A literary magazine written and published by the women who worked in the Lowell mills." },
        { id: "q-5", t: "try", q: "Which president signed the Indian Removal Act?", a: "Andrew Jackson, 1830." },
        { id: "q-6", t: "try", q: "The Treaty of New Echota was controversial because…", a: "It was signed by a small unauthorized faction (the Treaty Party) rather than the elected Cherokee government under John Ross, which protested with a petition of nearly 16,000 signatures." },
      ],
    },
  ],
};
