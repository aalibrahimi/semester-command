/**
 * RegexSim — type a pattern, see every match lit up in the text.
 *
 * params: { pattern?: string, text?: string, flags?: string }
 *
 * The pattern runs as you type (JavaScript's engine, which agrees with
 * Python's re on everything the class uses: classes, quantifiers, anchors,
 * groups, \b, \w, \d, \s). Matches are highlighted in place, listed with
 * their positions, and the findall count is shown, so 'why did \w+ing\b
 * miss "singer"' is answered by looking. Anchors get a note when the text
 * has several lines (m flag).
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CTRL, LABEL, str, type SimProps } from "./index";

const DEFAULT_TEXT = "The singer kept singing; the ring was bringing joy. Running, pooling, ingot, ingenuity: nothing but things ending in ing.";

export function RegexSim({ params }: SimProps) {
  const [pattern, setPattern] = useState(str(params, "pattern", "\\w+ing\\b"));
  const [text, setText] = useState(str(params, "text", DEFAULT_TEXT));
  const [flags, setFlags] = useState(str(params, "flags", "g"));

  const result = useMemo(() => {
    try {
      const f = flags.includes("g") ? flags : flags + "g";
      const re = new RegExp(pattern, f);
      const matches: { start: number; end: number; text: string; groups: string[] }[] = [];
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(text)) && guard++ < 5000) {
        if (m[0] === "") {
          re.lastIndex++;
          continue;
        }
        matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], groups: m.slice(1).map((g) => g ?? "") });
      }
      return { matches, error: null as string | null };
    } catch (e) {
      return { matches: [], error: (e as Error).message };
    }
  }, [pattern, text, flags]);

  const pieces = useMemo(() => {
    const out: { s: string; hit: boolean }[] = [];
    let i = 0;
    for (const m of result.matches) {
      if (m.start > i) out.push({ s: text.slice(i, m.start), hit: false });
      out.push({ s: text.slice(m.start, m.end), hit: true });
      i = m.end;
    }
    if (i < text.length) out.push({ s: text.slice(i), hit: false });
    return out;
  }, [result, text]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={LABEL}>Pattern (r"…")</span>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} className={cn(CTRL, "w-full", result.error && "border-critical")} aria-label="Pattern" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Flags</span>
          <input value={flags} onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ""))} className={cn(CTRL, "w-20")} aria-label="Flags" />
        </label>
      </div>
      {result.error && <div className="text-2xs text-critical-fg">Pattern error: {result.error}</div>}
      <label className="flex flex-col gap-1">
        <span className={LABEL}>Text</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} spellCheck={false} className={cn(CTRL, "resize-y font-sans text-sm leading-relaxed")} aria-label="Text" />
      </label>
      <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5 font-mono text-[13px] leading-relaxed">
        {pieces.length === 0 ? <span className="text-muted-foreground">(empty)</span> : pieces.map((p, i) => (p.hit ? <mark key={i} className="rounded bg-brand/[0.22] px-0.5 text-foreground">{p.s}</mark> : <span key={i}>{p.s}</span>))}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <span className={LABEL}>re.findall → {result.matches.length}</span>
        {result.matches.slice(0, 40).map((m, i) => (
          <span key={i} className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[12px]" title={`chars ${m.start} to ${m.end}`}>
            {m.text}
            {m.groups.length > 0 && <span className="text-muted-foreground"> ({m.groups.join(", ")})</span>}
          </span>
        ))}
        {result.matches.length > 40 && <span className="text-muted-foreground">+{result.matches.length - 40} more</span>}
      </div>
      <p className="text-2xs leading-relaxed text-muted-foreground">
        ^ and $ are the start and end of the whole text unless the m flag is set (then each line). \b is a word boundary: the apostrophe in don't is not a word character, which is why \w+n't needs the boundary after the t.
      </p>
    </div>
  );
}
