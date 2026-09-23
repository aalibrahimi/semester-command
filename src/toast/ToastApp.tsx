/**
 * ToastApp: the page inside the corner pop-up window (label "toast").
 *
 * Called by: main.tsx, instead of <App />, when this webview is the toast
 * window (or in a browser with ?toast-demo, for design work).
 * Calls: lib/ipc (toast_take, toast_resize, inbox_open), NotificationCard.
 *
 * The window is created by inbox.rs the first time something needs to pop
 * up, and is transparent: only the cards are visible. After every change
 * this page reports its content height so Rust can size the window to
 * exactly the cards (a bigger transparent window would block clicks on
 * whatever is underneath) and pin it to the top-right corner. No cards
 * left: height 0, and Rust hides the window.
 */
import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { ThemeProvider } from "@/hooks/useTheme";
import { ToastStack } from "@/components/inbox/NotificationCard";
import { useToastStack } from "@/lib/toastStack";
import { IS_TAURI, inboxOpen, toastResize, toastTake } from "@/lib/ipc";
import type { InboxItem } from "@/types";

function demoItems(): InboxItem[] {
  const now = new Date().toISOString();
  return [
    { id: 2, kind: "grade", title: "Grade posted: Assignment 3 - Using the JFLAP", body: "CS 154 · 1.5 / 1.5 (100%)", route: "/", urgency: "normal", createdAt: now, readAt: null },
    { id: 1, kind: "deadline", title: "Project 1 · SortingHub: due in 3h", body: "CS 146 · worth 10.0% of your final grade", route: "/", urgency: "high", createdAt: now, readAt: null },
  ];
}

export function ToastApp() {
  const { toasts, push, dismiss, clear } = useToastStack();
  const box = useRef<HTMLDivElement>(null);

  // Only the cards should be visible: clear the page background.
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.documentElement.classList.add("toast-window");
  }, []);

  // Pull whatever is queued now, and again on every wake-up from Rust.
  useEffect(() => {
    if (!IS_TAURI) {
      push(demoItems());
      return;
    }
    const pull = () => void toastTake().then(push).catch(() => {});
    pull();
    const un = listen("toast:wake", pull);
    return () => void un.then((f) => f());
  }, [push]);

  // Size the window to the cards.
  useEffect(() => {
    if (!IS_TAURI) return;
    const el = box.current;
    if (toasts.length === 0 || !el) {
      void toastResize(0);
      return;
    }
    const report = () => void toastResize(Math.ceil(el.getBoundingClientRect().height));
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [toasts.length]);

  const open = (item: InboxItem) => {
    dismiss(item.id);
    void inboxOpen(item.id).catch(() => {});
  };

  return (
    <ThemeProvider>
      <div ref={box} className="p-3 pl-4">
        <ToastStack toasts={toasts} onOpen={open} onDismiss={dismiss} onDismissAll={clear} />
      </div>
    </ThemeProvider>
  );
}
