import { describe, expect, it } from "vitest";
import type { SyncStatus } from "@/types";
import { canvasHealth } from "./canvasHealth";

const NOW = new Date("2026-09-29T12:00:00");
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const base: SyncStatus = { phase: "idle", lastSyncedAt: minsAgo(5), message: null, authMode: "session", intervalMinutes: 30 };

describe("canvasHealth", () => {
  it("fresh data is ok and says when the next sync is", () => {
    const h = canvasHealth(base, NOW);
    expect(h).toMatchObject({ tone: "ok", label: "Canvas · 5m ago", action: null });
    expect(h.detail).toContain("25 minutes");
  });
  it("an expired sign-in beats everything but an active sync", () => {
    expect(canvasHealth({ ...base, phase: "reconnectRequired" }, NOW)).toMatchObject({ tone: "bad", action: "reconnect" });
    expect(canvasHealth({ ...base, phase: "syncing" }, NOW).tone).toBe("busy");
  });
  it("a failed run shows the message and offers a retry", () => {
    const h = canvasHealth({ ...base, phase: "error", message: "Couldn't reach Canvas." }, NOW);
    expect(h).toMatchObject({ tone: "warn", action: "retry" });
    expect(h.detail).toContain("Couldn't reach Canvas.");
    expect(h.detail).toContain("5m ago");
  });
  it("goes stale after two hours even without an error", () => {
    expect(canvasHealth({ ...base, lastSyncedAt: minsAgo(119) }, NOW).tone).toBe("ok");
    const h = canvasHealth({ ...base, lastSyncedAt: minsAgo(181) }, NOW);
    expect(h).toMatchObject({ tone: "warn", label: "Canvas: synced 3h ago", action: "sync" });
  });
  it("no credential, feed-only and never-synced each get their own state", () => {
    expect(canvasHealth({ ...base, authMode: "none" }, NOW).action).toBe("connect");
    expect(canvasHealth({ ...base, authMode: "ics" }, NOW).label).toBe("Calendar feed only");
    expect(canvasHealth({ ...base, lastSyncedAt: null }, NOW).label).toBe("Canvas: not synced yet");
  });
});
