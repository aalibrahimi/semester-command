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
  { id: "fa27", label: "Fall 2027", start: "2027-08-18", end: "2027-12-17", isTarget: true, tag: "Primary target" },
  { id: "sp28", label: "Spring 2028", start: "2028-01-19", end: "2028-05-19", isTarget: true, tag: "Fallback target" },
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
  { code: "GE AREA 6", term: "su26", category: "GE · Ethnic Studies (1 of 13)" },
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
  { code: "GE UD 2/5", term: "su27", category: "GE · UD Area 2/5 (1 of 48)" },
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
  { pair: "LING 165 without LING 115/124 background", why: "Not a prerequisite — the audit shows LING 165's enforced prereq is LING 101 (done Fall 2025, B+). But Corpus Linguistics and Speech Tech are the intended preparation: taking NLP cold raises workload, not eligibility." },
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
  note?: "taken early" | "not enrolled" | "off-plan" | "moved" | "registered" | "overdue";
  /** Present when the course exists in the intel registry (opens the sheet). */
  hasIntel: boolean;
  /** The term the plan originally slotted this into (for the overdue strip). */
  plannedTerm: string;
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
  /** Registrar says these are still owed AND their slot is already in the
   *  past — the "needs a new slot" strip. */
  overdue: PlanRow[];
  /** True when a MyProgress report is feeding statuses (vs position guesses). */
  registrarBacked: boolean;
}

export interface GradOverride {
  code: string;
  status: string | null;
  termId: string | null;
}

/** Registrar requirement row, from the imported MyProgress report. */
export interface RequirementStatus {
  title: string;
  status: string; // 'taken' | 'enrolled' | 'error' (MyProgress vocabulary)
}

/** "FA26: CS-146 Sec 08 - Data Struct and Alg" → "CS 146". */
export function normalizeCanvasCode(courseCode: string | null): string | null {
  if (!courseCode) return null;
  const stripped = courseCode.replace(/^[A-Z]{2}\d{2}:\s*/, "");
  const m = stripped.match(/^([A-Z]{2,4}\d?)[\s-]+?(\d{1,3}[A-Z]{0,2})/);
  return m ? `${m[1]} ${m[2]}` : null;
}

/** "FA26: …" belongs to term fa26. Codes without a term prefix (shells,
 *  sandboxes) belong to no term and never count as current enrollment —
 *  this is what stops last fall's LING 101 reading as a current course. */
function canvasTermOf(courseCode: string | null): string | null {
  const m = courseCode?.match(/^([A-Z]{2})(\d{2}):/);
  if (!m) return null;
  const season = m[1] === "FA" ? "fa" : m[1] === "SP" ? "sp" : m[1] === "SU" ? "su" : null;
  return season ? `${season}${m[2]}` : null;
}

/**
 * Registrar requirement title → plan course code. `CSLN <CODE>` rows map
 * directly; GE/AI buckets map to the specific course the plan uses to fill
 * them. This mapping is how "GE: 6 Ethnic Studies — outstanding" becomes
 * "the Ethnic Studies block is still owed" on the timeline.
 */
function courseCodeForRequirement(title: string): string | null {
  const csln = title.match(/^CSLN ([A-Z]+\d?) (\d{1,3}[A-Z]{0,2})$/);
  if (csln) return `${csln[1]} ${csln[2]}`;
  if (/Ethnic Studies/i.test(title)) return "GE AREA 6";
  if (/UD Area 2\/5/i.test(title)) return "GE UD 2/5";
  if (/UD Area 4/i.test(title)) return "BUS3 186";
  if (/AI US1/i.test(title)) return "HIST 15";
  if (/^WID: Computer Science/i.test(title)) return "LLD 100W";
  if (/^CSLN LING UD choice$/i.test(title)) return "LING 113";
  if (/^CSLN LING Upper Division Elective$/i.test(title)) return "LING 122";
  if (/^CSLN CS Upper Division Elective$/i.test(title)) return "CS 157A";
  return null;
}

/**
 * Fold the requirement rows into a per-course verdict. When several rows map
 * to one course (slug + RQ rows), the most in-motion one wins:
 * enrolled > error > taken — an 'enrolled' retake must not be masked by the
 * old attempt's row.
 */
export function registrarStatusByCode(reqs: RequirementStatus[]): Map<string, "taken" | "enrolled" | "error"> {
  const rank = { taken: 0, error: 1, enrolled: 2 } as const;
  const out = new Map<string, "taken" | "enrolled" | "error">();
  for (const r of reqs) {
    const code = courseCodeForRequirement(r.title);
    if (!code) continue;
    const s = r.status as keyof typeof rank;
    if (!(s in rank)) continue;
    const prev = out.get(code);
    if (!prev || rank[s] > rank[prev]) out.set(code, s);
  }
  return out;
}

export function detectCurrentTermId(now = new Date()): string | null {
  const iso = now.toISOString().slice(0, 10);
  return TERMS.find((t) => iso >= t.start && iso <= t.end)?.id ?? null;
}

