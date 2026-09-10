/* PC-030M20AR9 — Investor-facing Coach G dialogue helpers.
 * Pure/read-only. BUY/ADD and SELL/REDUCE use different reasoning paths.
 */

export function normalizeDecisionEntryContext(params = {}) {
  const read = (value) => Array.isArray(value) ? value[0] : value;
  const source = String(read(params?.decisionSource) || "DIRECT").toUpperCase();
  const goalName = read(params?.goalName) || null;
  const largestSector = read(params?.largestSector) || null;
  const context = { source, goalName, targetAmount:read(params?.targetAmount)||null, targetDate:read(params?.targetDate)||null, monthlyContribution:read(params?.monthlyContribution)||null, projectedValue:read(params?.projectedValue)||null, goalGap:read(params?.goalGap)||null, requiredMonthlyContribution:read(params?.requiredMonthlyContribution)||null, defensiveGap:read(params?.defensiveGap)||null, largestSector, largestCurrent:read(params?.largestCurrent)||null, largestSimulated:read(params?.largestSimulated)||null };
  context.hasRecoveryContext = source === "COACH_G_RECOVERY" && Boolean(goalName || largestSector || context.goalGap || context.projectedValue);
  return context;
}

export function buildEntryDialogue(context = {}) {
  if (context?.source === "COACH_G_RECOVERY") {
    const goal=context?.goalName?` for ${context.goalName}`:"";
    const gap=context?.goalGap!=null&&context?.goalGap!==""?` The recovery scenario showed a remaining goal gap of KES ${context.goalGap}.`:"";
    const sector=context?.largestSector?` ${context.largestSector} was the largest sector in that scenario.`:"";
    return {role:"COACH",text:`I brought your recovery recommendation${goal} into the Decision Lab, so we can continue from there rather than starting over.${gap}${sector}`,question:"What part of that recommendation would you like to test before deciding?"};
  }
  if (context?.source === "WHAT_IF") return {role:"COACH",text:"Tell me what new money or change you are thinking about. I will test it against the portfolio evidence, goals and Investor DNA we already have.",question:"What amount would you like to explore?"};
  if (context?.source === "SECURITY_IDEA") return {role:"COACH",text:"Tell me the security you heard about and why it caught your attention. I will separate whether the security is interesting from whether it fits your portfolio.",question:"Which security are you considering?"};
  return {role:"COACH",text:"Tell me the decision you are considering. I will keep the context as we test different assumptions.",question:"What are you thinking of buying, selling or changing?"};
}

export function summarizeInvestorTurn(scenario = {}) {
  const pieces=[];
  if(scenario?.action) pieces.push(scenario.action);
  if(scenario?.security) pieces.push(scenario.security);
  if(Number(scenario?.amount)>0) pieces.push(`KES ${Number(scenario.amount).toLocaleString()}`);
  if(scenario?.investorReason) pieces.push(`Reason: ${String(scenario.investorReason).replaceAll("_"," ")}`);
  if(scenario?.decisionPriority) pieces.push(`Priority: ${String(scenario.decisionPriority).replaceAll("_"," ")}`);
  return pieces.length?pieces.join(" • "):"I want to explore this decision.";
}

export function buildAccommodationDialogue(analysis = {}) {
  if(!analysis) return null;
  const sector=analysis?.sector||"this sector";
  const current=analysis?.sectorImpact?.currentSectorWeight;
  const projected=analysis?.sectorImpact?.projectedSectorWeight;
  const movement=current!=null&&projected!=null?` ${sector} exposure would move from ${current}% to ${projected}%.`:"";

  if(analysis?.isSell) {
    const released=Number(analysis?.releasedCashEstimate||0);
    const cashText=released>0?` The modeled reduction would release about KES ${released.toLocaleString()} before detailed execution charges and FIFO cost-basis confirmation.`:"";
    const effect=analysis?.concentrationDecreases?" This first portfolio-fit check reduces sector concentration.":" This first portfolio-fit check does not increase sector concentration.";
    return {
      role:"COACH",
      text:`You are considering reducing ${analysis?.symbol || "this holding"}.${movement}${effect}${cashText}`,
      question:"What would you like the released cash to accomplish?"
    };
  }

  if(analysis?.concentrationIncreases) return {role:"COACH",text:`The idea is investable as a scenario, but it increases concentration.${movement}`,question:`Would you like me to explore ways to accommodate ${analysis?.symbol || "it"} without simply adding more ${sector} exposure?`};
  return {role:"COACH",text:`I do not see a concentration increase from this first portfolio-fit check.${movement}`,question:"Would you like to continue to the detailed simulation or change one assumption first?"};
}

export function buildAlternativeDialogue(analysis = {}) {
  if(analysis?.isSell) {
    const hasUnderweight=Boolean(analysis?.underweightEvidenceAvailable);
    return {role:"COACH",text:`We can keep the released cash as liquidity, test it against a saved goal, or compare a reinvestment path.${hasUnderweight?" I also found underweight-sector alternatives from saved target evidence.":" I do not have verified target-sector evidence here, so I will not invent an underweight sector."}`,question:"Which use of the released cash would you like to examine?"};
  }
  const count=Number(analysis?.rotationCandidates?.length||0);
  const hasUnderweight=Boolean(analysis?.underweightEvidenceAvailable);
  return {role:"COACH",text:`I found ${count} same-sector funding candidate${count===1?"":"s"} from your actual holdings.${hasUnderweight?" I also found underweight-sector alternatives from saved target evidence.":" I do not have verified target-sector evidence here, so I will not invent an underweight sector."}`,question:"Which option should we examine more closely?"};
}

export function appendDialogueTurn(turns = [], turn) {
  if(!turn?.text) return Array.isArray(turns)?turns:[];
  return [...(Array.isArray(turns)?turns:[]),{id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,role:turn.role==="INVESTOR"?"INVESTOR":"COACH",text:String(turn.text),question:turn.question?String(turn.question):null}];
}

export const DECISION_DIALOGUE_INTEGRITY=Object.freeze({advisoryOnly:true,mutatesRealPortfolio:false,mutatesPracticePortfolio:false,mutatesInvestorDNA:false,retainsConversationContext:true,actionAware:true});
