from gb import *

PIPE = [
 lines(["recording", "→ frames (25 ms, shifted 10 ms)"], 1, "Step 0: chop the signal into short overlapping frames, exactly like the STFT (Day 8)."),
 lines(["frame", "→ pre-emphasis: y[n] = x[n] − α·x[n−1]"], 1, "Boost the high frequencies, which the voice source naturally weakens."),
 lines(["→ window + DFT → magnitude spectrum", "→ energy: Σ x[n]²"], 0, "Spectrum of the frame, and one number for how loud it is."),
 lines(["→ Mel filterbank: ~26 triangular bands", "→ energy in each band"], 0, "Squash hundreds of frequency bins into a few dozen bands, spaced the way human hearing is."),
 lines(["→ log", "→ DCT (the 'spectrum of the spectrum')", "→ keep the first 13 coefficients = MFCCs"], 2, "The cepstrum step: separates the slow filter shape (keep) from the fast source ripples (drop)."),
 lines(["→ + 13 deltas (velocity)", "→ + 13 delta-deltas (acceleration)", "= 39 numbers per frame"], 2, "Add how each coefficient is changing. 39 numbers per 10 ms is what classic ASR systems (Day 10) take as input."),
]

g = {
 "id": "ling124/11-feature-extraction",
 "course": "ling124",
 "lessons": "Days 11–12",
 "title": "Feature extraction: pre-emphasis, Mel filterbank, cepstrum, MFCCs",
 "summary": "Explain what a feature vector is for and why it should capture the filter, not the source; apply pre-emphasis and compute frame energy; convert Hz to mel and say why filterbanks use it; describe the cepstrum (log, then DCT), quefrency and liftering, and convert quefrency to frequency; compute deltas and list the 39 classic MFCC features.",
 "estimatedMinutes": 60,
 "sourceNote": "Dr. Koo's Days 11–12 slides 'Feature Extraction' (pulled from Canvas); J&M (2008) §9.3 and J&M (2023) §16.2. Labs 10 and 11.",
 "requires": ["ling124/6-transform-dft-stft", "ling124/9-pitch-asr"],
 "sections": [
  {"id": "why", "heading": "Why not just feed the spectrum to the recognizer?", "blocks": [
    P("**You are on step 5 of the map:** turn each slice into a short list of numbers a recognizer can use.", why=True),
    P("**The problem** An ASR model (Day 10) needs one vector of numbers per frame. The raw magnitude spectrum of a 25 ms frame has hundreds of values, most of them describing things that don't change *which sound* you said: your pitch, the exact harmonics, loudness. We want a short vector that captures **what the mouth is doing** and ignores the rest.", slide="Too many numbers, most of them noise", why=True),
    D("Source-filter theory (recap)", "Speech = a **source** (vocal folds buzzing: harmonics at F0, 2F0, 3F0…) shaped by a **filter** (the vocal tract: throat, tongue, lips), which creates the broad peaks we call **formants**. The source carries pitch; the filter carries **which vowel or consonant** it is."),
    P("So the goal of feature extraction: for each frame, a compact description of the **filter**. Two speakers saying *ee* at different pitches should get similar features. That is what **MFCCs** (Mel-frequency cepstral coefficients) do, and for decades a 39-number MFCC vector per frame was the standard input to speech recognizers. It still is for many small on-device systems, and MFCC-like features are used in speaker ID, music genre tagging and bird-song classification.", slide="Keep the filter, drop the source"),
    ST("The whole pipeline, one frame at a time", PIPE),
  ]},
  {"id": "pre", "heading": "Pre-emphasis: undo the source's tilt", "blocks": [
    P("The source's spectrum **slopes downward**: each harmonic is weaker than the one below it. The filter's output inherits that slope, so high frequencies come out faint. Two sounds that differ mainly up high (like *s* vs *sh*) could look almost the same."),
    D("Pre-emphasis", "A filter that boosts high frequencies before anything else: `y[n] = x[n] − α · x[n − 1]`, with **0.9 ≤ α < 1** (0.97 or 0.98 is typical). A bigger α boosts the highs more drastically."),
    E("Pre-emphasis by hand (α = 0.97)", "x = [2, 3, 5, 4]      (x[−1] = 0)\n\ny[0] = 2 − 0.97·0 = 2.00\ny[1] = 3 − 0.97·2 = 1.06\ny[2] = 5 − 0.97·3 = 2.09\ny[3] = 4 − 0.97·5 = −0.85\n\nSlow changes (neighbours alike) nearly cancel → lows shrink.\nFast changes survive → highs are relatively boosted.", answer="[2.00, 1.06, 2.09, −0.85]", slide="y[n] = x[n] − αx[n−1]"),
    C("Why does subtracting the previous sample boost high frequencies?", "A low-frequency signal changes slowly, so x[n] ≈ x[n−1] and the difference is small. A high-frequency signal changes a lot between samples, so the difference stays large."),
  ]},
  {"id": "energy", "heading": "Energy: one number for loudness", "blocks": [
    D("Energy", "Proportional to amplitude squared. The usual measure for a frame: `E = Σ x[n]²`, the sum of squared amplitudes."),
    E("Energy of a frame", "x = [0.5, −1, 2, −0.5]\nE = 0.25 + 1 + 4 + 0.25 = 5.5", answer="5.5"),
    P("Energy is often the 13th feature: 12 MFCCs + energy. It helps tell speech from silence and loud vowels from quiet consonants."),
    C("Why square the amplitudes instead of just adding them?", "Samples go positive and negative; adding them would cancel out to about zero. Squaring makes every sample count positively, and energy is proportional to amplitude squared anyway."),
  ]},
  {"id": "mel", "heading": "The Mel filterbank: hear like a human", "blocks": [
    D("Filterbank analysis", "Split the frequency range into **bands**. For each band, take a weighted sum of the magnitudes inside it (weights shaped like a triangle, overlapping with the neighbours). Each band ignores everything outside its range, so it acts as a **filter**. Output: one energy number per band."),
    D("Mel scale", "A pitch scale matched to human hearing: equal steps in mel **sound** equally far apart. `mel = 1125 · ln(1 + f / 700)`. Roughly linear below 1,000 Hz, logarithmic above."),
    T(["f (Hz)", "mel"], [["300", "401"], ["1,000", "998"], ["2,000", "1,519"], ["4,000", "2,142"], ["8,000", "2,835"]], title="Hz vs mel", slide="Doubling Hz is not doubling mel"),
    P("Why mel spacing: we hear the difference between 300 and 400 Hz easily, but 7,000 vs 7,100 Hz barely at all. So a **Mel filterbank** places its triangles **narrow and dense at low frequencies** and **wide and sparse at high ones**: resolution where hearing (and formants) need it, not where they don't.", slide="Narrow bands low, wide bands high"),
    C("Convert 1,500 Hz to mel.", "1125 · ln(1 + 1500/700) = 1125 · ln(3.143) ≈ 1125 · 1.145 ≈ 1,288 mel."),
  ]},
  {"id": "cep", "heading": "The cepstrum: separating source from filter", "blocks": [
    P("**Picture it.** Look at a vowel's spectrum as if it were just a wiggly line. It has two kinds of wiggle on top of each other: **small fast ripples** (the harmonics, spaced F0 apart: that's the pitch) riding on a **big slow wave** (the formant bumps: that's the vowel). We want to pull those two apart.", slide="Fast ripples, slow wave"),
    P("**The trick.** Chapter 5 sorted a *sound* into slow and fast waves. Do the same thing to the *spectrum line*: sort its wiggles by how fast they go. Slow wiggles = the vowel shape. Fast wiggles = the pitch. That sorted result is the **cepstrum**."),
    D("Cepstral analysis", "(1) Take the **log** magnitude spectrum. (2) Find the 'spectrum' of that log spectrum, using the **DCT**. The result is the **cepstrum** ('spec' reversed). Its x-axis is called **quefrency**."),
    P("**Why the log first** Taking the log makes tall and short peaks roughly the same height, so the recurring harmonic peaks look like an even, regular ripple, which is easy to detect."),
    D("DCT (discrete cosine transform)", "Like the DFT, but it builds the signal out of **cosines only** (no sines): `Xₖ = 2 Σₙ x[n] cos(πk(2n + 1) / 2N)`. It gives real numbers, which is all we need here."),
    D("Quefrency", "The cepstrum's x-axis: how fast a wiggle goes along the spectrum. (The funny name is 'frequency' with letters swapped, like 'cepstrum' is 'spectrum' swapped.) **Fast** patterns in the spectrum sit **far** from the origin; **slow** patterns sit **close** to it. So the filter shape (slow) lives in the first few coefficients and the harmonics (fast) show up as a peak further out."),
    E("Quefrency → frequency", "frequency = sampling rate ÷ quefrency\n\nKoo's example: a cepstral peak at quefrency 120, Fₛ = 48,000 Hz\n  48,000 ÷ 120 = 400 Hz\n\nThat peak is the harmonic ripple, so 400 Hz is F0.\n(This is the 'cepstral' pitch method promised on Day 9.)", answer="400 Hz", slide="Peak at quefrency 120"),
    P("It feels backwards: a **higher** voice gives a peak at a **lower** quefrency. Higher F0 means harmonics spaced **further apart** in the spectrum, so the ripple repeats **more slowly** across the frequency axis, so it sits closer to the origin."),
    D("Liftering", "'Filtering' in the cepstrum: keep the coefficients you want (say the first 13), set the rest to zero, and run the inverse DCT to redraw the spectrum. Keeping only low quefrencies gives a smooth curve through the formants: the filter, with the source removed."),
    C("A cepstral peak at quefrency 80 in audio sampled at 16,000 Hz. What F0 does it suggest?", "16,000 ÷ 80 = 200 Hz."),
    TRAP("Reading quefrency like frequency. A peak further right means a FASTER ripple in the spectrum, which means a LOWER F0 (harmonics closer together). Convert with Fₛ ÷ quefrency; don't eyeball it.", "Days 11–12 slides", slide="Quefrency runs backwards"),
  ]},
  {"id": "mfcc", "heading": "MFCCs: the 39 numbers", "blocks": [
    D("MFCCs (Mel-frequency cepstral coefficients)", "The cepstrum computed on the **Mel filterbank** energies: filterbank → log → DCT → keep the first **13** coefficients. They describe the filter's shape on a hearing-matched scale in 13 numbers."),
    T(["Part", "How many", "What it captures"], [
      ["MFCCs (or 12 MFCCs + energy)", "13", "the spectral shape of this frame"],
      ["deltas", "13", "how each one is changing (velocity)"],
      ["delta-deltas", "13", "how the change is changing (acceleration)"],
      ["total", "39", "one feature vector per frame"],
    ], title="The classic 39-dimensional feature vector", slide="13 + 13 + 13"),
  ]},
  {"id": "delta", "heading": "Deltas: features that move", "blocks": [
    P("A single frame is a snapshot. But consonants are recognized by **movement**: the formants glide differently into the next vowel after *b* than after *d* (formant transitions), and the glide depends on which vowel follows. So we add features for how the spectrum is changing frame to frame."),
    D("Delta", "The slope through neighbouring values: `Δ[n] = (x[n + 1] − x[n − 1]) / 2`, where x is one feature measured at successive frames."),
    D("Delta-delta", "The delta of the deltas: `Δ²[n] = (Δ[n + 1] − Δ[n − 1]) / 2`. Delta is velocity; delta-delta is acceleration."),
    E("Deltas by hand", "MFCC #2 over five frames: x = [4, 6, 9, 10, 10]\n\nΔ[1] = (9 − 4) / 2  = 2.5\nΔ[2] = (10 − 6) / 2 = 2.0\nΔ[3] = (10 − 9) / 2 = 0.5\n\nΔ²[2] = (Δ[3] − Δ[1]) / 2 = (0.5 − 2.5) / 2 = −1.0\n(rising, but slowing down)", answer="Δ = 2.5, 2.0, 0.5; Δ²[2] = −1.0", slide="Velocity and acceleration"),
    TRAP("Using the frame itself in the delta: Δ[n] skips x[n] and uses the neighbours on either side, divided by 2 (they're two frames apart).", "Days 11–12 slides"),
    C("x = [2, 2, 2, 2]. What are the deltas, and why?", "All 0: the feature isn't changing, so its slope is zero everywhere."),
    WORDS([["feature vector", "a short list of numbers describing one slice"], ["source / filter", "vocal folds (pitch) / mouth shape (vowel)"], ["pre-emphasis", "boost high frequencies: y[n] = x[n] − α·x[n−1]"], ["energy", "loudness of a slice: sum of squared samples"], ["mel scale", "frequency scale matched to hearing"], ["filterbank", "a set of bands; one energy number per band"], ["cepstrum", "the spectrum's wiggles sorted by speed"], ["quefrency", "the cepstrum's axis; frequency = Fₛ ÷ quefrency"], ["MFCCs", "the first 13 cepstrum numbers on the mel scale"], ["delta / delta-delta", "how fast a feature is changing / how fast that change is changing"]]),
  ]},
 ],
 "exercises": [
  EX("pipeline-order", "Put the pipeline in order",
     "Order these MFCC steps: DCT; Mel filterbank; log; pre-emphasis; framing; keep the first 13 coefficients; DFT magnitude.",
     ["Everything happens per frame, so framing comes first.", "You need a spectrum before you can filter it into bands.", "Cepstrum = log first, then the DCT."],
     ["framing → pre-emphasis → DFT magnitude → Mel filterbank → log → DCT → keep the first 13."],
     "Lab 10 and 11 walk through exactly these calls in librosa; knowing the order is how you read and debug that code.", ref="mfcc"),
  EX("quefrency", "Which voice is higher?",
     "Two recordings at 16,000 Hz. Speaker A's cepstral peak is at quefrency 64; speaker B's at quefrency 128. Which speaker has the higher pitch, and what are the two F0s?",
     ["frequency = Fₛ ÷ quefrency.", "Divide 16,000 by each.", "Smaller quefrency → bigger F0."],
     ["A: 16,000 ÷ 64 = 250 Hz.", "B: 16,000 ÷ 128 = 125 Hz.", "A is higher: its peak is at the LOWER quefrency."],
     "Cepstral pitch tracking is the backup method real trackers use when autocorrelation struggles, and the 'backwards' axis is Koo's favourite trick question.",
     choices=[{"text": "A: 250 Hz vs 125 Hz", "feedback": "Right: lower quefrency, higher pitch."}, {"text": "B: 250 Hz vs 125 Hz", "feedback": "Quefrency runs backwards: B's peak further out means its harmonics are closer together, so a lower F0."}], answer=0, ref="cep"),
 ],
}
from l124_extra import EXTRA
g["exercises"] += EXTRA["11"]
build(g)
