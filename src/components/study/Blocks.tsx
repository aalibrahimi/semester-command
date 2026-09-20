/**
 * Blocks — the inline markup renderer every Study view shares.
 *
 * Called by: GuideBlocks, Practice, StudyRead / Recall / CheatSheet / Map.
 * Calls: nothing.
 *
 * `**bold**`, `*italic*`, `` `code` ``, and three colored highlights:
 * `==key idea==` (brand), `!!warning!!` (critical), `##win##` (on-track).
 * Nothing else is interpreted, so guide text stays close to what the
 * author typed. The highlights exist because a wall of uniform text hides
 * its own load-bearing sentence — color is for the one phrase per
 * paragraph the reader must not skim past, not for decoration.
 */
export function Inline({ text }: { text: string }) {
  const parts = text
    .split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|==[^=]+==|!![^!]+!!|##[^#]+##)/g)
    .filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith("==") && p.endsWith("==") ? (
          <mark key={i} className="rounded-sm bg-brand/15 px-1 py-px font-medium text-brand-fg">
            {p.slice(2, -2)}
          </mark>
        ) : p.startsWith("!!") && p.endsWith("!!") ? (
          <mark key={i} className="rounded-sm bg-critical/15 px-1 py-px font-medium text-critical-fg">
            {p.slice(2, -2)}
          </mark>
        ) : p.startsWith("##") && p.endsWith("##") ? (
          <mark key={i} className="rounded-sm bg-on-track/15 px-1 py-px font-medium text-on-track-fg">
            {p.slice(2, -2)}
          </mark>
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
