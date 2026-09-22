/**
 * Drills for LING 124 · Complex numbers and complex sinusoids: |z|, the
 * conjugate, converting r·e^{jθ} at the easy angles, and the two-spinner
 * identity behind every real cosine.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling124/4-complex-sinusoids";
const TRIPLES = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [0, 7, 7],
  [2, 0, 2],
];

export const drills: Drill[] = [
  {
    id: "numbers!magnitude",
    guideId: G,
    sectionRef: "numbers",
    title: "Magnitude of x + jy",
    skill: "|z| = √(x² + y²): the length of the arrow.",
    gen(r) {
      const [x, y, m] = r.pick(TRIPLES);
      const sx = r.next() < 0.3 ? -x : x;
      const sy = r.next() < 0.3 ? -y : y;
      const z = `${sx} ${sy < 0 ? "−" : "+"} ${Math.abs(sy)}j`;
      return {
        prompt: `What is the magnitude of **z = ${z}**?`,
        answer: { kind: "number", value: m },
        steps: [`|z| = √(x² + y²) = √(${sx}² + (${sy})²) = √${x * x + y * y} = ${m}.`, "Signs vanish inside the squares: the length does not care which quadrant."],
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (v === Math.abs(sx) + Math.abs(sy) || v === sx + sy) return "You added the parts. Real and imaginary are perpendicular, so the length is the hypotenuse: √(x² + y²).";
          if (v === x * x + y * y) return "That is x² + y². Take the square root.";
          return undefined;
        },
      };
    },
  },
  {
    id: "numbers!conjugate",
    guideId: G,
    sectionRef: "numbers",
    title: "The conjugate",
    skill: "z̄ flips the sign of the imaginary part only; same magnitude, negated angle.",
    gen(r) {
      const [x, y] = r.pick(TRIPLES.filter((t) => t[0] && t[1]));
      const sy = r.next() < 0.5 ? -y : y;
      const z = `${x} ${sy < 0 ? "−" : "+"} ${Math.abs(sy)}j`;
      const conj = `${x} ${sy < 0 ? "+" : "−"} ${Math.abs(sy)}j`;
      return {
        prompt: `Write the complex conjugate of **z = ${z}** (as x + yj or x − yj).`,
        answer: { kind: "text", accept: [conj, conj.replace("j", "i"), conj.replace(/\s/g, ""), `${x}${sy < 0 ? "+" : "-"}${Math.abs(sy)}j`] , placeholder: "e.g. 3 − 4j" },
        steps: [`Conjugate: keep the real part, negate the imaginary part.`, `z̄ = ${conj}. Same magnitude, angle negated.`],
        diagnose(input) {
          const s = input.replace(/\s/g, "").replace(/[−–]/g, "-");
          if (s === `${-x}${sy < 0 ? "-" : "+"}${Math.abs(sy)}j`) return "You negated the real part. The conjugate mirrors across the *real* axis, so only the imaginary part flips.";
          if (s === `${-x}${sy < 0 ? "+" : "-"}${Math.abs(sy)}j`) return "You negated both parts. That is −z (a rotation by π), not the conjugate.";
          return undefined;
        },
      };
    },
  },
  {
    id: "numbers!euler",
    guideId: G,
    sectionRef: "numbers",
    title: "r·e^{jθ} at the easy angles",
    skill: "Euler: e^{jθ} = cos θ + j sin θ, so the four quarter-turns are 1, j, −1, −j.",
    gen(r) {
      const rr = r.pick([1, 2, 3, 5]);
      const c = r.pick([
        { th: "0", v: `${rr}` },
        { th: "π/2", v: `${rr}j` },
        { th: "π", v: `−${rr}` },
        { th: "−π/2", v: `−${rr}j` },
        { th: "3π/2", v: `−${rr}j` },
      ]);
      const wrong = [`${rr}`, `${rr}j`, `−${rr}`, `−${rr}j`].filter((w) => w !== c.v);
      return {
        prompt: `Convert **${rr}·e^{j${c.th}}** to rectangular form.`,
        answer: choice(r, c.v, wrong, { correct: `e^{j${c.th}} = cos(${c.th}) + j sin(${c.th}).` }),
        steps: [`e^{jθ} = cos θ + j sin θ.`, `θ = ${c.th}: cos = ${c.v.includes("j") ? 0 : c.v.startsWith("−") ? -1 : 1}, sin = ${c.v.includes("j") ? (c.v.startsWith("−") ? -1 : 1) : 0}.`, `Multiply by r = ${rr}: ${c.v}.`],
        hint: "Picture the point on the circle: angle 0 is east, π/2 north, π west, −π/2 south.",
      };
    },
  },
  {
    id: "spinner!identity",
    guideId: G,
    sectionRef: "spinner",
    title: "Two spinners make a cosine",
    skill: "e^{jθ} + e^{−jθ} = 2cos θ, so A·cos(2πFt + ϕ) = X e^{j2πFt} + X̄ e^{−j2πFt} with X = A e^{jϕ}/2 (Lab 3 Q16).",
    gen(r) {
      const F = r.pick([5, 20, 100, 440]);
      const q = r.pick([
        { p: `Simplify **e^{j2π·${F}t} + e^{−j2π·${F}t}**.`, ok: `2cos(2π·${F}t)`, bad: [`cos(2π·${F}t)`, `2j·sin(2π·${F}t)`, `2cos(2π·${2 * F}t)`], why: "Adding a spinner and its mirror cancels the imaginary parts and doubles the real part." },
        { p: `Simplify **e^{j2π·${F}t} − e^{−j2π·${F}t}**.`, ok: `2j·sin(2π·${F}t)`, bad: [`2cos(2π·${F}t)`, `0`, `2sin(2π·${F}t)`], why: "Subtracting cancels the real parts; what is left is 2j times the sine." },
        { p: `You double the frequency of the spinner e^{j2π·${F}t}. What do you get?`, ok: `e^{j2π·${2 * F}t}: the same spiral, twice as many turns per second`, bad: [`2e^{j2π·${F}t}: a spiral of radius 2`, `e^{j2π·${F}t + π}: the same spiral, starting opposite`], why: "Frequency lives in the exponent as the coefficient of t." },
        { p: `A·cos(2π·${F}t + ϕ) is written as X·e^{j2π·${F}t} + X̄·e^{−j2π·${F}t}. What is X?`, ok: `(A/2)·e^{jϕ}`, bad: [`A·e^{jϕ}`, `(A/2)·e^{−jϕ}`, `A/2`], why: "Half the amplitude to each spinner; the phase rides on the positive-frequency one, its conjugate on the other." },
      ]);
      return {
        prompt: q.p,
        answer: choice(r, q.ok, q.bad, { correct: q.why }),
        steps: [`Euler both ways: e^{jθ} = cos θ + j sin θ and e^{−jθ} = cos θ − j sin θ.`, q.why],
      };
    },
  },

  {
    id: "def!phasor",
    guideId: G,
    sectionRef: "def",
    title: "From X to amplitude and phase",
    skill: "A spectrum line X at +F: the real cosine has amplitude 2|X| and phase ∠X.",
    gen(r) {
      const [x, y, m] = r.pick(TRIPLES.filter((t) => t[0] && t[1]));
      const s = r.pick([0.1, 0.5, 1]);
      const X = `${+(x * s).toFixed(2)} ${r.next() < 0.5 ? "−" : "+"} ${+(y * s).toFixed(2)}j`;
      const neg = X.includes("−");
      const amp = 2 * m * s;
      if (r.next() < 0.6)
        return {
          prompt: `A two-sided spectrum shows **X = ${X}** at +F. What is the amplitude A of the real cosine at F?`,
          answer: { kind: "number", value: amp, tolerance: 0.02 },
          steps: [`|X| = √(${+(x * s).toFixed(2)}² + ${+(y * s).toFixed(2)}²) = ${+(m * s).toFixed(2)}.`, `A real cosine splits into two spinners of half amplitude, so A = 2|X| = ${+amp.toFixed(2)}.`],
          hint: "Half the amplitude sits at +F and half at −F.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (Math.abs(v - m * s) < 0.02) return "That is |X|. The cosine's amplitude is twice that: the other half is at −F.";
            return undefined;
          },
        };
      return {
        prompt: `**X = ${X}** at +F. In which quadrant is the phase ∠X, and what is its sign?`,
        answer: choice(r, neg ? "Fourth quadrant: negative phase (real part positive, imaginary negative)" : "First quadrant: positive phase (both parts positive)", [neg ? "First quadrant: positive phase" : "Fourth quadrant: negative phase", "Second quadrant: between π/2 and π", "Third quadrant: between −π and −π/2"], {
          correct: "∠X = atan2(Im, Re): the sign of the imaginary part is the sign of the phase when the real part is positive.",
        }),
        steps: [`Re = ${+(x * s).toFixed(2)} > 0, Im = ${neg ? "−" : "+"}${+(y * s).toFixed(2)}.`, `atan2(Im, Re) is ${neg ? "negative, fourth quadrant" : "positive, first quadrant"}.`],
      };
    },
  },
];
