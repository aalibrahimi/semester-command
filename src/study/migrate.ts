/**
 * migrate.ts — converts the chapter model (study/types.ts) to the guide
 * schema (study/guide.ts).
 *
 * Called by: scripts/migrate-guides.ts (writes JSON files + a report).
 * Calls: nothing.
 *
 * Pure and deterministic, so re-running it on unchanged chapters produces
 * byte-identical guides and stable block ids. Every conversion that loses
 * information is recorded in `report.unclassified` so the author can decide
 * whether to hand-edit the guide or extend the schema.
 *
 * Mapping (chapter block → guide block):
 *   p                       → prose
 *   h                       → prose, bold (a sub-heading inside the section)
 *   def                     → definition
 *   list, item "**T**: …"   → definition per such item; other items → prose bullets
 *   code                    → example (title = caption)
 *   worked                  → example (problem + numbered steps; answer kept)
 *   try                     → check
 *   table                   → table (first row = columns)
 *   prof / warn that name an assignment, HW, lab, quiz, exam or points
 *                           → trap (source + points extracted)
 *   why, prof/warn without a graded source, stepper, figure
 *                           → prose, and LISTED as unclassified
 */
import type { Block, Chapter, Course, Frame } from "./types";
import type { Guide, GuideBlock, GuideSection, DefinitionBlock, GuideExercise } from "./guide";

/** `Omit` that distributes over a union, so each block variant keeps its own fields. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export interface Unclassified {
  guide: string;
  section: string;
  blockId: string;
  from: Block["t"];
  reason: string;
  preview: string;
}

export interface MigrationReport {
  guides: number;
  blocks: Record<GuideBlock["type"], number>;
  unclassified: Unclassified[];
}

/** "**Alphabet Σ**: a nonempty…" or "♥ **Set**: a collection…" */
const BOLD_LEAD = /^(?:[♥]\s*)?\*\*([^*]+)\*\*\s*(?:(\S{1,12}):\s*)?[:—–-]?\s*(.+)$/s;
/** A bold lead that is only a number or bullet ("**1.**", "**(a)**") is emphasis, not a term. */
const NOT_A_TERM = /^[\d\s.()a-z]{0,4}$|^[\d.]+$/;
/** `def` blocks that are chapter summaries, not terms ("Heap in one paragraph"). */
const SUMMARY_TERM = /\bin one (breath|paragraph|sentence)$/i;

/** Sources Poon / Chen / Koo / Kraus / Nie name when points were lost. */
const SOURCE_RE =
  /\b(Assignment\s+\d+(?:\s+Q\d+)?|HW\s+\d+(?:\s+Problem\s+\d+)?|Lab\s+\d+(?:\s+Q\d+(?:[–-]Q?\d+)?)?|Quiz\s*#?\d*|Midterm|Final(?:\s+exam)?|Exam|Project\s+\d+|Chance quiz|solution key|Oral Exam\s*\d*)/i;
const POINTS_RE = /([−-]\s?\d+(?:\.\d+)?)\s*(?:pts?|points?)?(?=[\s,;.)]|$)/;
const GRADED_RE = /\b(assignment|homework|\bhw\b|lab\b|quiz|midterm|final|exam|points?|pts|deduct|marked (?:down|wrong)|lost point|costs? points|graded)/i;

function trapSource(text: string, title?: string): { source: string; points: string | null } | null {
  const hay = `${title ?? ""} ${text}`;
  if (!GRADED_RE.test(hay)) return null;
  const src = SOURCE_RE.exec(hay)?.[1];
  const pts = POINTS_RE.exec(hay)?.[1]?.replace(/\s/g, "").replace("-", "−") ?? null;
  const source = src ? tidy(src) : "exam material";
  return { source: source.charAt(0).toUpperCase() + source.slice(1), points: pts };
}

function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function frameToLine(f: Frame, i: number): string {
  const body =
    f.kind === "array"
      ? `[${f.cells.join(", ")}]${f.note ? ` — ${f.note}` : ""}`
      : f.kind === "tree"
        ? f.levels.map((l) => l.nodes.join(" ")).join(" / ")
        : f.lines[f.active] ?? f.lines.join(" · ");
  return `${i + 1}. \`${body}\` ${f.caption}`;
}

