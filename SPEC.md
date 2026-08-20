# Semester Command — Build Spec

A local-first desktop app that pulls my Canvas coursework and tells me what to work on and what I need to score to hit my target grade.

**Drop this file in the repo root as `SPEC.md`. Start Claude Code with: "Read SPEC.md and implement Milestone 1. Stop and show me the working sync before moving on."**

---

## 0. Context for the implementer

- Single user, single machine. Me. No auth system, no multi-tenancy, no cloud sync, no accounts.
- Canvas instance: `https://sjsu.instructure.com` (San José State University).
- **SJSU has disabled student-generated API tokens.** The Settings page shows "Your Canvas administrators have chosen to limit your ability to generate your own access token." There is no Bearer token available. See §2.0 for the auth strategy — read it before writing any networking code.
- I have ~3 semesters left. This app should be useful the day it compiles, not after a month of feature work.

**Non-goals — do not build these:**

- User accounts, login, or any server component
- LLM integration in Milestones 1–3 (comes later, and lives outside the app)
- Note-taking, flashcards, pomodoro timers, habit streaks, gamification
- Anything that submits work to Canvas or interacts with live assessments. This app is read-only against Canvas. The only writes are local.

---

## 1. Stack

- **Tauri v2**, React 18 + TypeScript, Vite
- **All Canvas HTTP calls happen in Rust**, exposed to the frontend via `#[tauri::command]`. The token must never be readable from the webview.
- Session credentials stored via the `keyring` crate (macOS Keychain), treated as **short-lived and expected to expire**. Fall back to a `0600` file in the app config dir if keyring init fails, and say so in the UI.
- SQLite via `sqlx` (Rust side, compile-time checked queries). Migrations in `migrations/`.
- HTTP via `reqwest` with `rustls`.
- Plugins: `tauri-plugin-notification`, `tauri-plugin-autostart`, `tauri-plugin-opener`, `tauri-plugin-os` (for OS theme detection).
- System tray with a "Sync now" item and next-3-deadlines in the menu.

### Frontend UI stack

- **Tailwind CSS** with CSS-variable-based theming (`class` dark-mode strategy on `<html>`).
- **shadcn/ui** for primitives. Requires path aliases — set `@/*` in both `tsconfig.json` and `vite.config.ts` `resolve.alias` before running `npx shadcn@latest init`, or the CLI will place files in the wrong tree.
  Components to install: `button card dialog sheet tabs progress badge table tooltip popover select command sonner alert skeleton separator scroll-area switch`.
- **motion** (the package formerly published as framer-motion) — `import { motion, AnimatePresence } from "motion/react"`.
- **lucide-react** for icons. One icon set, no mixing.
- Fonts are **bundled locally via `@fontsource`**, never a CDN link. This is an offline desktop app; a network font request means the UI reflows or renders wrong when I'm on campus wifi that hasn't authenticated yet.

---

## 2. Canvas API — the parts that matter

Base: `https://sjsu.instructure.com/api/v1`.

### 2.0 Authentication — read this first

No personal access token is available. Implement in this order; each tier degrades gracefully into the next.

**Tier 1 — Session cookie from an embedded login webview (primary path).**

Canvas's `/api/v1` endpoints accept an authenticated browser session, not just Bearer tokens. So:

1. On first run (and whenever the session expires), open a second Tauri webview window pointed at `https://sjsu.instructure.com`. I log in through SJSU SSO manually — including any MFA step. The app never sees or stores my password.
2. Detect successful login by polling for the presence of the Canvas session cookie on that URL.
3. Harvest cookies with `webview.cookies_for_url("https://sjsu.instructure.com")` — this returns HTTP-only and secure cookies, which `document.cookie` does not. Store in the keyring, close the login window.
4. Attach those cookies to every `reqwest` GET. Add `Accept: application/json+canvas-string-ids` to avoid JS-precision issues with large IDs.

