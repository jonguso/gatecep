from pathlib import Path
import sys
root=Path(sys.argv[1])
preview=root/"mobile/app/goal-recovery-preview.js"
preview_service=root/"mobile/src/features/wealth-journey/goalRecoveryPortfolioPreviewService.js"
handoff=root/"mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js"
for p in (preview,preview_service,handoff):
    if not p.exists(): raise SystemExit(f"ERROR — required file missing: {p}")

# Preview screen imports
src=preview.read_text(encoding="utf-8"); orig=src
anchor='import {saveBrokerActionPlan} from "../src/services/trade/brokerActionPlanStore";'
if 'loadBrokerAccounts' not in src:
    if anchor not in src: raise SystemExit("ERROR — preview import anchor missing.")
    src=src.replace(anchor,anchor+'\nimport {loadBrokerAccounts} from "../src/services/brokers/brokerAccountStore";\nimport {buildChargesAwareRecoveryBasket} from "../src/features/wealth-journey/goalRecoveryChargesAwareBasketService";',1)

src=src.replace('const [state,setState]=useState({loading:true,error:"",preview:null});','const [state,setState]=useState({loading:true,error:"",preview:null,executionAllocation:allocation,chargeSummary:null});',1)

old='''      const metrics=await loadCanonicalRealWealthMetrics();
      const preview=buildDiversifiedRecoveryPortfolioPreview({
        holdings:metrics?.holdings||[],allocation,recoveryAmount,
        realAvailableCash:metrics?.availableCash||0,realNetWorth:metrics?.netWorth,
        goalContext:{goalName,targetAmount,targetDate,monthlyContribution,projectedValueBeforeRecovery,projectedShortfallBeforeRecovery}
      });
      setState({loading:false,error:preview?.available?"":"A diversified allocation is required before projected portfolio review.",preview});'''
new='''      const [metrics,brokerAccounts]=await Promise.all([
        loadCanonicalRealWealthMetrics(),
        loadBrokerAccounts()
      ]);
      const chargeSummary=buildChargesAwareRecoveryBasket({
        allocation,
        accounts:brokerAccounts||[],
        recoveryAmount
      });
      const executionAllocation=chargeSummary?.available?chargeSummary.rows:allocation;
      const preview=buildDiversifiedRecoveryPortfolioPreview({
        holdings:metrics?.holdings||[],
        allocation:executionAllocation,
        recoveryAmount,
        realAvailableCash:metrics?.availableCash||0,
        realNetWorth:metrics?.netWorth,
        chargeSummary,
        goalContext:{goalName,targetAmount,targetDate,monthlyContribution,projectedValueBeforeRecovery,projectedShortfallBeforeRecovery}
      });
      setState({loading:false,error:preview?.available?"":"A diversified allocation is required before projected portfolio review.",preview,executionAllocation,chargeSummary});'''
if old in src:
    src=src.replace(old,new,1)
elif 'buildChargesAwareRecoveryBasket({' not in src:
    raise SystemExit("ERROR — preview load anchor missing.")

src=src.replace('allocation,recoveryAmount,goalContext:{goalName,targetAmount,targetDate,monthlyContribution}','allocation:state.executionAllocation||allocation,recoveryAmount,goalContext:{goalName,targetAmount,targetDate,monthlyContribution}',1)

src=src.replace(
'<Metric label="Planned gross purchases" value={`KES ${money(p.projected.grossInvestedBeforeCharges)}`}/>',
'<Metric label="Planned gross purchases" value={`KES ${money(p.projected.grossInvestedBeforeCharges)}`}/>\n        {p.projected.estimatedCharges!==null?<Metric label="Verified estimated charges" value={`KES ${money(p.projected.estimatedCharges)}`}/>:null}\n        {p.projected.estimatedTotalCost!==null?<Metric label="Estimated total basket cost" value={`KES ${money(p.projected.estimatedTotalCost)}`}/>:null}',
1)

src=src.replace(
'<Text style={styles.note}>Amounts above are before detailed execution charges. GateCEP has not invented a fee estimate on this screen.</Text>',
'<Text style={styles.note}>{p.projected.allChargesVerified ? "Verified broker fee evidence has been applied and each order remains within its allocated recovery budget." : "Verified broker fee schedules are unavailable for one or more orders. GateCEP has not invented missing charges."}</Text>',
1)

