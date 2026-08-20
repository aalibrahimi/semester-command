# The grade engine

`src-tauri/src/grades.rs`. Everything else in this app is plumbing; this is the part that has to be correct, because real decisions get made from its output.

Every number in this document has been checked by hand. If you change a formula, change the worked example that goes with it, and add the case to `src-tauri/tests/grades_test.rs`.

---

## 1. Two grading modes

Canvas computes a course grade one of two ways, per course, decided by the boolean `apply_assignment_group_weights` on the course object.

### Weighted mode

```
group_pct_i = Σ(earned in group i) / Σ(possible in group i)
course_pct  = Σ(group_pct_i × weight_i) / Σ(weight_i for groups with any graded work)
```

**The denominator is the whole game.** Groups with no graded work yet are excluded, and the remaining weights are renormalised so they sum to 1. Getting this wrong is the single most common bug in third-party Canvas grade calculators, and it fails in the direction that feels right — you divide by the total weight because the total weight is obviously 100%, and every grade in week four comes out catastrophically low.

#### Worked example — the empty-group case

Three groups: **Homework 30%**, **Exams 50%**, **Final 20%**. It is week four. Only homework has been graded, at 45/50.

```
group_pct(Homework) = 45 / 50 = 0.90
Exams   → no graded work → excluded
Final   → no graded work → excluded

denominator = 0.30                      ← not 1.00
course_pct  = (0.90 × 0.30) / 0.30
            = 0.90                      → 90.0%
```

Divide by 1.00 instead and you get **27.0%**, which is both wrong and alarming. The renormalisation is also what makes the number agree with what Canvas itself displays, which is why the reconciliation check in §3 catches this class of bug immediately.

### Points mode

```
course_pct = Σ(all earned) / Σ(all possible)
```

Group weights are ignored completely. Note that a points-mode course may still have non-null `group_weight` values sitting in the database, because Canvas sends them regardless. They are not meaningful and must not be read.

---

## 2. Exclusions

Applied identically in both modes.

| Condition | Effect |
|---|---|
| `submission.excused == true` | Removed from **numerator and denominator**. Excused is not zero — it is as though the assignment was never set. |
| `assignment.omit_from_final_grade == true` | Excluded entirely, in both modes. |
| `points_possible == 0` | Contributes 0 to the denominator. Must not divide by zero. |
| `points_possible == null` | Not gradeable. Excluded. |
| `score == null` and not excused | **Ungraded.** Excluded from *current*, counted as zero in *projected*. This is the distinction the whole app rests on. |

### Worked example — excused

Homework group, five assignments of 20 points each. Four graded at 18, 19, 17, 18. The fifth is **excused**.

```
correct:   (18+19+17+18) / (20×4) = 72 / 80  = 0.90   → 90.0%
wrong:     (18+19+17+18) / (20×5) = 72 / 100 = 0.72   → 72.0%
```

Treating an excused assignment as a zero costs 18 points of homework grade for something the instructor explicitly let you skip.

### Zero-point assignments

A group made entirely of zero-point assignments has `Σ(possible) == 0`. Its percentage is undefined, not 0%. It is treated as **ungraded** — excluded from the weighted denominator exactly like an empty group. Returning 0% here would drag a course grade down using assignments that cannot affect a grade by construction.

---

## 3. Current vs. projected

Always both. Never one without the other.

**Current** excludes ungraded work from the denominator. This is the number Canvas shows. It is optimistic by construction: it describes a world in which everything still outstanding gets graded exactly as well as everything already done.

**Projected** counts every ungraded assignment as a zero. This is where you land if you stop working today. It is the honest number.

### Worked example

**CS 152.** Weighted: Homework 30%, Exams 50%, Final 20%.

| Group | Weight | Graded | Possible |
|---|---|---|---|
| Homework | 30% | 90 | 100 |
| Exams (midterm) | 50% | 82 | 100 |
| Final | 20% | — | 200 |

**Current** — the Final group has no graded work, so it drops out and the remaining 0.80 of weight is renormalised:

```
= (0.90 × 0.30 + 0.82 × 0.50) / (0.30 + 0.50)
= (0.270 + 0.410) / 0.80
= 0.680 / 0.80
= 0.850                                 → 85.0%
```

**Projected** — the Final is counted as 0/200, so every group now has "graded" work and the denominator is the full 1.00:

```
= 0.90 × 0.30 + 0.82 × 0.50 + 0.00 × 0.20
= 0.270 + 0.410 + 0.000
= 0.680                                 → 68.0%
```

**Gap = 17.0 points.**

Those two numbers describe the same course. "85%" alone reads as a comfortable B, and the student who reads it that way and stops working gets a D+. The gap *is* the motivation, which is why the Grade Gap bar (see [UI_SYSTEM.md](UI_SYSTEM.md)) renders the space between them as an unstable hatch rather than as empty track.

### Reconciliation against Canvas

After computing **current**, compare it to `enrollments[].grades.current_score` from the API. **If they differ by more than 0.1 points, surface a visible warning naming the course.**

We do not silently prefer our arithmetic to Canvas's. A mismatch means one of:

- an unmodelled course rule — a drop-lowest policy, a curve applied outside the gradebook, an extra-credit group with weight over 100%
- an instructor grading by hand in a way the group weights do not describe
- a real bug in this file

