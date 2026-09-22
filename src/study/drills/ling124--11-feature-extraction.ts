/**
 * Drills for LING 124 · Days 11–12, feature extraction: pre-emphasis,
 * energy, Hz → mel, quefrency → frequency, deltas, and the MFCC pipeline.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling124/11-feature-extraction";

export const drills: Drill[] = [
  {
    id: "pre!compute",
    guideId: G,
    sectionRef: "pre",
    title: "Pre-emphasis",
    skill: "y[n] = x[n] − α·x[n−1], with x[−1] = 0.",
    gen(r) {
      const x = Array.from({ length: 4 }, () => r.int(-4, 6));
      const a = r.pick([0.9, 0.95, 0.97, 0.98]);
      const n = r.int(1, 3);
      const v = x[n] - a * x[n - 1];
      return {
        prompt: `x = [${x.join(", ")}], α = ${a}. What is y[${n}]? (2 decimals)`,
        answer: { kind: "number", value: v, tolerance: 0.006 },
        steps: [`y[${n}] = x[${n}] − α·x[${n - 1}] = ${x[n]} − ${a}·${x[n - 1]} = ${v.toFixed(2)}.`],
        diagnose(input) {
          const got = Number(input.replace(/[^0-9.-]/g, ""));
          if (Math.abs(got - (x[n] - a * (x[n + 1] ?? 0))) < 0.006 && n < 3) return "Use the PREVIOUS sample, x[n−1], not the next one.";
          if (Math.abs(got - (x[n] + a * x[n - 1])) < 0.006) return "It's a subtraction: x[n] − α·x[n−1].";
          return undefined;
        },
      };
    },
  },
  {
    id: "energy!sum",
    guideId: G,
    sectionRef: "energy",
    title: "Frame energy",
    skill: "E = Σ x[n]².",
    gen(r) {
      const x = Array.from({ length: r.int(3, 5) }, () => r.pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 3]));
      const v = x.reduce((s, xi) => s + xi * xi, 0);
      return {
        prompt: `Frame x = [${x.join(", ")}]. Energy Σ x[n]²?`,
        answer: { kind: "number", value: v, tolerance: 1e-6 },
        steps: [x.map((xi) => `(${xi})²`).join(" + ") + ` = ${v}.`],
        diagnose(input) {
          if (Math.abs(Number(input) - x.reduce((s, xi) => s + xi, 0)) < 1e-6) return "You added the samples; square each one first (negatives would cancel otherwise).";
          return undefined;
        },
      };
    },
  },
  {
    id: "mel!convert",
    guideId: G,
    sectionRef: "mel",
    title: "Hz → mel",
    skill: "mel = 1125 · ln(1 + f/700).",
    gen(r) {
      const f = r.pick([200, 500, 700, 1000, 1500, 2500, 3000, 4000, 6000]);
      const v = 1125 * Math.log(1 + f / 700);
      return {
        prompt: `Convert **${f} Hz** to mel with mel = 1125·ln(1 + f/700). (nearest whole mel)`,
        answer: { kind: "number", value: v, tolerance: 1.5, unit: "mel" },
        steps: [`1 + ${f}/700 = ${(1 + f / 700).toFixed(4)}.`, `ln(…) = ${Math.log(1 + f / 700).toFixed(4)}.`, `× 1125 = ${v.toFixed(0)} mel.`],
        diagnose(input) {
          const got = Number(input.replace(/[^0-9.]/g, ""));
          if (Math.abs(got - 1125 * Math.log10(1 + f / 700)) < 2) return "That used log base 10. The formula uses the natural log, ln.";
          return undefined;
        },
      };
    },
  },
  {
    id: "cep!quefrency",
    guideId: G,
    sectionRef: "cep",
    title: "Quefrency → F0",
    skill: "frequency = sampling rate ÷ quefrency; low quefrency = high pitch.",
    gen(r) {
      const fs = r.pick([16000, 22050, 44100, 48000]);
      const f0 = r.pick([100, 120, 150, 200, 240, 300, 400]);
      const q = Math.round(fs / f0);
      const v = fs / q;
      return {
        prompt: `Fₛ = ${fs} Hz. The cepstrum has a peak at quefrency **${q}**. What F0 does it indicate? (1 decimal)`,
        answer: { kind: "number", value: v, tolerance: 0.2, unit: "Hz" },
        steps: [`frequency = Fₛ ÷ quefrency = ${fs} ÷ ${q} = ${v.toFixed(1)} Hz.`],
        hint: "Same move as lag → F0 in autocorrelation.",
      };
    },
  },
  {
    id: "delta!compute",
    guideId: G,
    sectionRef: "delta",
    title: "Delta and delta-delta",
    skill: "Δ[n] = (x[n+1] − x[n−1]) / 2; Δ² is the same formula applied to Δ.",
    gen(r) {
      const x = Array.from({ length: 5 }, () => r.int(-3, 10));
      const d = (i: number) => (x[i + 1] - x[i - 1]) / 2;
      if (r.next() < 0.6) {
        const n = r.int(1, 3);
        return {
          prompt: `A feature over five frames: x = [${x.join(", ")}]. What is Δ[${n}]?`,
          answer: { kind: "number", value: d(n) },
          steps: [`Δ[${n}] = (x[${n + 1}] − x[${n - 1}]) / 2 = (${x[n + 1]} − ${x[n - 1]}) / 2 = ${d(n)}.`],
          diagnose(input) {
            const got = Number(input.trim());
            if (got === x[n + 1] - x[n - 1]) return "Divide by 2: the two neighbours are two frames apart.";
            if (got === x[n + 1] - x[n]) return "Use the neighbours on BOTH sides: x[n+1] − x[n−1], not x[n+1] − x[n].";
            return undefined;
          },
        };
      }
      const dd = (d(3) - d(1)) / 2;
      return {
        prompt: `x = [${x.join(", ")}]. Compute Δ[1] and Δ[3], then Δ²[2].`,
        answer: { kind: "number", value: dd },
        steps: [`Δ[1] = (${x[2]} − ${x[0]}) / 2 = ${d(1)}.`, `Δ[3] = (${x[4]} − ${x[2]}) / 2 = ${d(3)}.`, `Δ²[2] = (Δ[3] − Δ[1]) / 2 = ${dd}.`],
        hint: "Delta-delta treats the deltas as the new sequence.",
      };
    },
  },
  {
    id: "mfcc!concepts",
    guideId: G,
    sectionRef: "mfcc",
    title: "The pipeline, conceptually",
    skill: "Say what each stage is for and how the 39 numbers are made up.",
    gen(r) {
      const qs = [
        { p: "The classic ASR feature vector has 39 numbers. They are…", ok: "13 MFCCs (or 12 + energy), 13 deltas, 13 delta-deltas", bad: ["39 Mel filterbank energies", "13 MFCCs repeated for 3 frames", "39 DFT magnitudes"] },
        { p: "Feature extraction tries to capture…", ok: "the filter (vocal tract shape), not the source", bad: ["the source (pitch), not the filter", "only the loudness", "the raw waveform"] },
        { p: "Cepstral analysis is…", ok: "log magnitude spectrum, then its 'spectrum' via the DCT", bad: ["DCT, then log", "the inverse DFT of the waveform", "autocorrelation of the spectrum"] },
        { p: "Why is the Mel filterbank's resolution finer at low frequencies?", ok: "Human hearing distinguishes low frequencies much more finely", bad: ["Low frequencies carry more energy", "The DFT has more bins there", "High frequencies are removed by pre-emphasis"] },
        { p: "Pre-emphasis is needed because…", ok: "the source spectrum slopes down, weakening high frequencies", bad: ["the microphone adds noise", "the DFT leaks energy", "the mel scale is logarithmic"] },
        { p: "Liftering keeps the low-quefrency coefficients and inverts the DCT. You get…", ok: "a smooth spectral envelope: the formants without the harmonics", bad: ["the harmonics without the formants", "the pitch track", "the waveform"] },
        { p: "Why add deltas?", ok: "Consonants are identified by how the spectrum moves (formant transitions)", bad: ["To double the number of features for free", "To remove pitch", "To normalize loudness"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: [`${q.ok}.`] };
    },
  },
];
