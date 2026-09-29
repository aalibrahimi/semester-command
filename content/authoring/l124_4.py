from gb import *
S = "ling124--4-complex-sinusoids"
ZFIG = old(S, "numbers.f5d409a9")

TAKE = [
 lines(["z = 1/2 + j·√3/2"], 0, "Lab 3 Q5–Q8. One complex number. Read it as directions on a map."),
 lines(["z = 1/2 + j·√3/2", "go right 1/2   (real part)", "go up √3/2 ≈ 0.87   (imaginary part)"], 1, "The number without j says how far right. The number with j says how far up. So z is the point (0.5, 0.87)."),
 lines(["distance from center = √(0.5² + 0.87²)", "= √(0.25 + 0.75) = √1 = 1"], 1, "Magnitude = distance from the center, by Pythagoras. It's exactly 1, so this point sits on the circle of radius 1."),
 lines(["direction: (0.5, 0.87) = (cos 60°, sin 60°)", "angle = 60° = π/3"], 1, "Angle = which direction the point is, measured counterclockwise from 'straight right'. (Q7: magnitude 1. Q8: angle 60°.)"),
 lines(["conjugate: z̄ = 1/2 − j·√3/2", "same distance 1, angle −60°"], 1, "The conjugate flips the up/down part. It's the mirror image below the horizontal line: same distance, opposite angle."),
]

SPIN = [
 lines(["e^{jθ}: the dot at angle θ"], 0, "Put the dot on the unit circle at angle θ."),
 lines(["e^{j·2π·F·t}", "the dot goes around F times per second, counterclockwise"], 1, "Let the angle grow with time (exactly like Chapter 0). Now it's a spinning dot: a complex sinusoid."),
 lines(["e^{−j·2π·F·t}", "same speed, clockwise"], 1, "Put a minus sign in front: it spins the other way. People call that a 'negative frequency'. It just means clockwise."),
 lines(["counterclockwise dot + clockwise dot", "up parts: +sin and −sin → cancel", "right parts: cos + cos = 2·cos"], 2, "Add the two dots together. Their up-down parts are always opposite, so they cancel. Their left-right parts are always equal, so they double."),
 lines(["e^{j2πFt} + e^{−j2πFt} = 2·cos(2πFt)", "so  cos(2πFt) = ( e^{j2πFt} + e^{−j2πFt} ) / 2"], 1, "Divide by 2: a normal cosine wave is the average of two dots spinning opposite ways. That's why a spectrum shows a cosine as TWO lines, at +F and −F, each half as tall."),
]

