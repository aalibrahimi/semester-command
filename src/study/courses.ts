import type { Course } from "./types";



/**
 * Course metadata + guide order. Exam facts come from each syllabus and the
 * Canvas assignment list (read Sep 16, 2026). `guides` lists the guide slugs
 * (src/study/guides/<course>--<slug>.json) in reading order; `planned` lists
 * what exists on Canvas but isn't written yet so the course page shows the
 * whole shape of the semester.
 */
export const courses: Course[] = [
  {
    slug: "cs146",
    code: "CS 146",
    title: "Data Structures & Algorithms",
    instructor: "Ben Poon",
    howTheyTest:
      "Every lecture is the same shape: an analogy, the mechanics on a small array, the runtime, a 'Professional Applications' slide. The exam tests exactly what's on the slides — traces, runtimes, and the why — with only a handful of 'extend it to a novel case' questions. The three master-method cases are printed on the exam; nothing else is.",
    weights: [
      { label: "Midterm", pct: "30%" },
      { label: "Final", pct: "40%" },
      { label: "3 Projects", pct: "30%" },
      { label: "Homework", pct: "0% (but predicts your grade)" },
    ],
    exam: {
      label: "Midterm",
      date: "2026-10-12",
      format: "In class, on paper. Master-theorem cases are given; everything else from memory.",
      covers: "Lectures 2–13: ADTs, loop invariants, insertion sort, asymptotic notation, divide & conquer, merge sort, recurrences, heaps, quicksort, linear-time sorts, hash tables, BSTs, AVL trees.",
    },
    deadlines: [
      { date: "2026-09-21", label: "HW 8 · Heaps, Heap Sort, PQs", kind: "hw" },
      { date: "2026-09-23", label: "HW 9 · Quicksort", kind: "hw" },
      { date: "2026-09-25", label: "Project 1 · SortingHub", weight: "10% of grade", kind: "project" },
      { date: "2026-10-07", label: "Midterm review lecture", kind: "other" },
      { date: "2026-10-12", label: "MIDTERM", weight: "30% of grade", kind: "exam" },
    ],
    alerts: [
      { kind: "warn", text: "Project 1 (10% of your grade) is due Fri Sep 25, 11:59pm — Insertion Sort + Merge Sort + a hybrid. 10% off per day late." },
      { kind: "warn", text: "HW 7 (master method) is unsubmitted. Homework is 0% but Poon's data says < 6 completed = high risk of failing. Do it from the Lectures 6–7 chapter and submit late anyway." },
      { kind: "info", text: "Office hours Mon & Wed 8:45–9:00 and 10:15–10:30 around DH318. He leaves at 11:45 sharp — ask in lecture or message on Canvas." },
    ],
    checklist: [
      "Define ADT in Poon's words; array vs linked list trade-offs.",
      "Write ArrayStack and a circular array queue from memory.",
      "State a loop invariant and write Initialization / Maintenance / Termination.",
      "Trace insertion sort with key + sorted prefix; explain Ω(n) / O(n²) and stability.",
      "Formal Big-O definition; prove a linear function is O(n) with c and n₀; simplify a polynomial to Θ.",
      "Trace merge and merge sort in M([…]) format; explain O(n log n) and O(n) space.",
      "Write a recurrence with base case; fill the recursion-tree table; count levels; prove by substitution.",
      "Master method: compute n^(log_b a), pick the case, check regularity, recognize the four 'does not apply' shapes.",
      "Heap index formulas; trace heapify, buildHeap, heapSort, extract; buildHeap is O(n), heapSort O(1) space.",
      "(After Sep 21–Oct 5) partition trace, counting sort, hash collisions, BST delete, AVL rotations.",
    ],
    guides: ["0-notation", "2-adts-invariants-insertion", "4-big-o-merge-sort", "6-recurrences", "8-heaps-heapsort-pq"],
    planned: [
      { label: "Lecture 9", title: "Quicksort (Sep 21)" },
      { label: "Lecture 10", title: "Linear-time sorts (Sep 23)" },
      { label: "Lecture 11", title: "Hash tables (Sep 28)" },
      { label: "Lecture 12", title: "Binary search trees (Sep 30)" },
      { label: "Lecture 13", title: "AVL trees (Oct 5)" },
    ],
  },
  {
    slug: "cs154",
    code: "CS 154",
    title: "Formal Languages & Computability",
    instructor: "Yan Chen",
    howTheyTest:
      "Terse definition → example → exercise slides, with a ♥ on every definition he wants verbatim. Notation is graded as hard as ideas (−0.5 for a missing brace). Weekly timed quizzes are the final in miniature; the final is 100 of 130 points.",
    weights: [
      { label: "Final (mandatory)", pct: "100 / 130 pts" },
      { label: "14 weekly assignments", pct: "21 pts" },
      { label: "Midterm", pct: "3 pts, all-or-nothing" },
      { label: "Discussions", pct: "6 pts" },
    ],
    exam: {
      label: "Midterm (practice for the final)",
      date: "2026-10-14",
      format: "Timed Canvas quiz in class; closed materials; same format as weekly quizzes with more questions and less time each.",
      covers: "Lessons 1–12.5: sets, functions, graphs, strings, languages, DFA, NFA, regular and non-regular languages.",
    },
    deadlines: [
      { date: "2026-09-28", label: "Assignment 4 (NFA)", weight: "1.5 pts", kind: "hw" },
      { date: "2026-10-05", label: "Assignment 5 (Regular languages)", weight: "1.5 pts", kind: "hw" },
      { date: "2026-10-12", label: "Assignment 6 · Midterm review", kind: "hw" },
      { date: "2026-10-14", label: "MIDTERM (in class, tentative)", weight: "3 pts", kind: "exam" },
    ],
    alerts: [
      { kind: "info", text: "Quiz passwords are only given in lecture. 20% late penalty per day. Recordings on Panopto via Course Materials." },
    ],
    checklist: [
      "Recite every ♥ definition: set, finite/infinite, universal set, complement, total/partial function, alphabet, string, formal language, automaton, L(M), DFA accept/reject.",
      "Power sets and Cartesian products with correct braces and sizes.",
      "Translate English ↔ set-builder (at least / at most / exactly / starts with) and write complements.",
      "Compute L₁L₂, Lⁿ, Lᴿ, L̄.",
      "Describe DFA structure and workflow; analyze a DFA into L(M); design a DFA with hell/heaven and every (state, symbol) covered.",
    ],
    guides: ["1-sets-functions", "3-strings-languages", "5-dfa"],
    planned: [
      { label: "Lessons 8–10", title: "NFA, λ-transitions, subset construction (Sep 21–28)" },
      { label: "Lesson 11", title: "Regular languages and closure (Sep 30)" },
      { label: "Lessons 12–12.5", title: "Non-regular languages: the pumping lemma (Oct 5–7)" },
    ],
  },
  {
    slug: "hist15",
    code: "HIST 15",
    title: "Essentials of U.S. History",
    instructor: "Dr. Caitlín Jeffrey",
    howTheyTest:
      "Primary source + discussion: watch/read, take notes on numbered questions, write in class. Every prompt is 'identify and discuss at least N examples' and the rubric rewards specific evidence. Quizzes are open-book multiple choice drawn from the assigned textbook sections.",
    weights: [
      { label: "Class exercises & discussions", pct: "250 pts (45%)" },
      { label: "Quizzes", pct: "100 pts" },
      { label: "2 papers", pct: "200 pts" },
    ],
    exam: {
      label: "Quiz #1 (Ch. 8–9)",
      date: "2026-09-20",
      format: "15 multiple choice, 30 minutes, one attempt, open book. Closes Sun 11:59pm.",
      covers: "Articles of Confederation (what it created, why it failed), how the Constitution changed the government, Anti-Federalist objections, political stability in the 1790s.",
    },
    deadlines: [
      { date: "2026-09-18", label: "David Walker exercise (40-min timer)", weight: "20 pts", kind: "hw" },
      { date: "2026-09-20", label: "QUIZ #1 · Ch. 8–9", weight: "15 pts", kind: "quiz" },
      { date: "2026-10-05", label: "QUIZ #2 · Ch. 11 + lectures", weight: "10 pts", kind: "quiz" },
      { date: "2026-10-14", label: "Historical Analysis Paper 1", weight: "100 pts", kind: "project" },
    ],
    alerts: [
      { kind: "warn", text: "You've been missing the in-class exercises (45% of the grade). One excused absence all semester; the rest are zeros. Wednesday 1:30, DMH 227." },
      { kind: "warn", text: "You opted out of the textbook. The chapters here will be your replacement reading for the quizzes." },
    ],
    checklist: [
      "Articles: structure, four failures (incl. Shays), Northwest Ordinance.",
      "Constitution: Great Compromise, Three-fifths, ratification by convention, Federalist vs Anti-Federalist, Bill of Rights.",
      "1790s stability: Washington's precedents, Judiciary Act, Hamilton's program, Whiskey Rebellion.",
      "Walker's argument with three quoted phrases and the 1830s context.",
    ],
    guides: ["6-walker", "8-confederation-to-constitution", "11-market-revolution"],
    planned: [
      { label: "Weeks 6–7", title: "Abolitionism, Women's Rights, Contested West, Sectional Crisis (Sep 21–30)" },
      { label: "Paper 1", title: "Writing the Historical Analysis Paper (due week 9)" },
    ],
  },
  {
    slug: "ling112",
    code: "LING 112",
    title: "Introduction to Syntax",
    instructor: "Dr. Yining Nie",
    howTheyTest:
      "Flipped classroom: video/reading before class, worksheet packet solved in groups. Every concept is defined by a TEST, never by meaning. The oral exam asks you to explain a concept and then apply it live, so 'how do you know?' is always the real question.",
    weights: [
      { label: "Homework (6)", pct: "45%" },
      { label: "Oral exams (2)", pct: "20%" },
      { label: "Presentation", pct: "15%" },
      { label: "Quizzes (6)", pct: "10%" },
      { label: "Participation", pct: "10%" },
    ],
    exam: {
      label: "Oral Exam 1",
      date: "2026-10-13",
      format: "Individual, 20–25 min, Oct 13 or 15. Explain a concept chosen in advance, then apply it to a fresh problem.",
      covers: "Weeks 1–8: categories & distribution tests, heads/dependents, complements vs adjuncts, constituency tests, phrase structure, X-bar, theta roles.",
    },
    deadlines: [
      { date: "2026-09-21", label: "Quiz 2 due Mon noon (open book)", kind: "quiz" },
      { date: "2026-09-24", label: "Quiz 3 in class", kind: "quiz" },
      { date: "2026-09-30", label: "HW 2 due Wed noon", weight: "7.5%", kind: "hw" },
      { date: "2026-10-13", label: "ORAL EXAM 1", weight: "10–20%", kind: "exam" },
    ],
    alerts: [
      { kind: "info", text: "Participation includes uploading class notes twice; you were scheduled for 8/25. Upload a photo of that packet if you haven't." },
    ],
    checklist: [
      "Label any sentence with the 11 categories and justify with a test.",
      "Three-line interlinear gloss for an Arabic sentence.",
      "Head / complement / adjunct with the four diagnostics; dependency arrows.",
      "Substitution, movement, fragment-answer tests with correct pass/fail.",
      "Head directionality for English, Japanese, Arabic.",
    ],
    guides: ["0-what-syntax-is", "2-categories", "4-heads-dependents", "5-constituency-tests", "6-phrase-structure"],
    planned: [
      { label: "Week 7", title: "X-bar theory (Sep 29–Oct 1)" },
      { label: "Week 8", title: "Arguments, adjuncts, theta roles · Oral Exam 1 prep" },
    ],
  },
  {
    slug: "ling124",
    code: "LING 124",
    title: "Intro to Speech Technology",
    instructor: "Dr. Hahn Koo",
    howTheyTest:
      "Math built one rotating-circle picture at a time: sinusoid → complex sinusoid → Fourier series → transform → DFT → STFT. 80% labs: run Colab cells, answer multiple choice about what you see. The skill is predicting what a plot does when one parameter changes.",
    weights: [
      { label: "Lab assignments", pct: "80%" },
      { label: "Final (open materials)", pct: "20%" },
    ],
    exam: {
      label: "Final exam (no midterm)",
      date: "2026-12-11",
      format: "Released on Canvas on exam day; MC + short essay; answer using readings and lab notebooks; email answers.",
      covers: "Everything: acoustics → Fourier → STFT → ASR (Mel, cepstrum, DTW, GMM, HMM, neural nets) → TTS.",
    },
    deadlines: [
      { date: "2026-09-17", label: "Lab #7 due (windowing)", weight: "2.5 pts", kind: "hw" },
      { date: "2026-09-24", label: "Lab #8 (STFT) — expected", kind: "hw" },
      { date: "2026-12-11", label: "FINAL EXAM", weight: "20 pts", kind: "exam" },
    ],
    alerts: [
      { kind: "warn", text: "Labs 5 and 6 are unsubmitted (~5 of 80 lab points). Email Koo today; Lab 7 is still open." },
    ],
    checklist: [
      "F = 1/T; dB = 20·log10(x/r); magnitude vs phase spectrum vs spectrogram.",
      "x[n] = x(n/Fs); aliases of F; Nyquist = Fs/2.",
      "Read A, F, ϕ off A·cos(2πFt + ϕ); rewrite with ±2π, negative F, sin ↔ cos.",
      "Complex numbers in three forms; conjugate; Euler; cos θ = (e^{jθ} + e^{−jθ})/2.",
      "Fourier series: three forms, conversions, compute X_k for a sum of cosines, orthogonality.",
      "DFT/IDFT, bin spacing Fs/N, leakage, STFT parameters, narrow vs broad band.",
    ],
    guides: ["0-reading-a-wave", "3-sampling-aliasing", "4-complex-sinusoids", "5-fourier-series", "6-transform-dft-stft"],
    planned: [
      { label: "Days 10–11", title: "Mel filterbank, cepstrum, MFCC features" },
      { label: "Days 12–13", title: "Dynamic time warping, GMMs, HMMs" },
      { label: "Days 14+", title: "Neural ASR and TTS" },
    ],
  },
  {
    slug: "ling115",
    code: "LING 115",
    title: "Corpus Linguistics",
    instructor: "Dr. Kelsey Kraus",
    howTheyTest:
      "Tuesday lecture, Thursday Colab lab. Coin-flip 'chance quizzes': one True/False and one 'give an example' question. Her theme: every technical choice (tokenizing, lowercasing, tagging) is a linguistic decision that can erase information — name what a choice loses and you're speaking her language.",
    weights: [
      { label: "Homework & reading responses", pct: "40%" },
      { label: "Final project", pct: "30%" },
      { label: "Labs, quizzes, participation", pct: "20%" },
      { label: "Take-home midterm", pct: "10%" },
    ],
    exam: {
      label: "Take-home midterm",
      date: "2026-10-15",
      format: "Released Oct 8, due Oct 15 EOD. Like a homework that asks more. Collaboration allowed; write-up your own.",
      covers: "Weeks 1–8: corpus design, regex, tokens/types/TTR, normalization, annotation, POS tagging, frequencies, collocations.",
    },
    deadlines: [
      { date: "2026-10-02", label: "Final project proposal", weight: "5%", kind: "project" },
      { date: "2026-10-08", label: "Midterm released · Reading Response 2", kind: "hw" },
      { date: "2026-10-15", label: "TAKE-HOME MIDTERM due", weight: "10%", kind: "exam" },
    ],
    alerts: [
      { kind: "warn", text: "Weeks 1–2 are locked until you pass the Syllabus Quiz in the Intro module. Take it — it's minutes." },
    ],
    checklist: [
      "Regex anchors, quantifiers, groups; re.findall/sub/split.",
      "Lemma/wordform/type/token; TTR; Heaps' law; hapax.",
      "Where whitespace tokenization fails; the normalization table; three 'cleaning erases X' examples.",
      "Six annotation levels; datasheets; the data-linguist process.",
      "Parsing vs tagging; three ambiguity types; Brown vs PTB.",
    ],
    guides: ["1-what-is-a-corpus", "4-regex", "5-words-tokens-normalization", "7-annotation-pos"],
    planned: [
      { label: "Week 6", title: "Frequencies: raw vs relative, Zipf's law, keyness (Sep 22–24)" },
      { label: "Week 7", title: "Building an annotated dataset; annotation guidelines (Oct 1)" },
      { label: "Week 8", title: "Collocations and concordances: KWIC, MI, t-score (Oct 6–8)" },
    ],
  },
];

export function courseBySlug(slug: string | undefined): Course | undefined {
  return courses.find((c) => c.slug === slug);
}
