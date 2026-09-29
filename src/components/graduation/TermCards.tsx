/**
 * The plan timeline: one card per term, the folded view of past terms, the
 * rail links and the term picker.
 */
import { useState } from "react";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { TERMS, type GradStatus, type MergedPlan, type PlanRow } from "@/lib/gradPlan";
import { cn } from "@/lib/utils";
import { STATUS_PILL } from "@/components/graduation/format";
import { Th } from "@/components/graduation/parts";
import { CourseLine } from "@/components/graduation/AuditReport";

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
export function TermCard({
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
                title={`${STATUS_PILL[row.status].label}: click to mark: auto → passed → failed → dropped`}
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
export function TermFold({
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
export function RailLink({
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
export function TermPicker({
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
