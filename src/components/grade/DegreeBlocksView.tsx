/**
 * DegreeBlocksView — the 08/22/2026 MyProgress audit, block by block.
 *
 * Called by: routes/Graduation.tsx ("Degree Blocks" tab).
 * Calls: ipc degreeBlocks (the imported requirement table), lib/gradData
 * (course intel, for the planned-UD-units computation).
 *
 * The registrar doesn't owe you courses — it owes you BLOCKS, and a block
 * can be "any 1 of 48". This view keeps that shape: each requirement block
 * with its own required/taken/needed numbers, the eligible-course list for
 * choice blocks, and honesty flags where the audit itself is ambiguous
 * (Major Electives: 12 units needed but only 6 itemised — an advisor
 * question, not a fact this app can invent an answer to).
 *
 * Per SPEC.md §10 nothing here computes real grades: the GPA figures come
 * straight from the imported audit, and the forgiveness simulator is an
 * explicitly-labelled hypothetical (client-side what-if arithmetic on
 * numbers the registrar published), not grade math over stored scores.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Flame,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { degreeBlocks } from "@/lib/ipc";
import { COURSE_INTEL } from "@/lib/gradData";
import type { MergedPlan } from "@/lib/gradPlan";
import { cn } from "@/lib/utils";
import type { DegreeAudit, DegreeBlock, DegreeBlockCourse, DegreeBlocks } from "@/types";

/* ── Curation ──────────────────────────────────────────────────────────────
   MyProgress emits parent group rows AND their child line-items, plus a few
   duplicate slugs. Hide the parents/dups so each requirement appears once;
   anything not listed here still renders, so a re-import can't silently
   lose a block. */
const HIDDEN_KEYS = new Set([
  "RG1048", // University Units — parent banner (children LI30–LI50 shown)
  "RQ39:LI20", // 50-units-outside-CC — satisfied bookkeeping child, low signal
  "RG1076", // University GPA — parent (child slug shown)
  "RG1045", // Min GPA in residence — duplicate of the GPA family
  "RQ1", "RQ3513", "RQ2", "RQ3", "RQ6", "RQ2527", // GE area parents
  "RG1046", // SJSU Studies parent (children RQ1477/RQ16/RQ1274 shown)
  "RQ1477", // UD Area 2/5 parent (child LI10 shown)
  "RQ1011", // UD Area 3 duplicate of RQ1274
  "slug:ge--ud-area-4-self--society---equality-in-the-u-s", // dup of RQ16
  "RG3992", // GE Social Science Distribution — satisfied parent
  "RG2177", "RQ890", // American Institutions parents (children shown)
  "RG4511", "RG4514", // Major Prep / Major Requirements parents
  "slug:wid--computer-science-and-linguistics", // dup of RQ2996
  "slug:csln-major-electives", // bare dup of RQ3000 (the row with numbers)
]);

/** The audit rows the spec calls out as flatly satisfied — surfaced as a
 *  compact named strip so "is PE done?" never needs a scroll. */
const SATISFIED_CALLOUTS: { key: string; label: string }[] = [
  { key: "RG1049", label: "PE" },
  { key: "RQ2996", label: "WID (100W)" },
  { key: "slug:ai-us2---us-constitution-courses", label: "US2 — Constitution" },
  { key: "slug:ai-us3---ca-government", label: "US3 — CA Government" },
  { key: "slug:minimum-120-units", label: "120-unit minimum" },
  { key: "RQ39:LI40", label: "Residency (30 @ SJSU)" },
  { key: "RQ39:LI50", label: "24 UD in residence" },
];

const UD_UNITS_KEY = "RQ39:LI30"; // 40 Total Upper Division Units
const MAJOR_ELECTIVES_KEY = "RQ3000"; // 15 req / 3 taken / 12 needed
const MAJOR_GPA_KEY = "RG4514"; // carries gpaActual 3.056

/** Hypothetical-grade points for the forgiveness simulator. */
const GRADE_POINTS: { grade: string; pts: number }[] = [
  { grade: "A", pts: 4.0 },
  { grade: "A-", pts: 3.7 },
  { grade: "B+", pts: 3.3 },
  { grade: "B", pts: 3.0 },
  { grade: "B-", pts: 2.7 },
  { grade: "C+", pts: 2.3 },
  { grade: "C", pts: 2.0 },
  { grade: "C-", pts: 1.7 },
];

