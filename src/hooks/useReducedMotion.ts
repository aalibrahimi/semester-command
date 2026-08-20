/**
 * useReducedMotion — the single motion guard for the whole app (SPEC.md §9.4).
 *
 * Called by: every component that animates. There is deliberately one hook
 * rather than a `prefers-reduced-motion` check scattered per component, because
 * scattered checks are the ones that get forgotten on the next new component.
 * Calls: window.matchMedia.
 *
 * The CSS side of this lives in globals.css. The two are complementary: the
 * media query kills CSS transitions, this hook lets JS-driven animation
 * (`motion` springs, layout reordering, count-up numbers) opt out before it
 * starts, which the media query cannot do.
 *
 * NOTE: `motion` ships its own `useReducedMotion`. We wrap our own so that a
 * future "reduce motion" switch in Settings can force it on regardless of the
 * OS setting, without touching a single call site.
 */
import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Spring config for the Grade Gap bar and any other width/position change
 * (§9.3, §9.4). Exported from here rather than inlined so that every animated
 * surface in the app moves with the same physics — a bar that springs
 * differently from the sidebar reads as two different apps.
 *
 * Pass `reduced` from `useReducedMotion()`; when true this collapses to an
 * instant transition rather than a fast one, because "fast" still moves.
 */
export function springy(reduced: boolean) {
  return reduced
    ? ({ duration: 0 } as const)
    : ({ type: "spring", stiffness: 260, damping: 30 } as const);
}
