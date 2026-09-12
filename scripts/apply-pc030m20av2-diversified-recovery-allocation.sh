#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLANNER="$ROOT/mobile/app/goal-scenario-planner.js"
CHOICE="$ROOT/mobile/app/goal-recovery-choice.js"

echo "PC-030M20AV2 — Goal-Preserving Diversified Recovery Allocation"

[[ -f "$PLANNER" ]] || { echo "ERROR — goal-scenario-planner.js missing"; exit 1; }
[[ -f "$CHOICE" ]] || { echo "ERROR — goal-recovery-choice.js missing"; exit 1; }

python - "$PLANNER" "$CHOICE" <<'PY'
from pathlib import Path
import sys, re

planner = Path(sys.argv[1])
choice = Path(sys.argv[2])

planner_text = planner.read_text(encoding="utf-8")
choice_text = choice.read_text(encoding="utf-8")

# 1. Preserve saved target-sector evidence across the recovery handoff.
if "sectorTargetsJson:" not in planner_text:
    needle = 'largestSimulated: String(scenario?.concentration?.simulatedLargestPercentage ?? "")'
    if needle not in planner_text:
        raise SystemExit("ERROR — planner route params contract changed; no files modified.")
    planner_new = planner_text.replace(
        needle,
        needle + ',\n        sectorTargetsJson: JSON.stringify(sectorTargets || {})',
        1
    )
else:
    planner_new = planner_text

# 2. Goal recovery choice: carry target weights in route state.
if 'const sectorTargetsJson=first(params,["sectorTargetsJson","targetSectorWeights"]);' not in choice_text:
    needle = 'const annualReturnPercentage=num(first(params,["annualReturnPercentage","annualReturn","expectedAnnualReturn","returnPercentage"]))??8;'
    if needle not in choice_text:
        raise SystemExit("ERROR — AV1 goal-recovery-choice contract changed; no files modified.")
    choice_new = choice_text.replace(
        needle,
        needle + 'const sectorTargetsJson=first(params,["sectorTargetsJson","targetSectorWeights"]);',
        1
    )
else:
    choice_new = choice_text

# 3. Replace the YES handler with diversified-allocation navigation.
if "function openDiversifiedAllocation()" not in choice_new:
    marker = "function discussAllocationWithCoachG(){"
    idx = choice_new.find(marker)
    if idx < 0:
        raise SystemExit("ERROR — AV1 YES handler not found; no files modified.")
    injection = (
        'function openDiversifiedAllocation(){'
        'router.push({pathname:"/goal-recovery-allocation",params:{'
        'goalName,targetAmount:targetAmount??"",targetDate:targetDate||"",'
        'monthlyContribution:monthlyContribution??"",'
        'recoveryAmount:fundingNeed?.requiredNow??"",'
        'projectedShortfall:fundingNeed?.futureShortfall??projectedShortfall??"",'
        'sectorTargetsJson:sectorTargetsJson||""'
        '}});}'
    )
    choice_new = choice_new[:idx] + injection + choice_new[idx:]

choice_new = choice_new.replace(
    'onPress={discussAllocationWithCoachG}',
    'onPress={openDiversifiedAllocation}',
    1
)

# Backups only when source changes.
if planner_new != planner_text:
    planner.with_suffix(planner.suffix + ".pc030m20av2.bak").write_text(planner_text, encoding="utf-8")
    planner.write_text(planner_new, encoding="utf-8")
    print("UPDATED — Goal Recovery Simulator now carries saved sector-target evidence into the recovery flow.")
else:
    print("NO CHANGE — sector-target handoff already present.")

if choice_new != choice_text:
    choice.with_suffix(choice.suffix + ".pc030m20av2.bak").write_text(choice_text, encoding="utf-8")
    choice.write_text(choice_new, encoding="utf-8")
    print("UPDATED — YES recovery branch now opens diversified recovery allocation before Trade Lab.")
else:
    print("NO CHANGE — diversified recovery allocation handoff already present.")
PY

echo "PRESERVED — existing AV1 funding calculation."
echo "PRESERVED — canonical REAL wealth metrics and Coach G investment intelligence."
echo "PRESERVED — AU4C Floating Coach activation."
echo "PRESERVED — broker execution boundary; no order is created by AV2."
echo "PC-030M20AV2 applied successfully."
