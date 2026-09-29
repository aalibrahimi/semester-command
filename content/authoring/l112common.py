"""Shared bits for the LING 112 from-zero rebuilds."""
import sys, json
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from h15common import *  # noqa

from _paths import SNAPSHOTS
AUTH = str(SNAPSHOTS)
A = "rgb(var(--accent-fg))"
G = "rgb(var(--on-track))"
R = "rgb(var(--critical))"
Y = "rgb(var(--at-risk))"
FONT = "font-family='ui-sans-serif, system-ui' fill='currentColor'"


def soft(col, a):
    return col[:-1] + f" / {a})"


class Orig:
    def __init__(self, n):
        self.g = json.load(open(f"{AUTH}/orig-ling112-{n}.json"))

    def block(self, bid, **over):
        for s in self.g["sections"]:
            for b in s["blocks"]:
                if b["id"] == bid:
                    b = clean(dict(b)); b.pop("id")
                    b.update(over)
                    return b
        raise KeyError(bid)

    def exercises(self):
        return [clean(e) for e in self.g["exercises"]]


def finish(g):
    for e in g["exercises"]:
        if isinstance(e.get("solution"), str): e["solution"] = [e["solution"]]
    build(g)
