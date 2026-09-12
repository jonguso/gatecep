from pathlib import Path
import re, sys

root = Path(sys.argv[1])
p = root / "mobile/app/menu.js"
if not p.exists():
    raise SystemExit("ERROR — mobile/app/menu.js not found.")

s = p.read_text(encoding="utf-8")
orig = s
changed = False

# Strategy 1: object-shaped accordion state such as:
# useState({ primary: true, portfolio: false, ... })
patterns = [
    (r'(primary\s*:\s*)true', r'\1false'),
    (r'("Primary"\s*:\s*)true', r'\1false'),
    (r"('Primary'\s*:\s*)true", r'\1false'),
]
for pat, repl in patterns:
    ns, count = re.subn(pat, repl, s, count=1, flags=re.I)
    if count:
        s = ns
        changed = True
        break

# Strategy 2: single active/open section default.
if not changed:
    replacements = [
        ('useState("primary")', 'useState(null)'),
        ("useState('primary')", 'useState(null)'),
        ('useState("Primary")', 'useState(null)'),
        ("useState('Primary')", 'useState(null)'),
    ]
    for old, new in replacements:
        if old in s:
            s = s.replace(old, new, 1)
            changed = True
            break

# Strategy 3: array/set of initially-open sections.
if not changed:
    array_patterns = [
        r'useState\(\[\s*"primary"\s*\]\)',
        r"useState\(\[\s*'primary'\s*\]\)",
        r'useState\(\[\s*"Primary"\s*\]\)',
        r"useState\(\[\s*'Primary'\s*\]\)",
    ]
    for pat in array_patterns:
        ns, count = re.subn(pat, 'useState([])', s, count=1)
        if count:
            s = ns
            changed = True
            break

if not changed:
    raise SystemExit(
        "ERROR — could not identify the Primary default-expanded state safely. "
        "No runtime file changed."
    )

p.with_suffix(p.suffix + ".pc030m20av3a.bak").write_text(orig, encoding="utf-8")
p.write_text(s, encoding="utf-8")

print("PC-030M20AV3A — Menu Default Collapse")
print("UPDATED — Primary no longer opens expanded by default.")
print("PRESERVED — accordion toggle behavior.")
print("PRESERVED — all menu routes and AV3 Holdings/Rebalancing entries.")
print("PRESERVED — no navigation, portfolio, recovery, fee, or execution logic changes.")
