import type { Chapter, Frame } from "../types";

/**
 * LING 124 · Chapter 0 + Day 2–3 — Reading a wave formula and the basic
 * acoustics vocabulary. Built from basic_acoustics.pdf, sinusoids_review.pdf
 * (Koo's own "I rushed my lecture" note), basic_sinusoids.pdf, and Labs 1 & 3
 * Q1–Q4. Assumes the reader knows the unit circle and radians.
 */
const readFrames: Frame[] = [
  { kind: "lines", lines: ["x(t) = 2 cos(2π · 100 · t + π/3)", "A = 2          peak amplitude: the wave swings between −2 and +2", "F = 100        frequency in Hz: 100 full cycles every second", "ϕ = π/3        initial phase: where in its cycle the wave is at t = 0", "t              time in seconds — the only thing that varies", "2π             the conversion: one cycle = 2π radians"], active: 0, caption: "Lab 3 Q1's formula. We'll read it one symbol at a time. There are exactly four things in it that mean something; everything else is plumbing." },
  ...[1,2,3,4,5].map((a) => ({ kind: "lines" as const, lines: ["x(t) = 2 cos(2π · 100 · t + π/3)", "A = 2          peak amplitude: the wave swings between −2 and +2", "F = 100        frequency in Hz: 100 full cycles every second", "ϕ = π/3        initial phase: where in its cycle the wave is at t = 0", "t              time in seconds — the only thing that varies", "2π             the conversion: one cycle = 2π radians"], active: a, caption: ["", "The number out front multiplies the whole cosine. cos swings between −1 and +1, so 2·cos swings between −2 and +2. That's the peak amplitude A. Lab 3 Q1 answer: amplitude = 2.", "The number multiplying t (after the 2π) is the frequency F in Hz. 100 Hz means 100 cycles per second. NOT 2π·100 — the 2π is not part of the frequency (that was the wrong answer in Lab 3 Q1).", "The constant added inside the parentheses is the initial phase ϕ, in radians. At t = 0 the argument is just ϕ, so the wave starts at cos(π/3) = 0.5 instead of at its peak.", "t is the input. Everything else is a fixed dial. The formula is a function: give it a time, it gives you the pressure.", "Why 2π? A cosine repeats every 2π radians. F cycles per second × 2π radians per cycle = 2πF radians per second. The 2π is the unit conversion that lets you write F in Hz instead of radians per second."][a] })),
];

