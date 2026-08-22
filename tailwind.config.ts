/**
 * Tailwind configuration for Semester Command.
 *
 * Job: give every CSS custom property defined in `src/styles/globals.css` a
 * utility-class name, so that no component ever needs a hex literal (SPEC.md
 * §9.1).
 *
 * Called by: PostCSS, via `postcss.config.js`.
 * Calls: nothing. Token *values* live in `src/styles/globals.css`; this file
 * only names them.
 *
 * NOTE: tokens are stored as space-separated sRGB channels rather than hex so
 * that `rgb(var(--x) / <alpha-value>)` makes Tailwind's opacity modifiers work
 * (`bg-surface/60`). globals.css carries the hex in a comment on every line and
 * `npm run check:tokens` asserts the two never drift.
 */
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/** `rgb(var(--token) / <alpha-value>)` — the form Tailwind needs for `/50` suffixes. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ─────────────────────────────────────────────────────────────────
           shadcn/ui semantic contract. Generated components in
           `src/components/ui/` reference these names and nothing else, which
           is why `npx shadcn add <x>` needs no hand-editing afterwards.
           ───────────────────────────────────────────────────────────────── */
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        // shadcn's "accent" is a subtle HOVER FILL, not §9.1's periwinkle.
        // §9.1's accent is `brand`, below. This collision is the single most
        // confusing thing in the styling layer; see docs/UI_SYSTEM.md.
        accent: { DEFAULT: token("accent-fill"), foreground: token("accent-fill-foreground") },
        destructive: {
          DEFAULT: token("destructive"),
          foreground: token("destructive-foreground"),
        },
        border: token("border"),
        input: token("input"),
        ring: token("ring"),

        /* ─────────────────────────────────────────────────────────────────
           §9.1 vocabulary that shadcn has no equivalent for.
           ───────────────────────────────────────────────────────────────── */

        // Panels between `background` and `popover` in the stack.
        surface: token("surface"),
        elevated: token("elevated"),

        // §9.1's accent, renamed to dodge the collision above. Interactive
        // affordances only — focus rings, primary buttons, active tabs,
        // selection. NEVER for data.
        //   brand        the periwinkle (rings, indicators; 3:1 non-text)
        //   brand-solid  darker fill that keeps a white label at 4.5:1
        //   brand-fg     text-safe variant for links
        brand: {
          DEFAULT: token("accent"),
          solid: token("accent-solid"),
          fg: token("accent-fg"),
        },

        // Signal palette — the one place colour carries meaning, and it maps to
        // grade risk. Two tiers: the bare name is the vivid FILL (bars, status
        // dots), `-fg` is the TEXT-safe variant at 4.5:1 in both themes.
        // If a user sees periwinkle it is something they can click.
        // If they see amber it is something they should worry about.
        "on-track": { DEFAULT: token("on-track"), fg: token("on-track-fg") },
        "at-risk": { DEFAULT: token("at-risk"), fg: token("at-risk-fg") },
        critical: { DEFAULT: token("critical"), fg: token("critical-fg") },
        locked: { DEFAULT: token("locked"), fg: token("locked-fg") },

        // Sidebar row states (§5).
        "fill-ghost": {
          DEFAULT: token("fill-ghost"),
          selected: token("fill-ghost-selected"),
        },
      },

      /* ---- Type (§9.2) ---- */
      fontFamily: {
        // Screen titles and course names only. Used anywhere else it starts to
        // look like a landing page.
        display: ["Bricolage Grotesque Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Geist Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        // Every percentage, point value, date and countdown. Tabular figures
        // are enforced in globals.css, not left to the caller.
        mono: ["Geist Mono Variable", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // The scale is closed: 12 / 13 / 14 / 16 / 20 / 28 / 48 and nothing else.
      // `text-display` (48) is reserved for the current course grade on the
      // course detail screen. If a new size feels necessary, the layout is
      // usually what is wrong.
      fontSize: {
        "2xs": ["0.75rem", { lineHeight: "1rem" }], // 12
        xs: ["0.8125rem", { lineHeight: "1.125rem" }], // 13
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14
        base: ["1rem", { lineHeight: "1.5rem" }], // 16
        lg: ["1.25rem", { lineHeight: "1.75rem" }], // 20
        xl: ["1.75rem", { lineHeight: "2.125rem" }], // 28
        display: ["3rem", { lineHeight: "1", letterSpacing: "-0.02em" }], // 48
      },

      // 12px base (--radius), stepping up to 16/20 for the floating cards and
      // down for nested controls. The soft-modern restyle leans on this scale:
      // cards are rounded-2xl, buttons and inputs are pills or rounded-lg.
      borderRadius: {
        lg: "var(--radius)", // 12 — buttons, inputs, nav items
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)", // 16 — inner cards, tiles
        "2xl": "calc(var(--radius) + 8px)", // 20 — top-level panels
      },

      // Sidebar geometry (§5), named so AppShell and Sidebar cannot disagree
      // about where the content column starts.
      spacing: {
        sidebar: "252px",
        rail: "56px",
      },

      // Light mode lifts with shadow rather than tint, because --surface and
      // --elevated are both #FFFFFF there (§9.1). The soft-modern restyle uses
      // large, low-opacity, slightly blue-grey shadows (16 24 40 is slate-950)
      // — a hard black shadow at small blur is what makes a card look pasted
      // on rather than floating.
      boxShadow: {
        card: "0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.03)",
        elevated: "0 4px 8px -2px rgb(16 24 40 / 0.06), 0 12px 32px -4px rgb(16 24 40 / 0.10)",
        popover: "0 2px 4px rgb(16 24 40 / 0.06), 0 8px 24px -4px rgb(16 24 40 / 0.12)",
      },

      // Durations from §9.4, named so that "the modal feels slow" is a one-line
      // change rather than a grep.
      transitionDuration: {
        micro: "120ms", // hover, press, toggle
        modal: "180ms", // dialog + sheet enter/exit
        grade: "400ms", // grade bars
      },

      keyframes: {
        // Sync skeletons (§9.7) — shimmer, never a spinner.
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
