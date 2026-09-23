/**
 * useToastStack: the list of notification cards on screen, newest first,
 * one per inbox id. Low-urgency items never become cards.
 *
 * Called by: AppShell (in-app cards), toast/ToastApp (the corner window).
 */
import { useCallback, useState } from "react";
import type { InboxItem } from "@/types";

export function useToastStack() {
  const [toasts, setToasts] = useState<InboxItem[]>([]);
  const push = useCallback((items: InboxItem[]) => {
    if (items.length === 0) return;
    setToasts((prev) => {
      const seen = new Set(prev.map((t) => t.id));
      const fresh = items.filter((i) => !seen.has(i.id) && i.urgency !== "low");
      return [...fresh.reverse(), ...prev];
    });
  }, []);
  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const clear = useCallback(() => setToasts([]), []);
  return { toasts, push, dismiss, clear };
}

