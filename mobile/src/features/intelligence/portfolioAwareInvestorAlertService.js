const ACTIONS = Object.freeze({
  CONSIDER_BUYING: "CONSIDER_BUYING",
  ADD_GRADUALLY: "ADD_GRADUALLY",
  HOLD_MONITOR: "HOLD_MONITOR",
  CONSIDER_REDUCING: "CONSIDER_REDUCING",
  DIVIDEND_REMINDER: "DIVIDEND_REMINDER",
  REVIEW_CORPORATE_ACTION: "REVIEW_CORPORATE_ACTION",
  NO_ACTION: "NO_ACTION",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE"
});

const LABELS = {
  [ACTIONS.CONSIDER_BUYING]: "Consider Buying",
  [ACTIONS.ADD_GRADUALLY]: "Consider Adding Gradually",
  [ACTIONS.HOLD_MONITOR]: "Hold and Monitor",
  [ACTIONS.CONSIDER_REDUCING]: "Consider Reducing",
  [ACTIONS.DIVIDEND_REMINDER]: "Dividend Date Reminder",
  [ACTIONS.REVIEW_CORPORATE_ACTION]: "Review Corporate Action",
  [ACTIONS.NO_ACTION]: "No Portfolio Action Needed",
  [ACTIONS.INSUFFICIENT_EVIDENCE]: "Insufficient Verified Evidence"
};

const normalize = (value) => String(value || "").trim().toUpperCase();
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value) => Number(number(value).toFixed(2));

function holdingValue(holding = {}) {
  return number(holding.marketValue ?? holding.value) || number(holding.quantity) * number(holding.marketPrice ?? holding.price);
}

function evidenceSymbols(evidence = {}) {
  const symbols = Array.isArray(evidence.symbols) ? evidence.symbols : String(evidence.symbol || "").split(",");
  return [...new Set(symbols.map(normalize).filter((symbol) => symbol && symbol !== "NSE"))];
}

function isDividendEvidence(evidence = {}) {
  return /DIVIDEND|EX_DATE|RECORD_DATE|BOOK_CLOSURE|PAYMENT_DATE/.test(normalize(`${evidence.category} ${evidence.type} ${evidence.actionType} ${evidence.title}`));
}

function isMaterialExitEvidence(evidence = {}) {
  return /DELIST|LIQUIDAT|INSOLVEN|TRADING SUSPENSION/.test(normalize(`${evidence.type} ${evidence.actionType} ${evidence.title} ${evidence.detail}`));
}

function isVerified(evidence = {}) {
  const trust = normalize(evidence.trustLevel);
  return ["OFFICIAL", "VERIFIED"].includes(trust)
    || (evidence.verified === true && trust !== "REPORTED");
}

