#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028U POLICY ====="

grep -n \
  "classifyBehaviorHistoryRecord\|filterRealBehaviorHistory\|buildBehaviorHistorySourceAudit\|practiceAccepted\|unknownAccepted" \
  src/features/wealth-journey/realBehaviorHistorySourcePolicy.js

echo
echo "===== SYNTAX ====="

node --check \
  src/features/wealth-journey/realBehaviorHistorySourcePolicy.js

echo
echo "PC-028U source-policy verification complete."
