/**
 * StudyRecall — spaced review: one big card at a time, SM-2 grading, a
 * queue rail that says why these cards.
 *
 * Routes:
 *   /study/:course/:chapter/recall   one guide (?focus=<blockId,...> narrows
 *                                    the deck; the Map's "Drill this cluster")
 *   /study/:course/recall            every written chapter of the course,
 *                                    queues interleaved so chapters alternate
 *
 * Called by: the router, the view tab strip, the Map, the Study home plan.
 * Calls: study/recall (cards + queue), study/mastery (records, one store per
 * guide), study/drills (drill cards), GuideChrome, AnswerInput (typed cards).
 *
 * Production cards (cloze, drill) are typed and checked before grading:
 * a wrong answer grades itself Again; a right one still asks Hard / Good /
 * Easy, because how hard it felt is information SM-2 needs.
 *
 * Keyboard: space reveals; 1–4 grade Again / Hard / Good / Easy once revealed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Check, RotateCcw, X } from "lucide-react";
import { Inline } from "@/components/study/Blocks";
import { AnswerInput, Steps } from "@/components/study/Drill";
import { GuideTopRow } from "@/components/study/GuideChrome";
import { cn } from "@/lib/utils";
import { courseBySlug, daysUntil, formatDate } from "@/study";
import { grade as gradeAnswer } from "@/study/drill";
import { drillsForGuide } from "@/study/drills";
import type { Guide } from "@/study/guide";
import { guideById, guidesForCourse } from "@/study/loadGuides";
import { examCapDays, previewIntervals, recordAttempt, recordReview, useMasteries, isDue, type GuideMastery } from "@/study/mastery";
import { buildQueue, cardsFor, counts, interleave, intervalLabel, isShaky, nextDue, shakyQueue, CARD_KIND_LABEL, type Card } from "@/study/recall";

const GRADES = [
  { g: 0 as const, label: "Again", cls: "border-critical/50 bg-critical/10 text-critical-fg hover:bg-critical/15" },
  { g: 1 as const, label: "Hard", cls: "border-at-risk/50 bg-at-risk/10 text-at-risk-fg hover:bg-at-risk/15" },
  { g: 2 as const, label: "Good", cls: "border-on-track/50 bg-on-track/10 text-on-track-fg hover:bg-on-track/15" },
  { g: 3 as const, label: "Easy", cls: "border-brand/50 bg-brand/10 text-brand-fg hover:bg-brand/15" },
];

function lastSeenLine(m: GuideMastery, card: Card): string {
  const r = m.reviews[card.itemId];
  if (!r?.lastSeen) return "new card";
  const seen = new Date(r.lastSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const missed = r.misses === 0 ? "never missed" : r.misses === 1 ? "missed once" : r.misses === 2 ? "missed twice" : `missed ${r.misses}×`;
  return `last seen ${seen} · ${missed}`;
}

/** "Quiz 2 is Friday." from the course's next graded event, if any. */
function examReason(course: { deadlines: { date: string; label: string; kind: string }[]; exam: { label: string; date: string } }): string | null {
  const today = new Date();
  const events = [...course.deadlines.filter((d) => d.kind === "exam" || d.kind === "quiz"), { date: course.exam.date, label: course.exam.label, kind: "exam" }]
    .filter((d) => daysUntil(d.date, today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = events[0];
  if (!next) return null;
  const days = daysUntil(next.date, today);
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : days < 7 ? new Date(next.date + "T00:00").toLocaleDateString(undefined, { weekday: "long" }) : formatDate(next.date, "long");
  const label = next.label.replace(/\s*[·(].*$/, "").replace(/^(FINAL EXAM|MIDTERM)$/i, (w) => w.charAt(0) + w.slice(1).toLowerCase());
  return `${label} is ${when}.`;
}

function Stats({ t }: { t: { due: number; shaky: number; mastered: number } }) {
  return (
    <div className="flex items-center gap-4 text-[13px]">
      <span>
        <b className="font-semibold text-brand-fg">{t.due}</b> <span className="text-muted-foreground">due now</span>
      </span>
      <span>
        <b className="font-semibold text-at-risk-fg">{t.shaky}</b> <span className="text-muted-foreground">shaky</span>
      </span>
      <span>
        <b className="font-semibold text-on-track-fg">{t.mastered}</b> <span className="text-muted-foreground">mastered</span>
      </span>
    </div>
  );
}

export default function StudyRecall() {
  const { course: cslug, chapter: chslug } = useParams();
  const [params] = useSearchParams();
  const course = courseBySlug(cslug);
  const courseWide = !chslug;
  const guides = useMemo<Guide[]>(() => {
    if (!course) return [];
    if (courseWide) return guidesForCourse(course.slug, course.guides);
    const g = guideById(`${course.slug}/${chslug}`);
    return g ? [g] : [];
  }, [course, courseWide, chslug]);
  const guideIds = useMemo(() => guides.map((g) => g.id), [guides]);
  const masteries = useMasteries(guideIds);
  const allLoaded = guides.length > 0 && guides.every((g) => masteries[g.id]?.loaded);

  const focus = params.get("focus")?.split(",").filter(Boolean);
  const cardsByGuide = useMemo(() => {
    const out: Record<string, Card[]> = {};
    for (const g of guides) {
      const all = cardsFor(g, drillsForGuide(g.id));
      out[g.id] = focus?.length && !courseWide ? all.filter((c) => focus.includes(c.blockId)) : all;
    }
    return out;
  }, [guides, params, courseWide]); // eslint-disable-line react-hooks/exhaustive-deps
  const cards = useMemo(() => guides.flatMap((g) => cardsByGuide[g.id]), [guides, cardsByGuide]);

  // The queue is built once per session (and on "review shaky"), so grading
  // a card doesn't reshuffle the cards still ahead of it.
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<{ correct: boolean; diagnosis?: string } | null>(null);
  const [session, setSession] = useState({ reviewed: 0, misses: 0 });
  useEffect(() => {
    if (queue === null && allLoaded) setQueue(interleave(guides.map((g) => buildQueue(cardsByGuide[g.id], masteries[g.id]))));
  }, [queue, allLoaded, guides, cardsByGuide, masteries]);

  const card = queue?.[pos];
  const m = card ? masteries[card.guideId] : undefined;
  const guide = card ? guides.find((g) => g.id === card.guideId) : guides[0];

  const reset = () => {
    setRevealed(false);
    setTyped("");
    setChecked(null);
  };

  const grade = useCallback(
    async (g: 0 | 1 | 2 | 3) => {
      if (!card) return;
      setSession((s) => ({ reviewed: s.reviewed + 1, misses: s.misses + (g === 0 ? 1 : 0) }));
      setRevealed(false);
      setTyped("");
      setChecked(null);
      setPos((p) => p + 1);
      await recordReview(card.guideId, card.itemId, g);
    },
    [card],
  );

  // Typed cards: check, log drill attempts, and lock a miss to Again.
  const check = useCallback(() => {
    if (!card?.typed || typed.trim() === "") return;
    const r = gradeAnswer(card.typed, typed);
    const meant = card.typed.kind === "choice" ? (card.typed.options[Number(typed)] ?? typed) : typed;
    const diagnosis = r.correct ? undefined : card.drill?.inst.diagnose?.(meant);
    setChecked({ correct: r.correct, diagnosis });
    setRevealed(true);
    if (card.drill) {
      void recordAttempt({
        guideId: card.guideId,
        sectionId: card.sectionId,
        drillId: card.drill.drill.id,
        seed: card.drill.seed,
        correct: r.correct,
        input: r.input,
        expected: r.expected,
        diagnosis: diagnosis ?? null,
        ms: null,
        source: "read",
      });
    }
  }, [card, typed]);

  const missLocked = checked !== null && !checked.correct;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        if (card && !card.typed) setRevealed(true);
      } else if (revealed && /^[1-4]$/.test(e.key)) {
        const g = (Number(e.key) - 1) as 0 | 1 | 2 | 3;
        if (missLocked && g !== 0) return;
        void grade(g);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, grade, missLocked]);

  if (!course) return <Navigate to="/study" replace />;
  if (!guide) return <Navigate to={`/study/${course.slug}`} replace />;

  const totals = guides.reduce(
    (acc, g) => {
      const c = counts(cardsByGuide[g.id], masteries[g.id]);
      return { due: acc.due + c.due, shaky: acc.shaky + c.shaky, mastered: acc.mastered + c.mastered };
    },
    { due: 0, shaky: 0, mastered: 0 },
  );
  const reason = examReason(course);
  const kinds = [...new Set(cards.map((k) => k.kind))];
  const iv = card && m ? previewIntervals(m.reviews[card.itemId], card.guideId, card.itemId) : null;
  const section = card && guide ? guide.sections[card.sectionIndex] : undefined;
  const cap = examCapDays(guide.id);
  const shakyAll = () => interleave(guides.map((g) => shakyQueue(cardsByGuide[g.id], masteries[g.id])));
  const reviewShaky = () => {
    setQueue(shakyAll());
    setPos(0);
    reset();
  };
  const nd = guides
    .map((g) => nextDue(cardsByGuide[g.id], masteries[g.id]))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const guideHref = card ? `/study/${card.guideId}?s=${card.sectionId}&at=${encodeURIComponent(card.blockId)}` : "#";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border/60 px-5 pb-3 pt-4">
        {courseWide ? (
          <div className="flex items-center gap-4">
            <Link to={`/study/${course.slug}`} className="text-xs text-muted-foreground hover:text-foreground">
              ← {course.code}
            </Link>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">Recall · every chapter, interleaved</span>
            <Stats t={totals} />
          </div>
        ) : (
          <GuideTopRow guide={guide} courseCode={course.code} active="recall" right={<Stats t={totals} />} />
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Centre ──────────────────────────────────────────────────── */}
        <section aria-label="Card" className="flex min-w-0 flex-1 flex-col" style={{ padding: "40px 64px" }}>
          {card && section && m ? (
            <>
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-mono uppercase">
                    Card {pos + 1} / {queue!.length}
                  </span>{" "}
                  · {courseWide && guide ? `${guide.title} · ` : ""}§{card.sectionIndex + 1} {section.heading}
                  <span className="ml-2 rounded bg-fill-ghost px-1.5 py-px font-mono text-2xs uppercase tracking-wider">{CARD_KIND_LABEL[card.kind]}</span>
                </span>
                <span>{lastSeenLine(m, card)}</span>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-border bg-card" style={{ padding: 48 }}>
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{card.typed ? "Answer it" : "Prompt"}</div>
                <p className={cn("mt-2 font-medium leading-[1.4] tracking-tight", card.kind === "drill" ? "text-[20px]" : "text-[26px]")}>
                  <Inline text={card.prompt} />
                </p>
                {card.mono && (
                  <p className={cn("mt-4 whitespace-pre-wrap font-mono leading-relaxed text-foreground/85", card.kind === "drill" ? "text-[14px]" : "text-[20px]")}>
                    <Inline text={card.mono} />
                  </p>
                )}

                {card.typed ? (
                  <div className="mt-6 flex flex-col gap-3">
                    <AnswerInput answer={card.typed} value={typed} onChange={setTyped} onSubmit={check} disabled={revealed} />
                    {!revealed && (
                      <button
                        type="button"
                        onClick={check}
                        disabled={typed.trim() === ""}
                        className="self-start rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
                      >
                        Check <kbd className="ml-1 font-mono text-2xs opacity-60">↵</kbd>
                      </button>
                    )}
                    {checked && (
                      <div className={cn("rounded-lg border px-3.5 py-3 text-sm", checked.correct ? "border-on-track/50 bg-on-track/[0.08]" : "border-at-risk/50 bg-at-risk/[0.08]")}>
                        <div className={cn("flex items-center gap-2 font-medium", checked.correct ? "text-on-track-fg" : "text-at-risk-fg")}>
                          {checked.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {checked.correct ? "Right." : "Not yet."}
                        </div>
                        {!checked.correct && checked.diagnosis && (
                          <p className="mt-1 leading-relaxed">
                            <Inline text={checked.diagnosis} />
                          </p>
                        )}
                        {!checked.correct && !card.drill && (
                          <p className="mt-1">
                            The missing words: <b>{card.answer}</b>
                          </p>
                        )}
                        {card.drill && <Steps steps={card.drill.inst.steps} />}
                        {!checked.correct && <p className="mt-2 text-2xs text-muted-foreground">A miss grades itself Again: it comes back in a minute.</p>}
                      </div>
                    )}
                    {card.kind !== "drill" && (
                      <Link to={guideHref} className="self-start text-xs text-brand-fg hover:underline">
                        open in guide → §{card.sectionIndex + 1}, bullet {card.bullet}
                      </Link>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    disabled={revealed}
                    aria-label={revealed ? "Answer" : "Reveal answer"}
                    className={cn(
                      "mt-auto w-full rounded-[10px] border bg-background text-left transition-colors duration-micro",
                      revealed ? "cursor-default border-border" : "border-dashed border-border hover:border-brand/50",
                    )}
                    style={{ padding: 20 }}
                  >
                    {revealed ? (
                      <>
                        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-on-track-fg">Answer · revealed</div>
                        <p className="mt-2 text-base leading-relaxed">
                          <Inline text={card.answer} />
                        </p>
                        <Link to={guideHref} onClick={(e) => e.stopPropagation()} className="mt-3 inline-block text-xs text-brand-fg hover:underline">
                          open in guide → §{card.sectionIndex + 1}, bullet {card.bullet}
                        </Link>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        tap to reveal <kbd className="ml-1 font-mono text-2xs opacity-60">space</kbd>
                      </div>
                    )}
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-4" style={{ gap: 10 }}>
                {GRADES.map((b) => (
                  <button
                    key={b.g}
                    type="button"
                    disabled={!revealed || (missLocked && b.g !== 0)}
                    onClick={() => void grade(b.g)}
                    aria-label={`${b.label}, next in ${intervalLabel(iv![b.g])}`}
                    className={cn("flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors duration-micro disabled:opacity-40", b.cls)}
                  >
                    {b.label}
                    <span className="text-xs font-normal text-muted-foreground">· {intervalLabel(iv![b.g])}</span>
                    <kbd className="font-mono text-2xs opacity-50">{b.g + 1}</kbd>
                  </button>
                ))}
              </div>
              {cap !== null && (
                <p className="mt-2 text-center text-2xs text-muted-foreground">
                  Intervals are capped at {cap} day{cap === 1 ? "" : "s"}: an exam is close, so nothing is scheduled past it.
                </p>
              )}
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-card text-center" style={{ padding: 48 }}>
              <div className="font-display text-xl font-semibold tracking-tight">{queue && queue.length ? "Queue done." : "Nothing due right now."}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {session.reviewed} card{session.reviewed === 1 ? "" : "s"} reviewed · {session.misses} missed
                {nd ? ` · next due ${nd.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : ""}
              </p>
              <button
                type="button"
                onClick={reviewShaky}
                disabled={shakyAll().length === 0}
                className="mt-5 flex items-center gap-1.5 rounded-lg border border-at-risk/50 px-3 py-2 text-xs font-medium text-at-risk-fg hover:bg-at-risk/10 disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Review shaky anyway ({shakyAll().length})
              </button>
              {!courseWide && course.guides.length > 1 && (
                <Link to={`/study/${course.slug}/recall`} className="mt-3 text-xs text-brand-fg hover:underline">
                  Review every chapter of {course.code}, interleaved →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ── Right rail ──────────────────────────────────────────────── */}
        <aside className="hidden w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-fill-ghost/40 xl:flex" style={{ padding: "24px 20px" }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Queue · why these cards</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {reason ? `${reason} ` : ""}Cards tagged 'costs points' and anything you missed are front-loaded.
            {courseWide ? " Chapters alternate on purpose: mixed practice is what an exam is." : ""}
          </p>
          <ol className="mt-4 flex flex-col gap-2">
            {guides.map((g) =>
              g.sections.map((s, si) => {
                const inSec = cardsByGuide[g.id].filter((k) => k.sectionId === s.id);
                if (!inSec.length) return null;
                const mm = masteries[g.id];
                const done = inSec.filter((k) => !isDue(mm.reviews[k.itemId])).length;
                const shaky = inSec.some((k) => isShaky(mm.reviews[k.itemId]));
                const active = card?.guideId === g.id && card?.sectionId === s.id;
                return (
                  <li key={`${g.id}#${s.id}`} className={cn("rounded-lg border p-3 text-xs", active ? "border-border bg-card" : "border-border/50")}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("line-clamp-1", active ? "font-medium" : "text-muted-foreground")}>
                        {courseWide ? `${g.lessons} · ` : ""}§{si + 1} {s.heading}
                      </span>
                      <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">
                        {done} / {inSec.length}
                        {shaky && <span className="text-at-risk-fg"> · shaky</span>}
                      </span>
                    </div>
                    {active && (
                      <div className="mt-2 flex gap-0.5">
                        {inSec.map((k) => (
                          <span key={k.itemId} className={cn("h-1 flex-1 rounded-full", k.itemId === card!.itemId ? "bg-brand" : !isDue(mm.reviews[k.itemId]) ? "bg-on-track" : "bg-border")} />
                        ))}
                      </div>
                    )}
                  </li>
                );
              }),
            )}
          </ol>
          <div className="mt-auto pt-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Card types in this deck</div>
            <ul className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {kinds.map((k) => (
                <li key={k}>{CARD_KIND_LABEL[k]}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
