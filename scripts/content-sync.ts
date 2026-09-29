/**
 * content-sync: publish study guides and videos to Railway, where every
 * copy of the app picks them up on launch (src-tauri/src/content.rs).
 *
 *   bun run content:status          what differs between here and Railway
 *   bun run content:push            upload new and changed guides and videos
 *   bun run content:push --prune    also delete from Railway what no longer exists here
 *
 * Needs: Bun, and DATABASE_URL in .env (the same Railway database db:push
 * uses; content lives in its own schema, "content").
 *
 * What gets published:
 *   guides  src/study/guides/*.json, with the summary the app lists them by
 *           and their position in src/study/courses.ts
 *   assets  every file under content/media/ (videos, posters), keyed by
 *           its path below content/media ("study-videos/x.mp4")
 *
 * Only rows whose SHA-256 changed are uploaded, so a push after editing one
 * chapter sends one guide.
 */
import { SQL } from "bun";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { courses } from "../src/study/courses";
import type { Guide } from "../src/study/guide";
import { summarize } from "../src/study/guideSummary";

const ROOT = join(import.meta.dir, "..");
const GUIDES = join(ROOT, "src/study/guides");
const MEDIA = join(ROOT, "content/media");

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function fail(msg: string): never {
  console.error(`content-sync: ${msg}`);
  process.exit(1);
}
const sha = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");

interface LocalGuide {
  id: string;
  course: string;
  position: number;
  sha: string;
  summary: string;
  body: string;
}
interface LocalAsset {
  path: string;
  sha: string;
  mime: string;
  size: number;
  file: string;
}

function localGuides(): LocalGuide[] {
  const order = new Map<string, number>();
  for (const c of courses) c.guides.forEach((slug, i) => order.set(`${c.slug}/${slug}`, i));
  return readdirSync(GUIDES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const body = readFileSync(join(GUIDES, f), "utf8");
      const g = JSON.parse(body) as Guide;
      const h = sha(body);
      return { id: g.id, course: g.course, position: order.get(g.id) ?? 1000, sha: h, summary: JSON.stringify(summarize(g, h)), body };
    });
}

