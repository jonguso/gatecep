from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/"mobile/app/basket-execution.js"
if not p.exists(): raise SystemExit(f"ERROR — required file missing: {p}")
s=p.read_text(encoding="utf-8")
orig=s

# Insert aggregate verified-fee summary immediately before the Execution confirmations row.
anchor='        <Text style={styles.body}>\n          {brokerPlanMode ? "Execution confirmations: 0 — import required" : `Closed Orders: ${closedOrders.length}`}\n        </Text>'
insert='        {brokerPlanMode && execution?.costSummary?.allChargesVerified ? (\n          <>\n            <Text style={styles.body}>Verified Estimated Charges: KES {money(execution.costSummary.verifiedEstimatedCharges)}</Text>\n            <Text style={styles.body}>Estimated Total Basket Cost: KES {money(execution.costSummary.estimatedTotalBasketCost)}</Text>\n          </>\n        ) : null}\n        <Text style={styles.body}>\n          {brokerPlanMode ? "Execution confirmations: 0 — import required" : `Closed Orders: ${closedOrders.length}`}\n        </Text>'
if "Verified Estimated Charges:" not in s:
    if anchor not in s: raise SystemExit("ERROR — execution confirmation anchor missing.")
    s=s.replace(anchor,insert,1)

# Replace recovery funding label and add verified residual.
old='        {brokerPlanMode && execution?.scenarioFunding?.amount ? (\n          <Text style={styles.body}>\n            Scenario recovery funding: KES {money(execution.scenarioFunding.amount)}\n          </Text>\n        ) : null}'
new='        {brokerPlanMode && execution?.scenarioFunding?.amount ? (\n          <Text style={styles.body}>\n            Scenario Recovery Funding: KES {money(execution.scenarioFunding.amount)}\n          </Text>\n        ) : null}\n        {brokerPlanMode && execution?.costSummary?.allChargesVerified && execution?.costSummary?.scenarioFundingRemainingAfterCharges !== null && execution?.costSummary?.scenarioFundingRemainingAfterCharges !== undefined ? (\n          <Text style={styles.body}>\n            Estimated Funding Remaining: KES {money(execution.costSummary.scenarioFundingRemainingAfterCharges)}\n          </Text>\n        ) : null}'
if "Estimated Funding Remaining:" not in s:
    if old not in s: raise SystemExit("ERROR — scenario funding block missing.")
    s=s.replace(old,new,1)

# Expand each BROKER_PLAN order row into gross/charges/all-in cost; Practice stays unchanged.
old='                <Text style={styles.bodySmall}>\n                  {order.side || "BUY"} • Qty {order.quantity} • KES{" "}\n                  {money(order?.feeEvidenceAvailable === true && order?.estimatedTotalCost !== null && order?.estimatedTotalCost !== undefined ? order.estimatedTotalCost : order.gross)}\n                </Text>\n\n                <Text style={styles.reason}>\n                  Price KES {money(order.price)} •{" "}\n                  {order.brokerName || "Broker not assigned"}\n                </Text>'
new='                {brokerPlanMode ? (\n                  <>\n                    <Text style={styles.bodySmall}>\n                      {order.side || "BUY"} • Qty {Number(order.quantity || 0).toLocaleString()} @ KES {money(order.price)}\n                    </Text>\n                    <Text style={styles.reason}>Gross purchase: KES {money(order.gross)}</Text>\n                    {order?.feeEvidenceAvailable === true && order?.estimatedCharges !== null && order?.estimatedCharges !== undefined && order?.estimatedTotalCost !== null && order?.estimatedTotalCost !== undefined ? (\n                      <>\n                        <Text style={styles.reason}>Verified estimated charges: KES {money(order.estimatedCharges)}</Text>\n                        <Text style={styles.reason}>Estimated total cost: KES {money(order.estimatedTotalCost)}</Text>\n                      </>\n                    ) : (\n                      <Text style={styles.reason}>Verified estimated charges: Unavailable</Text>\n                    )}\n                    <Text style={styles.reason}>Broker: {order.brokerName || "Not assigned"}</Text>\n                  </>\n                ) : (\n                  <>\n                    <Text style={styles.bodySmall}>\n                      {order.side || "BUY"} • Qty {order.quantity} • KES{" "}\n                      {money(order.amount || order.gross)}\n                    </Text>\n                    <Text style={styles.reason}>\n                      Price KES {money(order.price)} •{" "}\n                      {order.brokerName || "Broker not assigned"}\n                    </Text>\n                  </>\n                )}'
if "Gross purchase:" not in s:
    if old not in s: raise SystemExit("ERROR — live order display block missing.")
    s=s.replace(old,new,1)

if s==orig:
    print("NO CHANGE — F5B1 transparency already present.")
else:
    p.with_suffix(p.suffix+".pc030m20av2f5b1.bak").write_text(orig,encoding="utf-8")
    p.write_text(s,encoding="utf-8")
    print("UPDATED — Broker Action Plan now separates gross, verified charges, all-in total, and remaining funding.")
    print("PRESERVED — Practice basket display and import-gated execution boundary.")