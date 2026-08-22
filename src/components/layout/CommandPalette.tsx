/**
 * CommandPalette — ⌘K / Ctrl+K navigation and actions (§9.5).
 *
 * Called by: AppShell (mounted once, globally).
 * Calls: react-router (navigate), cmdk via components/ui/command, useCourses
 * (course jump entries), ipc (sync, triage rows for assignment jump).
 *
 * §9.5 calls this "how a power user actually navigates". Entries: the six
 * screens, every live course (typing "146" lands on CS-146), open
 * assignments (jump to their course), and actions — sync now, export,
 * reconnect. Assignment list is capped: the palette is for reaching things,
 * not browsing them.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  ListChecks,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { CourseStatusDot } from "@/components/layout/CourseStatusDot";
import { useCourses } from "@/hooks/useCourses";
import { triageRows, triggerSync } from "@/lib/ipc";
import { pct } from "@/lib/format";
import { hasMod, shortcut } from "@/lib/platform";
import type { TriageRow } from "@/types";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { courses } = useCourses();
  const [assignments, setAssignments] = useState<TriageRow[]>([]);

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

  // Open assignments load when the palette opens, not on mount — the list
  // is only worth being fresh at the moment it is visible.
  useEffect(() => {
    if (!open) return;
    triageRows()
      .then((rows) => setAssignments(rows.slice(0, 15)))
      .catch(() => {});
  }, [open]);

  const go = (to: string) => {
    navigate(to);
    onOpenChange(false);
  };

  const visibleCourses = courses.filter((c) => !c.hidden && c.gradeable);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a screen, course, or assignment…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>

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
          <CommandItem onSelect={() => go("/syllabi")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Syllabi
            <CommandShortcut>{shortcut("4")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/contacts")}>
            <Users className="mr-2 h-4 w-4" />
            Contacts
            <CommandShortcut>{shortcut("5")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/graduation")}>
            <Award className="mr-2 h-4 w-4" />
            Graduation
            <CommandShortcut>{shortcut("6")}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {visibleCourses.length > 0 && (
          <CommandGroup heading="Courses">
            {visibleCourses.map((c) => (
              <CommandItem
                key={c.id}
                // Both code and name are searchable text.
                value={`${c.courseCode ?? ""} ${c.name ?? ""}`}
                onSelect={() => go(`/courses/${c.id}`)}
              >
                <CourseStatusDot status={c.status} className="mr-2" />
                <span className="min-w-0 flex-1 truncate">
                  {c.courseCode ?? c.name}
                </span>
                <span data-numeric className="ml-2 font-mono text-xs text-muted-foreground">
                  {pct(c.grade.currentPct)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {assignments.length > 0 && (
          <CommandGroup heading="Open assignments">
            {assignments.map((a) => (
              <CommandItem
                key={a.assignmentId}
                value={`${a.name ?? ""} ${a.courseCode ?? ""}`}
                onSelect={() => go(`/courses/${a.courseId}`)}
              >
                <ClipboardList className="mr-2 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{a.name ?? "Untitled"}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {a.courseCode ?? ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              void triggerSync()
                .then(() => toast.info("Sync started."))
                .catch(() => toast.error("Could not start a sync."));
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync now
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
