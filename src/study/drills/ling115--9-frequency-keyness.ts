/**
 * Drills for LING 115 · Frequency and keyness: per-million normalization,
 * back-converting per million to raw hits, Zipf predictions, log-likelihood
 * keyness with the 3.84 / 6.63 cut-offs, and reading Farr & Murphy.
 */
import type { Drill } from "../drill";
import { choice } from "../drill";

const G = "ling115/9-frequency-keyness";

function ll(a: number, b: number, c: number, d: number) {
  const e1 = (c * (a + b)) / (c + d);
  const e2 = (d * (a + b)) / (c + d);
  const t = (a ? a * Math.log(a / e1) : 0) + (b ? b * Math.log(b / e2) : 0);
  return { e1, e2, ll: 2 * t };
}

export const drills: Drill[] = [
  {
    id: "norm!pm",
    guideId: G,
    sectionRef: "norm",
    title: "Per million",
    skill: "count ÷ corpus size × 1,000,000.",
    gen(r) {
      const size = r.pick([15000, 45000, 50000, 200000, 500000, 2000000]);
      const pm = r.pick([40, 100, 200, 266, 400, 1000, 2000]);
      const count = Math.max(1, Math.round((pm * size) / 1e6));
      const want = (count / size) * 1e6;
      return {
        prompt: `A word occurs **${count}** times in a **${size.toLocaleString()}**-word corpus. Frequency per million words? (1 decimal is fine)`,
        answer: { kind: "number", value: want, tolerance: 0.6 },
        steps: [`${count} ÷ ${size.toLocaleString()} × 1,000,000 = ${want.toFixed(1)} per million.`],
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.]/g, ""));
          if (Math.abs(v - count / size) < 1e-6) return "That's the proportion. Multiply by 1,000,000 to get per million.";
          if (Math.abs(v - (size / count)) < 1) return "Upside down: it's count ÷ size, not size ÷ count.";
          return undefined;
        },
      };
    },
  },
  {
    id: "norm!raw",
    guideId: G,
    sectionRef: "norm",
    title: "How many real hits?",
    skill: "Convert a per-million figure back to raw occurrences to spot tiny-corpus inflation.",
    gen(r) {
      const size = r.pick([15000, 30000, 45000, 100000]);
      const raw = r.int(1, 12);
      const pm = Math.round((raw / size) * 1e6);
      return {
        prompt: `A table reports **${pm} per million** for a word in a **${size.toLocaleString()}**-word sub-corpus. How many times does the word actually occur?`,
        answer: { kind: "number", value: raw, tolerance: 0.5 },
        steps: [`${pm} × ${size.toLocaleString()} ÷ 1,000,000 ≈ ${raw}.`, "Small corpora make small counts look big once they are scaled to a million."],
        hint: "Undo the scaling: per million × size ÷ 1,000,000.",
      };
    },
  },
  {
    id: "norm!compare",
    guideId: G,
    sectionRef: "norm",
    title: "Which corpus uses it more?",
    skill: "Compare corpora of different sizes by normalizing first.",
    gen(r) {
      const sa = r.pick([500000, 1000000, 2000000]);
      let sb = r.pick([500000, 1000000, 2000000]);
      if (sb === sa) sb = sa === 2000000 ? 500000 : 2000000;
      const pa = r.int(20, 300);
      let pb = r.int(20, 300);
      if (pb === pa) pb += 17;
      const ca = Math.round((pa * sa) / 1e6);
      const cb = Math.round((pb * sb) / 1e6);
      const na = (ca / sa) * 1e6;
      const nb = (cb / sb) * 1e6;
      const a = `Corpus A (${ca} hits in ${sa.toLocaleString()} words)`;
      const b = `Corpus B (${cb} hits in ${sb.toLocaleString()} words)`;
      return {
        prompt: `Which corpus uses the word more often? ${a} or ${b}.`,
        answer: choice(r, na > nb ? "Corpus A" : "Corpus B", [na > nb ? "Corpus B" : "Corpus A"], { correct: `A = ${na.toFixed(0)} pm, B = ${nb.toFixed(0)} pm.` }),
        steps: [`A: ${ca} ÷ ${sa.toLocaleString()} × 1,000,000 = ${na.toFixed(0)} per million.`, `B: ${cb} ÷ ${sb.toLocaleString()} × 1,000,000 = ${nb.toFixed(0)} per million.`],
        hint: "Raw counts reward the bigger corpus. Normalize both.",
      };
    },
  },
  {
    id: "zipf!predict",
    guideId: G,
    sectionRef: "zipf",
    title: "Zipf's prediction",
    skill: "frequency × rank ≈ constant.",
    gen(r) {
      const f1 = r.pick([30000, 40000, 50000, 60000, 72000]);
      const k = r.pick([2, 3, 4, 5, 6, 8, 10]);
      const want = f1 / k;
      return {
        prompt: `The most frequent word in a corpus occurs **${f1.toLocaleString()}** times. By Zipf's law, about how often does the word at rank **${k}** occur?`,
        answer: { kind: "number", value: want, tolerance: want * 0.02 },
        steps: [`f(rank) ≈ f(1) ÷ rank = ${f1.toLocaleString()} ÷ ${k} = ${Math.round(want).toLocaleString()}.`],
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.]/g, ""));
          if (Math.abs(v - f1 / 2 ** (k - 1)) < 1) return "That halves at every rank. Zipf divides by the rank: f(1)/k.";
          return undefined;
        },
      };
    },
  },
  {
    id: "key!ll",
    guideId: G,
    sectionRef: "key",
    title: "Key or not?",
    skill: "Compute expected counts and log-likelihood; compare with 3.84 and 6.63.",
    gen(r) {
      const c = r.pick([20000, 45000, 100000]);
      const d = 1000000;
      const b = r.pick([100, 200, 400, 600, 1000]);
      const base = (b / d) * c;
      const a = Math.max(1, Math.round(base * r.pick([0.9, 1.1, 1.5, 2, 3, 4])));
      const res = ll(a, b, c, d);
      const verdict = res.ll > 6.63 ? "Key at p < 0.01" : res.ll > 3.84 ? "Key at p < 0.05 (not at 0.01)" : "Not key";
      const opts = ["Key at p < 0.01", "Key at p < 0.05 (not at 0.01)", "Not key"];
      return {
        prompt: `Target corpus: **${a}** hits in ${c.toLocaleString()} words. Reference: **${b}** hits in ${d.toLocaleString()} words. Is the word key in the target?`,
        answer: choice(r, verdict, opts.filter((o) => o !== verdict)),
        steps: [
          `E1 = c(a+b)/(c+d) = ${c}×${a + b}/${c + d} = ${res.e1.toFixed(1)}; E2 = d(a+b)/(c+d) = ${res.e2.toFixed(1)}.`,
          `LL = 2(a·ln(a/E1) + b·ln(b/E2)) = ${res.ll.toFixed(2)}.`,
          `${res.ll.toFixed(2)} vs 3.84 (p<0.05) and 6.63 (p<0.01) → ${verdict}.`,
        ],
        hint: "First compare observed a with expected E1. Close → probably not key.",
      };
    },
  },
  {
    id: "concord!reading",
    guideId: G,
    sectionRef: "concord",
    title: "Reading Farr & Murphy",
    skill: "Say what each method told them and what it could not.",
    gen(r) {
      const qs = [
        { p: "What did Farr & Murphy need the concordance for, if they already had counts?", ok: "To split each count into religious and non-religious uses", bad: ["To normalize to per million", "To compute keyness", "To tokenize the corpus"] },
        { p: "In the BNC, religious words in writing are mostly…", ok: "used in their religious sense (523 of 641)", bad: ["used non-religiously (481 of 748)", "absent", "used as swear words"] },
        { p: "Why are all their tables in words per million?", ok: "The corpora range from half a million to two million words", bad: ["Per million is required by the BNC", "It hides small counts", "It removes the need for concordances"] },
        { p: "Which group used religious references most, and more often in the religious sense?", ok: "The oldest speakers (70s/80s)", bad: ["Women in their 20s", "Teenagers in London", "US political speakers"] },
        { p: "What was their first sign that religious words mattered in the female corpus?", ok: "A keyword list: God was the #1 keyword against a reference corpus", bad: ["A questionnaire", "A dictionary label", "The raw token count"] },
        { p: "'Oh my God' is especially frequent among…", ok: "women in their 20s, a trend they link to the sitcom Friends", bad: ["men in their 70s/80s", "academic lecturers", "political speakers"] },
      ];
      const q = r.pick(qs);
      return { prompt: q.p, answer: choice(r, q.ok, q.bad), steps: [`${q.ok}.`] };
    },
  },
];
