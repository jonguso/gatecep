#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "===== MOBILE UI SHARED COMPONENTS ====="
sed -n '1,360p' mobile/src/components/mobile/MobileUI.js

echo
echo "===== COACH G INSIGHTS ====="
sed -n '1,420p' mobile/app/coach-insights.js

echo
echo "===== PERFORMANCE ====="
sed -n '1,420p' mobile/app/performance.js

echo
echo "===== COACH G TAB ====="
sed -n '1,520p' mobile/app/\(tabs\)/coach.js

echo
echo "===== GOAL SCENARIO PLANNER ====="
sed -n '1,420p' mobile/app/goal-scenario-planner.js

echo
echo "===== RESPONSIVE / WINDOW USAGE ====="
grep -RniE \
'useWindowDimensions|Dimensions\.get|windowWidth|maxWidth|minWidth|width:|height:|flexWrap|numColumns' \
mobile/app/coach-insights.js \
mobile/app/performance.js \
mobile/app/\(tabs\)/coach.js \
mobile/app/goal-scenario-planner.js \
mobile/src/components/mobile/MobileUI.js \
--include="*.js" --include="*.jsx" || true

echo
echo "===== FIXED WIDTH / HEIGHT HOTSPOTS ====="
grep -RniE \
'width:[[:space:]]*[0-9]{3,}|height:[[:space:]]*[0-9]{3,}|minWidth:[[:space:]]*[0-9]{3,}|maxWidth:[[:space:]]*[0-9]{3,}' \
mobile/app \
mobile/src/components \
--include="*.js" --include="*.jsx" | head -300 || true

echo
echo "===== CONTENT CONTAINER PATTERNS ====="
grep -RniE \
'contentContainerStyle|ContainedPanel|useWindowDimensions|maxWidth|alignSelf|flexWrap' \
mobile/app/broker-accounts.js \
mobile/app/goal-recovery-preview.js \
mobile/app/coach-insights.js \
mobile/app/performance.js \
mobile/app/\(tabs\)/coach.js \
mobile/app/goal-scenario-planner.js \
--include="*.js" --include="*.jsx" || true
