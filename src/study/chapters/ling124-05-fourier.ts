import type { Chapter, Frame } from "../types";

/**
 * LING 124 · Day 5 — Fourier series. Built from fourier_series.pdf (both the
 * note and the slides), Ladefoged ch. 10, and Lab 4 — the lab where the
 * reader's score dropped (2.2/3.2). Every Lab 4 question is answered here
 * with its reasoning.
 */
const coefFrames: Frame[] = [
  { kind: "lines", lines: ["x(t) = 2cos(2πF₀t) + 3cos(2π·3F₀t)", "X_k = (1/T₀) ∫₀^{T₀} x(t) e^{−j2πF₀kt} dt", "k = 1:  only the 2cos(2πF₀t) term survives → X₁ = 2/2 = 1", "k = 2:  no 2F₀ component in x(t) → X₂ = 0", "k = 3:  only the 3cos(2π·3F₀t) term survives → X₃ = 3/2 = 1.5", "Lab 4 Q9 answer: 1, 0, 1.5"], active: 0, caption: "Lab 4 Q9. A signal made of two cosines. We want its Fourier coefficients X₁, X₂, X₃ without doing any calculus — by understanding what the integral does." },
  { kind: "lines", lines: ["x(t) = 2cos(2πF₀t) + 3cos(2π·3F₀t)", "X_k = (1/T₀) ∫₀^{T₀} x(t) e^{−j2πF₀kt} dt", "k = 1:  only the 2cos(2πF₀t) term survives → X₁ = 2/2 = 1", "k = 2:  no 2F₀ component in x(t) → X₂ = 0", "k = 3:  only the 3cos(2π·3F₀t) term survives → X₃ = 3/2 = 1.5", "Lab 4 Q9 answer: 1, 0, 1.5"], active: 1, caption: "The recipe: multiply x(t) by a complex sinusoid at frequency −kF₀, integrate over one period, divide by the period. Orthogonality makes every term whose frequency isn't kF₀ integrate to zero." },
  { kind: "lines", lines: ["x(t) = 2cos(2πF₀t) + 3cos(2π·3F₀t)", "X_k = (1/T₀) ∫₀^{T₀} x(t) e^{−j2πF₀kt} dt", "k = 1:  only the 2cos(2πF₀t) term survives → X₁ = 2/2 = 1", "k = 2:  no 2F₀ component in x(t) → X₂ = 0", "k = 3:  only the 3cos(2π·3F₀t) term survives → X₃ = 3/2 = 1.5", "Lab 4 Q9 answer: 1, 0, 1.5"], active: 2, caption: "For k = 1, the 3F₀ cosine is 'a different frequency' and integrates away. The F₀ cosine has amplitude 2 and phase 0, so X₁ = (A/2)·e^{j0} = 1. (Chapter 4: a real cosine's coefficient is half its amplitude.)" },
  { kind: "lines", lines: ["x(t) = 2cos(2πF₀t) + 3cos(2π·3F₀t)", "X_k = (1/T₀) ∫₀^{T₀} x(t) e^{−j2πF₀kt} dt", "k = 1:  only the 2cos(2πF₀t) term survives → X₁ = 2/2 = 1", "k = 2:  no 2F₀ component in x(t) → X₂ = 0", "k = 3:  only the 3cos(2π·3F₀t) term survives → X₃ = 3/2 = 1.5", "Lab 4 Q9 answer: 1, 0, 1.5"], active: 3, caption: "For k = 2, neither term matches 2F₀. Both integrate to zero. X₂ = 0." },
  { kind: "lines", lines: ["x(t) = 2cos(2πF₀t) + 3cos(2π·3F₀t)", "X_k = (1/T₀) ∫₀^{T₀} x(t) e^{−j2πF₀kt} dt", "k = 1:  only the 2cos(2πF₀t) term survives → X₁ = 2/2 = 1", "k = 2:  no 2F₀ component in x(t) → X₂ = 0", "k = 3:  only the 3cos(2π·3F₀t) term survives → X₃ = 3/2 = 1.5", "Lab 4 Q9 answer: 1, 0, 1.5"], active: 4, caption: "For k = 3, only the 3F₀ cosine matches. Amplitude 3, phase 0 → X₃ = 1.5." },
  { kind: "lines", lines: ["x(t) = 2cos(2πF₀t) + 3cos(2π·3F₀t)", "X_k = (1/T₀) ∫₀^{T₀} x(t) e^{−j2πF₀kt} dt", "k = 1:  only the 2cos(2πF₀t) term survives → X₁ = 2/2 = 1", "k = 2:  no 2F₀ component in x(t) → X₂ = 0", "k = 3:  only the 3cos(2π·3F₀t) term survives → X₃ = 3/2 = 1.5", "Lab 4 Q9 answer: 1, 0, 1.5"], active: 5, caption: "And Q10: change the third harmonic's amplitude from 3 to 6 — X₁ stays 1, because the k = 1 test ignores the 3F₀ term entirely. Q11: give the third harmonic a phase π/2 — X₃ becomes 1.5·e^{jπ/2} = 1.5j. Amplitude → magnitude, phase → angle." },
];

