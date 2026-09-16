/**
 * StudyChapter — the book view of one chapter (route "/study/:course/:chapter").
 *
 * Called by: the router; StudySlides ("Read in the book" links here with
 * `?at=<anchor>`).
 * Calls: Blocks, src/study.
 *
 * Reading column is ~68 characters wide. The rail on the left lists the
 * sections with a scroll-spy; clicking scrolls (no hash — the app uses
 * HashRouter). A `?at=` query scrolls to that block on arrival and flashes it
 * so the reader can see exactly which paragraph the slide came from.
 */
import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, PencilLine, Presentation } from "lucide-react";
import { Blocks } from "@/components/study/Blocks";
import { Practice } from "@/components/study/Practice";
import { cn } from "@/lib/utils";
import { blockAnchor, courseBySlug } from "@/study";

export default function StudyChapter() {
  const { course: cslug, chapter: chslug } = useParams();
  const [params] = useSearchParams();
  const course = courseBySlug(cslug);
  const chapter = course?.chapters.find((c) => c.slug === chslug);
  const [active, setActive] = useState<string>(chapter?.sections[0]?.id ?? "");

  // Scroll-spy on section headings.
  useEffect(() => {
    if (!chapter) return;
    const ids = [...chapter.sections.map((s) => s.id), ...(chapter.practice?.length ? ["diy"] : [])];
    const els = ids.map((id) => document.getElementById(`sec-${id}`)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id.replace(/^sec-/, ""));
      },
      { rootMargin: "-8% 0px -75% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [chapter]);

  // Arriving from a slide: jump to and flash the exact block.
  useEffect(() => {
    const at = params.get("at");
    if (!at) {
      document.querySelector("main")?.scrollTo({ top: 0 });
      return;
    }
    const el = document.getElementById(at);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("ring-2", "ring-brand", "rounded-lg");
    const t = setTimeout(() => el.classList.remove("ring-2", "ring-brand", "rounded-lg"), 1800);
    return () => clearTimeout(t);
  }, [params, chapter]);

  if (!course) return <Navigate to="/study" replace />;
  if (!chapter) return <Navigate to={`/study/${course.slug}`} replace />;

  const idx = course.chapters.indexOf(chapter);
  const next = course.chapters[idx + 1];
  const jump = (id: string) => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto flex w-full max-w-[1100px] gap-10 px-8 pb-20 pt-6">
      {/* ── Rail ─────────────────────────────────────────────────────────── */}
      <nav className="hidden w-[220px] shrink-0 lg:block">
        <div className="sticky top-6">
          <Link to={`/study/${course.slug}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {course.code}
          </Link>
          <div className="mt-4 font-mono text-2xs text-muted-foreground">{chapter.label}</div>
          <div className="text-sm font-medium leading-snug">{chapter.title}</div>
          <Link
            to={`/study/${course.slug}/${chapter.slug}/slides`}
            className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-fill-ghost"
          >
            <Presentation className="h-3.5 w-3.5" /> Play as slides
          </Link>
          <ol className="mt-5 flex flex-col gap-px">
            {chapter.sections.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => jump(s.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs leading-snug transition-colors duration-micro",
                    active === s.id ? "bg-card font-medium text-foreground shadow-card" : "text-muted-foreground hover:bg-fill-ghost hover:text-foreground",
                  )}
                >
                  <span data-numeric className={cn("mt-px w-4 shrink-0 font-mono text-2xs", active === s.id ? "text-brand-fg" : "text-muted-foreground/60")}>
                    {i + 1}
                  </span>
                  <span className="line-clamp-2">{s.title}</span>
                </button>
              </li>
            ))}
            {chapter.practice?.length ? (
              <li className="mt-2 border-t border-border/60 pt-2">
                <button
                  type="button"
                  onClick={() => jump("diy")}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs leading-snug transition-colors duration-micro",
                    active === "diy" ? "bg-card font-medium text-foreground shadow-card" : "text-muted-foreground hover:bg-fill-ghost hover:text-foreground",
                  )}
                >
                  <PencilLine className={cn("mt-px h-3.5 w-4 shrink-0", active === "diy" ? "text-brand-fg" : "text-muted-foreground/60")} />
                  <span>Do it yourself · {chapter.practice.length}</span>
                </button>
              </li>
            ) : null}
          </ol>
        </div>
      </nav>

      {/* ── Book ─────────────────────────────────────────────────────────── */}
      <article className="min-w-0 flex-1 lg:max-w-[68ch]">
        <header className="mb-10">
          <div className="font-mono text-2xs text-muted-foreground">
            {course.code} · {chapter.label}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{chapter.title}</h1>
          <p className="mt-3 text-[15px] leading-[1.75] text-foreground/85">{chapter.goal}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> ~{chapter.minutes} min
            </span>
            <span>Built from: {chapter.source}</span>
          </div>
        </header>

        {chapter.sections.map((s, i) => (
          <section key={s.id} id={`sec-${s.id}`} className="mb-14 scroll-mt-6">
            <h2 className="mb-5 flex items-baseline gap-3 font-display text-xl font-semibold tracking-tight">
              <span className="font-mono text-sm font-normal text-muted-foreground">{i + 1}</span>
              {s.title}
            </h2>
            <Blocks blocks={s.blocks} anchorFor={(b, bi) => blockAnchor(s.id, b, bi)} />
          </section>
        ))}

        {chapter.practice?.length ? (
          <section id="sec-diy" className="mb-14 scroll-mt-6">
            <h2 className="mb-2 flex items-center gap-3 font-display text-xl font-semibold tracking-tight">
              <PencilLine className="h-5 w-5 text-brand-fg" />
              Do it yourself
            </h2>
            <Practice exercises={chapter.practice} scope={`${course.slug}/${chapter.slug}`} />
          </section>
        ) : null}

        <footer className="flex items-center gap-3 border-t border-border/60 pt-6">
          <Link to={`/study/${course.slug}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to {course.code}
          </Link>
          {next && (
            <Link
              to={`/study/${course.slug}/${next.slug}`}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-solid px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Next: {next.label} — {next.title} →
            </Link>
          )}
        </footer>
      </article>
    </div>
  );
}
