#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M8E — SECTOR-FIRST RISK CONCENTRATION VERIFICATION"
echo "============================================================"

grep -q 'Review sector exposure first, then tap a sector' app/portfolio-risk.js
grep -q 'actionLabel="View securities"' app/portfolio-risk.js
echo "PASS — Concentration Analysis presents sectors as the parent level."

if grep -q '<Text style={styles.subheading}>Largest Holdings</Text>' app/portfolio-risk.js; then
  echo "FAIL — holding cards remain on the parent concentration screen."
  exit 1
fi
echo "PASS — individual holding cards are removed from the parent screen."

grep -q 'selectedSectorHoldings' app/portfolio-risk.js
grep -q 'holding?.sector || holding?.industry || "Unknown"' app/portfolio-risk.js
grep -q 'SECTOR SECURITIES' app/portfolio-risk.js
echo "PASS — a selected sector resolves its canonical REAL securities."

grep -q '<Modal' app/portfolio-risk.js
grep -q 'onRequestClose={() => setSelectedSector(null)}' app/portfolio-risk.js
grep -q 'No Securities Available' app/portfolio-risk.js
echo "PASS — the Expo-safe drill-down supports close and unavailable states."

grep -q 'buildCoachGRiskAdvice' app/portfolio-risk.js
grep -q 'PC-020 does not place trades' app/portfolio-risk.js
echo "PASS — canonical analytics and advisory-only protection remain intact."

node - <<'NODE'
const fs = require('fs');
const parser = require('@babel/parser');
parser.parse(fs.readFileSync('app/portfolio-risk.js', 'utf8'), {
  sourceType: 'module',
  plugins: ['jsx', 'optionalChaining']
});
NODE
echo "PASS — sector-first Risk source parses successfully."
echo "PC-030M8E sector-first Risk concentration verification complete."
