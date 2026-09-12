from pathlib import Path
import sys
root=Path(sys.argv[1])
handoff=root/"mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js"
bridge=root/"mobile/src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge.js"
ui=root/"mobile/app/basket-execution.js"
store=root/"mobile/src/services/trade/brokerActionPlanStore.js"
for p in (handoff,bridge,ui,store):
    if not p.exists(): raise SystemExit(f"ERROR — required file missing: {p}")

# handoff
src=handoff.read_text(encoding="utf-8"); orig=src
old='''      amount: n(row.proposedAmount),
      quantity: n(row.approximateQuantity),
      price: n(row.price),
      estimatedCharges: row.estimatedCharges === null || row.estimatedCharges === undefined ? null : n(row.estimatedCharges),
      estimatedTotalCost: row.estimatedTotalCost === null || row.estimatedTotalCost === undefined ? null : n(row.estimatedTotalCost),
      feeEvidenceAvailable: row.feeEvidenceAvailable === true,''';
new='''      allocationBudget: n(row.proposedAmount),
      amount:
        row.feeEvidenceAvailable === true &&
        row.estimatedTotalCost !== null &&
        row.estimatedTotalCost !== undefined
          ? n(row.estimatedTotalCost)
          : n(row.gross ?? row.projectedGross ?? (n(row.approximateQuantity) * n(row.price))),
      quantity: n(row.approximateQuantity),
      price: n(row.price),
      estimatedCharges: row.estimatedCharges === null || row.estimatedCharges === undefined ? null : n(row.estimatedCharges),
      estimatedTotalCost: row.estimatedTotalCost === null || row.estimatedTotalCost === undefined ? null : n(row.estimatedTotalCost),
      feeEvidenceAvailable: row.feeEvidenceAvailable === true,''';
if old in src: src=src.replace(old,new,1)
elif "allocationBudget:" not in src: raise SystemExit("ERROR — handoff anchor missing.")
if src!=orig:
    handoff.with_suffix(handoff.suffix+".pc030m20av2f5.bak").write_text(orig,encoding="utf-8")
    handoff.write_text(src,encoding="utf-8")

# bridge
src=bridge.read_text(encoding="utf-8"); orig=src
anchor='''  const now = new Date().toISOString();

  const planOrders = orders.map((order, index) => ({'''
insert='''  const now = new Date().toISOString();

  const allChargesVerified =
    orders.length > 0 &&
    orders.every((order) =>
      order?.feeEvidenceAvailable === true &&
      order?.estimatedCharges !== null &&
      order?.estimatedCharges !== undefined &&
      order?.estimatedTotalCost !== null &&
      order?.estimatedTotalCost !== undefined
    );

  const plannedGrossPurchases = orders.reduce(
    (sum, order) => sum + Number(order?.gross || 0),
    0
  );

  const verifiedEstimatedCharges = allChargesVerified
    ? orders.reduce((sum, order) => sum + Number(order?.estimatedCharges || 0), 0)
    : null;

  const estimatedTotalBasketCost = allChargesVerified
    ? orders.reduce((sum, order) => sum + Number(order?.estimatedTotalCost || 0), 0)
    : null;

  const planOrders = orders.map((order, index) => ({'''
if "const allChargesVerified =" not in src:
    if anchor not in src: raise SystemExit("ERROR — bridge anchor missing.")
    src=src.replace(anchor,insert,1)
anchor='''      scenarioFunding: {
        amount: Number(recoveryAmount || 0),
        source: "NEW_RECOVERY_FUNDING",
        temporaryOnly: true,
        realCashMutationAllowed: false
      },'''
repl='''      scenarioFunding: {
        amount: Number(recoveryAmount || 0),
        source: "NEW_RECOVERY_FUNDING",
        temporaryOnly: true,
        realCashMutationAllowed: false
      },
      costSummary: {
        allChargesVerified,
        plannedGrossPurchases,
        verifiedEstimatedCharges,
        estimatedTotalBasketCost,
        grossFundingRemainingBeforeCharges: Math.max(0, Number(recoveryAmount || 0) - plannedGrossPurchases),
        scenarioFundingRemainingAfterCharges:
          allChargesVerified && estimatedTotalBasketCost !== null
            ? Math.max(0, Number(recoveryAmount || 0) - estimatedTotalBasketCost)
            : null,
        chargesInvented: false
      },'''
if "costSummary:" not in src:
    if anchor not in src: raise SystemExit("ERROR — bridge costSummary anchor missing.")
    src=src.replace(anchor,repl,1)
if src!=orig:
    bridge.with_suffix(bridge.suffix+".pc030m20av2f5.bak").write_text(orig,encoding="utf-8")
    bridge.write_text(src,encoding="utf-8")

# plan text export
src=store.read_text(encoding="utf-8"); orig=src
old='    rows.push(`Estimated charges: KES ${Number(order.estimatedCharges || 0).toFixed(2)}`);'
new='''    rows.push(
      order.feeEvidenceAvailable === true &&
      order.estimatedCharges !== null &&
      order.estimatedCharges !== undefined
        ? `Verified estimated charges: KES ${Number(order.estimatedCharges).toFixed(2)}`
        : "Verified estimated charges: Unavailable"
    );'''
if old in src: src=src.replace(old,new,1)
if src!=orig:
    store.with_suffix(store.suffix+".pc030m20av2f5.bak").write_text(orig,encoding="utf-8")
    store.write_text(src,encoding="utf-8")

# UI
src=ui.read_text(encoding="utf-8"); orig=src
src=src.replace(
'Status: {execution.status} • Indicative Value {money(totalAmount)}',
'Status: {execution.status} • {execution?.costSummary?.allChargesVerified ? "Estimated Total Cost" : "Planned Gross Purchases"} {money(execution?.costSummary?.allChargesVerified ? execution?.costSummary?.estimatedTotalBasketCost : execution?.costSummary?.plannedGrossPurchases ?? totalAmount)}',
1)
src=src.replace('{money(order.amount || order.gross)}','{money(order?.feeEvidenceAvailable === true && order?.estimatedTotalCost !== null && order?.estimatedTotalCost !== undefined ? order.estimatedTotalCost : order.gross)}',1)
if src!=orig:
    ui.with_suffix(ui.suffix+".pc030m20av2f5.bak").write_text(orig,encoding="utf-8")
    ui.write_text(src,encoding="utf-8")

print("UPDATED — Broker Action Plan now uses gross when fees are unavailable and verified all-in cost only when evidence exists.")