export const ling124Waves: Chapter = {
  slug: "0-reading-a-wave",
  label: "Chapter 0 · Days 2–3",
  title: "Reading a wave formula, and the acoustics vocabulary",
  source: "basic_acoustics.pdf (Day 2), sinusoids_review.pdf and basic_sinusoids.pdf (Day 3), Lab 1, Lab 3 Q1–Q4.",
  goal: "Look at A·cos(2πFt + ϕ) and say what each symbol does; picture it as a point going around a circle; use frequency/period/amplitude/dB/spectrum correctly; predict how a plot changes when one dial changes.",
  minutes: 55,
  sections: [
    {
      id: "why",
      title: "Why the whole course is one formula",
      blocks: [
        { id: "why-1", t: "why", slide: "The plan of the course", title: "Where this is going", text: "Speech is a pressure wave. Koo's course says: any wave, no matter how messy, can be written as a sum of simple waves called sinusoids (that's Fourier analysis, Days 5–7). So if you can read one sinusoid — A·cos(2πFt + ϕ) — you can read the building block of everything after. Every lab so far has been a question about one of the four letters in that formula. This chapter makes them yours." },
        { id: "why-2", t: "p", text: "You told me you know the unit circle and radians. Good — that's the only prerequisite. The formula is the unit circle with a clock attached." },
      ],
    },
    {
      id: "vocab",
      title: "Waves: the vocabulary from Day 2",
      blocks: [
        { id: "v-1", t: "def", term: "Sound wave · waveform", text: "A **sound wave** is a pattern of pressure fluctuation caused by the movement of a source (vocal folds) and propagated through a medium (air). A **waveform** is a graph of that pressure over time: x-axis time, y-axis pressure." },
        { id: "v-2", t: "list", slide: "Periodic waves have three numbers", items: [
          "**Period T**: how long one cycle takes, in seconds. **Frequency F**: how many cycles per second, in **Hertz (Hz)**. They're reciprocals: **F = 1/T**, **T = 1/F**. A 10 Hz wave has period 0.1 s = 100 ms. (You got this one right: T = 0.01 s → F = 100 Hz.)",
          "**Amplitude**: how far the wave deviates from rest. **Peak amplitude** is the maximum; **RMS amplitude** (root mean square) is the square root of the average squared value — for a sinusoid with peak 1, RMS = 0.707. RMS is what 'how loud on average' means.",
          "**Periodic** = repeats at regular intervals (a vowel, a tuning fork). **Aperiodic** = no repetition (noise, 's', 'sh').",
        ] },
        { id: "v-3", t: "p", slide: "Decibels: why the formula has a 20 in it", text: "Loudness doesn't track pressure linearly — doubling the pressure doesn't sound twice as loud. So we compare sounds on a log scale. A **bel** is log₁₀ of the ratio of two *intensities*. Intensity goes with amplitude *squared*, so with amplitudes x and r: bels = log₁₀(x²/r²) = 2·log₁₀(x/r). A bel is too big a unit, so we use tenths: **dB = 10·log₁₀(x²/r²) = 20·log₁₀(x/r)**. The 20 is 10 (deci) × 2 (the square)." },
        { id: "v-4", t: "code", slide: "dB in numbers", text: `amplitude ratio x/r     dB = 20·log10(x/r)
   1 (same)                 0 dB
   2                       +6 dB     ← double the amplitude
  10                      +20 dB
 100                      +40 dB
   0.5                     −6 dB
reference r:  dB SPL → r = 20 μPa (quietest audible 1 kHz tone)
              dB SL  → r = the hearing threshold at THAT frequency` },
        { id: "v-5", t: "p", text: "The **equal-loudness curve** slide says: at 50 Hz you need about 40 dB SPL to *just hear* a tone — 100 times the pressure you'd need at 1000 Hz. Ears are most sensitive around 1–4 kHz, where speech lives." },
        { id: "v-6", t: "try", q: "Lab-style: two vowels, (a) has peak 0.3 and (b) has peak 0.6. Which is louder, and by how many dB?", a: "(b), by 20·log₁₀(0.6/0.3) = 20·log₁₀(2) ≈ 6 dB." },
      ],
    },
    {
      id: "circle",
      title: "A sinusoid is a point going around a circle",
      blocks: [
        { id: "c-1", t: "p", slide: "The rotating-circle picture (Koo's note, §2)", text: "Draw a circle of radius 1. Put a point on it at angle θ from the positive x-axis. Its coordinates are (cos θ, sin θ). Now let the point *rotate* counterclockwise: θ grows, and if you plot the x-coordinate against θ you get a **cosine wave**; plot the y-coordinate and you get a **sine wave**. That's all a sinusoid is — the shadow of a rotating point. Everything else is dials." },
        { id: "c-2", t: "figure", slide: "The shadow of a rotating point", viewBox: "0 0 600 200", caption: "Left: a point at angle θ on the unit circle. Right: its x-coordinate plotted as θ grows — a cosine. One full rotation (2π radians) = one cycle of the wave.", svg: `<g fill="none" stroke="currentColor" font-family="ui-monospace, monospace" font-size="11">
<circle cx="100" cy="100" r="70" opacity=".4"/>
<line x1="20" y1="100" x2="180" y2="100" opacity=".3"/><line x1="100" y1="20" x2="100" y2="180" opacity=".3"/>
<line x1="100" y1="100" x2="149.5" y2="50.5" stroke="rgb(59 130 246)" stroke-width="2"/>
<circle cx="149.5" cy="50.5" r="4" fill="rgb(59 130 246)" stroke="none"/>
<path d="M 125 100 A 25 25 0 0 0 117.7 82.3" stroke="rgb(59 130 246)"/>
<text x="130" y="95" fill="currentColor" stroke="none">θ</text>
<line x1="149.5" y1="50.5" x2="149.5" y2="100" stroke="currentColor" stroke-dasharray="3 3" opacity=".6"/>
<text x="140" y="118" fill="currentColor" stroke="none">cos θ</text>
<line x1="230" y1="100" x2="580" y2="100" opacity=".3"/><line x1="230" y1="30" x2="230" y2="170" opacity=".3"/>
<path d="M230 30 C 260 30, 280 170, 317 170 S 375 30, 405 30 S 463 170, 492 170 S 550 30, 580 30" stroke="rgb(59 130 246)" stroke-width="2"/>
<circle cx="257" cy="50" r="4" fill="rgb(59 130 246)" stroke="none"/>
<text x="400" y="190" fill="currentColor" stroke="none">θ →   (2π = one cycle)</text>
<text x="235" y="25" fill="currentColor" stroke="none">+1</text><text x="235" y="180" fill="currentColor" stroke="none">−1</text>
</g>` },
        { id: "c-3", t: "list", slide: "Facts about sin and cos you'll use in every lab", items: [
          "Both repeat every **2π radians** (360°): cos(θ + 2πk) = cos θ for any integer k. So adding or subtracting 2π inside the parentheses changes nothing — that's Lab 3 Q3.",
          "**cos θ = sin(θ + π/2)**: cosine is sine shifted a quarter cycle earlier. Same shape, different starting point. Koo uses cosine as the standard.",
          "**cos is even**: cos(−θ) = cos θ. Rotating clockwise gives the same x-coordinate. **sin is odd**: sin(−θ) = −sin θ. (You said you know these — they're the reason 2cos(2π·(−100)·t − π/3) equals 2cos(2π·100·t + π/3): negate the whole inside and cosine doesn't care.)",
          "Radians: θ = arc length / radius. Full circle = 2π. 90° = π/2, 60° = π/3, 45° = π/4, 30° = π/6.",
        ] },
      ],
    },
    {
      id: "formula",
      title: "The formula: A·cos(2πFt + ϕ)",
      blocks: [
        { id: "f-1", t: "p", slide: "From angle to time", text: "The circle picture uses an angle θ. Sound happens in time. So let the point rotate at a steady speed: **F rotations per second**. Each rotation is 2π radians, so after t seconds the angle is θ = 2πF·t. Replace θ with that and cos θ becomes **cos(2πFt)** — a wave that completes F cycles every second, i.e. frequency F Hz. (2πF is called the angular frequency ω, in radians per second; you'll see ω in readings, F in Koo's notebooks.)" },
        { id: "f-2", t: "stepper", slide: true, title: "Reading Lab 3's formula symbol by symbol", frames: readFrames },
        { id: "f-3", t: "table", slide: "The three dials, in the circle picture", rows: [
          ["Symbol", "Name", "In the circle picture", "In the waveform"],
          ["A", "peak amplitude", "the radius of the circle", "how tall the wave is: swings between −A and +A"],
          ["F", "frequency (Hz)", "rotations per second", "how many cycles per second; period T = 1/F"],
          ["ϕ", "initial phase (radians)", "the angle where the point starts at t = 0", "where the wave is in its cycle at time zero — a head start"],
        ] },
        { id: "f-4", t: "worked", slide: "Lab 3 Q2–Q4, worked", title: "Changing the dials", problem: "Start from x(t) = 2cos(2π·100·t + π/3).", steps: [
          "Q2: peak amplitude 3× and frequency 2× → change A to 6 and F to 200, leave ϕ: **6cos(2π·200·t + π/3)**. The phase is a starting angle; scaling amplitude or speed doesn't move the start.",
          "Q3: which formulas are the *same* wave? Any that differ only by ±2π inside (2cos(… − 5π/3) since π/3 − 2π = −5π/3; 2cos(… + 13π/3) since π/3 + 4π = 13π/3), by negating the whole inside (cos is even: 2cos(2π·(−100)·t − π/3)), or by switching to sine with +π/2 (2sin(2π·100·t + π/3 + π/2) = 2sin(… + 5π/6); and since sin is odd, −2sin(2π·(−100)·t − 5π/6) is the same; and 2sin(… − 7π/6) since 5π/6 − 2π = −7π/6). All six listed options were equivalent — the trick was that none was a distractor.",
          "Q4: sampling at Fₛ, taking sample n at time t = n/Fₛ → replace t: **x[n] = 2cos(2π·100·n/Fₛ + π/3)**. Only t changes; A, F, ϕ stay.",
        ] },
        { id: "f-5", t: "try", q: "Write a 440 Hz wave with amplitude 0.5 that starts at its trough.", a: "Trough means cos(ϕ) = −1, so ϕ = π: x(t) = 0.5·cos(2π·440·t + π). (Equivalently −0.5·cos(2π·440·t).)" },
        { id: "f-6", t: "try", q: "How does the plot of 3cos(2π·5·t) change if you (a) change 3 to 10, (b) change 5 to 10, (c) add + π inside?", a: "(a) Same shape, taller: swings ±10 instead of ±3. (b) Twice as many cycles per second — the wave is squeezed horizontally, period drops from 0.2 s to 0.1 s. (c) Flipped: it starts at its trough instead of its peak (cos(θ + π) = −cos θ)." },
        { id: "f-7", t: "def", term: "Sinusoid", text: "x(t) = A·cos(2πFt + ϕ): a point of radius A rotating F times per second starting at angle ϕ, seen from the side. A = peak amplitude, F = frequency in Hz, ϕ = initial phase in radians." },
      ],
    },
    {
      id: "spectrum",
      title: "Spectra: taking a wave apart",
      blocks: [
        { id: "s-1", t: "why", slide: "Simple vs complex periodic waves", title: "Why we need spectra", text: "A single sinusoid is a **simple** periodic wave. A vowel is a **complex** periodic wave — it repeats, but the shape inside each cycle is jagged. Day 2's key claim: a complex wave is a **sum of simple waves** (sinusoids) at different frequencies, amplitudes and phases. A **spectrum** is the recipe: which sinusoids, how much of each." },
        { id: "s-2", t: "table", slide: "Three plots you must be able to tell apart", rows: [
          ["Plot", "x-axis", "y-axis", "Shows"],
          ["Waveform", "time", "pressure (amplitude)", "the signal itself"],
          ["Magnitude spectrum", "frequency", "amplitude", "how much of each frequency is present — a snapshot"],
          ["Phase spectrum", "frequency", "phase", "the starting angle of each component"],
          ["Spectrogram", "time", "frequency", "darkness/color = amplitude: how the spectrum changes over time"],
        ] },
        { id: "s-3", t: "p", slide: "Source and filter", text: "Speech has two parts. The **source** (vocal-fold vibration) produces a buzz with a fundamental frequency F₀ and harmonics at 2F₀, 3F₀, … — these are the **spectral details**, the fine comb of lines in a spectrum. The **filter** (the shape of the mouth and throat) boosts some frequencies and damps others — that's the **spectral envelope**, the smooth outline over the comb; its peaks are the **formants** that make /i/ sound different from /a/. Lab 1 Q6 asked which column of plots showed the filter: the smooth envelopes, not the jagged combs." },
        { id: "s-4", t: "figure", slide: "Envelope over detail", viewBox: "0 0 560 170", caption: "A vowel's magnitude spectrum: the thin lines are harmonics (source detail), the smooth curve is the envelope (filter). The humps in the envelope are formants F1, F2, F3.", svg: `<g stroke="currentColor" font-family="ui-monospace, monospace" font-size="11">
<line x1="30" y1="140" x2="540" y2="140" opacity=".4"/><line x1="30" y1="140" x2="30" y2="20" opacity=".4"/>
${Array.from({length:24},(_,i)=>{const x=40+i*21;const env=140-(70*Math.exp(-((x-110)**2)/2000)+55*Math.exp(-((x-260)**2)/3000)+35*Math.exp(-((x-420)**2)/4000)+8);return `<line x1="${x}" y1="140" x2="${x}" y2="${env+6}" stroke="currentColor" opacity=".6"/>`;}).join("")}
<path d="${Array.from({length:52},(_,i)=>{const x=30+i*10;const y=140-(70*Math.exp(-((x-110)**2)/2000)+55*Math.exp(-((x-260)**2)/3000)+35*Math.exp(-((x-420)**2)/4000)+8);return (i?'L':'M')+x+' '+y;}).join(' ')}" fill="none" stroke="rgb(59 130 246)" stroke-width="2"/>
<text x="95" y="55" fill="rgb(59 130 246)" stroke="none">F1</text><text x="248" y="72" fill="rgb(59 130 246)" stroke="none">F2</text><text x="410" y="92" fill="rgb(59 130 246)" stroke="none">F3</text>
<text x="420" y="160" fill="currentColor" stroke="none" opacity=".7">frequency →</text>
</g>` },
        { id: "s-5", t: "try", q: "Lab 1 Q5: on average, which vowel has the higher frequency — (a) or (b)? How do you read that off a waveform?", a: "Count cycles in the same span of time: the waveform with more (tighter) wiggles per second has the higher fundamental frequency. Amplitude (Q4) is the height of the swings. Read the plot, don't guess from the vowel." },
        { id: "s-6", t: "try", q: "You see a plot with time on x, frequency on y, and dark bands. What is it, and what are the bands?", a: "A spectrogram. Dark horizontal bands are formants (the filter's resonances) tracking over time; fine horizontal lines, if visible, are harmonics of the source." },
      ],
    },
  ],
};
