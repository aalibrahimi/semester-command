/**
 * AssignmentSheet — one assignment in full, in a right slide-over (§9.5).
 *
 * Called by: CourseDetail (row click). A Sheet rather than a Dialog so the
 * assignment list stays visible behind it.
 * Calls: ipc `set_estimate`, tauri-plugin-opener for the Canvas link.
 *
 * The description is instructor-authored Canvas HTML rendered as-is (minus
 * scripts/handlers — see `sanitize`). The webview's CSP already blocks script
 * execution and remote requests, so the strip is belt-and-braces, not the
 * security boundary.
 */
import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, Scale, Timer } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { setEstimate } from "@/lib/ipc";
import { sanitize } from "@/lib/canvasHtml";
import { dateTime, minutes, points, relativeDue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssignmentDetail } from "@/types";

export function AssignmentSheet({
  assignment: a,
  onOpenChange,
  onChanged,
}: {
  /** Null = closed. */
  assignment: AssignmentDetail | null;
  onOpenChange: (open: boolean) => void;
  /** Fired after a local edit (estimate) so the parent can refresh. */
  onChanged: () => void;
}) {
  return (
    <Sheet open={a !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] max-w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        {a && <SheetBody a={a} onChanged={onChanged} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ a, onChanged }: { a: AssignmentDetail; onChanged: () => void }) {
  return (
    <>
      <SheetHeader className="pb-2">
        <SheetTitle className="pr-6 font-display leading-snug">
          {a.name ?? "Untitled"}
        </SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          {a.missing && <span className="chip bg-critical/10 text-2xs text-critical-fg">missing</span>}
          {a.late && <span className="chip bg-at-risk/10 text-2xs text-at-risk-fg">late</span>}
          {a.excused && <span className="chip bg-fill-ghost text-2xs">excused</span>}
          {a.omitted && <span className="chip bg-fill-ghost text-2xs">not counted in grade</span>}
          {a.source !== "api" && <Badge variant="secondary" className="text-2xs">{a.source}</Badge>}
        </SheetDescription>
      </SheetHeader>

      {/* ── The numbers ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 py-3">
        <Stat label="due" value={a.dueAt ? relativeDue(a.dueAt) : "no due date"} sub={a.dueAt ? dateTime(a.dueAt) : undefined} />
        <Stat label="score" value={points(a.score, a.pointsPossible)} sub={a.score === null ? "not graded" : a.submitted ? "graded" : undefined} />
        <Stat label="grade impact" value={`${a.impactPct.toFixed(1)}%`} sub="of your final grade" />
        <EstimateStat a={a} onChanged={onChanged} />
      </div>

      {submissionKinds(a.submissionTypes) && (
        <p className="pb-2 text-2xs text-muted-foreground">
          Submit via {submissionKinds(a.submissionTypes)}
        </p>
      )}

      {a.htmlUrl && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => void openUrl(a.htmlUrl as string)}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Open in Canvas
        </Button>
      )}

      {/* ── Description ──────────────────────────────────────────────────── */}
      {a.descriptionHtml ? (
        <>
          <Separator className="my-4" />
          <div
            className="canvas-html text-sm leading-relaxed"
            // Instructor HTML; sanitised below and inert under the app CSP.
            dangerouslySetInnerHTML={{ __html: sanitize(a.descriptionHtml) }}
          />
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-fill-ghost/60 p-3 text-xs text-muted-foreground">
          No description on this assignment{a.htmlUrl ? " — check the Canvas page" : ""}.
        </p>
      )}

      {/* ── Rubric ───────────────────────────────────────────────────────── */}
      {a.hasRubric && <RubricBlock rubricJson={a.rubricJson} />}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-fill-ghost/60 px-3 py-2">
      <div className="text-2xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div data-numeric className="font-mono text-sm font-medium tabular-nums">{value}</div>
      {sub && <div className="text-2xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** The estimate, editable here too — same semantics as the triage cell. */
function EstimateStat({ a, onChanged }: { a: AssignmentDetail; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const save = () => {
    const mins = value.trim() === "" ? null : Number.parseInt(value, 10);
    if (mins !== null && (Number.isNaN(mins) || mins < 0)) {
      toast.error("Estimates are minutes — plain numbers only.");
      return;
    }
    setEstimate(a.id, mins)
      .then(() => {
        setEditing(false);
        onChanged();
      })
      .catch(() => toast.error("Could not save the estimate."));
  };

  if (editing) {
    return (
      <div className="rounded-xl bg-fill-ghost/60 px-3 py-2">
        <div className="text-2xs uppercase tracking-wide text-muted-foreground">my estimate</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="minutes"
          className="mt-0.5 w-full rounded-md border border-brand bg-transparent px-1.5 py-0.5 font-mono text-sm tabular-nums outline-none"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setValue(a.estMinutes?.toString() ?? "");
        setEditing(true);
      }}
      className="rounded-xl bg-fill-ghost/60 px-3 py-2 text-left transition-colors duration-micro hover:bg-fill-ghost"
      title="Click to edit"
    >
      <div className="flex items-center gap-1 text-2xs uppercase tracking-wide text-muted-foreground">
        <Timer className="h-3 w-3" /> my estimate
      </div>
      <div data-numeric className="font-mono text-sm font-medium tabular-nums">
        {minutes(a.estMinutes)}
      </div>
    </button>
  );
}

/** Rubric criteria: description + points, ratings on hover-free display. */
function RubricBlock({ rubricJson }: { rubricJson: string | null }) {
  const criteria = parseRubric(rubricJson);
  if (criteria.length === 0) return null;
  return (
    <>
      <Separator className="my-4" />
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Scale className="h-3.5 w-3.5" /> Rubric
      </h3>
      <div className="flex flex-col gap-1.5 pb-6">
        {criteria.map((c, i) => (
          <div key={i} className="rounded-lg border border-border/60 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1">{c.description}</span>
              <span data-numeric className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {c.points} pts
              </span>
            </div>
            {c.ratings.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {c.ratings.map((r, j) => (
                  <span key={j} className={cn("chip bg-fill-ghost text-2xs text-muted-foreground")}>
                    {r.points}: {r.description}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

interface Criterion {
  description: string;
  points: number;
  ratings: { description: string; points: number }[];
}

/** '["online_upload","online_text_entry"]' → "online upload, online text
 *  entry". Null/unparseable/none → null, and the line is not rendered. */
function submissionKinds(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const kinds = parsed
      .map((k) => String(k).replaceAll("_", " "))
      .filter((k) => k !== "" && k !== "none" && k !== "not graded");
    return kinds.length > 0 ? kinds.join(", ") : null;
  } catch {
    return null;
  }
}

/** Stored shape: {"rubric": [criteria...], "settings": {...}}. Defensive —
 *  malformed rubric JSON renders nothing rather than crashing the sheet. */
function parseRubric(raw: string | null): Criterion[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = (parsed as { rubric?: unknown }).rubric;
    if (!Array.isArray(list)) return [];
    return list.map((c) => {
      const crit = c as Record<string, unknown>;
      const ratings = Array.isArray(crit.ratings)
        ? (crit.ratings as Record<string, unknown>[]).map((r) => ({
            description: String(r.description ?? ""),
            points: Number(r.points ?? 0),
          }))
        : [];
      return {
        description: String(crit.description ?? "Criterion"),
        points: Number(crit.points ?? 0),
        ratings,
      };
    });
  } catch {
    return [];
  }
}

