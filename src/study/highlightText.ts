/**
 * highlightText.ts: DOM and text helpers for highlights.
 *
 * Called by: components/study/HighlightLayer.
 */
import type { GuideBlock } from "./guide";

/** The markdown-ish source text of a block: where bold key terms live. */
export function blockSource(b: GuideBlock): string {
  switch (b.type) {
    case "prose":
      return b.md;
    case "definition":
      return `**${b.term}** ${b.body}`;
    case "example":
      return `${b.title}\n${b.body}`;
    case "trap":
      return b.body;
    case "table":
      return [b.title ?? "", b.columns.join(" "), ...b.rows.map((r) => r.join(" "))].join("\n");
    case "check":
      return `${b.prompt}\n${b.answer}`;
    default:
      return "caption" in b && typeof b.caption === "string" ? b.caption : "";
  }
}

/** Find `text` inside `root`'s text nodes, ignoring whitespace differences. */
export function findRange(root: Node, text: string): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const map: { node: Text; offset: number }[] = [];
  let flat = "";
  let lastSpace = true;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const s = n.data;
    for (let i = 0; i < s.length; i++) {
      const sp = /\s/.test(s[i]);
      if (sp && lastSpace) continue;
      flat += sp ? " " : s[i];
      map.push({ node: n, offset: i });
      lastSpace = sp;
    }
  }
  const want = text.replace(/\s+/g, " ").trim();
  const at = flat.indexOf(want);
  if (at < 0 || !want) return null;
  const a = map[at];
  const b = map[at + want.length - 1];
  const r = document.createRange();
  r.setStart(a.node, a.offset);
  r.setEnd(b.node, b.offset + 1);
  return r;
}

