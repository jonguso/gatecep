export const CORPORATE_ACTION_TYPES=Object.freeze({
 CASH_DIVIDEND:"CASH_DIVIDEND",SPECIAL_DIVIDEND:"SPECIAL_DIVIDEND",SCRIP_DIVIDEND:"SCRIP_DIVIDEND",
 BONUS_ISSUE:"BONUS_ISSUE",STOCK_SPLIT:"STOCK_SPLIT",SHARE_CONSOLIDATION:"SHARE_CONSOLIDATION",
 RIGHTS_ISSUE:"RIGHTS_ISSUE",CAPITAL_DISTRIBUTION:"CAPITAL_DISTRIBUTION",
 MERGER_ACQUISITION:"MERGER_ACQUISITION",DELISTING:"DELISTING",SUSPENSION:"SUSPENSION",OTHER:"OTHER"
});
export const CORPORATE_ACTION_STATUSES=Object.freeze({
 DRAFT:"DRAFT",ANNOUNCED:"ANNOUNCED",ELIGIBILITY_PENDING:"ELIGIBILITY_PENDING",
 ENTITLEMENT_PENDING:"ENTITLEMENT_PENDING",ENTITLED:"ENTITLED",EXPECTED:"EXPECTED",
 BROKER_CONFIRMED:"BROKER_CONFIRMED",APPLIED:"APPLIED",RECONCILED:"RECONCILED",
 CANCELLED:"CANCELLED",SUPERSEDED:"SUPERSEDED"
});
export const CORPORATE_ACTION_SOURCE_TYPES=Object.freeze({
 ISSUER:"ISSUER",EXCHANGE:"EXCHANGE",REGULATOR:"REGULATOR",BROKER:"BROKER",
 CUSTODIAN:"CUSTODIAN",MANUAL_VERIFIED:"MANUAL_VERIFIED",PROVIDER:"PROVIDER"
});
export const CORPORATE_ACTION_IMPACT_TYPES=Object.freeze({
 CASH:"CASH",SHARES:"SHARES",CASH_AND_SHARES:"CASH_AND_SHARES",
 PRICE_ADJUSTMENT:"PRICE_ADJUSTMENT",INFORMATIONAL:"INFORMATIONAL"
});
export const CORPORATE_ACTION_ACTION_REQUIREMENTS=Object.freeze({
 NONE:"NONE",OPTIONAL:"OPTIONAL",REQUIRED:"REQUIRED"
});
const clean=v=>v===null||v===undefined?null:(String(v).trim()||null);
const num=v=>v===null||v===undefined||v===""?null:(Number.isFinite(Number(v))?Number(v):null);
const date=v=>{const s=clean(v);if(!s)return null;const x=new Date(s);return Number.isNaN(x.getTime())?null:x.toISOString().slice(0,10)};
const ratio=v=>({newShares:num(v?.newShares),existingShares:num(v?.existingShares)});
const id=()=>`CA-${Date.now()}-${Math.random().toString(36).slice(2,9).toUpperCase()}`;

