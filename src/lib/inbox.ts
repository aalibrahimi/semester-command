/**
 * inbox: the notification inbox, shared by the bell, the Inbox page, the
 * in-app toasts and the pop-up window.
 *
 * Called by: components/inbox/*, routes/Inbox.tsx, toast/ToastApp.tsx.
 * Calls: lib/ipc (inbox commands), the `inbox:new` / `inbox:changed` events.
 *
 * One store for the whole window: a module-level snapshot refreshed on every
 * inbox event, read with useSyncExternalStore, so the bell badge, the
 * sidebar count and an open Inbox page never disagree.
 *
 * Outside Tauri (plain `vite dev` / preview) there's no backend. Setting
 * localStorage "sc.inbox.demo" = "1" fills it with sample items for UI work.
 */
import { useEffect, useSyncExternalStore } from "react";
import { listen } from "@tauri-apps/api/event";
import { AlarmClock, Bell, CalendarClock, FlaskConical, GraduationCap, Plug, RefreshCw, TriangleAlert } from "lucide-react";
import { IS_TAURI, inboxList, inboxMarkRead } from "@/lib/ipc";
import type { InboxItem } from "@/types";

/* ── Kinds ─────────────────────────────────────────────────────────────────── */

export interface KindMeta {
  label: string;
  icon: typeof Bell;
  /** Tailwind classes for the icon disc and the card's accent bar. */
  disc: string;
  bar: string;
}

const KINDS: Record<string, KindMeta> = {
  deadline: { label: "Deadline", icon: AlarmClock, disc: "bg-at-risk/15 text-at-risk-fg", bar: "bg-at-risk" },
  missing: { label: "Missing", icon: TriangleAlert, disc: "bg-critical/15 text-critical-fg", bar: "bg-critical" },
  grade: { label: "Grade", icon: GraduationCap, disc: "bg-on-track/15 text-on-track-fg", bar: "bg-on-track" },
  digest: { label: "Today", icon: CalendarClock, disc: "bg-brand/15 text-brand-fg", bar: "bg-brand" },
  session: { label: "Canvas", icon: Plug, disc: "bg-critical/15 text-critical-fg", bar: "bg-critical" },
  sync: { label: "Sync", icon: RefreshCw, disc: "bg-foreground/10 text-foreground/80", bar: "bg-foreground/40" },
  test: { label: "Test", icon: FlaskConical, disc: "bg-brand/15 text-brand-fg", bar: "bg-brand" },
};

export function kindMeta(kind: string): KindMeta {
  return KINDS[kind] ?? { label: "Notice", icon: Bell, disc: "bg-foreground/10 text-foreground/80", bar: "bg-foreground/40" };
}

/** Filter chips on the Inbox page, in this order. */
export const KIND_FILTERS = ["deadline", "missing", "grade", "digest", "session", "sync"] as const;

/* ── Time ──────────────────────────────────────────────────────────────────── */

/** "now", "5m", "3h", "yesterday", "Mon", "Sep 12". */
export function when(iso: string, now = new Date()): string {
  const t = new Date(iso);
  const s = Math.max(0, (now.getTime() - t.getTime()) / 1000);
  if (s < 45) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 6 * 3600) return `${Math.round(s / 3600)}h`;
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(t)) / 86_400_000);
  if (days === 0) return t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "yesterday";
  if (days < 7) return t.toLocaleDateString(undefined, { weekday: "short" });
  return t.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Today" / "Yesterday" / "Earlier this week" / "Older", for list headers. */
export function bucket(iso: string, now = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(new Date(iso))) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  return "Older";
}

/* ── Store ─────────────────────────────────────────────────────────────────── */

interface Snapshot {
  items: InboxItem[];
  unread: number;
  loaded: boolean;
}

let snap: Snapshot = { items: [], unread: 0, loaded: false };
const subs = new Set<() => void>();
let started = false;

function set(next: Snapshot) {
  snap = next;
  subs.forEach((f) => f());
}

function demo(): InboxItem[] {
  const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
  const mk = (id: number, kind: string, title: string, body: string, m: number, read: boolean, urgency = "normal"): InboxItem => ({
    id, kind, title, body, route: "/", urgency, createdAt: ago(m), readAt: read ? ago(m - 1) : null,
  });
  return [
    mk(7, "deadline", "Project 1 · SortingHub: due in 3h", "CS 146 · worth 10.0% of your final grade", 2, false, "high"),
    mk(6, "grade", "Grade posted: Assignment 3 - Using the JFLAP", "CS 154 · 1.5 / 1.5 (100%)", 50, false),
    mk(5, "missing", "Marked missing: Lab #6", "LING 124: still submittable? Check the late policy on the course's Syllabus tab.", 180, false, "high"),
    mk(4, "digest", "2 due today · 9 open", "Start with: HW 2 (LING-112) · Quiz 2 (HIST-15) · Lab #8 (LING-124)", 60 * 20, true),
    mk(3, "sync", "4 new assignments on Canvas", "They're in Triage, ranked by how much of your grade they're worth.", 60 * 30, true, "low"),
    mk(2, "grade", "LING-115: grade moved up", "Current grade 88.2% → 91.0%", 60 * 50, true),
    mk(1, "session", "Canvas disconnected", "Your SJSU session expired, so grades are frozen until you sign in again. Click to reconnect.", 60 * 24 * 4, true, "high"),
  ];
}

export async function refreshInbox(): Promise<void> {
  if (!IS_TAURI) {
    let on = false;
    try {
      on = localStorage.getItem("sc.inbox.demo") === "1";
    } catch {
      /* no storage: no demo */
    }
    const items = on ? (snap.loaded ? snap.items : demo()) : [];
    set({ items, unread: items.filter((i) => !i.readAt).length, loaded: true });
    return;
  }
  try {
    const items = await inboxList(300);
    set({ items, unread: items.filter((i) => !i.readAt).length, loaded: true });
  } catch {
    set({ ...snap, loaded: true });
  }
}

/** Local optimistic edit, for the demo mode and snappy UI. */
export function patchInbox(fn: (items: InboxItem[]) => InboxItem[]) {
  const items = fn(snap.items);
  set({ items, unread: items.filter((i) => !i.readAt).length, loaded: true });
}

/** Mark read here at once, then tell Rust. */
export function markRead(ids: number[]) {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  patchInbox((items) => items.map((i) => (ids.includes(i.id) && !i.readAt ? { ...i, readAt: now } : i)));
  void inboxMarkRead(ids).catch(() => {});
}

function start() {
  if (started) return;
  started = true;
  void refreshInbox();
  if (IS_TAURI) {
    void listen("inbox:new", () => void refreshInbox());
    void listen("inbox:changed", () => void refreshInbox());
  }
}

export function useInbox(): Snapshot {
  useEffect(start, []);
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => snap,
  );
}
