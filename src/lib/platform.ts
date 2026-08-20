/**
 * platform.ts — the one place that knows which OS we are on.
 *
 * Called by: keyboard-shortcut registration and any label that prints a
 * shortcut (Sidebar, CommandPalette, tooltips).
 * Calls: navigator only.
 *
 * SPEC.md §5 writes shortcuts as ⌘\ and ⌘1–⌘4, which is right on macOS and
 * wrong everywhere else — Windows and Linux users expect Ctrl, and ⌘ printed on
 * a Windows tooltip reads as a rendering bug. The app targets all three from
 * day one, so the modifier is resolved here and every call site asks rather
 * than hardcoding.
 *
 * NOTE: this is synchronous on purpose. tauri-plugin-os exposes `platform()`
 * but it is async, and a shortcut label that arrives one frame after the menu
 * paints is a visible flicker. The user-agent string is reliable enough for the
 * only question we ask of it, and it works under `vite dev` in a browser too.
 */

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

/** True on macOS. Everything else — Windows, Linux — is the Ctrl world. */
export const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(ua);

/** The symbol to print in a shortcut label: "⌘" or "Ctrl". */
export const MOD_LABEL = IS_MAC ? "⌘" : "Ctrl";

/** Joiner so labels read "⌘K" on macOS and "Ctrl+K" elsewhere. */
export const MOD_JOIN = IS_MAC ? "" : "+";

/**
 * Render a shortcut for display.
 *
 * @example shortcut("K") → "⌘K" on macOS, "Ctrl+K" on Windows/Linux
 */
export function shortcut(key: string): string {
  return `${MOD_LABEL}${MOD_JOIN}${key}`;
}

/**
 * True when the platform's primary modifier is held.
 *
 * Checking `metaKey || ctrlKey` unconditionally would make Ctrl+1 fire on macOS
 * too, where Ctrl+number is a Spaces switcher — the app would appear to
 * intercept a system shortcut. So each platform tests exactly its own modifier.
 */
export function hasMod(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return IS_MAC ? e.metaKey : e.ctrlKey;
}
