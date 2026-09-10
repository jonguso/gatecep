function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function pct(v) { return Math.round(n(v) * 100) / 100; }
function text(v) { return String(v ?? "").trim(); }
function upper(v) { return text(v).toUpperCase(); }

function holdingValue(h = {}) {
  const direct = h.marketValue ?? h.currentValue ?? h.value ?? h.holdingsValue;
  if (direct !== null && direct !== undefined && Number.isFinite(Number(direct))) return Number(direct);
  const qty = n(h.quantity ?? h.qty ?? h.shares);
  const price = n(h.marketPrice ?? h.currentPrice ?? h.price ?? h.lastPrice ?? h.averagePrice);
  return qty * price;
}

export function normalizeDecisionHolding(h = {}) {
  return {
    raw: h,
    symbol: upper(h.symbol ?? h.code ?? h.security),
    name: text(h.name ?? h.companyName ?? h.securityName ?? h.symbol),
    sector: text(h.sector ?? h.industry ?? "Unknown") || "Unknown",
    value: holdingValue(h),
    quantity: n(h.quantity ?? h.qty ?? h.shares)
  };
}

export function buildSectorExposure(holdings = []) {
  const rows = (Array.isArray(holdings) ? holdings : []).map(normalizeDecisionHolding).filter(x => x.value > 0);
  const total = rows.reduce((s, x) => s + x.value, 0);
  const map = new Map();
  for (const row of rows) map.set(row.sector, n(map.get(row.sector)) + row.value);
  return [...map.entries()].map(([sector, value]) => ({ sector, value, weight: total > 0 ? pct(value / total * 100) : null }))
    .sort((a,b) => b.value-a.value);
}

export function calculateSectorAccommodation({ holdings = [], proposedSector, proposedAmount, sectorLimitPercent = 40 } = {}) {
  const amount = Math.max(0, n(proposedAmount));
  const rows = (Array.isArray(holdings) ? holdings : []).map(normalizeDecisionHolding);
  const total = rows.reduce((s,x)=>s+x.value,0);
  const sector = text(proposedSector) || "Unknown";
  const sectorValue = rows.filter(x=>x.sector===sector).reduce((s,x)=>s+x.value,0);
  const currentSectorWeight = total > 0 ? pct(sectorValue/total*100) : null;
  const projectedSectorWeight = total + amount > 0 ? pct((sectorValue+amount)/(total+amount)*100) : null;
  const limit = n(sectorLimitPercent) > 0 ? n(sectorLimitPercent) : 40;
  const maxByLimit = total > 0 && sectorValue/total < limit/100
    ? Math.max(0, ((limit/100)*total - sectorValue) / (1 - limit/100))
    : 0;
  return {
    sector, totalHoldingsValue: total, sectorValue, proposedAmount: amount,
    currentSectorWeight, projectedSectorWeight, sectorLimitPercent: limit,
    exceedsSectorGuard: projectedSectorWeight !== null && projectedSectorWeight >= limit,
    maxAdditionalBeforeSectorGuard: Math.floor(maxByLimit * 100) / 100
  };
}

export function calculateSectorReduction({ holdings = [], proposedSector, proposedSymbol, proposedAmount } = {}) {
  const rows=(Array.isArray(holdings)?holdings:[]).map(normalizeDecisionHolding);
  const sector=text(proposedSector)||"Unknown";
  const symbol=upper(proposedSymbol);
  const total=rows.reduce((s,x)=>s+x.value,0);
  const sectorValue=rows.filter(x=>x.sector===sector).reduce((s,x)=>s+x.value,0);
  const target=rows.find(x=>x.symbol===symbol) || null;
  const requested=Math.max(0,n(proposedAmount));
  const modeledReduction=Math.min(requested, Math.max(0,n(target?.value)));
  const totalAfter=Math.max(0,total-modeledReduction);
  const sectorAfter=Math.max(0,sectorValue-modeledReduction);
  return {
    sector,
    symbol,
    totalHoldingsValue:total,
    sectorValue,
    targetHoldingValue:n(target?.value),
    requestedReduction:requested,
    modeledReduction,
    currentSectorWeight:total>0?pct(sectorValue/total*100):null,
    projectedSectorWeight:totalAfter>0?pct(sectorAfter/totalAfter*100):0,
    releasedCashEstimate:modeledReduction,
    holdingEvidenceAvailable:Boolean(target && target.value>0),
    requestedExceedsHolding:requested>n(target?.value) && n(target?.value)>0
  };
}

