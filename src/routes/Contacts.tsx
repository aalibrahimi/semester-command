/**
 * Contacts — instructors and TAs per course (SPEC.md §5, screen 4).
 *
 * Called by: the router, at "/contacts".
 * Calls: ipc `list_instructors` / `save_instructor_note`; useCourses for
 * course names.
 *
 * The notes field is local-only and survives every re-sync (§3): office
 * hours, "answers email fast", "prefers Piazza". Canvas has no field for any
 * of that, which is exactly why it is worth keeping here.
 */
import { useEffect, useState } from "react";
import { Mail, Users } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useCourses";
import { listInstructors, saveInstructorNote } from "@/lib/ipc";
import type { InstructorRow } from "@/types";

export default function Contacts() {
  const { courses } = useCourses();
  const [instructors, setInstructors] = useState<InstructorRow[] | null>(null);

  useEffect(() => {
    listInstructors()
      .then(setInstructors)
      .catch(() => setInstructors([]));
  }, []);

  // Group by course, in the sidebar's risk order so the course you're
  // worried about is also the professor at the top of this list.
  const byCourse = courses
    .map((c) => ({
      course: c,
      people: (instructors ?? []).filter((i) => i.courseId === c.id),
    }))
    .filter((g) => g.people.length > 0);

  return (
    <>
      <ScreenHeader title="Contacts" subtitle="Instructors and TAs, with your own notes." />

      {instructors === null ? (
        <div className="mx-8 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : byCourse.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No instructors synced"
          description="Names, roles and emails come from Canvas. Your notes about office hours and how each of them prefers to be reached stay local and survive every re-sync."
        />
      ) : (
        <div className="mx-8 mb-10 flex flex-col gap-5">
          {byCourse.map(({ course, people }) => (
            <section key={course.id}>
              <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {course.courseCode ?? course.name ?? course.id}
              </h2>
              <div className="flex flex-col gap-1.5">
                {people.map((p) => (
                  <ContactCard key={`${p.id}-${p.courseId}`} person={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function ContactCard({ person: p }: { person: InstructorRow }) {
  const [note, setNote] = useState(p.officeHoursNote ?? "");

  const save = () => {
    const trimmed = note.trim();
    if (trimmed === (p.officeHoursNote ?? "")) return;
    saveInstructorNote(p.id, p.courseId, trimmed === "" ? null : trimmed).catch(() =>
      toast.error("Could not save the note."),
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-medium">{p.name ?? "Unknown"}</span>
        <Badge variant="secondary" className="text-2xs">
          {p.role ?? "instructor"}
        </Badge>
        {p.email && (
          <a
            href={`mailto:${p.email}`}
            className="ml-auto flex items-center gap-1.5 text-xs text-brand-fg hover:underline"
          >
            <Mail className="h-3.5 w-3.5" />
            {p.email}
          </a>
        )}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="Your notes — office hours, how they prefer to be reached… (saved locally)"
        className="w-full rounded-md bg-fill-ghost/60 px-2.5 py-1.5 text-xs outline-none transition-colors duration-micro placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
