/**
 * canvasHtml — shared handling of instructor-authored content.
 *
 * Called by: AssignmentSheet (descriptions), Syllabi (syllabus page HTML and
 * extracted document text), components/Highlighted.
 * Calls: DOMParser.
 *
 * `sanitize` strips active content from Canvas HTML before it is rendered.
 * The webview CSP is the real security boundary (no remote requests, no
 * inline script execution); this keeps the DOM clean of inert leftovers.
 */

export function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const el of doc.querySelectorAll("script, iframe, object, embed, form")) {
    el.remove();
  }
  for (const el of doc.querySelectorAll("*")) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on") || (attr.name === "href" && attr.value.startsWith("javascript:"))) {
        el.removeAttribute(attr.name);
      }
    }
  }
  return doc.body.innerHTML;
}

/** Escape a string for use inside a RegExp. */
export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** How many times any term appears in the text. Case-insensitive. */
export function countMatches(text: string, terms: string[]): number {
  const cleaned = terms.map((t) => t.trim()).filter((t) => t.length >= 2);
  if (cleaned.length === 0) return 0;
  const re = new RegExp(cleaned.map(escapeRe).join("|"), "gi");
  return (text.match(re) ?? []).length;
}
