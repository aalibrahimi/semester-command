/**
 * gradPlan.ts — the degree plan's term structure and the merge that keeps it
 * truthful.
 *
 * Called by: routes/Graduation.tsx, components/grade/GradCourseSheet.tsx.
 * Calls: lib/gradData (the course intelligence registry, ported verbatim
 * from CWA-Manager's GraduationPlan).
 *
 * Three inputs merge into what the screen shows:
 *   1. The static default plan below (which course, which term, why).
 *   2. Live Canvas enrollment from this app's own sync — an enrolled course
 *      is in_progress *wherever the plan expected it*, and if it's being
 *      taken earlier than planned it visibly moves to the current term.
 *   3. User overrides from the grad_overrides table (passed/failed/dropped,
 *      manual term moves) — these always win.
 *
 * The point of the merge: the plan reconciles itself against reality every
 * sync, so "what do I take next semester" is always answered from live data,
 * and plan-vs-enrollment divergence is surfaced instead of hidden.
 */
import { COURSE_INTEL, TRANSFERRED_OR_PRIOR } from "@/lib/gradData";
import type { CourseSummary } from "@/types";

export type GradStatus = "planned" | "in_progress" | "passed" | "failed" | "dropped";

export interface GradTerm {
  id: string;
  label: string;
  /** ISO date bounds, used to auto-detect the current term. */
  start: string;
  end: string;
  isTarget?: boolean;
  tag?: string;
}

/** Spring 2026 → Spring 2028 — the CWA plan's window. */
export const TERMS: GradTerm[] = [
  { id: "sp26", label: "Spring 2026", start: "2026-01-21", end: "2026-05-22" },
  { id: "su26", label: "Summer 2026", start: "2026-06-01", end: "2026-08-11", tag: "Compressed term" },
  { id: "fa26", label: "Fall 2026", start: "2026-08-19", end: "2026-12-18" },
  { id: "sp27", label: "Spring 2027", start: "2027-01-20", end: "2027-05-21" },
  { id: "su27", label: "Summer 2027", start: "2027-06-01", end: "2027-08-10", tag: "Compressed term" },
  { id: "fa27", label: "Fall 2027", start: "2027-08-18", end: "2027-12-17" },
  { id: "sp28", label: "Spring 2028", start: "2028-01-19", end: "2028-05-19", isTarget: true },
];

/** Default course → term slotting, with the short category the table shows. */
const SLOTS: { code: string; term: string; category: string }[] = [
  // Spring 2026
  { code: "BUS3 186", term: "sp26", category: "GE · UD Area 4" },
  { code: "CS 22B", term: "sp26", category: "Major Elective" },
  { code: "LLD 100W", term: "sp26", category: "WID Requirement" },
  { code: "MATH 42", term: "sp26", category: "Major Prep · Gateway" },
  { code: "PHIL 134", term: "sp26", category: "GE UD-3 + Major Prep" },
  // Summer 2026
  { code: "MATH 31", term: "su26", category: "Major Prep · Retake" },
  { code: "AAS 1", term: "su26", category: "GE · Ethnic Studies" },
  // Fall 2026
  { code: "CS 146", term: "fa26", category: "CS Core · Gateway" },
  { code: "CS 154", term: "fa26", category: "CS Core" },
  { code: "MATH 39", term: "fa26", category: "Major Prep" },
  { code: "LING 111", term: "fa26", category: "LING Core" },
  { code: "HIST 15", term: "fa26", category: "American Institutions" },
  // Spring 2027
  { code: "CS 156", term: "sp27", category: "CS Core" },
  { code: "MATH 161A", term: "sp27", category: "Major Prep" },
  { code: "LING 112", term: "sp27", category: "LING Core" },
  { code: "LING 115", term: "sp27", category: "LING Core · Unlocks NLP" },
  { code: "LING 113", term: "sp27", category: "LING UD Choice" },
  // Summer 2027
  { code: "ANTH 160", term: "su27", category: "GE · UD Area 2/5" },
  { code: "LING 122", term: "su27", category: "LING UD Elective" },
  // Fall 2027
  { code: "CS 171", term: "fa27", category: "CS Core · Fall only" },
  { code: "LING 124", term: "fa27", category: "LING Core · Fall only" },
  { code: "CS 157A", term: "fa27", category: "CS UD Elective" },
  // Spring 2028 — target
  { code: "LING 165", term: "sp28", category: "LING Capstone" },
  { code: "CS 133", term: "sp28", category: "CS Elective" },
];

/** UI-only knowledge from the CWA plan: term stacks that reliably go wrong. */
export const DANGER_PAIRS: { pair: string; why: string }[] = [
  { pair: "MATH 42 + MATH 31", why: "Two math-heavy courses overlapping. If MATH 42 isn't fully closed, Calc II's pace will compound the deficit." },
  { pair: "CS 146 + CS 154", why: "DS&A and Formal Languages are both proof-heavy CS gateway weed-outs. Stacking them is the standard SJSU GPA killer." },
  { pair: "CS 156 + MATH 161A", why: "AI sits on top of probability theory. Taking it the same term as the underlying stats course doubles workload on the same concepts." },
  { pair: "LING 165 before LING 115 or 124", why: "NLP capstone depends on Corpus Linguistics and Speech Tech. Reordering breaks the prerequisite chain." },
  { pair: "Two upper-div Math in summer", why: "Compressed summer terms move at 2× pace. Pairing 161A-tier math with anything quantitative is a forced W." },
  { pair: "LLD 100W + heavy STEM stack", why: "Writing-intensive (4–6 essays + revisions) does not cohabit with two CS cores." },
];

