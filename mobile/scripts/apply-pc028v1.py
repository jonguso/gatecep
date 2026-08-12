#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
RUNTIME = ROOT / "src" / "features" / "wealth-journey" / "investorDNAReconciliationRuntime.js"

IMPORT_OLD = '''import {
  loadCanonicalRealBehaviorHistory
} from "./canonicalRealBehaviorHistoryService";'''

IMPORT_NEW = '''import {
  loadCanonicalRealBehaviorHistory
} from "./canonicalRealBehaviorHistoryService";

import {
  reconcileRecommendationHistoryOutcomes
} from "./recommendationOutcomeReconciliationEngine";'''

BLOCK_OLD = '''    recommendationHistory: Array.isArray(recommendationHistory)
      ? recommendationHistory
      : canonicalBehaviorHistory?.recommendationHistory || [],

    orderHistory: Array.isArray(orderHistory)
      ? orderHistory
      : canonicalBehaviorHistory?.orderHistory || [],

    tradeHistory: Array.isArray(tradeHistory)
      ? tradeHistory
      : canonicalBehaviorHistory?.tradeHistory || [],'''

BLOCK_NEW = '''    recommendationHistory:
      reconcileRecommendationHistoryOutcomes({
        recommendationHistory:
          Array.isArray(recommendationHistory)
            ? recommendationHistory
            : canonicalBehaviorHistory?.recommendationHistory || [],

        orderHistory:
          Array.isArray(orderHistory)
            ? orderHistory
            : canonicalBehaviorHistory?.orderHistory || [],

        tradeHistory:
          Array.isArray(tradeHistory)
            ? tradeHistory
            : canonicalBehaviorHistory?.tradeHistory || []
      }),

    orderHistory:
      Array.isArray(orderHistory)
        ? orderHistory
        : canonicalBehaviorHistory?.orderHistory || [],

    tradeHistory:
      Array.isArray(tradeHistory)
        ? tradeHistory
        : canonicalBehaviorHistory?.tradeHistory || [],'''

def main():
    if not RUNTIME.exists():
        raise FileNotFoundError(RUNTIME)

    text = RUNTIME.read_text(encoding="utf-8")

    if 'reconcileRecommendationHistoryOutcomes' not in text:
        if IMPORT_OLD not in text:
            raise RuntimeError("Import anchor not found.")
        text = text.replace(IMPORT_OLD, IMPORT_NEW, 1)

    if 'recommendationHistory:\n      reconcileRecommendationHistoryOutcomes({' not in text:
        if BLOCK_OLD not in text:
            raise RuntimeError("Runtime history block anchor not found.")
        text = text.replace(BLOCK_OLD, BLOCK_NEW, 1)

    backup = RUNTIME.with_suffix(RUNTIME.suffix + ".pc028v1.bak")
    shutil.copy2(RUNTIME, backup)
    RUNTIME.write_text(text, encoding="utf-8")

    print("PC-028V1 applied.")
    print(f"Backup: {backup}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
