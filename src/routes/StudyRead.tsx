/**
 * StudyRead — the Read view of a guide (wireframe A): one section per screen.
 *
 * Route: /study/:course/:chapter (?s=<sectionId>).
 *
 * Called by: the router, StudyCourse ("Read"), later the Map's "Read §n".
 * Calls: study/loadGuides, study/mastery (the one store), GuideBlocks,
 * Practice (the section's "Do it yourself" exercises).
 *
 * Layout: top bar (back · title · segmented progress · "Section n of N ·
 * ~m min left" · Play as slides · view tabs) / left rail (sections with a
 * mastery dot each, legend) / centre (the section's blocks) / right rail
 * ("Test me" over this section's checks, then a scratchpad) / bottom
 * actions (Prev · Mark shaky · Got it → next).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Circle, PencilLine, Presentation, X } from "lucide-react";
import { GuideBlocks } from "@/components/study/GuideBlocks";
import { GuideTopRow } from "@/components/study/GuideChrome";
import { Inline } from "@/components/study/Blocks";
import { Practice } from "@/components/study/Practice";
import { cn } from "@/lib/utils";
import { courseBySlug } from "@/study";
import type { CheckBlock, Guide, GuideSection } from "@/study/guide";
import { guideById } from "@/study/loadGuides";
import { recordReview, saveScratch, sectionStatus, setSectionStatus, useMastery, type GuideMastery, type SectionStatus } from "@/study/mastery";

/* ── Mastery colours: one place, used by every view ─────────────────────── */

const DOT: Record<SectionStatus, string> = {
  mastered: "bg-on-track border-on-track",
  shaky: "bg-at-risk border-at-risk",
  unread: "bg-transparent border-muted-foreground/50",
};
const SEG: Record<SectionStatus, string> = {
  mastered: "bg-on-track",
  shaky: "bg-at-risk",
  unread: "bg-border",
};

function MasteryDot({ status, className }: { status: SectionStatus; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px]", DOT[status], className)} />;
}

/* ── Right rail: Test me ────────────────────────────────────────────────── */

