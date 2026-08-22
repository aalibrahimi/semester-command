/**
 * Graduation — what is left before the degree is conferred.
 *
 * Called by: the router, at "/graduation".
 * Calls: ipc get_degree_audit / import_myprogress / set_target_term.
 *
 * # Why this screen is not a progress bar
 *
 * Canvas knows nothing about degree requirements. Everything here comes from
 * a pasted MySJSU MyProgress report, and the three things that actually cost a
 * student a semester are none of them "percent complete":
 *
 *   1. **Graduation status.** A finished degree is not a conferred degree.
 *      `Not Applied` sits at the top of this screen in `--critical` because
 *      no amount of coursework fixes it.
 *   2. **Retakes.** A course passed with a grade below a requirement's floor
 *      reads as "not completed" in the report and as "never taken" in a naive
 *      audit. It is neither. Retakes get their own badge and say what the
 *      grade was.
 *   3. **Offering cadence.** A Fall-only course behind a prerequisite chain is
 *      what turns one missing course into an extra year. Single-term and
 *      `Variable Offering` requirements are called out, not buried in a cell.
 *
 * # No arithmetic here
 *
 * Every number rendered was computed in `src-tauri/src/degree.rs`. Per
 * SPEC.md §10 a percentage derived in TypeScript is a bug — this file
 * formats and arranges, nothing else.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardPaste,
  GraduationCap,
  Info,
  RotateCcw,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { StatTile } from "@/components/layout/StatTile";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDegreeAudit, importMyProgress, setTargetTerm } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { AuditItem, DegreeAudit, Offering } from "@/types";

/** Terms the user can aim at. Kept short deliberately — this is a choice
 *  between two or three realistic dates, not a date picker. */
const TARGET_TERMS = ["Fall 2026", "Spring 2027", "Fall 2027", "Spring 2028", "Fall 2028"];

