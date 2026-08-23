/**
 * Finance — the MySJSU money picture, as a dated snapshot.
 *
 * Called by: the router, at "/finance".
 * Calls: ipc financeSnapshot; plugin-opener for the MySJSU launch link.
 *
 * MySJSU (PeopleSoft) sits behind SSO + Duo and has no student API, so this
 * screen cannot sync itself. It renders the last captured snapshot — taken
 * by reading the portal — and says exactly when that was. The "findings"
 * block is the talked-through analysis of that capture, in the same voice
 * as the Brief. Refreshing = capturing again; the page never pretends to
 * be live and never touches payments.
 */
import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowUpRight, HandCoins, History, Landmark, Receipt, Sparkles } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { financeSnapshot } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { FinanceSnapshot } from "@/types";

const MYSJSU_URL = "https://one.sjsu.edu/launch-task/all/mysjsu";

/** Finding tones borrow the signal palette: this page has no grade risk,
 *  so the hues mean money states instead — same instincts, same colors. */
const TONE_TEXT: Record<string, string> = {
  good: "text-on-track-fg",
  warn: "text-at-risk-fg",
  urgent: "text-critical-fg",
  info: "text-brand-fg",
};
const TONE_BORDER: Record<string, string> = {
  good: "border-on-track/40",
  warn: "border-at-risk/40",
  urgent: "border-critical/40",
  info: "border-brand/40",
};

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "Aug 11" — the term column carries the year, the date column shouldn't wrap. */
function dayOnly(iso: string): string {
  const d = new Date(`${iso}T00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Finance() {
  const [snap, setSnap] = useState<FinanceSnapshot | null | undefined>(undefined);
  // Captured once per mount so the days-past math is pure during render.
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    financeSnapshot()
      .then(setSnap)
      .catch(() => setSnap(null));
  }, []);

  if (snap === undefined) {
    return (
      <>
        <ScreenHeader title="Finances" subtitle="Your MySJSU money picture, captured." />
        <div className="mx-8 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </>
    );
  }

  if (snap === null) {
    return (
      <>
        <ScreenHeader title="Finances" subtitle="Your MySJSU money picture, captured." />
        <EmptyState
          icon={Landmark}
          title="No snapshot yet"
          description="MySJSU has no API, so this page shows point-in-time captures. Ask me to read your student portal and I'll fill this in."
        />
      </>
    );
  }

  const daysPast =
    snap.dueDate !== null
      ? Math.floor((nowMs - new Date(`${snap.dueDate}T00:00`).getTime()) / 86_400_000)
      : null;

  return (
    <>
      <ScreenHeader
        title="Finances"
        subtitle={`${snap.source} snapshot · captured ${shortDate(snap.asOf)} — not live`}
        actions={
          <Button size="sm" onClick={() => void openUrl(MYSJSU_URL)}>
            Open MySJSU <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        }
      />

      <div className="mx-8 mb-10 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* ── The headline ─────────────────────────────────────────────── */}
        {snap.pastDue ? (
          <Alert className="border-critical/40 bg-critical/10 xl:col-span-3">
            <AlertTitle className="flex flex-wrap items-baseline gap-x-2 text-critical-fg">
              <span data-numeric className="font-mono text-xl font-semibold tabular-nums">
                {usd(snap.dueNow)}
              </span>
              <span className="text-sm font-medium">
                past due
                {snap.dueDate &&
                  ` — was due ${shortDate(snap.dueDate)}${daysPast !== null && daysPast > 0 ? ` (${daysPast} days ago)` : ""}`}
              </span>
            </AlertTitle>
            <AlertDescription className="text-critical-fg/80">
              Unpaid balances at CSU can grow holds or drop classes. Payment plans and paying
              happen in MySJSU — this page never touches money.
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="xl:col-span-3">
            <CardContent className="flex items-baseline gap-3 p-4">
              <span data-numeric className="font-mono text-2xl font-medium tabular-nums">
                {usd(snap.dueNow)}
              </span>
              <span className="text-sm text-muted-foreground">
                due now · future due {usd(snap.futureDue)}
              </span>
            </CardContent>
          </Card>
        )}

        {/* ── The talked-through part ──────────────────────────────────── */}
        {snap.findings.length > 0 && (
          <Card className="xl:col-span-2">
            <CardContent className="flex flex-col gap-2.5 p-4">
              <h2 className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> What I found
              </h2>
              <ol className="flex flex-col gap-3">
                {snap.findings.map((f, i) => (
                  <li
                    key={f.title}
                    className={cn(
                      "flex gap-3 border-l-2 pl-3",
                      TONE_BORDER[f.tone ?? "info"] ?? TONE_BORDER.info,
                    )}
                  >
                    <span
                      data-numeric
                      className={cn(
                        "shrink-0 font-mono text-[15px] tabular-nums",
                        TONE_TEXT[f.tone ?? "info"] ?? TONE_TEXT.info,
                      )}
                    >
                      {i + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium leading-snug">{f.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {f.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* ── Charges ──────────────────────────────────────────────────── */}
        <Card>
            <CardContent className="p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" /> Charges · {snap.term}
              </h2>
              <div className="flex flex-col gap-1">
                {snap.charges.map((c) => {
                  const max = Math.max(...snap.charges.map((x) => x.amount), 1);
                  return (
                    <div key={c.label} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 truncate text-foreground/75">{c.label}</span>
                      <span
                        aria-hidden
                        className="min-w-3 flex-1 border-b border-dotted border-border"
                      />
                      {/* Share-of-the-bill bar: tuition should LOOK like the
                          bulk of the bill, not just read like it. */}
                      <span
                        aria-hidden
                        className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-fill-ghost"
                      >
                        <span
                          className="block h-full rounded-full bg-brand/60"
                          style={{ width: `${(c.amount / max) * 100}%` }}
                        />
                      </span>
                      <span
                        data-numeric
                        className="w-20 shrink-0 text-right font-mono text-sm tabular-nums"
                      >
                        {usd(c.amount)}
                      </span>
                    </div>
                  );
                })}
                <div className="mt-1 flex items-baseline gap-2 border-t border-border pt-2 text-base font-medium">
                  <span>Total{snap.dueDate ? ` · due ${shortDate(snap.dueDate)}` : ""}</span>
                  <span aria-hidden className="min-w-3 flex-1" />
                  <span data-numeric className="shrink-0 font-mono tabular-nums">
                    {usd(snap.charges.reduce((s, c) => s + c.amount, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* ── Financial aid ────────────────────────────────────────────── */}
        <Card>
            <CardContent className="p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <HandCoins className="h-3.5 w-3.5" /> Financial aid · {snap.aidYear} · {snap.term}
              </h2>
              <div className="flex flex-col gap-1">
                {snap.awards.map((a) => (
                  <div
                    key={a.name}
                    className={cn(
                      "flex items-baseline gap-2 text-sm",
                      a.accepted <= 0 && "opacity-60",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {a.name}
                      <span className="ml-1.5 text-2xs text-muted-foreground">{a.category}</span>
                    </span>
                    <span
                      aria-hidden
                      className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
                    />
                    <span
                      aria-hidden
                      className="h-1 w-14 shrink-0 self-center overflow-hidden rounded-full bg-fill-ghost"
                    >
                      <span
                        className="block h-full rounded-full bg-on-track/70"
                        style={{ width: `${a.offered > 0 ? (a.accepted / a.offered) * 100 : 0}%` }}
                      />
                    </span>
                    <span
                      data-numeric
                      className={cn(
                        "shrink-0 font-mono text-sm tabular-nums",
                        a.accepted > 0 ? "text-on-track-fg" : "text-muted-foreground",
                      )}
                      title={`accepted ${usd(a.accepted)} of ${usd(a.offered)} offered${a.disbDate ? ` · disbursement ${shortDate(a.disbDate)}` : ""}`}
                    >
                      {usd(a.accepted)} / {usd(a.offered)}
                    </span>
                  </div>
                ))}
                <p className="mt-2 border-t border-border pt-2 text-2xs text-muted-foreground">
                  accepted / offered · year total {usd(snap.awardsYearAccepted)} of{" "}
                  {usd(snap.awardsYearOffered)}. Awards accepted at $0 never disburse — accept
                  or decline them in MySJSU, your call.
                </p>
              </div>
            </CardContent>
        </Card>

        {/* ── Activity ledger ──────────────────────────────────────────── */}
        <Card className="xl:col-start-3 xl:row-span-2 xl:row-start-2">
          <CardContent className="p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Activity
            </h2>
            <div className="flex flex-col gap-1">
              {snap.activity.map((r) => (
                <div
                  key={`${r.date}-${r.item}`}
                  className={cn(
                    "flex items-baseline gap-2 text-sm",
                    /* Prior terms are history — they recede. */
                    r.term !== snap.term && "opacity-60",
                  )}
                >
                  <span
                    data-numeric
                    className="w-12 shrink-0 whitespace-nowrap font-mono text-2xs tabular-nums text-muted-foreground"
                  >
                    {dayOnly(r.date)}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 self-center rounded-full",
                      r.kind === "charge" ? "bg-muted-foreground/40" : "bg-on-track",
                    )}
                  />
                  <span className="min-w-0 truncate text-foreground/85">{r.item}</span>
                  <span className="shrink-0 text-2xs text-muted-foreground">{r.term}</span>
                  <span
                    aria-hidden
                    className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
                  />
                  <span
                    data-numeric
                    className={cn(
                      "shrink-0 font-mono text-xs tabular-nums",
                      r.kind === "charge" ? "text-foreground/90" : "text-on-track-fg",
                    )}
                  >
                    {r.kind === "charge" ? "" : r.kind === "refund" ? "refund " : "− "}
                    {usd(r.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-2xs text-muted-foreground/70 xl:col-span-3">
          Snapshot only — MySJSU is the source of truth and the only place to pay, accept
          awards, or enroll in a payment plan. To refresh this page, ask me to read the portal
          again.
        </p>
      </div>
    </>
  );
}
