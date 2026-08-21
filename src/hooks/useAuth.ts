/**
 * useAuth — live Canvas auth status plus the actions that change it.
 *
 * Called by: Settings (the auth card), and later the reconnect banner and the
 * M1 debug screen.
 * Calls: lib/ipc.ts auth wrappers; listens on the "auth:status-changed" event.
 *
 * Unlike useSync this subscribes rather than polls: auth transitions are
 * driven by a Rust-side poller (the login window watcher) that already emits
 * an event at every step, so an interval would only add latency to state the
 * backend is pushing anyway. The one fetch on mount covers first render.
 */
import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  clearSession,
  getAuthStatus,
  IS_TAURI,
  openCanvasLogin,
  setAccessToken,
} from "@/lib/ipc";
import type { AuthStatus } from "@/types";

const DISCONNECTED: AuthStatus = {
  tier: "none",
  alive: false,
  validatedAs: null,
  storage: null,
  message: null,
};

/** Event name — keep in sync with AUTH_EVENT in commands/auth.rs. */
const AUTH_EVENT = "auth:status-changed";

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(DISCONNECTED);
  /** True between "sign in clicked" and the poller's terminal event, so the
   *  button can show what is happening in the other window. */
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // First render reads current state; everything after arrives by event.
    // oxlint-disable-next-line set-state-in-effect
    void getAuthStatus().then(setStatus).catch(() => {});

    if (!IS_TAURI) return;
    const unlisten = listen<AuthStatus>(AUTH_EVENT, (e) => {
      setStatus(e.payload);
      // The poller's "Waiting…" progress message is the exact busy window:
      // any other event — connected, timed out, window closed — ends it.
      setBusy(e.payload.message?.startsWith("Waiting") ?? false);
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    try {
      await openCanvasLogin();
    } catch (e) {
      setBusy(false);
      throw e;
    }
  }, []);

  const saveToken = useCallback(async (token: string) => {
    await setAccessToken(token);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
  }, []);

  return {
    status,
    busy,
    signIn,
    saveToken,
    signOut,
    isConnected: status.tier !== "none" && status.alive,
  };
}
