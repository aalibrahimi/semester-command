/**
 * Contacts — instructors and TAs per course (SPEC.md §5, screen 4).
 *
 * Called by: the router, at "/contacts".
 * Calls: ipc list_instructors / save_instructor_note / set_instructor_starred
 * / syllabi; useCourses for course names and order; localPrefs nicknames.
 *
 * # Redesign (2026-08-23): professor-first card grid
 *
 * The old layout gave every course a full-width band, so four professors and
 * two announcement shells consumed the whole screen with mostly-empty rows.
 * Now the people who matter are the layout: a grid of contact cards, one per
 * professor, each carrying its course's identity color. Everything else —
 * TAs, the six section teachers on umbrella shells — collapses into one
 * "everyone else" drawer at the bottom, where the star still promotes
 * anyone into the grid.
 *
 * # Who is "my professor"?
 *
 * A course with exactly one teacher gets that teacher automatically;
 * otherwise the user stars theirs once (a local flag that survives sync).
 *
 * # Contact info
 *
 * Canvas withholds instructor emails from students (verified live), but
 * syllabi carry email, phone and office hours — cards show what the shared
 * syllabus miner finds, labelled with its source.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, Clock, Mail, Phone, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourses } from "@/hooks/useCourses";
import { listInstructors, saveInstructorNote, setInstructorStarred, syllabi } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { courseShort } from "@/lib/courseLabel";
import { chipStyle } from "@/lib/courseColor";
import { useNicknames } from "@/lib/localPrefs";
import { extractFacts, type SyllabusFacts } from "@/lib/syllabusFacts";
import type { CourseSummary, CourseSyllabus, InstructorRow } from "@/types";

export default function Contacts() {
  const { courses } = useCourses();
  const nicknames = useNicknames();
  const [instructors, setInstructors] = useState<InstructorRow[] | null>(null);
  const [syllabusData, setSyllabusData] = useState<CourseSyllabus[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const facts = useMemo(() => {
    const map = new Map<string, SyllabusFacts>();
    for (const c of syllabusData) {
      const text = c.files.map((f) => f.extractedText ?? "").join("\n");
      if (text.trim()) map.set(c.courseId, extractFacts(text));
    }
    return map;
  }, [syllabusData]);

  const labelOf = (c: CourseSummary) => nicknames[c.id] ?? courseShort(c.courseCode ?? c.name);

  // Professors into the grid; everyone else into the drawer. A gradeable
  // course with several teachers and no star gets a visible pick-prompt —
  // that decision shouldn't hide in a collapsed drawer.
  const { cards, needsStar, drawer, drawerCount } = useMemo(() => {
    const visible = courses.filter((c) => !c.hidden);
    const cards: { p: InstructorRow; course: CourseSummary }[] = [];
    const needsStar: { course: CourseSummary; people: InstructorRow[] }[] = [];
    const drawer: { course: CourseSummary; people: InstructorRow[] }[] = [];
    for (const course of visible) {
      const people = (instructors ?? []).filter((i) => i.courseId === course.id);
      if (people.length === 0) continue;
      const starred = people.filter((p) => p.starred);
      const teachers = people.filter((p) => p.role === "teacher");
      const professors = starred.length > 0 ? starred : teachers.length === 1 ? teachers : [];
      for (const p of professors) cards.push({ p, course });
      const rest = people.filter((p) => !professors.includes(p));
      if (professors.length === 0 && course.gradeable) {
        needsStar.push({ course, people: rest });
      } else if (rest.length > 0) {
        drawer.push({ course, people: rest });
      }
    }
    return {
      cards,
      needsStar,
      drawer,
      drawerCount: drawer.reduce((n, g) => n + g.people.length, 0),
    };
  }, [courses, instructors]);

  const anySyllabus = syllabusData.some((c) => c.files.length > 0);

  return (
    <>
      <ScreenHeader
        title="Contacts"
        subtitle="The people who grade you, one card each."
      />

      {instructors === null ? (
        <div className="mx-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : cards.length === 0 && needsStar.length === 0 && drawer.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No instructors synced"
          description="Names and roles come from Canvas. Emails and phone numbers usually live in the syllabus — import syllabi and they show up here automatically."
        />
      ) : (
        <div className="mx-8 mb-10 flex flex-col gap-6">
          {/* ── The grid: one card per professor ─────────────────────────── */}
          {cards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map(({ p, course }) => (
                <ProfessorCard
                  key={`${p.id}-${p.courseId}`}
                  person={p}
                  course={course}
                  label={labelOf(course)}
                  info={facts.get(course.id)}
                  onToggleStar={() => toggleStar(p, refresh)}
                />
              ))}
            </div>
          )}

          {/* One nudge, not one per card: contacts arrive with syllabi. */}
          {!anySyllabus && cards.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <BookOpen className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
              Emails, phones and office hours live in the syllabus —{" "}
              <Link to="/syllabi" className="text-brand-fg underline underline-offset-2">
                import yours
              </Link>{" "}
              and these cards fill themselves in.
            </p>
          )}

          {/* ── Courses still waiting for a star ─────────────────────────── */}
          {needsStar.map(({ course, people }) => (
            <section key={course.id}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {labelOf(course)} — which one is yours?
              </h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Canvas lists {people.length} section teachers on this umbrella course. Star
                yours once and they get a card up top, here and everywhere else.
              </p>
              <div className="overflow-hidden rounded-xl border border-border/60">
                {people.map((p) => (
                  <CompactRow
                    key={`${p.id}-${p.courseId}`}
                    person={p}
                    onToggleStar={() => toggleStar(p, refresh)}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* ── Everyone else, folded away ───────────────────────────────── */}
          {drawer.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setDrawerOpen((o) => !o)}
                className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-micro",
                    !drawerOpen && "-rotate-90",
                  )}
                />
                Everyone else Canvas lists
                <span data-numeric className="font-mono text-xs tabular-nums">
                  {drawerCount}
                </span>
                <span className="ml-auto text-2xs text-muted-foreground/70">
                  TAs, section teachers, advising shells — star anyone to promote them
                </span>
              </button>
              {drawerOpen && (
                <div className="mt-2 flex flex-col gap-4">
                  {drawer.map(({ course, people }) => (
                    <div key={course.id}>
                      <h3 className="mb-1 px-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
                        {labelOf(course)}
                      </h3>
                      <div className="overflow-hidden rounded-xl border border-border/60">
                        {people.map((p) => (
                          <CompactRow
                            key={`${p.id}-${p.courseId}`}
                            person={p}
                            onToggleStar={() => toggleStar(p, refresh)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
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
