/**
 * Briefing — Triage's companion view: the app talks you through your day.
 *
 * Called by: routes/Triage.tsx when the Brief layout is active.
 * Calls: ipc courseDetail (hero enrichment: submission type, rubric),
 * syllabi (late-policy detail when the hero is late), debugDump (changes
 * note), useAuth (first name), useSync (footer sync age).
 *
 * The redo of the editorial direction, rebuilt around what actually landed
 * in the wireframe: a voice. Every section is written prose — what's next,
 * why it matters, the small details — assembled by lib/briefing.ts from
 * numbers Rust already computed. Nothing here does grade math (§10); this
 * file only decides what to SAY.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { courseDetail, debugDump, syllabi } from "@/lib/ipc";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { semesterWeekOf, upcomingAcademic } from "@/lib/academicCalendar";
import {
  casualDue,
  firstNameOf,
  greeting,
  impactPhrase,
  queueReason,
  submissionPhrase,
} from "@/lib/briefing";
import { extractFacts } from "@/lib/syllabusFacts";
import { minutes, pct, sinceSync } from "@/lib/format";
import { stripShouting } from "@/lib/stripShouting";
import { cn } from "@/lib/utils";
import type { CourseSummary, TriageRow } from "@/types";

const STATUS_WORD: Record<string, string> = {
  onTrack: "on track",
  atRisk: "at risk",
  critical: "critical",
  locked: "locked in",
};

/** Extra facts about the hero worth a sentence, fetched lazily. */
interface HeroDetail {
  submission: string | null;
  hasRubric: boolean;
  latePolicy: string | null;
}

