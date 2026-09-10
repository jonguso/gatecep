#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AT2A — Trade Route Contract Correction"
[[ -f "$TRADE" ]] || { echo "ERROR — trade.js missing"; exit 1; }

python - "$TRADE" <<'PY'
from pathlib import Path
import re,sys

p=Path(sys.argv[1])
s=p.read_text(encoding="utf-8")

if "PC-030M20AT2A route-contract correction" in s:
    print("NO CHANGE — M20AT2A already installed")
    raise SystemExit(0)

# 1) service import
svc='import { deriveApproximateScenarioQuantity } from "../src/features/trading/decisionAmountQuantityService";'
if svc not in s:
    imports=list(re.finditer(r'^import\s+.*?;\s*$',s,re.M|re.S))
    if not imports:
        raise SystemExit("ERROR — trade import block not found")
    pos=imports[-1].end()
    s=s[:pos]+"\n"+svc+s[pos:]

# 2) current Trade contract destructures useLocalSearchParams directly.
m=re.search(r'const\s*\{([^}]*)\}\s*=\s*useLocalSearchParams\(\);',s,re.S)
if not m:
    raise SystemExit("ERROR — destructured useLocalSearchParams contract not found")

inside=m.group(1)
pieces=[x.strip() for x in inside.split(",") if x.strip()]
names=",".join(pieces)

needed=[]
if "requestedDecisionAmount" not in inside:
    needed.append("decisionAmount: requestedDecisionAmount")
if "decisionLabParam" not in inside:
    needed.append("decisionLab: decisionLabParam")

if needed:
    replacement="const { "+", ".join(pieces+needed)+" } = useLocalSearchParams();"
    s=s[:m.start()]+replacement+s[m.end():]

# Insert normalized params after useLocalSearchParams line.
anchor_match=re.search(r'const\s*\{[^}]*requestedDecisionAmount[^}]*decisionLabParam[^}]*\}\s*=\s*useLocalSearchParams\(\);',s,re.S)
if not anchor_match:
    raise SystemExit("ERROR — normalized route params insertion failed")

route_logic='''

  // PC-030M20AT2A route-contract correction
  const decisionAmountParam = Number(
    Array.isArray(requestedDecisionAmount)
      ? requestedDecisionAmount[0]
      : requestedDecisionAmount || 0
  );
  const decisionLabHandoff =
    String(
      Array.isArray(decisionLabParam)
        ? decisionLabParam[0]
        : decisionLabParam || ""
    ) === "1";
'''
s=s[:anchor_match.end()]+route_logic+s[anchor_match.end():]

# 3) track manual quantity edits explicitly.
state='const [quantityManuallyEdited, setQuantityManuallyEdited] = useState(false);'
if state not in s:
    qstate=re.search(r'const\s+\[quantity,\s*setQuantity\]\s*=\s*useState\([^;]*\);',s)
    if not qstate:
        raise SystemExit("ERROR — quantity state not found")
    s=s[:qstate.end()]+"\n  "+state+s[qstate.end():]

# 4) install one-time/evidence-responsive seeding effect after stock selection effect.
effect_anchor='''  }, [stocks, requestedSymbol]);'''
idx=s.find(effect_anchor)
if idx<0:
    raise SystemExit("ERROR — verified stock-selection effect anchor not found")
idx += len(effect_anchor)

effect='''

  useEffect(() => {
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

s=s[:idx]+effect+s[idx:]

# 5) mark quantity field as user-edited.
old='''          onChangeText={(value) => {
            setQuantity(value);
            setConfirmedTrade(null);
          }}'''
new='''          onChangeText={(value) => {
            setQuantityManuallyEdited(true);
            setQuantity(value);
            setConfirmedTrade(null);
          }}'''
if old not in s:
    raise SystemExit("ERROR — Quantity onChangeText anchor not found")
s=s.replace(old,new,1)

# 6) when stock is deliberately changed, allow a fresh calculation because price/security changed.
old_select='''  function selectStock(stock) {
    setSelectedStock(stock);
    setLimitPrice(String(stock.price));
    setConfirmedTrade(null);
    setSecurityPickerOpen(false);
  }'''
new_select='''  function selectStock(stock) {
    setSelectedStock(stock);
    setLimitPrice(String(stock.price));
    setQuantityManuallyEdited(false);
    setConfirmedTrade(null);
    setSecurityPickerOpen(false);
  }'''
if old_select in s:
    s=s.replace(old_select,new_select,1)

# 7) helper text under quantity field.
quantity_input='''        <TextInput
          value={quantity}
          onChangeText={(value) => {
            setQuantityManuallyEdited(true);
            setQuantity(value);
            setConfirmedTrade(null);
          }}
          keyboardType="numeric"
          placeholder="Quantity"
          placeholderTextColor="#64748b"
          style={styles.input}
        />'''
if quantity_input not in s:
    raise SystemExit("ERROR — updated Quantity TextInput anchor not found")

helper=quantity_input+'''
        {decisionLabHandoff &&
        decisionAmountParam > 0 &&
        Number(quantity) > 0 &&
        Number(selectedStock?.price || 0) > 0 ? (
          <Text style={styles.small}>
            Approx. {Number(quantity).toLocaleString()} shares from KES{" "}
            {decisionAmountParam.toLocaleString()} at KES{" "}
            {Number(selectedStock.price).toFixed(2)}.
            {" "}Editable; scenario estimate only.
          </Text>
        ) : null}'''
s=s.replace(quantity_input,helper,1)

p.write_text(s,encoding="utf-8")
print("UPDATED — M20AT2 now matches Trade's destructured useLocalSearchParams contract.")
print("UPDATED — Quantity auto-seeds from decision amount/current price and manual edits permanently win for that scenario.")
print("PRESERVED — SELL holding cap, BUY charge-aware budget, FIFO and Broker Action Plan boundaries.")
PY

echo "PC-030M20AT2A applied successfully."