src=src.replace(
'<Text style={styles.bodySmall}>Qty {row.quantity.toLocaleString()} @ KES {money(row.price)}</Text>',
'<Text style={styles.bodySmall}>Qty {row.quantity.toLocaleString()} @ KES {money(row.price)}</Text>\n            {row.estimatedCharges!==null&&row.estimatedCharges!==undefined?<Text style={styles.bodySmall}>Verified charges KES {money(row.estimatedCharges)} • total KES {money(row.estimatedTotalCost)}</Text>:<Text style={styles.bodySmall}>Verified charges unavailable</Text>}',
1)

if src!=orig:
    preview.with_suffix(preview.suffix+".pc030m20av2f.bak").write_text(orig,encoding="utf-8")
    preview.write_text(src,encoding="utf-8")
    print("UPDATED — projected portfolio preview now applies verified charges where available.")
    print("UPDATED — Broker Action Plan uses the same charges-aware basket rows.")

# Preview service
src=preview_service.read_text(encoding="utf-8"); orig=src
src=src.replace('holdings=[],allocation=[],recoveryAmount=0,realAvailableCash=0,realNetWorth=null,goalContext={}','holdings=[],allocation=[],recoveryAmount=0,realAvailableCash=0,realNetWorth=null,chargeSummary=null,goalContext={}',1)
src=src.replace('proposedAmount,quantity,price,projectedGross:gross,evidenceBeforeDetailedCharges:true','proposedAmount,quantity,price,projectedGross:gross,estimatedCharges:row?.estimatedCharges??null,estimatedTotalCost:row?.estimatedTotalCost??null,feeEvidenceAvailable:row?.feeEvidenceAvailable===true,evidenceBeforeDetailedCharges:row?.estimatedCharges==null',1)
src=src.replace('const projectedScenarioResidualBeforeCharges=Math.max(0,recovery-projectedGrossInvested);','const verifiedCharges=chargeSummary?.allChargesVerified===true?n(chargeSummary?.estimatedCharges):null;\n  const verifiedTotalCost=chargeSummary?.allChargesVerified===true?n(chargeSummary?.estimatedTotalCost):null;\n  const projectedScenarioResidualBeforeCharges=chargeSummary?.available===true?n(chargeSummary?.remainingScenarioFunding):Math.max(0,recovery-projectedGrossInvested);',1)
src=src.replace('available:true,advisoryOnly:true,readOnly:true,scenarioFundingOnly:true,detailedChargesApplied:false,','available:true,advisoryOnly:true,readOnly:true,scenarioFundingOnly:true,detailedChargesApplied:chargeSummary?.allChargesVerified===true,',1)
src=src.replace('scenarioResidualBeforeCharges:round(projectedScenarioResidualBeforeCharges),','scenarioResidualBeforeCharges:round(projectedScenarioResidualBeforeCharges),\n      estimatedCharges:verifiedCharges===null?null:round(verifiedCharges),\n      estimatedTotalCost:verifiedTotalCost===null?null:round(verifiedTotalCost),\n      allChargesVerified:chargeSummary?.allChargesVerified===true,',1)
src=src.replace('goalMutated:false,investorDNAMutated:false,brokerOrderCreated:false,chargesInvented:false','goalMutated:false,investorDNAMutated:false,brokerOrderCreated:false,chargesInvented:false,recoveryBudgetExceeded:chargeSummary?.safeguards?.recoveryBudgetExceeded===true',1)
if src!=orig:
    preview_service.with_suffix(preview_service.suffix+".pc030m20av2f.bak").write_text(orig,encoding="utf-8")
    preview_service.write_text(src,encoding="utf-8")
    print("UPDATED — portfolio preview service accepts verified charge summary.")

# Basket handoff preserves charges
src=handoff.read_text(encoding="utf-8"); orig=src
anchor='      price: n(row.price),'
if 'estimatedCharges:' not in src:
    if anchor not in src: raise SystemExit("ERROR — basket handoff anchor missing.")
    src=src.replace(anchor,anchor+'\n      estimatedCharges: row.estimatedCharges === null || row.estimatedCharges === undefined ? null : n(row.estimatedCharges),\n      estimatedTotalCost: row.estimatedTotalCost === null || row.estimatedTotalCost === undefined ? null : n(row.estimatedTotalCost),\n      feeEvidenceAvailable: row.feeEvidenceAvailable === true,\n      feeEvidenceSource: row.feeEvidenceSource || null,\n      feeVerifiedAt: row.feeVerifiedAt || null,',1)
if src!=orig:
    handoff.with_suffix(handoff.suffix+".pc030m20av2f.bak").write_text(orig,encoding="utf-8")
    handoff.write_text(src,encoding="utf-8")
    print("UPDATED — basket handoff preserves verified charge evidence.")
