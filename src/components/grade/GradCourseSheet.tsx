/**
 * GradCourseSheet — one plan course's strategic intelligence, in a slide-over.
 *
 * Called by: routes/Graduation.tsx (row click).
 * Calls: lib/gradData (the registry), lib/gradPlan (status lookups).
 *
 * A condensed port of CWA-Manager's CourseDrawer, restyled to this app's
 * tokens but keeping the same editorial section order: identity → prereq
 * chains → unlocks → risk & swap → workload → registration → advisor. The
 * prereq chain nodes resolve live against the merged plan, so "can I
 * actually register for this" is answered with current statuses, not the
 * plan's assumptions.
 */
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Compass,
  GitBranch,
  Layers,
  LockOpen,
  ShieldAlert,
  StickyNote,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { getCourseIntel, getTransferNote, isTransferred } from "@/lib/gradData";
import type { CourseIntel, RegFlag } from "@/lib/gradData";
import type { GradStatus } from "@/lib/gradPlan";
import { cn } from "@/lib/utils";

const RISK_CLS: Record<string, string> = {
  CRITICAL: "bg-critical/15 text-critical-fg border-critical/40",
  HIGH: "bg-critical/10 text-critical-fg border-critical/30",
  MEDIUM: "bg-at-risk/10 text-at-risk-fg border-at-risk/30",
  LOW: "bg-on-track/10 text-on-track-fg border-on-track/30",
};

