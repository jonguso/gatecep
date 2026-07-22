const DIVIDEND_MASTER = {
  KCB: { annualDividendPerShare: 6.0, frequency: "ANNUAL", nextDate: "2026-07-12" },
  SCOM: { annualDividendPerShare: 1.2, frequency: "ANNUAL", nextDate: "2026-08-20" },
  BAT: { annualDividendPerShare: 55.0, frequency: "ANNUAL", nextDate: "2026-09-15" },
  EABL: { annualDividendPerShare: 7.5, frequency: "ANNUAL", nextDate: "2026-10-10" },
  EQTY: { annualDividendPerShare: 4.0, frequency: "ANNUAL", nextDate: "2026-07-30" },
  KAPC: { annualDividendPerShare: 25.5, frequency: "ANNUAL", nextDate: "2026-08-05" }
};

export function calculateDividendIntelligence(holdings = []) {
  const dividendHoldings = holdings
    .map((holding) => {
      const symbol = String(holding.symbol || "").toUpperCase();
      const dividend = DIVIDEND_MASTER[symbol];

      if (!dividend) return null;

      const quantity = Number(holding.quantity || 0);
      const marketValue = Number(holding.marketValue || holding.value || 0);
      const annualDividend = quantity * dividend.annualDividendPerShare;
      const dividendYield =
        marketValue > 0 ? Number(((annualDividend / marketValue) * 100).toFixed(2)) : 0;

      return {
        symbol,
        name: holding.name,
        sector: holding.sector,
        quantity,
        marketValue,
        annualDividendPerShare: dividend.annualDividendPerShare,
        projectedAnnualDividend: Number(annualDividend.toFixed(2)),
        projectedMonthlyDividend: Number((annualDividend / 12).toFixed(2)),
        dividendYield,
        frequency: dividend.frequency,
        nextDate: dividend.nextDate
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.projectedAnnualDividend - a.projectedAnnualDividend);

  const projectedAnnualDividend = dividendHoldings.reduce(
    (sum, item) => sum + item.projectedAnnualDividend,
    0
  );

  const projectedMonthlyDividend = projectedAnnualDividend / 12;

  const bestDividendHolding = dividendHoldings[0] || null;

  return {
    projectedAnnualDividend: Number(projectedAnnualDividend.toFixed(2)),
    projectedMonthlyDividend: Number(projectedMonthlyDividend.toFixed(2)),
    dividendHoldings,
    bestDividendHolding,
    dividendHoldingCount: dividendHoldings.length,
    dividendCoverageCount: holdings.length,
    dividendCoveragePct:
      holdings.length > 0
        ? Number(((dividendHoldings.length / holdings.length) * 100).toFixed(2))
        : 0,
    narrative: bestDividendHolding
      ? `Your strongest dividend contributor is ${bestDividendHolding.symbol}, projected at KES ${bestDividendHolding.projectedAnnualDividend} per year.`
      : "No dividend-paying holdings detected yet.",
    version: "DividendEngine-013A"
  };
}