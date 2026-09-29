/**
 * shot-guides: screenshot every section of every chapter, and fail on any
 * page error. The by-eye check, done by a machine.
 *
 *   bun run content:shots                   every guide, dark mode
 *   bun run content:shots -- cs146          only guides whose id starts with cs146
 *   bun run content:shots -- --both         dark and light
 *
 * Builds the app (vite build → content/.preview/dist), serves it, opens
 * each /study/<guide>?s=<section>, lets animations settle, and writes
 * content/.preview/guides/<guide>/<nn>-<section>-<theme>.png plus an
 * index.html contact sheet to skim. Page errors and console errors are
 * collected per section; any page error makes the run exit 1.
 *
 * Needs playwright-core (a dev dependency) and Chrome, or CHROMIUM_PATH.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "content/.preview/guides");
const DIST = join(ROOT, "content/.preview/dist");
const args = process.argv.slice(2);
const both = args.includes("--both");
const filter = args.find((a) => !a.startsWith("--")) ?? "";
const themes = both ? ["dark", "light"] : ["dark"];
const PORT = 4179;

const index = JSON.parse(readFileSync(join(ROOT, "src/study/guideIndex.json"), "utf8")).filter((g) => g.id.startsWith(filter));
if (index.length === 0) {
  console.error(`no guides match "${filter}"`);
  process.exit(1);
}

console.log("building the app…");
const b = spawnSync("npx", ["vite", "build", "--outDir", DIST, "--emptyOutDir"], { cwd: ROOT, stdio: "ignore" });
if (b.status !== 0) {
  console.error("vite build failed");
  process.exit(1);
}
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort", "--outDir", DIST], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

const exe = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
rmSync(OUT, { recursive: true, force: true });
const report = [];
let errors = 0;

try {
  for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, colorScheme: theme });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
      } catch {
        /* fine */
      }
    }, theme);
    const page = await ctx.newPage();
    let current = [];
    page.on("pageerror", (e) => current.push(`page error: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && current.push(`console: ${m.text().slice(0, 160)}`));

    for (const g of index) {
      const dir = join(OUT, g.id.replace("/", "--"));
      mkdirSync(dir, { recursive: true });
      for (const [i, s] of g.sections.entries()) {
        current = [];
        await page.goto(`http://localhost:${PORT}/#/study/${g.id}?s=${s.id}`);
        await page.waitForTimeout(1300);
        const h = await page.evaluate(() => document.querySelector("main")?.scrollHeight ?? 1000);
        await page.setViewportSize({ width: 1500, height: Math.min(Math.max(h + 80, 1000), 12000) });
        await page.waitForTimeout(400);
        const file = `${String(i + 1).padStart(2, "0")}-${s.id}-${theme}.png`;
        await page.screenshot({ path: join(dir, file) });
        await page.setViewportSize({ width: 1500, height: 1000 });
        const pageErrors = current.filter((x) => x.startsWith("page error"));
        errors += pageErrors.length;
        report.push({ guide: g.id, title: g.title, section: s.heading, theme, file: `${g.id.replace("/", "--")}/${file}`, problems: [...current] });
        process.stdout.write(pageErrors.length ? "E" : current.length ? "w" : ".");
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Guide screenshots</title>
<style>body{font:14px system-ui;background:#111;color:#ddd;margin:24px}h2{margin:28px 0 8px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
a{color:inherit;text-decoration:none}figure{margin:0;background:#1b1b1b;border-radius:10px;overflow:hidden;border:1px solid #333}figure.bad{border-color:#e5484d}
img{width:100%;height:180px;object-fit:cover;object-position:top}figcaption{padding:6px 8px;font-size:12px}.p{color:#f5a524}</style>
<h1>${report.length} screenshots, ${errors} page error(s)</h1>
${[...new Set(report.map((r) => r.guide))]
  .map((gid) => {
    const rows = report.filter((r) => r.guide === gid);
    return `<h2>${esc(rows[0].title)} <small>${gid}</small></h2><div class="g">${rows
      .map((r) => `<a href="${r.file}"><figure class="${r.problems.length ? "bad" : ""}"><img loading="lazy" src="${r.file}"><figcaption>${esc(r.section)} · ${r.theme}${r.problems.map((p) => `<div class="p">${esc(p)}</div>`).join("")}</figcaption></figure></a>`)
      .join("")}</div>`;
  })
  .join("")}`,
);

console.log(`\n${report.length} screenshots in content/.preview/guides (open index.html). ${errors} page error(s).`);
for (const r of report.filter((x) => x.problems.length)) console.log(`  ${r.guide} · ${r.section} (${r.theme}): ${r.problems.join(" | ")}`);
process.exit(errors ? 1 : 0);
