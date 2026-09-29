/**
 * Dialog for editing the course's letter grade scale.
 */
import { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setGradeScale } from "@/lib/ipc";

/** Edit this course's letter cutoffs — SJSU professors curve, and the
 *  default scale lying about it poisons every letter in the app. Rows are
 *  edited as text and validated in Rust on save. */
export function ScaleDialog({
  open,
  onOpenChange,
  courseId,
  scale,
  customScale,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  scale: [number, string][];
  customScale: boolean;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<{ letter: string; cutoff: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    // Reseeding the editor from the live scale each time it opens.
    // oxlint-disable-next-line set-state-in-effect
    setRows(scale.map(([cutoff, letter]) => ({ letter, cutoff: String(cutoff) })));
  }, [open, scale]);

  const save = () => {
    const parsed: [number, string][] = [];
    for (const r of rows) {
      if (r.letter.trim() === "" && r.cutoff.trim() === "") continue; // deleted row
      const cutoff = Number.parseFloat(r.cutoff);
      if (Number.isNaN(cutoff) || cutoff < 0 || cutoff > 110 || r.letter.trim() === "") {
        toast.error("Each row needs a letter and a cutoff between 0 and 110.");
        return;
      }
      parsed.push([cutoff, r.letter.trim()]);
    }
    if (parsed.length === 0) {
      toast.error("A scale needs at least one cutoff.");
      return;
    }
    setGradeScale(courseId, parsed)
      .then(() => {
        onOpenChange(false);
        onSaved();
        toast.success("Scale saved: every letter in this course now uses it.");
      })
      .catch((e: unknown) => toast.error(String(e)));
  };

  const reset = () => {
    setGradeScale(courseId, null)
      .then(() => {
        onOpenChange(false);
        onSaved();
        toast.success("Back to the standard scale.");
      })
      .catch(() => toast.error("Could not reset the scale."));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Grade scale</DialogTitle>
          <DialogDescription>
            The cutoffs letters are computed with, for this course only. Blank out both fields
            to drop a row.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[72px_1fr] gap-2">
              <input
                value={r.letter}
                onChange={(e) =>
                  setRows((cur) => cur.map((row, j) => (j === i ? { ...row, letter: e.target.value } : row)))
                }
                placeholder="A-"
                className="rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-brand"
              />
              <input
                value={r.cutoff}
                onChange={(e) =>
                  setRows((cur) => cur.map((row, j) => (j === i ? { ...row, cutoff: e.target.value } : row)))
                }
                placeholder="90"
                inputMode="decimal"
                className="rounded-md border border-border bg-transparent px-2 py-1 font-mono text-sm tabular-nums outline-none focus-visible:border-brand"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((cur) => [...cur, { letter: "", cutoff: "" }])}
            className="mt-1 flex items-center gap-1 self-start text-2xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add a cutoff
          </button>
        </div>

        <div className="flex items-center justify-between">
          {customScale ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Use the default
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={save}>
            Save scale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Manual assignment entry (§3 — first-class under Tier 2) ─────────────── */
