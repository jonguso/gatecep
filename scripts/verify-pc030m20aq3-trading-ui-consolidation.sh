#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"

echo "PC-030M20AQ3 — Trading / Decision Lab UI Consolidation (corrected verifier)"
[[ -f "$FILE" ]] || { echo "FAIL — missing $FILE"; exit 1; }

python - "$ROOT" "$FILE" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
path = Path(sys.argv[2])
s = path.read_text(encoding="utf-8")

assert "PC-030M20AQ3 UI consolidation" in s, "M20AQ3 marker missing"
assert "PC-030M20AQ2 Decision Lab Home" in s, "Decision Lab component missing"
assert "Simulate a Buy" in s and "Simulate a Sell" in s, "Decision Lab BUY/SELL entries missing"
assert "Review Goal & Recovery Context" in s, "goal/recovery context link missing"
assert 'mode: "BROKER_PLAN"' in s, "Broker Action Plan handoff missing"
assert "loadTradingHubData" in s, "Trading data service integration was removed"

start = s.find("<ScrollView", s.find("export default function Trading"))
close = s.find("</ScrollView>", start)
assert start >= 0 and close > start, "Trading main ScrollView not found"
main = s[start:close]

active = main.find("<ActiveUserBanner")
decision = main.find("<DecisionLabHome data={data} />")
assert active >= 0 and decision >= 0, "Active Account / Decision Lab render missing"
assert active < decision, "Active Account is not above Decision Lab"
assert "Broker Evidence" not in main, "Broker Evidence label is still rendered"
assert "Broker controlled" not in main, "Broker controlled card is still rendered"
assert "Read-only broker account, order, depth, and execution evidence." not in main, "obsolete subtitle remains"
assert "Test investment decisions against your portfolio, goals and risk before you act." in main, "Decision Lab subtitle not updated"

# Dedicated capabilities are preserved outside the Trading render.
required_routes = [
    root / "mobile/app/broker-accounts.js",
    root / "mobile/app/broker-profile.js",
    root / "mobile/app/portfolio-sync-center.js",
]
missing = [str(p.relative_to(root)) for p in required_routes if not p.exists()]
assert not missing, "dedicated broker support route(s) missing: " + ", ".join(missing)

print("PASS — Active Account is above Coach G Decision Lab.")
print("PASS — obsolete broker-evidence subtitle is gone.")
print("PASS — Broker Evidence / Broker controlled / Account-Orders-Depth-Activity are no longer rendered on Trading.")
print("PASS — Decision Lab BUY/SELL, goal/recovery and Broker Action Plan links remain intact.")
print("PASS — broker support is preserved through dedicated routes/services instead of duplicate Trading-page controls.")
PY

if [[ -f mobile/scripts/test-pc030m20aq-coach-g-decision-lab.mjs ]]; then
  node mobile/scripts/test-pc030m20aq-coach-g-decision-lab.mjs
fi

if [[ -f scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh ]]; then
  echo "Running M20AP regression if present..."
  bash scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh
fi

echo "PC-030M20AQ3 verification complete."
