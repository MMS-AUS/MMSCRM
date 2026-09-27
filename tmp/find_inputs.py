import os
import re

files = []
for root, _, filenames in os.walk('src'):
    for fn in filenames:
        if fn.endswith('.tsx') or fn.endswith('.jsx'):
            files.append(os.path.join(root, fn))

results = []

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        if '<input' in line or '<select' in line or '<textarea' in line:
            # check window of 10 lines around it
            start = max(0, i - 6)
            end = min(len(lines), i + 7)
            window = lines[start:end]
            has_icon = any('absolute' in l and ('left-' in l or 'left: ' in l or 'left-[' in l or 'inset-y' in l) for l in window)
            # also check if there is an icon tag inside the same div
            if has_icon:
                # find icon line and input line
                icon_line = [l.strip() for l in window if 'absolute' in l and ('left-' in l or 'inset-y' in l)]
                input_snippet = ''.join(lines[i:min(len(lines), i+6)])
                # find className
                m = re.search(r'className=(?:\{`|["\'])([^"`\'\}]+)', input_snippet)
                cls = m.group(1) if m else "NO_CLASS"
                results.append({
                    'file': fpath,
                    'line': i + 1,
                    'icon': icon_line,
                    'class': cls
                })

for r in results:
    print(f"{r['file']}:{r['line']}")
    print(f"  Icon: {r['icon']}")
    print(f"  Class: {r['class']}")
    print("-" * 50)