export default function Graduation() {
  const [audit, setAudit] = useState<DegreeAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setAudit(await getDegreeAudit());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  // The initial load is its own effect rather than a call to `refresh` so the
  // `alive` guard can drop a response that arrives after the user has already
  // navigated away — setting state on an unmounted route is a warning nobody
  // can act on, three screens later.
  useEffect(() => {
    let alive = true;
    getDegreeAudit()
      .then((a) => {
        if (alive) setAudit(a);
      })
      .catch((e: unknown) => toast.error(errorMessage(e)))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="px-8 py-7">
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <ScreenHeader
        title="Graduation"
        subtitle={
          audit?.header.plan
            ? `${audit.header.plan}${audit.header.catalogTerm ? ` · catalog ${audit.header.catalogTerm}` : ""}`
            : "what is left before the degree is conferred"
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <ClipboardPaste className="mr-1.5 size-4" />
            {audit ? "Re-import" : "Import MyProgress"}
          </Button>
        }
      />

      {!audit ? (
        <div className="px-8">
          <EmptyState
            icon={GraduationCap}
            title="No degree progress imported yet"
            description={
              <>
                Canvas does not know your degree requirements. Open{" "}
                <span className="font-medium">MySJSU → My Progress</span>, click{" "}
                <span className="font-medium">Expand All</span> and{" "}
                <span className="font-medium">View All</span> on every course
                table, select the whole page and paste it here.
              </>
            }
            action={
              <Button onClick={() => setImportOpen(true)}>
                <ClipboardPaste className="mr-1.5 size-4" />
                Paste report
              </Button>
            }
          />
        </div>
      ) : (
        <Report audit={audit} onChanged={refresh} />
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(a) => {
          setAudit(a);
          setImportOpen(false);
        }}
      />
    </div>
  );
}

function Report({
  audit,
  onChanged,
}: {
  audit: DegreeAudit;
  onChanged: () => void;
}) {
  const notApplied = audit.header.graduationStatus?.toLowerCase() === "not applied";
  const retakes = useMemo(
    () => audit.outstanding.filter((i) => i.retakeOf),
    [audit.outstanding],
  );

  // Rust computed both halves; this only decides how to say "36.6" versus
  // "36.6–42.6" when the report leaves elective room unallocated.
  const unitsLabel =
    audit.unallocatedBucketUnits > 0
      ? `${fmt(audit.unitsFromCourses)}–${fmt(audit.unitsFromCourses + audit.unallocatedBucketUnits)}`
      : fmt(audit.unitsFromCourses);

  return (
    <div className="space-y-6 px-8">
      {notApplied && (
        <Callout
          tone="critical"
          icon={AlertTriangle}
          title="You have not applied to graduate"
          body={
            <>
              MyProgress reports your graduation status as{" "}
              <span className="font-medium">Not Applied</span>. SJSU requires
              the application roughly two terms ahead of your intended
              graduation date, and missing that window delays conferral no
              matter how the coursework lands. This is the one item on this
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
              MyProgress shows only ten rows per table. These requirements have
              more eligible courses than were captured:{" "}
              <span className="font-medium">
                {audit.truncatedRequirements.join(", ")}
              </span>
              . Re-paste with <span className="font-medium">View All</span>{" "}
              clicked so the options you can actually schedule are not hidden.
            </>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={ScrollText}
          label="Units remaining"
          value={unitsLabel}
          caption={
            audit.unallocatedBucketUnits > 0
              ? `${fmt(audit.unallocatedBucketUnits)} units of elective room unallocated`
              : "across itemised requirements"
          }
        />
        <StatTile
          icon={GraduationCap}
          label="Requirements left"
          value={String(audit.outstanding.length)}
          caption={retakes.length > 0 ? `${retakes.length} is a retake` : "none are retakes"}
        />
        <TargetTile audit={audit} onChanged={onChanged} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold">
          Outstanding requirements
        </h2>
        <div className="space-y-2.5">
          {audit.outstanding.map((item) => (
            <RequirementCard key={item.key} item={item} />
          ))}
        </div>
      </section>

      {audit.buckets.length > 0 && (
        <section>
          <h2 className="mb-1 font-display text-base font-semibold">Unit totals</h2>
          <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
            Satisfied <em>by</em> the courses above rather than alongside them,
            so these are not added to the total. MyProgress renders the nesting
            with indentation, which pasting discards — where a total exceeds
            what its itemised requirements cover, the difference is real work
            with no row of its own.
          </p>
          <div className="panel divide-y divide-border/60">
            {audit.buckets.map((b) => (
              <div key={b.key} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm">{b.title}</span>
                <span className="font-mono text-sm text-muted-foreground" data-numeric>
                  {b.unitsNeeded === null ? "—" : `${fmt(b.unitsNeeded)} units`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Provenance audit={audit} />
    </div>
  );
}

function RequirementCard({ item }: { item: AuditItem }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? item.options : item.options.slice(0, 4);

  return (
    <div
      className={cn(
        "panel px-4 py-3",
        item.retakeOf && "border-critical/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{item.title}</span>

        {item.retakeOf && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="chip bg-critical/15 text-critical-fg">
                <RotateCcw className="mr-1 size-3" />
                Retake
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              You took {item.retakeOf.code} and scored{" "}
              <span className="font-medium">{item.retakeOf.grade}</span>. This
              requirement needs {item.minGrade} or better, so it must be taken
              again — the grade counted elsewhere but not here.
            </TooltipContent>
          </Tooltip>
        )}

        {item.singleTermOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="chip bg-at-risk/15 text-at-risk-fg">
                <CalendarClock className="mr-1 size-3" />
                {seasonOf(item.options)} only
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Offered in one term per year. Miss it and the next chance is a
              full year away, which is how a single course becomes an extra
              semester.
            </TooltipContent>
          </Tooltip>
        )}

        {item.needsAdvisor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="chip bg-at-risk/15 text-at-risk-fg">
                <AlertTriangle className="mr-1 size-3" />
                Variable offering
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              MyProgress says “Variable Offering — See Advisor”. The department
              commits to no cadence, so a plan that depends on this course has
              nothing behind it. Ask your advisor when it next runs.
            </TooltipContent>
          </Tooltip>
        )}

        <span className="ml-auto font-mono text-sm text-muted-foreground" data-numeric>
          {item.unitsNeeded === null ? "—" : `${fmt(item.unitsNeeded)} units`}
        </span>
      </div>

      {item.options.length > 0 && (
        <ul className="mt-2.5 space-y-1">
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
          Only {item.truncated.shown} of {item.truncated.total} eligible courses
          were captured — re-paste with View All.
        </p>
      )}
    </div>
  );
}

function TargetTile({
  audit,
  onChanged,
}: {
  audit: DegreeAudit;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function pick(term: string) {
    setSaving(true);
    try {
      await setTargetTerm(term);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel px-4 py-3">
      <p className="text-xs text-muted-foreground">Target graduation</p>
      <p className="mt-0.5 font-mono text-lg" data-numeric>
        {audit.targetTerm ?? "not set"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {TARGET_TERMS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={saving}
            onClick={() => void pick(t)}
            className={cn(
              "chip border border-border px-2 py-0.5 text-2xs transition-colors duration-micro",
              t === audit.targetTerm
                ? "border-brand bg-brand/10 text-brand-fg"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Provenance({ audit }: { audit: DegreeAudit }) {
  return (
    <p className="text-2xs text-muted-foreground">
      {audit.header.overallGpa !== null && (
        <>
          Overall GPA{" "}
          <span className="font-mono" data-numeric>
            {audit.header.overallGpa.toFixed(3)}
          </span>
          {audit.header.sjsuGpa !== null && (
            <>
              {" · "}SJSU{" "}
              <span className="font-mono" data-numeric>
                {audit.header.sjsuGpa.toFixed(3)}
              </span>
            </>
          )}
          {" · "}
        </>
      )}
      {audit.generatedAt && <>MyProgress generated {audit.generatedAt}. </>}
      This is an unofficial report. SJSU and CSU regulations prevail — confirm
      anything here with your advisor before planning around it.
    </p>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: (a: DegreeAudit) => void;
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
      onImported(audit);
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
            In MySJSU open <span className="font-medium">My Progress</span>,
            click <span className="font-medium">Expand All</span>, then{" "}
            <span className="font-medium">View All</span> on every course table
            — they cap at ten rows and the rest are silently dropped. Select the
            whole page, copy, and paste below.
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

/* ── helpers ──────────────────────────────────────────────────────────────── */

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
        "panel flex gap-3 px-4 py-3",
        tone === "critical" ? "border-critical/40 bg-critical/5" : "border-at-risk/40 bg-at-risk/5",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
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

/** One decimal, but only when there is one — "3" not "3.0", "2.6" stays. */
function fmt(units: number): string {
  return Number.isInteger(units) ? String(units) : units.toFixed(1);
}

/** Short label for the `When` column. The raw string is the tooltip. */
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

/** Which single season a set of single-term options runs in. */
function seasonOf(options: AuditItem["options"]): string {
  const o = options.find((c) => c.offering)?.offering;
  if (!o) return "One term";
  if (o.fall) return "Fall";
  if (o.spring) return "Spring";
  if (o.summer) return "Summer";
  return "One term";
}

/** CommandError crosses IPC as `{ kind, message }`; anything else is a bug. */
function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Something went wrong importing the report.";
}
