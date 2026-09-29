"""One-shot: apply typography.plain to the guides that have no build
script (they exist only as JSON). Ids are untouched. Safe to re-run."""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from typography import plain
from _paths import GUIDES

for gid in sys.argv[1:]:
    p = pathlib.Path(GUIDES) / (gid.replace("/", "--") + ".json")
    g = json.loads(p.read_text())
    p.write_text(json.dumps(plain(g), ensure_ascii=False, indent=2) + "\n")
    print("plain:", gid)
