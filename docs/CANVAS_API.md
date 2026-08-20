# Canvas API

Everything this app asks Canvas for, and every surprise found along the way.

**Base:** `https://sjsu.instructure.com/api/v1`
**Method:** `GET`, exclusively. There is no code path in this repo that writes to Canvas.
**Header on every request:** `Accept: application/json+canvas-string-ids`

> **Status.** M0 is a scaffold; nothing here has run against SJSU's instance yet. Sample responses below are trimmed from Canvas's public API documentation and marked **⚠ unverified**. As M1 lands, each one gets replaced with a real trimmed response from `sjsu.instructure.com` and the marker removed. **Never invent a field name** — if you are unsure a field exists, fetch the endpoint once, log the raw JSON, and confirm against what came back (SPEC.md §8).

---

## Authentication

See [the README](../README.md#authentication) for the user-facing version. Mechanically:

| Tier | Credential | Applied as |
|---|---|---|
| 0 | Admin-issued access token | `Authorization: Bearer <token>` |
| 1 | Harvested browser session | `Cookie:` header from `webview.cookies_for_url()` |
| 2 | Private `.ics` feed URL | No auth at all; not the JSON API |

Tiers 0 and 1 sit behind one `AuthMode` enum so swapping is a one-line change:

```rust
enum AuthMode { Token(String), Session(CookieJar) }
```

### Cookie harvesting — the three things that cost time

**Read cookies from an async command, on a separate thread.** Tauri documents a WebView2 deadlock when cookies are read from a synchronous command or an event handler. This repo is developed on Windows, so that is not hypothetical — but do it async on every platform anyway. A deadlock that only reproduces on one target is the worst kind to debug.

**Cookies come back only for `http`/`https` URLs.** Not for `tauri://`. Query `https://sjsu.instructure.com` specifically.

**`document.cookie` is not enough.** The Canvas session cookie is HTTP-only. Only `cookies_for_url()` returns it. Any approach that reaches for `document.cookie` from the login webview will appear to work — it returns *some* cookies — and then 401 on the first real request.

### Detecting a dead session

Three signals, one meaning:

1. `401 Unauthorized`
2. A `302` whose `Location` points at the SSO host rather than Canvas
3. A `200` with `Content-Type: text/html` where JSON was expected — this is Canvas serving the login page

Any of the three → `ErrorKind::SessionExpired` → the UI shows a non-blocking "Reconnect to Canvas" banner and marks visible grades stale. The app never crashes on this and never silently presents stale data as current.

---

## Endpoints

### Active courses, with scores and teachers

```
GET /courses
  ?enrollment_state=active
  &include[]=total_scores
  &include[]=teachers
  &include[]=term
  &include[]=syllabus_body
```

The same response carries `apply_assignment_group_weights`, which decides whether the course is graded in weighted or points mode — there is no separate call for it.

**⚠ unverified** — trimmed shape:

```jsonc
{
  "id": "1234567",                       // string, because of the string-ids header
  "name": "Introduction to Computer Networks",
  "course_code": "CS 158A",
  "apply_assignment_group_weights": true,
  "term": { "id": "42", "name": "Fall 2026",
            "start_at": "2026-08-19T07:00:00Z", "end_at": "2026-12-18T07:00:00Z" },
  "syllabus_body": "<p>…</p>",           // only present with include[]=syllabus_body
  "enrollments": [                       // only present with include[]=total_scores
    { "type": "student", "computed_current_score": 85.0, "computed_final_score": 68.0 }
  ],
  "teachers": [ { "id": "999", "display_name": "…" } ]
}
```

### Assignment groups and weights

```
GET /courses/:id/assignment_groups
  ?include[]=assignments
  &include[]=submission
```

`group_weight` is only meaningful when the course's `apply_assignment_group_weights` is true. It is populated regardless.

### Assignments, including rubric

```
GET /courses/:id/assignments
  ?include[]=submission
  &include[]=score_statistics
```

Rubric criteria arrive **embedded on the assignment object** as `rubric` and `rubric_settings`. There is no separate rubric call.

**⚠ unverified** — the fields that matter:

```jsonc
{
  "id": "7654321",
  "name": "Project 2 — Routing",
  "due_at": "2026-10-14T06:59:59Z",      // UTC. null is common and legal.
  "points_possible": 100.0,              // null happens. 0 happens.
  "omit_from_final_grade": false,
  "assignment_group_id": "555",
  "submission_types": ["online_upload"],
  "html_url": "https://sjsu.instructure.com/courses/1234567/assignments/7654321",
  "rubric": [ { "id": "_1234", "points": 25.0, "description": "Correctness",
                "ratings": [ { "points": 25.0, "description": "Full marks" } ] } ],
  "rubric_settings": { "points_possible": 100.0, "free_form_criterion_comments": false },
  "submission": {                        // only with include[]=submission
    "score": 88.0,                       // null = ungraded. NOT zero.
    "grade": "88",
    "submitted_at": "2026-10-13T22:41:03Z",
    "graded_at": "2026-10-20T18:02:11Z",
    "workflow_state": "graded",
    "excused": false,
    "missing": false,
    "late": true
  }
}
```

### My enrollment grades

```
GET /courses/:id/enrollments?user_id=self
```

`grades.current_score` and `grades.final_score`. This is the number the grade engine reconciles against — see [GRADE_ENGINE.md §3](GRADE_ENGINE.md#reconciliation-against-canvas).

### Instructors and TAs

```
GET /courses/:id/users
  ?enrollment_type[]=teacher
  &enrollment_type[]=ta
  &include[]=email
  &include[]=avatar_url
  &include[]=bio
```

`email` is frequently absent depending on the institution's privacy settings. Expect `None` and render the row without a `mailto:` rather than hiding the instructor.

### Course files

```
GET /courses/:id/files
```

Syllabi and rubric PDFs. Often `403` for students — a permissions error here is normal and must not fail the course's sync.

### Planner

```
GET /planner/items?start_date=2026-08-19T00:00:00Z
```

Everything with a date attached, across all courses, in one call. Useful as a cross-check that no assignment was missed by the per-course sweep.

---

## Pagination

**Canvas paginates with the `Link` header. There is no page count and no total.**

```http
Link: <https://sjsu.instructure.com/api/v1/courses?page=2&per_page=100>; rel="next",
      <https://sjsu.instructure.com/api/v1/courses?page=1&per_page=100>; rel="first",
      <https://sjsu.instructure.com/api/v1/courses?page=5&per_page=100>; rel="last"
```

Follow `rel="next"` until it is absent. Default `per_page=100`.

**Write one generic paginating fetch helper and route every call through it.** An endpoint that forgets returns the first 100 rows and warns about nothing — the app just quietly does not know about your later assignments. `rel="last"` is not always present, so do not depend on it.

---

## Rate limiting

Canvas uses a leaky bucket, reported per response:

```http
X-Rate-Limit-Remaining: 587.4
X-Request-Cost: 0.0532
```

Rules:

- Below `100` remaining → back off before being told to.
- **Canvas rejects with `403` and a rate-limit body, not `429`.** Check the body before treating a 403 as an auth failure. Mistaking the two makes the client look broken when it is merely impatient — and makes it retry the login flow, which is worse.
- Retry rate-limit 403s with exponential backoff.
- **Never `join_all` over courses unbounded.** Concurrency is capped at 4 in `client.rs` rather than at each call site, so the cap cannot be bypassed by a new endpoint that forgets.
- Sync at most every 30 minutes. Manual "Sync now" bypasses the interval floor, not the concurrency cap.

The intent is to behave like a person with a few tabs open.

---

## Deserialisation rules

**Every field is `Option<T>`.** Canvas omits keys constantly depending on permissions, course settings and enrollment type. A field present in every course you have looked at so far is not guaranteed in the next one.

**Never `unwrap_or_default()` a score.** `score: null` means *not graded yet*. `unwrap_or_default()` turns it into `0.0`, which is a real grade, and the difference between those two is the entire distinction between the current and projected numbers. Handle `None` explicitly, at the point where you know what it means.

**Store the raw JSON.** Every synced entity gets a `raw_json TEXT` column alongside its parsed fields. When Canvas returns a shape nobody anticipated, the data is already on disk and the fix is a parser change — not another semester of waiting for the same assignment to come round again.

---

## Gotchas

Running list. Add to it as M1 turns assumptions into facts.

| # | Gotcha | Consequence if missed |
|---|---|---|
| 1 | SJSU disables student-generated tokens | No Bearer token exists; Tier 1 or Tier 2 or nothing |
| 2 | Session cookie is HTTP-only | `document.cookie` looks like it works, then 401s |
| 3 | Reading cookies synchronously deadlocks WebView2 | App hangs on Windows, works on macOS |
| 4 | `cookies_for_url` ignores `tauri://` | Empty jar, no error |
| 5 | Rate-limit rejection is `403`, not `429` | Retried as an auth failure; login flow re-triggers |
| 6 | Pagination is `Link`-header only | Silently truncated at 100 rows |
| 7 | `score: null` ≠ `score: 0` | Ungraded work reported as a zero; projected and current collapse |
| 8 | `excused` removes from numerator *and* denominator | An excused assignment scored as zero |
| 9 | `points_possible` can be `0` or `null` | Division by zero, or a spurious 0% |
| 10 | `group_weight` is populated even in points mode | Weights applied to a course that does not use them |
| 11 | Large IDs lose precision in JS | Send `Accept: application/json+canvas-string-ids` and treat IDs as strings everywhere |
| 12 | `/courses/:id/files` often 403s for students | A permissions error must not abort that course's sync |
| 13 | `due_at` is UTC and often `null` | Off-by-one days if rendered without local conversion; sorting blows up on null |
| 14 | Session expiry can present as `200 text/html` | Login page parsed as JSON, confusing parse error instead of a reconnect prompt |
