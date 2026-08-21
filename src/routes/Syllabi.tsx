/**
 * Syllabi — every course's syllabus, searchable for the policies that matter.
 *
 * Called by: the router, at "/syllabi".
 * Calls: ipc syllabi / fetchSyllabusFromCanvas / importSyllabusFile, the
 * dialog plugin (native file picker), the opener plugin (open the PDF).
 *
 * Master-detail on purpose: a course rail on the left, one syllabus in view
 * on the right — the user asked for less scrolling, and eight syllabi
 * stacked vertically is the opposite of that.
 *
 * The policy chips are keyword highlighters, not comprehension: clicking
 * "Late work" marks every occurrence of late/penalty/deduct in the extracted
 * text and jumps to the first. Dumb, transparent, and useful — smart policy
 * extraction is LLM territory and out of scope by SPEC.md §0.
 */
import { useCallback, useEffect, useState } from "react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { BookOpen, CloudDownload, ExternalLink, FileText, FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSyllabusFromCanvas, importSyllabusFile, syllabi } from "@/lib/ipc";
import { countMatches, sanitize } from "@/lib/canvasHtml";
import { Highlighted } from "@/components/layout/Highlighted";
import { cn } from "@/lib/utils";
import type { CourseSyllabus } from "@/types";

/** The policies worth one click. Keywords are matched case-insensitively in
 *  the extracted text; tune freely — this is a lens, not a parser. */
const POLICY_CHIPS: { label: string; terms: string[] }[] = [
  { label: "Late work", terms: ["late", "penalt", "deduct"] },
  { label: "Make-up", terms: ["make-up", "makeup", "make up"] },
  { label: "Office hours", terms: ["office hour", "office:"] },
  { label: "Attendance", terms: ["attendance", "absence", "absent"] },
  { label: "Exams", terms: ["midterm", "final exam", "exam date"] },
  { label: "Grading", terms: ["grading", "grade breakdown", "weight", "curve"] },
  { label: "Contact", terms: ["@sjsu.edu", "phone", "email me"] },
];

