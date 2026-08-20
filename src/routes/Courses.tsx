/**
 * Courses — the index that the sidebar's "Courses" nav item points at.
 *
 * Called by: the router, at "/courses".
 * Calls: ScreenHeader, EmptyState.
 *
 * NOTE: §5 lists four screens and this is not one of them — the four are
 * Triage, Course detail, Calendar, Contacts. This index exists because the
 * sidebar nav has a Courses entry that needs a destination when no course is
 * selected. It stays deliberately thin: a grid of course cards that route into
 * the real screen. If it starts growing analytics, that work belongs on Course
 * detail instead.
 *
 * TODO(M3): course cards with the Grade Gap bar, sorted by risk.
 */
import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";

export default function Courses() {
  return (
    <>
      <ScreenHeader title="Courses" subtitle="Active enrollments this term." />
      <EmptyState
        icon={GraduationCap}
        title="No courses synced"
        description="Once Canvas is connected, every active course appears here and in the sidebar, sorted by which one is closest to falling short of your target."
        action={
          <Button asChild>
            <Link to="/settings">Connect Canvas</Link>
          </Button>
        }
      />
    </>
  );
}
