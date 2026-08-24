/**
 * FinanceTerm — one academic term's full money detail, at /finance/:termId.
 *
 * Called by: the router; linked from the Finance page's activity panels.
 * Calls: ipc financeSnapshot (same snapshot the overview renders).
 *
 * The overview's activity card summarizes; this page is the drill-down the
 * MySJSU Account Inquiry → Activity screen offers, kept honest: every row
 * from the capture, notes always visible, itemized charges for the current
 * term, and a plain caveat when a term predates the capture window (a term
 * can look thinner here than it really was — say so, never pretend).
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, History, Landmark, Receipt } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { financeSnapshot } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { termSlug } from "@/lib/termSlug";
import type { FinanceSnapshot } from "@/types";

const MYSJSU_URL = "https://one.sjsu.edu/launch-task/all/mysjsu";

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function FinanceTerm() {
  const { termId } = useParams<{ termId: string }>();
  const [snap, setSnap] = useState<FinanceSnapshot | null | undefined>(undefined);

  useEffect(() => {
    financeSnapshot()
      .then(setSnap)
      .catch(() => setSnap(null));
  }, []);

  if (snap === undefined) {
    return (
      <>
        <ScreenHeader title="Term detail" subtitle="Loading the snapshot…" />
        <div className="mx-8 flex flex-col gap-3">
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </>
    );
  }

  const term = snap?.activity.map((r) => r.term).find((t) => termSlug(t) === termId) ?? null;

  if (snap === null || term === null) {
    return (
      <>
        <ScreenHeader title="Term detail" subtitle="Nothing here." />
        <EmptyState
          icon={Landmark}
          title="No data for this term"
          description="This term isn't in the finance snapshot. Ask me to read the portal with a wider date range and it will appear."
        />
      </>
    );
  }

  const rows = snap.activity.filter((r) => r.term === term);
  const moneyIn = rows.filter((r) => r.kind === "payment").reduce((s, r) => s + r.amount, 0);
  const refunded = rows.filter((r) => r.kind === "refund").reduce((s, r) => s + r.amount, 0);
  const billed = rows.filter((r) => r.kind === "charge").reduce((s, r) => s + r.amount, 0);
  const isCurrent = term === snap.term;
  // A term that started before the capture window is necessarily partial —
  // its early charges and disbursements never entered the snapshot.
  const partial =
    snap.capturedFrom !== undefined &&
    rows.every((r) => r.date >= (snap.capturedFrom as string)) &&
    !isCurrent;

  return (
    <>
      <ScreenHeader
        title={term}
        subtitle={`Every captured transaction · ${snap.source} snapshot of ${longDate(snap.asOf)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/finance">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Finances
              </Link>
            </Button>
            <Button size="sm" onClick={() => void openUrl(MYSJSU_URL)}>
              Open MySJSU <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <div className="mx-8 mb-10 flex max-w-4xl flex-col gap-5">
        {/* ── Term totals ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground">billed</p>
              <p data-numeric className="mt-0.5 font-mono text-xl font-medium tabular-nums">
                {usd(billed)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground">
                aid applied
              </p>
              <p
                data-numeric
                className="mt-0.5 font-mono text-xl font-medium tabular-nums text-on-track-fg"
              >
                {usd(moneyIn)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground">
                refunded to you
              </p>
              <p
                data-numeric
                className={cn(
                  "mt-0.5 font-mono text-xl font-medium tabular-nums",
                  refunded > 0 ? "text-on-track-fg" : "text-muted-foreground",
                )}
              >
                {usd(refunded)}
              </p>
            </CardContent>
          </Card>
        </div>

        {partial && (
          <p className="rounded-lg border border-at-risk/40 bg-at-risk/10 px-3 py-2 text-xs text-at-risk-fg">
            Partial view: the snapshot's capture window starts{" "}
            {snap.capturedFrom ? longDate(snap.capturedFrom) : "mid-year"}, so this term's
            earlier charges and disbursements aren't recorded. Ask me to re-read the portal
            with a wider date range for the complete term.
          </p>
        )}

        {/* ── Itemized charges (current term only — from Charges Due) ───── */}
        {isCurrent && snap.charges.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" /> Itemized charges
              </h2>
              <div className="flex flex-col gap-1">
                {snap.charges.map((c) => (
                  <div key={c.label} className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-0 truncate text-foreground/75">{c.label}</span>
                    <span
                      aria-hidden
                      className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
                    />
                    <span data-numeric className="shrink-0 font-mono text-sm tabular-nums">
                      {usd(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Every transaction, notes always on ───────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-2.5 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Transactions
            </h2>
            <div className="flex flex-col gap-3.5">
              {rows.map((r) => (
                <div key={`${r.date}-${r.item}`} className="flex gap-3">
                  <span
                    data-numeric
                    className="w-16 shrink-0 whitespace-nowrap font-mono text-2xs tabular-nums text-muted-foreground"
                  >
                    {longDate(r.date).replace(`, ${new Date(`${r.date}T00:00`).getFullYear()}`, "")}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      r.kind === "charge" ? "bg-muted-foreground/40" : "bg-on-track",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 truncate text-sm">{r.item}</span>
                      <span
                        aria-hidden
                        className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
                      />
                      <span
                        data-numeric
                        className={cn(
                          "shrink-0 font-mono text-sm tabular-nums",
                          r.kind === "charge" ? "text-foreground/90" : "text-on-track-fg",
                        )}
                      >
                        {r.kind === "charge" ? "" : r.kind === "refund" ? "refund " : "− "}
                        {usd(r.amount)}
                      </span>
                    </div>
                    {r.note && (
                      <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
                        {r.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
