#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PROFILE + BROKER CONTRACT FIX VERIFICATION"
echo "============================================================"

EDIT="app/investor-profile-edit.js"
PROFILE="app/my-profile.js"
BROKERS="src/features/brokers/api/userBrokerApi.js"
CONTRACT="src/features/profile/investorProfileContract.js"

for forbidden in \
  monthlyContribution \
  goalTarget \
  riskScore \
  confidence \
  brokerRecommendation
do
  if grep -Eq "^[[:space:]]*$forbidden[,}]" "$EDIT"; then
    echo "FAIL — undefined save field remains: $forbidden"
    exit 1
  fi
done

grep -q 'const { user } = useAuth();' "$EDIT"
grep -q 'userGetItem("investorProfile")' "$EDIT"
grep -q 'mergeProfileSources(cloud, local)' "$EDIT"
grep -q 'mergeInvestorProfileStorage(existing, profile)' "$EDIT"
grep -q 'await userSetItem' "$EDIT"
grep -q 'saveInvestorProfile(profile)' "$EDIT"
grep -q 'router.replace("/my-profile")' "$EDIT"
echo "PASS — investor edit saves locally before deferred cloud sync."

grep -q 'Array.isArray(brokerResult)' "$PROFILE"
grep -q 'profile?.marketDrop' "$PROFILE"
grep -q 'profile?.amount' "$PROFILE"
grep -q 'mergeProfileSources' "$PROFILE"
echo "PASS — My Profile uses the shared canonical display contract."

node scripts/test-investor-profile-contract.mjs

grep -q 'brokers: cloudBrokers' "$BROKERS"
grep -q 'brokers: await loadLocalBrokerFallback()' "$BROKERS"
grep -q 'source: "LOCAL_PROFILE"' "$BROKERS"
echo "PASS — broker loader returns one consistent object contract."

python scripts/audit-pc029c-visible-routes.py

EXPO_STATE="${GATECEP_EXPO_STATE:-${TMPDIR:-/tmp}/gatecep-expo-state}"
mkdir -p "$EXPO_STATE"
CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  npx expo export --platform web

echo "Profile + broker contract verification complete."
