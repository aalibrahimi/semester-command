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
import { ArrowUpRight, Check, ChevronDown, Clock3, CreditCard, HandCoins, History, Landmark, ListChecks, Receipt, Sparkles } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { financeSnapshot } from "@/lib/ipc";
import { termSlug } from "@/lib/termSlug";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

/** The FAFSA banner's state machine: urgency climbs as the calendar moves.
 *  Pure date math against a fixed now — no aid logic here. */
function fafsaState(
  f: { year: string; opens: string; priorityDeadline: string; filed: boolean },
  nowMs: number,
): { tone: "good" | "info" | "warn" | "urgent"; headline: string; sub: string; days: number | null } {
  const day = 86_400_000;
  const opens = new Date(`${f.opens}T00:00`).getTime();
  const deadline = new Date(`${f.priorityDeadline}T23:59`).getTime();
  const history =
    "Your last two FAFSAs were late — and both years the aid arrived months into the term.";
  if (f.filed) {
    return {
      tone: "good",
      headline: `${f.year} FAFSA — filed`,
      sub: "On time this cycle. State aid should land with the fall bill instead of months after it.",
      days: null,
    };
  }
  if (nowMs < opens) {
    const days = Math.ceil((opens - nowMs) / day);
    return {
      tone: days <= 14 ? "warn" : "info",
      headline: `${f.year} FAFSA opens ${new Date(opens).toLocaleDateString(undefined, { month: "long", day: "numeric" })}`,
      sub: `File it that week. ${history}`,
      days,
    };
  }
  if (nowMs <= deadline) {
    const days = Math.ceil((deadline - nowMs) / day);
    const tone = days <= 30 ? "urgent" : days <= 60 ? "warn" : "info";
    return {
      tone,
      headline: `${f.year} FAFSA is OPEN — priority deadline ${new Date(deadline).toLocaleDateString(undefined, { month: "long", day: "numeric" })}`,
      sub:
        days <= 30
          ? `${history} Missing March 2 again risks losing Cal Grant renewal for a second year.`
          : `File now and next year's aid arrives in August, not March. ${history}`,
      days,
    };
  }
  return {
    tone: "urgent",
    headline: `${f.year} priority deadline has passed`,
    sub: "File anyway — federal aid still works — but state grants are at risk again. Talk to Financial Aid about late options.",
    days: null,
  };
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Finance() {
  const [snap, setSnap] = useState<FinanceSnapshot | null | undefined>(undefined);
  // Row notes are a reading mode, not furniture — off until asked for.
  const [explain, setExplain] = useState(false);
  // Findings are an accordion: headlines scan, details expand on click.
  const [openFindings, setOpenFindings] = useState<Set<number>>(new Set());
  const [showAllCharges, setShowAllCharges] = useState(false);
  // Which term groups are expanded; null = default (current term only).
  const [openTerms, setOpenTerms] = useState<Set<string> | null>(null);
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

        {/* ── The FAFSA clock: the fix for next year, always visible ────── */}
        {snap.fafsa &&
          (() => {
            const f = fafsaState(snap.fafsa, nowMs);
            const TONE = {
              good: "border-on-track/40 bg-on-track/10",
              info: "border-brand/40 bg-brand/10",
              warn: "border-at-risk/40 bg-at-risk/10",
              urgent: "border-critical/40 bg-critical/10",
            } as const;
            const TEXT = {
              good: "text-on-track-fg",
              info: "text-brand-fg",
              warn: "text-at-risk-fg",
              urgent: "text-critical-fg",
            } as const;
            return (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-3 xl:col-span-2",
                  TONE[f.tone],
                )}
              >
                {f.days !== null && (
                  <span
                    data-numeric
                    className={cn("font-mono text-2xl font-semibold tabular-nums", TEXT[f.tone])}
                  >
                    {f.days}
                    <span className="ml-1 text-sm font-medium">days</span>
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", TEXT[f.tone])}>{f.headline}</p>
                  <p className="text-2xs text-muted-foreground">{f.sub}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void openUrl("https://studentaid.gov/h/apply-for-aid/fafsa")}>
                  studentaid.gov <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })()}

        {/* ── The talked-through part ──────────────────────────────────── */}
        {snap.findings.length > 0 && (
          <Card className="xl:col-span-2">
            <CardContent className="flex flex-col gap-2.5 p-4">
              <h2 className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> What I found
              </h2>
              <ol className="flex flex-col gap-2">
                {snap.findings.map((f, i) => {
                  const open = openFindings.has(i);
                  return (
                    <li
                      key={f.title}
                      className={cn(
                        "border-l-2 pl-3",
                        TONE_BORDER[f.tone ?? "info"] ?? TONE_BORDER.info,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFindings((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                        className="flex w-full items-start gap-3 rounded-md py-0.5 text-left transition-colors duration-micro hover:bg-fill-ghost/40"
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
                        <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug">
                          {f.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            "mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-micro",
                            open && "rotate-180",
                          )}
                        />
                      </button>
                      {open && (
                        <p className="mt-1 pl-7 text-sm leading-relaxed text-muted-foreground">
                          {f.detail}
                        </p>
                      )}
                    </li>
                  );
                })}
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
                {(showAllCharges ? snap.charges : snap.charges.slice(0, 4)).map((c) => {
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
                {snap.charges.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCharges((v) => !v)}
                    className="flex items-baseline gap-2 rounded px-0.5 py-0.5 text-left text-2xs text-muted-foreground transition-colors duration-micro hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 self-center transition-transform duration-micro",
                        showAllCharges && "rotate-180",
                      )}
                    />
                    {showAllCharges
                      ? "show less"
                      : `${snap.charges.length - 4} smaller fees · ${usd(
                          snap.charges.slice(4).reduce((s2, c) => s2 + c.amount, 0),
                        )}`}
                  </button>
                )}
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
            <div className="mb-2 flex items-center gap-1.5">
              <h2 className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Activity
              </h2>
              <button
                type="button"
                onClick={() => setExplain((e) => !e)}
                className={cn(
                  "ml-auto rounded-full border px-2.5 py-0.5 text-2xs transition-colors duration-micro",
                  explain
                    ? "border-brand/50 bg-brand/10 text-brand-fg"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {explain ? "explaining" : "explain"}
              </button>
            </div>

            {/* Column chart: aid per term (blue) beside what reached the
                bank (green). Vertical columns, recessive gridlines, rounded
                data-ends, per-column tooltips; palette CVD-validated on the
                dark surface, identity carried by legend + labels too. */}
            {(() => {
              const order: string[] = [];
              const byTerm = new Map<string, { aid: number; bank: number }>();
              for (const r of snap.activity) {
                if (!byTerm.has(r.term)) {
                  byTerm.set(r.term, { aid: 0, bank: 0 });
                  order.push(r.term);
                }
                const t = byTerm.get(r.term) as { aid: number; bank: number };
                if (r.kind === "payment") t.aid += r.amount;
                if (r.kind === "refund") t.bank += r.amount;
              }
              const cols = [...order].reverse().map((term) => {
                const { aid, bank } = byTerm.get(term) as { aid: number; bank: number };
                return { term, aid, bank: Math.min(bank, aid) };
              });
              const max = Math.max(...cols.map((c) => c.aid), 1);
              const H = 120;
              const BILLC = "#3B82F6";
              const BANKC = "#1FA47B";
              const gridVals = [max, max / 2];
              return (
                <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-fill-ghost/40 p-3.5">
                  <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                    Aid received, term by term
                  </p>
                  <div className="relative" style={{ height: H + 34 }}>
                    {/* recessive gridlines with $ labels */}
                    {gridVals.map((v) => (
                      <div
                        key={v}
                        aria-hidden
                        className="absolute left-0 right-0 border-t border-border/40"
                        style={{ top: H - (v / max) * H }}
                      >
                        <span
                          data-numeric
                          className="absolute -top-2 right-0 font-mono text-[10px] tabular-nums text-muted-foreground/60"
                        >
                          {usd(v).replace(/\.00$/, "")}
                        </span>
                      </div>
                    ))}
                    <div
                      aria-hidden
                      className="absolute left-0 right-0 border-t border-border"
                      style={{ top: H }}
                    />
                    <div className="absolute inset-x-0 top-0 flex items-end justify-around" style={{ height: H }}>
                      {cols.map((c) => (
                        <div key={c.term} className="flex h-full items-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="w-8 rounded-t"
                                style={{
                                  height: Math.max(3, (c.aid / max) * H),
                                  background: BILLC,
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {c.term}: {usd(c.aid)} aid received
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="w-8 rounded-t"
                                style={{
                                  height: Math.max(c.bank > 0 ? 3 : 1, (c.bank / max) * H),
                                  background: c.bank > 0 ? BANKC : "rgb(var(--border))",
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {c.term}:{" "}
                              {c.bank > 0
                                ? `${usd(c.bank)} refunded to your bank`
                                : "nothing reached your bank"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-0 flex justify-around" style={{ top: H + 6 }}>
                      {cols.map((c) => (
                        <span key={c.term} className="text-2xs text-muted-foreground">
                          {c.term}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: BILLC }} />
                      aid received
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: BANKC }} />
                      reached your bank
                    </span>
                    <span className="ml-auto text-muted-foreground/60">hover a column</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex max-h-[440px] flex-col gap-4 overflow-y-auto pr-1.5">
              {(() => {
                // Term-grouped, ledger order preserved. Current term opens by
                // default; past years fold behind their headers so history is
                // one click away without stretching the page.
                const groups: { term: string; rows: typeof snap.activity }[] = [];
                for (const r of snap.activity) {
                  const g = groups.find((x) => x.term === r.term);
                  if (g) g.rows.push(r);
                  else groups.push({ term: r.term, rows: [r] });
                }
                const opened = openTerms ?? new Set([snap.term]);
                const toggleTerm = (t: string) => {
                  const next = new Set(opened);
                  if (next.has(t)) next.delete(t);
                  else next.add(t);
                  setOpenTerms(next);
                };
                return groups.map(({ term, rows }) => {
                  const moneyIn = rows
                    .filter((r) => r.kind === "payment")
                    .reduce((s2, r) => s2 + r.amount, 0);
                  const refunded = rows
                    .filter((r) => r.kind === "refund")
                    .reduce((s2, r) => s2 + r.amount, 0);
                  const billed = rows
                    .filter((r) => r.kind === "charge")
                    .reduce((s2, r) => s2 + r.amount, 0);
                  const current = term === snap.term;
                  const isOpen = opened.has(term);
                  return (
                    <div
                      key={term}
                      className={cn(
                        "shrink-0 overflow-hidden rounded-xl border",
                        current ? "border-brand/40 bg-fill-ghost/30" : "border-border",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTerm(term)}
                        className={cn(
                          "flex w-full items-center gap-2 px-4 py-3 text-left transition-colors duration-micro hover:bg-fill-ghost/60",
                          isOpen && "border-b border-border",
                        )}
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-micro",
                            !isOpen && "-rotate-90",
                          )}
                        />
                        <h3
                          className={cn(
                            "text-sm font-medium",
                            !current && "text-muted-foreground",
                          )}
                        >
                          {term}
                        </h3>
                        {current && (
                          <span className="chip bg-brand/10 text-2xs text-brand-fg">
                            this term
                          </span>
                        )}
                        <span className="ml-auto text-2xs text-muted-foreground">
                          {billed > 0 && `billed ${usd(billed)} · `}
                          aid {usd(moneyIn)}
                          {refunded > 0 && (
                            <span className="text-on-track-fg">
                              {" "}
                              · {usd(refunded)} to your bank
                            </span>
                          )}
                        </span>
                        <Link
                          to={`/finance/${termSlug(term)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-2xs text-brand-fg hover:underline"
                        >
                          details →
                        </Link>
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-3 px-4 py-3.5">
                          {rows.map((r) => (
                            <div key={`${r.date}-${r.item}`} className="flex gap-2.5">
                              <span
                                data-numeric
                                className="w-12 shrink-0 whitespace-nowrap font-mono text-2xs tabular-nums text-muted-foreground"
                              >
                                {dayOnly(r.date)}
                              </span>
                              <span
                                aria-hidden
                                className={cn(
                                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                  r.kind === "charge"
                                    ? "bg-muted-foreground/40"
                                    : "bg-on-track",
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="min-w-0 truncate text-sm text-foreground/85">
                                    {r.item}
                                  </span>
                                  <span
                                    aria-hidden
                                    className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-border"
                                  />
                                  <span
                                    data-numeric
                                    className={cn(
                                      "shrink-0 font-mono text-xs tabular-nums",
                                      r.kind === "charge"
                                        ? "text-foreground/90"
                                        : "text-on-track-fg",
                                    )}
                                  >
                                    {r.kind === "charge"
                                      ? ""
                                      : r.kind === "refund"
                                        ? "refund "
                                        : "− "}
                                    {usd(r.amount)}
                                  </span>
                                </div>
                                {explain && r.note && (
                                  <p className="mt-1 max-w-prose text-2xs leading-snug text-muted-foreground/70">
                                    {r.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        {/* ── Existing federal loans (studentaid.gov) ──────────────────── */}
        {snap.loans && (
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" /> Federal loans · studentaid.gov
              </h2>
              <div className="flex items-baseline gap-2">
                <span data-numeric className="font-mono text-xl font-medium tabular-nums">
                  {usd(snap.loans.totalBalance)}
                </span>
                <span className="text-2xs text-muted-foreground">
                  in {snap.loans.count} loans · {snap.loans.status.toLowerCase()}
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default underline decoration-border decoration-dashed underline-offset-4">
                      {usd(snap.loans.principal)} principal · {usd(snap.loans.interest)} interest ·{" "}
                      {snap.loans.rateRange}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="flex flex-col gap-1">
                    <span>servicer: {snap.loans.servicer}</span>
                    {snap.loans.byYear.map((y) => (
                      <span key={y.year}>
                        {y.year}: {usd(y.amount)}
                      </span>
                    ))}
                    <span>as of {shortDate(snap.loans.asOf)}</span>
                  </TooltipContent>
                </Tooltip>
                <span className="text-2xs text-muted-foreground/70">
                  Context for this year's accept/decline loan decision.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Paper trail: done, waiting, and next ─────────────────────── */}
        {snap.tracking && snap.tracking.length > 0 && (
          <Card className="xl:col-span-2">
            <CardContent className="p-4">
              <h2 className="mb-2.5 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> Paper trail
              </h2>
              <div className="flex flex-col gap-2">
                {snap.tracking.map((t) => (
                  <div key={t.label} className="flex gap-2.5">
                    {t.state === "done" ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-track-fg" />
                    ) : t.state === "pending" ? (
                      <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-at-risk-fg" />
                    ) : (
                      <span
                        aria-hidden
                        className="mt-1 h-3 w-3 shrink-0 rounded-full border border-muted-foreground/50"
                      />
                    )}
                    <div className="min-w-0">
                      {t.detail ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="cursor-default text-sm leading-snug underline decoration-border decoration-dashed underline-offset-4">
                              {t.label}
                              {t.date && (
                                <span className="ml-2 text-2xs text-muted-foreground no-underline">
                                  {shortDate(t.date)}
                                </span>
                              )}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-96">
                            {t.detail}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <p className="text-sm leading-snug">
                          {t.label}
                          {t.date && (
                            <span className="ml-2 text-2xs text-muted-foreground">
                              {shortDate(t.date)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-2xs text-muted-foreground/70 xl:col-span-3">
          Snapshot only — MySJSU is the source of truth and the only place to pay, accept
          awards, or enroll in a payment plan. To refresh this page, ask me to read the portal
          again.
        </p>
      </div>
    </>
  );
}
