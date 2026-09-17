/**
 * StudyRecall — the Recall view of a guide (wireframe B): one big card at a
 * time, SM-2 grading, a queue rail that says why these cards.
 *
 * Route: /study/:course/:chapter/recall (?focus=<blockId,...> narrows the
 * deck — the Map's "Drill this cluster" uses it).
 * Called by: the router, the view tab strip, later the Map.
 * Calls: study/recall (cards + queue), study/mastery (records), GuideChrome.
 *
 * Keyboard: space reveals; 1–4 grade Again / Hard / Good / Easy once revealed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Inline } from "@/components/study/Blocks";
import { GuideTopRow } from "@/components/study/GuideChrome";
import { cn } from "@/lib/utils";
import { courseBySlug, daysUntil, formatDate } from "@/study";
import { guideById } from "@/study/loadGuides";
import { previewIntervals, recordReview, useMastery, isDue, type GuideMastery } from "@/study/mastery";
import { buildQueue, cardsFor, counts, intervalLabel, isShaky, nextDue, shakyQueue, CARD_KIND_LABEL, type Card } from "@/study/recall";

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

export default function StudyRecall() {
  const { course: cslug, chapter: chslug } = useParams();
  const [params] = useSearchParams();
  const course = courseBySlug(cslug);
  const guide = guideById(cslug && chslug ? `${cslug}/${chslug}` : undefined);
  const mastery = useMastery(guide?.id ?? "");

  const focus = params.get("focus")?.split(",").filter(Boolean);
  const cards = useMemo(() => {
    if (!guide) return [];
    const all = cardsFor(guide);
    return focus?.length ? all.filter((c) => focus.includes(c.blockId)) : all;
  }, [guide, params]); // eslint-disable-line react-hooks/exhaustive-deps

  // The queue is built once per session (and on "review shaky"), so grading
  // a card doesn't reshuffle the cards still ahead of it.
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [session, setSession] = useState({ reviewed: 0, misses: 0 });
  useEffect(() => {
    if (queue === null && mastery.loaded) setQueue(buildQueue(cards, mastery));
  }, [queue, mastery, cards]);

  const card = queue?.[pos];
  const grade = useCallback(
    async (g: 0 | 1 | 2 | 3) => {
      if (!card || !guide) return;
      setSession((s) => ({ reviewed: s.reviewed + 1, misses: s.misses + (g === 0 ? 1 : 0) }));
      setRevealed(false);
      setPos((p) => p + 1);
      await recordReview(guide.id, card.itemId, g);
    },
    [card, guide],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        if (card) setRevealed(true);
      } else if (revealed && /^[1-4]$/.test(e.key)) void grade((Number(e.key) - 1) as 0 | 1 | 2 | 3);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, grade]);

  if (!course) return <Navigate to="/study" replace />;
  if (!guide) return <Navigate to={`/study/${course.slug}`} replace />;

  const c = counts(cards, mastery);
  const reason = examReason(course);
  const kinds = [...new Set(cards.map((k) => k.kind))];
  const iv = card ? previewIntervals(mastery.reviews[card.itemId], guide.id, card.itemId) : null;
  const section = card ? guide.sections[card.sectionIndex] : undefined;

  const reviewShaky = () => {
    setQueue(shakyQueue(cards, mastery));
    setPos(0);
    setRevealed(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border/60 px-5 pb-3 pt-4">
        <GuideTopRow
          guide={guide}
          courseCode={course.code}
          active="recall"
          right={
            <div className="flex items-center gap-4 text-[13px]">
              <span><b className="font-semibold text-brand-fg">{c.due}</b> <span className="text-muted-foreground">due now</span></span>
              <span><b className="font-semibold text-at-risk-fg">{c.shaky}</b> <span className="text-muted-foreground">shaky</span></span>
              <span><b className="font-semibold text-on-track-fg">{c.mastered}</b> <span className="text-muted-foreground">mastered</span></span>
            </div>
          }
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Centre ──────────────────────────────────────────────────── */}
        <section aria-label="Card" className="flex min-w-0 flex-1 flex-col" style={{ padding: "40px 64px" }}>
          {card && section ? (
            <>
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-mono uppercase">Card {pos + 1} / {queue!.length}</span> · from §{card.sectionIndex + 1} {section.heading}
                </span>
                <span>{lastSeenLine(mastery, card)}</span>
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card" style={{ padding: 48 }}>
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Prompt</div>
                <p className="mt-2 text-[26px] font-medium leading-[1.4] tracking-tight">
                  <Inline text={card.prompt} />
                </p>
                {card.mono && (
                  <p className="mt-4 whitespace-pre-wrap font-mono text-[20px] leading-relaxed text-foreground/85">
                    <Inline text={card.mono} />
                  </p>
                )}

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
                      <Link
                        to={`/study/${guide.id}?s=${card.sectionId}&at=${encodeURIComponent(card.blockId)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-block text-xs text-brand-fg hover:underline"
                      >
                        open in guide → §{card.sectionIndex + 1}, bullet {card.bullet}
                      </Link>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      tap to reveal <kbd className="ml-1 font-mono text-2xs opacity-60">space</kbd>
                    </div>
                  )}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-4" style={{ gap: 10 }}>
                {GRADES.map((b) => (
                  <button
                    key={b.g}
                    type="button"
                    disabled={!revealed}
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
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-card text-center" style={{ padding: 48 }}>
              <div className="font-display text-xl font-semibold tracking-tight">{queue && queue.length ? "Queue done." : "Nothing due right now."}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {session.reviewed} card{session.reviewed === 1 ? "" : "s"} reviewed · {session.misses} missed
                {nextDue(cards, mastery) ? ` · next due ${nextDue(cards, mastery)!.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : ""}
              </p>
              <button
                type="button"
                onClick={reviewShaky}
                disabled={shakyQueue(cards, mastery).length === 0}
                className="mt-5 flex items-center gap-1.5 rounded-lg border border-at-risk/50 px-3 py-2 text-xs font-medium text-at-risk-fg hover:bg-at-risk/10 disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Review shaky anyway ({shakyQueue(cards, mastery).length})
              </button>
            </div>
          )}
        </section>

        {/* ── Right rail ──────────────────────────────────────────────── */}
        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-border bg-fill-ghost/40 xl:flex" style={{ padding: "24px 20px" }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Queue · why these cards</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {reason ? `${reason} ` : ""}Cards tagged 'costs points' and anything you missed are front-loaded.
          </p>
          <ol className="mt-4 flex flex-col gap-2">
            {guide.sections.map((s, si) => {
              const inSec = cards.filter((k) => k.sectionId === s.id);
              if (!inSec.length) return null;
              const done = inSec.filter((k) => !isDue(mastery.reviews[k.itemId])).length;
              const shaky = inSec.some((k) => isShaky(mastery.reviews[k.itemId]));
              const active = card?.sectionId === s.id;
              return (
                <li key={s.id} className={cn("rounded-lg border p-3 text-xs", active ? "border-border bg-card" : "border-border/50")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("line-clamp-1", active ? "font-medium" : "text-muted-foreground")}>
                      §{si + 1} {s.heading}
                    </span>
                    <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">
                      {done} / {inSec.length}
                      {shaky && <span className="text-at-risk-fg"> · shaky</span>}
                    </span>
                  </div>
                  {active && (
                    <div className="mt-2 flex gap-0.5">
                      {inSec.map((k) => (
                        <span
                          key={k.itemId}
                          className={cn(
                            "h-1 flex-1 rounded-full",
                            k.itemId === card!.itemId ? "bg-brand" : !isDue(mastery.reviews[k.itemId]) ? "bg-on-track" : "bg-border",
                          )}
                        />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
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
