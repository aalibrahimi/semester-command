/**
 * DevPreview — the design reference, rendered with fabricated data.
 *
 * Called by: the router at "/dev/preview", DEV builds only. Stripped from
 * release. M3 builds the real Triage and CourseDetail against what this page
 * looks like; when M3 lands, this page's job is done and it can go.
 *
 * Calls: sampleData (fake numbers), GradeGapBar, StatTile.
 *
 * Every number on this page is fabricated — the banner says so loudly, because
 * a screenshot of this page must never be mistakable for a real gradebook.
 */
import { AlertTriangle, CalendarClock, FlaskConical, Target, Timer } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { StatTile } from "@/components/layout/StatTile";
import { GradeGapBar } from "@/components/grade/GradeGapBar";
import { SAMPLE_COURSES, SAMPLE_TRIAGE, type SampleTriageRow } from "@/lib/sampleData";
import { cn } from "@/lib/utils";
import type { SignalStatus } from "@/types";

const DOT: Record<SignalStatus, string> = {
  onTrack: "bg-on-track",
  atRisk: "bg-at-risk",
  critical: "bg-critical",
  locked: "bg-locked",
};

const STATE_CHIP: Record<SampleTriageRow["state"], { label: string; cls: string }> = {
  overdue: { label: "overdue", cls: "bg-critical/10 text-critical-fg" },
  missing: { label: "missing", cls: "bg-critical/10 text-critical-fg" },
  open: { label: "not submitted", cls: "bg-fill-ghost text-muted-foreground" },
};

export default function DevPreview() {
  return (
    <>
      <ScreenHeader
        title="Design preview"
        subtitle="The soft-modern restyle on realistic content. M3 builds the real screens to match."
      />

      <div className="mx-8 mb-10 flex flex-col gap-6">
        {/* Fabricated-data banner — this page must never pass for a gradebook. */}
        <div className="chip w-fit gap-1.5 bg-at-risk/10 text-at-risk-fg">
          <FlaskConical className="h-3 w-3" />
          Every number below is fabricated sample data
        </div>

        {/* ── Overview tiles ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatTile
            icon={Target}
            label="Courses on target"
            value="2 of 4"
            delta={{ text: "↓ 1 this week", tone: "down" }}
            caption="MATH 161A slipped below reach"
          />
          <StatTile
            icon={CalendarClock}
            label="Due this week"
            value="5"
            delta={{ text: "next in 26h", tone: "flat" }}
            caption="1 already overdue"
          />
          <StatTile
            icon={Timer}
            label="Estimated work left"
            value="13h 10m"
            caption="across everything unsubmitted"
          />
          <StatTile
            icon={AlertTriangle}
            label="Grade at stake"
            value="25.7%"
            delta={{ text: "↑ 4.5", tone: "down" }}
            caption="share of final grades still in play this week"
          />
        </div>

        {/* ── Course cards with the Grade Gap bar ────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {SAMPLE_COURSES.map((c) => (
            <div key={c.id} className="panel flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[c.status])} />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold">{c.code}</h2>
                  <p className="truncate text-xs text-muted-foreground">{c.name}</p>
                </div>
                <span className="chip ml-auto bg-fill-ghost font-mono text-muted-foreground">
                  target {c.targetLetter}
                </span>
              </div>

              <div className="flex items-baseline gap-4">
                <div>
                  <span data-numeric className="font-mono text-xl font-semibold tracking-tight">
                    {c.currentPct.toFixed(1)}%
                  </span>
                  <span className="ml-1.5 text-2xs text-muted-foreground">current</span>
                </div>
                <div>
                  <span data-numeric className="font-mono text-base text-muted-foreground">
                    {c.projectedPct.toFixed(1)}%
                  </span>
                  <span className="ml-1.5 text-2xs text-muted-foreground">projected</span>
                </div>
                <span
                  data-numeric
                  className="chip ml-auto bg-fill-ghost font-mono text-muted-foreground"
                >
                  gap {(c.currentPct - c.projectedPct).toFixed(1)}
                </span>
              </div>

              <GradeGapBar
                projectedPct={c.projectedPct}
                maxPossiblePct={c.maxPossiblePct}
                targetPct={c.targetPct}
                status={c.status}
              />
            </div>
          ))}
        </div>

        {/* ── Triage list ────────────────────────────────────────────────── */}
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-3 px-5 pb-3 pt-5">
            <h2 className="font-display text-base font-semibold">Triage</h2>
            <span className="text-xs text-muted-foreground">
              ranked by grade at stake ÷ time to do it
            </span>
          </div>
          <div>
            {SAMPLE_TRIAGE.map((row, i) => (
              <TriageRowPreview key={row.id} row={row} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function TriageRowPreview({ row, rank }: { row: SampleTriageRow; rank: number }) {
  const chip = STATE_CHIP[row.state];
  const urgent = row.state !== "open";

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-t border-border/60 px-5 py-3.5 transition-colors duration-micro hover:bg-fill-ghost/60",
        urgent && "bg-critical/[0.04]",
      )}
    >
      <span
        data-numeric
        className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground"
      >
        {rank}
      </span>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[row.status])} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.title}</p>
        <p className="truncate text-2xs text-muted-foreground">
          {row.courseCode} · {row.impactLabel}
        </p>
      </div>

      <span className={cn("chip shrink-0", chip.cls)}>{chip.label}</span>
      <span data-numeric className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
        {row.estLabel}
      </span>
      <span
        data-numeric
        className={cn(
          "w-20 shrink-0 text-right font-mono text-xs",
          urgent ? "text-critical-fg" : "text-muted-foreground",
        )}
      >
        {row.dueLabel}
      </span>
    </div>
  );
}