function walk(dir: string): string[] {
  let out: string[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of names) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

function localAssets(): LocalAsset[] {
  return walk(MEDIA)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .map((file) => {
      const bytes = readFileSync(file);
      return { path: relative(MEDIA, file).split(sep).join("/"), sha: sha(bytes), mime: MIME[extname(file).toLowerCase()], size: bytes.length, file };
    });
}

function openRemote(): SQL {
  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL is not set. Put it in .env at the project root.");
  return new SQL(url, { max: 1 });
}

async function ensureSchema(pg: SQL) {
  await pg.unsafe(`CREATE SCHEMA IF NOT EXISTS content`);
  await pg.unsafe(`
    CREATE TABLE IF NOT EXISTS content.guides (
      id          TEXT PRIMARY KEY,
      course      TEXT NOT NULL,
      position    INTEGER NOT NULL,
      sha256      TEXT NOT NULL,
      summary     JSONB NOT NULL,
      body        JSONB NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await pg.unsafe(`
    CREATE TABLE IF NOT EXISTS content.assets (
      path        TEXT PRIMARY KEY,
      sha256      TEXT NOT NULL,
      mime        TEXT NOT NULL,
      size        BIGINT NOT NULL,
      body        BYTEA NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await pg.unsafe(`
    CREATE TABLE IF NOT EXISTS content.pushes (
      id          BIGSERIAL PRIMARY KEY,
      at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      device      TEXT NOT NULL,
      guides      INTEGER NOT NULL,
      assets      INTEGER NOT NULL
    )`);
}

async function remoteHashes(pg: SQL) {
  const g = (await pg.unsafe(`SELECT id, sha256, position FROM content.guides`)) as { id: string; sha256: string; position: number }[];
  const a = (await pg.unsafe(`SELECT path, sha256 FROM content.assets`)) as { path: string; sha256: string }[];
  return { guides: new Map(g.map((r) => [r.id, r])), assets: new Map(a.map((r) => [r.path, r.sha256])) };
}

function plan(remote: Awaited<ReturnType<typeof remoteHashes>>) {
  const guides = localGuides();
  const assets = localAssets();
  const guideChanges = guides.filter((g) => {
    const r = remote.guides.get(g.id);
    return !r || r.sha256 !== g.sha || Number(r.position) !== g.position;
  });
  const assetChanges = assets.filter((a) => remote.assets.get(a.path) !== a.sha);
  const localIds = new Set(guides.map((g) => g.id));
  const localPaths = new Set(assets.map((a) => a.path));
  const guideExtra = [...remote.guides.keys()].filter((id) => !localIds.has(id));
  const assetExtra = [...remote.assets.keys()].filter((p) => !localPaths.has(p));
  return { guides, assets, guideChanges, assetChanges, guideExtra, assetExtra };
}

const mb = (n: number) => `${(n / 1_048_576).toFixed(1)} MB`;

async function status() {
  const pg = openRemote();
  await ensureSchema(pg);
  const p = plan(await remoteHashes(pg));
  console.log(`guides: ${p.guides.length} here, ${p.guideChanges.length} new or changed${p.guideChanges.length ? ": " + p.guideChanges.map((g) => g.id).join(", ") : ""}`);
  console.log(`assets: ${p.assets.length} here, ${p.assetChanges.length} new or changed${p.assetChanges.length ? ": " + p.assetChanges.map((a) => `${a.path} (${mb(a.size)})`).join(", ") : ""}`);
  if (p.guideExtra.length || p.assetExtra.length) console.log(`only on Railway (removed by push --prune): ${[...p.guideExtra, ...p.assetExtra].join(", ")}`);
  const last = (await pg.unsafe(`SELECT at, device, guides, assets FROM content.pushes ORDER BY id DESC LIMIT 1`)) as { at: string; device: string; guides: number; assets: number }[];
  if (last[0]) console.log(`last push: ${new Date(last[0].at).toLocaleString()} from ${last[0].device} (${last[0].guides} guides, ${last[0].assets} assets)`);
  await pg.close();
}

async function push(prune: boolean) {
  const pg = openRemote();
  await ensureSchema(pg);
  const p = plan(await remoteHashes(pg));
  for (const g of p.guideChanges) {
    await pg.unsafe(
      `INSERT INTO content.guides (id, course, position, sha256, summary, body, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET course = EXCLUDED.course, position = EXCLUDED.position, sha256 = EXCLUDED.sha256,
         summary = EXCLUDED.summary, body = EXCLUDED.body, updated_at = now()`,
      [g.id, g.course, g.position, g.sha, g.summary, g.body],
    );
    console.log(`guide  ${g.id}`);
  }
  for (const a of p.assetChanges) {
    await pg.unsafe(
      `INSERT INTO content.assets (path, sha256, mime, size, body, updated_at) VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (path) DO UPDATE SET sha256 = EXCLUDED.sha256, mime = EXCLUDED.mime, size = EXCLUDED.size, body = EXCLUDED.body, updated_at = now()`,
      [a.path, a.sha, a.mime, a.size, readFileSync(a.file)],
    );
    console.log(`asset  ${a.path} (${mb(a.size)})`);
  }
  if (prune) {
    for (const id of p.guideExtra) await pg.unsafe(`DELETE FROM content.guides WHERE id = $1`, [id]);
    for (const path of p.assetExtra) await pg.unsafe(`DELETE FROM content.assets WHERE path = $1`, [path]);
    if (p.guideExtra.length + p.assetExtra.length) console.log(`pruned ${p.guideExtra.length} guides, ${p.assetExtra.length} assets`);
  }
  await pg.unsafe(`INSERT INTO content.pushes (device, guides, assets) VALUES ($1, $2, $3)`, [
    process.env.SEMESTER_DEVICE ?? (await import("node:os")).hostname(),
    p.guideChanges.length,
    p.assetChanges.length,
  ]);
  console.log(`pushed ${p.guideChanges.length} guides and ${p.assetChanges.length} assets. Open the app (or Settings, Content, Sync now) to pull them.`);
  await pg.close();
}

const [cmd, ...flags] = process.argv.slice(2);
if (cmd === "status") await status();
else if (cmd === "push") await push(flags.includes("--prune"));
else fail("usage: bun scripts/content-sync.ts status | push [--prune]");
