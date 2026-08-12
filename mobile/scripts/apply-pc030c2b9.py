from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
SRC = ROOT / "src"

ARCHIVE = (
    ROOT /
    "archive" /
    "expo-router-nonroutes" /
    "bak"
)

SNAPSHOT = (
    SRC /
    "services" /
    "portfolio" /
    "portfolioSnapshot.js"
)

TRIGGER = (
    SRC /
    "services" /
    "portfolio" /
    "portfolioSnapshotTrigger.js"
)

PERFORMANCE = APP / "performance.js"
MANUAL = APP / "manual-portfolio-entry.js"
REVIEW = APP / "review-portfolio-import.js"
FUNDS = APP / "(tabs)" / "funds.js"
TRADE = APP / "trade.js"

BROKER_SYNC = (
    SRC /
    "services" /
    "brokers" /
    "brokerPortfolioSync.js"
)


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2b9.bak"
    )

    shutil.copy2(
        path,
        b
    )

    return b


def archive_backup(path):
    try:
        rel = path.relative_to(APP)

    except ValueError:
        rel = (
            Path("src") /
            path.relative_to(SRC)
        )

    dest = ARCHIVE / rel

    dest.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    if dest.exists():
        i = 1

        while True:
            candidate = dest.with_name(
                f"{dest.stem}-{i}{dest.suffix}"
            )

            if not candidate.exists():
                dest = candidate
                break

            i += 1

    shutil.move(
        str(path),
        str(dest)
    )

    return dest


def commit(path, original, text):
    if text == original:
        print(
            f"UNCHANGED {path.relative_to(ROOT)}"
        )
        return False

    b = backup(path)

    path.write_text(
        text,
        encoding="utf-8"
    )

    archived = archive_backup(b)

    print(
        f"PATCHED {path.relative_to(ROOT)}"
    )

    print(
        f"  backup -> "
        f"{archived.relative_to(ROOT)}"
    )

    return True


def replace_once(path, old, new):
    original = path.read_text(
        encoding="utf-8"
    )

    if old in original:
        text = original.replace(
            old,
            new,
            1
        )

    elif new in original:
        print(
            f"UNCHANGED {path.relative_to(ROOT)}"
        )
        return

    else:
        raise RuntimeError(
            f"Anchor not found in "
            f"{path.relative_to(ROOT)}:\n"
            f"{old[:400]}"
        )

    commit(
        path,
        original,
        text
    )


def insert_import_after(
    path,
    anchor,
    import_text,
    presence
):
    original = path.read_text(
        encoding="utf-8"
    )

    if presence in original:
        print(
            f"UNCHANGED import "
            f"{path.relative_to(ROOT)}"
        )
        return

    if anchor not in original:
        raise RuntimeError(
            f"Import anchor not found in "
            f"{path.relative_to(ROOT)}"
        )

    text = original.replace(
        anchor,
        anchor + "\n" + import_text,
        1
    )

    commit(
        path,
        original,
        text
    )


