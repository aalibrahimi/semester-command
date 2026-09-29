/**
 * guide-index: the small, always-loaded summary of every guide.
 *
 *   npx tsx scripts/guide-index.ts           write src/study/guideIndex.json
 *   npx tsx scripts/guide-index.ts --check   exit 1 if it is out of date
 *
 * The app shows chapter lists, progress bars and the study plan from this
 * file (a few KB) and loads a guide's full JSON only when you open it. It is
 * a build output of src/study/guides/*.json: content:build regenerates it,
 * check:guides fails if it is stale. `sha` is the SHA-256 of the guide file,
 * which the Railway content cache uses to tell whether its copy is newer.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { summarize, type GuideSummary } from "../src/study/guideSummary";
import type { Guide } from "../src/study/guide";

const dir = join(process.cwd(), "src/study/guides");
const out = join(process.cwd(), "src/study/guideIndex.json");

export function buildIndex(): GuideSummary[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const raw = readFileSync(join(dir, f), "utf8");
      const g = JSON.parse(raw) as Guide;
      return summarize(g, createHash("sha256").update(raw).digest("hex"));
    });
}

const text = JSON.stringify(buildIndex(), null, 1) + "\n";
if (process.argv.includes("--check")) {
  let cur = "";
  try {
    cur = readFileSync(out, "utf8");
  } catch {
    /* missing counts as stale */
  }
  if (cur !== text) {
    console.error("src/study/guideIndex.json is out of date: run `npx tsx scripts/guide-index.ts` (or npm run content:build).");
    process.exit(1);
  }
  console.log("guide index up to date");
} else {
  writeFileSync(out, text);
  console.log(`wrote ${out}`);
}
