function afterDate(now = new Date()) {
  const days = Math.min(30, Math.max(1, Number(process.env.NEWS_LOOKBACK_DAYS || 7)));
  return new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
}

export function buildNewsQueries(now = new Date()) {
  const after = afterDate(now);
  return [
    { key: "NSE", query: `site:nse.co.ke (announcement OR dividend OR financial results OR book closure) after:${after}` },
    { key: "NSE_CORPORATE_ACTIONS", query: "https://www.nse.co.ke/corporate-actions/", scrapingTool: "browser-playwright", dynamicContentWaitSecs: 8 },
    { key: "BUSINESS_DAILY", query: `site:businessdailyafrica.com Kenya NSE (dividend OR results OR shares OR book closure) after:${after}` },
    { key: "STANDARD_BUSINESS", query: `site:standardmedia.co.ke/business Kenya NSE (shares OR dividend OR company results) after:${after}` }
  ];
}
