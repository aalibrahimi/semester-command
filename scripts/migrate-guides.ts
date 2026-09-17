/**
 * migrate-guides.ts — chapters (src/study/chapters, the source of truth) →
 * guides (src/study/guides/*.json) + MIGRATION_REPORT.md.
 *
 *   npm run migrate:guides          write the JSON (also runs as `prebuild`)
 *   npm run check:guides            exit 1 if the committed JSON is stale
 *
 * Deterministic: same chapters → byte-identical output, so `--check` is a
 * plain string comparison. Block ids are content hashes (see migrate.ts), so
 * editing one block changes only that block's id.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { courses } from "../src/study/courses";
import { migrateAll } from "../src/study/migrate";

const CHECK = process.argv.includes("--check");
const dir = join(process.cwd(), "src/study/guides");
const { guides, report } = migrateAll(courses);

const files = new Map<string, string>();
for (const g of guides) files.set(`${g.id.replace("/", "--")}.json`, JSON.stringify(g, null, 2) + "\n");
files.set("index.json", JSON.stringify(guides.map((g) => g.id), null, 2) + "\n");
files.set(
  "MIGRATION_REPORT.md",
  [
    `# Guide migration report`,
    ``,
    `${report.guides} guides · blocks: ${Object.entries(report.blocks).map(([k, v]) => `${k} ${v}`).join(" · ")}`,
    ``,
    `## Left as prose (${report.unclassified.length})`,
    ``,
    `| guide | section | block | from | reason | preview |`,
    `|---|---|---|---|---|---|`,
    ...report.unclassified.map((u) => `| ${u.guide} | ${u.section} | ${u.blockId} | ${u.from} | ${u.reason} | ${u.preview.replace(/\|/g, "\\|")} |`),
    ``,
  ].join("\n"),
);

if (CHECK) {
  const stale = [...files].filter(([name, body]) => !existsSync(join(dir, name)) || readFileSync(join(dir, name), "utf8") !== body).map(([n]) => n);
  if (stale.length) {
    console.error(`check:guides — ${stale.length} file(s) out of date with src/study/chapters:\n  ${stale.join("\n  ")}\nRun: npm run migrate:guides`);
    process.exit(1);
  }
  console.log(`check:guides — ${files.size} files up to date.`);
} else {
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of files) writeFileSync(join(dir, name), body);
  console.log(`${report.guides} guides written; ${report.unclassified.length} blocks left as prose (see MIGRATION_REPORT.md)`);
}
