#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20C — PRODUCTION DEPENDENCY SECURITY"
echo "============================================================"
node scripts/test-pc030m20c-production-dependency-security.mjs
node scripts/check-production-readiness.mjs
echo "PC-030M20C production dependency security verification complete."
