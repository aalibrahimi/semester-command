/**
 * CodeHighlight — IDE-style syntax coloring for guide code, zero deps.
 *
 * Called by: GuideBlocks (example blocks), Practice (exercise code),
 * StudyCheatSheet (example tiles).
 * Calls: nothing.
 *
 * A ~40-line tokenizer instead of a highlighter library, on purpose: the
 * guides hold Java and small pseudo-code, the app ships no CDN assets, and
 * library themes fight the design tokens. Colors come from the same theme
 * vocabulary as everything else (plus two literal hues for types and
 * functions, the same precedent as lib/courseColor), so code reads in both
 * light and dark.
 *
 * Example blocks also hold worked MATH and prose walkthroughs — coloring
 * "Scenario 1: cars leave…" like Java is noise. `looksLikeCode` gates on
 * code punctuation, so non-code bodies render exactly as before.
 */
import type { ReactNode } from "react";

/** One combined regex; alternation order = precedence. */
const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b(?:public|private|protected|static|final|void|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|default|break|continue|throw|throws|try|catch|finally|this|super|null|true|false|int|long|double|float|boolean|char|byte|short|import|package|const|let|var|function|def|elif|lambda|in|and|or|not|assert)\b)|(\b\d[\d_]*(?:\.\d+)?\b)|(\b[A-Z][A-Za-z0-9_]*\b)|([a-z_][A-Za-z0-9_]*(?=\s*\())/g;

const CLS: Record<number, string | undefined> = {
  1: "italic text-muted-foreground", // comment
  2: "text-on-track-fg", //             string
  3: "font-medium text-brand-fg", //    keyword
  4: "text-at-risk-fg", //              number
};
/** Literal hues (theme-safe, both modes) for the two classes the token
 *  palette doesn't cover: types and function calls. */
const TYPE_STYLE = { color: "hsl(258 60% 62%)" }; //  violet — Type names
const FN_STYLE = { color: "hsl(172 55% 46%)" }; //    teal — call sites

/** Does this body deserve syntax coloring, or is it worked math / prose? */
export function looksLikeCode(text: string): boolean {
  // Braces, // comments, arrows, or a line that STARTS like a statement.
  // A semicolon alone is not enough: worked prose uses them too.
  if (/\{\s*$|^\s*\}|\/\/|=>|;\s*$/m.test(text)) return true;
  return /^\s*(for\b|if\b|while\b|return\b|def\b|public\b|private\b|int\b|else\b|swap\b|[a-z]\w*\(.*\):\s*$)/m.test(text);
}

/** The body of a code block, tokenized into colored spans. */
export function CodeHighlight({ text }: { text: string }) {
  if (!looksLikeCode(text)) return <>{text}</>;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const group = m.slice(1).findIndex((g) => g !== undefined) + 1;
    if (CLS[group]) {
      out.push(
        <span key={key++} className={CLS[group]}>
          {m[0]}
        </span>,
      );
    } else if (group === 5) {
      out.push(
        <span key={key++} style={TYPE_STYLE}>
          {m[0]}
        </span>,
      );
    } else if (group === 6) {
      out.push(
        <span key={key++} style={FN_STYLE}>
          {m[0]}
        </span>,
      );
    } else {
      out.push(m[0]);
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
