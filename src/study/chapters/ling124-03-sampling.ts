import type { Chapter, Frame } from "../types";

/**
 * LING 124 · Day 3 — Sampling, quantization, aliasing. Built from
 * sampling_quantization.pdf, aliasing.pdf, Rosen & Howell ch. 14, and Lab 2
 * (where Q9 and the alias-pair questions cost points).
 */
const sampleFrames: Frame[] = [
  { kind: "array", cells: ["x(t) = cos(10πt)"], hl: [0], note: "= cos(2π·5·t): a 5 Hz cosine", caption: "The signal. First rewrite 10π as 2π·5 so you can read the frequency: F = 5 Hz, period T = 0.2 s." },
  { kind: "array", cells: [1, -1, 1, -1, 1, -1], hl: [0, 1, 2, 3, 4, 5], note: "Fₛ = 10 Hz, Tₛ = 0.1 s → t = 0, 0.1, 0.2, …", caption: "Sample at Fₛ = 10 Hz: a sample every 0.1 s. x[n] = cos(2π·5·n/10) = cos(πn) = 1, −1, 1, −1… Two samples per cycle. You can barely tell it's a cosine — it looks like a square wave." },
  { kind: "array", cells: [1, 0.809, 0.309, -0.309, -0.809, -1, -0.809, -0.309, 0.309, 0.809, 1], hl: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], note: "Fₛ = 50 Hz, Tₛ = 0.02 s", caption: "Sample at Fₛ = 50 Hz: a sample every 0.02 s. x[n] = cos(2π·5·n/50) = cos(πn/5). Ten samples per cycle. Now it clearly traces the cosine. More samples per second = better approximation. (Lab 2 Q9.)" },
  { kind: "array", cells: ["x[n] = x(n·Tₛ) = x(n/Fₛ)"], done: [0], note: "samples in T seconds = T · Fₛ", caption: "The general formula. Sample n is taken at time n·Tₛ. Over T seconds you get T·Fₛ samples. Fₛ = 1/Tₛ." },
];

