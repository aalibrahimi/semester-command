/**
 * flags — the few runtime switches the app honours, read from localStorage.
 *
 * Called by: routes that keep an old and a new implementation side by side
 * while the new one is being accepted.
 * Calls: localStorage (best-effort).
 *
 * Set from the devtools console: `localStorage.setItem("sc.flags.legacyStudy", "1")`.
 * Delete the flag and the code path it guards once the new view is accepted.
 */
function flag(key: string): boolean {
  try {
    return localStorage.getItem(`sc.flags.${key}`) === "1";
  } catch {
    return false;
  }
}

/** Phase 1 guard: render the pre-Phase-1 long-scroll chapter view instead of the Read view. */
export const legacyStudyViewer = (): boolean => flag("legacyStudy");