export function DegreeBlocksView({
  plan,
  audit,
}: {
  plan: MergedPlan;
  audit: DegreeAudit | null;
}) {
  const [data, setData] = useState<DegreeBlocks | null>(null);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    degreeBlocks()
      .then(setData)
      .catch(() => setData({ blocks: [], courses: [] }));
  }, []);

  const coursesByKey = useMemo(() => {
    const m = new Map<string, DegreeBlockCourse[]>();
    for (const c of data?.courses ?? []) {
      const list = m.get(c.requirementKey) ?? [];
      list.push(c);
      m.set(c.requirementKey, list);
    }
    return m;
  }, [data]);

  /** UD units still to come from the timeline: every not-yet-passed plan row
   *  whose intel says Upper Division. This is why the 13-unit gap is a
   *  bookkeeping fact, not a problem — the plan already covers it. */
  const plannedUdUnits = useMemo(() => {
    const rows = [...plan.terms.flatMap((t) => t.rows), ...plan.overdue];
    return rows
      .filter((r) => r.status === "planned" || r.status === "in_progress")
      .filter((r) => COURSE_INTEL[r.code]?.division === "Upper Division")
      .reduce((s, r) => s + r.units, 0);
  }, [plan]);

  if (data === null) {
    return (
      <div className="flex items-center gap-2 px-10 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading the audit blocks…
      </div>
    );
  }

  if (data.blocks.length === 0) {
    return (
      <p className="max-w-2xl border-l-[3px] border-border px-10 py-8 text-sm text-muted-foreground">
        No requirement blocks imported yet. Import your MyProgress report on the Registrar tab
        and every block — satisfied, in-progress and open — lands here.
      </p>
    );
  }

  const visible = data.blocks.filter((b) => !HIDDEN_KEYS.has(b.key));
  const satisfied = (b: DegreeBlock) =>
    b.status === "taken" || (b.unitsNeeded !== null && b.unitsNeeded <= 0 && b.status !== "error");
  const open = visible.filter((b) => b.status === "error");
  const inProgress = visible.filter((b) => b.status === "enrolled" && !satisfied(b));
  const done = visible.filter((b) => b.status !== "error" && (b.status === "taken" || satisfied(b)));

  const majorGpa = data.blocks.find((b) => b.key === MAJOR_GPA_KEY)?.gpaActual ?? null;
  const udBlock = data.blocks.find((b) => b.key === UD_UNITS_KEY) ?? null;

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="px-10 pb-12 pt-6"
    >
      {/* ═══ Dual GPA + forgiveness simulator ═══════════════════════════ */}
      <GpaCard
        majorGpa={majorGpa}
        sjsuGpa={audit?.header.sjsuGpa ?? null}
        overallGpa={audit?.header.overallGpa ?? null}
      />

      {/* ═══ The 40-UD-units meter — the audit's only unit Error ════════ */}
      {udBlock && udBlock.unitsRequired !== null && (
        <UdUnitsMeter block={udBlock} plannedUdUnits={plannedUdUnits} />
      )}

      {/* ═══ Open blocks ════════════════════════════════════════════════ */}
      <BlockGroup
        title="Open — what SJSU still counts against you"
        icon={<AlertTriangle className="h-4 w-4 text-critical-fg" />}
        blocks={open.filter((b) => b.key !== UD_UNITS_KEY)}
        coursesByKey={coursesByKey}
        openKeys={openKeys}
        onToggle={toggle}
      />

      {/* ═══ In progress ════════════════════════════════════════════════ */}
      <BlockGroup
        title="In progress — registered coursework counts once graded"
        icon={<CircleDashed className="h-4 w-4 text-at-risk-fg" />}
        blocks={inProgress}
        coursesByKey={coursesByKey}
        openKeys={openKeys}
        onToggle={toggle}
      />

      {/* ═══ Satisfied ══════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-on-track-fg" />
          <h2 className="font-display text-base font-bold tracking-tight">Satisfied</h2>
          <span className="ml-1 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            The audit closes these — no action left
          </span>
        </div>
        {/* The spec-named six first, so nothing needs hunting. */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SATISFIED_CALLOUTS.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-sm border border-on-track/35 bg-on-track/[0.07] px-2.5 py-1 text-xs font-medium text-on-track-fg"
            >
              <CheckCircle2 className="h-3 w-3" /> {c.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2.5">
          {done
            .filter((b) => !SATISFIED_CALLOUTS.some((c) => c.key === b.key))
            .map((b) => (
              <span key={b.key} className="text-xs text-muted-foreground">
                {b.title}
              </span>
            ))}
        </div>
      </div>

      {/* ═══ Critical path ══════════════════════════════════════════════ */}
      <CriticalPathCard />

      {/* ═══ Deadlines ══════════════════════════════════════════════════ */}
      <DeadlinesCard />
    </motion.section>
  );
}

