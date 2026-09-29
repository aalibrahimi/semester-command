/**
 * lint-content: the checks that used to be done by eye.
 *
 *   npx tsx scripts/lint-content.ts          report problems, exit 1 if any
 *   npx tsx scripts/lint-content.ts --fix    rewrite em dashes in app strings
 *
 * check-guides confirms a guide's STRUCTURE is valid. This checks what a
 * reader actually sees:
 *
 *   1. No em dashes, in guide text or in the app's own strings (toasts,
 *      tooltips, labels). Automaton arrows like "q0 —a→ q1" are notation,
 *      not punctuation, and are allowed. App strings are found with the
 *      TypeScript parser, so comments and regex patterns are never touched.
 *   2. No stray asterisks in markdown text. It uses the SAME italic pattern
 *      as components/study/Blocks.tsx, and flags an italic that swallows
 *      half a sentence (the "*ungrammatical example" bug) or a leftover *
 *      stuck to a word.
 *   3. Every video block's files exist: the .mp4, the .webm fallback and
 *      the .jpg poster, in content/media/study-videos.
 *
 * Guide text is fixed at the source: content/authoring/typography.py runs
 * inside the builder (after ids are assigned), so a rebuild clears it.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = join(import.meta.dirname, "..");
const EM = "—";
const ARROW = new RegExp(`${EM}(?=[^\\s${EM}]{1,8}→)`, "g");
const FIX = process.argv.includes("--fix");
const problems: string[] = [];

/* ── The same plain-punctuation rules as content/authoring/typography.py ── */

const JOINERS = new Set(["so", "and", "but", "or", "which", "because", "then", "not", "yet", "while", "though", "although", "since", "unless", "who", "where", "when", "as", "if", "until", "nor"]);

