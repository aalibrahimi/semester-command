"""Shared bits for the HIST 15 chapters: timeline animations, compare
diagrams, people cards, quiz items -> MC exercises."""
from c146common import *  # noqa  (gb, P, D, T, E, TRAP, C, ST, EX, MC, WHY, WORLD, THINK, WHEN, DG, build)


def TL(title, events, steps, meter=None, slide=True):
    """An animated timeline. events: [(year, title[, tone])];
    steps: [(at, caption[, meter_value])]; meter: dict(label, tone, low, high)."""
    ev = []
    for e in events:
        d = {"year": e[0], "title": e[1]}
        if len(e) > 2 and e[2]: d["tone"] = e[2]
        ev.append(d)
    frames = []
    for s in steps:
        f = {"kind": "timeline", "events": ev, "at": s[0], "caption": s[1]}
        if meter is not None and len(s) > 2:
            m = dict(meter); m["value"] = s[2]
            f["meter"] = m
        frames.append(f)
    return ST(title, frames, slide=slide)


def CMP(left, right, rows, caption, note=None, slide=None):
    """left/right: (title, sub, tone). rows: [(label, left, right)]."""
    def side(s):
        d = {"title": s[0]}
        if len(s) > 1 and s[1]: d["sub"] = s[1]
        if len(s) > 2 and s[2]: d["tone"] = s[2]
        return d
    data = {"left": side(left), "right": side(right), "rows": [{"label": r[0], "left": r[1], "right": r[2]} for r in rows]}
    if note: data["note"] = note
    return DG("compare", data, caption, slide=slide)


def CARDS(cards, caption, note=None, slide=None):
    """cards: [(title, badge, [lines], tone)]"""
    out = []
    for c in cards:
        d = {"title": c[0], "lines": c[2]}
        if c[1]: d["badge"] = c[1]
        if len(c) > 3 and c[3]: d["tone"] = c[3]
        out.append(d)
    data = {"cards": out}
    if note: data["note"] = note
    return DG("cards", data, caption, slide=slide)


def ROAD(question, steps, caption, eyebrow="The story", slide=None):
    """steps: [(title, sub, result, tone)]"""
    st = []
    for s in steps:
        d = {"title": s[0], "sub": s[1]}
        if len(s) > 2 and s[2]: d["result"] = s[2]
        if len(s) > 3 and s[3]: d["tone"] = s[3]
        st.append(d)
    return DG("roadmap", {"eyebrow": eyebrow, "question": question, "steps": st}, caption, slide=slide)


def MODEL(title, question, answer_paras, slide=None):
    """A model answer to a discussion question, hidden behind 'show answer'."""
    return E(title, question, answer="\n\n".join(answer_paras), slide=slide)
