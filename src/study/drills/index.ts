/**
 * Drill sets, one file per guide, collected by guide id.
 *
 * Called by: StudyRead (via components/study/Drill), scripts/check-drills.ts,
 * later the mock exam and the Study home.
 * Calls: each drills/<course>--<slug>.ts.
 *
 * Adding a guide's drills: create the file, import it here. Every drill's
 * `guideId` must match the file's guide and its `sectionRef` must be a
 * section id of that guide (check:drills enforces both).
 */
import type { Drill } from "../drill";
import { drills as cs146Notation } from "./cs146--0-notation";
import { drills as cs146Adts } from "./cs146--2-adts-invariants-insertion";
import { drills as cs146BigO } from "./cs146--4-big-o-merge-sort";
import { drills as cs146Recurrences } from "./cs146--6-recurrences";
import { drills as cs146Heaps } from "./cs146--8-heaps-heapsort-pq";
import { drills as cs146Quick } from "./cs146--9-quicksort";
import { drills as cs154Sets } from "./cs154--1-sets-functions";
import { drills as cs154Strings } from "./cs154--3-strings-languages";
import { drills as cs154Dfa } from "./cs154--5-dfa";
import { drills as cs154Nfa } from "./cs154--8-nfa-intro";
import { drills as hist15Walker } from "./hist15--6-walker";
import { drills as hist15Constitution } from "./hist15--8-confederation-to-constitution";
import { drills as hist15Market } from "./hist15--11-market-revolution";
import { drills as ling112Syntax } from "./ling112--0-what-syntax-is";
import { drills as ling112Categories } from "./ling112--2-categories";
import { drills as ling112Heads } from "./ling112--4-heads-dependents";
import { drills as ling112Constituency } from "./ling112--5-constituency-tests";
import { drills as ling112Phrase } from "./ling112--6-phrase-structure";
import { drills as ling115Corpus } from "./ling115--1-what-is-a-corpus";
import { drills as ling115Regex } from "./ling115--4-regex";
import { drills as ling115Tokens } from "./ling115--5-words-tokens-normalization";
import { drills as ling115Pos } from "./ling115--7-annotation-pos";
import { drills as ling124Wave } from "./ling124--0-reading-a-wave";
import { drills as ling124Sampling } from "./ling124--3-sampling-aliasing";
import { drills as ling124Complex } from "./ling124--4-complex-sinusoids";
import { drills as ling124Fourier } from "./ling124--5-fourier-series";
import { drills as ling124Dft } from "./ling124--6-transform-dft-stft";

const ALL: Drill[][] = [
  cs146Notation,
  cs146Adts,
  cs146BigO,
  cs146Recurrences,
  cs146Heaps,
  cs146Quick,
  cs154Sets,
  cs154Strings,
  cs154Dfa,
  cs154Nfa,
  hist15Walker,
  hist15Constitution,
  hist15Market,
  ling112Syntax,
  ling112Categories,
  ling112Heads,
  ling112Constituency,
  ling112Phrase,
  ling115Corpus,
  ling115Regex,
  ling115Tokens,
  ling115Pos,
  ling124Wave,
  ling124Sampling,
  ling124Complex,
  ling124Fourier,
  ling124Dft,
];

const byGuide = new Map<string, Drill[]>();
for (const set of ALL) {
  for (const d of set) {
    const list = byGuide.get(d.guideId) ?? [];
    list.push(d);
    byGuide.set(d.guideId, list);
  }
}

/** All drills for a guide (empty when none are written yet). */
export function drillsForGuide(guideId: string): Drill[] {
  return byGuide.get(guideId) ?? [];
}

/** Every drill, for scripts and the exam builder. */
export function allDrills(): Drill[] {
  return ALL.flat();
}
