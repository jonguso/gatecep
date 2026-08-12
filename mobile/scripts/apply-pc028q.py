#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep"
MOBILE = ROOT / "mobile"
SHARED_ENGINE = ROOT / "shared" / "portfolio" / "engine.js"

DASHBOARD = MOBILE / "app" / "(tabs)" / "dashboard.js"
HUB = MOBILE / "app" / "portfolio-hub.js"
CANONICAL_METRICS = MOBILE / "src" / "features" / "wealth-journey" / "canonicalRealWealthMetricsService.js"

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(
            f"Anchor not found for {label}. No changes were written to that file."
        )
    return text.replace(old, new, 1)

def backup(path, suffix):
    backup_path = path.with_suffix(path.suffix + suffix)
    shutil.copy2(path, backup_path)
    return backup_path

def patch_dashboard():
    text = DASHBOARD.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  loadUnifiedPortfolio,
  loadPortfolioAccounts
} from "../../src/portfolio/unifiedPortfolioApi";''',
        '''import {
  loadUnifiedPortfolio,
  loadPortfolioAccounts
} from "../../src/portfolio/unifiedPortfolioApi";

import {
  calculatePortfolioSummary as calculateSharedPortfolioSummary
} from "../../../shared/portfolio/engine.js";''',
        "Dashboard shared portfolio engine import"
    )

    text = replace_once(
        text,
        '''const portfolioSummary = useMemo(() => {
  return buildPortfolioSummary({
    holdings: activeHoldings,
    portfolioResult,
    practicePortfolio,
    marketIntel,
    usePracticePortfolio
  });
}, [
  activeHoldings,
  portfolioResult,
  practicePortfolio,
  marketIntel,
  usePracticePortfolio
]);''',
        '''const legacyPortfolioSummary = useMemo(() => {
  return buildPortfolioSummary({
    holdings: activeHoldings,
    portfolioResult,
    practicePortfolio,
    marketIntel,
    usePracticePortfolio
  });
}, [
  activeHoldings,
  portfolioResult,
  practicePortfolio,
  marketIntel,
  usePracticePortfolio
]);

const portfolioSummary = useMemo(() => {
  const sharedResult =
    calculateSharedPortfolioSummary({
      holdings: activeHoldings,
      cash: legacyPortfolioSummary?.totalCash || 0
    });

  const shared =
    sharedResult?.summary || {};

  return {
    ...legacyPortfolioSummary,
    currentValue: Number(shared?.totalValue || 0),
    investedValue: Number(shared?.investedValue || 0),
    totalCash: Number(shared?.totalCash || 0),
    netWorth: Number(shared?.netWorth || 0),
    totalGain: Number(shared?.totalGain || 0),
    totalGainPct: Number(shared?.totalGainPct || 0),
    holdingsCount: Number(shared?.holdingsCount || 0)
  };
}, [
  activeHoldings,
  legacyPortfolioSummary
]);''',
        "Dashboard shared summary adoption"
    )

    text = replace_once(
        text,
        '''  const selectedViewNetWorth =
    Number(currentValue || 0) +
    Number(totalCash || 0);''',
        '''  const selectedViewNetWorth =
    Number(netWorth || 0);''',
        "Dashboard remove duplicated net worth formula"
    )

    b = backup(DASHBOARD, ".pc028q.bak")
    DASHBOARD.write_text(text, encoding="utf-8")
    return b

def patch_hub():
    text = HUB.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  PORTFOLIO_TABS,
  buildPortfolioHub
} from "../src/portfolio/portfolioHubData";''',
        '''import {
  PORTFOLIO_TABS,
  buildPortfolioHub
} from "../src/portfolio/portfolioHubData";

import {
  calculatePortfolioSummary as calculateSharedPortfolioSummary
} from "../../shared/portfolio/engine.js";''',
        "Portfolio Hub shared engine import"
    )

    text = replace_once(
        text,
        '''  const [practicePortfolio, setPracticePortfolio] = useState(null);''',
        '''  const [practicePortfolio, setPracticePortfolio] = useState(null);
  const [portfolioCash, setPortfolioCash] = useState(0);''',
        "Portfolio Hub cash state"
    )

    text = replace_once(
        text,
        '''      setPortfolio(
        Array.isArray(practice?.holdings)
          ? practice.holdings
          : []
      );

      return;''',
        '''      setPortfolio(
        Array.isArray(practice?.holdings)
          ? practice.holdings
          : []
      );

      setPortfolioCash(
        Number(
          practice?.availableCash ||
          0
        )
      );

      return;''',
        "Portfolio Hub practice cash"
    )

    text = replace_once(
        text,
        '''    setPortfolio(realHoldings);''',
        '''    setPortfolio(realHoldings);

    setPortfolioCash(
      Number(
        portfolioResult?.availableCash ??
        portfolioResult?.summary?.availableCash ??
        0
      )
    );''',
        "Portfolio Hub real cash"
    )

    text = replace_once(
        text,
        '''  const hub = useMemo(() => buildPortfolioHub(portfolio), [portfolio]);''',
        '''  const hubAnalytics = useMemo(
    () =>
      buildPortfolioHub(
        portfolio
      ),
    [portfolio]
  );

  const sharedPortfolio = useMemo(
    () =>
      calculateSharedPortfolioSummary({
        holdings: portfolio,
        cash: portfolioCash
      }),
    [
      portfolio,
      portfolioCash
    ]
  );

  const sharedSummary =
    sharedPortfolio?.summary || {};

  const hub = useMemo(
    () => ({
      ...hubAnalytics,
      totalValue: Number(sharedSummary?.totalValue || 0),
      investedValue: Number(sharedSummary?.investedValue || 0),
      availableCash: Number(sharedSummary?.totalCash || 0),
      netWorth: Number(sharedSummary?.netWorth || 0),
      gainLoss: Number(sharedSummary?.totalGain || 0),
      gainLossPct: Number(sharedSummary?.totalGainPct || 0),
      holdingsCount: Number(sharedSummary?.holdingsCount || 0)
    }),
    [
      hubAnalytics,
      sharedSummary
    ]
  );''',
        "Portfolio Hub shared summary adoption"
    )

    text = replace_once(
        text,
        '''        <Text style={styles.heroValue}>KES {money(hub.totalValue)}</Text>''',
        '''        <Text style={styles.heroValue}>
          KES {money(hub.netWorth)}
        </Text>''',
        "Portfolio Hub hero net worth"
    )

    text = replace_once(
        text,
        '''  {selectedAccount?.type === "PRACTICE"
    ? "Practice Portfolio Value"
    : "Total Portfolio Value"}''',
        '''  {selectedAccount?.type === "PRACTICE"
    ? "Practice Net Worth"
    : selectedAccount?.type === "ALL"
      ? "Real Investment Net Worth"
      : "Account Net Worth"}''',
        "Portfolio Hub hero label"
    )

    text = replace_once(
        text,
        '''          {selectedAccount?.type === "PRACTICE" ? (
  <HeroMetric
    label="Available Cash"
    value={`KES ${money(
      practicePortfolio?.availableCash
    )}`}
  />
) : null}''',
        '''          <HeroMetric
            label="Available Cash"
            value={`KES ${money(
              hub.availableCash
            )}`}
          />''',
        "Portfolio Hub cash metric for every source"
    )

    b = backup(HUB, ".pc028q.bak")
    HUB.write_text(text, encoding="utf-8")
    return b