/**
 * The merge. Pure — testable against any combination of inputs. Status
 * precedence per course, most trustworthy first:
 *
 *   1. user override        (they said so)
 *   2. Canvas enrollment    (published course, this term's prefix only)
 *   3. registrar verdict    (taken → passed, enrolled → registered this
 *                            term even if unpublished on Canvas, error →
 *                            still owed — even when the slot is in the past)
 *   4. term position        (past = assumed passed, future = planned)
 *
 * The registrar layer is what stopped this screen assuming Summer 2026 went
 * to plan when MyProgress says MATH 31 and GE Area 6 are still outstanding.
 */
export function mergePlan(
  overrides: GradOverride[],
  canvasCourses: CourseSummary[],
  requirements: RequirementStatus[],
  now = new Date(),
): MergedPlan {
  const currentTermId = detectCurrentTermId(now);
  const currentIdx = TERMS.findIndex((t) => t.id === currentTermId);
  const overrideBy = new Map(overrides.map((o) => [o.code, o]));
  const registrar = registrarStatusByCode(requirements);
  const registrarBacked = registrar.size > 0;

  // Live enrollment: gradeable, visible, and belonging to the CURRENT term.
  const enrolled = new Map<string, CourseSummary>();
  for (const c of canvasCourses) {
    if (!c.gradeable || c.hidden) continue;
    if (canvasTermOf(c.courseCode) !== currentTermId) continue;
    const code = normalizeCanvasCode(c.courseCode);
    if (code) enrolled.set(code, c);
  }

  const termIdx = new Map(TERMS.map((t, i) => [t.id, i]));
  const rowsByTerm = new Map<string, PlanRow[]>(TERMS.map((t) => [t.id, []]));
  const planCodes = new Set(SLOTS.map((s) => s.code));
  const overdue: PlanRow[] = [];

  for (const slot of SLOTS) {
    const intel = COURSE_INTEL[slot.code];
    const ov = overrideBy.get(slot.code);
    const onCanvas = enrolled.has(slot.code);
    const reg = registrar.get(slot.code);
    // Registrar 'enrolled' means registered for the last-registered term —
    // the current one — whether or not the instructor published on Canvas.
    const isCurrentCourse = onCanvas || reg === "enrolled";

    // Where the course actually sits.
    let term = ov?.termId ?? slot.term;
    let note: PlanRow["note"];
    if (!ov?.termId && isCurrentCourse && currentTermId && slot.term !== currentTermId) {
      term = currentTermId;
      note = "taken early";
    } else if (ov?.termId && ov.termId !== slot.term) {
      note = "moved";
    }
    if (isCurrentCourse && !onCanvas) {
      note = "registered";
    }

    const idx = termIdx.get(term) ?? 99;
    let status: GradStatus;
    if (ov?.status) {
      status = ov.status as GradStatus;
    } else if (isCurrentCourse) {
      status = "in_progress";
    } else if (reg === "taken") {
      status = "passed";
    } else if (reg === "error") {
      // Registrar says still owed — regardless of where the slot sits.
      status = "planned";
      if (currentIdx !== -1 && idx < currentIdx) note = "overdue";
      else if (term === currentTermId) note = "not enrolled";
    } else if (currentIdx !== -1 && idx < currentIdx) {
      status = "passed";
    } else {
      status = "planned";
      if (term === currentTermId) note = note ?? "not enrolled";
    }

    const row: PlanRow = {
      code: slot.code,
      name: intel?.fullName ?? slot.code,
      units: intel?.units ?? 3,
      category: slot.category,
      status,
      critical: intel?.criticalPath ?? false,
      note,
      hasIntel: !!intel,
      plannedTerm: term,
    };
    if (note === "overdue") {
      // Pulled out of the dead slot entirely: an owed course in a finished
      // term is a scheduling problem, not history.
      overdue.push(row);
    } else {
      rowsByTerm.get(term)?.push(row);
    }
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
        status: (overrideBy.get(code)?.status as GradStatus | undefined) ?? "in_progress",
        critical: false,
        note: "off-plan",
        hasIntel: code in COURSE_INTEL,
        plannedTerm: currentTermId,
      });
    }
  }

  const terms: MergedTerm[] = TERMS.map((t) => {
    const rows = rowsByTerm.get(t.id) ?? [];
    return {
      ...t,
      rows,
      // A term's load is what is actually being carried: planned-but-not-
      // enrolled rows in the CURRENT term aren't load, they're a to-decide.
      totalUnits: rows
        .filter((r) => r.status !== "dropped" && r.status !== "failed")
        .filter((r) => !(t.id === currentTermId && r.note === "not enrolled"))
        .reduce((s, r) => s + r.units, 0),
      isCurrent: t.id === currentTermId,
    };
  });

  const all = [...terms.flatMap((t) => t.rows), ...overdue];
  const completed = all.filter((r) => r.status === "passed").reduce((s, r) => s + r.units, 0);
  const inProgress = all.filter((r) => r.status === "in_progress").reduce((s, r) => s + r.units, 0);
  const required = all.filter((r) => r.status !== "dropped").reduce((s, r) => s + r.units, 0);

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
    overdue,
    registrarBacked,
  };
}
