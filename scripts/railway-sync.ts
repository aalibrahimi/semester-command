/**
 * railway-sync: copy the app's local SQLite database to Railway Postgres
 * and back, so the same data follows you to another computer.
 *
 *   bun run db:status   what is local, what is on Railway, who pushed last
 *   bun run db:push     this computer -> Railway (replaces Railway's copy)
 *   bun run db:pull     Railway -> this computer (replaces the local copy,
 *                       after saving a backup)
 *
 * Needs: Bun, and DATABASE_URL in .env (Bun loads .env on its own).
 * Quit the Semester Command app before push or pull, so nothing writes to
 * the database halfway through.
 *
 * How it works, in one idea: Railway holds a mirror of every table in the
 * local database, in a Postgres schema called "semester". A push rewrites
 * that mirror from this computer. A pull rewrites this computer from the
 * mirror. Whoever pushed last is the copy everyone else pulls.
 *
 * The one safety rule: a push refuses to overwrite a Railway copy that
 * another computer pushed after this computer last synced, because that
 * would silently throw the other computer's work away. Pull first, or pass
 * --force if you really mean it.
 *
 * Where the local database lives (must match tauri.conf.json's identifier,
 * same rule as src-tauri/src/mcp/mod.rs):
 *   macOS    ~/Library/Application Support/dev.codewithali.semester-command/
 *   Windows  %APPDATA%\dev.codewithali.semester-command\
 *   Linux    ~/.local/share/dev.codewithali.semester-command/
 * Override with SEMESTER_DB=/path/to/semester-command.db.
 */
import { Database } from "bun:sqlite";
import { SQL } from "bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, homedir, platform } from "node:os";
import { dirname, join } from "node:path";

const IDENTIFIER = "dev.codewithali.semester-command";
/** Postgres schema holding the mirror. Override only for testing. */
const SCHEMA = process.env.SEMESTER_PG_SCHEMA ?? "semester";
/** Tables that describe the database itself, not your data. */
const SKIP = new Set(["_sqlx_migrations", "sqlite_sequence"]);

// ── Where things are ────────────────────────────────────────────────────────

function appDataDir(): string {
  const p = platform();
  if (p === "darwin") return join(homedir(), "Library/Application Support", IDENTIFIER);
  if (p === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData/Roaming"), IDENTIFIER);
  return join(homedir(), ".local/share", IDENTIFIER);
}

const DB_PATH = process.env.SEMESTER_DB ?? join(appDataDir(), "semester-command.db");
/** Per-computer memory of the last snapshot we pushed or pulled. */
const STATE_PATH = join(dirname(DB_PATH), "railway-sync.json");
const DEVICE = process.env.SEMESTER_DEVICE ?? hostname();

interface LocalState {
  snapshotId: number;
  at: string;
}

function readState(): LocalState | null {
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as LocalState;
  } catch {
    return null;
  }
}

