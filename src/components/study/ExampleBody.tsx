/**
 * ExampleBody — renders an example block's body so worked math reads like
 * a worked solution, not like colored source code.
 *
 * Called by: GuideBlocks (example cards), StudyCheatSheet (example tiles).
 * Calls: Inline (bold / highlight marks), CodeHighlight (real code only).
 *
 * The body is plain text written by hand. Real code (braces, comments,
 * statements at line start) keeps the monospace + syntax-colored look.
 * Everything else is split into lines and each line gets the look that
 * fits it:
 *   "1. do this"          → a numbered step with a badge
 *   "x = 3 · 4 = 12"      → a math line: monospace on a soft band
 *   "  indented / a → b"  → a math line too (alignment matters)
 *   anything else          → a sentence, with **bold** and ==marks==
 * A blank line is a small gap, so the author can group steps.
 */
import { cn } from "@/lib/utils";
import { Inline } from "./Blocks";
import { CodeHighlight, looksLikeCode } from "./CodeHighlight";

type Line = { kind: "step"; n: string; text: string } | { kind: "math"; text: string } | { kind: "text"; text: string } | { kind: "gap" };

const MATHY = /[=→≈÷×√∑∫·^|]|\b\d+(\.\d+)?\s*(Hz|dB|ms|s)\b|^\s{2,}\S/;

function classify(raw: string): Line {
  if (!raw.trim()) return { kind: "gap" };
  const step = raw.match(/^\s*(\d+)[.)]\s+(.*)$/);
  if (step) return { kind: "step", n: step[1], text: step[2] };
  // A sentence has several ordinary lowercase words; a math line mostly doesn't.
  const plainWords = (raw.match(/\b[a-z]{3,}\b/g) ?? []).length;
  const indented = /^\s{2,}\S/.test(raw) || /\S\s{3,}\S/.test(raw);
  // A line that reads as a sentence ("…at time t = n / Fₛ.", "…at +k and −k:") stays prose.
  if (!indented && plainWords >= 3 && /[.:]$/.test(raw.trim())) return { kind: "text", text: raw.trim() };
  if (MATHY.test(raw) && (plainWords < 5 || indented)) return { kind: "math", text: raw.replace(/\s+$/, "") };
  return { kind: "text", text: raw.trim() };
}

type Group = { kind: "math"; lines: string[] } | Exclude<Line, { kind: "math" }>;

/** Consecutive math lines share one band, so aligned columns stay aligned. */
function group(lines: Line[]): Group[] {
  const out: Group[] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    if (l.kind === "math") {
      if (last && last.kind === "math") last.lines.push(l.text);
      else out.push({ kind: "math", lines: [l.text] });
    } else out.push(l);
  }
  return out;
}

export function ExampleBody({ text, compact = false }: { text: string; compact?: boolean }) {
  if (looksLikeCode(text))
    return (
      <pre className={cn("overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed text-foreground/90", compact ? "text-xs" : "px-4 py-3.5 text-[12.5px]")}>
        <CodeHighlight text={text} />
      </pre>
    );
  const lines = text.split("\n").map(classify);
  // Drop leading/trailing gaps and collapse repeats.
  const kept = lines.filter((l, i) => !(l.kind === "gap" && (i === 0 || i === lines.length - 1 || lines[i - 1].kind === "gap")));
  const out = group(kept);
  return (
    <div className={cn("flex flex-col", compact ? "gap-1 text-xs" : "gap-2 px-4 py-3.5 text-[14.5px]")}>
      {out.map((l, i) => {
        if (l.kind === "gap") return <div key={i} className={compact ? "h-0.5" : "h-1"} aria-hidden />;
        if (l.kind === "step")
          return (
            <div key={i} className="flex gap-2.5 leading-relaxed">
              <span data-numeric className="mt-[0.2em] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-2xs font-semibold text-brand-fg">
                {l.n}
              </span>
              <span className="min-w-0 text-foreground/90">
                <Inline text={l.text} />
              </span>
            </div>
          );
        if (l.kind === "math")
          return (
            <div key={i} className="overflow-x-auto rounded-lg border border-foreground/10 bg-foreground/[0.04] px-3 py-2 font-mono text-[0.88em] leading-[1.8] text-foreground">
              {l.lines.map((m, k) => (
                <div key={k} className="whitespace-pre">
                  <Inline text={m} />
                </div>
              ))}
            </div>
          );
        return (
          <p key={i} className="leading-relaxed text-foreground/90">
            <Inline text={l.text} />
          </p>
        );
      })}
    </div>
  );
}
