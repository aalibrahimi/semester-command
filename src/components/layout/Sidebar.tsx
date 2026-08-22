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
 * The course list and nav counts come from `useCourses()` — every number and
 * every status colour was computed in Rust (§10).
 */
import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  BookOpen,
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
import { openCanvasLogin } from "@/lib/ipc";
import { useSync } from "@/hooks/useSync";
import { useCourses } from "@/hooks/useCourses";
import { CourseStatusDot } from "@/components/layout/CourseStatusDot";
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
  const { courses: allCourses, openTotal, dueThisWeek, loaded } = useCourses();
  const { status, isReconnectRequired } = useSync();
  // Hidden courses live only in the Courses page's own section.
  const courses = allCourses.filter((c) => !c.hidden);

  // Zero-count badges render as no badge at all — a "0" chip is noise. Before
  // the first load counts stay null for the same reason.
  const items: NavItem[] = [
    { to: "/", label: "Triage", icon: ListChecks, digit: "1", count: loaded && openTotal > 0 ? openTotal : null },
    { to: "/courses", label: "Courses", icon: GraduationCap, digit: "2", count: null },
    { to: "/calendar", label: "Calendar", icon: CalendarDays, digit: "3", count: loaded && dueThisWeek > 0 ? dueThisWeek : null },
    { to: "/syllabi", label: "Syllabi", icon: BookOpen, digit: "4", count: null },
    { to: "/contacts", label: "Contacts", icon: Users, digit: "5", count: null },
    // No count badge: the degree audit is a separate import the sidebar would
    // have to load on every paint to produce a number, and unlike the triage
    // and calendar counts it does not move between syncs.
    { to: "/graduation", label: "Graduation", icon: Award, digit: "6", count: null },
  ];

  return (
    <aside
      className={cn(
        // Sits on the canvas rather than on its own surface — in the soft
        // restyle the *content* floats as cards and the sidebar is quiet
        // negative space. The active nav pill (below) provides the contrast.
        "flex h-full shrink-0 flex-col border-r border-border/60 bg-background",
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
          {courses.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {courses.map((c) => {
                const label = c.courseCode ?? c.name ?? c.id;
                const row = (
                  <NavLink
                    key={c.id}
                    to={`/courses/${c.id}`}
                    className={({ isActive }) =>
                      cn(
                        "group flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs transition-colors duration-micro",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-card font-medium text-foreground shadow-card"
                          : "text-muted-foreground hover:bg-fill-ghost hover:text-foreground",
                        !c.gradeable && "opacity-60",
                      )
                    }
                  >
                    <CourseStatusDot status={c.status} emphasize={c.status === "critical"} />
                    {!collapsed && <span className="truncate">{label}</span>}
                    {!collapsed && c.gradeable && (
                      <span data-numeric className="ml-auto font-mono text-2xs text-muted-foreground">
                        {c.grade.currentPct !== null ? `${c.grade.currentPct.toFixed(0)}%` : "—"}
                      </span>
                    )}
                  </NavLink>
                );
                // Collapsed rail: the dot is the row; give it the course name
                // on hover, since the dots are the reason the rail exists.
                return collapsed ? (
                  <Tooltip key={c.id}>
                    <TooltipTrigger asChild>{row}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                ) : (
                  row
                );
              })}
            </div>
          ) : /* Empty state names the next action rather than saying "No
                 data" (§9.7). Hidden until the first load so it can't flash
                 over a populated list. */
          collapsed ? (
            <div className="flex justify-center py-2">
              <span className="h-2 w-2 rounded-full border border-dashed border-border" />
            </div>
          ) : loaded ? (
            <p className="px-2 py-1 text-xs leading-relaxed text-muted-foreground">
              No courses yet.{" "}
              <NavLink to="/settings" className="text-brand-fg underline underline-offset-2">
                Connect Canvas
              </NavLink>{" "}
              to sync, or add a calendar feed URL.
            </p>
          ) : null}
        </div>
      </ScrollArea>

      {/* ── Zone 3 · Footer ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/60 p-2">
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
                    "flex h-8 w-8 shrink-0 justify-items-center content-center rounded-md transition-colors duration-micro",
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
          "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-micro",
          collapsed && "justify-center px-0",
          // Active state is a floating white pill (card + soft shadow), the
          // reference pattern. In dark the same classes resolve to the raised
          // #161923 pill — one rule, both themes.
          isActive
            ? "bg-card font-medium text-foreground shadow-card"
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
              "absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-brand transition-opacity duration-micro",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.count !== null && (
            <span
              data-numeric
              className="chip ml-auto bg-fill-ghost font-mono text-muted-foreground"
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
        onClick={() => void openCanvasLogin()}
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
