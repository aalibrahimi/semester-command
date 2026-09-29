import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from gb import *

g = {
    "id": "ling124/p2-python-fft-spectra",
    "course": "ling124",
    "lessons": "Python for the labs · Part 2",
    "title": "Python for the labs, part 2: complex numbers, the FFT, and spectra",
    "summary": "Run the code behind Labs 3, 5 and 6 yourself: complex numbers with 1j, np.abs and np.angle; turn fft() output into a table of frequencies and amplitudes; draw an amplitude spectrum with stem; find the loudest frequency; convert to decibels; taper a frame with a Hamming window.",
    "estimatedMinutes": 60,
    "sourceNote": "Built from the code in LING 124 Lab 3 (show_vector, complex_sinusoid), Lab 5 (sum_cos, fft, fftfreq, fftshift, rfft, the phase clean-up), Lab 6 (frames, Hamming window) and Lab 1 (10·log10 spectrograms). Every code cell runs in the app.",
    "requires": ["ling124/p1-python-waves-plots"],
    "sections": [],
    "exercises": [],
}
S = g["sections"]

SUMCOS = r'''
import numpy as np
def sum_cos(A, F, phi, dur, Fs):
    t = np.arange(int(dur * Fs)) / Fs
    x = sum([A[i] * np.cos(2 * np.pi * F[i] * t + phi[i]) for i in range(len(F))])
    return t, x
# Lab 5's wave: 5 + 4cos(2π10t + π/2) + 3cos(2π20t − π) + 2cos(2π30t) − cos(2π40t − π/2)
t, x = sum_cos([5, 4, 3, 2, -1], [0, 10, 20, 30, 40], [0, np.pi/2, -np.pi, 0, -np.pi/2], 0.5, 100)
fs = 100
'''

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "complex", "heading": "Complex numbers in numpy", "blocks": [
    D("1j", "Python's name for the imaginary unit j (the square root of −1). `3 + 4j` is the complex number 3 + j4. The `j` must touch a number: write `1j`, never just `j`.", slide=True),
    T(["Code", "Gives", "Lab 3 word"], [
        ["`z.real`", "the real part (x coordinate)", "real part"],
        ["`z.imag`", "the imaginary part (y coordinate)", "imaginary part"],
        ["`np.abs(z)`", "the length of the arrow", "magnitude"],
        ["`np.angle(z)`", "the angle of the arrow, in radians", "angle / argument / phase"],
        ["`np.degrees(a)`", "radians to degrees", ""],
        ["`np.conj(z)`", "the mirror image across the real axis", "complex conjugate"],
        ["`A * np.exp(1j * phi)`", "the arrow of length A at angle ϕ", "phasor / complex amplitude"],
    ], title="The complex-number toolkit", slide="The complex-number toolkit"),
    PY("Try it: Lab 3's arrow",
       "Run it. The printout is exactly what Lab 3's `show_vector(..., display_info=True)` prints. Change `z` and run again.",
       r'''
import numpy as np

z = 1/2 + 1j * np.sqrt(3) / 2

print("real:", z.real, " imaginary:", round(z.imag, 3))
print("magnitude:", round(np.abs(z), 3))
print("angle:", round(np.angle(z), 3), "radians =", round(np.degrees(np.angle(z)), 1), "degrees")
'''),
    PY("Your turn: magnitude and angle",
       "For **z = −3 + 3j**, store its magnitude in `mag` and its angle **in degrees** in `deg`.",
       r'''
import numpy as np

z = -3 + 3j
mag = None
deg = None

print(mag, deg)
''',
       check=r'''
import numpy as np
assert mag is not None and deg is not None, "Replace both `None`s."
assert abs(mag - np.sqrt(18)) < 1e-9, f"The magnitude is √(3² + 3²) ≈ 4.243. Yours is {mag}. Use `np.abs(z)`."
assert abs(deg - 135) < 1e-6, f"The arrow points up and to the left, so the angle is 135°. Yours is {deg}. Use `np.degrees(np.angle(z))`."
''',
       solution=r'''
import numpy as np

z = -3 + 3j
mag = np.abs(z)
deg = np.degrees(np.angle(z))

print(mag, deg)
''',
       hints=["`np.abs(z)` is the length.", "`np.angle(z)` gives radians; wrap it in `np.degrees(...)`."],
       success="−3 + 3j sits in the upper-left quarter, so 135°. `np.angle` always picks the right quarter; doing arctan(3/−3) by hand gives −45°, the classic mistake."),
    PY("Your turn: build a phasor",
       "Make the phasor with **magnitude 2** and **angle π/2** using `A * np.exp(1j * phi)`. What does it equal? Store it in `z`.",
       r'''
import numpy as np

A = 2
phi = np.pi / 2
z = None

print(np.round(z, 3))
''',
       check=r'''
import numpy as np
assert z is not None, "Replace `None` with `A * np.exp(1j * phi)`."
assert abs(z - 2j) < 1e-9, f"2·e^(jπ/2) is 2j (straight up, length 2). Yours is {np.round(z, 3)}."
''',
       solution=r'''
import numpy as np

A = 2
phi = np.pi / 2
z = A * np.exp(1j * phi)

print(np.round(z, 3))
''',
       hints=["Euler: e^(jϕ) = cos ϕ + j sin ϕ.", "`z = A * np.exp(1j * phi)`."],
       success="The printout says `2j` (maybe with a tiny `1e-16` real part, which is rounding noise). That's Lab 3 Q20 and Lab 4 Q7 in one line."),
    TRAP("`np.round(z, 3)` prints `(0+2j)`, but without rounding you'll see `1.2246e-16+2j`. That `e-16` means 0.00000000000000012: zero with computer rounding noise. Lab 5 Q2 asks you to read numbers like this.", "Lab 5 Q2", None),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "fft", "heading": "The FFT: from a wave to its list of ingredients", "blocks": [
    D("FFT", "`np.fft.fft(x)` takes N samples and returns **N complex numbers**, one per frequency bin. Each one says how much of that frequency is in the wave (its magnitude) and where its cycle starts (its angle).", slide=True),
    D("frequency of bin k", "Bin k is the frequency **k × fs / N**. The step between bins, **ΔF = fs / N**. Bins past the middle are the negative frequencies (`X[-5]` is −5 × ΔF).", slide=True),
    T(["Question", "Code"], [
        ["How many bins?", "`N = len(x)`"],
        ["Frequency of every bin", "`freqs = np.fft.fftfreq(N, 1/fs)`"],
        ["How much of each frequency", "`np.abs(X)`"],
        ["Cosine amplitude at a frequency above 0", "`2 * np.abs(X[k]) / N`"],
        ["Amplitude at 0 Hz (the average)", "`np.abs(X[0]) / N`"],
        ["Phase of a component", "`np.angle(X[k])`"],
        ["Put negative frequencies on the left for plotting", "`np.fft.fftshift(...)`"],
        ["Positive frequencies only", "`np.fft.rfft(x)` with `np.fft.rfftfreq(N, 1/fs)`"],
    ], title="The Lab 5 toolkit", slide="The Lab 5 toolkit"),
    E("Lab 5's numbers", "0.5 s at fs = 100 Hz  ->  N = 50 samples\nΔF = fs / N = 100 / 50 = 2 Hz\nX[5]  is  5 × 2 = 10 Hz,  X[-5]  is  -10 Hz\n|X[5]| = 100  ->  amplitude = 2 × 100 / 50 = 4",
      answer="The formula's 10 Hz term was 4cos(...), so 4 is right."),
    P("Why `2 × |X| / N`? The FFT adds up N samples, so divide by N. And a real cosine splits its amplitude in half between +F and −F, so multiply by 2. Those are Lab 5's \"complications\" (1) to (3).", why=True),
    PY("Try it: Lab 5's table",
       "Run it: this turns the FFT's complex numbers into the table of component cosines from Lab 5's formula. The wave `x` (and `fs`) were made for you with Lab 5's `sum_cos`.",
       r'''
import numpy as np

X = np.fft.fft(x)
N = len(x)
freqs = np.fft.fftfreq(N, 1/fs)

for k in range(N // 2):
    amp = np.abs(X[k]) / N if k == 0 else 2 * np.abs(X[k]) / N
    if amp > 1e-6:
        print(f"{freqs[k]:5.0f} Hz   amplitude {amp:.2f}   phase {np.angle(X[k]):+.2f} rad")
''',
       setup=SUMCOS),
    PY("Your turn: read one amplitude",
       "Find the **amplitude of the 30 Hz** component of Lab 5's wave `x`. Compute `X`, find which bin `k30` is 30 Hz, and store the amplitude in `amp30`.",
       r'''
import numpy as np

X = np.fft.fft(x)
N = len(x)

k30 = None     # which bin is 30 Hz?  (ΔF = fs / N)
amp30 = None   # the cosine amplitude there

print(k30, amp30)
''',
       setup=SUMCOS,
       check=r'''
import numpy as np
assert k30 is not None and amp30 is not None, "Replace both `None`s."
assert int(k30) == 15, f"ΔF = 100/50 = 2 Hz, so 30 Hz is bin 30/2 = 15. You have {k30}."
assert abs(amp30 - 2) < 1e-6, f"The formula's 30 Hz term is 2cos(2π30t), so the amplitude is 2. Yours is {amp30}. Did you use 2 * np.abs(X[k30]) / N?"
''',
       solution=r'''
import numpy as np

X = np.fft.fft(x)
N = len(x)

k30 = int(30 / (fs / N))
amp30 = 2 * np.abs(X[k30]) / N

print(k30, amp30)
''',
       hints=["Bin number = frequency / ΔF, and ΔF = fs / N = 100 / 50.", "Amplitude = `2 * np.abs(X[k30]) / N`."],
       success="Frequency ÷ ΔF gives the bin, 2|X|/N gives the amplitude. That pair of steps answers most Lab 5 questions."),
    PY("Your turn: plot the amplitude spectrum",
       "Draw Lab 5's **amplitude spectrum** for positive frequencies only: use `np.fft.rfft` and `np.fft.rfftfreq`, and `ax.stem` (sticks, like the lab). Label the x-axis **frequency (Hz)** and the y-axis **amplitude**. Use real amplitudes: `2 * |X| / N`.",
       r'''
import numpy as np
import matplotlib.pyplot as plt

N = len(x)
Xr = None       # rfft of x
f = None        # the frequency of each value in Xr
amps = None     # 2 * |Xr| / N

fig, ax = plt.subplots(figsize=(10, 3))
# stem plot and labels here

plt.show()
''',
       setup=SUMCOS,
       check=r'''
import _sc, numpy as np
assert Xr is not None and f is not None and amps is not None, "Fill in `Xr`, `f` and `amps` first."
assert len(f) == 26, f"rfft of 50 samples gives 26 bins (0 to 50 Hz in steps of 2). Your `f` has {len(f)}. Use `np.fft.rfftfreq(N, 1/fs)`."
assert abs(amps[5] - 4) < 1e-6 and abs(amps[20] - 1) < 1e-6, "Check `amps`: at 10 Hz it should be 4, at 40 Hz it should be 1. It's `2 * np.abs(Xr) / N`."
a = _sc.last().axes[0]
assert a.containers, "Draw it with `ax.stem(f, amps)`."
assert "freq" in a.get_xlabel().lower(), "Label the x-axis 'frequency (Hz)'."
assert "amp" in a.get_ylabel().lower(), "Label the y-axis 'amplitude'."
''',
       solution=r'''
import numpy as np
import matplotlib.pyplot as plt

N = len(x)
Xr = np.fft.rfft(x)
f = np.fft.rfftfreq(N, 1/fs)
amps = 2 * np.abs(Xr) / N

fig, ax = plt.subplots(figsize=(10, 3))
ax.stem(f, amps, basefmt='')
ax.set_xlabel('frequency (Hz)')
ax.set_ylabel('amplitude')

plt.show()
''',
       hints=["`Xr = np.fft.rfft(x)` and `f = np.fft.rfftfreq(N, 1/fs)`.", "`ax.stem(f, amps)`, then the two `set_..label` lines."],
       success="Sticks at 10, 20, 30, 40 Hz with heights 4, 3, 2, 1. The 0 Hz stick shows 10, not 5: the ×2 is only for frequencies above 0, which is Lab 5's first complication in a picture."),
    PY("Your turn: find the loudest frequency",
       "The in-class vowel activity asks \"where is the biggest peak?\". `y` is a mystery wave sampled at `fs = 8000` for 0.5 s. Find the frequency with the **largest amplitude** and store it in `peak_hz`. Use `np.argmax`, which gives the position of the biggest value.",
       r'''
import numpy as np

N = len(y)
amps = 2 * np.abs(np.fft.rfft(y)) / N
f = np.fft.rfftfreq(N, 1/fs)

peak_hz = None

print(peak_hz)
''',
       setup=r'''
import numpy as np
fs = 8000
_t = np.arange(int(0.5 * fs)) / fs
y = 0.6 * np.cos(2 * np.pi * 250 * _t) + 1.4 * np.cos(2 * np.pi * 730 * _t + 1) + 0.9 * np.cos(2 * np.pi * 1090 * _t)
''',
       check=r'''
assert peak_hz is not None, "Replace `None`."
assert abs(peak_hz - 730) < 1e-6, f"The biggest component is at 730 Hz. You have {peak_hz}. `np.argmax(amps)` gives a bin number; look it up in `f`."
''',
       solution=r'''
import numpy as np

N = len(y)
amps = 2 * np.abs(np.fft.rfft(y)) / N
f = np.fft.rfftfreq(N, 1/fs)

peak_hz = f[np.argmax(amps)]

print(peak_hz)
''',
       hints=["`np.argmax(amps)` is the bin with the most energy.", "Turn that bin into Hz by indexing the frequency list: `f[np.argmax(amps)]`."],
       success="`f[np.argmax(amps)]` is how you'd find the first formant peak or the F0 of a vowel in code."),
    TRAP("Reading the raw magnitude off an FFT plot as the amplitude is the Lab 5 Q5/Q6 trap: |X| at 10 Hz is 100, but the cosine's amplitude is 4. Divide by N, then double (except at 0 Hz).", "Lab 5 Q5 to Q7", None),
    TRAP("The phase spectrum shows junk angles at bins with zero magnitude. Lab 5 zeroes them: `phase * (np.round(np.abs(X), 5) != 0)`. Ignore the phase wherever the magnitude is ~0.", "Lab 5 Q11", None),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "db", "heading": "Decibels: squeezing big and small onto one scale", "blocks": [
    D("decibels (dB)", "A log scale for loudness: **20 · log10(amplitude)**, or **10 · log10(power)** (power is amplitude squared, so it's the same thing). Every ×2 in amplitude adds about **6 dB**; every ×10 adds **20 dB**.", slide=True),
    P("Speech spectra have peaks thousands of times bigger than the quiet parts. On a plain scale the quiet parts look like zero; in dB you can see them. That's why Lab 1's spectrograms use `10 * np.log10(mag_spec)`.", why=True),
    PY("Your turn: amplitudes to dB",
       "Convert the amplitudes `[1, 2, 10, 0.5]` to decibels with 20·log10 and store them in `db`.",
       r'''
import numpy as np

amps = np.array([1, 2, 10, 0.5])
db = None

print(np.round(db, 2))
''',
       check=r'''
import numpy as np
assert db is not None, "Replace `None` with `20 * np.log10(amps)`."
assert np.allclose(db, [0, 6.0206, 20, -6.0206], atol=1e-3), f"Expected [0, 6.02, 20, -6.02]. Yours is {np.round(db, 2)}. Is it 20 (not 10) times np.log10?"
''',
       solution=r'''
import numpy as np

amps = np.array([1, 2, 10, 0.5])
db = 20 * np.log10(amps)

print(np.round(db, 2))
''',
       hints=["numpy's base-10 log is `np.log10`.", "`20 * np.log10(amps)` works on the whole array."],
       success="1 → 0 dB, ×2 → +6, ×10 → +20, half → −6. Halving is a negative number of dB, not a smaller positive one."),
    TRAP("`np.log10(0)` is minus infinity (with a warning). Spectra often contain exact zeros, so code adds a tiny number first: `20 * np.log10(amps + 1e-12)`.", "Labs 1 and 6", None),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "window", "heading": "Frames and windows (Lab 6)", "blocks": [
    D("frame", "A short slice of the signal (like 0.05 s) that you analyze on its own. Speech changes every few milliseconds, so ASR looks at one frame at a time.", slide=True),
    D("window (taper)", "An array of weights the same length as the frame that fades both ends toward 0. Multiplying `frame * w` removes the sudden cut at the edges, which cuts down spectral leakage.", slide=True),
    E("Lab 6", "from scipy import signal\nw = signal.windows.hamming(len(frame))\nframe_w = w * frame",
      answer="Same length, multiplied sample by sample."),
    PY("Your turn: count frames, then taper one",
       "`x` is 0.2 s at `fs = 16000` (Lab 6's 200 + 730 Hz signal). With **frame size 0.05 s** and **shift 0.025 s**, how many whole frames fit? Store it in `n_frames`. Then take the first frame, apply a **Hamming window**, and store it in `frame_w`.",
       r'''
import numpy as np
from scipy import signal

size = int(0.05 * fs)
shift = int(0.025 * fs)

n_frames = None
frame = x[0:size]
frame_w = None

print(n_frames, len(frame_w))
''',
       setup=r'''
import numpy as np
fs = 16000
_t = np.arange(int(0.2 * fs)) / fs
x = np.cos(2 * np.pi * 200 * _t) + np.cos(2 * np.pi * 730 * _t)
''',
       check=r'''
import numpy as np
from scipy import signal
assert n_frames is not None and frame_w is not None, "Replace both `None`s."
assert int(n_frames) == 7, f"Frames start at 0, 0.025, ..., 0.15 s (the last one ends at 0.2): 7 frames. You have {n_frames}. Count: 1 + (length − size) // shift."
assert len(frame_w) == len(frame), "`frame_w` should be the same length as `frame`."
assert np.allclose(frame_w, signal.windows.hamming(len(frame)) * frame), "Multiply the frame by `signal.windows.hamming(len(frame))`."
''',
       solution=r'''
import numpy as np
from scipy import signal

size = int(0.05 * fs)
shift = int(0.025 * fs)

n_frames = 1 + (len(x) - size) // shift
frame = x[0:size]
frame_w = signal.windows.hamming(len(frame)) * frame

print(n_frames, len(frame_w))
''',
       hints=["The first frame starts at 0; each next one starts `shift` later; stop when the frame would run past the end.", "`n_frames = 1 + (len(x) - size) // shift`, and `frame_w = signal.windows.hamming(len(frame)) * frame`."],
       success="7 frames is Lab 6 Q7. `//` is whole-number division: it drops the leftover that can't fill a frame."),
]})

# ─────────────────────────────────────────────────────────────────────────────
S.append({"id": "debug", "heading": "Fix the broken cell", "blocks": [
    P("Reading an error is a skill. The last line names the problem; the line above tells you where. This cell has **three** bugs, the three most common in the labs. Run it, read the error, fix one bug, run again."),
    PY("Your turn: three bugs",
       "Fix the code so it makes a **50 Hz** wave with amplitude **2** over **0.1 s** at `fs = 1000`, then prints its peak. Don't retype everything: fix the three bugs.",
       r'''
import numpy as np

fs = 1000
t = np.arange(0.1 * fs) / fs
x = 2 * cos(2 * np.pi * 50 * t)
peak = x.max()
print("peak:", peak ^ 1)
''',
       check=r'''
import numpy as np
assert len(t) == 100, "`t` should have 100 samples."
assert np.allclose(x, 2 * np.cos(2 * np.pi * 50 * np.arange(100) / 1000)), "`x` should be the 50 Hz wave with amplitude 2."
assert abs(peak - 2) < 1e-9, "`peak` should be 2."
''',
       solution=r'''
import numpy as np

fs = 1000
t = np.arange(int(0.1 * fs)) / fs
x = 2 * np.cos(2 * np.pi * 50 * t)
peak = x.max()
print("peak:", peak ** 1)
''',
       hints=["First error: `cos` isn't known. It lives in numpy.", "Second: `peak ^ 1` fails on a decimal number. Powers are `**`.", "Third, a sneaky one: wrap the sample count in `int(...)` so `np.arange` gets a whole number (it happens to work here, but won't for 0.3 × 16000)."],
       success="NameError (missing `np.`), TypeError (`^` isn't power), and the `int()` habit. Those three cover most lab crashes."),
]})

g["exercises"] = [
    FILL("py2-df", "Bin spacing", "N = 512 samples at fs = 16000 Hz. What is ΔF, in Hz?", ["31.25"],
         ["ΔF = fs / N.", "16000 / 512.", "16000 / 512 = 31.25."], ["ΔF = 16000 / 512 = 31.25 Hz"], "ΔF tells you which frequency each FFT bin stands for.", ref="fft"),
    FILL("py2-bin", "Which bin?", "N = 1000 samples at fs = 8000 Hz. Which bin number k holds 440 Hz?", ["55"],
         ["First find ΔF = fs / N.", "ΔF = 8 Hz.", "440 / 8."], ["ΔF = 8000 / 1000 = 8 Hz", "k = 440 / 8 = 55"], "Frequency ÷ ΔF = bin.", ref="fft"),
    FILL("py2-amp", "Magnitude to amplitude", "N = 200 and |X[k]| = 150 at some k above 0 Hz. What is the cosine's amplitude?", ["1.5"],
         ["Divide by N, then double.", "2 × 150 / 200.", "= 1.5"], ["2 × 150 / 200 = 1.5"], "The Lab 5 conversion.", ref="fft"),
    MC("py2-abs-angle", "Which function?", "You want the **phase** of FFT bin 7. Which line?",
       ["`np.angle(X[7])`", "`np.abs(X[7])`", "`X[7].imag`", "`np.degrees(X[7])`"], 0,
       ["Right: the angle of the complex number is the phase.", "That's the magnitude (how much), not where the cycle starts.", "The imaginary part alone isn't the angle; you need both parts.", "np.degrees converts an angle; it doesn't find one."],
       ["Phase is an angle.", "numpy's angle function is np.angle."], "Magnitude spectrum = np.abs, phase spectrum = np.angle.", ref="complex"),
    FILL("py2-db", "Decibels", "An amplitude goes from 1 to 100. How many dB louder is that? (20·log10)", ["40"],
         ["20 · log10(100 / 1).", "log10(100) = 2.", "20 × 2."], ["20 × log10(100) = 20 × 2 = 40 dB"], "Every ×10 in amplitude is +20 dB.", ref="db"),
    MC("py2-rfft", "Why rfft?", "Why does Lab 5 end with `np.fft.rfft` instead of `np.fft.fft`?",
       ["For a real signal the negative frequencies mirror the positive ones, so rfft keeps only the non-negative half", "rfft is more accurate", "rfft removes the 0 Hz bin", "rfft gives amplitudes directly, no ×2 needed"], 0,
       ["Right: conjugate symmetry means the negative half repeats information.", "Same numbers, just half of them.", "0 Hz is still bin 0.", "You still divide by N and double (except at 0 Hz)."],
       ["Look at the symmetry in Lab 5's rounded array.", "X[k] and X[−k] are complex conjugates."], "Less to look at, same information.", ref="fft"),
]

build(g)
