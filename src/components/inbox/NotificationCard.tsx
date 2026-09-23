/**
 * NotificationCard + ToastStack: how one notification looks, and a stack
 * of them that time out on their own.
 *
 * Called by: AppShell (in-app toasts while you're using the app),
 * toast/ToastApp (the corner pop-up window when the app is in the
 * background).
 * Calls: lib/inbox (kind icons and colors, relative time).
 *
 * Timing: normal items leave after 8 s, high-urgency ones (the 3-hour
 * deadline call, "marked missing", Canvas disconnected) stay until closed.
 * Hovering anywhere on the stack pauses every timer, the same way macOS
 * does, so a card never slides away while you're reading it. The thin bar
 * at the bottom of a card is its remaining time.
 */
import { ArrowUpRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { kindMeta, when } from "@/lib/inbox";
import type { InboxItem } from "@/types";

const NORMAL_MS = 8000;
const MAX_VISIBLE = 4;

export function NotificationCard({
  item,
  onOpen,
  onClose,
  timerMs,
  onTimeout,
  className,
}: {
  item: InboxItem;
  onOpen: () => void;
  onClose: () => void;
  /** Auto-dismiss after this long (paused while the stack is hovered). */
  timerMs?: number;
  onTimeout?: () => void;
  className?: string;
}) {
  const meta = kindMeta(item.kind);
  const Icon = meta.icon;
  const high = item.urgency === "high";
  return (
    <div
      role="status"
      className={cn(
        "group/card relative flex w-full overflow-hidden rounded-2xl border bg-card text-left shadow-elevated",
        high ? "border-critical/35" : "border-foreground/15",
        "animate-in fade-in-0 slide-in-from-right-8 duration-300",
        className,
      )}
    >
      <span aria-hidden className={cn("w-1 shrink-0", meta.bar)} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-3 px-3.5 py-3 text-left outline-none focus-visible:bg-fill-ghost">
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.disc)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 pr-6 text-2xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">{meta.label}</span>
            {high && <span className="rounded bg-critical/15 px-1 py-px font-semibold text-critical-fg">Important</span>}
            <span aria-hidden>·</span>
            <span>{when(item.createdAt)}</span>
          </span>
          <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground">{item.title}</span>
          {item.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{item.body}</span>}
          <span className="mt-1.5 flex items-center gap-1 text-2xs font-medium text-brand-fg opacity-0 transition-opacity duration-micro group-hover/card:opacity-100">
            Open <ArrowUpRight className="h-3 w-3" />
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity duration-micro hover:bg-fill-ghost hover:text-foreground hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {timerMs !== undefined && Number.isFinite(timerMs) && (
        <span
          aria-hidden
          onAnimationEnd={onTimeout}
          style={{ animationDuration: `${timerMs}ms` }}
          className={cn(
            "absolute bottom-0 left-1 right-0 h-0.5 origin-left animate-toast-timer opacity-60",
            meta.bar,
            "group-hover/stack:[animation-play-state:paused]",
          )}
        />
      )}
    </div>
  );
}

export function ToastStack({
  toasts,
  onOpen,
  onDismiss,
  onDismissAll,
  className,
}: {
  toasts: InboxItem[];
  onOpen: (item: InboxItem) => void;
  onDismiss: (id: number) => void;
  onDismissAll: () => void;
  className?: string;
}) {
  if (toasts.length === 0) return null;
  const shown = toasts.slice(0, MAX_VISIBLE);
  const hidden = toasts.length - shown.length;
  return (
    <div className={cn("group/stack flex flex-col gap-2", className)}>
      {shown.map((t) => (
        <NotificationCard
          key={t.id}
          item={t}
          onOpen={() => onOpen(t)}
          onClose={() => onDismiss(t.id)}
          timerMs={t.urgency === "high" ? undefined : NORMAL_MS}
          onTimeout={() => onDismiss(t.id)}
        />
      ))}
      {(hidden > 0 || toasts.length > 1) && (
        <div className="flex items-center justify-end gap-2 px-1 text-2xs">
          {hidden > 0 && <span className="text-muted-foreground">+{hidden} more in your inbox</span>}
          <button
            type="button"
            onClick={onDismissAll}
            className="rounded-full border border-foreground/15 bg-card px-2.5 py-1 font-medium text-muted-foreground shadow-card hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
