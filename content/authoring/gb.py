"""Guide builder: spec dict (no ids) -> guide JSON with stable ids."""
import json, sys, os
from _paths import GUIDES as _GUIDES, SNAPSHOTS as _SNAPSHOTS
OUT = str(_GUIDES)

def fnv(s):
    h = 0x811c9dc5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xffffffff
    return f"{h:08x}"

PRIMARY = {"prose": "md", "definition": "term", "table": "columns", "example": "title", "trap": "body",
           "check": "prompt", "stepper": "title", "figure": "caption", "sim": "caption", "code": "title", "diagram": "caption", "video": "caption"}

def text_of(b):
    v = b.get(PRIMARY[b["type"]])
    if isinstance(v, list): v = "|".join(v)
    if b["type"] == "sim": v = b["sim"] + v
    return b["type"] + v

def build(g):
    for s in g["sections"]:
        seen = set()
        for b in s["blocks"]:
            base = f'{s["id"]}.{fnv(text_of(b))}'
            bid, k = base, 2
            while bid in seen: bid = f"{base}-{k}"; k += 1
            seen.add(bid)
            if b["type"] == "check": b.setdefault("sectionRef", s["id"])
            b["id"] = bid
    g.setdefault("exercises", [])
    g.setdefault("requires", [])
    # Plain punctuation, applied after the ids above so they never move.
    from typography import plain
    g.update(plain(g))
    path = os.path.join(OUT, g["id"].replace("/", "--") + ".json")
    with open(path, "w") as f:
        f.write(json.dumps(g, ensure_ascii=False, indent=2) + "\n")
    n = sum(len(s["blocks"]) for s in g["sections"])
    print(f"wrote {path}: {len(g['sections'])} sections, {n} blocks, {len(g['exercises'])} exercises")
    left = sum(1 for _ in __import__("re").finditer("\u2014(?![^\\s\u2014]{1,8}\u2192)", json.dumps(g, ensure_ascii=False)))
    if left: print("  WARNING: em dash present", left)

# small helpers for readable specs
def P(md, slide=None, why=False, notes=None):
    b = {"type": "prose", "md": md}
    if why: b["label"] = "why"
    if slide: b["slide"] = slide
    if notes: b["slideNotes"] = notes
    return b
def D(term, body, slide=None):
    b = {"type": "definition", "term": term, "body": body}
    if slide: b["slide"] = slide
    return b
def T(columns, rows, title=None, slide=None):
    b = {"type": "table", "columns": columns, "rows": rows}
    if title: b["title"] = title
    if slide: b["slide"] = slide
    return b
def E(title, body, answer=None, slide=None):
    b = {"type": "example", "title": title, "body": body}
    if answer: b["answer"] = answer
    if slide: b["slide"] = slide
    return b
def TRAP(body, source, points=None, slide=None):
    b = {"type": "trap", "body": body, "source": source, "points": points}
    if slide: b["slide"] = slide
    return b
def C(prompt, answer, ref=None):
    b = {"type": "check", "prompt": prompt, "answer": answer}
    if ref: b["sectionRef"] = ref
    return b
def ST(title, frames, slide=True):
    b = {"type": "stepper", "title": title, "frames": frames}
    if slide: b["slide"] = slide
    return b
def SIM(sim, caption, params=None, slide="Try it"):
    b = {"type": "sim", "sim": sim, "caption": caption, "params": params or {}}
    if slide: b["slide"] = slide
    return b
def FIG(svg, viewBox, caption, slide=None):
    b = {"type": "figure", "svg": svg, "viewBox": viewBox, "caption": caption}
    if slide: b["slide"] = slide
    return b
def arr(cells, caption, hl=None, done=None, note=None):
    f = {"kind": "array", "cells": cells, "caption": caption}
    if hl is not None: f["hl"] = hl
    if done is not None: f["done"] = done
    if note: f["note"] = note
    return f
def lines(ls, active, caption):
    return {"kind": "lines", "lines": ls, "active": active, "caption": caption}
def EX(id, title, prompt, hints, solution, why, choices=None, answer=None, ref=None, code=None, accept=None):
    e = {"id": id, "title": title, "prompt": prompt, "hints": hints, "solution": solution, "why": why}
    if accept: e["accept"] = accept
    if choices: e["choices"] = choices; e["answer"] = answer
    if ref: e["sectionRef"] = ref
    if code: e["code"] = code
    return e

GUIDES = str(_GUIDES)
def old(slug, bid, **over):
    """Reuse a block from the current guide (figures, sims), with em dashes cleaned."""
    import json as _j
    g = _j.load(open(_SNAPSHOTS / f"{slug}.json"))  # legacy: pre-rewrite guide copies; add them to snapshots/ to rebuild
    for s in g["sections"]:
        for b in s["blocks"]:
            if b["id"] == bid:
                b = dict(b); b.pop("id")
                for k in ("caption", "body", "md"):
                    if k in b and isinstance(b[k], str):
                        b[k] = b[k].replace(" — ", ": ").replace("—", ", ")
                if b.get("type") == "figure":
                    b["svg"] = b["svg"].replace(" — ", ": ").replace("—", ", ")
                b.update(over)
                return b
    raise KeyError(bid)
def WORDS(rows):
    return T(["Word", "Plain meaning"], rows, title="Words from this chapter", slide="Words from this chapter")

def MC(id, title, prompt, options, correct, feedback, solution, why, hints=None, ref=None):
    """Multiple choice. options: list of str; correct: index; feedback: list of str (one per option)."""
    return EX(id, title, prompt, hints or ["Read each option out loud and cross off the ones that are clearly wrong.", "The chapter's cards in this section have the exact fact you need.", "Pick the one that matches the definition word for word."], solution, why,
              choices=[{"text": o, "feedback": f} for o, f in zip(options, feedback)], answer=correct, ref=ref)
def FILL(id, title, prompt, accept, hints, solution, why, ref=None):
    return EX(id, title, prompt, hints, solution, why, accept=accept, ref=ref)

def PY(title, task, starter, check=None, solution=None, setup=None, hints=None, success=None):
    """A runnable Python cell. With check: an exercise (asserts with plain messages)."""
    b = {"type": "code", "title": title, "task": task, "starter": starter.strip("\n") + "\n"}
    if setup: b["setup"] = setup.strip("\n")
    if check: b["check"] = check.strip("\n")
    if solution: b["solution"] = solution.strip("\n") + "\n"
    if hints: b["hints"] = hints
    if success: b["success"] = success
    return b
