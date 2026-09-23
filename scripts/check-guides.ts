/**
 * check-guides.ts — validates src/study/guides/*.json against the schema in
 * src/study/guide.ts (a hand check: no runtime schema library). Runs in
 * `npm run verify`; exits 1 and lists every problem it finds.
 *
 *   npx tsx scripts/check-guides.ts
 *
 * Checks: required fields and types per block variant, unique block ids in
 * the `${sectionId}.${hash8}` shape, section ids unique, check.sectionRef
 * and exercise.sectionRef point at real sections, requires point at real
 * guides, related terms name real definitions, and every course's guide
 * list resolves.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { courses } from "../src/study/courses";
import { SIM_NAMES } from "../src/study/sims";
import { PROSE_LABELS } from "../src/study/guide";

const dir = join(process.cwd(), "src/study/guides");
const problems: string[] = [];
const ids = new Set<string>();
const guides: Record<string, unknown>[] = [];

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json") || f === "index.json") continue;
  const g = JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<string, unknown>;
  const at = (msg: string) => problems.push(`${f}: ${msg}`);
  for (const k of ["id", "course", "lessons", "title", "summary", "sourceNote"]) if (!isStr(g[k])) at(`missing string ${k}`);
  if (typeof g.estimatedMinutes !== "number") at("estimatedMinutes not a number");
  if (!isArr(g.requires)) at("requires not an array");
  if (!isArr(g.sections) || !g.sections.length) at("sections missing/empty");
  if (!isArr(g.exercises)) at("exercises not an array");
  if (isStr(g.id) && `${(g.id as string).replace("/", "--")}.json` !== f) at(`id ${g.id} does not match file name`);
  ids.add(g.id as string);
  guides.push(g);

  const sectionIds = new Set<string>();
  const terms = new Set<string>();
  for (const s of (g.sections as Record<string, unknown>[]) ?? []) {
    if (!isStr(s.id) || !isStr(s.heading) || !isArr(s.blocks)) { at(`bad section ${JSON.stringify(s).slice(0, 60)}`); continue; }
    if (sectionIds.has(s.id)) at(`duplicate section id ${s.id}`);
    sectionIds.add(s.id);
    const seen = new Set<string>();
    for (const b of s.blocks as Record<string, unknown>[]) {
      const id = b.id;
      if (!isStr(id) || !new RegExp(`^${s.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[0-9a-f]{8}(-\\d+)?$`).test(id)) at(`block id ${String(id)} not ${s.id}.<hash8>`);
      else if (seen.has(id)) at(`duplicate block id ${id}`);
      else seen.add(id);
      if (b.slide !== undefined && b.slide !== true && !isStr(b.slide)) at(`${id}: slide must be true or a string`);
      switch (b.type) {
        case "prose": if (!isStr(b.md)) at(`${id}: prose.md`); if (b.label !== undefined && !(PROSE_LABELS as readonly unknown[]).includes(b.label)) at(`${id}: prose.label`); break;
        case "definition":
          if (!isStr(b.term) || !isStr(b.body)) at(`${id}: definition term/body`);
          if (b.related !== undefined && (!isArr(b.related) || !b.related.every(isStr))) at(`${id}: related`);
          if (isStr(b.term)) terms.add(b.term);
          break;
        case "table":
          if (!isArr(b.columns) || !b.columns.every((c) => typeof c === "string")) at(`${id}: table.columns`); // a blank corner header is fine
          if (!isArr(b.rows) || !b.rows.every((r) => isArr(r) && r.every((c) => typeof c === "string"))) at(`${id}: table.rows`);
          else if (isArr(b.columns)) for (const r of b.rows as string[][]) if (r.length !== b.columns.length) at(`${id}: row width ${r.length} ≠ ${b.columns.length}`);
          break;
        case "example": if (!isStr(b.title) || !isStr(b.body)) at(`${id}: example title/body`); if (b.answer !== undefined && !isStr(b.answer)) at(`${id}: example.answer`); break;
        case "trap": if (!isStr(b.body) || !isStr(b.source)) at(`${id}: trap body/source`); if (b.points !== null && !isStr(b.points)) at(`${id}: trap.points`); break;
        case "check": if (!isStr(b.prompt) || !isStr(b.answer)) at(`${id}: check prompt/answer`); if (!sectionIds.has(b.sectionRef as string) && b.sectionRef !== s.id) at(`${id}: check.sectionRef ${String(b.sectionRef)}`); break;
        case "stepper":
          if (!isStr(b.title) || !isArr(b.frames) || !b.frames.length) at(`${id}: stepper title/frames`);
          else for (const fr of b.frames as Record<string, unknown>[]) if (!["array", "rows", "heap", "tree", "lines"].includes(fr.kind as string) || !isStr(fr.caption)) at(`${id}: bad frame`);
          break;
        case "figure": if (!isStr(b.svg) || !isStr(b.viewBox) || !isStr(b.caption)) at(`${id}: figure`); break;
        case "sim":
          if (!isStr(b.sim) || !isStr(b.caption)) at(`${id}: sim name/caption`);
          else if (!(SIM_NAMES as readonly string[]).includes(b.sim)) at(`${id}: unknown sim "${b.sim}" (see src/study/sims.ts)`);
          if (b.params !== undefined && (typeof b.params !== "object" || b.params === null || Array.isArray(b.params))) at(`${id}: sim.params must be an object`);
          break;
        case "code":
          if (!isStr(b.title) || !isStr(b.task) || typeof b.starter !== "string") at(`${id}: code title/task/starter`);
          for (const k of ["setup", "check", "solution", "success"]) if (b[k] !== undefined && !isStr(b[k])) at(`${id}: code.${k} must be a string`);
          if (b.hints !== undefined && (!isArr(b.hints) || b.hints.length > 3 || !b.hints.every(isStr))) at(`${id}: code.hints must be up to 3 strings`);
          if (b.check !== undefined && b.solution === undefined) at(`${id}: a checked code cell needs a solution`);
          break;
        default: at(`${String(id)}: unknown block type ${String(b.type)}`);
      }
    }
  }
  // Cross-references inside the guide.
  for (const s of (g.sections as Record<string, unknown>[]) ?? [])
    for (const b of (s.blocks as Record<string, unknown>[]) ?? [])
      if (b.type === "definition" && isArr(b.related)) for (const r of b.related as string[]) if (!terms.has(r)) at(`${b.id}: related "${r}" is not a definition term`);
  for (const e of (g.exercises as Record<string, unknown>[]) ?? []) {
    for (const k of ["id", "title", "prompt", "why"]) if (!isStr(e[k])) at(`exercise ${String(e.id)}: ${k}`);
    if (!isArr(e.hints) || e.hints.length !== 3 || !e.hints.every(isStr)) at(`exercise ${String(e.id)}: hints must be 3 strings`);
    if (!isArr(e.solution) || !e.solution.every(isStr)) at(`exercise ${String(e.id)}: solution`);
    if (e.sectionRef !== undefined && !sectionIds.has(e.sectionRef as string)) at(`exercise ${String(e.id)}: sectionRef ${String(e.sectionRef)}`);
    if (e.choices !== undefined && (typeof e.answer !== "number" || !isArr(e.choices))) at(`exercise ${String(e.id)}: choices need a numeric answer`);
    if (e.accept !== undefined && (!isArr(e.accept) || !e.accept.length || !e.accept.every(isStr))) at(`exercise ${String(e.id)}: accept must be a non-empty list of strings`);
    if (e.accept !== undefined && e.choices !== undefined) at(`exercise ${String(e.id)}: use choices OR accept, not both`);
  }
}

for (const g of guides) for (const r of (g.requires as string[]) ?? []) if (!ids.has(r)) problems.push(`${g.id}: requires unknown guide ${r}`);
for (const c of courses) for (const slug of c.guides) if (!ids.has(`${c.slug}/${slug}`)) problems.push(`courses.ts: ${c.slug} lists missing guide ${slug}`);

if (problems.length) {
  console.error(`check:guides — ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`check:guides — ${guides.length} guides valid.`);
