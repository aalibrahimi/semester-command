/**
 * DevDebug — the M1 acceptance surface: everything sync pulled, verbatim.
 *
 * Called by: the router at "/dev/debug", DEV builds only. Stripped from
 * release.
 * Calls: ipc debugOverview/debugDump, triggerSync, clearSession,
 * debugForceReconnect.
 *
 * This screen's job is honesty, not polish: row counts, the sync log with
 * errors verbatim, and a raw-JSON view of any row. If a number in the real UI
 * ever looks wrong, this is where to establish what Canvas actually said.
 */
import { useCallback, useEffect, useState } from "react";
import { Bug, DatabaseZap, RefreshCw, Unplug, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clearSession,
  debugDump,
  debugForceReconnect,
  debugOverview,
  triggerSync,
} from "@/lib/ipc";
import type { DebugDump, DebugOverview, Source } from "@/types";

const SOURCE_TONE: Record<Source, string> = {
  api: "bg-on-track/10 text-on-track-fg",
  ics: "bg-at-risk/10 text-at-risk-fg",
  manual: "bg-brand/10 text-brand",
};

export default function DevDebug() {
  const [overview, setOverview] = useState<DebugOverview | null>(null);
  const [dump, setDump] = useState<DebugDump | null>(null);
  const [openRaw, setOpenRaw] = useState<string | null>(null);

  const refresh = useCallback(() => {
    debugOverview().then(setOverview).catch((e: unknown) => toast.error(String(e)));
    debugDump().then(setDump).catch((e: unknown) => toast.error(String(e)));
  }, []);

  useEffect(() => {
    refresh();
    // Re-read while a sync is likely running; cheap local queries.
    const id = window.setInterval(refresh, 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <>
      <ScreenHeader
        title="Sync debug"
        subtitle="Everything the sync engine pulled, verbatim. Dev builds only."
      />

      <div className="mx-8 mb-10 flex flex-col gap-6">
        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void triggerSync().then(refresh)}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync now
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void debugForceReconnect().then(() =>
                toast.info("Session marked dead — footer should show reconnect."),
              )
            }
          >
            <WifiOff className="mr-1.5 h-3.5 w-3.5" /> Force reconnect state
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void clearSession().then(() => toast.info("Session cleared."))
            }
          >
            <Unplug className="mr-1.5 h-3.5 w-3.5" /> Drop session
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh}>
            <DatabaseZap className="mr-1.5 h-3.5 w-3.5" /> Re-read DB
          </Button>
        </div>

        {/* ── Entity counts ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {overview?.stats.map((s) => (
            <div key={s.entity} className="rounded-xl border border-border/60 bg-surface p-3">
              <div className="text-2xs uppercase tracking-wide text-muted-foreground">
                {s.entity.replace("_", " ")}
              </div>
              <div className="font-mono text-2xl tabular-nums">{s.rows}</div>
              <div className="text-2xs text-muted-foreground">
                {s.lastSyncedAt ? `synced ${s.lastSyncedAt}` : "never synced"}
              </div>
            </div>
          ))}
        </div>

        {/* ── Row dumps ──────────────────────────────────────────────────── */}
        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="instructors">Instructors</TabsTrigger>
            <TabsTrigger value="log">Sync log</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <RowTable
              rows={dump?.courses ?? []}
              cols={["id", "courseCode", "name", "term", "applyGroupWeights", "currentScore", "finalScore"]}
              openRaw={openRaw}
              setOpenRaw={setOpenRaw}
            />
          </TabsContent>
          <TabsContent value="groups">
            <RowTable
              rows={dump?.assignmentGroups ?? []}
              cols={["id", "courseId", "name", "groupWeight", "position"]}
              openRaw={openRaw}
              setOpenRaw={setOpenRaw}
            />
          </TabsContent>
          <TabsContent value="assignments">
            <RowTable
              rows={dump?.assignments ?? []}
              cols={["id", "courseId", "name", "dueAt", "pointsPossible", "omitFromFinalGrade"]}
              openRaw={openRaw}
              setOpenRaw={setOpenRaw}
            />
          </TabsContent>
          <TabsContent value="submissions">
            <RowTable
              rows={dump?.submissions ?? []}
              idKey="assignmentId"
              cols={["assignmentId", "score", "grade", "workflowState", "excused", "missing", "late"]}
              openRaw={openRaw}
              setOpenRaw={setOpenRaw}
            />
          </TabsContent>
          <TabsContent value="instructors">
            <RowTable
              rows={dump?.instructors ?? []}
              cols={["id", "courseId", "name", "email", "role"]}
              openRaw={openRaw}
              setOpenRaw={setOpenRaw}
            />
          </TabsContent>

          <TabsContent value="log">
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-fill-ghost text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">id</th>
                    <th className="px-3 py-2">entity</th>
                    <th className="px-3 py-2">started</th>
                    <th className="px-3 py-2">ok</th>
                    <th className="px-3 py-2">error</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.syncLog.map((r) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-3 py-1.5 tabular-nums">{r.id}</td>
                      <td className="px-3 py-1.5">{r.entity}</td>
                      <td className="px-3 py-1.5">{r.startedAt}</td>
                      <td className="px-3 py-1.5">{r.ok ? "✓" : "✗"}</td>
                      <td className="max-w-96 truncate px-3 py-1.5 text-critical-fg">
                        {r.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <p className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <Bug className="h-3 w-3" />
          Click a row to toggle its raw Canvas JSON. This page ships only in dev builds.
        </p>
      </div>
    </>
  );
}

