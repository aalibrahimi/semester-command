/**
 * loadGuides: where the Study views get guides from.
 *
 * Two sizes of guide, loaded two ways:
 *
 *   summaries  id, title, section headings, counts (GuideSummary). Always in
 *              memory: the bundled guideIndex.json (a few KB), merged with
 *              any newer summaries from the Railway content cache. Chapter
 *              lists, progress bars and the study plan use these.
 *   guides     the full JSON with every block. Loaded only when a chapter is
 *              opened (useGuide / useGuides / loadGuide), then kept in memory.
 *
 * Where a full guide comes from:
 *   1. the content cache (src-tauri/src/content.rs), which pulls guides from
 *      Railway Postgres on launch (scripts/content-sync.ts pushes them), and
 *   2. the copy bundled with the app, split into one chunk per guide so it
 *      costs nothing until opened. It is the offline and first-run fallback.
 *
 * Which wins when both exist and differ: in a dev build (npm run tauri dev)
 * the bundled file, because that is the one you are editing; in a release
 * build the cache, because that is how new chapters reach an installed app
 * without a rebuild. Same hash = same guide, either source.
 *
 * Called by: the Study views, Today, the course page.
 * Calls: ipc content_* commands; nothing else.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { CONTENT_EVENT, IS_TAURI, contentGuide, contentManifest } from "@/lib/ipc";
import type { Guide } from "./guide";
import bundledIndex from "./guideIndex.json";
import { summarize, type GuideSummary } from "./guideSummary";

export type { GuideSummary } from "./guideSummary";

const PREFER_BUNDLED = import.meta.env.DEV;

/** One lazy chunk per bundled guide. */
const chunks = import.meta.glob<{ default: Guide }>("./guides/*.json");
const chunkFor = new Map<string, () => Promise<{ default: Guide }>>();
for (const [path, load] of Object.entries(chunks)) {
  const file = path.split("/").pop()!.replace(/\.json$/, "");
  chunkFor.set(file.replace("--", "/"), load);
}

/** Full guides already loaded, with the hash they were loaded at. */
const full = new Map<string, { guide: Guide; sha: string }>();
const inflight = new Map<string, Promise<Guide | undefined>>();

/* ── Summaries ─────────────────────────────────────────────────────────── */

interface CachedEntry {
  summary: GuideSummary;
  position: number;
}

const bundled = new Map<string, GuideSummary>((bundledIndex as GuideSummary[]).map((s) => [s.id, s]));
let cached = new Map<string, CachedEntry>();
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  for (const l of listeners) l();
}

/** The summary this build should show for an id (see "which wins" above). */
function pick(id: string): GuideSummary | undefined {
  const b = bundled.get(id);
  const c = cached.get(id)?.summary;
  if (!b) return c;
  if (!c) return b;
  return PREFER_BUNDLED ? b : c;
}

export function guideSummary(id: string | undefined): GuideSummary | undefined {
  return id ? pick(id) : undefined;
}

/**
 * Summaries for one course: the chapters courses.ts lists, in that order,
 * then any chapter the content cache has for the course that this build
 * doesn't list yet (a chapter pushed to Railway after the app was built).
 */
