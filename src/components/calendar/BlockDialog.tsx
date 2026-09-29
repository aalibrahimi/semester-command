/**
 * Dialog for creating or editing one calendar block (title, day, start and
 * end time, repeat).
 */
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePlannerBlock, savePlannerBlock } from "@/lib/ipc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { courseShort } from "@/lib/courseLabel";
import type { PlannerBlock } from "@/types";
import { minToInput, inputToMin } from "@/components/calendar/time";

/** Create/edit one planner block: class meeting (weekly, course-linked) or
 *  personal event (weekly or one-off). */
export function BlockDialog({
  dialog,
  courses,
  nicknames,
  onClose,
  onSaved,
}: {
  dialog:
    | { mode: "create"; weekday: number; date: string; startMin: number }
    | { mode: "edit"; block: PlannerBlock };
  courses: { id: string; courseCode: string | null; name: string | null }[];
  nicknames: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const NO_COURSE = "__none";
  const editing = dialog.mode === "edit" ? dialog.block : null;
  const [kind, setKind] = useState<"class" | "study" | "event">(editing?.kind ?? "event");
  const [courseId, setCourseId] = useState<string>(editing?.courseId ?? "");
  const [category, setCategory] = useState<"fitness" | "work" | "personal">(
    editing?.category ?? "personal",
  );
  const [title, setTitle] = useState(editing?.title ?? "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [repeat, setRepeat] = useState<"weekly" | "once">(
    editing ? (editing.weekday !== null ? "weekly" : "once") : "once",
  );
  const [weekday, setWeekday] = useState<number>(
    editing?.weekday ?? (dialog.mode === "create" ? dialog.weekday : 0),
  );
  const [date, setDate] = useState<string>(
    editing?.date ?? (dialog.mode === "create" ? dialog.date : ""),
  );
  const [start, setStart] = useState(
    minToInput(editing?.startMin ?? (dialog.mode === "create" ? dialog.startMin : 9 * 60)),
  );
  const [end, setEnd] = useState(
    minToInput(editing?.endMin ?? (dialog.mode === "create" ? dialog.startMin + 60 : 10 * 60)),
  );
  const [busy, setBusy] = useState(false);

  const courseLabel = (c: { id: string; courseCode: string | null; name: string | null }) =>
    nicknames[c.id] ?? courseShort(c.courseCode ?? c.name);

  const save = () => {
    const startMin = inputToMin(start);
    const endMin = inputToMin(end);
    if (startMin === null || endMin === null) {
      toast.error("Times look wrong: use HH:MM.");
      return;
    }
    if (kind === "class" && courseId === "") {
      toast.error("Pick which course this class meeting belongs to.");
      return;
    }
    const picked = courses.find((c) => c.id === courseId);
    const resolvedTitle =
      kind === "class" && title.trim() === "" && picked
        ? `${courseLabel(picked)} class`
        : title;
    setBusy(true);
    savePlannerBlock({
      id: editing?.id,
      kind,
      // Study keeps its (optional) course link — that's what colors it.
      courseId: kind === "event" ? null : courseId || null,
      category: kind === "event" ? category : null,
      title: resolvedTitle,
      location: location.trim() === "" ? null : location.trim(),
      weekday: repeat === "weekly" || kind === "class" ? weekday : null,
      date: repeat === "once" && kind !== "class" ? date : null,
      startMin,
      endMin,
    })
      .then(onSaved)
      .catch((e: unknown) =>
        toast.error(String((e as { message?: string })?.message ?? "Could not save the block.")),
      )
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (!editing) return;
    setBusy(true);
    deletePlannerBlock(editing.id)
      .then(onSaved)
      .catch(() => toast.error("Could not delete the block."))
      .finally(() => setBusy(false));
  };

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit block" : "Add to your week"}</DialogTitle>
          <DialogDescription>
            Class meetings repeat weekly and wear their course color. Study sessions go purple,
            personal blocks green: gym, work, anything.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Select
              value={kind}
              onValueChange={(v) => setKind(v === "class" ? "class" : v === "study" ? "study" : "event")}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Personal</SelectItem>
                <SelectItem value="study">Study session</SelectItem>
                <SelectItem value="class">Class time</SelectItem>
              </SelectContent>
            </Select>
            {kind === "class" ? (
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {courseLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "study" ? "Study: CS 146 · review session…" : "Gym · work · …"}
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </div>

          {kind === "class" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Label (optional: defaults to the course name)"
              className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}

          {/* Personal blocks split into life-categories — that's the color
              (fitness green, work copper, personal slate). */}
          {kind === "event" && (
            <Select
              value={category}
              onValueChange={(v) =>
                setCategory(v === "fitness" ? "fitness" : v === "work" ? "work" : "personal")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="fitness">Fitness: gym, runs</SelectItem>
                <SelectItem value="work">Work: shifts, internship</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* A study session linked to its course wears that course's color
              on the grid — same hue as the class, fainter. */}
          {kind === "study" && (
            <Select
              value={courseId === "" ? NO_COURSE : courseId}
              onValueChange={(v) => setCourseId(v === NO_COURSE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Course (for the color)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COURSE}>No course: general study</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {courseLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2">
            {kind !== "class" && (
              <Select
                value={repeat}
                onValueChange={(v) => setRepeat(v === "weekly" ? "weekly" : "once")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Just once</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                </SelectContent>
              </Select>
            )}
            {kind === "class" || repeat === "weekly" ? (
              <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((w, i) => (
                    <SelectItem key={w} value={String(i)}>
                      {w}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              step={900}
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              step={900}
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional): MacQuarrie Hall 225, SRAC…"
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <DialogFooter className="gap-2">
          {editing && (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={busy}
              className="mr-auto text-critical-fg"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