function targetForSector(sectorTargets = {}, sector) {
  const entry = Object.entries(sectorTargets || {}).find(([key]) => normalize(key) === normalize(sector));
  return number(entry?.[1]);
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";

function reportedDividendClues(evidence = {}) {
  const text = `${evidence.title || ""} ${evidence.detail || evidence.description || ""}`;
  const year = String(evidence.date || evidence.publishedAt || evidence.announcementDate || new Date().toISOString()).slice(0, 4);
  const dateAfter = (phrase) => {
    const match = text.match(new RegExp(`${phrase}[^.]{0,90}?(${MONTHS})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`, "i"));
    if (!match) return null;
    const parsed = new Date(`${match[1]} ${match[2]}, ${match[3] || year} 12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  };
  const rateMatch = text.match(/(?:dividend(?:\s+of)?|distribution(?:\s+of)?)\s*(?:KES|KSH|SH)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return {
    dividendPerShare: rateMatch ? number(rateMatch[1]) : null,
    recordDate: dateAfter("(?:register|record|book[ -]?closure)"),
    paymentDate: dateAfter("(?:pay|payment|payable)"),
    status: "REPORTED_AWAITING_VERIFICATION"
  };
}

function dividendEvidenceReview({ evidence, verified, dividendPerShare, dates, reportedClues = {} }) {
  const known = [];
  const missing = [];
  if (verified) known.push("official or verified announcement");
  else missing.push("official issuer, NSE, registrar or custodian confirmation");
  if (dividendPerShare > 0) known.push(`dividend rate of KES ${dividendPerShare.toFixed(2)} per share`);
  else missing.push("dividend per share");
  if (dates.exDate) known.push(`ex-dividend date ${dates.exDate}`);
  else missing.push("ex-dividend date");
  if (evidence.recordDate || evidence.bookClosureDate) known.push("record or book-closure date");
  else missing.push(reportedClues.recordDate ? "official verification of the reported record/register date" : "record or book-closure date");
  if (evidence.paymentDate) known.push("payment date");
  else missing.push(reportedClues.paymentDate ? "official verification of the reported payment date" : "payment date");
  return { known, missing };
}

function dateState(evidence = {}, asOfDate) {
  const today = new Date(`${asOfDate}T12:00:00`);
  const exDateValue = evidence.exDate || (normalize(evidence.type) === "EX_DATE" ? evidence.date : null);
  const exDate = exDateValue ? new Date(`${String(exDateValue).slice(0, 10)}T12:00:00`) : null;
  if (!exDate || Number.isNaN(exDate.getTime())) return { exDate: null, phase: "UNKNOWN" };
  if (today < exDate) return { exDate: String(exDateValue).slice(0, 10), phase: "CUM_DIVIDEND" };
  if (today.toISOString().slice(0, 10) === exDate.toISOString().slice(0, 10)) return { exDate: String(exDateValue).slice(0, 10), phase: "EX_DIVIDEND" };
  return { exDate: String(exDateValue).slice(0, 10), phase: "AFTER_EX_DATE" };
}

export function buildPortfolioAwareInvestorAlert({ evidence = {}, holdings = [], sectorTargets = {}, asOfDate = new Date().toISOString().slice(0, 10) } = {}) {
  const symbols = evidenceSymbols(evidence);
  const portfolio = Array.isArray(holdings) ? holdings : [];
  const totalValue = portfolio.reduce((sum, holding) => sum + holdingValue(holding), 0);
  const matched = portfolio.filter((holding) => symbols.includes(normalize(holding.symbol)));
  const exposureValue = matched.reduce((sum, holding) => sum + holdingValue(holding), 0);
  const quantity = matched.reduce((sum, holding) => sum + number(holding.quantity), 0);
  const weight = totalValue > 0 ? exposureValue / totalValue * 100 : 0;
  const sector = evidence.sector || matched[0]?.sector || null;
  const sectorValue = portfolio.filter((holding) => sector && normalize(holding.sector) === normalize(sector)).reduce((sum, holding) => sum + holdingValue(holding), 0);
  const sectorWeight = totalValue > 0 ? sectorValue / totalValue * 100 : 0;
  const target = targetForSector(sectorTargets, sector);
  const underweight = Boolean(sector && target > 0 && sectorWeight < target);
  const verified = isVerified(evidence);
  const dividend = isDividendEvidence(evidence);
  const dates = dateState(evidence, asOfDate);
  const dividendPerShare = number(evidence.dividendPerShare ?? evidence.cashConsideration);
  const estimatedGrossDividend = dividendPerShare > 0 && quantity > 0 ? quantity * dividendPerShare : null;
  const reportedClues = dividend ? reportedDividendClues(evidence) : null;
  const evidenceReview = dividend
    ? dividendEvidenceReview({ evidence, verified, dividendPerShare, dates, reportedClues })
    : { known: verified ? ["official or verified announcement"] : [], missing: verified ? [] : ["official or verified confirmation"] };
  if (dividend && matched.length && !evidenceReview.missing.includes("broker or custodian holding evidence for the eligibility date")) {
    evidenceReview.missing.push("broker or custodian holding evidence for the eligibility date");
  }

  let action = ACTIONS.NO_ACTION;
  let confidence = verified ? 70 : 25;
  let rationale = matched.length
    ? `You hold ${quantity.toLocaleString()} ${symbols.join(", ")} share${quantity === 1 ? "" : "s"}, representing ${weight.toFixed(2)}% of the REAL portfolio.`
    : `${symbols.join(", ") || "This event"} is not currently held in the REAL portfolio.`;

  if (!verified) {
    action = ACTIONS.INSUFFICIENT_EVIDENCE;
    rationale += " The evidence is not verified enough for a portfolio action.";
  } else if (dividend) {
    action = matched.length ? ACTIONS.DIVIDEND_REMINDER : underweight ? ACTIONS.ADD_GRADUALLY : ACTIONS.NO_ACTION;
    confidence = matched.length ? 88 : 62;
    rationale += dates.phase === "CUM_DIVIDEND"
      ? ` The verified ex-dividend date is ${dates.exDate}; eligibility must be confirmed before acting.`
      : dates.phase === "EX_DIVIDEND"
        ? ` The security is ex-dividend today; buying now should not be assumed to qualify for this dividend.`
        : dates.phase === "AFTER_EX_DATE"
          ? ` The ex-dividend date ${dates.exDate} has passed; this announcement alone is not a reason to buy.`
          : " Confirm the ex-dividend, record, book-closure and payment dates before relying on income.";
    if (!matched.length && underweight) {
      rationale += " The sector is under its illustrative target, but valuation evidence is still required before buying.";
    }
  } else if (isMaterialExitEvidence(evidence) && matched.length) {
    action = ACTIONS.CONSIDER_REDUCING;
    confidence = 90;
    rationale += " This verified security-lifecycle event may materially affect continued ownership and requires prompt review.";
  } else if (matched.length) {
    action = ACTIONS.HOLD_MONITOR;
    rationale += " Review the verified development with valuation, concentration and goal evidence before changing the position.";
  } else if (underweight) {
    action = ACTIONS.ADD_GRADUALLY;
    rationale += ` ${sector} is below its illustrative ${target.toFixed(1)}% target, but valuation evidence is still required before buying.`;
  }

  const incomeOptions = [];
  if (dividend && matched.length) {
    if (target > 0 && underweight) {
      incomeOptions.push(`Compare reinvestment into ${sector} with the saved ${target.toFixed(1)}% sector target; valuation must still support adding.`);
    } else if (target > 0) {
      incomeOptions.push(`${sector} is already at or above its saved target, so do not automatically reinvest the dividend into the same sector.`);
    } else {
      incomeOptions.push("Compare the dividend against your saved sector targets before reinvesting; no sector target was available to this review.");
    }
    incomeOptions.push("Consider directing some or all of the income toward a verified underweight sector rather than increasing an existing concentration.");
    incomeOptions.push("If the defensive-investment target remains underweight, compare a verified money-market fund or fixed-income option.");
    incomeOptions.push(`Only consider adding ${symbols[0] || "the same security"} after checking its current valuation and the normal price adjustment around the ex-dividend date.`);
  }

  const coachMessage = dividend && matched.length
    ? estimatedGrossDividend !== null
      ? `You already own ${quantity.toLocaleString()} share${quantity === 1 ? "" : "s"}. At the stated rate, that could produce about KES ${money(estimatedGrossDividend).toLocaleString()} gross before tax, but I still need to confirm your entitlement. We can then compare reinvesting it, strengthening an underweight sector, or adding to defensive investments without changing your REAL portfolio.`
      : `I can see that you own ${quantity.toLocaleString()} share${quantity === 1 ? "" : "s"}, so this dividend may matter to you. I cannot estimate the income responsibly until the dividend per share and eligibility dates are confirmed. Once they are, we can compare sensible uses of the income without changing your REAL portfolio.`
    : rationale;

  return {
    id: `PAIA-${evidence.id || symbols.join("-") || "EVIDENCE"}`,
    evidenceId: evidence.id || null,
    action,
    label: action === ACTIONS.INSUFFICIENT_EVIDENCE && dividend ? "Let’s Verify the Dividend Details" : LABELS[action],
    severity: action === ACTIONS.CONSIDER_REDUCING ? "HIGH" : action === ACTIONS.INSUFFICIENT_EVIDENCE ? "INFO" : "MEDIUM",
    confidence,
    symbol: symbols[0] || null,
    symbols,
    title: evidence.title || "Portfolio-aware evidence review",
    whatHappened: evidence.detail || evidence.description || "Review the attributable source for full details.",
    source: evidence.source || "Source unavailable",
    sourceUrl: evidence.url || evidence.sourceReference || evidence?.source?.reference || null,
    publishedAt: evidence.date || evidence.publishedAt || evidence.announcementDate || null,
    portfolioImpact: { held: matched.length > 0, quantity, exposureValue: money(exposureValue), portfolioWeight: money(weight), sector, sectorWeight: money(sectorWeight), targetSectorWeight: target || null, underweight },
    dividendImpact: { relevant: dividend, phase: dates.phase, exDate: dates.exDate, dividendPerShare: dividendPerShare || null, estimatedGrossDividend: estimatedGrossDividend === null ? null : money(estimatedGrossDividend), eligibilityConfirmed: false },
    evidenceReview,
    reportedClues,
    coachMessage,
    incomeOptions,
    rationale,
    safeguards: {
      advisoryOnly: true,
      headlineAloneCannotTrade: true,
      tradeCreated: false,
      portfolioChanged: false,
      entitlementNotGuaranteed: true,
      disclaimer: "Coach G provides portfolio-aware educational guidance, not personalized licensed financial advice. This message does not place a trade. Verify the announcement, market price, eligibility dates and your circumstances before acting."
    }
  };
}

export function buildPortfolioAwareInvestorAlerts({ evidence = [], holdings = [], sectorTargets = {}, asOfDate } = {}) {
  const deduped = new Map();
  for (const item of Array.isArray(evidence) ? evidence : []) {
    const alert = buildPortfolioAwareInvestorAlert({ evidence: item, holdings, sectorTargets, asOfDate });
    const key = `${alert.symbol || "MARKET"}|${normalize(item.type || item.category)}|${String(alert.publishedAt || "").slice(0, 10)}|${normalize(alert.title)}`;
    const prior = deduped.get(key);
    if (!prior || alert.confidence > prior.confidence) deduped.set(key, alert);
  }
  return [...deduped.values()].sort((a, b) => b.confidence - a.confidence || String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
}

export { ACTIONS as PORTFOLIO_ALERT_ACTIONS };
