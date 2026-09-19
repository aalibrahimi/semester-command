/**
 * Graduation — the degree, term by term, in CWA-Manager's editorial design.
 *
 * Called by: the router, at "/graduation".
 * Calls: lib/gradPlan (the plan merge), ipc grad overrides + degree audit,
 * useCourses (live Canvas enrollment), GradCourseSheet.
 *
 * Two layers, one screen:
 *
 *   1. **The plan** (ported from CWA-Manager's GraduationPlan): hero, stat
 *      strip, segmented unit bar, and the term timeline that answers "what
 *      do I take, and which semester". The merge in lib/gradPlan reconciles
 *      the static plan against live Canvas enrollment — courses taken early
 *      move to the current term with a flag, planned-but-not-enrolled
 *      courses are called out, and clicking any row opens its intelligence
 *      sheet (prereq chains, unlocks, risk, pairing rules).
 *   2. **The MyProgress audit** (pre-existing): the pasted registrar report
 *      with outstanding requirements, retake flags and offering cadence.
 *      The plan says what you intend; the audit says what SJSU still counts
 *      against you. Divergence between them is exactly what to bring to an
 *      advisor.
 *
 * Design language mimics the CWA original: monochrome editorial — full-bleed
 * sections split by hairline borders, 11px letterspaced uppercase labels, a
 * segmented unit bar with in-segment counts, term rows with a colored left
 * rail (at-risk amber = current, on-track = target graduation), staggered
 * entrance motion. CWA's emerald/amber/red map onto this app's signal tokens.
 *
 * Per SPEC.md §10 nothing here computes a grade; the audit numbers come from
 * `degree.rs` and the plan merge is bookkeeping, not grade math.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Clock,
  Flame,
  Info,
  Layers,
  RotateCcw,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { DegreeBlocksView } from "@/components/grade/DegreeBlocksView";
import { GradCourseSheet } from "@/components/grade/GradCourseSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourses } from "@/hooks/useCourses";
import {
  getDegreeAudit,
  gradOverrides,
  gradRequirementStatuses,
  importMyProgress,
  setGradOverride,
} from "@/lib/ipc";
import {
  DANGER_PAIRS,
  mergePlan,
  PENDING_ADVISOR,
  TERMS,
  type GradOverride,
  type GradStatus,
  type MergedPlan,
  type PlanRow,
  type RequirementStatus,
} from "@/lib/gradPlan";
import { COURSE_INTEL } from "@/lib/gradData";
import { cn } from "@/lib/utils";
import type { AuditItem, DegreeAudit, Offering } from "@/types";

const STATUS_PILL: Record<GradStatus, { label: string; cls: string }> = {
  planned: { label: "Planned", cls: "border-border/60 text-muted-foreground" },
  in_progress: { label: "In Progress", cls: "border-at-risk/40 bg-at-risk/10 text-at-risk-fg" },
  passed: { label: "Passed", cls: "border-on-track/40 bg-on-track/10 text-on-track-fg" },
  failed: { label: "Failed", cls: "border-critical/40 bg-critical/10 text-critical-fg" },
  dropped: { label: "Dropped", cls: "border-border/60 text-muted-foreground/60 line-through" },
};

/** Click-to-cycle order for the status pill. `null` = clear the override so
 *  the automatic derivation (Canvas enrollment, term position) decides. */
const CYCLE: (GradStatus | null)[] = [null, "passed", "failed", "dropped"];

type GradTab = "timeline" | "blocks" | "registrar" | "risk";

