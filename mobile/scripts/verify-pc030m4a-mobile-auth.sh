#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030M4A — EXPO GO AUTH SCREEN VERIFICATION"
echo "============================================================"

for screen in app/login.js app/register.js; do
  grep -q 'SafeAreaView' "$screen"
  grep -q 'KeyboardAvoidingView' "$screen"
  grep -q 'keyboardShouldPersistTaps="handled"' "$screen"
  grep -q 'placeholderTextColor="#64748b"' "$screen"
  grep -q 'color: "#f8fafc"' "$screen"
  grep -q 'backgroundColor: "#020617"' "$screen"
  grep -q 'passwordVisible' "$screen"
done
echo "PASS — Login and Register define explicit native contrast and keyboard behavior."

grep -q 'await login({ email: email.trim(), password })' app/login.js
grep -q 'router.replace("/")' app/login.js
grep -q 'await register({ email: email.trim(), username: username.trim(), password })' app/register.js
grep -q 'router.replace("/onboarding/name")' app/register.js
echo "PASS — existing authentication actions and destination routes are preserved."

node --check app/login.js
node --check app/register.js
echo "PASS — authentication screen source parses successfully."

bash scripts/verify-pc030m4-expo-go.sh

echo "PC-030M4A Expo Go authentication screen verification complete."
