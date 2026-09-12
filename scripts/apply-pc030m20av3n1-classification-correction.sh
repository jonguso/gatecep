#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3N1 — Residual Audit Classification Correction"
cp "$ROOT/mobile/scripts/audit-pc030m20av3n-responsive-residuals.mjs" \
   "$ROOT/mobile/scripts/audit-pc030m20av3n-responsive-residuals.mjs.pc030m20av3n1.bak"
cp "$ROOT/mobile/scripts/audit-pc030m20av3n-responsive-residuals.mjs.pc030m20av3n1.new" \
   "$ROOT/mobile/scripts/audit-pc030m20av3n-responsive-residuals.mjs"
echo "UPDATED — onboarding/signup classification in the AV3N audit only."
echo "PRESERVED — no GateCEP application source files are modified."
echo "PC-030M20AV3N1 applied successfully."
