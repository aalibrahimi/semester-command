# Graduation Plan — Handoff

**Student:** Ali Alibrahimi · BS Computer Science and Linguistics · San José State University
**Primary target:** Fall 2027 · **Fallback:** Spring 2028
**Source of truth:** MyProgress audit generated 08/22/2026 1:10 PM + SJSU 2025–2026 catalog roadmap
**App:** Semester Command (`github.com/aalibrahimi/semester-command`), Graduation module
**Doc date:** 2026-08-23

---

## 1. Why this document exists

The original plan in the app was internally inconsistent in ways that would have cost a
semester or a year:

- Two courses (MATH 39, LING 111) were counted as enrolled in Fall 2026 but were never
  registered, inflating the term from 6 courses to 8 and producing a false "On Track".
- MATH 31 was unslotted while MATH 161A — which requires it — sat in Spring 2027.
- LING 165 was believed to be gated by LING 115. It is not.
- The graduation target was changed to Fall 2027 without moving a single course, leaving a
  required capstone scheduled *after* the graduation term.

Everything below is the corrected picture, verified against the audit and the public catalog.

---

## 2. Verified standing (from the 08/22/2026 audit)

### Satisfied — do not re-plan these
| Requirement | Status |
|---|---|
| Minimum 120 units | Taken (counts in-progress) |
| PE — Physical Education | Taken |
| WID eligibility + WID: CS & Linguistics | Taken |
| AI US2 — US Constitution | Taken (transfer, `TRAI US23`) |
| AI US3 — CA Government | Taken (transfer, `TRAI US23`) |
| 50 units outside community college | 62 taken / 50 required |
| 30 units residence | 40 taken / 30 required |
| 24 UD units in residence | 27 taken / 24 required |
| CSLN LING 101 | Taken — Fall 2025, grade B+, at SJSU |

### Open
| Block | Detail |
|---|---|
| 40 Total Upper Division Units | 27 taken, **13 needed** — auto-resolving (~24 UD units already planned) |
| AI US1 — American History | Enrolled (HIST 15, Fall 2026) |
| GE Area 6 — Ethnic Studies | 1 of 13 eligible courses |
| GE UD Area 2/5 | 1 of 48 eligible courses |
| CSLN MATH 31 | **Retake** — 4 units |
| CSLN MATH 39 | 3 units |
| CSLN MATH 161A | 3 units |
| CSLN CS 156 | 3 units |
| CSLN CS 171 | 3 units |
| CSLN LING 111 | 3 units |
| CSLN LING 165 | 3 units |
| CSLN LING UD choice | 1 of: LING 113/114/125/161/162/166/167 |
| CSLN CS Upper Division Elective | 1 of 14 |
| CSLN LING Upper Division Elective | 1 of 13 |
| CSLN Major Electives | 15 required / 3 taken / **12 needed — only 6 itemized. UNRESOLVED.** |

**Total open: 12 items, 37 units.** This is a floor, not a firm number — see §7.

### GPA
| Measure | Value |
|---|---|
| Major GPA (CSLN Major Requirements) | **3.056** (2.000 required) |
| SJSU GPA | 2.459 |
| Overall GPA | 2.527 |

The major GPA is the one that reflects capability. The gap between 3.056 and 2.459 is largely
one 4-unit D in MATH 31 (Fall 2025). Major coursework is not the failure mode; math is.

---

## 3. Verified prerequisite facts

Sourced from the SJSU catalog and the official CS & Linguistics roadmap, not from memory.

| Chain | Rule | Source | Consequence if broken |
|---|---|---|---|
| CS 146 → CS 171 | C- or better; **CS 171 is Fall-only** | Catalog | **Costs a full year** |
| MATH 31 → MATH 161A | C- or better | Catalog | Costs a semester |
| LING 101 → LING 165 | LING 101 only — **LING 115 is not a prereq** | Catalog / enrollment req | None; already satisfied |
| MATH 39 prereq | **UNVERIFIED** — do not assume | — | Breaks Spring 2027 if it needs MATH 31 |
| LING 111 → LING 113 | **UNVERIFIED** | — | Breaks the LING UD choice slot |

