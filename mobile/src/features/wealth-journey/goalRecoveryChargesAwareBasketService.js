import { compareVerifiedBrokerCharges } from "../../services/brokers/brokerFeeAdviceService.js";

function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
function upper(v){return String(v||"").trim().toUpperCase();}
function round(v,d=2){return Number(n(v).toFixed(d));}

function bestAffordableQuantity({row={},accounts=[]}={}){
  const price=n(row?.price);
  const budget=n(row?.proposedAmount??row?.amount);
  if(!(price>0&&budget>0)) return {available:false,reason:"VALID_PRICE_AND_ALLOCATION_REQUIRED",quantity:0,gross:0,estimatedCharges:null,totalCost:0,feeEvidenceAvailable:false};
  let quantity=Math.floor(budget/price);
  while(quantity>0){
    const feeAdvice=compareVerifiedBrokerCharges({accounts,order:{quantity,price}});
    if(!feeAdvice?.available||!feeAdvice?.recommended){
      const gross=quantity*price;
      return {available:true,reason:"VERIFIED_FEE_EVIDENCE_UNAVAILABLE",quantity,gross:round(gross),estimatedCharges:null,totalCost:round(gross),feeEvidenceAvailable:false,brokerAccountId:null,brokerId:null,brokerName:null,feeEvidenceSource:null,feeVerifiedAt:null};
    }
    const gross=quantity*price;
    const charges=n(feeAdvice.recommended.estimatedCharges);
    const totalCost=gross+charges;
    if(totalCost<=budget+0.000001){
      return {available:true,reason:"VERIFIED_CHARGES_APPLIED",quantity,gross:round(gross),estimatedCharges:round(charges),totalCost:round(totalCost),feeEvidenceAvailable:true,brokerAccountId:feeAdvice.recommended.brokerAccountId||null,brokerId:feeAdvice.recommended.brokerId||null,brokerName:feeAdvice.recommended.brokerName||null,feeEvidenceSource:feeAdvice.recommended.evidenceSource||null,feeVerifiedAt:feeAdvice.recommended.verifiedAt||null};
    }
    quantity-=1;
  }
  return {available:false,reason:"ALLOCATION_TOO_SMALL_FOR_ONE_SHARE_WITH_VERIFIED_CHARGES",quantity:0,gross:0,estimatedCharges:null,totalCost:0,feeEvidenceAvailable:true};
}

export function buildChargesAwareRecoveryBasket({allocation=[],accounts=[],recoveryAmount=0}={}){
  const rows=(Array.isArray(allocation)?allocation:[])
    .filter(row=>upper(row?.symbol)&&n(row?.proposedAmount??row?.amount)>0&&n(row?.price)>0)
    .map(row=>{
      const estimate=bestAffordableQuantity({row,accounts});
      return {...row,symbol:upper(row.symbol),approximateQuantity:estimate.quantity,quantity:estimate.quantity,gross:estimate.gross,projectedGross:estimate.gross,estimatedCharges:estimate.estimatedCharges,estimatedTotalCost:estimate.totalCost,feeEvidenceAvailable:estimate.feeEvidenceAvailable,feeEvidenceStatus:estimate.reason,brokerAccountId:estimate.brokerAccountId||null,brokerId:estimate.brokerId||null,brokerName:estimate.brokerName||null,feeEvidenceSource:estimate.feeEvidenceSource||null,feeVerifiedAt:estimate.feeVerifiedAt||null};
    });

  const validRows=rows.filter(row=>n(row.quantity)>0);
  const gross=validRows.reduce((sum,row)=>sum+n(row.gross),0);
  const knownCharges=validRows.reduce((sum,row)=>sum+(row.estimatedCharges===null?0:n(row.estimatedCharges)),0);
  const allChargesVerified=validRows.length>0&&validRows.every(row=>row.feeEvidenceAvailable===true);
  const knownTotalCost=gross+knownCharges;
  const recovery=n(recoveryAmount);
  const grossFundingRemainingBeforeCharges=Math.max(0,recovery-gross);
  const scenarioFundingRemainingAfterCharges=allChargesVerified?Math.max(0,recovery-knownTotalCost):null;
  const remaining=allChargesVerified?scenarioFundingRemainingAfterCharges:grossFundingRemainingBeforeCharges;

  return {
    available:validRows.length>=2,
    status:validRows.length>=2?"AVAILABLE":"INSUFFICIENT_EXECUTABLE_ROWS",
    rows:validRows,
    recoveryAmount:round(recovery),
    grossPurchases:round(gross),
    estimatedCharges:allChargesVerified?round(knownCharges):null,
    estimatedTotalCost:allChargesVerified?round(knownTotalCost):null,
    grossFundingRemainingBeforeCharges:round(grossFundingRemainingBeforeCharges),
    scenarioFundingRemainingAfterCharges:scenarioFundingRemainingAfterCharges===null?null:round(scenarioFundingRemainingAfterCharges),
    remainingScenarioFunding:round(remaining),
    remainingScenarioFundingMeaning:allChargesVerified?"AFTER_VERIFIED_ESTIMATED_CHARGES":"BEFORE_UNAVAILABLE_CHARGES",
    allChargesVerified,
    feeEvidenceUnavailableCount:validRows.filter(row=>!row.feeEvidenceAvailable).length,
    safeguards:{chargesInvented:false,recoveryBudgetExceeded:allChargesVerified?knownTotalCost>recovery+0.000001:gross>recovery+0.000001,realCashMutated:false,realPortfolioMutated:false,brokerExecutionConfirmed:false}
  };
}
