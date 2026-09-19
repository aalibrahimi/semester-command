/**
 * useSync — the sync status every screen reads and no screen owns.
 *
 * Called by: Sidebar (footer), and later the tray/toast surfaces.
 * Calls: lib/ipc.ts → `get_sync_status`.
 *
 * Subscribes to the engine's "sync:status-changed" event (same channel
 * useCourses listens on) and re-reads on every transition, with a slow poll
 * as the safety net for anything the event misses (e.g. a status written
 * before this hook mounted, or outside Tauri where events don't exist).
 */
import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getSyncStatus, IS_TAURI } from "@/lib/ipc";
import type { SyncStatus } from "@/types";

/** Safety-net poll cadence. The event is the primary signal; this only
 *  catches missed transitions, so it can be lazy. */
const POLL_MS = 60_000;

const INITIAL: SyncStatus = {
  phase: "idle",
  lastSyncedAt: null,
  message: null,
  authMode: "none",
};

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>(INITIAL);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getSyncStatus());
    } catch {
      // A failed status read is not itself a sync failure, and surfacing it as
      // one would make the footer cry wolf. Keep the last known status.
    }
  }, []);

  useEffect(() => {
    // The linter flags setState inside an effect, and is usually right. Here the
    // effect *is* the synchronisation with an external system — the sync engine
    // running in Rust — and there is no render-time derivation that could
    // produce this value instead. The immediate call is what stops the footer
    // showing "synced never" on launch; the event does the live updates.
    // oxlint-disable-next-line set-state-in-effect
    void refresh();
    const unlisten = IS_TAURI
      ? listen("sync:status-changed", () => void refresh())
      : null;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      window.clearInterval(id);
      void unlisten?.then((f) => f());
    };
  }, [refresh]);

  return {
    status,
    refresh,
    /** Broken out because it is the one status the whole UI reacts to: it means
     *  every grade on screen is stale and must be marked as such (§2.0). */
    isReconnectRequired: status.phase === "reconnectRequired",
  };
}
