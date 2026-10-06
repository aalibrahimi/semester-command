/**
 * ExplainDialog: "can I say this myself?" for one definition or highlight.
 *
 * Called by: AppShell (mounted once; opens whenever study/highlights has an
 * `open` target: from the header panel, a definition card, or the selection
 * toolbar).
 * Calls: study/explainCheck (the built-in check), study/highlights (attempts),
 * lib/ipc (the optional Claude check with the reader's own key).
 *
 * Two tabs:
 *   Fill the blanks   the text with its key ideas blanked; each blank checked.
 *   In my own words   write it your way; the built-in check names which key
 *                     ideas you covered and gives one nudge for what's
 *                     missing. "Ask Claude" judges meaning, not wording.
 * Every attempt is saved, and the last one is shown next to the new one:
 * what you gained, what slipped, what you've missed both times.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleAlert, History, Lightbulb, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as ipc from "@/lib/ipc";
import type { AiFeedback, ExplainRecord } from "@/lib/ipc";
import { attachAi, attemptsFor, closeExplain, parseKeys, recordAttempt, useHighlights, type ExplainTarget } from "@/study/highlights";
import { blankOk, compare, coverage, makeBlanks, nudge, sentenceWith, verdictOf, type Verdict } from "@/study/explainCheck";

const VERDICT: Record<Verdict, { label: string; cls: string }> = {
  right: { label: "You've got it", cls: "bg-on-track/15 text-on-track-fg" },
  almost: { label: "Almost", cls: "bg-at-risk/15 text-at-risk-fg" },
  wrong: { label: "Not yet", cls: "bg-critical/15 text-critical-fg" },
};

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function ExplainDialog() {
  const s = useHighlights();
  const t = s.open;
  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && closeExplain()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl p-0">
        {t && <ExplainBody key={t.target} t={t} attempts={attemptsFor(s, t.target)} />}
      </DialogContent>
    </Dialog>
  );
}

function ExplainBody({ t, attempts }: { t: ExplainTarget; attempts: ExplainRecord[] }) {
  const [tab, setTab] = useState<"blanks" | "own">(t.keys.length ? "blanks" : "own");
  const lastOwn = attempts.find((a) => a.mode === "own");
  const lastBlanks = attempts.find((a) => a.mode === "blanks");
  const [course, chapter] = t.guideId.split("/");
  return (
    <div className="flex flex-col">
      <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6 text-left">
        <div className="text-2xs font-semibold uppercase tracking-wider text-brand-fg">Explain it</div>
        <DialogTitle className="font-display text-lg leading-snug">{t.title}</DialogTitle>
        <DialogDescription className="text-xs">
          {attempts.length ? `${attempts.length} attempt${attempts.length === 1 ? "" : "s"} so far. ` : "First try. "}
          <Link to={`/study/${course}/${chapter}?s=${t.sectionId}&at=${t.blockId}`} onClick={closeExplain} className="inline-flex items-center gap-0.5 font-medium text-brand-fg hover:underline">
            Open it in the chapter <ArrowRight className="h-3 w-3" />
          </Link>
        </DialogDescription>
        <div className="mt-3 flex gap-1 rounded-lg bg-fill-ghost p-0.5 text-xs">
          {(
            [
              ["blanks", "Fill the blanks"],
              ["own", "In my own words"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              disabled={k === "blanks" && !t.keys.length}
              onClick={() => setTab(k)}
              className={cn("flex-1 rounded-md px-3 py-1.5 font-medium disabled:opacity-40", tab === k ? "bg-card text-foreground shadow-card" : "text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      </DialogHeader>
      <div className="px-6 py-5">{tab === "blanks" ? <Blanks t={t} last={lastBlanks} /> : <Own t={t} last={lastOwn} />}</div>
    </div>
  );
}

/* ── Fill the blanks ────────────────────────────────────────────────────── */