All three are things the user must know about *before* planning around the output. The tolerance is 0.1 rather than exact equality because Canvas rounds its own reported score, and chasing float equality across two languages would produce a permanent false alarm.

---

## 4. The solver — "what do I need?"

### Uniform case — "what do I need to average on everything left"

```
required_avg = (target − Σ locked_contribution) / remaining_weight
```

`locked_contribution` is what already-graded work contributes to the *final* percentage. `remaining_weight` is the share of the final grade still in play.

> **Subtlety worth the ink:** `remaining_weight` is **not** the sum of the weights of groups that still have work. It is the weight-share attributable to the remaining *points*. A group that is half graded contributes half its weight to `locked_contribution` and half to `remaining_weight`. Treating the whole group as "remaining" understates what you already banked and asks you for a higher score than you actually need.

#### Worked example

Same CS 152, but the Exams group has a second exam still to come.

| Group | Weight | Graded | Remaining |
|---|---|---|---|
| Homework | 30% | 90/100 | — |
| Exams | 50% | 82/100 (midterm) | 100 pts (exam 2) |
| Final | 20% | — | 200 pts |

```
locked_contribution
  = 0.30 × (90/100)          Homework, fully graded
  + 0.50 × (82/200)          Exams: 82 earned of the group's 200 total points
  = 0.270 + 0.205
  = 0.475

remaining_weight
  = 0.50 × (100/200)         half the Exams group's points are still open
  + 0.20 × (200/200)         all of the Final group's
  = 0.250 + 0.200
  = 0.450

target 85%:
required_avg = (0.850 − 0.475) / 0.450
             = 0.375 / 0.450
             = 0.8333                   → 83.3% on everything remaining
```

Substituting back: `0.30 × 0.90 + 0.50 × (82 + 100 × 0.8333)/200 + 0.20 × 0.8333 = 0.850`. ✓

### Single-assignment case — "what do I need on the final"

Treat the target assignment's score as `x`, hold every other projection fixed, and solve the linear equation. It is linear in both grading modes, which is why there is a closed form and not a search.

Using the first CS 152 table, where the Final is the only ungraded work:

```
course_pct(x) = 0.680 + 0.20x

target 85%:  0.20x = 0.850 − 0.680 = 0.170  →  x = 0.850  → 85%, or 170/200
target 90%:  0.20x = 0.900 − 0.680 = 0.220  →  x = 1.100  → 110%  ✗
target 65%:  0.20x = 0.650 − 0.680 = −0.030 →  x = −0.150 → −15%  ✗
```

### The three outcomes, and what each must say

`SolverAnswer` has exactly three variants, because there are exactly three things that can be true.

**Reachable** — give it as a percentage **and** as raw points:

> You need **85.0%** on the Final — **170/200**.

86% is abstract. 170 out of 200 is a thing you can picture.

**Unreachable** (`x > 100%`) — never just "no". Give the ceiling:

> **Not reachable.** Highest possible grade from here: **88.0% (B+)**.

(`0.680 + 0.20 × 1.00 = 0.880`.)

**Already locked in** (`x < 0%`) — give the floor:

> **Already locked in.** You could score 0 on the Final and still get a **68.0% (D+)**.

---

## 5. Grade scale

Configurable per course. Default:

| Letter | Cutoff |
|---|---|
| A | 93.0 |
| A− | 90.0 |
| B+ | 87.0 |
| B | 83.0 |
| B− | 80.0 |
| C+ | 77.0 |
| C | 73.0 |
| C− | 70.0 |
| D+ | 67.0 |
| D | 63.0 |
| D− | 60.0 |
| F | 0.0 |

SJSU instructors set their own cutoffs and plenty of them curve, so the thresholds are editable per course and stored in `targets`. A course whose syllabus says "90+ is an A, no minus grades" should be entered that way rather than mentally translated on every glance.

---

## 6. Test coverage

`src-tauri/tests/grades_test.rs`. Every case below exists because it produces a *plausible* wrong answer, not an obviously wrong one.

| # | Case | What breaks without it |
|---|---|---|
| 1 | Weighted course with an empty group | Denominator not renormalised → 27% instead of 90% |
| 2 | Excused submission | Counted as zero → 72% instead of 90% |
| 3 | Zero-point assignment | Division by zero, or a spurious 0% dragging the course down |
| 4 | `omit_from_final_grade` | Counted, skewing both numbers |
| 5 | Single graded item | Degenerate denominator; off-by-one in renormalisation |
| 6 | Reconciliation vs. Canvas `current_score` | Silent divergence, and the user trusts the wrong number |
| 7 | Points mode with group weights present | Weights read when they should be ignored |
| 8a | Solver — reachable | — |
| 8b | Solver — unreachable | Returns a required score above 100 instead of the ceiling |
| 8c | Solver — already locked | Returns a negative percentage instead of the floor |
| 9 | Partially-graded group in the uniform solver | `remaining_weight` computed per group instead of per point → asks for a higher score than needed |

Status: **not yet written.** They land in M2, before any grade reaches the UI (SPEC.md §8). `cargo test` passing with zero real tests is not the same as `cargo test` passing.