Implementation notes that will otherwise cost an afternoon:

- Cookie reads must happen in an **async command on a separate thread**. Tauri documents a WebView2 deadlock when reading cookies from a synchronous command or event handler. Even on macOS, do it async.
- Cookies are only returned for `http`/`https` URLs — not the `tauri://` protocol.
- Sessions expire, and SSO may force periodic re-auth. Treat a `401`, a `302` to the SSO host, or an HTML response where JSON was expected as "session dead" → surface a non-blocking "Reconnect to Canvas" banner and reopen the login webview on click. Never crash, never silently show stale grades without marking them stale.
- **Read-only, always.** Only `GET`. No CSRF token handling, no writes, no form posts. If a code path would ever `POST` to Canvas, it's out of scope.
- Poll politely: sync at most every 30 minutes, cap concurrency at 4, back off on any error. This is my own data on my own machine, but automated polling is the thing that draws attention — behave like a user with a few tabs open, not a scraper.

**Tier 0 — Ask for a token anyway (do this in parallel, costs one email).**

Email `cfeti@sjsu.edu` (CFETI, 408-924-2337) explaining you're building a personal read-only study tool and asking whether an admin can issue a scoped access token. Low odds, but if it lands, Tier 1 becomes unnecessary and everything gets simpler. **The client must support both**: an `AuthMode` enum (`Token(String)` | `Session(CookieJar)`) with the same interface behind it, so swapping is a one-line change.

**Tier 2 — Calendar feed fallback (always works, no auth at all).**

Canvas gives every user a private `.ics` feed URL at Calendar → Calendar Feed. It requires no login and covers every assignment due date across all courses. It gives dates only — no grades, no weights, no rubrics.

Build this as a real supported mode, not a stub: a settings field for the feed URL, an ICS parser, and assignments populated from it. Paired with manual grade entry (§3), the grade engine still works end to end. If the cookie approach breaks mid-semester, this is what keeps the app useful.

### 2.1 Endpoints to implement

| Purpose | Call |
|---|---|
| Active courses w/ scores + teachers | `GET /courses?enrollment_state=active&include[]=total_scores&include[]=teachers&include[]=term&include[]=syllabus_body` |
| Grade weighting mode | Same call — read `apply_assignment_group_weights` on each course |
| Assignment groups + weights | `GET /courses/:id/assignment_groups?include[]=assignments&include[]=submission` |
| Assignments (incl. rubric) | `GET /courses/:id/assignments?include[]=submission&include[]=score_statistics` |
| My enrollment grades | `GET /courses/:id/enrollments?user_id=self` → `grades.current_score`, `grades.final_score` |
| Instructors | `GET /courses/:id/users?enrollment_type[]=teacher&enrollment_type[]=ta&include[]=email&include[]=avatar_url&include[]=bio` |
| Course files (syllabi, rubrics) | `GET /courses/:id/files` |
| Planner (dated everything) | `GET /planner/items?start_date=...` |

Rubric criteria arrive embedded on the assignment object as `rubric` and `rubric_settings` — no separate call needed.

### 2.2 Non-negotiable API details

1. **Pagination is via the `Link` header**, not a page count. Follow `rel="next"` until absent. Write one generic paginating fetch helper and route every call through it. Default `per_page=100`.
2. **Rate limiting**: Canvas uses a leaky-bucket. Watch the `X-Rate-Limit-Remaining` response header; if it drops below 100, back off. Retry `403` with a rate-limit body using exponential backoff. Never fire course requests in an unbounded `join_all` — cap concurrency at 4.
3. **Store the raw JSON** for every synced entity in a `raw_json` TEXT column alongside the parsed fields. When Canvas returns a shape I didn't anticipate, I want the data already on disk.
4. Treat every field as optional. Canvas omits keys constantly depending on permissions and course settings. Deserialize into `Option<T>` and handle `None` explicitly rather than with `unwrap_or_default()`, which silently turns a missing grade into a zero.

