import { CORPORATE_ACTION_STATUSES, CORPORATE_ACTION_TYPES } from "./corporateActionModel";

export const CORPORATE_ACTION_LIFECYCLE_EVENTS=Object.freeze({
 ANNOUNCE:"ANNOUNCE",START_ELIGIBILITY_REVIEW:"START_ELIGIBILITY_REVIEW",
 START_ENTITLEMENT_REVIEW:"START_ENTITLEMENT_REVIEW",CONFIRM_ENTITLEMENT:"CONFIRM_ENTITLEMENT",
 MARK_EXPECTED:"MARK_EXPECTED",CONFIRM_BROKER_EVENT:"CONFIRM_BROKER_EVENT",
 APPLY:"APPLY",RECONCILE:"RECONCILE",CANCEL:"CANCEL",SUPERSEDE:"SUPERSEDE"
});

const T=CORPORATE_ACTION_STATUSES;
const transitions={
 [T.DRAFT]:[T.ANNOUNCED,T.CANCELLED],
 [T.ANNOUNCED]:[T.ELIGIBILITY_PENDING,T.ENTITLEMENT_PENDING,T.EXPECTED,T.CANCELLED,T.SUPERSEDED],
 [T.ELIGIBILITY_PENDING]:[T.ENTITLEMENT_PENDING,T.ENTITLED,T.CANCELLED,T.SUPERSEDED],
 [T.ENTITLEMENT_PENDING]:[T.ENTITLED,T.CANCELLED,T.SUPERSEDED],
 [T.ENTITLED]:[T.EXPECTED,T.BROKER_CONFIRMED,T.CANCELLED,T.SUPERSEDED],
 [T.EXPECTED]:[T.BROKER_CONFIRMED,T.APPLIED,T.CANCELLED,T.SUPERSEDED],
 [T.BROKER_CONFIRMED]:[T.APPLIED,T.RECONCILED,T.SUPERSEDED],
 [T.APPLIED]:[T.RECONCILED,T.SUPERSEDED],
 [T.RECONCILED]:[],[T.CANCELLED]:[],[T.SUPERSEDED]:[]
};
const eventStatus={
 ANNOUNCE:T.ANNOUNCED,START_ELIGIBILITY_REVIEW:T.ELIGIBILITY_PENDING,
 START_ENTITLEMENT_REVIEW:T.ENTITLEMENT_PENDING,CONFIRM_ENTITLEMENT:T.ENTITLED,
 MARK_EXPECTED:T.EXPECTED,CONFIRM_BROKER_EVENT:T.BROKER_CONFIRMED,
 APPLY:T.APPLIED,RECONCILE:T.RECONCILED,CANCEL:T.CANCELLED,SUPERSEDE:T.SUPERSEDED
};
const terminal=new Set([T.RECONCILED,T.CANCELLED,T.SUPERSEDED]);
export function canTransitionCorporateAction(from,to){return Boolean(transitions[from]?.includes(to));}
export function loadAllowedCorporateActionTransitions(status){return [...(transitions[status]||[])];}
export function transitionCorporateActionLifecycle({action,event,actor="SYSTEM",reason=null,at=new Date().toISOString()}={}){
 if(!action?.id)return {success:false,error:"CORPORATE_ACTION_REQUIRED"};
 const to=eventStatus[event]; if(!to)return {success:false,error:"INVALID_LIFECYCLE_EVENT"};
 if(!canTransitionCorporateAction(action.status,to))return {success:false,error:"INVALID_LIFECYCLE_TRANSITION",fromStatus:action.status,toStatus:to,allowed:loadAllowedCorporateActionTransitions(action.status)};
 const entry={event,fromStatus:action.status,toStatus:to,at,actor:String(actor||"SYSTEM"),reason:reason?String(reason):null};
 return {success:true,action:{...action,status:to,lifecycleHistory:[...(action.lifecycleHistory||[]),entry],audit:{...(action.audit||{}),updatedAt:at,revision:(action.audit?.revision||1)+1}},lifecycleEntry:entry};
}
export function calculateCorporateActionLifecycleProgress(action={}){
 return ({[T.DRAFT]:0,[T.ANNOUNCED]:10,[T.ELIGIBILITY_PENDING]:25,[T.ENTITLEMENT_PENDING]:35,[T.ENTITLED]:50,[T.EXPECTED]:65,[T.BROKER_CONFIRMED]:80,[T.APPLIED]:90,[T.RECONCILED]:100,[T.CANCELLED]:100,[T.SUPERSEDED]:100})[action.status]??0;
}
export function classifyCorporateActionInvestorAttention(action={}){
 if(terminal.has(action.status))return {level:"NONE",actionRequired:false,reason:"Corporate action lifecycle is complete."};
 if([CORPORATE_ACTION_TYPES.RIGHTS_ISSUE,CORPORATE_ACTION_TYPES.SCRIP_DIVIDEND,CORPORATE_ACTION_TYPES.MERGER_ACQUISITION].includes(action.type))
  return {level:"HIGH",actionRequired:true,reason:"Investor may need to make or confirm a financial decision."};
 if([CORPORATE_ACTION_TYPES.CASH_DIVIDEND,CORPORATE_ACTION_TYPES.SPECIAL_DIVIDEND,CORPORATE_ACTION_TYPES.BONUS_ISSUE,CORPORATE_ACTION_TYPES.STOCK_SPLIT,CORPORATE_ACTION_TYPES.SHARE_CONSOLIDATION].includes(action.type))
  return {level:"MEDIUM",actionRequired:false,reason:"Event may affect income, shares, portfolio value, or performance interpretation."};
 return {level:"LOW",actionRequired:false,reason:"Event should be monitored for investor impact."};
}
export function buildCorporateActionLifecycleAnalysis(action={}){
 const investorAttention=classifyCorporateActionInvestorAttention(action);
 return {actionId:action.id||null,symbol:action.symbol||null,type:action.type||null,status:action.status||null,
  progress:calculateCorporateActionLifecycleProgress(action),
  eventDate:action.exDate||action.recordDate||action.effectiveDate||action.paymentDate||action.announcementDate||null,
  terminal:terminal.has(action.status),allowedTransitions:loadAllowedCorporateActionTransitions(action.status),investorAttention,
  coachGContext:{shouldExplain:investorAttention.level!=="NONE",shouldAskInvestor:investorAttention.actionRequired||[T.ELIGIBILITY_PENDING,T.ENTITLEMENT_PENDING].includes(action.status),shouldMonitor:!terminal.has(action.status),explanationFocus:investorAttention.reason}};
}
export function buildCorporateActionLifecycleBatch(actions=[]){
 const rank={HIGH:3,MEDIUM:2,LOW:1,NONE:0};
 return (Array.isArray(actions)?actions:[]).map(buildCorporateActionLifecycleAnalysis).sort((a,b)=>(rank[b.investorAttention.level]-rank[a.investorAttention.level])||String(a.eventDate||"").localeCompare(String(b.eventDate||"")));
}
export function loadCorporateActionsNeedingInvestorAttention(actions=[]){
 return buildCorporateActionLifecycleBatch(actions).filter(x=>x.investorAttention.level==="HIGH"||x.coachGContext.shouldAskInvestor);
}
