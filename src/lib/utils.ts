/**
 * utils.ts — the one shared helper every component is allowed to reach for.
 *
 * Called by: essentially every component, and by the shadcn/ui primitives in
 * `src/components/ui/` (the CLI generates imports of `cn` from here — the path
 * is configured in components.json).
 * Calls: clsx, tailwind-merge.
 *
 * Resist growing this file. Formatting helpers belong in `lib/format.ts`;
 * anything that calls the backend belongs in `lib/ipc.ts`.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose class names, with later Tailwind utilities beating earlier ones.
 *
 * Plain `clsx` would leave `px-2 px-4` in the output and let CSS source order
 * decide the winner, which makes a component's `className` prop unreliable as
 * an override. `twMerge` resolves the conflict in favour of the last one, so
 * `<Button className="px-4" />` does what the caller expects.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
