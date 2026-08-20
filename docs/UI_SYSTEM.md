# UI system

Modern, clean, dense. Closer to a well-built terminal client than to a landing page. Every pixel earns its place by making a number easier to read or a decision easier to make.

Values live in `src/styles/globals.css`. Names live in `tailwind.config.ts`. **No component contains a hex literal.**

---

## Tokens

Stored as space-separated sRGB channels rather than hex, so `rgb(var(--x) / <alpha-value>)` lets Tailwind compose opacity modifiers (`bg-surface/60`). The §9.1 hex sits in a comment on every line, and `npm run check:tokens` fails if the two ever drift apart.

### Surfaces

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0E1016` | `#F7F8FB` | canvas |
| `--surface` | `#161923` | `#FFFFFF` | cards, panels, sidebar |
| `--elevated` | `#1F2330` | `#FFFFFF` | modals, popovers, hover |
| `--border` | `#2A2F3E` | `#E4E7EF` | — |
| `--text` | `#E8EAF2` | `#14161F` | — |
| `--text-muted` | `#8B92A8` | `#626A7E` | — |

In light mode `--surface` and `--elevated` are both `#FFFFFF`: **lift with shadow, not tint** (`shadow-elevated`, `shadow-popover`).

### Accent

`#7C6BFF`, periwinkle. One accent, used for interactive affordances only: focus rings, primary buttons, active tabs, selection. **Never for data.**

Three tiers exist because one value cannot do all three jobs accessibly:

| Token | Value | Job | Floor |
|---|---|---|---|
| `--accent` | `#7C6BFF` both themes | focus rings, active indicators | 3:1 (WCAG 1.4.11) |
| `--accent-solid` | `#6D5AFF` both themes | primary button fill | white label at 4.5:1 |
| `--accent-fg` | `#7E6DFF` / `#6754FF` | link text | 4.5:1 (WCAG 1.4.3) |

`--accent-solid` exists because white on `#7C6BFF` measures **3.89:1** — a primary button label that fails AA in both themes.

### Signal palette

The one place colour carries meaning, and it maps to grade risk, not decoration.

| Signal | Meaning |
|---|---|
| `on-track` | projected grade meets or beats target |
| `at-risk` | within 5 points of falling short |
| `critical` | target no longer reachable, or work is missing/overdue |
| `locked` | graded and final, nothing left to change |

**The contract, in one line:** if the user sees periwinkle it is something they can click; if they see amber it is something they should worry about. Never use the accent and the signal colours interchangeably.

Colour is never the only channel. Every status dot, pill and bar segment carries an `aria-label` and a tooltip stating the status in words.

### Deviation: two-tier signal palette

§9.1 gives one value per signal. §9.6 asks for 4.5:1 in both themes and specifically warns that amber fails in light mode. Both cannot hold — measured against `#F7F8FB`, the spec's four values come in at **2.23 / 2.03 / 3.16 / 4.53**, missing 4.5:1 as text on three of four and missing even the 3:1 a graphical object needs on two of four. An 8px status dot at 2.03:1 on a white sidebar is not a warning, it is a smudge.

So each signal has two tiers, and in light mode both move to the minimum hue-preserving darkening that clears its own floor:

| | Dark (spec values, unchanged) | Light fill (≥3:1) | Light text (≥4.5:1) |
|---|---|---|---|
| `on-track` | `#2DBE8F` | `#259D76` | `#1E7F60` |
| `at-risk` | `#E8A33D` | `#C17C17` | `#9C6513` |
| `critical` | `#E85D75` | `#E85B73` | `#DB1F40` |
| `locked` | `#6B7284` | `#6B7284` | `#687087` |

Hue and saturation are untouched, so the palette still reads as §9.1's. Dark mode keeps the spec's exact hex on both tiers except `locked`, whose text variant lightens to `#7C8395` (the spec value is 3.95:1 as text).

**Which tier to use:** the bare name for fills — bars, status dots, area shading. The `-fg` suffix for anything made of glyphs — labels, percentages, icons that carry meaning rather than decorate.

```tsx
<span className="bg-critical" />              {/* a dot */}
<span className="text-critical-fg">4d overdue</span>   {/* words */}
```

Verify with `npm run check:tokens`, or open `/#/dev/tokens` in dev and watch the ratios recompute as you flip the theme.

### The two accents

shadcn/ui generates components that use `bg-accent` to mean *subtle hover fill*. §9.1 uses "accent" to mean the periwinkle. Both want the same name, so:

| You want | CSS variable | Tailwind class |
|---|---|---|
| §9.1's periwinkle | `--accent` | `brand`, `brand-solid`, `brand-fg` |
| shadcn's hover fill | `--fill-ghost` | `accent` |
| Primary button | `--primary` (aliases `--accent-solid`) | `primary` |

**`bg-accent` gets you a hover grey, by design.** Reach for `bg-brand` or `bg-primary` when you mean periwinkle. This is the single most confusing thing in the styling layer; it is the price of adopting shadcn's generator unedited.

---

## Type

| Role | Face | Package |
|---|---|---|
| Display — screen titles, course names, **only** | Bricolage Grotesque | `@fontsource-variable/bricolage-grotesque` |
| Body / UI | Geist | `@fontsource-variable/geist` |
| **All numerals** | Geist Mono | `@fontsource-variable/geist-mono` |

**Fonts are bundled locally. Never a CDN link.** This is an offline desktop app; a network font request means the UI renders in a fallback face and every table reflows when you are on campus wifi that has not authenticated yet.

Scale — closed set: **12 / 13 / 14 / 16 / 20 / 28 / 48**.

