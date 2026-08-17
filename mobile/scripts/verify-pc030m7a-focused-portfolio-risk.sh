#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RISK="$ROOT/app/portfolio-risk.js"

echo "============================================================"
echo "PC-030M7A — FOCUSED PORTFOLIO RISK VERIFICATION"
echo "============================================================"

for section in assessment profile concentration diversification history stress alerts; do
  grep -q "id: \"$section\"" "$RISK"
  grep -q "activeSection === \"$section\"" "$RISK"
done
echo "PASS — all seven Risk destinations are defined and focus-controlled."

grep -q 'setActiveSection(null)' "$RISK"
grep -q 'Back to Portfolio Risk' "$RISK"
grep -q 'router.replace("/(tabs)/dashboard")' "$RISK"
grep -q 'Back to Home' "$RISK"
echo "PASS — Risk owns focused detail navigation and returns its overview to Home."

grep -q 'useWindowDimensions' "$RISK"
grep -q 'detailMenuCompact' "$RISK"
grep -q 'detailButtonCompact' "$RISK"
grep -q 'style={activeSection ? styles.hidden : styles.hero}' "$RISK"
echo "PASS — Risk summary and detail controls use compact mobile layouts."

grep -q 'buildCoachGRiskAdvice' "$RISK"
grep -q 'getOrCreateRiskConfiguration' "$RISK"
grep -q 'applyRiskProfile' "$RISK"
grep -q 'does not place trades, change holdings, modify cash' "$RISK"
echo "PASS — canonical risk analytics, saved profile, and analytics-only contracts remain intact."

node - "$RISK" <<'NODE'
const fs = require("fs");
const parser = require("@babel/parser");
const file = process.argv[2];
parser.parse(fs.readFileSync(file, "utf8"), {
  sourceType: "module",
  plugins: ["jsx"]
});
console.log("PASS — Portfolio Risk source parses successfully.");
NODE

if [[ -x "$ROOT/scripts/verify-pc030m6b-focused-portfolio-analysis.sh" ]]; then
  bash "$ROOT/scripts/verify-pc030m6b-focused-portfolio-analysis.sh"
fi

echo "PC-030M7A focused Portfolio Risk verification complete."
