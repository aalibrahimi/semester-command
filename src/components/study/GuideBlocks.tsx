/**
 * GuideBlocks — renders guide-schema blocks (src/study/guide.ts) for the
 * Read view. Each block type gets its own shape so the eye can tell them
 * apart before reading a word:
 *
 *   prose       plain paragraphs, or a labeled callout: why it exists, in the
 *               real world, how to think about it, when to use it
 *   definition  card: term in a heading, body below — the bold terms
 *   example     card, monospace-friendly body
 *   trap        brand-tinted card with "COSTS POINTS · <source>" label
 *   table       bordered table
 *   stepper     the existing click-through Stepper
 *   figure      inline SVG with caption
 *   sim         an interactive simulator from sims/ (dials, machines, sound)
 *   code        a Python cell you edit and run in the app (PyCell)
 *   check       not rendered here — the right rail's "Test me" owns checks
 *
 * Called by: StudyRead. Calls: Inline (markdown-ish inline), Stepper.
 * Consecutive definition/trap cards are laid out in a two-column grid.
 */
import { useEffect, useState, type ReactNode } from "react";
import { AlertOctagon, Compass, Globe2, HelpCircle, Lightbulb, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuideBlock, ProseLabel } from "@/study/guide";
import { Inline } from "./Blocks";
import { ExampleBody } from "./ExampleBody";
import { ResourceChips } from "./ResourceChips";
import { PyCell } from "./PyCell";
import { Sim } from "./sims";
import { Stepper } from "./Stepper";

/** The four labeled callouts a prose block can be (guide.ts ProseLabel). */
const CALLOUT: Record<ProseLabel, { title: string; icon: typeof HelpCircle; box: string; head: string }> = {
  why: { title: "Why it exists", icon: HelpCircle, box: "border-border bg-fill-ghost/60", head: "text-muted-foreground" },
  world: { title: "In the real world", icon: Globe2, box: "border-on-track/35 bg-on-track/[0.06]", head: "text-on-track-fg" },
  think: { title: "How to think about it", icon: Lightbulb, box: "border-at-risk/35 bg-at-risk/[0.06]", head: "text-at-risk-fg" },
  when: { title: "When to use it", icon: Compass, box: "border-brand/35 bg-brand/[0.06]", head: "text-brand-fg" },
};

const BODY = "text-[15px] leading-[1.75] text-foreground/90";

/** Minimal markdown: paragraphs, "- " bullets, "1. " numbered lines, inline marks. */
export function Markdown({ md, className }: { md: string; className?: string }) {
  const lines = md.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) items.push(lines[i++].replace(/^\s*- /, ""));
      out.push(
        <ul key={out.length} className="flex flex-col gap-2 pl-1">
          {items.map((it, k) => (
            <li key={k} className={cn("flex gap-3", BODY)}>
              <span aria-hidden className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              <span className="min-w-0">
                <Inline text={it} />
              </span>
            </li>
          ))}
        </ul>,
      );
    } else if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\. /, ""));
      out.push(
        <ol key={out.length} className="flex flex-col gap-2">
          {items.map((it, k) => (
            <li key={k} className={cn("flex gap-3", BODY)}>
              <span data-numeric className="mt-[0.35em] w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {k + 1}
              </span>
              <span className="min-w-0">
                <Inline text={it} />
              </span>
            </li>
          ))}
        </ol>,
      );
    } else if (line.trim() === "") {
      i++;
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !/^\s*(- |\d+\. )/.test(lines[i])) para.push(lines[i++]);
      out.push(
        <p key={out.length} className={BODY}>
          <Inline text={para.join(" ")} />
        </p>,
      );
    }
  }
  return <div className={cn("flex flex-col gap-3", className)}>{out}</div>;
}

