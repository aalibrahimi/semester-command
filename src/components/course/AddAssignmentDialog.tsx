/**
 * Dialog for adding a manual assignment to a course.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { saveManualAssignment, saveManualGroup } from "@/lib/ipc";
import type { GroupDetail } from "@/types";

/** Add an assignment by hand: name, group, due date, points. In a weighted
 *  course the group choice is mandatory — an ungrouped assignment cannot
 *  count toward the grade, and this dialog refuses to create one silently.
 *  "New group…" creates the group (with a weight) in the same save. */
export function AddAssignmentDialog({
  open,
  onOpenChange,
  courseId,
  weighted,
  groups,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  weighted: boolean;
  groups: GroupDetail[];
  onSaved: () => void;
}) {
  const NEW_GROUP = "__new";
  const NO_GROUP = "__none";
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(weighted ? (groups[0]?.id ?? NEW_GROUP) : NO_GROUP);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupWeight, setNewGroupWeight] = useState("");
  const [due, setDue] = useState("");
  const [pointsStr, setPointsStr] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (name.trim() === "") {
      toast.error("Give the assignment a name.");
      return;
    }
    const pts = pointsStr.trim() === "" ? undefined : Number.parseFloat(pointsStr);
    if (pts !== undefined && (Number.isNaN(pts) || pts < 0)) {
      toast.error("Points must be a plain non-negative number.");
      return;
    }
    if (weighted && groupId === NO_GROUP) {
      toast.error("Pick a group: ungrouped work can't count in a weighted course.");
      return;
    }
    setSaving(true);
    try {
      let resolvedGroup: string | undefined =
        groupId === NO_GROUP ? undefined : groupId === NEW_GROUP ? undefined : groupId;
      if (groupId === NEW_GROUP) {
        if (newGroupName.trim() === "") {
          toast.error("Name the new group.");
          setSaving(false);
          return;
        }
        const w = newGroupWeight.trim() === "" ? undefined : Number.parseFloat(newGroupWeight);
        if (weighted && (w === undefined || Number.isNaN(w) || w <= 0)) {
          toast.error("A weighted course needs the new group's weight (e.g. 20).");
          setSaving(false);
          return;
        }
        resolvedGroup = await saveManualGroup({
          courseId,
          name: newGroupName.trim(),
          groupWeight: w,
        });
      }
      // datetime-local gives local wall time; store the instant it names.
      const dueAt = due ? new Date(due).toISOString() : undefined;
      await saveManualAssignment({
        courseId,
        groupId: resolvedGroup,
        name: name.trim(),
        dueAt,
        pointsPossible: pts,
      });
      onOpenChange(false);
      onSaved();
      setName("");
      setDue("");
      setPointsStr("");
      toast.success("Added. It's marked manual until Canvas confirms it.");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add an assignment</DialogTitle>
          <DialogDescription>
            For work the syllabus knows about but Canvas doesn't show yet, or everything, if
            you're running on the calendar feed. Manual rows survive every sync.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Assignment name"
            className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand"
          />

          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!weighted && <SelectItem value={NO_GROUP}>No group</SelectItem>}
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name ?? "Unnamed group"}
                  {g.weight !== null ? ` (${g.weight.toFixed(0)}%)` : ""}
                </SelectItem>
              ))}
              <SelectItem value={NEW_GROUP}>New group…</SelectItem>
            </SelectContent>
          </Select>

          {groupId === NEW_GROUP && (
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand"
              />
              <input
                value={newGroupWeight}
                onChange={(e) => setNewGroupWeight(e.target.value)}
                placeholder={weighted ? "weight %" : "weight"}
                inputMode="decimal"
                className="rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:border-brand"
              />
            </div>
          )}

          <div className="grid grid-cols-[1fr_88px] gap-2">
            <input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand"
            />
            <input
              value={pointsStr}
              onChange={(e) => setPointsStr(e.target.value)}
              placeholder="points"
              inputMode="decimal"
              className="rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums outline-none focus-visible:border-brand"
            />
          </div>
        </div>

        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Add assignment"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
