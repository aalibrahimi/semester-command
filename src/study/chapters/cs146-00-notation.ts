import type { Chapter } from "../types";

/**
 * CS 146 · Chapter 0 — Reading the notation CS 146 uses.
 *
 * Not a lecture Poon gave; the floor his lectures stand on. Written for a
 * reader who can program but hasn't touched logs, sums, exponents-with-logs,
 * induction or Big-O since high school (or ever). Every later chapter links
 * here instead of re-explaining.
 */
export const cs146Notation: Chapter = {
  slug: "0-notation",
  label: "Chapter 0",
  title: "Reading the notation CS 146 uses",
  source: "Lectures 4–7 use all of this without explaining it. CLRS ch. 3 covers it in the appendix voice; this is the plain voice.",
  goal: "Read n, 2ⁿ, log n, Σ, n^(log_b a), T(n) and O(g(n)) as sentences, out loud, without stopping.",
  minutes: 40,
  sections: [
    {
      id: "why",
      title: "Why this chapter exists",
      blocks: [
        {
          id: "why-1",
          t: "p",
          slide: "The problem",
          text: "Every CS 146 lecture is a conversation in a language you haven't been taught. When Poon writes T(n) = 2T(n/2) + kn he reads it out loud as a sentence — \"the time to sort n things is twice the time to sort half as many, plus a linear amount of extra work\" — but the slide only shows the symbols. If the symbols aren't sentences to you yet, the lecture is noise, no matter how well he teaches. This chapter turns eight symbols into sentences. It's the whole reason the later chapters will make sense.",
        },
        {
          id: "why-2",
          t: "p",
          text: "You already have the one thing this needs: you can program. Every idea here has a for-loop or a function behind it, and I'll show you that version first, because that's the version your brain already trusts.",
        },
        {
          id: "why-3",
          t: "list",
          slide: "The eight symbols",
          items: [
            "**n** — how big the input is",
            "**2ⁿ, n², 2ⁱ** — exponents: repeated multiplication",
            "**log n** — the number of times you can halve n",
            "**Σ** — a for-loop that adds",
            "**n^(log_b a)** — an exponent that happens to be a log (only looks scary)",
            "**T(n)** — a function that returns \"how many steps\"",
            "**O(g(n))** — \"grows no faster than g\"",
            "**Induction** — proving something for all n by proving it for n+1",
          ],
        },
      ],
    },
    {
      id: "n",
      title: "n — the size of the input",
      blocks: [
        {
          id: "n-1",
          t: "p",
          slide: "n is a variable, not a number",
          text: "n is always \"how many things did you give me.\" Sort an array of 8 numbers: n = 8. Search a list of a million users: n = 1,000,000. We never care about a specific n; we care about what happens as n grows. That's the mental shift of this entire course: stop asking \"how long does this take on my array\" and ask \"if I double the array, what happens to the time?\"",
        },
        {
          id: "n-2",
          t: "code",
          slide: "Counting steps in code",
          caption: "Every algorithm is a function of n. The question is always: how does the count of steps change as n grows?",
          text: `for (int i = 0; i < n; i++) print(a[i]);   // runs n times
for (int i = 0; i < n; i++)
  for (int j = 0; j < n; j++) print(i, j);  // runs n × n = n² times`,
        },
        {
          id: "n-3",
          t: "def",
          term: "n",
          text: "The size of the input. Runtime is always described as a function of n, because the only thing we're allowed to vary is how much data we're given.",
        },
      ],
    },
    {
      id: "exponents",
      title: "Exponents — repeated multiplication (and why 2ⁱ keeps showing up)",
      blocks: [
        {
          id: "exp-1",
          t: "p",
          slide: "What an exponent is",
          text: "2⁵ means \"multiply 2 by itself 5 times\": 2·2·2·2·2 = 32. n² means n·n. That's all an exponent is. The reason it's everywhere in this course: **anything that doubles once per step is a power of 2.** One thing that splits in two, then each half splits in two again — after i splits you have 2ⁱ pieces.",
        },
        {
          id: "exp-2",
          t: "figure",
          slide: "Doubling makes powers of 2",
          viewBox: "0 0 520 170",
          caption: "Each row doubles the row above. Row i has 2ⁱ boxes. Merge sort's recursion tree is exactly this picture.",
          svg: `<g font-family="ui-monospace, monospace" font-size="12">
<text x="10" y="24" fill="currentColor" opacity=".6">i = 0</text><rect x="240" y="10" width="40" height="20" rx="3" fill="none" stroke="currentColor"/><text x="300" y="24" fill="currentColor" opacity=".6">2⁰ = 1</text>
<text x="10" y="64" fill="currentColor" opacity=".6">i = 1</text><rect x="210" y="50" width="40" height="20" rx="3" fill="none" stroke="currentColor"/><rect x="270" y="50" width="40" height="20" rx="3" fill="none" stroke="currentColor"/><text x="330" y="64" fill="currentColor" opacity=".6">2¹ = 2</text>
<text x="10" y="104" fill="currentColor" opacity=".6">i = 2</text><rect x="150" y="90" width="40" height="20" rx="3" fill="none" stroke="currentColor"/><rect x="200" y="90" width="40" height="20" rx="3" fill="none" stroke="currentColor"/><rect x="280" y="90" width="40" height="20" rx="3" fill="none" stroke="currentColor"/><rect x="330" y="90" width="40" height="20" rx="3" fill="none" stroke="currentColor"/><text x="390" y="104" fill="currentColor" opacity=".6">2² = 4</text>
<text x="10" y="144" fill="currentColor" opacity=".6">i = 3</text>${[70,115,160,205,270,315,360,405].map(x=>`<rect x="${x}" y="130" width="36" height="20" rx="3" fill="none" stroke="currentColor"/>`).join("")}<text x="455" y="144" fill="currentColor" opacity=".6">2³ = 8</text>
</g>`,
        },
        {
          id: "exp-3",
          t: "p",
          text: "Two rules you'll use constantly, both of which are just counting multiplications. **Multiplying powers adds exponents:** 2³·2² = (2·2·2)·(2·2) = 2⁵. **A power of a power multiplies exponents:** (2³)² = 2³·2³ = 2⁶. And the odd-looking one: **anything to the power 0 is 1**, because \"multiply by 2 zero times\" leaves you with what you started with, which is 1.",
        },
        {
          id: "exp-4",
          t: "try",
          q: "After 10 rounds of splitting every piece in two, how many pieces are there? And if you have n pieces, what's n as a power of 2 when n = 64?",
          a: "2¹⁰ = 1024 pieces. 64 = 2⁶ (2·2·2·2·2·2). That second question is a log question in disguise — next section.",
        },
      ],
    },
    {
      id: "log",
      title: "log n — how many times can you halve it?",
      blocks: [
        {
          id: "log-1",
          t: "why",
          slide: "Why logs appear in algorithms",
          title: "Why it exists",
          text: "Some algorithms don't look at every element — they throw half away at each step. Binary search on a sorted array of 1,000,000 numbers checks the middle, throws away the wrong half, and repeats. How many steps until one element is left? That count is what log means. It's not a mysterious function; it's a counter of halvings.",
        },
        {
          id: "log-2",
          t: "stepper",
          slide: true,
          title: "Halving 16 down to 1",
          frames: [
            { kind: "array", cells: [16], hl: [0], note: "0 halvings so far", caption: "Start with n = 16." },
            { kind: "array", cells: [8], hl: [0], note: "1 halving", caption: "Halve it: 8." },
            { kind: "array", cells: [4], hl: [0], note: "2 halvings", caption: "Halve it: 4." },
            { kind: "array", cells: [2], hl: [0], note: "3 halvings", caption: "Halve it: 2." },
            { kind: "array", cells: [1], done: [0], note: "4 halvings — done", caption: "Halve it: 1. It took 4 halvings, so log₂ 16 = 4. Check: 2⁴ = 16." },
          ],
        },
        {
          id: "log-3",
          t: "p",
          text: "So **log₂ n answers the question \"2 to what power gives n?\"** — which is the same as \"how many halvings from n to 1\" and the same as \"how many doublings from 1 to n.\" Those are three phrasings of one fact, and Poon uses all three in Lecture 5: he asks \"how many times must we halve our search space\" and later \"how many times must we double 1 to reach n.\" Same number.",
        },
        {
          id: "log-4",
          t: "code",
          slide: "log as code",
          caption: "This loop IS the definition. If you can read this, you can read log.",
          text: `int log2(int n) {
  int count = 0;
  while (n > 1) { n = n / 2; count++; }
  return count;          // log2(16) → 4,  log2(1024) → 10
}`,
        },
        {
          id: "log-5",
          t: "table",
          slide: "The values you'll actually meet",
          rows: [
            ["n", "log₂ n", "Read as"],
            ["2", "1", "2¹ = 2"],
            ["8", "3", "2³ = 8"],
            ["16", "4", "2⁴ = 16"],
            ["1,024", "10", "2¹⁰ = 1,024"],
            ["1,000,000", "≈ 20", "2²⁰ ≈ 1,048,576"],
            ["1,000,000,000", "≈ 30", "a billion is only 30 halvings"],
          ],
        },
        {
          id: "log-6",
          t: "p",
          text: "That last row is the whole reason logs matter: a billion items, thirty steps. An algorithm that's O(log n) barely notices how big the input is. When Poon writes plain \"log n\" with no little 2, he means log₂ — he says so on Lecture 5 slide 35. Other bases work the same way: log₃ 27 = 3 because 3³ = 27, i.e. \"how many times can you cut 27 into thirds.\"",
        },
        {
          id: "log-7",
          t: "p",
          slide: "Two log rules you need",
          text: "**Rule 1: log(a/b) = log a − log b.** Dividing inside the log becomes subtracting outside. The one you'll see: log(n/2) = log n − log 2 = log n − 1. Halving n costs exactly one halving. **Rule 2: log(aᵇ) = b·log a.** An exponent inside can hop out front as a multiplier. That's the rule that makes n^(log_b a) readable in the next section.",
        },
        {
          id: "log-8",
          t: "try",
          q: "log₂ 32 = ? log₂ (32/2) = ? log₃ 81 = ?",
          a: "5 (2⁵ = 32). 4 — either compute log₂ 16 directly, or use rule 1: 5 − 1. 4 (3⁴ = 81).",
        },
        {
          id: "log-9",
          t: "def",
          term: "log_b n",
          text: "The power you raise b to in order to get n. Equivalently, the number of times you can divide n by b before reaching 1. Plain \"log\" in this course means log₂.",
        },
      ],
    },
    {
      id: "sum",
      title: "Σ and 1 + 2 + … + (n−1) — a for-loop that adds",
      blocks: [
        {
          id: "sum-1",
          t: "p",
          slide: "Σ is a loop",
          text: "The Greek letter Σ (sigma) is a for-loop with an accumulator. Everything below the Σ is the loop's start, everything above is the end, everything to the right is what gets added each iteration.",
        },
        {
          id: "sum-2",
          t: "code",
          slide: true,
          caption: "Read Σ from the bottom up: start i at 1, stop at n, add i each time.",
          text: `  n
  Σ  i      =     int sum = 0;
 i=1              for (int i = 1; i <= n; i++) sum += i;

  n−1
  Σ  i      =     for (int i = 1; i <= n-1; i++) sum += i;   // insertion sort's shifts
 i=1`,
        },
        {
          id: "sum-3",
          t: "why",
          title: "Why this particular sum matters",
          text: "Insertion sort in the worst case shifts 1 element on the first pass, 2 on the second, 3 on the third, up to n−1. Poon writes that total as 1 + 2 + 3 + … + (n−1) on Lecture 4 slide 13 and then just says \"= n²-ish.\" Here's why that's true, so you never have to take it on faith.",
        },
        {
          id: "sum-4",
          t: "figure",
          slide: "The staircase trick",
          viewBox: "0 0 460 190",
          caption: "1+2+3+4+5 drawn as a staircase (blue). A flipped copy (grey) completes a 5×6 rectangle. Two staircases = 5·6 = 30, so one staircase = 15.",
          svg: `<g>${[0,1,2,3,4].map(r=>[0,1,2,3,4,5].map(c=>`<rect x="${20+c*30}" y="${20+r*30}" width="28" height="28" rx="3" fill="${c<=r?'rgb(59 130 246 / .55)':'currentColor'}" opacity="${c<=r?1:.18}"/>`).join("")).join("")}
<text x="215" y="45" font-family="ui-monospace, monospace" font-size="12" fill="currentColor" opacity=".7">5 rows</text>
<text x="215" y="65" font-family="ui-monospace, monospace" font-size="12" fill="currentColor" opacity=".7">6 columns  (n and n+1)</text>
<text x="215" y="100" font-family="ui-monospace, monospace" font-size="12" fill="currentColor">blue = 1+2+3+4+5</text>
<text x="215" y="120" font-family="ui-monospace, monospace" font-size="12" fill="currentColor">blue + grey = 5 × 6 = 30</text>
<text x="215" y="140" font-family="ui-monospace, monospace" font-size="12" fill="currentColor">blue = 30 / 2 = 15</text>
<text x="215" y="170" font-family="ui-monospace, monospace" font-size="12" fill="currentColor" opacity=".7">in general: n(n+1)/2</text>
</g>`,
        },
        {
          id: "sum-5",
          t: "p",
          text: "So 1 + 2 + … + n = n(n+1)/2, and the insertion-sort version 1 + 2 + … + (n−1) = (n−1)·n/2 = (n² − n)/2. When n is big, the n² term dominates and the /2 is a constant, so this is \"about n²\" — which is the honest content of the phrase O(n²).",
        },
        {
          id: "sum-6",
          t: "try",
          q: "1 + 2 + … + 100 = ?",
          a: "100·101/2 = 5,050. (Gauss allegedly did this in primary school by pairing 1+100, 2+99, … — same staircase.)",
        },
        {
          id: "sum-7",
          t: "def",
          term: "Σ (sigma)",
          text: "A sum over a range: the index starts at the value under the Σ, ends at the value above, and each term to the right is added. The one identity to memorize: 1 + 2 + … + n = n(n+1)/2.",
        },
      ],
    },
    {
      id: "nlog",
      title: "n^(log_b a) — the scariest-looking thing in the course, decoded",
      blocks: [
        {
          id: "nlog-1",
          t: "p",
          slide: "It's just an exponent",
          text: "The master method (Lecture 7) compares everything against n^(log_b a). It looks like a typo. It isn't — it's an ordinary exponent whose value happens to be computed by a log. Read it inside-out: first compute the little number log_b a, then raise n to that.",
        },
        {
          id: "nlog-2",
          t: "stepper",
          slide: true,
          title: "Evaluating n^(log₂ 8)",
          frames: [
            { kind: "lines", lines: ["n^(log₂ 8)", "log₂ 8 = ?  →  2 to what power is 8?  →  3", "n^(3) = n³"], active: 0, caption: "Start with the expression. Don't touch n yet." },
            { kind: "lines", lines: ["n^(log₂ 8)", "log₂ 8 = ?  →  2 to what power is 8?  →  3", "n^(3) = n³"], active: 1, caption: "Evaluate the exponent alone. It's a log question: 2³ = 8, so log₂ 8 = 3." },
            { kind: "lines", lines: ["n^(log₂ 8)", "log₂ 8 = ?  →  2 to what power is 8?  →  3", "n^(3) = n³"], active: 2, caption: "Substitute. n^(log₂ 8) is just n³. That's the whole trick." },
          ],
        },
        {
          id: "nlog-3",
          t: "table",
          slide: "The ones you'll meet in HW 7 and on the midterm",
          rows: [
            ["a", "b", "log_b a", "n^(log_b a)", "Because"],
            ["2", "2", "1", "n", "2¹ = 2"],
            ["4", "2", "2", "n²", "2² = 4"],
            ["8", "2", "3", "n³", "2³ = 8"],
            ["1", "2", "0", "n⁰ = 1", "2⁰ = 1"],
            ["27", "3", "3", "n³", "3³ = 27"],
            ["4", "3", "≈ 1.26", "n^1.26", "3^1.26 ≈ 4 — not a whole number, that's fine"],
            ["7", "2", "≈ 2.81", "n^2.81", "2^2.81 ≈ 7 (Strassen's matrix multiply)"],
          ],
        },
        {
          id: "nlog-4",
          t: "p",
          text: "Where does it come from? In Lecture 7 you'll see it's **the number of leaves in the recursion tree**: a problem that splits into a pieces, each 1/b the size, has depth log_b n and therefore a^(log_b n) leaves, and a^(log_b n) = n^(log_b a) by log rule 2 from the log section (swap which one is the base — it's a legal move because both are \"how many times\" counts of the same tree). For now, you only need to be able to compute it.",
        },
        {
          id: "nlog-5",
          t: "try",
          q: "T(n) = 9T(n/3) + n. What is n^(log_b a)?",
          a: "a = 9, b = 3. log₃ 9 = 2 (3² = 9). So n². (And n is polynomially smaller than n², which will be master-method case 1 → Θ(n²).)",
        },
      ],
    },
    {
      id: "T",
      title: "T(n) — a function that returns \"how many steps\"",
      blocks: [
        {
          id: "T-1",
          t: "p",
          slide: "T is a function, not a mystery symbol",
          text: "T(n) is a function like any you'd write: input a size n, output the number of steps the algorithm takes on an input that size. T(8) is the steps to sort 8 things. T(n/2) is the steps to sort half as many. 2T(n/2) is the steps to sort two halves. You can read every recurrence in the course by translating each term into that sentence.",
        },
        {
          id: "T-2",
          t: "code",
          slide: "Read T(n) = 2T(n/2) + kn out loud",
          caption: "This is Lecture 6 slide 7, in words. Practice saying each term.",
          text: `T(n)      "the steps to handle n things"
  =  2T(n/2)   "twice the steps to handle half as many"   ← the two recursive calls
  +  kn        "plus k·n more steps"                       ← the merge, a constant per element
T(1) = 1  "one thing takes one step"                       ← the base case, where recursion stops`,
        },
        {
          id: "T-3",
          t: "p",
          text: "Why is T defined in terms of itself? Because the algorithm is defined in terms of itself — merge sort calls merge sort. A recurrence is just the runtime version of a recursive function. And exactly like a recursive function, it needs a base case or it never stops; Poon says \"in most problems it's safe to assume T(1) = 1.\"",
        },
        {
          id: "T-4",
          t: "def",
          term: "T(n) and a recurrence relation",
          text: "T(n) = the number of steps on input size n. A recurrence relation is an equation that defines T(n) using T of smaller inputs, plus a base case. Solving it means finding a plain formula (no T on the right side) for how T grows.",
        },
      ],
    },
    {
      id: "bigo",
      title: "O(g(n)) — \"grows no faster than\"",
      blocks: [
        {
          id: "bigo-1",
          t: "why",
          slide: "Why we don't count exact steps",
          title: "Why it exists",
          text: "Exact step counts are useless: they depend on the language, the CPU, whether a[i] counts as one step or two. What survives all of that is the *shape* of growth — does doubling n double the time, or quadruple it, or barely change it? Big-O is the notation for the shape, with every irrelevant detail thrown away on purpose.",
        },
        {
          id: "bigo-2",
          t: "p",
          slide: "The definition as a sentence",
          text: "Poon's definition (Lecture 4 slide 15): **f(n) = O(g(n)) if there exist positive constants c and n₀ such that f(n) ≤ c·g(n) for all n ≥ n₀.** Here's that sentence in plain words. \"f is O of g\" means: *once n is big enough (past some n₀), f never rises above some fixed multiple (c) of g.* g is a ceiling for f — not a tight fit, just a ceiling — and you're allowed to scale the ceiling by any constant and ignore small inputs.",
        },
        {
          id: "bigo-3",
          t: "figure",
          slide: "The picture",
          viewBox: "0 0 460 200",
          caption: "Past n₀, the curve c·g(n) stays above f(n) forever. That's all the definition says. Below n₀ nothing is promised.",
          svg: `<g font-family="ui-monospace, monospace" font-size="12">
<line x1="40" y1="170" x2="440" y2="170" stroke="currentColor" opacity=".4"/><line x1="40" y1="170" x2="40" y2="20" stroke="currentColor" opacity=".4"/>
<path d="M40 165 Q 200 150 440 30" fill="none" stroke="rgb(59 130 246)" stroke-width="2"/>
<path d="M40 150 Q 140 140 220 110 T 440 60" fill="none" stroke="currentColor" stroke-width="2"/>
<line x1="180" y1="170" x2="180" y2="30" stroke="currentColor" stroke-dasharray="4 4" opacity=".5"/>
<text x="172" y="188" fill="currentColor">n₀</text>
<text x="360" y="28" fill="rgb(59 130 246)">c·g(n)</text>
<text x="380" y="80" fill="currentColor">f(n)</text>
<text x="440" y="188" fill="currentColor" opacity=".6">n →</text>
</g>`,
        },
        {
          id: "bigo-4",
          t: "worked",
          slide: "Proving 5n + 10 = O(n) (Lecture 4 slides 18–19)",
          title: "Poon's proof pattern, step by step",
          problem: "Show 5n + 10 = O(n). That means: find a c and an n₀ so that 5n + 10 ≤ c·n whenever n ≥ n₀.",
          steps: [
            "Guess a c bigger than the leading coefficient. The 5n needs at least 5; pick c = 6 to leave room for the +10.",
            "Write the inequality with that c: 5n + 10 ≤ 6n.",
            "Simplify: subtract 5n from both sides → 10 ≤ n.",
            "That's true whenever n ≥ 10. So n₀ = 10, c = 6, and the definition is satisfied. Done — 5n + 10 = O(n).",
          ],
          answer: "c = 6, n₀ = 10",
        },
        {
          id: "bigo-5",
          t: "p",
          slide: "The three-step simplification",
          text: "In practice nobody hunts for c and n₀ except on an exam question that asks for them. Day to day, you simplify by throwing away what the definition lets you ignore. **Drop lower-order terms** (n² + 100n + 500 → n²: for big n the n² dwarfs the rest). **Drop constants** (the +500). **Drop coefficients** (2n² → n²: that's the c). Poon's slide 23 is exactly these three moves.",
        },
        {
          id: "bigo-6",
          t: "table",
          slide: "O, Ω, Θ in one table",
          rows: [
            ["Symbol", "Name", "Means", "Think"],
            ["O(g)", "Big-O", "grows no faster than g", "ceiling — worst case"],
            ["Ω(g)", "Big-Omega", "grows at least as fast as g", "floor — best case"],
            ["Θ(g)", "Big-Theta", "grows exactly like g (both)", "tight — when floor and ceiling match"],
          ],
        },
        {
          id: "bigo-7",
          t: "try",
          q: "Simplify 3n³ + 40n² + 7 to Big-O. Then: is 2n + 1 = O(n)? Find c and n₀.",
          a: "O(n³) — drop 40n² and 7 (lower order), drop the 3 (coefficient). Yes: c = 3 gives 2n + 1 ≤ 3n ⟺ 1 ≤ n, so n₀ = 1. (Lecture 4 slide 16.)",
        },
        {
          id: "bigo-8",
          t: "def",
          term: "f(n) = O(g(n))",
          text: "There exist constants c > 0 and n₀ such that f(n) ≤ c·g(n) for all n ≥ n₀. In words: past some point, f is bounded above by a constant multiple of g.",
        },
      ],
    },
    {
      id: "induction",
      title: "Induction — proving something for every n",
      blocks: [
        {
          id: "ind-1",
          t: "why",
          slide: "Why induction",
          title: "Why it exists",
          text: "You can't test a claim for every n — there are infinitely many. Induction is the trick that proves a claim for all n with two finite steps: show it for the smallest case, and show that *if* it holds for one value, it must hold for the next. Then it's true for 1, so for 2, so for 3, forever — like dominoes. Poon uses this twice: loop invariants (Lecture 3) and the substitution method (Lecture 6) are both induction wearing different clothes.",
        },
        {
          id: "ind-2",
          t: "list",
          slide: "The two steps (and Poon's names for them)",
          items: [
            "**Base case** — show the claim for the first value (n = 1, or j = 1 in a loop). Poon's loop-invariant word for this: *Initialization*.",
            "**Inductive step** — assume the claim for some n (the *inductive hypothesis*), and use that assumption to prove it for n+1. Poon's word: *Maintenance*.",
            "Then conclude it holds for all n. Poon's word: *Termination* (for loops, that's where you read off the final answer).",
          ],
        },
        {
          id: "ind-3",
          t: "worked",
          slide: "Induction on the staircase sum",
          title: "Prove 1 + 2 + … + n = n(n+1)/2 for every n ≥ 1",
          problem: "The staircase picture convinced you; induction proves it.",
          steps: [
            "Base case, n = 1: left side is 1; right side is 1·2/2 = 1. ✓",
            "Inductive hypothesis: assume 1 + 2 + … + k = k(k+1)/2 for some k.",
            "Inductive step: then 1 + 2 + … + k + (k+1) = k(k+1)/2 + (k+1) — I used the assumption for the first k terms.",
            "Factor out (k+1): (k+1)·(k/2 + 1) = (k+1)(k+2)/2. That is exactly the formula with n = k+1. ✓",
            "So the claim passes from every k to k+1, and it held at 1. It holds for all n.",
          ],
        },
        {
          id: "ind-4",
          t: "p",
          text: "The only move that ever feels like cheating is step 3: \"assume it's true for k.\" It isn't cheating, because you're not claiming it's true for k — you're proving the *conditional* \"if it works for k then it works for k+1.\" The base case is what turns that conditional into an actual fact for every n. When the substitution method says \"assume T(n/2) ≤ c(n/2)log(n/2)\" in Lecture 6, that's this same step 3.",
        },
        {
          id: "ind-5",
          t: "def",
          term: "Proof by induction",
          text: "To prove P(n) for all n ≥ 1: prove P(1) (base case); prove that P(k) implies P(k+1) (inductive step). Loop invariants and the substitution method are induction.",
        },
      ],
    },
    {
      id: "check",
      title: "Can you read these now?",
      blocks: [
        {
          id: "check-1",
          t: "p",
          text: "Read each one aloud as a sentence. If any of them still stalls you, go back to that section — the rest of CS 146 will keep using it.",
        },
        {
          id: "check-2",
          t: "try",
          q: "T(n) = 3T(n/2) + n",
          a: "\"The steps for n things equal three times the steps for half as many things, plus n extra.\" Three subproblems, each half size, linear combine cost. (Its answer, from Lecture 7: n^(log₂ 3) ≈ n^1.58, since 3 > 2 means the leaves dominate.)",
        },
        {
          id: "check-3",
          t: "try",
          q: "Σ from i=0 to log n of 2ⁱ",
          a: "\"Add up 2ⁱ for i from 0 up to log n\": 1 + 2 + 4 + … + n. A doubling series — the total is about 2n, which is why the merge sort *divide* step is O(n) overall (n − 1 divisions, Lecture 5 slide 27).",
        },
        {
          id: "check-4",
          t: "try",
          q: "f(n) = Θ(n log n)",
          a: "\"f grows exactly like n log n\" — bounded above AND below by constant multiples of n·log n. Merge sort is Θ(n log n) in every case.",
        },
        {
          id: "check-5",
          t: "try",
          q: "n^(log₄ 16)",
          a: "log₄ 16 = 2 (4² = 16), so n². ",
        },
      ],
    },
  ],
};
