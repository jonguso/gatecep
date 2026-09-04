export const NEWS_TABS=["Market","Company","Dividends","Coach G"];
export function buildVerifiedNews({quotes=[],actions=[],generatedAt=null,provider="",externalNews=[]}={}){
 const valid=quotes.filter(q=>Number(q.price)>0&&q.symbol),date=generatedAt?String(generatedAt).slice(0,10):null,source=provider||"Verified market provider";
 const gainers=[...valid].filter(q=>Number(q.changePct)>0).sort((a,b)=>Number(b.changePct)-Number(a.changePct)),losers=[...valid].filter(q=>Number(q.changePct)<0).sort((a,b)=>Number(a.changePct)-Number(b.changePct)),rows=[];
 if(valid.length&&date)rows.push({id:`MARKET-${date}`,category:"Market",symbol:"NSE",title:`Verified market snapshot covers ${valid.length} securities`,source,date,detail:`${gainers.length} advanced and ${losers.length} declined in the available verified snapshot.`});
 [...gainers.slice(0,3),...losers.slice(0,3)].forEach(q=>rows.push({id:`COMPANY-${q.symbol}-${date}`,category:"Company",symbol:q.symbol,title:`${q.name||q.symbol} moved ${Number(q.changePct).toFixed(2)}%`,source,date,detail:`Verified closing price: KES ${Number(q.price).toFixed(2)}.`}));
 actions.filter(a=>String(a?.source?.reference||a?.sourceReference||"").trim()&&String(a.actionType||a.type||"").includes("DIVIDEND")).forEach(a=>rows.push({id:`DIVIDEND-${a.id}`,category:"Dividends",symbol:a.symbol,title:a.title||"Verified dividend corporate action",source:a?.source?.provider||a?.source?.type||"Verified corporate-action evidence",date:String(a.paymentDate||a.recordDate||a.exDate||a.announcementDate||"").slice(0,10),detail:a.description||"Review the verified dates and terms."}));
 if(valid.length&&date){const up=gainers[0],down=losers[0];rows.push({id:`COACH-${date}`,category:"Coach G",symbol:"NSE",title:"Coach G market observation",source:"Coach G analysis",date,detail:`Based on ${valid.length} verified prices${up?`, ${up.symbol} led gains`:""}${down?` while ${down.symbol} had the largest decline`:""}. This is analysis, not news or a trade instruction.`})}
 const imported=(Array.isArray(externalNews)?externalNews:[]).filter(x=>x&&x.id&&["Market","Company","Dividends"].includes(x.category)).map(x=>({
  id:`NEWS-${x.id}`,category:x.category,symbol:Array.isArray(x.symbols)&&x.symbols.length?x.symbols.join(", "):"NSE",title:x.title,source:x.source,date:x.publishedAt?String(x.publishedAt).slice(0,10):null,detail:x.detail,url:x.url,trustLevel:x.trustLevel||"REPORTED",symbols:x.symbols||[]
 }));
 return [...imported,...rows];
}
export function getNewsForTab(rows,tab){return rows.filter(x=>x.category===tab)}
export function getNewsSummary(rows=[]){return{market:rows.filter(x=>x.category==="Market").length,company:rows.filter(x=>x.category==="Company").length,dividends:rows.filter(x=>x.category==="Dividends").length,coachG:rows.filter(x=>x.category==="Coach G").length}}
