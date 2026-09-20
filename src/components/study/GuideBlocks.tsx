/**
 * GuideBlocks — renders guide-schema blocks (src/study/guide.ts) for the
 * Read view. Each block type gets its own shape so the eye can tell them
 * apart before reading a word:
 *
 *   prose       plain paragraphs (a "why" label when the block explains why)
 *   definition  card: term in a heading, body below — the bold terms
 *   example     card, monospace-friendly body
 *   trap        brand-tinted card with "COSTS POINTS · <source>" label
 *   table       bordered table
 *   stepper     the existing click-through Stepper
 *   figure      inline SVG with caption
 *   check       not rendered here — the right rail's "Test me" owns checks
 *
 * Called by: StudyRead. Calls: Inline (markdown-ish inline), Stepper.
 * Consecutive definition/trap cards are laid out in a two-column grid.
 */
import type { ReactNode } from "react";
import { AlertOctagon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuideBlock } from "@/study/guide";
import { Inline } from "./Blocks";
import { CodeHighlight } from "./CodeHighlight";
import { ResourceChips } from "./ResourceChips";
import { Stepper } from "./Stepper";

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
    case "prose":
      return block.label === "why" ? (
        <aside id={block.id} className="scroll-mt-6 rounded-xl border border-border bg-fill-ghost/60 px-4 py-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5" /> Why
          </div>
          <Markdown md={block.md} />
        </aside>
      ) : (
        <div id={block.id} className="scroll-mt-6">
          <Markdown md={block.md} />
        </div>
      );

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
          <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-foreground/90"><CodeHighlight text={block.body} /></pre>
          {block.answer && (
            <div className="border-t border-border/60 px-4 py-2.5 text-sm">
              <span className="mr-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Answer</span>
              <span className="font-mono text-xs">{block.answer}</span>
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
      return (
        <figure id={block.id} className="scroll-mt-6 rounded-xl border border-border/70 bg-card px-4 py-4">
          <svg viewBox={block.viewBox} className="mx-auto h-auto w-full max-w-[560px]" dangerouslySetInnerHTML={{ __html: block.svg }} />
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">{block.caption}</figcaption>
        </figure>
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