function writeState(s: LocalState) {
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

// ── Local SQLite ────────────────────────────────────────────────────────────

interface Column {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

function openLocal(readonly: boolean): Database {
  if (!existsSync(DB_PATH)) {
    fail(
      `No local database at ${DB_PATH}.\nOpen the Semester Command app once so it creates it, then try again.`,
    );
  }
  const db = new Database(DB_PATH, readonly ? { readonly: true } : undefined);
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

function localTables(db: Database): string[] {
  return db
    .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((r) => r.name)
    .filter((n) => !SKIP.has(n) && !n.startsWith("sqlite_"));
}

function localColumns(db: Database, table: string): Column[] {
  return db.query<Column, []>(`PRAGMA table_info("${table}")`).all();
}

/** Highest applied migration, so we can tell when two computers run different app versions. */
function schemaVersion(db: Database): number {
  try {
    const r = db.query<{ v: number | null }, []>("SELECT MAX(version) AS v FROM _sqlx_migrations").get();
    return Number(r?.v ?? 0);
  } catch {
    return 0;
  }
}

/** SQLite's loose column types, turned into Postgres types that keep every value as-is. */
function pgType(sqliteType: string): string {
  const t = sqliteType.toUpperCase();
  if (t.includes("INT") || t.includes("BOOL")) return "BIGINT";
  if (t.includes("REAL") || t.includes("FLOA") || t.includes("DOUB") || t.includes("NUMERIC")) return "DOUBLE PRECISION";
  if (t.includes("BLOB")) return "BYTEA";
  return "TEXT";
}

// ── Railway Postgres ────────────────────────────────────────────────────────

function openRemote(): SQL {
  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL is not set. Put it in .env at the project root.");
  return new SQL(url, { max: 1 });
}

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

interface Snapshot {
  id: number;
  device: string;
  pushed_at: string;
  schema_version: number;
  row_counts: Record<string, number>;
}

async function ensureMeta(pg: SQL) {
  await pg.unsafe(`CREATE SCHEMA IF NOT EXISTS ${q(SCHEMA)}`);
  await pg.unsafe(`
    CREATE TABLE IF NOT EXISTS ${q(SCHEMA)}._snapshots (
      id             BIGSERIAL PRIMARY KEY,
      device         TEXT NOT NULL,
      pushed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      schema_version BIGINT NOT NULL,
      row_counts     JSONB NOT NULL
    )`);
}

async function latestSnapshot(pg: SQL): Promise<Snapshot | null> {
  const rows = (await pg.unsafe(
    `SELECT id, device, pushed_at, schema_version, row_counts FROM ${q(SCHEMA)}._snapshots ORDER BY id DESC LIMIT 1`,
  )) as Snapshot[];
  if (!rows[0]) return null;
  const s = rows[0];
  return {
    ...s,
    id: Number(s.id),
    schema_version: Number(s.schema_version),
    pushed_at: new Date(s.pushed_at).toISOString(),
    row_counts: typeof s.row_counts === "string" ? JSON.parse(s.row_counts) : s.row_counts,
  };
}

async function remoteColumns(pg: SQL, table: string): Promise<string[]> {
  const rows = (await pg.unsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
    [SCHEMA, table],
  )) as { column_name: string }[];
  return rows.map((r) => r.column_name);
}

// ── Commands ────────────────────────────────────────────────────────────────

async function status() {
  const db = openLocal(true);
  const pg = openRemote();
  await ensureMeta(pg);
  const snap = await latestSnapshot(pg);
  const state = readState();

  console.log(`This computer: ${DEVICE}`);
  console.log(`Local database: ${DB_PATH} (schema v${schemaVersion(db)})`);
  console.log(
    snap
      ? `Railway: last push #${snap.id} from ${snap.device} at ${fmt(snap.pushed_at)} (schema v${snap.schema_version})`
      : "Railway: nothing pushed yet",
  );
  console.log(state ? `Last sync on this computer: snapshot #${state.snapshotId} at ${fmt(state.at)}` : "This computer has never synced.");
  if (snap && state && snap.id !== state.snapshotId) {
    console.log(`\n!! Railway has a newer snapshot than this computer has seen. Run: bun run db:pull`);
  }

  console.log("\nRows            local   railway");
  for (const t of localTables(db)) {
    const n = db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM ${q(t)}`).get()?.n ?? 0;
    const r = snap?.row_counts[t];
    const mark = r !== undefined && r !== n ? "  <- differs" : "";
    console.log(`  ${t.padEnd(28)} ${String(n).padStart(6)}  ${String(r ?? "-").padStart(8)}${mark}`);
  }
  db.close();
  await pg.close();
}

async function push(force: boolean) {
  const db = openLocal(true);
  const pg = openRemote();
  await ensureMeta(pg);

  const snap = await latestSnapshot(pg);
  const state = readState();
  if (snap && snap.device !== DEVICE && snap.id !== state?.snapshotId && !force) {
    fail(
      `Railway has snapshot #${snap.id} from ${snap.device} (${fmt(snap.pushed_at)}) that this computer has not pulled.\n` +
        `Pushing now would erase it. Run "bun run db:pull" first, or "bun run db:push --force" to overwrite it anyway.`,
    );
  }

  const tables = localTables(db);
  const counts: Record<string, number> = {};
  const version = schemaVersion(db);

  await pg.begin(async (tx) => {
    for (const table of tables) {
      const cols = localColumns(db, table);
      const pks = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
      const defs = cols.map((c) => `${q(c.name)} ${pgType(c.type)}`);
      if (pks.length) defs.push(`PRIMARY KEY (${pks.map((c) => q(c.name)).join(", ")})`);
      const target = `${q(SCHEMA)}.${q(table)}`;

      await tx.unsafe(`CREATE TABLE IF NOT EXISTS ${target} (${defs.join(", ")})`);
      // A newer app version may have added columns since the last push.
      const have = new Set(await remoteColumns(tx as unknown as SQL, table));
      for (const c of cols) {
        if (!have.has(c.name)) await tx.unsafe(`ALTER TABLE ${target} ADD COLUMN ${q(c.name)} ${pgType(c.type)}`);
      }
      await tx.unsafe(`TRUNCATE ${target}`);

      const rows = db.query<Record<string, unknown>, []>(`SELECT * FROM ${q(table)}`).all();
      counts[table] = rows.length;
      if (rows.length === 0) continue;

      const names = cols.map((c) => c.name);
      // Postgres allows 65535 parameters per statement; stay well under it.
      const per = Math.max(1, Math.floor(30000 / names.length));
      for (let i = 0; i < rows.length; i += per) {
        const chunk = rows.slice(i, i + per);
        const params: unknown[] = [];
        const tuples = chunk.map((row) => {
          const slots = names.map((n) => {
            const v = row[n];
            params.push(v instanceof Uint8Array ? Buffer.from(v) : v ?? null);
            return `$${params.length}`;
          });
          return `(${slots.join(", ")})`;
        });
        await tx.unsafe(`INSERT INTO ${target} (${names.map(q).join(", ")}) VALUES ${tuples.join(", ")}`, params);
      }
    }
    await tx.unsafe(
      `INSERT INTO ${q(SCHEMA)}._snapshots (device, schema_version, row_counts) VALUES ($1, $2, $3::jsonb)`,
      [DEVICE, version, JSON.stringify(counts)],
    );
  });

  const after = await latestSnapshot(pg);
  if (after) writeState({ snapshotId: after.id, at: after.pushed_at });
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  console.log(`Pushed ${total} rows in ${tables.length} tables to Railway as snapshot #${after?.id}.`);
  db.close();
  await pg.close();
}

async function pull(yes: boolean) {
  const pg = openRemote();
  await ensureMeta(pg);
  const snap = await latestSnapshot(pg);
  if (!snap) fail("Railway has nothing yet. Push from the computer that has your data first.");

  const db = openLocal(false);
  const localVersion = schemaVersion(db);
  console.log(`Railway snapshot #${snap.id} from ${snap.device}, pushed ${fmt(snap.pushed_at)}.`);
  if (snap.schema_version > localVersion) {
    console.log(
      `!! That computer runs a newer app (schema v${snap.schema_version}, this one is v${localVersion}).\n` +
        `   git pull and open the app once to update, or new columns will be skipped.`,
    );
  }
  if (!yes) {
    const answer = prompt("This replaces the data on this computer (a backup is saved first). Quit the app, then type yes:");
    if (answer?.trim().toLowerCase() !== "yes") fail("Nothing changed.");
  }

  // Consistent backup even with WAL: VACUUM INTO writes a clean copy.
  const backups = join(dirname(DB_PATH), "backups");
  mkdirSync(backups, { recursive: true });
  const backup = join(backups, `semester-command-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
  console.log(`Backup: ${backup}`);

  const remoteTables = new Set(
    ((await pg.unsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
      [SCHEMA],
    )) as { table_name: string }[]).map((r) => r.table_name),
  );

  const plan: { table: string; cols: string[]; rows: Record<string, unknown>[] }[] = [];
  for (const table of localTables(db)) {
    if (!remoteTables.has(table)) {
      console.log(`  skip ${table}: not on Railway (kept as is)`);
      continue;
    }
    const remote = new Set(await remoteColumns(pg, table));
    const cols = localColumns(db, table)
      .map((c) => c.name)
      .filter((n) => remote.has(n));
    const rows = (await pg.unsafe(`SELECT ${cols.map(q).join(", ")} FROM ${q(SCHEMA)}.${q(table)}`)) as Record<string, unknown>[];
    plan.push({ table, cols, rows });
  }

  // Foreign keys off while tables are refilled in any order; the snapshot was consistent when pushed.
  db.exec("PRAGMA foreign_keys = OFF");
  const apply = db.transaction(() => {
    for (const { table, cols, rows } of plan) {
      db.exec(`DELETE FROM ${q(table)}`);
      if (rows.length === 0) continue;
      const stmt = db.prepare(`INSERT INTO ${q(table)} (${cols.map(q).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`);
      for (const row of rows) stmt.run(...(cols.map((c) => toSqlite(row[c])) as never[]));
    }
  });
  apply();
  db.exec("PRAGMA foreign_keys = ON");

  writeState({ snapshotId: snap.id, at: new Date().toISOString() });
  const total = plan.reduce((s, p) => s + p.rows.length, 0);
  console.log(`Pulled ${total} rows into ${plan.length} tables. Open the app.`);
  db.close();
  await pg.close();
}

/** Postgres hands back bigints and Buffers; SQLite wants plain numbers and bytes. */
function toSqlite(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "bigint") return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString();
  if (v instanceof Date) return v.toISOString();
  return v;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString();
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────────────────────────

const [cmd, ...flags] = process.argv.slice(2);
const has = (f: string) => flags.includes(f);

switch (cmd) {
  case "status":
    await status();
    break;
  case "push":
    await push(has("--force"));
    break;
  case "pull":
    await pull(has("--yes"));
    break;
  default:
    fail("Usage: bun scripts/railway-sync.ts status | push [--force] | pull [--yes]");
}
