/**
 * Drills for LING 124 · Reading a wave: T = 1/F, dB = 20·log10(x/r),
 * reading A, F, ϕ off A·cos(2πFt + ϕ), and which plot is which.
 */
import type { Drill } from "../drill";
import { choice, fmt } from "../drill";

const G = "ling124/0-reading-a-wave";

export const drills: Drill[] = [
  {
    id: "vocab!period",
    guideId: G,
    sectionRef: "vocab",
    title: "Period and frequency",
    skill: "F = 1/T and T = 1/F, with the units right.",
    gen(r) {
      if (r.next() < 0.5) {
        const F = r.pick([10, 20, 25, 40, 50, 100, 125, 200, 250, 400, 500]);
        const Tms = 1000 / F;
        return {
          prompt: `A wave repeats **${F} times per second** (F = ${F} Hz). What is its period T, in milliseconds?`,
          answer: { kind: "number", value: Tms, tolerance: Tms * 0.005, unit: "ms" },
          steps: [`T = 1/F = 1/${F} s = ${1 / F} s.`, `In milliseconds: ${1 / F} × 1000 = ${fmt(Tms)} ms.`],
          hint: "One cycle takes 1/F seconds. Then convert seconds to ms.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (Math.abs(v - 1 / F) < 1e-9) return "That is T in seconds. The question asks for milliseconds: multiply by 1000.";
            return undefined;
          },
        };
      }
      const Tms = r.pick([2, 4, 5, 8, 10, 20, 25, 40, 50]);
      const F = 1000 / Tms;
      return {
        prompt: `On a waveform, one cycle takes **${Tms} ms**. What is the frequency, in Hz?`,
        answer: { kind: "number", value: F, tolerance: F * 0.005, unit: "Hz" },
        steps: [`${Tms} ms = ${Tms / 1000} s.`, `F = 1/T = 1/${Tms / 1000} = ${fmt(F)} Hz.`],
        hint: "Convert to seconds first, then take the reciprocal.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (Math.abs(v - 1 / Tms) < 1e-9) return "You took 1/T with T in milliseconds. That is in kHz. Convert T to seconds (÷1000) before the reciprocal.";
          return undefined;
        },
      };
    },
  },
  {
    id: "vocab!db",
    guideId: G,
    sectionRef: "vocab",
    title: "Decibels from an amplitude ratio",
    skill: "dB = 20·log₁₀(x/r); doubling is +6 dB, ×10 is +20 dB.",
    gen(r) {
      const ratio = r.pick([2, 4, 10, 100, 0.5, 0.1, 8, 0.25]);
      const a = r.pick([0.1, 0.2, 0.3, 0.5]);
      const b = a * ratio;
      const db = 20 * Math.log10(ratio);
      return {
        prompt: `Vowel (a) has peak amplitude **${+a.toFixed(3)}** and vowel (b) has peak amplitude **${+b.toFixed(3)}**. How many dB louder is (b) than (a)? (Negative if quieter.)`,
        answer: { kind: "number", value: db, tolerance: 0.3, unit: "dB" },
        steps: [`Ratio x/r = ${+b.toFixed(3)}/${+a.toFixed(3)} = ${ratio}.`, `dB = 20·log₁₀(${ratio}) = ${db.toFixed(2)} dB.`],
        hint: "Amplitude ratio first, then 20·log₁₀ of it. ×2 ≈ 6 dB, ×10 = 20 dB.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (Math.abs(v - 10 * Math.log10(ratio)) < 0.3) return "You used 10·log₁₀. That is for *power*. For amplitude it is 20·log₁₀ (power goes as amplitude squared, and the square becomes the factor 2).";
          if (Math.abs(v + db) < 0.3) return "Right size, wrong sign. (b) over (a): if (b) is bigger the answer is positive.";
          return undefined;
        },
      };
    },
  },
  {
    id: "formula!read",
    guideId: G,
    sectionRef: "formula",
    title: "Read the dials off the formula",
    skill: "Pull A, F (not 2πF) and ϕ out of A·cos(2πFt + ϕ).",
    gen(r) {
      const A = r.pick([0.5, 1, 2, 3, 6, 0.8]);
      const F = r.pick([5, 10, 50, 100, 220, 440, 1000]);
      const phis = ["0", "π/2", "π", "π/3", "π/4", "−π/2"];
      const phi = r.pick(phis);
      const form = r.pick(["A", "F", "T", "phi"]);
      const shown = `x(t) = ${A}·cos(2π·${F}·t${phi === "0" ? "" : " + " + phi})`.replace("+ −", "− ");
      if (form === "A") return { prompt: `${shown}. What is the peak amplitude?`, answer: { kind: "number", value: A }, steps: [`The number in front of cos is A = ${A}. The wave swings between −${A} and +${A}.`] };
      if (form === "F")
        return {
          prompt: `${shown}. What is the frequency, in Hz?`,
          answer: { kind: "number", value: F, unit: "Hz" },
          steps: [`Inside the cosine the coefficient of t is 2πF.`, `2π·${F} means F = ${F} Hz. The 2π converts rotations to radians; it is not part of the frequency.`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (Math.abs(v - 2 * Math.PI * F) < 0.5) return "You included the 2π. That number is the angular frequency in radians per second; F in Hz is what multiplies 2π.";
            return undefined;
          },
        };
      if (form === "T")
        return {
          prompt: `${shown}. What is the period, in seconds?`,
          answer: { kind: "number", value: 1 / F, tolerance: (1 / F) * 0.005, unit: "s" },
          steps: [`F = ${F} Hz (the number multiplying 2π).`, `T = 1/F = 1/${F} = ${1 / F} s.`],
        };
      const meaning: Record<string, string> = {
        "0": "starts at its peak (cos 0 = 1)",
        "π/2": "starts at zero, heading down (cos π/2 = 0)",
        π: "starts at its trough (cos π = −1)",
        "π/3": "starts at half its peak (cos π/3 = 0.5)",
        "π/4": "starts at about 0.71 of its peak",
        "−π/2": "starts at zero, heading up",
      };
      const others = phis.filter((p) => p !== phi);
      return {
        prompt: `${shown}. At t = 0, where is the wave in its cycle?`,
        answer: choice(r, meaning[phi], r.sample(others, 3).map((p) => meaning[p]), {
          correct: `ϕ = ${phi}: the starting angle on the circle.`,
        }),
        steps: [`At t = 0 the argument is just ϕ = ${phi}.`, `cos(${phi}) tells you the starting height: ${meaning[phi]}.`],
      };
    },
  },
  {
    id: "formula!change",
    guideId: G,
    sectionRef: "formula",
    title: "Change one dial",
    skill: "Predict what a plot does when A, F or ϕ changes (Lab 1 Q2 and Q3).",
    gen(r) {
      const A = r.pick([1, 2, 3]);
      const F = r.pick([5, 10, 20]);
      const which = r.pick(["A", "F", "phi"] as const);
      const base = `${A}cos(2π·${F}·t)`;
      const opts = {
        A: { q: `change ${A} to ${A * 3}`, ok: `Same shape, taller: it swings ±${A * 3} instead of ±${A}.` },
        F: { q: `change ${F} to ${F * 2}`, ok: `Twice as many cycles per second; the period halves to ${1 / (F * 2)} s. Height unchanged.` },
        phi: { q: "add + π inside the cosine", ok: "Same height and speed, but flipped: it starts at the trough instead of the peak." },
      };
      const o = opts[which];
      const wrong = Object.entries(opts)
        .filter(([k]) => k !== which)
        .map(([, v]) => v.ok);
      return {
        prompt: `Start from x(t) = ${base}. If you **${o.q}**, how does the plot change?`,
        answer: choice(r, o.ok, wrong, { correct: "Each dial changes one thing and leaves the other two alone." }),
        steps: [`A sets height, F sets how many cycles per second, ϕ sets the starting point.`, `You changed ${which === "phi" ? "ϕ" : which}, so: ${o.ok}`],
        hint: "Which of the three dials did you touch: height, speed, or starting point?",
      };
    },
  },
  {
    id: "spectrum!plot",
    guideId: G,
    sectionRef: "spectrum",
    title: "Which plot is this?",
    skill: "Name a plot from its axes, and know what it shows.",
    gen(r) {
      const plots = [
        { name: "Waveform", axes: "x = time, y = pressure (amplitude)", shows: "the signal itself" },
        { name: "Magnitude spectrum", axes: "x = frequency, y = amplitude", shows: "how much of each frequency is present, a snapshot" },
        { name: "Phase spectrum", axes: "x = frequency, y = phase", shows: "the starting angle of each component" },
        { name: "Spectrogram", axes: "x = time, y = frequency, darkness = amplitude", shows: "how the spectrum changes over time" },
      ];
      const p = r.pick(plots);
      const others = plots.filter((x) => x !== p).map((x) => x.name);
      return {
        prompt: `A plot has **${p.axes}**. What is it?`,
        answer: choice(r, p.name, others, { correct: `It shows ${p.shows}.` }),
        steps: [`Read the axes. ${p.axes} is the ${p.name.toLowerCase()}, which shows ${p.shows}.`],
      };
    },
  },

  {
    id: "circle!identity",
    guideId: G,
    sectionRef: "circle",
    title: "Cosine, sine, and the circle",
    skill: "cos is even, sin is odd, cos leads sin by a quarter cycle; negating the whole argument leaves a cosine alone.",
    gen(r) {
      const qs = [
        { p: "cos(−θ) equals…", ok: "cos θ (cosine is even: rotating the other way gives the same x-coordinate)", bad: ["−cos θ", "sin θ", "−sin θ"] },
        { p: "sin(−θ) equals…", ok: "−sin θ (sine is odd)", bad: ["sin θ", "cos θ", "−cos θ"] },
        { p: "cos θ equals…", ok: "sin(θ + π/2): cosine is sine a quarter cycle earlier", bad: ["sin(θ − π/2)", "sin(θ + π)", "−sin θ"] },
        { p: "2cos(2π·(−100)·t − π/3) equals…", ok: "2cos(2π·100·t + π/3): negate the whole inside and cosine doesn't care", bad: ["−2cos(2π·100·t + π/3)", "2cos(2π·100·t − π/3)", "2sin(2π·100·t + π/3)"] },
        { p: "A point going around a circle at F rotations per second, seen from the side, traces…", ok: "A sinusoid with frequency F", bad: ["A square wave", "A straight line", "A spiral"] },
        { p: "The radius of the circle is the wave's…", ok: "Peak amplitude A", bad: ["Frequency F", "Phase ϕ", "Period T"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: [`Answer: ${q.ok}.`] };
    },
  },
];
