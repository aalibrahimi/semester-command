/**
 * StudyLectures: every lecture file seen on Canvas, and whether it has a
 * study chapter yet.
 *
 * Route: /study/lectures
 *
 * Called by: the router; the "new lecture posted" notification; the course
 * page's "waiting for a chapter" notice.
 * Calls: study/lectureQueue, ipc lectureFileDismiss.
 *
 * The sync notices new slides on its own (Files and Modules, every 30
 * minutes). Anything without a chapter sits at the top with one button that
 * copies a ready-to-send request for Claude, and one that hides files that
 * don't need a chapter (a reading, a rubric).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, Copy, EyeOff, Presentation, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { IS_TAURI, lectureFileDismiss } from "@/lib/ipc";
import { chapterRequest, useLectureQueue, type LectureItem } from "@/study/lectureQueue";
import { PageHeader } from "@/components/layout/PageHeader";

const STATUS = {
  waiting: { label: "No chapter yet", chip: "bg-at-risk/15 text-at-risk-fg" },
  covered: { label: "Chapter ready", chip: "bg-on-track/15 text-on-track-fg" },
  hidden: { label: "Hidden", chip: "bg-fill-ghost text-muted-foreground" },
} as const;

function posted(it: LectureItem): string {
  const iso = it.row.createdAt ?? it.row.firstSeenAt;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function StudyLectures() {
  const { items, loaded, refresh } = useLectureQueue();
  const [copied, setCopied] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const groups = useMemo(() => {
    const order = { waiting: 0, covered: 1, hidden: 2 };
    const shown = items.filter((i) => showAll || i.status !== "hidden");
    const by = new Map<string, LectureItem[]>();
    for (const it of shown) {
      const k = it.course?.code ?? it.courseCode ?? "Other";
      by.set(k, [...(by.get(k) ?? []), it]);
    }
    return [...by.entries()]
      .map(([k, xs]) => [k, xs.sort((a, b) => order[a.status] - order[b.status])] as const)
      .sort((a, b) => b[1].filter((x) => x.status === "waiting").length - a[1].filter((x) => x.status === "waiting").length);
  }, [items, showAll]);

  const waiting = items.filter((i) => i.status === "waiting").length;
  const hidden = items.filter((i) => i.status === "hidden").length;

  const copy = async (it: LectureItem) => {
    await navigator.clipboard.writeText(chapterRequest(it));
    setCopied(it.row.fileId);
    window.setTimeout(() => setCopied(null), 1800);
  };
  const hide = async (it: LectureItem, on: boolean) => {
    await lectureFileDismiss(it.row.courseId, it.row.fileId, on);
    await refresh();
  };

  return (
    <div className="mx-auto w-full max-w-[980px] px-8 pb-16 pt-6">
      <PageHeader back={{ to: "/", label: "Today" }} icon={Presentation} title="Lectures on Canvas">
        Every sync checks each course's Files and Modules for new slides and handouts. {waiting > 0 ? `${waiting} ${waiting === 1 ? "has" : "have"} no study chapter yet.` : "Every lecture has a chapter."} Copy a request and send it to Claude to get the chapter written.
      </PageHeader>

      {!IS_TAURI || (loaded && items.length === 0) ? (
        <div className="mt-6 rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground shadow-card">
          Nothing yet. The next Canvas sync records the lecture files already posted (quietly, no notifications), and from then on anything new shows up here and in your inbox.
        </div>
      ) : (
        groups.map(([code, xs]) => (
          <section key={code} className="mt-6">
            <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
              {code}
              <span className="text-2xs font-normal text-muted-foreground">
                {xs.filter((x) => x.status === "waiting").length} waiting · {xs.filter((x) => x.status === "covered").length} with a chapter
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {xs.map((it) => (
                <li key={it.row.courseId + it.row.fileId} className={cn("flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-card", it.status === "waiting" ? "border-at-risk/40" : "border-border/70", it.status === "hidden" && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{it.row.name}</span>
                      {it.row.isNew && it.status === "waiting" && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand/[0.12] px-2 py-0.5 text-2xs font-medium text-brand-fg">
                          <Sparkles className="h-3 w-3" /> new
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-2xs text-muted-foreground">
                      {it.label ?? "No lecture number in the name"} · posted {posted(it)}
                    </div>
                  </div>
                  <span className={cn("chip shrink-0", STATUS[it.status].chip)}>{STATUS[it.status].label}</span>
                  {it.status === "covered" && it.guideId && (
                    <Link to={`/study/${it.guideId}`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-fill-ghost">
                      <BookOpen className="h-3.5 w-3.5" /> Open chapter
                    </Link>
                  )}
                  {it.status === "waiting" && (
                    <>
                      <button type="button" onClick={() => void copy(it)} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                        {copied === it.row.fileId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied === it.row.fileId ? "Copied" : "Copy request for Claude"}
                      </button>
                      <button type="button" onClick={() => void hide(it, true)} title="This file doesn't need a chapter" className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-fill-ghost hover:text-foreground">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </button>
                    </>
                  )}
                  {it.status === "hidden" && (
                    <button type="button" onClick={() => void hide(it, false)} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost">
                      <RotateCcw className="h-3.5 w-3.5" /> Show again
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {hidden > 0 && (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-6 text-xs text-muted-foreground underline-offset-2 hover:underline">
          {showAll ? "Hide the hidden ones" : `Show ${hidden} hidden`}
        </button>
      )}
    </div>
  );
}
