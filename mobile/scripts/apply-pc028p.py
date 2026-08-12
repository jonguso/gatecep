#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
DASHBOARD = ROOT / "app" / "(tabs)" / "dashboard.js"
CANONICAL = ROOT / "src" / "features" / "wealth-journey" / "canonicalRealWealthContextService.js"

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found for {label}. No changes written.")
    return text.replace(old, new, 1)

def patch_dashboard():
    text = DASHBOARD.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''  const {
    currentValue,
    investedValue,
    totalCash,
    netWorth,
    totalGain,
    totalGainPct,
    dayChange,
    holdingsCount
  } = portfolioSummary;''',
        '''  const {
    currentValue,
    investedValue,
    totalCash,
    netWorth,
    totalGain,
    totalGainPct,
    dayChange,
    holdingsCount
  } = portfolioSummary;

  const selectedViewNetWorth =
    Number(currentValue || 0) +
    Number(totalCash || 0);''',
        "selected-view net worth formula"
    )

    text = replace_once(
        text,
        '''            <Text style={styles.heroValue}>
              KES {money(
                selectedPortfolioAccount?.type === "ALL" &&
                canonicalRealWealth?.active
                  ? canonicalRealWealth.netWorth
                  : netWorth
              )}
            </Text>''',
        '''            <Text style={styles.heroValue}>
              KES {money(selectedViewNetWorth)}
            </Text>''',
        "uniform hero net worth"
    )

    text = replace_once(
        text,
        '''              {usePracticePortfolio
                ? "Practice Portfolio Value"
                : selectedPortfolioAccount?.type === "ALL"
                  ? "Real Investment Net Worth"
                  : "Account Portfolio Value"}''',
        '''              {usePracticePortfolio
                ? "Practice Net Worth"
                : selectedPortfolioAccount?.type === "ALL"
                  ? "Real Investment Net Worth"
                  : "Account Net Worth"}''',
        "uniform labels"
    )

    backup = DASHBOARD.with_suffix(DASHBOARD.suffix + ".pc028p.bak")
    shutil.copy2(DASHBOARD, backup)
    DASHBOARD.write_text(text, encoding="utf-8")
    return backup

def patch_canonical():
    text = CANONICAL.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''  const activation = classifyWealthActivation(catalog);
  const defaultSourceId = determineDefaultPortfolioSource(catalog);

  return {''',
        '''  const syncedAvailableCash =
    n(syncStatus?.availableCash);

  if (
    catalog?.allAccounts &&
    syncedAvailableCash !== null
  ) {
    catalog.allAccounts.availableCash =
      syncedAvailableCash;

    catalog.allAccounts.totalValue =
      Number(
        catalog.allAccounts.holdingsValue ||
        0
      ) +
      syncedAvailableCash;
  }

  const activation = classifyWealthActivation(catalog);
  const defaultSourceId = determineDefaultPortfolioSource(catalog);

  return {''',
        "canonical synced cash reconciliation"
    )

    backup = CANONICAL.with_suffix(CANONICAL.suffix + ".pc028p.bak")
    shutil.copy2(CANONICAL, backup)
    CANONICAL.write_text(text, encoding="utf-8")
    return backup

def main():
    if not DASHBOARD.exists():
        raise FileNotFoundError(DASHBOARD)
    if not CANONICAL.exists():
        raise FileNotFoundError(CANONICAL)

    db = patch_dashboard()
    cc = patch_canonical()

    print("PC-028P applied.")
    print(f"Dashboard backup: {db}")
    print(f"Canonical backup: {cc}")
    print("Expected All Accounts net worth: KES 1,121,549.35")
    print("Expected Practice net worth: KES 10,000.00")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
