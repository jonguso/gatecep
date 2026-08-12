#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
DASHBOARD = ROOT / "app" / "(tabs)" / "dashboard.js"

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found for {label}")
    return text.replace(old, new, 1)

def main():
    if not DASHBOARD.exists():
        raise FileNotFoundError(DASHBOARD)

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
  loadCanonicalRealWealthMetrics
} from "../../src/features/wealth-journey/canonicalRealWealthMetricsService";''',
        "import"
    )

    text = replace_once(
        text,
        '''const [portfolioAccountModalOpen, setPortfolioAccountModalOpen] = useState(false);''',
        '''const [portfolioAccountModalOpen, setPortfolioAccountModalOpen] = useState(false);
const [canonicalRealWealth, setCanonicalRealWealth] = useState(null);''',
        "state"
    )

    text = replace_once(
        text,
        '''  investorContextResult,
  journalResult
] = await Promise.all([''',
        '''  investorContextResult,
  journalResult,
  canonicalRealWealthResult
] = await Promise.all([''',
        "promise destructure"
    )

    text = replace_once(
        text,
        '''  loadDecisionJournal().catch((error) => {
    console.log(
      "Investment Journal load error:",
      error.message
    );
    return [];
  })
]);''',
        '''  loadDecisionJournal().catch((error) => {
    console.log(
      "Investment Journal load error:",
      error.message
    );
    return [];
  }),

  loadCanonicalRealWealthMetrics().catch((error) => {
    console.log(
      "Canonical real wealth load error:",
      error.message
    );
    return { active: false };
  })
]);''',
        "promise loader"
    )

    text = replace_once(
        text,
        '''setDecisionJournal(
  Array.isArray(journalResult)
    ? journalResult
    : []
);

setLastUpdated(new Date().toLocaleString());''',
        '''setDecisionJournal(
  Array.isArray(journalResult)
    ? journalResult
    : []
);

setCanonicalRealWealth(canonicalRealWealthResult || null);
setLastUpdated(new Date().toLocaleString());''',
        "setter"
    )

    text = replace_once(
        text,
        '''  const goalProgress =
    goalTarget > 0
      ? Math.min((netWorth / goalTarget) * 100, 100)
      : 0;''',
        '''  const realGoalCurrentValue =
    canonicalRealWealth?.active
      ? Number(canonicalRealWealth?.netWorth || 0)
      : 0;

  const goalProgress =
    goalTarget > 0 && canonicalRealWealth?.active
      ? Math.min((realGoalCurrentValue / goalTarget) * 100, 100)
      : 0;''',
        "goal progress"
    )

    text = replace_once(
        text,
        '''              {usePracticePortfolio
                ? "Practice Net Worth"
                : "Net Worth"}''',
        '''              {usePracticePortfolio
                ? "Practice Portfolio Value"
                : selectedPortfolioAccount?.type === "ALL"
                  ? "Real Investment Net Worth"
                  : "Account Portfolio Value"}''',
        "hero label"
    )

    text = replace_once(
        text,
        '''            <Text style={styles.heroValue}>
              KES {money(netWorth)}
            </Text>''',
        '''            <Text style={styles.heroValue}>
              KES {money(
                selectedPortfolioAccount?.type === "ALL" &&
                canonicalRealWealth?.active
                  ? canonicalRealWealth.netWorth
                  : netWorth
              )}
            </Text>''',
        "hero value"
    )

    text = replace_once(
        text,
        '''        <Text style={styles.goalValue}>
          KES {money(netWorth)}
        </Text>''',
        '''        <Text style={styles.goalValue}>
          {canonicalRealWealth?.active
            ? `KES ${money(realGoalCurrentValue)}`
            : "Real investing not activated"}
        </Text>''',
        "goal display"
    )

    backup = DASHBOARD.with_suffix(DASHBOARD.suffix + ".pc028o.bak")
    shutil.copy2(DASHBOARD, backup)
    DASHBOARD.write_text(text, encoding="utf-8")
    print(f"Applied PC-028O. Backup: {backup}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
