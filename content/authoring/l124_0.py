from gb import *
from steps_svg import figures as _figs
STEP_FIGS = _figs()
S = "ling124--0-reading-a-wave"
CIRCLE_FIG = old(S, "circle.ef727240")
SPEC_FIG = old(S, "spectrum.af5da914")

BUILD = [
 lines(["cos(θ)"], 0, "Start with the plain wave shape. θ (the Greek letter theta) is just an angle: how far the dot has gone around the circle. cos(θ) goes 1, 0, −1, 0, 1 as θ goes once around."),
 lines(["cos(θ)", "cos(2π · F · t)"], 1, "Make it move in time. F is how many laps the dot makes per second, and one lap is 2π. So after t seconds the angle is 2π·F·t. Example: F = 2 laps per second, after t = 1 second the dot has gone 2 laps = 4π."),
 lines(["cos(2π · F · t)", "A · cos(2π · F · t)"], 1, "Make it taller or shorter. cos only goes from −1 to 1. Multiply by A and it goes from −A to A. A is the amplitude."),
 lines(["A · cos(2π · F · t)", "A · cos(2π · F · t + ϕ)"], 1, "Give it a head start. ϕ (the Greek letter phi, say 'fye') is the angle the dot starts at when t = 0. ϕ = 0 means it starts at the top of the wave."),
 lines(["A · cos(2π · F · t + ϕ)", "A = how tall   F = how fast   ϕ = where it starts   t = the clock"], 1, "That's the whole formula. Three dials (A, F, ϕ) and a clock (t). Every sinusoid in this course is this formula with different numbers."),
]

READ = [
 lines(["x(t) = 2 · cos(2π · 100 · t + π/3)"], 0, "Lab 3's formula. Find the three dials."),
 lines(["x(t) = 2 · cos(2π · 100 · t + π/3)", "A = 2"], 1, "The number in front: amplitude 2. The wave swings between −2 and +2."),
 lines(["x(t) = 2 · cos(2π · 100 · t + π/3)", "F = 100 Hz"], 1, "The number right before t (after the 2π): 100 laps per second, so 100 Hz. The 2π is NOT part of the frequency."),
 lines(["x(t) = 2 · cos(2π · 100 · t + π/3)", "ϕ = π/3"], 1, "The number added at the end: the starting angle, π/3 (that's 60°)."),
 lines(["A = 2,  F = 100 Hz,  ϕ = π/3", "period T = 1/100 = 0.01 s = 10 ms"], 1, "Bonus: once you have F you have the period, T = 1/F."),
]