def patch_canonical_metrics():
    text = CANONICAL_METRICS.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { buildCanonicalRealWealthContext } from "./canonicalRealWealthContextService";''',
        '''import { buildCanonicalRealWealthContext } from "./canonicalRealWealthContextService";

import {
  calculatePortfolioSummary as calculateSharedPortfolioSummary
} from "../../../../shared/portfolio/engine.js";''',
        "Canonical metrics shared engine import"
    )

    text = replace_once(
        text,
        '''  const holdings = Array.isArray(all?.holdings) ? all.holdings : [];
  const holdingsValue = n(all?.holdingsValue) ?? sumHoldingsValue(holdings);
  const investedValue = sumInvestedValue(holdings);
  const availableCash = n(all?.availableCash) ?? 0;
  const netWorth = holdingsValue + availableCash;
  const reportedTotal = n(all?.totalValue);
  const difference = reportedTotal === null ? 0 : reportedTotal - netWorth;''',
        '''  const holdings =
    Array.isArray(all?.holdings)
      ? all.holdings
      : [];

  const sharedResult =
    calculateSharedPortfolioSummary({
      holdings,
      cash: n(all?.availableCash) ?? 0
    });

  const shared =
    sharedResult?.summary || {};

  const holdingsValue =
    Number(shared?.totalValue || 0);

  const investedValue =
    Number(shared?.investedValue || 0);

  const availableCash =
    Number(shared?.totalCash || 0);

  const netWorth =
    Number(shared?.netWorth || 0);

  const reportedTotal =
    n(all?.totalValue);

  const difference =
    reportedTotal === null
      ? 0
      : reportedTotal - netWorth;''',
        "Canonical real wealth shared calculation"
    )

    b = backup(CANONICAL_METRICS, ".pc028q.bak")
    CANONICAL_METRICS.write_text(text, encoding="utf-8")
    return b

def main():
    required = [SHARED_ENGINE, DASHBOARD, HUB, CANONICAL_METRICS]
    missing = [str(path) for path in required if not path.exists()]

    if missing:
        raise FileNotFoundError(
            "Required PC-028Q file(s) missing:\n" +
            "\n".join(missing)
        )

    print("Using shared Portfolio Engine:")
    print(SHARED_ENGINE)
    print()

    db = patch_dashboard()
    hub = patch_hub()
    canonical = patch_canonical_metrics()

    print("PC-028Q applied.")
    print(f"Dashboard backup: {db}")
    print(f"Portfolio Hub backup: {hub}")
    print(f"Canonical metrics backup: {canonical}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