export function buildRotationCandidates({ holdings = [], proposedSector, proposedSymbol, proposedAmount } = {}) {
  const sector = text(proposedSector);
  const symbol = upper(proposedSymbol);
  const amount = Math.max(0, n(proposedAmount));
  return (Array.isArray(holdings) ? holdings : [])
    .map(normalizeDecisionHolding)
    .filter(x => x.value > 0 && x.sector === sector && x.symbol !== symbol)
    .sort((a,b)=>b.value-a.value)
    .map(x => ({
      symbol: x.symbol, name: x.name, sector: x.sector, currentValue: x.value,
      possibleReduction: Math.min(x.value, amount),
      canFullyFund: x.value >= amount,
      advisoryOnly: true
    }));
}

export function buildUnderweightSectorCandidates({ holdings = [], targetSectorWeights = {} } = {}) {
  const targets = targetSectorWeights && typeof targetSectorWeights === "object" ? targetSectorWeights : {};
  const exposures = buildSectorExposure(holdings);
  const current = Object.fromEntries(exposures.map(x => [x.sector, x.weight ?? 0]));
  return Object.entries(targets)
    .map(([sector,target]) => ({ sector, targetWeight:n(target), currentWeight:n(current[sector]), gap:pct(n(target)-n(current[sector])) }))
    .filter(x => x.targetWeight > 0 && x.gap > 0)
    .sort((a,b)=>b.gap-a.gap);
}

export function buildAccommodationAnalysis({ scenario = {}, holdings = [], proposedSector, targetSectorWeights = {}, sectorLimitPercent = 40 } = {}) {
  const symbol = upper(scenario.security);
  const action = upper(scenario.action || "BUY");
  const isSell = action === "SELL" || action === "REDUCE";
  const amount = Math.max(0, n(scenario.amount));
  const sector = text(proposedSector) || "Unknown";
  const underweightSectors = buildUnderweightSectorCandidates({ holdings, targetSectorWeights });

  if (isSell) {
    const sectorImpact=calculateSectorReduction({holdings,proposedSector:sector,proposedSymbol:symbol,proposedAmount:amount});
    const concentrationDecreases=sectorImpact.currentSectorWeight!==null && sectorImpact.projectedSectorWeight!==null && sectorImpact.projectedSectorWeight < sectorImpact.currentSectorWeight;
    return {
      version:"PC-030M20AR9", action, isSell:true, symbol, sector, amount, sectorImpact,
      concentrationIncreases:false,
      concentrationDecreases,
      rotationCandidates:[],
      underweightSectors,
      underweightEvidenceAvailable:Object.keys(targetSectorWeights || {}).length > 0,
      releasedCashEstimate:sectorImpact.releasedCashEstimate,
      coachQuestion:"What would you like the released cash to accomplish?",
      advisoryOnly:true,
      realPortfolioMutationAllowed:false,
      practicePortfolioMutationAllowed:false,
      investorDNAMutationAllowed:false
    };
  }

  const sectorImpact = calculateSectorAccommodation({ holdings, proposedSector:sector, proposedAmount:amount, sectorLimitPercent });
  const rotationCandidates = buildRotationCandidates({ holdings, proposedSector:sector, proposedSymbol:symbol, proposedAmount:amount });
  const concentrationIncreases = sectorImpact.currentSectorWeight !== null && sectorImpact.projectedSectorWeight !== null && sectorImpact.projectedSectorWeight > sectorImpact.currentSectorWeight;
  return {
    version:"PC-030M20AR9", action, isSell:false, symbol, sector, amount, sectorImpact,
    concentrationIncreases,
    concentrationDecreases:false,
    rotationCandidates,
    underweightSectors,
    underweightEvidenceAvailable: Object.keys(targetSectorWeights || {}).length > 0,
    coachQuestion: concentrationIncreases
      ? `Would you still like to explore ways to accommodate ${symbol || "this security"} without increasing your overall ${sector} exposure?`
      : `Would you like Coach G to compare this idea with other ways of deploying the same capital?`,
    advisoryOnly:true,
    realPortfolioMutationAllowed:false,
    practicePortfolioMutationAllowed:false,
    investorDNAMutationAllowed:false
  };
}

