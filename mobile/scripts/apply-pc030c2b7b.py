from pathlib import Path
import re
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

PATH = APP / "performance.js"


def archive_backup(path):
    ARCHIVE.mkdir(parents=True, exist_ok=True)

    dest = ARCHIVE / path.name

    if dest.exists():
        i = 1

        while True:
            candidate = ARCHIVE / f"{path.name}-{i}"

            if not candidate.exists():
                dest = candidate
                break

            i += 1

    shutil.move(str(path), str(dest))
    return dest


try:
    original = PATH.read_text(encoding="utf-8")
    text = original

    #
    # ==========================================================
    # 1. CURRENT PORTFOLIO HEALTH ENGINE
    # ==========================================================
    #

    old = (
        'import { loadCanonicalRealWealthMetrics } '
        'from "../src/features/wealth-journey/'
        'canonicalRealWealthMetricsService";'
    )

    new = (
        'import { loadCanonicalRealWealthMetrics } '
        'from "../src/features/wealth-journey/'
        'canonicalRealWealthMetricsService";\n'
        'import { buildPortfolioHealthScore } '
        'from "../src/features/analytics/'
        'portfolioHealthScoreService";'
    )

    if "buildPortfolioHealthScore" not in text:
        if old not in text:
            raise RuntimeError(
                "Canonical metrics import anchor not found."
            )

        text = text.replace(old, new, 1)

    #
    # ==========================================================
    # 2. CURRENT HEALTH STATE
    # ==========================================================
    #

    old = '''const [canonicalMetrics, setCanonicalMetrics] = useState(null);'''

    new = '''const [canonicalMetrics, setCanonicalMetrics] = useState(null);
const [currentHealth, setCurrentHealth] = useState(null);'''

    if "const [currentHealth" not in text:
        if old not in text:
            raise RuntimeError(
                "Canonical metrics state anchor not found."
            )

        text = text.replace(old, new, 1)

    #
    # ==========================================================
    # 3. LOAD HEALTH + SNAPSHOTS + REAL METRICS
    # ==========================================================
    #

    old = '''      const [data, realMetrics] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics()
      ]);

      setSnapshots(Array.isArray(data) ? data : []);
      setCanonicalMetrics(realMetrics || null);'''

    new = '''      const [data, realMetrics, health] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics(),
        buildPortfolioHealthScore()
      ]);

      setSnapshots(
        Array.isArray(data)
          ? data
          : []
      );

      setCanonicalMetrics(
        realMetrics || null
      );

      setCurrentHealth(
        health || null
      );'''

    if "const [data, realMetrics, health]" not in text:
        if old not in text:
            raise RuntimeError(
                "Performance load Promise.all anchor not found."
            )

        text = text.replace(old, new, 1)

    old = '''      setSnapshots([]);
      setCanonicalMetrics(null);'''

    new = '''      setSnapshots([]);
      setCanonicalMetrics(null);
      setCurrentHealth(null);'''

    if "setCurrentHealth(null);" not in text:
        if old not in text:
            raise RuntimeError(
                "Performance catch anchor not found."
            )

        text = text.replace(old, new, 1)

    #
    # ==========================================================
    # 4. HISTORICAL COMPARISON
    #
    # One snapshot is not history.
    # Missing history is NULL, not zero.
    # ==========================================================
    #

    old = '''    const firstValue = Number(
      first?.totalValue ||
      first?.currentValue ||
      0
    );

    const change =
      firstValue > 0
        ? netWorth - firstValue
        : 0;

    const changePct =
      firstValue > 0
        ? (change / firstValue) * 100
        : 0;'''

    new = '''    const hasHistoricalComparison =
      snapshots.length >= 2;

    const firstValueRaw =
      first?.totalValue ??
      first?.netWorth ??
      first?.currentValue ??
      null;

    const firstValue =
      firstValueRaw !== null &&
      Number.isFinite(
        Number(firstValueRaw)
      )
        ? Number(firstValueRaw)
        : null;

    const hasValidFirstValue =
      hasHistoricalComparison &&
      firstValue !== null &&
      firstValue > 0;

    const change =
      hasValidFirstValue
        ? netWorth - firstValue
        : null;

    const changePct =
      hasValidFirstValue
        ? (change / firstValue) * 100
        : null;'''

    if "const hasHistoricalComparison" not in text:
        if old not in text:
            raise RuntimeError(
                "Historical comparison anchor not found."
            )

        text = text.replace(old, new, 1)

    #
    # ==========================================================
    # 5. CURRENT HEALTH INTO CURRENT METRICS
    # ==========================================================
    #

    old = '''            netGainLoss,
            gainLossPct
          }'''

    new = '''            netGainLoss,
            gainLossPct,

            healthScore:
              currentHealth?.score ??
              currentHealth?.healthScore ??
              null,

            healthRating:
              currentHealth?.rating ??
              currentHealth?.healthRating ??
              currentHealth?.classification ??
              null
          }'''

    if "currentHealth?.score" not in text:
        if old not in text:
            raise RuntimeError(
                "Current metrics return anchor not found."
            )

        text = text.replace(old, new, 1)

    old = '''  }, [snapshots, canonicalMetrics]);'''

    new = '''  }, [
    snapshots,
    canonicalMetrics,
    currentHealth
  ]);'''

    if "canonicalMetrics,\n    currentHealth" not in text:
        if old not in text:
            raise RuntimeError(
                "useMemo dependency anchor not found."
            )

        text = text.replace(old, new, 1)

    #
    # ==========================================================
    # 6. HISTORICAL CHANGE UI
    # ==========================================================
    #

    old = '''            <SummaryItem
              label="Change Since First Snapshot"
              value={`KES ${money(metrics.change)} (${metrics.changePct.toFixed(
                2
              )}%)`}
              positive={metrics.change >= 0}
            />'''

    new = '''            <SummaryItem
              label="Change Since First Snapshot"
              value={
                metrics.change !== null &&
                metrics.changePct !== null
                  ? `KES ${money(
                      metrics.change
                    )} (${metrics.changePct.toFixed(
                      2
                    )}%)`
                  : "N/A — Insufficient history"
              }
              positive={
                metrics.change !== null
                  ? metrics.change >= 0
                  : undefined
              }
            />'''

    if "N/A — Insufficient history" not in text:
        if old not in text:
            raise RuntimeError(
                "Change Since First Snapshot UI anchor not found."
            )

        text = text.replace(old, new, 1)

    #
    # ==========================================================
    # 7. CURRENT HEALTH SCORE UI
    # ==========================================================
    #

    old = '''            <SummaryItem
              label="Health Score"
              value={`${metrics.latest.healthScore || 0}/100 ${
                metrics.latest.healthRating
                  ? `(${metrics.latest.healthRating})`
                  : ""
              }`}
            />'''

    new = '''            <SummaryItem
              label="Health Score"
              value={
                metrics.latest.healthScore !== null &&
                metrics.latest.healthScore !== undefined
                  ? `${Number(
                      metrics.latest.healthScore
                    ).toFixed(0)}/100 ${
                      metrics.latest.healthRating
                        ? `(${metrics.latest.healthRating})`
                        : ""
                    }`
                  : "N/A"
              }
            />'''

    if "metrics.latest.healthScore !== null" not in text:
        if old not in text:
            raise RuntimeError(
                "Health Score UI anchor not found."
            )

        text = text.replace(old, new, 1)

    #
    # ==========================================================
    # 8. SNAPSHOT HISTORY HEALTH
    #
    # Flexible regex because this block has different formatting
    # across prior Performance builds.
    # ==========================================================
    #

    if "s.healthScore !== null" not in text:

        pattern = re.compile(
            r'''Health\s*
                \{\s*s\.healthScore\s*\|\|\s*0\s*\}
                \s*/100
                \s*•
                \s*Cash\s+KES\s*
                \{\s*money\(s\.cash\)\s*\}
            ''',
            re.VERBOSE | re.MULTILINE
        )

        replacement = '''Health{" "}
                    {s.healthScore !== null &&
                    s.healthScore !== undefined
                      ? `${Number(
                          s.healthScore
                        ).toFixed(0)}/100`
                      : "N/A"}{" "}
                    • Cash KES {money(s.cash)}'''

        text, count = pattern.subn(
            replacement,
            text,
            count=1
        )

        #
        # Snapshot history format may not contain health at all.
        # That is acceptable. What matters is that there is no
        # fake || 0 health fallback.
        #
        if count == 0:
            print(
                "INFO — no legacy snapshot Health fallback "
                "expression was found."
            )

    #
    # ==========================================================
    # 9. FINAL SAFETY CHECKS BEFORE WRITING
    # ==========================================================
    #

    required = [
        "buildPortfolioHealthScore",
        "currentHealth",
        "hasHistoricalComparison",
        "N/A — Insufficient history",
        "metrics.latest.healthScore !== null"
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Required final changes missing: {missing}"
        )

    if "metrics.latest.healthScore || 0" in text:
        raise RuntimeError(
            "Current Health Score still has || 0 fallback."
        )

    #
    # ==========================================================
    # 10. WRITE ATOMICALLY
    # ==========================================================
    #

    if text == original:
        print(
            "UNCHANGED app/performance.js — "
            "PC-030C2B7B already present."
        )

    else:
        backup = PATH.with_suffix(
            PATH.suffix + ".pc030c2b7b.bak"
        )

        shutil.copy2(
            PATH,
            backup
        )

        PATH.write_text(
            text,
            encoding="utf-8"
        )

        archived = archive_backup(
            backup
        )

        print(
            "PATCHED app/performance.js"
        )

        print(
            f"  backup -> "
            f"{archived.relative_to(ROOT)}"
        )

    print()
    print(
        "PC-030C2B7B applied successfully."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
