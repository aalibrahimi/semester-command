"""Run every code block in the given guides: solution must pass its check,
starter must not; try-cells must run without error."""
import json, sys, types, traceback, io, contextlib
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
plt.show = lambda *a, **k: None
_sc = types.ModuleType("_sc")
def last():
    n = plt.get_fignums()
    return plt.figure(n[-1]) if n else None
_sc.last = last
sys.modules["_sc"] = _sc

def run(setup, code, check):
    plt.close("all")
    ns = {}
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            if setup: exec(compile(setup, "<setup>", "exec"), ns)
            exec(compile(code, "<cell>", "exec"), ns)
    except Exception as e:
        return "error", f"{type(e).__name__}: {e}"
    if check:
        try:
            with contextlib.redirect_stdout(out):
                exec(compile(check, "<check>", "exec"), ns)
        except AssertionError as e:
            return "fail", str(e)
        except Exception as e:
            return "checkerr", f"{type(e).__name__}: {e}"
        return "pass", out.getvalue()[-200:]
    return "ok", out.getvalue()[-200:]

bad = 0
for path in sys.argv[1:]:
    g = json.load(open(path))
    for s in g["sections"]:
        for b in s["blocks"]:
            if b["type"] != "code": continue
            name = f'{g["id"]} :: {b["title"]}'
            if "check" in b:
                r, m = run(b.get("setup"), b["solution"], b["check"])
                if r != "pass": bad += 1; print("SOLUTION FAILS", name, r, m)
                r2, m2 = run(b.get("setup"), b["starter"], b["check"])
                if r2 == "pass": bad += 1; print("STARTER PASSES", name)
                elif r2 == "checkerr": bad += 1; print("STARTER CHECKERR", name, m2)
                else: print("ok  ", name, "| starter ->", r2, (m2 or "")[:90].replace("\n", " "))
            else:
                r, m = run(b.get("setup"), b["starter"], None)
                if r != "ok": bad += 1; print("TRY FAILS", name, m)
                else: print("ok  ", name, "(try)")
print("BAD:", bad)
