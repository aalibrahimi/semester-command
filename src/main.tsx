/**
 * main.tsx — the entry point. Mounts React and nothing else.
 *
 * Called by: index.html.
 * Calls: App, globals.css.
 *
 * `globals.css` is imported here and only here. Importing it from a component
 * would make token availability depend on render order, which is exactly the
 * kind of bug that shows up as an unstyled first frame.
 *
 * NOTE: no <StrictMode>. It double-invokes effects in development, which turns
 * every `invoke()` on mount into two IPC calls and makes the Rust-side logs
 * unreadable while debugging sync. The trade is real — we lose the extra
 * warnings — and it is documented in docs/DEVELOPMENT.md.
 */
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "@/App";
import { ToastApp } from "@/toast/ToastApp";
import { IS_TAURI } from "@/lib/ipc";
import "@/styles/globals.css";

/** The corner pop-up window (inbox.rs) loads this same bundle; its label
 *  decides which app it renders. `?toast-demo` shows it in a browser. */
const isToastWindow = IS_TAURI
  ? getCurrentWindow().label === "toast"
  : new URLSearchParams(window.location.search).has("toast-demo");

const container = document.getElementById("root");
if (!container) {
  throw new Error("index.html is missing #root — the app cannot mount");
}

createRoot(container).render(isToastWindow ? <ToastApp /> : <App />);
