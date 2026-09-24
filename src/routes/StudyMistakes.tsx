/**
 * StudyMistakes — the error log: every drill answer you got wrong, newest
 * first, with what you said, what was right, and the named mistake.
 *
 * Route: /study/mistakes
 *
 * Called by: the router, Study home ("Mistake log"), later the exam results.
 * Calls: study/mastery attemptsRecent, study/drills (titles), study/loadGuides
 * (section headings), courses.
 *
 * The night before an exam this list is worth more than the book: it is
 * the specific set of things your hands got wrong. "Retry" reopens the
 * section with the exact same problem (same drill, same seed).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ListX, RotateCcw } from "lucide-react";
import { Inline } from "@/components/study/Blocks";
import { cn } from "@/lib/utils";
import { courses } from "@/study";
import { drillsForGuide } from "@/study/drills";
import { guideById } from "@/study/loadGuides";
import { attemptsRecent, type AttemptRecord } from "@/study/mastery";
import { mistakes } from "@/study/plan";
import { courseTick } from "@/components/study/courseTick";

const SOURCE: Record<AttemptRecord["source"], string> = { read: "reading", focus: "focus", exam: "mock exam" };

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function StudyMistakes() {
  const [rows, setRows] = useState<AttemptRecord[] | null>(null);
  const [course, setCourse] = useState<string | "all">("all");
  useEffect(() => {
    let alive = true;
    void attemptsRecent(3000).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  const list = useMemo(() => {
    const all = mistakes(rows ?? []);
    return course === "all" ? all : all.filter((a) => a.guideId.startsWith(course + "/"));
  }, [rows, course]);

  const byDay = useMemo(() => {
    const m = new Map<string, AttemptRecord[]>();
    for (const a of list) {
      const k = dayLabel(a.at);
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.entries()];
  }, [list]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of mistakes(rows ?? [])) {
      const c = a.guideId.split("/")[0];
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-[820px] px-8 pb-16 pt-6">
      <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Today
      </Link>
      <h1 className="mt-3 flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
        <ListX className="h-5 w-5 text-at-risk-fg" /> Mistake log
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Every drill answer you got wrong, newest first. The night before an exam, read this before the book.</p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setCourse("all")} className={cn("chip", course === "all" ? "bg-brand/[0.12] text-brand-fg" : "bg-fill-ghost text-muted-foreground hover:text-foreground")}>
          All <span className="font-mono">{mistakes(rows ?? []).length}</span>
        </button>
        {courses.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setCourse(c.slug)}
            className={cn("chip", course === c.slug ? "bg-brand/[0.12] text-brand-fg" : "bg-fill-ghost text-muted-foreground hover:text-foreground")}
          >
            {c.code} <span className="font-mono">{counts.get(c.slug) ?? 0}</span>
          </button>
        ))}
      </div>

      {rows === null ? null : list.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">No misses logged{course !== "all" ? " for this course" : ""}. Drills you get wrong will show up here.</p>
      ) : (
        byDay.map(([day, items]) => (
          <section key={day} className="mt-6">
            <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
              {day} · {items.length}
            </h2>
            <ol className="mt-2 flex flex-col gap-2">
              {items.map((a) => (
                <MistakeRow key={a.id ?? a.at} a={a} />
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

function MistakeRow({ a }: { a: AttemptRecord }) {
  const guide = guideById(a.guideId);
  const section = guide?.sections.find((s) => s.id === a.sectionId);
  const drill = drillsForGuide(a.guideId).find((d) => d.id === a.drillId);
  const slug = a.guideId.split("/")[0];
  const code = courses.find((c) => c.slug === slug)?.code ?? slug;
  return (
    <li className="rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
        <span aria-hidden className="h-4 w-1 shrink-0 rounded-full" style={courseTick(slug)} />
        <span className="w-16 shrink-0 text-2xs font-semibold text-foreground/80">{code}</span>
        <span className="min-w-0 flex-1 truncate text-sm">
          {drill?.title ?? a.drillId}
          <span className="text-muted-foreground"> · {section?.heading ?? a.sectionId}</span>
        </span>
        <span className={cn("shrink-0 rounded px-1.5 py-px font-mono text-2xs uppercase tracking-wider", a.source === "exam" ? "bg-critical/10 text-critical-fg" : "bg-fill-ghost text-muted-foreground")}>{SOURCE[a.source] ?? a.source}</span>
        <span data-numeric className="shrink-0 font-mono text-2xs text-muted-foreground">
          {new Date(a.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-4 py-3 text-sm">
        <div>
          <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-at-risk-fg">You</span>
          <span className="font-mono text-[12.5px]">{a.input || "blank"}</span>
        </div>
        <div>
          <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-on-track-fg">Right</span>
          <Inline text={a.expected ?? ""} />
        </div>
        {a.diagnosis && (
          <p className="leading-relaxed text-foreground/85">
            <Inline text={a.diagnosis} />
          </p>
        )}
        <div className="mt-1 flex items-center gap-3">
          <Link to={`/study/${a.guideId}?s=${a.sectionId}&drill=${encodeURIComponent(a.drillId)}&seed=${a.seed}`} className="flex items-center gap-1 text-xs text-brand-fg underline-offset-2 hover:underline">
            <RotateCcw className="h-3 w-3" /> Retry this exact problem
          </Link>
          <Link to={`/study/${a.guideId}?s=${a.sectionId}`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            Reread the section
          </Link>
        </div>
      </div>
    </li>
  );
}