export const ling124Fourier: Chapter = {
  slug: "5-fourier-series",
  label: "Day 5",
  title: "Fourier series",
  source: "fourier_series.pdf (note + slides), Ladefoged (1996) ch. 10, Lab 4.",
  goal: "Say what a Fourier series is and why it exists; write its three forms and convert between them; compute coefficients for a sum of cosines without calculus by using orthogonality; draw the magnitude spectrum.",
  minutes: 70,
  requires: ["4-complex-sinusoids"],
  sections: [
    {
      id: "why",
      title: "The idea",
      blocks: [
        { id: "why-1", t: "why", slide: "Any periodic wave is a sum of sinusoids", title: "The claim", text: "Take any periodic wave — a vowel, a square wave, a triangle wave — with fundamental frequency F₀ (period T₀ = 1/F₀). Fourier's theorem: you can build it exactly by adding sinusoids whose frequencies are **whole-number multiples of F₀**: F₀, 2F₀, 3F₀, … (the **harmonics**), each with its own amplitude and phase. Going from the wave to the list of amplitudes and phases is **Fourier analysis**; going back is **Fourier synthesis**. The list *is* the spectrum from Chapter 0." },
        { id: "why-2", t: "p", text: "Why would that be true? Intuition: a periodic wave repeats every T₀. Any sinusoid at kF₀ also repeats every T₀ (it completes exactly k cycles). So the harmonics are exactly the set of 'ingredients' that share the wave's period; Fourier showed they're enough. Lab 4 Q5 is this in action — add more harmonics of a triangle wave and the sum gets closer and closer." },
        { id: "why-3", t: "list", slide: "Assumptions (note §2)", items: [
          "x(t) is real-valued (pressure is real).",
          "It's periodic with fundamental period T₀ and fundamental frequency F₀ = 1/T₀.",
          "It's piecewise smooth. At a jump (a square wave's edge) the series converges to the midpoint of the two sides.",
        ] },
      ],
    },
    {
      id: "forms",
      title: "Three ways to write the same series",
      blocks: [
        { id: "f-1", t: "code", slide: "The three forms (slide 3)", caption: "(1) is the intuitive one: a sum of cosines with amplitudes and phases. (2) splits each cosine into a cosine and a sine with no phase. (3) uses complex spinners at positive AND negative frequencies.", text: `(1) amplitude-phase:   x(t) = A₀ + Σ_{k=1}^{∞} A_k cos(2πF₀kt + ϕ_k)

(2) sine-cosine:       x(t) = a₀ + Σ_{k=1}^{∞} [ a_k cos(2πF₀kt) + b_k sin(2πF₀kt) ]

(3) exponential:       x(t) = Σ_{k=−∞}^{∞} X_k e^{j2πF₀kt}        X_k complex,  X_{−k} = X̄_k` },
        { id: "f-2", t: "p", slide: "Reading (1)", text: "k is the harmonic number. The k-th term is a cosine at frequency k·F₀ with amplitude A_k and phase ϕ_k — exactly the formula from Chapter 0, once per harmonic. A₀ is the constant offset (the average level); the note shows it's the k = 0 term with ϕ₀ = 0, since cos(0) = 1." },
        { id: "f-3", t: "worked", slide: "Why (1) and (2) are the same: the cosine sum formula", title: "Converting amplitude-phase ↔ sine-cosine", problem: "Show A_k cos(2πF₀kt + ϕ_k) = a_k cos(2πF₀kt) + b_k sin(2πF₀kt).", steps: [
          "The sum formula: cos(α + β) = cos α cos β − sin α sin β. Let α = 2πF₀kt, β = ϕ_k.",
          "A_k cos(α + ϕ_k) = A_k cos ϕ_k · cos α − A_k sin ϕ_k · sin α.",
          "Match with a_k cos α + b_k sin α: **a_k = A_k cos ϕ_k**, **b_k = −A_k sin ϕ_k**.",
          "Going back: a_k² + b_k² = A_k²(cos² + sin²) = A_k², so **A_k = √(a_k² + b_k²)**. And −b_k/a_k = tan ϕ_k, so **ϕ_k = atan2(−b_k, a_k)** (atan2 picks the right quadrant).",
          "Lab 4 Q4-style check: for a wave with only cosine terms (b_k = 0), ϕ_k = 0 and A_k = a_k.",
        ] },
        { id: "f-4", t: "worked", slide: "Why (2)/(1) and (3) are the same: Euler", title: "Converting to the exponential form", problem: "Show each cosine becomes a pair of complex spinners.", steps: [
          "Chapter 4: cos θ = (e^{jθ} + e^{−jθ})/2 and sin θ = (e^{jθ} − e^{−jθ})/(2j).",
          "So a_k cos(2πF₀kt) + b_k sin(2πF₀kt) = [(a_k − jb_k)/2]·e^{j2πF₀kt} + [(a_k + jb_k)/2]·e^{−j2πF₀kt}.",
          "Read off: **X_k = (a_k − jb_k)/2** for k > 0, **X_{−k} = (a_k + jb_k)/2** — conjugates, as promised. X₀ = a₀ = A₀.",
          "From form (1) directly: **X_k = (A_k/2)·e^{jϕ_k}**, so **A_k = 2|X_k|** and **ϕ_k = ∠X_k**. Half the amplitude at +kF₀, half at −kF₀ — Chapter 4's result, one harmonic at a time.",
        ] },
        { id: "f-5", t: "table", slide: "The conversion table (slides 5, 7, 8, 19, 20)", rows: [
          ["Given", "You get"],
          ["a_k, b_k", "A_k = √(a_k² + b_k²);  ϕ_k = atan2(−b_k, a_k)"],
          ["A_k, ϕ_k", "a_k = A_k cos ϕ_k;  b_k = −A_k sin ϕ_k"],
          ["a_k, b_k", "X_k = (a_k − jb_k)/2;  X_{−k} = (a_k + jb_k)/2;  X₀ = a₀"],
          ["A_k, ϕ_k", "X_k = A_k e^{jϕ_k}/2;  X_{−k} = A_k e^{−jϕ_k}/2;  X₀ = A₀"],
          ["X_k (k > 0)", "A_k = 2|X_k|;  ϕ_k = ∠X_k"],
        ] },
        { id: "f-6", t: "try", q: "Lab 4 Q7: for 2cos(2πF₀t + π/2), find X₁ and X₋₁.", a: "X₁ = (A/2)e^{jϕ} = 1·e^{jπ/2} = j (since e^{jπ/2} = cos π/2 + j sin π/2 = j). X₋₁ = conjugate = −j. Check with the a,b route: a₁ = 2cos(π/2) = 0, b₁ = −2sin(π/2) = −2 → X₁ = (0 − j(−2))/2 = j. ✓" },
      ],
    },
    {
      id: "coef",
      title: "Finding the coefficients: multiply, integrate, normalize",
      blocks: [
        { id: "c-1", t: "p", slide: "The recipe (slide 11)", text: "Given a wave, how do you find how much of harmonic k it contains? **Multiply x(t) by the harmonic you're testing for, integrate over one period, and divide by the period.** The result is nonzero only if x(t) actually contains that harmonic. It's a detector." },
        { id: "c-2", t: "code", slide: "The formulas", caption: "For (2): note the 2/T₀ on a_k and b_k but 1/T₀ on a₀. For (3): multiply by the spinner with the OPPOSITE frequency (−k).", text: `a₀ = (1/T₀) ∫₀^{T₀} x(t) dt                        (the average)
a_k = (2/T₀) ∫₀^{T₀} x(t) cos(2πF₀kt) dt
b_k = (2/T₀) ∫₀^{T₀} x(t) sin(2πF₀kt) dt

X_k = (1/T₀) ∫₀^{T₀} x(t) e^{−j2πF₀kt} dt` },
        { id: "c-3", t: "why", slide: "Why it works: orthogonality", title: "The one fact that makes Fourier analysis possible", text: "A sinusoid with no offset, integrated over a whole number of its own cycles, gives **zero** — every positive hump cancels a negative hump. So when you multiply x(t) (a sum of harmonics) by cos(2πF₀kt) and integrate, every product of two *different* harmonics is itself a sum of sinusoids at nonzero frequencies and integrates to zero. Only the product of harmonic k with itself survives — cos² has a positive average of ½, giving T₀/2 (hence the 2/T₀ in front). The harmonics are **orthogonal**: the test for k ignores everything that isn't k." },
        { id: "c-4", t: "table", slide: "The orthogonality facts (slides 15–16) — Lab 4 Q6 and Q8", rows: [
          ["Integral over one period T₀", "Result"],
          ["∫ sin(2πF₀mt) cos(2πF₀nt) dt", "0 always"],
          ["∫ cos(2πF₀mt) cos(2πF₀nt) dt", "T₀/2 if m = n, else 0"],
          ["∫ sin(2πF₀mt) sin(2πF₀nt) dt", "T₀/2 if m = n, else 0"],
          ["∫ e^{j2πF₀mt} e^{−j2πF₀nt} dt", "T₀ if m = n, else 0"],
          ["∫ cos(2πF₀kt) dt or ∫ sin(2πF₀kt) dt, k ≠ 0", "0 (whole cycles cancel) — Lab 4 Q6: BOTH are zero"],
        ] },
        { id: "c-5", t: "stepper", slide: true, title: "Lab 4 Q9–Q11: coefficients without calculus", frames: coefFrames },
        { id: "c-6", t: "worked", slide: "The derivation in Koo's note, §4.1 (for the exam's 'why')", title: "Why X_k = (1/T₀)∫ x(t) e^{−j2πF₀kt} dt", problem: "Substitute the series for x(t) and watch everything but one term vanish.", steps: [
          "∫₀^{T₀} x(t) e^{−j2πF₀kt} dt = ∫ Σ_n X_n e^{j2πF₀nt} e^{−j2πF₀kt} dt.",
          "Swap sum and integral: Σ_n X_n ∫ e^{j2πF₀(n−k)t} dt.",
          "If n ≠ k, the integrand is a complex sinusoid at a nonzero frequency over T₀/|n−k| — whole cycles — so it integrates to 0.",
          "If n = k, the exponent is 0, the integrand is the constant X_k, and the integral is X_k·T₀.",
          "So the whole thing equals X_k·T₀. Divide by T₀: X_k = (1/T₀)∫ x(t) e^{−j2πF₀kt} dt.",
        ] },
      ],
    },
    {
      id: "spectrum",
      title: "From coefficients to the spectrum",
      blocks: [
        { id: "s-1", t: "p", slide: "Two plots", text: "**Magnitude spectrum**: A_k (or 2|X_k|) at each frequency k·F₀ — stems at F₀, 2F₀, 3F₀… **Phase spectrum**: ϕ_k = ∠X_k at each k·F₀. In the two-sided (exponential) picture, the stems are |X_k| at both +kF₀ and −kF₀, each half as tall." },
        { id: "s-2", t: "worked", slide: "The slides' example (slides 21–22)", title: "x(t) = 0.4 + cos(2π·2t + π/4) + 0.6cos(2π·5t − π/2)", problem: "Write the two-sided coefficients.", steps: [
          "F₀ = 1 Hz (harmonics at 2 and 5 are both multiples of 1). Three components: k = 0, 2, 5.",
          "X₀ = A₀ = 0.4.",
          "k = 2: A = 1, ϕ = π/4 → X₂ = 0.5·e^{jπ/4} = 0.354 + 0.354j; X₋₂ = 0.354 − 0.354j. |X| = 0.5, ∠ = ±π/4.",
          "k = 5: A = 0.6, ϕ = −π/2 → X₅ = 0.3·e^{−jπ/2} = −0.3j; X₋₅ = +0.3j. |X| = 0.3, ∠ = ∓π/2.",
          "Magnitude spectrum (one-sided): 0.4 at 0 Hz, 1 at 2 Hz, 0.6 at 5 Hz. Phase spectrum: 0, π/4, −π/2.",
        ] },
        { id: "s-3", t: "worked", slide: "Lab 4 Q1–Q5, Q12–Q13: the triangle wave", title: "F₀ = 5 Hz triangle wave with cosine amplitudes 8/(π²k²) for odd k", problem: "The lab's first block of questions.", steps: [
          "Q1: F₀ = 5 Hz → T₀ = 1/5 = 0.2 s.",
          "Q2: 5th harmonic is at 5·F₀ = 25 Hz.",
          "Q3: its amplitude is 8/(π²·25) = 8/(25π²). Even harmonics are 0 (a triangle wave is symmetric in a way that kills them).",
          "Q4 (the sketch): stems at 5, 15, 25, 35, 45 Hz with heights 8/π², 8/(9π²), 8/(25π²), 8/(49π²), 8/(81π²) — falling fast — and nothing at 10, 20, 30, 40 Hz.",
          "Q5 (essay): as you add terms, the straight sides get straighter and the rounded peaks get sharper; the remaining error is largest at the peaks and troughs, because sharp corners need the highest harmonics.",
          "Q12: two-sided coefficients X_k = A_k/2 = 4/(π²k²) for odd k > 0, zero for even k.",
          "Q13: rebuilding from X_k should **match** the cosine reconstruction, since each ±k pair of complex terms adds up to exactly the k-th cosine.",
        ] },
        { id: "s-4", t: "try", q: "x(t) = 4cos(2π·10t − π/3). Give X₁ and X₋₁ (F₀ = 10 Hz) and the one-sided magnitude spectrum.", a: "X₁ = 2e^{−jπ/3} = 1 − j√3; X₋₁ = 2e^{jπ/3} = 1 + j√3. Magnitude spectrum: one stem of height 4 at 10 Hz (or two stems of height 2 at ±10 Hz two-sided). Phase −π/3 at 10 Hz." },
        { id: "s-5", t: "def", term: "Fourier series", text: "A periodic signal written as a sum of harmonically related sinusoids (frequencies kF₀). Coefficients come from multiplying by the harmonic, integrating over one period, and normalizing; orthogonality makes each test isolate one harmonic. Two-sided coefficient X_k has |X_k| = A_k/2 and ∠X_k = ϕ_k." },
      ],
    },
  ],
};
