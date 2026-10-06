/**
 * highlights.ts: the store behind highlights and "explain it" attempts.
 *
 * Called by: HighlightLayer (add), HighlightsButton (list, delete, open),
 * ExplainDialog (attempts), GuideBlocks (the definition card's button).
 * Calls: lib/ipc (migration 0019) inside the app; localStorage in a plain
 * browser tab so the views stay usable for screenshots.
 *
 * One snapshot, loaded once, written through on every change, read with
 * useSyncExternalStore (the same pattern as mastery.ts). It also carries
 * which target the explain dialog is open on, so any part of the app can
 * open it: the header panel, a definition card, the selection toolbar.
 */
import { createContext, useSyncExternalStore } from "react";
import * as ipc from "@/lib/ipc";
import type { ExplainRecord, HighlightRecord } from "@/lib/ipc";

/** What the explain dialog is about. */
export interface ExplainTarget {
  /** "h:<id>" or "d:<block id>". */
  target: string;
  guideId: string;
  sectionId: string;
  blockId: string;
  /** Shown as the dialog's title: the term, or a short quote. */
  title: string;
  /** The text the reader is explaining (definition body or highlight). */
  text: string;
  /** Wider context for Claude (the whole block). */
  context: string;
  keys: string[];
}

interface State {
  loaded: boolean;
  highlights: HighlightRecord[];
  attempts: ExplainRecord[];
  open: ExplainTarget | null;
}

let state: State = { loaded: false, highlights: [], attempts: [], open: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (s: Partial<State>) => {
  state = { ...state, ...s };
  emit();
};

const LOCAL = "sc.study.highlights.v1";
function readLocal(): Pick<State, "highlights" | "attempts"> {
  try {
    const raw = localStorage.getItem(LOCAL);
    if (raw) return JSON.parse(raw);
  } catch {
    /* private mode or bad JSON: start empty */
  }
  return { highlights: [], attempts: [] };
}
function writeLocal() {
  try {
    localStorage.setItem(LOCAL, JSON.stringify({ highlights: state.highlights, attempts: state.attempts }));
  } catch {
    /* fine: this is only the browser fallback */
  }
}

let loading: Promise<void> | null = null;
function load() {
  if (loading) return loading;
  loading = (async () => {
    if (ipc.IS_TAURI) {
      const [highlights, attempts] = await Promise.all([ipc.highlightsAll(), ipc.explainsAll()]).catch(() => [[], []] as [HighlightRecord[], ExplainRecord[]]);
      set({ loaded: true, highlights, attempts });
    } else {
      set({ loaded: true, ...readLocal() });
    }
  })();
  return loading;
}

function subscribe(l: () => void) {
  listeners.add(l);
  void load();
  return () => listeners.delete(l);
}

export function useHighlights() {
  return useSyncExternalStore(subscribe, () => state);
}

export const parseKeys = (s: string): string[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export async function addHighlight(h: Omit<HighlightRecord, "id" | "createdAt">): Promise<HighlightRecord> {
  await load();
  // the same text in the same block twice is one highlight
  const dup = state.highlights.find((x) => x.blockId === h.blockId && x.text === h.text);
  if (dup) return dup;
  const draft: HighlightRecord = { ...h, createdAt: new Date().toISOString() };
  const row = ipc.IS_TAURI ? await ipc.highlightAdd(draft) : { ...draft, id: Date.now() };
  set({ highlights: [row, ...state.highlights] });
  if (!ipc.IS_TAURI) writeLocal();
  return row;
}

export async function deleteHighlight(id: number) {
  if (ipc.IS_TAURI) await ipc.highlightDelete(id);
  set({
    highlights: state.highlights.filter((h) => h.id !== id),
    attempts: state.attempts.filter((a) => a.target !== `h:${id}`),
  });
  if (!ipc.IS_TAURI) writeLocal();
}

export async function recordAttempt(a: Omit<ExplainRecord, "id" | "at">): Promise<ExplainRecord> {
  const draft: ExplainRecord = { ...a, at: new Date().toISOString() };
  const row = ipc.IS_TAURI ? await ipc.explainRecord(draft) : { ...draft, id: Date.now() };
  set({ attempts: [row, ...state.attempts] });
  if (!ipc.IS_TAURI) writeLocal();
  return row;
}

export async function attachAi(attempt: ExplainRecord, ai: string) {
  const row = { ...attempt, ai };
  if (ipc.IS_TAURI) await ipc.explainRecord(row);
  set({ attempts: state.attempts.map((a) => (a.id === attempt.id ? row : a)) });
  if (!ipc.IS_TAURI) writeLocal();
}

/** Attempts on one target, newest first. */
export function attemptsFor(s: State, target: string): ExplainRecord[] {
  return s.attempts.filter((a) => a.target === target);
}

export function openExplain(t: ExplainTarget) {
  set({ open: t });
}
export function closeExplain() {
  set({ open: null });
}

/** The explain target for a stored highlight. */
export function targetOfHighlight(h: HighlightRecord): ExplainTarget {
  const quote = h.text.length > 60 ? h.text.slice(0, 57).trimEnd() + "…" : h.text;
  return {
    target: `h:${h.id}`,
    guideId: h.guideId,
    sectionId: h.sectionId,
    blockId: h.blockId,
    title: `“${quote}”`,
    text: h.text,
    context: h.context,
    keys: parseKeys(h.keys),
  };
}

/** Which chapter section is on screen, for blocks that need it (the definition card's Explain button). */
export const ReadingContext = createContext<{ guideId: string; sectionId: string } | null>(null);
