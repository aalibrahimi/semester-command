/**
 * AppShell — the frame every screen renders inside (§5).
 *
 * Called by: App.tsx, as the layout route.
 * Calls: Sidebar, SemesterProgress, CommandPalette, react-router <Outlet />.
 *
 * Owns exactly three things and nothing else: the sidebar collapse state, the
 * global keyboard shortcuts, and the header strip. Screen content is the
 * <Outlet />'s business.
 */
import { useCallback, useEffect, useState } from "react";
import { useSync } from "@/hooks/useSync";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { SemesterProgress } from "@/components/layout/SemesterProgress";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Button } from "@/components/ui/button";
import { hasMod, shortcut } from "@/lib/platform";
import { IS_TAURI } from "@/lib/ipc";
import type { SyncChanges } from "@/types";

/** Synchronous mirror of the collapse preference, same pattern as the theme:
 *  read before first paint so the sidebar does not visibly snap from 220px to
 *  56px on launch.
 *  TODO(M1): promote to the settings table, keeping this as the mirror. */
const COLLAPSE_KEY = "sc.sidebar.collapsed";

/** Digit → route, for ⌘1–⌘5 (§5, plus the Syllabi screen). */
const DIGIT_ROUTES: Record<string, string> = {
  "1": "/",
  "2": "/courses",
  "3": "/calendar",
  "4": "/syllabi",
  "5": "/contacts",
  "6": "/graduation",
  "7": "/done",
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

  // The sync digest (§6): any run that changed something announces what.
  // Lives in the shell so it fires regardless of which screen is open.
  useEffect(() => {
    if (!IS_TAURI) return;
    const unlisten = listen<SyncChanges>("sync:digest", (e) => {
      const c = e.payload;
      const lines: string[] = [];
      if (c.newGrades.length > 0) {
        const first = c.newGrades[0];
        lines.push(
          c.newGrades.length === 1
            ? `Grade posted: ${first.assignmentName ?? "an assignment"} (${first.courseCode ?? "—"})`
            : `${c.newGrades.length} new grades posted`,
        );
      }
      for (const m of c.courseMoves) {
        lines.push(
          `${m.courseCode ?? "A course"} moved ${m.oldPct.toFixed(1)}% → ${m.newPct.toFixed(1)}%`,
        );
      }
      if (c.missingFlips.length > 0) {
        lines.push(`${c.missingFlips.length} marked missing`);
      }
      if (c.newAssignments > 0) {
        lines.push(`${c.newAssignments} new assignment${c.newAssignments === 1 ? "" : "s"}`);
      }
      if (lines.length > 0) {
        toast.info("Sync update", { description: lines.join(" · "), duration: 8000 });
      }
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, []);

  // ⌘\ collapse and ⌘1–⌘6 navigation. ⌘K is owned by CommandPalette.
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
          {/* TODO(M1): real term dates from courses.term. Renders nothing until
              then rather than inventing a semester. */}
          <SemesterProgress />

          <div className="ml-auto flex items-center gap-2">
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
    </div>
  );
}
