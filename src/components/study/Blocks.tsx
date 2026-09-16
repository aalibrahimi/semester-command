/**
 * Blocks — renders the chapter block vocabulary (src/study/types.ts).
 *
 * Called by: StudyChapter.tsx (the book) and StudySlides.tsx (one block per
 * slide, `large`).
 * Calls: Stepper.
 *
 * Body copy is 15px with generous leading — this is reading, not a table.
 * Colour follows the app: brand periwinkle = the professor's framing, amber
 * = a mistake to avoid, green = the compressed definition you've earned,
 * neutral = the reasoning.
 */
import { useState, type ReactNode } from "react";
import { AlertTriangle, BookMarked, ChevronDown, HelpCircle, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block } from "@/study/types";
import { Stepper, FrameView } from "./Stepper";

/** `**bold**`, `*italic*` and `` `code` `` inside strings. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : p.startsWith("`") && p.endsWith("`") ? (
          <code key={i} className="rounded-sm bg-fill-ghost px-1 py-px font-mono text-[0.9em] text-foreground">
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const BODY = "text-[15px] leading-[1.75] text-foreground/90";

export function BlockView({ block, large, id }: { block: Block; large?: boolean; id?: string }) {
  const body = cn(BODY, large && "text-base leading-[1.8]");
  switch (block.t) {
    case "p":
      return (
        <p id={id} className={cn(body, "scroll-mt-6")}>
          <Inline text={block.text} />
        </p>
      );

    case "h":
      return (
        <h3 id={id} className="mt-8 scroll-mt-6 border-t border-border/50 pt-6 text-lg font-semibold tracking-tight">
          {block.text}
        </h3>
      );

    case "list":
      return (
        <ul id={id} className="flex scroll-mt-6 flex-col gap-3 pl-1">
          {block.items.map((it, i) => (
            <li key={i} className={cn("flex gap-3", body)}>
              <span aria-hidden className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              <span className="min-w-0">
                <Inline text={it} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "code":
      return (
        <figure id={id} className="scroll-mt-6 overflow-hidden rounded-xl border border-border/70 bg-background">
          <pre className={cn("overflow-x-auto px-4 py-3.5 font-mono leading-relaxed text-foreground/90", large ? "text-sm" : "text-xs")}>
            {block.text}
          </pre>
          {block.caption && (
            <figcaption className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">{block.caption}</figcaption>
          )}
        </figure>
      );

    case "why":
      return (
        <Callout id={id} label={block.title ?? "Why this exists"} icon={HelpCircle} tone="neutral" large={large}>
          {block.text}
        </Callout>
      );

    case "prof":
      return (
        <Callout id={id} label={block.title ?? "How the professor frames it"} icon={MessageSquareQuote} tone="brand" large={large}>
          {block.text}
        </Callout>
      );

    case "warn":
      return (
        <Callout id={id} label={block.title ?? "Where people slip"} icon={AlertTriangle} tone="warn" large={large}>
          {block.text}
        </Callout>
      );

    case "def":
      return (
        <div id={id} className="scroll-mt-6 rounded-xl border border-on-track/30 bg-on-track/[0.06] px-4 py-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-on-track-fg">
            <BookMarked className="h-3.5 w-3.5" /> Definition · {block.term}
          </div>
          <p className={body}>
            <Inline text={block.text} />
          </p>
        </div>
      );

    case "figure":
      return (
        <figure id={id} className="scroll-mt-6 rounded-xl border border-border/70 bg-card px-4 py-4">
          <svg viewBox={block.viewBox} className="mx-auto h-auto w-full max-w-[560px]" dangerouslySetInnerHTML={{ __html: block.svg }} />
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">{block.caption}</figcaption>
        </figure>
      );

    case "stepper":
      return (
        <div id={id} className="scroll-mt-6">
          <Stepper title={block.title} frames={block.frames} />
        </div>
      );

    case "worked":
      return (
        <div id={id} className="scroll-mt-6 rounded-xl border border-border/70 bg-card shadow-card">
          <div className="border-b border-border/60 px-4 py-3">
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Worked in full</div>
            <div className="mt-0.5 text-sm font-medium">{block.title}</div>
          </div>
          <div className="px-4 py-4">
            <p className={cn(body, "mb-4")}>
              <Inline text={block.problem} />
            </p>
            <ol className="flex flex-col gap-3">
              {block.steps.map((s, i) => (
                <li key={i} className={cn("flex gap-3", body)}>
                  <span data-numeric className="mt-[0.35em] w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <Inline text={s} />
                  </span>
                </li>
              ))}
            </ol>
            {block.answer && (
              <p className="mt-4 border-t border-border/60 pt-3 text-sm">
                <span className="mr-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Answer</span>
                <span className="font-mono text-xs">{block.answer}</span>
              </p>
            )}
          </div>
        </div>
      );

    case "try":
      return <Try id={id} q={block.q} a={block.a} large={large} />;

    case "table": {
      const [head, ...rows] = block.rows;
      return (
        <div id={id} className="scroll-mt-6 overflow-x-auto rounded-xl border border-border/70">
          <table className={cn("w-full text-left", large ? "text-sm" : "text-xs")}>
            <thead className="bg-fill-ghost/70 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {head.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border/60 align-top">
                  {r.map((cell, j) => (
                    <td key={j} className={cn("px-3 py-2 leading-relaxed", j === 0 && "font-medium text-foreground")}>
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

function Callout({
  id,
  label,
  icon: Icon,
  tone,
  large,
  children,
}: {
  id?: string;
  label: string;
  icon: typeof HelpCircle;
  tone: "neutral" | "brand" | "warn";
  large?: boolean;
  children: string;
}) {
  const box =
    tone === "brand"
      ? "border-brand/30 bg-brand/[0.06]"
      : tone === "warn"
        ? "border-at-risk/35 bg-at-risk/[0.07]"
        : "border-border bg-fill-ghost/60";
  const lab = tone === "brand" ? "text-brand-fg" : tone === "warn" ? "text-at-risk-fg" : "text-muted-foreground";
  return (
    <aside id={id} className={cn("scroll-mt-6 rounded-xl border px-4 py-3.5", box)}>
      <div className={cn("mb-1 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider", lab)}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={cn(BODY, large && "text-base leading-[1.8]")}>
        <Inline text={children} />
      </p>
    </aside>
  );
}

function Try({ id, q, a, large }: { id?: string; q: string; a: string; large?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div id={id} className="scroll-mt-6 rounded-xl border border-border/70 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-micro hover:bg-fill-ghost/50"
      >
        <span className="mt-0.5 shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 font-mono text-2xs font-medium text-brand-fg">Try it</span>
        <span className={cn("min-w-0 flex-1", BODY, large && "text-base")}>
          <Inline text={q} />
        </span>
        <ChevronDown className={cn("mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-micro", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn("border-t border-border/60 px-4 py-3.5", BODY)}>
          <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Answer</span>
          <Inline text={a} />
        </div>
      )}
    </div>
  );
}

/** Stack with reading rhythm. `anchorFor` gives each block its id. */
export function Blocks({ blocks, anchorFor }: { blocks: Block[]; anchorFor: (b: Block, i: number) => string }): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} id={anchorFor(b, i)} />
      ))}
    </div>
  );
}

export { FrameView };
