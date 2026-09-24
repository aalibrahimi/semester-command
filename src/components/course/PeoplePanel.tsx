/**
 * PeoplePanel: the People tab of a course's page (CourseDetail): its
 * professor as a full card, everyone else Canvas lists as compact rows.
 * This used to be the Contacts screen (every course's cards in one grid);
 * it was folded into each course's page.
 * Calls: ipc list_instructors / save_instructor_note / set_instructor_starred
 * / syllabi.
 * Who is "my professor"? A course with exactly one teacher gets that
 * teacher automatically; otherwise the user stars theirs once (a local flag
 * that survives sync).
 * Contact info: Canvas withholds instructor emails from students, but
 * syllabi carry email, phone and office hours; cards show what the shared
 * syllabus miner finds, labelled with its source.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Mail, Phone, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { listInstructors, saveInstructorNote, setInstructorStarred, syllabi } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { chipStyle } from "@/lib/courseColor";
import { extractFacts, type SyllabusFacts } from "@/lib/syllabusFacts";
import type { CourseSummary, InstructorRow } from "@/types";

function toggleStar(p: InstructorRow, refresh: () => void) {
  setInstructorStarred(p.id, p.courseId, !p.starred)
    .then(refresh)
    .catch(() => toast.error("Could not update the star."));
}

/** One professor, one card — identity color from the course, facts only
 *  when they exist, a ghost note field that stays quiet until used. */
function ProfessorCard({
  person: p,
  course,
  label,
  info,
  onToggleStar,
}: {
  person: InstructorRow;
  course: CourseSummary;
  label: string;
  info: SyllabusFacts | undefined;
  onToggleStar: () => void;
}) {
  const [note, setNote] = useState(p.officeHoursNote ?? "");
  const initials = (p.name ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const save = () => {
    const trimmed = note.trim();
    if (trimmed === (p.officeHoursNote ?? "")) return;
    saveInstructorNote(p.id, p.courseId, trimmed === "" ? null : trimmed).catch(() =>
      toast.error("Could not save the note."),
    );
  };

  // Email precedence: Canvas-confirmed, else a syllabus-mined address.
  const email = p.email ?? info?.emails[0] ?? null;
  const phone = info?.phones[0] ?? null;
  const hours = info?.officeHours ?? null;
  const hasFacts = email !== null || phone !== null || hours !== null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold"
          style={chipStyle(course.id)}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-semibold">
            {p.name ?? "Unknown"}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Link
              to={`/courses/${course.id}`}
              className="rounded px-1.5 py-0.5 text-2xs font-medium hover:underline"
              style={chipStyle(course.id)}
            >
              {label}
            </Link>
            <span className="text-2xs text-muted-foreground">
              {p.starred ? "my professor" : "professor"}
            </span>
          </div>
        </div>
        <StarButton starred={p.starred} onClick={onToggleStar} />
      </div>

      {hasFacts ? (
        <div className="flex flex-col gap-1.5 text-xs">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex min-w-0 items-center gap-2 text-brand-fg hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{email}</span>
              {!p.email && <span className="shrink-0 text-muted-foreground">· syllabus</span>}
            </a>
          )}
          {phone && (
            <span className="flex items-center gap-2 text-foreground/90">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {phone} <span className="text-muted-foreground">· syllabus</span>
            </span>
          )}
          {hours && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex min-w-0 items-center gap-2 text-foreground/90">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{hours}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-96">
                {hours}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <p className="text-2xs text-muted-foreground/70">
          No contact info yet — it usually lives in the syllabus.
        </p>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="Add a note…"
        className="mt-auto w-full rounded-md bg-transparent px-1 py-1 text-xs outline-none transition-colors duration-micro placeholder:text-muted-foreground/40 hover:bg-fill-ghost/60 focus-visible:bg-fill-ghost/60 focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

/** Everyone who isn't (yet) the professor: one quiet line each. */
function CompactRow({
  person: p,
  onToggleStar,
}: {
  person: InstructorRow;
  onToggleStar: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-border/40 px-3 py-1.5 text-sm text-muted-foreground first:border-t-0 hover:bg-fill-ghost/60">
      <span className="min-w-0 flex-1 truncate">{p.name ?? "Unknown"}</span>
      <Badge variant="secondary" className="text-2xs">
        {p.role ?? "instructor"}
      </Badge>
      {p.email && (
        <a href={`mailto:${p.email}`} className="text-brand-fg hover:underline">
          <Mail className="h-3.5 w-3.5" />
        </a>
      )}
      <StarButton starred={p.starred} onClick={onToggleStar} subtle />
    </div>
  );
}

function StarButton({
  starred,
  onClick,
  subtle,
}: {
  starred: boolean;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={starred ? "Unstar" : "Star as my professor"}
          className={cn(
            "shrink-0 rounded-md p-1.5 transition-colors duration-micro hover:bg-fill-ghost",
            starred ? "text-at-risk" : subtle ? "text-muted-foreground/50" : "text-muted-foreground",
          )}
        >
          <Star className={cn("h-4 w-4", starred && "fill-current")} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {starred ? "Unstar" : "This is my professor"}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The People tab of one course's page (CourseDetail): its professor as a
 * full card, everyone else Canvas lists as compact rows with the star to
 * promote them.
 */
export function CoursePeoplePanel({ course, label }: { course: CourseSummary; label: string }) {
  const [instructors, setInstructors] = useState<InstructorRow[] | null>(null);
  const [info, setInfo] = useState<SyllabusFacts | undefined>(undefined);

  const refresh = useCallback(() => {
    listInstructors()
      .then((all) => setInstructors(all.filter((i) => i.courseId === course.id)))
      .catch(() => setInstructors([]));
  }, [course.id]);

  useEffect(() => {
    refresh();
    syllabi()
      .then((all) => {
        const c = all.find((x) => x.courseId === course.id);
        const text = c?.files.map((f) => f.extractedText ?? "").join("\n") ?? "";
        setInfo(text.trim() ? extractFacts(text) : undefined);
      })
      .catch(() => {});
  }, [course.id, refresh]);

  if (instructors === null) return <Skeleton className="h-44 rounded-2xl" />;
  if (instructors.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No instructors synced for this course"
        description="Names and roles come from Canvas; emails and office hours come from the syllabus."
      />
    );
  }
  const starred = instructors.filter((p) => p.starred);
  const teachers = instructors.filter((p) => p.role === "teacher");
  const professors = starred.length > 0 ? starred : teachers.length === 1 ? teachers : [];
  const rest = instructors.filter((p) => !professors.includes(p));
  return (
    <div className="flex flex-col gap-5">
      {professors.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {professors.map((p) => (
            <ProfessorCard key={p.id} person={p} course={course} label={label} info={info} onToggleStar={() => toggleStar(p, refresh)} />
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {professors.length === 0 ? "Which one is your professor? Star them." : "Everyone else Canvas lists"}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {rest.map((p) => (
              <CompactRow key={p.id} person={p} onToggleStar={() => toggleStar(p, refresh)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
