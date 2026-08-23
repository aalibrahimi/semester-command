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
import { ArrowUpRight, Landmark } from "lucide-react";
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

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
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
          <Button variant="outline" size="sm" onClick={() => void openUrl(MYSJSU_URL)}>
            Open MySJSU <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        }
      />

      <div className="mx-8 mb-10 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* ── The headline ─────────────────────────────────────────────── */}
        {snap.pastDue ? (
          <Alert className="border-critical/40 bg-critical/10 xl:col-span-3">
            <AlertTitle className="text-critical-fg">
              {usd(snap.dueNow)} past due
              {snap.dueDate &&
                ` — was due ${shortDate(snap.dueDate)}${daysPast !== null && daysPast > 0 ? ` (${daysPast} days ago)` : ""}`}
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
              <h2 className="text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                What I found
              </h2>
              {snap.findings.map((f) => (
                <p key={f} className="text-sm leading-relaxed text-foreground/90">
                  {f}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Charges ──────────────────────────────────────────────────── */}
        <Card>
            <CardContent className="p-4">
              <h2 className="mb-2 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Charges · {snap.term}
              </h2>
              <div className="flex flex-col gap-1">
                {snap.charges.map((c) => (
                  <div key={c.label} className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-0 truncate">{c.label}</span>
                    <span
                      aria-hidden
                      className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
                    />
                    <span data-numeric className="shrink-0 font-mono text-xs tabular-nums">
                      {usd(c.amount)}
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-baseline gap-2 border-t border-border pt-2 text-sm font-medium">
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
              <h2 className="mb-2 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Financial aid · {snap.aidYear} · {snap.term}
              </h2>
              <div className="flex flex-col gap-1">
                {snap.awards.map((a) => (
                  <div key={a.name} className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {a.name}
                      <span className="ml-1.5 text-2xs text-muted-foreground">{a.category}</span>
                    </span>
                    <span
                      aria-hidden
                      className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
                    />
                    <span
                      data-numeric
                      className={cn(
                        "shrink-0 font-mono text-xs tabular-nums",
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
            <h2 className="mb-2 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Activity
            </h2>
            <div className="flex flex-col gap-1">
              {snap.activity.map((r) => (
                <div key={`${r.date}-${r.item}`} className="flex items-baseline gap-2 text-sm">
                  <span
                    data-numeric
                    className="w-20 shrink-0 font-mono text-2xs tabular-nums text-muted-foreground"
                  >
                    {shortDate(r.date)}
                  </span>
                  <span className="min-w-0 truncate">{r.item}</span>
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
