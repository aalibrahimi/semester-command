/**
 * render.mjs: turn a timeline page (an HTML file that defines
 * window.render(t) and window.DURATION) into the three files a guide's
 * video block needs: content/media/study-videos/<name>.mp4, .webm and .jpg.
 *
 *   node content/video/render.mjs content/video/cs146-hash-tables.html
 *   node content/video/render.mjs <page.html> --still 12 40 90   (PNG stills only, to check a scene)
 *
 * How it works: open the page in headless Chrome, call render(t) for every
 * frame (24 fps), screenshot it, and pipe the PNGs into ffmpeg. Frames are
 * drawn from t, never from wall-clock time, so the video is identical on
 * every machine and never drops a frame.
 *
 * Needs: ffmpeg on PATH, and playwright-core (a dev dependency). It drives
 * your installed Google Chrome by default; set CHROMIUM_PATH to use another
 * Chromium build.
 */
import { spawn } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const FPS = 24;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [page, ...rest] = process.argv.slice(2);
if (!page) {
  console.error("usage: node content/video/render.mjs <page.html> [--still t1 t2 …]");
  process.exit(1);
}
const name = basename(page, ".html");
const outBase = join(ROOT, "content", "media", "study-videos", name);

const exe = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
tab.on("pageerror", (e) => console.error("page error:", e.message));
await tab.goto(pathToFileURL(resolve(page)).href);
const duration = await tab.evaluate(() => window.DURATION);

const frame = async (t) => {
  await tab.evaluate((x) => window.render(x), t);
  return tab.screenshot({ type: "png" });
};

function ffmpeg(args, input) {
  return new Promise((ok, fail) => {
    const p = spawn("ffmpeg", ["-v", "error", "-y", ...args], { stdio: [input ? "pipe" : "ignore", "inherit", "inherit"] });
    p.on("close", (c) => (c === 0 ? ok(p) : fail(new Error(`ffmpeg exited ${c}`))));
    if (input) input(p);
  });
}

if (rest[0] === "--still") {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const dir = join(ROOT, "content", ".preview");
  mkdirSync(dir, { recursive: true });
  for (const t of rest.slice(1).map(Number)) {
    const f = join(dir, `${name}-${t}s.png`);
    writeFileSync(f, await frame(t));
    console.log(f);
  }
} else {
  const n = Math.round(duration * FPS);
  await ffmpeg(
    ["-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-preset", "slow", "-movflags", "+faststart", `${outBase}.mp4`],
    async (p) => {
      for (let i = 0; i < n; i++) {
        if (!p.stdin.write(await frame(i / FPS))) await new Promise((r) => p.stdin.once("drain", r));
        if (i % (FPS * 20) === 0) console.log(`frame ${i} / ${n}`);
      }
      p.stdin.end();
    },
  );
  await ffmpeg(["-i", `${outBase}.mp4`, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", `${outBase}.webm`]);
  await ffmpeg(["-ss", "2.5", "-i", `${outBase}.mp4`, "-frames:v", "1", "-q:v", "4", `${outBase}.jpg`]);
  console.log(`wrote ${outBase}.{mp4,webm,jpg}`);
}
await browser.close();