g = {
 "id": "ling124/4-complex-sinusoids",
 "course": "ling124",
 "lessons": "Day 4",
 "title": "Complex numbers and spinning dots",
 "summary": "Read a complex number as a point on a map; find its magnitude, angle and conjugate; translate r·e^{jθ} at the easy angles; explain why a cosine is two opposite spinners; read amplitude and phase off one complex number X.",
 "estimatedMinutes": 45,
 "sourceNote": "complex_sinusoids.pdf (Koo's note), the Day 4 slides, Lab 3 Q5–Q20. Rewritten in plain steps: one idea per card.",
 "requires": ["ling124/0-reading-a-wave"],
 "sections": [
  {"id": "why", "heading": "Why we need complex numbers at all", "blocks": [
    P("**You are on step 3 of the map:** splitting sounds into simple waves. To do that math cleanly, we need a way to write the spinning dot from Chapter 0 as **one** number.", why=True),
    P("The dot on the circle has two positions at once: how far **right** (that's cos) and how far **up** (that's sin). Normally that's two numbers. A **complex number** is just a way to pack two numbers into one, like writing a map location as one thing instead of 'x = 3, y = 4'.", slide="Two numbers packed as one"),
    P("That's the only reason complex numbers are in this course. Don't worry about 'the square root of −1'. For us, **j just means 'up'**."),
  ]},
  {"id": "numbers", "heading": "A complex number is a point on a map", "blocks": [
    D("Complex number", "Written **a + j·b**. Go **a** to the right and **b** up. Example: 3 + 4j is the point 3 right, 4 up."),
    D("Real part and imaginary part", "The **real part** is the number without j (right/left). The **imaginary part** is the number with j (up/down). In 3 + 4j: real part 3, imaginary part 4. 'Imaginary' is just an old name; nothing is imaginary about it."),
    ZFIG,
    D("Magnitude |z|", "How far the point is from the center. Use Pythagoras: **|a + jb| = √(a² + b²)**. It's like the 'amplitude' of the point."),
    E("Magnitude examples", "|3 + 4j| = √(9 + 16) = √25 = 5\n|1 + 1j| = √(1 + 1) = √2 ≈ 1.41\n|0 + 2j| = 2\n|−5| = 5", slide="Distance from the center"),
    D("Angle ∠z", "Which direction the point is in, measured counterclockwise from 'straight right'. Easy ones: straight right = 0, straight up = π/2 (90°), straight left = π (180°), straight down = −π/2 (−90°)."),
    D("Conjugate z̄", "Flip the sign of the j part: the conjugate of 3 + 4j is 3 − 4j. It's the mirror image below the horizontal line: same distance, opposite angle."),
    ST("Taking apart one number (Lab 3 Q5–Q8)", TAKE),
    C("What are the magnitude and conjugate of 6 − 8j?", "|6 − 8j| = √(36 + 64) = 10. Conjugate: 6 + 8j."),
    C("What angle does the number 2j have?", "π/2 (90°): it's straight up."),
    P("**A shortcut worth knowing:** z times its conjugate is the magnitude squared. (3 + 4j)(3 − 4j) = 9 + 16 = 25 = 5²."),
  ]},
  {"id": "euler", "heading": "The e^{jθ} notation: 'the point at angle θ'", "blocks": [
    D("e^{jθ}", "A short way to write **the point on the circle of radius 1 at angle θ**. That's all it means in this course. (The official name is Euler's formula: e^{jθ} = cos θ + j·sin θ, meaning 'right by cos θ, up by sin θ'.)"),
    T(["Write", "Angle", "Where the point is", "As a + jb"], [["e^{j0}", "0", "straight right", "1"], ["e^{jπ/2}", "90°", "straight up", "j"], ["e^{jπ}", "180°", "straight left", "−1"], ["e^{−jπ/2}", "−90°", "straight down", "−j"]], title="The four easy points", slide="e^{jθ} at the easy angles"),
    D("r · e^{jθ}", "The point at distance **r** from the center, in direction **θ**. Example: 3·e^{jπ/2} = 3 steps straight up = 3j."),
    E("Converting both ways", "3·e^{jπ/2}  →  3 up  →  3j\n2·e^{jπ}    →  2 left →  −2\n\n−2   →  distance 2, pointing left (angle π)  →  2·e^{jπ}\n5j   →  distance 5, pointing up (angle π/2)  →  5·e^{jπ/2}", slide="Converting"),
    C("Write 4·e^{jπ} as a plain number.", "−4. Distance 4, pointing straight left."),
  ]},
  {"id": "spinner", "heading": "Spinning dots, and why a cosine is two of them", "blocks": [
    D("Complex sinusoid", "The dot from Chapter 0, written as one complex number that moves: **e^{j·2π·F·t}** is a dot going around the circle F times per second."),
    ST("From one spinning dot to a cosine", SPIN),
    C("What do you get if you add e^{j2π·5·t} and e^{−j2π·5·t}?", "2·cos(2π·5·t): a real cosine at 5 Hz with amplitude 2. The up-down parts cancel."),
    TRAP("Thinking a 'negative frequency' is something weird. It only means the dot spins clockwise. Every real sound shows up at both +F and −F in a two-sided spectrum.", "Lab 3 Q11–Q16"),
  ]},
  {"id": "def", "heading": "One number that holds amplitude AND phase", "blocks": [
    P("Remember the three dials from Chapter 0: A (how tall), F (how fast), ϕ (where it starts). Here's the neat trick: **A and ϕ can be packed into one complex number**.", slide="Packing A and ϕ together"),
    D("Complex amplitude X (a 'phasor')", "**X = A · e^{jϕ}**: the point at distance A in direction ϕ. Its **magnitude** is the amplitude. Its **angle** is the phase. So one complex number tells you both how tall a wave is and where it starts."),
    E("Reading A and ϕ out of X", "X = 4·e^{jπ/2}      →  A = 4,   ϕ = π/2\nX = 2j              →  distance 2, pointing up  →  A = 2, ϕ = π/2\nX = 0.354 − 0.354j  →  |X| = √(0.125 + 0.125) = 0.5\n                        angle: right and down equally → −π/4", slide="A = |X|, ϕ = angle of X"),
    P("**Why this matters for every later lab:** a spectrum gives you one complex number X for each frequency. **|X| = how much of that frequency** (that's the magnitude spectrum). **The angle of X = its phase** (the phase spectrum)."),
    TRAP("In a two-sided spectrum a cosine of amplitude A appears as two lines of height **A/2** (at +F and −F). To get the real amplitude back, double it: A = 2·|X|.", "Lab 4 Q7, Q12"),
    C("A spectrum says X = 3j at some frequency (two-sided). What are the cosine's amplitude and phase?", "|X| = 3, so A = 2 × 3 = 6. The angle of 3j is π/2, so ϕ = π/2."),
    WORDS([["complex number a + jb", "a point: a right, b up"], ["j", "means 'up' (the vertical direction)"], ["magnitude |z|", "distance from the center: √(a² + b²)"], ["angle ∠z", "direction, counterclockwise from right"], ["conjugate z̄", "mirror image: flip the sign of the j part"], ["e^{jθ}", "the point at angle θ on the circle of radius 1"], ["complex sinusoid", "a dot spinning around the circle"], ["phasor X = A·e^{jϕ}", "one number holding amplitude and phase"]]),
  ]},
 ],
 "exercises": [
  EX("three-forms", "One point, three ways",
     "z = −3 + 3j. Find |z|, its angle, write it as r·e^{jθ}, and write its conjugate.",
     ["Plot it: 3 left, 3 up.", "Distance: √(9 + 9). Direction: halfway between straight up (π/2) and straight left (π).", "Conjugate: flip the sign of the j part."],
     ["|z| = √18 = 3√2 ≈ 4.24.", "Angle = 3π/4 (135°).", "z = 3√2 · e^{j3π/4}.", "z̄ = −3 − 3j."],
     "Every coefficient numpy gives you in a Fourier lab is a complex number like this; reading it is half the lab.", ref="numbers"),
  EX("spinner", "Why a cosine is two spinners",
     "Explain in two sentences why e^{j2πFt} + e^{−j2πFt} is a real cosine, then say what that means for the spectrum of a 100 Hz cosine.",
     ["One dot spins counterclockwise, the other clockwise, at the same speed.", "What happens to their up-down positions? Their left-right positions?", "So how many lines does the spectrum show, and where?"],
     ["The up-down parts are always opposite and cancel; the left-right parts are always equal and add up to 2·cos(2πFt).", "So a 100 Hz cosine shows up in a two-sided spectrum as two lines, at +100 Hz and −100 Hz, each half the cosine's amplitude."],
     "This is the reason every FFT output has a mirror image, and why you double |X| to get the real amplitude.", ref="spinner"),
 ],
}
from l124_extra import EXTRA
g["exercises"] += EXTRA["4"]
build(g)
