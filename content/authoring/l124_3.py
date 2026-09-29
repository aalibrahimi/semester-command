from gb import *
S = "ling124--3-sampling-aliasing"
QFIG = old(S, "quant.f3a81c62")
AFIG = old(S, "alias.4e9a71c3")
ASIM = old(S, "alias.9ec32c57")
FOLD = old(S, "alias.7e7ed04d")

SAMP = [
 arr(["?", "?", "?", "?", "?"], "A real sound has a value at EVERY instant. A computer can't store infinitely many numbers, so it takes a measurement every so often.", note="the wave, before sampling"),
 arr([1, -1, 1, -1, 1], "Measure a 5 Hz wave 10 times per second (Fₛ = 10 Hz): only 2 measurements per repeat. The numbers jump 1, −1, 1, −1. You can barely tell it was a smooth wave.", note="Fₛ = 10 Hz: 2 samples per repeat"),
 arr([1, 0.81, 0.31, -0.31, -0.81, -1, -0.81, -0.31, 0.31, 0.81], "Measure the same wave 50 times per second (Fₛ = 50 Hz): 10 measurements per repeat. Now the numbers clearly trace the smooth shape.", note="Fₛ = 50 Hz: 10 samples per repeat"),
 arr(["x[0]", "x[1]", "x[2]", "x[3]", "…"], "Each stored number is called a sample. x[0] is the first, x[1] the second, and so on. x[n] means 'sample number n'.", note="x[n] = sample number n"),
]

FOLDSTEPS = [
 lines(["Fₛ = 10,000 Hz   →   Nyquist = Fₛ/2 = 5,000 Hz", "tone = 7,000 Hz"], 0, "Step 1: find the Nyquist frequency, half the sampling rate. Anything above it will fake being something lower."),
 lines(["7,000 > 5,000  →  it will alias"], 0, "Step 2: is the tone above Nyquist? Yes, so it can't be stored honestly."),
 lines(["fake frequency = Fₛ − tone", "= 10,000 − 7,000 = 3,000 Hz"], 1, "Step 3: when the tone is between Nyquist and Fₛ, the fake frequency is Fₛ minus the tone. It 'folds back' like a mirror around 5,000."),
 lines(["7,000 is 2,000 above 5,000", "3,000 is 2,000 below 5,000"], 1, "Check it as a mirror: the fake is as far below Nyquist as the real tone was above it."),
 lines(["tone above Fₛ? subtract Fₛ first", "e.g. 12,000 Hz at Fₛ = 10,000 → 12,000 − 10,000 = 2,000 Hz"], 1, "Step 0 if the tone is even higher than Fₛ: subtract Fₛ until you're below Fₛ, then do the mirror step if it's still above Nyquist."),
]

