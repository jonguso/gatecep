import {CORPORATE_ACTION_STATUSES,buildCorporateAction,buildCorporateActionFingerprint} from "./corporateActionModel";
let registry=[];
const clone=v=>JSON.parse(JSON.stringify(v));
export function clearCorporateActionRegistry(){registry=[];}
export function loadCorporateActions({symbol=null,type=null,status=null}={}){
 let r=registry;if(symbol)r=r.filter(x=>x.symbol===String(symbol).trim().toUpperCase());
 if(type)r=r.filter(x=>x.type===type);if(status)r=r.filter(x=>x.status===status);return clone(r);
}
export function loadCorporateActionById(id){const x=registry.find(v=>v.id===id);return x?clone(x):null;}
export function detectCorporateActionDuplicate(input={}){
 const a=buildCorporateAction(input),fingerprint=buildCorporateActionFingerprint(a);
 const m=registry.find(x=>buildCorporateActionFingerprint(x)===fingerprint&&![CORPORATE_ACTION_STATUSES.CANCELLED,CORPORATE_ACTION_STATUSES.SUPERSEDED].includes(x.status));
 return {duplicate:Boolean(m),fingerprint,matchingAction:m?clone(m):null};
}
export function registerCorporateAction(input={},options={}){
 const action=buildCorporateAction(input);if(!action.validation.valid)return {success:false,error:"VALIDATION_FAILED",action,validation:action.validation};
 const duplicate=detectCorporateActionDuplicate(action);
 if(duplicate.duplicate&&!options.allowDuplicate)return {success:false,error:"DUPLICATE_CORPORATE_ACTION",action,duplicate};
 registry=[action,...registry];return {success:true,action:clone(action),duplicate};
}
export function updateCorporateAction(id,changes={}){
 const i=registry.findIndex(x=>x.id===id);if(i<0)return {success:false,error:"CORPORATE_ACTION_NOT_FOUND"};
 const old=registry[i],next=buildCorporateAction({...old,...changes,id:old.id,audit:{...old.audit,...changes.audit,revision:(old.audit?.revision||1)+1}});
 if(!next.validation.valid)return {success:false,error:"VALIDATION_FAILED",action:next,validation:next.validation};
 registry[i]=next;return {success:true,action:clone(next)};
}
export function transitionCorporateActionStatus(id,status){
 if(!Object.values(CORPORATE_ACTION_STATUSES).includes(status))return {success:false,error:"INVALID_CORPORATE_ACTION_STATUS"};
 return updateCorporateAction(id,{status});
}
export function loadUpcomingCorporateActions({fromDate=new Date().toISOString().slice(0,10),limit=20}={}){
 return clone(registry.filter(x=>{const d=x.exDate||x.recordDate||x.effectiveDate||x.paymentDate;return d&&d>=fromDate&&![CORPORATE_ACTION_STATUSES.CANCELLED,CORPORATE_ACTION_STATUSES.SUPERSEDED,CORPORATE_ACTION_STATUSES.RECONCILED].includes(x.status)})
 .sort((a,b)=>String(a.exDate||a.recordDate||a.effectiveDate||a.paymentDate).localeCompare(String(b.exDate||b.recordDate||b.effectiveDate||b.paymentDate))).slice(0,limit));
}
export function buildCorporateActionRegistrySummary(){
 const byType={},byStatus={};registry.forEach(x=>{byType[x.type]=(byType[x.type]||0)+1;byStatus[x.status]=(byStatus[x.status]||0)+1;});
 return {total:registry.length,byType,byStatus,expectedOnly:registry.filter(x=>x.reconciliation?.expectedOnly).length,brokerConfirmed:registry.filter(x=>x.reconciliation?.brokerConfirmed).length,reconciled:registry.filter(x=>x.reconciliation?.reconciled).length};
}
