from pathlib import Path
import sys

root = Path(sys.argv[1])
target = root / "mobile/app/goal-recovery-allocation.js"

if not target.exists():
    raise SystemExit(f"ERROR — required file missing: {target}")

src = target.read_text(encoding="utf-8")
orig = src

old = 'projectedShortfallBeforeRecovery: String(projectedShortfall || 0),'
new = 'projectedShortfallBeforeRecovery: String(Number(params?.projectedShortfall ?? params?.goalGap ?? 0) || 0),'

if old in src:
    src = src.replace(old, new, 1)
elif new in src:
    print("NO CHANGE — projected shortfall hotfix already present.")
else:
    raise SystemExit("ERROR — AV2E projectedShortfall anchor not found; no source changes written.")

# Also carry projected value when available so the preview can show the before-recovery goal projection.
if 'projectedValueBeforeRecovery:' not in src:
    anchor = new
    insert = new + '\n        projectedValueBeforeRecovery: String(Number(params?.projectedValue ?? 0) || 0),'
    src = src.replace(anchor, insert, 1)

if src != orig:
    target.with_suffix(target.suffix + ".pc030m20av2e1.bak").write_text(orig, encoding="utf-8")
    target.write_text(src, encoding="utf-8")
    print("UPDATED — projected portfolio handoff now reads shortfall from route params instead of an undefined local variable.")
    print("UPDATED — projected value is carried to the preview when available.")
