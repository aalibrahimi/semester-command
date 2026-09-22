/**
 * syllabusDigest: the parts of each syllabus that actually change what you
 * do: when and where class meets, how to reach the professor, how the grade
 * is built, the dates, and the rules that cost points.
 *
 * Called by: routes/Syllabi.tsx (the "Key details" panel).
 * Calls: nothing. Static data.
 *
 * Where it came from (read on 2026-09-22):
 *   - CS 146, CS 154, LING 112, LING 115, LING 124: the official SJSU
 *     syllabus on Concourse (the "SJSU Official Syllabus" tab in Canvas
 *     opens the same document).
 *   - HIST 15: the syllabus PDF in the Canvas "General Information" module.
 *   - LING 115 also: the "Syllabus Greatest Hits & FAQs" Canvas page.
 *   - Final exam slots the syllabus leaves out: the SJSU Fall 2026 final
 *     exam schedule, matched by meeting days and start time.
 *
 * Only what is written in those sources goes here. University boilerplate
 * (learning outcomes, S16-9, accommodations) is left out on purpose; the
 * full text is still one click away in the viewer.
 */

export type DigestDateKind = "exam" | "due" | "noclass" | "other";

export interface DigestDate {
  /** ISO yyyy-mm-dd. */
  date: string;
  label: string;
  kind: DigestDateKind;
  /** "noon", "10:45 AM to 12:45 PM", ... */
  time?: string;
}

export type RuleTag = "Late work" | "Make-up" | "Missed class" | "AI use" | "Exams" | "Heads up";

export interface DigestRule {
  tag: RuleTag;
  text: string;
}

export interface GradePart {
  label: string;
  /** Relative size for the bar. Percent, or points when the course uses points. */
  weight: number;
  /** What to print: "30%", "100 pts". */
  show: string;
  note?: string;
}

export interface SyllabusDigest {
  /** Matches parseCourseLabel(...).code, e.g. "CS-146". */
  code: string;
  title: string;
  /** The single most useful sentence about this course. */
  headline: string;
  meets: string;
  room: string;
  instructor: string;
  email: string;
  phone?: string;
  /** How they want to be contacted, when the syllabus says. */
  contactNote?: string;
  officeHours: string[];
  grading: GradePart[];
  /** Short letter-grade cutoffs. */
  scale: string;
  dates: DigestDate[];
  rules: DigestRule[];
  materials: string[];
  source: { label: string; url: string; updated: string };
}

const CONCOURSE = (id: number) => `https://sjsu.campusconcourse.com/view_syllabus?course_id=${id}`;

