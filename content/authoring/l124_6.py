from gb import *
S = "ling124--6-transform-dft-stft"
WFIG = old(S, "window.b338f93c")

PARAMS = [
 lines(["Fₛ = 16,000 Hz, frame = 25 ms, shift = 10 ms, audio = 1 s"], 0, "A standard speech setup. We'll compute every STFT number from these four. This is the shape of a Lab 7/8 question."),
 lines(["samples per frame = Fₛ × frame length", "= 16,000 × 0.025 = 400   (nperseg)"], 1, "Milliseconds → seconds, then times Fₛ. 25 ms is the standard speech slice."),
 lines(["samples per shift = Fₛ × shift", "= 16,000 × 0.010 = 160   (hop)"], 1, "How far the window slides each step."),
 lines(["overlap = frame − shift", "= 400 − 160 = 240   (noverlap)"], 1, "Neighbouring slices share 240 samples."),
 lines(["FFT size: next power of 2 ≥ 400 → 512   (nfft)", "bin spacing = 16,000 ÷ 512 = 31.25 Hz"], 1, "FFTs are fastest on powers of 2, so the 400 samples are padded with zeros to 512."),
 lines(["frequency bins kept = 512 ÷ 2 + 1 = 257"], 0, "A real sound's spectrum is a mirror image (Chapter 4), so keep only the positive half: bins 0 to 256."),
 lines(["number of frames = ⌊(16,000 − 400) ÷ 160⌋ + 1", "= ⌊97.5⌋ + 1 = 98"], 1, "Slide until the next frame wouldn't fit, then add 1 for the first frame. About one spectrum every 10 ms."),
]

