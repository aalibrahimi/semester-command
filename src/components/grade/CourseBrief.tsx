/**
 * CourseBrief — a course, talked through (the default course view).
 *
 * Called by: routes/CourseDetail.tsx (the "Brief" layout; "Everything" is
 * the full hero + donut + table).
 * Calls: lib/briefing for the voice. Numbers arrive computed from Rust and
 * are only phrased here (§10).
 *
 * The job: you click a course and immediately see, in plain language and a
 * readable list, where you stand and what homework needs doing. The dense
 * analysis stays one toggle away.
 */
import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { casualDue, impactPhrase } from "@/lib/briefing";
import { dueShort, pct, points } from "@/lib/format";
import { floorForCanvasCourse } from "@/lib/gradeFloors";
import { stripShouting } from "@/lib/stripShouting";
import { cn } from "@/lib/utils";
import type { AssignmentDetail, CourseSummary } from "@/types";

export function CourseBrief({
  summary: s,
  assignments,
  onOpen,
}: {
  summary: CourseSummary;
  assignments: AssignmentDetail[];
  onOpen: (id: string) => void;
}) {
  const now = new Date();
  const open = openItems(assignments, now);
  const settled = assignments.filter((a) => !open.includes(a));
  const anyGraded = assignments.some((a) => a.score !== null);
  const floor = floorForCanvasCourse(s.courseCode);

  return (
    <div className="mx-8 mb-10 flex max-w-3xl flex-col gap-4">
      {/* ── Grade header: the numbers, the gap bar, and the notes that
          explain them in plain words ──────────────────────────────────── */}
      <section className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        {anyGraded ? (
          <>
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <div
                  data-numeric
                  className="font-display text-display font-semibold leading-none tabular-nums"
                >
                  {pct(s.grade.currentPct)}
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  current{s.currentLetter ? ` · ${s.currentLetter}` : ""}
                </div>
              </div>
              <div>
                <div
                  data-numeric
                  className="font-mono text-3xl font-medium tabular-nums text-muted-foreground"
                >
                  {pct(s.grade.projectedPct)}
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  projected — if you stopped today
                </div>
              </div>
              <div className="mb-1 ml-auto text-right text-xs text-muted-foreground">
                target {s.targetLetter} ({s.targetPct.toFixed(0)}%)
              </div>
            </div>
            <GradeGapBar
              projectedPct={s.grade.projectedPct}
              maxPossiblePct={s.maxPossiblePct}
              targetPct={s.targetPct}
              floorPct={floor?.pct}
              floorLabel={
                floor ? `${floor.letter} required for degree credit (${floor.pct}%)` : undefined
              }
              status={s.status}
            />
          </>
        ) : (
          <div className="font-display text-2xl font-semibold">No grades posted yet</div>
        )}

        {/* The helpful notes: what the numbers mean, and what to do next. */}
        <div className="border-t border-border/40 pt-4">
          <p className="text-sm leading-relaxed">{standingSentence(s, anyGraded)}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {open.length > 0
              ? nextUpSentence(open[0], now)
              : "Nothing left to turn in right now — everything gradeable is submitted."}
          </p>
        </div>
      </section>

      {/* ── The homework ──────────────────────────────────────────────── */}
      {open.length > 0 && (
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Needs doing
            <span className="ml-2 align-middle text-2xs font-normal text-muted-foreground">
              {open.length} item{open.length === 1 ? "" : "s"}, most urgent first
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {open.map((a) => (
              <BriefRow key={a.id} a={a} now={now} onOpen={() => onOpen(a.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ── The done pile, out of the way ─────────────────────────────── */}
      {settled.length > 0 && <SettledSection items={settled} onOpen={onOpen} />}
    </div>
  );
}

/* ── Sentences ───────────────────────────────────────────────────────────── */

/** What the numbers above MEAN — interpretation, not repetition. The header
 *  already shows current/projected/target; this says what to do with them. */
function standingSentence(s: CourseSummary, anyGraded: boolean): string {
  if (!anyGraded) {
    return `Your target is ${s.targetLetter} (${s.targetPct.toFixed(0)}%) — the numbers start the moment the first score lands.`;
  }
  const best = `The best still possible from here is ${s.maxPossiblePct.toFixed(1)}%`;
  if (s.maxPossiblePct < s.targetPct) {
    return `The ${s.targetLetter} is mathematically out of reach now — ${best.toLowerCase()}. Pick a new target and protect it; don't chase a number that can't happen.`;
  }
  if (s.status === "onTrack") {
    return `You're on track for the ${s.targetLetter}. The gap between current and projected is just ungraded work — keep turning things in and it closes on its own. ${best}.`;
  }
  if (s.missingCount > 0) {
    return `The ${s.targetLetter} is still reachable, but ${s.missingCount === 1 ? "a missing item is" : `${s.missingCount} missing items are`} dragging the projection down — clear ${s.missingCount === 1 ? "it" : "those"} first. ${best}.`;
  }
  return `You're under the ${s.targetLetter} line right now, but it's still winnable — the hatched part of the bar is the grade still in play. ${best}.`;
}

/** "First up: Homework 8 — it's due tomorrow night at 11:59p, a solid 12% of
 *  the grade." */
function nextUpSentence(a: AssignmentDetail, now: Date): string {
  const title = stripShouting(a.name).title;
  const parts = [casualDue(a.dueAt, now)];
  if (a.impactPct > 0.5) parts.push(impactPhrase(a.impactPct));
  else if (a.pointsPossible !== null && a.pointsPossible > 0)
    parts.push(`${a.pointsPossible} points`);
  return `First up: ${title} — ${parts.join(", ")}.`;
}

/* ── Sorting ─────────────────────────────────────────────────────────────── */

/** Open = still yours to do. Missing/overdue first (oldest fire first),
 *  then by due date, undated last. */
function openItems(assignments: AssignmentDetail[], now: Date): AssignmentDetail[] {
  const isOpen = (a: AssignmentDetail) =>
    a.score === null && !a.submitted && !a.excused && !a.omitted;
  const overdue = (a: AssignmentDetail) =>
    a.missing || (a.dueAt !== null && new Date(a.dueAt).getTime() < now.getTime());
  return assignments
    .filter(isOpen)
    .sort((x, y) => {
      const px = overdue(x) ? 0 : 1;
      const py = overdue(y) ? 0 : 1;
      if (px !== py) return px - py;
      return (x.dueAt ?? "9999").localeCompare(y.dueAt ?? "9999");
    });
}

/* ── Rows ────────────────────────────────────────────────────────────────── */

function BriefRow({
  a,
  now,
  onOpen,
}: {
  a: AssignmentDetail;
  now: Date;
  onOpen: () => void;
}) {
  const title = stripShouting(a.name).title;
  const late = a.missing || (a.dueAt !== null && new Date(a.dueAt).getTime() < now.getTime());
  const hoursLeft = a.dueAt ? (new Date(a.dueAt).getTime() - now.getTime()) / 3_600_000 : null;
  const soon = !late && hoursLeft !== null && hoursLeft <= 72;

  const sub: string[] = [casualDue(a.dueAt, now)];
  if (a.pointsPossible !== null && a.pointsPossible > 0) {
    sub.push(`${a.pointsPossible} pts`);
    if (a.impactPct > 0.5) sub.push(`worth ${a.impactPct.toFixed(1)}% of the grade`);
  } else if (a.impactPct > 0.5) {
    sub.push(`worth ${a.impactPct.toFixed(1)}% of the grade`);
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-2xl border border-border/50 px-4 py-3 text-left transition-colors duration-micro hover:bg-fill-ghost/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full",
          late ? "bg-critical" : soon ? "bg-at-risk" : "border border-muted-foreground/40",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
          {sub.join(" · ")}
        </span>
      </span>
      {a.missing && (
        <span className="chip shrink-0 bg-critical/15 text-2xs font-medium text-critical-fg">
          missing
        </span>
      )}
      {!a.missing && late && (
        <span className="chip shrink-0 bg-critical/15 text-2xs font-medium text-critical-fg">
          overdue
        </span>
      )}
      <span
        data-numeric
        className="w-14 shrink-0 text-right font-mono text-2xs tabular-nums text-muted-foreground"
      >
        {a.dueAt ? dueShort(a.dueAt) : "—"}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
    </button>
  );
}

/** Graded / submitted / excused work, collapsed by default — reassurance,
 *  not homework. */
function SettledSection({
  items,
  onOpen,
}: {
  items: AssignmentDetail[];
  onOpen: (id: string) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const graded = items.filter((a) => a.score !== null).length;
  const sorted = [...items].sort((x, y) => (y.dueAt ?? "").localeCompare(x.dueAt ?? ""));

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
      <button
        type="button"
        onClick={() => setOpenState((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro",
            !openState && "-rotate-90",
          )}
        />
        <h2 className="font-display text-lg font-semibold tracking-tight">Done</h2>
        <span className="text-2xs text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} · {graded} graded
        </span>
      </button>
      {openState && (
        <div className="mt-3 flex flex-col gap-1">
          {sorted.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpen(a.id)}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left transition-colors duration-micro hover:bg-fill-ghost/60"
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  a.score !== null ? "text-on-track-fg" : "text-muted-foreground/60",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground group-hover:text-foreground">
                {stripShouting(a.name).title}
              </span>
              {a.excused && (
                <span className="chip shrink-0 bg-fill-ghost text-2xs text-muted-foreground">
                  excused
                </span>
              )}
              <span
                data-numeric
                className="shrink-0 font-mono text-xs tabular-nums"
              >
                {a.score !== null
                  ? points(a.score, a.pointsPossible)
                  : a.excused
                    ? "—"
                    : "awaiting grade"}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
