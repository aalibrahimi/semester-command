/**
 * briefing — the app's speaking voice.
 *
 * Called by: components/triage/Briefing.tsx.
 *
 * Turns Rust-computed facts into casual first-person sentences ("First up:
 * Lab #1 — it's 75% of LING-124 and due tomorrow night"). Strictly view
 * layer: nothing here computes a grade, a rank, or a deadline — it only
 * phrases numbers that arrived phrased as numbers (§10). Templates branch
 * on real conditions rather than decorating, so the voice never claims
 * detail the data doesn't have.
 */
import type { TriageRow } from "@/types";

/** "Ali Alibrahimi" → "Ali". Null in, null out — greet namelessly. */
export function firstNameOf(full: string | null): string | null {
  const first = full?.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : null;
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function clockOf(d: Date): string {
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(d.getMinutes()).padStart(2, "0")}${h >= 12 ? "p" : "a"}`;
}

function dayDiff(d: Date, now: Date): number {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** "due tonight at 11:59p" / "was due Monday — it's past due". Reads like a
 *  person, stays exactly as precise as the timestamp. */
export function casualDue(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "there's no deadline on this one";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "the due date didn't parse";
  const days = dayDiff(d, now);
  const clock = clockOf(d);
  if (d.getTime() < now.getTime()) {
    if (days === 0) return `it was due earlier today (${clock}) — it's past due`;
    if (days === -1) return "it was due yesterday — it's past due";
    return `it was due ${d.toLocaleDateString(undefined, { weekday: "long" })} — it's past due`;
  }
  if (days === 0) return d.getHours() >= 17 ? `it's due tonight at ${clock}` : `it's due today at ${clock}`;
  if (days === 1) {
    const part = d.getHours() >= 20 ? "tomorrow night" : d.getHours() < 12 ? "tomorrow morning" : "tomorrow";
    return `it's due ${part} at ${clock}`;
  }
  if (days < 7) return `it's due ${d.toLocaleDateString(undefined, { weekday: "long" })} at ${clock}`;
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const weeks = Math.round(days / 7);
  return `it's not due until ${date} — about ${weeks} week${weeks === 1 ? "" : "s"} out`;
}

/** How big a deal this is, in words a person would use. */
export function impactPhrase(pct: number): string {
  const n = pct.toFixed(1).replace(/\.0$/, "");
  if (pct >= 40) return `a massive ${n}% of the course — the biggest single lever you've got`;
  if (pct >= 20) return `a big chunk of the grade (${n}%)`;
  if (pct >= 8) return `a solid ${n}% of the grade`;
  if (pct > 0.5) return `a small slice of the grade (${n}%)`;
  return "not counting toward the grade, but it's on the list";
}

/** Canvas submission_types → "a file upload". Unknown types stay silent
 *  rather than guessed. */
export function submissionPhrase(typesJson: string | null): string | null {
  if (!typesJson) return null;
  let types: string[];
  try {
    const parsed: unknown = JSON.parse(typesJson);
    if (!Array.isArray(parsed)) return null;
    types = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    return null;
  }
  const MAP: Record<string, string> = {
    online_upload: "a file upload",
    discussion_topic: "a discussion post",
    online_quiz: "a quiz",
    online_text_entry: "a typed-in submission",
    external_tool: "submitted through an external tool",
    media_recording: "a media recording",
    on_paper: "turned in on paper",
  };
  const first = types.find((t) => MAP[t]);
  return first ? MAP[first] : null;
}

/** One casual clause for a non-hero queue item — why it's on the list. */
export function queueReason(row: TriageRow, now: Date = new Date()): string {
  const parts: string[] = [];
  if (row.state === "missing") {
    parts.push("Canvas has it flagged missing — deal with it before it snowballs");
  } else if (row.dueAt && new Date(row.dueAt).getTime() < now.getTime()) {
    parts.push(`${casualDue(row.dueAt, now)}; sooner beats later`);
  } else {
    parts.push(casualDue(row.dueAt, now));
  }
  if (row.pointsPossible !== null && row.pointsPossible > 0) {
    const pts = Number.isInteger(row.pointsPossible)
      ? String(row.pointsPossible)
      : row.pointsPossible.toFixed(1);
    parts.push(
      row.impactPct > 0.5
        ? `${pts} points, ${impactPhrase(row.impactPct)}`
        : `${pts} points`,
    );
  } else if (row.impactPct > 0.5) {
    parts.push(impactPhrase(row.impactPct));
  }
  if (row.estMinutes !== null && row.estMinutes <= 30) {
    parts.push("should be quick");
  }
  const sentence = parts.join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}