g = {
 "id": "ling124/3-sampling-aliasing",
 "course": "ling124",
 "lessons": "Day 3",
 "title": "Sampling, quantization, and aliasing",
 "summary": "Explain sampling and quantization in plain words; turn a sampling rate into the time between samples and a sample count; count levels from bits; find the Nyquist frequency and the fake (alias) frequency a too-high tone turns into.",
 "estimatedMinutes": 40,
 "sourceNote": "sampling_quantization.pdf, aliasing.pdf, Rosen & Howell (1991) ch. 14, Lab 2. Rewritten in plain steps: one idea per card.",
 "requires": ["ling124/0-reading-a-wave"],
 "sections": [
  {"id": "why", "heading": "Why a computer can't just store a wave", "blocks": [
    P("**You are on step 2 of the map:** the computer has to measure the sound and store it as numbers.", why=True),
    P("A real sound wave is smooth: it has a value at **every** instant, and each value can be any number. A computer can only store a **list** of numbers, each with limited precision. So we make two compromises:", slide="Two compromises"),
    D("Sampling", "Measuring the wave at regular moments in time, instead of at every instant. Like a movie: 24 still photos per second instead of continuous motion."),
    D("Quantization", "Rounding each measurement to one of a fixed set of allowed values. Like a ruler that only has marks every millimeter."),
    C("Which compromise is about WHEN we measure, and which is about HOW PRECISELY?", "Sampling is when (moments in time). Quantization is how precisely (allowed values)."),
  ]},
  {"id": "sampling", "heading": "Sampling: measuring many times a second", "blocks": [
    D("Sampling rate (Fₛ)", "How many measurements per second, in Hz. Fₛ = 16,000 Hz means 16,000 numbers stored for every second of sound. (The little s stands for 'sampling'.)"),
    D("Sampling interval (Tₛ)", "The time between two measurements. It's the flip of the rate: **Tₛ = 1 / Fₛ**."),
    E("Rate ↔ interval, and counting samples", "Fₛ = 100 Hz  →  Tₛ = 1/100 = 0.01 s between samples\nFₛ = 16,000 Hz  →  Tₛ = 1/16,000 = 0.0000625 s\n\nHow many samples in a recording?\n  samples = seconds × Fₛ\n  4 s at 100 Hz  →  4 × 100 = 400 samples\n  2.5 s at 16,000 Hz  →  40,000 samples", slide="Tₛ = 1/Fₛ, samples = seconds × Fₛ"),
    ST("Sampling the same wave slowly and quickly", SAMP),
    E("The formula for a sampled wave", "Sample number n is taken at time t = n / Fₛ.\nSo just replace t with n/Fₛ:\n\n  x(t)  = A · cos(2π · F · t + ϕ)\n  x[n]  = A · cos(2π · F · n/Fₛ + ϕ)\n\nNothing else changes. (Lab 3 Q4)"),
    TRAP("Lab 2 Q9: to get a better copy of the wave you need a **higher Fₛ** (same thing as a **shorter Tₛ**). Recording for longer does NOT make each part more accurate; it just gives you more of the same quality.", "Lab 2 Q9"),
    C("A recording at Fₛ = 8,000 Hz lasts 3 seconds. How many samples?", "3 × 8,000 = 24,000 samples."),
    P("**Real numbers you'll see:** 44,100 Hz (music CDs), 48,000 Hz (video), 16,000 Hz (speech technology, including most speech recognizers), 8,000 Hz (phone calls)."),
  ]},
  {"id": "quant", "heading": "Quantization: rounding to allowed levels", "blocks": [
    D("Bits and levels", "Each sample is stored with a fixed number of **bits**. With b bits you get **2ᵇ allowed levels**. 3 bits → 2³ = 8 levels. 16 bits → 65,536 levels (CD quality)."),
    T(["Bits", "Levels (2ᵇ)"], [["1", "2"], ["2", "4"], ["3", "8"], ["5", "32"], ["8", "256"], ["16", "65,536"]], title="Bits → levels", slide="2 to the power of bits"),
    P("Each measurement gets **snapped to a level**. In Koo's convention it snaps **down**: take the highest level that is not above the value. The small difference between the real value and the stored one is called **quantization error** (it sounds like faint noise). More bits = smaller steps = less error."),
    QFIG,
    C("How many levels does a 4-bit recording have?", "2⁴ = 16 levels."),
  ]},
  {"id": "alias", "heading": "Aliasing: when a high sound pretends to be a low one", "blocks": [
    P("**Picture it.** In old movies, car wheels sometimes look like they spin backward. The camera only takes 24 pictures a second. If a spoke moves almost a full turn between pictures, it *looks* like it moved a little backward. Sampling sound too slowly does the same thing: a high frequency comes out looking like a lower one.", slide="The backward-spinning wheel"),
    D("Alias", "A fake frequency. After sampling, a too-high tone gives **exactly the same list of numbers** as some lower tone, so the computer can't tell them apart. The lower one is its alias."),
    AFIG,
    D("Nyquist frequency", "Half the sampling rate: **Fₛ / 2**. It's the highest frequency you can store honestly. Anything above it turns into an alias."),
    E("Nyquist in three examples", "Fₛ = 16,000 Hz  →  Nyquist = 8,000 Hz\nFₛ = 8,000 Hz (phone)  →  Nyquist = 4,000 Hz\nFₛ = 44,100 Hz (CD)  →  Nyquist = 22,050 Hz\n\nFlip it: to record up to F Hz, you need Fₛ of at least 2 × F.", slide="Nyquist = Fₛ/2"),
    ST("Finding the fake frequency (the folding rule)", FOLDSTEPS),
    ASIM,
    FOLD,
    TRAP("Lab 2 Q14 vs Q15: the **Nyquist frequency** is Fₛ/2. **Fₛ − F** is the *alias* of F (that's Q15). Q14 puts Fₛ − F in the choices to catch you.", "Lab 2 Q14"),
    C("A 7 kHz tone is sampled at 10 kHz. What frequency does it show up as?", "Nyquist is 5 kHz, 7 is above it, so it folds: 10 − 7 = 3 kHz."),
    C("Why do phone calls sound dull?", "Phones sample at 8,000 Hz, so Nyquist is 4,000 Hz. Everything above 4 kHz (the crisp s and f sounds) is filtered out before sampling."),
    E("Why the rule works (optional, for the curious)", "Samples are taken at t = n/Fₛ. Compare cos(2π·F·t) and cos(2π·(F + Fₛ)·t) at those moments:\n\n  cos(2π·(F + Fₛ)·n/Fₛ) = cos(2π·F·n/Fₛ + 2π·n)\n\n2π·n is n whole laps of the circle, which changes nothing.\nSo both waves give identical samples. The same trick with cos(−θ) = cos(θ) gives the mirror Fₛ − F."),
    WORDS([["sampling", "measuring at regular moments"], ["Fₛ", "sampling rate: samples per second"], ["Tₛ", "time between samples = 1/Fₛ"], ["x[n]", "sample number n"], ["quantization", "rounding each sample to an allowed level"], ["bits → levels", "b bits gives 2ᵇ levels"], ["alias", "fake lower frequency a too-high tone turns into"], ["Nyquist", "Fₛ/2, the highest frequency you can store"]]),
  ]},
 ],
 "exercises": [
  EX("sample-count", "Samples, spacing, and x[n]",
     "x(t) = cos(2π·50·t) is sampled at Fₛ = 400 Hz for 0.1 s. (a) What is Tₛ? (b) How many samples? (c) Write x[n]. (d) How many samples per repeat of the wave?",
     ["Tₛ = 1/Fₛ.", "samples = seconds × Fₛ. For x[n], replace t with n/Fₛ.", "One repeat lasts 1/50 s. How many samples fit in that?"],
     ["(a) Tₛ = 1/400 = 0.0025 s.", "(b) 0.1 × 400 = 40 samples.", "(c) x[n] = cos(2π·50·n/400) = cos(π·n/4).", "(d) 400 / 50 = 8 samples per repeat."],
     "Every speech tool you'll use (Praat, librosa, Whisper) starts by doing exactly this.", ref="sampling"),
  EX("alias-find", "Find the alias",
     "A phone line samples at Fₛ = 8,000 Hz. (a) Nyquist? (b) A 5,000 Hz whistle gets in. What does it show up as? (c) A 9,000 Hz tone?",
     ["Nyquist = Fₛ/2.", "5,000 is between Nyquist and Fₛ: mirror it, Fₛ − F.", "9,000 is above Fₛ: subtract Fₛ first."],
     ["(a) 4,000 Hz.", "(b) 8,000 − 5,000 = 3,000 Hz.", "(c) 9,000 − 8,000 = 1,000 Hz (below Nyquist, so that's it)."],
     "This is why every microphone chip has a filter that removes high frequencies BEFORE sampling: once aliasing happens, no software can undo it.", ref="alias"),
 ],
}
from l124_extra import EXTRA
g["exercises"] += EXTRA["3"]
build(g)
