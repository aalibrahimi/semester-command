# Guide migration report

24 guides · blocks: prose 286 · definition 213 · table 32 · example 80 · trap 26 · check 108

## Left as prose (118)

| guide | section | block | from | reason | preview |
|---|---|---|---|---|---|
| cs146/0-notation | exponents | exponents.1 | figure | SVG figure dropped; caption kept as prose | Each row doubles the row above. Row i has 2ⁱ boxes. Merge sort's recursion tree is exactly |
| cs146/0-notation | log | log.0 | why | why-callout has no schema type — kept as prose | Why it exists |
| cs146/0-notation | log | log.1 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | Halving 16 down to 1 |
| cs146/0-notation | sum | sum.2 | why | why-callout has no schema type — kept as prose | Why this particular sum matters |
| cs146/0-notation | sum | sum.3 | figure | SVG figure dropped; caption kept as prose | 1+2+3+4+5 drawn as a staircase (blue). A flipped copy (grey) completes a 5×6 rectangle. Tw |
| cs146/0-notation | nlog | nlog.1 | stepper | interactive stepper (3 frames) flattened to numbered prose — loses click-through | Evaluating n^(log₂ 8) |
| cs146/0-notation | bigo | bigo.0 | why | why-callout has no schema type — kept as prose | Why it exists |
| cs146/0-notation | bigo | bigo.2 | figure | SVG figure dropped; caption kept as prose | Past n₀, the curve c·g(n) stays above f(n) forever. That's all the definition says. Below  |
| cs146/0-notation | induction | induction.0 | why | why-callout has no schema type — kept as prose | Why it exists |
| cs146/2-adts-invariants-insertion | why | why.0 | why | why-callout has no schema type — kept as prose | The whole lecture in one idea |
| cs146/2-adts-invariants-insertion | stack | stack.1 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | An array stack, operation by operation |
| cs146/2-adts-invariants-insertion | queue | queue.1 | why | why-callout has no schema type — kept as prose | Why 'just use an array' is O(n) |
| cs146/2-adts-invariants-insertion | queue | queue.2 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | The circular array queue, and the moment `%` matters |
| cs146/2-adts-invariants-insertion | invariants | invariants.0 | why | why-callout has no schema type — kept as prose | Why anyone bothers |
| cs146/2-adts-invariants-insertion | invariants | invariants.3 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | HW 3 Problem 1: proving the sum loop |
| cs146/2-adts-invariants-insertion | insertion | insertion.0 | why | why-callout has no schema type — kept as prose | The idea before the code |
| cs146/2-adts-invariants-insertion | insertion | insertion.1 | stepper | interactive stepper (8 frames) flattened to numbered prose — loses click-through | Insertion sort on [8, 5, 2, 6, 9] (HW 3 Problem 2) |
| cs146/2-adts-invariants-insertion | insertion | insertion.8 | prof | prof callout with no graded source — kept as prose | 'Why would anyone use an O(n²) sort?' (slide 29 — a likely short answer) |
| cs146/4-big-o-merge-sort | dc | dc.0 | why | why-callout has no schema type — kept as prose | The idea |
| cs146/4-big-o-merge-sort | merge | merge.0 | why | why-callout has no schema type — kept as prose | The one trick merge sort needs |
| cs146/4-big-o-merge-sort | merge | merge.1 | stepper | interactive stepper (9 frames) flattened to numbered prose — loses click-through | Merging [2, 5, 8, 12] and [3, 6, 9, 10] (HW 5 Problem 1) |
| cs146/4-big-o-merge-sort | mergesort | mergesort.0 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | Merge sort as a tree: M([50, 20, 60, 30, 10]) |
| cs146/4-big-o-merge-sort | mergesort | mergesort.3 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | Why it's O(n log n) |
| cs146/4-big-o-merge-sort | mergesort | mergesort.5 | why | why-callout has no schema type — kept as prose | O(n) space — the price of the speed |
| cs146/4-big-o-merge-sort | project | project.9 | warn | warn callout with no graded source — kept as prose | Late penalty |
| cs146/6-recurrences | why | why.0 | why | why-callout has no schema type — kept as prose | The question |
| cs146/6-recurrences | unroll | unroll.1 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | Unrolling T(n) = 2T(n/2) + kn at n = 8 |
| cs146/6-recurrences | tree | tree.1 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | Merge sort's tree, one level at a time |
| cs146/6-recurrences | tree | tree.10 | figure | SVG figure dropped; caption kept as prose | Row cost by level. Left: rows grow (leaves win — Case 1). Middle: rows equal (multiply by  |
| cs146/6-recurrences | substitution | substitution.0 | why | why-callout has no schema type — kept as prose | Why it exists |
| cs146/6-recurrences | substitution | substitution.6 | warn | warn callout with no graded source — kept as prose | The step people get stuck on |
| cs146/6-recurrences | master | master.0 | why | why-callout has no schema type — kept as prose | Why it exists |
| cs146/6-recurrences | master | master.6 | stepper | interactive stepper (11 frames) flattened to numbered prose — loses click-through | The three canonical examples, worked (Lecture 7 slides 13–17) |
| cs146/6-recurrences | master | master.7 | why | why-callout has no schema type — kept as prose | Why the regularity check exists (slides 29–31) |
| cs146/8-heaps-heapsort-pq | why | why.0 | why | why-callout has no schema type — kept as prose | The problem a heap solves |
| cs146/8-heaps-heapsort-pq | array | array.0 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | Reading [16, 14, 10, 8, 7, 9, 3, 2, 4, 1] as a tree |
| cs146/8-heaps-heapsort-pq | array | array.2 | why | why-callout has no schema type — kept as prose | Why there are no pointers |
| cs146/8-heaps-heapsort-pq | heapify | heapify.0 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | heapify(a, 1): the 4 sinks to where it belongs |
| cs146/8-heaps-heapsort-pq | heapify | heapify.3 | warn | warn callout with no graded source — kept as prose | Slide 21, 'Common misconception' |
| cs146/8-heaps-heapsort-pq | build | build.0 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | HW 8 Problem 1: buildHeap on [1, 2, 3, 4, 5, 6, 7] |
| cs146/8-heaps-heapsort-pq | build | build.2 | why | why-callout has no schema type — kept as prose | The non-obvious runtime |
| cs146/8-heaps-heapsort-pq | sort | sort.0 | why | why-callout has no schema type — kept as prose | Max at the root, so pull it out repeatedly |
| cs146/8-heaps-heapsort-pq | sort | sort.1 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | heapSort on [7, 5, 6, 4, 2, 1, 3] |
| cs146/8-heaps-heapsort-pq | pq | pq.1 | stepper | interactive stepper (4 frames) flattened to numbered prose — loses click-through | extract() on [9, 8, 7, 5, 3, 2] (slides 41–42) |
| cs146/8-heaps-heapsort-pq | pq | pq.2 | stepper | interactive stepper (3 frames) flattened to numbered prose — loses click-through | insert(): trickle up |
| cs154/1-sets-functions | why | why.0 | why | why-callout has no schema type — kept as prose | The plan behind the preliminaries |
| cs154/1-sets-functions | reading | reading.0 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | Reading { 3n \| 0 ≤ n ≤ 6 } symbol by symbol |
| cs154/1-sets-functions | power | power.0 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Building 2ᴬ for A = {a, b} |
| cs154/1-sets-functions | product | product.0 | why | why-callout has no schema type — kept as prose | Where pairs come from |
| cs154/1-sets-functions | product | product.1 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Assignment 1 Q16: Q × (Σ ∪ {λ}) |
| cs154/1-sets-functions | functions | functions.1 | prof | prof callout with no graded source — kept as prose | ♥ Total and partial — the exact wording |
| cs154/3-strings-languages | why | why.0 | why | why-callout has no schema type — kept as prose | The idea |
| cs154/3-strings-languages | strings | strings.5 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Exponent, the a⁰ trap, and reverse |
| cs154/3-strings-languages | languages | languages.2 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Concatenating and squaring languages |
| cs154/3-strings-languages | patterns | patterns.0 | why | why-callout has no schema type — kept as prose | How to write 'at least one a' |
| cs154/3-strings-languages | patterns | patterns.3 | stepper | interactive stepper (4 frames) flattened to numbered prose — loses click-through | Assignment 2 Q12: roster form of { w@w \| w ∈ {a,b}∗ } |
| cs154/5-dfa | why | why.0 | why | why-callout has no schema type — kept as prose | The idea |
| cs154/5-dfa | structure | structure.3 | figure | SVG figure dropped; caption kept as prose | Five states. Triangle = initial (q0). Double circle = accepting (q3). q4 is the trap: ever |
| cs154/5-dfa | workflow | workflow.0 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Tracing abb (accept) and aba (reject) through the {abb} DFA |
| cs154/5-dfa | analyze | analyze.4 | figure | SVG figure dropped; caption kept as prose | Two states; a toggles between them, b changes nothing. The initial state is accepting beca |
| cs154/5-dfa | design | design.0 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Designing 'starts with a' in six steps |
| cs154/5-dfa | design | design.1 | figure | SVG figure dropped; caption kept as prose | L = { aw \| w ∈ Σ∗ }. q1 is heaven; q2 is hell. Every state has one a-arrow and one b-arrow |
| cs154/5-dfa | formal | formal.0 | stepper | interactive stepper (8 frames) flattened to numbered prose — loses click-through | M = (Q, Σ, δ, q₀, F), one component at a time |
| cs154/5-dfa | formal | formal.1 | why | why-callout has no schema type — kept as prose | Determinism |
| hist15/6-walker | argument | argument.0 | why | why-callout has no schema type — kept as prose | The spine |
| hist15/6-walker | context | context.0 | why | why-callout has no schema type — kept as prose | Why she asks |
| hist15/6-walker | answers | answers.0 | warn | warn callout with no graded source — kept as prose | Use these as a template, not a copy |
| hist15/8-confederation-to-constitution | failed | failed.0 | why | why-callout has no schema type — kept as prose | One cause |
| hist15/8-confederation-to-constitution | stability | stability.0 | why | why-callout has no schema type — kept as prose | The question the section answers |
| hist15/11-market-revolution | why | why.0 | why | why-callout has no schema type — kept as prose | Why the textbook uses this phrase, not 'industrial revolution' |
| hist15/11-market-revolution | cherokee | cherokee.0 | why | why-callout has no schema type — kept as prose | Why the textbook puts Indian removal next to the market revolution |
| ling112/0-what-syntax-is | why | why.1 | why | why-callout has no schema type — kept as prose | Dr. Nie's proof from the handout |
| ling112/0-what-syntax-is | universals | universals.4 | figure | SVG figure dropped; caption kept as prose | 'The thief tripped that unlucky man with a cane.' Left: the cane is the instrument (with a |
| ling112/0-what-syntax-is | gloss | gloss.0 | why | why-callout has no schema type — kept as prose | Why this exists |
| ling112/2-categories | why | why.0 | why | why-callout has no schema type — kept as prose | The handout's opening argument |
| ling112/2-categories | list | list.2 | warn | warn callout with no graded source — kept as prose | Three traps in that list |
| ling112/2-categories | tests | tests.2 | stepper | interactive stepper (14 frames) flattened to numbered prose — loses click-through | Labeling handout sentence (3) with a test per word |
| ling112/4-heads-dependents | why | why.0 | why | why-callout has no schema type — kept as prose | What 'several large books' is |
| ling112/4-heads-dependents | dep | dep.1 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | Handout (8), drawn as arrows |
| ling112/5-constituency-tests | why | why.0 | why | why-callout has no schema type — kept as prose | Which groups of words are real? |
| ling112/5-constituency-tests | sub | sub.1 | stepper | interactive stepper (8 frames) flattened to numbered prose — loses click-through | Running substitution on handout (3) |
| ling112/5-constituency-tests | sub | sub.2 | warn | warn callout with no graded source — kept as prose | The 'ones' trap |
| ling112/5-constituency-tests | move | move.3 | warn | warn callout with no graded source — kept as prose | A failed movement test proves nothing |
| ling112/5-constituency-tests | practice | practice.0 | prof | prof callout with no graded source — kept as prose | What she asks |
| ling124/0-reading-a-wave | why | why.0 | why | why-callout has no schema type — kept as prose | Where this is going |
| ling124/0-reading-a-wave | circle | circle.1 | figure | SVG figure dropped; caption kept as prose | Left: a point at angle θ on the unit circle. Right: its x-coordinate plotted as θ grows —  |
| ling124/0-reading-a-wave | formula | formula.1 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Reading Lab 3's formula symbol by symbol |
| ling124/0-reading-a-wave | spectrum | spectrum.0 | why | why-callout has no schema type — kept as prose | Why we need spectra |
| ling124/0-reading-a-wave | spectrum | spectrum.3 | figure | SVG figure dropped; caption kept as prose | A vowel's magnitude spectrum: the thin lines are harmonics (source detail), the smooth cur |
| ling124/3-sampling-aliasing | why | why.0 | why | why-callout has no schema type — kept as prose | The problem |
| ling124/3-sampling-aliasing | sampling | sampling.3 | stepper | interactive stepper (4 frames) flattened to numbered prose — loses click-through | Sampling cos(10πt) at two rates (the slides' example) |
| ling124/3-sampling-aliasing | alias | alias.0 | why | why-callout has no schema type — kept as prose | Why it exists |
| ling124/3-sampling-aliasing | alias | alias.8 | figure | SVG figure dropped; caption kept as prose | With Fₛ = 1000 Hz: every frequency above 500 folds back onto its mirror image below 500. 9 |
| ling124/4-complex-sinusoids | why | why.0 | why | why-callout has no schema type — kept as prose | Why complex numbers |
| ling124/4-complex-sinusoids | numbers | numbers.1 | figure | SVG figure dropped; caption kept as prose | z = x + jy is an arrow from the origin. Its length is \|z\| = r, its angle is ∠z = θ. The co |
| ling124/4-complex-sinusoids | numbers | numbers.2 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | Taking apart z = 1/2 + j√3/2 (Lab 3 Q5–Q8) |
| ling124/4-complex-sinusoids | spinner | spinner.3 | why | why-callout has no schema type — kept as prose | Why this matters for every later lab |
| ling124/5-fourier-series | why | why.0 | why | why-callout has no schema type — kept as prose | The claim |
| ling124/5-fourier-series | coef | coef.2 | why | why-callout has no schema type — kept as prose | The one fact that makes Fourier analysis possible |
| ling124/5-fourier-series | coef | coef.4 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Lab 4 Q9–Q11: coefficients without calculus |
| ling124/6-transform-dft-stft | transform | transform.0 | why | why-callout has no schema type — kept as prose | Speech isn't periodic |
| ling124/6-transform-dft-stft | window | window.3 | figure | SVG figure dropped; caption kept as prose | Left: rectangular window — the frame starts and stops abruptly. Right: Hamming window — th |
| ling124/6-transform-dft-stft | stft | stft.2 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | Computing every parameter for a standard speech setup |
| ling124/6-transform-dft-stft | stft | stft.3 | why | why-callout has no schema type — kept as prose | Why you can't have both |
| ling115/1-what-is-a-corpus | why | why.0 | why | why-callout has no schema type — kept as prose | The idea |
| ling115/1-what-is-a-corpus | design | design.8 | prof | prof callout with no graded source — kept as prose | Grabowski's question (a Reading Response option) |
| ling115/4-regex | why | why.0 | why | why-callout has no schema type — kept as prose | The problem |
| ling115/4-regex | how | how.0 | stepper | interactive stepper (7 frames) flattened to numbered prose — loses click-through | Watching abc+ match abccd, one character at a time |
| ling115/4-regex | how | how.6 | warn | warn callout with no graded source — kept as prose | The quantifier applies only to the thing right before it |
| ling115/4-regex | examples | examples.1 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Slide 11: every HAVE + been |
| ling115/5-words-tokens-normalization | why | why.0 | why | why-callout has no schema type — kept as prose | Every technical choice is a linguistic claim |
| ling115/5-words-tokens-normalization | units | units.5 | stepper | interactive stepper (6 frames) flattened to numbered prose — loses click-through | Counting types and tokens; computing TTR |
| ling115/5-words-tokens-normalization | heaps | heaps.0 | stepper | interactive stepper (4 frames) flattened to numbered prose — loses click-through | V(n) = K·nᵝ, read slowly |
| ling115/5-words-tokens-normalization | normalization | normalization.2 | why | why-callout has no schema type — kept as prose | Why the bottom rows say PRESERVE |
| ling115/7-annotation-pos | why | why.0 | why | why-callout has no schema type — kept as prose | The idea |
| ling115/7-annotation-pos | process | process.4 | prof | prof callout with no graded source — kept as prose | The shift she keeps naming |
| ling115/7-annotation-pos | process | process.5 | why | why-callout has no schema type — kept as prose | Why document |
| ling115/7-annotation-pos | pos | pos.3 | stepper | interactive stepper (5 frames) flattened to numbered prose — loses click-through | Tagging the same word two ways |
