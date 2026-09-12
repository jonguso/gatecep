from pathlib import Path
import sys

root = Path(sys.argv[1])
alloc = root / "mobile/app/goal-recovery-allocation.js"
store = root / "mobile/src/services/trade/brokerActionPlanStore.js"
screen = root / "mobile/app/basket-execution.js"

for p in (alloc, store, screen):
    if not p.exists():
        raise SystemExit(f"ERROR — required file missing: {p}")

# --- canonical Broker Action Plan store: add whole-plan save ---
src = store.read_text(encoding="utf-8")
orig = src
if "export async function saveBrokerActionPlan(" not in src:
    anchor = "export async function addBrokerActionPlanOrder(input = {}) {"
    block = (
        "export async function saveBrokerActionPlan(plan = {}) {\n"
        "  const now = new Date().toISOString();\n"
        "  const orders = Array.isArray(plan?.orders)\n"
        "    ? plan.orders.map((order, index) => normalizeOrder({\n"
        "        ...order,\n"
        "        id: order.id || `BAP-${Date.now()}-${index}`,\n"
        "        status: \"REVIEW\",\n"
        "        message: order.message || \"Prepared for manual broker review; not executed\",\n"
        "        advisoryOnly: true,\n"
        "        brokerExecutionConfirmed: false,\n"
        "        realPortfolioMutationAllowed: false,\n"
        "        practicePortfolioMutationAllowed: false,\n"
        "        createdAt: order.createdAt || now,\n"
        "        updatedAt: now\n"
        "      }))\n"
        "    : [];\n\n"
        "  const saved = {\n"
        "    ...plan,\n"
        "    id: plan.id || `BROKER-PLAN-${Date.now()}`,\n"
        "    executionMode: \"BROKER_HANDOFF_ONLY\",\n"
        "    source: \"COACH_G_ADVISORY\",\n"
        "    status: \"REVIEW\",\n"
        "    advisoryOnly: true,\n"
        "    brokerExecutionConfirmed: false,\n"
        "    realPortfolioMutationAllowed: false,\n"
        "    practicePortfolioMutationAllowed: false,\n"
        "    createdAt: plan.createdAt || now,\n"
        "    updatedAt: now,\n"
        "    orders\n"
        "  };\n\n"
        "  await userSetItem(BROKER_ACTION_PLAN_KEY, JSON.stringify(saved));\n"
        "  return saved;\n"
        "}\n\n"
    )
    if anchor not in src:
        raise SystemExit("ERROR — addBrokerActionPlanOrder anchor missing.")
    src = src.replace(anchor, block + anchor, 1)
if src != orig:
    store.with_suffix(store.suffix + ".pc030m20av2c.bak").write_text(orig, encoding="utf-8")
    store.write_text(src, encoding="utf-8")
    print("UPDATED — brokerActionPlanStore can save a complete advisory basket.")
else:
    print("NO CHANGE — saveBrokerActionPlan already exists.")

# --- recovery allocation: save both canonical basket and Broker Action Plan ---
src = alloc.read_text(encoding="utf-8")
orig = src

needle = 'import { saveBasketExecution } from "../src/services/trade/basketExecutionStore";'
if "goalRecoveryBrokerActionPlanBridge" not in src:
    if needle not in src:
        raise SystemExit("ERROR — saveBasketExecution import anchor missing.")
    src = src.replace(
        needle,
        needle + '\n'
        'import { saveBrokerActionPlan } from "../src/services/trade/brokerActionPlanStore";\n'
        'import { buildRecoveryBrokerActionPlan } from "../src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge";',
        1
    )

old = "    await saveBasketExecution(handoff.execution);\n\n    router.push({"
if "await saveBrokerActionPlan(brokerPlan.plan);" not in src:
    if old not in src:
        raise SystemExit("ERROR — saveBasketExecution handoff anchor missing.")
    new = (
        "    await saveBasketExecution(handoff.execution);\n\n"
        "    const brokerPlan = buildRecoveryBrokerActionPlan({\n"
        "      execution: handoff.execution,\n"
        "      recoveryAmount,\n"
        "      goalContext: { goalName, targetAmount, targetDate, monthlyContribution }\n"
        "    });\n\n"
        "    if (!brokerPlan?.ok || !brokerPlan?.plan) {\n"
        "      setError(\"The diversified recovery basket could not be prepared for Broker Action Plan review.\");\n"
        "      return;\n"
        "    }\n\n"
        "    await saveBrokerActionPlan(brokerPlan.plan);\n\n"
        "    router.push({"
    )
    src = src.replace(old, new, 1)

if src != orig:
    alloc.with_suffix(alloc.suffix + ".pc030m20av2c.bak").write_text(orig, encoding="utf-8")
    alloc.write_text(src, encoding="utf-8")
    print("UPDATED — recovery basket is now bridged into canonical Broker Action Plan storage.")
else:
    print("NO CHANGE — recovery bridge already present.")

# --- existing Broker Action Plan screen: show recovery context ---
src = screen.read_text(encoding="utf-8")
orig = src
if "Scenario recovery funding:" not in src:
    anchor = '          {brokerPlanMode ? "Execution confirmations: 0 — import required" : `Closed Orders: ${closedOrders.length}`}\n        </Text>'
    if anchor not in src:
        raise SystemExit("ERROR — basket-execution summary anchor missing.")
    extra = (
        anchor +
        '\n        {brokerPlanMode && execution?.scenarioFunding?.amount ? (\n'
        '          <Text style={styles.body}>\n'
        '            Scenario recovery funding: KES {money(execution.scenarioFunding.amount)}\n'
        '          </Text>\n'
        '        ) : null}\n'
        '        {brokerPlanMode && execution?.goalContext?.goalName ? (\n'
        '          <Text style={styles.body}>Goal: {execution.goalContext.goalName}</Text>\n'
        '        ) : null}'
    )
    src = src.replace(anchor, extra, 1)

if src != orig:
    screen.with_suffix(screen.suffix + ".pc030m20av2c.bak").write_text(orig, encoding="utf-8")
    screen.write_text(src, encoding="utf-8")
    print("UPDATED — Broker Action Plan review shows recovery funding and goal context.")
else:
    print("NO CHANGE — recovery context already present on Broker Action Plan screen.")
