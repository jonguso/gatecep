from pathlib import Path
p=Path("mobile/app/basket-execution.js")
s=p.read_text()
anchor='  const isComplete ='
if anchor not in s: raise SystemExit("ERROR — calculation anchor missing.")
calc='''  const allBrokerPlanChargesVerified = brokerPlanMode && activeOrders.length > 0 && activeOrders.every((o) => o?.feeEvidenceAvailable === true && o?.estimatedCharges != null && o?.estimatedTotalCost != null);
  const verifiedEstimatedCharges = allBrokerPlanChargesVerified ? activeOrders.reduce((sum,o)=>sum+Number(o.estimatedCharges||0),0) : null;
  const estimatedTotalBasketCost = allBrokerPlanChargesVerified ? activeOrders.reduce((sum,o)=>sum+Number(o.estimatedTotalCost||0),0) : null;
  const estimatedFundingRemaining = allBrokerPlanChargesVerified && execution?.scenarioFunding?.amount != null ? Math.max(0,Number(execution.scenarioFunding.amount)-estimatedTotalBasketCost) : null;

'''
s=s.replace(anchor,calc+anchor,1)
old='Status: {execution.status} • {brokerPlanMode ? "Planned Gross Purchases" : "Active Value"} KES {money(totalAmount)}'
if old not in s: raise SystemExit("ERROR — F5A1 summary anchor missing.")
s=s.replace(old,old+'''{brokerPlanMode && allBrokerPlanChargesVerified ? ` • Verified Estimated Charges KES ${money(verifiedEstimatedCharges)} • Estimated Total Basket Cost KES ${money(estimatedTotalBasketCost)}` : ""}''',1)
old='''            Scenario recovery funding: KES {money(execution.scenarioFunding.amount)}'''
if old not in s: raise SystemExit("ERROR — funding anchor missing.")
s=s.replace(old,'''            Scenario Recovery Funding: KES {money(execution.scenarioFunding.amount)}
            {estimatedFundingRemaining !== null ? ` • Estimated Funding Remaining KES ${money(estimatedFundingRemaining)}` : ""}''',1)
old='''                <Text style={styles.bodySmall}>
                  {order.side || "BUY"} • Qty {order.quantity} • KES{" "}
                  {money(order?.feeEvidenceAvailable === true && order?.estimatedTotalCost !== null && order?.estimatedTotalCost !== undefined ? order.estimatedTotalCost : order.gross)}
                </Text>'''
if old not in s: raise SystemExit("ERROR — order value anchor missing.")
new='''                <Text style={styles.bodySmall}>
                  {order.side || "BUY"} • Qty {order.quantity} @ KES {money(order.price)}
                </Text>
                {brokerPlanMode ? <>
                  <Text style={styles.reason}>Gross purchase: KES {money(order.gross)}</Text>
                  {order?.feeEvidenceAvailable === true && order?.estimatedCharges != null && order?.estimatedTotalCost != null ? <>
                    <Text style={styles.reason}>Verified estimated charges: KES {money(order.estimatedCharges)}</Text>
                    <Text style={styles.reason}>Estimated total cost: KES {money(order.estimatedTotalCost)}</Text>
                  </> : <Text style={styles.reason}>Verified estimated charges: Unavailable</Text>}
                </> : null}'''
s=s.replace(old,new,1)
p.write_text(s)
print("UPDATED — Broker Plan cost transparency.")
print("PRESERVED — fee engine, allocation, quantities, Practice and import-gated boundaries.")
