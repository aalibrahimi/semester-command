"""Replace F(FG["key"], ...) lines in a chapter script by new code."""
import re, sys
def rewire(path, repl):
    s = open(path).read()
    lines = s.split("\n")
    out = []
    for ln in lines:
        m = re.match(r'\s*F\(FG\["(\w+)"\]', ln)
        if m and m.group(1) in repl:
            new = repl[m.group(1)]
            if new is None:
                continue
            out.append(new)
        else:
            out.append(ln)
    open(path, "w").write("\n".join(out))
