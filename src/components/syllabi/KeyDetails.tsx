/**
 * KeyDetails: one course's syllabus boiled down to what changes what you
 * do this semester.
 *
 * Called by: routes/Syllabi.tsx, above the full-text viewer.
 * Calls: lib/syllabusDigest (data), study/index (date helpers), the opener
 * plugin to open the original syllabus in the browser.
 *
 * Reading order is on purpose: the one sentence that matters most, then the
 * three facts you look up every week (when, who, office hours), then how
 * the grade is built next to the dates, then the rules that cost points.
 */
import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  BookMarked,
  CalendarClock,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  PieChart,
  Sparkles,
  UserRound,
} from "lucide-react";
import { IS_TAURI } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate } from "@/study";
import type { DigestDate, RuleTag, SyllabusDigest } from "@/lib/syllabusDigest";

const H2 = "flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-foreground/70";
const CARD = "rounded-xl border border-foreground/15 bg-card shadow-sm";

/** Bar segment colors, biggest part first. Tokens only (check:tokens). */
const SEG = ["bg-brand", "bg-on-track", "bg-at-risk", "bg-critical", "bg-foreground/40"];

const TAG_STYLE: Record<RuleTag, string> = {
  "Late work": "bg-critical/15 text-critical-fg",
  "Make-up": "bg-at-risk/15 text-at-risk-fg",
  "Missed class": "bg-at-risk/15 text-at-risk-fg",
  "AI use": "bg-brand/15 text-brand-fg",
  Exams: "bg-on-track/15 text-on-track-fg",
  "Heads up": "bg-foreground/10 text-foreground/80",
};

function openLink(url: string) {
  if (IS_TAURI) void openUrl(url);
  else window.open(url, "_blank", "noopener");
}

