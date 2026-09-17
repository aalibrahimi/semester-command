/**
 * Blocks — the inline markup renderer every Study view shares.
 *
 * Called by: GuideBlocks, Practice, StudyRead / Recall / CheatSheet / Map.
 * Calls: nothing.
 *
 * `**bold**`, `*italic*` and `` `code` `` inside strings; nothing else is
 * interpreted, so guide text stays close to what the author typed.
 */
/** `**bold**`, `*italic*` and `` `code` `` inside strings. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : p.startsWith("`") && p.endsWith("`") ? (
          <code key={i} className="rounded-sm bg-fill-ghost px-1 py-px font-mono text-[0.9em] text-foreground">
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
