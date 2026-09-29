import json as J
from _paths import DRILLS
OUTD = str(DRILLS) + "/"
json=lambda x: J.dumps(x, ensure_ascii=False)
HEAD='''import type { Drill } from "../drill";
import { choice } from "../drill";
'''
def quizfile(fname, doc, G, secs, quiz, order=None):
    items=",\n".join('  { s: %s, p: %s, ok: %s, bad: [%s], why: %s }'%(json(s),json(p),json(ok),", ".join(json(b) for b in bad),json(w)) for s,p,ok,bad,w in quiz)
    out=f'/**\n * {doc}\n */\n'+HEAD+f'\nconst G = "{G}";\n\nconst QUIZ = [\n{items},\n];\n'
    if order:
        out+='\nconst ORDER = [\n'+",\n".join('  { e: %s, y: %s, n: %d }'%(json(e),json(y),n) for e,y,n in order)+',\n];\n'
    out+=f'''
export const drills: Drill[] = [
  ...({json(secs)} as string[]).map((sec) => ({{
    id: `${{sec}}!quiz`,
    guideId: G,
    sectionRef: sec,
    title: sec === "quiz" ? "Any part of the chapter" : "Quiz-style question",
    skill: "Multiple choice on the lecture content.",
    gen(r: Parameters<Drill["gen"]>[0]) {{
      const pool = QUIZ.filter((q) => q.s === sec || sec === "quiz");
      const q = r.pick(pool);
      return {{ prompt: q.p, answer: choice(r, q.ok, q.bad, {{ correct: q.why }}), steps: [q.why] }};
    }},
  }})),
'''
    if order:
        out+='''  {
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
'''
    out+='];\n'
    open(OUTD+fname,'w').write(out)

quizfile("hist15--3-declaration.ts","Drills for HIST 15 · The Declaration of Independence: the crisis, the vote, the ideas, the limits.","hist15/3-declaration",
 ["crisis","ideas","document","limits"],[
 ("crisis","The lecture calls the years 1754 to 1775…","The colonial crisis",["The Critical Period","The Market Revolution","The Great Awakening"],"From the French and Indian War to the Revolution."),
 ("crisis","Which was NOT one of the lecture's colonial grievances?","The abolition of slavery in the colonies",["Taxation such as the Stamp Act","Closing Boston's port","The Quartering Act"],"The grievances were taxes, suspended courts, military rule, the closed port and quartering."),
 ("crisis","In July 1775 Congress…","Sent a petition to the Crown asking for peace",["Declared independence","Ratified the Articles of Confederation","Closed Boston's port"],"The King refused it and declared the colonies in rebellion."),
 ("crisis","Where did colonial delegates meet in September 1774?","Philadelphia",["Boston","New York","Williamsburg"],"The First Continental Congress."),
 ("crisis","Which colonies held back when Lee proposed independence?","Pennsylvania, Maryland, New York and South Carolina",["Virginia, Massachusetts, Georgia and Delaware","New Jersey, Connecticut, Rhode Island and Georgia","All four New England colonies"],"New York was the last to sign on, by July 15, 1776."),
 ("crisis","Who drafted the Declaration of Independence?","Thomas Jefferson",["Richard Henry Lee","John Locke","James Madison"],"Lee moved independence; Jefferson wrote the draft."),
 ("ideas","Locke's Second Treatise (1690) listed natural rights as…","Life, liberty and property",["Life, liberty and the pursuit of happiness","Speech, press and religion","Trial by jury and habeas corpus"],"Jefferson changed property to the pursuit of happiness."),
 ("ideas","The 'social compact' means…","Government is an agreement that protects people's rights in exchange for their consent",["The colonies' trade agreement with Britain","A treaty between the states","The king's divine right to rule"],"Break the deal and the people may replace the government."),
 ("ideas","Which 1689 English document limited the king's power to tax without Parliament?","The English Bill of Rights",["The Magna Carta","The Mayflower Compact","The Stamp Act"],"One of the lecture's two foundations."),
 ("document","The longest part of the Declaration is…","The list of grievances against the King",["The preamble on rights","The conclusion","The list of signers' states"],"27 grievances as evidence."),
 ("document","The Declaration's preamble ('We hold these truths…') works like…","The rule: what government owes its people",["The evidence against the King","The verdict of independence","A list of the signers"],"Rule (preamble), evidence (grievances), verdict (conclusion)."),
 ("limits","The Declaration's equality did not extend to…","Native Americans, women and enslaved people",["Property-owning white men","Members of Congress","Colonial governors"],"The lecture's three excluded groups."),
 ("limits","Jefferson's draft passage attacking the slave trade was…","Cut by Congress to keep the southern colonies on board",["Expanded into a ban on slavery","Moved into the Constitution","Written by the King"],"A compromise on slavery."),
],[("French and Indian War begins","1754",1754),("Stamp Act","1765",1765),("Tea Act","1773",1773),("Boston's port closed; Congress meets in Philadelphia","1774",1774),("Petition to the Crown","1775",1775),("Declaration adopted","1776",1776)])