try:

    #
    # ==========================================================
    # 1. SNAPSHOT WRITER — RECORD TRIGGER REASON
    # ==========================================================
    #

    original = SNAPSHOT.read_text(
        encoding="utf-8"
    )

    text = original

    old_signature = (
        "export async function "
        "saveCanonicalRealPortfolioSnapshot() {"
    )

    new_signature = '''export async function saveCanonicalRealPortfolioSnapshot({
  triggerReason = "MANUAL_REFRESH"
} = {}) {'''

    if old_signature in text:
        text = text.replace(
            old_signature,
            new_signature,
            1
        )

    elif new_signature not in text:
        raise RuntimeError(
            "Canonical snapshot writer signature "
            "not found."
        )

    old_source = '''    sourceLabel:
      realMetrics?.sourceLabel ||
      "All Accounts",

    currency:
      "KES",'''

    new_source = '''    sourceLabel:
      realMetrics?.sourceLabel ||
      "All Accounts",

    /*
     * PC-030C2B9
     *
     * Identifies the lifecycle boundary that refreshed today's
     * canonical snapshot.
     */
    triggerReason:
      String(
        triggerReason ||
        "MANUAL_REFRESH"
      ),

    currency:
      "KES",'''

    if "triggerReason:" not in text:
        if old_source not in text:
            raise RuntimeError(
                "Snapshot source metadata anchor "
                "not found."
            )

        text = text.replace(
            old_source,
            new_source,
            1
        )

    commit(
        SNAPSHOT,
        original,
        text
    )

    #
    # ==========================================================
    # 2. NON-BLOCKING SNAPSHOT TRIGGER
    #
    # Snapshot creation is derived analytics/history.
    # It must never make the primary mutation fail.
    # ==========================================================
    #

    trigger_service = '''/**
 * ============================================================
 * PC-030C2B9
 * Canonical Portfolio Snapshot Lifecycle Trigger
 * ============================================================
 *
 * Mutation boundary adapter.
 *
 * A portfolio/cash mutation must succeed independently of
 * performance-history capture.
 *
 * Snapshot failures are therefore logged but never allowed to
 * roll back or falsely fail the primary investor action.
 * ============================================================
 */

import {
  saveCanonicalRealPortfolioSnapshot
} from "./portfolioSnapshot";


export async function refreshCanonicalRealPortfolioSnapshot({
  reason = "PORTFOLIO_MUTATION"
} = {}) {
  try {
    const snapshot =
      await saveCanonicalRealPortfolioSnapshot({
        triggerReason:
          reason
      });

    return {
      ok:
        Boolean(snapshot),

      snapshot,

      reason
    };

  } catch (error) {
    console.warn(
      "[PC-030C2B9] Snapshot refresh skipped:",
      reason,
      error?.message ||
      error
    );

    return {
      ok:
        false,

      snapshot:
        null,

      reason,

      error:
        error?.message ||
        String(error)
    };
  }
}
'''

    if TRIGGER.exists():
        original = TRIGGER.read_text(
            encoding="utf-8"
        )

        commit(
            TRIGGER,
            original,
            trigger_service
        )

    else:
        TRIGGER.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        TRIGGER.write_text(
            trigger_service,
            encoding="utf-8"
        )

        print(
            "CREATED "
            "src/services/portfolio/"
            "portfolioSnapshotTrigger.js"
        )

    #
    # ==========================================================
    # 3. PERFORMANCE SAFETY REFRESH
    # ==========================================================
    #

    replace_once(
        PERFORMANCE,
        '''      await saveCanonicalRealPortfolioSnapshot();''',
        '''      await saveCanonicalRealPortfolioSnapshot({
        triggerReason: "PERFORMANCE_OPEN"
      });'''
    )

    #
    # ==========================================================
    # 4. MANUAL PORTFOLIO ENTRY
    # ==========================================================
    #

    insert_import_after(
        MANUAL,

        '''import { buildSyncStatus } from "../src/portfolio/syncStatus";''',

        '''import {
  refreshCanonicalRealPortfolioSnapshot
} from "../src/services/portfolio/portfolioSnapshotTrigger";''',

        "refreshCanonicalRealPortfolioSnapshot"
    )

    original = MANUAL.read_text(
        encoding="utf-8"
    )

    text = original

    if (
        '"MANUAL_PORTFOLIO_ENTRY"'
        not in text
        or "refreshCanonicalRealPortfolioSnapshot" not in text
    ):
        pass

    #
    # Prefer the completed sync-status boundary.
    #
    marker = '''  await buildSyncStatus();'''

    trigger_block = '''  await buildSyncStatus();

  await refreshCanonicalRealPortfolioSnapshot({
    reason: "MANUAL_PORTFOLIO_ENTRY"
  });'''

    if (
        'reason: "MANUAL_PORTFOLIO_ENTRY"'
        not in text
    ):
        if marker in text:
            pos = text.rfind(marker)

            text = (
                text[:pos] +
                trigger_block +
                text[
                    pos +
                    len(marker):
                ]
            )

        else:
            #
            # Older Manual Entry build does not invoke the imported
            # sync helper. Fall back to the portfolio-ready flag.
            #
            fallback = (
                '  await userSetItem('
                '"statementUploaded", "true");'
            )

            replacement = '''  await userSetItem("statementUploaded", "true");

  await refreshCanonicalRealPortfolioSnapshot({
    reason: "MANUAL_PORTFOLIO_ENTRY"
  });'''

            if fallback not in text:
                raise RuntimeError(
                    "Manual Portfolio mutation boundary "
                    "not found."
                )

            text = text.replace(
                fallback,
                replacement,
                1
            )

    commit(
        MANUAL,
        original,
        text
    )

    #
    # ==========================================================
    # 5. CONFIRMED PORTFOLIO IMPORT
    #
    # Draft extraction is NOT a mutation.
    # Trigger only after confirmed portfolio persistence.
    # ==========================================================
    #

    insert_import_after(
        REVIEW,

        '''import { getCurrentSession } from "../src/auth/authStore";''',

        '''import {
  refreshCanonicalRealPortfolioSnapshot
} from "../src/services/portfolio/portfolioSnapshotTrigger";''',

        "refreshCanonicalRealPortfolioSnapshot"
    )

    replace_once(
        REVIEW,

        '''    await AsyncStorage.removeItem("gatecepImportedPortfolioDraft");

    Alert.alert("Portfolio Saved", "Your holdings have been saved.");''',

        '''    await AsyncStorage.removeItem("gatecepImportedPortfolioDraft");

    await refreshCanonicalRealPortfolioSnapshot({
      reason: "CONFIRMED_PORTFOLIO_IMPORT"
    });

    Alert.alert("Portfolio Saved", "Your holdings have been saved.");'''
    )

    #
    # ==========================================================
    # 6. FUNDS / CASH
    #
    # Trigger after backend acknowledges the cash mutation.
    # ==========================================================
    #

    insert_import_after(
        FUNDS,

        '''import { getStoredAccessToken } from "../../src/features/auth/storage/authStorage";''',

        '''import {
  refreshCanonicalRealPortfolioSnapshot
} from "../../src/services/portfolio/portfolioSnapshotTrigger";''',

        "refreshCanonicalRealPortfolioSnapshot"
    )

    replace_once(
        FUNDS,

        '''      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Unable to update backend cash");
      }

      Alert.alert("Statement Saved", "Available cash updated.");''',

        '''      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Unable to update backend cash");
      }

      await refreshCanonicalRealPortfolioSnapshot({
        reason: "CASH_STATEMENT_UPDATE"
      });

      Alert.alert("Statement Saved", "Available cash updated.");'''
    )

    #
    # ==========================================================
    # 7. TRADE
    #
    # Two authoritative commit boundaries currently exist:
    #
    #   persistTrade()
    #   runBasketExecution()
    #
    # Trigger AFTER holdings, cash and sync status are persisted.
    # ==========================================================
    #

    insert_import_after(
        TRADE,

        '''import { router } from "expo-router";''',

        '''import {
  refreshCanonicalRealPortfolioSnapshot
} from "../src/services/portfolio/portfolioSnapshotTrigger";''',

        "refreshCanonicalRealPortfolioSnapshot"
    )

    original = TRADE.read_text(
        encoding="utf-8"
    )

    text = original

    trade_anchor = '''    await buildSyncStatus();
  }

  async function confirmTrade() {'''

    trade_new = '''    await buildSyncStatus();

    await refreshCanonicalRealPortfolioSnapshot({
      reason: "TRADE_COMMIT"
    });
  }

  async function confirmTrade() {'''

    if (
        'reason: "TRADE_COMMIT"'
        not in text
    ):
        if trade_anchor not in text:
            raise RuntimeError(
                "persistTrade completion anchor "
                "not found."
            )

        text = text.replace(
            trade_anchor,
            trade_new,
            1
        )

    basket_anchor = '''      await saveBasketExecution(updatedExecution);
      await buildSyncStatus();

      setPortfolio(workingPortfolio);'''

    basket_new = '''      await saveBasketExecution(updatedExecution);
      await buildSyncStatus();

      await refreshCanonicalRealPortfolioSnapshot({
        reason: "BASKET_TRADE_COMMIT"
      });

      setPortfolio(workingPortfolio);'''

    if (
        'reason: "BASKET_TRADE_COMMIT"'
        not in text
    ):
        if basket_anchor not in text:
            raise RuntimeError(
                "Basket execution completion anchor "
                "not found."
            )

        text = text.replace(
            basket_anchor,
            basket_new,
            1
        )

    commit(
        TRADE,
        original,
        text
    )

    #
    # ==========================================================
    # 8. BROKER PORTFOLIO SYNC
    #
    # This service persists aggregated holdings + aggregated
    # cash, making it an authoritative portfolio mutation.
    # ==========================================================
    #

    insert_import_after(
        BROKER_SYNC,

        '''import {
  userSetItem
} from "../auth/userStorage";''',

        '''import {
  refreshCanonicalRealPortfolioSnapshot
} from "../portfolio/portfolioSnapshotTrigger";''',

        "refreshCanonicalRealPortfolioSnapshot"
    )

    original = BROKER_SYNC.read_text(
        encoding="utf-8"
    )

    text = original

    broker_anchor = '''  await buildSyncStatus();

  return {
    ok: true,
    brokerCount: accounts.length,
    holdings: portfolio,
    cash,
    results,
    syncedAt: new Date().toISOString()
  };'''

    broker_new = '''  await buildSyncStatus();

  await refreshCanonicalRealPortfolioSnapshot({
    reason: "BROKER_PORTFOLIO_SYNC"
  });

  return {
    ok: true,
    brokerCount: accounts.length,
    holdings: portfolio,
    cash,
    results,
    syncedAt: new Date().toISOString()
  };'''

    if (
        'reason: "BROKER_PORTFOLIO_SYNC"'
        not in text
    ):
        if broker_anchor not in text:
            raise RuntimeError(
                "Broker portfolio sync completion "
                "anchor not found."
            )

        text = text.replace(
            broker_anchor,
            broker_new,
            1
        )

    commit(
        BROKER_SYNC,
        original,
        text
    )

    print()
    print(
        "PC-030C2B9 applied successfully."
    )

    print()
    print(
        "Canonical snapshot lifecycle boundaries:"
    )

    print(
        "  - Performance safety refresh"
    )

    print(
        "  - Manual portfolio entry"
    )

    print(
        "  - Confirmed portfolio import"
    )

    print(
        "  - Cash statement update"
    )

    print(
        "  - Single trade commit"
    )

    print(
        "  - Basket trade commit"
    )

    print(
        "  - Broker portfolio synchronization"
    )

    print()
    print(
        "Excluded intentionally:"
    )

    print(
        "  - Draft portfolio extraction"
    )

    print(
        "  - Transaction-history import"
    )

    print(
        "  - Controlled Practice Portfolio reconciliation"
    )

    print(
        "  - Corporate-action monitoring"
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
