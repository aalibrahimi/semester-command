/**
 * sims — the registry behind `sim` blocks. `Sim` looks the name up and
 * renders the component with the block's params; an unknown name renders a
 * visible notice instead of nothing, so a typo in a guide is caught by eye
 * as well as by check:guides.
 *
 * Called by: GuideBlocks (Read view and Slides).
 * Calls: each sim component below. All of them: theme tokens only, no
 * network, keyboard-usable, and they never throw on odd params.
 */
import type { ComponentType } from "react";
import type { SimName } from "@/study/sims";
import { DfaSim } from "./DfaSim";
import { FourierSim } from "./FourierSim";
import { GrowthSim } from "./GrowthSim";
import { HeapSim } from "./HeapSim";
import { NfaSim } from "./NfaSim";
import { RecTreeSim } from "./RecTreeSim";
import { RegexSim } from "./RegexSim";
import { SamplingSim } from "./SamplingSim";
import { SortSim } from "./SortSim";
import { StackQueueSim } from "./StackQueueSim";
import { TreeSim } from "./TreeSim";

export interface SimProps {
  params: Record<string, unknown>;
}

const REGISTRY: Record<SimName, ComponentType<SimProps>> = {
  dfa: DfaSim,
  nfa: NfaSim,
  sampling: SamplingSim,
  fourier: FourierSim,
  sort: SortSim,
  regex: RegexSim,
  tree: TreeSim,
  growth: GrowthSim,
  rectree: RecTreeSim,
  stackqueue: StackQueueSim,
  heap: HeapSim,
};

export function Sim({ name, params }: { name: string; params: Record<string, unknown> }) {
  const C = (REGISTRY as Record<string, ComponentType<SimProps> | undefined>)[name];
  if (!C) return <div className="rounded-lg border border-at-risk/40 bg-at-risk/[0.06] px-3 py-2 text-xs text-at-risk-fg">Unknown simulator "{name}".</div>;
  return <C params={params} />;
}

/* Shared bits for the sims. */

export const CTRL = "rounded-lg border border-border/70 bg-background px-2.5 py-1.5 font-mono text-[12.5px] outline-none focus:border-brand/60";
export const BTN = "flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost disabled:opacity-40";
export const BTN_SOLID = "flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40";
export const LABEL = "text-2xs font-medium uppercase tracking-wider text-muted-foreground";

export function num(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
export function str(params: Record<string, unknown>, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}
export function strs(params: Record<string, unknown>, key: string, fallback: string[]): string[] {
  const v = params[key];
  return Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : fallback;
}

/** Slider with a label and a live value. */
export function Dial({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="flex min-w-[180px] flex-1 flex-col gap-1">
      <span className="flex items-baseline justify-between">
        <span className={LABEL}>{label}</span>
        <span data-numeric className="font-mono text-xs text-foreground/90">
          {format ? format(value) : value}
          {unit && <span className="ml-0.5 text-muted-foreground">{unit}</span>}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[rgb(var(--accent))]" />
    </label>
  );
}
