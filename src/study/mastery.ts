/**
 * mastery.ts — the one store of what the reader knows, per guide.
 *
 * Called by: Read, Cheat sheet, Recall and Map views (via `useMastery`), and
 * the Study index for progress.
 * Calls: lib/ipc.ts → `study_mastery`, `set_study_section`,
 * `save_study_scratch`, `record_study_review` (migration 0010).
 *
 * Shape: one in-memory snapshot per guide, loaded once from SQLite, then
 * written through on every change. Consumers subscribe with
 * useSyncExternalStore, so a "Knew it" in the Read view's right rail moves
 * the Map node's colour in the same tick, no reload — the same event
 * pattern lib/localPrefs.ts uses.
 *
 * Outside Tauri (bare `vite dev`), the store falls back to localStorage so
 * the views stay usable for pixel work; nothing else changes.
 */
import { useSyncExternalStore } from "react";
import * as ipc from "@/lib/ipc";

export type SectionStatus = "unread" | "shaky" | "mastered";

export interface SectionRecord {
  guideId: string;
  sectionId: string;
  status: SectionStatus;
  scratch: string | null;
  updatedAt: string;
}

/** SM-2 state for one check block or generated card. */
export interface ReviewRecord {
  guideId: string;
  /** Block id, plus a card suffix for generated cards: "strings.3#tb". */
  itemId: string;
  lastSeen: string | null;
  misses: number;
  /** RFC3339; null = due now. */
  nextDue: string | null;
  ease: number;
  intervalDays: number;
  reps: number;
}

/** One answer to a generated drill (migration 0014). */
export interface AttemptRecord {
  id?: number | null;
  guideId: string;
  sectionId: string;
  /** `${sectionRef}!${slug}` from study/drill.ts. */
  drillId: string;
  seed: number;
  correct: boolean;
  input: string | null;
  expected: string | null;
  diagnosis: string | null;
  ms: number | null;
  at: string;
  /** Where it happened: the panel under a section, focus mode, or a mock exam. */
  source: "read" | "focus" | "exam";
}

/** One mock exam's result (migration 0015). */
export interface ExamRecord {
  id?: number | null;
  course: string;
  startedAt: string;
  finishedAt: string | null;
  total: number;
  correct: number;
  seconds: number;
  /** JSON of ExamBreakdown[] (study/exam.ts). */
  breakdown: string;
}

export interface GuideMastery {
  guideId: string;
  sections: Record<string, SectionRecord>;
  reviews: Record<string, ReviewRecord>;
  /** Oldest first. */
  attempts: AttemptRecord[];
  loaded: boolean;
}

/* ── Store ─────────────────────────────────────────────────────────────── */

const EVENT = "study:mastery-changed";
const cache = new Map<string, GuideMastery>();
const loading = new Set<string>();

function empty(guideId: string): GuideMastery {
  return { guideId, sections: {}, reviews: {}, attempts: [], loaded: false };
}

function snapshot(guideId: string): GuideMastery {
  let m = cache.get(guideId);
  if (!m) {
    m = ipc.IS_TAURI ? empty(guideId) : { ...readLocal(guideId), loaded: true };
    cache.set(guideId, m);
  }
  return m;
}

function commit(next: GuideMastery) {
  cache.set(next.guideId, next);
  if (!ipc.IS_TAURI) writeLocal(next);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next.guideId }));
}

