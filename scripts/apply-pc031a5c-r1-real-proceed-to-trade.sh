#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

python - <<'PY'

from pathlib import Path

path = Path("mobile/app/trade.js")
s = path.read_text(encoding="utf-8")

old_import = """import {
  loadBasketExecution,
  saveBasketExecution,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";"""

new_import = """import {
  createBasketExecution,
  loadBasketExecution,
  saveBasketExecution,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";"""

if old_import in s:
    s = s.replace(old_import, new_import, 1)
elif "createBasketExecution," not in s:
    raise SystemExit("trade.js: expected basketExecutionStore import block not found")

anchor = 'import { addBrokerActionPlanOrder } from "../src/services/trade/brokerActionPlanStore";'
if "saveTradeBasket" not in s:
    if anchor not in s:
        raise SystemExit("trade.js: brokerActionPlanStore import anchor not found")
    s = s.replace(
        anchor,
        anchor + '\nimport { saveTradeBasket } from "../src/trade/tradeBasketStore";',
        1
    )

if "async function proceedRealOrderToReview()" not in s:
    marker = "  async function getBrokerProfile() {"
    if marker not in s:
        raise SystemExit("trade.js: getBrokerProfile marker not found")

    fn = """  async function proceedRealOrderToReview() {
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

"""
    s = s.replace(marker, fn + marker, 1)

old_ui = """      ) : (
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
      )}"""

new_ui = """      ) : (
        <View style={styles.previewOnly}>
          <Text style={styles.previewOnlyTitle}>
            Decision Preview — No REAL Trade Executed
          </Text>
          <Text style={styles.body}>
            Coach G is showing the projected Average Cost, FIFO,
            charges and portfolio impact before you decide.
            Proceeding creates a REAL order for review only. It
            does not change REAL holdings, cash, P&amp;L or FIFO until
            genuine broker execution evidence is verified.
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
      )}"""

if old_ui in s:
    s = s.replace(old_ui, new_ui, 1)
elif "Proceed to Trade" not in s or "Save to Broker Action Plan" not in s:
    raise SystemExit("trade.js: Average Cost action block not found")

path.write_text(s, encoding="utf-8", newline="\n")
print("UPDATED mobile/app/trade.js")
print()
print("PC-031A5C-R1 applied.")
print("Only the missing trade.js handoff was repaired.")

PY

echo
echo "Review with:"
git diff -- mobile/app/trade.js
