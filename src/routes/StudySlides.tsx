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
 *
 * Lecture mode (L, or the Lecture button): the deck reads itself aloud with
 * the system voice (presenter notes when a slide has them, the block's own
 * text otherwise), shows the words as a caption, and advances when the
 * sentence ends. Figures build up one tooltip group at a time, each group
 * narrated by its title. "Essentials" trims a long deck to the deliberate
 * slides (titled ones, figures, steppers, sims, definitions, traps, why).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, Pause, Play, Volume2, X } from "lucide-react";
import { GuideBlockView, Markdown } from "@/components/study/GuideBlocks";
import { ResourceChips } from "@/components/study/ResourceChips";
import { FrameView } from "@/components/study/Stepper";
import { cn } from "@/lib/utils";
import { Inline } from "@/components/study/Blocks";
import { buildDeck, courseBySlug } from "@/study";
import { figureAtStep, figureGroups, isEssential, narration } from "@/study/lecture";
import { guideById } from "@/study/loadGuides";

const RATES = [0.9, 1, 1.15, 1.3];

export default function StudySlides() {
  const { course: cslug, chapter: chslug } = useParams();
  const navigate = useNavigate();
  const course = courseBySlug(cslug);
  const chapter = guideById(cslug && chslug ? `${cslug}/${chslug}` : undefined);
  const fullDeck = useMemo(() => (chapter ? buildDeck(chapter) : []), [chapter]);
  const [essentials, setEssentials] = useState(() => fullDeck.length > 28);
  const deck = useMemo(() => (essentials ? fullDeck.filter(isEssential) : fullDeck), [fullDeck, essentials]);
  const [i, setI] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const slide = deck[Math.min(i, Math.max(0, deck.length - 1))];
  const bookHref = chapter ? `/study/${chapter.id}` : "/";

  // Figure build-up: how many tooltip groups are showing on this slide.
  const groups = useMemo(() => (slide?.content.kind === "block" && slide.content.block.type === "figure" ? figureGroups(slide.content.block.svg) : []), [slide]);
  const [step, setStep] = useState(0);

  // Lecture mode: speech + auto-advance.
  const [lecture, setLecture] = useState(false);
  const [rateIdx, setRateIdx] = useState(1);
  const [caption, setCaption] = useState("");
  const speaking = useRef<SpeechSynthesisUtterance | null>(null);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  const stopSpeech = useCallback(() => {
    if (canSpeak) window.speechSynthesis.cancel();
    speaking.current = null;
  }, [canSpeak]);

  // Each slide starts with its notes folded and its figure at step 0.
  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- reset tied to navigation
    setNotesOpen(false);
    setStep(0);
  }, [i, essentials]);

  const advance = useCallback(() => {
    if (groups.length > 0 && step < groups.length) setStep((s) => s + 1);
    else setI((v) => Math.min(deck.length - 1, v + 1));
  }, [groups.length, step, deck.length]);
  const back = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
    else setI((v) => Math.max(0, v - 1));
  }, [step]);

  // Speak the current slide/step in lecture mode; move on when it ends.
  useEffect(() => {
    if (!lecture || !slide) return;
    const text = narration(slide, groups.length > 0 ? Math.min(step, groups.length) : undefined);
    setCaption(text);
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = RATES[rateIdx];
    const atEnd = i >= deck.length - 1 && (groups.length === 0 || step >= groups.length);
    u.onend = () => {
      if (speaking.current !== u) return;
      speaking.current = null;
      if (!atEnd) setTimeout(() => advance(), 450);
      else setLecture(false);
    };
    speaking.current = u;
    window.speechSynthesis.speak(u);
    return () => {
      if (speaking.current === u) {
        speaking.current = null;
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecture, i, step, rateIdx, essentials]);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowLeft") e.preventDefault();
      if (e.key === "ArrowRight" || e.key === " ") advance();
      if (e.key === "ArrowLeft") back();
      if (e.key === "m") setNotesOpen((o) => !o);
      if (e.key === "l") setLecture((o) => !o);
      if (e.key === "Escape") {
        stopSpeech();
        navigate(bookHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, back, navigate, bookHref, stopSpeech]);

  if (!course) return <Navigate to="/" replace />;
  if (!chapter || !slide) return <Navigate to={bookHref} replace />;

  const c = slide.content;
  const kicker = c.kind === "section-title" ? `Section ${c.index} of ${c.total}` : slide.section;
  const building = groups.length > 0 && step < groups.length;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-3">
        <span className="font-mono text-2xs text-muted-foreground">
          {course.code} · {chapter.lessons}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{chapter.title}</span>
        {fullDeck.length > 20 && (
          <button
            type="button"
            onClick={() => {
              setEssentials((v) => !v);
              setI(0);
            }}
            className={cn("rounded-full border px-2.5 py-1 text-2xs font-medium", essentials ? "border-brand/50 bg-brand/10 text-brand-fg" : "border-border/70 text-muted-foreground hover:text-foreground")}
            title="Trim to the deliberate slides: titled ones, figures, steppers, sims, definitions, traps"
          >
            {essentials ? `Essentials · ${deck.length}` : `All · ${deck.length}`}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (lecture) stopSpeech();
            setLecture((v) => !v);
          }}
          className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium", lecture ? "border-brand/50 bg-brand/10 text-brand-fg" : "border-border hover:bg-fill-ghost")}
          title={canSpeak ? "Read the deck aloud and advance by itself (l)" : "Captions only: this browser has no speech"}
        >
          {lecture ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />} {lecture ? "Pause lecture" : "Lecture"}
        </button>
        {lecture && (
          <button type="button" onClick={() => setRateIdx((r) => (r + 1) % RATES.length)} className="rounded-lg border border-border px-2 py-1.5 font-mono text-2xs hover:bg-fill-ghost" title="Speech rate">
            {RATES[rateIdx]}×
          </button>
        )}
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
            {c.kind === "block" && c.block.type === "figure" && groups.length > 0 ? (
              <figure className="flex flex-col gap-3">
                <svg viewBox={c.block.viewBox} className="mx-auto h-auto w-full max-w-[640px]" dangerouslySetInnerHTML={{ __html: figureAtStep(c.block.svg, step) }} />
                <figcaption className="text-base leading-[1.8] text-foreground/90">{building ? groups[step] : c.block.caption}</figcaption>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {groups.map((_, k) => (
                      <button key={k} type="button" onClick={() => setStep(k)} aria-label={`Part ${k + 1}`} className={cn("h-1.5 w-5 rounded-full", k < step ? "bg-foreground/30" : k === step && building ? "bg-brand" : "bg-border")} />
                    ))}
                    <button type="button" onClick={() => setStep(groups.length)} aria-label="All parts" className={cn("h-1.5 w-5 rounded-full", !building ? "bg-brand" : "bg-border")} />
                  </div>
                  <span data-numeric className="font-mono text-2xs text-muted-foreground">
                    {building ? `part ${step + 1} of ${groups.length}` : "complete"}
                  </span>
                </div>
              </figure>
            ) : (
              c.kind === "block" && (
                <div className="[&_p]:text-base [&_p]:leading-[1.8]">
                  <GuideBlockView block={c.block} />
                </div>
              )
            )}
            {c.kind === "frame" && (
              <div className="flex flex-col gap-6">
                <div className="text-base font-medium">{c.stepperTitle}</div>
                <FrameView frame={c.frame} large />
                <p className="text-base leading-[1.8] text-foreground/90">
                  <Inline text={c.frame.caption} />
                </p>
              </div>
            )}
          </div>

          {lecture && caption && (
            <div className="flex items-start gap-2 border-t border-border/60 bg-fill-ghost/50 px-8 py-2.5 text-sm leading-relaxed text-foreground/90">
              <Play className="mt-1 h-3 w-3 shrink-0 text-brand-fg" />
              <span className="line-clamp-3">{caption}</span>
            </div>
          )}

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
          onClick={back}
          disabled={i === 0 && step === 0}
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
          onClick={advance}
          disabled={i === deck.length - 1 && !building}
          className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {building ? "Next part" : "Next"} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