quizfile("hist15--12-reform.ts","Drills for HIST 15 · Abolitionism and Women's Rights: leaders, strategies, the 1840 split, Seneca Falls.","hist15/12-reform",
 ["abolition","grimke","womensrights","senecafalls","quiz"],[
 ("abolition","The abolitionism of the 1830s is best defined as a movement for…","Immediate emancipation",["Gradual emancipation","Colonization in Africa","Ending only the slave trade"],"The lecture's one-word definition: immediate."),
 ("abolition","Which were the lecture's three abolitionist strategies?","Speaking, writing and petitions",["Voting, lobbying and strikes","Boycotts, riots and lawsuits","Colonization, compensation and gradualism"],"Most abolitionists, and all women, couldn't vote."),
 ("abolition","William Lloyd Garrison founded The Liberator in…","1831",["1829","1840","1848"],"And the New England Anti-Slavery Society in 1832."),
 ("abolition","Who was the first woman to address a mixed audience of men and women, in 1832?","Maria Stewart",["Lucretia Mott","Angelina Grimké","Sojourner Truth"],"'It is not the color of the skin that makes the man…'"),
 ("abolition","David Walker published his Appeal in…","1829",["1831","1837","1848"],"The first abolitionist publication on the lecture's list; he died in 1830."),
 ("grimke","The Grimké sisters were unusual because they were…","White women from a South Carolina slaveholding family",["Formerly enslaved people from Virginia","Quaker men from Philadelphia","British abolitionists"],"The only southern white women abolitionists."),
 ("grimke","Angelina Grimké argued that rights are founded on…","Being a moral human being, not on sex",["Owning property","Religious membership","Citizenship by birth"],"'Whatever it is morally right for man to do, it is morally right for woman to do.'"),
 ("womensrights","Under coverture, a married woman could NOT…","Own property, testify in court, or make contracts",["Attend church","Raise children","Read or write"],"Her legal identity was absorbed by her husband's."),
 ("womensrights","Why did the abolition movement split in 1840?","Disagreement over women's role in the movement",["Disagreement over the Mexican War","A fight over colonization","Garrison's death"],"The objectors formed the American and Foreign Anti-Slavery Society."),
 ("womensrights","Where did Lucretia Mott and Elizabeth Cady Stanton meet?","At the World Anti-Slavery Convention in London, 1840",["At Seneca Falls, 1848","In Boston, 1831","At the New York legislature, 1854"],"Women delegates were refused seats."),
 ("womensrights","Lucretia Mott founded which organization in 1833?","The Philadelphia Female Anti-Slavery Society",["The National Woman Suffrage Association","The American Colonization Society","The New England Anti-Slavery Society"],"Women organized their own societies."),
 ("womensrights","Susan B. Anthony met Elizabeth Cady Stanton in…","1851",["1840","1848","1869"],"Anthony, a Quaker temperance activist, became the organizer."),
 ("senecafalls","The Seneca Falls convention was held in…","1848, in New York",["1840, in London","1833, in Philadelphia","1860, in Albany"],"July 19 and 20, 1848."),
 ("senecafalls","The Declaration of Sentiments was modeled on…","The Declaration of Independence",["The Constitution","The Liberator","The Bill of Rights"],"'All men and women are created equal.'"),
 ("senecafalls","Which Seneca Falls resolution was the most controversial?","The demand for women's right to vote",["Equal access to education","Property rights","Temperance"],"It passed after Frederick Douglass spoke for it."),
 ("senecafalls","New York's 1860 law gave married women…","Rights to their own wages and joint custody of their children",["The right to vote","Seats in the legislature","The right to divorce freely"],"After Stanton addressed the legislature in 1854."),
],[("Walker's Appeal","1829",1829),("The Liberator founded","1831",1831),("Philadelphia Female Anti-Slavery Society","1833",1833),("Movement splits; London convention","1840",1840),("Seneca Falls convention","1848",1848),("Anthony meets Stanton","1851",1851),("New York married women's law","1860",1860)])