export function GuideBlockView({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "prose": {
      if (!block.label) {
        return (
          <div id={block.id} className="scroll-mt-6">
            <Markdown md={block.md} />
          </div>
        );
      }
      const c = CALLOUT[block.label];
      const Icon = c.icon;
      return (
        <aside id={block.id} className={cn("scroll-mt-6 rounded-xl border px-4 py-3.5", c.box)}>
          <div className={cn("mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider", c.head)}>
            <Icon className="h-3.5 w-3.5" /> {c.title}
          </div>
          <Markdown md={block.md} />
        </aside>
      );
    }

    case "definition":
      return (
        <div id={block.id} className="scroll-mt-6 rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-card">
          <div className="mb-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Definition</div>
          <div className="font-display text-base font-semibold tracking-tight">{block.term}</div>
          <p className={cn(BODY, "mt-1.5 text-sm leading-relaxed")}>
            <Inline text={block.body} />
          </p>
        </div>
      );

    case "example":
      return (
        <figure id={block.id} className="scroll-mt-6 overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
          <figcaption className="border-b border-border/60 px-4 py-2.5">
            <span className="mr-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Example</span>
            <span className="text-sm font-medium">{block.title}</span>
          </figcaption>
          <ExampleBody text={block.body} />
          {block.answer && (
            <div className="flex items-baseline gap-2 border-t border-on-track/25 bg-on-track/[0.06] px-4 py-2.5 text-sm">
              <span className="text-2xs font-semibold uppercase tracking-wider text-on-track-fg">Answer</span>
              <span className="font-medium text-foreground">
                <Inline text={block.answer} />
              </span>
            </div>
          )}
        </figure>
      );

    case "trap":
      return (
        <aside id={block.id} className="scroll-mt-6 rounded-xl border border-brand/40 bg-brand/[0.08] px-4 py-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-brand-fg">
            <AlertOctagon className="h-3.5 w-3.5" /> Costs points · {block.source}
            {block.points && <span className="ml-1 rounded-md bg-brand/15 px-1.5 py-px font-mono">{block.points}</span>}
          </div>
          <Markdown md={block.body} />
        </aside>
      );

    case "table": {
      return (
        <div id={block.id} className="scroll-mt-6 overflow-x-auto rounded-xl border border-border/70">
          {block.title && <div className="border-b border-border/60 px-3 py-2 text-sm font-medium">{block.title}</div>}
          <table className="w-full text-left text-xs">
            <thead className="bg-fill-ghost/70 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {block.columns.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t border-border/60 align-top">
                  {r.map((c, j) => (
                    <td key={j} className={cn("px-3 py-2 leading-relaxed", j === 0 && "font-medium text-foreground")}>
                      <Inline text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "stepper":
      return (
        <div id={block.id} className="scroll-mt-6">
          <Stepper title={block.title} frames={block.frames} />
        </div>
      );

    case "figure":
      return <FigureView id={block.id} svg={block.svg} viewBox={block.viewBox} caption={block.caption} />;

    case "sim":
      return (
        <figure id={block.id} className="scroll-mt-6 rounded-xl border border-border/70 bg-card px-4 py-4">
          <Sim name={block.sim} params={block.params ?? {}} />
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
            <Inline text={block.caption} />
          </figcaption>
        </figure>
      );

    case "code":
      return (
        <PyCell block={block}>
          <Markdown md={block.task} />
        </PyCell>
      );

    case "check":
      return null;
  }
}

const CARD_TYPES = new Set<GuideBlock["type"]>(["definition", "trap"]);

/**
 * A section's blocks with reading rhythm. Runs of two or more definition /
 * trap cards become a two-column grid (the wireframe pairs a definition with
 * the section's trap); examples and everything else stack full-width.
 */
export function GuideBlocks({ blocks }: { blocks: GuideBlock[] }) {
  const groups: GuideBlock[][] = [];
  for (const b of blocks) {
    if (b.type === "check") continue;
    const last = groups[groups.length - 1];
    if (CARD_TYPES.has(b.type) && last && CARD_TYPES.has(last[0].type)) last.push(b);
    else groups.push([b]);
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g, i) =>
        g.length > 1 ? (
          <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {g.map((b) => (
              <GuideBlockView key={b.id} block={b} />
            ))}
          </div>
        ) : (
          <div key={g[0].id} className="flex flex-col gap-2">
            <GuideBlockView block={g[0]} />
            <ResourceChips resources={g[0].resources} />
          </div>
        ),
      )}
    </div>
  );
}

/**
 * A figure, with an Enlarge button: the Read column is narrow, so a click
 * opens the same drawing at up to 1100px over the page. Esc or a click
 * anywhere closes it. Hover tooltips (<title>) work in both sizes.
 */
function FigureView({ id, svg, viewBox, caption }: { id: string; svg: string; viewBox: string; caption: string }) {
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big]);
  return (
    <figure id={id} className="group/fig relative scroll-mt-6 rounded-xl border border-border/70 bg-card px-4 py-4">
      <button
        type="button"
        onClick={() => setBig(true)}
        title="Enlarge"
        aria-label="Enlarge figure"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-micro hover:bg-fill-ghost hover:text-foreground focus-visible:opacity-100 group-hover/fig:opacity-100"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <svg viewBox={viewBox} className="mx-auto h-auto w-full max-w-[560px] cursor-zoom-in" onClick={() => setBig(true)} dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">{caption}</figcaption>
      {big && (
        <div role="dialog" aria-modal="true" aria-label="Figure, enlarged" className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-background/90 p-6 backdrop-blur-sm" onClick={() => setBig(false)}>
          <div className="flex max-h-full w-full max-w-[1100px] flex-col gap-3 overflow-auto rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <svg viewBox={viewBox} className="mx-auto h-auto max-h-[78vh] w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
          </div>
        </div>
      )}
    </figure>
  );
}