Major rule: *"A grade of 'C-' or better is required for courses being used to meet any
requirement."* This is why the MATH 31 D earns elective units but not the major requirement.

**CS 171 being Fall-only is the single hard gate on the entire degree.** Fall 2027 is the
earliest possible graduation. There is no arrangement of courses that beats it.

---

## 4. The schedule

| Term | Courses | Units |
|---|---|---|
| **Fall 2026** (current) | CS 146, CS 154, HIST 15, LING 112, LING 115, LING 124 | 18 |
| **Spring 2027** | MATH 31 (4, retake), MATH 39, LING 111, GE Area 6 | 13 |
| **Summer 2027** | MATH 161A, GE UD 2/5, LING 122 | 9 |
| **Fall 2027 — GRADUATION** | CS 171, CS 156, LING 165, LING 113, CS 157A | 15 |
| Spring 2028 | *(empty — fallback container only)* | 0 |

**Design rationale:**
- Spring 2027 is deliberately math-only and light. Calculus II is the retake, it carries the
  worst history, and it gates MATH 161A. It gets a protected term with no CS beside it.
- Summer 2027 exists to run MATH 161A immediately after MATH 31 while it's fresh.
- Fall 2027 is 15 units entirely in CS and LING — the subjects carrying a 3.056.
- **CS 133 is deliberately off the timeline**, in the pending-advisor bin. It was filling a
  major-elective slot that may not exist (§7).

**Fall 2026 note:** keep all six courses. An earlier recommendation to drop LING 112 before the
Sep 15 deadline was made before the major GPA was visible and is withdrawn. Use the first three
weeks of graded work as the signal instead; if CS 146 is genuinely going badly by the second
week of September, drop then.

---

## 5. Grade forgiveness on MATH 31 — do not skip this

SJSU policy (University Policy F08-2):
- Replaces the first attempt's grade in the GPA calculation. The original stays on the
  transcript but is removed from GPA and units earned.
