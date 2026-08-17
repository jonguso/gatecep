#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCREEN="app/performance.js"

echo "============================================================"
echo "PC-030M6A — PERFORMANCE DETAIL NAVIGATION VERIFICATION"
echo "============================================================"

for section in timeline historical benchmark goal records milestones drawdown health snapshots; do
  grep -Fq "id: \"$section\"" "$SCREEN"
done
echo "PASS — all nine Performance detail destinations are defined."

grep -Fq 'const [activeSection, setActiveSection] = useState(null)' "$SCREEN"
grep -Fq 'onPress={() => setActiveSection(section.id)}' "$SCREEN"
grep -Fq 'Back to Performance' "$SCREEN"
grep -Fq 'setActiveSection(null)' "$SCREEN"
echo "PASS — Performance owns focused detail navigation and return behavior."

for section in timeline historical benchmark goal drawdown health snapshots; do
  grep -Fq "activeSection !== \"$section\" && styles.hidden" "$SCREEN"
done
grep -Fq '!["records", "milestones"].includes(activeSection)' "$SCREEN"
grep -Fq 'activeSection !== "records" && styles.hidden' "$SCREEN"
grep -Fq 'activeSection !== "milestones" && styles.hidden' "$SCREEN"
echo "PASS — only the selected detail section is presented."

grep -Fq 'performanceMenuButtonCompact' "$SCREEN"
grep -Fq 'flexWrap: "wrap"' "$SCREEN"
grep -Fq 'windowWidth < 600' "$SCREEN"
echo "PASS — summary and detail controls use compact mobile layouts."

grep -Fq 'saveCanonicalRealPortfolioSnapshot' "$SCREEN"
grep -Fq 'buildHistoricalPerformanceSummary' "$SCREEN"
grep -Fq 'buildPerformanceBenchmarkGoalIntelligence' "$SCREEN"
echo "PASS — existing canonical snapshot, history, benchmark, and goal contracts remain in place."

node --check "$SCREEN"
echo "PASS — Performance source parses successfully."

bash scripts/verify-pc030m5d-sector-direction-dedup.sh

echo "PC-030M6A Performance detail navigation verification complete."