function Blanks({ t, last }: { t: ExplainTarget; last?: ExplainRecord }) {
  const pieces = useMemo(() => makeBlanks(t.text, t.keys), [t]);
  const blanks = pieces.filter((p): p is { blank: number; answer: string } => "blank" in p);
  const [vals, setVals] = useState<string[]>(() => blanks.map(() => ""));
  const [checked, setChecked] = useState(false);
  const ok = blanks.map((b, i) => blankOk(vals[i] ?? "", b.answer));
  const score = blanks.length ? ok.filter(Boolean).length / blanks.length : 0;

  const check = async () => {
    setChecked(true);
    await recordAttempt({
      target: t.target,
      guideId: t.guideId,
      mode: "blanks",
      answer: vals.join(" | "),
      score,
      missed: JSON.stringify(blanks.filter((_, i) => !ok[i]).map((b) => b.answer)),
    }).catch(() => undefined);
  };

  if (!blanks.length) return <p className="text-sm text-muted-foreground">There are no key words to blank in this one. Try "In my own words".</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Type the missing words. Close spelling counts.</p>
      <p className="text-[15px] leading-[2.1]">
        {pieces.map((p, i) =>
          "text" in p ? (
            <span key={i}>{p.text}</span>
          ) : (
            <span key={i} className="inline-flex flex-col align-baseline">
              <input
                value={vals[p.blank] ?? ""}
                onChange={(e) => {
                  setChecked(false);
                  setVals((v) => v.map((x, j) => (j === p.blank ? e.target.value : x)));
                }}
                onKeyDown={(e) => e.key === "Enter" && void check()}
                aria-label={`Blank ${p.blank + 1}`}
                style={{ width: `${Math.max(5, p.answer.length + 2)}ch` }}
                className={cn(
                  "mx-0.5 rounded-md border bg-background px-1.5 py-0.5 font-mono text-sm outline-none focus:border-brand",
                  checked && (ok[p.blank] ? "border-on-track bg-on-track/10" : "border-critical bg-critical/10"),
                )}
              />
              {checked && !ok[p.blank] && <span className="px-1 font-mono text-2xs text-on-track-fg">{p.answer}</span>}
            </span>
          ),
        )}
      </p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => void check()} className="rounded-lg bg-brand-solid px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Check
        </button>
        {checked && (
          <span className={cn("chip", VERDICT[verdictOf(score, blanks.length)].cls)}>
            {ok.filter(Boolean).length} of {blanks.length} right
          </span>
        )}
      </div>
      {last && <LastLine last={last} total={blanks.length} />}
    </div>
  );
}

/* ── In my own words ────────────────────────────────────────────────────── */