export default function Graduation() {
  const { courses, loaded } = useCourses();
  const [overrides, setOverrides] = useState<GradOverride[] | null>(null);
  const [requirements, setRequirements] = useState<RequirementStatus[]>([]);
  const [audit, setAudit] = useState<DegreeAudit | null>(null);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<GradTab>("timeline");

  const refresh = useCallback(() => {
    gradOverrides()
      .then(setOverrides)
      .catch(() => setOverrides([]));
    gradRequirementStatuses()
      .then(setRequirements)
      .catch(() => {});
    getDegreeAudit()
      .then(setAudit)
      .catch(() => {})
      .finally(() => setAuditLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const plan: MergedPlan | null = useMemo(
    () =>
      overrides !== null && loaded
        ? mergePlan(overrides, courses, requirements, audit?.targetTerm ?? null)
        : null,
    [overrides, courses, requirements, loaded, audit],
  );

  const statusOf = useCallback(
    (code: string): GradStatus | undefined =>
      plan?.terms.flatMap((t) => t.rows).find((r) => r.code === code)?.status,
    [plan],
  );

  const cycleStatus = (row: PlanRow) => {
    const ov = overrides?.find((o) => o.code === row.code);
    const at = CYCLE.indexOf((ov?.status as GradStatus | null) ?? null);
    const next = CYCLE[(at + 1) % CYCLE.length];
    setGradOverride(row.code, next, ov?.termId ?? null)
      .then(refresh)
      .catch(() => toast.error("Could not update the course status."));
  };

  const moveCourse = (code: string, termId: string | null) => {
    const ov = overrides?.find((o) => o.code === code);
    setGradOverride(code, ov?.status ?? null, termId)
      .then(() => {
        refresh();
        toast.success(termId ? "Course re-slotted." : "Course back to its planned term.");
      })
      .catch(() => toast.error("Could not move the course."));
  };

  if (!plan || !auditLoaded) {
    return (
      <div className="px-10 pt-8">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="mt-4 h-96 rounded-xl" />
      </div>
    );
  }

  const { unitTotals: u, criticalLeft } = plan;
  const notApplied = audit?.header.graduationStatus?.toLowerCase() === "not applied";
  const breakCount = plan.breaks.length;

  // The validator already runs live inside mergePlan; the button makes its
  // verdict explicit and points at the evidence.
  const validatePlan = () => {
    if (breakCount === 0) {
      toast.success(`Plan validates clean against ${plan.primaryTargetLabel}.`);
    } else {
      toast.error(
        `${breakCount} break${breakCount === 1 ? "" : "s"} against ${plan.primaryTargetLabel} — see Plan warnings.`,
      );
      setTab("timeline");
      window.setTimeout(
        () => document.getElementById("plan-warnings")?.scrollIntoView({ behavior: "smooth", block: "center" }),
        60,
      );
    }
  };

  return (
    <div className="pb-16">
      {/* ═══ 1 · HERO (per the reference: title, program, target, actions) ═ */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="px-10 pb-5 pt-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight">
              Graduation
            </h1>
            <p className="mt-1 text-lg font-semibold text-foreground/90">
              BS Computer Science <span className="text-muted-foreground/70">&amp;</span>{" "}
              Linguistics
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>San José State University</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                Target graduation:{" "}
                <span className="font-semibold text-foreground">{plan.primaryTargetLabel}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* The one-glance verdict: critical courses outstanding, plan
                breaks, or all clear. Clicking goes to the evidence. */}
            {criticalLeft.length > 0 || breakCount > 0 ? (
              <button
                type="button"
                onClick={() => setTab(breakCount > 0 ? "timeline" : "risk")}
                className="inline-flex items-center gap-2 rounded-lg border border-critical/40 bg-critical/10 px-3 py-1.5 text-xs font-semibold text-critical-fg transition-colors duration-micro hover:bg-critical/20"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {breakCount > 0
                  ? `${breakCount} plan break${breakCount === 1 ? "" : "s"}`
                  : `${criticalLeft.length} critical course${criticalLeft.length === 1 ? "" : "s"}`}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg border border-on-track/40 bg-on-track/10 px-3 py-1.5 text-xs font-semibold text-on-track-fg">
                <CheckCircle2 className="h-3.5 w-3.5" /> On track
              </span>
            )}
            <Button size="sm" onClick={validatePlan}>
              Validate plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTab("blocks")}>
              View requirements
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
              {audit ? "Re-import audit" : "Import MyProgress"}
            </Button>
          </div>
        </div>
      </motion.section>

      {/* ═══ 2 · STAT CARD — the four numbers + the segmented bar ═════ */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
        className="px-10 pb-6"
      >
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <div className="grid grid-cols-2 divide-x divide-border/60 md:grid-cols-4">
            <Stat label="Plan Units" value={String(u.required)} sub={`${u.remaining} remaining`} />
            <Stat label="Completed" value={String(u.completed)} sub={`${u.inProgress} in progress`} />
            <Stat
              label="Semesters Left"
              value={String(plan.semestersLeft)}
              sub={`including current · to ${plan.primaryTargetLabel}`}
            />
            <Stat
              label="Critical Left"
              value={String(criticalLeft.length)}
              sub={criticalLeft.length ? criticalLeft.join(" · ") : "all on track"}
              accent={criticalLeft.length ? "critical" : "onTrack"}
            />
          </div>

          <div className="mt-4 flex h-8 w-full overflow-hidden rounded-lg border border-border/60 bg-fill-ghost/40">
            <Segment
              pct={(u.completed / u.required) * 100}
              n={u.completed}
              cls="border-r border-on-track/60 bg-on-track/40 text-on-track-fg"
              delay={0.15}
            />
            <Segment
              pct={(u.inProgress / u.required) * 100}
              n={u.inProgress}
              cls="border-r border-at-risk/60 bg-at-risk/40 text-at-risk-fg"
              delay={0.35}
            />
            <Segment
              pct={(u.remaining / u.required) * 100}
              n={u.remaining}
              cls="text-muted-foreground"
              delay={0.5}
            />
          </div>
          <div className="mt-2.5 flex items-center gap-5 text-2xs text-muted-foreground">
            <Legend cls="bg-on-track" label="Completed" />
            <Legend cls="bg-at-risk" label="In progress" />
            <Legend cls="bg-muted-foreground/30" label="Remaining" />
            <span className="ml-auto tabular-nums">
              <span className="font-semibold text-foreground">{u.completed}</span>
              <span className="text-muted-foreground/60"> / </span>
              {u.required} plan units done
            </span>
          </div>
        </div>
      </motion.section>

      {/* ═══ PLAN BREAKS — the validator, loudly ═════════════════ */}
      {plan.breaks.length > 0 && (
        <div
          id="plan-warnings"
          className="mx-10 mb-6 border-l-[3px] border-critical/70 bg-critical/[0.05] py-3 pl-4 pr-3"
        >
          <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-critical-fg">
            <AlertTriangle className="h-3.5 w-3.5" />
            Plan validation failed — {plan.breaks.length} break
            {plan.breaks.length === 1 ? "" : "s"} against {plan.primaryTargetLabel}
          </div>
          <ul className="flex flex-col gap-1">
            {plan.breaks.map((b) => (
              <li
                key={`${b.kind}-${b.code}-${b.detail}`}
                className="text-xs leading-relaxed text-foreground/85"
              >
                {b.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ TAB STRIP — one page, three questions ════════════════════ */}
      <TabStrip active={tab} onChange={setTab} registrarBacked={plan.registrarBacked} />

      {/* ═══ 4 · TERM TIMELINE ════════════════════════════════════════ */}
      {tab === "timeline" && (
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="px-10 pb-10 pt-6"
      >
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col">
        {/* Overdue strip: registrar says owed, the slot is already gone. */}
        {plan.overdue.length > 0 && (
          <div className="mb-6 border-l-[3px] border-critical/70 bg-critical/[0.04] py-3 pl-4 pr-3">
            <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-critical-fg">
              <AlertTriangle className="h-3.5 w-3.5" />
              Still owed — needs a new slot
            </div>
            <div className="flex flex-col gap-1.5">
              {plan.overdue.map((row) => (
                <div key={row.code} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => setOpenCode(row.code)}
                    className="font-mono text-xs font-semibold hover:underline"
                  >
                    {row.code}
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                  <span className="text-2xs text-muted-foreground">
                    was planned {termLabel(row.plannedTerm)} · offered{" "}
                    {offeredOf(row.code) ?? "check advisor"}
                  </span>
                  <TermPicker
                    value={null}
                    onPick={(termId) => moveCourse(row.code, termId)}
                    fromTermId={plan.currentTermId}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-2xs text-muted-foreground">
              The registrar still counts these against the degree. Pick the term you'll actually
              take them and they slot back into the timeline.
            </p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Planning overview</h2>
            <p className="text-2xs text-muted-foreground">
              Your path to graduation. Click a course for intelligence · click a status pill to
              mark it.
            </p>
          </div>
        </div>

        {/* The near horizon as cards: last term, now, next (reference
            design). Everything further lives in the folds below. */}
        {(() => {
          const currentIdx = Math.max(
            0,
            plan.terms.findIndex((t) => t.id === plan.currentTermId),
          );
          const from = Math.max(0, currentIdx - 1);
          const cardTerms = plan.terms.slice(from, from + 3);
          const completedTerms = plan.terms.slice(0, from);
          const futureTerms = plan.terms.slice(from + 3);
          return (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {cardTerms.map((term) => (
                  <TermCard
                    key={term.id}
                    term={term}
                    onOpen={setOpenCode}
                    onCycleStatus={(row) => cycleStatus(row)}
                  />
                ))}
              </div>

              {futureTerms.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-2xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Future terms
                  </h3>
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
                    {futureTerms.map((term) => (
                      <TermFold
                        key={term.id}
                        term={term}
                        onOpen={setOpenCode}
                        onCycleStatus={(row) => cycleStatus(row)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {completedTerms.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-2xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Completed terms
                  </h3>
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
                    {completedTerms.map((term) => (
                      <TermFold
                        key={term.id}
                        term={term}
                        onOpen={setOpenCode}
                        onCycleStatus={(row) => cycleStatus(row)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Parked, not planned: courses waiting on an advisor answer. */}
        {PENDING_ADVISOR.length > 0 && (
          <div className="mt-6 border-l-[3px] border-at-risk/70 bg-at-risk/[0.04] py-3 pl-4 pr-3">
            <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-at-risk-fg">
              <Info className="h-3.5 w-3.5" /> Pending advisor resolution — not on the timeline
            </div>
            <div className="flex flex-col gap-1.5">
              {PENDING_ADVISOR.map((pa) => (
                <div key={pa.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => setOpenCode(pa.code)}
                    className="font-mono text-xs font-semibold hover:underline"
                  >
                    {pa.code}
                  </button>
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {pa.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Degree health rail (reference design) ═════════════════════ */}
      <aside className="flex min-w-0 flex-col gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Degree health</h3>

          {audit && (audit.header.sjsuGpa !== null || audit.header.overallGpa !== null) ? (
            <div className="mb-3 grid grid-cols-2 divide-x divide-border/60 rounded-xl bg-fill-ghost/50 py-3">
              <div className="px-3">
                <div
                  data-numeric
                  className={cn(
                    "font-mono text-xl font-bold tabular-nums",
                    audit.header.sjsuGpa !== null && audit.header.sjsuGpa < 2.0 && "text-critical-fg",
                  )}
                >
                  {audit.header.sjsuGpa?.toFixed(3) ?? "—"}
                </div>
                <div className="text-2xs text-muted-foreground">SJSU GPA</div>
              </div>
              <div className="px-3">
                <div data-numeric className="font-mono text-xl font-bold tabular-nums">
                  {audit.header.overallGpa?.toFixed(3) ?? "—"}
                </div>
                <div className="text-2xs text-muted-foreground">Overall GPA</div>
              </div>
            </div>
          ) : (
            <p className="mb-3 rounded-xl bg-fill-ghost/50 p-3 text-2xs text-muted-foreground">
              Import your MyProgress report to see GPA and registrar status here.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <RailLink
              icon={Layers}
              title="Required blocks"
              sub="Track your progress through degree requirements."
              onClick={() => setTab("blocks")}
            />
            <RailLink
              icon={AlertTriangle}
              tone={criticalLeft.length > 0 ? "critical" : undefined}
              title="Critical prerequisites"
              sub={
                criticalLeft.length > 0
                  ? `${criticalLeft.length} course${criticalLeft.length === 1 ? "" : "s"} remaining · ${criticalLeft.join(" · ")}`
                  : "All critical-path courses are on schedule."
              }
              onClick={() => setTab("risk")}
            />
            <RailLink
              icon={Clock}
              tone={breakCount > 0 ? "critical" : undefined}
              title="Plan warnings"
              sub={
                breakCount > 0
                  ? `${breakCount} break${breakCount === 1 ? "" : "s"} to review.`
                  : "No warnings — the plan validates clean."
              }
              onClick={validatePlan}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Quick actions</h3>
          <div className="flex flex-col gap-1.5">
            <Button size="sm" onClick={validatePlan}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Validate plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTab("blocks")}>
              <Layers className="mr-1.5 h-3.5 w-3.5" /> View requirements
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" /> Import MyProgress
            </Button>
          </div>
        </div>
      </aside>
      </div>
      </motion.section>
      )}

      {/* ═══ 4b · DEGREE BLOCKS TAB — the audit, block by block ═══ */}
      {tab === "blocks" && <DegreeBlocksView plan={plan} audit={audit} />}

      {/* ═══ 5 · RISK & RULES TAB ═════════════════════════════════════ */}
      {tab === "risk" && (
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="px-10 pb-12 pt-6"
      >
        {/* Critical path first: the courses that, missed, cost a semester. */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-at-risk-fg" />
            <h2 className="font-display text-lg font-bold tracking-tight">Critical Path</h2>
            <span className="ml-2 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
              Missing any of these delays graduation ≥ 1 semester
            </span>
          </div>
          <div className="border-t border-border">
            {plan.terms
              .flatMap((t) => t.rows.map((r) => ({ ...r, termLabel: t.label })))
              .concat(plan.overdue.map((r) => ({ ...r, termLabel: "UNSLOTTED" })))
              .filter((r) => r.critical)
              .map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setOpenCode(r.code)}
                  className="grid w-full grid-cols-[110px_minmax(0,1fr)_minmax(100px,auto)_minmax(90px,auto)] items-center gap-x-4 border-b border-border/60 px-2 py-3 text-left transition-colors last:border-b-0 hover:bg-fill-ghost/40"
                >
                  <span className="font-mono text-xs font-semibold">{r.code}</span>
                  <span className="truncate text-sm">{r.name}</span>
                  <span className="text-2xs text-muted-foreground">{r.termLabel}</span>
                  <span
                    className={cn(
                      "rounded-sm border px-2 py-0.5 text-center text-2xs font-semibold",
                      STATUS_PILL[r.status].cls,
                    )}
                  >
                    {STATUS_PILL[r.status].label}
                  </span>
                </button>
              ))}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <Flame className="h-5 w-5 text-critical-fg" />
          <h2 className="font-display text-lg font-bold tracking-tight">
            High-Risk Course Combinations
          </h2>
          <span className="ml-2 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Avoid pairing in the same term
          </span>
        </div>
        <div className="border-t border-border">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-8 border-b border-border px-2 py-3">
            <Th>Avoid pairing</Th>
            <Th>Why</Th>
          </div>
          {DANGER_PAIRS.map((p, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-8 border-b border-border/60 px-2 py-4 transition-colors last:border-b-0 hover:bg-fill-ghost/40"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-critical-fg" />
                <code className="truncate text-sm font-semibold">{p.pair}</code>
              </div>
              <p className="text-sm leading-relaxed text-foreground/75">{p.why}</p>
            </div>
          ))}
        </div>
      </motion.section>
      )}

      {/* ═══ 6 · REGISTRAR TAB ════════════════════════════════════════ */}
      {tab === "registrar" && (
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="px-10 pt-6"
      >
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Registrar Audit</h2>
            <p className="mt-0.5 text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              What SJSU still counts against you · from MyProgress
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <ClipboardPaste className="mr-1.5 h-4 w-4" />
            {audit ? "Re-import" : "Import MyProgress"}
          </Button>
        </div>

        {!audit ? (
          <p className="max-w-2xl border-l-[3px] border-border pl-4 text-sm text-muted-foreground">
            The plan above says what you intend; the registrar's audit says what SJSU still
            requires. Open <span className="font-medium text-foreground/80">MySJSU → My
            Progress</span>, click Expand All and View All on every table, copy the whole page
            and import it — retake flags, unit gaps and “apply to graduate” status all come
            from there.
          </p>
        ) : (
          <AuditReport audit={audit} notApplied={notApplied} />
        )}
      </motion.section>
      )}

      <GradCourseSheet
        code={openCode}
        statusOf={statusOf}
        onOpenChange={(open) => !open && setOpenCode(null)}
        onMove={(termId) => openCode && moveCourse(openCode, termId)}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          setImportOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

/* ═══ Plan atoms ═══════════════════════════════════════════════════════════ */

/** The CWA scenario-tab strip: bold label, letterspaced sub, spring
 *  underline via layoutId. One page, three questions. */
function TabStrip({
  active,
  onChange,
  registrarBacked,
}: {
  active: GradTab;
  onChange: (t: GradTab) => void;
  registrarBacked: boolean;
}) {
  const tabs: { id: GradTab; label: string; sub: string; icon: React.ReactNode }[] = [
    {
      id: "timeline",
      label: "Timeline",
      sub: "What to take · which semester",
      icon: <CalendarClock className="h-3.5 w-3.5" />,
    },
    {
      id: "blocks",
      label: "Degree Blocks",
      sub: "Blocks · GPA · deadlines",
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      id: "registrar",
      label: "Registrar",
      sub: registrarBacked ? "MyProgress · what SJSU counts" : "Import MyProgress",
      icon: <ClipboardPaste className="h-3.5 w-3.5" />,
    },
    {
      id: "risk",
      label: "Risk & Rules",
      sub: "Critical path · pairing rules",
      icon: <Flame className="h-3.5 w-3.5" />,
    },
  ];
  return (
    <div className="px-10">
      <div className="flex items-stretch gap-0 border-b border-border">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                "group relative px-6 py-3 text-left transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/85",
              )}
            >
              <div className="mb-0.5 flex items-center gap-2">
                <span className={isActive ? "text-brand-fg" : "text-muted-foreground/70"}>
                  {t.icon}
                </span>
                <span className="text-sm font-bold tracking-tight">{t.label}</span>
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                {t.sub}
              </div>
              {isActive && (
                <motion.div
                  layoutId="grad-tab-underline"
                  className="absolute -bottom-px left-0 right-0 h-[2px] bg-brand"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type PlanTerm = MergedPlan["terms"][number];

/** A term's one-word verdict, for card footers and fold rows. */
function termChip(term: PlanTerm): { label: string; cls: string; icon?: React.ReactNode } {
  if (term.rows.length === 0)
    return { label: "Not planned", cls: "border-border/60 text-muted-foreground" };
  if (term.rows.every((r) => r.status === "passed" || r.status === "dropped"))
    return {
      label: "Completed",
      cls: "border-on-track/40 bg-on-track/10 text-on-track-fg",
      icon: <CheckCircle2 className="h-3 w-3" />,
    };
  if (term.isCurrent)
    return {
      label: "In progress",
      cls: "border-at-risk/40 bg-at-risk/10 text-at-risk-fg",
      icon: <Clock className="h-3 w-3" />,
    };
  return { label: "Planned", cls: "border-border/60 text-muted-foreground" };
}

/** Dot colors matching STATUS_PILL, for the compact card rows. */
const STATUS_DOT: Record<GradStatus, string> = {
  planned: "border border-muted-foreground/50 bg-transparent",
  in_progress: "bg-at-risk",
  passed: "bg-on-track",
  failed: "bg-critical",
  dropped: "bg-muted-foreground/40",
};

/** One near-horizon term as a card (reference design): label, units, the
 *  course list, a verdict chip. The current term wears the brand ring. */
function TermCard({
  term,
  onOpen,
  onCycleStatus,
}: {
  term: PlanTerm;
  onOpen: (code: string) => void;
  onCycleStatus: (row: PlanRow) => void;
}) {
  const chip = termChip(term);
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border bg-card p-4 shadow-card",
        term.isCurrent ? "border-brand/60 ring-1 ring-brand/30" : "border-border/60",
        term.isTarget && !term.isCurrent && "border-on-track/50",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="font-display text-base font-bold tracking-tight">{term.label}</span>
        {term.isCurrent && (
          <span className="chip border border-brand/40 bg-brand/10 text-2xs font-semibold text-brand-fg">
            Current term
          </span>
        )}
        {term.isTarget && (
          <span className="chip border border-on-track/40 bg-on-track/10 text-2xs font-semibold text-on-track-fg">
            {term.tag ?? "Graduation"}
          </span>
        )}
      </div>
      <div className="mb-3 text-2xs tabular-nums text-muted-foreground">
        {term.totalUnits} units · {term.rows.length} course{term.rows.length === 1 ? "" : "s"}
      </div>

      {term.rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 px-3 py-6 text-center">
          <p className="text-xs font-medium">No courses planned</p>
          <p className="text-2xs text-muted-foreground">
            Move a course here from its term picker to fill this slot.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-0.5">
          {term.rows.map((row) => (
            <div key={row.code} className="group flex items-center gap-2 rounded-md px-1 py-1">
              <button
                type="button"
                onClick={() => onCycleStatus(row)}
                title={`${STATUS_PILL[row.status].label} — click to mark: auto → passed → failed → dropped`}
                className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[row.status])}
              />
              <button
                type="button"
                onClick={() => onOpen(row.code)}
                className="shrink-0 font-mono text-xs font-semibold hover:underline"
              >
                {row.code}
                {row.critical && (
                  <span className="ml-0.5 text-critical-fg" title="Critical path">
                    ●
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpen(row.code)}
                className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground hover:text-foreground"
                title={row.name}
              >
                {row.name}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs font-semibold",
            chip.cls,
          )}
        >
          {chip.icon}
          {chip.label}
        </span>
      </div>
    </div>
  );
}

/** A far-horizon term as a fold row: closed it's one line; open it's the
 *  full course table with the same status pills as before. */
function TermFold({
  term,
  onOpen,
  onCycleStatus,
}: {
  term: PlanTerm;
  onOpen: (code: string) => void;
  onCycleStatus: (row: PlanRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const chip = termChip(term);
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors duration-micro hover:bg-fill-ghost/50"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro",
            open && "rotate-90",
          )}
        />
        <span className="font-display text-sm font-bold tracking-tight">{term.label}</span>
        {term.isTarget && (
          <span className="chip border border-on-track/40 bg-on-track/10 text-2xs font-semibold text-on-track-fg">
            {term.tag ?? "Graduation"}
          </span>
        )}
        <span className="ml-auto text-2xs tabular-nums text-muted-foreground">
          {term.rows.length === 0
            ? "Not planned yet"
            : `${term.totalUnits} units · ${term.rows.length} course${term.rows.length === 1 ? "" : "s"}`}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-2xs font-semibold",
            chip.cls,
          )}
        >
          {chip.icon}
          {chip.label}
        </span>
      </button>
      {open && term.rows.length > 0 && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-[96px_minmax(0,1fr)_44px_minmax(100px,auto)] items-center gap-x-4 border-b border-border px-2 pb-2 md:grid-cols-[110px_minmax(0,1fr)_44px_minmax(150px,auto)_minmax(100px,auto)]">
            <Th>Code</Th>
            <Th>Course</Th>
            <Th right>Units</Th>
            <Th className="hidden md:block">Category</Th>
            <Th right>Status</Th>
          </div>
          {term.rows.map((row) => (
            <CourseLine
              key={row.code}
              row={row}
              onOpen={() => onOpen(row.code)}
              onCycleStatus={() => onCycleStatus(row)}
            />
          ))}
        </div>
      )}
      {open && term.rows.length === 0 && (
        <p className="px-11 pb-3 text-xs italic text-muted-foreground/60">
          Nothing slotted this term yet.
        </p>
      )}
    </div>
  );
}

/** One Degree-health rail row: icon tile, title, sub, chevron. */
function RailLink({
  icon: Icon,
  title,
  sub,
  tone,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  tone?: "critical";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 text-left transition-colors duration-micro hover:bg-fill-ghost/60"
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          tone === "critical" ? "bg-critical/15 text-critical-fg" : "bg-brand/10 text-brand-fg",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{title}</span>
        <span className="block text-2xs leading-snug text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5" />
    </button>
  );
}

/** Inline term chooser for re-slotting a course. Only current + future
 *  terms are offered — moving work into the past is fiction. */
function TermPicker({
  value,
  onPick,
  fromTermId,
}: {
  value: string | null;
  onPick: (termId: string | null) => void;
  fromTermId: string | null;
}) {
  const fromIdx = TERMS.findIndex((t) => t.id === fromTermId);
  const options = TERMS.filter((_, i) => fromIdx === -1 || i >= fromIdx);
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onPick(e.target.value === "" ? null : e.target.value)}
      className="rounded-sm border border-border bg-transparent px-1.5 py-1 text-2xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">move to…</option>
      {options.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

function termLabel(id: string): string {
  return TERMS.find((t) => t.id === id)?.label ?? id;
}

function offeredOf(code: string): string | undefined {
  return COURSE_INTEL[code]?.offered;
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "critical" | "onTrack";
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        data-numeric
        className={cn(
          "mt-1 font-mono text-[26px] font-bold leading-none tabular-nums tracking-tight",
          accent === "critical" && "text-critical-fg",
          accent === "onTrack" && "text-on-track-fg",
        )}
      >
        {value}
      </div>
      <div className="mt-1 truncate text-2xs text-muted-foreground" title={sub}>
        {sub}
      </div>
    </div>
  );
}

function Segment({ pct, n, cls, delay }: { pct: number; n: number; cls: string; delay: number }) {
  if (pct <= 0) return null;
  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={cn("flex h-full items-center justify-center", cls)}
    >
      {pct > 5 && (
        <span data-numeric className="text-sm font-bold tabular-nums">
          {n}
        </span>
      )}
    </motion.div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", cls)} />
      {label}
    </span>
  );
}

function Th({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
        right && "text-right",
        className,
      )}
    >
      {children}
    </span>
  );
}

function CourseLine({
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

function AuditReport({ audit, notApplied }: { audit: DegreeAudit; notApplied: boolean }) {
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

function Callout({
  tone,
  icon: Icon,
  title,
  body,
}: {
  tone: "critical" | "at-risk";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 border-l-[3px] py-1 pl-4",
        tone === "critical" ? "border-critical/60" : "border-at-risk/60",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "critical" ? "text-critical-fg" : "text-at-risk-fg",
        )}
      />
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            tone === "critical" ? "text-critical-fg" : "text-at-risk-fg",
          )}
        >
          {title}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const audit = await importMyProgress(text);
      toast.success(
        `Imported ${audit.outstanding.length} outstanding requirement${audit.outstanding.length === 1 ? "" : "s"}`,
      );
      setText("");
      onImported();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import MyProgress</DialogTitle>
          <DialogDescription>
            In MySJSU open <span className="font-medium">My Progress</span>, click{" "}
            <span className="font-medium">Expand All</span>, then{" "}
            <span className="font-medium">View All</span> on every course table — they cap at
            ten rows and the rest are silently dropped. Select the whole page, copy, and paste
            below.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder="Paste the whole My Progress page here…"
          className="w-full resize-y rounded-md border border-border bg-bg p-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || text.trim().length === 0}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ helpers ══════════════════════════════════════════════════════════════ */

function fmt(units: number): string {
  return Number.isInteger(units) ? String(units) : units.toFixed(1);
}

function offeringLabel(o: Offering): string {
  if (o.term) return o.term;
  if (o.variable) return "varies";
  const seasons = [o.fall && "Fall", o.spring && "Spring", o.summer && "Summer"].filter(
    Boolean,
  ) as string[];
  if (seasons.length === 0) return "—";
  const base = seasons.join(" / ");
  return o.parity ? `${base} (${o.parity} yrs)` : base;
}

function seasonOf(options: AuditItem["options"]): string {
  const o = options.find((c) => c.offering)?.offering;
  if (!o) return "One term";
  if (o.fall) return "Fall";
  if (o.spring) return "Spring";
  if (o.summer) return "Summer";
  return "One term";
}

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Something went wrong importing the report.";
}