g = {
 "id": "ling124/0-reading-a-wave",
 "course": "ling124",
 "lessons": "Chapter 0 · Days 2–3",
 "title": "What a sound wave is, and how to read its formula",
 "summary": "Say what a waveform shows; find period, frequency and amplitude on a plot; read A, F and ϕ off A·cos(2πFt + ϕ); change one number and predict the new plot; know what a spectrum is.",
 "estimatedMinutes": 45,
 "sourceNote": "basic_acoustics.pdf (Day 2), sinusoids_review.pdf and basic_sinusoids.pdf (Day 3), Lab 1, Lab 3 Q1–Q4. Rewritten in plain steps: one idea per card.",
 "requires": [],
 "sections": [
  {"id": "map", "heading": "The whole course on one page", "blocks": [
    P("**Read this first.** LING 124 is about one question: *how does a computer turn a recording of speech into text?* Every day of the course is one step of that trip. If you know which step you're on, the math has a reason.", slide="The one question", why=True),
    T(["Step", "What happens", "Chapter"], [
      ["1", "Sound is air pressure going up and down. We draw it as a wave.", "this one (0)"],
      ["2", "The computer measures that wave thousands of times a second and stores the numbers.", "3: Sampling"],
      ["3", "Any sound can be split into simple waves added together.", "4 and 5: Complex numbers, Fourier series"],
      ["4", "We cut the recording into tiny slices and find the simple waves in each slice.", "6: DFT and STFT"],
      ["5", "From each slice we measure pitch and a short list of numbers that describe the sound.", "9 and 11: Pitch, Features"],
      ["6", "A model reads those numbers and guesses the words.", "9: ASR overview"],
    ], title="Speech to text, in six steps", slide="Six steps from sound to text"),
    P("You don't need to understand all six now. Just come back to this table whenever you feel lost and find the row you're on. Here is each step as a picture (hover any part of a picture for a one-line explanation):"),
    *[FIG(svg, "0 0 680 270", f"Step {n}: {title}. {cap}", slide=f"Step {n}: {title}") for (n, title, svg, cap) in STEP_FIGS],
  ]},
  {"id": "why", "heading": "What a sound is", "blocks": [
    D("Sound wave", "Air pressure going up and down, very fast. When you talk, your vocal folds push air in little puffs; the pressure rises and falls, and that ripple travels to someone's ear."),
    P("**Picture it.** Drop a stone in a pond: the water goes up and down, and the ripple moves outward. Sound is the same thing, but in air, and far too fast to see.", slide="Like ripples in a pond"),
    D("Waveform", "A graph of that pressure over time. Left to right is **time**. Up and down is **pressure** (how much the air is squeezed or stretched). Every recording you open in Audacity or Praat is a waveform."),
    C("On a waveform, what does the horizontal axis show, and what does the vertical axis show?", "Horizontal: time. Vertical: pressure (amplitude)."),
  ]},
  {"id": "vocab", "heading": "Three numbers that describe a wave", "blocks": [
    P("A simple wave repeats the same shape over and over. You only need three numbers to describe it. Learn them one at a time.", slide="Three numbers"),
    D("Period (T)", "How long **one** repeat takes, in seconds. If the wave repeats every 0.01 seconds, T = 0.01 s (that's 10 milliseconds)."),
    D("Frequency (F)", "How many repeats happen **in one second**. Measured in **Hertz (Hz)**. 100 Hz = 100 repeats per second."),
    E("Period and frequency are flips of each other", "If one repeat takes 0.01 s, how many fit in 1 second?\n  1 ÷ 0.01 = 100 repeats → F = 100 Hz\n\nSo:  F = 1 / T   and   T = 1 / F\n\n  T = 0.5 s   →  F = 2 Hz\n  T = 0.002 s →  F = 500 Hz\n  F = 200 Hz  →  T = 1/200 = 0.005 s = 5 ms", slide="F = 1/T"),
    C("A wave has F = 250 Hz. What is its period in milliseconds?", "T = 1/250 = 0.004 s = 4 ms."),
    D("Amplitude (A)", "How far the wave goes up from the middle line. A bigger amplitude means more pressure change, which sounds louder. If the wave goes up to 3 and down to −3, the amplitude is 3."),
    D("Periodic vs aperiodic", "**Periodic** = repeats the same shape (vowels like *aa*, a tuning fork, a hum). **Aperiodic** = no repeating shape (*s*, *sh*, static)."),
    C("Is the sound 'sss' periodic or aperiodic?", "Aperiodic: it's a hiss with no repeating shape."),
    P("**Loudness in decibels (dB).** Our ears don't hear loudness in a straight line: doubling the pressure does not sound twice as loud. So we use a scale that counts **how many times bigger**, called decibels. You only need two facts:", slide="Decibels: the two facts"),
    T(["Amplitude becomes…", "Change in dB"], [["the same", "0 dB"], ["2 times bigger", "+6 dB"], ["10 times bigger", "+20 dB"], ["100 times bigger", "+40 dB"], ["half as big", "−6 dB"]], title="Amplitude ratio → dB"),
    E("The formula (only if you need it)", "dB = 20 · log₁₀(new amplitude ÷ old amplitude)\n\nExample: amplitude goes from 0.3 to 0.6.\n  ratio = 0.6 ÷ 0.3 = 2\n  20 · log₁₀(2) = 20 · 0.301 ≈ 6 dB louder"),
    C("Sound B's amplitude is 10 times sound A's. How many dB louder is B?", "+20 dB (20 · log₁₀(10) = 20 · 1 = 20)."),
  ]},
  {"id": "circle", "heading": "Where the wave shape comes from: a dot going around a circle", "blocks": [
    P("**Picture it.** Imagine a dot going around a circle, like the tip of a clock hand going the wrong way. Now watch only its **left-right position**. It slides right, back to the middle, left, back to the middle, right again… Plot that position over time and you get the wave shape. That shape is called a **cosine**.", slide="A dot on a circle"),
    CIRCLE_FIG,
    D("cos (cosine)", "The dot's **left-right** position. It starts at 1 (far right), goes to 0, −1, 0, and back to 1 after one full lap."),
    D("sin (sine)", "The dot's **up-down** position. Same shape as cosine, just a quarter lap later."),
    D("Radians", "A way to measure angles. One full lap is **2π radians** (about 6.28). Half a lap is π. A quarter lap is π/2."),
    T(["Degrees", "Radians", "Where the dot is", "cos"], [["0°", "0", "far right", "1"], ["90°", "π/2", "top", "0"], ["180°", "π", "far left", "−1"], ["270°", "3π/2", "bottom", "0"], ["360°", "2π", "far right again", "1"]], title="One lap in radians", slide="One lap = 2π"),
    P("**Why this matters:** after a full lap (2π), the dot is back where it started. So adding 2π to the angle changes nothing. That fact answers a lot of lab questions (Lab 3 Q3)."),
    C("What is cos(π)? Picture the dot.", "−1. At π (half a lap) the dot is on the far left."),
  ]},
  {"id": "formula", "heading": "The wave formula, one piece at a time", "blocks": [
    P("Every simple wave in this course is written like this: **A · cos(2π · F · t + ϕ)**. It looks scary, but it is just the dot on the circle with three dials. Let's build it one piece at a time.", slide="Building the formula"),
    ST("Building A·cos(2πFt + ϕ) from nothing", BUILD),
    T(["Symbol", "Name", "Changes"], [["A", "amplitude", "how tall the wave is"], ["F", "frequency (Hz)", "how many repeats per second"], ["ϕ (phi)", "starting angle (phase)", "where in its cycle the wave starts"], ["t", "time (seconds)", "the clock; not a dial"]], title="The three dials", slide="A, F, ϕ"),
    ST("Reading a real formula (Lab 3 Q1)", READ),
    TRAP("Saying the frequency is 2π·100 = 628. The 2π is just there because one lap is 2π. The frequency is the number right before t: **100 Hz**.", "Lab 3 Q1"),
    E("Turn one dial at a time", "Start:  3·cos(2π·5·t)\n\nChange A: 10·cos(2π·5·t)       → same wave, taller (±10 instead of ±3)\nChange F: 3·cos(2π·10·t)       → twice as many repeats, squished sideways\nAdd ϕ = π: 3·cos(2π·5·t + π)   → flipped: starts at the bottom instead of the top", slide="One dial at a time"),
    C("Write a wave with amplitude 0.5 and frequency 440 Hz that starts at the top.", "0.5 · cos(2π · 440 · t). Starting at the top means ϕ = 0."),
    C("Write the same wave but starting at the bottom.", "0.5 · cos(2π · 440 · t + π). Half a lap (π) head start puts the dot on the far left, so the wave starts at its lowest point."),
    P("**Lab 3 Q3 tip:** two formulas are the same wave if their starting angles differ by a whole number of laps (±2π, ±4π…). Example: ϕ = π/3 and ϕ = π/3 − 2π = −5π/3 are the same starting point."),
  ]},
  {"id": "spectrum", "heading": "A spectrum: the recipe of a sound", "blocks": [
    P("**The big idea.** Real sounds (like a vowel) are not one simple wave. They are **many simple waves added together**. A **spectrum** is the recipe: which simple waves are in the sound, and how much of each.", slide="A sound is a recipe"),
    P("**Picture it.** A smoothie tastes like one thing, but it's made of ingredients: some banana, a lot of strawberry, a little milk. A spectrum is the ingredient list for a sound."),
    T(["Plot", "Left to right", "Up and down", "What it tells you"], [
      ["Waveform", "time", "pressure", "the sound itself, over time"],
      ["Spectrum", "frequency", "amplitude", "which frequencies are in it, and how strong (one moment)"],
      ["Spectrogram", "time", "frequency (darkness = strength)", "how the spectrum changes over time"],
    ], title="Three plots you'll see all semester", slide="Waveform, spectrum, spectrogram"),
    D("Harmonics", "The simple waves that make up a vowel sit at evenly spaced frequencies: F₀, 2·F₀, 3·F₀… F₀ (say 'F-zero') is the lowest one, and it's the **pitch** of the voice."),
    D("Formants", "The big bumps in a vowel's spectrum. They come from the shape of your mouth, and they're what make *ee* sound different from *aa*."),
    SPEC_FIG,
    C("You see a plot with time left to right, frequency bottom to top, and dark bands. What is it?", "A spectrogram. The dark bands are formants."),
    WORDS([["waveform", "graph of pressure over time"], ["period T", "time for one repeat (seconds)"], ["frequency F", "repeats per second (Hz); F = 1/T"], ["amplitude A", "how tall the wave is"], ["phase ϕ", "where the wave starts in its cycle"], ["radian", "angle unit; one lap = 2π"], ["dB", "loudness scale; ×2 amplitude = +6 dB"], ["spectrum", "recipe: which frequencies, how strong"], ["harmonics", "the evenly spaced waves in a vowel; the lowest is F₀ (pitch)"], ["formants", "the bumps from the mouth shape; tell vowels apart"]]),
  ]},
 ],
 "exercises": [
  EX("read-formula", "Read the formula out loud",
     "x(t) = 0.5 · cos(2π · 200 · t − π/2). What are A, F (in Hz), the period in ms, and ϕ?",
     ["The number in front is A.", "The number right before t is F. Then T = 1/F.", "The number added at the end is ϕ."],
     ["A = 0.5.", "F = 200 Hz, so T = 1/200 = 0.005 s = 5 ms.", "ϕ = −π/2 (a quarter lap back)."],
     "Every lab question about a wave starts with reading these three numbers correctly.", ref="formula"),
  EX("db", "Decibels without a calculator",
     "Sound A has amplitude 10 times sound B. Sound C has amplitude 100 times B. How many dB is A above B? C above B?",
     ["×10 in amplitude is one of the two facts to memorize.", "×100 = ×10 then ×10 again. Each ×10 adds 20 dB.", "So add 20 twice."],
     ["A is +20 dB above B.", "C is +40 dB above B."],
     "Decibels show up on every audio meter and in every spectrum plot's y-axis.", ref="vocab"),
 ],
}
from l124_extra import EXTRA
g["exercises"] += EXTRA["0"]
build(g)
