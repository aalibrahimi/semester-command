"""preview.py <guide.json> [section ...]: write every figure of a guide, in
dark and light, to content/.preview/<slug>-{dark,light}.html. Open the files
in a browser to eyeball the figures before committing."""
import json, sys, re, subprocess, os
from _paths import REPO, PREVIEW
css = open(REPO / "src" / "styles" / "globals.css").read()
import re as _re
_blocks = _re.findall(r"(:root,\s*\.dark\s*\{[^}]*\}|\.light\s*\{[^}]*\})", css)
css = "\n".join(_blocks)
g = json.load(open(sys.argv[1]))
only = set(sys.argv[2:])
figs = []
for s in g["sections"]:
    if only and s["id"] not in only: continue
    for b in s["blocks"]:
        if b["type"] == "figure":
            figs.append((s["id"], b))
body = "".join(
    f"<div class='f'><div class='t'>{sid} · {b['id']}</div><svg viewBox='{b['viewBox']}' style='width:100%;max-width:{b['viewBox'].split()[2]}px;color:rgb(var(--foreground))'>{b['svg']}</svg><div class='c'>{b['caption'][:300]}</div></div>"
    for sid, b in figs)
slug = os.path.basename(sys.argv[1]).replace(".json", "")
for mode in ("dark", "light"):
    html = f"<html><head><style>{css}\nbody{{background:rgb(var(--background));color:rgb(var(--foreground));font-family:system-ui;margin:0;padding:16px;width:1000px}} .f{{display:inline-block;vertical-align:top;width:480px;margin:0 8px 16px 0;padding:12px;background:rgb(var(--card));border-radius:12px}} .t{{font:11px monospace;opacity:.6}} .c{{font-size:12px;opacity:.7;margin-top:4px}}</style></head><body class='{mode}'>{body}</body></html>"
    PREVIEW.mkdir(parents=True, exist_ok=True)
    p = PREVIEW / f"{slug}-{mode}.html"
    open(p, "w").write(html)
    print(p)
print(len(figs), "figures")
