/**
 * useSync — the sync status every screen reads and no screen owns.
 *
 * Called by: Sidebar (footer), and later the tray/toast surfaces.
 * Calls: lib/ipc.ts → `get_sync_status`.
 *
 * Polls rather than subscribes, for now. A Tauri event channel is the right
 * long-term shape and lands with the sync engine in M1; a 5-second poll of a
 * single SQLite row costs nothing and keeps M0 free of an event contract we
 * would only have to redesign once the engine exists.
 *
 * TODO(M1): replace the interval with a `sync://status` Tauri event and expose
 * `triggerSync()` here.
 */
import { useCallback, useEffect, useState } from "react";
import { getSyncStatus } from "@/lib/ipc";
import type { SyncStatus } from "@/types";

/** How often the footer re-reads status. Unrelated to the 30-minute Canvas
 *  poll interval in §6 — this only watches a local row. */
const POLL_MS = 5_000;

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
    // running in Rust — and there is no render-time derivation or event that
    // could produce this value instead. The immediate call before the interval
    // is what stops the footer showing "synced never" for the first five
    // seconds of every launch.
    // oxlint-disable-next-line set-state-in-effect
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return {
    status,
    refresh,
    /** Broken out because it is the one status the whole UI reacts to: it means
     *  every grade on screen is stale and must be marked as such (§2.0). */
    isReconnectRequired: status.phase === "reconnectRequired",
  };
}
