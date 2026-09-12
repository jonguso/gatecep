from pathlib import Path
import sys
root=Path(sys.argv[1])
store=root/"mobile/src/services/brokers/brokerAccountStore.js"
accounts_ui=root/"mobile/app/broker-accounts.js"
charges=root/"mobile/src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js"
preview_service=root/"mobile/src/features/wealth-journey/goalRecoveryPortfolioPreviewService.js"
preview=root/"mobile/app/goal-recovery-preview.js"
for p in (store,accounts_ui,charges,preview_service,preview):
    if not p.exists(): raise SystemExit(f"ERROR — required file missing: {p}")

src=store.read_text(encoding="utf-8"); orig=src
a='    status: account.status,\n    updatedAt: new Date().toISOString()'
b='    status: account.status,\n    feeSchedule: account.feeSchedule || null,\n    updatedAt: new Date().toISOString()'
if 'feeSchedule: account.feeSchedule || null' not in src:
    if a not in src: raise SystemExit("ERROR — brokerAccountStore anchor missing.")
    src=src.replace(a,b,1)
if src!=orig:
    store.with_suffix(store.suffix+".pc030m20av2f2.bak").write_text(orig,encoding="utf-8")
    store.write_text(src,encoding="utf-8")
    print("UPDATED — canonical default broker profile preserves feeSchedule.")

src=accounts_ui.read_text(encoding="utf-8"); orig=src
a='  async function saveBrokerConnection() {\n    if (!editingBroker) return;\n\n    const now = new Date().toISOString();'
b='  async function saveBrokerConnection() {\n    if (!editingBroker) return;\n\n    const existing = accounts.find((item) => item.id === editingBroker.id);\n    const now = new Date().toISOString();'
segment=src[src.find("async function saveBrokerConnection"):src.find("async function setDefaultBroker")]
if 'const existing = accounts.find((item) => item.id === editingBroker.id);' not in segment:
    if a not in src: raise SystemExit("ERROR — broker-accounts save anchor missing.")
    src=src.replace(a,b,1)
a='      lastSyncAt: null\n    };'
b='      lastSyncAt: existing?.lastSyncAt || null,\n      feeSchedule: existing?.feeSchedule || null\n    };'
if 'feeSchedule: existing?.feeSchedule || null' not in src:
    if a not in src: raise SystemExit("ERROR — broker-accounts object anchor missing.")
    src=src.replace(a,b,1)
a='          status: defaultAccount.status,\n          updatedAt: new Date().toISOString()'
b='          status: defaultAccount.status,\n          feeSchedule: defaultAccount.feeSchedule || null,\n          updatedAt: new Date().toISOString()'
if 'feeSchedule: defaultAccount.feeSchedule || null' not in src:
    if a not in src: raise SystemExit("ERROR — broker-accounts default profile anchor missing.")
    src=src.replace(a,b,1)
if src!=orig:
    accounts_ui.with_suffix(accounts_ui.suffix+".pc030m20av2f2.bak").write_text(orig,encoding="utf-8")
    accounts_ui.write_text(src,encoding="utf-8")
    print("UPDATED — Broker Accounts edits/default-profile writes preserve feeSchedule.")

src=charges.read_text(encoding="utf-8"); orig=src
a='''  const knownTotalCost=gross+knownCharges;
  const recovery=n(recoveryAmount);
  const remaining=allChargesVerified?Math.max(0,recovery-knownTotalCost):Math.max(0,recovery-gross);'''
b='''  const knownTotalCost=gross+knownCharges;
  const recovery=n(recoveryAmount);
  const grossFundingRemainingBeforeCharges=Math.max(0,recovery-gross);
  const scenarioFundingRemainingAfterCharges=allChargesVerified?Math.max(0,recovery-knownTotalCost):null;
  const remaining=allChargesVerified?scenarioFundingRemainingAfterCharges:grossFundingRemainingBeforeCharges;'''
if a in src: src=src.replace(a,b,1)
elif 'grossFundingRemainingBeforeCharges' not in src: raise SystemExit("ERROR — charge residual anchor missing.")
a='''    estimatedTotalCost:allChargesVerified?round(knownTotalCost):null,
    remainingScenarioFunding:round(remaining),
    allChargesVerified,''';
b='''    estimatedTotalCost:allChargesVerified?round(knownTotalCost):null,
    grossFundingRemainingBeforeCharges:round(grossFundingRemainingBeforeCharges),
    scenarioFundingRemainingAfterCharges:scenarioFundingRemainingAfterCharges===null?null:round(scenarioFundingRemainingAfterCharges),
    remainingScenarioFunding:round(remaining),
    remainingScenarioFundingMeaning:allChargesVerified?"AFTER_VERIFIED_ESTIMATED_CHARGES":"BEFORE_UNAVAILABLE_CHARGES",
    allChargesVerified,''';