export function classifyCorporateActionImpact(type){
 if([CORPORATE_ACTION_TYPES.CASH_DIVIDEND,CORPORATE_ACTION_TYPES.SPECIAL_DIVIDEND,CORPORATE_ACTION_TYPES.CAPITAL_DISTRIBUTION].includes(type))return CORPORATE_ACTION_IMPACT_TYPES.CASH;
 if([CORPORATE_ACTION_TYPES.BONUS_ISSUE,CORPORATE_ACTION_TYPES.STOCK_SPLIT,CORPORATE_ACTION_TYPES.SHARE_CONSOLIDATION].includes(type))return CORPORATE_ACTION_IMPACT_TYPES.SHARES;
 if([CORPORATE_ACTION_TYPES.SCRIP_DIVIDEND,CORPORATE_ACTION_TYPES.RIGHTS_ISSUE,CORPORATE_ACTION_TYPES.MERGER_ACQUISITION].includes(type))return CORPORATE_ACTION_IMPACT_TYPES.CASH_AND_SHARES;
 return CORPORATE_ACTION_IMPACT_TYPES.INFORMATIONAL;
}
export function classifyCorporateActionRequirement(type){
 if([CORPORATE_ACTION_TYPES.RIGHTS_ISSUE,CORPORATE_ACTION_TYPES.SCRIP_DIVIDEND].includes(type))return CORPORATE_ACTION_ACTION_REQUIREMENTS.OPTIONAL;
 if(type===CORPORATE_ACTION_TYPES.MERGER_ACQUISITION)return CORPORATE_ACTION_ACTION_REQUIREMENTS.REQUIRED;
 return CORPORATE_ACTION_ACTION_REQUIREMENTS.NONE;
}
export function validateCorporateAction(a={}){
 const errors=[],warnings=[];
 if(!clean(a.symbol))errors.push("A security symbol is required.");
 if(!Object.values(CORPORATE_ACTION_TYPES).includes(a.type))errors.push("A supported corporate action type is required.");
 if([CORPORATE_ACTION_TYPES.CASH_DIVIDEND,CORPORATE_ACTION_TYPES.SPECIAL_DIVIDEND].includes(a.type)&&!(num(a.cashAmountPerShare)>0))errors.push("Dividend amount per share must be greater than zero.");
 if([CORPORATE_ACTION_TYPES.BONUS_ISSUE,CORPORATE_ACTION_TYPES.STOCK_SPLIT,CORPORATE_ACTION_TYPES.SHARE_CONSOLIDATION,CORPORATE_ACTION_TYPES.RIGHTS_ISSUE].includes(a.type)){
  const r=ratio(a.ratio);if(!(r.newShares>0)||!(r.existingShares>0))errors.push("A positive new-shares/existing-shares ratio is required.");
 }
 if(a.type===CORPORATE_ACTION_TYPES.RIGHTS_ISSUE&&!(num(a.subscriptionPrice)>0))errors.push("Rights issue subscription price must be greater than zero.");
 if(!clean(a.source?.reference))warnings.push("Source reference has not been recorded.");
 return {valid:errors.length===0,errors,warnings};
}
export function buildCorporateAction(input={}){
 const type=input.type||CORPORATE_ACTION_TYPES.OTHER,now=new Date().toISOString();
 const a={
  id:clean(input.id)||id(),symbol:clean(input.symbol)?.toUpperCase()||null,companyName:clean(input.companyName),
  market:clean(input.market)||"NSE",type,status:input.status||CORPORATE_ACTION_STATUSES.DRAFT,
  impactType:input.impactType||classifyCorporateActionImpact(type),
  actionRequirement:input.actionRequirement||classifyCorporateActionRequirement(type),
  currency:clean(input.currency)||"KES",cashAmountPerShare:num(input.cashAmountPerShare),
  subscriptionPrice:num(input.subscriptionPrice),ratio:ratio(input.ratio),
  announcementDate:date(input.announcementDate),exDate:date(input.exDate),recordDate:date(input.recordDate),
  bookClosureDate:date(input.bookClosureDate),electionDeadline:date(input.electionDeadline),
  subscriptionOpenDate:date(input.subscriptionOpenDate),subscriptionCloseDate:date(input.subscriptionCloseDate),
  paymentDate:date(input.paymentDate),effectiveDate:date(input.effectiveDate),
  title:clean(input.title),description:clean(input.description),terms:{...(input.terms||{})},
  source:{type:input.source?.type||CORPORATE_ACTION_SOURCE_TYPES.MANUAL_VERIFIED,provider:clean(input.source?.provider),reference:clean(input.source?.reference),publishedAt:input.source?.publishedAt||null,verifiedAt:input.source?.verifiedAt||null},
  audit:{createdAt:input.audit?.createdAt||now,updatedAt:now,createdBy:clean(input.audit?.createdBy),revision:Number.isInteger(input.audit?.revision)?input.audit.revision:1},
  reconciliation:{expectedOnly:input.reconciliation?.expectedOnly!==false,brokerConfirmed:Boolean(input.reconciliation?.brokerConfirmed),applied:Boolean(input.reconciliation?.applied),reconciled:Boolean(input.reconciliation?.reconciled),brokerReference:clean(input.reconciliation?.brokerReference)}
 };
 return {...a,validation:validateCorporateAction(a)};
}
export function buildCorporateActionFingerprint(a={}){
 return [clean(a.market)||"NSE",clean(a.symbol)?.toUpperCase()||"UNKNOWN",clean(a.type)||"OTHER",
 date(a.exDate)||date(a.recordDate)||date(a.effectiveDate)||date(a.announcementDate)||"NO_DATE",
 num(a.cashAmountPerShare)??"",num(a.subscriptionPrice)??"",num(a.ratio?.newShares)??"",num(a.ratio?.existingShares)??""].join("|");
}
