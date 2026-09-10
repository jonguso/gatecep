#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"
python - <<'PY'
from pathlib import Path

changes = []

def replace_once(path, old, new):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"ERROR — missing target: {path}")
    s = p.read_text(encoding='utf-8')
    if new in s:
        print(f"UNCHANGED — {path} (already applied)")
        return
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"ERROR — expected exactly one match in {path}, found {count}: {old[:80]!r}")
    p.write_text(s.replace(old, new, 1), encoding='utf-8')
    print(f"UPDATED — {path}")

trade = "mobile/app/trade.js"
basket = "mobile/app/basket-execution.js"

replace_once(trade,
'''          {averageCostMode
            ? "Average Cost Simulator"
            : "Practice Trade"}''',
'''          {averageCostMode
            ? "Trade Lab — Average Cost Scenario"
            : "Practice Trade"}''')

replace_once(trade,
'''        <Text style={styles.cardTitle}>
          Order Ticket
        </Text>''',
'''        <Text style={styles.cardTitle}>
          {averageCostMode ? "Scenario Inputs" : "Order Ticket"}
        </Text>''')

replace_once(trade,
'''                {item}
''',
'''                {averageCostMode ? `Simulate ${item}` : item}
''')

replace_once(trade,
'''        <Text style={styles.cardTitle}>
          Trade Estimate
        </Text>''',
'''        <Text style={styles.cardTitle}>
          {averageCostMode ? "Scenario Estimate" : "Trade Estimate"}
        </Text>''')

replace_once(trade,
'''      <Pressable
        style={styles.backButton}
        onPress={() =>
          router.replace("/basket-execution")
        }
      >
        <Text style={styles.backText}>
          Back to Basket Execution
        </Text>
      </Pressable>''',
'''      <Pressable
        style={styles.backButton}
        onPress={() =>
          averageCostMode
            ? router.replace({ pathname: "/basket-execution", params: { mode: "BROKER_PLAN" } })
            : router.replace("/basket-execution")
        }
      >
        <Text style={styles.backText}>
          {averageCostMode ? "Back to Broker Action Plan" : "Back to Basket Execution"}
        </Text>
      </Pressable>''')

p = Path(basket)
s = p.read_text(encoding="utf-8")
old_title = '<Text style={styles.title}>{brokerPlanMode ? "Broker Action Plan" : "Practice Basket Simulation"}</Text>'
new_title = '<Text style={styles.title}>{brokerPlanMode ? "Broker Action Plan Review" : "Practice Basket Simulation"}</Text>'
old_count = s.count(old_title)
new_count = s.count(new_title)
if old_count:
    s = s.replace(old_title, new_title)
    p.write_text(s, encoding="utf-8")
    print(f"UPDATED — {basket} ({old_count} broker-plan title occurrence(s))")
elif new_count >= 2:
    print(f"UNCHANGED — {basket} (broker-plan titles already applied)")
else:
    raise SystemExit(f"ERROR — expected broker-plan titles in {basket}; old={old_count}, new={new_count}")

replace_once(basket,
'''{brokerPlanMode ? "Prepare a separate, reviewable instruction report for your broker. Saving or sharing this plan does not place a trade or change a portfolio." : "Track queued Practice orders and simulated fills. Practice records move to portfolio and trade history."}''',
'''{brokerPlanMode ? "Review scenario instructions prepared in Trade Lab. This is a broker handoff plan only; saving or sharing it does not place a trade or change any REAL or Practice portfolio." : "Track queued Practice orders and simulated fills. Practice records move to portfolio and trade history."}''')

print("PC-030M20AP Trade Lab & Broker Action Plan navigation boundary applied.")
PY
