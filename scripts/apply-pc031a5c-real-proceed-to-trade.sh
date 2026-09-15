#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

python - <<'PY'
from pathlib import Path
import re

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing required file: {path}")
    return p.read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8", newline="\n")
    print(f"UPDATED {path}")

# ------------------------------------------------------------
# 1. Preserve decision-support metadata in basket items.
# ------------------------------------------------------------
path = "mobile/src/services/trade/tradeBasketStore.js"
s = read(path)

old = '''      price: Number(item.price || item.marketPrice || 0),
      reason: item.reason || "Coach G recommendation"
    }))'''

new = '''      price: Number(item.price || item.marketPrice || 0),
      reason: item.reason || "Coach G recommendation",
      decisionSupport:
        item.decisionSupport && typeof item.decisionSupport === "object"
          ? item.decisionSupport
          : null
    }))'''

if old in s:
    s = s.replace(old, new, 1)
elif 'decisionSupport:' not in s:
    raise SystemExit(f"{path}: basket item mapping marker not found")

write(path, s)

# ------------------------------------------------------------
# 2. Carry decision-support metadata into execution orders.
# ------------------------------------------------------------
path = "mobile/src/services/trade/basketExecutionStore.js"
s = read(path)

old = '''      reason: item.reason || "Coach G recommendation",
      executionMode: basket.executionMode || "PRACTICE",'''

new = '''      reason: item.reason || "Coach G recommendation",
      decisionSupport:
        item.decisionSupport && typeof item.decisionSupport === "object"
          ? item.decisionSupport
          : null,
      executionMode: basket.executionMode || "PRACTICE",'''

if old in s:
    s = s.replace(old, new, 1)
elif 'item.decisionSupport && typeof item.decisionSupport === "object"' not in s:
    raise SystemExit(f"{path}: execution order mapping marker not found")

write(path, s)

# ------------------------------------------------------------
# 3. Add REAL proceed-to-trade handoff in trade.js.
# ------------------------------------------------------------
path = "mobile/app/trade.js"
s = read(path)

# Add imports using existing import anchors.
if 'saveTradeBasket' not in s:
    anchor = 'import { addBrokerActionPlanOrder } from "../src/services/trade/brokerActionPlanStore";'
    if anchor not in s:
        # tolerate older path formatting by finding the imported symbol
        m = re.search(r'import\s*\{\s*addBrokerActionPlanOrder\s*\}\s*from\s*"[^"]+brokerActionPlanStore";', s)
        if not m:
            raise SystemExit(f"{path}: brokerActionPlanStore import anchor not found")
        anchor = m.group(0)
    s = s.replace(
        anchor,
        anchor + '\nimport { saveTradeBasket } from "../src/services/trade/tradeBasketStore";',
        1
    )

# Ensure createBasketExecution import exists in same basketExecutionStore import block.
if 'createBasketExecution' not in s:
    # Existing file already imports loadBasketExecution/updateExecutionOrder from this module.
    pat = re.compile(
        r'import\s*\{\s*([^}]*\bloadBasketExecution\b[^}]*)\}\s*from\s*"../src/services/trade/basketExecutionStore";',
        re.S
    )
    m = pat.search(s)
    if not m:
        raise SystemExit(f"{path}: basketExecutionStore import block not found")
    contents = m.group(1)
    new_contents = 'createBasketExecution,\n  ' + contents.lstrip()
    s = s[:m.start(1)] + new_contents + s[m.end(1):]

