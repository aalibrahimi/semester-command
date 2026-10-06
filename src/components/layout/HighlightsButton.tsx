/**
 * HighlightsButton: the highlighter in the header. A badge with how many
 * highlights you've kept, and a panel to look over them quickly: grouped by
 * chapter, each with its last explain score, a jump back to where it came
 * from, "Explain it", and remove.
 *
 * Called by: AppShell (header).
 * Calls: study/highlights, study/loadGuides (chapter titles).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Highlighter, MessageSquareText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { guideSummary } from "@/study/loadGuides";
import { attemptsFor, deleteHighlight, openExplain, targetOfHighlight, useHighlights } from "@/study/highlights";
import type { HighlightRecord } from "@/lib/ipc";

const scoreCls = (s: number) => (s >= 0.999 ? "bg-on-track/15 text-on-track-fg" : s >= 0.5 ? "bg-at-risk/15 text-at-risk-fg" : "bg-critical/15 text-critical-fg");

export function HighlightsButton() {
  const s = useHighlights();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const groups = useMemo(() => {
    const m = new Map<string, HighlightRecord[]>();
    const needle = q.trim().toLowerCase();
    for (const h of s.highlights) {
      if (needle && !h.text.toLowerCase().includes(needle)) continue;
      m.set(h.guideId, [...(m.get(h.guideId) ?? []), h]);
    }
    return [...m.entries()];
  }, [s.highlights, q]);

  const go = (h: HighlightRecord) => {
    const [course, chapter] = h.guideId.split("/");
    setOpen(false);
    navigate(`/study/${course}/${chapter}?s=${h.sectionId}&at=${h.blockId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Highlights, ${s.highlights.length}`}
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground shadow-card transition-colors duration-micro hover:text-foreground"
        >
          <Highlighter className="h-4 w-4" />
          {s.highlights.length > 0 && (
            <span data-numeric className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-at-risk px-1 font-mono text-[10px] font-semibold leading-none text-white">
              {s.highlights.length > 99 ? "99+" : s.highlights.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[440px] overflow-hidden rounded-2xl border-foreground/15 p-0 shadow-elevated">
        <header className="flex items-center gap-2 border-b border-foreground/10 px-3 py-2.5">
          <span className="text-sm font-semibold">Highlights</span>
          <span className="text-2xs text-muted-foreground">{s.highlights.length}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="ml-auto w-36 rounded-md border border-border/70 bg-background px-2 py-1 text-xs outline-none focus:border-brand"
          />
        </header>
        <div className="max-h-[460px] overflow-y-auto bg-popover">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Highlighter className="h-6 w-6 text-muted-foreground/60" />
              <p className="text-sm font-medium">{q ? "Nothing matches" : "No highlights yet"}</p>
              <p className="text-xs text-muted-foreground">Select any text in a chapter and press Highlight. It lands here, ready to review or explain in your own words.</p>
            </div>
          ) : (
            groups.map(([gid, hs]) => (
              <section key={gid} className="border-b border-foreground/5 last:border-0">
                <h3 className="sticky top-0 z-[1] truncate bg-popover/95 px-3 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                  {guideSummary(gid)?.title ?? gid}
                </h3>
                <ul>
                  {hs.map((h) => {
                    const last = attemptsFor(s, `h:${h.id}`)[0];
                    return (
                      <li key={h.id} className="group flex gap-2 px-3 py-2 hover:bg-fill-ghost/60">
                        <span aria-hidden className="mt-1 w-1 shrink-0 self-stretch rounded-full bg-at-risk/60" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-3 text-[13px] leading-snug">{h.text}</p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <button type="button" onClick={() => { setOpen(false); openExplain(targetOfHighlight(h)); }} className="flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-2xs font-medium text-brand-fg hover:bg-brand/20">
                              <MessageSquareText className="h-3 w-3" /> Explain it
                            </button>
                            <button type="button" onClick={() => go(h)} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs text-muted-foreground hover:bg-fill-ghost hover:text-foreground">
                              <ArrowUpRight className="h-3 w-3" /> Open
                            </button>
                            {last && <span data-numeric className={cn("chip ml-auto font-mono", scoreCls(last.score))}>last {Math.round(last.score * 100)}%</span>}
                            <button type="button" aria-label="Remove highlight" onClick={() => h.id != null && void deleteHighlight(h.id)} className={cn("rounded-md p-1 text-muted-foreground opacity-0 hover:text-critical-fg group-hover:opacity-100", !last && "ml-auto")}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
