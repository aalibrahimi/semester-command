/**
 * CommandPalette — ⌘K / Ctrl+K navigation and actions (§9.5).
 *
 * Called by: AppShell (mounted once, globally).
 * Calls: react-router (navigate), cmdk via components/ui/command.
 *
 * §9.5 calls this "how a power user actually navigates", and it costs almost
 * nothing to add, which is why it lands in M0 rather than waiting for M3: the
 * shortcut plumbing and the shell are the same work either way.
 *
 * TODO(M1): course jump entries and assignment search, fed from the DB.
 * TODO(M2): "what do I need in CS 152" runs the solver from here.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, GraduationCap, ListChecks, RefreshCw, Settings, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { hasMod, shortcut } from "@/lib/platform";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  // Registered here rather than in AppShell so the component that owns the
  // dialog also owns the key that opens it — one place to look when it stops
  // working.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && hasMod(e)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    navigate(to);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a screen, search assignments, or run a command…" />
      <CommandList>
        <CommandEmpty>
          Nothing matches. Sync Canvas first and assignments become searchable here.
        </CommandEmpty>

        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go("/")}>
            <ListChecks className="mr-2 h-4 w-4" />
            Triage
            <CommandShortcut>{shortcut("1")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/courses")}>
            <GraduationCap className="mr-2 h-4 w-4" />
            Courses
            <CommandShortcut>{shortcut("2")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/calendar")}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar
            <CommandShortcut>{shortcut("3")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/contacts")}>
            <Users className="mr-2 h-4 w-4" />
            Contacts
            <CommandShortcut>{shortcut("4")}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Actions">
          {/* Disabled rather than hidden: the entry teaches that the command
              exists, and the empty-state copy explains why it is not ready. */}
          <CommandItem disabled>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync now — available once Canvas is connected
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
