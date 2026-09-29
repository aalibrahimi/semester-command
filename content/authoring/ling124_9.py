from gb import *

AC = [
 lines(["x      = [1, 2, 1, 0, −1, −2, −1, 0, 1, 2, 1, 0]", "lag 0: x·x = 1+4+1+0+1+4+1+0+1+4+1+0 = 18"], 1, "Lag 0: the signal against itself, unshifted. Every product is a square, so this is the biggest the dot product can ever be."),
 lines(["lag 2: x[n]·x[n−2], padded with 0s at the front", "r[2] = 1"], 1, "Shift by 2 samples: now peaks line up with zero-crossings. Products cancel out, the sum is small: 1."),
 lines(["lag 4: shifted by half a cycle", "r[4] = −12"], 1, "Half a cycle: every peak now sits on a trough. Positive × negative everywhere: strongly negative."),
 lines(["lag 8: shifted by one full cycle", "r[8] = 6"], 1, "One full cycle (8 samples): peaks line up with peaks again, so the dot product is large and positive again. That lag is the period."),
 lines(["r[k] for k = 0..9:", "18, 12, 1, −8, −12, −8, −1, 4, 6, 4", "first peak after 0 is at k = 8 → period = 8 samples"], 2, "Read the peak, not the whole list: the first peak after lag 0 is the fundamental period T₀ in samples. It's smaller than 18 only because the shifted copy was padded with zeros (fewer products to add up)."),
]

