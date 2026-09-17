/**
 * GuideChrome — the top-bar pieces every guide view shares: back link, lesson
 * label + title, the Read / Recall / Cheat sheet / Map tab strip, and a slot
 * for view-specific controls on the right.
 *
 * Called by: StudyRead, StudyCheatSheet (and Recall / Map when they land).
 * Calls: react-router links.
 *
 * The tab strip is real navigation, not state: each enabled tab is a Link to
 * that view's route, so the browser back button and the sidebar behave.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Guide } from "@/study/guide";

export type GuideView = "read" | "recall" | "cheatsheet" | "map";

const VIEWS: { key: GuideView; label: string; ready: boolean; path: string }[] = [
  { key: "read", label: "Read", ready: true, path: "" },
  { key: "recall", label: "Recall", ready: true, path: "/recall" },
  { key: "cheatsheet", label: "Cheat sheet", ready: true, path: "/cheatsheet" },
  { key: "map", label: "Map", ready: false, path: "/map" },
];

export function guideBase(guide: Guide): string {
  return `/study/${guide.id}`;
}

export function ViewTabs({ guide, active }: { guide: Guide; active: GuideView }) {
  const base = guideBase(guide);
  return (
    <div role="tablist" aria-label="Guide views" className="flex items-center gap-0.5 rounded-lg border border-border bg-fill-ghost/40 p-0.5">
      {VIEWS.map((v) => {
        const cls = cn(
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-micro",
          v.key === active ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
          !v.ready && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
        );
        return v.ready ? (
          <Link key={v.key} role="tab" aria-selected={v.key === active} to={`${base}${v.path}`} className={cls}>
            {v.label}
          </Link>
        ) : (
          <button key={v.key} type="button" role="tab" aria-selected={false} disabled title="Coming in a later phase" className={cls}>
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

/** First row of the top bar. `right` holds the view's own controls. */
export function GuideTopRow({ guide, courseCode, active, right }: { guide: Guide; courseCode: string; active: GuideView; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link to={`/study/${guide.course}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {courseCode}
      </Link>
      <div className="min-w-0 flex-1">
        <span className="mr-2 font-mono text-2xs text-muted-foreground">{guide.lessons}</span>
        <span className="font-display text-base font-semibold tracking-tight">{guide.title}</span>
      </div>
      <ViewTabs guide={guide} active={active} />
      {right}
    </div>
  );
}
