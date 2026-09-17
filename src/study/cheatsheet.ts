/**
 * cheatsheet.ts — turns a guide's blocks into cheat-sheet tiles (wireframe C).
 *
 * Called by: StudyCheatSheet. Calls: nothing (pure).
 *
 * Tiles, and where they go by default:
 *   definitions   column 1 · every definition block, one line each
 *   lookalike     column 1 · 3-column tables whose first column is a symbol
 *                            ("things that look alike": symbol / meaning / size)
 *   trapPoints    column 1 · traps that name a points figure, compact
 *   operations    column 2 · 2-column tables (symbol → meaning), one per table
 *   traps         column 3 · COSTS POINTS, one line per trap in the guide
 *   notation      column 3 · English ↔ notation tables (plain → monospace)
 *   example       column 3 · one per example block (off by default)
 *
 * The view then places tiles by height (preferred column first, then the
 * shortest) and paginates — layout is the view's job; classification is
 * this file's, so it can be unit-tested and reused by print.
 */
import type { DefinitionBlock, ExampleBlock, Guide, TableBlock, TrapBlock } from "./guide";

export type ChipKey = "definitions" | "notation" | "traps" | "examples";

export type Tile =
  | { kind: "definitions"; id: string; label: string; items: DefinitionBlock[]; column: 0; chip: "definitions" }
  | { kind: "lookalike"; id: string; label: string; table: TableBlock; column: 0; chip: "notation" }
  | { kind: "trapPoints"; id: string; label: string; items: TrapBlock[]; column: 0; chip: "traps" }
  | { kind: "operations"; id: string; label: string; table: TableBlock; column: 1; chip: "notation" }
  | { kind: "traps"; id: string; label: string; items: TrapBlock[]; column: 2; chip: "traps" }
  | { kind: "notation"; id: string; label: string; table: TableBlock; column: 2; chip: "notation" }
  | { kind: "example"; id: string; label: string; example: ExampleBlock; column: 2; chip: "examples" };

const LOOKALIKE_HEAD = /^(symbol|form|notation|term|kind|type)$/i;
const ENGLISH_HEAD = /^(english|in words|plain|meaning|description|question)$/i;
const NOTATION_HEAD = /(set-builder|notation|regex|pattern|formula|tag|symbol|means)/i;

/** Which shape a table block has, from its header row. */
export function classifyTable(t: TableBlock): "lookalike" | "operations" | "notation" | "generic" {
  const [h0 = "", h1 = ""] = t.columns;
  if (t.columns.length === 3 && LOOKALIKE_HEAD.test(h0.trim())) return "lookalike";
  if (ENGLISH_HEAD.test(h0.trim()) && NOTATION_HEAD.test(h1)) return "notation";
  if (t.columns.length === 2) return "operations";
  return "generic";
}

/** A short label for a table tile: its title, or the header row joined. */
function tableLabel(t: TableBlock): string {
  return (t.title ?? t.columns.join(" · ")).toUpperCase();
}

export function tilesFor(guide: Guide): Tile[] {
  const defs: DefinitionBlock[] = [];
  const traps: TrapBlock[] = [];
  const tiles: Tile[] = [];
  for (const s of guide.sections)
    for (const b of s.blocks) {
      if (b.type === "definition") defs.push(b);
      else if (b.type === "trap") traps.push(b);
      else if (b.type === "table") {
        const shape = classifyTable(b);
        if (shape === "lookalike") tiles.push({ kind: "lookalike", id: b.id, label: "THINGS THAT LOOK ALIKE", table: b, column: 0, chip: "notation" });
        else if (shape === "notation") tiles.push({ kind: "notation", id: b.id, label: tableLabel(b), table: b, column: 2, chip: "notation" });
        else tiles.push({ kind: "operations", id: b.id, label: tableLabel(b), table: b, column: 1, chip: "notation" });
      } else if (b.type === "example") tiles.push({ kind: "example", id: b.id, label: `EXAMPLE · ${b.title}`.toUpperCase(), example: b, column: 2, chip: "examples" });
    }

  const out: Tile[] = [];
  if (defs.length) out.push({ kind: "definitions", id: "definitions", label: "DEFINITIONS", items: defs, column: 0, chip: "definitions" });
  out.push(...tiles.filter((t) => t.kind === "lookalike"));
  const withPoints = traps.filter((t) => t.points);
  if (withPoints.length) out.push({ kind: "trapPoints", id: "trap-points", label: "POINTS AT STAKE", items: withPoints, column: 0, chip: "traps" });
  out.push(...tiles.filter((t) => t.kind === "operations"));
  if (traps.length) out.push({ kind: "traps", id: "traps", label: "COSTS POINTS", items: traps, column: 2, chip: "traps" });
  out.push(...tiles.filter((t) => t.kind === "notation"));
  out.push(...tiles.filter((t) => t.kind === "example"));
  return out;
}

/** The one-liner for a trap: bold title as a lead, then the first sentence. Never cuts inside markup. */
export function trapLine(t: TrapBlock): string {
  const plain = t.body.replace(/\*\*([^*]+)\*\*\s*/, "$1 — ").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  const sentence = /^(.{20,200}?[.!?])(\s|$)/.exec(plain)?.[1];
  if (sentence) return sentence;
  return plain.length > 200 ? plain.slice(0, 197).replace(/\s\S*$/, "") + "…" : plain;
}