export const ling124Sampling: Chapter = {
  slug: "3-sampling-aliasing",
  label: "Day 3",
  title: "Sampling, quantization, and aliasing",
  source: "sampling_quantization.pdf, aliasing.pdf, Rosen & Howell (1991) ch. 14, Lab 2.",
  goal: "Turn a continuous wave into samples and back on paper; say what quantization bits mean; explain why sampling creates aliases, list the aliases of any frequency, and derive the Nyquist limit Fₛ/2.",
  minutes: 45,
  requires: ["0-reading-a-wave"],
  sections: [
    {
      id: "why",
      title: "Why computers can't hold a wave",
      blocks: [
        { id: "why-1", t: "why", slide: "Analog vs digital", title: "The problem", text: "A real sound wave is **continuous in time** (it has a value at every instant, infinitely many) and **continuous in amplitude** (any pressure, infinitely fine). A computer stores a finite list of finite-precision numbers. So two things have to be made discrete: *when* we look (sampling) and *how precisely* we record what we see (quantization). Everything in this chapter is the consequence of those two compromises." },
        { id: "why-2", t: "def", term: "Sampling · quantization", text: "**Sampling**: continuous time → a discrete sequence of time points, taken at regular intervals. **Quantization**: continuous amplitude → a discrete set of allowed amplitude levels." },
      ],
    },
    {
      id: "sampling",
      title: "Sampling",
      blocks: [
        { id: "s-1", t: "list", slide: "Two numbers, reciprocals", items: [
          "**Sampling interval Tₛ**: the time between samples, in seconds.",
          "**Sampling frequency (rate) Fₛ**: samples per second, in Hz. **Fₛ = 1/Tₛ**.",
          "CD audio: Fₛ = 44,100 Hz. Speech corpora: often 16,000 Hz or 8,000 Hz (telephone).",
        ] },
        { id: "s-2", t: "stepper", slide: true, title: "Sampling cos(10πt) at two rates (the slides' example)", frames: sampleFrames },
        { id: "s-3", t: "code", slide: "The sample formula (Lab 2 Q1–Q8)", caption: "Replace t with n/Fₛ. Everything else in the wave formula stays put.", text: `x[n] = x(n · Tₛ) = x(n / Fₛ)             n = 0, 1, 2, …
so for x(t) = A·cos(2πFt + ϕ):
x[n] = A·cos(2πF·n/Fₛ + ϕ)
number of samples in T seconds = T · Fₛ    (4 s at 100 Hz → 400 samples)
Lab 2: x[3] is taken at t = 3·Tₛ; with Tₛ = 0.005 s that's t = 0.015 s` },
        { id: "s-4", t: "warn", title: "Lab 2 Q9 — the one that was marked wrong", text: "'How do we approximate x(t) better?' Only two things help: a **higher Fₛ** or, equivalently, a **shorter Tₛ** (same thing said twice). Changing the total duration T does nothing for the approximation — it just gives you more or fewer samples of the same quality. The four correct boxes were: higher Fₛ, shorter Tₛ; the T options were distractors." },
      ],
    },
    {
      id: "quant",
      title: "Quantization",
      blocks: [
        { id: "q-1", t: "p", slide: "Levels and bits", text: "Choose a set of allowed amplitude levels and snap every sample to the closest one — in Koo's convention, 'closest' means the highest level that doesn't exceed the value. The number of levels is the **resolution**. Levels are indexed by integers and stored in bits, so the count is a power of 2: **3 bits → 2³ = 8 levels (0–7); 5 bits → 32; 8 bits → 256; 16 bits → 65,536** (CD quality). More bits = finer steps = less rounding error (quantization noise)." },
        { id: "q-2", t: "try", q: "A recording is 12-bit at 16 kHz. How many amplitude levels, and how many samples in 2.5 seconds?", a: "2¹² = 4,096 levels. 2.5 × 16,000 = 40,000 samples." },
      ],
    },
    {
      id: "alias",
      title: "Aliasing: two waves that look the same after sampling",
      blocks: [
        { id: "a-1", t: "why", slide: "The wagon-wheel problem", title: "Why it exists", text: "In old films, wagon wheels seem to spin backward. The camera takes 24 pictures a second; if a spoke rotates almost a full turn between frames, it looks like it barely moved backward. Sampling a sound does the same thing: a high frequency, sampled too slowly, produces exactly the same list of numbers as some lower frequency. Those two frequencies are **aliases** of each other, and once you've sampled, you cannot tell them apart." },
        { id: "a-2", t: "worked", slide: "Why F and F + Fₛ are aliases (the slides' algebra)", title: "The proof, one line at a time", problem: "Show that cos(2πFt) and cos(2π(F + Fₛ)t) give identical samples at rate Fₛ.", steps: [
          "Samples are taken at t = n/Fₛ. So the samples of the second wave are cos(2π(F + Fₛ)·n/Fₛ).",
          "Distribute: cos(2πF·n/Fₛ + 2πFₛ·n/Fₛ) = cos(2πF·n/Fₛ + 2πn).",
          "2πn is a whole number of full turns. Cosine is 2π-periodic, so cos(x + 2πn) = cos(x).",
          "Therefore = cos(2πF·n/Fₛ) — exactly the samples of the first wave. Adding Fₛ to the frequency changes nothing after sampling.",
        ] },
        { id: "a-3", t: "list", slide: "All the aliases of F (aliasing.pdf slide 5)", items: [
          "**−F**: because cosine is even, cos(2π·F·t) = cos(2π·(−F)·t). A negative frequency is just the point going around the circle the other way; its shadow is identical.",
          "**F ± k·Fₛ** for any integer k: adding or subtracting whole multiples of the sampling rate (the proof above).",
          "**−F ± k·Fₛ**: combine the two.",
          "So the aliases of F sampled at Fₛ are: …, −F − Fₛ, −F, −F + Fₛ, F, F + Fₛ, F + 2Fₛ, … and −F + 2Fₛ, etc.",
        ] },
        { id: "a-4", t: "worked", slide: "Lab 2 Q12–Q15: the pairs", title: "Fₛ = 1000 Hz, frequencies 0 to 1000", problem: "Find the alias pairs and the pattern.", steps: [
          "Aliases of F include −F + Fₛ = 1000 − F. So 100 Hz pairs with 900, 200 with 800, 300 with 700, 400 with 600, and 0 with 1000.",
          "Pattern (Q13, Q15): **F₂ = Fₛ − F₁**. The pairs are mirror images around Fₛ/2 = 500 Hz.",
          "500 Hz pairs with itself. That's the edge — the Nyquist frequency (Q11, Q14).",
        ], answer: "F₂ = Fₛ − F₁; Nyquist = Fₛ/2 = 500 Hz" },
        { id: "a-5", t: "worked", slide: "Deriving the Nyquist frequency (aliasing.pdf slide 9)", title: "Why Fₛ/2 is the limit", problem: "We want a range 0 to F_max with no aliases inside it. How high can F_max be?", steps: [
          "F must be below Fₛ, because 0 and Fₛ are aliases — if the range reached Fₛ, the very first alias would be inside it.",
          "Among the aliases of a frequency F, the one that could fall below Fₛ is −F + Fₛ. It must not land inside the range, i.e. it must not be below F.",
          "Require −F + Fₛ ≥ F. Rearrange: Fₛ ≥ 2F, so **F ≤ Fₛ/2**.",
          "So the alias-free range is 0 to Fₛ/2. That upper limit is the **Nyquist frequency**. To represent frequencies up to F, sample at least at 2F.",
        ], answer: "Nyquist = Fₛ/2" },
        { id: "a-6", t: "figure", slide: "Mirror around Nyquist", viewBox: "0 0 560 120", caption: "With Fₛ = 1000 Hz: every frequency above 500 folds back onto its mirror image below 500. 900 Hz is indistinguishable from 100 Hz after sampling.", svg: `<g stroke="currentColor" font-family="ui-monospace, monospace" font-size="11">
<line x1="30" y1="70" x2="530" y2="70" opacity=".5"/>
${[0,100,200,300,400,500,600,700,800,900,1000].map((f,i)=>`<line x1="${30+i*50}" y1="65" x2="${30+i*50}" y2="75" opacity=".6"/><text x="${22+i*50}" y="92" fill="currentColor" stroke="none" opacity=".7">${f}</text>`).join("")}
<line x1="280" y1="20" x2="280" y2="100" stroke="rgb(59 130 246)" stroke-dasharray="4 3"/><text x="240" y="15" fill="rgb(59 130 246)" stroke="none">Nyquist Fₛ/2</text>
${[[80,480],[130,430],[180,380],[230,330]].map(([a,b])=>`<path d="M${a} 62 Q ${(a+b)/2} 25 ${b} 62" fill="none" stroke="rgb(59 130 246)" opacity=".7"/>`).join("")}
</g>` },
        { id: "a-7", t: "def", term: "Aliasing · Nyquist frequency", text: "Sampling at Fₛ makes F indistinguishable from −F and from F ± kFₛ (and −F ± kFₛ). The alias-free band is 0 to **Fₛ/2**, the Nyquist frequency. To capture frequencies up to F, sample at Fₛ ≥ 2F. (Speech at 16 kHz captures up to 8 kHz; telephone 8 kHz captures up to 4 kHz — which is why phones sound dull.)" },
        { id: "a-8", t: "try", q: "A 7 kHz tone is sampled at 10 kHz. What frequency will it appear to be?", a: "Its alias −7 + 10 = 3 kHz. It folds back to 3 kHz (mirror of 7 around Nyquist = 5)." },
        { id: "a-9", t: "try", q: "Lab 2 Q14: what's the Nyquist frequency in terms of Fₛ, and why does the answer 'Fₛ − F' appear as a choice?", a: "Nyquist = Fₛ/2. 'Fₛ − F' is the *alias* of F, not the Nyquist frequency — it's the Q15 answer (F₂ = Fₛ − F₁), planted as a distractor in Q14." },
      ],
    },
  ],
};
