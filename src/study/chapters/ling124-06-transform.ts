import type { Chapter, Frame } from "../types";

/**
 * LING 124 · Days 6–8 — Fourier transform, DFT, windowing, STFT. Built from
 * fourier_transform.pdf, dft.pdf, windowing.pdf, stft.pdf, J&M 9.3.2, the
 * National Instruments FFT/windowing note, and Labs 5–7 (Lab 7 is open now).
 */
const stftFrames: Frame[] = [
  { kind: "lines", lines: ["Fₛ = 16,000 Hz, frame 25 ms, shift 10 ms, 1 s of audio", "nperseg = Fₛ × 0.025 = 400 samples per frame", "hop     = Fₛ × 0.010 = 160 samples per shift", "noverlap = nperseg − hop = 240", "nfft = 512 (pad 400 → 512, a power of two)", "one-sided bins = nfft//2 + 1 = 257", "frames = ⌊(16000 − 400)/160⌋ + 1 = ⌊97.5⌋ + 1 = 98"], active: 0, caption: "A standard speech setup. We'll compute every STFT parameter from these four numbers. This is the shape of a Lab 7/8 question." },
  ...[1,2,3,4,5,6].map((a) => ({ kind: "lines" as const, lines: ["Fₛ = 16,000 Hz, frame 25 ms, shift 10 ms, 1 s of audio", "nperseg = Fₛ × 0.025 = 400 samples per frame", "hop     = Fₛ × 0.010 = 160 samples per shift", "noverlap = nperseg − hop = 240", "nfft = 512 (pad 400 → 512, a power of two)", "one-sided bins = nfft//2 + 1 = 257", "frames = ⌊(16000 − 400)/160⌋ + 1 = ⌊97.5⌋ + 1 = 98"], active: a, caption: ["", "Frame size in seconds × samples per second = samples per frame. 25 ms is the standard speech frame: long enough to see pitch, short enough that the sound doesn't change much inside it.", "Frame shift × Fₛ = how many samples the window slides each step. 10 ms is standard: frames overlap.", "Overlap = frame length minus hop. 400 − 160 = 240 samples of each frame are shared with the previous one.", "The FFT is fastest on powers of two, so pad each 400-sample frame with 112 zeros up to 512. nfft ≥ nperseg; smaller is an error.", "A real signal's spectrum is mirror-symmetric (Chapter 4), so keep only the non-negative half: bins 0 through 256. Bin spacing = Fₛ/nfft = 31.25 Hz.", "Slide the window until you can't fit another full frame: (N − nperseg)/hop, rounded down, plus the first frame. 98 frames for 1 second — one spectrum every 10 ms."][a] })),
];

