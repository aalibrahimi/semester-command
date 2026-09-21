/**
 * Drills for LING 124 · Fourier series: harmonics kF₀, T₀ = 1/F₀, and the
 * amplitude-phase ↔ exponential conversion X_k = (A_k/2)e^{jϕ_k}.
 */
import type { Drill } from "../drill";
import { choice, fmt } from "../drill";

const G = "ling124/5-fourier-series";

export const drills: Drill[] = [
  {
    id: "spectrum!harmonic",
    guideId: G,
    sectionRef: "spectrum",
    title: "Harmonics of F₀",
    skill: "The k-th harmonic sits at k·F₀; the period is 1/F₀ (the lab's first block).",
    gen(r) {
      const F0 = r.pick([5, 100, 110, 120, 150, 200, 220, 250]);
      const k = r.int(2, 9);
      const mode = r.pick(["harm", "period", "which"]);
      if (mode === "harm")
        return {
          prompt: `A periodic signal has fundamental **F₀ = ${F0} Hz**. At what frequency is its **${k}th harmonic**?`,
          answer: { kind: "number", value: k * F0, unit: "Hz" },
          steps: [`Harmonics are integer multiples of F₀.`, `${k} × ${F0} = ${fmt(k * F0)} Hz.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (v === (k - 1) * F0) return `Off by one harmonic: the 1st harmonic is F₀ itself, so the ${k}th is ${k}·F₀, not ${k - 1}·F₀.`;
            if (v === F0 + k) return "You added k to F₀. Harmonics multiply: k·F₀.";
            return undefined;
          },
        };
      if (mode === "period")
        return {
          prompt: `**F₀ = ${F0} Hz**. What is the fundamental period T₀, in seconds?`,
          answer: { kind: "number", value: 1 / F0, tolerance: (1 / F0) * 0.005, unit: "s" },
          steps: [`T₀ = 1/F₀ = 1/${F0} = ${1 / F0} s.`],
        };
      const f = r.pick([2, 3, 4, 5, 6, 7]) * F0;
      return {
        prompt: `**F₀ = ${F0} Hz**. A component appears at **${fmt(f)} Hz**. Which harmonic is it?`,
        answer: { kind: "number", value: f / F0 },
        steps: [`k = F/F₀ = ${fmt(f)}/${F0} = ${f / F0}.`],
        hint: "Divide by the fundamental.",
      };
    },
  },
  {
    id: "forms!coef",
    guideId: G,
    sectionRef: "forms",
    title: "From a cosine to X_k",
    skill: "For A·cos(2πF₀kt + ϕ): X_k = (A/2)e^{jϕ}, X_{−k} is its conjugate (Lab 4 Q7).",
    gen(r) {
      const A = r.pick([1, 2, 4, 6, 0.5]);
      const cases = [
        { phi: "0", Xk: `${A / 2}`, note: "e^{j0} = 1" },
        { phi: "π/2", Xk: `${A / 2}j`, note: "e^{jπ/2} = j" },
        { phi: "π", Xk: `−${A / 2}`, note: "e^{jπ} = −1" },
        { phi: "−π/2", Xk: `−${A / 2}j`, note: "e^{−jπ/2} = −j" },
      ];
      const c = r.pick(cases);
      const k = r.int(1, 3);
      const askNeg = r.next() < 0.4;
      const conj = (s: string) => (s.includes("j") ? (s.startsWith("−") ? s.slice(1) : "−" + s) : s);
      const want = askNeg ? conj(c.Xk) : c.Xk;
      const wrong = [`${A}`, `${A}j`, conj(want) === want ? `${A / 2}j` : conj(want), `−${A}`].filter((w) => w !== want).slice(0, 3);
      return {
        prompt: `x(t) = ${A}cos(2πF₀·${k}t${c.phi === "0" ? "" : " + " + c.phi}). What is **X${askNeg ? "₋" : ""}${k === 1 ? "₁" : k === 2 ? "₂" : "₃"}** in the exponential (two-sided) form?`.replace("+ −", "− "),
        answer: choice(r, want, wrong, {
          correct: `X_k = (A/2)e^{jϕ} = (${A}/2)·(${c.note.split(" = ")[1]}); ${askNeg ? "X_{−k} is its complex conjugate." : "and X_{−k} is the conjugate."}`,
        }),
        steps: [
          `A cosine splits into two spinners of half amplitude: A·cos(θ) = (A/2)e^{jθ} + (A/2)e^{−jθ}.`,
          `So X_k = (A/2)·e^{jϕ} = ${A / 2}·e^{j${c.phi}}. Since ${c.note}, X_k = ${c.Xk}.`,
          askNeg ? `X_{−k} is the conjugate: ${want}.` : `X_{−k} would be the conjugate, ${conj(c.Xk)}.`,
        ],
        hint: "Half the amplitude goes to +k, half to −k. The phase rides along as e^{jϕ}.",
      };
    },
  },
  {
    id: "forms!convert",
    guideId: G,
    sectionRef: "forms",
    title: "Amplitude-phase ↔ sine-cosine",
    skill: "a_k = A cos ϕ, b_k = −A sin ϕ; A = √(a² + b²).",
    gen(r) {
      if (r.next() < 0.5) {
        const pairs = [
          [3, 4, 5],
          [6, 8, 10],
          [5, 12, 13],
          [1, 0, 1],
          [0, 2, 2],
          [8, 15, 17],
        ];
        const [a, b, A] = r.pick(pairs);
        return {
          prompt: `Sine-cosine form has **a_k = ${a}** and **b_k = ${b}**. What is the amplitude A_k in amplitude-phase form?`,
          answer: { kind: "number", value: A },
          steps: [`A_k = √(a_k² + b_k²).`, `√(${a}² + ${b}²) = √${a * a + b * b} = ${A}.`],
          hint: "The two coefficients are the legs; the amplitude is the hypotenuse.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (v === a + b) return "You added them. They are perpendicular components (cosine and sine), so combine them like a right triangle: √(a² + b²).";
            return undefined;
          },
        };
      }
      const A = r.pick([2, 4, 6]);
      const c = r.pick([
        { phi: "0", a: A, b: 0 },
        { phi: "π/2", a: 0, b: -A },
        { phi: "π", a: -A, b: 0 },
        { phi: "−π/2", a: 0, b: A },
      ]);
      const want = `a = ${c.a}, b = ${c.b}`;
      const wrong = [`a = ${c.a}, b = ${-c.b}`, `a = ${c.b}, b = ${c.a}`, `a = ${A}, b = ${A}`].filter((w) => w !== want).slice(0, 3);
      return {
        prompt: `A_k = ${A}, ϕ_k = ${c.phi}. What are a_k and b_k in the sine-cosine form?`,
        answer: choice(r, want, wrong, { correct: "a_k = A cos ϕ, b_k = −A sin ϕ (note the minus on b)." }),
        steps: [`a_k = A cos ϕ = ${A}·cos(${c.phi}) = ${c.a}.`, `b_k = −A sin ϕ = −${A}·sin(${c.phi}) = ${c.b}. The minus comes from cos(α + β) = cos α cos β − sin α sin β.`],
        hint: "Expand cos(2πF₀kt + ϕ) with the sum formula and match coefficients. Watch the sign on the sine term.",
      };
    },
  },
];
