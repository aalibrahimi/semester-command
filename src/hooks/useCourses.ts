/**
 * useCourses — the risk-ranked course dashboard every surface shares.
 *
 * Called by: Sidebar (course list + nav counts), Courses (card grid), and any
 * screen that needs to name a course.
 * Calls: lib/ipc.ts → `course_summaries`; listens for sync completion.
 *
 * One fetch on mount, then refreshes whenever the backend announces a sync
 * transition ("sync:status-changed") — which is exactly when the numbers can
 * change. A 60s interval backstops missed events (e.g. an event fired while
 * the webview was reloading in dev).
 */
import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { courseSummaries, IS_TAURI } from "@/lib/ipc";
import type { Dashboard } from "@/types";

const EMPTY: Dashboard = { courses: [], openTotal: 0, dueThisWeek: 0 };

/** Keep in sync with SYNC_EVENT in src-tauri/src/sync.rs. */
const SYNC_EVENT = "sync:status-changed";

/** DOM event bridging separate useCourses() instances: fire after any local
 *  edit that changes the dashboard (hide/unhide, target change) so the
 *  sidebar updates immediately instead of on its next interval. */
const LOCAL_EVENT = "courses:changed";

export function announceCoursesChanged(): void {
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

export function useCourses() {
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setDashboard(await courseSummaries());
      setLoaded(true);
    } catch {
      // A failed read keeps the last known dashboard; the sync footer is the
      // surface that reports trouble, not this hook.
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- syncing with the Rust engine
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);

    const onLocal = () => void refresh();
    window.addEventListener(LOCAL_EVENT, onLocal);

    let unlisten: (() => void) | undefined;
    if (IS_TAURI) {
      void listen(SYNC_EVENT, () => void refresh()).then((f) => {
        unlisten = f;
      });
    }
    return () => {
      window.clearInterval(id);
      window.removeEventListener(LOCAL_EVENT, onLocal);
      unlisten?.();
    };
  }, [refresh]);

  return {
    ...dashboard,
    /** False until the first successful read — screens show skeletons, not
     *  a flash of the empty state (§9.7). */
    loaded,
    refresh,
  };
}