/**
 * A generic dump table: fixed columns, source chip, click-to-expand raw JSON.
 * All values render via String() — this is a debug view; fidelity beats
 * formatting.
 */
function RowTable<T extends { source: Source; rawJson: string | null }>({
  rows,
  cols,
  idKey,
  openRaw,
  setOpenRaw,
}: {
  rows: T[];
  cols: (keyof T & string)[];
  idKey?: keyof T & string;
  openRaw: string | null;
  setOpenRaw: (id: string | null) => void;
}) {
  // Every dump row type has either `id` or an explicit idKey; the cast keeps
  // the generic simple for a debug-only table.
  const rowKey = idKey ?? ("id" as keyof T & string);
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
        No rows yet — run a sync, import a calendar feed, or add entries manually.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-left font-mono text-xs">
        <thead className="bg-fill-ghost text-muted-foreground">
          <tr>
            <th className="px-3 py-2">source</th>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const id = String(r[rowKey]);
            return (
              <RowPair
                key={id}
                row={r}
                cols={cols}
                open={openRaw === id}
                onToggle={() => setOpenRaw(openRaw === id ? null : id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowPair<T extends { source: Source; rawJson: string | null }>({
  row,
  cols,
  open,
  onToggle,
}: {
  row: T;
  cols: (keyof T & string)[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-t border-border/40 hover:bg-fill-ghost/60"
        onClick={onToggle}
      >
        <td className="px-3 py-1.5">
          <Badge variant="secondary" className={`text-2xs ${SOURCE_TONE[row.source]}`}>
            {row.source}
          </Badge>
        </td>
        {cols.map((c) => (
          <td key={c} className="max-w-72 truncate px-3 py-1.5">
            {row[c] === null || row[c] === undefined ? (
              <span className="text-muted-foreground/50">∅</span>
            ) : (
              String(row[c])
            )}
          </td>
        ))}
      </tr>
      {open && (
        <tr className="border-t border-border/40 bg-fill-ghost/40">
          <td colSpan={cols.length + 1} className="px-3 py-2">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-2xs">
              {row.rawJson ? prettify(row.rawJson) : "(no raw JSON — locally created row)"}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

/** Pretty-print stored JSON; fall back to the raw string if it won't parse. */
function prettify(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
