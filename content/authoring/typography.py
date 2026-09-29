"""Plain punctuation for guide text: no em dashes.

Ali's house rule: never an em dash in anything he reads. Guides written
before the rule still had ~440 of them, so the builder runs every guide's
text through `plain(g)` AFTER block ids are assigned (ids hash the original
text, and review history is keyed by them, so ids must not move).

  a — b — c      (a pair inside one sentence)   →  a, b, c
  x — so y       (before a joining word)        →  x, so y
  x — y          (anything else)                →  x: y
  q0 —a→ q1      (automaton arrows)             →  unchanged

Code is left alone: code blocks' starter/check/solution/setup, and ids.
"""
import re

EM = "—"
JOINERS = {"so", "and", "but", "or", "which", "because", "then", "not", "yet", "while", "though",
           "although", "since", "unless", "who", "where", "when", "as", "if", "until", "nor"}
_ARROW = re.compile(EM + r"(?=[^\s" + EM + r"]{1,8}→)")
_PAIR = re.compile(r" " + EM + r" ([^" + EM + r".!?\n]{1,160}?) " + EM + r" ")
_SINGLE = re.compile(r"\s*" + EM + r"\s*")
_KEEP = "\u0000ARROW\u0000"


def plain_text(s: str) -> str:
    if EM not in s:
        return s
    s = _ARROW.sub(_KEEP, s)
    s = _PAIR.sub(lambda m: f", {m.group(1)}, ", s)

    def one(m):
        after = s[m.end():]
        word = re.match(r"[A-Za-z']+", after)
        before = s[: m.start()]
        if not before or before.endswith("\n"):
            return ""  # a dash opening a line: just drop it
        if word and word.group(0).lower() in JOINERS:
            return ", "
        return ": "

    out, last = [], 0
    for m in _SINGLE.finditer(s):
        out.append(s[last:m.start()])
        out.append(one(m))
        last = m.end()
    out.append(s[last:])
    return "".join(out).replace(_KEEP, EM).replace(":,", ":").replace(", ,", ",")


CODE_KEYS = {"starter", "check", "solution", "setup"}
SKIP_KEYS = {"id", "viewBox", "src", "poster", "sectionRef", "guideId", "requires", "course"}


def plain(o, parent_type=None):
    """Return a copy of a guide (or any part of it) with plain punctuation."""
    if isinstance(o, str):
        return plain_text(o)
    if isinstance(o, list):
        return [plain(x, parent_type) for x in o]
    if isinstance(o, dict):
        t = o.get("type", parent_type)
        out = {}
        for k, v in o.items():
            if k in SKIP_KEYS or (t == "code" and k in CODE_KEYS):
                out[k] = v
            else:
                out[k] = plain(v, t)
        return out
    return o


if __name__ == "__main__":
    tests = [
        "and — for (b) — forgetting that",
        "consumes no characters — running still contains ing",
        "it's greedy — so it swallows the whole line",
        "Lossy — *running, runner* → *run*",
        "δ: q0 —a→ q0, q0 —b→ q1",
        "**Assignment 1 Q12 — the deductions** Power set",
        "{ } no — must be nonempty. {ab} yes — here 'ab' is one symbol",
        "(`\\bing` — at the start of any word — is the",
    ]
    for t in tests:
        print(f"{t!r}\n  → {plain_text(t)!r}")