function Own({ t, last }: { t: ExplainTarget; last?: ExplainRecord }) {
  const [answer, setAnswer] = useState("");
  // The attempt each new one is compared with: the last one before this
  // dialog opened, then each check in turn.
  const [prev, setPrev] = useState<ExplainRecord | undefined>(last);
  const [result, setResult] = useState<{ row: ExplainRecord; cov: ReturnType<typeof coverage>; against?: ExplainRecord } | null>(null);
  const [hint, setHint] = useState(false);
  const [ai, setAi] = useState<{ busy: boolean; fb?: AiFeedback; err?: string }>({ busy: false });
  const [hasKey, setHasKey] = useState<boolean | null>(ipc.IS_TAURI ? null : false);
  useEffect(() => {
    if (ipc.IS_TAURI) void ipc.explainAiStatus().then(setHasKey).catch(() => setHasKey(false));
  }, []);

  const check = async () => {
    if (!answer.trim()) return;
    const cov = coverage(answer, t.keys);
    setHint(false);
    setAi({ busy: false });
    const row = await recordAttempt({ target: t.target, guideId: t.guideId, mode: "own", answer, score: cov.score, missed: JSON.stringify(cov.missed) }).catch(() => null);
    const saved = row ?? ({ answer, score: cov.score, missed: JSON.stringify(cov.missed), at: new Date().toISOString() } as ExplainRecord);
    setResult({ row: saved, cov, against: prev });
    setPrev(saved);
  };

  const askClaude = async () => {
    if (!answer.trim()) return;
    setAi({ busy: true });
    try {
      const before = result?.against ?? prev;
      const fb = await ipc.explainAiGrade({ concept: t.title, reference: `${t.text}\n\n(Surrounding text: ${t.context})`, answer, previous: before && before.answer !== answer ? before.answer : null });
      setAi({ busy: false, fb });
      if (result?.row.id) await attachAi(result.row, JSON.stringify(fb)).catch(() => undefined);
    } catch (e) {
      setAi({ busy: false, err: (e as { message?: string })?.message ?? "Claude couldn't check this one." });
    }
  };

  const cov = result?.cov;
  const verdict = cov ? verdictOf(cov.score, t.keys.length) : null;
  const against = result?.against;
  const cmp = cov && against ? compare(parseKeys(against.missed), against.score, cov) : null;
  const hintText = cov?.missed[0] ? sentenceWith(t.text, cov.missed[0]) : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Explain it like you're telling a friend, without looking. {t.keys.length > 0 && <>The check looks for {t.keys.length} key idea{t.keys.length === 1 ? "" : "s"}; different words are fine.</>}
      </p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && void check()}
        rows={4}
        placeholder="In my own words…"
        className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] leading-relaxed outline-none focus:border-brand"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void check()} disabled={!answer.trim()} className="rounded-lg bg-brand-solid px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40">
          Check
        </button>
        {hasKey ? (
          <button type="button" onClick={() => void askClaude()} disabled={!answer.trim() || ai.busy} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-fill-ghost disabled:opacity-40">
            {ai.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-brand-fg" />} Ask Claude
          </button>
        ) : (
          hasKey === false && (
            <Link to="/settings" onClick={closeExplain} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              Add your Anthropic key in Settings to get Claude's check too
            </Link>
          )
        )}
        <span className="ml-auto text-2xs text-muted-foreground">⌘ Enter to check</span>
      </div>

      {cov && verdict && t.keys.length === 0 && (
        <p className="text-sm text-muted-foreground">Saved. This one has no key words for the built-in check to look for, so use Ask Claude for feedback, or compare it with the chapter yourself.</p>
      )}
      {cov && verdict && t.keys.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("chip", VERDICT[verdict].cls)}>{VERDICT[verdict].label}</span>
            <span data-numeric className="font-mono text-2xs text-muted-foreground">
              {cov.covered.length}/{t.keys.length} key ideas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cov.covered.map((k) => (
              <span key={k} className="chip bg-on-track/12 text-on-track-fg">
                <Check className="h-3 w-3" /> {k}
              </span>
            ))}
            {cov.missed.map((k) => (
              <span key={k} className="chip bg-at-risk/12 text-at-risk-fg">
                <CircleAlert className="h-3 w-3" /> {k}
              </span>
            ))}
          </div>
          <p className="flex gap-2 text-sm leading-relaxed">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-at-risk-fg" /> {nudge(cov)}
          </p>
          {hintText && (
            <div>
              {hint ? (
                <p className="rounded-lg bg-fill-ghost px-3 py-2 text-sm leading-relaxed">{hintText}</p>
              ) : (
                <button type="button" onClick={() => setHint(true)} className="text-xs font-medium text-brand-fg hover:underline">
                  Show me the sentence it comes from
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {ai.err && <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical-fg">{ai.err}</p>}
      {ai.fb && <AiCard fb={ai.fb} />}

      {cmp && against && (
        <section className="flex flex-col gap-2 rounded-xl border border-dashed border-border px-4 py-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Compared with last time ({when(against.at)})
          </div>
          <p className="text-sm">
            {cmp.delta > 0.001 ? "Better than last time." : cmp.delta < -0.001 ? "A step back from last time." : "Same coverage as last time."}{" "}
            {cmp.gained.length > 0 && <>You now get <b>{cmp.gained.join(", ")}</b>. </>}
            {cmp.stuck.length > 0 && <>Missed both times: <b>{cmp.stuck.join(", ")}</b>, that's the real gap. </>}
            {cmp.slipped.length > 0 && <>You had <b>{cmp.slipped.join(", ")}</b> last time but not now. </>}
          </p>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer text-xs">What you wrote last time</summary>
            <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-fill-ghost px-3 py-2">{against.answer}</p>
          </details>
        </section>
      )}
      {!cov && last && <LastLine last={last} total={t.keys.length} />}
    </div>
  );
}

function LastLine({ last, total }: { last: ExplainRecord; total: number }) {
  const missed = parseKeys(last.missed);
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Last time ({when(last.at)}): {total ? `${Math.round(last.score * total)}/${total}` : `${Math.round(last.score * 100)}%`}
        {missed.length > 0 && <> · missed {missed.join(", ")}</>}
      </span>
    </p>
  );
}

function AiCard({ fb }: { fb: AiFeedback }) {
  const v = VERDICT[fb.verdict] ?? VERDICT.almost;
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-brand/40 bg-brand/[0.05] px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-brand-fg" />
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">Claude's check</span>
        <span className={cn("chip ml-auto", v.cls)}>{v.label}</span>
      </div>
      {fb.nudge && <p className="text-sm font-medium leading-relaxed">{fb.nudge}</p>}
      <div className="flex flex-wrap gap-1.5">
        {fb.got.map((g) => (
          <span key={g} className="chip bg-on-track/12 text-on-track-fg">
            <Check className="h-3 w-3" /> {g}
          </span>
        ))}
        {fb.missing.map((g) => (
          <span key={g} className="chip bg-at-risk/12 text-at-risk-fg">
            <CircleAlert className="h-3 w-3" /> {g}
          </span>
        ))}
        {fb.wrong.map((g) => (
          <span key={g} className="chip bg-critical/12 text-critical-fg">
            <X className="h-3 w-3" /> {g}
          </span>
        ))}
      </div>
      {fb.compare && <p className="text-xs text-muted-foreground">{fb.compare}</p>}
    </section>
  );
}
