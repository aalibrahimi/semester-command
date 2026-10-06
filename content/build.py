"""build.py: regenerate every scripted guide from its authoring script.

    python3 content/build.py            rebuild all, then show what changed
    python3 content/build.py ling112    only scripts whose guide id starts with ling112

Each script in SCRIPTS writes one guide to src/study/guides/. Block ids are
hashes of block content, so rebuilding an unchanged script produces a byte-
identical file: `git status` after a full build should be empty unless you
edited a script. Run `npm run check` afterwards.

Guides NOT listed here have no script; their JSON is the source (edit it
directly): cs154 1, 3, 5; hist15 6, 8, 11 (patched once by oneshot/h15_patch.py);
ling115 1, 4, 5, 7.
"""
import subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent / "authoring"
SCRIPTS = [
    ("cs146/0-notation", "cs146_0.py"), ("cs146/2-adts-invariants-insertion", "cs146_2.py"), ("cs146/3-from-zero", "cs146_3z.py"),
    ("cs146/4-big-o-merge-sort", "cs146_4.py"), ("cs146/6-recurrences", "cs146_6.py"),
    ("cs146/7-master-method", "cs146_7.py"), ("cs146/8-heaps-heapsort-pq", "cs146_8.py"),
    ("cs146/9-quicksort", "cs146_9.py"), ("cs146/10-linear-sorts", "cs146_10.py"),
    ("cs146/11-hash-tables", "cs146_11.py"),
    ("cs146/12-binary-search-trees", "cs146_12.py"), ("cs146/13-avl-trees", "cs146_13.py"),
    ("cs146/midterm-crash-course", "cs146_review.py"),
    ("cs154/8-nfa-intro", "cs154_8.py"),
    ("hist15/1-slavery", "h15_1.py"), ("hist15/3-declaration", "h15_3.py"), ("hist15/12-reform", "h15_12.py"),
    ("ling112/0-what-syntax-is", "ling112_0.py"), ("ling112/1-universals", "ling112_1.py"),
    ("ling112/2-categories", "ling112_2.py"), ("ling112/4-heads-dependents", "ling112_4.py"),
    ("ling112/5-constituency-tests", "ling112_5.py"), ("ling112/6-phrase-structure", "ling112_6.py"),
    ("ling112/7-x-bar", "ling112_7.py"),
    ("ling115/9-frequency-keyness", "ling115_6.py"), ("ling115/p-python-for-corpora", "py115.py"),
    ("ling124/0-reading-a-wave", "l124_0.py"), ("ling124/3-sampling-aliasing", "l124_3.py"),
    ("ling124/4-complex-sinusoids", "l124_4.py"), ("ling124/5-fourier-series", "l124_5.py"),
    ("ling124/6-transform-dft-stft", "l124_6.py"), ("ling124/9-pitch-asr", "ling124_9.py"),
    ("ling124/11-feature-extraction", "ling124_11.py"),
    ("ling124/p1-python-waves-plots", "py124_1.py"), ("ling124/p2-python-fft-spectra", "py124_2.py"),
]

only = sys.argv[1] if len(sys.argv) > 1 else ""
failed = []
for gid, script in SCRIPTS:
    if not gid.startswith(only):
        continue
    r = subprocess.run([sys.executable, script], cwd=HERE, capture_output=True, text=True)
    ok = r.returncode == 0
    print(("ok  " if ok else "FAIL"), gid, "" if ok else r.stderr.strip().splitlines()[-1])
    if not ok:
        failed.append(gid)
subprocess.run(["git", "status", "--short", "src/study/guides"], cwd=HERE.parents[1])
sys.exit(1 if failed else 0)