---

## 3. Data model

```
courses(id, name, course_code, term, apply_group_weights BOOL,
        current_score REAL, final_score REAL, syllabus_html, raw_json, synced_at)
assignment_groups(id, course_id, name, group_weight REAL, position, raw_json)
assignments(id, course_id, group_id, name, due_at, points_possible REAL,
            omit_from_final_grade BOOL, submission_types, html_url,
            rubric_json, raw_json)
submissions(assignment_id, score REAL, grade TEXT, submitted_at, graded_at,
            workflow_state, excused BOOL, missing BOOL, late BOOL, raw_json)
instructors(id, course_id, name, email, role, office_hours_note)
targets(course_id, target_letter TEXT, target_pct REAL)
estimates(assignment_id, est_minutes INT, my_note TEXT)   -- local only, my input
sync_log(id, started_at, finished_at, entity, ok BOOL, error)
```

Local-only tables (`targets`, `estimates`) must survive re-sync. Never wipe and rebuild the DB on sync — upsert by Canvas ID.

Every synced table carries a `source` column: `'api' | 'ics' | 'manual'`. Manual and ICS rows must survive an API sync, and the UI visibly marks anything not sourced from the API — I always need to know which numbers Canvas confirmed and which I typed in myself.

**Manual entry is a first-class path, not a debug feature.** Under Tier 2 auth it's the only way grades exist at all. When `source != 'api'`, `assignment_groups.group_weight`, `assignments.points_possible`, and `submissions.score` are all editable in the UI, and the grade engine treats them identically to synced values.

---

## 4. The grade engine — this is the core of the app

Put this in its own Rust module (`src-tauri/src/grades.rs`) with **unit tests**. Everything else is plumbing; this is the part that must be correct, because I'm going to make real decisions from its output.

### 4.1 Two grading modes

Canvas computes course grades one of two ways. Detect via `apply_assignment_group_weights`:

**Weighted mode** (`true`):

```
group_pct_i = Σ(earned in group i) / Σ(possible in group i)
course_pct  = Σ(group_pct_i × weight_i) / Σ(weight_i for groups with any graded work)
```

Note the denominator: groups with no graded work yet are excluded and the remaining weights are normalized. Getting this wrong is the single most common bug in third-party Canvas grade calculators.

**Points mode** (`false`):

```
course_pct = Σ(all earned) / Σ(all possible)
```

Exclude from both: `excused == true` submissions, and assignments with `omit_from_final_grade == true`.

### 4.2 Current vs. projected — always show both

- **Current** — ungraded work excluded from the denominator. This is what Canvas shows me. It's optimistic.
- **Projected** — every ungraded assignment counted as zero. This is where I actually land if I stop working. It's the honest number.

Show them side by side with the gap between them labeled. The gap *is* the motivation.

Validate the engine against Canvas: after computing **current**, compare to `enrollments[].grades.current_score` from the API. If they differ by more than 0.1 points, surface a visible warning banner in the UI naming the course. Do not silently trust my math over Canvas's.

### 4.3 "What do I need?" solver

Given a target percentage and a set of remaining ungraded assignments, solve for the required score.

Uniform case — "what do I need to average on everything left":

```
required_avg = (target − Σ(locked_contribution)) / remaining_weight
```

Single-assignment case — "what do I need on the final, assuming I hit my planned scores elsewhere": treat the target assignment's score as `x`, hold all other projections fixed, solve the linear equation for `x`.

Output must be blunt and cover the edges:

- `> 100%` → "Not reachable. Highest possible grade from here: 87.3% (B+)."
- `< 0%` → "Already locked in. You could score 0 on the final and still get an A−."
- Show it as both a percentage and raw points ("you need 43/50 on the final").

### 4.4 Grade scale

Configurable per course, defaulting to the standard A/A−/B+/B/B−/… scale. SJSU instructors set their own cutoffs and plenty of them curve, so make the thresholds editable per course and store them in `targets`.

