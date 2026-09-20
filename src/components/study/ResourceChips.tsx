/**
 * ResourceChips — the "go deeper" links under a block: a video or an
 * interactive visualization that teaches the same idea.
 *
 * Called by: GuideBlocks (book view), StudySlides (deck footer).
 * Calls: tauri-plugin-opener inside the app (external browser), window.open
 * in plain `vite dev`.
 *
 * Every URL in a guide's `resources` was opened and checked before being
 * committed (see guides/AUTHORING.md) — these are curated pointers, not
 * search results.
 */
import { openUrl } from "@tauri-apps/plugin-opener";
import { Play, SquareArrowOutUpRight } from "lucide-react";
import { IS_TAURI } from "@/lib/ipc";
import type { GuideResource } from "@/study/guide";

function open(url: string) {
  if (IS_TAURI) void openUrl(url);
  else window.open(url, "_blank", "noopener");
}

export function ResourceChips({ resources }: { resources?: GuideResource[] }) {
  if (!resources?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        Go deeper
      </span>
      {resources.map((r) => (
        <button
          key={r.url}
          type="button"
          onClick={() => open(r.url)}
          title={r.url}
          className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-2xs font-medium text-foreground/85 transition-colors duration-micro hover:border-brand/50 hover:bg-brand/5 hover:text-brand-fg"
        >
          {r.kind === "video" ? (
            <Play className="h-3 w-3 text-critical-fg" />
          ) : (
            <SquareArrowOutUpRight className="h-3 w-3 text-brand-fg" />
          )}
          {r.label}
        </button>
      ))}
    </div>
  );
}
