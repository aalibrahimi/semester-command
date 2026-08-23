/**
 * Done — the finished pile (graded, submitted, and locally marked done).
 *
 * Called by: the router, at "/done".
 * Calls: ipc debugDump (already-synced assignments/submissions/courses),
 * submissionComments (live per-assignment fetch), localPrefs done set.
 *
 * Answers "where do things go when I finish them": three sections, hottest
 * feedback first. Graded work can expand to show professor comments —
 * fetched live from Canvas on demand, because the comments API only exists
 * on submission endpoints and syncing them all would bloat every sync for
 * feedback most items never get. Local done-marks are undoable here; that's
 * the whole point of them being view state.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, ChevronDown, MessageSquare, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { debugDump, submissionComments } from "@/lib/ipc";
import { setDone, useDoneSet, useNicknames } from "@/lib/localPrefs";
import { courseShort } from "@/lib/courseLabel";
import { chipStyle, tickStyle } from "@/lib/courseColor";
import { stripShouting } from "@/lib/stripShouting";
import { points } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssignmentRow, DebugDump, SubmissionComment, SubmissionRow } from "@/types";

interface DoneItem {
  a: AssignmentRow;
  s: SubmissionRow | null;
}

export default function Done() {
  const [dump, setDump] = useState<DebugDump | null>(null);
  const doneSet = useDoneSet();
  const nicknames = useNicknames();

  useEffect(() => {
    debugDump()
      .then(setDump)
      .catch(() => setDump(null));
  }, []);

  const labelOf = useCallback(
    (courseId: string) => {
      const code = dump?.courses.find((c) => c.id === courseId)?.courseCode ?? null;
      return nicknames[courseId] ?? courseShort(code);
    },
    [dump, nicknames],
  );

  const { graded, awaiting, local } = useMemo(() => {
    const graded: DoneItem[] = [];
    const awaiting: DoneItem[] = [];
    const local: DoneItem[] = [];
    if (!dump) return { graded, awaiting, local };
    const subOf = new Map(dump.submissions.map((s) => [s.assignmentId, s] as const));
    for (const a of dump.assignments) {
      const s = subOf.get(a.id) ?? null;
      if (s?.score !== null && s?.score !== undefined) {
        graded.push({ a, s });
      } else if (s?.submittedAt) {
        awaiting.push({ a, s });
      } else if (doneSet.has(a.id)) {
        local.push({ a, s });
      }
    }
    graded.sort((x, y) => (y.s?.gradedAt ?? "").localeCompare(x.s?.gradedAt ?? ""));
    awaiting.sort((x, y) => (y.s?.submittedAt ?? "").localeCompare(x.s?.submittedAt ?? ""));
    return { graded, awaiting, local };
  }, [dump, doneSet]);

  if (dump === null) {
    return (
      <>
        <ScreenHeader title="Done" subtitle="Everything you've finished, and what it earned." />
        <div className="mx-8 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </>
    );
  }

  const empty = graded.length === 0 && awaiting.length === 0 && local.length === 0;

  return (
    <>
      <ScreenHeader title="Done" subtitle="Everything you've finished, and what it earned." />
      {empty ? (
        <EmptyState
          icon={CheckCheck}
          title="Nothing finished yet"
          description="Submit on Canvas or mark items done (x on the board) and they collect here — with scores and professor comments once grading happens."
        />
      ) : (
        <div className="mx-8 mb-10 flex max-w-4xl flex-col gap-6">
          <Section
            title="Graded"
            hint="professor comments load on expand"
            items={graded}
            labelOf={labelOf}
            kind="graded"
          />
          <Section
            title="Submitted — awaiting grade"
            items={awaiting}
            labelOf={labelOf}
            kind="awaiting"
          />
          <Section
            title="Marked done by you"
            hint="local marks — Canvas doesn't know; unmark to send one back to the queue"
            items={local}
            labelOf={labelOf}
            kind="local"
          />
        </div>
      )}
    </>
  );
}

function Section({
  title,
  hint,
  items,
  labelOf,
  kind,
}: {
  title: string;
  hint?: string;
  items: DoneItem[];
  labelOf: (courseId: string) => string;
  kind: "graded" | "awaiting" | "local";
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <span data-numeric className="font-mono text-xs tabular-nums text-muted-foreground">
          {items.length}
        </span>
        {hint && <span className="text-2xs text-muted-foreground/60">· {hint}</span>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
        {items.map((it) => (
          <DoneRow key={it.a.id} item={it} label={labelOf(it.a.courseId)} kind={kind} />
        ))}
      </div>
    </section>
  );
}

function DoneRow({
  item: { a, s },
  label,
  kind,
}: {
  item: DoneItem;
  label: string;
  kind: "graded" | "awaiting" | "local";
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<SubmissionComment[] | "loading" | "error" | null>(null);
  const { title } = stripShouting(a.name);

  const toggleComments = () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      setComments("loading");
      submissionComments(a.courseId, a.id)
        .then(setComments)
        .catch(() => setComments("error"));
    }
  };

  const when =
    kind === "graded" ? s?.gradedAt : kind === "awaiting" ? s?.submittedAt : null;

  return (
    <div className="relative border-t border-border/40 first:border-t-0">
      <div className="flex items-center gap-3 py-2.5 pl-5 pr-4">
        <span
          aria-hidden
          className="absolute bottom-2.5 left-1.5 top-2.5 w-[3px] rounded-full"
          style={tickStyle(a.courseId)}
        />
        <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
        <Link
          to={`/courses/${a.courseId}`}
          className="shrink-0 rounded px-1.5 py-0.5 text-2xs font-medium text-foreground/80 hover:underline"
          style={chipStyle(a.courseId)}
        >
          {label}
        </Link>
        {when && (
          <span
            data-numeric
            className="shrink-0 whitespace-nowrap font-mono text-2xs tabular-nums text-muted-foreground"
          >
            {new Date(when).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        {kind === "graded" && (
          <span
            data-numeric
            className="w-16 shrink-0 whitespace-nowrap text-right font-mono text-sm tabular-nums"
          >
            {points(s?.score, a.pointsPossible)}
          </span>
        )}
        {kind === "awaiting" && (
          <span className="shrink-0 text-2xs text-muted-foreground">in review</span>
        )}
        {kind === "graded" && (
          <button
            type="button"
            onClick={toggleComments}
            title="Professor comments (fetched live)"
            className="flex shrink-0 items-center gap-1 rounded-md p-1.5 text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <ChevronDown
              className={cn("h-3 w-3 transition-transform duration-micro", open && "rotate-180")}
            />
          </button>
        )}
        {kind === "local" && (
          <button
            type="button"
            onClick={() => {
              setDone(a.id, false);
              toast.success("Sent back to the queue.");
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-2xs text-muted-foreground transition-colors duration-micro hover:bg-fill-ghost hover:text-foreground"
          >
            <Undo2 className="h-3.5 w-3.5" /> unmark
          </button>
        )}
      </div>

      {kind === "graded" && open && (
        <div className="border-t border-border/30 bg-fill-ghost/40 px-5 py-2.5 pl-8">
          {comments === "loading" ? (
            <p className="text-xs text-muted-foreground">Asking Canvas…</p>
          ) : comments === "error" ? (
            <p className="text-xs text-muted-foreground">
              Couldn't reach Canvas — comments need a live session. Reconnect and try again.
            </p>
          ) : comments === null || comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No comments on this one.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {comments.map((c) => (
                <div key={c.id} className="text-xs">
                  <span className="font-medium">{c.author ?? "Instructor"}</span>
                  {c.createdAt && (
                    <span className="ml-2 text-2xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <p className="mt-0.5 whitespace-pre-line leading-relaxed text-foreground/85">
                    {c.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