---

## 5. Screens

Four. No more.

**0. Persistent sidebar** — 220px, fixed, present on every screen. Collapsible to a 56px icon rail (`⌘\`), with the state persisted. Three zones:

*Nav* — Triage, Courses, Calendar, Contacts. Active item gets `--fill-ghost-selected` background and the accent left indicator. Each carries a count badge where one is meaningful: Triage shows open items, Calendar shows items due this week. Keyboard shortcuts `⌘1`–`⌘4`.

*Courses* — the live list, one row per active course. Each row: course code, and a **status dot in the signal color** for that course's projected-vs-target standing. This is the sidebar's real job — you should be able to tell which class is in trouble without leaving whatever screen you're on. Clicking a course goes straight to its detail view. Sorted by risk, not alphabetically: the course closest to falling short sits at the top.

*Footer* — sync status ("synced 4m ago" / "syncing…" / "reconnect to Canvas" in `--text-danger` when the session dies), theme toggle, settings. The reconnect state must be visible from every screen, which is the reason it lives here rather than in a screen-level banner.

Collapsed rail keeps the nav icons and the course status dots — the dots are the one thing that must survive collapse, since they're the whole reason to glance at it.

**1. Triage (default view)**

A single ranked list of everything not yet submitted. Rank by:

```
score = (grade_impact × urgency) / est_hours
  grade_impact = points_possible × effective_group_weight   (share of final grade at stake)
  urgency      = 1 / max(days_until_due, 0.5)
```

Each row: course, title, due date, **"worth X% of your final grade"**, my time estimate (inline-editable), status pill (missing / late / not submitted). Overdue-but-still-open items pinned to the top in red.

The point of this screen is that I open the laptop, look at row one, and start working. Anything that doesn't serve that goes on another screen.

**2. Course detail**

Current vs. projected grade. Assignment groups with weights and per-group percentages. Full assignment list with scores. The "what do I need" solver panel: pick a target letter, pick an assignment (or "everything remaining"), get the number. Rubric criteria viewable per assignment.

**3. Calendar**

Month + agenda view of all due dates across courses. Button: export `.ics` for the whole semester so it lands in my real calendar. Use a stable `UID` per assignment (`canvas-assignment-{id}@semester-command`) so re-exporting updates events instead of duplicating them.

**4. Contacts**

Instructors and TAs per course: name, email, role, `mailto:` link, plus a free-text notes field I maintain locally for office hours and preferences.

---

## 6. Sync & notifications

- Sync on launch, then every 30 minutes while running, plus a manual "Sync now" in the tray.
- Sync must be resumable and non-destructive. A failed course sync logs to `sync_log` and does not abort the run.
- Notifications, all local, all deduped so I never get the same one twice:
  - 7 days / 3 days / 24 hours / 3 hours before a due date, scaled by grade impact — a 2%-of-grade discussion post gets the 24h ping only; a 25% midterm gets all four
  - A new grade posts and it moves the course grade by more than 1 point
  - An assignment flips to `missing`
  - Daily 8am digest: today's due items and the top three triage rows
- Enable autostart, and start minimized to tray. Reminders are worthless if the app only runs when I remember to open it.

---

## 7. Milestones — implement in order, stop after each

**M0 — Scaffold.** Repo structure per §10, `.gitignore` per §12, `README.md` + `docs/` skeletons per §11, Tailwind + shadcn + motion wired up, design tokens from §9 defined in `globals.css`, theme toggle working against an empty shell. Deliverable: an app that launches, switches light/dark cleanly, and a repo an engineer can navigate cold. *Stop here and show me.*

**M1 — Auth and sync work.** The login webview + cookie harvest (§2.0 Tier 1), `AuthMode` abstraction, session-expiry detection and reconnect flow, paginating Canvas client, full DB schema and migrations, sync of courses/groups/assignments/submissions/instructors. Also the Tier 2 ICS parser and manual-entry path, so the app is usable even if cookie auth fails. Deliverable: a debug view dumping what was pulled, under both auth modes. *Stop here and show me.*

**M2 — Grade engine.** `grades.rs` with both modes, current/projected, the solver, and a unit test suite including: a weighted course with an empty group, an excused submission, a zero-point assignment, an `omit_from_final_grade` assignment, and a course with a single graded item. Plus reconciliation against Canvas's own `current_score`. *Stop here and show me the tests passing.*

**M3 — UI.** The four screens, built to §9. Signature element (the Grade Gap bar) lands here.

**M4 — Background.** Tray, autostart, notification scheduling, `.ics` export.

**M5 — MCP server mode.** Expose the local DB as an MCP server over stdio (`--mcp` flag on the same binary) with read-only tools: `list_courses`, `get_course_grades`, `what_do_i_need(course, target)`, `upcoming(days)`, `triage(n)`. This is what makes the app queryable from an agent instead of another dashboard I have to remember to open. Nothing in this milestone writes to Canvas.

---

## 8. Working agreement

- After each milestone: stop, summarize what was built, and list anything you had to guess about Canvas's response shapes.
- Never invent a Canvas field name. If you're unsure whether a field exists, fetch it once, log the raw JSON, and confirm against what actually came back.
- The grade engine gets tests before it gets a UI.
- Prefer boring and correct. This app's only job is to be right about numbers I'm going to plan my semester around.

---

## 9. Design system

Modern, clean, dense. This is a tool I open twenty times a week — it should feel closer to a well-built terminal client than to a landing page. Every pixel earns its place by making a number easier to read or a decision easier to make.

### 9.1 Tokens

Define these as CSS variables in `src/styles/globals.css` under `:root` and `.dark`, and expose them to Tailwind via `theme.extend.colors`. Never hardcode a hex value in a component.

**Dark (default)**

```
--bg          #0E1016   canvas
--surface     #161923   cards, panels
--elevated    #1F2330   modals, popovers, hover
--border      #2A2F3E
--text        #E8EAF2
--text-muted  #8B92A8
```

**Light**

```
--bg          #F7F8FB   cool white, not cream
--surface     #FFFFFF
--elevated    #FFFFFF   (lift with shadow, not tint)
--border      #E4E7EF
--text        #14161F
--text-muted  #626A7E
```

**Accent** — `#7C6BFF` (periwinkle). One accent, used for interactive affordances only: focus rings, primary buttons, active tabs, selection. Never for data.

**Signal palette** — this is the one place color carries meaning, and it maps to grade risk, not to decoration:

```
--on-track    #2DBE8F   projected grade meets or beats target
--at-risk     #E8A33D   within 5 points of falling short
--critical    #E85D75   target no longer reachable, or work is missing/overdue
--locked      #6B7284   graded and final, nothing left to change
```

Never use the accent and the signal colors interchangeably. If a user sees periwinkle, it's something they can click. If they see amber, it's something they should worry about.

### 9.2 Type

- **Display / headings** — Bricolage Grotesque (`@fontsource-variable/bricolage-grotesque`). Used sparingly: screen titles and course names only.
- **Body / UI** — Geist (`@fontsource-variable/geist`).
- **All numerals** — Geist Mono (`@fontsource-variable/geist-mono`) with `font-variant-numeric: tabular-nums`. Every percentage, point value, date, and countdown uses it. Tabular figures mean a grade that ticks from 89.4 to 90.1 doesn't shift the layout — in a gradebook this is not a nicety, it's the difference between a table you can scan and one you can't.

Scale: 12 / 13 / 14 / 16 / 20 / 28 / 48. The 48 is reserved for the current course grade on the detail screen and nothing else.

### 9.3 Signature element — the Grade Gap bar

The one thing this app is remembered for. Not a generic progress bar.

A single horizontal track per course showing three regions:

```
├──────────── earned ────────────┼─── still winnable ───┼─ lost ─┤
0%                              78%                    93%      100%
                                 ▲ projected            ▲ current
```

- **Earned** — solid fill in the signal color for that course's status. This is points I already have, banked.
- **Still winnable** — the gap between projected and current, rendered as a low-opacity diagonal hatch pattern (SVG `<pattern>`). This is the grade that's still in play. It should look *unstable*, because it is.
- **Lost** — points already forfeited to missed or low-scored work, in `--locked`. Flat, dead, unclickable.

Target grade shown as a thin vertical marker across the track. When projected crosses it, the marker and the bar snap to `--on-track` with a brief spring. That transition is the emotional payoff of the entire app.

Animate width changes with `motion` springs (`stiffness: 260, damping: 30`), never linear tweens. Hovering any region shows a tooltip with the exact points.

### 9.4 Motion rules

Motion clarifies state changes. It does not announce itself.

- **Do**: triage list reorder via `layout` prop on `motion.div` (when a sync changes priority, rows visibly slide — that's information); modal enter/exit at 150ms scale+fade; grade numbers counting up on first paint; the Grade Gap spring; skeleton shimmer during sync.
- **Don't**: page transitions, scroll-triggered reveals, staggered card entrances on every mount, parallax, anything decorative. This is a tool that opens instantly.
- Durations: 120ms micro-interactions, 180ms modals, 400ms grade bars.
- Wrap everything in a `prefers-reduced-motion` check. Ship a `useReducedMotion()` guard in a shared hook, not scattered per component.

### 9.5 Interaction patterns

- **Modals (`Dialog`)** for focused decisions: set target grade, the "what do I need" solver, edit time estimate, enter Canvas token. Each modal does one thing and closes.
- **Sheet** (right slide-over) for assignment detail — rubric criteria, description, submission history. Non-blocking so I can keep the triage list in view behind it.
- **Command palette (`cmdk`)** on `⌘K`: jump to course, search assignments, "sync now", "what do I need in CS 152". This is how a power user actually navigates and it costs almost nothing to add.
- **Sonner toasts** for sync results and errors, bottom-right, auto-dismiss except on failure.
- **Tooltips** on every abbreviated number. If it's truncated or shortened, it has a tooltip.
- **Progress bars**: the Grade Gap (§9.3), per-assignment-group completion, and a semester progress bar in the header — weeks elapsed vs. weeks remaining, which reframes "the semester is long" into "you have five weeks."

### 9.6 Theme switching

- Default to OS preference via `tauri-plugin-os`, with a three-way toggle (Light / Dark / System) in settings, persisted to the DB.
- Apply the class to `<html>` **before first paint** with a blocking inline script in `index.html`, or the app flashes white on every launch. This is the single most common bug in this feature — check it explicitly.
- Both themes are first-class. Do not build dark and then tint it. Verify every signal color hits at least 4.5:1 contrast against its background in *both* modes — the amber is the one that usually fails in light mode.

### 9.7 Quality floor

Visible keyboard focus rings on every interactive element. Full keyboard navigation of the triage list. Empty states that tell me what to do next ("No courses synced yet — add your Canvas token in Settings"), never a bare "No data." Error text that names what broke and how to fix it. Loading states are skeletons matching final layout, not spinners.

---

## 10. File structure

Optimize for an engineer opening this repo cold and finding the grade engine in under thirty seconds.

```
semester-command/
├── README.md                    ← start here
├── SPEC.md                      ← this file
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CANVAS_API.md
│   ├── GRADE_ENGINE.md
│   ├── UI_SYSTEM.md
│   └── DEVELOPMENT.md
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              entry, plugin registration, tray setup
│   │   ├── lib.rs               module tree, app builder
│   │   ├── commands/            #[tauri::command] — the ONLY frontend surface
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs          token store/validate/clear
│   │   │   ├── sync.rs          trigger sync, sync status
│   │   │   ├── grades.rs        grade queries, solver
│   │   │   └── data.rs          courses, assignments, contacts reads
│   │   ├── canvas/              everything that talks to Canvas
│   │   │   ├── mod.rs
│   │   │   ├── client.rs        auth, pagination, rate limiting, retry
│   │   │   ├── models.rs        serde types mirroring Canvas JSON
│   │   │   └── endpoints.rs     one fn per endpoint from §2
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs        table structs
│   │   │   ├── queries.rs       sqlx queries
│   │   │   └── upsert.rs        non-destructive sync writes
│   │   ├── grades.rs            ← THE CORE. weighted/points modes, solver
│   │   ├── triage.rs            ranking algorithm
│   │   ├── notify.rs            scheduling, dedupe
│   │   ├── ical.rs              .ics export
│   │   └── mcp/                 M5 — stdio server
│   ├── migrations/
│   ├── tests/
│   │   └── grades_test.rs       ← the test suite that matters
│   └── tauri.conf.json
│
└── src/
    ├── main.tsx
    ├── App.tsx                  router + theme provider
    ├── styles/globals.css       design tokens from §9
    ├── routes/                  one file per screen
    │   ├── Triage.tsx
    │   ├── CourseDetail.tsx
    │   ├── Calendar.tsx
    │   └── Contacts.tsx
    ├── components/
    │   ├── ui/                  shadcn primitives — DO NOT hand-edit
    │   ├── grade/               GradeGapBar, GradeDial, WhatDoINeedDialog
    │   ├── triage/              TriageRow, EstimateInput, ImpactBadge
    │   └── layout/              AppShell, Sidebar, SemesterProgress, ThemeToggle
    ├── hooks/                   useCourses, useGrades, useSync, useReducedMotion
    ├── lib/
    │   ├── ipc.ts               typed wrappers over every invoke() call
    │   ├── format.ts            percentages, dates, relative time
    │   └── utils.ts             cn()
    └── types/                   TS types mirroring the Rust command returns
```

Rules:

- The frontend never contains grade math. It renders what `commands/grades.rs` returns. If a percentage is computed in TypeScript, that's a bug.
- Every `invoke()` goes through a typed wrapper in `lib/ipc.ts`. No raw invoke calls in components.
- `components/ui/` is generated by the shadcn CLI. Wrap it, don't edit it.

---

## 11. Documentation

Write these as real documents, not stubs. Each answers a question an engineer would actually ask.

- **`README.md`** — what this is in three sentences, a screenshot placeholder, prerequisites (Rust, Node, a Canvas token), setup in copy-pasteable commands, how to run dev and build a release, and a **"Where do I look first?"** section: a table mapping "I want to change X" → the file. Grade math → `src-tauri/src/grades.rs`. Canvas request shapes → `canvas/endpoints.rs`. What shows on the home screen → `routes/Triage.tsx`. Colors and type → `styles/globals.css`.
- **`docs/ARCHITECTURE.md`** — the data flow end to end: Canvas → client → upsert → SQLite → command → typed IPC → hook → component. An ASCII diagram. Why grade math lives in Rust. What's local-only vs. Canvas-derived. What happens on sync failure.
- **`docs/CANVAS_API.md`** — every endpoint used, a trimmed sample response for each, the pagination and rate-limit behavior, and a **gotchas** list capturing every surprise found during implementation. This file is the one that saves the next person a full day.
- **`docs/GRADE_ENGINE.md`** — both grading modes with worked examples, the current-vs-projected distinction, the solver derivation, every exclusion rule, and the list of edge cases covered by tests.
- **`docs/UI_SYSTEM.md`** — the token table, type scale, the signal-color contract, motion rules, and when to use Dialog vs. Sheet vs. toast.
- **`docs/DEVELOPMENT.md`** — how to add a Canvas endpoint, add a command, add a migration, add a shadcn component. Common failure modes (token expired, migration conflict, theme flash).

---

## 12. Code comments and repo hygiene

### Comments

Comment the *why*, never the *what*. `// increment counter` above `i += 1` is noise; `// Canvas returns 403 with a rate-limit body instead of 429` is the reason the next person doesn't rewrite this block.

- **Every file opens with a header comment** stating its job, what calls it, and what it calls. Rust: `//!` module docs. TS: a block comment.
- Rust: `///` doc comments on every public function — purpose, params, failure modes. Non-obvious logic gets an inline `//`.
- `grades.rs` is the exception to brevity — comment it heavily. Every formula gets the reasoning above it and a worked example in the doc comment. Someone reading it in a year (me) must be able to verify the math without re-deriving it.
- TypeScript: TSDoc on every exported component and hook. Props interfaces get per-field comments where the name isn't self-evident.
- Mark every deliberate deviation from Canvas's own behavior with `// NOTE:` and the reason.
- `// TODO(M4):` tagged with the milestone, never bare TODOs.

### `.gitignore`

```gitignore
# Rust / Tauri
/src-tauri/target/
/src-tauri/gen/
**/*.rs.bk

# Node
node_modules/
dist/
dist-ssr/
.vite/
*.local

# Secrets — nothing here ever gets committed
.env
.env.*
!.env.example
*.pem
*.key
canvas_token*

# Local data — contains my actual grades
*.db
*.db-shm
*.db-wal
*.sqlite
*.sqlite3
/data/
*.ics

# Editor / OS
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json
*.swp

# Build artifacts
/src-tauri/Cargo.lock.orig
*.log
```

The token lives in the OS keyring and the database holds my real grades — neither belongs in git, even in a private repo. Add the `.db` entries *before* the first sync runs, not after.

---

## Appendix — implementation deviations

Deviations from this spec made during implementation, each with its reason. Kept here so the spec stays the contract and the differences stay visible.

| § | Spec says | Built as | Why |
|---|---|---|---|
| 1, 9.1 | macOS Keychain | Per-platform keyring backend: Keychain (macOS), Credential Manager (Windows), kernel keyutils (Linux) | Development happens on Windows; the WebView2 cookie-deadlock warning in §2.0 applies directly rather than hypothetically |
| 5 | `⌘\`, `⌘1`–`⌘4`, `⌘K` | Resolved per platform in `src/lib/platform.ts` — `Ctrl` off macOS | `⌘` printed on a Windows tooltip reads as a rendering bug; `Ctrl+1` on macOS collides with the Spaces switcher |
| 9.1, 9.6 | One value per signal colour | Two tiers per signal (`X` fill, `X-fg` text), with light-mode values darkened | The spec's own 4.5:1 requirement cannot hold with one value — measured, the light-mode signals are 2.23 / 2.03 / 3.16 / 4.53. See docs/UI_SYSTEM.md |
| 9.1 | `--accent` for interactive affordances | CSS variable keeps the name; Tailwind exposes it as `brand`, because shadcn reserves the class name `accent` for hover fills | Unedited shadcn components use `bg-accent` to mean hover grey; letting that resolve to periwinkle would repaint every primitive |
| 9.1 | — | Added `--accent-solid` `#6D5AFF` for button fills | White on `#7C6BFF` is 3.89:1 — a primary button label failing AA in both themes |
| 9.6 | Theme persisted to the DB | JSON file in the app config dir, same interface | The database arrives in M1; the theme toggle has to work in M0. TODO(M1) migrates it |
| 10 | Four route files | Five, plus a dev-only token page | The sidebar's Courses nav item needs an index destination; `/dev/tokens` measures §9.6 contrast live and is stripped from release builds |
| 12 | `.gitignore` as listed | Same, plus Windows/Linux debris and session-file backstops | The list assumes macOS |
