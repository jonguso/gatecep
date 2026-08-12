from pathlib import Path
import re
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
SRC = ROOT / "src"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

ALLOCATION = (
    SRC /
    "features" /
    "rebalancing" /
    "allocationEngine.js"
)

UNIFIED = (
    SRC /
    "features" /
    "analytics" /
    "unifiedPortfolioAnalyticsService.js"
)

DRIFT = (
    SRC /
    "features" /
    "rebalancing" /
    "driftAnalysisService.js"
)

UNIFIED_SCREEN = (
    APP /
    "unified-portfolio-analytics.js"
)

RISK_SCREEN = (
    APP /
    "portfolio-risk.js"
)

PERFORMANCE_SCREEN = (
    APP /
    "performance.js"
)

REBALANCING_SCREEN = (
    APP /
    "portfolio-rebalancing.js"
)


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2b2.bak"
    )

    shutil.copy2(path, b)

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
        return

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
            f"{old[:300]}"
        )

    commit(
        path,
        original,
        text
    )


try:

    #
    # ==========================================================
    # 1. CENTRAL PORTFOLIO ALLOCATION ENGINE
    #
    # Risk, diversification, stress testing, attribution and
    # rebalancing already consume this common allocation model.
    #
    # Change its source from Practice Portfolio to canonical
    # REAL All Accounts.
    # ==========================================================
    #

    original = ALLOCATION.read_text(
        encoding="utf-8"
    )

    text = original

    old_import = '''import {
  loadInvestorContext
} from "../investor/investorContextStore";'''

    new_import = '''import {
  loadCanonicalRealWealthMetrics
} from "../wealth-journey/canonicalRealWealthMetricsService";'''

    if old_import in text:
        text = text.replace(
            old_import,
            new_import,
            1
        )

    elif (
        "loadCanonicalRealWealthMetrics"
        not in text
    ):
        raise RuntimeError(
            "allocationEngine investor-context "
            "import not found."
        )

    source_pattern = re.compile(
        r'''  const investorContext\s*=\s*
\s*await loadInvestorContext\(\);\s*

\s*const practicePortfolio\s*=\s*
\s*investorContext\s*
\s*\?\.practicePortfolio\s*\|\|\s*
\s*null;''',
        re.MULTILINE
    )

    source_replacement = '''  const realMetrics =
    await loadCanonicalRealWealthMetrics();

  /*
   * PC-030C2B2
   *
   * Analytics portfolio source of truth:
   * canonical REAL All Accounts.
   *
   * Practice Portfolio remains available to the investor as
   * an explicit learning portfolio, but is not used by the
   * real portfolio analytics engine.
   *
   * Keep the local variable name practicePortfolio temporarily
   * to preserve the mature allocation calculations below.
   */
  const practicePortfolio =
    realMetrics?.active
      ? {
          id: "REAL-ALL",
          name:
            realMetrics?.sourceLabel ||
            "All Accounts",
          currency: "KES",

          holdings:
            Array.isArray(
              realMetrics?.holdings
            )
              ? realMetrics.holdings
              : [],

          holdingsValue:
            Number(
              realMetrics?.holdingsValue ||
              0
            ),

          investedAmount:
            Number(
              realMetrics?.investedValue ||
              0
            ),

          availableCash:
            Number(
              realMetrics?.availableCash ||
              0
            ),

          totalValue:
            Number(
              realMetrics?.netWorth ||
              0
            ),

          sourceType:
            "REAL",

          sourceId:
            "ALL"
        }
      : null;'''

    if source_pattern.search(text):
        text = source_pattern.sub(
            source_replacement,
            text,
            count=1
        )

    elif (
        'sourceType:\n            "REAL"'
        not in text
    ):
        raise RuntimeError(
            "allocationEngine source block "
            "not found."
        )

    commit(
        ALLOCATION,
        original,
        text
    )

    #
    # ==========================================================
    # 2. UNIFIED ANALYTICS
    #
    # Its helper functions currently read
    # investorContext.practicePortfolio.
    #
    # Supply a compatibility-shaped investorContext containing
    # the canonical REAL portfolio. This avoids rewriting all
    # mature analytics normalization functions in this build.
    # ==========================================================
    #

    original = UNIFIED.read_text(
        encoding="utf-8"
    )

    text = original

    old_import = '''import {
  loadInvestorContext
} from "../investor/investorContextStore";'''

    new_import = '''import {
  loadCanonicalRealWealthMetrics
} from "../wealth-journey/canonicalRealWealthMetricsService";'''

    if old_import in text:
        text = text.replace(
            old_import,
            new_import,
            1
        )

    elif (
        "loadCanonicalRealWealthMetrics"
        not in text
    ):
        raise RuntimeError(
            "Unified Analytics investor-context "
            "import not found."
        )

    old_source = '''  const investorContext =
    await loadInvestorContext();

  const practicePortfolio =
    investorContext
      ?.practicePortfolio ||
    null;

  if (
    !practicePortfolio
  ) {
    return buildEmptyAnalyticsResult({
      investorContext,

      message:
        "A Practice Portfolio is required before unified analytics can be generated."
    });
  }'''

    new_source = '''  const realMetrics =
    await loadCanonicalRealWealthMetrics();

  const portfolioSource =
    realMetrics?.active
      ? {
          id: "REAL-ALL",

          name:
            realMetrics?.sourceLabel ||
            "All Accounts",

          currency:
            "KES",

          holdings:
            Array.isArray(
              realMetrics?.holdings
            )
              ? realMetrics.holdings
              : [],

          holdingsValue:
            Number(
              realMetrics?.holdingsValue ||
              0
            ),

          investedAmount:
            Number(
              realMetrics?.investedValue ||
              0
            ),

          availableCash:
            Number(
              realMetrics?.availableCash ||
              0
            ),

          totalValue:
            Number(
              realMetrics?.netWorth ||
              0
            ),

          sourceType:
            "REAL",

          sourceId:
            "ALL"
        }
      : null;

  /*
   * Compatibility shape for the existing PC-022 helper
   * functions. The object in practicePortfolio is REAL data.
   * This prevents a broad rewrite of proven scoring logic.
   */
  const investorContext = {
    practicePortfolio:
      portfolioSource,

    analyticsPortfolioSource:
      "REAL",

    canonicalRealMetrics:
      realMetrics
  };

  const practicePortfolio =
    portfolioSource;

  if (
    !practicePortfolio
  ) {
    return buildEmptyAnalyticsResult({
      investorContext,

      message:
        "A real portfolio is required before unified analytics can be generated."
    });
  }'''

    if old_source in text:
        text = text.replace(
            old_source,
            new_source,
            1
        )

    elif (
        'analyticsPortfolioSource:\n      "REAL"'
        not in text
    ):
        raise RuntimeError(
            "Unified Analytics portfolio source "
            "block not found."
        )

    commit(
        UNIFIED,
        original,
        text
    )

    #
    # ==========================================================
    # 3. CLEAN UP REBALANCING USER MESSAGE
    # ==========================================================
    #

    replace_once(
        DRIFT,
        '"A funded Practice Portfolio is required before drift can be calculated."',
        '"A funded real portfolio is required before drift can be calculated."'
    )

    #
    # ==========================================================
    # 4. UNIFIED ANALYTICS -> PORTFOLIO HUB
    # ==========================================================
    #

    replace_once(
        UNIFIED_SCREEN,
        'onPress={() => router.replace("/(tabs)/dashboard")}',
        'onPress={() => router.replace("/portfolio-hub")}'
    )

    replace_once(
        UNIFIED_SCREEN,
        '<Text style={styles.secondaryButtonText}>Back to Dashboard</Text>',
        '<Text style={styles.secondaryButtonText}>Back to Portfolio Hub</Text>'
    )

    #
    # ==========================================================
    # 5. RISK -> UNIFIED ANALYTICS
    # ==========================================================
    #

    replace_once(
        RISK_SCREEN,
        'onPress={() => router.replace("/(tabs)/dashboard")}',
        'onPress={() => router.replace("/unified-portfolio-analytics")}'
    )

    replace_once(
        RISK_SCREEN,
        '<Text style={styles.secondaryButtonText}>Back to Dashboard</Text>',
        '<Text style={styles.secondaryButtonText}>Back to Portfolio Analytics</Text>'
    )

    #
    # ==========================================================
    # 6. PERFORMANCE -> UNIFIED ANALYTICS
    # ==========================================================
    #

    replace_once(
        PERFORMANCE_SCREEN,
        'onPress={() => router.replace("/(tabs)/dashboard")}',
        'onPress={() => router.replace("/unified-portfolio-analytics")}'
    )

    replace_once(
        PERFORMANCE_SCREEN,
        '<Text style={styles.dashboardText}>Dashboard</Text>',
        '<Text style={styles.dashboardText}>Portfolio Analytics</Text>'
    )

    #
    # ==========================================================
    # 7. REBALANCING -> UNIFIED ANALYTICS
    #
    # This screen is formatted differently, so route and label
    # are patched independently.
    # ==========================================================
    #

    original = REBALANCING_SCREEN.read_text(
        encoding="utf-8"
    )

    text = original

    if (
        '"/(tabs)/dashboard"'
        in text
    ):
        #
        # Only change the final Dashboard return associated with
        # this specialist screen. Existing internal actions are
        # left untouched.
        #
        last = text.rfind(
            '"/(tabs)/dashboard"'
        )

        if last == -1:
            raise RuntimeError(
                "Rebalancing dashboard route "
                "not found."
            )

        text = (
            text[:last] +
            '"/unified-portfolio-analytics"' +
            text[
                last +
                len(
                    '"/(tabs)/dashboard"'
                ):
            ]
        )

    elif (
        '"/unified-portfolio-analytics"'
        not in text
    ):
        raise RuntimeError(
            "Rebalancing return route "
            "not found."
        )

    #
    # Change only the last Back to Dashboard label.
    #
    if "Back to Dashboard" in text:
        last = text.rfind(
            "Back to Dashboard"
        )

        text = (
            text[:last] +
            "Back to Portfolio Analytics" +
            text[
                last +
                len(
                    "Back to Dashboard"
                ):
            ]
        )

    commit(
        REBALANCING_SCREEN,
        original,
        text
    )

    print()
    print(
        "PC-030C2B2 applied successfully."
    )

    print()
    print(
        "Analytics source: canonical REAL All Accounts"
    )

    print(
        "Practice remains separate and is not used "
        "for real analytics."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
