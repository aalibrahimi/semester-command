/**
 * check-drills.ts — exercises every drill in src/study/drills/ and fails on
 * anything a reader would hit as a bug. Runs in `npm run verify`.
 *
 *   npx tsx scripts/check-drills.ts
 *
 * For each drill, 300 seeded instances: the prompt is non-empty, the answer
 * is well-formed, the accepted answer grades as correct when typed back in
 * (so the grader and the generator agree), choice answers have 2 to 5
 * distinct options with a valid correct index, diagnose() never throws,
 * and the drill's guideId / sectionRef name a real guide and section.
 * Also reports drills per guide and sections with none.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { allDrills } from "../src/study/drills";
import { expectedText, grade, rng, type DrillAnswer } from "../src/study/drill";

const dir = join(process.cwd(), "src/study/guides");
const sections = new Map<string, Set<string>>();
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json") || f === "index.json") continue;
  const g = JSON.parse(readFileSync(join(dir, f), "utf8")) as { id: string; sections: { id: string }[] };
  sections.set(g.id, new Set(g.sections.map((s) => s.id)));
}

/** What a reader would type to give the accepted answer. */
function typedAnswer(a: DrillAnswer): string {
  switch (a.kind) {
    case "number":
      return String(a.value);
    case "text":
      return a.accept[0];
    case "set":
      return a.items.join(", ");
    case "sequence":
      return a.items.join(", ");
    case "choice":
      return String(a.correct);
    case "checklist":
      return a.items.map((_, i) => i).join(",");
    case "custom":
      return a.display;
  }
}

const problems: string[] = [];
const ids = new Set<string>();
const perGuide = new Map<string, number>();
const N = 300;

for (const d of allDrills()) {
  const at = (msg: string) => problems.push(`${d.guideId} ${d.id}: ${msg}`);
  const key = `${d.guideId}/${d.id}`;
  if (ids.has(key)) at("duplicate id");
  ids.add(key);
  if (!/^[a-z0-9-]+![a-z0-9-]+$/.test(d.id)) at(`id should be section!slug, got ${d.id}`);
  const secs = sections.get(d.guideId);
  if (!secs) at("guideId names no guide");
  else if (!secs.has(d.sectionRef)) at(`sectionRef ${d.sectionRef} is not a section of the guide`);
  if (d.id.split("!")[0] !== d.sectionRef) at(`id prefix ${d.id.split("!")[0]} != sectionRef ${d.sectionRef}`);
  if (!d.title || !d.skill) at("missing title or skill");
  perGuide.set(d.guideId, (perGuide.get(d.guideId) ?? 0) + 1);

  const seenPrompts = new Set<string>();
  for (let seed = 1; seed <= N; seed++) {
    let inst;
    try {
      inst = d.gen(rng(seed));
    } catch (e) {
      at(`gen threw for seed ${seed}: ${(e as Error).message}`);
      break;
    }
    if (!inst.prompt?.trim()) at(`empty prompt (seed ${seed})`);
    if (!inst.steps?.length) at(`no steps (seed ${seed})`);
    seenPrompts.add(inst.prompt + (inst.code ?? ""));
    const a = inst.answer;
    if (a.kind === "choice") {
      if (a.options.length < 2 || a.options.length > 5) at(`choice has ${a.options.length} options (seed ${seed})`);
      if (a.correct < 0 || a.correct >= a.options.length) at(`choice correct index out of range (seed ${seed})`);
      if (new Set(a.options).size !== a.options.length) at(`duplicate choice options (seed ${seed}): ${a.options.join(" | ")}`);
      if (a.options.some((o) => !o.trim())) at(`empty choice option (seed ${seed})`);
    }
    if (a.kind === "number" && !Number.isFinite(a.value)) at(`non-finite number answer (seed ${seed})`);
    if ((a.kind === "set" || a.kind === "sequence") && a.items.length === 0) at(`empty list answer (seed ${seed})`);
    if (a.kind === "text" && a.accept.length === 0) at(`no accepted text (seed ${seed})`);
    if (a.kind === "checklist" && a.items.length < 2) at(`checklist too short (seed ${seed})`);
    let g;
    try {
      g = grade(a, typedAnswer(a));
    } catch (e) {
      at(`grade threw (seed ${seed}): ${(e as Error).message}`);
      continue;
    }
    if (!g.correct) at(`accepted answer does not grade correct (seed ${seed}): typed "${typedAnswer(a)}", expected "${expectedText(a)}"`);
    // A wrong answer must grade wrong.
    const wrong = a.kind === "choice" ? String((a.correct + 1) % a.options.length) : a.kind === "checklist" ? "" : "zzz-not-an-answer";
    if (grade(a, wrong).correct) at(`obviously wrong input grades correct (seed ${seed})`);
    if (inst.diagnose) {
      try {
        inst.diagnose(wrong);
        inst.diagnose("");
        inst.diagnose("0");
      } catch (e) {
        at(`diagnose threw (seed ${seed}): ${(e as Error).message}`);
      }
    }
  }
  // Rubric checklists are static by design; everything else must vary.
  const isChecklist = d.gen(rng(1)).answer.kind === "checklist";
  if (!isChecklist && seenPrompts.size < 2) at(`only ${seenPrompts.size} distinct instance in ${N} seeds (not really generated)`);
}

// Coverage report: sections with no drills.
const uncovered: string[] = [];
for (const [gid, secs] of sections) {
  const have = new Set(allDrills().filter((d) => d.guideId === gid).map((d) => d.sectionRef));
  for (const s of secs) if (!have.has(s) && s !== "why") uncovered.push(`${gid}#${s}`);
}

console.log(`${allDrills().length} drills across ${perGuide.size} guides.`);
for (const [g, n] of [...perGuide].sort()) console.log(`  ${n.toString().padStart(2)}  ${g}`);
const noDrills = [...sections.keys()].filter((g) => !perGuide.has(g));
if (noDrills.length) console.log(`Guides with no drills: ${noDrills.join(", ")}`);
console.log(`Sections with no drill (excluding 'why'): ${uncovered.length}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("check:drills OK");
