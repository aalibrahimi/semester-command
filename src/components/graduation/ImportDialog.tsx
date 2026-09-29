/**
 * Dialog for importing a degree audit (paste or file) into the plan.
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
import { importMyProgress } from "@/lib/ipc";
import { errorMessage } from "@/components/graduation/format";

export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const audit = await importMyProgress(text);
      toast.success(
        `Imported ${audit.outstanding.length} outstanding requirement${audit.outstanding.length === 1 ? "" : "s"}`,
      );
      setText("");
      onImported();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import MyProgress</DialogTitle>
          <DialogDescription>
            In MySJSU open <span className="font-medium">My Progress</span>, click{" "}
            <span className="font-medium">Expand All</span>, then{" "}
            <span className="font-medium">View All</span> on every course table — they cap at
            ten rows and the rest are silently dropped. Select the whole page, copy, and paste
            below.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder="Paste the whole My Progress page here…"
          className="w-full resize-y rounded-md border border-border bg-bg p-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || text.trim().length === 0}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ helpers ══════════════════════════════════════════════════════════════ */
