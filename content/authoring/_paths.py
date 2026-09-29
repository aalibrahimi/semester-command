"""Where things live, computed from this file's location so the authoring
scripts work from any checkout (no machine-specific paths)."""
from pathlib import Path

AUTHORING = Path(__file__).resolve().parent          # content/authoring
REPO = AUTHORING.parents[1]                           # repo root
GUIDES = REPO / "src" / "study" / "guides"            # build() writes here
DRILLS = REPO / "src" / "study" / "drills"
SNAPSHOTS = AUTHORING / "snapshots"                   # earlier guide JSON some scripts reuse blocks from
PREVIEW = REPO / "content" / ".preview"               # scratch renders (gitignored)
