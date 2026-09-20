# Guide authoring conventions

The quality bar is `cs146--2-adts-invariants-insertion.json` (the linked-list
section). Read it before writing anything. These rules keep 24 guides looking
like one book.

## The pass every guide gets

1. **Clarity**: every section opens with the mental model in plain words
   before any formalism. If a sentence needs re-reading, rewrite it. Explain
   *where formulas come from*, never just state them.
2. **Real-world grounding**: each major section gets a prose block starting
   `**Where you'll meet this after the exam**` — concrete systems, tools, and
   interview situations, specific ("git log walks a linked list"), never
   generic ("used in many applications").
3. **Highlights**: the inline renderer supports three marks. Use them for the
   ONE load-bearing phrase per paragraph, not decoration:
   - `==key idea==` → brand highlight (the thing to remember)
   - `!!costly mistake!!` → red highlight (what loses points / breaks code)
   - `##payoff##` → green highlight (the win, the fast case)
   Plus the existing `**bold**`, `*italic*`, `` `code` ``.
4. **Figures**: add an inline-SVG figure wherever a picture carries the idea
   (structures, geometries, curves, trees, timelines). Detail level: labeled
   cells, real values, arrows that mean something — like the linked-list
   chain figure.

## Figure rules (all of them matter)

- JSON `figure` block: `{ "type": "figure", "viewBox": "0 0 W H", "svg":
  "...", "caption": "...", "slide": "Title", "id": "<section>.<hex8>" }`.
- **Single-quoted attributes** inside the SVG string (avoids JSON escaping).
- Escape `<` and `>` in text content as `&lt;` / `&gt;`.
- Width 480–690; height whatever the content needs. Rendered at max 560px.
- Colors: structure in `currentColor`; accents ONLY via theme tokens —
  `rgb(var(--on-track))` (green, the subject), `rgb(var(--accent-fg))`
  (blue, pointers/actions), `rgb(var(--critical))` (red, mistakes/cuts),
  `rgb(var(--at-risk))` (amber, caution). Never hex. Tints:
  `rgb(var(--on-track) / 0.12)`. Muted text: `opacity='0.55'`.
- Arrowheads: `<marker>` in `<defs>`, **ids unique per figure** (e.g.
  `dfa1A`) — figures share one page and duplicate ids break arrows.
- Fonts: `font-family='ui-sans-serif, system-ui'`; monospace values get
  `font-family='ui-monospace, monospace'`.
- **Tooltips**: wrap each logical cluster in `<g><title>plain-language
  explanation of this part</title>…</g>`. Browsers show it on hover. Every
  figure should have 3–6 of these; the caption may say "hover any part".

## Block & id rules

- NEVER change an existing block's `id` (mastery records point at them).
  Editing a block's text in place is fine — keep its id.
- New blocks: `id` = `<sectionId>.<8 lowercase hex chars>`, unique in the
  file. Any hex works; it is not re-derived.
- New checks need `sectionRef` (usually their own section id).
- `slide` on a block puts it in the deck; give figures a string title.
- Do not delete existing blocks or sections; augment and rewrite in place.
- Traps keep the professor's voice and the `source` field honest — never
  invent a "costs points" claim.

## Validate

`bun run check:guides` must pass. It checks structure, id shape/uniqueness,
sectionRefs, and related-term references — it does NOT check SVG validity,
so eyeball your coordinates (no negative positions, text inside the viewBox).