# Add proceed function after addToBrokerActionPlan.
if 'async function proceedRealOrderToReview()' not in s:
    marker = '''  async function getBrokerProfile() {'''
    if marker not in s:
        raise SystemExit(f"{path}: getBrokerProfile marker not found")

    fn = r'''  async function proceedRealOrderToReview() {
    if (!averageCostMode) {
      Alert.alert(
        "REAL Decision Review Required",
        "Proceed to Trade from the REAL Average Cost / FIFO decision view."
      );
      return;
    }

    if (!averageGuard?.available) {
      Alert.alert(
        "Scenario Incomplete",
        averageGuard?.message ||
          "Choose an existing holding and enter a valid quantity and limit price."
      );
      return;
    }

    if (!estimate.qty || estimate.qty <= 0) {
      Alert.alert("Invalid Quantity", "Enter a valid quantity.");
      return;
    }

    if (!estimate.price || estimate.price <= 0) {
      Alert.alert("Invalid Price", "Enter a valid limit price.");
      return;
    }

    const existingExecution = await loadBasketExecution();

    if (Number(existingExecution?.activeOrders || 0) > 0) {
      Alert.alert(
        "Active Orders Already Exist",
        "Review or complete the current order queue before creating another REAL order."
      );
      return;
    }

    const guardPrice =
      side === "SELL"
        ? averageGuard.minimumSalePrice
        : averageGuard.maximumBuyPrice;

    const decisionSupport = {
      advisoryOnly: true,
      source: "AVERAGE_COST_DECISION_SUPPORT",
      holdingSource,
      guardStatus: averageGuard.status || null,
      guardPrice: guardPrice ?? null,
      minimumSalePrice:
        side === "SELL" ? averageGuard.minimumSalePrice ?? null : null,
      maximumBuyPrice:
        side === "BUY" ? averageGuard.maximumBuyPrice ?? null : null,
      estimatedCharges: estimate.totalFees,
      estimatedGross: estimate.gross,
      estimatedTotalCost: estimate.totalCost,
      costBasisMethod: averageGuard.costBasisMethod || null,
      soldCostPerShare: averageGuard.soldCostPerShare ?? null,
      projectedRemainingQuantity:
        averageGuard.remainingQuantity ?? null,
      projectedRemainingAverage:
        averageGuard.remainingAveragePrice ?? null,
      projectedAveragePrice:
        averageGuard.projectedAveragePrice ?? null,
      projectedRealizedProfitLoss:
        averageGuard.estimatedRealizedProfitLoss ?? null,
      removedLots: Array.isArray(averageGuard.removedLots)
        ? averageGuard.removedLots
        : [],
      note:
        side === "SELL"
          ? averageGuard.accountingNote || averageGuard.recommendation || null
          : averageGuard.recommendation || null
    };

    await saveTradeBasket(
      [
        {
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          sector: selectedStock.sector,
          side,
          quantity: estimate.qty,
          price: estimate.price,
          amount: estimate.totalCost,
          reason:
            side === "SELL"
              ? `${averageGuard.recommendation || ""} ${averageGuard.accountingNote || ""}`.trim()
              : averageGuard.recommendation || "Coach G REAL decision review",
          decisionSupport
        }
      ],
      "COACH_G_REAL_DECISION",
      {
        executionMode: "REAL",
        brokerId: null,
        brokerAccountId: null
      }
    );

    const nextExecution = await createBasketExecution({ forceNew: true });

    if (!nextExecution?.orders?.length) {
      Alert.alert(
        "Order Review Unavailable",
        "GateCEP could not create the REAL order review record."
      );
      return;
    }

    router.push("/orders-review");
  }

'''
    s = s.replace(marker, fn + marker, 1)

# Replace Average Cost preview/action block.
old_ui = '''      ) : (
        <View style={styles.previewOnly}>
          <Text style={styles.previewOnlyTitle}>
            Preview Only — No Trade Created
          </Text>
          <Text style={styles.body}>
            Adjust cash, quantity or limit price above.
            Coach G recalculates immediately and does
            not save these scenario values. When ready,
            save only the proposed instruction to a
            separate broker action plan.
          </Text>
          <Pressable
            style={styles.primary}
            onPress={addToBrokerActionPlan}
          >
            <Text style={styles.primaryText}>
              Add to Broker Action Plan
            </Text>
          </Pressable>
        </View>
      )}'''

new_ui = '''      ) : (
        <View style={styles.previewOnly}>
          <Text style={styles.previewOnlyTitle}>
            Decision Preview — No REAL Trade Executed
          </Text>
          <Text style={styles.body}>
            Coach G is showing the projected Average Cost, FIFO,
            charges and portfolio impact before you decide. Proceeding
            creates a REAL order for review only. It does not change
            REAL holdings, cash, P&amp;L or FIFO until genuine broker
            execution evidence is verified.
          </Text>

          <Pressable
            style={styles.primary}
            onPress={proceedRealOrderToReview}
          >
            <Text style={styles.primaryText}>
              Proceed to Trade
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondary}
            onPress={addToBrokerActionPlan}
          >
            <Text style={styles.secondaryText}>
              Save to Broker Action Plan
            </Text>
          </Pressable>
        </View>
      )}'''

if old_ui in s:
    s = s.replace(old_ui, new_ui, 1)
elif 'Proceed to Trade' not in s or 'Save to Broker Action Plan' not in s:
    raise SystemExit(f"{path}: Average Cost action block not found")

write(path, s)

print()
print("PC-031A5C applied.")
print("Average Cost/FIFO math was not modified.")
print("Proceed to Trade now creates a REAL REVIEW order only.")
print("Broker Action Plan remains optional Save for Later.")
PY

echo
echo "Review with:"
git diff -- \
  mobile/app/trade.js \
  mobile/src/services/trade/tradeBasketStore.js \
  mobile/src/services/trade/basketExecutionStore.js
