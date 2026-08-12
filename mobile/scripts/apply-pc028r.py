#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"

DASHBOARD = ROOT / "app" / "(tabs)" / "dashboard.js"
HUB = ROOT / "app" / "portfolio-hub.js"
CANONICAL_CONTEXT = (
    ROOT
    / "src"
    / "features"
    / "wealth-journey"
    / "canonicalRealWealthContextService.js"
)

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(
            f"Anchor not found for {label}. No changes written."
        )
    return text.replace(old, new, 1)

def backup(path):
    backup_path = path.with_suffix(path.suffix + ".pc028r.bak")
    shutil.copy2(path, backup_path)
    return backup_path

def patch_dashboard():
    text = DASHBOARD.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  loadInvestorContext
} from "../../src/features/investor/investorContextStore";''',
        '''import {
  loadInvestorContext
} from "../../src/features/investor/investorContextStore";

import {
  loadCanonicalRealAvailableCash
} from "../../src/features/portfolio-cash/canonicalPortfolioCashService";''',
        "Dashboard canonical cash import"
    )

    text = replace_once(
        text,
        '''const [canonicalRealWealth, setCanonicalRealWealth] = useState(null);''',
        '''const [canonicalRealWealth, setCanonicalRealWealth] = useState(null);
const [canonicalRealCash, setCanonicalRealCash] = useState(0);''',
        "Dashboard canonical cash state"
    )

    text = replace_once(
        text,
        '''  journalResult,
  canonicalRealWealthResult
] = await Promise.all([''',
        '''  journalResult,
  canonicalRealWealthResult,
  canonicalRealCashResult
] = await Promise.all([''',
        "Dashboard promise destructuring"
    )

    text = replace_once(
        text,
        '''  loadCanonicalRealWealthMetrics().catch((error) => {
    console.log(
      "Canonical real wealth load error:",
      error.message
    );
    return { active: false };
  })
]);''',
        '''  loadCanonicalRealWealthMetrics().catch((error) => {
    console.log(
      "Canonical real wealth load error:",
      error.message
    );
    return { active: false };
  }),

  loadCanonicalRealAvailableCash().catch((error) => {
    console.log(
      "Canonical real cash load error:",
      error.message
    );
    return 0;
  })
]);''',
        "Dashboard canonical cash loader"
    )

    text = replace_once(
        text,
        '''setCanonicalRealWealth(canonicalRealWealthResult || null);
setLastUpdated(new Date().toLocaleString());''',
        '''setCanonicalRealWealth(canonicalRealWealthResult || null);

setCanonicalRealCash(
  Number(canonicalRealCashResult || 0)
);

setLastUpdated(new Date().toLocaleString());''',
        "Dashboard canonical cash setter"
    )

    text = replace_once(
        text,
        '''      cash: legacyPortfolioSummary?.totalCash || 0''',
        '''      cash:
        usePracticePortfolio
          ? Number(practicePortfolio?.availableCash || 0)
          : Number(canonicalRealCash || 0)''',
        "Dashboard shared-engine cash"
    )

    text = replace_once(
        text,
        '''  legacyPortfolioSummary
]);''',
        '''  legacyPortfolioSummary,
  usePracticePortfolio,
  practicePortfolio,
  canonicalRealCash
]);''',
        "Dashboard portfolio summary dependencies"
    )

    b = backup(DASHBOARD)
    DASHBOARD.write_text(text, encoding="utf-8")
    return b

def patch_hub():
    text = HUB.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  loadInvestorContext
} from "../src/features/investor/investorContextStore";''',
        '''import {
  loadInvestorContext
} from "../src/features/investor/investorContextStore";

import {
  loadCanonicalRealAvailableCash
} from "../src/features/portfolio-cash/canonicalPortfolioCashService";''',
        "Portfolio Hub canonical cash import"
    )

    text = replace_once(
        text,
        '''    const [accountResult, investorContext] =
      await Promise.all([''',
        '''    const [
      accountResult,
      investorContext,
      canonicalRealCash
    ] =
      await Promise.all([''',
        "Portfolio Hub promise destructuring"
    )

    text = replace_once(
        text,
        '''        loadInvestorContext().catch((error) => {
          console.log(
            "Investor context load error:",
            error.message
          );

          return null;
        })
      ]);''',
        '''        loadInvestorContext().catch((error) => {
          console.log(
            "Investor context load error:",
            error.message
          );

          return null;
        }),

        loadCanonicalRealAvailableCash().catch((error) => {
          console.log(
            "Canonical real cash load error:",
            error.message
          );

          return 0;
        })
      ]);''',
        "Portfolio Hub canonical cash loader"
    )

    text = replace_once(
        text,
        '''    setPortfolioCash(
      Number(
        portfolioResult?.availableCash ??
        portfolioResult?.summary?.availableCash ??
        0
      )
    );''',
        '''    setPortfolioCash(
      Number(canonicalRealCash || 0)
    );''',
        "Portfolio Hub canonical real cash"
    )

    b = backup(HUB)
    HUB.write_text(text, encoding="utf-8")
    return b

def patch_canonical_context():
    text = CANONICAL_CONTEXT.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { buildSyncStatus } from "../../portfolio/syncStatus";''',
        '''import { buildSyncStatus } from "../../portfolio/syncStatus";

import {
  loadCanonicalRealAvailableCash
} from "../portfolio-cash/canonicalPortfolioCashService";''',
        "Canonical context cash import"
    )

    text = replace_once(
        text,
        '''  const [investorContext, unifiedPortfolio, syncStatus] =
    await Promise.all([
      loadInvestorContext(),
      loadUnifiedPortfolio({ broker }),
      buildSyncStatus()
    ]);''',
        '''  const [
    investorContext,
    unifiedPortfolio,
    syncStatus,
    canonicalRealCash
  ] =
    await Promise.all([
      loadInvestorContext(),
      loadUnifiedPortfolio({ broker }),
      buildSyncStatus(),
      loadCanonicalRealAvailableCash()
    ]);''',
        "Canonical context cash promise"
    )

    text = replace_once(
        text,
        '''  const syncedAvailableCash =
    n(syncStatus?.availableCash);''',
        '''  const syncedAvailableCash =
    n(canonicalRealCash);''',
        "Canonical context authoritative cash"
    )

    b = backup(CANONICAL_CONTEXT)
    CANONICAL_CONTEXT.write_text(text, encoding="utf-8")
    return b

def main():
    required = [DASHBOARD, HUB, CANONICAL_CONTEXT]
    missing = [str(path) for path in required if not path.exists()]

    if missing:
        raise FileNotFoundError(
            "Missing required file(s):\n" + "\n".join(missing)
        )

    dashboard_backup = patch_dashboard()
    hub_backup = patch_hub()
    canonical_backup = patch_canonical_context()

    print("PC-028R applied.")
    print(f"Dashboard backup: {dashboard_backup}")
    print(f"Portfolio Hub backup: {hub_backup}")
    print(f"Canonical context backup: {canonical_backup}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
