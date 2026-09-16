import type { Exercise } from "../types";

/**
 * LING 124 · "Do it yourself" sets. Shaped like Koo's lab questions: change
 * one dial, predict the plot; read a formula; compute a parameter.
 */
export const ling124Practice: Record<string, Exercise[]> = {
  "0-reading-a-wave": [
    {
      id: "read-formula",
      title: "Read the formula out loud",
      prompt: "x(t) = 0.5·cos(400πt − π/2). Give the amplitude, the frequency in Hz, the period in ms, and the phase. Then say in one sentence what the plot looks like compared with cos(400πt).",
      hints: [
        "Match it to the template A·cos(2πFt + ϕ) piece by piece. The number in front is A. The thing multiplying t must be written as 2π·F — rewrite 400π that way.",
        "The usual slip is reading 400 as the frequency. 400π = 2π·200, so F = 200 Hz, not 400. And the phase is −π/2, sign included.",
        "Period is 1/F. Phase −π/2 means the cosine is shifted a quarter turn *later* — which is exactly a sine.",
      ],
      solution: [
        "A = 0.5.",
        "400π = 2π·200 → F = 200 Hz. T = 1/200 s = 5 ms.",
        "ϕ = −π/2 radians (a quarter cycle).",
        "Compared with cos(400πt): half the height, same speed, shifted right by a quarter period (1.25 ms). cos(θ − π/2) = sin(θ), so it's 0.5·sin(400πt).",
      ],
      why: "Every audio, radio, and vibration signal you'll ever meet is described with this one formula, and 'what does this plot look like' from the numbers — without running the code — is the skill Koo's labs test and the skill that lets you sanity-check a spectrogram at a glance.",
    },
    {
      id: "db",
      title: "Decibels without a calculator",
      prompt: "Sound A has amplitude 10 times sound B. Sound C has amplitude 1000 times B. How many dB is A above B, and C above B? Then: if a signal is +6 dB relative to another, roughly what is the amplitude ratio?",
      hints: [
        "dB = 20·log₁₀(x/r). For A/B the ratio is 10; what's log₁₀ of 10? Multiply by 20.",
        "The common error is using 10·log instead of 20·log. Koo's convention for amplitude is 20·log₁₀. (10·log is for power.)",
        "For +6 dB, solve 20·log₁₀(ratio) = 6 → log₁₀(ratio) = 0.3 → ratio = 10^0.3. You know 10^0.3 ≈ 2 because 2³ = 8 ≈ 10 → log₁₀ 2 ≈ 0.3.",
      ],
      solution: [
        "A over B: 20·log₁₀(10) = 20·1 = 20 dB.",
        "C over B: 20·log₁₀(1000) = 20·3 = 60 dB.",
        "+6 dB ↔ amplitude ratio 10^0.3 ≈ 2. (So 'twice as loud in amplitude' is +6 dB; ten times is +20 dB.)",
      ],
      why: "dB is how every mixing board, microphone spec, and hearing-loss chart is labelled. '6 dB = double' and '20 dB = ten times' are the two numbers audio engineers carry in their heads.",
    },
  ],

  "3-sampling-aliasing": [
    {
      id: "sample-count",
      title: "Samples, intervals, and what x[n] is",
      prompt: "x(t) = cos(2π·50·t), sampled at Fₛ = 400 Hz for 0.1 s. (a) Tₛ? (b) how many samples? (c) write x[n] as a formula in n; (d) what is x[4]? (e) how many samples per cycle of the cosine?",
      hints: [
        "Tₛ = 1/Fₛ. Number of samples = duration × Fₛ. Substitute t = n/Fₛ into x(t) for the formula.",
        "People compute x[4] at t = 4 seconds. Sample 4 is at t = 4·Tₛ = 4/400 = 0.01 s.",
        "Samples per cycle = Fₛ / F. If that number is small (near 2) the samples barely trace the wave — Lab 2 Q9.",
      ],
      solution: [
        "(a) Tₛ = 1/400 = 0.0025 s = 2.5 ms.",
        "(b) 0.1 × 400 = 40 samples.",
        "(c) x[n] = cos(2π·50·n/400) = cos(πn/4).",
        "(d) x[4] = cos(π) = −1 — that's t = 0.01 s, half a period of the 50 Hz wave. ✓",
        "(e) 400/50 = 8 samples per cycle.",
      ],
      why: "Every recording you ever process is x[n], not x(t). Knowing which second a sample index corresponds to — and how many samples one cycle of a pitch takes — is the arithmetic behind pitch trackers, speech recognizers, and every 'why does my plot look wrong' moment in Colab.",
    },
    {
      id: "alias-find",
      title: "Find the alias",
      prompt: "A microphone samples at Fₛ = 8000 Hz (telephone quality). (a) What's the Nyquist frequency? (b) A 5000 Hz whistle gets in. What frequency will it appear as after sampling? (c) A 9000 Hz tone? (d) Explain in one sentence why phone calls sound dull.",
      choices: [
        { text: "(b) It appears as 5000 Hz — sampling doesn't change frequency", feedback: "It does when F is above Fₛ/2. 5000 is above 4000, so it folds. Compute Fₛ − F." },
        { text: "(b) It appears as 3000 Hz", feedback: "Right. −5000 + 8000 = 3000 Hz — the mirror image of 5000 around Nyquist (4000)." },
        { text: "(b) It appears as 1000 Hz", feedback: "That's 5000 − 4000, the distance *above* Nyquist, not the folded frequency. Fold it: Fₛ − F = 3000." },
      ],
      answer: 1,
      hints: [
        "Nyquist = Fₛ/2. Anything above it folds back. The aliases of F are ±F ± k·Fₛ; find the one that lands in 0..Fₛ/2.",
        "The usual mistake is subtracting from Nyquist instead of from Fₛ. Mirror around Nyquist means F₂ = Fₛ − F₁ (Lab 2 Q15), which is the same as −F + Fₛ.",
        "For 9000 Hz, subtract a whole Fₛ first: 9000 − 8000 = 1000. That's already below Nyquist.",
      ],
      solution: [
        "(a) Nyquist = 8000/2 = 4000 Hz.",
        "(b) 5000 > 4000, so it folds: −5000 + 8000 = 3000 Hz.",
        "(c) 9000 − 8000 = 1000 Hz (an alias of 9000 in the base band).",
        "(d) Sampling at 8 kHz can only represent frequencies up to 4 kHz, and consonants like /s/ live above that — so the phone throws them away (and must filter them out first, or they'd alias into the speech band as garbage).",
      ],
      why: "Anti-aliasing filters exist in every ADC because of this arithmetic. If you ever record data — audio, sensor readings, video frames of a spinning wheel — 'is my sample rate at least twice the highest frequency present?' is the first question, and getting it wrong produces errors that look like real signal.",
    },
  ],

  "4-complex-sinusoids": [
    {
      id: "three-forms",
      title: "One point, three spellings",
      prompt: "z = −3 + 3j. Write |z|, the angle θ (radians, exact), the polar form, the exponential form, and the conjugate z∗. Then: what is z · z∗?",
      hints: [
        "Plot it: real part −3 (left), imaginary part 3 (up). Magnitude is the distance from the origin — Pythagoras. Angle is measured counterclockwise from the positive real axis.",
        "The classic error is θ = arctan(3/−3) = −π/4. That's the angle for +3 − 3j (fourth quadrant). Your point is in the *second* quadrant; add π: θ = 3π/4.",
        "Conjugate flips the sign of the imaginary part. z·z∗ always equals |z|² — check your magnitude with it.",
      ],
      solution: [
        "|z| = √(9 + 9) = √18 = 3√2 ≈ 4.24.",
        "θ = 3π/4 (135°): second quadrant, 45° above the negative real axis.",
        "Polar: 3√2·(cos 3π/4 + j sin 3π/4). Exponential: 3√2·e^(j3π/4).",
        "z∗ = −3 − 3j. z·z∗ = (−3)² + 3² = 18 = |z|². ✓",
      ],
      why: "Every value in a spectrum is a complex number, and 'magnitude and angle' is how you read it: magnitude is how loud that frequency is, angle is its phase. Get the quadrant wrong and your phase is off by 180° — which is the difference between a sound and its exact cancellation.",
    },
    {
      id: "spinner",
      title: "Why a cosine is two spinners",
      prompt: "Starting from Euler's formula e^(jθ) = cos θ + j sin θ, show in three lines that cos θ = (e^(jθ) + e^(−jθ))/2. Then say what this means for the spectrum of a real cosine at 100 Hz.",
      hints: [
        "Write Euler's formula twice: once for θ, once for −θ. Remember cos(−θ) = cos θ and sin(−θ) = −sin θ.",
        "The mistake is trying to solve for cos by dividing. Instead, *add* the two equations — the j sin terms cancel.",
        "e^(jθ) with θ = 2π·100·t is a point spinning counterclockwise at 100 Hz. e^(−jθ) spins clockwise — that's a *negative* frequency, −100 Hz. Half of each.",
      ],
      solution: [
        "e^(jθ) = cos θ + j sin θ and e^(−jθ) = cos θ − j sin θ.",
        "Add them: e^(jθ) + e^(−jθ) = 2 cos θ.",
        "Divide by 2: cos θ = (e^(jθ) + e^(−jθ))/2.",
        "So a real 100 Hz cosine is half a spinner at +100 Hz plus half a spinner at −100 Hz. Its spectrum has two lines, at +100 and −100 Hz, each of height A/2. That's why Fourier spectra are symmetric for real signals.",
      ],
      why: "This one identity is why every FFT plot of a real signal has a mirror image, why 'negative frequency' is a real thing engineers say, and why the DFT of an N-point real signal only has N/2 useful bins. Once you see the two spinners, the rest of the course stops being mysterious.",
    },
  ],

  "5-fourier-series": [
    {
      id: "coefs-by-eye",
      title: "Coefficients without calculus",
      prompt: "x(t) = 3 + 4·cos(2π·10·t) + 2·cos(2π·30·t + π/2). Period? Fundamental frequency? Write the trigonometric-form coefficients (a₀, aₖ, bₖ) for all k, and the complex coefficients Xₖ for k = 0, ±1, ±3. Then sketch the magnitude spectrum.",
      hints: [
        "The fundamental is the largest F that divides all the frequencies present: 10 and 30 → 10 Hz. Period = 1/10 s. The 30 Hz term is harmonic k = 3.",
        "Two traps: forgetting that the constant 3 is the k = 0 term, and mishandling the +π/2 phase — cos(θ + π/2) = −sin θ, so that term is a *sine*, which lands in bₖ, with a sign.",
        "Complex form: a cosine of amplitude A at harmonic k splits into Xₖ = X₋ₖ = A/2 (the two spinners). With a phase ϕ: Xₖ = (A/2)e^(jϕ), X₋ₖ = (A/2)e^(−jϕ).",
      ],
      solution: [
        "F₀ = 10 Hz, T = 0.1 s. Harmonics present: k = 0, 1, 3.",
        "a₀ = 3 (the DC term). a₁ = 4, b₁ = 0. 2cos(2π·30t + π/2) = −2 sin(2π·30t), so a₃ = 0, b₃ = −2. All other aₖ, bₖ = 0.",
        "Complex: X₀ = 3. X₁ = X₋₁ = 2. X₃ = (2/2)e^(jπ/2) = j, X₋₃ = e^(−jπ/2) = −j. |X₃| = |X₋₃| = 1.",
        "Magnitude spectrum: lines at 0 Hz (3), ±10 Hz (2 each), ±30 Hz (1 each). Nothing else.",
      ],
      why: "Reading a signal's ingredients off its formula — and predicting the spectrum before you plot it — is the check that catches bugs in every lab notebook. And 'this term is really a sine' is the kind of detail that decides whether a phase spectrum makes sense.",
    },
    {
      id: "orthogonality",
      title: "Why multiply-and-integrate finds a coefficient",
      prompt: "Explain, in your own words and one short calculation, why integrating x(t)·cos(2π·k·F₀·t) over one period picks out only the k-th cosine's amplitude and zeroes out everything else. Use x(t) = a₁cos(2πF₀t) + a₂cos(2π·2F₀t).",
      hints: [
        "Multiply x(t) by cos(2π·2F₀t) and integrate over one period. You get two integrals: a₁∫cos(2πF₀t)cos(2π2F₀t) and a₂∫cos²(2π2F₀t). Think about each separately.",
        "The mistake is trying to compute the integrals from scratch. Use the two facts from the chapter: the integral of a product of *different* harmonics over a period is 0, and the integral of cos² over a period is T/2.",
        "So the a₁ term vanishes (different harmonics) and the a₂ term gives a₂·T/2. Divide by T/2 and you have a₂. That's the recipe: multiply, integrate, normalize.",
      ],
      solution: [
        "∫₀ᵀ x(t)cos(2π2F₀t)dt = a₁∫cos(2πF₀t)cos(2π2F₀t)dt + a₂∫cos²(2π2F₀t)dt.",
        "First integral: different harmonics are orthogonal — it's 0. Second: cos² over a period integrates to T/2.",
        "Result: a₂·T/2. So a₂ = (2/T)∫x(t)cos(2π2F₀t)dt.",
        "Intuition: multiplying by the k-th cosine and averaging asks 'how much of x moves in step with this cosine?' Every other harmonic spends as much time in step as out of step, so it averages to zero.",
      ],
      why: "This 'correlate with a template and average' move is the DFT, the matched filter in radar, the way a phone finds a Wi-Fi carrier, and — in LING 124 — how a spectrogram is computed. One idea, everywhere.",
    },
  ],

  "6-transform-dft-stft": [
    {
      id: "dft-bins",
      title: "Bin spacing and what you can resolve",
      prompt: "A 16 kHz recording; you take a DFT of N = 512 samples. (a) Bin spacing in Hz? (b) Which bin is closest to 1000 Hz? (c) Two vowel harmonics at 1000 and 1015 Hz — can this DFT tell them apart? (d) What N would you need to resolve them, and how long a frame is that in ms?",
      hints: [
        "Bin spacing = Fₛ/N. Bin k sits at k·Fₛ/N. To resolve two tones, the spacing must be smaller than their distance apart.",
        "The error to avoid: thinking more samples per second helps resolution. Frequency resolution depends on the frame *length in seconds* (N/Fₛ) — longer frame, finer bins. Fₛ alone doesn't fix it.",
        "Need Fₛ/N < 15 → N > 16000/15 ≈ 1067 → the next power of 2 is 2048. Frame length = N/Fₛ.",
      ],
      solution: [
        "(a) 16000/512 = 31.25 Hz per bin.",
        "(b) 1000/31.25 = 32 → bin 32 exactly (32 × 31.25 = 1000 Hz).",
        "(c) No — 15 Hz apart, bins are 31.25 Hz apart. They land in the same bin and smear together.",
        "(d) N ≥ 1067; use N = 2048 → spacing 7.8 Hz. Frame = 2048/16000 = 128 ms — long enough that a vowel may have changed during it. That's the time–frequency trade-off.",
      ],
      why: "Every spectrogram setting you'll ever choose is this calculation: narrow-band (long frames, see harmonics, blur time) versus wide-band (short frames, see formants and timing, blur frequency). Speech scientists pick by ear, but the ear is doing this arithmetic.",
    },
    {
      id: "stft-params",
      title: "STFT parameters from scratch (Lab 7/8)",
      prompt: "Fₛ = 16000 Hz, frame length 25 ms, frame shift 10 ms, 2 s of audio, FFT size = next power of 2 above the frame. Compute: samples per frame, samples per shift, FFT size N, bin spacing, number of frames, and the time between spectrogram columns.",
      hints: [
        "Convert every time to samples by multiplying by Fₛ: 0.025 × 16000 and 0.010 × 16000. FFT size is the next power of 2 above samples-per-frame.",
        "The common error is using the FFT size (512) as the bin spacing denominator with the frame length in ms — keep units straight: spacing = Fₛ/N with N in samples.",
        "Number of frames ≈ (total samples − frame) / shift + 1. Time between columns is just the shift, in seconds.",
      ],
      solution: [
        "Frame: 0.025 × 16000 = 400 samples. Shift: 0.010 × 16000 = 160 samples.",
        "N = 512 (next power of 2 above 400; the frame is zero-padded to 512).",
        "Bin spacing = 16000/512 = 31.25 Hz.",
        "Frames = (32000 − 400)/160 + 1 = 198 (≈ 200). Columns are 10 ms apart.",
        "Spectrogram shape: 198 columns × 257 useful bins (0…N/2).",
      ],
      why: "These exact numbers — 25 ms window, 10 ms hop, 16 kHz — are the defaults in nearly every speech recognizer ever built, including the ones on your phone. Being able to derive them means you can read any ASR paper's preprocessing section and know what the model actually sees.",
    },
    {
      id: "leakage",
      title: "Why the peak smears, and what the window does",
      prompt: "You DFT a pure 1000 Hz tone with N = 512 at Fₛ = 16 kHz and see a clean single peak. You change the tone to 1010 Hz and the peak turns into a smear with skirts. Explain why, and say what applying a Hamming window before the DFT changes — both the good and the bad.",
      choices: [
        { text: "1010 Hz is above Nyquist, so it aliases", feedback: "Nyquist is 8000 Hz; 1010 is nowhere near it. This is about bins, not aliasing." },
        { text: "1010 Hz doesn't land on a bin (bins are 31.25 Hz apart), so the frame doesn't contain a whole number of cycles; the rectangular cut-off creates a jump at the edges, which spreads energy into neighbouring bins", feedback: "Right. That spread is spectral leakage, and it comes from the abrupt edges of the rectangular window." },
        { text: "The DFT can only represent frequencies that are multiples of 1000", feedback: "It represents multiples of Fₛ/N = 31.25 Hz. 1000 happens to be one (bin 32); 1010 isn't." },
      ],
      answer: 1,
      hints: [
        "Check whether 1010 is a multiple of the bin spacing 31.25. If not, the frame holds a non-integer number of cycles — what does the start and end of the frame look like then?",
        "The error is blaming aliasing or the tone itself. The tone is fine; the *cut* is the problem. A rectangular window chops the wave mid-cycle, and a sharp jump needs many frequencies to describe.",
        "A Hamming window fades the frame in and out, removing the jump: the skirts drop dramatically. The cost: the main peak gets wider (about twice as wide), so two close tones are harder to separate.",
      ],
      solution: [
        "Bins are at multiples of 31.25 Hz. 1000 = 32 bins exactly; 1010 is not on a bin, so the 512-sample frame doesn't contain a whole number of cycles.",
        "A rectangular window then cuts the wave mid-cycle. The discontinuity at the frame edges is a sharp feature, and sharp features spread across many frequencies — leakage: a smeared peak with sidelobes.",
        "Hamming windowing tapers the frame to zero at both ends, so there's no jump: sidelobes fall by tens of dB. Trade-off: the main lobe widens, so frequency resolution gets slightly worse.",
        "That's why Lab 7's spectra with Hamming look 'cleaner but fatter'.",
      ],
      why: "Every spectrogram you'll ever see was windowed, and the choice of window decides whether you're looking at real harmonics or at artifacts of the cut. Knowing the trade-off is what lets you distrust a peak that shouldn't be there.",
    },
  ],
};
