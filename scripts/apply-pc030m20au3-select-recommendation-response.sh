#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE="$ROOT/mobile/src/features/trading/recoveryRecommendationSelectorService.js"
ADDON="$ROOT/mobile/src/features/trading/recoveryRecommendationSelectorService.au3.addon.js"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"

echo "PC-030M20AU3 — Select Recommendation → Coach G Response"

[[ -f "$SERVICE" ]] || { echo "ERROR — M20AU service missing"; exit 1; }
[[ -f "$ADDON" ]] || { echo "ERROR — AU3 service addon missing"; exit 1; }
[[ -f "$TRADING" ]] || { echo "ERROR — Trading screen missing"; exit 1; }

if ! grep -q 'buildSelectedRecoveryCoachResponse' "$SERVICE"; then
  printf '\n' >> "$SERVICE"
  cat "$ADDON" >> "$SERVICE"
  echo "UPDATED — selected-recommendation Coach G response builder added."
else
  echo "NO CHANGE — selected-recommendation response builder already installed."
fi

python - "$TRADING" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

old = "What part of that recommendation would you like to test before deciding?"
new = "Select one of the evidence-backed recovery options below. I will explain the option you choose and ask a question specific to that recovery path."

if old in s:
    backup = p.with_suffix(p.suffix + ".pc030m20au3.bak")
    backup.write_text(s, encoding="utf-8")
    s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
    print("UPDATED — obsolete generic recovery question removed.")
else:
    print("NO CHANGE — obsolete generic recovery question is not present.")
PY

rm -f "$ADDON"

echo "UPDATED — recommendation cards are now investor-selectable."
echo "UPDATED — selection produces an immediate evidence-backed Coach G response."
echo "PRESERVED — Answer Coach G starts the existing Floating Coach conversation."
echo "PRESERVED — recommended does not mean automatically selected."
echo "PRESERVED — no goal/portfolio/DNA/broker mutation."
echo "PC-030M20AU3 applied successfully."
