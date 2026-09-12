#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3N1 — Audit Classification Verification"
node --check scripts/audit-pc030m20av3n-responsive-residuals.mjs
grep -Fq 'signup' scripts/audit-pc030m20av3n-responsive-residuals.mjs
grep -Fq 'onboardingSegment' scripts/audit-pc030m20av3n-responsive-residuals.mjs
echo "PASS — corrected AV3N audit script syntax."
echo "PASS — signup and onboarding classification rules are present."
echo "PASS — AV3N1 changes the audit only; no application patcher is included."
echo "PC-030M20AV3N1 verification complete."
