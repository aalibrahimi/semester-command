/**
 * Assignments grouped by category, one row each with due date, status and
 * score.
 */
import { useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { ImpactBar } from "@/components/triage/ImpactBar";
import { urgencyTier } from "@/lib/urgency";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { stripShouting } from "@/lib/stripShouting";
import { dueShort, pct, points } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssignmentDetail, GroupDetail } from "@/types";

export function GroupedAssignments({
  groups,
  assignments,
  mode,
  hoverGroupId,
  filterGroupId,
  onClearFilter,
  onOpen,
  onAdd,
}: {
  groups: GroupDetail[];
  assignments: AssignmentDetail[];
  mode: string;
  hoverGroupId: string | null;
  filterGroupId: string | null;
  onClearFilter: () => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Heaviest weight first; the synthetic "ungrouped" section trails.
  const ordered = useMemo(() => {
    const withRows = groups
      .map((g) => ({
        group: g,
        rows: assignments
          .filter((a) => a.groupId === g.id)
          .sort(byDueUndatedLast),
      }))
      .filter((g) => g.rows.length > 0)
      .sort((a, b) => (b.group.weight ?? -1) - (a.group.weight ?? -1));
    const orphans = assignments.filter((a) => !groups.some((g) => g.id === a.groupId));
    if (orphans.length > 0) {
      withRows.push({
        group: {
          id: "__ungrouped",
          name: "Ungrouped",
          weight: null,
          sharePct: 0,
          currentPct: null,
          gradedCount: orphans.filter((a) => a.score !== null).length,
          totalCount: orphans.length,
        },
        rows: [...orphans].sort(byDueUndatedLast),
      });
    }
    return filterGroupId ? withRows.filter((g) => g.group.id === filterGroupId) : withRows;
  }, [groups, assignments, filterGroupId]);

  return (
    <Card className="rounded-3xl border-border/60 pt-4 shadow-card xl:col-span-3">
      <div className="mb-1 flex items-center justify-between px-5">
        <h3 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Assignments
        </h3>
        <div className="flex items-center gap-3">
          {filterGroupId && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-2xs text-brand-fg underline underline-offset-2"
            >
              Clear group filter
            </button>
          )}
          <button
            type="button"
            onClick={onAdd}
            title="Add an assignment by hand: the syllabus knows things Canvas doesn't yet"
            className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors duration-micro hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>

      {/* Column labels, once — the numbers below explain themselves. */}
      <div className={cn(ROW_GRID, "px-5 pb-1")}>
        <span />
        <span className="text-right text-2xs uppercase tracking-wider text-muted-foreground/70">
          due
        </span>
        <span className="hidden text-right text-2xs uppercase tracking-wider text-muted-foreground/70 md:block">
          grade impact
        </span>
        <span className="text-right text-2xs uppercase tracking-wider text-muted-foreground/70">
          score
        </span>
      </div>

      <div className="flex flex-col pb-2">
        {ordered.map(({ group, rows }) => {
          const isCollapsed = collapsed.has(group.id);
          return (
            <div
              key={group.id}
              className={cn(hoverGroupId === group.id && "bg-fill-ghost/30")}
            >
              {/* Sticky group header, on the same grid as the rows. */}
              <button
                type="button"
                onClick={() => toggle(group.id)}
                className={cn(
                  ROW_GRID,
                  "sticky top-0 z-10 w-full border-t border-border/60 bg-card px-5 py-2 text-left transition-colors duration-micro hover:bg-fill-ghost",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-micro",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <span className="min-w-0 truncate text-xs font-semibold">
                    {group.name ?? "Unnamed group"}
                  </span>
                  <span
                    data-numeric
                    className="shrink-0 whitespace-nowrap font-mono text-2xs tabular-nums text-muted-foreground"
                  >
                    {group.gradedCount}/{group.totalCount} graded
                  </span>
                </span>
                <span />
                <span
                  data-numeric
                  className="hidden whitespace-nowrap text-right font-mono text-2xs tabular-nums text-muted-foreground md:block"
                >
                  {mode === "weighted" && group.weight !== null
                    ? `${group.weight.toFixed(0)}% of grade`
                    : ""}
                </span>
                <span
                  data-numeric
                  className="whitespace-nowrap text-right font-mono text-xs tabular-nums"
                >
                  {pct(group.currentPct)}
                </span>
              </button>
              {!isCollapsed && rows.map((a) => <AssignmentRow key={a.id} a={a} onOpen={() => onOpen(a.id)} />)}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** One grid template shared by the label row, group headers, and assignment
 *  rows — every number lands in a true column. The impact column collapses
 *  on narrow windows (its cells carry hidden/md too). */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_100px_84px] items-center gap-3 md:grid-cols-[minmax(0,1fr)_100px_150px_84px]";

function byDueUndatedLast(a: AssignmentDetail, b: AssignmentDetail): number {
  // Undated items never float to the top: they sort after everything dated.
  return (a.dueAt ?? "9999") .localeCompare(b.dueAt ?? "9999");
}

/** Row state, told once by a dot instead of a crowd of chips. Chips stay
 *  for true exceptions (missing, late, excused, [REQUIRED]). */
function rowStatus(a: AssignmentDetail): { cls: string; label: string; settled: boolean } {
  if (a.excused || a.omitted)
    return { cls: "bg-muted-foreground/30", label: "Excused", settled: true };
  if (a.score !== null) return { cls: "bg-on-track", label: "Graded", settled: true };
  if (a.submitted)
    return { cls: "bg-brand", label: "Submitted: awaiting grade", settled: true };
  const overdue = a.dueAt !== null && new Date(a.dueAt).getTime() < Date.now();
  if (a.missing || overdue) return { cls: "bg-critical", label: "Not turned in", settled: false };
  if (urgencyTier("open", a.dueAt) === "soon")
    return { cls: "bg-at-risk", label: "Due within 72 hours", settled: false };
  return {
    cls: "border border-muted-foreground/40 bg-transparent",
    label: "Upcoming",
    settled: false,
  };
}

/** Strict row grid via ROW_GRID: dot + title · due · impact · score. */
function AssignmentRow({ a, onOpen }: { a: AssignmentDetail; onOpen: () => void }) {
  const { title, flags } = stripShouting(a.name);
  const status = rowStatus(a);
  const dueTone = status.settled
    ? "text-muted-foreground/50"
    : status.cls === "bg-critical"
      ? "text-critical-fg"
      : status.cls === "bg-at-risk"
        ? "text-at-risk-fg"
        : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        ROW_GRID,
        "w-full border-t border-border/30 px-5 py-1.5 text-left transition-colors duration-micro hover:bg-fill-ghost/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          title={status.label}
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.cls)}
        />
        <span className={cn("truncate text-sm", status.settled && "text-muted-foreground")}>
          {title}
        </span>
        {a.missing && (
          <span className="chip shrink-0 bg-critical/10 text-2xs text-critical-fg">missing</span>
        )}
        {a.late && (
          <span className="chip shrink-0 bg-at-risk/10 text-2xs text-at-risk-fg">late</span>
        )}
        {a.excused && (
          <span className="chip shrink-0 bg-fill-ghost text-2xs text-muted-foreground">excused</span>
        )}
        {flags.map((f) => (
          <span
            key={f}
            className="chip shrink-0 border border-border/70 bg-transparent text-2xs text-muted-foreground"
          >
            {f}
          </span>
        ))}
        {a.source !== "api" && (
          <Badge variant="secondary" className="shrink-0 text-2xs">
            {a.source}
          </Badge>
        )}
      </span>
      <span
        data-numeric
        className={cn(
          "whitespace-nowrap text-right font-mono text-xs tabular-nums",
          a.dueAt ? dueTone : "text-muted-foreground/40",
        )}
      >
        {a.dueAt ? dueShort(a.dueAt) : "–"}
      </span>
      <span className="hidden justify-end md:flex">
        {a.impactPct > 0.05 ? (
          <ImpactBar
            impactPct={a.impactPct}
            tier={a.score !== null ? "later" : urgencyTier(a.missing ? "missing" : "open", a.dueAt)}
            width={96}
          />
        ) : (
          /* Zero impact is the absence of a fact — a dash, not "0.0%". */
          <span data-numeric className="font-mono text-xs tabular-nums text-muted-foreground/40">
            –
          </span>
        )}
      </span>
      <span
        data-numeric
        className={cn(
          "whitespace-nowrap text-right font-mono text-sm tabular-nums",
          a.score === null && "text-muted-foreground",
        )}
      >
        {a.score === null && !a.pointsPossible ? "–" : points(a.score, a.pointsPossible)}
      </span>
    </button>
  );
}

/* ── Solver ──────────────────────────────────────────────────────────────── */
