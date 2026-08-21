/**
 * Contacts — instructors and TAs per course (SPEC.md §5, screen 4).
 *
 * Called by: the router, at "/contacts".
 * Calls: ipc list_instructors / save_instructor_note / set_instructor_starred
 * / syllabi; useCourses for course names and order.
 *
 * # Who is "my professor"?
 *
 * Canvas lists every section's teacher on umbrella courses (CS-146 shows
 * six), so the app cannot know which one teaches *your* section. Two rules:
 * a course with exactly one teacher gets that teacher as the professor
 * automatically; otherwise the user stars theirs once and the star is a
 * local flag that survives every sync. Starred/solo professors render as a
 * large card with an initials avatar; everyone else collapses into a
 * compact list, because the user's stated problem is name recall — the
 * screen leads with the face-equivalent, not an undifferentiated roster.
 *
 * # Contact info
 *
 * Canvas withholds instructor emails from students (verified live: every
 * synced email was null), but syllabi carry email, phone and office hours —
 * so this screen mines the extracted syllabus text with plain regexes and
 * shows what it finds per course, labelled with its source.
 */
import { useEffect, useMemo, useState } from "react";
import { AtSign, GraduationCap, Mail, Phone, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourses } from "@/hooks/useCourses";
import { listInstructors, saveInstructorNote, setInstructorStarred, syllabi } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { CourseSyllabus, InstructorRow } from "@/types";

export default function Contacts() {
  const { courses } = useCourses();
  const [instructors, setInstructors] = useState<InstructorRow[] | null>(null);
  const [syllabusData, setSyllabusData] = useState<CourseSyllabus[]>([]);

  const refresh = () => {
    listInstructors()
      .then(setInstructors)
      .catch(() => setInstructors([]));
  };

  useEffect(() => {
    refresh();
    syllabi()
      .then(setSyllabusData)
      .catch(() => {});
  }, []);

  const extracted = useMemo(() => {
    const map = new Map<string, ExtractedContact>();
    for (const c of syllabusData) {
      const text = c.files.map((f) => f.extractedText ?? "").join("\n");
      if (text.trim()) map.set(c.courseId, extractContact(text));
    }
    return map;
  }, [syllabusData]);

  const byCourse = courses
    .filter((c) => !c.hidden)
    .map((c) => ({
      course: c,
      people: (instructors ?? []).filter((i) => i.courseId === c.id),
    }))
    .filter((g) => g.people.length > 0);

  return (
    <>
      <ScreenHeader
        title="Contacts"
        subtitle="Your professors up top — star yours once on multi-section courses."
      />

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
          description="Names and roles come from Canvas. Emails and phone numbers usually live in the syllabus — import syllabi and they show up here automatically."
        />
      ) : (
        <div className="mx-8 mb-10 flex flex-col gap-6">
          {byCourse.map(({ course, people }) => {
            // Solo teacher = the professor by definition; otherwise stars.
            const starred = people.filter((p) => p.starred);
            const professors =
              starred.length > 0
                ? starred
                : people.filter((p) => p.role === "teacher").length === 1
                  ? people.filter((p) => p.role === "teacher")
                  : [];
            const others = people.filter((p) => !professors.includes(p));
            const info = extracted.get(course.id);

            return (
              <section key={course.id}>
                <div className="mb-2 flex flex-wrap items-baseline gap-3">
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {course.courseCode ?? course.name ?? course.id}
                  </h2>
                  {info && <SyllabusContactChips info={info} />}
                </div>

                {professors.length > 0 ? (
                  <div className="mb-2 flex flex-col gap-2">
                    {professors.map((p) => (
                      <ProfessorCard
                        key={`${p.id}-${p.courseId}`}
                        person={p}
                        info={info}
                        onToggleStar={() => toggleStar(p, refresh)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mb-2 rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                    Canvas lists {people.length} teachers for this umbrella course — star yours
                    below so they stand out here and everywhere else.
                  </p>
                )}

                {others.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {others.map((p) => (
                      <CompactRow
                        key={`${p.id}-${p.courseId}`}
                        person={p}
                        onToggleStar={() => toggleStar(p, refresh)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function toggleStar(p: InstructorRow, refresh: () => void) {
  setInstructorStarred(p.id, p.courseId, !p.starred)
    .then(refresh)
    .catch(() => toast.error("Could not update the star."));
}

/** The big card: this is the person you email when things go sideways. */
function ProfessorCard({
  person: p,
  info,
  onToggleStar,
}: {
  person: InstructorRow;
  info: ExtractedContact | undefined;
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

  return (
    <div className="flex gap-3 rounded-2xl border border-brand/30 bg-card p-4 shadow-card">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-sm font-semibold text-brand-fg">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{p.name ?? "Unknown"}</span>
          <Badge className="bg-brand/15 text-2xs text-brand-fg hover:bg-brand/15">
            <GraduationCap className="mr-1 h-3 w-3" />
            {p.starred ? "My professor" : "Professor"}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs">
          {email ? (
            <a href={`mailto:${email}`} className="flex items-center gap-1 text-brand-fg hover:underline">
              <Mail className="h-3.5 w-3.5" />
              {email}
              {!p.email && <span className="text-muted-foreground">(from syllabus)</span>}
            </a>
          ) : (
            <span className="text-muted-foreground">no email synced — check the syllabus</span>
          )}
          {info?.phones[0] && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {info.phones[0]} <span>(from syllabus)</span>
            </span>
          )}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Your notes — office hours, how they prefer to be reached… (saved locally)"
          className="mt-2 w-full rounded-md bg-fill-ghost/60 px-2.5 py-1.5 text-xs outline-none transition-colors duration-micro placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <StarButton starred={p.starred} onClick={onToggleStar} />
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
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-fill-ghost/60">
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

/* ── Syllabus mining ─────────────────────────────────────────────────────── */

interface ExtractedContact {
  emails: string[];
  phones: string[];
  officeHours: string | null;
}

/** Chips summarising what the syllabus revealed for this course. */
function SyllabusContactChips({ info }: { info: ExtractedContact }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {info.emails.slice(0, 2).map((e) => (
        <a key={e} href={`mailto:${e}`} className="chip gap-1 bg-fill-ghost text-2xs text-muted-foreground hover:text-foreground">
          <AtSign className="h-3 w-3" />
          {e}
        </a>
      ))}
      {info.phones.slice(0, 1).map((ph) => (
        <span key={ph} className="chip gap-1 bg-fill-ghost text-2xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          {ph}
        </span>
      ))}
      {info.officeHours && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="chip max-w-72 cursor-default truncate bg-fill-ghost text-2xs text-muted-foreground">
              {info.officeHours}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-96">
            {info.officeHours}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

/** Plain-regex mining of the extracted syllabus text. Transparent by design:
 *  chips always say "(from syllabus)", never pretending Canvas confirmed. */
function extractContact(text: string): ExtractedContact {
  const emails = [...new Set(text.match(/[\w.+-]+@[\w-]+\.[\w.-]+[a-z]/gi) ?? [])].slice(0, 4);
  const phones = [
    ...new Set(text.match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) ?? []),
  ].slice(0, 3);

  // The office-hours sentence: first line mentioning it, trimmed to a chip.
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /office\s*hours?/i.test(l) && l.length > 12 && l.length < 200);

  return { emails, phones, officeHours: line ?? null };
}
