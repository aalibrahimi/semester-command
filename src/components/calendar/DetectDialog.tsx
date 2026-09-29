/**
 * Dialog that detects class meeting times from the syllabus and offers to
 * add them as recurring blocks.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { savePlannerBlock } from "@/lib/ipc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tickStyle } from "@/lib/courseColor";
import type { ClassSlotCandidate } from "@/types";
import { WEEKDAY_NAMES, minLabel } from "@/components/calendar/time";

/** Review detected class slots and save the checked ones as weekly blocks. */
export function DetectDialog({
  detect,
  labelOf,
  onClose,
  onSaved,
}: {
  detect:
    | { phase: "loading" }
    | { phase: "review"; candidates: ClassSlotCandidate[]; canvasChecked: boolean };
  labelOf: (courseId: string, code: string | null) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(() =>
    detect.phase === "review" ? new Set(detect.candidates.map((_, i) => i)) : new Set(),
  );
  const [busy, setBusy] = useState(false);

  const saveAll = () => {
    if (detect.phase !== "review") return;
    const picked = detect.candidates.filter((_, i) => checked.has(i));
    setBusy(true);
    Promise.all(
      picked.map((c) =>
        savePlannerBlock({
          kind: "class",
          courseId: c.courseId,
          title: labelOf(c.courseId, c.courseCode),
          location: c.location,
          weekday: c.weekday,
          date: null,
          startMin: c.startMin,
          endMin: c.endMin,
          note: null,
        }),
      ),
    )
      .then(() => {
        toast.success(
          "Added " + picked.length + " class slot" + (picked.length === 1 ? "" : "s") + " to your week.",
        );
        onSaved();
      })
      .catch(() => toast.error("Some slots failed to save."))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detected class times</DialogTitle>
          <DialogDescription>
            From Canvas calendar events and imported syllabi. Uncheck anything that looks wrong —
            nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        {detect.phase === "loading" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Checking Canvas events and syllabi…
          </p>
        ) : detect.candidates.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">
            <p>
              Nothing new detected
              {detect.canvasChecked
                ? ""
                : " — Canvas session expired, so only imported syllabi were checked"}
              . SJSU rarely publishes meeting times to Canvas, so two ways forward:
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs">
              <li>Import your syllabus PDFs (each course's Syllabus tab) — most state the meeting pattern.</li>
              <li>Or click any empty slot on the grid and enter times from MySJSU once.</li>
            </ul>
          </div>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {!detect.canvasChecked && (
              <p className="mb-1 text-2xs text-muted-foreground">
                Canvas session expired — these came from imported syllabi only.
              </p>
            )}
            {detect.candidates.map((c, i) => (
              <label
                key={c.courseId + "-" + c.weekday + "-" + c.startMin}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 hover:bg-white/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={(e) => {
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      return next;
                    });
                  }}
                />
                <span
                  className="h-4 w-1 shrink-0 rounded-full"
                  style={tickStyle(c.courseId)}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {labelOf(c.courseId, c.courseCode)}
                </span>
                <span className="shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                  {WEEKDAY_NAMES[c.weekday]} {minLabel(c.startMin)}–{minLabel(c.endMin)}
                </span>
                {c.location && (
                  <span className="max-w-24 shrink-0 truncate text-2xs text-muted-foreground">
                    {c.location}
                  </span>
                )}
                <span className="shrink-0 rounded border border-border/70 px-1 py-px text-2xs text-muted-foreground">
                  {c.source}
                </span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {detect.phase === "review" && detect.candidates.length > 0 && (
            <Button size="sm" onClick={saveAll} disabled={busy || checked.size === 0}>
              {busy
                ? "Adding…"
                : "Add " + checked.size + " slot" + (checked.size === 1 ? "" : "s")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
