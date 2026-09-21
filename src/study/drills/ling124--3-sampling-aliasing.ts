/**
 * Drills for LING 124 · Sampling, quantization, and aliasing.
 * Conventions follow the guide: Fₛ = 1/Tₛ, levels = 2^bits (Koo snaps
 * down), aliases of F are ±F ± kFₛ, Nyquist = Fₛ/2, folded frequency for
 * F in (Fₛ/2, Fₛ) is Fₛ − F.
 */
import type { Drill } from "../drill";
import { choice, fmt } from "../drill";

const G = "ling124/3-sampling-aliasing";
const RATES = [8000, 16000, 22050, 44100, 48000, 10000, 1000, 500, 200];

/** Apparent frequency of F sampled at Fs (the fold into [0, Fs/2]). */
function fold(F: number, Fs: number): number {
  let f = ((F % Fs) + Fs) % Fs;
  if (f > Fs / 2) f = Fs - f;
  return f;
}

export const drills: Drill[] = [
  {
    id: "sampling!interval",
    guideId: G,
    sectionRef: "sampling",
    title: "Sampling interval from the rate",
    skill: "Convert between Fₛ and Tₛ without hesitating.",
    gen(r) {
      const Fs = r.pick(RATES);
      const askT = r.next() < 0.6;
      if (askT) {
        const Ts = 1 / Fs;
        return {
          prompt: `A recording is sampled at **Fₛ = ${fmt(Fs)} Hz**. What is the sampling interval Tₛ, in seconds?`,
          answer: { kind: "number", value: Ts, tolerance: Ts * 0.005, unit: "s" },
          steps: [`Tₛ = 1/Fₛ.`, `1/${fmt(Fs)} = ${Ts.toExponential(3)} s (about ${(Ts * 1000).toFixed(4)} ms).`],
          hint: "They are reciprocals: one is samples per second, the other is seconds per sample.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (Math.abs(v - Fs) < 1) return "That is Fₛ itself. Tₛ is the *time between samples*, so it is 1/Fₛ, a small number of seconds.";
            if (Math.abs(v - Ts * 1000) < Ts * 10) return "That is Tₛ in milliseconds. The question asks for seconds, so divide by 1000.";
            return undefined;
          },
        };
      }
      const TsMs = r.pick([0.125, 0.0625, 0.05, 0.1, 0.02, 0.5, 1, 2]);
      const Fs2 = 1000 / TsMs;
      return {
        prompt: `Samples are taken every **${TsMs} ms**. What is the sampling rate Fₛ, in Hz?`,
        answer: { kind: "number", value: Fs2, tolerance: Fs2 * 0.005, unit: "Hz" },
        steps: [`Convert to seconds: ${TsMs} ms = ${TsMs / 1000} s.`, `Fₛ = 1/Tₛ = 1/${TsMs / 1000} = ${fmt(Fs2)} Hz.`],
        hint: "Milliseconds first. 1 ms = 0.001 s.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (Math.abs(v - 1 / TsMs) < 0.01) return "You took 1/Tₛ with Tₛ in milliseconds. That gives kHz, not Hz. Multiply by 1000.";
          return undefined;
        },
      };
    },
  },
  {
    id: "sampling!count",
    guideId: G,
    sectionRef: "sampling",
    title: "How many samples",
    skill: "Samples in a stretch of audio = duration × Fₛ (the Lab 2 formula).",
    gen(r) {
      const Fs = r.pick([8000, 16000, 44100, 100, 200, 1000]);
      const T = r.pick([0.5, 1, 2, 2.5, 0.25, 3, 0.1]);
      const n = T * Fs;
      return {
        prompt: `At **Fₛ = ${fmt(Fs)} Hz**, how many samples are in **${T} s** of audio?`,
        answer: { kind: "number", value: n, unit: "samples" },
        steps: [`Samples = duration × Fₛ.`, `${T} × ${fmt(Fs)} = ${fmt(n)}.`],
        hint: "Fₛ is samples *per second*. Multiply by the seconds.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (Math.abs(v - Fs / T) < 1) return "You divided. Fₛ is samples per second, so more seconds means *more* samples: multiply.";
          return undefined;
        },
      };
    },
  },
  {
    id: "quant!levels",
    guideId: G,
    sectionRef: "quant",
    title: "Bits and levels",
    skill: "b bits → 2ᵇ levels, and back.",
    gen(r) {
      const bits = r.int(3, 16);
      const levels = 2 ** bits;
      if (r.next() < 0.5) {
        return {
          prompt: `A quantizer uses **${bits} bits** per sample. How many amplitude levels can it represent?`,
          answer: { kind: "number", value: levels, unit: "levels" },
          steps: [`Levels = 2^bits.`, `2^${bits} = ${fmt(levels)}.`],
          hint: "Each extra bit doubles the count.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (v === bits * 2) return "You doubled the bits. Each bit *doubles the levels*, so it is 2 multiplied by itself b times: 2^b.";
            if (v === levels - 1) return `Off by one: ${fmt(levels - 1)} is the *highest index* (0 to ${fmt(levels - 1)}), but the *count* of levels is ${fmt(levels)}.`;
            return undefined;
          },
        };
      }
      return {
        prompt: `You need at least **${fmt(levels)} amplitude levels**. What is the smallest number of bits per sample that gives you that?`,
        answer: { kind: "number", value: bits, unit: "bits" },
        steps: [`Levels = 2^bits, so bits = log₂(levels).`, `log₂(${fmt(levels)}) = ${bits}, because 2^${bits} = ${fmt(levels)}.`],
        hint: "How many times can you halve the level count before reaching 1?",
      };
    },
  },
  {
    id: "alias!fold",
    guideId: G,
    sectionRef: "alias",
    title: "What frequency will it appear as?",
    skill: "Fold any frequency into the 0 to Fₛ/2 band (Lab 2 Q13 to Q15).",
    gen(r) {
      const Fs = r.pick([8000, 10000, 16000, 1000, 500, 100, 200]);
      const F = r.pick([0.55, 0.6, 0.7, 0.75, 0.9, 1.1, 1.25, 1.5]) * Fs;
      const app = fold(F, Fs);
      return {
        prompt: `A **${fmt(F)} Hz** tone is sampled at **Fₛ = ${fmt(Fs)} Hz**. After sampling, what frequency (in Hz) will it appear to be?`,
        answer: { kind: "number", value: app, tolerance: 0.5, unit: "Hz" },
        steps: [
          `Nyquist = Fₛ/2 = ${fmt(Fs / 2)} Hz. ${fmt(F)} is above it, so it aliases.`,
          F < Fs
            ? `Its alias −F + Fₛ = ${fmt(Fs)} − ${fmt(F)} = ${fmt(Fs - F)} Hz lands inside the band. That is the mirror image around ${fmt(Fs / 2)}.`
            : `Subtract Fₛ until you are below it: ${fmt(F)} − ${fmt(Fs)} = ${fmt(F - Fs)} Hz${F - Fs > Fs / 2 ? `, still above Nyquist, so mirror: ${fmt(Fs)} − ${fmt(F - Fs)} = ${fmt(app)} Hz` : ""}.`,
          `The computer keeps only the samples, and those samples are exactly the samples of a ${fmt(app)} Hz cosine.`,
        ],
        hint: "Aliases of F are ±F ± kFₛ. Find the one that lands between 0 and Fₛ/2.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (Math.abs(v - F) < 0.5) return "You answered the original frequency. It is above Nyquist (Fₛ/2), so after sampling it cannot survive as itself: it folds down.";
          if (Math.abs(v - Fs / 2) < 0.5) return "That is the Nyquist frequency, the *edge* of the band. The question asks where this particular tone lands inside the band.";
          if (Math.abs(v - (F - Fs / 2)) < 0.5) return "You subtracted Fₛ/2. Aliases differ from F by whole multiples of Fₛ (not Fₛ/2), and the mirror is around Fₛ/2, which gives Fₛ − F.";
          if (v < 0 && Math.abs(-v - app) < 0.5) return "Negative frequency: right idea, but a cosine at −f looks identical to +f. Report the positive value.";
          return undefined;
        },
      };
    },
  },
  {
    id: "alias!nyquist",
    guideId: G,
    sectionRef: "alias",
    title: "Nyquist, and the rate you need",
    skill: "Fₛ/2 is the highest frequency you can keep; to keep F you need Fₛ ≥ 2F.",
    gen(r) {
      if (r.next() < 0.5) {
        const Fs = r.pick(RATES);
        return {
          prompt: `Sampling at **Fₛ = ${fmt(Fs)} Hz**: what is the highest frequency that survives without aliasing (the Nyquist frequency)?`,
          answer: { kind: "number", value: Fs / 2, unit: "Hz" },
          steps: [`Nyquist frequency = Fₛ/2.`, `${fmt(Fs)}/2 = ${fmt(Fs / 2)} Hz.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (Math.abs(v - Fs) < 0.5) return "That is the sampling rate itself. 0 and Fₛ are aliases of each other, so the alias-free band ends halfway: Fₛ/2.";
            if (Math.abs(v - 2 * Fs) < 0.5) return "Backwards: 2Fₛ is what you would need to *capture* Fₛ. The band you keep at rate Fₛ is only up to Fₛ/2.";
            return undefined;
          },
        };
      }
      const F = r.pick([3400, 4000, 8000, 10000, 20000, 150, 2500]);
      return {
        prompt: `You must capture frequencies up to **${fmt(F)} Hz** with no aliasing. What is the minimum sampling rate, in Hz?`,
        answer: { kind: "number", value: 2 * F, unit: "Hz" },
        steps: [`Need F ≤ Fₛ/2, so Fₛ ≥ 2F.`, `2 × ${fmt(F)} = ${fmt(2 * F)} Hz.`],
        hint: "Two samples per cycle of the highest frequency.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (Math.abs(v - F) < 0.5) return "Sampling at F gives a Nyquist of F/2, so F itself would alias to 0. You need twice that.";
          if (Math.abs(v - F / 2) < 0.5) return "Halved instead of doubled. Fₛ/2 must be at least F, so Fₛ must be at least 2F.";
          return undefined;
        },
      };
    },
  },
  {
    id: "alias!which",
    guideId: G,
    sectionRef: "alias",
    title: "Which frequencies are aliases",
    skill: "Recognise the alias family ±F ± kFₛ by sight.",
    gen(r) {
      const Fs = r.pick([1000, 8000, 100, 500]);
      const F = r.int(1, 9) * (Fs / 20);
      const k = r.int(1, 2);
      const good = r.pick([F + k * Fs, Fs - F, -F, F + Fs, 2 * Fs - F]);
      const bad = r.shuffle([F + Fs / 2, Fs / 2, F * 2, Fs - 2 * F, F + Fs / 4]).filter((x) => x !== good && Math.abs(fold(x, Fs) - fold(F, Fs)) > 0.5).slice(0, 3);
      return {
        prompt: `Fₛ = **${fmt(Fs)} Hz**, F = **${fmt(F)} Hz**. Which of these is an alias of F (gives identical samples)?`,
        answer: choice(r, `${fmt(good)} Hz`, bad.map((b) => `${fmt(b)} Hz`), {
          correct: `${fmt(good)} = ${good < 0 ? "−F" : good === Fs - F ? "−F + Fₛ" : good === 2 * Fs - F ? "−F + 2Fₛ" : `F + ${(good - F) / Fs}Fₛ`}, one of the ±F ± kFₛ family.`,
          wrong: bad.map((b) => (b === Fs / 2 ? "Fₛ/2 is the Nyquist edge, not an alias of F." : b === F + Fs / 2 || b === F + Fs / 4 ? "Aliases differ from F by whole multiples of Fₛ, never by Fₛ/2 or Fₛ/4." : b === 2 * F ? "Doubling F is a different tone. Aliases add or subtract Fₛ, they don't scale." : `Fₛ − 2F is not in the family: check ±F ± kFₛ.`)),
        }),
        steps: [`Aliases of F at rate Fₛ: −F, F ± Fₛ, −F ± Fₛ, F ± 2Fₛ, …`, `Only ${fmt(good)} Hz fits that pattern.`],
      };
    },
  },
];
