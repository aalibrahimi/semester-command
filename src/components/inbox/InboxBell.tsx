/**
 * InboxBell: the bell in the header. A badge with the unread count, and a
 * panel with the latest notifications when you click it.
 *
 * Called by: AppShell (header).
 * Calls: lib/inbox (the store), InboxList, lib/ipc (mark all read).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Inbox as InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { markRead, useInbox } from "@/lib/inbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InboxList } from "./InboxList";

export function InboxBell() {
  const { items, unread } = useInbox();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const list = (tab === "unread" ? items.filter((i) => !i.readAt) : items).slice(0, 30);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"}
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground shadow-card transition-colors duration-micro hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              data-numeric
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] font-semibold leading-none text-white"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[400px] overflow-hidden rounded-2xl border-foreground/15 p-0 shadow-elevated">
        <header className="flex items-center gap-2 border-b border-foreground/10 px-3 py-2.5">
          <span className="text-sm font-semibold">Inbox</span>
          {unread > 0 && <span className="rounded-full bg-brand/15 px-1.5 text-2xs font-semibold text-brand-fg">{unread} new</span>}
          <div className="ml-auto flex rounded-lg bg-fill-ghost p-0.5 text-2xs">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("rounded-md px-2 py-1 capitalize", tab === t ? "bg-card font-medium text-foreground shadow-card" : "text-muted-foreground")}
              >
                {t}
              </button>
            ))}
          </div>
        </header>
        <div className="max-h-[420px] overflow-y-auto bg-popover">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <InboxIcon className="h-6 w-6 text-muted-foreground/60" />
              <p className="text-sm font-medium">{tab === "unread" ? "All caught up" : "Nothing yet"}</p>
              <p className="text-xs text-muted-foreground">Deadline reminders, new grades and missing work show up here.</p>
            </div>
          ) : (
            <InboxList items={list} compact onNavigate={() => setOpen(false)} />
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-foreground/10 px-3 py-2 text-xs">
          <button
            type="button"
            disabled={unread === 0}
            onClick={() => markRead(items.filter((i) => !i.readAt).map((i) => i.id))}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
          <Link to="/inbox" onClick={() => setOpen(false)} className="rounded-md px-1.5 py-1 font-medium text-brand-fg hover:underline">
            Open inbox
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
