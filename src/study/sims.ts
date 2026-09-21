/**
 * sims.ts — the names a `sim` block may use. The components live in
 * components/study/sims/ (React, browser-only); this list is plain data so
 * scripts/check-guides.ts can validate guide JSON without loading React.
 */
export const SIM_NAMES = ["dfa", "sampling", "fourier", "sort", "regex", "tree"] as const;
export type SimName = (typeof SIM_NAMES)[number];
