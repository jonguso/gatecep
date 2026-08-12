#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
RUNTIME = ROOT / "src" / "features" / "wealth-journey" / "investorDNAReconciliationRuntime.js"
INDEX = ROOT / "src" / "features" / "wealth-journey" / "index.js"

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found for {label}")
    return text.replace(old, new, 1)

def backup(path):
    b = path.with_suffix(path.suffix + ".pc028v.bak")
    shutil.copy2(path, b)
    return b

def patch_runtime():
    text = RUNTIME.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  loadCanonicalRealBehaviorHistory
} from "./canonicalRealBehaviorHistoryService";''',
        '''import {
  loadCanonicalRealBehaviorHistory
} from "./canonicalRealBehaviorHistoryService";

import {
  reconcileRecommendationHistoryOutcomes
} from "./recommendationOutcomeReconciliationEngine";''',
        "runtime import"
    )

    old = '''    recommendationHistory:
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
        : canonicalBehaviorHistory?.tradeHistory || [],'''

    new = '''    recommendationHistory:
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

    text = replace_once(
        text,
        old,
        new,
        "runtime reconciliation call"
    )

    b = backup(RUNTIME)
    RUNTIME.write_text(text, encoding="utf-8")
    return b

def patch_index():
    if not INDEX.exists():
        return None

    text = INDEX.read_text(encoding="utf-8")
    exports = [
        'export * from "./recommendationOutcomeReconciliationEngine";',
        'export * from "./recommendationOutcomeReconciliationService";'
    ]

    changed = False

    for line in exports:
        if line not in text:
            text += "\\n" + line + "\\n"
            changed = True

    if not changed:
        return None

    b = backup(INDEX)
    INDEX.write_text(text, encoding="utf-8")
    return b

def main():
    if not RUNTIME.exists():
        raise FileNotFoundError(RUNTIME)

    runtime_backup = patch_runtime()
    index_backup = patch_index()

    print("PC-028V applied.")
    print(f"Runtime backup: {runtime_backup}")

    if index_backup:
        print(f"Index backup: {index_backup}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
