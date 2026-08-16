#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030M4 — EXPO GO MOBILE READINESS VERIFICATION"
echo "============================================================"

grep -q '"name": "GateCEP"' app.json
grep -q '"scheme": "gatecep"' app.json
grep -q '"orientation": "portrait"' app.json
grep -q '"userInterfaceStyle": "dark"' app.json
grep -q '"package": "com.gatecep.mobile"' app.json
grep -q '"bundleIdentifier": "com.gatecep.mobile"' app.json
echo "PASS — explicit Android and iOS Expo identity is configured."

grep -q 'GestureHandlerRootView' app/_layout.js
grep -q 'SafeAreaProvider' app/_layout.js
grep -q 'StatusBar' app/_layout.js
grep -q 'react-native-safe-area-context' src/components/mobile/MobileUI.js
echo "PASS — the native gesture, safe-area, and status-bar shell is active."

if grep -q '10\.0\.0\.168' src/config/apiConfig.js; then
  echo "FAIL — API configuration still contains the old fixed LAN address."
  exit 1
fi
grep -q 'Constants.expoConfig?.hostUri' src/config/apiConfig.js
grep -q 'return PROD_API_URL' src/config/apiConfig.js
echo "PASS — Expo Go discovers a current LAN host and otherwise fails over to production."

node --check app/_layout.js
node --check src/config/apiConfig.js
node --check src/components/mobile/MobileUI.js

EXPO_STATE="${GATECEP_EXPO_STATE:-${TMPDIR:-/tmp}/gatecep-expo-pc030m4}"
mkdir -p "$EXPO_STATE"

CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  ./node_modules/.bin/expo-doctor
echo "PASS — Expo Doctor reports a compatible SDK dependency set."

ANDROID_DIST="$(mktemp -d "${TMPDIR:-/tmp}/gatecep-android-XXXXXX")"
IOS_DIST="$(mktemp -d "${TMPDIR:-/tmp}/gatecep-ios-XXXXXX")"

CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  ./node_modules/.bin/expo export --platform android --output-dir "$ANDROID_DIST"
test -n "$(find "$ANDROID_DIST" -type f -name '*.hbc' -print -quit)"
echo "PASS — Android Hermes bundle exported successfully."

CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  ./node_modules/.bin/expo export --platform ios --output-dir "$IOS_DIST"
test -n "$(find "$IOS_DIST" -type f -name '*.hbc' -print -quit)"
echo "PASS — iOS Hermes bundle exported successfully."

bash scripts/verify-pc030m3c-mobile.sh

echo "PC-030M4 Expo Go mobile readiness verification complete."
