/**
 * Small shared helpers for the Graduation page: status pill classes, term
 * and unit labels, offering seasons, error text.
 */
import { TERMS, type GradStatus } from "@/lib/gradPlan";
import { COURSE_INTEL } from "@/lib/gradData";
import type { AuditItem, Offering } from "@/types";

export const STATUS_PILL: Record<GradStatus, { label: string; cls: string }> = {
  planned: { label: "Planned", cls: "border-border/60 text-muted-foreground" },
  in_progress: { label: "In Progress", cls: "border-at-risk/40 bg-at-risk/10 text-at-risk-fg" },
  passed: { label: "Passed", cls: "border-on-track/40 bg-on-track/10 text-on-track-fg" },
  failed: { label: "Failed", cls: "border-critical/40 bg-critical/10 text-critical-fg" },
  dropped: { label: "Dropped", cls: "border-border/60 text-muted-foreground/60 line-through" },
};

export function termLabel(id: string): string {
  return TERMS.find((t) => t.id === id)?.label ?? id;
}

export function offeredOf(code: string): string | undefined {
  return COURSE_INTEL[code]?.offered;
}

export function fmt(units: number): string {
  return Number.isInteger(units) ? String(units) : units.toFixed(1);
}

export function offeringLabel(o: Offering): string {
  if (o.term) return o.term;
  if (o.variable) return "varies";
  const seasons = [o.fall && "Fall", o.spring && "Spring", o.summer && "Summer"].filter(
    Boolean,
  ) as string[];
  if (seasons.length === 0) return "–";
  const base = seasons.join(" / ");
  return o.parity ? `${base} (${o.parity} yrs)` : base;
}

export function seasonOf(options: AuditItem["options"]): string {
  const o = options.find((c) => c.offering)?.offering;
  if (!o) return "One term";
  if (o.fall) return "Fall";
  if (o.spring) return "Spring";
  if (o.summer) return "Summer";
  return "One term";
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Something went wrong importing the report.";
}
