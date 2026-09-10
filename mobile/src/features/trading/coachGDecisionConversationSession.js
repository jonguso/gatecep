// PC-030M20AT — Floating Coach G decision conversation session
// In-memory/advisory only. No REAL, Practice, goal, DNA or broker mutation.
const listeners=new Set(); let current=null; let seq=0;
const clean=v=>String(v??"").trim();
const upper=v=>clean(v).toUpperCase();
const turn=(role,text,kind="MESSAGE")=>({id:`m20at-${Date.now()}-${++seq}`,role,text:clean(text),kind});
const money=v=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0});
const emit=()=>listeners.forEach(fn=>fn(current));

function amountFrom(text){
  const m=clean(text).replace(/,/g,"").match(/(?:KES|KSH|SHS?)?\s*(\d+(?:\.\d+)?)\s*(K|M)?/i);
  if(!m)return null; let n=Number(m[1]); if(upper(m[2])==="K")n*=1000;if(upper(m[2])==="M")n*=1000000;return n>0?n:null;
}
function describe(s={}){
  const a=upper(s.action)||"EXPLORE", sym=upper(s.security)||"open what-if", amt=Number(s.amount||0);
  return `${a} ${sym}${amt?` • about KES ${money(amt)}`:""}${s.investorReason?` • ${upper(s.investorReason).replaceAll("_"," ")}`:""}${s.decisionPriority?` • priority: ${upper(s.decisionPriority).replaceAll("_"," ")}`:""}`;
}
function absorb(session,text){
  const facts={...(session.facts||{})}, u=upper(text), action=upper(session.scenario?.action), amt=amountFrom(text);
  if(["SELL","REDUCE"].includes(action)){
    if(!facts.releasedCashPurpose){
      const p=[]; if(/LIQUID|CASH|RESERVE|EMERGEN/.test(u))p.push("LIQUIDITY"); if(/GOAL|HOME|HOUSE|SCHOOL|RETIRE|DEBT/.test(u))p.push("GOAL"); if(/REINVEST|INVEST|SECTOR|STOCK|SHARE|UNDERWEIGHT/.test(u))p.push("REINVESTMENT");
      facts.releasedCashPurpose=p.length?p.join(" + "):clean(text);
    }
    if(/LIQUID|CASH|KEEP|RESERVE/.test(u)&&amt)facts.liquidityAmount=amt;
    if(session.investorAnswerCount>=1)facts.tradeOff=clean(text);
  }else{
    if(!facts.desiredOutcome)facts.desiredOutcome=clean(text); else if(!facts.tradeOff)facts.tradeOff=clean(text);
  }
  return facts;
}
function nextQuestion(s){
  const action=upper(s.scenario?.action), f=s.facts||{}, count=s.investorAnswerCount||0;
  if(["SELL","REDUCE"].includes(action)){
    if(!f.releasedCashPurpose)return "What would you like the released cash to accomplish?";
    if(f.releasedCashPurpose.includes("LIQUIDITY")&&!f.liquidityAmount&&count<3)return "About how much of the released cash would you prefer to keep liquid?";
    if(!f.tradeOff&&count<3)return "What matters more here: liquidity now, reducing concentration, or keeping more capital invested for growth?";
    return null;
  }
  if(!f.desiredOutcome)return "What outcome would make this idea worthwhile for you?";
  if(!f.tradeOff&&count<3)return "What would make you reject or reduce this idea—too much concentration, too little cash, goal impact, or something else?";
  return null;
}
export function buildDecisionConversationSummary(s=current){
  if(!s)return null; const f=s.facts||{}, lines=[`You are considering ${describe(s.scenario)}.`], action=upper(s.scenario?.action);
  if(["SELL","REDUCE"].includes(action)){
    if(f.releasedCashPurpose)lines.push(`You want the released cash to support: ${f.releasedCashPurpose.toLowerCase()}.`);
    if(f.liquidityAmount)lines.push(`You indicated roughly KES ${money(f.liquidityAmount)} should remain liquid.`);
    if(f.tradeOff)lines.push(`Your trade-off is: ${f.tradeOff}`);
  }else{
    if(f.desiredOutcome)lines.push(`The outcome you want is: ${f.desiredOutcome}`);
    if(f.tradeOff)lines.push(`Your main concern or rejection condition is: ${f.tradeOff}`);
  }
  if(f.investorCorrection)lines.push(`Your correction is: ${f.investorCorrection}`);
  lines.push("This remains hypothetical. No REAL or Practice portfolio, goal, cash balance, or Investor DNA has changed.");
  return lines.join(" ");
}
export function buildRecommendationPrompt(s=current){
  return ["You are Coach G, GateCEP's AI Wealth Companion.","The investor completed decision discovery and confirmed the summary.",`Scenario: ${describe(s?.scenario)}.`,`Confirmed understanding: ${buildDecisionConversationSummary(s)}`,"Give a concise recommendation using only available authenticated portfolio, goal and risk evidence. Explain trade-offs. Do not invent returns, probabilities, goals, FIFO evidence or broker execution. Do not execute or mutate anything. The decision remains the investor's."].join("\n");
}
export function startDecisionConversation({scenario,openingText="",openingQuestion=""}={}){
  // PC-030M20AT1 answerable question guard
  const supplied=clean(openingQuestion);
  const suppliedIsQuestion=supplied.endsWith("?") && supplied.length > 4;
  const q=suppliedIsQuestion
    ? supplied
    : (["SELL","REDUCE"].includes(upper(scenario?.action))
        ? "What would you like the released cash to accomplish?"
        : "What outcome would make this idea worthwhile for you?");
  current={version:"PC-030M20AT",phase:"DISCOVERY",scenario:{...(scenario||{})},facts:{},investorAnswerCount:0,summaryConfirmed:false,recommendation:null,turns:[turn("COACH",clean(openingText)||`I understand the starting idea: ${describe(scenario)}.`),turn("COACH",q,"QUESTION")],integrity:{sessionOnly:true,advisoryOnly:true,mutatesRealPortfolio:false,mutatesPracticePortfolio:false,mutatesInvestorDNA:false,mutatesGoals:false,brokerExecutionAllowed:false}};emit();return current;
}
export function submitDecisionConversationAnswer(text){
  if(!current||!clean(text))return current;
  current={...current,facts:absorb(current,text),investorAnswerCount:current.investorAnswerCount+1,turns:[...current.turns,turn("INVESTOR",text)]};
  const q=nextQuestion(current);
  if(q)current={...current,phase:"DISCOVERY",turns:[...current.turns,turn("COACH",q,"QUESTION")]};
  else current=toSummary(current);
  emit();return current;
}
function toSummary(s){const summary=buildDecisionConversationSummary(s);return {...s,phase:"SUMMARY",turns:[...s.turns,turn("COACH","Here is what I understand.","SUMMARY"),turn("COACH",summary,"SUMMARY"),turn("COACH","Is that correct? Confirm it or tell me what I should change.","QUESTION")]};}
export function requestDecisionConversationSummary(){if(!current)return null;current=toSummary(current);emit();return current;}
export function correctDecisionConversationSummary(text){if(!current||!clean(text))return current;current={...current,phase:"DISCOVERY",facts:{...current.facts,investorCorrection:clean(text)},turns:[...current.turns,turn("INVESTOR",text,"CORRECTION"),turn("COACH","Thanks. I kept that correction. What else should I understand before I summarize again?","QUESTION")]};emit();return current;}
export function confirmDecisionConversationSummary(){if(!current)return null;current={...current,phase:"RECOMMENDATION_READY",summaryConfirmed:true,turns:[...current.turns,turn("INVESTOR","Yes — that summary is correct.","CONFIRMATION"),turn("COACH","Understood. I can now evaluate the confirmed scenario.","STATUS")]};emit();return current;}
export function completeDecisionRecommendation(result={}){if(!current)return null;current={...current,phase:"RECOMMENDATION",recommendation:result,turns:[...current.turns,turn("COACH",result.answer||"Recommendation unavailable.","RECOMMENDATION")]};emit();return current;}
export const getDecisionConversationSession=()=>current;
export function subscribeDecisionConversation(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function clearDecisionConversation(){current=null;emit();}
