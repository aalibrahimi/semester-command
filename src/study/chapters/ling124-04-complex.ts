import type { Chapter, Frame } from "../types";

/**
 * LING 124 · Day 4 — Complex numbers and complex sinusoids. Built from
 * complex_sinusoids.pdf (Koo's note) and Lab 3 Q5–Q20. Written for a reader
 * who said "I don't know what j is."
 */
const zFrames: Frame[] = [
  { kind: "lines", lines: ["z = 1/2 + j·(√3/2)", "real part  Re(z) = 1/2        →  x-coordinate", "imag part  Im(z) = √3/2       →  y-coordinate", "magnitude  |z| = √(x² + y²) = √(1/4 + 3/4) = 1", "angle      ∠z = atan2(y, x) = 60° = π/3", "conjugate  z̄ = 1/2 − j·(√3/2)   (flip the sign of y)", "|z̄| = 1,  ∠z̄ = −π/3"], active: 0, caption: "Lab 3 Q5–Q8. One complex number, taken apart. A complex number is a point (or an arrow from the origin) on a plane." },
  ...[1,2,3,4,5,6].map((a) => ({ kind: "lines" as const, lines: ["z = 1/2 + j·(√3/2)", "real part  Re(z) = 1/2        →  x-coordinate", "imag part  Im(z) = √3/2       →  y-coordinate", "magnitude  |z| = √(x² + y²) = √(1/4 + 3/4) = 1", "angle      ∠z = atan2(y, x) = 60° = π/3", "conjugate  z̄ = 1/2 − j·(√3/2)   (flip the sign of y)", "|z̄| = 1,  ∠z̄ = −π/3"], active: a, caption: ["", "The number without j is the real part. Plot it on the horizontal axis.", "The number multiplying j is the imaginary part. Plot it on the vertical axis. So z is the point (1/2, √3/2).", "Magnitude = length of the arrow from the origin = Pythagoras. Here it's exactly 1 — the point sits on the unit circle. (Lab 3 Q7: red = 1, blue = 1.)", "Angle = the direction of the arrow, counterclockwise from the positive real axis. The point (1/2, √3/2) is (cos 60°, sin 60°), so the angle is 60° = π/3. (Q8.)", "The conjugate keeps the real part and flips the sign of the imaginary part. Geometrically: mirror the arrow across the horizontal axis.", "Mirroring doesn't change length, and it negates the angle. |z̄| = 1, ∠z̄ = −60°. (Q8: red = 60°, blue = −60°.)"][a] })),
];

