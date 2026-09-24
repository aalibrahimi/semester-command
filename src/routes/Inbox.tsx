/**
 * Inbox: every notification the app has sent you, newest first.
 *
 * Called by: the router at "/inbox" (sidebar, the header bell's "Open
 * inbox", a clicked pop-up with no other destination).
 * Calls: lib/inbox (the store), InboxList, lib/ipc (mark all read, clear read).
 *
 * "New email" opens the composer (components/inbox/EmailComposer): to a
 * professor, a classmate or anyone; pick a starting template, edit, then
 * open it in Gmail. /inbox?compose=<courseId> opens it addressed to that
 * course's professor (the course page links here).
 *
 * Filters stack: Unread narrows to what you haven't opened, a kind chip
 * narrows to one type. Read items older than 60 days clean themselves up
 * (inbox.rs prune), so "Clear read" is only for tidying by hand.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCheck, Inbox as InboxIcon, Mail, Settings2, Trash2 } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { InboxList } from "@/components/inbox/InboxList";
import { EmailComposer } from "@/components/inbox/EmailComposer";
import { cn } from "@/lib/utils";
import { KIND_FILTERS, kindMeta, markRead, patchInbox, useInbox } from "@/lib/inbox";
import { inboxClearRead } from "@/lib/ipc";

export default function Inbox() {
  const { items, unread, loaded } = useInbox();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [kind, setKind] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const composeFor = params.get("compose");
  const [composeOpen, setComposeOpen] = useState(false);
  const composing = composeOpen || composeFor !== null;
  const closeCompose = () => {
    setComposeOpen(false);
    if (composeFor !== null) {
      const next = new URLSearchParams(params);
      next.delete("compose");
      setParams(next, { replace: true });
    }
  };

  const shown = items.filter((i) => (!unreadOnly || !i.readAt) && (!kind || i.kind === kind));
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  const readCount = items.length - unread;

  const clearRead = () => {
    patchInbox((all) => all.filter((i) => !i.readAt));
    void inboxClearRead().catch(() => {});
  };

  return (
    <>
      <ScreenHeader
        title="Inbox"
        subtitle={unread > 0 ? `${unread} unread · ${items.length} total` : "Everything the app has told you, in one place."}
        actions={
          <>
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> New email
            </Button>
            <Button variant="outline" size="sm" disabled={unread === 0} onClick={() => markRead(items.filter((i) => !i.readAt).map((i) => i.id))}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
            </Button>
            <Button variant="outline" size="sm" disabled={readCount === 0} onClick={clearRead}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear read
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings#notifications" title="Pop-up settings">
                <Settings2 className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="mx-8 mb-10 max-w-4xl">
        {/* Filters */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <div className="mr-2 flex rounded-lg bg-fill-ghost p-0.5 text-xs">
            {[false, true].map((u) => (
              <button
                key={String(u)}
                type="button"
                onClick={() => setUnreadOnly(u)}
                className={cn("rounded-md px-3 py-1", unreadOnly === u ? "bg-card font-medium text-foreground shadow-card" : "text-muted-foreground")}
              >
                {u ? `Unread${unread ? ` (${unread})` : ""}` : "All"}
              </button>
            ))}
          </div>
          {KIND_FILTERS.filter((k) => counts.has(k)).map((k) => {
            const m = kindMeta(k);
            const Icon = m.icon;
            const on = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(on ? null : k)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-micro",
                  on ? "border-transparent bg-brand-solid text-white" : "border-foreground/15 text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" /> {m.label}
                <span className={cn("font-mono text-2xs", on ? "text-white/80" : "text-muted-foreground/70")}>{counts.get(k)}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-foreground/15 bg-card shadow-card">
          {!loaded ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <InboxIcon className="h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm font-medium">{items.length === 0 ? "Nothing here yet" : "Nothing matches"}</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                {items.length === 0
                  ? "Deadline reminders, new grades, missing work and the morning summary will collect here, even if you missed the pop-up."
                  : "Try All, or turn off the type filter."}
              </p>
            </div>
          ) : (
            <InboxList items={shown} />
          )}
        </div>
      </div>

      <EmailComposer open={composing} onOpenChange={(o) => (o ? setComposeOpen(true) : closeCompose())} initialCourseId={composeFor} />
    </>
  );
}
