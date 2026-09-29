/**
 * canvasHealth: one reading of "is my Canvas data current?", shared by the
 * header pill and the sidebar footer so they can never disagree.
 *
 * Called by: components/layout/CanvasStatus.tsx, Sidebar.tsx.
 * Calls: nothing. Pure, so it is unit tested.
 *
 * The point is to warn BEFORE data goes stale: a failed run or an expired
 * sign-in shows up at once, and a run that silently stopped happening
 * (automatic syncs every 30 minutes, none for over two hours) shows as
 * stale even when nothing reported an error.
 */
import type { SyncStatus } from "@/types";
import { sinceSync } from "./format";

export type HealthTone = "ok" | "busy" | "warn" | "bad" | "off";
export type HealthAction = "reconnect" | "retry" | "sync" | "connect" | null;

export interface CanvasHealth {
  tone: HealthTone;
  /** Short, for the pill and the footer. */
  label: string;
  /** One or two plain sentences for the popover. */
  detail: string;
  action: HealthAction;
}

/** Past this, "synced Xh ago" turns into a warning. */
export const STALE_AFTER_MIN = 120;

export function canvasHealth(s: SyncStatus, now: Date = new Date()): CanvasHealth {
  const every = s.intervalMinutes ?? 30;
  const ago = sinceSync(s.lastSyncedAt, now);

  if (s.authMode === "none") {
    return { tone: "off", label: "Canvas not connected", detail: "Sign in to Canvas in Settings so grades, assignments and due dates stay current on their own.", action: "connect" };
  }
  if (s.authMode === "ics") {
    return { tone: "off", label: "Calendar feed only", detail: "Due dates come from your Canvas calendar feed. Grades need a Canvas sign-in (Settings).", action: "connect" };
  }
  if (s.phase === "syncing") {
    return { tone: "busy", label: "Syncing Canvas…", detail: "Pulling courses, assignments and grades now.", action: null };
  }
  if (s.phase === "reconnectRequired") {
    return {
      tone: "bad",
      label: "Canvas: needs sign-in",
      detail: `Your Canvas sign-in expired, so nothing has updated since ${ago === "never" ? "you connected" : ago}. Grades and due dates on screen may be out of date.`,
      action: "reconnect",
    };
  }
  if (s.phase === "error") {
    return {
      tone: "warn",
      label: "Canvas: last sync failed",
      detail: `${s.message ?? "The last sync didn't finish."} Last good sync: ${ago}.`,
      action: "retry",
    };
  }
  if (!s.lastSyncedAt) {
    return { tone: "warn", label: "Canvas: not synced yet", detail: "Signed in, but no sync has finished yet.", action: "sync" };
  }
  const mins = (now.getTime() - new Date(s.lastSyncedAt).getTime()) / 60_000;
  if (mins > STALE_AFTER_MIN) {
    return {
      tone: "warn",
      label: `Canvas: synced ${ago}`,
      detail: `Automatic syncs run every ${every} minutes while the app is open, and none has finished in ${ago.replace(" ago", "")}. Sync now to catch up.`,
      action: "sync",
    };
  }
  const next = Math.max(1, Math.round(every - (mins % every)));
  return {
    tone: "ok",
    label: `Canvas · ${ago}`,
    detail: `Up to date. The next automatic sync is in about ${next} minute${next === 1 ? "" : "s"}.`,
    action: null,
  };
}