export const SYLLABUS_DIGESTS: SyllabusDigest[] = [
  {
    code: "CS-146",
    title: "Data Structures and Algorithms",
    headline:
      "Two exams are 70% of your grade (midterm 30%, final 40%). The three projects are the other 30%, and they lose 10% for every day late.",
    meets: "Mon and Wed, 10:30 to 11:45 AM",
    room: "Duncan Hall 318",
    instructor: "Benjamin Poon",
    email: "ben.poon@sjsu.edu",
    contactNote: "Prefers Canvas messages or office hours over email.",
    officeHours: ["Mon and Wed, 8:45 to 9:00 AM", "Mon and Wed, 10:15 to 10:30 AM", "In or near Duncan Hall 318"],
    grading: [
      { label: "Final exam", weight: 40, show: "40%" },
      { label: "Midterm", weight: 30, show: "30%" },
      { label: "Programming projects (3)", weight: 30, show: "30%", note: "10% each" },
    ],
    scale: "A+ 97 · A 93 · A- 90 · B+ 87 · B 83 · B- 80 · C+ 77 · C 73 · C- 70. A score on the line gets the higher grade, and the class may be curved up.",
    dates: [
      { date: "2026-09-25", label: "Project 1 due", kind: "due", time: "11:59 PM" },
      { date: "2026-10-12", label: "Midterm", kind: "exam" },
      { date: "2026-12-11", label: "Final exam", kind: "exam", time: "10:45 AM to 12:45 PM" },
    ],
    rules: [
      { tag: "Late work", text: "Projects lose 10% per day late. A few minutes past 11:59 PM already counts as one day. 10 or more days late is a 0." },
      { tag: "Heads up", text: "Projects are solo. You can talk ideas through with classmates, but every line of code you submit must be yours." },
      { tag: "AI use", text: "AI tools are allowed only if you cite them as a source. Using one without citing it is an academic integrity violation." },
      { tag: "Missed class", text: "Lectures are not recorded. Slides go up on Canvas right before each lecture." },
    ],
    materials: [
      "Cormen, Leiserson, Rivest, Stein: Introduction to Algorithms, 3rd edition",
      "A laptop that can compile and run Java",
    ],
    source: { label: "Official SJSU syllabus (Section 08)", url: CONCOURSE(94190), updated: "2026-08-26" },
  },
  {
    code: "CS-154",
    title: "Formal Languages and Computability",
    headline:
      "The final is 100 of the 130 possible points, so it is almost the whole grade. Weekly assignments and the midterm are optional extra points on top.",
    meets: "Mon and Wed, 3:00 to 4:15 PM (Section 1)",
    room: "MacQuarrie Hall 523",
    instructor: "Yan Chen",
    email: "yan.chen01@sjsu.edu",
    contactNote: "No homework questions by email in the last 24 hours before a due date.",
    officeHours: ["Mon and Wed, 2:00 to 3:00 PM on Zoom", "Or in person in Duncan Hall 282", "Or book an appointment"],
    grading: [
      { label: "Final exam", weight: 100, show: "100 pts", note: "Mandatory, cumulative. Can be swapped for or averaged with a final project." },
      { label: "Weekly assignments (14)", weight: 21, show: "21 pts", note: "Optional, 1.5 pts each" },
      { label: "Other activities", weight: 6, show: "6 pts", note: "Optional: readings, discussions" },
      { label: "Midterm", weight: 3, show: "3 pts", note: "Optional. All 3 pts if you score over 50%, else 0." },
    ],
    scale: "Points, not percent: A 93 · A- 90 · B+ 86 · B 83 · B- 80 · C+ 76 · C 73 · C- 70 · D 63. 130 points are possible, so extra points can carry you past 100.",
    dates: [
      { date: "2026-09-28", label: "Assignment 4 (DFA/NFA quiz)", kind: "due", time: "11:59 PM" },
      { date: "2026-10-14", label: "Midterm (Section 1, on Canvas, no class meeting)", kind: "exam" },
      { date: "2026-11-10", label: "Final project option explained in class (tentative)", kind: "other" },
      { date: "2026-12-07", label: "Everything except the final is due", kind: "due" },
      { date: "2026-12-11", label: "Final exam (online, closed materials)", kind: "exam", time: "3:15 to 5:15 PM" },
    ],
    rules: [
      { tag: "Heads up", text: "Each assignment is locked with a password that is only given out in lecture. Miss class, miss the password." },
      { tag: "Late work", text: "20% off per day late. Not accepted after 4 days." },
      { tag: "Exams", text: "Use only the notation from class. Different notation is marked wrong, even if the idea is right." },
      { tag: "Exams", text: "Midterm and final are closed to all materials. The final is online, so you can take it anywhere with stable internet." },
      { tag: "AI use", text: "Copying from classmates, past semesters, the internet, or AI is cheating: a warning the first time, then a grade drop each time." },
    ],
    materials: ["No required textbook. Everything is on Canvas.", "JFLAP (for designing machines)", "Optional: Linz, An Introduction to Formal Languages and Automata, 5th edition"],
    source: { label: "Official SJSU syllabus", url: CONCOURSE(93737), updated: "2026-08-26" },
  },
  {
    code: "HIST-15",
    title: "Essentials of U.S. History",
    headline:
      "In-class exercises and discussions are 45% of the grade, and you only get one excused miss. Quizzes cannot be made up.",
    meets: "Mon and Wed, 1:30 to 2:45 PM",
    room: "Dudley Moorhead Hall 227",
    instructor: "Dr. Caitlín Jeffrey",
    email: "caitlin.jeffrey@sjsu.edu",
    contactNote: "Email after 5 PM Mon to Thu gets an answer the next day. After 5 PM Friday, not until Monday.",
    officeHours: ["Mon and Wed, 8:00 to 8:30 AM, DMH 141", "Mon, 3:00 to 4:00 PM, DMH 141", "Tue, 10:00 to 11:00 AM on Zoom", "Email her to book a slot"],
    grading: [
      { label: "Class exercises and discussions", weight: 250, show: "250 pts", note: "45%. Each one is 10 to 30 pts." },
      { label: "Historical analysis papers (2)", weight: 200, show: "200 pts", note: "100 each" },
      { label: "Quizzes", weight: 100, show: "100 pts", note: "Open book, timed, 5 to 30 pts each" },
    ],
    scale: "Out of 550: A 512 · A- 495 · B+ 479 · B 457 · B- 440 · C+ 425 · C 402 · C- 385 · D- 330.",
    dates: [
      { date: "2026-10-05", label: "Quiz 2", kind: "exam" },
      { date: "2026-10-14", label: "Historical Analysis Paper 1 due (1776 to 1880)", kind: "due" },
      { date: "2026-11-11", label: "Veterans Day, no class", kind: "noclass" },
      { date: "2026-11-16", label: "Last day for a late drop or withdrawal", kind: "other" },
      { date: "2026-11-25", label: "Thanksgiving break (through Nov 27)", kind: "noclass" },
      { date: "2026-12-07", label: "Last day of class (review day)", kind: "other" },
      { date: "2026-12-14", label: "Finals slot: Paper 2 due (1890 to 1970s)", kind: "due", time: "1:00 to 3:00 PM" },
    ],
    rules: [
      { tag: "Late work", text: "Late class exercises: 5 points off, then 5 more per day. Nothing accepted after 48 hours." },
      { tag: "Late work", text: "Late papers: 10 points off per day. Nothing accepted after 48 hours. Submit on Canvas only, never by email." },
      { tag: "Missed class", text: "You get 1 excused missed in-class exercise or discussion. Every other one you miss is a 0." },
      { tag: "Make-up", text: "Miss a quiz's due date and it is a 0. You can take it any time during its module week." },
      { tag: "Make-up", text: "Need an extension? Email her before the due date, with documentation (like a doctor's note)." },
      { tag: "Heads up", text: "Tech trouble: email her within 24 hours with a screenshot, and open a Canvas help ticket. Otherwise late work is not accepted." },
      { tag: "AI use", text: "Cite any AI help in your Works Cited. Uncited AI: 10 points off the first time. AI-written argument: redo for partial credit. After that, the flagged % is taken off your score." },
    ],
    materials: [
      "Roark et al., The American Promise, volumes 1 and 2 (9th ed.)",
      "Macmillan Bookshelf of American History through My Materials in Canvas ($31.49)",
      "A laptop or tablet for class",
    ],
    source: { label: "Syllabus PDF on Canvas", url: "https://sjsu.instructure.com/courses/1635995/files/88206138", updated: "2026-08-16" },
  },
  {
    code: "LING-112",
    title: "Introduction to Syntax",
    headline:
      "Homework is 45% of the grade and is due Mondays at noon. There are no written exams: you get two short oral exams instead.",
    meets: "Tue and Thu, 9:00 to 10:15 AM",
    room: "Clark Hall 202",
    instructor: "Dr. Yining Nie",
    email: "yining.nie@sjsu.edu",
    officeHours: ["Tue and Thu, 11:00 AM to 12:00 PM", "Clark Hall 491 or Zoom", "Or book on her Calendly"],
    grading: [
      { label: "Homework (6)", weight: 45, show: "45%" },
      { label: "Oral exams (2)", weight: 20, show: "20%", note: "20 to 25 min each: explain a concept, then use it on a problem" },
      { label: "Group presentation", weight: 15, show: "15%", note: "10% group grade, 5% your own part" },
      { label: "Quizzes (6)", weight: 10, show: "10%", note: "Open book" },
      { label: "Participation", weight: 10, show: "10%", note: "6% in class, 4% for posting class notes at least twice" },
    ],
    scale: "A+ 97 · A 93 · A- 90 · B+ 87 · B 83 · B- 80 · C+ 77 · C 73. Your total is rounded up to the next whole percent (86.1 becomes 87, a B+).",
    dates: [
      { date: "2026-09-24", label: "Quiz 3 (in class)", kind: "exam" },
      { date: "2026-09-30", label: "HW 2 due", kind: "due", time: "noon" },
      { date: "2026-10-05", label: "Quiz 4 due", kind: "due", time: "noon" },
      { date: "2026-10-08", label: "Midterm review, oral exam 1 sign-up", kind: "other" },
      { date: "2026-10-12", label: "HW 3 due", kind: "due", time: "noon" },
      { date: "2026-10-13", label: "Oral exam 1 (Oct 13 or 15, no class)", kind: "exam" },
      { date: "2026-10-22", label: "Presentation groups formed", kind: "other" },
      { date: "2026-10-27", label: "Quiz 5 (in class)", kind: "exam" },
      { date: "2026-11-02", label: "HW 4 due", kind: "due", time: "noon" },
      { date: "2026-11-05", label: "Quiz 6 (in class)", kind: "exam" },
      { date: "2026-11-10", label: "Presentation meetings", kind: "other" },
      { date: "2026-11-23", label: "HW 5 due", kind: "due", time: "noon" },
      { date: "2026-11-26", label: "Thanksgiving, no class", kind: "noclass" },
      { date: "2026-12-01", label: "Group presentations (Dec 1 and 3)", kind: "exam" },
      { date: "2026-12-07", label: "HW 6 due, oral exam 2 sign-up", kind: "due", time: "noon" },
      { date: "2026-12-10", label: "Oral exam 2", kind: "exam" },
    ],
    rules: [
      { tag: "Late work", text: "Homework is due Monday at noon, but she accepts it with no penalty until Tuesday's class starts. After that, only with a documented excuse." },
      { tag: "Exams", text: "Oral exam 1 is required. You can skip oral exam 2, and then exam 1 counts for both." },
      { tag: "Heads up", text: "Flipped class: do the reading or video (20 to 30 min) before each class. Class time is group problem solving." },
      { tag: "Heads up", text: "Post your class notes to the \"Class notes repository\" at least twice, right after class. That is 4% of your grade." },
      { tag: "Heads up", text: "Work on homework with classmates if you like, but type up your own. Any submitted work scores at least 50%." },
      { tag: "Missed class", text: "Keep the paper handouts all semester. If you miss class, classmates' notes and the handout are on Canvas." },
    ],
    materials: [
      "Carnie, Syntax: A Generative Introduction (3rd ed.) and his video series",
      "Tallerman, Understanding Syntax; Chomsky, Syntactic Structures (PDFs on Canvas)",
      "Essentials of Linguistics (free online) and TrevTutor videos",
    ],
    source: { label: "Official SJSU syllabus", url: CONCOURSE(89433), updated: "2026-08-26" },
  },
  {
    code: "LING-115",
    title: "Corpus Linguistics",
    headline:
      "Homework and reading responses are 40%, the group final project is 30%. You can hand in 2 assignments late, but only if you tell her before the deadline.",
    meets: "Tue and Thu, 10:30 to 11:45 AM (Tue lecture, Thu hands-on lab)",
    room: "Clark Hall 242",
    instructor: "Dr. Kelsey Kraus",
    email: "kelsey.kraus@sjsu.edu",
    contactNote: "Start every subject line with [Ling 115]. Email before 7 PM for a same-day reply. \"Kelsey\" is fine.",
    officeHours: ["Mon, 3:00 to 4:00 PM", "Tue, 2:00 to 3:00 PM", "Clark Hall 481, or by appointment"],
    grading: [
      { label: "Homework (4) and reading responses", weight: 40, show: "40%" },
      { label: "Final project (group)", weight: 30, show: "30%", note: "Proposal 5, update 1 5, update 2 5, presentation 5, paper 10" },
      { label: "Labs and chance quizzes", weight: 20, show: "20%" },
      { label: "Take-home midterm", weight: 10, show: "10%" },
    ],
    scale: "A 93 · A- 90 · B+ 87 · B 83 · B- 80 · C+ 77 · C 73 · C- 70 · D+ 65 · D 60. Anything you turn in with real effort scores at least 50%.",
    dates: [
      { date: "2026-10-02", label: "Final project proposal", kind: "due" },
      { date: "2026-10-08", label: "Reading response 2 due, midterm handed out", kind: "due", time: "10 AM" },
      { date: "2026-10-15", label: "Take-home midterm due, no class", kind: "exam", time: "end of day AoE" },
      { date: "2026-10-30", label: "HW 3 due (week 11)", kind: "due", time: "end of day AoE" },
      { date: "2026-11-03", label: "Final project group meetings (Nov 3 and 5)", kind: "other" },
      { date: "2026-11-05", label: "Reading response 3 due (week 12)", kind: "due", time: "10 AM" },
      { date: "2026-11-20", label: "HW 4 due (week 14)", kind: "due", time: "end of day AoE" },
      { date: "2026-11-24", label: "No class, alternative assignment", kind: "noclass" },
      { date: "2026-11-26", label: "Thanksgiving, no class", kind: "noclass" },
      { date: "2026-12-01", label: "Group video presentations (Dec 1 and 3)", kind: "exam" },
      { date: "2026-12-10", label: "Final project paper due", kind: "due", time: "end of day AoE" },
    ],
    rules: [
      { tag: "Late work", text: "Up to 2 days late, no questions asked, at most twice all semester. You must tell her before the deadline. Not for the final paper." },
      { tag: "Heads up", text: "Homework is due Friday end of day Anywhere on Earth, which means the Canvas lock is 3:59 AM Saturday. Reading responses are due Thursday 10 AM." },
      { tag: "Make-up", text: "Chance quizzes: a coin flip each class decides. 2 questions, and just trying earns 3 of 5. Cannot be made up, but the lowest 3 are dropped." },
      { tag: "AI use", text: "Highlight any AI-written part and cite it: tool, date, your exact prompt, and 2 to 3 sentences on how you used it. She may quiz you on work she suspects." },
      { tag: "Heads up", text: "Collaborating is fine, but write your own and list your collaborators' names." },
    ],
    materials: ["No textbook to buy", "Jurafsky and Martin, Speech and Language Processing, 3rd ed. (free online)", "Python and bash (Colab)"],
    source: { label: "Official SJSU syllabus + Canvas FAQ", url: CONCOURSE(94438), updated: "2026-08-26" },
  },
  {
    code: "LING-124",
    title: "Introduction to Speech Technology",
    headline:
      "Labs are 80% of the grade and late labs are not accepted unless you arrange it with him before the deadline. The final is the other 20%.",
    meets: "Tue and Thu, 3:00 to 4:15 PM",
    room: "Clark Hall 242",
    instructor: "Dr. Hahn Koo",
    email: "hahn.koo@sjsu.edu",
    phone: "408-924-7093",
    officeHours: ["Tue and Thu, 1:30 to 2:00 PM on Zoom", "Sign up in advance on his calendar", "Office: Clark Hall 485"],
    grading: [
      { label: "Lab assignments", weight: 80, show: "80%", note: "80 points across the semester" },
      { label: "Final exam", weight: 20, show: "20%", note: "Multiple choice and short essay" },
    ],
    scale: "A+ 99 · A 93 · A- 87 · B+ 81 · B 75 · B- 69 · C+ 63 · C 57 · C- 51. A generous scale: 87 is already an A-.",
    dates: [{ date: "2026-12-10", label: "Final exam (finals slot)", kind: "exam", time: "1:00 to 3:00 PM" }],
    rules: [
      { tag: "Late work", text: "Late submissions are not accepted unless you negotiate it with him before the deadline." },
      { tag: "Exams", text: "The final is posted on Canvas on exam day. Answer using the readings and the lab notebooks, then email him your answers." },
      { tag: "Heads up", text: "Labs are Python notebooks. You study the demo, then implement the method yourself, often in groups." },
    ],
    materials: ["No textbook. Readings and notebooks are on Canvas."],
    source: { label: "Official SJSU syllabus", url: CONCOURSE(89634), updated: "2026-08-26" },
  },
];

/** The digest for a Canvas course string like "FA26: CS-146 Sec 08 - ...". */
export function digestFor(code: string | null): SyllabusDigest | null {
  if (!code) return null;
  return SYLLABUS_DIGESTS.find((d) => d.code === code) ?? null;
}