export function GradCourseSheet({
  code,
  statusOf,
  onOpenChange,
}: {
  /** Null = closed. */
  code: string | null;
  /** Live status lookup from the merged plan, for chain resolution. */
  statusOf: (code: string) => GradStatus | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const intel = code ? getCourseIntel(code) : undefined;
  return (
    <Sheet open={code !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-full overflow-y-auto sm:max-w-lg">
        {code && !intel && (
          <SheetHeader>
            <SheetTitle className="font-display">{code}</SheetTitle>
            <SheetDescription>
              No intelligence on this course yet — it's outside the CWA plan registry. It still
              counts toward the term's units.
            </SheetDescription>
          </SheetHeader>
        )}
        {intel && <Body intel={intel} statusOf={statusOf} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  intel,
  statusOf,
}: {
  intel: CourseIntel;
  statusOf: (code: string) => GradStatus | undefined;
}) {
  return (
    <>
      <SheetHeader className="pb-1">
        <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {intel.code}
          <span
            className={cn(
              "rounded-sm border px-1.5 py-0.5 tracking-normal",
              RISK_CLS[intel.riskLevel],
            )}
          >
            {intel.riskLevel} risk
          </span>
          {intel.criticalPath && (
            <span className="rounded-sm border border-critical/40 bg-critical/15 px-1.5 py-0.5 tracking-normal text-critical-fg">
              critical path
            </span>
          )}
        </div>
        <SheetTitle className="pr-6 font-display leading-snug">{intel.fullName}</SheetTitle>
        <SheetDescription>{intel.shortPurpose}</SheetDescription>
      </SheetHeader>

      {/* Min-grade banner: severity drives the color, exactly as in CWA. */}
      <div
        className={cn(
          "mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
          intel.minGrade.severity === "standard" && "border-on-track/30 bg-on-track/10 text-on-track-fg",
          intel.minGrade.severity === "wid" && "border-at-risk/30 bg-at-risk/10 text-at-risk-fg",
          intel.minGrade.severity === "strict" && "border-critical/40 bg-critical/10 text-critical-fg",
        )}
      >
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Minimum grade: <strong>{intel.minGrade.value}</strong>
          {intel.minGrade.note && <> — {intel.minGrade.note}</>}
        </span>
      </div>

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <Section title="Course identity" icon={Compass}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <KV k="Units" v={String(intel.units)} />
          <KV k="Division" v={intel.division} />
          <KV k="Department" v={intel.department} />
          <KV k="Offered" v={intel.offered} warn={intel.offered.includes("only") || intel.offered.includes("Variable")} />
          <div className="col-span-2">
            <KV k="Satisfies" v={intel.geDesignation} />
          </div>
        </div>
      </Section>

      {/* ── Prereq chains ────────────────────────────────────────────────── */}
      <Section title="Prerequisite chain" icon={GitBranch}>
        {intel.prereqChains.length === 0 ? (
          <p className="text-xs text-muted-foreground">No prerequisites — open registration.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {intel.prereqChains.map((chain, i) => (
              <div key={i}>
                {chain.label && (
                  <div className="mb-1 text-2xs uppercase tracking-[0.15em] text-muted-foreground">
                    {chain.label}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  {chainCodes(chain.codes, intel.code).map((c, j, arr) => (
                    <span key={c} className="flex items-center gap-1.5">
                      <ChainNode code={c} focused={c === intel.code} statusOf={statusOf} />
                      {j < arr.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {intel.standingRequirement && (
              <p className="text-2xs text-muted-foreground">
                Also requires: {intel.standingRequirement}
              </p>
            )}
          </div>
        )}
      </Section>

      {/* ── Unlocks ──────────────────────────────────────────────────────── */}
      {(intel.unlocks.length > 0 || (intel.recommendedPrepFor?.length ?? 0) > 0) && (
        <Section title="What this course unlocks" icon={LockOpen}>
          <div className="flex flex-col gap-1.5">
            {intel.unlocks.map((u) => (
              <div
                key={u.code}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  u.flags?.includes("critical-path")
                    ? "border-critical/40 bg-critical/5"
                    : "border-border/60",
                )}
              >
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-mono text-xs font-semibold">{u.code}</span>
                  <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  {u.flags?.includes("once-per-year") && (
                    <span className="chip bg-critical/10 text-2xs text-critical-fg">once/year</span>
                  )}
                </div>
                <div className="text-2xs text-muted-foreground">{u.category}</div>
                {u.remainingPrereqs && (
                  <div className="mt-1 text-2xs text-at-risk-fg">
                    Still needs: {u.remainingPrereqs.join(", ")}
                  </div>
                )}
                {u.note && <p className="mt-1 text-2xs text-muted-foreground">{u.note}</p>}
              </div>
            ))}
            {intel.recommendedPrepFor?.map((p) => (
              <div key={p.code} className="rounded-lg border border-dashed border-border/60 px-3 py-2">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{p.code}</span>
                  <span className="text-muted-foreground">{p.name}</span>
                  <span className="chip ml-auto bg-fill-ghost text-2xs text-muted-foreground">prep only</span>
                </div>
                <p className="mt-0.5 text-2xs text-muted-foreground">{p.reason}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Risk & swap strategy ─────────────────────────────────────────── */}
      <Section title="If this slot breaks" icon={AlertTriangle}>
        <p className="text-xs leading-relaxed">{intel.delaysGraduation}</p>
        {intel.blockedDownstream.length > 0 && (
          <p className="mt-1.5 text-2xs text-critical-fg">
            Failing blocks: {intel.blockedDownstream.join(", ")}
          </p>
        )}
        <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
          {intel.safeSwap ? (
            <>
              <strong className="text-foreground/80">Safe swap:</strong> {intel.safeSwap}
            </>
          ) : (
            <strong className="text-critical-fg">No safe swap — this slot is load-bearing.</strong>
          )}
        </p>
      </Section>

      {/* ── Workload ─────────────────────────────────────────────────────── */}
      <Section title="Workload profile" icon={Activity}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <KV k="Workload" v={intel.workload} warn={intel.workload === "Heavy" || intel.workload === "Brutal"} />
          <KV k="Your alignment" v={intel.strengthAlignment} warn={intel.strengthAlignment === "Weak"} />
          <div className="col-span-2">
            <KV k="Leans on" v={intel.leansOn.join(" · ")} />
          </div>
          {intel.pairsWell.length > 0 && (
            <div className="col-span-2">
              <KV k="Pairs well with" v={intel.pairsWell.join(", ")} />
            </div>
          )}
          {intel.doNotPairWith.length > 0 && (
            <div className="col-span-2">
              <div className="text-2xs uppercase tracking-[0.15em] text-critical-fg">
                Do not pair with
              </div>
              <div className="mt-0.5 text-xs">{intel.doNotPairWith.join(", ")}</div>
            </div>
          )}
        </div>
        {intel.pairingNote && (
          <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">{intel.pairingNote}</p>
        )}
      </Section>

      {/* ── Registration flags ───────────────────────────────────────────── */}
      <Section title="Before you register" icon={Layers}>
        <div className="flex flex-col gap-1.5">
          {registrationFlags(intel, statusOf).map((f, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 text-xs",
                f.kind === "ok" && "text-on-track-fg",
                f.kind === "warn" && "text-at-risk-fg",
                f.kind === "fail" && "text-critical-fg",
              )}
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {f.text}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Advisor note ─────────────────────────────────────────────────── */}
      {intel.advisorNote && (
        <Section title="Advisor note" icon={StickyNote}>
          <p className="rounded-lg border border-at-risk/30 bg-at-risk/5 px-3 py-2 text-xs leading-relaxed">
            {intel.advisorNote}
          </p>
        </Section>
      )}
      <div className="pb-6" />
    </>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <>
      <Separator className="my-4" />
      <h3 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </>
  );
}

function KV({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-[0.15em] text-muted-foreground">{k}</div>
      <div className={cn("mt-0.5 text-xs", warn && "text-at-risk-fg font-medium")}>{v}</div>
    </div>
  );
}

/** Chain codes always end at the focused course. */
function chainCodes(codes: string[], focused: string): string[] {
  return codes[codes.length - 1] === focused ? codes : [...codes, focused];
}

function ChainNode({
  code,
  focused,
  statusOf,
}: {
  code: string;
  focused: boolean;
  statusOf: (code: string) => GradStatus | undefined;
}) {
  const transferred = isTransferred(code);
  const status = statusOf(code);
  const satisfied = transferred || status === "passed";
  const active = status === "in_progress";

  return (
    <span
      title={transferred ? getTransferNote(code) : undefined}
      className={cn(
        "rounded-sm border px-2 py-1 font-mono text-2xs font-semibold",
        focused && "border-brand/50 bg-brand/10 text-brand-fg",
        !focused && satisfied && "border-on-track/40 bg-on-track/10 text-on-track-fg",
        !focused && active && "border-at-risk/40 bg-at-risk/10 text-at-risk-fg",
        !focused && !satisfied && !active && "border-border/60 text-muted-foreground",
      )}
    >
      {code}
      {transferred && " ✓"}
    </span>
  );
}

/** Auto-derived registration rows + the registry's extra flags. */
function registrationFlags(
  intel: CourseIntel,
  statusOf: (code: string) => GradStatus | undefined,
): RegFlag[] {
  const flags: RegFlag[] = intel.prereqsRequired.map((code) => {
    if (isTransferred(code)) return { kind: "ok", text: `${code} — satisfied (transfer)` };
    const s = statusOf(code);
    if (s === "passed") return { kind: "ok", text: `${code} — passed` };
    if (s === "in_progress") return { kind: "warn", text: `${code} — in progress; must pass before registration` };
    if (s === "failed") return { kind: "fail", text: `${code} — FAILED; registration blocked until cleared` };
    return { kind: "warn", text: `${code} — not yet taken` };
  });
  if (flags.length === 0) {
    flags.push({ kind: "ok", text: "No course prerequisites." });
  }
  return [...flags, ...(intel.extraRegFlags ?? [])];
}