export function plainText(s: string): string {
  if (!s.includes(EM)) return s;
  // An empty-value placeholder ("—", '—', `—`, or JSX text that is only the
  // dash) becomes an en dash, never a colon.
  if (/^\s*(["'`]?)\u2014\1\s*$/.test(s)) return s.replace(EM, "–");
  const KEEP = "\u0000A\u0000";
  let t = s.replace(ARROW, KEEP);
  t = t.replace(new RegExp(` ${EM} ([^${EM}.!?\\n]{1,160}?) ${EM} `, "g"), ", $1, ");
  t = t.replace(new RegExp(`\\s*${EM}\\s*`, "g"), (_m, offset: number, whole: string) => {
    const before = whole.slice(0, offset);
    if (!before || before.endsWith("\n")) return "";
    const word = /^\s*[—]?\s*([A-Za-z']+)/.exec(whole.slice(offset + _m.length))?.[1]?.toLowerCase();
    if (!whole.slice(offset + _m.length).trim()) return "";
    return word && JOINERS.has(word) ? ", " : ": ";
  });
  return t.split(KEEP).join(EM).replace(/:,/g, ":").replace(/, ,/g, ",");
}

const emCount = (s: string) => (s.replace(ARROW, "").match(new RegExp(EM, "g")) ?? []).length;

/* ── 1 + 2. Guides ──────────────────────────────────────────────────────── */

// The italic token from Blocks.tsx Inline, verbatim.
const TOKENS = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|==[^=]+==|!![^!]+!!|##[^#]+##)/g;
const MARKDOWN_KEYS = new Set(["md", "body", "prompt", "answer", "caption", "hints", "why", "feedback", "summary", "term", "title", "lines"]);

function starProblems(text: string): string | null {
  for (const part of text.split("\n")) {
    const pieces = part.split(TOKENS);
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (i % 2 === 1) {
        // An italic that swallowed a verdict mark, a bold marker, or ran across
        // a sentence: a * that was meant literally paired with the wrong partner.
        if (p.startsWith("*") && !p.startsWith("**")) {
          const inner = p.slice(1, -1);
          if (/\*\*|[✗✓]/.test(inner) || (inner.length > 60 && /[.!?] \S/.test(inner))) return `italic runs too far: "${p.slice(0, 70)}…" (use \`backticks\` around a starred example)`;
        }
      } else if (/\*\*/.test(p)) {
        return `broken bold (a stray ** left over) near "${p.trim().slice(0, 60)}"`;
      }
    }
  }
  return null;
}

function walk(o: unknown, where: string, key: string, type: string | undefined, visit: (s: string, where: string, key: string, type?: string) => void) {
  if (typeof o === "string") visit(o, where, key, type);
  else if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${where}[${i}]`, key, type, visit));
  else if (o && typeof o === "object") {
    const rec = o as Record<string, unknown>;
    const t = typeof rec.type === "string" ? rec.type : type;
    for (const [k, v] of Object.entries(rec)) {
      if (k === "id" || k === "svg" || k === "viewBox" || k === "bracket" || (t === "code" && ["starter", "check", "solution", "setup"].includes(k))) continue;
      walk(v, `${where}.${k}`, k, t, visit);
    }
  }
}

const guidesDir = join(ROOT, "src/study/guides");
const media = join(ROOT, "content/media");
for (const f of readdirSync(guidesDir).filter((x) => x.endsWith(".json")).sort()) {
  const g = JSON.parse(readFileSync(join(guidesDir, f), "utf8"));
  const svgEm = walkSvg(g);
  walk(g, g.id, "", undefined, (s, where, key, type) => {
    if (emCount(s)) problems.push(`${where}: em dash in "${s.slice(Math.max(0, s.indexOf(EM) - 30), s.indexOf(EM) + 30)}" (rebuild: content/authoring/typography.py fixes it)`);
    // Example bodies and frame lines are plain text, not markdown.
    if (MARKDOWN_KEYS.has(key) && type !== "example" && key !== "lines") {
      const why = starProblems(s);
      if (why) problems.push(`${where}: ${why}`);
    }
  });
  if (svgEm) problems.push(`${g.id}: ${svgEm} em dash(es) inside figure SVG text`);
  for (const s of g.sections) {
    for (const b of s.blocks) {
      if (b.type !== "video") continue;
      const base = String(b.src).replace(/^\//, "").replace(/\.mp4$/, "");
      for (const ext of [".mp4", ".webm", ".jpg"]) {
        const p = join(media, base + ext);
        if (!existsSync(p) || statSync(p).size === 0) problems.push(`${g.id} ${s.id}: video file missing: content/media/${base}${ext}`);
      }
    }
  }
}

function walkSvg(g: { sections: { blocks: { svg?: string }[] }[] }): number {
  return g.sections.flatMap((s) => s.blocks).reduce((n, b) => n + (b.svg ? emCount(b.svg) : 0), 0);
}

/* ── 1b. The app's own strings ──────────────────────────────────────────── */

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return d.name === "guides" ? [] : tsFiles(p);
    return /\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [p] : [];
  });
}

let fixed = 0;
for (const file of tsFiles(join(ROOT, "src"))) {
  const src = readFileSync(file, "utf8");
  if (!src.includes(EM)) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits: { start: number; end: number; text: string }[] = [];
  const visit = (n: ts.Node) => {
    const k = n.kind;
    const isText = k === ts.SyntaxKind.StringLiteral || k === ts.SyntaxKind.NoSubstitutionTemplateLiteral || k === ts.SyntaxKind.JsxText || k === ts.SyntaxKind.TemplateHead || k === ts.SyntaxKind.TemplateMiddle || k === ts.SyntaxKind.TemplateTail;
    if (isText) {
      const start = n.getStart(sf);
      const raw = src.slice(start, n.getEnd());
      if (emCount(raw)) {
        const { line } = sf.getLineAndCharacterOfPosition(start);
        const fixedText = plainText(raw);
        if (FIX && fixedText !== raw) edits.push({ start, end: n.getEnd(), text: fixedText });
        else problems.push(`${relative(ROOT, file)}:${line + 1}: em dash in app text: ${raw.trim().slice(0, 80)}`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (edits.length) {
    let out = src;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    writeFileSync(file, out);
    fixed += edits.length;
  }
}

/* ── Report ─────────────────────────────────────────────────────────────── */

if (FIX && fixed) console.log(`lint-content: rewrote ${fixed} app string(s) with plain punctuation`);
if (problems.length) {
  console.log(`lint-content: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 80)) console.log("  " + p);
  if (problems.length > 80) console.log(`  … and ${problems.length - 80} more`);
  process.exit(1);
}
console.log("lint-content: no em dashes, no stray asterisks, every video file present.");
