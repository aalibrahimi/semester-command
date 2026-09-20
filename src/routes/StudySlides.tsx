/**
 * StudySlides — the deck view of a guide (route "/study/:course/:chapter/slides").
 *
 * Called by: the router.
 * Calls: buildDeck, GuideBlockView / FrameView.
 *
 * The deck is derived from the guide (src/study/index.ts), so every slide
 * has an exact anchor back into the book — the "Read in the book" button
 * opens the chapter scrolled to and flashing the paragraph the slide came
 * from. ← → or click to move; Esc goes back to the chapter.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, X } from "lucide-react";
import { GuideBlockView, Markdown } from "@/components/study/GuideBlocks";
import { ResourceChips } from "@/components/study/ResourceChips";
import { FrameView } from "@/components/study/Stepper";
import { cn } from "@/lib/utils";
import { buildDeck, courseBySlug } from "@/study";
import { guideById } from "@/study/loadGuides";

export default function StudySlides() {
  const { course: cslug, chapter: chslug } = useParams();
  const navigate = useNavigate();
  const course = courseBySlug(cslug);
  const chapter = guideById(cslug && chslug ? `${cslug}/${chslug}` : undefined);
  const deck = useMemo(() => (chapter ? buildDeck(chapter) : []), [chapter]);
  const [i, setI] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const slide = deck[i];
  const bookHref = chapter ? `/study/${chapter.id}` : "/study";

  // Each slide starts with its notes folded — the slide speaks first.
  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- reset tied to navigation
    setNotesOpen(false);
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowLeft") e.preventDefault();
      if (e.key === "ArrowRight" || e.key === " ") setI((v) => Math.min(deck.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
      if (e.key === "m") setNotesOpen((o) => !o);
      if (e.key === "Escape") navigate(bookHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.length, navigate, bookHref]);

  if (!course) return <Navigate to="/study" replace />;
  if (!chapter || !slide) return <Navigate to={bookHref} replace />;

  const c = slide.content;
  const kicker = c.kind === "section-title" ? `Section ${c.index} of ${c.total}` : slide.section;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-3">
        <span className="font-mono text-2xs text-muted-foreground">
          {course.code} · {chapter.lessons}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{chapter.title}</span>
        <Link
          to={`${bookHref}?at=${encodeURIComponent(slide.anchor)}`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost"
          title="Open the chapter at this exact paragraph"
        >
          <BookOpen className="h-3.5 w-3.5" /> Read in the book
        </Link>
        <Link to={bookHref} aria-label="Close slides" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-fill-ghost hover:text-foreground">
          <X className="h-4 w-4" />
        </Link>
      </div>

      {/* Slide */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-6">
        <div className="panel flex max-h-full w-full max-w-[880px] flex-col overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
          <div className="flex items-center gap-3 border-b border-border/60 px-8 py-3">
            <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{kicker}</span>
            {slide.title && c.kind === "block" && <span className="text-sm font-medium">{slide.title}</span>}
            {c.kind === "frame" && (
              <span data-numeric className="ml-auto font-mono text-2xs text-muted-foreground">
                step {c.index} / {c.total}
              </span>
            )}
          </div>
          <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto px-8", c.kind === "section-title" ? "items-center justify-center" : "justify-center py-6")}>
            {c.kind === "section-title" && (
              <div className="text-center">
                <div className="font-mono text-xs text-muted-foreground">{course.code} · {chapter.lessons}</div>
                <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{c.title}</h1>
              </div>
            )}
            {c.kind === "block" && (
              <div className="[&_p]:text-base [&_p]:leading-[1.8]">
                <GuideBlockView block={c.block} />
              </div>
            )}
            {c.kind === "frame" && (
              <div className="flex flex-col gap-6">
                <div className="text-base font-medium">{c.stepperTitle}</div>
                <FrameView frame={c.frame} large />
                <p className="text-base leading-[1.8] text-foreground/90">{c.frame.caption}</p>
              </div>
            )}
          </div>

          {/* The study shelf: presenter notes behind a button (press m),
              and verified go-deeper links. Absent when a slide has neither. */}
          {(slide.notes || (slide.resources?.length ?? 0) > 0) && (
            <div className="border-t border-border/60 px-8 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {slide.notes && (
                  <button
                    type="button"
                    onClick={() => setNotesOpen((o) => !o)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors duration-micro",
                      notesOpen
                        ? "border-brand/50 bg-brand/10 text-brand-fg"
                        : "border-border/70 bg-card text-foreground/85 hover:border-brand/50 hover:text-brand-fg",
                    )}
                    title="Toggle the deeper explanation (m)"
                  >
                    <Lightbulb className="h-3 w-3" />
                    {notesOpen ? "Less" : "More explanation"}
                    <ChevronDown
                      className={cn("h-3 w-3 transition-transform duration-micro", notesOpen && "rotate-180")}
                    />
                  </button>
                )}
                <ResourceChips resources={slide.resources} />
              </div>
              {notesOpen && slide.notes && (
                <div className="mt-2.5 rounded-xl bg-fill-ghost/60 px-4 py-3 text-sm leading-relaxed">
                  <Markdown md={slide.notes} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 border-t border-border/60 px-6 py-3">
        <button
          type="button"
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-fill-ghost hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {deck.map((s, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Slide ${k + 1}`}
              className={cn(
                "h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-micro",
                k === i ? "bg-brand" : k < i ? "bg-foreground/30" : "bg-border",
                s.content.kind === "section-title" && "max-w-3 shrink-0",
              )}
            />
          ))}
        </div>
        <span data-numeric className="font-mono text-2xs text-muted-foreground">
          {i + 1} / {deck.length}
        </span>
        <button
          type="button"
          onClick={() => setI((v) => Math.min(deck.length - 1, v + 1))}
          disabled={i === deck.length - 1}
          className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