- Only qualifies where the first grade was **C- or lower**. A D qualifies.
- Both attempts must be at SJSU. MATH 31 Fall 2025 was at SJSU — this would be attempt 2, so
  no Repeat Exception petition is needed (that's required from attempt 3).
- Cap: 16 units total.
- GPA is refreshed with the new grade **regardless of whether it is higher or lower**.
- **Deadline to register for a repeated course = last day to add/drop for that term.**

Estimated effect: replacing a 4-unit D with a B adds 8 grade points against a small SJSU graded
base — on the order of **+0.3 to SJSU GPA**. Nothing else on the remaining list moves the number
comparably. Treat the Spring 2027 add deadline as hard.

---

## 6. What's already built

**Commit `a48ee1b`** — data corrections + Degree Blocks view
- Target term → Fall 2027 primary, Spring 2028 fallback.
- MATH 31 marked 4-unit retake, grade-forgiveness eligible.
- Removed the false "LING 115 unlocks LING 165" claim everywhere.
- AAS 1 and ANTH 160 demoted from named requirements to choice blocks (1 of 13 / 1 of 48).
- New Degree Blocks tab: blocks grouped Open / In progress / Satisfied, UD-units meter badged
  auto-resolving, Major Electives flagged UNRESOLVED.
- Dual-GPA card with major GPA foregrounded + grade-forgiveness simulator seeded with MATH 31.

**Commit `3456fbc`** — reschedule + validator
- Timeline moved to match §4. MATH 39 and LING 111 removed from Fall 2026.
- CS 133 → pending-advisor bin, cross-referenced from the Major Electives block.
- Derived numbers fixed: Critical Left, Semesters Left (measured to primary target), plan units
  with MATH 31 at 4, removed the contradictory "7 transfer credits banked" line.
- Validator inside `mergePlan` (cannot be bypassed; every mutation revalidates):
  1. no required course scheduled after the primary graduation term
  2. no course scheduled at or before its prereq
  3. no requirement block left unslotted
- Negative tests confirmed all three rules fire.

---

## 7. Still to build

### Rule 4 — term availability (highest priority)
The validator checks structure, not availability. It cannot currently catch a course scheduled
in a term it isn't offered — the same class of bug as the original one: internally coherent,
externally impossible.

Three unflagged instances sit in the current plan, all in **Summer 2027**: MATH 161A, GE UD 2/5,
LING 122. SJSU summer offerings are a fraction of the fall/spring catalog. MATH 161A *can only*
be summer here, because MATH 31 occupies Spring 2027 — so Fall 2027 graduation currently rests
on an unverified assumption that Summer 2027 offers Applied Probability & Statistics.

Implement: per-course `availability` field (fall / spring / summer flags), sourced from the
class schedule archive rather than assumed. LING 124 already carries "Fall only", so the field
partly exists — it just isn't enforced. Add rule 4: *no course scheduled in a term it isn't
offered.*

### LING 165 back on the critical path
It was removed because its prereq is satisfied — correct reasoning about the wrong risk. It now
sits in the graduation term and has historically run mostly in springs. If there is no Fall 2027
section, the cost isn't a course, it's the semester. Critical means "slipping this costs
semesters," which is still true; only the reason changed.

### Three-state badge
"On Track" currently renders green with zero structural breaks while two questions are open
(Major Electives, MATH 39 prereq). That is how a confident-but-wrong display comes back through
a different door. Green should require **no breaks AND no unverified flags**. Middle state:
`On Track · 2 unverified`.

### Unit count is a floor
37 remaining units assumes Major Electives holds only the 6 itemized units. If the block holds
12, it's 43 units and two more courses, and CS 133 comes out of the pending bin into a plan with
no room for it. Do not harden the number until §8 resolves.

---

## 8. Advising appointment — book this week

All three unknowns collapse into one conversation. Channel: **College of Science Student Success
Center — Upper Division Advising** (already in the Canvas course list).

1. **Major Electives.** The audit says 15 units required / 3 taken / 12 needed, but itemizes only
   two elective slots (CS UD elective + LING UD elective = 6 units). What fills the other 6
   units? Name every course eligible for that block. *This determines whether the plan is 12
   courses or 14.*

2. **MATH 39 prerequisite.** Does Linear Algebra I require MATH 31? If yes, Spring 2027 breaks
   and MATH 39 moves to Summer or Fall 2027.

3. **Graduation application deadline.** Is **Oct 9, 2026** the deadline for *Fall 2027*
   graduation, or for Spring 2027 graduates? These run on a different cycle than most students
   expect. **Verify by phone, not by web.** This is the one item where being wrong costs a
   semester regardless of how good the plan is.

Secondary, if time allows:
4. Can LING 122 double-count into GE UD Area 2/5? The roadmap recommends it for that area; the
   audit shows it only in the LING UD elective list, and the 2/5 list is truncated at 10 of 48.
   If yes, one course comes off the plan.
5. Does Summer 2027 reliably offer MATH 161A? (See §7.)

---

## 9. Deadlines

| Date | Item | Status |
|---|---|---|
| Sep 15, 2026 | Fall 2026 last day to drop without W / last day to add | Verify on registrar page |
| Oct 9, 2026 | Graduation application priority deadline | **Which term does it cover? Verify by phone** |
| Feb 6, 2027 | Spring 2027 add deadline — MATH 31 retake + forgiveness paperwork | Verify |
| Mar 19, 2027 | Graduation application final deadline | Verify |
| Spring 2028 | Dates unpublished | Unverified |

---

## 10. Bottom line

Twelve courses remain, one of which is the one that's beaten you before — and this time the
retake erases the old grade while you do it. The degree is not far. The three questions in §8
are now the bottleneck, not the software.