export const CALENDAR_TABS=["This Month","Next 6 Months","Last 12 Months"];
const VERIFIED=new Set(["ISSUER","EXCHANGE","REGULATOR","BROKER","CUSTODIAN","MANUAL_VERIFIED","PROVIDER"]);
export function buildVerifiedCalendarEvents(actions=[],tab="This Month",now=new Date()){
 const start=rangeStart(tab,now).getTime(),end=rangeEnd(tab,now).getTime();
 return actions.flatMap(toEvents).filter(e=>{const t=Date.parse(e.date);return e.verified&&Number.isFinite(t)&&t>=start&&t<=end}).sort((x,y)=>x.date.localeCompare(y.date));
}
function toEvents(a={}){
 const source=String(a?.source?.type||a?.source||"").toUpperCase();
 const verified=VERIFIED.has(source)&&Boolean(a?.source?.reference||a?.sourceReference);
 return [["EX_DATE",a.exDate],["RECORD_DATE",a.recordDate],["BOOK_CLOSURE",a.bookClosureDate],["PAYMENT_DATE",a.paymentDate],["EFFECTIVE_DATE",a.effectiveDate],["ELECTION_DEADLINE",a.electionDeadline]].filter(([,d])=>d).map(([type,date])=>({id:`${a.id||a.symbol}-${type}-${String(date).slice(0,10)}`,type,symbol:a.symbol||"NSE",company:a.companyName||a.symbol||"NSE security",date:String(date).slice(0,10),title:a.title||`${String(a.actionType||a.type||"Corporate action").replaceAll("_"," ")} · ${type.replaceAll("_"," ")}`,detail:a.description||"Verified corporate-action evidence.",verified,source}));
}
function rangeStart(tab,d0){const d=new Date(d0);if(tab==="This Month")return new Date(d.getFullYear(),d.getMonth(),1);if(tab==="Next 6 Months")return new Date(d.getFullYear(),d.getMonth(),d.getDate());return new Date(d.getFullYear()-1,d.getMonth(),d.getDate())}
function rangeEnd(tab,d0){const d=new Date(d0);if(tab==="This Month")return new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999);if(tab==="Next 6 Months")return new Date(d.getFullYear(),d.getMonth()+6,d.getDate(),23,59,59,999);return new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999)}
export function getCalendarSummary(events=[]){return{total:events.length,dividends:events.filter(e=>String(e.title).includes("DIVIDEND")).length,deadlines:events.filter(e=>e.type.includes("DEADLINE")||e.type==="BOOK_CLOSURE").length,actions:new Set(events.map(e=>e.symbol)).size}}