export const ling124Complex: Chapter = {
  slug: "4-complex-sinusoids",
  label: "Day 4",
  title: "Complex numbers and complex sinusoids",
  source: "complex_sinusoids.pdf (Koo's note), the Day 4 slides, Lab 3 Q5–Q20.",
  goal: "Read a complex number in rectangular, polar and exponential form; find its magnitude, angle and conjugate; see a complex sinusoid as a rotating point; and explain why a real cosine is half a positive-frequency spinner plus half a negative-frequency one.",
  minutes: 60,
  requires: ["0-reading-a-wave"],
  sections: [
    {
      id: "why",
      title: "Why this course needs a made-up number",
      blocks: [
        { id: "why-1", t: "why", slide: "The circle picture, upgraded", title: "Why complex numbers", text: "Chapter 0 said a sinusoid is a rotating point seen from the side. The cosine is its x-coordinate; the sine is its y-coordinate. Tracking a point on a plane means tracking two numbers at once. Complex numbers are the trick that packs two numbers into one so you can write the *whole rotating point* as one symbol — and then the formulas for Fourier analysis become one line instead of two. Koo's note: 'a single complex sinusoid captures both the cosine and sine waves at the same time.' That's the entire reason j exists in this course." },
        { id: "why-2", t: "p", text: "So don't think of j as 'the square root of −1' (true, but unhelpful). Think of it as **the label for the vertical axis**. A complex number x + jy is the point (x, y). That's it." },
      ],
    },
    {
      id: "numbers",
      title: "Complex numbers: three ways to write one point",
      blocks: [
        { id: "n-1", t: "code", slide: "The three forms", caption: "Same point, three notations. Rectangular says where; polar/exponential say how far and which direction. Koo uses j (engineers) where mathematicians use i.", text: `rectangular:   z = x + jy                    x = Re(z),  y = Im(z)
polar (trig):  z = r (cos θ + j sin θ)        r = |z| = √(x² + y²),   θ = ∠z = atan2(y, x)
exponential:   z = r · e^{jθ}                 Euler:  e^{jθ} = cos θ + j sin θ` },
        { id: "n-2", t: "figure", slide: "The complex plane", viewBox: "0 0 420 230", caption: "z = x + jy is an arrow from the origin. Its length is |z| = r, its angle is ∠z = θ. The conjugate z̄ is the mirror image below the real axis.", svg: `<g stroke="currentColor" font-family="ui-monospace, monospace" font-size="11">
<line x1="40" y1="115" x2="400" y2="115" opacity=".4"/><line x1="220" y1="20" x2="220" y2="210" opacity=".4"/>
<text x="380" y="130" fill="currentColor" stroke="none" opacity=".7">real</text><text x="228" y="30" fill="currentColor" stroke="none" opacity=".7">imaginary (j)</text>
<line x1="220" y1="115" x2="340" y2="45" stroke="rgb(59 130 246)" stroke-width="2.5"/><circle cx="340" cy="45" r="4" fill="rgb(59 130 246)" stroke="none"/>
<line x1="340" y1="45" x2="340" y2="115" stroke-dasharray="3 3" opacity=".5"/><line x1="220" y1="45" x2="340" y2="45" stroke-dasharray="3 3" opacity=".5"/>
<text x="345" y="40" fill="rgb(59 130 246)" stroke="none">z = x + jy</text>
<text x="336" y="130" fill="currentColor" stroke="none">x</text><text x="205" y="50" fill="currentColor" stroke="none">y</text>
<text x="265" y="90" fill="currentColor" stroke="none">r = |z|</text>
<path d="M 250 115 A 30 30 0 0 0 246 100" fill="none" stroke="currentColor"/><text x="254" y="108" fill="currentColor" stroke="none">θ</text>
<line x1="220" y1="115" x2="340" y2="185" stroke="currentColor" stroke-width="2" opacity=".45"/><circle cx="340" cy="185" r="4" fill="currentColor" opacity=".45" stroke="none"/>
<text x="345" y="195" fill="currentColor" stroke="none" opacity=".7">z̄ = x − jy  (angle −θ)</text>
</g>` },
        { id: "n-3", t: "stepper", slide: true, title: "Taking apart z = 1/2 + j√3/2 (Lab 3 Q5–Q8)", frames: zFrames },
        { id: "n-4", t: "p", slide: "Euler's formula, in the circle picture", text: "e^{jθ} = cos θ + j sin θ. Read it as: *the point on the unit circle at angle θ*. That's all. The exponential form r·e^{jθ} is then 'a point at distance r and angle θ' — the polar form written compactly. Why an exponential? Because exponentials multiply by adding exponents (e^a·e^b = e^{a+b}), which will let us pull frequency and phase apart in a moment. You don't need to know why Euler's formula is true for this course; you need to be able to translate it." },
        { id: "n-5", t: "try", q: "Convert 3·e^{jπ/2} to rectangular form, and write −2 in exponential form.", a: "3(cos π/2 + j sin π/2) = 3(0 + j·1) = 3j. −2 has length 2 and points along the negative real axis (angle π): 2·e^{jπ}." },
        { id: "n-6", t: "try", q: "What is the magnitude of 3 + 4j, and its conjugate?", a: "|3 + 4j| = √(9 + 16) = 5. Conjugate: 3 − 4j (same magnitude 5, angle negated)." },
      ],
    },
    {
      id: "spinner",
      title: "Complex sinusoids: the rotating point itself",
      blocks: [
        { id: "s-1", t: "p", slide: "Let the angle grow", text: "Take z = r·e^{jθ} and let θ increase. The point goes around a circle of radius r, counterclockwise. That moving point is a **complex sinusoid**: z(θ) = r·e^{jθ} = r(cos θ + j sin θ). Its real part traces a cosine, its imaginary part traces a sine. One object, both waves. (Lab 3 Q9–Q10: plotted against θ it's a helix; θ from 0 to 8π = four full circles.)" },
        { id: "s-2", t: "list", slide: "Its conjugate spins the other way", items: [
          "z̄(θ) = r·e^{−jθ} = r(cos θ − j sin θ) = r(cos(−θ) + j sin(−θ)) — same circle, **clockwise** (Q11: 'spirals clockwise').",
          "Add them: z + z̄ = 2r·cos θ. The imaginary parts cancel; you're left with a real cosine along the real axis (Q12, Q16).",
          "Subtract them: z − z̄ = 2jr·sin θ — a sine along the imaginary axis (Q13).",
          "So **r·cos θ = (r·e^{jθ} + r·e^{−jθ}) / 2**. A real cosine is the average of a counterclockwise spinner and a clockwise one.",
        ] },
        { id: "s-3", t: "code", slide: "As a function of time", caption: "Substitute θ = 2πFt + ϕ, exactly as in Chapter 0. Then split the exponent with the product rule of exponents.", text: `z(t) = r · e^{j(2πFt + ϕ)}
     = r · e^{jϕ} · e^{j2πFt}         (e^{a+b} = e^a · e^b)
     = X · e^{j2πFt}                  where  X = r·e^{jϕ}
X is the COMPLEX AMPLITUDE (a "phasor"):  |X| = r = amplitude,  ∠X = ϕ = phase
The frequency lives in e^{j2πFt}; the amplitude AND phase live together in one complex number X.
conjugate:  z̄(t) = X̄ · e^{−j2πFt}      (negative frequency, conjugate amplitude)` },
        { id: "s-4", t: "why", title: "Why this matters for every later lab", text: "In Fourier analysis, each frequency gets ONE complex number X. Its magnitude is 'how much of this frequency' and its angle is 'what phase'. That's why Lab 4 asked for X₁ and got 'j' as an answer, and why a magnitude spectrum plots |X| and a phase spectrum plots ∠X. If you can read |X| and ∠X off a complex number, you can read a spectrum." },
        { id: "s-5", t: "worked", slide: "The formula from the top of Koo's note", title: "A real cosine as two spinners", problem: "Show A·cos(2πFt + ϕ) = X_F·e^{j2πFt} + X̄_F·e^{−j2πFt}, and say what X_F is.", steps: [
          "Start from r·cos(θ) = (z + z̄)/2 with θ = 2πFt + ϕ and r = A.",
          "Write z(t) = X·e^{j2πFt} and z̄(t) = X̄·e^{−j2πFt}, where X = A·e^{jϕ}.",
          "So A·cos(2πFt + ϕ) = (X·e^{j2πFt} + X̄·e^{−j2πFt}) / 2.",
          "Define X_F = X/2. Halving a complex number halves its length and leaves its angle alone.",
          "Therefore **|X_F| = A/2** and **∠X_F = ϕ**. A real cosine of amplitude A shows up in a two-sided spectrum as two lines, at +F and −F, each of height A/2, with phases ϕ and −ϕ.",
        ], answer: "|X_F| = A/2, ∠X_F = ϕ" },
        { id: "s-6", t: "worked", slide: "Lab 3 Q14–Q20, answered", title: "Dials on a complex sinusoid", problem: "x(t) = A·e^{j(2πFt + ϕ)}, plotted as a spiral in 3D (time, real, imaginary).", steps: [
          "Q14: double the frequency of e^{j2π·20·t} → e^{j2π·40·t}. Same spiral, twice as many turns per second.",
          "Q16: e^{j2πFt} + e^{−j2πFt} = 2cos(2πFt). Two opposite spinners sum to a real cosine.",
          "Q17: A = 10 instead of 1 → the spiral traces a circle of radius 10. Amplitude is the radius.",
          "Q18: ϕ = π instead of 0 → the point starts on the opposite side of the circle: a half-cycle head start.",
          "Q19: A is the **magnitude** of the vector, ϕ is its **angle**.",
          "Q20: given X = A·e^{jϕ} numerically (e.g. 4·e^{jπ/2}), read A = 4 from the coefficient and ϕ = π/2 from the exponent.",
        ] },
      ],
    },
    {
      id: "def",
      title: "Compressed form",
      blocks: [
        { id: "d-1", t: "def", term: "Complex number", text: "z = x + jy is the point (x, y). |z| = √(x² + y²) is its length; ∠z = atan2(y, x) is its angle; z̄ = x − jy is its mirror across the real axis. Euler: e^{jθ} = cos θ + j sin θ, so z = |z|·e^{j∠z}." },
        { id: "d-2", t: "def", term: "Complex sinusoid and complex amplitude", text: "z(t) = X·e^{j2πFt} is a point circling at F rotations per second; X = A·e^{jϕ} carries amplitude (|X|) and phase (∠X). A real cosine is (z + z̄)/2, so it appears at both +F and −F with half the amplitude at each." },
        { id: "d-3", t: "try", q: "A spectrum shows X = 0.354 − 0.354j at 2 Hz. What's the amplitude and phase of the cosine at 2 Hz?", a: "|X| = √(0.354² + 0.354²) = 0.5, so the cosine's amplitude is 2·0.5 = 1. ∠X = atan2(−0.354, 0.354) = −π/4, so the phase is −π/4. (This is the k = −2 line of the Day 5 slides' example.)" },
      ],
    },
  ],
};
