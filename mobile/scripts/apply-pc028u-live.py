#!/usr/bin/env python3
from pathlib import Path
import shutil, sys
ROOT = Path.home() / "gatecep" / "mobile"
RUNTIME = ROOT / "src/features/wealth-journey/investorDNAReconciliationRuntime.js"
INDEX = ROOT / "src/features/wealth-journey/index.js"

def rep(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found: {label}")
    return text.replace(old, new, 1)

def backup(p):
    b = p.with_suffix(p.suffix + ".pc028u.bak")
    shutil.copy2(p, b)
    return b

def main():
    text = RUNTIME.read_text(encoding="utf-8")
    text = rep(text,
'''import {
  loadRealCurrentInvestorWealthJourney
} from "./realWealthJourneyRuntime";''',
'''import {
  loadRealCurrentInvestorWealthJourney
} from "./realWealthJourneyRuntime";

import {
  loadCanonicalRealBehaviorHistory
} from "./canonicalRealBehaviorHistoryService";''', "import")
    text = rep(text,
'''export async function loadCurrentInvestorDNAReconciliation({
  recommendationHistory = [],
  orderHistory = [],
  tradeHistory = [],
  confirmedClarifications = []
} = {}) {''',
'''export async function loadCurrentInvestorDNAReconciliation({
  recommendationHistory = null,
  orderHistory = null,
  tradeHistory = null,
  confirmedClarifications = []
} = {}) {''', "signature")
    text = rep(text,
'''    wealthJourney
  ] =
    await Promise.all([''',
'''    wealthJourney,
    canonicalBehaviorHistory
  ] =
    await Promise.all([''', "destructure")
    text = rep(text,
'''      loadRealCurrentInvestorWealthJourney().catch(
        () => ({})
      )
    ]);''',
'''      loadRealCurrentInvestorWealthJourney().catch(
        () => ({})
      ),

      loadCanonicalRealBehaviorHistory().catch(
        () => ({ recommendationHistory: [], orderHistory: [], tradeHistory: [], audit: null })
      )
    ]);''', "loader")
    text = rep(text,
'''    recommendationHistory,
    orderHistory,
    tradeHistory,

    wealthJourney,

    confirmedClarifications
  });''',
'''    recommendationHistory: Array.isArray(recommendationHistory)
      ? recommendationHistory
      : canonicalBehaviorHistory?.recommendationHistory || [],

    orderHistory: Array.isArray(orderHistory)
      ? orderHistory
      : canonicalBehaviorHistory?.orderHistory || [],

    tradeHistory: Array.isArray(tradeHistory)
      ? tradeHistory
      : canonicalBehaviorHistory?.tradeHistory || [],

    wealthJourney,

    confirmedClarifications
  });''', "call")
    rb = backup(RUNTIME)
    RUNTIME.write_text(text, encoding="utf-8")
    ib = None
    if INDEX.exists():
        it = INDEX.read_text(encoding="utf-8")
        changed = False
        for line in [
            'export * from "./investorDNAReconciliationEngine";',
            'export * from "./investorDNAReconciliationRuntime";',
            'export * from "./realBehaviorHistorySourcePolicy";',
            'export * from "./canonicalRealBehaviorHistoryService";'
        ]:
            if line not in it:
                it += "\n" + line + "\n"
                changed = True
        if changed:
            ib = backup(INDEX)
            INDEX.write_text(it, encoding="utf-8")
    print("PC-028U live integration applied.")
    print("Runtime backup:", rb)
    print("Index backup:", ib)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR:", e, file=sys.stderr)
        sys.exit(1)
