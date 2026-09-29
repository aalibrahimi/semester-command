# content/: where the study guides and videos come from

The app reads guides as JSON (`src/study/guides/*.json`) and videos from
`public/study-videos/`. Those files are **build outputs**. This folder holds
the sources that produce them, so a chapter can be fixed or extended by
editing a script and rebuilding, never by hand-editing 3,000 lines of JSON.

```
content/
  build.py              rebuild every scripted guide (npm run content:build)
  authoring/
    _paths.py           repo-relative paths every script uses
    gb.py               guide builder: P, D, T, E, TRAP, C, ST, SIM, MC, FILL, EX, PY, build()
    c146common.py       shared helpers: WHY/WORLD/THINK/WHEN callouts, F(), DG(), frame builders
    h15common.py        TL (timeline), CMP (compare), CARDS, ROAD (roadmap), MODEL
    l112common.py       Orig (reuse blocks from a snapshot), soft(), finish()
    <course>_<n>.py     one script per chapter (see SCRIPTS in build.py)
    cs146_11_figs.py    SVG figures for the hash tables chapter
    cs146_11_trace.py   code + animation traces (code left, picture right)
    snapshots/          earlier guide JSON some scripts reuse blocks from
    oneshot/            patches that were run once; kept for the record, do not rerun
  video/
    render.mjs          timeline page → public/study-videos/<name>.{mp4,webm,jpg}
    cs146-hash-tables.html
```

## Rebuild a chapter

```bash
python3 content/build.py ling112      # just LING 112's scripts
npm run content:build                 # everything
npm run check:guides && npm run check:drills
```

Block ids are content hashes (`section.fnv8(type + primary field)`), so an
unchanged script rebuilds to a byte-identical file. After a full build,
`git status` shows only the chapters whose scripts you changed.

## Write a new chapter

Copy the closest existing script (for a from-zero chapter, `ling112_1.py`;
for an algorithm with traces, `cs146_11.py`), change the `id`, add it to
`SCRIPTS` in `build.py`, register the guide id in `src/study/courses.ts`,
and add drills in `src/study/drills/`. House rules are in
`src/study/guides/AUTHORING.md`: definition first, one example, a picture,
then practice; no em dashes (build() warns); theme tokens only in SVGs.

## Make a video

A video is an HTML page that defines `window.DURATION` (seconds) and
`window.render(t)`, which draws the frame at time t into the page. Copy
`video/cs146-hash-tables.html`: it has helpers for text, boxes, books,
caption bubbles, and a scene list where each scene draws itself from its
local time. Then:

```bash
npm run video:render -- content/video/<name>.html --still 12 40   # check two scenes
npm run video:render -- content/video/<name>.html                  # full render
```

Add `{"type": "video", "src": "/study-videos/<name>.mp4", "caption": …,
"chapters": [{"t": 5, "label": …}]}` to the guide script.
