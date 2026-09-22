/**
 * Drills for LING 124 · Days 9–10: dot products, autocorrelation at a lag,
 * reading the period off autocorrelation values, lag → F0, the plausible
 * lag range, and word error rate.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling124/9-pitch-asr";

function autocorr(x: number[], k: number): number {
  let s = 0;
  for (let n = k; n < x.length; n++) s += x[n] * x[n - k];
  return s;
}

export const drills: Drill[] = [
  {
    id: "dot!compute",
    guideId: G,
    sectionRef: "dot",
    title: "Dot product",
    skill: "Multiply position by position and add.",
    gen(r) {
      const n = r.int(3, 5);
      const x = Array.from({ length: n }, () => r.int(-3, 3));
      const y = Array.from({ length: n }, () => r.int(-3, 3));
      const v = x.reduce((s, xi, i) => s + xi * y[i], 0);
      return {
        prompt: `x = [${x.join(", ")}], y = [${y.join(", ")}]. What is x · y?`,
        answer: { kind: "number", value: v },
        steps: [x.map((xi, i) => `(${xi})(${y[i]})`).join(" + ") + ` = ${v}.`],
        hint: "Pair up the numbers in the same position, multiply each pair, add the products.",
      };
    },
  },
  {
    id: "auto!lag",
    guideId: G,
    sectionRef: "auto",
    title: "Autocorrelation at one lag",
    skill: "r[k] = Σ x[n]·x[n−k], with the shifted copy zero-padded.",
    gen(r) {
      const n = r.int(5, 7);
      const x = Array.from({ length: n }, () => r.int(-2, 3));
      const k = r.int(1, 3);
      const v = autocorr(x, k);
      const pairs: string[] = [];
      for (let i = k; i < n; i++) pairs.push(`x[${i}]·x[${i - k}] = ${x[i]}·${x[i - k]}`);
      return {
        prompt: `x = [${x.join(", ")}]. Compute the autocorrelation at lag **k = ${k}** (pad the delayed copy with zeros).`,
        answer: { kind: "number", value: v },
        steps: [`Delayed copy: [${[...Array(k).fill(0), ...x.slice(0, n - k)].join(", ")}].`, ...pairs, `Sum = ${v}.`],
        hint: "Shift x right by k and put zeros in front, then take the dot product with the original.",
        diagnose(input) {
          const got = Number(input.trim());
          if (got === autocorr(x, 0)) return "That's lag 0 (the signal times itself). Shift the copy by k first.";
          return undefined;
        },
      };
    },
  },
  {
    id: "auto!period",
    guideId: G,
    sectionRef: "auto",
    title: "Find the period",
    skill: "The first peak after lag 0 is the period in samples.",
    gen(r) {
      const T = r.int(4, 9);
      const shape = Array.from({ length: T }, (_, i) => Math.round(3 * Math.sin((2 * Math.PI * i) / T)));
      const x: number[] = [];
      while (x.length < T * 3) x.push(...shape);
      const vals = Array.from({ length: T + 3 }, (_, k) => autocorr(x, k));
      // first local max after 0
      let peak = 1;
      for (let k = 1; k < vals.length - 1; k++) if (vals[k] >= vals[k - 1] && vals[k] >= vals[k + 1] && vals[k] > 0) {
        peak = k;
        break;
      }
      return {
        prompt: `Autocorrelation values for lags 0, 1, 2, …: [${vals.join(", ")}]. What is the period in samples?`,
        answer: { kind: "number", value: peak },
        steps: [`Skip lag 0 (always the biggest).`, `The values dip, then rise again; the first peak after 0 is at lag ${peak}.`, `Period = ${peak} samples.`],
        diagnose(input) {
          if (Number(input.trim()) === 0) return "Lag 0 is the signal matched with itself: it's always the maximum and says nothing about the period.";
          return undefined;
        },
      };
    },
  },
  {
    id: "f0!convert",
    guideId: G,
    sectionRef: "f0",
    title: "Lag → F0",
    skill: "F0 = sampling rate ÷ period in samples.",
    gen(r) {
      const fs = r.pick([8000, 10000, 16000, 22050, 44100]);
      const f0 = r.pick([80, 100, 125, 150, 200, 220, 250, 300]);
      const lag = Math.round(fs / f0);
      const v = fs / lag;
      return {
        prompt: `Fₛ = ${fs} Hz. The first autocorrelation peak is at lag **${lag}**. F0 in Hz? (1 decimal)`,
        answer: { kind: "number", value: v, tolerance: 0.2, unit: "Hz" },
        steps: [`F0 = ${fs} ÷ ${lag} = ${v.toFixed(1)} Hz.`],
        diagnose(input) {
          const got = Number(input.replace(/[^0-9.]/g, ""));
          if (Math.abs(got - lag / fs) < 1e-3) return "That's the period in seconds. F0 is its reciprocal: Fₛ ÷ lag.";
          return undefined;
        },
      };
    },
  },
  {
    id: "heur!range",
    guideId: G,
    sectionRef: "heur",
    title: "Plausible or not?",
    skill: "Reject pitch estimates outside 75–600 Hz, and know which lags that allows.",
    gen(r) {
      const fs = r.pick([16000, 10000, 22050]);
      const lag = r.pick([4, 6, 10, 20, 30, 60, 80, 120, 180, 250, 300]);
      const f0 = fs / lag;
      const ok = f0 >= 75 && f0 <= 600;
      return {
        prompt: `Fₛ = ${fs} Hz, first peak at lag ${lag}. With a 75–600 Hz pitch range, do you keep this frame's pitch?`,
        answer: choice(r, ok ? `Keep: ${f0.toFixed(0)} Hz is plausible` : `Reject: ${f0.toFixed(0)} Hz is outside 75–600 Hz`, [ok ? `Reject: ${f0.toFixed(0)} Hz is outside 75–600 Hz` : `Keep: ${f0.toFixed(0)} Hz is plausible`]),
        steps: [`F0 = ${fs} ÷ ${lag} = ${f0.toFixed(1)} Hz.`, ok ? "Inside the range." : f0 > 600 ? "Too high: probably an aperiodic frame (noise or a fricative)." : "Too low for a voice: probably silence or a doubled period."],
      };
    },
  },
  {
    id: "wer!compute",
    guideId: G,
    sectionRef: "wer",
    title: "Word error rate",
    skill: "WER = (S + D + I) ÷ N, N = reference length.",
    gen(r) {
      const N = r.int(6, 20);
      const S = r.int(0, 3);
      const D = r.int(0, 2);
      const I = r.int(0, 2);
      const v = ((S + D + I) / N) * 100;
      return {
        prompt: `A reference transcript has **${N}** words. The recognizer made ${S} substitution(s), ${D} deletion(s) and ${I} insertion(s). WER in %? (1 decimal)`,
        answer: { kind: "number", value: v, tolerance: 0.15, unit: "%" },
        steps: [`WER = (${S} + ${D} + ${I}) ÷ ${N} = ${S + D + I}/${N} = ${v.toFixed(1)}%.`],
        diagnose(input) {
          const got = Number(input.replace(/[^0-9.]/g, ""));
          const hyp = N - D + I;
          if (Math.abs(got - ((S + D + I) / hyp) * 100) < 0.2 && hyp !== N) return `You divided by the hypothesis length (${hyp}). WER divides by the reference length, ${N}.`;
          if (Math.abs(got - ((S + D) / N) * 100) < 0.2 && I > 0) return "Insertions count as errors too.";
          return undefined;
        },
      };
    },
  },
];
