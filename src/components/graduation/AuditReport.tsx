/**
 * The degree audit report: each requirement as a card with the courses that
 * count toward it.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Info, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type PlanRow } from "@/lib/gradPlan";
import { cn } from "@/lib/utils";
import type { AuditItem, DegreeAudit } from "@/types";
import { STATUS_PILL, fmt, seasonOf, offeringLabel } from "@/components/graduation/format";
import { Callout, Stat } from "@/components/graduation/parts";

export function CourseLine({
  row,
  onOpen,
  onCycleStatus,
}: {
  row: PlanRow;
  onOpen: () => void;
  onCycleStatus: () => void;
}) {
  const pill = STATUS_PILL[row.status];
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_44px_minmax(100px,auto)] items-center gap-x-4 border-b border-border/50 px-2 py-2.5 transition-colors last:border-b-0 hover:bg-fill-ghost/40 md:grid-cols-[110px_minmax(0,1fr)_44px_minmax(150px,auto)_minmax(100px,auto)]">
      <button
        type="button"
        onClick={onOpen}
        className="text-left font-mono text-xs font-semibold hover:underline"
        title="Open course intelligence"
      >
        {row.code}
        {row.critical && (
          <span className="ml-1 text-critical-fg" title="Critical path">
            ●
          </span>
        )}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <span className="block truncate text-sm hover:underline">{row.name}</span>
        {row.note && (
          <span
            className={cn(
              "text-2xs",
              row.note === "not enrolled" ? "text-critical-fg" : "text-at-risk-fg",
            )}
          >
            {row.note === "taken early" && "↑ taken earlier than planned"}
            {row.note === "not enrolled" && "⚠ planned this term but not enrolled"}
            {row.note === "off-plan" && "enrolled, outside the plan"}
            {row.note === "moved" && "moved from its planned term"}
            {row.note === "registered" && "registered — not yet published on Canvas"}
            {row.note === "overdue" && "owed from a past term"}
          </span>
        )}
      </button>
      <span data-numeric className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {row.units}
      </span>
      <span className="hidden truncate text-2xs text-muted-foreground md:block">
        {row.category}
      </span>
      <div className="text-right">
        <button
          type="button"
          onClick={onCycleStatus}
          title="Click to mark: auto → passed → failed → dropped"
          className={cn(
            "rounded-sm border px-2 py-1 text-2xs font-semibold transition-colors duration-micro hover:brightness-110",
            pill.cls,
          )}
        >
          {pill.label}
        </button>
      </div>
    </div>
  );
}

/* ═══ Audit layer (pre-existing MyProgress import, restyled) ═══════════════ */

