function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
function text(v){return String(v??"").trim();}

export function buildBrokerFeeSchedule({
  commissionRatePct=0,
  otherChargesRatePct=0,
  minimumCommission=0,
  fixedCharges=0,
  currency="KES",
  source="",
  verifiedAt="",
  verificationConfirmed=false
}={}){
  const schedule={
    commissionRatePct:Math.max(0,n(commissionRatePct)),
    otherChargesRatePct:Math.max(0,n(otherChargesRatePct)),
    minimumCommission:Math.max(0,n(minimumCommission)),
    fixedCharges:Math.max(0,n(fixedCharges)),
    currency:text(currency)||"KES",
    source:text(source),
    verifiedAt:text(verifiedAt),
    verified:false
  };
  const evidenceComplete=Boolean(schedule.source&&schedule.verifiedAt);
  schedule.verified=Boolean(verificationConfirmed===true&&evidenceComplete);
  return schedule;
}

export function describeBrokerFeeSchedule(schedule=null){
  if(!schedule)return{status:"NOT_PROVIDED",label:"Fee schedule not provided",verified:false};
  if(schedule.verified===true&&text(schedule.source)&&text(schedule.verifiedAt)){
    return{status:"VERIFIED",label:"Verified fee schedule",verified:true};
  }
  return{status:"UNVERIFIED",label:"Fee schedule saved but not verified",verified:false};
}
