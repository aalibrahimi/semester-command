# Development

Recipes for the five things you will actually do, and the failure modes that will cost you an afternoon if nobody warned you.

---

## Layout at a glance

```
semester-command/
├── src/                  React frontend — renders, never computes grades
├── src-tauri/src/        Rust backend — Canvas, SQLite, and all the math
├── src-tauri/migrations/ sqlx migrations, applied on startup
├── scripts/              repo checks (token contrast)
└── docs/                 you are here
```

Run `npm run verify` before every commit: typecheck, lint, token contrast, Rust tests.

---

## Add a Canvas endpoint

1. **Confirm the shape first.** Add the call, log the raw response, look at it. Do not write a struct from memory or from the docs — §8 is explicit that guessed field names become wrong numbers three layers up.
2. Add the serde type to `src-tauri/src/canvas/models.rs`. **Every field `Option<T>`.** Never `unwrap_or_default()` a score.
3. Add one function to `src-tauri/src/canvas/endpoints.rs`, routed through the paginating helper in `client.rs`. Never construct a request or a retry loop outside `client.rs`.
4. Add the column(s) plus `raw_json` and `source` to a new migration.
5. Add the upsert to `src-tauri/src/db/upsert.rs` — `ON CONFLICT DO UPDATE`, merged per column, guarded on `source` so an API row cannot blank a value the user typed in.
6. Record the trimmed response and any surprise in [`CANVAS_API.md`](CANVAS_API.md). The gotchas table is the highest-value part of this repo's documentation; add to it every time something bites you.

## Add a command

1. Write it in the right file under `src-tauri/src/commands/` — `auth`, `sync`, `grades`, `data` or `settings`. Return `CommandResult<T>`.
2. `#[derive(Serialize)]` on the return type with `#[serde(rename_all = "camelCase")]`.
3. Register it in the `invoke_handler![...]` list in `src-tauri/src/lib.rs`. **This is the step everyone forgets**; the symptom is a runtime error saying the command is not found, which reads like a typo in the name.
4. Mirror the return type in `src/types/index.ts`.
5. Add a typed wrapper to `src/lib/ipc.ts`. **No raw `invoke()` in a component, ever.** `grep -r "invoke(" src/` should match one file.

Two things a command must never do: return a credential, or compute a grade.

## Add a migration

```sh
# src-tauri/migrations/0002_add_score_statistics.sql
```

Zero-padded to four digits — sqlx sorts lexicographically, and without the padding `0010` sorts before `0002`.

**Migrations are append-only.** Once one has run on the machine holding your real grades, editing it does nothing: sqlx records the version and skips it. Fix a mistake with a new migration.

**No destructive statements against `targets` or `estimates`.** They hold data that exists nowhere else — no server copy, no backup. A `DROP TABLE` there is unrecoverable.

If the project uses sqlx's compile-time checked queries, regenerate the offline cache after a schema change and commit it, or a clean checkout will not build:

```sh
cargo sqlx prepare --workspace   # writes src-tauri/.sqlx/
```

## Add a shadcn component

```sh
npx shadcn@latest add <name>
```

It lands in `src/components/ui/`. **Do not hand-edit that directory** — wrap it. If a component needs different behaviour, make a wrapper in `components/grade/`, `components/triage/` or `components/layout/`.

There is exactly one exception, documented in the file itself: `src/components/ui/sonner.tsx` is rewired to this app's `useTheme` because the generator emits an import of `next-themes`, a Next.js package this app has no business depending on. **Re-running `shadcn add sonner` will clobber it and reinstall `next-themes`.** Re-apply the edit.

New components pick up the §9.1 palette with no changes because `globals.css` aliases shadcn's semantic tokens (`--primary`, `--muted`, …) onto the spec's. Nothing to wire.

## Add a design token

1. Add it to **both** the `:root, .dark` block and, if it differs, the `.light` block in `src/styles/globals.css`. Channels, with the hex in a trailing comment.
2. Name it in `tailwind.config.ts` using the `token()` helper.
3. Run `npm run check:tokens`. It asserts the hex comment matches the channels and that contrast floors hold **in both themes**.
4. If it is a colour that text will sit on, add a row to the contrast checks in `scripts/check-tokens.mjs`.

---

## Common failure modes

### The app flashes white on launch

The blocking theme script in `index.html` did not run before paint. Check that it is still inline in `<head>`, still without `defer` or `type="module"`, and still ahead of the stylesheet link. Moving it into React reintroduces the flash on every launch. `tauri.conf.json`'s window `backgroundColor` is the second line of defence and should stay `#0E1016`.