export function buildAlternativeComparison({ analysis, selectedRotation } = {}) {
  if (!analysis) return [];
  const s = analysis.sectorImpact || {};
  if (analysis.isSell) {
    return [
      { id:"KEEP_LIQUIDITY", label:"Keep as liquidity", bankOrSectorWeight:s.projectedSectorWeight, newCashNeeded:0, concentrationDirection:analysis.concentrationDecreases?"LOWER":"SIMILAR", description:`Keep the estimated released cash available rather than immediately reallocating it.` },
      { id:"FUND_GOAL", label:"Fund a goal", bankOrSectorWeight:s.projectedSectorWeight, newCashNeeded:0, concentrationDirection:analysis.concentrationDecreases?"LOWER":"SIMILAR", description:"Test whether the released cash improves progress toward a saved goal. Goal values are not changed by this scenario." },
      { id:"UNDERWEIGHT_SECTOR", label:"Reinvest in an underweight sector", bankOrSectorWeight:s.projectedSectorWeight, newCashNeeded:0, concentrationDirection:"PORTFOLIO_DEPENDENT", description:analysis.underweightSectors?.[0]?`Explore redirecting some released cash toward ${analysis.underweightSectors[0].sector}, currently ${analysis.underweightSectors[0].gap}% below its saved target.`:"Saved sector-target evidence is unavailable, so Coach G will not invent an underweight sector." },
      { id:"KEEP_REDUCTION", label:"Keep the reduction only", bankOrSectorWeight:s.projectedSectorWeight, newCashNeeded:0, concentrationDirection:analysis.concentrationDecreases?"LOWER":"SIMILAR", description:`Continue with the ${analysis.symbol} reduction without modeling a second investment decision.` }
    ];
  }
  const rotation = selectedRotation || analysis.rotationCandidates?.[0] || null;
  return [
    { id:"ORIGINAL", label:"Original idea", bankOrSectorWeight:s.projectedSectorWeight, newCashNeeded:analysis.amount, concentrationDirection:analysis.concentrationIncreases?"HIGHER":"SIMILAR", description:`Add ${analysis.symbol || "security"} as proposed.` },
    { id:"ROTATE_WITHIN_SECTOR", label:"Rotate within sector", bankOrSectorWeight:s.currentSectorWeight, newCashNeeded:rotation?.canFullyFund?0:Math.max(0, analysis.amount-n(rotation?.possibleReduction)), concentrationDirection:"SIMILAR", description:rotation?`Reduce ${rotation.symbol} by up to KES ${Math.round(rotation.possibleReduction).toLocaleString()} and redirect proceeds to ${analysis.symbol}.`:"No existing same-sector holding is available to fund this rotation." },
    { id:"REDUCE_AMOUNT", label:"Smaller position", bankOrSectorWeight:null, newCashNeeded:Math.min(analysis.amount, s.maxAdditionalBeforeSectorGuard || analysis.amount), concentrationDirection:"LOWER_THAN_ORIGINAL", description:s.maxAdditionalBeforeSectorGuard>0?`Up to about KES ${Math.round(Math.min(analysis.amount,s.maxAdditionalBeforeSectorGuard)).toLocaleString()} stays below the existing Decision Lab sector concentration guard.`:"A smaller amount can be tested, but no positive amount is available under the current sector guard." },
    { id:"UNDERWEIGHT_SECTOR", label:"Underweight sector", bankOrSectorWeight:s.currentSectorWeight, newCashNeeded:analysis.amount, concentrationDirection:"LOWER_THAN_ORIGINAL", description:analysis.underweightSectors?.[0]?`Redirect the capital toward ${analysis.underweightSectors[0].sector}, currently ${analysis.underweightSectors[0].gap}% below its saved target.`:"Saved sector-target evidence is unavailable, so Coach G will not invent an underweight sector." }
  ];
}