g = {
 "id": "ling124/9-pitch-asr",
 "course": "ling124",
 "lessons": "Days 9–10",
 "title": "Measuring pitch, and what speech recognition is",
 "summary": "Explain why pitch is not 1 / frame length; compute a dot product and an autocorrelation by hand and read the period off the first peak; turn a lag in samples into F0 = Fₛ / lag; say which heuristics (pitch range, silence, voicing) throw out bad frames; lay out the ASR pipeline and compute word error rate.",
 "estimatedMinutes": 50,
 "sourceNote": "Dr. Koo's Day 9 slides 'Pitch estimation' and Day 10 slides 'Overview of ASR' (pulled from Canvas); Bäckström et al. 2022 §3.7 and ch. 8.3; J&M ch. 16.1 and 16.5. Labs 8 and 9.",
 "requires": ["ling124/6-transform-dft-stft"],
 "sections": [
  {"id": "why", "heading": "Why measure pitch", "blocks": [
    P("**You are on step 5 of the map:** measure things from each slice. First thing to measure: pitch.", why=True),
    P("**The problem** Your voice has a pitch: how high or low it sounds. That pitch comes from how fast your vocal folds vibrate, the **fundamental frequency F0**. We want a number for it, frame by frame, across a recording. Intonation (questions going up), tone in Mandarin or Yoruba, stress, emotion and speaker identity all live in the F0 track.", slide="A number for 'how high'", why=True),
    P("**Where you'll meet this** Auto-Tune and every pitch-correction app, the pitch track in Praat, voice assistants deciding whether you asked a question, Mandarin speech recognizers telling *mā* from *mà*, and forensic speaker comparison. All of them start with exactly the method in this chapter or its cepstral cousin (Days 11–12)."),
  ]},
  {"id": "trap", "heading": "Pitch, and a number that is NOT pitch", "blocks": [
    D("Pitch (F0)", "How many times per second the voice's wave repeats. A typical man is around 100 Hz, a typical woman around 200 Hz."),
    P("Koo's trick question: in Chapter 6 the DFT treated each slice as if it repeated, which gives a number 1 ÷ slice length (a 0.05 s slice gives 20 Hz). **That number is about the slice, not the voice.** Pitch has to be measured from the wave itself. This chapter shows how.", slide="Two different 'F0's"),
    T(["", "The DFT's F0", "The voice's F0 (pitch)"], [
      ["what it is", "1 ÷ frame length", "how often the waveform actually repeats"],
      ["depends on", "your analysis settings", "the speaker's vocal folds"],
      ["example", "25 ms frame → 40 Hz", "a man ~ 100 Hz, a woman ~ 200 Hz"],
    ], title="Don't mix these up", slide=True),
    TRAP("Answering 'F0 = 1 / frame size' when asked for the pitch of a frame. That's the DFT bin spacing (Day 7). Pitch has to be measured from the signal: autocorrelation or cepstrum.", "Day 9 slides"),
  ]},
  {"id": "dot", "heading": "Dot product: a number for 'same trend'", "blocks": [
    D("Correlation", "A number for how similar the **trend** of two equally long lists of values is: do they go up and down together?"),
    D("Dot product", "Multiply the two lists position by position and add: `x · y = Σ xᵢ yᵢ`. Large and positive when they move together, near zero when unrelated, negative when one goes up as the other goes down."),
    E("Three tiny dot products", "x = [1, 2, −1]\n\ny = [1, 2, −1]   x·y = 1 + 4 + 1   =  6   same trend\ny = [2, 1,  0]   x·y = 2 + 2 + 0   =  4   partly\ny = [−1, −2, 1]  x·y = −1 − 4 − 1  = −6   opposite trend", slide="Positive × positive adds up"),
    C("x = [3, 0, −3], y = [1, 0, −1]. What is x · y, and what does its sign say?", "3·1 + 0·0 + (−3)(−1) = 6. Positive: the two go up and down together."),
  ]},
  {"id": "auto", "heading": "Autocorrelation: compare the signal with itself, shifted", "blocks": [
    D("Lag", "How far (in samples) you slid the copy. Lag 0 = not slid at all."),
    D("Autocorrelation", "The match score at each lag: the dot product of the signal with a **delayed copy of itself**, computed for many delays (lags) k: `r[k] = Σ x[n] · x[n − k]`. The delayed copy is **padded with zeros** so both lists stay the same length."),
    P("**Picture it.** Print the wave on a clear plastic sheet and lay it over the original. Slide the copy to the right a little at a time. Most of the time the bumps don't line up. But when you've slid it by exactly **one repeat**, every bump lands on a bump again: a perfect match. The autocorrelation score is just 'how well do they match at this slide amount'. **The first big match after zero slide is the period.**", slide="Slide a copy over itself"),
    ST("Autocorrelation of a signal with period 8", AC),
    P("Two things on Koo's plot: peaks **recur** at every multiple of the period (8, 16, 24…), and they **shrink** as the lag grows, because more of the shifted copy is zero padding. Always take the first peak after 0."),
    TRAP("Taking the lag-0 value as the peak. r[0] is always the largest (the signal matched with itself); it tells you nothing about pitch. Skip it and look for the next peak.", "Day 9, Lab 8"),
  ]},
  {"id": "f0", "heading": "From a lag in samples to F0 in Hz", "blocks": [
    E("The conversion", "F0 = sampling rate ÷ period in samples\n\nKoo's first example: one cycle every 99 samples at 10,000 Hz\n  F0 = 10,000 ÷ 99 ≈ 101 Hz\n\n'The emperor had a mean temper' at 16,000 Hz, a periodic frame:\n  first peak at lag 69 → F0 = 16,000 ÷ 69 ≈ 232 Hz (the slide rounds to 231)", answer="F0 = Fₛ / lag", slide="F0 = Fₛ ÷ lag"),
    P("Read the units out loud and it can't go wrong: *(1 cycle / 99 samples) × (10,000 samples / 1 second) = 10,000 / 99 cycles per second*."),
    C("At Fₛ = 16,000 Hz the first autocorrelation peak is at lag 80. What is F0?", "16,000 ÷ 80 = 200 Hz."),
  ]},
  {"id": "heur", "heading": "When autocorrelation lies: three heuristics", "blocks": [
    P("On an **aperiodic** frame (a hiss like *s*, or silence) there is no real period, but autocorrelation still has a 'first peak'. Koo's example lands at lag 6: 16,000 ÷ 6 ≈ **2,667 Hz**, which no human voice produces. So real pitch trackers throw frames out.", slide="2667 Hz?!"),
    T(["Heuristic", "Rule (Koo's example numbers)", "Catches"], [
      ["Plausible range", "only accept 75–600 Hz", "the 2,667 Hz nonsense; at 16 kHz that means lags 27 to 213"],
      ["Silence detection", "skip the frame if no amplitude is above 3% of the recording's maximum", "pauses and breaths"],
      ["Voice activity detection", "skip if the spectrum is too flat (spectral flatness above a threshold)", "noise and voiceless sounds: speech spectra have energy peaks, noise doesn't"],
    ], title="Throwing out bad frames", slide="Three filters"),
    C("With a 75–600 Hz pitch range at Fₛ = 16,000 Hz, which lags are you allowed to pick?", "From 16,000 ÷ 600 ≈ 27 samples up to 16,000 ÷ 75 ≈ 213 samples. (High pitch = short lag.)"),
  ]},
  {"id": "asr", "heading": "ASR: speech in, text out", "blocks": [
    D("Automatic speech recognition (ASR)", "Getting a computer to take dictation: a recording goes in, a sequence of words (or phonemes) comes out."),
    T(["Step", "In general", "For ASR"], [
      ["1. Data", "gather examples", "many pairs of recordings + transcripts"],
      ["2. Split", "train / validation / test sets", "same"],
      ["3. Model", "input → output", "input: one spectrum vector per short frame; output: a sequence of phonemes or words; the link: HMMs or neural networks"],
      ["4. Configure", "set hyperparameters, fit on training, check on validation, repeat", "same"],
      ["5. Evaluate", "once, on the test set", "error rate (WER)"],
    ], title="The machine learning recipe (Day 10)", slide="How an ASR system is built"),
    P("That 'one vector per frame' input is where this course has been heading: the STFT gives you a spectrum per frame (Day 8), and Days 11–12 turn each spectrum into the compact 39-number vector that classic ASR systems actually use."),
    T(["Corpus", "What's in it"], [
      ["TIMIT", "read speech, hand-labelled down to phoneme and word boundaries"],
      ["LibriSpeech", "1,000 hours of read audiobooks, transcribed by sentence"],
      ["Switchboard", "260 hours of phone calls between strangers (conversational)"],
    ], title="Standard corpora"),
  ]},
  {"id": "wer", "heading": "Word error rate", "blocks": [
    D("Word error rate (WER)", "Errors in the computer's output (the **hypothesis**) divided by the number of words in the true transcript (the **reference**). Errors are **substitutions** (wrong word), **deletions** (missed word) and **insertions** (extra word): `WER = (S + D + I) ÷ N`."),
    E("Counting WER", "reference:  the cat sat on the mat        (N = 6)\nhypothesis: the cat sat in a the mat\n\n'on' → 'in'   substitution  S = 1\n'a'           inserted      I = 1\nnothing missed               D = 0\n\nWER = (1 + 0 + 1) ÷ 6 = 2/6 ≈ 33%", answer="≈ 33%", slide="Counting WER"),
    P("With several recordings, add up all the errors and all the reference words first, then divide once (Koo's slide). Don't average the per-recording percentages."),
    TRAP("Dividing by the length of the hypothesis. WER always divides by the **reference** length. Because insertions count, WER can go above 100%.", "Day 10 slides, J&M 16.5"),
    T(["Harder", "Easier"], [
      ["large vocabulary", "digits only"],
      ["conversational (Switchboard)", "read speech (LibriSpeech)"],
      ["noisy street", "quiet room"],
      ["accents the training data lacks", "accents it has plenty of"],
    ], title="What makes ASR hard", slide="Four dimensions of difficulty"),
    WORDS([["pitch / F0", "how often the voice's wave repeats per second"], ["dot product", "multiply two lists position by position, then add: a similarity score"], ["lag", "how far the copy is slid, in samples"], ["autocorrelation", "match score of a signal with its slid copy, at each lag"], ["F0 = Fₛ / lag", "turn the best lag into Hz"], ["ASR", "automatic speech recognition: speech in, text out"], ["WER", "word error rate = (substitutions + deletions + insertions) ÷ reference words"]]),
    C("Two recordings: 3 errors in a 10-word reference, 1 error in a 30-word reference. What is the overall WER?", "(3 + 1) ÷ (10 + 30) = 4 ÷ 40 = 10%. (Averaging 30% and 3.3% would wrongly give 16.7%.)"),
  ]},
 ],
 "exercises": [
  EX("lag-to-f0", "Read a pitch off an autocorrelation",
     "A frame sampled at 22,050 Hz has autocorrelation peaks at lags 0, 147, 294 and 441 (and smaller values in between). What is F0? Is it plausible for a human voice?",
     ["Ignore lag 0.", "The first peak after 0 is the period in samples.", "F0 = Fₛ ÷ that lag. Then check 75–600 Hz."],
     ["First peak after 0: lag 147.", "F0 = 22,050 ÷ 147 = 150 Hz.", "Inside 75–600 Hz: plausible (a lower voice). 294 and 441 are just multiples of the period."],
     "This is the whole of Lab 8's pitch tracker, done by hand for one frame.", ref="f0"),
  EX("wer-count", "Count the errors",
     "Reference: 'please call stella ask her to bring these things'. Hypothesis: 'please call stellar ask to bring these thing with'. What is the WER?",
     ["Line the two up word by word. N is the reference length: count it.", "'stella' → 'stellar' and 'things' → 'thing' are substitutions. Which reference word is missing?", "'with' at the end is extra: an insertion."],
     ["N = 9.", "S = 2 (stella→stellar, things→thing), D = 1 (her), I = 1 (with).", "WER = (2 + 1 + 1) ÷ 9 = 4/9 ≈ 44%."],
     "WER is the one number every ASR paper, product launch and benchmark reports; knowing it divides by the reference and counts insertions keeps you from misreading them.", ref="wer"),
 ],
}
from l124_extra import EXTRA
g["exercises"] += EXTRA["9"]
build(g)
