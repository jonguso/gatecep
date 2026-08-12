#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PORTFOLIO COMMAND CENTER COMPATIBILITY ====="

grep -n \
  'Legacy compatibility route\|router.replace("/portfolio-hub")\|Opening Portfolio Hub' \
  app/portfolio-command-center.js

echo
echo "===== PORTFOLIO ANALYSIS COMPATIBILITY ====="

grep -n \
  'Legacy compatibility route\|router.replace("/(tabs)/coach")\|Opening Coach G' \
  app/portfolio-analysis.js

echo
echo "===== PROFILE CANONICAL PORTFOLIO ====="

grep -n -A5 -B4 \
  'Open Portfolio Hub' \
  app/my-profile.js

echo
echo "===== LIVE DASHBOARD SPECIALIZED ANALYTICS ====="

grep -n -A4 -B4 \
  'Portfolio Analytics' \
  app/live-dashboard.js

echo
echo "===== ACTIVE COMMAND CENTER CALLERS ====="

python - <<'PY'
from pathlib import Path

root = Path.home() / "gatecep/mobile"

found = []

for base in [
    root / "app",
    root / "src"
]:
    for path in (
        list(base.rglob("*.js")) +
        list(base.rglob("*.jsx"))
    ):
        text = path.read_text(
            encoding="utf-8",
            errors="ignore"
        )

        if '"/portfolio-command-center"' in text:
            found.append(
                path.relative_to(root).as_posix()
            )

print("Found:", found)

if found:
    raise SystemExit(
        "ERROR: active command-center callers remain."
    )

print(
    "PASS — Portfolio Command Center is compatibility-only."
)
PY

echo
echo "===== ACTIVE PORTFOLIO ANALYSIS CALLERS ====="

python - <<'PY'
from pathlib import Path

root = Path.home() / "gatecep/mobile"

found = []

for base in [
    root / "app",
    root / "src"
]:
    for path in (
        list(base.rglob("*.js")) +
        list(base.rglob("*.jsx"))
    ):
        text = path.read_text(
            encoding="utf-8",
            errors="ignore"
        )

        if '"/portfolio-analysis"' in text:
            found.append(
                path.relative_to(root).as_posix()
            )

print("Found:", found)

if found:
    raise SystemExit(
        "ERROR: active portfolio-analysis callers remain."
    )

print(
    "PASS — Portfolio Analysis is compatibility-only."
)
PY

echo
echo "===== UNIFIED ANALYTICS NOW REACHABLE ====="

grep -Rni \
  '"/unified-portfolio-analytics"' \
  app src \
  --include="*.js" \
  --include="*.jsx"

echo
echo "===== LIVE DASHBOARD STILL REACHABLE ====="

grep -Rni \
  '"/live-dashboard"' \
  app src \
  --include="*.js" \
  --include="*.jsx"

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== BACKUPS INSIDE APP ====="

COUNT="$(
  find app \
    -type f \
    -iname '*bak*' \
    | wc -l
)"

echo "Count: $COUNT"

if [ "$COUNT" -ne 0 ]; then
  find app -type f -iname '*bak*'
  exit 1
fi

echo
echo "PC-030C1 verification complete."
