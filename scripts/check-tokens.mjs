/**
 * check-tokens.mjs — guards the design token layer (SPEC.md §9.1, §9.6).
 *
 * Called by: `npm run check:tokens`, and by `npm run verify`.
 * Calls: nothing but the filesystem.
 *
 * Two things it asserts, both of which are easy to break by hand and invisible
 * in review:
 *
 * 1. **Hex comments match their channels.** Tokens are stored as sRGB channels
 *    so Tailwind's opacity modifiers work, with the §9.1 hex preserved in a
 *    comment for humans. Nothing but this script stops those two from drifting,
 *    and a stale comment is worse than no comment.
 *
 * 2. **Contrast floors hold in BOTH themes.** §9.6 asks for 4.5:1 on every
 *    signal colour and specifically warns that amber fails in light mode — it
 *    does, which is why the palette has two tiers. Fills are checked at 3:1
 *    (WCAG 1.4.11, graphical objects); `-fg` variants at 4.5:1 (1.4.3, text).
 *
 * Exits non-zero on any failure, with the offending token and the measured
 * number. A ratio is a fact; "looks fine to me" is not.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(here, "../src/styles/globals.css");

const AA_TEXT = 4.5; // WCAG 2.2 §1.4.3
const AA_GRAPHIC = 3.0; // WCAG 2.2 §1.4.11

/* ── Parse ──────────────────────────────────────────────────────────────── */

/**
 * Matches a token line, which has the shape:
 *
 *     --at-risk: 232 163 61;   [comment] #E8A33D  fill [end comment]
 *
 * Capture groups: 1 = token name, 2 = channels, 3 = the hex from the comment.
 */
const TOKEN_RE = /^\s*--([\w-]+):\s*([\d\s]+);\s*\/\*\s*(#[0-9A-Fa-f]{6})/;

/** Marks the start of the light-theme block. */
const LIGHT_BLOCK_RE = /^\s*\.light\s*\{/;

const css = readFileSync(CSS_PATH, "utf8");

/** @type {{dark: Record<string, number[]>, light: Record<string, number[]>}} */
const themes = { dark: {}, light: {} };
let inLight = false;
let lineNo = 0;
const mismatches = [];

for (const line of css.split("\n")) {
  lineNo += 1;
  if (LIGHT_BLOCK_RE.test(line)) inLight = true;

  const m = TOKEN_RE.exec(line);
  if (!m) continue;

  const [, name, channelsRaw, hex] = m;
  const channels = channelsRaw.trim().split(/\s+/).map(Number);

  if (channels.length !== 3 || channels.some((c) => !Number.isInteger(c) || c < 0 || c > 255)) {
    mismatches.push(`${CSS_PATH}:${lineNo}  --${name}: "${channelsRaw.trim()}" is not three 0–255 channels`);
    continue;
  }

  const fromHex = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (fromHex.some((c, i) => c !== channels[i])) {
    mismatches.push(
      `${CSS_PATH}:${lineNo}  --${name}: channels ${channels.join(" ")} ≠ comment ${hex} (${fromHex.join(" ")})`,
    );
  }

  themes[inLight ? "light" : "dark"][name] = channels;
}

/* The light block only overrides layer-1 primitives; anything it does not
   redefine is inherited from :root. Fill those in so contrast can be measured
   against a complete palette rather than a sparse one. */
for (const [name, value] of Object.entries(themes.dark)) {
  if (!(name in themes.light)) themes.light[name] = value;
}

/* ── Contrast ───────────────────────────────────────────────────────────── */

const srgb = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const SIGNALS = ["on-track", "at-risk", "critical", "locked"];
const failures = [];
const report = [];

for (const theme of ["dark", "light"]) {
  const t = themes[theme];
  const check = (label, fg, bg, min) => {
    if (!t[fg] || !t[bg]) {
      failures.push(`[${theme}] ${label}: token --${!t[fg] ? fg : bg} is not defined`);
      return;
    }
    const ratio = contrast(t[fg], t[bg]);
    const ok = ratio >= min;
    report.push(
      `  ${ok ? "✓" : "✕"} [${theme.padEnd(5)}] ${label.padEnd(34)} ${ratio.toFixed(2)}:1  (min ${min})`,
    );
    if (!ok) failures.push(`[${theme}] ${label} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
  };

  for (const s of SIGNALS) {
    // The vivid fill is a graphical object: bars, status dots, areas.
    check(`${s} fill on bg`, s, "bg", AA_GRAPHIC);
    // The -fg variant is what text uses, on both surfaces it can sit on.
    check(`${s}-fg text on bg`, `${s}-fg`, "bg", AA_TEXT);
    check(`${s}-fg text on surface`, `${s}-fg`, "surface", AA_TEXT);
  }

  // The accent is interactive affordance only. As a focus ring it is a
  // non-text indicator; as link text it needs the -fg variant.
  check("accent ring on bg", "accent", "bg", AA_GRAPHIC);
  check("accent-fg text on bg", "accent-fg", "bg", AA_TEXT);

  // A primary button is periwinkle with a white label. This is the check that
  // forced --accent-solid to exist: white on #7C6BFF is only 3.89:1.
  check("white label on accent-solid", "primary-foreground", "accent-solid", AA_TEXT);

  check("text on bg", "text", "bg", AA_TEXT);
  check("text on surface", "text", "surface", AA_TEXT);
  check("text-muted on bg", "text-muted", "bg", AA_TEXT);
  check("text-muted on surface", "text-muted", "surface", AA_TEXT);
}

/* ── Report ─────────────────────────────────────────────────────────────── */

console.log("\nDesign token check — src/styles/globals.css\n");
console.log(report.join("\n"));

if (mismatches.length) {
  console.error("\nHex comments out of sync with their channels:\n");
  for (const m of mismatches) console.error(`  ${m}`);
}

if (failures.length) {
  console.error("\nContrast failures:\n");
  for (const f of failures) console.error(`  ${f}`);
}

if (mismatches.length || failures.length) {
  console.error(
    `\n${mismatches.length + failures.length} problem(s). ` +
      `Fix the token, not the threshold — §9.6 treats both themes as first-class.\n`,
  );
  process.exit(1);
}

console.log(`\nAll ${report.length} checks passed in both themes.\n`);
