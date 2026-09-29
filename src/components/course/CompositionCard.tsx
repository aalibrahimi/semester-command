/**
 * Grade composition card: how each assignment group contributes to the
 * course grade, as colored segments.
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { GroupDetail } from "@/types";

/** Categorical hues for the donut segments — the same family as course
 *  identity colors, applied per group here. */
const SEGMENT_HUES = [217, 330, 172, 282, 48, 255, 200];

interface SegmentInfo {
  group: GroupDetail;
  share: number; // 0–100, share of the course
  hue: number;
  graded: boolean;
  zeroWeightWithWork: boolean;
}

function segmentsOf(groups: GroupDetail[], mode: string): SegmentInfo[] {
  // `sharePct` arrives computed from grades.rs — this function only assigns
  // hues and flags. The weight normalisation that used to live here was the
  // §10 violation ("a percentage computed in TypeScript is a bug").
  return groups
    .map((g, i) => ({
      group: g,
      share: g.sharePct,
      hue: SEGMENT_HUES[i % SEGMENT_HUES.length],
      graded: g.gradedCount > 0,
      zeroWeightWithWork: mode === "weighted" && (g.weight ?? 0) === 0 && g.totalCount > 0,
    }))
    .sort((a, b) => b.share - a.share);
}

export function CompositionCard({
  groups,
  mode,
  centerLabel,
  hoverGroupId,
  onHover,
  filterGroupId,
  onFilter,
}: {
  groups: GroupDetail[];
  mode: string;
  centerLabel: string;
  hoverGroupId: string | null;
  onHover: (id: string | null) => void;
  filterGroupId: string | null;
  onFilter: (id: string) => void;
}) {
  const segments = useMemo(() => segmentsOf(groups, mode), [groups, mode]);

  // Donut geometry: r=54, stroke 16, circumference splits by share. Offsets
  // are precomputed so render stays pure.
  const R = 54;
  const C = 2 * Math.PI * R;
  const withOffsets = useMemo(
    () =>
      segments.reduce<{ seg: SegmentInfo; len: number; offset: number }[]>((out, seg) => {
        const len = (seg.share / 100) * C;
        const prev = out[out.length - 1];
        out.push({ seg, len, offset: prev ? prev.offset + prev.len : 0 });
        return out;
      }, []),
    [segments, C],
  );

  return (
    <Card className="rounded-3xl border-border/60 shadow-card xl:col-span-1">
      <CardContent className="flex h-full flex-col gap-4 pt-6">
        <h3 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Composition
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Grade composition">
              {withOffsets.map(({ seg, len, offset }) => (
                <circle
                  key={seg.group.id}
                  cx="75"
                  cy="75"
                  r={R}
                  fill="none"
                  strokeWidth={hoverGroupId === seg.group.id ? 20 : 16}
                  stroke={
                    seg.graded
                      ? `hsl(${seg.hue} 60% 58%)`
                      : `hsl(${seg.hue} 25% 40% / 0.35)`
                  }
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 75 75)"
                  className="cursor-pointer transition-all duration-micro"
                  onMouseEnter={() => onHover(seg.group.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onFilter(seg.group.id)}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span data-numeric className="font-mono text-xl font-semibold tabular-nums">
                {centerLabel}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                current
              </span>
            </div>
          </div>
        </div>

        {/* Legend = the group summary. No separate groups panel exists. */}
        <div className="flex flex-col gap-0.5">
          {segments.map((seg) => (
            <button
              key={seg.group.id}
              type="button"
              onMouseEnter={() => onHover(seg.group.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onFilter(seg.group.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-micro",
                hoverGroupId === seg.group.id && "bg-fill-ghost",
                filterGroupId === seg.group.id && "bg-fill-ghost-selected",
              )}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{
                  backgroundColor: seg.graded
                    ? `hsl(${seg.hue} 60% 58%)`
                    : `hsl(${seg.hue} 25% 40% / 0.45)`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-xs">
                {seg.group.name ?? "Unnamed group"}
              </span>
              {seg.zeroWeightWithWork && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="chip shrink-0 whitespace-nowrap border border-at-risk/40 bg-at-risk/10 text-2xs text-at-risk-fg">
                      0% of grade
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60">
                    This group contains {seg.group.totalCount} assignment
                    {seg.group.totalCount === 1 ? "" : "s"} but carries zero weight: either the
                    instructor's real choice, or a sync artifact worth checking.
                  </TooltipContent>
                </Tooltip>
              )}
              <span
                data-numeric
                className="w-14 shrink-0 whitespace-nowrap text-right font-mono text-2xs tabular-nums text-muted-foreground"
              >
                {seg.group.gradedCount}/{seg.group.totalCount}
              </span>
              <span
                data-numeric
                className="w-11 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums"
              >
                {seg.share.toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Grouped assignment list ─────────────────────────────────────────────── */
