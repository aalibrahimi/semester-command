/**
 * Drills for CS 146 · ADTs and insertion sort: stack traces, the circular
 * queue's head/tail, picking the ADT, insertion-sort passes and shift counts,
 * and the loop-invariant vocabulary.
 */
import type { Drill, Rng } from "../drill";
import { choice } from "../drill";

const G = "cs146/2-adts-invariants-insertion";

function nums(r: Rng, n: number, lo = 1, hi = 20): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const v = r.int(lo, hi);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

export const drills: Drill[] = [
  {
    id: "stack!trace",
    guideId: G,
    sectionRef: "stack",
    title: "Stack trace",
    skill: "push/pop are LIFO: predict what comes out, in order.",
    gen(r) {
      const vals = nums(r, r.int(3, 5));
      const ops: string[] = [];
      const st: number[] = [];
      const popped: number[] = [];
      let vi = 0;
      const nOps = vals.length + r.int(1, 2);
      for (let i = 0; i < nOps; i++) {
        if (st.length === 0 && vi >= vals.length) break;
        if (vi < vals.length && (st.length === 0 || r.next() < 0.6)) {
          ops.push(`push(${vals[vi]})`);
          st.push(vals[vi++]);
        } else {
          const p = st.pop()!;
          popped.push(p);
          ops.push("pop()");
        }
      }
      const askPeek = st.length > 0 && r.next() < 0.5;
      if (askPeek)
        return {
          prompt: `Start empty. Run: **${ops.join(", ")}**. What does peek() return now?`,
          answer: { kind: "number", value: st[st.length - 1] },
          steps: [`Track the top after each op: ${ops.join(" · ")}.`, `Remaining stack (bottom → top): ${st.join(", ")}. peek() = ${st[st.length - 1]}.`],
          hint: "The most recent push that has not been popped is the top.",
        };
      return {
        prompt: `Start empty. Run: **${ops.join(", ")}**. List every value returned by pop(), in order${st.length ? ", then keep popping until empty" : ""}.`,
        answer: { kind: "sequence", items: [...popped, ...st.slice().reverse()].map(String), placeholder: "e.g. 7, 3, 12" },
        steps: [`pop() always returns the most recently pushed item still on the stack.`, `Pops during the run: ${popped.join(", ") || "none"}. Left on the stack (top first): ${st.slice().reverse().join(", ") || "nothing"}.`],
        hint: "Last in, first out. Write the stack after each op.",
        diagnose(input) {
          const got = input.split(/[,;→>\s]+/).filter(Boolean).map(Number);
          const want = [...popped, ...st.slice().reverse()];
          if (got.length === want.length && got.every((g, i) => g === want[want.length - 1 - i])) return "Reversed: you listed them oldest-first. A stack returns the newest first (LIFO).";
          if (got.length === want.length && got.every((g, i) => g === vals[i])) return "You listed the push order. Pops come out in reverse of that, and pops mid-run remove items before later pushes.";
          return undefined;
        },
      };
    },
  },
  {
    id: "queue!circular",
    guideId: G,
    sectionRef: "queue",
    title: "The circular buffer",
    skill: "head and tail wrap with % capacity; size tells full from empty.",
    gen(r) {
      const cap = r.pick([4, 5, 6]);
      const nEnq = r.int(cap, cap + 3);
      const nDeq = r.int(1, cap - 1);
      // Interleave: enqueue nDeq+? then dequeue nDeq then enqueue rest.
      const first = Math.min(nEnq, cap);
      const rest = nEnq - first;
      let head = 0;
      let tail = -1;
      let size = 0;
      const enq = () => {
        tail = (tail + 1) % cap;
        size++;
      };
      const deq = () => {
        head = (head + 1) % cap;
        size--;
      };
      for (let i = 0; i < first; i++) enq();
      for (let i = 0; i < nDeq; i++) deq();
      const canAdd = Math.min(rest, cap - size);
      for (let i = 0; i < canAdd; i++) enq();
      const ask = r.pick(["head", "tail", "size"]);
      const val = ask === "head" ? head : ask === "tail" ? tail : size;
      return {
        prompt: `ArrayQueue with **capacity ${cap}** (head = 0, tail = −1, size = 0). Enqueue ${first} items, dequeue ${nDeq}, then enqueue ${canAdd} more. What is **${ask}** now?`,
        answer: { kind: "number", value: val },
        steps: [
          `Enqueue ${first}: tail advances to ${first - 1}, size = ${first}.`,
          `Dequeue ${nDeq}: head advances to ${nDeq}, size = ${first - nDeq}.`,
          `Enqueue ${canAdd}: tail = (${first - 1} + ${canAdd}) % ${cap} = ${tail} (it wrapped${tail < first - 1 ? "" : " or stayed in range"}), size = ${size}.`,
          `So ${ask} = ${val}.`,
        ],
        hint: "tail = (tail + 1) % capacity on enqueue; head = (head + 1) % capacity on dequeue.",
        diagnose(input) {
          const v = Number(input.replace(/[^0-9.-]/g, ""));
          if (ask === "tail" && v === first - 1 + canAdd) return `Without the modulo tail would be ${first - 1 + canAdd}, which is past the end of a ${cap}-slot array. Apply % ${cap}.`;
          if (ask === "size" && v === first + canAdd) return "You forgot the dequeues. size goes up on enqueue and down on dequeue.";
          return undefined;
        },
      };
    },
  },
  {
    id: "queue!which",
    guideId: G,
    sectionRef: "queue",
    title: "Pick the ADT from the story",
    skill: "Does the first thing in leave first (queue) or last (stack)?",
    gen(r) {
      const s = r.pick([
        { story: "Browser back button: the page you visited most recently is the one you return to first.", ok: "Stack (LIFO)", why: "Most recent first is LIFO." },
        { story: "Print jobs are served in the order they were submitted.", ok: "Queue (FIFO)", why: "Arrival order preserved is FIFO." },
        { story: "Undo in an editor reverses the latest change first.", ok: "Stack (LIFO)", why: "Latest change first is LIFO." },
        { story: "Customers at a deli counter take a number and are served in that order.", ok: "Queue (FIFO)", why: "Served in arrival order is FIFO." },
        { story: "A single-lane dead-end tunnel is blocked: the last car in must back out first.", ok: "Stack (LIFO)", why: "Last in, first out." },
        { story: "Messages between servers must be processed in the order sent.", ok: "Queue (FIFO)", why: "Order of arrival must be kept." },
        { story: "Matching parentheses: each closing bracket must match the most recent unmatched opener.", ok: "Stack (LIFO)", why: "Most recent unmatched opener is the top of a stack." },
      ]);
      const alt = s.ok.startsWith("Stack") ? "Queue (FIFO)" : "Stack (LIFO)";
      return {
        prompt: s.story + " Which ADT?",
        answer: choice(r, s.ok, [alt, "Linked list", "Array"], { correct: s.why }),
        steps: ["Ask one question: does the first thing in come out first (queue) or last (stack)?", s.why],
      };
    },
  },
  {
    id: "insertion!pass",
    guideId: G,
    sectionRef: "insertion",
    title: "One pass of insertion sort",
    skill: "Take key = a[j], shift bigger elements right, drop the key in: show the array after the pass.",
    gen(r) {
      const a = nums(r, r.int(5, 6), 1, 30);
      // Make a[0..j-1] sorted for the pass to be meaningful.
      const j = r.int(2, a.length - 1);
      const arr = [...a.slice(0, j).sort((x, y) => x - y), ...a.slice(j)];
      const before = arr.slice();
      const key = arr[j];
      let i = j - 1;
      let shifts = 0;
      while (i >= 0 && arr[i] > key) {
        arr[i + 1] = arr[i];
        i--;
        shifts++;
      }
      arr[i + 1] = key;
      const askShifts = r.next() < 0.4;
      if (askShifts)
        return {
          prompt: `Insertion sort, pass j = ${j}: a = [${before.join(", ")}], key = a[${j}] = ${key}. How many shifts happen in this pass?`,
          answer: { kind: "number", value: shifts },
          steps: [`Walk i left from ${j - 1} while a[i] > ${key}.`, `Elements bigger than ${key} to its left: ${before.slice(0, j).filter((x) => x > key).join(", ") || "none"} → ${shifts} shift${shifts === 1 ? "" : "s"}.`, `Then ${key} drops into position ${i + 1}: [${arr.join(", ")}].`],
          hint: "Count the elements left of the key that are bigger than it.",
        };
      return {
        prompt: `Insertion sort, pass j = ${j}: a = [${before.join(", ")}], key = a[${j}] = ${key}. Write the array after this pass.`,
        answer: { kind: "sequence", items: arr.map(String), placeholder: "e.g. 3, 5, 9, 12, 7" },
        steps: [`a[0..${j - 1}] = [${before.slice(0, j).join(", ")}] is already sorted; key = ${key}.`, `Shift every element > ${key} one slot right (${shifts} shift${shifts === 1 ? "" : "s"}), then place the key.`, `Result: [${arr.join(", ")}]. Elements after index ${j} are untouched.`],
        hint: "Only the prefix up to j changes. The tail stays exactly as it was.",
        diagnose(input) {
          const got = input.split(/[,;→>\s]+/).filter(Boolean).map(Number);
          const full = before.slice().sort((x, y) => x - y);
          if (got.length === full.length && got.every((g, i) => g === full[i])) return `That is the fully sorted array. One pass only inserts a[${j}] into the sorted prefix; the tail [${before.slice(j + 1).join(", ")}] is untouched until later passes.`;
          if (got.length !== arr.length) return `The array keeps all ${arr.length} elements.`;
          if (got.slice(j + 1).some((g, i) => g !== arr[j + 1 + i])) return `The elements after index ${j} must not change in this pass.`;
          return undefined;
        },
      };
    },
  },
  {
    id: "insertion!total",
    guideId: G,
    sectionRef: "insertion",
    title: "Total shifts and the growth it implies",
    skill: "Reversed input: 1 + 2 + … + (n−1) = n(n−1)/2 shifts, hence O(n²); sorted input: 0 shifts, Ω(n).",
    gen(r) {
      const n = r.pick([4, 5, 6, 8, 10, 20, 100]);
      const kind = r.pick(["rev", "sorted", "which"]);
      if (kind === "rev")
        return {
          prompt: `Insertion sort on **${n} elements sorted largest-to-smallest**. How many shifts in total?`,
          answer: { kind: "number", value: (n * (n - 1)) / 2 },
          steps: [`Pass j shifts j elements: 1 + 2 + … + ${n - 1}.`, `${n}·${n - 1}/2 = ${(n * (n - 1)) / 2}. That staircase is why the worst case is O(n²).`],
          diagnose(input) {
            const v = Number(input.replace(/[^0-9.-]/g, ""));
            if (v === (n * (n + 1)) / 2) return `You summed 1 to n. The first pass (j = 1) shifts 1 and the last (j = n−1) shifts n−1: sum to n−1, so n(n−1)/2.`;
            if (v === n * n) return "n² is the growth *shape*, not the count. The exact count is n(n−1)/2, about half of n².";
            return undefined;
          },
        };
      if (kind === "sorted")
        return {
          prompt: `Insertion sort on **${n} elements already sorted**. How many shifts, and how many comparisons?`,
          answer: choice(r, `0 shifts, ${n - 1} comparisons`, [`0 shifts, ${n} comparisons`, `${n - 1} shifts, ${n - 1} comparisons`, `${(n * (n - 1)) / 2} shifts`], {
            correct: "Each pass compares the key with its left neighbour once, finds a[i] > key false, and stops. That is the Ω(n) best case.",
          }),
          steps: [`Each of the ${n - 1} passes does one comparison and no shift.`, `Best case: Ω(n).`],
        };
      return {
        prompt: "Which input makes insertion sort slowest, and what is its growth?",
        answer: choice(r, "Sorted backwards: O(n²)", ["Already sorted: O(n²)", "Random: O(n log n)", "Sorted backwards: O(n log n)"], {
          correct: "Every key walks past every earlier element, n(n−1)/2 shifts.",
        }),
        steps: ["Worst case: reversed input, every key shifts all the way left.", "Shifts sum to n(n−1)/2 → O(n²)."],
      };
    },
  },
  {
    id: "invariants!parts",
    guideId: G,
    sectionRef: "invariants",
    title: "The three parts of a loop-invariant proof",
    skill: "Initialization, maintenance, termination: know what each one shows.",
    gen(r) {
      const qs = [
        { p: "Which step shows the invariant holds *before the first iteration*?", ok: "Initialization", bad: ["Maintenance", "Termination", "Induction hypothesis"] },
        { p: "Which step shows that if the invariant holds before an iteration, it still holds after?", ok: "Maintenance", bad: ["Initialization", "Termination", "Base case"] },
        { p: "Which step uses the invariant plus the loop's exit condition to conclude the algorithm is correct?", ok: "Termination", bad: ["Initialization", "Maintenance", "Verification"] },
        { p: "For insertion sort, what is the loop invariant?", ok: "At the start of each iteration j, a[0..j−1] holds the original elements of a[0..j−1], in sorted order", bad: ["a is fully sorted after each iteration", "a[j] is the smallest element", "a[0..j] contains no duplicates"] },
        { p: "At termination of insertion sort, j = n. What does the invariant say?", ok: "a[0..n−1], the whole array, is sorted and holds the original elements", bad: ["Only a[0..n−2] is sorted", "The key is at index n", "Nothing: the invariant only applies mid-loop"] },
      ];
      const q = r.pick(qs);
      return {
        prompt: q.p,
        answer: choice(r, q.ok, q.bad),
        steps: ["Initialization: true before the loop. Maintenance: stays true each iteration. Termination: at exit, invariant + exit condition = correctness.", `Answer: ${q.ok}.`],
      };
    },
  },
];