async function ensureLoaded(guideId: string) {
  if (!ipc.IS_TAURI || cache.get(guideId)?.loaded || loading.has(guideId)) return;
  loading.add(guideId);
  try {
    const m = await ipc.studyMastery(guideId);
    const sections: Record<string, SectionRecord> = {};
    for (const s of m.sections) sections[s.sectionId] = s;
    const reviews: Record<string, ReviewRecord> = {};
    for (const r of m.reviews) reviews[r.itemId] = r;
    commit({ guideId, sections, reviews, attempts: m.attempts ?? [], loaded: true });
  } finally {
    loading.delete(guideId);
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** Live view of one guide's mastery. Loads on first use. */
export function useMastery(guideId: string): GuideMastery {
  const m = useSyncExternalStore(subscribe, () => snapshot(guideId));
  if (!m.loaded && guideId) void ensureLoaded(guideId);
  return m;
}

/* ── Reads ─────────────────────────────────────────────────────────────── */

export function sectionStatus(m: GuideMastery, sectionId: string): SectionStatus {
  return m.sections[sectionId]?.status ?? "unread";
}

export function review(m: GuideMastery, itemId: string): ReviewRecord | undefined {
  return m.reviews[itemId];
}

export function isDue(r: ReviewRecord | undefined, now = new Date()): boolean {
  return !r || !r.nextDue || new Date(r.nextDue) <= now;
}

export interface DrillStats {
  tries: number;
  correct: number;
  /** Consecutive correct answers ending at the latest attempt. */
  streak: number;
  /** The latest miss's diagnosis, if the last attempt was a miss. */
  lastMiss: AttemptRecord | null;
}

/** Attempts for one drill, or for a whole section when `drillId` is omitted. */
export function drillStats(m: GuideMastery, sectionId: string, drillId?: string): DrillStats {
  const xs = m.attempts.filter((a) => a.sectionId === sectionId && (!drillId || a.drillId === drillId));
  let streak = 0;
  for (let i = xs.length - 1; i >= 0 && xs[i].correct; i--) streak++;
  const last = xs[xs.length - 1];
  return {
    tries: xs.length,
    correct: xs.filter((a) => a.correct).length,
    streak,
    lastMiss: last && !last.correct ? last : null,
  };
}

/* ── Writes (write-through) ────────────────────────────────────────────── */

export async function setSectionStatus(guideId: string, sectionId: string, status: SectionStatus): Promise<void> {
  const m = snapshot(guideId);
  const prev = m.sections[sectionId];
  const row: SectionRecord = ipc.IS_TAURI
    ? await ipc.setStudySection(guideId, sectionId, status)
    : { guideId, sectionId, status, scratch: prev?.scratch ?? null, updatedAt: new Date().toISOString() };
  commit({ ...m, sections: { ...m.sections, [sectionId]: row } });
}

export async function saveScratch(guideId: string, sectionId: string, scratch: string): Promise<void> {
  const m = snapshot(guideId);
  const prev = m.sections[sectionId];
  const value = scratch.trim() === "" ? null : scratch;
  const row: SectionRecord = ipc.IS_TAURI
    ? await ipc.saveStudyScratch(guideId, sectionId, value)
    : { guideId, sectionId, status: prev?.status ?? "unread", scratch: value, updatedAt: new Date().toISOString() };
  commit({ ...m, sections: { ...m.sections, [sectionId]: row } });
}

/**
 * SM-2, the plain version, with Anki-style first steps for a card that has
 * no successful repetition yet. grade: 0 Again · 1 Hard · 2 Good · 3 Easy.
 * "Missed" in the Read view is grade 0, "Knew it" is grade 2.
 * Intervals are in days; sub-day steps are fractions (1 min = 1/1440).
 */
const MIN = 1 / 1440;
export function nextReview(prev: ReviewRecord | undefined, guideId: string, itemId: string, grade: 0 | 1 | 2 | 3, now = new Date()): ReviewRecord {
  const r: ReviewRecord = prev ?? { guideId, itemId, lastSeen: null, misses: 0, nextDue: null, ease: 2.5, intervalDays: 0, reps: 0 };
  let { ease, intervalDays, reps, misses } = r;
  if (grade === 0) {
    misses += 1;
    reps = 0;
    intervalDays = 1 * MIN; // back in the queue almost at once
    ease = Math.max(1.3, ease - 0.2);
  } else if (reps === 0) {
    // Learning steps: Hard 10 min, Good 1 day, Easy 4 days.
    intervalDays = grade === 1 ? 10 * MIN : grade === 2 ? 1 : 4;
    if (grade !== 1) reps = 1;
    if (grade === 3) ease = Math.min(3.0, ease + 0.15);
  } else {
    // SM-2 quality q ∈ {3,4,5} for Hard/Good/Easy.
    const q = grade + 2;
    intervalDays = reps === 1 ? 6 : Math.round(intervalDays * ease);
    if (grade === 1) intervalDays = Math.max(1, Math.round(intervalDays * 0.5));
    if (grade === 3) intervalDays = Math.round(intervalDays * 1.3);
    reps += 1;
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  const due = new Date(now.getTime() + intervalDays * 86_400_000);
  return { guideId, itemId, lastSeen: now.toISOString(), misses, nextDue: due.toISOString(), ease: Number(ease.toFixed(3)), intervalDays, reps };
}

/** The interval each grade would give — for the labels on the four buttons. */
export function previewIntervals(prev: ReviewRecord | undefined, guideId: string, itemId: string): Record<0 | 1 | 2 | 3, number> {
  const at = (g: 0 | 1 | 2 | 3) => nextReview(prev, guideId, itemId, g).intervalDays;
  return { 0: at(0), 1: at(1), 2: at(2), 3: at(3) };
}

export async function recordReview(guideId: string, itemId: string, grade: 0 | 1 | 2 | 3): Promise<ReviewRecord> {
  const m = snapshot(guideId);
  const next = nextReview(m.reviews[itemId], guideId, itemId, grade);
  const row = ipc.IS_TAURI ? await ipc.recordStudyReview(next) : next;
  commit({ ...m, reviews: { ...m.reviews, [itemId]: row } });
  return row;
}

export async function recordAttempt(a: Omit<AttemptRecord, "at" | "id" | "source"> & { source?: AttemptRecord["source"] }): Promise<AttemptRecord> {
  const m = snapshot(a.guideId);
  const draft: AttemptRecord = { ...a, source: a.source ?? "read", at: new Date().toISOString() };
  const row = ipc.IS_TAURI ? await ipc.recordStudyAttempt(draft) : { ...draft, id: m.attempts.length + 1 };
  commit({ ...m, attempts: [...m.attempts, row] });
  return row;
}

const LOCAL_EXAMS = "sc.study.exams";
export async function recordExam(e: Omit<ExamRecord, "id">): Promise<ExamRecord> {
  if (ipc.IS_TAURI) return ipc.recordStudyExam(e);
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_EXAMS) ?? "[]") as ExamRecord[];
    const row = { ...e, id: all.length + 1 };
    localStorage.setItem(LOCAL_EXAMS, JSON.stringify([row, ...all]));
    return row;
  } catch {
    return { ...e, id: null };
  }
}
export async function examsRecent(course?: string): Promise<ExamRecord[]> {
  if (ipc.IS_TAURI) return ipc.studyExamsRecent(course);
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_EXAMS) ?? "[]") as ExamRecord[];
    return course ? all.filter((x) => x.course === course) : all;
  } catch {
    return [];
  }
}

/* ── Browser fallback (vite dev only) ──────────────────────────────────── */

const LOCAL_KEY = (g: string) => `sc.study.mastery.${g}`;
function readLocal(guideId: string): GuideMastery {
  try {
    const raw = localStorage.getItem(LOCAL_KEY(guideId));
    if (!raw) return empty(guideId);
    const m = JSON.parse(raw) as GuideMastery;
    return { ...m, attempts: m.attempts ?? [] };
  } catch {
    return empty(guideId);
  }
}
function writeLocal(m: GuideMastery) {
  try {
    localStorage.setItem(LOCAL_KEY(m.guideId), JSON.stringify(m));
  } catch {
    /* fine */
  }
}