export function chapterToGuide(course: Course, chapter: Chapter, report?: MigrationReport): Guide {
  const gid = `${course.slug}/${chapter.slug}`;
  const sections: GuideSection[] = chapter.sections.map((sec) => {
    const out: GuideBlock[] = [];
    const push = (b: DistributiveOmit<GuideBlock, "id">) => {
      const id = `${sec.id}.${out.length}`;
      out.push({ ...b, id } as GuideBlock);
      if (report) report.blocks[b.type]++;
      return id;
    };
    const flag = (from: Block["t"], reason: string, preview: string, id: string) =>
      report?.unclassified.push({ guide: gid, section: sec.id, blockId: id, from, reason, preview: tidy(preview).slice(0, 90) });

    for (const b of sec.blocks) {
      switch (b.t) {
        case "p":
          push({ type: "prose", md: b.text });
          break;
        case "h":
          push({ type: "prose", md: `**${b.text}**` });
          break;
        case "def":
          if (SUMMARY_TERM.test(b.term)) push({ type: "prose", md: `**${b.term}.** ${b.text}` });
          else push({ type: "definition", term: b.term, body: b.text });
          break;
        case "list": {
          const rest: string[] = [];
          for (const item of b.items) {
            const m = BOLD_LEAD.exec(item.trim());
            if (m && m[1].length <= 60 && !NOT_A_TERM.test(m[1].trim())) {
              // "**Alphabet** Σ: …" → term "Alphabet Σ"; the symbol belongs to the term.
              const term = tidy(m[2] ? `${m[1]} ${m[2]}` : m[1]);
              push({ type: "definition", term, body: m[3].trim() });
            } else rest.push(item);
          }
          if (rest.length) push({ type: "prose", md: rest.map((r) => `- ${r}`).join("\n") });
          break;
        }
        case "code":
          push({ type: "example", title: b.caption ?? "Code", body: b.text });
          break;
        case "worked": {
          const body = [b.problem, "", ...b.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n");
          push({ type: "example", title: b.title, body, ...(b.answer ? { answer: b.answer } : {}) });
          break;
        }
        case "try":
          push({ type: "check", prompt: b.q, answer: b.a, sectionRef: sec.id });
          break;
        case "table": {
          const [columns, ...rows] = b.rows;
          push({ type: "table", columns, rows });
          break;
        }
        case "prof":
        case "warn": {
          const t = trapSource(b.text, b.title);
          if (t) {
            push({ type: "trap", body: b.title ? `**${b.title}** ${b.text}` : b.text, source: t.source, points: t.points });
          } else {
            const id = push({ type: "prose", md: b.title ? `**${b.title}** ${b.text}` : b.text });
            flag(b.t, `${b.t} callout with no graded source — kept as prose`, b.title ?? b.text, id);
          }
          break;
        }
        case "why": {
          const id = push({ type: "prose", md: b.title ? `**${b.title}** ${b.text}` : b.text });
          flag("why", "why-callout has no schema type — kept as prose", b.title ?? b.text, id);
          break;
        }
        case "stepper": {
          const md = [`**${b.title}**`, ...b.frames.map(frameToLine)].join("\n");
          const id = push({ type: "prose", md });
          flag("stepper", `interactive stepper (${b.frames.length} frames) flattened to numbered prose — loses click-through`, b.title, id);
          break;
        }
        case "figure": {
          const id = push({ type: "prose", md: `*(figure)* ${b.caption}` });
          flag("figure", "SVG figure dropped; caption kept as prose", b.caption, id);
          break;
        }
      }
    }
    return { id: sec.id, heading: sec.title, blocks: out };
  });

  const exercises: GuideExercise[] = (chapter.practice ?? []).map((e) => ({ ...e, sectionRef: guessSection(sections, e.title + " " + e.prompt) }));

  if (report) report.guides++;
  return {
    id: gid,
    course: course.slug,
    lessons: chapter.label,
    title: chapter.title,
    summary: chapter.goal,
    estimatedMinutes: chapter.minutes,
    sourceNote: chapter.source,
    requires: (chapter.requires ?? []).map((r) => `${course.slug}/${r}`),
    sections,
    exercises,
  };
}

/** Best-effort: the section whose definition terms appear most in the text. */
function guessSection(sections: GuideSection[], text: string): string | undefined {
  const hay = text.toLowerCase();
  let best: { id: string; score: number } | undefined;
  for (const s of sections) {
    const terms = s.blocks.filter((b): b is DefinitionBlock => b.type === "definition").map((b) => b.term.toLowerCase());
    const score = terms.filter((t) => t.length > 2 && hay.includes(t)).length + (hay.includes(s.heading.toLowerCase()) ? 2 : 0);
    if (score > 0 && (!best || score > best.score)) best = { id: s.id, score };
  }
  return best?.id;
}

export function emptyReport(): MigrationReport {
  return { guides: 0, blocks: { prose: 0, definition: 0, table: 0, example: 0, trap: 0, check: 0 }, unclassified: [] };
}

export function migrateAll(courses: Course[]): { guides: Guide[]; report: MigrationReport } {
  const report = emptyReport();
  const guides = courses.flatMap((c) => c.chapters.map((ch) => chapterToGuide(c, ch, report)));
  return { guides, report };
}
