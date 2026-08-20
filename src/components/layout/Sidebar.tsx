/**
 * Sidebar — the persistent 220px navigation column, present on every screen
 * (SPEC.md §5, screen 0).
 *
 * Called by: AppShell.
 * Calls: react-router (NavLink), useSync, ThemeToggle, CourseStatusDot.
 *
 * Three zones, in this order and for these reasons:
 *   Nav      — four destinations, count badges where a count means something.
 *   Courses  — the live list, sorted by RISK rather than alphabetically, so the
 *              class closest to falling short sits at the top. This is the
 *              sidebar's actual job.
 *   Footer   — sync status, theme, settings. "Reconnect to Canvas" has to be
 *              visible from every screen, which is precisely why it lives here
 *              instead of in a screen-level banner.
 *
 * Collapsed to a 56px rail the nav icons and the course status dots survive;
 * everything else goes. The dots are the whole reason to glance at a collapsed
 * sidebar, so they are the last thing to be cut.
 *
 * TODO(M1): the course list is fed from `listCourses()` once sync lands. Until
 * then it renders its empty state, which is the honest thing to show.
 */
import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  ListChecks,
  Loader2,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shortcut } from "@/lib/platform";
import { sinceSync } from "@/lib/format";
import { useSync } from "@/hooks/useSync";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  to: string;
  label: string;
  icon: typeof ListChecks;
  /** Key for the ⌘1–⌘4 / Ctrl+1–4 shortcut (§5). */
  digit: string;
  /** Count badge, when a count is meaningful. Null renders no badge at all —
   *  a "0" badge is noise, not information. */
  count: number | null;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { status, isReconnectRequired } = useSync();

  // TODO(M1): counts come from the DB. Null until then, which is why no badges
  // render on a fresh install — better than a confident, wrong zero.
  const items: NavItem[] = [
    { to: "/", label: "Triage", icon: ListChecks, digit: "1", count: null },
    { to: "/courses", label: "Courses", icon: GraduationCap, digit: "2", count: null },
    { to: "/calendar", label: "Calendar", icon: CalendarDays, digit: "3", count: null },
    { to: "/contacts", label: "Contacts", icon: Users, digit: "4", count: null },
  ];

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-surface",
        // Width is a token (`w-sidebar` / `w-rail`) so AppShell and this file
        // cannot disagree about where the content column starts.
        collapsed ? "w-rail" : "w-sidebar",
        "transition-[width] duration-modal ease-out",
      )}
      aria-label="Primary"
    >
      {/* ── Wordmark + collapse ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-12 shrink-0 items-center gap-2 px-3",
          collapsed && "justify-center px-0",
        )}
      >
        {!collapsed && (
          <span className="truncate font-display text-sm font-semibold tracking-tight">
            Semester Command
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand" : "Collapse"} · {shortcut("\\")}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* ── Zone 1 · Nav ────────────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((item) => (
          <NavItemLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <Separator className="my-3" />

      {/* ── Zone 2 · Courses, sorted by risk ────────────────────────────── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-2">
          {!collapsed && (
            <h2 className="px-2 pb-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
              Courses
            </h2>
          )}
          {/* Empty state names the next action rather than saying "No data"
              (§9.7). */}
          {collapsed ? (
            <div className="flex justify-center py-2">
              <span className="h-2 w-2 rounded-full border border-dashed border-border" />
            </div>
          ) : (
            <p className="px-2 py-1 text-xs leading-relaxed text-muted-foreground">
              No courses yet.{" "}
              <NavLink to="/settings" className="text-brand-fg underline underline-offset-2">
                Connect Canvas
              </NavLink>{" "}
              to sync, or add a calendar feed URL.
            </p>
          )}
        </div>
      </ScrollArea>

      {/* ── Zone 3 · Footer ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border p-2">
        <SyncIndicator
          collapsed={collapsed}
          phase={status.phase}
          lastSyncedAt={status.lastSyncedAt}
          isReconnectRequired={isReconnectRequired}
        />

        <div
          className={cn(
            "mt-2 flex items-center gap-2",
            collapsed && "flex-col justify-center gap-1",
          )}
        >
          <ThemeToggle collapsed={collapsed} />
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                aria-label="Settings"
                className={({ isActive }) =>
                  cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-micro",
                    isActive
                      ? "bg-fill-ghost-selected text-foreground"
                      : "text-muted-foreground hover:bg-fill-ghost hover:text-foreground",
                  )
                }
              >
                <SettingsIcon className="h-4 w-4" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

/** One nav row. Active state gets the `--fill-ghost-selected` background and an
 *  accent left indicator, per §5. */
function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-micro",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-fill-ghost-selected text-foreground"
            : "text-muted-foreground hover:bg-fill-ghost hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* The accent indicator. Periwinkle means "interactive", and an
              active nav row is exactly that (§9.1). */}
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-brand transition-opacity duration-micro",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.count !== null && (
            <span
              data-numeric
              className="ml-auto rounded bg-fill-ghost px-1.5 font-mono text-2xs text-muted-foreground"
            >
              {item.count}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label} · {shortcut(item.digit)}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Sync state in the footer. Three shapes: syncing, reconnect-required, idle.
 *
 * "Reconnect to Canvas" is rendered in `--critical` and stays put until the
 * session is restored, because the alternative — quietly showing stale grades —
 * is the one failure mode §2.0 explicitly forbids.
 */
function SyncIndicator({
  collapsed,
  phase,
  lastSyncedAt,
  isReconnectRequired,
}: {
  collapsed: boolean;
  phase: string;
  lastSyncedAt: string | null;
  isReconnectRequired: boolean;
}) {
  if (isReconnectRequired) {
    const content = (
      <button
        type="button"
        // TODO(M1): opens the Canvas login webview and re-harvests cookies.
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-critical-fg transition-colors duration-micro hover:bg-critical/10",
          collapsed && "justify-center px-0",
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {!collapsed && <span className="truncate">Reconnect to Canvas</span>}
      </button>
    );
    return collapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">
          Your Canvas session expired — grades on screen are stale
        </TooltipContent>
      </Tooltip>
    ) : (
      content
    );
  }

  const syncing = phase === "syncing";
  const label = syncing ? "syncing…" : `synced ${sinceSync(lastSyncedAt)}`;

  const content = (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {syncing ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-locked" />
      )}
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );

  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    content
  );
}
