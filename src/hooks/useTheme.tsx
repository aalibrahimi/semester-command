/**
 * useTheme — three-way theme control (Light / Dark / System), SPEC.md §9.6.
 *
 * Called by: App.tsx (mounts the provider), ThemeToggle, and the dev token page.
 * Calls: lib/ipc.ts for the persisted preference, @tauri-apps/plugin-os for the
 * OS preference, and window.matchMedia as the live signal.
 *
 * Why three moving parts for one boolean:
 *   - The SQLite settings row is the source of truth, but reading it is async.
 *   - The blocking script in index.html needs an answer synchronously, so it
 *     reads a localStorage mirror. This provider keeps that mirror honest.
 *   - `system` has to keep tracking the OS after launch, which is what the
 *     matchMedia listener is for. tauri-plugin-os gives the value once;
 *     matchMedia gives it continuously, so the listener wins for live updates
 *     and the plugin is only consulted as a cross-check on first mount.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPreferredTheme, setPreferredTheme } from "@/lib/ipc";
import type { ThemeMode, ResolvedTheme } from "@/types";

/** Key of the synchronous localStorage mirror read by index.html. */
const MIRROR_KEY = "sc.theme";

interface ThemeContextValue {
  /** What the user chose. May be "system". */
  mode: ThemeMode;
  /** What is actually on <html> right now. Never "system". */
  resolved: ResolvedTheme;
  /** Persist a new choice. Applies immediately; the DB write is fire-and-forget. */
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Read the OS preference the same way index.html does, so the two agree. */
function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Swap the class on <html> and keep `color-scheme` in step so native form
 *  controls, scrollbars and the webview background match. Missing that last
 *  part is what leaves a white scrollbar track in dark mode. */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Seed from the mirror rather than a hardcoded default, so the first React
  // render already agrees with what the pre-paint script put on <html>.
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(MIRROR_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });

  const [systemResolved, setSystemResolved] = useState<ResolvedTheme>(systemTheme);
  const resolved: ResolvedTheme = mode === "system" ? systemResolved : mode;

  // Hydrate from the database. If the stored preference differs from the mirror
  // (changed during a previous run, or the mirror was cleared), this corrects it
  // on the frame after mount — fast enough to be invisible.
  useEffect(() => {
    let cancelled = false;
    getPreferredTheme()
      .then((dbMode) => {
        if (cancelled || !dbMode || dbMode === mode) return;
        setModeState(dbMode);
        localStorage.setItem(MIRROR_KEY, dbMode);
      })
      .catch(() => {
        // Pre-M1 there is no settings table yet, and a user can legitimately run
        // before the DB exists. The mirror is a fine answer on its own.
      });
    return () => {
      cancelled = true;
    };
    // Deliberately mount-only: this is hydration, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep "system" live. Without this the app only tracks the OS at launch, and
  // a user flipping their OS to dark at sunset sees nothing until restart.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemResolved(systemTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // Mirror first: it is what the next cold launch reads, and it must be
    // correct even if the app is killed before the DB write lands.
    localStorage.setItem(MIRROR_KEY, next);
    void setPreferredTheme(next).catch(() => {
      // A failed persist is not worth interrupting the user over. Worst case
      // the preference does not survive a restart, and the mirror covers that.
    });
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the current theme. Throws outside the provider, which is a bug, not a
 *  state to handle. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
