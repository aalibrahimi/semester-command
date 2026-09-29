import json, sys, importlib, subprocess
mod = importlib.import_module(sys.argv[1])
figs = mod.figures()
g = {'sections': [{'id': k, 'blocks': [{'type': 'figure', 'id': k, 'svg': v[0], 'viewBox': v[1], 'caption': k}]} for k, v in figs.items()]}
p = f'../figprev/{sys.argv[1]}.json'
json.dump(g, open(p, 'w'))
subprocess.run(['python3', 'preview.py', p] + sys.argv[2:], check=True)
