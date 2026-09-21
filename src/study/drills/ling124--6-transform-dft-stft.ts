/**
 * Drills for LING 124 · DFT and STFT: bin spacing Fₛ/N, which bin holds a
 * frequency, N for a wanted resolution, the leakage grid 1/frame, and the
 * STFT bookkeeping (nperseg, hop, noverlap, frames, one-sided bins).
 */
import type { Drill } from "../drill";
import { choice, fmt } from "../drill";

const G = "ling124/6-transform-dft-stft";

export const drills: Drill[] = [
  {
    id: "dft!resolution",
    guideId: G,
    sectionRef: "dft",
    title: "Bin spacing and which bin",
    skill: "Frequency resolution = Fₛ/N; bin k sits at k·Fₛ/N.",
    gen(r) {
      const Fs = r.pick([8000, 16000, 44100, 1000, 4000]);
      const N = r.pick([64, 128, 256, 512, 1024, 2048]);
      const res = Fs / N;
      const mode = r.pick(["res", "bin", "N"]);
      if (mode === "res")
        return {
          prompt: `A **${N}-point DFT** of a signal sampled at **${fmt(Fs)} Hz**. What is the spacing between bins, in Hz?`,
          answer: { kind: "number", value: res, tolerance: 0.01, unit: "Hz" },
          steps: [`Resolution = Fₛ/N.`, `${fmt(Fs)}/${N} = ${+res.toFixed(4)} Hz per bin.`],
          hint: "N samples span N/Fₛ seconds; the DFT treats that span as one period.",
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.e-]/g, ""));
            if (Math.abs(v - N / Fs) < 1e-9) return "You computed N/Fₛ, which is the frame *duration* in seconds. Bin spacing is its reciprocal, Fₛ/N.";
            return undefined;
          },
        };
      if (mode === "bin") {
        const k = r.int(2, Math.floor(N / 4));
        const f = k * res;
        return {
          prompt: `${N}-point DFT, Fₛ = ${fmt(Fs)} Hz. Which bin index k holds **${+f.toFixed(3)} Hz**?`,
          answer: { kind: "number", value: k },
          steps: [`Bin spacing = Fₛ/N = ${+res.toFixed(4)} Hz.`, `k = F/(Fₛ/N) = ${+f.toFixed(3)}/${+res.toFixed(4)} = ${k}.`],
          hint: "Divide the frequency by the bin spacing.",
        };
      }
      const wantRes = r.pick([5, 10, 20, 25, 50, 100]);
      const Nw = Fs / wantRes;
      return {
        prompt: `You want **${wantRes} Hz** resolution at **Fₛ = ${fmt(Fs)} Hz**. How many samples per frame do you need?`,
        answer: { kind: "number", value: Nw, tolerance: 0.5, unit: "samples" },
        steps: [`Resolution = Fₛ/N, so N = Fₛ/resolution.`, `${fmt(Fs)}/${wantRes} = ${fmt(Nw)} samples (that is ${fmt(Nw / Fs)} s of audio).`],
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (Math.abs(v - Fs * wantRes) < 1) return "You multiplied. Finer resolution needs a *longer* frame: N = Fₛ divided by the wanted spacing.";
          return undefined;
        },
      };
    },
  },
  {
    id: "window!grid",
    guideId: G,
    sectionRef: "window",
    title: "Will it leak?",
    skill: "A frame of length L seconds has harmonic grid 1/L; a tone off the grid leaks.",
    gen(r) {
      const Lms = r.pick([10, 20, 25, 40, 50]);
      const grid = 1000 / Lms;
      const mult = r.int(2, 12);
      const onGrid = r.next() < 0.4;
      const F = onGrid ? mult * grid : mult * grid + r.pick([grid / 4, grid / 2, grid * 0.3]);
      const yes = "Yes: it is not a whole multiple of the grid spacing, so its energy spreads into the neighbouring bins";
      const no = "No: it sits exactly on the grid, so it lands in one bin";
      return {
        prompt: `A **${fmt(F)} Hz** tone is analysed with a **${Lms} ms** rectangular window. Does it leak?`,
        answer: choice(r, onGrid ? no : yes, [onGrid ? yes : no], {
          correct: `Grid spacing = 1/${Lms / 1000} s = ${grid} Hz. ${fmt(F)}/${grid} = ${+(F / grid).toFixed(2)}${onGrid ? ", a whole number." : ", not a whole number."}`,
          wrong: [onGrid ? "Check the arithmetic: the tone is a whole multiple of 1/L, so a whole number of cycles fits the frame." : "The frame ends mid-cycle: repeated, it has a jump, and a jump needs many frequencies to describe."],
        }),
        steps: [`The frame, repeated, has period ${Lms} ms, so the DFT's grid is F₀ = 1/${Lms / 1000} = ${grid} Hz: ${grid}, ${2 * grid}, ${3 * grid}, …`, `${fmt(F)} Hz is ${onGrid ? "on" : "not on"} that grid → ${onGrid ? "no leakage" : "leakage into the bins around it"}.`],
        hint: "Grid spacing is 1 over the frame length in seconds.",
      };
    },
  },
  {
    id: "stft!params",
    guideId: G,
    sectionRef: "stft",
    title: "STFT bookkeeping",
    skill: "nperseg, hop, noverlap, frame count and one-sided bins from Fₛ and the ms settings.",
    gen(r) {
      const Fs = r.pick([8000, 16000]);
      const frameMs = r.pick([16, 20, 25, 32, 40]);
      const shiftMs = r.pick([5, 8, 10]);
      const secs = r.pick([1, 2, 3]);
      const nperseg = Math.round((Fs * frameMs) / 1000);
      const hop = Math.round((Fs * shiftMs) / 1000);
      const noverlap = nperseg - hop;
      const total = Fs * secs;
      const frames = Math.floor((total - nperseg) / hop) + 1;
      const bins = Math.floor(nperseg / 2) + 1;
      const ask = r.pick(["nperseg", "hop", "noverlap", "frames", "bins"]);
      const base = `Fₛ = ${fmt(Fs)} Hz, frame ${frameMs} ms, shift ${shiftMs} ms, ${secs} s of audio, nfft = nperseg.`;
      const table: Record<string, { q: string; v: number; steps: string[] }> = {
        nperseg: { q: "What is nperseg (samples per frame)?", v: nperseg, steps: [`nperseg = Fₛ × frame size in seconds = ${fmt(Fs)} × ${frameMs / 1000} = ${nperseg}.`] },
        hop: { q: "What is the hop length (samples)?", v: hop, steps: [`hop = Fₛ × frame shift = ${fmt(Fs)} × ${shiftMs / 1000} = ${hop}.`] },
        noverlap: { q: "What is noverlap?", v: noverlap, steps: [`nperseg = ${nperseg}, hop = ${hop}.`, `noverlap = nperseg − hop = ${noverlap}.`] },
        frames: {
          q: "How many frames (no padding)?",
          v: frames,
          steps: [`Total samples = ${fmt(Fs)} × ${secs} = ${fmt(total)}; nperseg = ${nperseg}; hop = ${hop}.`, `frames = ⌊(${fmt(total)} − ${nperseg}) / ${hop}⌋ + 1 = ${Math.floor((total - nperseg) / hop)} + 1 = ${frames}.`],
        },
        bins: { q: "How many one-sided frequency bins?", v: bins, steps: [`nperseg = ${nperseg}.`, `one-sided bins = nperseg//2 + 1 = ${Math.floor(nperseg / 2)} + 1 = ${bins}.`] },
      };
      const t = table[ask];
      return {
        prompt: `${base} **${t.q}**`,
        answer: { kind: "number", value: t.v },
        steps: t.steps,
        hint: "Milliseconds to seconds, then multiply by Fₛ. Everything else is arithmetic on those two numbers.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.e-]/g, ""));
          if (ask === "frames" && v === Math.floor(total / hop)) return "You divided the whole signal by the hop. The first frame already covers nperseg samples, so subtract it first: ⌊(total − nperseg)/hop⌋ + 1.";
          if (ask === "frames" && v === frames - 1) return "Off by one: the ⌊…⌋ counts the *hops*, and the first frame is not a hop. Add 1.";
          if (ask === "bins" && v === nperseg / 2) return "One-sided keeps k = 0 through N/2 inclusive: that is N/2 + 1 bins, not N/2.";
          if (ask === "noverlap" && v === hop) return "That is the hop. noverlap is what two neighbouring frames *share*: nperseg − hop.";
          return undefined;
        },
      };
    },
  },
  {
    id: "stft!band",
    guideId: G,
    sectionRef: "stft",
    title: "Narrow-band or broad-band",
    skill: "Window length decides what a spectrogram shows: harmonics (long) or striations and formants (short).",
    gen(r) {
      const q = r.pick([
        { p: "A spectrogram shows harmonics as fine horizontal lines. Which window made it?", ok: "A long window (narrow-band): fine frequency resolution", bad: ["A short window (broad-band): fine time resolution"] },
        { p: "A spectrogram shows vertical striations (one per glottal pulse) and thick formant bands. Which window made it?", ok: "A short window (broad-band): fine time resolution", bad: ["A long window (narrow-band): fine frequency resolution"] },
        { p: "You lengthen the analysis window. What happens to the spectrogram?", ok: "Frequency resolution improves, time resolution worsens: harmonics appear, striations blur", bad: ["Both resolutions improve", "Time resolution improves, frequency resolution worsens"] },
      ]);
      return {
        prompt: q.p,
        answer: choice(r, q.ok, q.bad, { correct: "Resolution = Fₛ/N: longer N means finer frequency spacing, but each frame covers more time." }),
        steps: ["Longer frame → smaller Fₛ/N → harmonics resolve → narrow-band.", "Shorter frame → coarser bins but each frame is a moment in time → pulses show as striations → broad-band."],
      };
    },
  },
];