export function AuditReport({ audit, notApplied }: { audit: DegreeAudit; notApplied: boolean }) {
  const retakes = useMemo(
    () => audit.outstanding.filter((i) => i.retakeOf),
    [audit.outstanding],
  );
  const unitsLabel =
    audit.unallocatedBucketUnits > 0
      ? `${fmt(audit.unitsFromCourses)}–${fmt(audit.unitsFromCourses + audit.unallocatedBucketUnits)}`
      : fmt(audit.unitsFromCourses);

  return (
    <div className="space-y-6 pb-4">
      {notApplied && (
        <Callout
          tone="critical"
          icon={AlertTriangle}
          title="You have not applied to graduate"
          body={
            <>
              MyProgress reports your graduation status as{" "}
              <span className="font-medium">Not Applied</span>. SJSU requires the application
              roughly two terms ahead of your intended graduation date, and missing that window
              delays conferral no matter how the coursework lands. This is the one item on this
              screen that no amount of studying fixes.
            </>
          }
        />
      )}

      {audit.truncatedRequirements.length > 0 && (
        <Callout
          tone="at-risk"
          icon={Info}
          title={`${audit.truncatedRequirements.length} course list${audit.truncatedRequirements.length === 1 ? " was" : "s were"} cut short`}
          body={
            <>
              MyProgress shows only ten rows per table. These requirements have more eligible
              courses than were captured:{" "}
              <span className="font-medium">{audit.truncatedRequirements.join(", ")}</span>.
              Re-paste with <span className="font-medium">View All</span> clicked.
            </>
          }
        />
      )}

      {/* Editorial stat strip, matching the plan's. */}
      <div className="border-y border-border">
        <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-3">
          <Stat
            label="Units Remaining"
            value={unitsLabel}
            sub={
              audit.unallocatedBucketUnits > 0
                ? `${fmt(audit.unallocatedBucketUnits)} elective units unallocated`
                : "across itemised requirements"
            }
          />
          <Stat
            label="Requirements Left"
            value={String(audit.outstanding.length)}
            sub={retakes.length > 0 ? `${retakes.length} is a retake` : "none are retakes"}
            accent={retakes.length > 0 ? "critical" : undefined}
          />
          <Stat
            label="Graduation Status"
            value={notApplied ? "Not Applied" : (audit.header.graduationStatus ?? "—")}
            sub={audit.generatedAt ? `report from ${audit.generatedAt}` : "from MyProgress"}
            accent={notApplied ? "critical" : "onTrack"}
          />
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-2xs font-semibold uppercase tracking-[0.2em] text-foreground/80">
          Outstanding Requirements
        </h3>
        <div className="space-y-2.5">
          {audit.outstanding.map((item) => (
            <RequirementCard key={item.key} item={item} />
          ))}
        </div>
      </section>

      {audit.buckets.length > 0 && (
        <section>
          <h3 className="mb-1 text-2xs font-semibold uppercase tracking-[0.2em] text-foreground/80">
            Unit Totals
          </h3>
          <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
            Satisfied <em>by</em> the courses above rather than alongside them — where a total
            exceeds what its itemised requirements cover, the difference is real work with no
            row of its own.
          </p>
          <div className="border-t border-border">
            {audit.buckets.map((b) => (
              <div
                key={b.key}
                className="flex items-center justify-between border-b border-border/60 px-2 py-2.5 last:border-b-0"
              >
                <span className="text-sm">{b.title}</span>
                <span className="font-mono text-sm text-muted-foreground" data-numeric>
                  {b.unitsNeeded === null ? "—" : `${fmt(b.unitsNeeded)} units`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-2xs text-muted-foreground">
        Unofficial report. SJSU and CSU regulations prevail — confirm anything here with your
        advisor before planning around it.
      </p>
    </div>
  );
}

function RequirementCard({ item }: { item: AuditItem }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? item.options : item.options.slice(0, 4);

  return (
    <div
      className={cn(
        "border-l-[3px] py-1 pl-4",
        item.retakeOf ? "border-critical/60" : item.singleTermOnly ? "border-at-risk/60" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{item.title}</span>

        {item.retakeOf && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="chip bg-critical/15 text-critical-fg">
                <RotateCcw className="mr-1 h-3 w-3" />
                Retake
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              You took {item.retakeOf.code} and scored{" "}
              <span className="font-medium">{item.retakeOf.grade}</span>. This requirement needs{" "}
              {item.minGrade} or better, so it must be taken again.
            </TooltipContent>
          </Tooltip>
        )}
        {item.singleTermOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="chip bg-at-risk/15 text-at-risk-fg">
                <CalendarClock className="mr-1 h-3 w-3" />
                {seasonOf(item.options)} only
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Offered once per year. Miss it and the next chance is a full year away.
            </TooltipContent>
          </Tooltip>
        )}
        {item.needsAdvisor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="chip bg-at-risk/15 text-at-risk-fg">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Variable offering
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              “Variable Offering — See Advisor.” The department commits to no cadence; confirm
              when it next runs before planning around it.
            </TooltipContent>
          </Tooltip>
        )}

        <span className="ml-auto font-mono text-sm text-muted-foreground" data-numeric>
          {item.unitsNeeded === null ? "—" : `${fmt(item.unitsNeeded)} units`}
        </span>
      </div>

      {item.options.length > 0 && (
        <ul className="mt-2 space-y-1">
          {shown.map((c, i) => (
            <li key={`${c.code}-${i}`} className="flex items-baseline gap-2 text-sm">
              <span className="font-mono text-xs" data-numeric>
                {c.code}
              </span>
              <span className="truncate text-muted-foreground">{c.description}</span>
              {c.offering && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-auto shrink-0 text-2xs text-muted-foreground">
                      {offeringLabel(c.offering)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{c.offering.raw}</TooltipContent>
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
      )}

      {item.options.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-brand-fg underline underline-offset-2"
        >
          {expanded
            ? "Show fewer"
            : `Show ${item.options.length - 4} more option${item.options.length - 4 === 1 ? "" : "s"}`}
        </button>
      )}
      {item.truncated && (
        <p className="mt-2 text-2xs text-at-risk-fg">
          Only {item.truncated.shown} of {item.truncated.total} eligible courses were captured —
          re-paste with View All.
        </p>
      )}
    </div>
  );
}