export default function Syllabi() {
  const [courses, setCourses] = useState<CourseSyllabus[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTerms, setActiveTerms] = useState<string[]>([]);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await syllabi();
      setCourses(data);
      // Default to the first course that actually has material.
      setSelectedId(
        (prev) =>
          prev ??
          (data.find((c) => c.files.length > 0 || c.syllabusHtml) ?? data[0])?.courseId ??
          null,
      );
    } catch {
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    // Synchronising with the Rust backend; the fetch resolves into state.
    // oxlint-disable-next-line set-state-in-effect
    void refresh();
  }, [refresh]);

  const selected = courses?.find((c) => c.courseId === selectedId) ?? null;
  // Search box and chips share the highlight mechanism; search wins while
  // it has text so what you typed is always what is marked.
  const terms = query.trim().length >= 2 ? [query.trim()] : activeTerms;

  return (
    <>
      <ScreenHeader
        title="Syllabi"
        subtitle="Late policies, make-up rules, office hours — searchable in one place."
      />

      {courses === null ? (
        <div className="mx-8 flex gap-4">
          <Skeleton className="h-64 w-56 rounded-2xl" />
          <Skeleton className="h-96 flex-1 rounded-2xl" />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Sync Canvas first — syllabus documents are pulled per course, and anything the files API hides can be imported by hand."
        />
      ) : (
        <div className="mx-8 mb-10 flex items-start gap-4">
          {/* ── Course rail ─────────────────────────────────────────────── */}
          <nav className="flex w-56 shrink-0 flex-col gap-0.5">
            {courses.map((c) => {
              const has = c.files.length > 0 || c.syllabusHtml !== null;
              return (
                <button
                  key={c.courseId}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.courseId);
                    setActiveTerms([]);
                    setActiveChip(null);
                    setQuery("");
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors duration-micro",
                    c.courseId === selectedId
                      ? "bg-card font-medium shadow-card"
                      : "text-muted-foreground hover:bg-fill-ghost hover:text-foreground",
                  )}
                >
                  <FileText
                    className={cn("h-3.5 w-3.5 shrink-0", !has && "opacity-30")}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {c.courseCode ?? c.courseName ?? c.courseId}
                  </span>
                  {c.files.length > 0 && (
                    <span data-numeric className="font-mono text-2xs text-muted-foreground">
                      {c.files.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── Viewer ──────────────────────────────────────────────────── */}
          {selected && (
            <SyllabusViewer
              key={selected.courseId}
              course={selected}
              terms={terms}
              activeChip={activeChip}
              query={query}
              onQuery={setQuery}
              onChip={(label, chipTerms) => {
                setQuery("");
                if (activeChip === label) {
                  setActiveChip(null);
                  setActiveTerms([]);
                } else {
                  setActiveChip(label);
                  setActiveTerms(chipTerms);
                }
              }}
              onChanged={refresh}
            />
          )}
        </div>
      )}
    </>
  );
}

function SyllabusViewer({
  course,
  terms,
  activeChip,
  query,
  onQuery,
  onChip,
  onChanged,
}: {
  course: CourseSyllabus;
  terms: string[];
  activeChip: string | null;
  query: string;
  onQuery: (q: string) => void;
  onChip: (label: string, terms: string[]) => void;
  onChanged: () => void;
}) {
  const [fetching, setFetching] = useState(false);

  // Everything searchable for this course, files first (the common case).
  const textBlocks = course.files
    .filter((f) => f.extractedText)
    .map((f) => ({ label: f.filename, text: f.extractedText as string }));
  const fullText = textBlocks.map((b) => b.text).join("\n\n");

  const fetchFromCanvas = () => {
    setFetching(true);
    fetchSyllabusFromCanvas(course.courseId)
      .then((n) => {
        toast[n > 0 ? "success" : "info"](
          n > 0
            ? `Stored ${n} document${n === 1 ? "" : "s"} from Canvas.`
            : "Canvas has no visible syllabus files for this course — import it below.",
        );
        if (n > 0) onChanged();
      })
      .catch(() => toast.error("Could not reach Canvas — check the connection."))
      .finally(() => setFetching(false));
  };

  const importFile = () => {
    void openFileDialog({
      multiple: false,
      filters: [{ name: "Documents", extensions: ["pdf", "html", "htm", "txt", "md", "docx"] }],
    }).then((path) => {
      if (typeof path !== "string") return;
      importSyllabusFile(course.courseId, path)
        .then((row) => {
          toast.success(
            row.extractedText
              ? `Imported ${row.filename} — text extracted and searchable.`
              : `Imported ${row.filename} — stored, but this format isn't text-searchable yet.`,
          );
          onChanged();
        })
        .catch((e: unknown) => toast.error(String((e as { message?: string })?.message ?? e)));
    });
  };

  // Jump to the first highlight after the marks render.
  useEffect(() => {
    if (terms.length === 0) return;
    const t = window.setTimeout(() => {
      document.getElementById("first-match")?.scrollIntoView({ block: "center" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [terms]);

  const matches = fullText ? countMatches(fullText, terms) : 0;

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      {/* Header: actions */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
          {course.courseCode ?? course.courseName}
        </h2>
        <Button size="sm" variant="outline" onClick={fetchFromCanvas} disabled={fetching}>
          <CloudDownload className="mr-1.5 h-3.5 w-3.5" />
          {fetching ? "Checking…" : "Fetch from Canvas"}
        </Button>
        <Button size="sm" variant="outline" onClick={importFile}>
          <FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Import file
        </Button>
      </div>

      {/* Stored documents */}
      {course.files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {course.files.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void openPath(f.localPath)}
              className="chip gap-1 bg-fill-ghost text-2xs text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost-selected hover:text-foreground"
              title="Open the original document"
            >
              <ExternalLink className="h-3 w-3" />
              {f.filename}
              {f.source !== "api" && <Badge variant="secondary" className="text-2xs">manual</Badge>}
            </button>
          ))}
        </div>
      )}

      {fullText || course.syllabusHtml ? (
        <>
          {/* Search + policy chips */}
          {fullText && (
            <>
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/60 px-2.5">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  placeholder="Search this syllabus…"
                  className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                {terms.length > 0 && (
                  <span data-numeric className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
                    {matches} match{matches === 1 ? "" : "es"}
                  </span>
                )}
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {POLICY_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => onChip(chip.label, chip.terms)}
                    className={cn(
                      "chip text-2xs transition-colors duration-micro",
                      activeChip === chip.label && query === ""
                        ? "bg-brand text-white"
                        : "bg-fill-ghost text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* The text, with highlights */}
          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-fill-ghost/40 p-4">
            {textBlocks.map((block) => (
              <section key={block.label} className="mb-4">
                {textBlocks.length > 1 && (
                  <h3 className="mb-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                    {block.label}
                  </h3>
                )}
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                  <Highlighted text={block.text} terms={terms} />
                </pre>
              </section>
            ))}
            {course.syllabusHtml && (
              <div
                className="canvas-html text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitize(course.syllabusHtml) }}
              />
            )}
            {!fullText && course.files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Documents are stored but not text-searchable (extraction unsupported for this
                format) — open them with the buttons above.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
          Nothing here yet. <strong>Fetch from Canvas</strong> looks for files named “syllabus”
          in this course; if the professor keeps files hidden, download the syllabus from Canvas
          yourself and <strong>Import file</strong> — the text becomes searchable either way.
        </div>
      )}
    </div>
  );
}
