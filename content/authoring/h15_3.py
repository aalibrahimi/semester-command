from h15common import *

EVENTS = [
    ("1754", "Crisis begins: war with France"),
    ("1765", "Stamp Act: taxes without a vote", "amber"),
    ("1773", "Tea Act", "amber"),
    ("1774", "Boston's port closed; Congress meets", "red"),
    ("1775", "Petition to the King", "green"),
    ("June 1776", "Lee's resolution: independence"),
    ("July 4", "Declaration adopted", "brand"),
    ("July 15", "New York joins", "green"),
]
METER = {"label": "How far the colonies had moved toward a break (a rough picture)", "tone": "amber", "low": "loyal subjects", "high": "independent"}
STEPS = [
    (0, "**1754.** The French and Indian War starts a 20-year **colonial crisis**. Britain wins but ends up deep in debt, and looks to the colonies to help pay.", 10),
    (1, "**1765, the Stamp Act.** Parliament taxes printed paper in the colonies. Colonists have no vote in Parliament: 'taxation without representation'.", 30),
    (2, "**1773, the Tea Act.** Another tax fight, answered by the Boston Tea Party.", 45),
    (3, "**1774.** Britain punishes Boston: **closes its port**, suspends colonial courts and assemblies, quarters troops in homes. In **September**, delegates meet in **Philadelphia**.", 60),
    (4, "**July 1775.** Even after fighting starts, Congress sends a **petition to the Crown** asking for peace. The King rejects it.", 55),
    (5, "**June 1776.** Richard Henry Lee of Virginia moves that the colonies 'are, and of right ought to be, free and independent States'. **PA, MD, NY and SC** hold back at first.", 80),
    (6, "**July 4, 1776.** Congress adopts the Declaration, drafted by **Thomas Jefferson**.", 95),
    (7, "**By July 15.** New York, the last holdout, signs on. All thirteen colonies are now behind independence.", 100),
]