export function summariesForCourse(course: string, order: string[]): GuideSummary[] {
  // Memoized per cache version, so callers get a stable array to use as an
  // effect dependency.
  const key = `${version}|${course}|${order.join(",")}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const out = computeCourse(course, order);
  if (memo.size > 64) memo.clear();
  memo.set(key, out);
  return out;
}

const memo = new Map<string, GuideSummary[]>();

function computeCourse(course: string, order: string[]): GuideSummary[] {
  const listed = order.map((slug) => pick(`${course}/${slug}`)).filter((g): g is GuideSummary => !!g);
  const seen = new Set(listed.map((g) => g.id));
  const extra = [...cached.values()]
    .filter((e) => e.summary.course === course && !seen.has(e.summary.id))
    .sort((a, b) => a.position - b.position)
    .map((e) => e.summary);
  return [...listed, ...extra];
}

/** Re-render when the content cache changes (a sync pulled new chapters). */
export function useGuideIndexVersion(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
}

async function refreshManifest() {
  try {
    const rows = await contentManifest();
    const next = new Map<string, CachedEntry>();
    for (const r of rows) {
      try {
        next.set(r.id, { summary: { ...(JSON.parse(r.summary) as GuideSummary), sha: r.sha }, position: r.position });
      } catch {
        /* a malformed row is skipped, the bundled copy still works */
      }
    }
    cached = next;
    // Full guides whose hash changed must be fetched again.
    for (const [id, g] of full) if (pick(id)?.sha !== g.sha) full.delete(id);
    emit();
  } catch {
    /* no cache yet: bundled summaries only */
  }
}

if (IS_TAURI) {
  void refreshManifest();
  void import("@tauri-apps/api/event").then(({ listen }) => listen(CONTENT_EVENT, () => void refreshManifest()));
}

/* ── Full guides ───────────────────────────────────────────────────────── */


async function fetchGuide(id: string): Promise<Guide | undefined> {
  const want = pick(id);
  const fromCache = cached.has(id) && (!bundled.has(id) || !PREFER_BUNDLED || !chunkFor.has(id));
  if (fromCache) {
    try {
      const text = await contentGuide(id);
      if (text) {
        const g = JSON.parse(text) as Guide;
        full.set(id, { guide: g, sha: cached.get(id)!.summary.sha });
        return g;
      }
    } catch {
      /* fall back to the bundled copy */
    }
  }
  const load = chunkFor.get(id);
  if (!load) return undefined;
  const g = (await load()).default;
  full.set(id, { guide: g, sha: bundled.get(id)?.sha ?? want?.sha ?? "" });
  return g;
}

/** The full guide, from memory, the content cache, or the bundled chunk. */
export function loadGuide(id: string): Promise<Guide | undefined> {
  const have = full.get(id);
  if (have) return Promise.resolve(have.guide);
  let p = inflight.get(id);
  if (!p) {
    p = fetchGuide(id).finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

/** The full guide if it is already loaded; undefined otherwise. */
export function peekGuide(id: string | undefined): Guide | undefined {
  return id ? full.get(id)?.guide : undefined;
}

/** A guide that arrived from the cache without a stored summary. */
export function summaryOf(g: Guide): GuideSummary {
  return pick(g.id) ?? summarize(g, "");
}

/**
 * Load one guide for a view. `guide` is undefined while loading and when the
 * id names no guide; `loading` tells the two apart.
 */
export function useGuide(id: string | undefined): { guide: Guide | undefined; loading: boolean } {
  const v = useGuideIndexVersion();
  const [, arrived] = useState(0);
  const [missing, setMissing] = useState<string | undefined>();
  useEffect(() => {
    if (!id || peekGuide(id)) return;
    let alive = true;
    void loadGuide(id).then((g) => {
      if (!alive) return;
      if (g) arrived((n) => n + 1);
      else setMissing(id);
    });
    return () => {
      alive = false;
    };
  }, [id, v]);
  if (!id) return { guide: undefined, loading: false };
  const guide = peekGuide(id);
  return { guide, loading: !guide && missing !== id };
}

const NONE: Guide[] = [];

/** Load several guides (a whole course, for Recall and the mock exam). */
export function useGuides(ids: string[]): { guides: Guide[]; loading: boolean } {
  const v = useGuideIndexVersion();
  const key = ids.join("|");
  const [state, setState] = useState<{ key: string; guides: Guide[]; done: boolean }>({ key: "", guides: NONE, done: false });
  useEffect(() => {
    let alive = true;
    const list = key ? key.split("|") : [];
    void Promise.all(list.map(loadGuide)).then((gs) => {
      if (alive) setState({ key, guides: gs.filter((g): g is Guide => !!g), done: true });
    });
    return () => {
      alive = false;
    };
  }, [key, v]);
  if (state.key !== key) return { guides: NONE, loading: true };
  return { guides: state.guides, loading: !state.done };
}

/** Warm the in-memory cache ahead of a click (hover on a chapter link). */
export function prefetchGuide(id: string): void {
  void loadGuide(id);
}
