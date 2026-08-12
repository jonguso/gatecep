#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"

DASHBOARD = ROOT / "app" / "(tabs)" / "dashboard.js"
HUB = ROOT / "app" / "portfolio-hub.js"
CANONICAL_CONTEXT = (
    ROOT / "src" / "features" / "wealth-journey" / "canonicalRealWealthContextService.js"
)

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found for {label}")
    return text.replace(old, new, 1)

def backup(path):
    b = path.with_suffix(path.suffix + ".pc028s.bak")
    shutil.copy2(path, b)
    return b

def patch_dashboard():
    text = DASHBOARD.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  loadCanonicalRealAvailableCash
} from "../../src/features/portfolio-cash/canonicalPortfolioCashService";''',
        '''import {
  loadCanonicalRealAvailableCash
} from "../../src/features/portfolio-cash/canonicalPortfolioCashService";

import {
  loadRealAvailableCashForSource
} from "../../src/features/portfolio-cash/accountScopedPortfolioCashService";''',
        "dashboard account cash import"
    )

    text = replace_once(
        text,
        '''      const nextPortfolio =
        await loadUnifiedPortfolio({
          broker:
            account?.broker || "ALL"
        });

      setPortfolioResult(nextPortfolio);
      setLastUpdated(new Date().toLocaleString());''',
        '''      const nextPortfolio =
        await loadUnifiedPortfolio({
          broker:
            account?.broker || "ALL"
        });

      const nextCash =
        await loadRealAvailableCashForSource(
          account
        );

      setPortfolioResult(nextPortfolio);
      setCanonicalRealCash(
        Number(nextCash || 0)
      );
      setLastUpdated(new Date().toLocaleString());''',
        "dashboard account-scoped cash selection"
    )

    b = backup(DASHBOARD)
    DASHBOARD.write_text(text, encoding="utf-8")
    return b

def patch_hub():
    text = HUB.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  loadCanonicalRealAvailableCash
} from "../src/features/portfolio-cash/canonicalPortfolioCashService";''',
        '''import {
  loadCanonicalRealAvailableCash
} from "../src/features/portfolio-cash/canonicalPortfolioCashService";

import {
  loadRealAvailableCashForSource
} from "../src/features/portfolio-cash/accountScopedPortfolioCashService";''',
        "hub account cash import"
    )

    text = replace_once(
        text,
        '''    setPortfolio(realHoldings);

    setPortfolioCash(
      Number(canonicalRealCash || 0)
    );''',
        '''    setPortfolio(realHoldings);

    const resolvedCash =
      account?.type === "ALL"
        ? Number(canonicalRealCash || 0)
        : await loadRealAvailableCashForSource(
            account
          );

    setPortfolioCash(
      Number(resolvedCash || 0)
    );''',
        "hub account-scoped real cash"
    )

    b = backup(HUB)
    HUB.write_text(text, encoding="utf-8")
    return b

def patch_canonical_context():
    text = CANONICAL_CONTEXT.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''  const syncedAvailableCash =
    n(canonicalRealCash);''',
        '''  /*
   * PC-028S:
   * Canonical real Wealth Journey always uses aggregate All-Accounts cash.
   * Individual account cash is view-scoped and must not replace aggregate
   * real wealth cash.
   */
  const syncedAvailableCash =
    n(canonicalRealCash);''',
        "canonical all-account cash comment"
    )

    b = backup(CANONICAL_CONTEXT)
    CANONICAL_CONTEXT.write_text(text, encoding="utf-8")
    return b

def main():
    for path in [DASHBOARD, HUB, CANONICAL_CONTEXT]:
        if not path.exists():
            raise FileNotFoundError(path)

    db = patch_dashboard()
    hub = patch_hub()
    canonical = patch_canonical_context()

    print("PC-028S applied.")
    print(f"Dashboard backup: {db}")
    print(f"Portfolio Hub backup: {hub}")
    print(f"Canonical context backup: {canonical}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
