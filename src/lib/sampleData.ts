/**
 * sampleData.ts — fabricated coursework for the dev-only design preview.
 *
 * Called by: routes/DevPreview.tsx and nothing else. Guard rail: if this file
 * is ever imported outside a `/dev/*` route, fake grades are one refactor away
 * from rendering as real ones. Do not add exports that look like the real
 * hooks.
 *
 * The numbers are chosen to exercise the design, not to be pretty: one course
 * in each signal state, gaps wide enough to make the hatch region visible, and
 * one course where the target is already unreachable.
 */
import type { AssignmentDetail, CourseSummary, SignalStatus } from "@/types";

export interface SampleCourse {
  id: string;
  code: string;
  name: string;
  currentPct: number;
  projectedPct: number;
  maxPossiblePct: number;
  targetPct: number;
  targetLetter: string;
  status: SignalStatus;
}

export interface SampleTriageRow {
  id: string;
  courseCode: string;
  title: string;
  dueLabel: string;
  /** Share of the final grade at stake, preformatted. */
  impactLabel: string;
  estLabel: string;
  state: "overdue" | "missing" | "open";
  status: SignalStatus;
}

export const SAMPLE_COURSES: SampleCourse[] = [
  {
    id: "1",
    code: "CS 149",
    name: "Operating Systems",
    currentPct: 91.4,
    projectedPct: 84.6,
    maxPossiblePct: 96.2,
    targetPct: 83,
    targetLetter: "B",
    status: "onTrack",
  },
  {
    id: "2",
    code: "CS 152",
    name: "Programming Paradigms",
    currentPct: 85.0,
    projectedPct: 68.0,
    maxPossiblePct: 88.0,
    targetPct: 87,
    targetLetter: "B+",
    status: "atRisk",
  },
  {
    id: "3",
    code: "MATH 161A",
    name: "Applied Probability & Statistics",
    currentPct: 74.8,
    projectedPct: 58.1,
    maxPossiblePct: 79.3,
    targetPct: 83,
    targetLetter: "B",
    status: "critical",
  },
  {
    id: "4",
    code: "KIN 35A",
    name: "Beginning Weight Training",
    currentPct: 98.0,
    projectedPct: 96.5,
    maxPossiblePct: 99.1,
    targetPct: 90,
    targetLetter: "A−",
    status: "locked",
  },
];

export const SAMPLE_TRIAGE: SampleTriageRow[] = [
  {
    id: "t1",
    courseCode: "MATH 161A",
    title: "Homework 7 — Joint distributions",
    dueLabel: "2d overdue",
    impactLabel: "worth 4.5% of your final grade",
    estLabel: "2h",
    state: "overdue",
    status: "critical",
  },
  {
    id: "t2",
    courseCode: "CS 152",
    title: "Project 3 — Interpreter, part two",
    dueLabel: "in 26h",
    impactLabel: "worth 12.0% of your final grade",
    estLabel: "6h",
    state: "open",
    status: "atRisk",
  },
  {
    id: "t3",
    courseCode: "MATH 161A",
    title: "Quiz 5 — Central limit theorem",
    dueLabel: "in 3d",
    impactLabel: "worth 5.0% of your final grade",
    estLabel: "1h 30m",
    state: "open",
    status: "critical",
  },
  {
    id: "t4",
    courseCode: "CS 149",
    title: "Lab 8 — Scheduling simulator",
    dueLabel: "in 5d",
    impactLabel: "worth 3.2% of your final grade",
    estLabel: "3h",
    state: "open",
    status: "onTrack",
  },
  {
    id: "t5",
    courseCode: "CS 152",
    title: "Reading response — Continuations",
    dueLabel: "in 6d",
    impactLabel: "worth 1.0% of your final grade",
    estLabel: "40m",
    state: "missing",
    status: "atRisk",
  },
];

/* ── Course Brief sample (real shapes, fabricated values) ─────────────────
   These use the REAL CourseSummary/AssignmentDetail types so the preview
   exercises the exact component the app ships. Due dates are relative to
   "now" so the casual phrasing ("due tomorrow night") stays alive. */

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

export const SAMPLE_BRIEF_SUMMARY: CourseSummary = {
  id: "sample-hist",
  courseCode: "HIST 15",
  name: "Essential US History",
  term: "Fall 2026",
  source: "api",
  grade: {
    currentPct: 87.5,
    projectedPct: 41.2,
    gapPct: 46.3,
    mode: "weighted",
    canvasCurrentPct: 87.5,
    reconciliationDelta: null,
  },
  maxPossiblePct: 94.1,
  currentLetter: "B+",
  projectedLetter: "F",
  targetPct: 90,
  targetLetter: "A-",
  status: "atRisk",
  openCount: 5,
  missingCount: 1,
  gradeable: true,
  active: true,
  hidden: false,
};

function briefAssignment(
  over: Partial<AssignmentDetail> & { id: string; name: string },
): AssignmentDetail {
  return {
    groupId: "g1",
    dueAt: null,
    pointsPossible: 15,
    score: null,
    excused: false,
    missing: false,
    late: false,
    submitted: false,
    omitted: false,
    htmlUrl: null,
    source: "api",
    hasRubric: false,
    rubricJson: null,
    descriptionHtml: null,
    submissionTypes: null,
    impactPct: 17.6,
    estMinutes: null,
    ...over,
  };
}

export const SAMPLE_BRIEF_ASSIGNMENTS: AssignmentDetail[] = [
  briefAssignment({
    id: "sb1",
    name: "Class Exercise: U.S. Constitution",
    dueAt: hoursFromNow(-9 * 24),
    missing: true,
  }),
  briefAssignment({
    id: "sb2",
    name: "Quiz #1 (Chapter 8 and Chapter 9)",
    dueAt: hoursFromNow(40),
  }),
  briefAssignment({
    id: "sb3",
    name: "Class Discussion #3: The Early Republic",
    dueAt: hoursFromNow(6 * 24),
    impactPct: 8.8,
    pointsPossible: 10,
  }),
  briefAssignment({
    id: "sb4",
    name: "Week 4 Reading Checklist",
    dueAt: hoursFromNow(8 * 24),
    impactPct: 0,
    pointsPossible: 0,
  }),
  briefAssignment({
    id: "sb5",
    name: "Class Discussion #2: Slavery and the Making of America",
    dueAt: hoursFromNow(-3 * 24),
    submitted: true,
  }),
  briefAssignment({
    id: "sb6",
    name: "Quiz #0: Syllabus",
    dueAt: hoursFromNow(-14 * 24),
    score: 14,
    submitted: true,
  }),
  briefAssignment({
    id: "sb7",
    name: "Class Exercise: Colonial Economies",
    dueAt: hoursFromNow(-20 * 24),
    score: 13.5,
    submitted: true,
  }),
];