### `Command X not found`

The command is not in the `invoke_handler![...]` list in `lib.rs`. See "Add a command", step 3.

### Cookie harvest hangs on Windows

Cookies are being read from a synchronous command or an event handler. Tauri documents a WebView2 deadlock for exactly this. Move the read to an async command on a separate thread — on every platform, not just Windows, so it does not come back as a one-target-only bug.

### Canvas 403s and the app tries to log in again

Canvas rejects rate-limited requests with `403` and a rate-limit body, not `429`. Check the body before classifying a 403 as an auth failure.

### Only 100 rows came back

The call did not go through the paginating helper. Canvas paginates with the `Link` header; follow `rel="next"` until it is absent.

### A grade shows as 0 that should be blank

Something called `unwrap_or_default()` on an `Option<f64>` score. `null` means *ungraded*; `0.0` means *graded, scored zero*. Collapsing them destroys the distinction between the current and projected numbers.

### Every course grade is catastrophically low in week three

The weighted-mode denominator is not renormalised. Groups with no graded work must be excluded and the remaining weights rescaled. See [GRADE_ENGINE.md §1](GRADE_ENGINE.md#worked-example--the-empty-group-case) — the worked example goes from 27% to 90% on this one line.

### `npm run check:tokens` fails after a colour change

Read the number it printed. Fix the token, not the threshold — §9.6 treats both themes as first-class. `/#/dev/tokens` shows the same measurements live in the browser while you iterate.

### `vite build` dies in `renderChunk` looking for `esbuild`

`build.minify` is set to the string `"esbuild"`. Vite 8 bundles with rolldown and ships oxc as its minifier; naming esbuild explicitly makes it import a package that is not installed. Use `minify: true`.

### `tsc` errors with TS5101 about `baseUrl`

TypeScript 6 deprecates `baseUrl`. Path aliases resolve relative to the tsconfig without it, so remove it and keep `paths`.

### `cargo build` fails on Linux with a webkit error

Missing system dependencies. See the Linux block in the [README prerequisites](../README.md#prerequisites).

### The sidebar collapse or theme resets on every launch

Both mirror to `localStorage` for the synchronous pre-paint read. If the mirror is being cleared, or the settings write is failing silently, the preference will not survive. Check the Rust log for a storage error from `set_preferred_theme` — the frontend deliberately swallows that failure, so the log is the only place it appears.

---

## Dev-only surfaces

- **`/#/dev/tokens`** — every token with its contrast ratio measured live. Registered only when `import.meta.env.DEV`; the bundler strips it from release builds, which is why it disappears if you look for it in `vite preview`.
- **`npm run dev`** — frontend in a browser, no Rust. Every IPC wrapper degrades to a sensible standalone value, so UI work does not wait on a Rust rebuild. Anything needing real data needs `npm run tauri:dev`.

## Conventions

- **Comment the why, never the what.** `// increment counter` is noise. `// Canvas returns 403 with a rate-limit body instead of 429` is why the next person does not rewrite the block.
- Every file opens with a header stating its job, what calls it, and what it calls. Rust: `//!`. TypeScript: a block comment.
- Rust: `///` on every public function — purpose, params, failure modes.
- `grades.rs` is the exception to brevity. Comment it heavily; every formula gets its reasoning and a worked example.
- Mark deliberate deviations from Canvas's own behaviour with `// NOTE:` and the reason.
- Milestone-tagged TODOs only: `// TODO(M4):`. Never a bare `TODO`.

## Lint config

`.oxlintrc.json` is JSON and cannot carry comments, so the two overrides are explained here:

- **`react/only-export-components` off for `src/components/ui/**`.** Those files are generated by the shadcn CLI and export a `cva` variants object beside the component. Editing them to satisfy the rule would be undone by the next `shadcn add`.
- **Same rule off for `src/hooks/**`.** `useTheme.tsx` exports both `ThemeProvider` and `useTheme`, which is the canonical provider-plus-hook pattern. The rule exists to protect Fast Refresh; splitting a provider from its hook to buy a marginally faster HMR update is a bad trade.

One inline suppression exists, in `useSync.ts`, with its reasoning in a comment above it. Add suppressions the same way — never bare.

## No `<StrictMode>`

`src/main.tsx` mounts without it. StrictMode double-invokes effects in development, which turns every `invoke()` on mount into two IPC calls and makes the Rust-side sync logs unreadable. The trade is real — we lose the extra warnings — and it is deliberate. If you re-add it, expect duplicated commands in the log before concluding the backend is misbehaving.
