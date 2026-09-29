/**
 * CanvasStatus: the header pill that says whether Canvas data is current.
 *
 * Called by: AppShell (header), on every screen.
 * Calls: hooks/useSync, lib/canvasHealth, ipc (triggerSync, openCanvasLogin).
 *
 * Green dot = synced recently. Amber = the last run failed or nothing has
 * synced in over two hours. Red = the Canvas sign-in expired. Click for the
 * details and the one button that fixes it.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LogIn, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { openCanvasLogin, triggerSync } from "@/lib/ipc";
import { canvasHealth, type HealthTone } from "@/lib/canvasHealth";
import { useSync } from "@/hooks/useSync";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DOT: Record<HealthTone, string> = {
  ok: "bg-on-track",
  busy: "bg-brand",
  warn: "bg-at-risk",
  bad: "bg-critical",
  off: "bg-locked",
};
const PILL: Record<HealthTone, string> = {
  ok: "text-muted-foreground hover:text-foreground",
  busy: "text-muted-foreground",
  warn: "bg-at-risk/10 text-at-risk-fg hover:bg-at-risk/15",
  bad: "bg-critical/10 text-critical-fg hover:bg-critical/15",
  off: "text-muted-foreground hover:text-foreground",
};
const MODE: Record<string, string> = {
  session: "signed in through SJSU (browser session)",
  token: "Canvas access token",
  ics: "calendar feed only",
  none: "not connected",
};

/** Re-render every minute so "5m ago" keeps counting without a new status. */
function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function CanvasStatus() {
  const { status, refresh } = useSync();
  const now = useMinuteTick();
  const h = canvasHealth(status, now);
  const [open, setOpen] = useState(false);

  const syncNow = async () => {
    await triggerSync();
    window.setTimeout(() => void refresh(), 400);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Canvas status: ${h.label}`}
          className={cn("flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors duration-micro", PILL[h.tone])}
        >
          {h.tone === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[h.tone], h.tone === "bad" && "animate-pulse")} />}
          <span className="max-w-[220px] truncate">{h.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <span className={cn("h-2.5 w-2.5 rounded-full", DOT[h.tone])} />
          <span className="text-sm font-semibold">{h.label}</span>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3 text-sm">
          <p className="leading-relaxed text-foreground/90">{h.detail}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-2xs text-muted-foreground">
            <dt>Last good sync</dt>
            <dd className="text-foreground/80">{status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "never"}</dd>
            <dt>Last attempt</dt>
            <dd className="text-foreground/80">{status.lastAttemptAt ? new Date(status.lastAttemptAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "never"}</dd>
            <dt>Connection</dt>
            <dd className="text-foreground/80">{MODE[status.authMode] ?? status.authMode}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            {h.action === "reconnect" && (
              <button type="button" onClick={() => void openCanvasLogin()} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                <LogIn className="h-3.5 w-3.5" /> Sign in to Canvas
              </button>
            )}
            {(h.action === "retry" || h.action === "sync" || h.tone === "ok") && (
              <button type="button" onClick={() => void syncNow()} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium", h.tone === "ok" ? "border border-border hover:bg-fill-ghost" : "bg-brand-solid text-primary-foreground hover:opacity-90")}>
                <RefreshCw className="h-3.5 w-3.5" /> {h.action === "retry" ? "Try again" : "Sync now"}
              </button>
            )}
            {h.action === "connect" && (
              <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                <SettingsIcon className="h-3.5 w-3.5" /> Connect in Settings
              </Link>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