| Class | px |
|---|---|
| `text-2xs` | 12 |
| `text-xs` | 13 |
| `text-sm` | 14 |
| `text-base` | 16 |
| `text-lg` | 20 |
| `text-xl` | 28 |
| `text-display` | 48 |

`text-display` is reserved for the current course grade on the course detail screen and nothing else. If a new size feels necessary, the layout is usually what is wrong.

### Tabular numerals are not a nicety

Every percentage, point value, date and countdown uses `font-mono` with `font-variant-numeric: tabular-nums`. It is applied by selector in `globals.css` — on `.font-mono` and on any element with `data-numeric` — rather than left to each caller, so a new component cannot forget it.

A grade ticking from 89.4 to 90.1 must not shift the column it lives in. In a gradebook that is the difference between a table you can scan and one you have to read.

---

## The Grade Gap bar

The signature element (`src/components/grade/GradeGapBar.tsx`, lands in M3). Not a generic progress bar.

```
├──────────── earned ────────────┼─── still winnable ───┼─ lost ─┤
0%                              78%                    93%      100%
                                 ▲ projected            ▲ current
```

| Region | Fill | Meaning |
|---|---|---|
| **Earned** | solid, in the course's signal colour | points already banked |
| **Still winnable** | low-opacity diagonal hatch, SVG `<pattern>` | grade still in play — *it should look unstable, because it is* |
| **Lost** | flat `--locked` | forfeited to missed or low-scored work. Dead, unclickable. |

The target grade is a thin vertical marker across the track. When projected crosses it, the marker and the bar snap to `--on-track` with a brief spring. **That transition is the emotional payoff of the entire app** — do not replace it with a fade.

Hatch opacity is a token (`--hatch-opacity`: 0.28 dark, 0.22 light) so each theme tunes it without the component knowing which theme is active.

Animate width with a spring, never a linear tween: `{ stiffness: 260, damping: 30 }`, exported as `springy()` from `useReducedMotion` so every animated surface in the app shares one set of physics. Hovering any region shows the exact points.

---

## Motion

Motion clarifies state changes. It does not announce itself.

**Do**

- Triage list reorder via `layout` on `motion.div` — when a sync changes priority, rows visibly slide. That is information.
- Modal enter/exit at 150–180ms, scale + fade.
- Grade numbers counting up on first paint.
- The Grade Gap spring.
- Skeleton shimmer during sync.

**Don't**

- Page transitions, scroll-triggered reveals, staggered card entrances on mount, parallax, anything decorative. This is a tool that opens instantly.

**Durations** — named in Tailwind so "the modal feels slow" is a one-line change:

| Class | Value | For |
|---|---|---|
| `duration-micro` | 120ms | hover, press, toggle |
| `duration-modal` | 180ms | dialog, sheet |
| `duration-grade` | 400ms | grade bars |

**Reduced motion** is guarded in one place: `useReducedMotion()` in `src/hooks/`, plus a CSS media query in `globals.css` for transitions the hook cannot see. Never scatter `prefers-reduced-motion` checks per component — the scattered ones are the ones that get forgotten on the next new component. `springy(reduced)` collapses to `duration: 0`, not to a fast tween: "fast" still moves.

---

## Dialog vs. Sheet vs. toast

| Use | When | Examples |
|---|---|---|
| **Dialog** | A focused decision that blocks. One job, then it closes. | Set target grade · the "what do I need" solver · edit a time estimate · enter a Canvas token |
| **Sheet** (right slide-over) | Reference material you want *beside* the list, not instead of it. Non-blocking. | Assignment detail — rubric criteria, description, submission history, with the triage list still visible behind |
| **Toast** (sonner, bottom-right) | Something happened; you do not need to act. Auto-dismiss, **except on failure**. | Sync finished · sync failed · export written |
| **Banner** (sidebar footer) | A persistent condition that changes how everything on screen should be read. | "Reconnect to Canvas" — it lives in the footer precisely so it is visible from every screen |
| **Command palette** (`⌘K` / `Ctrl+K`) | Navigation and actions for someone who already knows what they want. | Jump to course · search assignments · sync now · "what do I need in CS 152" |

Tooltips go on **every** abbreviated number. If it is truncated or shortened, it has a tooltip.

---

## Theme switching

- Defaults to the OS preference, with a three-way Light / Dark / System toggle. "System" keeps tracking the OS live — a `matchMedia` listener, not a read at launch — so flipping your OS to dark at sunset flips the app.
- **The class is applied to `<html>` before first paint** by a blocking inline script in `index.html`. Not deferred, not a React effect. This is called out in the spec as the most common bug in the feature, and the symptom is a white flash on every single launch.
- Source of truth is the settings store; `localStorage["sc.theme"]` is a synchronous mirror the pre-paint script can read, reconciled after mount.
- `tauri.conf.json` also sets the window `backgroundColor` to `#0E1016`, so the native window itself is dark before the webview paints anything at all.
- Both themes are first-class. Do not build dark and then tint it.

---

## Quality floor

- Visible keyboard focus rings on every interactive element. Applied globally via `:focus-visible` in `globals.css` — 2px ring in `--accent` with a `--bg` offset.
- Full keyboard navigation of the triage list.
- **Empty states tell you what to do next.** "No courses synced yet — connect Canvas in Settings", never a bare "No data". `EmptyState`'s `action` prop is optional in the type and mandatory in spirit: if you cannot name a next step, the empty state is probably hiding a missing feature.
- Error text names what broke and how to fix it. `CommandError` carries a machine-readable `kind` *and* a message written for a person.
- **Loading states are skeletons matching the final layout, not spinners.**
