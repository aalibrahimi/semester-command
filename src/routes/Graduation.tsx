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
import { AlertTriangle, CheckCircle2, ClipboardPaste, Clock, Flame, Info, Layers, Target } from "lucide-react";
import { toast } from "sonner";
import { DegreeBlocksView } from "@/components/grade/DegreeBlocksView";
import { GradCourseSheet } from "@/components/grade/GradCourseSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useCourses";
import { getDegreeAudit, gradOverrides, gradRequirementStatuses, setGradOverride } from "@/lib/ipc";
import { DANGER_PAIRS, mergePlan, PENDING_ADVISOR, type GradOverride, type GradStatus, type MergedPlan, type PlanRow, type RequirementStatus } from "@/lib/gradPlan";
import { cn } from "@/lib/utils";
import type { DegreeAudit } from "@/types";
import { type GradTab, Stat, Segment, Legend, TabStrip, Th } from "@/components/graduation/parts";
import { termLabel, offeredOf, STATUS_PILL } from "@/components/graduation/format";
import { TermPicker, TermCard, TermFold, RailLink } from "@/components/graduation/TermCards";
import { AuditReport } from "@/components/graduation/AuditReport";
import { ImportDialog } from "@/components/graduation/ImportDialog";

/** Click-to-cycle order for the status pill. `null` = clear the override so
 *  the automatic derivation (Canvas enrollment, term position) decides. */
const CYCLE: (GradStatus | null)[] = [null, "passed", "failed", "dropped"];

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
        `${breakCount} break${breakCount === 1 ? "" : "s"} against ${plan.primaryTargetLabel}: see Plan warnings.`,
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
            Plan validation failed{plan.breaks.length} break
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
              Still owed: needs a new slot
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
              <Info className="h-3.5 w-3.5" /> Pending advisor resolution, not on the timeline
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
                  {audit.header.sjsuGpa?.toFixed(3) ?? "–"}
                </div>
                <div className="text-2xs text-muted-foreground">SJSU GPA</div>
              </div>
              <div className="px-3">
                <div data-numeric className="font-mono text-xl font-bold tabular-nums">
                  {audit.header.overallGpa?.toFixed(3) ?? "–"}
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
                  : "No warnings: the plan validates clean."
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
            and import it: retake flags, unit gaps and “apply to graduate” status all come
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
