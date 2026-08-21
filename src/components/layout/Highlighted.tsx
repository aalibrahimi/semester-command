/**
 * Highlighted — plain text with `<mark>`s over matched terms.
 *
 * Called by: Syllabi (policy chips and search).
 * Calls: lib/canvasHtml for the regex escaping.
 *
 * Renders React nodes, never innerHTML, so there is no injection surface.
 * The first match gets `id="first-match"` so callers can scroll to it.
 */
import React from "react";
import { escapeRe } from "@/lib/canvasHtml";

export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const cleaned = terms.map((t) => t.trim()).filter((t) => t.length >= 2);
  if (cleaned.length === 0) {
    return <>{text}</>;
  }
  const re = new RegExp(`(${cleaned.map(escapeRe).join("|")})`, "gi");
  // split() with a capturing group interleaves: odd indices are matches.
  const parts = text.split(re);
  const firstMatch = parts.findIndex((_, i) => i % 2 === 1);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            id={i === firstMatch ? "first-match" : undefined}
            className="rounded-sm bg-at-risk/30 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
