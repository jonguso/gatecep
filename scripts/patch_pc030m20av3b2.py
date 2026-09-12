from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
p = root / "mobile/app/goal-scenario-planner.js"

if not p.exists():
    raise SystemExit("ERROR — mobile/app/goal-scenario-planner.js not found.")

s = p.read_text(encoding="utf-8")
orig = s

pattern = re.compile(
    r"(av3bTitleNarrow\s*:\s*\{[\s\S]*?lineHeight\s*:\s*31\s*\})\s*(av3bInputGrid\s*:)"
)

s, count = pattern.subn(r"\1,\n  \2", s, count=1)

if count == 0:
    already_fixed = re.search(
        r"av3bTitleNarrow\s*:\s*\{[\s\S]*?lineHeight\s*:\s*31\s*\}\s*,\s*av3bInputGrid\s*:",
        s
    )
    if not already_fixed:
        raise SystemExit(
            "ERROR — expected AV3B1 responsive style boundary was not found. No file changed."
        )

s = re.sub(r"\}\s*,\s*,\s*av3bInputGrid\s*:", "},\n  av3bInputGrid:", s, count=1)

if s != orig:
    backup = p.with_suffix(p.suffix + ".pc030m20av3b2.bak")
    if not backup.exists():
        backup.write_text(orig, encoding="utf-8")
    p.write_text(s, encoding="utf-8")
    print("UPDATED — inserted the missing comma before av3bInputGrid.")
else:
    print("NO CHANGE — the AV3B2 comma repair is already present.")

print("PRESERVED — Goal Scenario Planner calculations, routing, inputs, and responsive styles.")
print("PRESERVED — no other GateCEP files changed.")
