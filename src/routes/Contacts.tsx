/**
 * Contacts — instructors and TAs per course (SPEC.md §5, screen 4).
 *
 * Called by: the router, at "/contacts".
 * Calls: ScreenHeader, EmptyState.
 *
 * The notes field is local-only and survives every re-sync (§3): office hours,
 * "answers email fast", "prefers Piazza". Canvas has no field for any of that,
 * which is exactly why it is worth keeping here.
 *
 * TODO(M3): grouped list with mailto: links and the inline notes editor.
 */
import { Users } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";

export default function Contacts() {
  return (
    <>
      <ScreenHeader title="Contacts" subtitle="Instructors and TAs, with your own notes." />
      <EmptyState
        icon={Users}
        title="No instructors synced"
        description="Names, roles and emails come from Canvas. Your notes about office hours and how each of them prefers to be reached stay local and survive every re-sync."
      />
    </>
  );
}