/* ═══ Dual GPA + simulator ═════════════════════════════════════════════════ */

function GpaCard({
  majorGpa,
  sjsuGpa,
  overallGpa,
}: {
  majorGpa: number | null;
  sjsuGpa: number | null;
  overallGpa: number | null;
}) {
  const [grade, setGrade] = useState("B");
  // SJSU GPA units aren't in the audit header; 36 comes from the residence
  // block (34 required / 36 taken) and stays editable so the estimate can be
  // corrected against the transcript's exact figure.
  const [gpaUnits, setGpaUnits] = useState(36);

  const pts = GRADE_POINTS.find((g) => g.grade === grade)?.pts ?? 3.0;
  // Grade forgiveness: the retaken course's new grade REPLACES the D (1.0
  // grade points × 4 units) in the SJSU GPA. Hypothetical arithmetic only.
  const projected =
    sjsuGpa !== null && gpaUnits > 0
      ? (sjsuGpa * gpaUnits - 1.0 * 4 + pts * 4) / gpaUnits
      : null;

  return (
    <div className="mb-8 border-y border-border py-5">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto_1fr]">
        {/* The three GPAs, major first and largest — it's the strong one. */}
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <div className="text-2xs font-medium uppercase tracking-[0.18em] text-on-track-fg">
              Major GPA
            </div>
            <div
              data-numeric
              className="mt-1 font-mono text-[38px] font-bold leading-none tabular-nums tracking-tight text-on-track-fg"
            >
              {majorGpa !== null ? majorGpa.toFixed(3) : "—"}
            </div>
            <div className="mt-1 text-2xs text-muted-foreground">min 2.0 — comfortably clear</div>
          </div>
          <div>
            <div className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              SJSU GPA
            </div>
            <div
              data-numeric
              className="mt-1 font-mono text-[26px] font-bold leading-none tabular-nums tracking-tight"
            >
              {sjsuGpa !== null ? sjsuGpa.toFixed(3) : "—"}
            </div>
          </div>
          <div>
            <div className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Overall GPA
            </div>
            <div
              data-numeric
              className="mt-1 font-mono text-[26px] font-bold leading-none tabular-nums tracking-tight"
            >
              {overallGpa !== null ? overallGpa.toFixed(3) : "—"}
            </div>
          </div>
        </div>

        <div className="hidden w-px bg-border lg:block" />

        {/* Forgiveness simulator, seeded with the MATH 31 retake. */}
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Calculator className="h-3.5 w-3.5 text-brand-fg" />
            <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-foreground/80">
              Grade-forgiveness simulator · MATH 31
            </span>
          </div>
          <p className="mb-3 max-w-md text-xs leading-relaxed text-muted-foreground">
            Retaking MATH 31 (4 units, current grade D) with grade forgiveness replaces the D in
            your SJSU GPA. If the retake lands a{" "}
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="mx-0.5 rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground"
            >
              {GRADE_POINTS.map((g) => (
                <option key={g.grade} value={g.grade}>
                  {g.grade}
                </option>
              ))}
            </select>
            :
          </p>
          <div className="flex items-baseline gap-3">
            <span data-numeric className="font-mono text-sm tabular-nums text-muted-foreground">
              {sjsuGpa !== null ? sjsuGpa.toFixed(3) : "—"}
            </span>
            <span className="text-muted-foreground/60">→</span>
            <span
              data-numeric
              className={cn(
                "font-mono text-2xl font-bold tabular-nums",
                projected !== null && projected >= (sjsuGpa ?? 0)
                  ? "text-on-track-fg"
                  : "text-foreground",
              )}
            >
              {projected !== null ? projected.toFixed(3) : "—"}
            </span>
            <span className="text-2xs text-muted-foreground">
              over{" "}
              <input
                type="number"
                min={4}
                value={gpaUnits}
                onChange={(e) => setGpaUnits(Math.max(4, Number(e.target.value) || 0))}
                className="w-12 rounded-sm border border-border bg-card px-1 py-0.5 text-center font-mono text-xs tabular-nums"
              />{" "}
              SJSU GPA units
            </span>
          </div>
          <p className="mt-2 text-2xs text-muted-foreground/70">
            Estimate only — registrar math may differ. File the forgiveness request when
            registering the retake.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══ 40-UD-units meter ════════════════════════════════════════════════════ */

function UdUnitsMeter({
  block,
  plannedUdUnits,
}: {
  block: DegreeBlock;
  plannedUdUnits: number;
}) {
  const required = block.unitsRequired ?? 40;
  const taken = block.unitsTaken ?? 0;
  const needed = block.unitsNeeded ?? Math.max(0, required - taken);
  const autoResolving = plannedUdUnits >= needed;

  return (
    <div className="mb-8">
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        <h2 className="font-display text-base font-bold tracking-tight">{block.title}</h2>
        <span className="text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
          the audit's only unit error
        </span>
        {autoResolving && (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-on-track/40 bg-on-track/10 px-2 py-0.5 text-2xs font-semibold text-on-track-fg">
            <CheckCircle2 className="h-3 w-3" /> auto-resolving
          </span>
        )}
      </div>
      <div className="flex h-8 w-full overflow-hidden rounded-sm border border-border bg-card">
        <div
          className="flex items-center justify-center border-r border-on-track/60 bg-on-track/40 text-2xs font-semibold tabular-nums text-on-track-fg"
          style={{ width: `${(taken / required) * 100}%` }}
        >
          {taken}
        </div>
        <div
          className="flex items-center justify-center border-r border-brand/50 bg-brand/25 text-2xs font-semibold tabular-nums text-brand-fg"
          style={{ width: `${(Math.min(plannedUdUnits, needed) / required) * 100}%` }}
        >
          ~{Math.min(plannedUdUnits, needed)}
        </div>
        {plannedUdUnits < needed && (
          <div
            className="bg-fill-ghost"
            style={{ width: `${((needed - plannedUdUnits) / required) * 100}%` }}
          />
        )}
      </div>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {taken} upper-division units done, {needed} still required. Your timeline already carries
        ~{plannedUdUnits} more UD units in planned and in-progress courses
        {autoResolving
          ? " — finish the plan and this block closes itself. Nothing extra to schedule."
          : ` — ${needed - plannedUdUnits} units short. An extra UD course is needed somewhere.`}
      </p>
    </div>
  );
}

/* ═══ Block groups ═════════════════════════════════════════════════════════ */

function BlockGroup({
  title,
  icon,
  blocks,
  coursesByKey,
  openKeys,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  blocks: DegreeBlock[];
  coursesByKey: Map<string, DegreeBlockCourse[]>;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2.5">
        {icon}
        <h2 className="font-display text-base font-bold tracking-tight">{title}</h2>
      </div>
      <div className="border-t border-border">
        {blocks.map((b) => (
          <BlockRow
            key={b.key}
            block={b}
            eligible={coursesByKey.get(b.key) ?? []}
            open={openKeys.has(b.key)}
            onToggle={() => onToggle(b.key)}
          />
        ))}
      </div>
    </div>
  );
}

function BlockRow({
  block,
  eligible,
  open,
  onToggle,
}: {
  block: DegreeBlock;
  eligible: DegreeBlockCourse[];
  open: boolean;
  onToggle: () => void;
}) {
  const isChoice = (block.truncatedTotal ?? 0) > 1 || eligible.length > 1;
  const isMajorElectives = block.key === MAJOR_ELECTIVES_KEY;
  const expandable = eligible.length > 0 || block.note !== null || isMajorElectives;

  const needSummary: string[] = [];
  if (block.unitsNeeded !== null && block.unitsNeeded > 0)
    needSummary.push(`${block.unitsNeeded} unit${block.unitsNeeded === 1 ? "" : "s"} needed`);
  else if (block.coursesNeeded !== null && block.coursesNeeded > 0)
    needSummary.push(
      isChoice
        ? `pick ${block.coursesNeeded} of ${block.truncatedTotal ?? eligible.length} eligible`
        : `${block.coursesNeeded} course${block.coursesNeeded === 1 ? "" : "s"} needed`,
    );

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        className={cn(
          "grid w-full grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-4 px-2 py-3 text-left",
          expandable && "transition-colors hover:bg-fill-ghost/40",
        )}
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-sm font-medium">{cleanTitle(block.title)}</span>
          {isMajorElectives && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-at-risk/40 bg-at-risk/10 px-1.5 py-0.5 text-2xs font-semibold text-at-risk-fg">
              <HelpCircle className="h-3 w-3" /> UNRESOLVED — ask advisor
            </span>
          )}
          {block.unitsRequired !== null && (
            <span data-numeric className="font-mono text-2xs tabular-nums text-muted-foreground">
              {block.unitsTaken ?? 0}/{block.unitsRequired} units
            </span>
          )}
        </span>
        <span className="text-2xs font-medium text-muted-foreground">
          {needSummary.join(" · ")}
        </span>
        {expandable ? (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/60 transition-transform",
              open && "rotate-180",
            )}
          />
        ) : (
          <span />
        )}
      </button>

      {open && (
        <div className="px-2 pb-4">
          {isMajorElectives && (
            <div className="mb-3 max-w-3xl border-l-[3px] border-at-risk/70 bg-at-risk/[0.05] py-2.5 pl-3 pr-3 text-xs leading-relaxed text-foreground/85">
              The audit demands <span className="font-semibold">12 more elective units</span> but
              only itemises <span className="font-semibold">6</span> (one CS UD elective + one
              LING UD elective). Where the other 6 come from — extra electives, double-counted
              coursework, or an audit quirk — isn't stated anywhere in MyProgress.{" "}
              <span className="font-semibold">
                Advisor question: "Major Electives shows 12 units needed but the requirement list
                only names two 3-unit courses — what fills the rest?"
              </span>
            </div>
          )}
          {block.note && (
            <p className="mb-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {block.note}
            </p>
          )}
          {eligible.length > 0 && (
            <>
              <div className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                Eligible courses
                {block.truncatedTotal !== null &&
                  block.truncatedShown !== null &&
                  block.truncatedShown < block.truncatedTotal && (
                    <span className="ml-2 normal-case tracking-normal">
                      MyProgress shows {block.truncatedShown} of {block.truncatedTotal} — the full
                      list is in the SJSU catalog
                    </span>
                  )}
              </div>
              <div className="flex max-w-3xl flex-wrap gap-1.5">
                {eligible.map((c) => (
                  <span
                    key={`${c.requirementKey}-${c.code}`}
                    title={c.description ?? undefined}
                    className="rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-2xs"
                  >
                    {c.code}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** "CSLN MATH 31" reads fine; "GE: 6 Ethnic Studies" gets its colon space. */
function cleanTitle(title: string): string {
  return title.replace(/^GE: /, "GE · ").replace(/^CSLN /, "");
}

/* ═══ Critical path ════════════════════════════════════════════════════════ */

const CHAINS: {
  chain: string;
  cost: string;
  detail: string;
  unverified?: boolean;
}[] = [
  {
    chain: "CS 146 → CS 171 (Fall only)",
    cost: "missing Fall 2027 costs a year",
    detail:
      "CS 171 runs Fall only. CS 146 is in progress now — pass it and CS 171 lands in Fall 2027 as planned. Miss that window and the next offering is Fall 2028, which alone pushes graduation from Fall 2027 to Fall 2028.",
  },
  {
    chain: "MATH 31 → MATH 161A",
    cost: "retake must clear C− first",
    detail:
      "MATH 161A's prereq chain runs through MATH 31, and the current D doesn't count — the retake has to land C− or better before MATH 161A can be taken. Slot the retake early (grade forgiveness cleans the GPA at the same time).",
  },
  {
    chain: "MATH 39 prereq",
    cost: "UNVERIFIED",
    detail:
      "Whether MATH 39 requires MATH 31 (vs only MATH 30, which is done) is not stated in the audit and hasn't been verified against the catalog. Don't assume either way — confirm with the Math department before building a term around it.",
    unverified: true,
  },
];

function CriticalPathCard() {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2.5">
        <Flame className="h-4 w-4 text-critical-fg" />
        <h2 className="font-display text-base font-bold tracking-tight">Critical Path</h2>
        <span className="ml-1 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
          chains priced in semesters, not units
        </span>
      </div>
      <div className="border-t border-border">
        {CHAINS.map((c) => (
          <div
            key={c.chain}
            className="grid grid-cols-1 gap-x-8 gap-y-1 border-b border-border/60 px-2 py-3.5 last:border-b-0 md:grid-cols-[280px_minmax(0,1fr)]"
          >
            <div>
              <code className="text-sm font-semibold">{c.chain}</code>
              <div
                className={cn(
                  "mt-0.5 text-2xs font-semibold uppercase tracking-[0.12em]",
                  c.unverified ? "text-at-risk-fg" : "text-critical-fg",
                )}
              >
                {c.cost}
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-foreground/75">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Deadlines ════════════════════════════════════════════════════════════ */

const DEADLINES: {
  date: string;
  label: string;
  detail: string;
  top?: boolean;
  unverified?: boolean;
}[] = [
  {
    date: "Oct 9, 2026",
    label: "Graduation application — priority deadline (Fall 2027)",
    detail:
      "Verified with the SJSU Registrar: priority deadline (two semesters ahead) for a Fall 2027 graduation. Filing by this date gets the degree audit reviewed with time to fix anything it turns up.",
    top: true,
  },
  {
    date: "Mar 19, 2027",
    label: "Graduation application — final deadline (Fall 2027)",
    detail:
      "The Registrar's rule: apply no later than the add deadline of the term you graduate in. This is the hard stop for a Fall 2027 conferral.",
  },
  {
    date: "Feb 6, 2027",
    label: "Spring 2027 last day to add — repeat-course registration",
    detail:
      "Repeat-course (grade forgiveness) registration closes with the term's add/drop deadline. If the MATH 31 retake lands in Spring 2027, both the registration and the forgiveness paperwork are due by this date.",
  },
  {
    date: "TBD",
    label: "Spring 2028 fallback deadlines",
    detail:
      "The Registrar hasn't published Spring 2028 dates yet — the graduation-application and add deadlines for the fallback term are unverified until the 2027-28 calendar posts.",
    unverified: true,
  },
];

function DeadlinesCard() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <CalendarClock className="h-4 w-4 text-brand-fg" />
        <h2 className="font-display text-base font-bold tracking-tight">Deadlines</h2>
        <span className="ml-1 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
          verified with the registrar · also on your planner
        </span>
      </div>
      <div className="border-t border-border">
        {DEADLINES.map((d) => (
          <div
            key={d.label}
            className={cn(
              "grid grid-cols-1 gap-x-8 gap-y-1 border-b border-border/60 px-2 py-3.5 last:border-b-0 md:grid-cols-[130px_minmax(0,1fr)]",
              d.top && "-mx-2 border-l-[3px] border-l-brand/70 bg-brand/[0.05] pl-4",
            )}
          >
            <span
              data-numeric
              className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                d.unverified && "text-muted-foreground",
              )}
            >
              {d.date}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{d.label}</span>
                {d.top && (
                  <span className="rounded-sm border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-2xs font-semibold text-brand-fg">
                    highest priority
                  </span>
                )}
                {d.unverified && (
                  <span className="rounded-sm border border-at-risk/40 bg-at-risk/10 px-1.5 py-0.5 text-2xs font-semibold text-at-risk-fg">
                    unverified
                  </span>
                )}
              </div>
              <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                {d.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
