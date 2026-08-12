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

PERFORMANCE = (
    APP /
    "performance.js"
)


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2b8.bak"
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


def write_file(path, content):
    original = path.read_text(
        encoding="utf-8"
    )

    if original == content:
        print(
            f"UNCHANGED {path.relative_to(ROOT)}"
        )

        return

    b = backup(path)

    path.write_text(
        content,
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
            f"{old[:500]}"
        )

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


try:

    #
    # ==========================================================
    # 1. CANONICAL SNAPSHOT STORE
    # ==========================================================
    #

    snapshot_service = '''/**
 * ============================================================
 * GateCEP Portfolio Snapshot Store
 * PC-030C2B8
 * Snapshot Contract Version: 2
 * ============================================================
 *
 * Canonical real-portfolio snapshot contract.
 *
 * Source of truth:
 *   REAL / ALL ACCOUNTS
 *
 * Financial equations:
 *
 *   NET_WORTH =
 *     HOLDINGS_MARKET_VALUE +
 *     AVAILABLE_CASH
 *
 *   UNREALIZED_GAIN_LOSS =
 *     HOLDINGS_MARKET_VALUE -
 *     INVESTED_VALUE
 *
 * Practice Portfolio is never included in canonical real
 * performance snapshots.
 *
 * Legacy V1 fields remain as compatibility aliases only.
 * Existing stored snapshots are NOT rewritten during load.
 * ============================================================
 */

import {
  userGetItem,
  userSetItem
} from "../auth/userStorage";

import {
  loadCanonicalRealWealthMetrics
} from "../../features/wealth-journey/canonicalRealWealthMetricsService";

import {
  buildPortfolioHealthScore
} from "../../features/analytics/portfolioHealthScoreService";

const PORTFOLIO_SNAPSHOTS_KEY =
  "portfolioSnapshots";

const SNAPSHOT_VERSION = 2;


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function numberOrNull(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}


function numberOrZero(value) {
  return (
    numberOrNull(value) ??
    0
  );
}


function roundMoney(value) {
  const number =
    numberOrNull(value);

  if (number === null) {
    return null;
  }

  return Number(
    number.toFixed(2)
  );
}


function roundPercent(value) {
  const number =
    numberOrNull(value);

  if (number === null) {
    return null;
  }

  return Number(
    number.toFixed(4)
  );
}


function normalizeHealthRating(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (
    typeof value === "object"
  ) {
    const candidate =
      value.status ??
      value.label ??
      value.rating ??
      value.classification ??
      value.name ??
      value.title ??
      value.grade ??
      null;

    if (
      candidate !== null &&
      candidate !== undefined &&
      typeof candidate !== "object"
    ) {
      return String(candidate);
    }
  }

  return null;
}


function snapshotDate(value) {
  const parsed =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  return parsed
    .toISOString()
    .slice(0, 10);
}


/*
 * ============================================================
 * V1 / V2 NORMALIZATION
 * ============================================================
 *
 * This is an in-memory compatibility view.
 *
 * Stored historical records are not rewritten.
 * ============================================================
 */

export function normalizePortfolioSnapshot(
  snapshot = {}
) {
  const version =
    Number(
      snapshot?.snapshotVersion ||
      1
    );

  const holdingsValue =
    numberOrNull(
      snapshot?.holdingsValue ??
      snapshot?.currentValue
    );

  const investedValue =
    numberOrNull(
      snapshot?.investedValue
    );

  const availableCash =
    numberOrNull(
      snapshot?.availableCash ??
      snapshot?.cash
    );

  const calculatedNetWorth =
    holdingsValue !== null
      ? (
          holdingsValue +
          numberOrZero(
            availableCash
          )
        )
      : null;

  const netWorth =
    numberOrNull(
      snapshot?.netWorth ??
      snapshot?.totalValue
    ) ??
    calculatedNetWorth;

  const unrealizedGainLoss =
    numberOrNull(
      snapshot?.unrealizedGainLoss ??
      snapshot?.netGainLoss
    ) ??
    (
      holdingsValue !== null &&
      investedValue !== null
        ? (
            holdingsValue -
            investedValue
          )
        : null
    );

  const unrealizedGainLossPct =
    numberOrNull(
      snapshot?.unrealizedGainLossPct ??
      snapshot?.gainLossPct
    ) ??
    (
      unrealizedGainLoss !== null &&
      investedValue !== null &&
      investedValue > 0
        ? (
            unrealizedGainLoss /
            investedValue
          ) * 100
        : null
    );

  const date =
    snapshot?.date ||
    snapshotDate(
      snapshot?.snapshotAt ??
      snapshot?.savedAt
    );

  return {
    ...snapshot,

    snapshotVersion:
      version,

    snapshotAt:
      snapshot?.snapshotAt ??
      snapshot?.savedAt ??
      null,

    date,

    sourceType:
      snapshot?.sourceType ??
      (
        version >= 2
          ? "REAL"
          : "LEGACY"
      ),

    sourceId:
      snapshot?.sourceId ??
      null,

    sourceLabel:
      snapshot?.sourceLabel ??
      null,

    netWorth:
      roundMoney(
        netWorth
      ),

    holdingsValue:
      roundMoney(
        holdingsValue
      ),

    investedValue:
      roundMoney(
        investedValue
      ),

    availableCash:
      roundMoney(
        availableCash
      ),

    unrealizedGainLoss:
      roundMoney(
        unrealizedGainLoss
      ),

    unrealizedGainLossPct:
      roundPercent(
        unrealizedGainLossPct
      ),

    holdingsCount:
      numberOrNull(
        snapshot?.holdingsCount
      ),

    healthScore:
      numberOrNull(
        snapshot?.healthScore
      ),

    healthRating:
      normalizeHealthRating(
        snapshot?.healthRating
      ),

    /*
     * Compatibility aliases.
     *
     * Existing consumers may still reference these names.
     */
    currentValue:
      roundMoney(
        holdingsValue
      ),

    cash:
      roundMoney(
        availableCash
      ),

    totalValue:
      roundMoney(
        netWorth
      ),

    netGainLoss:
      roundMoney(
        unrealizedGainLoss
      ),

    gainLossPct:
      roundPercent(
        unrealizedGainLossPct
      )
  };
}


/*
 * ============================================================
 * LEGACY COMPATIBILITY WRITER
 * ============================================================
 *
 * Retained so older code importing savePortfolioSnapshot()
 * does not break.
 *
 * New GateCEP code should use:
 *
 *   saveCanonicalRealPortfolioSnapshot()
 * ============================================================
 */

export async function savePortfolioSnapshot({
  investedValue = 0,
  currentValue = 0,
  cash = 0,
  healthScore = null,
  healthRating = null,
  netGainLoss = 0,
  gainLossPct = 0
} = {}) {
  const now =
    new Date()
      .toISOString();

  const today =
    now.slice(
      0,
      10
    );

  const raw =
    await userGetItem(
      PORTFOLIO_SNAPSHOTS_KEY
    );

  const existing =
    raw
      ? JSON.parse(raw)
      : [];

  const holdingsValue =
    numberOrZero(
      currentValue
    );

  const availableCash =
    numberOrZero(
      cash
    );

  const netWorth =
    holdingsValue +
    availableCash;

  const snapshot = {
    id:
      `SNAP-${today}`,

    snapshotVersion:
      1,

    snapshotAt:
      now,

    date:
      today,

    investedValue:
      numberOrZero(
        investedValue
      ),

    currentValue:
      holdingsValue,

    cash:
      availableCash,

    totalValue:
      netWorth,

    healthScore:
      numberOrNull(
        healthScore
      ),

    healthRating:
      normalizeHealthRating(
        healthRating
      ),

    netGainLoss:
      numberOrZero(
        netGainLoss
      ),

    gainLossPct:
      numberOrZero(
        gainLossPct
      ),

    savedAt:
      now
  };

  const withoutToday =
    Array.isArray(existing)
      ? existing.filter(
          (item) =>
            item?.date !==
            today
        )
      : [];

  const next =
    [
      snapshot,
      ...withoutToday
    ]
      .sort(
        (a, b) =>
          new Date(
            b?.snapshotAt ??
            b?.savedAt ??
            b?.date ??
            0
          ) -
          new Date(
            a?.snapshotAt ??
            a?.savedAt ??
            a?.date ??
            0
          )
      )
      .slice(
        0,
        365
      );

  await userSetItem(
    PORTFOLIO_SNAPSHOTS_KEY,
    JSON.stringify(next)
  );

  return normalizePortfolioSnapshot(
    snapshot
  );
}


/*
 * ============================================================
 * PC-030C2B8
 * CANONICAL REAL PORTFOLIO SNAPSHOT
 * ============================================================
 */

export async function saveCanonicalRealPortfolioSnapshot() {
  const [
    realMetrics,
    health
  ] =
    await Promise.all([
      loadCanonicalRealWealthMetrics(),
      buildPortfolioHealthScore()
    ]);

  /*
   * Never write a fake zero snapshot when there is no active
   * real portfolio.
   */
  if (
    !realMetrics?.active
  ) {
    return null;
  }

  const holdingsValue =
    roundMoney(
      realMetrics?.holdingsValue
    ) ??
    0;

  const investedValue =
    roundMoney(
      realMetrics?.investedValue
    ) ??
    0;

  const availableCash =
    roundMoney(
      realMetrics?.availableCash
    ) ??
    0;

  const netWorth =
    roundMoney(
      realMetrics?.netWorth
    ) ??
    (
      holdingsValue +
      availableCash
    );

  const unrealizedGainLoss =
    roundMoney(
      holdingsValue -
      investedValue
    ) ??
    0;

  const unrealizedGainLossPct =
    investedValue > 0
      ? roundPercent(
          (
            unrealizedGainLoss /
            investedValue
          ) * 100
        )
      : null;

  const healthReady =
    health &&
    health?.status !==
      "NOT_READY";

  const healthScore =
    healthReady
      ? numberOrNull(
          health?.score
        )
      : null;

  /*
   * Executive classification status is the canonical
   * human-readable status code used by Unified Analytics.
   *
   * Example:
   *   CRITICAL_REVIEW
   */
  const healthRating =
    healthReady
      ? normalizeHealthRating(
          health
            ?.classification
            ?.status ??
          health?.status ??
          health?.grade
        )
      : null;

  const now =
    new Date()
      .toISOString();

  const today =
    now.slice(
      0,
      10
    );

  const snapshot = {
    id:
      `SNAP-${today}`,

    snapshotVersion:
      SNAPSHOT_VERSION,

    snapshotAt:
      now,

    savedAt:
      now,

    date:
      today,

    sourceType:
      "REAL",

    sourceId:
      realMetrics?.sourceId ||
      "ALL",

    sourceLabel:
      realMetrics?.sourceLabel ||
      "All Accounts",

    currency:
      "KES",

    netWorth,

    holdingsValue,

    investedValue,

    availableCash,

    unrealizedGainLoss,

    unrealizedGainLossPct,

    holdingsCount:
      Number(
        realMetrics?.holdingsCount ||
        0
      ),

    healthScore,

    healthRating,

    /*
     * Reconciliation metadata.
     */
    reconciliation: {
      equation:
        "NET_WORTH = HOLDINGS_MARKET_VALUE + AVAILABLE_CASH",

      calculatedNetWorth:
        roundMoney(
          holdingsValue +
          availableCash
        ),

      balanced:
        Math.abs(
          netWorth -
          (
            holdingsValue +
            availableCash
          )
        ) <
        0.01
    },

    safeguards: {
      practiceIncluded:
        false,

      selectorIndependent:
        true,

      canonicalRealPortfolio:
        true
    },

    /*
     * Compatibility aliases.
     *
     * New code should use the explicit V2 field names above.
     */
    currentValue:
      holdingsValue,

    cash:
      availableCash,

    totalValue:
      netWorth,

    netGainLoss:
      unrealizedGainLoss,

    gainLossPct:
      unrealizedGainLossPct
  };

  const raw =
    await userGetItem(
      PORTFOLIO_SNAPSHOTS_KEY
    );

  const existing =
    raw
      ? JSON.parse(raw)
      : [];

  /*
   * One portfolio snapshot per calendar day.
   *
   * Revisiting Performance later the same day refreshes the
   * day's snapshot with current real portfolio values.
   */
  const withoutToday =
    Array.isArray(existing)
      ? existing.filter(
          (item) =>
            item?.date !==
            today
        )
      : [];

  const next =
    [
      snapshot,
      ...withoutToday
    ]
      .sort(
        (a, b) =>
          new Date(
            b?.snapshotAt ??
            b?.savedAt ??
            b?.date ??
            0
          ) -
          new Date(
            a?.snapshotAt ??
            a?.savedAt ??
            a?.date ??
            0
          )
      )
      .slice(
        0,
        365
      );

  await userSetItem(
    PORTFOLIO_SNAPSHOTS_KEY,
    JSON.stringify(next)
  );

  return normalizePortfolioSnapshot(
    snapshot
  );
}


/*
 * ============================================================
 * LOAD
 * ============================================================
 */

export async function loadPortfolioSnapshots() {
  const raw =
    await userGetItem(
      PORTFOLIO_SNAPSHOTS_KEY
    );

  if (!raw) {
    return [];
  }

  const parsed =
    JSON.parse(raw);

  if (
    !Array.isArray(parsed)
  ) {
    return [];
  }

  /*
   * Normalize in memory only.
   *
   * Existing historical V1 records remain untouched in storage.
   */
  return parsed
    .map(
      normalizePortfolioSnapshot
    )
    .sort(
      (a, b) =>
        new Date(
          b?.snapshotAt ??
          b?.savedAt ??
          b?.date ??
          0
        ) -
        new Date(
          a?.snapshotAt ??
          a?.savedAt ??
          a?.date ??
          0
        )
    );
}


/*
 * ============================================================
 * CLEAR
 * ============================================================
 */

export async function clearPortfolioSnapshots() {
  await userSetItem(
    PORTFOLIO_SNAPSHOTS_KEY,
    JSON.stringify([])
  );
}
'''

    write_file(
        SNAPSHOT,
        snapshot_service
    )

    #
    # ==========================================================
    # 2. PERFORMANCE IMPORT
    # ==========================================================
    #

    old_import = '''import { loadPortfolioSnapshots } from "../src/portfolio/portfolioSnapshot";'''

    new_import = '''import {
  loadPortfolioSnapshots,
  saveCanonicalRealPortfolioSnapshot
} from "../src/portfolio/portfolioSnapshot";'''

    replace_once(
        PERFORMANCE,
        old_import,
        new_import
    )

    #
    # ==========================================================
    # 3. PERFORMANCE LOAD
    #
    # Capture/update today's canonical snapshot first.
    # Then load the complete normalized history.
    #
    # This gives the user:
    #
    # Day 1 -> one snapshot -> insufficient history
    # Day 2 -> two snapshots -> historical comparison active
    # ==========================================================
    #

    old_load = '''      const [data, realMetrics, health] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics(),
        buildPortfolioHealthScore()
      ]);'''

    new_load = '''      /*
       * PC-030C2B8
       *
       * Refresh today's REAL All Accounts snapshot before
       * loading historical performance.
       */
      await saveCanonicalRealPortfolioSnapshot();

      const [data, realMetrics, health] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics(),
        buildPortfolioHealthScore()
      ]);'''

    replace_once(
        PERFORMANCE,
        old_load,
        new_load
    )

    #
    # ==========================================================
    # 4. SNAPSHOT HISTORY VALUE
    #
    # Make the history row explicit: the right-side value is
    # Net Worth, not an ambiguous "totalValue".
    #
    # Loader compatibility still supplies totalValue, but V2
    # should prefer netWorth.
    # ==========================================================
    #

    old_history_value = '''                  <Text style={styles.white}>KES {money(s.totalValue)}</Text>'''

    new_history_value = '''                  <Text style={styles.white}>
                    Net Worth KES {money(
                      s.netWorth ??
                      s.totalValue
                    )}
                  </Text>'''

    replace_once(
        PERFORMANCE,
        old_history_value,
        new_history_value
    )

    #
    # ==========================================================
    # 5. SNAPSHOT HISTORY GAIN
    # ==========================================================
    #

    old_history_gain = '''                      Number(s.netGainLoss || 0) >= 0'''

    new_history_gain = '''                      Number(
                        s.unrealizedGainLoss ??
                        s.netGainLoss ??
                        0
                      ) >= 0'''

    replace_once(
        PERFORMANCE,
        old_history_gain,
        new_history_gain
    )

    old_history_gain_value = '''                    KES {money(s.netGainLoss)}'''

    new_history_gain_value = '''                    KES {money(
                      s.unrealizedGainLoss ??
                      s.netGainLoss
                    )}'''

    replace_once(
        PERFORMANCE,
        old_history_gain_value,
        new_history_gain_value
    )

    print()
    print(
        "PC-030C2B8 applied successfully."
    )

    print()
    print(
        "Snapshot contract: V2 canonical REAL All Accounts."
    )

    print(
        "Existing V1 history is preserved and normalized only when read."
    )

    print(
        "Performance now refreshes one canonical snapshot per day."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