function TestMe({ guide, section, mastery }: { guide: Guide; section: GuideSection; mastery: GuideMastery }) {
  const checks = useMemo(() => section.blocks.filter((b): b is CheckBlock => b.type === "check"), [section]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ knew: 0, missed: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  // A new section resets the run.
  useEffect(() => {
    setI(0);
    setRevealed(false);
    setTally({ knew: 0, missed: 0 });
  }, [section.id]);

  const current = checks[i];
  const done = checks.length > 0 && i >= checks.length;

  const answer = useCallback(
    async (grade: 0 | 2) => {
      if (!current) return;
      setTally((t) => (grade === 0 ? { ...t, missed: t.missed + 1 } : { ...t, knew: t.knew + 1 }));
      setRevealed(false);
      setI((v) => v + 1);
      await recordReview(guide.id, current.id, grade);
    },
    [current, guide.id],
  );

  // Keyboard: space reveals, 1 = Missed, 2 = Knew it (when the panel has focus).
  const onKey = (e: React.KeyboardEvent) => {
    if (!current) return;
    if (e.key === " " && !revealed) {
      e.preventDefault();
      setRevealed(true);
    } else if (revealed && e.key === "1") void answer(0);
    else if (revealed && e.key === "2") void answer(2);
  };

  if (checks.length === 0) {
    return <p className="text-xs leading-relaxed text-muted-foreground">No self-test questions in this section.</p>;
  }

  const seen = current ? mastery.reviews[current.id] : undefined;

  return (
    <div ref={boxRef} tabIndex={0} onKeyDown={onKey} className="rounded-xl border border-border/70 bg-card shadow-card outline-none focus-visible:ring-1 focus-visible:ring-ring">
      <div className="flex items-center gap-2 border-b border-border/60 px-3.5 py-2.5">
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Test me · this section</span>
        <span data-numeric className="ml-auto font-mono text-2xs text-muted-foreground">
          {Math.min(i + 1, checks.length)} / {checks.length}
        </span>
      </div>
      {done ? (
        <div className="px-3.5 py-4 text-sm">
          <div className="font-medium">Done.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Knew {tally.knew} · missed {tally.missed}. Missed ones come back first in Recall.
          </div>
          <button
            type="button"
            onClick={() => {
              setI(0);
              setTally({ knew: 0, missed: 0 });
            }}
            className="mt-3 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost"
          >
            Run again
          </button>
        </div>
      ) : (
        <div className="px-3.5 py-3.5">
          <p className="text-sm leading-relaxed">
            <Inline text={current.prompt} />
          </p>
          {seen && seen.misses > 0 && <p className="mt-1.5 text-2xs text-at-risk-fg">Missed {seen.misses}× before</p>}
          {revealed ? (
            <>
              <div className="mt-3 rounded-lg border border-border/60 bg-fill-ghost/50 px-3 py-2.5 text-sm leading-relaxed">
                <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Answer</span>
                <Inline text={current.answer} />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void answer(0)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-at-risk/50 px-2.5 py-1.5 text-xs font-medium text-at-risk-fg hover:bg-at-risk/10"
                >
                  <X className="h-3.5 w-3.5" /> Missed <kbd className="ml-1 font-mono text-2xs opacity-60">1</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => void answer(2)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-on-track/50 px-2.5 py-1.5 text-xs font-medium text-on-track-fg hover:bg-on-track/10"
                >
                  <Check className="h-3.5 w-3.5" /> Knew it <kbd className="ml-1 font-mono text-2xs opacity-60">2</kbd>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-3 w-full rounded-lg border border-border px-2.5 py-2 text-xs font-medium hover:bg-fill-ghost"
            >
              Show answer <kbd className="ml-1 font-mono text-2xs opacity-60">space</kbd>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Right rail: scratchpad (saved per section, debounced) ──────────────── */

function Scratchpad({ guide, section, mastery }: { guide: Guide; section: GuideSection; mastery: GuideMastery }) {
  const stored = mastery.sections[section.id]?.scratch ?? "";
  const [text, setText] = useState(stored);
  const dirty = useRef(false);
  useEffect(() => {
    setText(stored);
    dirty.current = false;
  }, [section.id, stored]);
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => void saveScratch(guide.id, section.id, text), 500);
    return () => clearTimeout(t);
  }, [text, guide.id, section.id]);
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        <PencilLine className="h-3.5 w-3.5" /> Scratchpad · this section
      </span>
      <textarea
        value={text}
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
        }}
        rows={6}
        spellCheck={false}
        placeholder="Notes, a worked example, what confused you…"
        className="w-full resize-y rounded-lg border border-border/70 bg-background px-3 py-2 font-mono text-[12.5px] leading-relaxed outline-none focus:border-brand/50"
      />
    </label>
  );
}

/* ── The view ───────────────────────────────────────────────────────────── */

export default function StudyRead() {
  const { course: cslug, chapter: chslug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const course = courseBySlug(cslug);
  const guide = guideById(cslug && chslug ? `${cslug}/${chslug}` : undefined);
  const mastery = useMastery(guide?.id ?? "");

  const sections = guide?.sections ?? [];
  const wanted = params.get("s");
  const idx = Math.max(0, sections.findIndex((s) => s.id === wanted));
  const section = sections[idx];

  // Arriving from Recall / Map: scroll to the block and flash it; otherwise start at the top.
  useEffect(() => {
    const at = params.get("at");
    const el = at ? document.getElementById(at) : null;
    if (!el) {
      document.querySelector("main")?.scrollTo({ top: 0 });
      return;
    }
    el.scrollIntoView({ block: "center" });
    el.classList.add("ring-2", "ring-brand", "rounded-lg");
    const t = setTimeout(() => el.classList.remove("ring-2", "ring-brand", "rounded-lg"), 1800);
    return () => clearTimeout(t);
  }, [section?.id, params]);

  if (!course) return <Navigate to="/study" replace />;
  if (!guide || !section) return <Navigate to={`/study/${course.slug}`} replace />;

  const go = (i: number) => {
    const s = sections[i];
    if (s) setParams({ s: s.id });
  };
  const status = sectionStatus(mastery, section.id);
  const remaining = sections.slice(idx).length;
  const minsLeft = Math.max(1, Math.round((guide.estimatedMinutes * remaining) / sections.length));
  const isLast = idx === sections.length - 1;
  // Exercises drill their matched section; ones the migration couldn't place land on the last section.
  const exercises = guide.exercises.filter((e) => e.sectionRef === section.id || (isLast && !sections.some((s) => s.id === e.sectionRef)));

  const markAndAdvance = async (next: SectionStatus) => {
    await setSectionStatus(guide.id, section.id, next);
    if (next === "mastered" && !isLast) go(idx + 1);
    if (next === "mastered" && isLast) navigate(`/study/${course.slug}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col px-6 pb-16 pt-4">
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="mb-6 flex flex-col gap-3 border-b border-border/60 pb-4">
        <GuideTopRow
          guide={guide}
          courseCode={course.code}
          active="read"
          right={
            <Link
              to={`/study/${guide.id}/slides`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost"
            >
              <Presentation className="h-3.5 w-3.5" /> Play as slides
            </Link>
          }
        />
        <div className="flex items-center gap-4">
          <div role="progressbar" aria-label="Section progress" aria-valuemin={1} aria-valuemax={sections.length} aria-valuenow={idx + 1} className="flex flex-1 gap-1">
            {sections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`${s.heading} — ${sectionStatus(mastery, s.id)}`}
                onClick={() => go(i)}
                className={cn("h-1.5 flex-1 rounded-full transition-colors duration-micro", SEG[sectionStatus(mastery, s.id)], i === idx && "ring-2 ring-brand/60 ring-offset-1 ring-offset-background")}
              />
            ))}
          </div>
          <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">
            Section {idx + 1} of {sections.length} · ~{minsLeft} min left
          </span>
        </div>
      </header>

      <div className="flex gap-8">
        {/* ── Left rail ───────────────────────────────────────────────── */}
        <nav aria-label="Sections" className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-4">
            <ol className="flex flex-col gap-px">
              {sections.map((s, i) => {
                const st = sectionStatus(mastery, s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={i === idx ? "true" : undefined}
                      onClick={() => go(i)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs leading-snug transition-colors duration-micro",
                        i === idx ? "bg-card font-medium text-foreground shadow-card" : "text-muted-foreground hover:bg-fill-ghost hover:text-foreground",
                      )}
                    >
                      <MasteryDot status={st} className="mt-1" />
                      <span className="line-clamp-2">
                        <span className="mr-1.5 font-mono text-2xs opacity-60">{i + 1}</span>
                        {s.heading}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-5 flex flex-col gap-1.5 border-t border-border/60 pt-3 text-2xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MasteryDot status="mastered" /> mastered
              </div>
              <div className="flex items-center gap-2">
                <MasteryDot status="shaky" /> shaky
              </div>
              <div className="flex items-center gap-2">
                <MasteryDot status="unread" /> unread
              </div>
            </div>
          </div>
        </nav>

        {/* ── Centre ──────────────────────────────────────────────────── */}
        <article className="min-w-0 flex-1">
          <h2 className="mb-5 flex items-baseline gap-3 font-display text-xl font-semibold tracking-tight">
            <span className="font-mono text-sm font-normal text-muted-foreground">{idx + 1}</span>
            {section.heading}
            {status !== "unread" && (
              <span className={cn("ml-auto text-2xs font-medium uppercase tracking-wider", status === "mastered" ? "text-on-track-fg" : "text-at-risk-fg")}>{status}</span>
            )}
          </h2>
          <GuideBlocks blocks={section.blocks} />

          {exercises.length > 0 && (
            <section className="mt-12">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <PencilLine className="h-4 w-4 text-brand-fg" /> Do it yourself
              </h3>
              <Practice exercises={exercises} scope={guide.id} />
            </section>
          )}

          {/* ── Bottom actions ────────────────────────────────────────── */}
          <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-border/60 pt-5">
            <button
              type="button"
              onClick={() => go(idx - 1)}
              disabled={idx === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-fill-ghost disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => void markAndAdvance("shaky")}
                className="flex items-center gap-1.5 rounded-lg border border-at-risk/50 px-3 py-2 text-xs font-medium text-at-risk-fg hover:bg-at-risk/10"
              >
                <Circle className="h-3.5 w-3.5" /> Mark shaky
              </button>
              <button
                type="button"
                onClick={() => void markAndAdvance("mastered")}
                className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Check className="h-3.5 w-3.5" /> Got it {isLast ? "→ back to course" : "→ next section"}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </footer>
        </article>

        {/* ── Right rail ──────────────────────────────────────────────── */}
        <aside className="hidden w-[320px] shrink-0 xl:block">
          <div className="sticky top-4 flex flex-col gap-5">
            <TestMe guide={guide} section={section} mastery={mastery} />
            <Scratchpad guide={guide} section={section} mastery={mastery} />
          </div>
        </aside>
      </div>
    </div>
  );
}
