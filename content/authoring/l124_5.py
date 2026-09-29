from gb import *
S = "ling124--5-fourier-series"
SYNTH = old(S, "why.e7a3c1f5")
FSIM = old(S, "spectrum.5240f4b2")
TRI = old(S, "spectrum.a4c8e2f7")

DETECT = [
 lines(["x(t) = 2·cos(2π·F₀·t) + 3·cos(2π·3F₀·t)"], 0, "Lab 4 Q9. A wave made of two cosines: one at F₀ (amplitude 2) and one at 3F₀ (amplitude 3). Question: how much of each harmonic is in it?"),
 lines(["test for harmonic 1:", "the F₀ part matches → keep it", "the 3F₀ part doesn't match → averages to 0"], 1, "The 'detector' for harmonic 1 only responds to the F₀ part. Everything else cancels out."),
 lines(["X₁ = (amplitude ÷ 2) at angle ϕ", "= 2 ÷ 2 = 1"], 1, "The two-sided coefficient is half the amplitude (Chapter 4: a cosine is two half-size spinners). Phase is 0, so X₁ = 1."),
 lines(["test for harmonic 2: nothing at 2F₀", "X₂ = 0"], 1, "Neither part is at 2F₀, so the detector finds nothing."),
 lines(["test for harmonic 3: the 3F₀ part matches", "X₃ = 3 ÷ 2 = 1.5"], 1, "Only the second cosine responds. Half its amplitude: 1.5."),
 lines(["change the 3F₀ amplitude to 6 → X₁ is still 1", "give the 3F₀ part phase π/2 → X₃ = 1.5·e^{jπ/2} = 1.5j"], 0, "Q10 and Q11: changing one harmonic never affects the others' coefficients. Amplitude goes into the size of X, phase into its angle."),
]

