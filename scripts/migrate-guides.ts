/**
 * migrate-guides.ts — one-shot: chapters (src/study/chapters) → guides
 * (src/study/guides/*.json) + a report of everything that fell back to prose.
 *
 * Run: npx tsx scripts/migrate-guides.ts
 * Re-runnable; output is deterministic. Commit the JSON.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { courses } from "../src/study/courses";
import { migrateAll } from "../src/study/migrate";

const out = join(process.cwd(), "src/study/guides");
mkdirSync(out, { recursive: true });
const { guides, report } = migrateAll(courses);
for (const g of guides) writeFileSync(join(out, `${g.id.replace("/", "--")}.json`), JSON.stringify(g, null, 2) + "\n");
writeFileSync(join(out, "index.json"), JSON.stringify(guides.map((g) => g.id), null, 2) + "\n");
writeFileSync(join(out, "MIGRATION_REPORT.md"), [
  `# Guide migration report`, ``,
  `${report.guides} guides · blocks: ${Object.entries(report.blocks).map(([k, v]) => `${k} ${v}`).join(" · ")}`, ``,
  `## Left as prose (${report.unclassified.length})`, ``,
  `| guide | section | block | from | reason | preview |`, `|---|---|---|---|---|---|`,
  ...report.unclassified.map((u) => `| ${u.guide} | ${u.section} | ${u.blockId} | ${u.from} | ${u.reason} | ${u.preview.replace(/\|/g, "\\|")} |`),
  ``,
].join("\n"));
console.log(`${report.guides} guides written; ${report.unclassified.length} blocks left as prose (see MIGRATION_REPORT.md)`);
const byReason: Record<string, number> = {};
for (const u of report.unclassified) byReason[u.from] = (byReason[u.from] ?? 0) + 1;
console.log(byReason);