function when(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 0) return "done";
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} wks`;
}

export function KeyDetails({ d }: { d: SyllabusDigest }) {
  return (
    <div className="flex flex-col gap-3">
      {/* The one sentence */}
      <section className="flex gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-fg" />
        <div>
          <div className="text-2xs font-semibold uppercase tracking-wider text-brand-fg">If you remember one thing</div>
          <p className="mt-0.5 text-sm font-medium leading-relaxed">{d.headline}</p>
        </div>
      </section>

      {/* When, who, office hours */}
      <div className="grid gap-3 md:grid-cols-3">
        <Fact icon={Clock} title="Class">
          <p className="text-sm font-medium">{d.meets}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {d.room}
          </p>
        </Fact>
        <Fact icon={UserRound} title="Professor">
          <p className="text-sm font-medium">{d.instructor}</p>
          <a
            href={`mailto:${d.email}`}
            className="mt-1 flex items-center gap-1 text-xs text-brand-fg hover:underline"
          >
            <Mail className="h-3 w-3" /> {d.email}
          </a>
          {d.phone && <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{d.phone}</p>}
          {d.contactNote && <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{d.contactNote}</p>}
        </Fact>
        <Fact icon={CalendarClock} title="Office hours">
          <ul className="flex flex-col gap-0.5">
            {d.officeHours.map((h, i) => (
              <li key={i} className={cn("text-xs", i === 0 ? "text-sm font-medium" : "text-muted-foreground")}>
                {h}
              </li>
            ))}
          </ul>
        </Fact>
      </div>

      {/* Grade + dates */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Grading d={d} />
        <Dates dates={d.dates} />
      </div>

      {/* Rules */}
      <section className={cn(CARD, "px-4 py-3.5")}>
        <h2 className={H2}>
          <AlertTriangle className="h-3.5 w-3.5" /> Rules that cost points
        </h2>
        <ul className="mt-2.5 grid gap-x-6 gap-y-2.5 md:grid-cols-2">
          {d.rules.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
              <span
                className={cn(
                  "mt-px w-[5.5rem] shrink-0 rounded-md px-1.5 py-0.5 text-center text-2xs font-semibold",
                  TAG_STYLE[r.tag],
                )}
              >
                {r.tag}
              </span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Materials + source */}
      <section className={cn(CARD, "flex flex-wrap items-start gap-x-8 gap-y-3 px-4 py-3.5")}>
        <div className="min-w-0 flex-1">
          <h2 className={H2}>
            <BookMarked className="h-3.5 w-3.5" /> What you need
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {d.materials.map((m, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                {m}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => openLink(d.source.url)}
          className="flex shrink-0 items-center gap-1.5 self-end rounded-lg border border-foreground/15 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
          title="Open the original syllabus"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {d.source.label} · updated {formatDate(d.source.updated, "short")}
        </button>
      </section>
    </div>
  );
}

function Fact({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(CARD, "px-4 py-3")}>
      <h2 className={H2}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Grading({ d }: { d: SyllabusDigest }) {
  const total = d.grading.reduce((s, g) => s + g.weight, 0);
  return (
    <section className={cn(CARD, "px-4 py-3.5")}>
      <h2 className={H2}>
        <PieChart className="h-3.5 w-3.5" /> How your grade is made
      </h2>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-foreground/10">
        {d.grading.map((g, i) => (
          <div
            key={g.label}
            className={cn(SEG[i % SEG.length], i > 0 && "border-l-2 border-card")}
            style={{ width: `${(g.weight / total) * 100}%` }}
            title={`${g.label}: ${g.show}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-col">
        {d.grading.map((g, i) => (
          <li key={g.label} className="flex items-start gap-2.5 border-b border-foreground/10 py-1.5 last:border-0">
            <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-sm", SEG[i % SEG.length])} />
            <div className="min-w-0 flex-1">
              <div className="text-sm">{g.label}</div>
              {g.note && <div className="text-xs leading-snug text-muted-foreground">{g.note}</div>}
            </div>
            <span data-numeric className="shrink-0 font-mono text-sm font-semibold tabular-nums">
              {g.show}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 rounded-lg bg-fill-ghost/60 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
        {d.scale}
      </p>
    </section>
  );
}

const KIND_DOT: Record<DigestDate["kind"], string> = {
  exam: "bg-critical",
  due: "bg-brand",
  noclass: "bg-on-track",
  other: "bg-foreground/40",
};

function Dates({ dates }: { dates: DigestDate[] }) {
  const [showPast, setShowPast] = useState(false);
  const rows = dates.map((x) => ({ ...x, days: daysUntil(x.date) }));
  const past = rows.filter((r) => r.days < 0).length;
  const shown = showPast ? rows : rows.filter((r) => r.days >= 0);
  return (
    <section className={cn(CARD, "px-4 py-3.5")}>
      <div className="flex items-center gap-2">
        <h2 className={cn(H2, "flex-1")}>
          <CalendarClock className="h-3.5 w-3.5" /> Dates that matter
        </h2>
        {past > 0 && (
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="text-2xs text-muted-foreground hover:text-foreground"
          >
            {showPast ? "Hide past" : `Show ${past} past`}
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nothing left on the syllabus calendar.</p>
      ) : (
        <ol className="mt-2 flex flex-col">
          {shown.map((r, i) => (
            <li
              key={i}
              className={cn(
                "flex items-baseline gap-3 border-b border-foreground/10 py-1.5 last:border-0",
                r.days < 0 && "opacity-45",
              )}
            >
              <span data-numeric className="w-14 shrink-0 whitespace-nowrap font-mono text-2xs text-muted-foreground">
                {formatDate(r.date, "short")}
              </span>
              <span className={cn("h-2 w-2 shrink-0 translate-y-[-1px] rounded-full", KIND_DOT[r.kind])} />
              <span className="min-w-0 flex-1 text-sm">
                <span className={cn(r.kind === "exam" && "font-semibold", r.days < 0 && "line-through")}>{r.label}</span>
                {r.time && <span className="ml-1.5 text-xs text-muted-foreground">{r.time}</span>}
              </span>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap text-2xs",
                  r.days < 0
                    ? "text-muted-foreground"
                    : r.days <= 2
                      ? "font-semibold text-critical-fg"
                      : r.days <= 7
                        ? "font-medium text-at-risk-fg"
                        : "text-muted-foreground",
                )}
              >
                {when(r.days)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-2 flex flex-wrap gap-3 border-t border-foreground/10 pt-2 text-2xs text-muted-foreground">
        {(
          [
            ["exam", "Exam or quiz"],
            ["due", "Due"],
            ["noclass", "No class"],
            ["other", "Other"],
          ] as const
        ).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", KIND_DOT[k])} /> {l}
          </span>
        ))}
      </div>
    </section>
  );
}