if a in src: src=src.replace(a,b,1)
elif 'remainingScenarioFundingMeaning' not in src: raise SystemExit("ERROR — charge return anchor missing.")
if src!=orig:
    charges.with_suffix(charges.suffix+".pc030m20av2f2.bak").write_text(orig,encoding="utf-8")
    charges.write_text(src,encoding="utf-8")
    print("UPDATED — charge summary distinguishes gross and post-charge residuals.")

src=preview_service.read_text(encoding="utf-8"); orig=src
a='  const projectedScenarioResidualBeforeCharges=chargeSummary?.available===true?n(chargeSummary?.remainingScenarioFunding):Math.max(0,recovery-projectedGrossInvested);'
b='''  const projectedGrossFundingRemainingBeforeCharges=chargeSummary?.available===true?n(chargeSummary?.grossFundingRemainingBeforeCharges??chargeSummary?.remainingScenarioFunding):Math.max(0,recovery-projectedGrossInvested);
  const projectedScenarioFundingRemainingAfterCharges=chargeSummary?.allChargesVerified===true?n(chargeSummary?.scenarioFundingRemainingAfterCharges??chargeSummary?.remainingScenarioFunding):null;
  const projectedScenarioResidualBeforeCharges=projectedGrossFundingRemainingBeforeCharges;'''
if a in src: src=src.replace(a,b,1)
elif 'projectedGrossFundingRemainingBeforeCharges' not in src: raise SystemExit("ERROR — preview residual anchor missing.")
a='''      scenarioResidualBeforeCharges:round(projectedScenarioResidualBeforeCharges),
      estimatedCharges:verifiedCharges===null?null:round(verifiedCharges),'''
b='''      scenarioResidualBeforeCharges:round(projectedScenarioResidualBeforeCharges),
      grossFundingRemainingBeforeCharges:round(projectedGrossFundingRemainingBeforeCharges),
      scenarioFundingRemainingAfterCharges:projectedScenarioFundingRemainingAfterCharges===null?null:round(projectedScenarioFundingRemainingAfterCharges),
      estimatedCharges:verifiedCharges===null?null:round(verifiedCharges),'''
if a in src: src=src.replace(a,b,1)
elif 'scenarioFundingRemainingAfterCharges:' not in src: raise SystemExit("ERROR — preview fields anchor missing.")
if src!=orig:
    preview_service.with_suffix(preview_service.suffix+".pc030m20av2f2.bak").write_text(orig,encoding="utf-8")
    preview_service.write_text(src,encoding="utf-8")
    print("UPDATED — preview service preserves residual-funding meaning.")

src=preview.read_text(encoding="utf-8"); orig=src
a='''        <Metric label="Planned gross purchases" value={`KES ${money(p.projected.grossInvestedBeforeCharges)}`}/>
        {p.projected.estimatedCharges!==null?<Metric label="Verified estimated charges" value={`KES ${money(p.projected.estimatedCharges)}`}/>:null}
        {p.projected.estimatedTotalCost!==null?<Metric label="Estimated total basket cost" value={`KES ${money(p.projected.estimatedTotalCost)}`}/>:null}
        <Metric label="Scenario funding remaining" value={`KES ${money(p.projected.scenarioResidualBeforeCharges)}`}/>
        <Text style={styles.note}>{p.projected.allChargesVerified ? "Verified broker fee evidence has been applied and each order remains within its allocated recovery budget." : "Verified broker fee schedules are unavailable for one or more orders. GateCEP has not invented missing charges."}</Text>'''
b='''        <Metric label="Planned gross purchases" value={`KES ${money(p.projected.grossInvestedBeforeCharges)}`}/>
        <Metric label="Verified estimated charges" value={p.projected.estimatedCharges!==null?`KES ${money(p.projected.estimatedCharges)}`:"Unavailable"}/>
        {p.projected.estimatedTotalCost!==null?<Metric label="Estimated total basket cost" value={`KES ${money(p.projected.estimatedTotalCost)}`}/>:null}
        {p.projected.allChargesVerified
          ?<Metric label="Scenario funding remaining after estimated charges" value={`KES ${money(p.projected.scenarioFundingRemainingAfterCharges)}`}/>
          :<Metric label="Gross funding remaining before charges" value={`KES ${money(p.projected.grossFundingRemainingBeforeCharges)}`}/>}
        <Text style={styles.note}>{p.projected.allChargesVerified ? "Verified broker fee evidence has been applied and each order remains within its allocated recovery budget." : "Verified broker fee schedules are unavailable for one or more orders. The gross residual shown above is before unknown charges and is not treated as confirmed spendable funding."}</Text>'''
if a in src: src=src.replace(a,b,1)
elif 'Gross funding remaining before charges' not in src: raise SystemExit("ERROR — preview UI anchor missing.")
if src!=orig:
    preview.with_suffix(preview.suffix+".pc030m20av2f2.bak").write_text(orig,encoding="utf-8")
    preview.write_text(src,encoding="utf-8")
    print("UPDATED — preview terminology now reflects fee-evidence state.")