g = {
 "id": "ling124/5-fourier-series",
 "course": "ling124",
 "lessons": "Day 5",
 "title": "Fourier series: building a repeating sound from simple waves",
 "summary": "Say what harmonics are and list them from F₀; explain why any repeating wave is a sum of harmonics; read a series in cosine form, cos+sin form and complex form and convert between them; find coefficients by eye using the 'detector' idea; draw the magnitude spectrum.",
 "estimatedMinutes": 50,
 "sourceNote": "fourier_series.pdf (note + slides), Ladefoged (1996) ch. 10, Lab 4. Rewritten in plain steps: one idea per card.",
 "requires": ["ling124/4-complex-sinusoids"],
 "sections": [
  {"id": "why", "heading": "The big idea: any repeating sound is simple waves added up", "blocks": [
    P("**You are on step 3 of the map.** Chapter 0 said a vowel is a recipe of simple waves. This chapter says exactly **which** simple waves, and how to find how much of each.", why=True),
    P("**The claim (Fourier's idea).** Take any wave that repeats, like a vowel. You can build it **exactly** by adding simple cosine waves, as long as you use the right ones in the right amounts.", slide="Fourier's idea"),
    SYNTH,
    FSIM,
    P("Try it in the sim: with 1 wave you get a plain cosine. Add the 3rd and 5th and it starts to look square. The more you add, the closer it gets. Sharp corners need the highest ones."),
    C("True or false: to build a square wave you need infinitely many simple waves, but a few already get close.", "True. Each extra one sharpens the corners a little more."),
  ]},
  {"id": "spectrum", "heading": "Harmonics: which simple waves are allowed", "blocks": [
    D("Fundamental frequency F₀", "How many times per second the whole wave repeats. For a voice, that's the pitch. Its period is **T₀ = 1 / F₀**."),
    D("Harmonics", "The simple waves you're allowed to use: whole-number multiples of F₀. **1·F₀, 2·F₀, 3·F₀, …** The k-th harmonic is at **k·F₀**."),
    E("Listing harmonics", "F₀ = 100 Hz  →  harmonics at 100, 200, 300, 400, 500 Hz, …\nF₀ = 5 Hz    →  5, 10, 15, 20, 25 Hz, …\n\nThe 5th harmonic of 5 Hz is at 5 × 5 = 25 Hz.\nThe period of a 5 Hz wave is 1/5 = 0.2 s.", slide="k · F₀"),
    P("**Why only multiples?** A wave at 3·F₀ does exactly 3 full repeats in the time the whole sound does 1. So it 'fits' the repeating pattern perfectly. A wave at 2.5·F₀ wouldn't line up at the end of each repeat, so it can't be part of a sound that repeats every T₀."),
    C("A vowel has F₀ = 120 Hz. Where are its first four harmonics?", "120, 240, 360, 480 Hz."),
  ]},
  {"id": "forms", "heading": "Three ways to write the same recipe", "blocks": [
    P("You'll see the Fourier series written three ways. They say the **same thing**; they just package the numbers differently. Learn form 1 first. Forms 2 and 3 are for the math and the code.", slide="Same recipe, three packages"),
    E("Form 1: a list of cosines (the friendly one)", "x(t) = A₀ + A₁·cos(2π·1F₀·t + ϕ₁) + A₂·cos(2π·2F₀·t + ϕ₂) + …\n\nEach harmonic k gets its own amplitude Aₖ and starting angle ϕₖ.\nA₀ is a constant: the average level of the wave.\n\nExample: x(t) = 0.4 + 1·cos(2π·2·t + π/4) + 0.6·cos(2π·5·t − π/2)\n  A₀ = 0.4;  harmonic at 2 Hz: A = 1, ϕ = π/4;  at 5 Hz: A = 0.6, ϕ = −π/2", slide="Form 1: cosines with A and ϕ"),
    E("Form 2: a cosine part and a sine part (no ϕ)", "Aₖ·cos(… + ϕₖ)  =  aₖ·cos(…) + bₖ·sin(…)\n\n  aₖ = Aₖ · cos ϕₖ\n  bₖ = −Aₖ · sin ϕₖ      (watch the minus)\n\nBack again:  Aₖ = √(aₖ² + bₖ²)\n\nExample: aₖ = 3, bₖ = 4  →  Aₖ = √(9 + 16) = 5", slide="Form 2: a and b"),
    E("Form 3: complex spinners (what numpy gives you)", "Each cosine = two spinners (Chapter 4), at +k and −k:\n\n  Xₖ = (Aₖ / 2) · e^{jϕₖ}      X₋ₖ = the conjugate of Xₖ\n\nBack again:  Aₖ = 2 · |Xₖ|,   ϕₖ = angle of Xₖ\n\nExample (Lab 4 Q7): 2·cos(2πF₀t + π/2)\n  X₁ = (2/2)·e^{jπ/2} = 1·j = j,   X₋₁ = −j", slide="Form 3: Xₖ"),
    T(["You have", "You want", "Do this"], [
      ["Aₖ, ϕₖ", "aₖ, bₖ", "aₖ = Aₖ cos ϕₖ,  bₖ = −Aₖ sin ϕₖ"],
      ["aₖ, bₖ", "Aₖ", "Aₖ = √(aₖ² + bₖ²)"],
      ["Aₖ, ϕₖ", "Xₖ", "Xₖ = (Aₖ/2)·e^{jϕₖ}"],
      ["Xₖ", "Aₖ, ϕₖ", "Aₖ = 2|Xₖ|,  ϕₖ = angle of Xₖ"],
    ], title="Conversions cheat sheet", slide="Conversions"),
    TRAP("Forgetting the factor of 2 between Xₖ and Aₖ. A cosine of amplitude 4 has |Xₖ| = 2. If a spectrum looks half as tall as expected, this is why.", "Lab 4 Q7, Q12"),
    C("A harmonic has A = 6 and ϕ = 0. What are a, b and Xₖ?", "a = 6·cos 0 = 6, b = −6·sin 0 = 0, Xₖ = (6/2)·e^{j0} = 3."),
  ]},
  {"id": "coef", "heading": "How to find how much of each harmonic: the detector", "blocks": [
    P("Given a wave, how do you find its recipe? The idea is like a **radio tuner**: tune to one station and you hear only that station, even though all stations are in the air at once.", slide="A tuner for one harmonic"),
    D("The detector recipe", "To measure harmonic k: **multiply** the wave by a test wave at frequency k·F₀, then **average** the result over one repeat. You get a big number if the wave contains that harmonic, and **zero** if it doesn't."),
    P("**Why unmatched harmonics give zero:** a wave times a different harmonic goes up and down evenly, so its average over one repeat is 0 (every hump above the line is canceled by a hump below). Only a harmonic times itself stays mostly positive and survives. The official word for this is **orthogonal**: different harmonics don't interfere with each other's measurement."),
    ST("Finding coefficients by eye (Lab 4 Q9–Q11)", DETECT),
    E("The formulas (for reference)", "a₀ = (1/T₀) ∫ x(t) dt                        the average\naₖ = (2/T₀) ∫ x(t) · cos(2π·k·F₀·t) dt\nbₖ = (2/T₀) ∫ x(t) · sin(2π·k·F₀·t) dt\nXₖ = (1/T₀) ∫ x(t) · e^{−j2π·k·F₀·t} dt\n\nAll integrals over one period (0 to T₀). '∫ … dt' ÷ T₀ just means 'average over one repeat'."),
    T(["Average over one repeat of…", "Result"], [["sin × cos (any harmonics)", "0"], ["cos(m) × cos(n), m ≠ n", "0"], ["cos(k) × cos(k), same harmonic", "½ (so the integral is T₀/2)"], ["cos or sin alone (k ≠ 0)", "0 (Lab 4 Q6: both are zero)"]], title="The detector rules"),
    C("x(t) = 5·cos(2π·10·t) + 2·cos(2π·20·t) with F₀ = 10 Hz. What is X₂ (two-sided)?", "Only the 20 Hz part matches harmonic 2. Amplitude 2, phase 0 → X₂ = 2/2 = 1."),
  ]},
  {"id": "plot", "heading": "Drawing the spectrum", "blocks": [
    D("Magnitude spectrum", "A plot with a vertical line (a 'stem') at each harmonic frequency, as tall as that harmonic's amplitude Aₖ."),
    E("Lab 4's triangle wave, F₀ = 5 Hz", "Amplitudes: Aₖ = 8/(π²k²) for odd k, and 0 for even k.\n\n  k = 1 at  5 Hz: 8/π²      ≈ 0.81\n  k = 2 at 10 Hz: 0\n  k = 3 at 15 Hz: 8/(9π²)   ≈ 0.09\n  k = 5 at 25 Hz: 8/(25π²)  ≈ 0.03\n\nStems at 5, 15, 25, 35, 45 Hz, shrinking fast. Nothing at 10, 20, 30, 40.", slide="The triangle wave's spectrum"),
    TRI,
    P("**What the spectrum tells you about a voice:** the **spacing** of the stems is F₀ (the pitch). The **pattern of heights** is the timbre, which for speech means the vowel. Change the spacing and you change the pitch; change the heights and you change the vowel."),
    C("x(t) = 4·cos(2π·10·t − π/3). Draw the one-sided magnitude spectrum.", "One stem at 10 Hz, height 4. (Two-sided: stems at ±10 Hz, height 2 each.)"),
    WORDS([["F₀", "how often the whole wave repeats (the pitch)"], ["harmonic k", "the simple wave at k·F₀"], ["Aₖ, ϕₖ", "amplitude and starting angle of harmonic k"], ["aₖ, bₖ", "the cosine and sine parts of harmonic k"], ["Xₖ", "complex coefficient; |Xₖ| = Aₖ/2"], ["orthogonal", "different harmonics don't affect each other's measurement"], ["magnitude spectrum", "stems at each harmonic, as tall as its amplitude"]]),
  ]},
 ],
 "exercises": [
  EX("coefs-by-eye", "Coefficients by eye",
     "x(t) = 3 + 4·cos(2π·10·t) + 2·cos(2π·30·t + π/2). What is F₀? Give A₀, and the amplitude and phase of each harmonic. Then give X₁ and X₃.",
     ["F₀ is the biggest frequency that both 10 and 30 are whole multiples of.", "Read A and ϕ straight off each cosine; the constant is A₀.", "Xₖ = (Aₖ/2)·e^{jϕₖ}."],
     ["F₀ = 10 Hz (30 is the 3rd harmonic).", "A₀ = 3. Harmonic 1: A = 4, ϕ = 0. Harmonic 3: A = 2, ϕ = π/2. Harmonic 2: 0.", "X₁ = 2. X₃ = 1·e^{jπ/2} = j."],
     "This is Lab 4's block of questions, done without any calculus.", ref="coef"),
  EX("why-zero", "Why the detector ignores other harmonics",
     "In one or two sentences: why does multiplying by cos(2π·F₀·t) and averaging ignore a cos(2π·2F₀·t) part of the wave?",
     ["What does cos(F₀) × cos(2F₀) look like over one repeat?", "Is it more above the line or below?", "What's the average of something that's equally above and below?"],
     ["The product of two different harmonics goes up and down evenly over one repeat, so its average is zero. Only the matching harmonic (cos × cos of the same frequency) stays positive on average."],
     "The same 'multiply and average' trick runs Wi-Fi and 5G: each channel's detector ignores all the others.", ref="coef"),
 ],
}
from l124_extra import EXTRA
g["exercises"] += EXTRA["5"]
build(g)