export function Briefing({
  rows,
  courses,
  openTotal,
  dueThisWeek,
  labelOf,
  onOpen,
  onShowBoard,
}: {
  /** Ranked, done-filtered rows — rows[0] is the hero. */
  rows: TriageRow[];
  courses: CourseSummary[];
  openTotal: number;
  dueThisWeek: number;
  labelOf: (courseId: string, courseCode: string | null) => string;
  onOpen: (row: TriageRow) => void;
  onShowBoard: () => void;
}) {
  const [now] = useState(() => new Date());
  const { status: sync } = useSync();
  const { status: auth } = useAuth();
  const hero = rows.length > 0 ? rows[0] : null;
  const [heroDetail, setHeroDetail] = useState<HeroDetail | null>(null);

  // Small details for the hero: submission type + rubric from the course
  // payload, the late policy from the syllabus when it's actually late.
  useEffect(() => {
    if (!hero) return;
    let alive = true;
    const wantPolicy = hero.state !== "open";
    Promise.all([
      courseDetail(hero.courseId),
      wantPolicy ? syllabi() : Promise.resolve(null),
    ])
      .then(([d, syl]) => {
        if (!alive) return;
        const a = d.assignments.find((x) => x.id === hero.assignmentId);
        const text = syl
          ?.find((c) => c.courseId === hero.courseId)
          ?.files.map((f) => f.extractedText ?? "")
          .join("\n");
        setHeroDetail({
          submission: submissionPhrase(a?.submissionTypes ?? null),
          hasRubric: a?.hasRubric ?? false,
          latePolicy: text?.trim() ? extractFacts(text).latePolicy : null,
        });
      })
      .catch(() => {
        if (alive) setHeroDetail({ submission: null, hasRubric: false, latePolicy: null });
      });
    return () => {
      alive = false;
    };
  }, [hero]);

  const firstName = firstNameOf(auth.validatedAs);
  const semWeek = semesterWeekOf(now);
  const nextBreak = upcomingAcademic(now, 4).find((u) => u.span.kind !== "milestone");

  // "After that": the next few ranked items, each with a reason.
  const afterThat = rows.slice(1, 4);

  const missingRows = rows.filter((r) => r.state === "missing");
  const overdueRows = rows.filter(
    (r) => r.state === "open" && r.dueAt !== null && new Date(r.dueAt).getTime() < now.getTime(),
  );

  const anyGraded = courses.some((c) => c.grade.currentPct !== null);

  // This week, day by day, for the "coming up" list under the prose.
  const days = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = start + 7 * 86_400_000;
    const byDay = new Map<string, { date: Date; items: TriageRow[] }>();
    for (const r of rows) {
      if (!r.dueAt) continue;
      const t = new Date(r.dueAt).getTime();
      if (t < start || t >= end) continue;
      const d = new Date(r.dueAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const bucket = byDay.get(key) ?? { date: d, items: [] };
      bucket.items.push(r);
      byDay.set(key, bucket);
    }
    return [...byDay.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((d) => ({
        ...d,
        items: [...d.items].sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "")),
      }));
  }, [rows, now]);
  const weekCount = days.reduce((n, d) => n + d.items.length, 0);

  const load = useMemo(() => {
    let total = 0;
    let unestimated = 0;
    let heaviest: { name: string; mins: number } | null = null;
    for (const d of days) {
      const mins = d.items.reduce((s, r) => s + (r.estMinutes ?? 60), 0);
      unestimated += d.items.filter((r) => r.estMinutes === null).length;
      total += mins;
      if (!heaviest || mins > heaviest.mins) {
        heaviest = { name: d.date.toLocaleDateString(undefined, { weekday: "long" }), mins };
      }
    }
    return { total, unestimated, heaviest };
  }, [days]);

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  return (
    <div className="mx-auto mb-12 flex max-w-4xl flex-col gap-7 px-8">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 border-b-2 border-foreground/80 pb-4">
        <h1 className="font-display text-3xl font-semibold leading-tight">
          {greeting(now)}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {semWeek && ` · week ${semWeek.week} of ${semWeek.total}`}
          {nextBreak &&
            ` · ${nextBreak.span.label} ${
              nextBreak.startsInDays === 0
                ? "is here"
                : `in ${nextBreak.startsInDays} day${nextBreak.startsInDays === 1 ? "" : "s"}`
            }`}
        </p>
      </div>

      {/* ── The brief ────────────────────────────────────────────────────── */}
      {hero ? (
        <div className="flex flex-col gap-4 text-[17px] leading-relaxed">
          <p>
            First up:{" "}
            <button
              type="button"
              onClick={() => onOpen(hero)}
              className="border-b-2 border-brand font-medium hover:text-brand-fg"
            >
              {stripShouting(hero.name).title}
            </button>
            . It's {impactPhrase(hero.impactPct)} in {labelOf(hero.courseId, hero.courseCode)},
            and {casualDue(hero.dueAt, now)}.
            {hero.pointsPossible !== null &&
              hero.pointsPossible > 0 &&
              ` It's worth ${Number.isInteger(hero.pointsPossible) ? hero.pointsPossible : hero.pointsPossible.toFixed(1)} points.`}
            {heroDetail?.submission && ` On Canvas it's ${heroDetail.submission}.`}
            {heroDetail?.hasRubric &&
              " There's a rubric attached — worth a read before you start, so you know exactly what they're grading."}
            {hero.estMinutes !== null
              ? ` You pegged it at about ${minutes(hero.estMinutes)}.`
              : " You haven't estimated it yet — even a rough guess helps me lay out your week."}
          </p>
          {hero.state !== "open" && (
            <p className="text-critical-fg">
              Straight talk: Canvas has this one marked{" "}
              {hero.state === "missing" ? "missing" : "overdue"}. Getting it in late usually
              beats a zero.
              {heroDetail?.latePolicy &&
                ` Your syllabus says: "${heroDetail.latePolicy}"`}
            </p>
          )}

          {afterThat.length > 0 && (
            <div className="flex flex-col gap-2">
              <p>After that, here's how I'd order it:</p>
              <ol className="flex flex-col gap-2 pl-1">
                {afterThat.map((r, i) => (
                  <li key={r.assignmentId} className="flex gap-3">
                    <span data-numeric className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                      {i + 2}.
                    </span>
                    <span className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpen(r)}
                        className="font-medium hover:text-brand-fg hover:underline"
                      >
                        {stripShouting(r.name).title}
                      </button>{" "}
                      <span className="text-muted-foreground">
                        ({labelOf(r.courseId, r.courseCode)})
                      </span>{" "}
                      — {queueReason(r, now)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className={cn(missingRows.length + overdueRows.length > 0 && "text-critical-fg")}>
            {missingRows.length > 0
              ? `Heads up: ${missingRows.length} item${missingRows.length === 1 ? " is" : "s are"} marked missing — I've pushed ${missingRows.length === 1 ? "it" : "them"} up the list.`
              : overdueRows.length > 0
                ? `Heads up: ${overdueRows.length} item${overdueRows.length === 1 ? " is" : "s are"} past due but not yet marked missing — worth a look today.`
                : "Nothing's missing and nothing's overdue. You're clean — keep it that way."}
          </p>
        </div>
      ) : (
        <p className="text-[17px] leading-relaxed text-muted-foreground">
          The list is empty — everything gradeable is either submitted or marked done. Either
          you're genuinely ahead, or a sync is due.
        </p>
      )}

      {/* ── Coming up (the week, day by day) ─────────────────────────────── */}
      {days.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-border pt-5">
          <h2 className="text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Coming up
          </h2>
          {days.map(({ date, items }) => {
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            return (
              <div key={key} className="flex flex-col gap-1">
                <h3
                  className={cn(
                    "text-sm",
                    key === todayKey ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {key === todayKey
                    ? "Today"
                    : date.toLocaleDateString(undefined, { weekday: "long" })}
                </h3>
                {items.map((r) => (
                  <button
                    key={r.assignmentId}
                    type="button"
                    onClick={() => onOpen(r)}
                    className="group flex items-baseline gap-2 rounded-md px-1 py-0.5 text-left transition-colors duration-micro hover:bg-fill-ghost"
                  >
                    <span
                      className={cn(
                        "min-w-0 shrink truncate text-[15px]",
                        r.assignmentId === hero?.assignmentId &&
                          "border-b-2 border-brand font-medium",
                        r.state !== "open" && "text-critical-fg",
                      )}
                    >
                      {stripShouting(r.name).title}
                    </span>
                    <span
                      aria-hidden
                      className="min-w-4 flex-1 -translate-y-[3px] border-b border-dotted border-border group-hover:border-muted-foreground/50"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {labelOf(r.courseId, r.courseCode)}
                    </span>
                    <span
                      data-numeric
                      className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground/70"
                    >
                      {r.dueAt
                        ? new Date(r.dueAt)
                            .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                            .toLowerCase()
                            .replace(/\s?([ap])m$/, "$1")
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
          {rows.length - weekCount > 0 && (
            <button
              type="button"
              onClick={onShowBoard}
              className="mt-1 self-start text-sm text-brand-fg hover:underline"
            >
              + {rows.length - weekCount} more later or undated · see the full board →
            </button>
          )}
        </div>
      )}

      {/* ── The rest, still in a talking voice ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 border-t border-border pt-5 md:grid-cols-3">
        <VoiceNote label="Where you stand">
          {anyGraded ? (
            <div className="flex flex-col gap-1">
              {courses
                .filter((c) => c.grade.currentPct !== null)
                .map((c) => (
                  <Link
                    key={c.id}
                    to={`/courses/${c.id}`}
                    className="flex items-baseline gap-2 hover:underline"
                  >
                    <span className="min-w-0 truncate">{labelOf(c.id, c.courseCode)}</span>
                    <span data-numeric className="ml-auto shrink-0 font-mono text-xs tabular-nums">
                      {pct(c.grade.currentPct)}
                    </span>
                    <span className="shrink-0 text-2xs text-muted-foreground">
                      {STATUS_WORD[c.status] ?? c.status}
                    </span>
                  </Link>
                ))}
            </div>
          ) : (
            <p>
              No grades on the board yet — normal for {semWeek ? `week ${semWeek.week}` : "the start of term"}.
              The moment a score lands, I'll show you exactly where each course stands and what
              you'd need for your target.
            </p>
          )}
        </VoiceNote>

        <VoiceNote label="The load">
          {load.total === 0 ? (
            <p>Nothing dated this week, so there's nothing to budget. Enjoy it while it lasts.</p>
          ) : (
            <p>
              You're looking at about {minutes(load.total)} of work this week
              {load.heaviest && `, piling up on ${load.heaviest.name}`}.
              {load.unestimated > 0 &&
                ` I guessed 1h for ${load.unestimated} item${load.unestimated === 1 ? "" : "s"} you haven't estimated — set real estimates and this sharpens up.`}
            </p>
          )}
        </VoiceNote>

        <ChangesNote labelOf={labelOf} />
      </div>

      {/* ── Quiet footer ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span data-numeric className="font-mono tabular-nums">{openTotal} open</span>
        <span data-numeric className="font-mono tabular-nums">{dueThisWeek} due this week</span>
        <span>synced {sinceSync(sync.lastSyncedAt)}</span>
        <button
          type="button"
          onClick={onShowBoard}
          className="ml-auto hover:text-foreground hover:underline"
        >
          prefer the data view? Board →
        </button>
      </div>
    </div>
  );
}

function VoiceNote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </h2>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

/** Recent grades, retold as sentences — same source as the Board's
 *  What Changed widget. */
function ChangesNote({
  labelOf,
}: {
  labelOf: (courseId: string, courseCode: string | null) => string;
}) {
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    debugDump()
      .then((d) => {
        const cutoff = new Date(Date.now() - 10 * 86_400_000).toISOString();
        const byId = new Map(d.assignments.map((a) => [a.id, a] as const));
        const codeOf = new Map(d.courses.map((c) => [c.id, c.courseCode] as const));
        const recent = d.submissions
          .filter((s) => s.gradedAt !== null && s.gradedAt > cutoff && s.score !== null)
          .sort((a, b) => (b.gradedAt ?? "").localeCompare(a.gradedAt ?? ""))
          .slice(0, 3)
          .flatMap((s) => {
            const a = byId.get(s.assignmentId);
            if (!a) return [];
            const scoreText =
              a.pointsPossible !== null ? `${s.score}/${a.pointsPossible}` : String(s.score);
            return [
              `${stripShouting(a.name).title} came back ${scoreText} in ${labelOf(a.courseId, codeOf.get(a.courseId) ?? null)}.`,
            ];
          });
        setLines(recent);
      })
      .catch(() => setLines([]));
  }, [labelOf]);

  return (
    <VoiceNote label="What changed">
      {lines === null ? (
        <p className="text-muted-foreground">Checking the ledger…</p>
      ) : lines.length === 0 ? (
        <p>
          Nothing's been graded in the last ten days. The moment something lands, I'll tell you
          here.
        </p>
      ) : (
        <p>{lines.join(" ")}</p>
      )}
    </VoiceNote>
  );
}