g = {
 "id": "ling124/6-transform-dft-stft",
 "course": "ling124",
 "lessons": "Days 6–8",
 "title": "From one spectrum to a spectrogram: DFT, windows, and the STFT",
 "summary": "Say why speech needs the Fourier transform instead of a series; use the DFT's bin spacing Fₛ/N to find which bin holds a frequency; explain spectral leakage and what a Hamming window fixes; compute every STFT setting from Fₛ, frame length and shift; pick narrow-band vs broad-band.",
 "estimatedMinutes": 55,
 "sourceNote": "fourier_transform.pdf, dft.pdf, windowing.pdf, stft.pdf (Koo's notes/slides), J&M (2008) §9.3.2, NI 'Understanding FFTs and Windowing', Labs 5–7. Rewritten in plain steps: one idea per card.",
 "requires": ["ling124/5-fourier-series"],
 "sections": [
  {"id": "transform", "heading": "Speech doesn't repeat, so we need the Fourier transform", "blocks": [
    P("**You are on step 4 of the map:** find the simple waves inside each tiny slice of a recording.", why=True),
    P("Chapter 5 only works for sounds that **repeat**, because harmonics are multiples of the repeat rate F₀. A whole sentence doesn't repeat. So what are its ingredients?", slide="What if it doesn't repeat?"),
    P("**The trick, in words.** Pretend the sentence repeats, but with a gigantic gap between repeats. The bigger the gap, the smaller F₀ gets, so the harmonics (F₀, 2F₀, 3F₀…) sit closer and closer together. With an infinitely big gap they touch: now **every** frequency is allowed, not just multiples. That version is the **Fourier transform**."),
    D("Fourier transform", "Takes any signal and tells you how much of **every** frequency is in it. It's the Fourier series with the harmonics squeezed together into a continuous range."),
    E("The formulas (for reference)", "Fourier transform:   X_F = ∫ x(t) · e^{−j2πFt} dt     'how much of frequency F is in x'\nInverse transform:   x(t) = ∫ X_F · e^{j2πFt} dF      'rebuild x from all its frequencies'\n\nCompare Chapter 5: the sum over harmonics k became an integral over all F."),
    C("Why can't we use a Fourier series on a whole spoken sentence?", "A series only uses harmonics of one repeat rate F₀, and a sentence doesn't repeat. The transform allows every frequency."),
  ]},
  {"id": "dft", "heading": "The DFT: the version a computer can do", "blocks": [
    D("DFT (discrete Fourier transform)", "The computer version. Give it **N samples**, and it gives back **N complex numbers**, one for each of N evenly spaced frequencies called **bins**. Each number is an X like in Chapter 4: its size says how much of that frequency, its angle says the phase."),
    D("FFT", "A fast way to compute the DFT. Same answer, much quicker; fastest when N is a power of 2 (256, 512, 1024…). np.fft.fft is this."),
    D("Bin spacing (frequency resolution)", "How far apart the bins are: **Fₛ ÷ N** Hz. Bin k sits at **k × Fₛ/N** Hz."),
    E("Bins, step by step", "Fₛ = 16,000 Hz, N = 512 samples\n\nbin spacing = 16,000 ÷ 512 = 31.25 Hz\nbin 0 = 0 Hz, bin 1 = 31.25 Hz, bin 2 = 62.5 Hz, …\n\nWhich bin holds 1,000 Hz?\n  1,000 ÷ 31.25 = bin 32", slide="Bin spacing = Fₛ/N"),
    P("**Want finer detail?** Use more samples. 10 Hz spacing at Fₛ = 8,000 Hz needs N = 8,000 ÷ 10 = 800 samples, which is 800 ÷ 8,000 = 0.1 s of audio. Keep that in mind: finer frequency detail costs a longer slice of time."),
    C("A 1,024-point DFT at Fₛ = 8,000 Hz: what's the bin spacing?", "8,000 ÷ 1,024 ≈ 7.8 Hz."),
  ]},
  {"id": "window", "heading": "Slices, and why the edges cause fake frequencies", "blocks": [
    D("Frame (or window)", "A short slice of the recording, usually about 25 ms. We take the DFT of each slice separately, because speech changes from moment to moment."),
    P("**The catch.** The DFT secretly assumes the slice **repeats forever**, end to start. If the slice happens to end in the middle of a wave's cycle, gluing the end back onto the start creates a **sudden jump**. A sudden jump needs lots of extra frequencies to draw, so the spectrum shows energy at frequencies that aren't really there.", slide="The DFT glues the ends together"),
    D("Spectral leakage", "A pure tone shows up as a smeared hump instead of one clean line, because the slice didn't hold a whole number of its cycles."),
    E("Will it leak?", "Slice = 25 ms. The DFT's grid spacing is 1 ÷ 0.025 s = 40 Hz: 40, 80, 120, 160…\n\n440 Hz tone: 440 ÷ 40 = 11, a whole number → lands on a bin → no leak\n100 Hz tone: 100 ÷ 40 = 2.5, not whole → between bins → leaks into 80 and 120", slide="On the grid or not?"),
    D("Window function (Hamming, Hann)", "Fade each slice in from zero and back out to zero before the DFT. No sudden jump at the edges, so much less leakage. The small cost: peaks get a little wider. The plain 'cut with scissors' version is called a **rectangular** window."),
    WFIG,
    C("A 440 Hz tone, 20 ms rectangular window. Leak or not?", "Grid = 1 ÷ 0.02 = 50 Hz. 440 ÷ 50 = 8.8, not whole, so it leaks (mostly into 400 and 450 Hz)."),
  ]},
  {"id": "stft", "heading": "The STFT: a spectrum for every slice = a spectrogram", "blocks": [
    D("STFT (short-time Fourier transform)", "Slide a window along the recording; at each position, fade the slice and take its DFT. Put all those spectra side by side in time and you get a **spectrogram**."),
    ST("Every STFT number from four settings", PARAMS),
    T(["Setting", "Plain meaning", "How to compute"], [
      ["nperseg", "samples per slice", "Fₛ × slice length (s)"],
      ["hop", "samples the window moves", "Fₛ × shift (s)"],
      ["noverlap", "samples shared by neighbours", "nperseg − hop"],
      ["nfft", "FFT size", "usually nperseg or the next power of 2"],
      ["frequency bins (one-sided)", "how many frequencies you keep", "nfft ÷ 2 + 1"],
      ["frames", "how many slices", "⌊(total − nperseg) ÷ hop⌋ + 1"],
    ], title="STFT settings cheat sheet", slide="STFT cheat sheet"),
    P("**The trade-off you can't escape.** Like a camera: a fast shutter freezes motion but lets in less light; a slow shutter gets more light but blurs motion. A **long window** gives fine frequency detail but blurs *when* things happen. A **short window** shows *when* sharply but blurs frequency.", slide="Long window vs short window"),
    T(["", "Short window (~5 ms)", "Long window (~25–50 ms)"], [["Name", "broad-band spectrogram", "narrow-band spectrogram"], ["Sharp in", "time", "frequency"], ["You see", "vertical stripes (each vocal-fold pulse) and wide formant bands", "thin horizontal lines (the harmonics)"], ["Good for", "reading formants", "reading pitch"]], title="Narrow-band vs broad-band"),
    C("Fₛ = 8 kHz, frame 32 ms, shift 8 ms. What are nperseg, hop and noverlap?", "nperseg = 8,000 × 0.032 = 256. hop = 8,000 × 0.008 = 64. noverlap = 256 − 64 = 192."),
    C("Which spectrogram shows harmonics as thin horizontal lines?", "Narrow-band, made with a long window."),
    WORDS([["Fourier transform", "how much of every frequency is in a signal"], ["DFT / FFT", "the computer version: N samples in, N bins out"], ["bin", "one frequency slot; spacing Fₛ/N"], ["frame", "a short slice (~25 ms)"], ["leakage", "smearing when a slice ends mid-cycle"], ["window (Hamming)", "fade in/out to reduce leakage"], ["STFT", "a DFT for every slice"], ["spectrogram", "all the slices' spectra side by side over time"]]),
  ]},
 ],
 "exercises": [
  EX("dft-bins", "Bins and what you can tell apart",
     "Fₛ = 16,000 Hz, N = 512. (a) Bin spacing? (b) Which bin is closest to 1,000 Hz? (c) Can this DFT tell 1,000 Hz from 1,015 Hz?",
     ["Spacing = Fₛ ÷ N.", "Divide the frequency by the spacing.", "If two tones are closer than one bin apart, they land in the same bin."],
     ["(a) 31.25 Hz.", "(b) 1,000 ÷ 31.25 = bin 32.", "(c) No: they're only 15 Hz apart, less than one bin. You'd need spacing ≤ 15 Hz: N ≥ 16,000 ÷ 15 ≈ 1,067, about 67 ms of audio."],
     "Every spectrum you plot in the labs has this limit built in.", ref="dft"),
  EX("stft-params", "STFT settings from scratch",
     "Fₛ = 16,000 Hz, slice 25 ms, shift 10 ms, 2 s of audio. Find nperseg, hop, noverlap, and the number of frames.",
     ["Convert ms to seconds, then multiply by Fₛ.", "noverlap = nperseg − hop.", "frames = ⌊(total samples − nperseg) ÷ hop⌋ + 1, where total = 2 × 16,000."],
     ["nperseg = 400, hop = 160, noverlap = 240.", "total = 32,000 samples.", "frames = ⌊(32,000 − 400) ÷ 160⌋ + 1 = 197 + 1 = 198."],
     "These are exactly the arguments scipy and librosa ask for in Labs 7 and 8.", ref="stft"),
 ],
}
from l124_extra import EXTRA
g["exercises"] += EXTRA["6"]
build(g)
