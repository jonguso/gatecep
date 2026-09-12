#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AT2B — existingHolding initialization-order hotfix"
[[ -f "$TRADE" ]] || { echo "ERROR — trade.js missing"; exit 1; }

python - "$TRADE" <<'PY'
from pathlib import Path
import sys

p=Path(sys.argv[1])
s=p.read_text(encoding="utf-8")

marker="PC-030M20AT2B initialization-order hotfix"
if marker in s:
    print("NO CHANGE — M20AT2B already installed")
    raise SystemExit(0)

effect='''  useEffect(() => {
    if (!decisionLabHandoff) return;
    if (!(decisionAmountParam > 0)) return;
    if (quantityManuallyEdited) return;

    const currentScenarioPrice = Number(
      selectedStock?.price ||
      selectedStock?.lastPrice ||
      selectedStock?.currentPrice ||
      0
    );

    if (!(currentScenarioPrice > 0)) return;

    const derived = deriveApproximateScenarioQuantity({
      side,
      decisionAmount: decisionAmountParam,
      currentPrice: currentScenarioPrice,
      availableQuantity: Number(
        existingHolding?.quantity ||
        existingHolding?.shares ||
        0
      ),
      percentChargeRate:
        side === "BUY"
          ? (Number(BROKER_EVIDENCED_FEE_POLICY.commissionRatePct || 0) +
             Number(BROKER_EVIDENCED_FEE_POLICY.otherChargesRatePct || 0)) / 100
          : 0,
      fixedCharges: Number(scenarioExtraCharges || 0),
      existingQuantityText: ""
    });

    if (derived.available && derived.quantity > 0) {
      setQuantity(String(derived.quantity));
      setConfirmedTrade(null);
    }
  }, [
    decisionLabHandoff,
    decisionAmountParam,
    side,
    selectedStock?.symbol,
    selectedStock?.price,
    existingHolding?.quantity,
    existingHolding?.shares,
    scenarioExtraCharges,
    quantityManuallyEdited
  ]);'''

if effect not in s:
    raise SystemExit("ERROR — M20AT2A auto-seed effect not found; refusing unsafe hotfix")

s=s.replace(effect,"",1)

anchor='''  const fifoEvidence = useMemo('''
idx=s.find(anchor)
if idx < 0:
    raise SystemExit("ERROR — fifoEvidence anchor not found")

safe='''  // PC-030M20AT2B initialization-order hotfix
  // Must stay after existingHolding is initialized.
'''+effect

s=s[:idx]+safe+"\n\n"+s[idx:]
p.write_text(s,encoding="utf-8")

print("UPDATED — approximate-quantity effect now appears after existingHolding initialization.")
print("PRESERVED — quantity handoff, manual-edit protection, FIFO and Broker Action Plan boundaries.")
PY

echo "PC-030M20AT2B applied successfully."