export const ling124Transform: Chapter = {
  slug: "6-transform-dft-stft",
  label: "Days 6–8",
  title: "Fourier transform, DFT, windowing, and the STFT",
  source: "fourier_transform.pdf, dft.pdf, windowing.pdf, stft.pdf (Koo's notes/slides), J&M (2008) §9.3.2, NI 'Understanding FFTs and Windowing', Labs 5–7.",
  goal: "Explain how the transform comes from the series, read the DFT formula and compute bin spacing, say why a windowed tone leaks and why tapering helps, and compute every STFT parameter from Fₛ, frame size and shift — the Lab 7/8 skill.",
  minutes: 70,
  requires: ["5-fourier-series"],
  sections: [
    {
      id: "transform",
      title: "From series to transform: let the period go to infinity",
      blocks: [
        { id: "t-1", t: "why", slide: "The problem with the series", title: "Speech isn't periodic", text: "The Fourier series needs a periodic signal — it only has ingredients at multiples of F₀. A whole sentence isn't periodic. Koo's move (fourier_transform.pdf §2): take a T₀-long chunk of any signal, pretend it repeats every T₀ (so it has a series), then let T₀ grow without limit. As T₀ → ∞ the repeats move infinitely far apart — you're left with the original signal — and F₀ = 1/T₀ → 0, so the harmonics kF₀ crowd together into a **continuous** frequency axis. The sum becomes an integral. That integral is the Fourier transform." },
        { id: "t-2", t: "code", slide: "The transform pair", caption: "Same shape as the series formulas, with ∫ dF replacing Σ over k and X_F (a function of continuous F) replacing X_k. Opposite signs in the exponents; no normalizing factor under this convention.", text: `Fourier transform:          X_F = ∫_{−∞}^{∞} x(t) · e^{−j2πFt} dt      "how much of frequency F is in x"
Inverse Fourier transform:  x(t) = ∫_{−∞}^{∞} X_F · e^{j2πFt} dF      "rebuild x from all its frequencies"` },
        { id: "t-3", t: "worked", slide: "The derivation, in four moves (note §3–4)", title: "Where X_F comes from", problem: "Turn X_k and the series into X_F and the integral.", steps: [
          "Start from the series x(t) = Σ X_k e^{j2πF_k t} with F_k = kF₀, and the coefficient formula X_k = (1/T₀)∫ x(t)e^{−j2πF_k t} dt over one period.",
          "Multiply each series term by F₀/F₀: x(t) = Σ (X_k/F₀) e^{j2πF_k t} · F₀. Now it looks like a Riemann sum — rectangles of width ΔF = F₀ and height (X_k/F₀)e^{j2πF_k t}.",
          "Define X_F as the limit of X_k/F₀ as F₀ → 0 and F_k → F. The Riemann sum becomes ∫ X_F e^{j2πFt} dF: the inverse transform.",
          "For X_F itself: since 1/T₀ = F₀, X_k/F₀ = ∫_{−T₀/2}^{T₀/2} x(t)e^{−j2πF_k t} dt. Let T₀ → ∞: the limits go to ±∞, F_k → F, and the left side is X_F. That's the forward transform.",
        ] },
      ],
    },
    {
      id: "dft",
      title: "Making it computable: DTFT and DFT",
      blocks: [
        { id: "d-1", t: "p", slide: "Two more discretizations", text: "Computers can't integrate over continuous time or evaluate continuous frequency. So we discretize twice more (dft.pdf). **Time**: sample at Fₛ, x[n] = x(n/Fₛ), and replace ∫dt by a sum with dt → 1/Fₛ. **Frequency**: for an N-sample signal, evaluate at N equally spaced frequencies. Each step has a name." },
        { id: "d-2", t: "code", slide: "DTFT → DFT", caption: "F̂ is frequency in cycles per SAMPLE (F/Fₛ). The DTFT is periodic in F̂ with period 1 because e^{j2π(F̂+1)n} = e^{j2πF̂n}·e^{j2πn} and e^{j2πn} = 1 for integer n. The DFT samples one period of it at N points.", text: `DTFT (discrete time, continuous F̂):
   X(F̂) = Σ_{n=−∞}^{∞} x[n] e^{−j2πF̂n}                  F̂ = F/Fₛ, consider [−1/2, 1/2]

DFT (N samples in, N coefficients out):
   X[k] = Σ_{n=0}^{N−1} x[n] e^{−j2π(k/N)n}               k = −N/2 … N/2−1   (F̂ = k/N)
   x[n] = (1/N) Σ_{k=−N/2}^{N/2−1} X[k] e^{j2π(k/N)n}      inverse DFT — exact, by orthogonality

bin k corresponds to frequency  F = k · Fₛ/N        bin spacing = Fₛ/N Hz` },
        { id: "d-3", t: "list", slide: "What to remember", items: [
          "N samples in → N complex numbers out. Each X[k] is the complex amplitude (Chapter 4) of frequency k·Fₛ/N.",
          "**Frequency resolution = Fₛ/N**. A longer frame (bigger N) gives finer frequency spacing. This is the seed of the time–frequency trade-off at the end.",
          "k = N/2 is excluded because F̂ = 1/2 and F̂ = −1/2 are the same point (that's the Nyquist frequency, Chapter 3).",
          "The **FFT** is just a fast algorithm for computing the DFT. Same numbers, fewer operations; fastest when N is a power of 2.",
        ] },
        { id: "d-4", t: "try", q: "512-point DFT of speech sampled at 16 kHz: bin spacing, and which bin holds 1 kHz?", a: "Fₛ/N = 16000/512 = 31.25 Hz per bin. 1000/31.25 = bin 32." },
        { id: "d-5", t: "try", q: "You want 10 Hz resolution at Fₛ = 8 kHz. How many samples per frame, and how long is that frame?", a: "N = Fₛ/resolution = 800 samples; 800/8000 = 0.1 s = 100 ms. (Too long for speech — sounds change faster than that. The trade-off is real.)" },
      ],
    },
    {
      id: "window",
      title: "Windowing and spectral leakage (Lab 6 / Lab 7)",
      blocks: [
        { id: "w-1", t: "p", slide: "Frames", text: "To analyze a changing signal, cut it into short **frames** (a **sliding window**) and transform each one. The DFT treats each frame as if it repeated forever. That assumption is where the trouble starts." },
        { id: "w-2", t: "worked", slide: "Koo's leakage example (windowing.pdf slides 7–11)", title: "A 100 Hz tone in a 25 ms rectangular window", problem: "Why does the spectrum show energy at frequencies other than 100 Hz?", steps: [
          "A 25 ms frame, repeated, has period 0.025 s, so the DFT's harmonic grid is F₀ = 1/0.025 = 40 Hz: 40, 80, 120, 160…",
          "100 Hz is **not on the grid** — it's not an integer multiple of 40. There's no single harmonic to hold it, so 'harmonics close to 100 Hz share the burden': energy smears into 80 and 120 Hz and beyond.",
          "Second cause: 25 ms is 2.5 cycles of 100 Hz, so the frame ends mid-cycle. Repeating it creates a **sudden jump** at each seam. Sharp jumps need a broad band of frequencies to represent (think of the triangle wave's corners in Lab 4).",
          "Together these are **spectral leakage**: a pure tone shows up as a smeared hump instead of a single line.",
        ] },
        { id: "w-3", t: "p", slide: "Tapering", text: "The fix: multiply the frame by a **window function** that fades in from zero and back out to zero — a **Hamming** or **Hann** window — instead of the abrupt **rectangular** window. No jump at the seams → much less leakage. The cost (NI reading): the main peak gets a little wider, and you lose a little amplitude accuracy. For speech, always taper; Lab 7's notebook compares rectangular vs Hamming on the same tone." },
        { id: "w-4", t: "figure", slide: "Rectangular vs Hamming", viewBox: "0 0 560 150", caption: "Left: rectangular window — the frame starts and stops abruptly. Right: Hamming window — the same frame faded in and out. The right one leaks far less.", svg: `<g fill="none" stroke="currentColor" font-family="ui-monospace, monospace" font-size="11">
<line x1="20" y1="120" x2="260" y2="120" opacity=".4"/><path d="M40 120 L40 40 L240 40 L240 120" stroke="rgb(59 130 246)" stroke-width="2"/>
<path d="${Array.from({length:41},(_,i)=>{const x=40+i*5;const y=80-35*Math.sin(i*0.9);return (i?'L':'M')+x+' '+y;}).join(' ')}" opacity=".5"/>
<text x="60" y="140" fill="currentColor" stroke="none" opacity=".7">rectangular</text>
<line x1="300" y1="120" x2="540" y2="120" opacity=".4"/>
<path d="${Array.from({length:41},(_,i)=>{const x=320+i*5;const w=0.54-0.46*Math.cos(2*Math.PI*i/40);const y=120-80*w;return (i?'L':'M')+x+' '+y;}).join(' ')}" stroke="rgb(59 130 246)" stroke-width="2"/>
<path d="${Array.from({length:41},(_,i)=>{const x=320+i*5;const w=0.54-0.46*Math.cos(2*Math.PI*i/40);const y=80-35*Math.sin(i*0.9)*w;return (i?'L':'M')+x+' '+y;}).join(' ')}" opacity=".5"/>
<text x="360" y="140" fill="currentColor" stroke="none" opacity=".7">Hamming (tapered)</text>
</g>` },
        { id: "w-5", t: "try", q: "A 440 Hz tone is analyzed with a 20 ms rectangular window. Will it leak? Which nearby bins get the energy?", a: "Grid F₀ = 1/0.02 = 50 Hz: 400, 450, 500… 440 isn't on it, and 20 ms is 8.8 cycles — ends mid-cycle. Yes, it leaks, mostly into the 400 and 450 Hz bins. A 25 ms window (grid 40 Hz: 440 = 11 × 40, and 11 whole cycles) would not leak at all — that's the special case." },
      ],
    },
    {
      id: "stft",
      title: "The short-time Fourier transform (Day 8)",
      blocks: [
        { id: "s-1", t: "def", term: "STFT", text: "Split the signal into (overlapping, tapered) frames and run an FFT on each. Stack the resulting spectra side by side over time → the **spectrogram**." },
        { id: "s-2", t: "table", slide: "The parameters (stft.pdf) — what each one is and how to compute it", rows: [
          ["Parameter", "Meaning", "Formula / rule"],
          ["window", "Tapering choice", "hamming / hann / rectangular"],
          ["frame size · nperseg", "Length of each frame, in s or samples", "nperseg = Fₛ × frame size (s)"],
          ["frame shift · hop length", "How far the window slides", "hop = Fₛ × frame shift (s)"],
          ["noverlap", "Samples shared between neighboring frames", "noverlap = nperseg − hop"],
          ["nfft", "FFT size", "usually = nperseg; > nperseg zero-pads; < nperseg is an error"],
          ["one-sided / two-sided", "Drop negative frequencies?", "one-sided has nfft//2 + 1 bins (k = 0 … N//2); fine for real signals"],
          ["number of frames", "How many windows fit", "⌊(N − nperseg)/hop⌋ + 1 (simplest case)"],
          ["padding", "What happens at the edges", "librosa: first frame starts at sample 0; scipy ShortTimeFFT: first frame is centered on sample 0"],
          ["scaling", "How |X_k| relates to amplitude", "'spectrum': |X_k| = |A_k|/2 · 'psd': amplitude spectral density"],
        ] },
        { id: "s-3", t: "stepper", slide: true, title: "Computing every parameter for a standard speech setup", frames: stftFrames },
        { id: "s-4", t: "why", slide: "The time–frequency trade-off", title: "Why you can't have both", text: "Frequency resolution is Fₛ/N: a **longer** window gives finer frequency detail. But a longer window blurs *when* things happen. **Short window (≈5 ms)** → high time resolution, coarse frequency → a **broad-band** spectrogram: you see each glottal pulse as a vertical striation and formants as wide dark bands. **Long window (≈25–50 ms)** → fine frequency, blurred time → a **narrow-band** spectrogram: you see the harmonics as thin horizontal lines. Phoneticians use broad-band to read formants and narrow-band to read pitch. This is the one conceptual question Day 8 is guaranteed to ask." },
        { id: "s-5", t: "try", q: "Fₛ = 8 kHz, frame 32 ms, shift 8 ms, 2 s of audio. nperseg, hop, noverlap, frames (no padding), one-sided bins if nfft = nperseg.", a: "nperseg = 256; hop = 64; noverlap = 192; frames = ⌊(16000 − 256)/64⌋ + 1 = 246 + 1 = 247; bins = 256//2 + 1 = 129." },
        { id: "s-6", t: "try", q: "Which spectrogram shows harmonics as horizontal lines, and what produces it?", a: "Narrow-band, from a long analysis window (fine frequency resolution). A short window gives broad-band: vertical striations and formant bands instead." },
        { id: "s-7", t: "def", term: "The whole pipeline so far", text: "Waveform → sample at Fₛ (Chapter 3) → cut into tapered frames (windowing) → DFT/FFT each frame (this chapter) → complex coefficients X[k], magnitude and phase per bin (Chapter 4) → stack over time = spectrogram (STFT). Everything after Day 10 (Mel, cepstrum, ASR) starts from that spectrogram." },
      ],
    },
  ],
};