/** One row as the timeline renders it. */
export interface PlanRow {
  code: string;
  name: string;
  units: number;
  category: string;
  status: GradStatus;
  critical: boolean;
  /** Set when reality and the plan disagree — the screen's honesty flags. */
  note?: "taken early" | "not enrolled" | "off-plan" | "moved";
  /** Present when the course exists in the intel registry (opens the sheet). */
  hasIntel: boolean;
}

export interface MergedTerm extends GradTerm {
  rows: PlanRow[];
  totalUnits: number;
  isCurrent: boolean;
}

export interface MergedPlan {
  terms: MergedTerm[];
  currentTermId: string | null;
  unitTotals: { required: number; completed: number; inProgress: number; remaining: number };
  criticalLeft: string[];
  transferredCount: number;
}

export interface GradOverride {
  code: string;
  status: string | null;
  termId: string | null;
}

/** "FA26: CS-146 Sec 08 - Data Struct and Alg" → "CS 146". */
export function normalizeCanvasCode(courseCode: string | null): string | null {
  if (!courseCode) return null;
  const stripped = courseCode.replace(/^[A-Z]{2}\d{2}:\s*/, "");
  const m = stripped.match(/^([A-Z]{2,4}\d?)[\s-]+?(\d{1,3}[A-Z]{0,2})/);
  return m ? `${m[1]} ${m[2]}` : null;
}

export function detectCurrentTermId(now = new Date()): string | null {
  const iso = now.toISOString().slice(0, 10);
  return TERMS.find((t) => iso >= t.start && iso <= t.end)?.id ?? null;
}

/**
 * The merge. Pure — testable against any combination of enrollment and
 * overrides. Order of precedence per course: override > live enrollment >
 * term-position default (past = passed, current = planned-but-not-enrolled,
 * future = planned).
 */
export function mergePlan(
  overrides: GradOverride[],
  canvasCourses: CourseSummary[],
  now = new Date(),
): MergedPlan {
  const currentTermId = detectCurrentTermId(now);
  const currentIdx = TERMS.findIndex((t) => t.id === currentTermId);
  const overrideBy = new Map(overrides.map((o) => [o.code, o]));

  // Live enrollment, as normalized codes (gradeable courses only — the
  // announcement shells would otherwise "enroll" phantom codes).
  const enrolled = new Map<string, CourseSummary>();
  for (const c of canvasCourses) {
    if (!c.gradeable || c.hidden) continue;
    const code = normalizeCanvasCode(c.courseCode);
    if (code) enrolled.set(code, c);
  }

  const termIdx = new Map(TERMS.map((t, i) => [t.id, i]));
  const rowsByTerm = new Map<string, PlanRow[]>(TERMS.map((t) => [t.id, []]));
  const planCodes = new Set(SLOTS.map((s) => s.code));

  for (const slot of SLOTS) {
    const intel = COURSE_INTEL[slot.code];
    const ov = overrideBy.get(slot.code);
    const isEnrolled = enrolled.has(slot.code);

    // Where the course actually sits: override move > "enrolled now, so it
    // is happening now" > the plan's default slot.
    let term = ov?.termId ?? slot.term;
    let note: PlanRow["note"];
    if (!ov?.termId && isEnrolled && currentTermId && slot.term !== currentTermId) {
      term = currentTermId;
      note = "taken early";
    } else if (ov?.termId && ov.termId !== slot.term) {
      note = "moved";
    }

    const idx = termIdx.get(term) ?? 99;
    let status: GradStatus;
    if (ov?.status) {
      status = ov.status as GradStatus;
    } else if (isEnrolled) {
      status = "in_progress";
    } else if (currentIdx !== -1 && idx < currentIdx) {
      status = "passed";
    } else {
      status = "planned";
      if (term === currentTermId) note = note ?? "not enrolled";
    }

    rowsByTerm.get(term)?.push({
      code: slot.code,
      name: intel?.fullName ?? slot.code,
      units: intel?.units ?? 3,
      category: slot.category,
      status,
      critical: intel?.criticalPath ?? false,
      note,
      hasIntel: !!intel,
    });
  }

  // Enrolled courses the plan knows nothing about (off-plan electives).
  if (currentTermId) {
    for (const [code, summary] of enrolled) {
      if (planCodes.has(code)) continue;
      rowsByTerm.get(currentTermId)?.push({
        code,
        name: summary.name ?? code,
        units: 3,
        category: "Off-plan · enrolled",
        status: overrideBy.get(code)?.status as GradStatus | undefined ?? "in_progress",
        critical: false,
        note: "off-plan",
        hasIntel: code in COURSE_INTEL,
      });
    }
  }

  const terms: MergedTerm[] = TERMS.map((t) => {
    const rows = rowsByTerm.get(t.id) ?? [];
    return {
      ...t,
      rows,
      totalUnits: rows
        .filter((r) => r.status !== "dropped" && r.status !== "failed")
        .reduce((s, r) => s + r.units, 0),
      isCurrent: t.id === currentTermId,
    };
  });

  const all = terms.flatMap((t) => t.rows);
  const completed = all.filter((r) => r.status === "passed").reduce((s, r) => s + r.units, 0);
  const inProgress = all.filter((r) => r.status === "in_progress").reduce((s, r) => s + r.units, 0);
  const required = all
    .filter((r) => r.status !== "dropped")
    .reduce((s, r) => s + r.units, 0);

  return {
    terms,
    currentTermId,
    unitTotals: {
      required,
      completed,
      inProgress,
      remaining: Math.max(0, required - completed - inProgress),
    },
    criticalLeft: all
      .filter((r) => r.critical && r.status !== "passed" && r.status !== "in_progress")
      .map((r) => r.code),
    transferredCount: Object.keys(TRANSFERRED_OR_PRIOR).length,
  };
}
