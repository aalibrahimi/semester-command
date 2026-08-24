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
  ClipboardPaste,
  Clock,
  Flame,
  GraduationCap,
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
    () => (overrides !== null && loaded ? mergePlan(overrides, courses, requirements) : null),
    [overrides, courses, requirements, loaded],
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
  const anyFailed = plan.terms.flatMap((t) => t.rows).some((r) => r.status === "failed");
  const notApplied = audit?.header.graduationStatus?.toLowerCase() === "not applied";
  const onTrack = !anyFailed;

  return (
    <div className="pb-16">
      {/* ═══ 1 · HERO ═════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="px-10 pb-6 pt-8"
      >
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="rounded-sm border border-brand/30 bg-brand/10 p-2">
                <GraduationCap className="h-4 w-4 text-brand-fg" />
              </div>
              <span className="text-2xs font-semibold uppercase tracking-[0.2em] text-foreground/70">
                Personal Education Plan
              </span>
            </div>
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight">
              BS Computer Science <span className="text-muted-foreground/70">&amp;</span>{" "}
              Linguistics
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/75">San José State University</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                Target graduation:{" "}
                <span className="font-semibold text-foreground">
                  {audit?.targetTerm ?? "Fall 2027"}
                </span>
                <span className="text-muted-foreground/70">· fallback Spring 2028</span>
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>{plan.transferredCount} transfer credits banked</span>
            </div>
          </div>

          {/* The ping-dot status badge — the CWA signature. */}
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-2.5 rounded-sm border px-4 py-2 text-xs font-semibold tracking-wide",
              onTrack
                ? "border-on-track/40 bg-on-track/10 text-on-track-fg"
                : "border-critical/40 bg-critical/10 text-critical-fg",
            )}
          >
            <span className="relative inline-flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-80",
                  onTrack ? "bg-on-track" : "bg-critical",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  onTrack ? "bg-on-track" : "bg-critical",
                )}
              />
            </span>
            {onTrack ? "On Track" : "At Risk"}
          </div>
        </div>

        {/* GPA strip — real numbers from the imported MyProgress report. */}
        {audit && (audit.header.sjsuGpa !== null || audit.header.overallGpa !== null) && (
          <div className="mt-6 flex flex-wrap items-center gap-10 border-t border-border pt-5">
            {audit.header.sjsuGpa !== null && (
              <div>
                <div className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  SJSU GPA
                </div>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span
                    data-numeric
                    className={cn(
                      "font-mono text-[30px] font-bold leading-none tabular-nums tracking-tight",
                      audit.header.sjsuGpa < 2.0 && "text-critical-fg",
                    )}
                  >
                    {audit.header.sjsuGpa.toFixed(3)}
                  </span>
                  {audit.header.sjsuGpa < 2.0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-critical-fg">
                      <AlertTriangle className="h-3.5 w-3.5" /> below 2.0 minimum
                    </span>
                  )}
                </div>
              </div>
            )}
            {audit.header.overallGpa !== null && (
              <>
                <div className="h-10 w-px bg-border" />
                <div>
                  <div className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Overall GPA
                  </div>
                  <div
                    data-numeric
                    className="mt-1 font-mono text-[30px] font-bold leading-none tabular-nums tracking-tight"
                  >
                    {audit.header.overallGpa.toFixed(3)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </motion.section>

      {/* ═══ 2 · STAT STRIP ═══════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
        className="px-10 pb-6"
      >
        <div className="border-y border-border">
          <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
            <Stat label="Plan Units" value={String(u.required)} sub={`${u.remaining} remaining`} />
            <Stat label="Completed" value={String(u.completed)} sub={`${u.inProgress} in progress`} />
            <Stat
              label="Semesters Left"
              value={String(
                plan.terms.filter(
                  (t) =>
                    plan.currentTermId === null ||
                    plan.terms.findIndex((x) => x.id === t.id) >=
                      plan.terms.findIndex((x) => x.id === plan.currentTermId),
                ).length,
              )}
              sub="including current"
            />
            <Stat
              label="Critical Left"
              value={String(criticalLeft.length)}
              sub={criticalLeft.length ? criticalLeft.join(" · ") : "all on track"}
              accent={criticalLeft.length ? "critical" : "onTrack"}
            />
          </div>
        </div>
      </motion.section>

      {/* ═══ 3 · UNIT BAR ═════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
        className="px-10 pb-8"
      >
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-2xs font-semibold uppercase tracking-[0.2em] text-foreground/80">
            Unit Progress
          </h3>
          <span className="text-sm tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{u.completed}</span>
            <span className="text-muted-foreground/60"> / </span>
            <span className="text-foreground/85">{u.required}</span> plan units done
          </span>
        </div>
        <div className="flex h-10 w-full overflow-hidden rounded-sm border border-border bg-card">
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
            cls="bg-fill-ghost text-muted-foreground"
            delay={0.5}
          />
        </div>
        <div className="mt-3 flex items-center gap-5 text-2xs text-muted-foreground">
          <Legend cls="bg-on-track" label="Completed" />
          <Legend cls="bg-at-risk" label="In progress" />
          <Legend cls="bg-muted-foreground/30" label="Remaining" />
        </div>
      </motion.section>

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

        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold tracking-tight">Term Timeline</h2>
          <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Click a course for intelligence · click a status pill to mark it
          </span>
        </div>

        <div className="border-t border-border">
          {plan.terms.map((term, idx) => {
            const past =
              plan.currentTermId !== null &&
              plan.terms.findIndex((t) => t.id === term.id) <
                plan.terms.findIndex((t) => t.id === plan.currentTermId);
            return (
            <motion.div
              key={term.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + idx * 0.04, ease: "easeOut" }}
              className={cn(
                "grid grid-cols-1 gap-x-8 border-b border-border py-6 last:border-b-0 lg:grid-cols-[190px_1fr]",
                // Shading does the wayfinding: history recedes, the present
                // is warm, the finish line is green — all at whisper opacity.
                past && "opacity-55 transition-opacity hover:opacity-100",
                term.isCurrent && "-mx-4 bg-at-risk/[0.045] px-4",
                term.isTarget && "-mx-4 bg-on-track/[0.035] px-4",
              )}
            >
              {/* Left rail — the CWA accent bar. */}
              <div className="relative pl-5">
                <div
                  className={cn(
                    "absolute bottom-0 left-0 top-0 w-[3px] rounded-full",
                    term.isCurrent
                      ? "bg-at-risk/70"
                      : term.isTarget
                        ? "bg-on-track/70"
                        : "bg-border",
                  )}
                />
                <div className="text-xl font-bold leading-tight tracking-tight">{term.label}</div>
                {(term.tag || term.isCurrent || term.isTarget) && (
                  <div
                    className={cn(
                      "mt-1.5 text-2xs font-semibold uppercase tracking-[0.15em]",
                      term.isCurrent
                        ? "text-at-risk-fg"
                        : term.isTarget
                          ? "text-on-track-fg"
                          : "text-muted-foreground",
                    )}
                  >
                    {term.isCurrent
                      ? "Current term"
                      : term.isTarget
                        ? (term.tag ?? "Target graduation")
                        : term.tag}
                  </div>
                )}
                <div className="mt-2.5 flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{term.totalUnits}</span>
                  <span>units</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{term.rows.length} courses</span>
                </div>
                {term.isCurrent && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-2xs font-medium text-at-risk-fg">
                    <Clock className="h-3.5 w-3.5" /> active
                  </div>
                )}
                {term.isTarget && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-2xs font-medium text-on-track-fg">
                    <CheckCircle2 className="h-3.5 w-3.5" /> graduation
                  </div>
                )}
              </div>

              {/* Course table. */}
              <div className="min-w-0">
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
                    onOpen={() => setOpenCode(row.code)}
                    onCycleStatus={() => cycleStatus(row)}
                  />
                ))}
                {term.rows.length === 0 && (
                  <div className="px-2 py-4 text-xs italic text-muted-foreground/60">
                    Nothing slotted this term.
                  </div>
                )}
              </div>
            </motion.div>
            );
          })}
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
