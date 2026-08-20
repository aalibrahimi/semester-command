/**
 * ThemeToggle — the Light / Dark / System control in the sidebar footer (§9.6).
 *
 * Called by: Sidebar.
 * Calls: useTheme.
 *
 * It is a three-way segmented control rather than a two-way switch because
 * "System" is a real preference, not the absence of one: a user who tracks
 * their OS wants the app to follow it at sunset, and a two-state switch has
 * nowhere to express that.
 */
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ThemeMode } from "@/types";

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: "light", icon: Sun, label: "Light" },
  { mode: "dark", icon: Moon, label: "Dark" },
  { mode: "system", icon: Monitor, label: "Match system" },
];

export interface ThemeToggleProps {
  /** In the 56px rail there is no room for three targets; show one that cycles. */
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { mode, setMode } = useTheme();

  if (collapsed) {
    const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[2];
    const Icon = current.icon;
    const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
            onClick={() => setMode(next.mode)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Theme: {current.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ mode: m, icon: Icon, label }) => {
        const active = mode === m;
        return (
          <Tooltip key={m}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={label}
                onClick={() => setMode(m)}
                className={cn(
                  "flex h-6 flex-1 items-center justify-center rounded transition-colors duration-micro",
                  active
                    ? "bg-fill-ghost-selected text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
