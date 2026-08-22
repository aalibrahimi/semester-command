/**
 * gradeFloors — the bridge between the grade engine and the degree.
 *
 * Called by: CourseDetail, Courses, Triage (anywhere a GradeGapBar renders).
 * Calls: lib/gradData (minimum-grade registry), lib/gradPlan (code
 * normalisation).
 *
 * The registrar requires a minimum grade for a course to COUNT toward the
 * degree (C- for the major, a strict C for WID). The grade engine knows your
 * percentages. Without this file, "on track for the class" and "about to not
 * count for the degree" were computable at the same time and nobody said so.
 *
 * §10 note: no percentage is computed here. The floor is a static threshold
 * from the plan registry; comparing a Rust-computed grade against it is the
 * same class of presentation logic as the target marker on the gap bar.
 */
import { COURSE_INTEL } from "@/lib/gradData";
import { normalizeCanvasCode } from "@/lib/gradPlan";

export interface GradeFloor {
  /** Minimum passing percentage for degree credit, from the default scale. */
  pct: number;
  /** The letter the requirement names, e.g. "C-". */
  letter: string;
  /** 'standard' | 'wid' | 'strict' — drives how loudly the UI warns. */
  severity: string;
  /** Why the floor exists, when the registry says. */
  note?: string;
}

/** Letter → cutoff, matching DEFAULT_SCALE in grades.rs. */
const LETTER_PCT: Record<string, number> = {
  "C-": 70,
  C: 73,
  "B-": 80,
  B: 83,
};

/** The degree floor for a live Canvas course, or null when the course isn't
 *  in the plan registry (off-plan electives have no floor we know of). */
export function floorForCanvasCourse(courseCode: string | null): GradeFloor | null {
  const code = normalizeCanvasCode(courseCode);
  if (!code) return null;
  const intel = COURSE_INTEL[code];
  if (!intel) return null;
  const pct = LETTER_PCT[intel.minGrade.value];
  if (pct === undefined) return null;
  return {
    pct,
    letter: intel.minGrade.value,
    severity: intel.minGrade.severity,
    note: intel.minGrade.note,
  };
}
