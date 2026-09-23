/**
 * AppShell — the frame every screen renders inside (§5).
 *
 * Called by: App.tsx, as the layout route.
 * Calls: Sidebar, SemesterProgress, CommandPalette, react-router <Outlet />.
 *
 * Owns the sidebar collapse state, the global keyboard shortcuts, the header
 * strip (search + the inbox bell), and the in-app notification toasts.
 * Screen content is the <Outlet />'s business.
 *
 * Notifications: Rust stores every one in the inbox and emits "inbox:new".
 * While this window has focus, the card slides in here (top right); when it
 * doesn't, inbox.rs shows the corner pop-up window instead. A click on
 * either lands here as "inbox:navigate" with the route to open.
 */
import { useCallback, useEffect, useState } from "react";
import { useSync } from "@/hooks/useSync";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { Search as SearchIcon } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { InboxBell } from "@/components/inbox/InboxBell";
import { ToastStack } from "@/components/inbox/NotificationCard";
import { useToastStack } from "@/lib/toastStack";
import { markRead } from "@/lib/inbox";
import { SemesterProgress } from "@/components/layout/SemesterProgress";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Button } from "@/components/ui/button";
import { currentTermBounds } from "@/lib/academicCalendar";
import { hasMod, shortcut } from "@/lib/platform";
import { IS_TAURI } from "@/lib/ipc";
import type { InboxItem } from "@/types";

/** Synchronous mirror of the collapse preference, same pattern as the theme:
 *  read before first paint so the sidebar does not visibly snap from 220px to
 *  56px on launch.
 *  TODO(M1): promote to the settings table, keeping this as the mirror. */
const COLLAPSE_KEY = "sc.sidebar.collapsed";

/** Digit → route, ⌘1–⌘9 — same order as the sidebar nav. */
const DIGIT_ROUTES: Record<string, string> = {
  "1": "/",
  "2": "/courses",
  "3": "/calendar",
  "4": "/syllabi",
  "5": "/contacts",
  "6": "/graduation",
  "7": "/done",
  "8": "/finance",
  "9": "/study",
  "0": "/inbox",
};

export function AppShell() {
  const navigate = useNavigate();
  const { isReconnectRequired } = useSync();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  // Notifications while you're in the app: a card in the top-right corner.
  // (The sync summary used to be a plain toast here; Rust now turns each
  // change into an inbox notification instead, see notify.rs.)
  const stack = useToastStack();
  const { push } = stack;
  useEffect(() => {
    if (!IS_TAURI) return;
    const un = listen<InboxItem>("inbox:new", (e) => {
      if (document.hasFocus()) push([e.payload]);
    });
    return () => void un.then((f) => f());
  }, [push]);

  // A clicked corner pop-up brings this window forward and says where to go.
  useEffect(() => {
    if (!IS_TAURI) return;
    const un = listen<string>("inbox:navigate", (e) => navigate(e.payload));
    return () => void un.then((f) => f());
  }, [navigate]);

  const openToast = (item: InboxItem) => {
    stack.dismiss(item.id);
    markRead([item.id]);
    navigate(item.route ?? "/inbox");
  };

  // ⌘\ collapse and ⌘1–⌘9 navigation. ⌘K is owned by CommandPalette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasMod(e)) return;

      if (e.key === "\\") {
        e.preventDefault();
        toggleCollapsed();
        return;
      }

      const route = DIGIT_ROUTES[e.key];
      if (route) {
        e.preventDefault();
        navigate(route);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate, toggleCollapsed]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Header ────────────────────────────────────────────────────────
            Deliberately thin. The screen below it is the product; this strip
            carries only what has to be true on every screen. */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border/60 px-6">
          {/* Term bounds from the bundled SJSU instruction calendar — between
              terms this renders nothing, which is the truthful picture. */}
          <SemesterProgress
            startsAt={currentTermBounds(new Date())?.start}
            endsAt={currentTermBounds(new Date())?.end}
          />

          <div className="ml-auto flex items-center gap-2">
            <InboxBell />
            {/* Styled as the reference's floating search pill rather than a
                bordered button — same ⌘K affordance, softer body language. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaletteOpen(true)}
              className="gap-2 rounded-full bg-card pl-4 pr-1.5 text-muted-foreground shadow-card hover:bg-card hover:text-foreground"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Search anything…</span>
              <kbd
                data-numeric
                className="rounded-full bg-fill-ghost px-2 py-0.5 font-mono text-2xs"
              >
                {shortcut("K")}
              </kbd>
            </Button>
          </div>
        </header>

        {/* A dead session means every number on screen is going stale —
            that earns a banner, not just the sidebar's footer line. */}
        {isReconnectRequired && (
          <div className="flex shrink-0 items-center gap-2 border-b border-critical/30 bg-critical/10 px-6 py-1.5 text-xs text-critical-fg">
            <span className="min-w-0 truncate">
              Canvas session expired — grades and due dates shown are from the last sync.
            </span>
            <Link
              to="/settings"
              className="ml-auto shrink-0 font-medium underline underline-offset-2"
            >
              Reconnect
            </Link>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <ToastStack
        toasts={stack.toasts}
        onOpen={openToast}
        onDismiss={stack.dismiss}
        onDismissAll={stack.clear}
        className="fixed right-5 top-16 z-50 w-[380px]"
      />
    </div>
  );
}
