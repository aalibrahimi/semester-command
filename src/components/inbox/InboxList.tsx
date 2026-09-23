/**
 * InboxList: notifications grouped by day, one row each. Used full-size on
 * the Inbox page and compact in the header bell's panel.
 *
 * Called by: components/inbox/InboxBell, routes/Inbox.
 * Calls: lib/ipc (mark read/unread, delete), lib/inbox (kinds, time, the
 * store's optimistic patch).
 *
 * Clicking a row marks it read and opens its route. Unread rows carry a dot
 * and full-strength text; read rows step back.
 */
import { useNavigate } from "react-router-dom";
import { Circle, CircleDot, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { bucket, kindMeta, markRead, patchInbox, when } from "@/lib/inbox";
import { inboxDelete, inboxMarkUnread } from "@/lib/ipc";
import type { InboxItem } from "@/types";

export function InboxList({
  items,
  compact = false,
  onNavigate,
}: {
  items: InboxItem[];
  compact?: boolean;
  /** Called after a row opens its route (the bell closes its panel). */
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const groups: { label: string; items: InboxItem[] }[] = [];
  for (const it of items) {
    const label = bucket(it.createdAt);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(it);
    else groups.push({ label, items: [it] });
  }

  const open = (it: InboxItem) => {
    markRead([it.id]);
    if (it.route) navigate(it.route);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <section key={g.label}>
          <h3
            className={cn(
              "sticky top-0 z-10 px-4 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground",
              compact ? "bg-popover px-3" : "bg-card",
            )}
          >
            {g.label}
          </h3>
          <ul>
            {g.items.map((it) => (
              <Row key={it.id} item={it} compact={compact} onOpen={() => open(it)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ item, compact, onOpen }: { item: InboxItem; compact: boolean; onOpen: () => void }) {
  const meta = kindMeta(item.kind);
  const Icon = meta.icon;
  const unread = !item.readAt;

  const toggleRead = () => {
    if (unread) markRead([item.id]);
    else {
      patchInbox((items) => items.map((i) => (i.id === item.id ? { ...i, readAt: null } : i)));
      void inboxMarkUnread(item.id).catch(() => {});
    }
  };
  const remove = () => {
    patchInbox((items) => items.filter((i) => i.id !== item.id));
    void inboxDelete(item.id).catch(() => {});
  };

  return (
    <li className={cn("group/row relative flex items-start gap-3 border-b border-foreground/[0.07] px-4 py-3 last:border-0 hover:bg-fill-ghost/60", compact && "px-3 py-2.5")}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none">
        <span className={cn("mt-0.5 flex shrink-0 items-center justify-center rounded-xl", meta.disc, compact ? "h-8 w-8" : "h-9 w-9")}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-semibold text-foreground" : "text-foreground/70")}>
              {item.title}
            </span>
            <span className="shrink-0 text-2xs text-muted-foreground">{when(item.createdAt)}</span>
          </span>
          {item.body && (
            <span className={cn("mt-0.5 block text-xs leading-relaxed text-muted-foreground", compact ? "line-clamp-1" : "line-clamp-2")}>
              {item.body}
            </span>
          )}
          {!compact && (
            <span className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wider">{meta.label}</span>
              {item.urgency === "high" && <span className="rounded bg-critical/15 px-1 font-semibold text-critical-fg">Important</span>}
            </span>
          )}
        </span>
      </button>
      {unread && <span aria-label="Unread" className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand" />}
      <span
        className={cn(
          "absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border border-foreground/10 p-0.5 opacity-0 shadow-card transition-opacity duration-micro group-hover/row:opacity-100",
          compact ? "bg-popover" : "bg-card",
        )}
      >
        <button
          type="button"
          onClick={toggleRead}
          title={unread ? "Mark as read" : "Mark as unread"}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-fill-ghost hover:text-foreground"
        >
          {unread ? <CircleDot className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
        </button>
        {!compact && (
          <button
            type="button"
            onClick={remove}
            title="Delete"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-critical/10 hover:text-critical-fg"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    </li>
  );
}