g = {
 "id": "hist15/3-declaration",
 "course": "hist15",
 "lessons": "Week 2 · Aug 31 lecture",
 "title": "The Declaration of Independence",
 "summary": "Why the colonies broke with Britain (the 1754–1775 crisis), how Congress got to independence in 1776, where the Declaration's ideas came from (the English Bill of Rights and Locke), how the document is built, and who its promise of equality left out.",
 "estimatedMinutes": 35,
 "sourceNote": "Dr. Jeffrey's Aug 31 lecture 'Declaration of Independence' (8 slides) and the Declaration's text (National Archives). Background dates not on the slides are the standard ones and are marked as such.",
 "sections": [
  {"id": "map", "heading": "The big picture: a list of complaints and a theory of government", "blocks": [
    P("The **Declaration of Independence** (July 4, 1776) is the document in which the Second Continental Congress announced that the thirteen colonies were no longer part of the British Empire, and explained why. It does two jobs: it states a **theory of government** (people have rights; government exists to protect them; if it doesn't, people can replace it), and it lists the King's **grievances** as proof that he broke that deal.", slide="What this chapter answers"),
    ROAD("How did loyal colonists end up declaring **independence**?", [
        ("The crisis, 1754–1775", "taxes, courts, soldiers, a closed port", "grievances", "amber"),
        ("Congress, 1774–1775", "meet in Philadelphia; petition the King", "try to fix it", "green"),
        ("Independence, 1776", "Lee's resolution; Jefferson drafts", "break", "brand"),
        ("The ideas", "English Bill of Rights, Locke", "why it's legitimate", "brand"),
        ("The limits", "Native Americans, women, the enslaved", "who's left out", "red"),
    ], "The lecture in five stops.", eyebrow="The question", slide="Five stops"),
    TL("From crisis to independence, 1754 to 1776", EVENTS, STEPS, meter=METER),
    WHY("**Why it matters.** The Declaration is the promise every later movement in this course quotes back at the country: David Walker in 1829, the Seneca Falls women in 1848, and many more. You can't read those documents well unless you know what this one says and whom it left out."),
  ]},
  {"id": "crisis", "heading": "The colonial crisis, 1754 to 1775", "blocks": [
    P("The lecture frames 1754 to 1775 as one long **colonial crisis**. After the French and Indian War (1754–1763), Britain tried to govern and tax the colonies more directly. Each step made colonists feel their rights as English people were being taken away."),
    CARDS([
        ("Taxation", "1765, 1773", ["Stamp Act and Tea Act: Parliament taxed colonists who had no vote in it.", "Slogan: no taxation without representation."], "amber"),
        ("Courts suspended", "1760s–1774", ["Colonial courts and assemblies were shut down or overruled.", "Colonists lost trial by jury in some cases."], "red"),
        ("Military rule", "1768 on", ["British troops stationed in colonial towns, like Boston.", "The Quartering Act made colonists house and supply them."], "red"),
        ("Boston's port closed", "1774", ["Punishment for the Tea Party: no ships in or out.", "It pushed other colonies to side with Massachusetts."], "brand"),
    ], "The lecture's four kinds of grievance. Each shows up again, in Jefferson's words, in the Declaration's list of complaints.", slide="The grievances"),
    P("**Congress tries first.** In **September 1774** delegates from the colonies met in **Philadelphia** (the First Continental Congress). Even after fighting began in 1775, Congress sent a **petition to the Crown in July 1775** (the standard name: the Olive Branch Petition) asking for peace. The King refused to read it and declared the colonies in rebellion. That refusal matters: the Declaration can say the colonists tried to fix things and were ignored."),
    P("**The vote.** In **June 1776**, **Richard Henry Lee** of Virginia moved that the colonies should be independent. Not everyone was ready: **Pennsylvania, Maryland, New York and South Carolina** opposed or hesitated. Congress named a committee, and **Thomas Jefferson** wrote the draft. Congress voted for independence on July 2 and adopted the Declaration on **July 4, 1776**. New York, the last holdout, joined by **July 15**."),
    C("Name three of the lecture's colonial grievances.", "Any three of: **taxation** (Stamp Act, Tea Act), **suspension of colonial courts**, **military rule** and the **Quartering Act**, the **closure of Boston's port**."),
    C("Which four colonies held back when Lee proposed independence in June 1776?", "**Pennsylvania, Maryland, New York and South Carolina**."),
  ]},
  {"id": "ideas", "heading": "Where the ideas came from: 1689 and Locke", "blocks": [
    D("English Bill of Rights (1689)", "An act of Parliament after England's Glorious Revolution that limited the king: no taxes or standing army in peacetime without Parliament's consent, free elections, the right to petition. **Example:** the colonists' complaint about taxes without consent is an English complaint, 90 years old."),
    D("John Locke, Second Treatise of Government (1690)", "Locke argued people have **natural rights** (life, liberty and property) before any government exists. They agree to form a government to protect those rights. If it violates them, the people may **alter or abolish** it. **Example:** the Declaration's second paragraph is Locke, almost step by step."),
    D("Social compact", "The idea that government is an agreement: people give up some freedom and obey laws in exchange for protection of their rights. Break the agreement and it's void. **Example:** 'Governments are instituted among Men, deriving their just powers from the consent of the governed.'"),
    CMP(("Locke (1690)", "Second Treatise", "brand"), ("Jefferson (1776)", "the Declaration", "green"), [
        ("Rights", "Life, liberty, and **property**", "Life, liberty, and the **pursuit of happiness**"),
        ("Where government's power comes from", "Consent of the people", "'The consent of the governed'"),
        ("When government fails", "The people may resist and replace it", "'It is the Right of the People to alter or to abolish it'"),
    ], "The Declaration's theory, next to its source. Notice Jefferson's one big change: property becomes the pursuit of happiness.", slide="Locke and Jefferson"),
    C("What is the 'social compact'?", "The idea that government is an **agreement**: people consent to be governed in exchange for protection of their rights, and if government breaks that deal the people can replace it."),
  ]},
  {"id": "document", "heading": "How the document is built", "blocks": [
    T(["Part", "What it does", "Famous line"], [
        ["Introduction", "Says why they are explaining themselves", "'a decent respect to the opinions of mankind'"],
        ["Preamble (theory)", "States rights and the purpose of government", "'We hold these truths to be self-evident, that all men are created equal'"],
        ["Grievances", "A long list of the King's abuses (27 of them)", "'He has kept among us, in times of peace, Standing Armies'"],
        ["Conclusion", "Declares independence", "'these United Colonies are, and of right ought to be Free and Independent States'"],
    ], title="The Declaration in four parts", slide="Four parts"),
    THINK("**Read it like a legal brief.** The preamble is the **rule** (government must protect rights), the grievances are the **evidence** (the King didn't), and the conclusion is the **verdict** (so we're free). That structure is why later movements could copy it so easily: swap in new evidence, keep the rule."),
    C("What are the four parts of the Declaration?", "Introduction, preamble (theory of rights), list of grievances, conclusion (declaration of independence)."),
  ]},
  {"id": "limits", "heading": "Who 'all men are created equal' left out", "blocks": [
    P("The lecture's last point: the Declaration's equality was **not extended** to **Native Americans**, **women**, or **enslaved people**. The grievances even attack Native Americans as 'merciless Indian Savages'. Women are not mentioned at all.", slide="The limits"),
    P("**The compromise on slavery.** Jefferson's draft blamed the King for the slave trade, calling it a 'cruel war against human nature'. Congress **cut the passage** so the southern colonies (South Carolina and Georgia especially) would sign. Keeping the colonies united came first; the contradiction was left in place. The same trade-off shows up again at the Constitutional Convention in 1787 (the three-fifths clause and the 1808 slave-trade date)."),
    TRAP("Don't write that the Declaration ended slavery or gave anyone the vote. It is a statement of principles and grievances, not a law. It created no rights for women, Native Americans or the enslaved; those groups later **quoted** it to demand them.", "Class exercises"),
    WORLD("**Where you see it today.** Movements still use the same move: quote a founding promise and point at who is excluded. You'll see it three times in the next chapters: Walker's Appeal (1829), Maria Stewart (1831), and the Seneca Falls Declaration of Sentiments (1848), which copies the Declaration word for word and adds 'and women'."),
    C("Which three groups did the Declaration's equality not extend to, according to the lecture?", "**Native Americans, women, and enslaved people**."),
    C("What happened to Jefferson's passage attacking the slave trade, and why?", "Congress **removed** it so the southern colonies would support independence: a compromise on slavery."),
  ]},
 ],
 "exercises": [
  EX("locke", "Explain the Declaration's theory in your own words",
     "In 3 to 4 sentences, explain the theory of government in the Declaration's second paragraph and where it came from.",
     ["Three ideas: natural rights, consent of the governed, the right to alter or abolish.",
      "Name the source by title and year: Locke's Second Treatise (1690). The English Bill of Rights (1689) is a bonus.",
      "Frame: people have rights → governments exist to protect them and get power from consent → a government that destroys rights can be replaced → this came from Locke."],
     ["The Declaration argues that all people have natural, 'unalienable' rights, including life, liberty and the pursuit of happiness.",
      "Governments are created to protect those rights and get their just powers from the consent of the governed.",
      "When a government destroys those rights, the people have the right to alter or abolish it and create a new one.",
      "Jefferson drew this social-compact theory from John Locke's Second Treatise of Government (1690), building on the limits on royal power in the English Bill of Rights (1689)."],
     "Stating an argument and naming its source is how you use any text as evidence, in history or in a court brief.", ref="ideas"),
  EX("limits-ex", "Who was left out, and why it matters",
     "In 3 to 4 sentences: whom did the Declaration's 'all men are created equal' leave out, and give one specific example of how the document shows it.",
     ["The lecture names three groups.", "One specific example beats three vague ones: the cut slave-trade passage, or the 'merciless Indian Savages' grievance.", "End with why it matters: later groups quoted the Declaration to claim rights it didn't give them."],
     ["The Declaration's promise of equality did not include Native Americans, women, or enslaved people.",
      "Its list of grievances attacks Native Americans as 'merciless Indian Savages', and women are never mentioned.",
      "Congress also removed Jefferson's passage condemning the slave trade so that the southern colonies would support independence, a compromise that left slavery untouched.",
      "Because the principle was stated so broadly, excluded groups, from David Walker to the Seneca Falls convention, later quoted it to demand their own rights."],
     "Spotting the gap between a stated principle and who actually gets it is the core of reading any policy or law critically.", ref="limits"),
  MC("lee-mc", "Who proposed independence?", "In June 1776, who moved in Congress that the colonies 'ought to be free and independent States'?",
     ["Richard Henry Lee of Virginia", "Thomas Jefferson", "John Adams", "Benjamin Franklin"], 0,
     ["Right: Lee's resolution, which Congress approved on July 2.", "Jefferson drafted the Declaration; Lee made the motion.", "Adams argued for it, but Lee moved it.", "Franklin served on the drafting committee."],
     ["Richard Henry Lee of Virginia."], "Who proposed vs who drafted is a classic quiz distinction.", ref="crisis"),
  MC("locke-mc", "The main source of the Declaration's theory", "The Declaration's ideas about natural rights and consent of the governed come mainly from…",
     ["John Locke's Second Treatise of Government (1690)", "Montesquieu's Spirit of the Laws (1748)", "The Articles of Confederation (1781)", "Common Sense (1776)"], 0,
     ["Right.", "Montesquieu matters for the Constitution's separation of powers, not the Declaration's theory.", "The Articles came after the Declaration.", "Paine's pamphlet pushed for independence but the theory is Locke's."],
     ["Locke's Second Treatise."], "Matching ideas to sources is a common quiz and exam question.", ref="ideas"),
 ],
}

build(g)
