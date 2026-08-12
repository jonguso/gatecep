from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"

ARCHIVE = (
    ROOT /
    "archive" /
    "expo-router-nonroutes" /
    "bak"
)

PERFORMANCE = APP / "performance.js"


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2c2.bak"
    )

    shutil.copy2(
        path,
        b
    )

    return b


def archive_backup(path):
    rel = path.relative_to(APP)

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


try:
    original = PERFORMANCE.read_text(
        encoding="utf-8"
    )

    text = original

    #
    # ==========================================================
    # 1. IMPORT HISTORICAL SUMMARY
    # ==========================================================
    #

    import_anchor = '''import { buildPortfolioHealthScore } from "../src/features/analytics/portfolioHealthScoreService";'''

    import_new = '''import { buildPortfolioHealthScore } from "../src/features/analytics/portfolioHealthScoreService";
import {
  buildHistoricalPerformanceSummary
} from "../src/features/performance/historicalPerformanceSummaryService";'''

    if (
        "buildHistoricalPerformanceSummary"
        not in text
    ):
        if import_anchor not in text:
            raise RuntimeError(
                "Performance import anchor not found."
            )

        text = text.replace(
            import_anchor,
            import_new,
            1
        )

    #
    # ==========================================================
    # 2. ADD HISTORICAL SUMMARY STATE
    # ==========================================================
    #

    state_anchor = '''const [currentHealth, setCurrentHealth] = useState(null);'''

    state_new = '''const [currentHealth, setCurrentHealth] = useState(null);
const [historicalSummary, setHistoricalSummary] = useState(null);'''

    if (
        "const [historicalSummary"
        not in text
    ):
        if state_anchor not in text:
            raise RuntimeError(
                "Historical state anchor not found."
            )

        text = text.replace(
            state_anchor,
            state_new,
            1
        )

    #
    # ==========================================================
    # 3. LOAD HISTORICAL SUMMARY
    #
    # Today's snapshot is refreshed first.
    # Historical summary therefore sees the newest observation.
    # ==========================================================
    #

    load_anchor = '''      const [data, realMetrics, health] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics(),
        buildPortfolioHealthScore()
      ]);'''

    load_new = '''      const [
        data,
        realMetrics,
        health,
        historySummary
      ] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics(),
        buildPortfolioHealthScore(),
        buildHistoricalPerformanceSummary()
      ]);'''

    if (
        "historySummary"
        not in text
    ):
        if load_anchor not in text:
            raise RuntimeError(
                "Performance Promise.all anchor not found."
            )

        text = text.replace(
            load_anchor,
            load_new,
            1
        )

    state_load_anchor = '''      setCurrentHealth(
        health || null
      );'''

    state_load_new = '''      setCurrentHealth(
        health || null
      );

      setHistoricalSummary(
        historySummary || null
      );'''

    if (
        "setHistoricalSummary("
        not in text
    ):
        if state_load_anchor not in text:
            raise RuntimeError(
                "Historical state load anchor not found."
            )

        text = text.replace(
            state_load_anchor,
            state_load_new,
            1
        )

    catch_anchor = '''      setSnapshots([]);
      setCanonicalMetrics(null);
      setCurrentHealth(null);'''

    catch_new = '''      setSnapshots([]);
      setCanonicalMetrics(null);
      setCurrentHealth(null);
      setHistoricalSummary(null);'''

    if (
        "setHistoricalSummary(null);"
        not in text
    ):
        if catch_anchor not in text:
            raise RuntimeError(
                "Performance catch anchor not found."
            )

        text = text.replace(
            catch_anchor,
            catch_new,
            1
        )

    #
    # ==========================================================
    # 4. REMOVE OLD SINGLE HISTORICAL CARD
    #
    # The new period grid supersedes this one-off comparison.
    # ==========================================================
    #

    old_change = '''            <SummaryItem
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
            />

'''

    if old_change in text:
        text = text.replace(
            old_change,
            "",
            1
        )

    #
    # ==========================================================
    # 5. HISTORICAL PERFORMANCE UI
    #
    # Insert immediately before Snapshot History.
    # ==========================================================
    #

    history_anchor = '''          <View style={styles.card}>
            <Text style={styles.cardTitle}>Snapshot History</Text>'''

    history_block = '''          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Historical Performance
                </Text>

                <Text style={styles.body}>
                  Portfolio net-worth change across available snapshot periods.
                </Text>
              </View>

              <View style={styles.observationBadge}>
                <Text style={styles.observationBadgeText}>
                  {historicalSummary?.observationCount || 0} observations
                </Text>
              </View>
            </View>

            <View style={styles.periodGrid}>
              <PeriodCard
                label="7D"
                period={historicalSummary?.periods?.sevenDay}
              />

              <PeriodCard
                label="30D"
                period={historicalSummary?.periods?.thirtyDay}
              />

              <PeriodCard
                label="90D"
                period={historicalSummary?.periods?.ninetyDay}
              />

              <PeriodCard
                label="YTD"
                period={historicalSummary?.periods?.yearToDate}
              />

              <PeriodCard
                label="1Y"
                period={historicalSummary?.periods?.oneYear}
              />

              <PeriodCard
                label="Since First"
                period={
                  historicalSummary
                    ?.periods
                    ?.sinceFirstSnapshot
                }
              />
            </View>

            {historicalSummary?.status ===
            "INSUFFICIENT_HISTORY" ? (
              <View style={styles.historyNotice}>
                <Text style={styles.historyNoticeTitle}>
                  Building Performance History
                </Text>

                <Text style={styles.historyNoticeText}>
                  GateCEP needs additional genuine portfolio snapshots before
                  historical returns can be calculated. Missing periods remain
                  N/A rather than being reported as zero return.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Portfolio Drawdown
            </Text>

            <Text style={styles.body}>
              Measures the decline in net worth from prior portfolio peaks.
            </Text>

            <View style={styles.analyticsGrid}>
              <AnalyticsMetric
                label="Peak Net Worth"
                value={
                  historicalSummary
                    ?.drawdown
                    ?.peakNetWorth !== null &&
                  historicalSummary
                    ?.drawdown
                    ?.peakNetWorth !== undefined
                    ? `KES ${money(
                        historicalSummary
                          .drawdown
                          .peakNetWorth
                      )}`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Current Drawdown"
                value={
                  historicalSummary
                    ?.drawdown
                    ?.currentDrawdownPercentage !== null &&
                  historicalSummary
                    ?.drawdown
                    ?.currentDrawdownPercentage !== undefined
                    ? `${Number(
                        historicalSummary
                          .drawdown
                          .currentDrawdownPercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Maximum Drawdown"
                value={
                  historicalSummary
                    ?.drawdown
                    ?.maximumDrawdownPercentage !== null &&
                  historicalSummary
                    ?.drawdown
                    ?.maximumDrawdownPercentage !== undefined
                    ? `${Number(
                        historicalSummary
                          .drawdown
                          .maximumDrawdownPercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Peak Date"
                value={
                  historicalSummary
                    ?.drawdown
                    ?.peakDate ||
                  "N/A"
                }
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Portfolio Health Trend
            </Text>

            <Text style={styles.body}>
              Tracks how the portfolio health score changes as new snapshots
              are recorded.
            </Text>

            <View style={styles.analyticsGrid}>
              <AnalyticsMetric
                label="First Score"
                value={
                  historicalSummary
                    ?.healthTrend
                    ?.firstScore !== null &&
                  historicalSummary
                    ?.healthTrend
                    ?.firstScore !== undefined
                    ? `${Number(
                        historicalSummary
                          .healthTrend
                          .firstScore
                      ).toFixed(0)}/100`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Latest Score"
                value={
                  historicalSummary
                    ?.healthTrend
                    ?.latestScore !== null &&
                  historicalSummary
                    ?.healthTrend
                    ?.latestScore !== undefined
                    ? `${Number(
                        historicalSummary
                          .healthTrend
                          .latestScore
                      ).toFixed(0)}/100`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Score Change"
                value={
                  historicalSummary
                    ?.healthTrend
                    ?.change !== null &&
                  historicalSummary
                    ?.healthTrend
                    ?.change !== undefined
                    ? `${Number(
                        historicalSummary
                          .healthTrend
                          .change
                      ) >= 0
                        ? "+"
                        : ""}${Number(
                        historicalSummary
                          .healthTrend
                          .change
                      ).toFixed(0)}`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Direction"
                value={
                  formatPerformanceLabel(
                    historicalSummary
                      ?.healthTrend
                      ?.direction
                  ) ||
                  "N/A"
                }
              />
            </View>
          </View>

''' + history_anchor

    if (
        "Historical Performance"
        not in text
    ):
        if history_anchor not in text:
            raise RuntimeError(
                "Snapshot History UI anchor not found."
            )

        text = text.replace(
            history_anchor,
            history_block,
            1
        )

    #
    # ==========================================================
    # 6. ADD PERIOD / ANALYTICS COMPONENTS
    # ==========================================================
    #

    component_anchor = '''function SummaryItem({ label, value, cyan, green, positive }) {'''

    components = '''function PeriodCard({
  label,
  period
}) {
  const available =
    Boolean(
      period?.available
    );

  const change =
    available
      ? Number(
          period?.change || 0
        )
      : null;

  const returnPercentage =
    available &&
    period?.returnPercentage !== null &&
    period?.returnPercentage !== undefined
      ? Number(
          period.returnPercentage
        )
      : null;

  const positive =
    change !== null
      ? change >= 0
      : null;

  return (
    <View style={styles.periodCard}>
      <Text style={styles.periodLabel}>
        {label}
      </Text>

      {available ? (
        <>
          <Text
            style={
              positive
                ? styles.green
                : styles.red
            }
          >
            {positive ? "+" : ""}
            {returnPercentage !== null
              ? returnPercentage.toFixed(2)
              : "0.00"}
            %
          </Text>

          <Text style={styles.periodChange}>
            {change >= 0 ? "+" : ""}
            KES {money(change)}
          </Text>

          <Text style={styles.periodDates}>
            {period?.startDate || "—"}
            {" → "}
            {period?.endDate || "—"}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.periodUnavailable}>
            N/A
          </Text>

          <Text style={styles.periodDates}>
            Insufficient history
          </Text>
        </>
      )}
    </View>
  );
}


function AnalyticsMetric({
  label,
  value
}) {
  return (
    <View style={styles.analyticsMetric}>
      <Text style={styles.small}>
        {label}
      </Text>

      <Text style={styles.white}>
        {value}
      </Text>
    </View>
  );
}


function SummaryItem({ label, value, cyan, green, positive }) {'''

    if (
        "function PeriodCard"
        not in text
    ):
        if component_anchor not in text:
            raise RuntimeError(
                "SummaryItem component anchor not found."
            )

        text = text.replace(
            component_anchor,
            components,
            1
        )

    #
    # ==========================================================
    # 7. FORMAT LABEL HELPER
    # ==========================================================
    #

    helper_anchor = '''function normalizeHealthLabel(value) {'''

    helper_new = '''function formatPerformanceLabel(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\\b\\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


function normalizeHealthLabel(value) {'''

    if (
        "function formatPerformanceLabel"
        not in text
    ):
        if helper_anchor not in text:
            raise RuntimeError(
                "normalizeHealthLabel anchor not found."
            )

        text = text.replace(
            helper_anchor,
            helper_new,
            1
        )

    #
    # ==========================================================
    # 8. STYLES
    # ==========================================================
    #

    if "periodGrid:" not in text:
        marker = "\n});"

        pos = text.rfind(marker)

        if pos == -1:
            raise RuntimeError(
                "Performance StyleSheet closing not found."
            )

        styles = ''',

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },

  observationBadge: {
    backgroundColor: "#164e63",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },

  observationBadgeText: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900"
  },

  periodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },

  periodCard: {
    width: "47%",
    minWidth: 145,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },

  periodLabel: {
    color: "#67e8f9",
    fontWeight: "900",
    marginBottom: 7
  },

  periodChange: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 4
  },

  periodDates: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 7
  },

  periodUnavailable: {
    color: "#64748b",
    fontWeight: "900"
  },

  historyNotice: {
    backgroundColor: "rgba(245,158,11,.08)",
    borderColor: "rgba(245,158,11,.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginTop: 15
  },

  historyNoticeTitle: {
    color: "#fde68a",
    fontWeight: "900"
  },

  historyNoticeText: {
    color: "#fef3c7",
    marginTop: 6,
    lineHeight: 19,
    fontSize: 12
  },

  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 15
  },

  analyticsMetric: {
    width: "47%",
    minWidth: 145,
    backgroundColor: "#020617",
    borderRadius: 13,
    padding: 12
  }'''

        text = (
            text[:pos] +
            styles +
            text[pos:]
        )

    #
    # ==========================================================
    # 9. SAFETY
    # ==========================================================
    #

    required = [
        "buildHistoricalPerformanceSummary",
        "historicalSummary",
        "Historical Performance",
        'label="7D"',
        'label="30D"',
        'label="90D"',
        'label="YTD"',
        'label="1Y"',
        'label="Since First"',
        "Portfolio Drawdown",
        "Portfolio Health Trend",
        "function PeriodCard",
        "periodGrid:"
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Missing PC-030C2C2 elements: {missing}"
        )

    commit(
        PERFORMANCE,
        original,
        text
    )

    print()
    print(
        "PC-030C2C2 applied successfully."
    )

    print()
    print(
        "Performance now exposes:"
    )

    print(
        "  - 7D / 30D / 90D / YTD / 1Y"
    )

    print(
        "  - Since First Snapshot"
    )

    print(
        "  - Current + Maximum Drawdown"
    )

    print(
        "  - Portfolio Health Trend"
    )

    print(
        "  - N/A for unavailable history"
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
