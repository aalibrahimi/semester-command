/**
 * HighlightLayer: select text in a chapter and keep it.
 *
 * Called by: routes/StudyRead (wraps the section's blocks).
 * Calls: study/highlights (add, open the explain dialog), study/explainCheck
 * (key ideas inside the selection).
 *
 * Select any text inside a block and a small toolbar appears above it:
 * "Highlight" saves it straight to the highlights panel (the icon in the
 * header); "Highlight + explain" saves it and opens the explain dialog on it.
 *
 * Saved highlights are painted with the CSS Custom Highlight API: the text is
 * marked without touching the DOM React owns, so re-renders, animations and
 * the slide view are unaffected. Where the API is missing, highlights are
 * still saved and listed; they just aren't painted.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Highlighter, MessageSquareText } from "lucide-react";
import type { Guide, GuideBlock } from "@/study/guide";
import { addHighlight, openExplain, targetOfHighlight, useHighlights } from "@/study/highlights";
import { keysForSelection } from "@/study/explainCheck";
import { blockSource, findRange } from "@/study/highlightText";
import { toast } from "sonner";

const HL = "study-hl";

export function HighlightLayer({ guide, sectionId, children }: { guide: Guide; sectionId: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const { highlights } = useHighlights();
  const blocks = useMemo(() => guide.sections.find((s) => s.id === sectionId)?.blocks ?? [], [guide, sectionId]);
  const mine = useMemo(() => highlights.filter((h) => h.guideId === guide.id && h.sectionId === sectionId), [highlights, guide.id, sectionId]);
  const [tool, setTool] = useState<{ x: number; y: number; text: string; block: GuideBlock; el: HTMLElement } | null>(null);

  // Paint saved highlights. Re-run after layout settles (lazy figures, fonts).
  useEffect(() => {
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    const HighlightCtor = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    if (!reg || !HighlightCtor) return;
    const paint = () => {
      const ranges: Range[] = [];
      for (const h of mine) {
        const el = document.getElementById(h.blockId);
        const r = el && findRange(el, h.text);
        if (r) ranges.push(r);
      }
      reg.set(HL, new HighlightCtor(...ranges));
    };
    paint();
    const t = setTimeout(paint, 400);
    return () => {
      clearTimeout(t);
      reg.delete(HL);
    };
  }, [mine]);

  // Show the toolbar when a selection ends inside one block.
  useEffect(() => {
    const onUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
        if (!sel || sel.rangeCount === 0 || text.length < 3 || text.length > 800 || !box.current) return setTool(null);
        const range = sel.getRangeAt(0);
        if (!box.current.contains(range.commonAncestorContainer)) return setTool(null);
        let el: HTMLElement | null = range.commonAncestorContainer instanceof HTMLElement ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        let block: GuideBlock | undefined;
        while (el && el !== box.current) {
          const id = el.id;
          block = id ? blocks.find((b) => b.id === id) : undefined;
          if (block) break;
          el = el.parentElement;
        }
        if (!block || !el) return setTool(null);
        const rect = range.getBoundingClientRect();
        setTool({ x: rect.left + rect.width / 2, y: rect.top, text, block, el });
      }, 0);
    };
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-hl-toolbar]")) setTool(null);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mousedown", onDown);
    };
  }, [blocks]);

  const save = async (andExplain: boolean) => {
    if (!tool) return;
    const { text, block, el } = tool;
    setTool(null);
    window.getSelection()?.removeAllRanges();
    const src = blockSource(block);
    const row = await addHighlight({
      guideId: guide.id,
      sectionId,
      blockId: block.id,
      text,
      context: (el.innerText || src).replace(/\s+/g, " ").trim().slice(0, 4000),
      keys: JSON.stringify(keysForSelection(text, src)),
    }).catch(() => null);
    if (!row) return void toast.error("Could not save that highlight.");
    if (andExplain) openExplain(targetOfHighlight(row));
    else toast.success("Highlighted. It's in the highlighter icon, top right.");
  };

  return (
    <div ref={box} className="relative">
      {children}
      {tool && (
        <div
          data-hl-toolbar
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-xl border border-border/70 bg-popover p-1 shadow-elevated animate-in fade-in-0 zoom-in-95"
          style={{ left: tool.x, top: tool.y - 8 }}
        >
          <button type="button" onClick={() => void save(false)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost">
            <Highlighter className="h-3.5 w-3.5 text-at-risk-fg" /> Highlight
          </button>
          <button type="button" onClick={() => void save(true)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost">
            <MessageSquareText className="h-3.5 w-3.5 text-brand-fg" /> Highlight + explain it
          </button>
        </div>
      )}
    </div>
  );
}
