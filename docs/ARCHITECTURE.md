# Architecture

How data gets from Canvas to a number on screen, and why the pieces sit where they do.

---

## The whole flow

```
   ┌─────────────────────────┐
   │  sjsu.instructure.com   │   read-only, GET only
   └───────────┬─────────────┘
               │ HTTPS + session cookie (or token, or .ics)
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  canvas/client.rs      pagination · rate limit · retry  │
   │  canvas/endpoints.rs   one fn per endpoint              │
   │  canvas/models.rs      serde types, every field Option  │
   └───────────┬─────────────────────────────────────────────┘
               │ parsed structs + the raw response body
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  db/upsert.rs          INSERT … ON CONFLICT DO UPDATE   │
   │                        never DELETE, never DROP         │
   └───────────┬─────────────────────────────────────────────┘
               │
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  SQLite  (app data dir)                                 │
   │    synced:      courses · groups · assignments ·        │
   │                 submissions · instructors               │
   │    local only:  targets · estimates · notes · settings  │
   │    every synced row carries: raw_json, source, synced_at│
   └───────────┬─────────────────────────────────────────────┘
               │ db/queries.rs
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  grades.rs   ← THE CORE. pure, sync, no I/O             │
   │  triage.rs   ranking                                    │
   └───────────┬─────────────────────────────────────────────┘
               │
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  commands/   #[tauri::command] — the ONLY frontend edge │
   └───────────┬─────────────────────────────────────────────┘
               │ IPC (serde → JSON)
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  src/lib/ipc.ts    typed wrappers, one per command      │
   │  src/hooks/        useCourses · useGrades · useSync      │
   │  src/routes/       Triage · CourseDetail · Calendar ·   │
   │                    Contacts                             │
   └─────────────────────────────────────────────────────────┘

   Sideways, same binary:
   mcp/  ── stdio MCP server, opens the SQLite file READ-ONLY (M5)
```

---

## Why grade math lives in Rust

It would be easier to compute grades in the component that displays them. Four reasons not to:

**It has to be testable in isolation.** `grades.rs` takes data structures and returns numbers. No database, no network, no `async`, no React. That means `tests/grades_test.rs` can express "a weighted course with one empty group" as ten lines of literals and assert the exact percentage. Testing the same logic through a rendered component means standing up a fixture, a render tree and a query — and nobody writes the sixth edge case under that much friction. The fifth edge case is where the bugs are.

**There must be exactly one implementation.** The number appears on the course screen, in the triage ranking, in a notification, and in the MCP server. Four call sites. If the math lives in a React component, the notification scheduler and the MCP server each need their own copy, and the day they disagree is the day the app becomes untrustworthy for the one thing it exists to do.

**Floating-point behaviour should be boring.** Rust's `f64` does what IEEE 754 says. So does JavaScript's `number`. But the rounding, the comparison tolerances and the reconciliation threshold against Canvas's own `current_score` are all easier to reason about in one language, in one file, with the tolerance written down next to the comparison.

**The frontend should be replaceable.** The MCP server in M5 has no frontend at all and needs the same answers. If the math is in Rust, that milestone is a new caller. If it is in TypeScript, it is a rewrite.

The rule that follows: **if a percentage is computed in TypeScript, that is a bug.** `src/lib/format.ts` may round a number Rust produced and stick a `%` on it. It may not derive one.

---

## The command boundary

`src-tauri/src/commands/` is the only part of the Rust tree the webview can reach. This is not organisational tidiness; it is where the credential boundary sits.

The Canvas session cookie lives in the OS keychain. It is read in `canvas/client.rs`, attached to a request there, and never travels anywhere else. **No command returns it.** A command may answer "are we authenticated, and under which tier" — it may not answer "with what". If a feature seems to require the frontend to hold a token, the feature is designed wrong.

Mirroring this on the TypeScript side, every `invoke()` goes through `src/lib/ipc.ts`. A raw `invoke("get_courses")` in a component is a stringly-typed call with an `any` return; rename the command and it fails silently in three places at runtime. One wrapper per command, each with a real return type, and `grep -r "invoke(" src/` matches one file.

---

## Local-only vs. Canvas-derived

This distinction runs through the whole app and shows up in the UI.

**Canvas-derived** — courses, assignment groups and weights, assignments, submissions, scores, instructors. Refreshed on every sync. Authoritative.

**Local-only** — target grades and grade-scale cutoffs (`targets`), time estimates and per-assignment notes (`estimates`), instructor notes (`instructors.office_hours_note`), and app settings. These exist nowhere else. There is no backup and no server copy.

Which is why **sync upserts and never rebuilds.** A drop-and-recreate sync is the obvious implementation and it silently destroys every target and estimate the user has set. They would not notice until they opened the app expecting their planning to still be there.

Every synced table also carries a `source` column: `'api' | 'ics' | 'manual'`. Rows sourced from a calendar feed or typed in by hand survive an API sync, and the UI visibly marks anything that is not `api`. Under Tier 2 auth, manual entry is the *only* way grades exist — it is a first-class path, not a debug feature.

---

## What happens on sync failure

Sync is resumable and non-destructive. Failure is expected, not exceptional.

**One course fails.** Logged to `sync_log` with the entity and the error. The run continues with the next course. One broken course must not cost you the other five.

**The session died** — a `401`, a `302` to the SSO host, or an HTML body where JSON was expected. All three mean the same thing. The run stops, the phase becomes `reconnectRequired`, and the sidebar footer shows "Reconnect to Canvas" in `--critical` from every screen. Data already on disk stays and is marked stale. The app never crashes on this and never quietly shows stale grades as current.

**Rate limited.** Canvas answers with `403` and a rate-limit body, not `429`. The client retries with exponential backoff. If `X-Rate-Limit-Remaining` drops below 100 it backs off before being asked to.

**Network is gone.** Toast, phase `error`, existing data untouched. Retry on the next scheduled sync.

Nothing in this list results in a partial write that leaves the database inconsistent: each entity's upsert is its own transaction, so a run that dies halfway leaves the courses it finished correct and the rest simply not-yet-updated.

---

## Process model

One process, one window, one SQLite file. No server, no daemon, no IPC beyond Tauri's own.

The exception is M5: `semester-command --mcp` starts the same binary as a stdio MCP server. It opens the SQLite file **read-only**, which is what lets it run while the desktop app is open, and exposes `list_courses`, `get_course_grades`, `what_do_i_need`, `upcoming` and `triage`. It writes nothing — not to Canvas, not to the database.
