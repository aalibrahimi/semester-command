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

export interface GuideMastery {
  guideId: string;
  sections: Record<string, SectionRecord>;
  reviews: Record<string, ReviewRecord>;
  loaded: boolean;
}

/* ── Store ─────────────────────────────────────────────────────────────── */

const EVENT = "study:mastery-changed";
const cache = new Map<string, GuideMastery>();
const loading = new Set<string>();

function empty(guideId: string): GuideMastery {
  return { guideId, sections: {}, reviews: {}, loaded: false };
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
    commit({ guideId, sections, reviews, loaded: true });
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
 * SM-2, the plain version. grade: 0 Again · 1 Hard · 2 Good · 3 Easy.
 * "Missed" in the Read view is grade 0, "Knew it" is grade 2.
 */
export function nextReview(prev: ReviewRecord | undefined, guideId: string, itemId: string, grade: 0 | 1 | 2 | 3, now = new Date()): ReviewRecord {
  const r: ReviewRecord = prev ?? { guideId, itemId, lastSeen: null, misses: 0, nextDue: null, ease: 2.5, intervalDays: 0, reps: 0 };
  let { ease, intervalDays, reps, misses } = r;
  if (grade === 0) {
    misses += 1;
    reps = 0;
    intervalDays = 0; // back in today's queue
    ease = Math.max(1.3, ease - 0.2);
  } else {
    // SM-2 quality q ∈ {3,4,5} for Hard/Good/Easy.
    const q = grade + 2;
    if (reps === 0) intervalDays = 1;
    else if (reps === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    if (grade === 1) intervalDays = Math.max(1, Math.round(intervalDays * 0.5));
    if (grade === 3) intervalDays = Math.round(intervalDays * 1.3);
    reps += 1;
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  const due = new Date(now);
  if (intervalDays === 0) due.setMinutes(due.getMinutes() + 10);
  else due.setDate(due.getDate() + intervalDays);
  return { guideId, itemId, lastSeen: now.toISOString(), misses, nextDue: due.toISOString(), ease: Number(ease.toFixed(3)), intervalDays, reps };
}

/** The interval each grade would give — for the labels on the four buttons. */
export function previewIntervals(prev: ReviewRecord | undefined, guideId: string, itemId: string): Record<0 | 1 | 2 | 3, number> {
  return { 0: 0, 1: nextReview(prev, guideId, itemId, 1).intervalDays, 2: nextReview(prev, guideId, itemId, 2).intervalDays, 3: nextReview(prev, guideId, itemId, 3).intervalDays };
}

export async function recordReview(guideId: string, itemId: string, grade: 0 | 1 | 2 | 3): Promise<ReviewRecord> {
  const m = snapshot(guideId);
  const next = nextReview(m.reviews[itemId], guideId, itemId, grade);
  const row = ipc.IS_TAURI ? await ipc.recordStudyReview(next) : next;
  commit({ ...m, reviews: { ...m.reviews, [itemId]: row } });
  return row;
}

/* ── Browser fallback (vite dev only) ──────────────────────────────────── */

const LOCAL_KEY = (g: string) => `sc.study.mastery.${g}`;
function readLocal(guideId: string): GuideMastery {
  try {
    const raw = localStorage.getItem(LOCAL_KEY(guideId));
    return raw ? (JSON.parse(raw) as GuideMastery) : empty(guideId);
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
