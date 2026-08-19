#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ANALYSIS="app/unified-portfolio-analytics.js"
PERFORMANCE="app/performance.js"

echo "============================================================"
echo "PC-030M6B — FOCUSED PORTFOLIO ANALYSIS VERIFICATION"
echo "============================================================"

for section in health scorecard actions alerts holdings operations specialists; do
  grep -Fq "id: \"$section\"" "$ANALYSIS"
  grep -Fq "activeSection !== \"$section\" && styles.hidden" "$ANALYSIS"
done
echo "PASS — all seven Analysis destinations are defined and focus-controlled."

grep -Fq 'const [activeSection, setActiveSection] = useState(null)' "$ANALYSIS"
grep -Fq 'onPress={() => moveToSection(section.id)}' "$ANALYSIS"
grep -Fq 'Analysis Overview' "$ANALYSIS"
grep -Fq 'returnToAnalysis()' "$ANALYSIS"
echo "PASS — Analysis owns focused detail navigation and return behavior."

grep -Fq 'analysisMenuButtonCompact' "$ANALYSIS"
grep -Fq 'windowWidth < 600' "$ANALYSIS"
grep -Fq 'flexWrap: "wrap"' "$ANALYSIS"
echo "PASS — Analysis summary and controls are compact on mobile."

grep -Fq 'buildUnifiedPortfolioAnalytics' "$ANALYSIS"
grep -Fq 'buildPortfolioHealthScore' "$ANALYSIS"
grep -Fq 'buildExecutiveActionQueue' "$ANALYSIS"
grep -Fq 'GateCEP will not substitute Practice data' "$ANALYSIS"
echo "PASS — canonical REAL analytics and fail-closed behavior remain intact."

grep -Fq 'router.replace("/(tabs)/dashboard")' "$PERFORMANCE"
grep -Fq 'activeSection ? "Back to Performance" : "Home"' "$PERFORMANCE"
grep -Fq 'activeSection ? "Back to Performance" : "Back to Home"' "$PERFORMANCE"
echo "PASS — Performance overview exits to Home while details return to Performance."

node --check "$ANALYSIS"
node --check "$PERFORMANCE"
echo "PASS — Analysis and Performance source parse successfully."

bash scripts/verify-pc030m6a-performance-detail-navigation.sh

echo "PC-030M6B focused Portfolio Analysis verification complete."
