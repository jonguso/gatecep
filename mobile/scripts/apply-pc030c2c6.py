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

SUMMARY = (
    SRC /
    "features" /
    "performance" /
    "historicalPerformanceSummaryService.js"
)

PERFORMANCE = APP / "performance.js"


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2c6.bak"
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

    #
    # ==========================================================
    # 1. HISTORICAL PERFORMANCE RECORD ENGINE
    # ==========================================================
    #

    original = SUMMARY.read_text(
        encoding="utf-8"
    )

    text = original

    records_anchor = '''/*
 * ============================================================
 * MAIN CONTRACT
 * ============================================================
 */'''

    records_block = '''/*
 * ============================================================
 * PC-030C2C6
 * PERFORMANCE RECORDS + MILESTONES
 * ============================================================
 *
 * Records are derived only from genuine normalized snapshot
 * observations already accepted into historical performance.
 *
 * No synthetic dates.
 * No interpolated values.
 * No zero return substitution when history is missing.
 * ============================================================
 */

const PERFORMANCE_MILESTONES = [
  100000,
  250000,
  500000,
  1000000,
  2500000,
  5000000,
  10000000
];


function buildPerformanceRecords(
  history = []
) {
  const observations =
    Array.isArray(history)
      ? history
          .map(
            (snapshot) => ({
              date:
                snapshot?.date ??
                null,

              netWorth:
                snapshotNetWorth(
                  snapshot
                ),

              healthScore:
                snapshotHealth(
                  snapshot
                )
            })
          )
          .filter(
            (item) =>
              item.date &&
              item.netWorth !== null &&
              item.netWorth >= 0
          )
      : [];

  if (!observations.length) {
    return {
      available:
        false,

      observationCount:
        0,

      highestNetWorth:
        null,

      lowestNetWorth:
        null,

      bestSnapshotChange:
        null,

      worstSnapshotChange:
        null,

      bestHealthImprovement:
        null,

      worstHealthDecline:
        null,

      milestones:
        PERFORMANCE_MILESTONES.map(
          (threshold) => ({
            threshold,
            achieved:
              false,

            date:
              null,

            recordedNetWorth:
              null
          })
        )
    };
  }

  let highest =
    observations[0];

  let lowest =
    observations[0];

  for (
    const observation of
    observations
  ) {
    if (
      observation.netWorth >
      highest.netWorth
    ) {
      highest =
        observation;
    }

    if (
      observation.netWorth <
      lowest.netWorth
    ) {
      lowest =
        observation;
    }
  }

  let bestSnapshotChange =
    null;

  let worstSnapshotChange =
    null;

  let bestHealthImprovement =
    null;

  let worstHealthDecline =
    null;

  for (
    let index = 1;
    index < observations.length;
    index += 1
  ) {
    const previous =
      observations[
        index - 1
      ];

    const current =
      observations[
        index
      ];

    if (
      previous.netWorth !== null &&
      previous.netWorth > 0 &&
      current.netWorth !== null
    ) {
      const change =
        current.netWorth -
        previous.netWorth;

      const changePercentage =
        (
          change /
          previous.netWorth
        ) * 100;

      const movement = {
        fromDate:
          previous.date,

        toDate:
          current.date,

        startNetWorth:
          roundMoney(
            previous.netWorth
          ),

        endNetWorth:
          roundMoney(
            current.netWorth
          ),

        change:
          roundMoney(
            change
          ),

        changePercentage:
          roundPercent(
            changePercentage
          )
      };

      if (
        !bestSnapshotChange ||
        changePercentage >
        bestSnapshotChange
          .changePercentage
      ) {
        bestSnapshotChange =
          movement;
      }

      if (
        !worstSnapshotChange ||
        changePercentage <
        worstSnapshotChange
          .changePercentage
      ) {
        worstSnapshotChange =
          movement;
      }
    }

    if (
      previous.healthScore !== null &&
      current.healthScore !== null
    ) {
      const healthChange =
        current.healthScore -
        previous.healthScore;

      const healthMovement = {
        fromDate:
          previous.date,

        toDate:
          current.date,

        startScore:
          previous.healthScore,

        endScore:
          current.healthScore,

        change:
          roundPercent(
            healthChange
          )
      };

      if (
        healthChange > 0 &&
        (
          !bestHealthImprovement ||
          healthChange >
          bestHealthImprovement.change
        )
      ) {
        bestHealthImprovement =
          healthMovement;
      }

      if (
        healthChange < 0 &&
        (
          !worstHealthDecline ||
          healthChange <
          worstHealthDecline.change
        )
      ) {
        worstHealthDecline =
          healthMovement;
      }
    }
  }

  const milestones =
    PERFORMANCE_MILESTONES.map(
      (threshold) => {
        const achieved =
          observations.find(
            (observation) =>
              observation.netWorth >=
              threshold
          ) ||
          null;

        return {
          threshold,

          achieved:
            Boolean(
              achieved
            ),

          date:
            achieved?.date ??
            null,

          recordedNetWorth:
            achieved
              ? roundMoney(
                  achieved.netWorth
                )
              : null
        };
      }
    );

  return {
    available:
      true,

    observationCount:
      observations.length,

    highestNetWorth: {
      value:
        roundMoney(
          highest.netWorth
        ),

      date:
        highest.date
    },

    lowestNetWorth: {
      value:
        roundMoney(
          lowest.netWorth
        ),

      date:
        lowest.date
    },

    /*
     * Snapshot-to-snapshot records require at least two
     * genuine observations.
     */
    bestSnapshotChange:
      observations.length >= 2
        ? bestSnapshotChange
        : null,

    worstSnapshotChange:
      observations.length >= 2
        ? worstSnapshotChange
        : null,

    bestHealthImprovement:
      observations.length >= 2
        ? bestHealthImprovement
        : null,

    worstHealthDecline:
      observations.length >= 2
        ? worstHealthDecline
        : null,

    milestones
  };
}


''' + records_anchor

    if (
        "function buildPerformanceRecords"
        not in text
    ):
        if records_anchor not in text:
            raise RuntimeError(
                "Historical summary MAIN CONTRACT "
                "anchor not found."
            )

        text = text.replace(
            records_anchor,
            records_block,
            1
        )

    #
    # ==========================================================
    # 2. NO-HISTORY CONTRACT
    # ==========================================================
    #

    old = '''      drawdown:
        buildDrawdownSummary([]),

      healthTrend:
        buildHealthTrend([])
    };'''

    new = '''      records:
        buildPerformanceRecords([]),

      drawdown:
        buildDrawdownSummary([]),

      healthTrend:
        buildHealthTrend([])
    };'''

    if (
        "records:\n        buildPerformanceRecords([])"
        not in text
    ):
        if old not in text:
            raise RuntimeError(
                "No-history return anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 3. READY CONTRACT
    #
    # Add records to the FINAL result only.
    # ==========================================================
    #

    if (
        "const performanceRecords ="
        not in text
    ):
        final_return = text.rfind(
            """  return {
    status:"""
        )

        if final_return == -1:
            raise RuntimeError(
                "Final historical summary return "
                "not found."
            )

        text = (
            text[:final_return]
            +
            """  const performanceRecords =
    buildPerformanceRecords(
      history
    );

"""
            +
            text[final_return:]
        )

    final_return = text.rfind(
        """  return {
    status:"""
    )

    if final_return == -1:
        raise RuntimeError(
            "Final return not found after "
            "records insertion."
        )

    tail = text[
        final_return:
    ]

    if (
        "\n    records:\n      performanceRecords,"
        not in tail
    ):
        current_anchor = """    current: {"""

        position = tail.find(
            current_anchor
        )

        if position == -1:
            raise RuntimeError(
                "Final current portfolio anchor "
                "not found."
            )

        tail = (
            tail[:position]
            +
            """    records:
      performanceRecords,

"""
            +
            tail[position:]
        )

        text = (
            text[:final_return]
            +
            tail
        )

    #
    # ==========================================================
    # WRITE HISTORICAL SUMMARY CONTRACT
    # ==========================================================
    #

    commit(
        SUMMARY,
        original,
        text
    )

    #
    # ==========================================================
    # 4. PERFORMANCE RECORDS UI
    #
    # Insert between Historical Performance and Drawdown.
    # ==========================================================
    #

    original = PERFORMANCE.read_text(
        encoding="utf-8"
    )

    text = original

    drawdown_anchor = '''          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Portfolio Drawdown
            </Text>'''

    records_ui = '''          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Performance Records
                </Text>

                <Text style={styles.body}>
                  Record highs, lows, snapshot moves, health changes,
                  and portfolio milestones from genuine stored observations.
                </Text>
              </View>

              <View style={styles.observationBadge}>
                <Text style={styles.observationBadgeText}>
                  {historicalSummary?.records?.observationCount || 0} records
                </Text>
              </View>
            </View>

            <View style={styles.performanceRecordGrid}>
              <PerformanceRecordMetric
                label="Record High Net Worth"
                value={
                  historicalSummary
                    ?.records
                    ?.highestNetWorth
                    ?.value !== null &&
                  historicalSummary
                    ?.records
                    ?.highestNetWorth
                    ?.value !== undefined
                    ? `KES ${money(
                        historicalSummary
                          .records
                          .highestNetWorth
                          .value
                      )}`
                    : "N/A"
                }
                detail={
                  historicalSummary
                    ?.records
                    ?.highestNetWorth
                    ?.date ||
                  "No observation"
                }
              />

              <PerformanceRecordMetric
                label="Record Low Net Worth"
                value={
                  historicalSummary
                    ?.records
                    ?.lowestNetWorth
                    ?.value !== null &&
                  historicalSummary
                    ?.records
                    ?.lowestNetWorth
                    ?.value !== undefined
                    ? `KES ${money(
                        historicalSummary
                          .records
                          .lowestNetWorth
                          .value
                      )}`
                    : "N/A"
                }
                detail={
                  historicalSummary
                    ?.records
                    ?.lowestNetWorth
                    ?.date ||
                  "No observation"
                }
              />

              <PerformanceRecordMetric
                label="Best Snapshot Move"
                value={
                  historicalSummary
                    ?.records
                    ?.bestSnapshotChange
                    ?.changePercentage !== null &&
                  historicalSummary
                    ?.records
                    ?.bestSnapshotChange
                    ?.changePercentage !== undefined
                    ? `${Number(
                        historicalSummary
                          .records
                          .bestSnapshotChange
                          .changePercentage
                      ) >= 0
                        ? "+"
                        : ""}${Number(
                        historicalSummary
                          .records
                          .bestSnapshotChange
                          .changePercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
                detail={
                  historicalSummary
                    ?.records
                    ?.bestSnapshotChange
                    ? `${historicalSummary.records.bestSnapshotChange.fromDate} → ${historicalSummary.records.bestSnapshotChange.toDate}`
                    : "Insufficient history"
                }
                positive={
                  historicalSummary
                    ?.records
                    ?.bestSnapshotChange
                    ? true
                    : undefined
                }
              />

              <PerformanceRecordMetric
                label="Worst Snapshot Move"
                value={
                  historicalSummary
                    ?.records
                    ?.worstSnapshotChange
                    ?.changePercentage !== null &&
                  historicalSummary
                    ?.records
                    ?.worstSnapshotChange
                    ?.changePercentage !== undefined
                    ? `${Number(
                        historicalSummary
                          .records
                          .worstSnapshotChange
                          .changePercentage
                      ) >= 0
                        ? "+"
                        : ""}${Number(
                        historicalSummary
                          .records
                          .worstSnapshotChange
                          .changePercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
                detail={
                  historicalSummary
                    ?.records
                    ?.worstSnapshotChange
                    ? `${historicalSummary.records.worstSnapshotChange.fromDate} → ${historicalSummary.records.worstSnapshotChange.toDate}`
                    : "Insufficient history"
                }
                positive={
                  historicalSummary
                    ?.records
                    ?.worstSnapshotChange
                    ? Number(
                        historicalSummary
                          .records
                          .worstSnapshotChange
                          .changePercentage
                      ) >= 0
                    : undefined
                }
              />

              <PerformanceRecordMetric
                label="Best Health Improvement"
                value={
                  historicalSummary
                    ?.records
                    ?.bestHealthImprovement
                    ?.change !== null &&
                  historicalSummary
                    ?.records
                    ?.bestHealthImprovement
                    ?.change !== undefined
                    ? `+${Number(
                        historicalSummary
                          .records
                          .bestHealthImprovement
                          .change
                      ).toFixed(0)} points`
                    : "N/A"
                }
                detail={
                  historicalSummary
                    ?.records
                    ?.bestHealthImprovement
                    ? `${historicalSummary.records.bestHealthImprovement.fromDate} → ${historicalSummary.records.bestHealthImprovement.toDate}`
                    : "Insufficient health history"
                }
                positive={
                  historicalSummary
                    ?.records
                    ?.bestHealthImprovement
                    ? true
                    : undefined
                }
              />

              <PerformanceRecordMetric
                label="Largest Health Decline"
                value={
                  historicalSummary
                    ?.records
                    ?.worstHealthDecline
                    ?.change !== null &&
                  historicalSummary
                    ?.records
                    ?.worstHealthDecline
                    ?.change !== undefined
                    ? `${Number(
                        historicalSummary
                          .records
                          .worstHealthDecline
                          .change
                      ).toFixed(0)} points`
                    : "N/A"
                }
                detail={
                  historicalSummary
                    ?.records
                    ?.worstHealthDecline
                    ? `${historicalSummary.records.worstHealthDecline.fromDate} → ${historicalSummary.records.worstHealthDecline.toDate}`
                    : "Insufficient health history"
                }
                positive={
                  historicalSummary
                    ?.records
                    ?.worstHealthDecline
                    ? false
                    : undefined
                }
              />
            </View>

            <View style={styles.milestoneSection}>
              <Text style={styles.performanceRecordSectionTitle}>
                Portfolio Milestones
              </Text>

              <Text style={styles.performanceRecordSectionText}>
                First recorded date that Net Worth reached each threshold.
              </Text>

              {Array.isArray(
                historicalSummary
                  ?.records
                  ?.milestones
              ) ? (
                historicalSummary.records.milestones.map(
                  (milestone) => (
                    <View
                      key={`milestone-${milestone.threshold}`}
                      style={styles.milestoneRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.milestoneValue}>
                          KES {money(
                            milestone.threshold
                          )}
                        </Text>

                        <Text style={styles.milestoneMeta}>
                          {milestone.achieved
                            ? `First recorded ${milestone.date}`
                            : "Not yet recorded"}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.milestoneBadge,
                          milestone.achieved
                            ? styles.milestoneBadgeAchieved
                            : null
                        ]}
                      >
                        <Text
                          style={[
                            styles.milestoneBadgeText,
                            milestone.achieved
                              ? styles.milestoneBadgeTextAchieved
                              : null
                          ]}
                        >
                          {milestone.achieved
                            ? "ACHIEVED"
                            : "PENDING"}
                        </Text>
                      </View>
                    </View>
                  )
                )
              ) : (
                <Text style={styles.performanceRecordUnavailable}>
                  N/A — No portfolio history available.
                </Text>
              )}
            </View>

            {historicalSummary?.records?.observationCount < 2 ? (
              <View style={styles.performanceRecordNotice}>
                <Text style={styles.performanceRecordNoticeTitle}>
                  Building Performance Records
                </Text>

                <Text style={styles.performanceRecordNoticeText}>
                  Snapshot movement and health-change records require
                  at least two genuine portfolio observations. GateCEP
                  will preserve N/A until real history exists.
                </Text>
              </View>
            ) : null}
          </View>

''' + drawdown_anchor

    if (
        "Performance Records"
        not in text
    ):
        if drawdown_anchor not in text:
            raise RuntimeError(
                "Portfolio Drawdown UI anchor "
                "not found."
            )

        text = text.replace(
            drawdown_anchor,
            records_ui,
            1
        )

    #
    # ==========================================================
    # 5. RECORD METRIC COMPONENT
    # ==========================================================
    #

    component_anchor = '''function AnalyticsMetric({'''

    component = '''function PerformanceRecordMetric({
  label,
  value,
  detail,
  positive
}) {
  let valueStyle =
    styles.performanceRecordValue;

  if (positive === true) {
    valueStyle =
      styles.green;
  }

  if (positive === false) {
    valueStyle =
      styles.red;
  }

  return (
    <View style={styles.performanceRecordMetric}>
      <Text style={styles.performanceRecordLabel}>
        {label}
      </Text>

      <Text style={valueStyle}>
        {value}
      </Text>

      <Text style={styles.performanceRecordDetail}>
        {detail}
      </Text>
    </View>
  );
}


function AnalyticsMetric({'''

    if (
        "function PerformanceRecordMetric"
        not in text
    ):
        if component_anchor not in text:
            raise RuntimeError(
                "AnalyticsMetric component anchor "
                "not found."
            )

        text = text.replace(
            component_anchor,
            component,
            1
        )

    #
    # ==========================================================
    # 6. RECORD STYLES
    # ==========================================================
    #

    if (
        "performanceRecordGrid:"
        not in text
    ):
        marker = "\n});"

        pos = text.rfind(
            marker
        )

        if pos == -1:
            raise RuntimeError(
                "Performance StyleSheet closing "
                "not found."
            )

        styles = ''',

  performanceRecordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },

  performanceRecordMetric: {
    width: "47%",
    minWidth: 145,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },

  performanceRecordLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  performanceRecordValue: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 7
  },

  performanceRecordDetail: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 6,
    lineHeight: 15
  },

  milestoneSection: {
    marginTop: 18,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 15,
    padding: 14
  },

  performanceRecordSectionTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 15
  },

  performanceRecordSectionText: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 5,
    lineHeight: 17
  },

  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopColor: "#1e293b",
    borderTopWidth: 1,
    paddingVertical: 12
  },

  milestoneValue: {
    color: "#f8fafc",
    fontWeight: "900"
  },

  milestoneMeta: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 4
  },

  milestoneBadge: {
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5
  },

  milestoneBadgeAchieved: {
    backgroundColor: "rgba(34,197,94,.14)"
  },

  milestoneBadgeText: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "900"
  },

  milestoneBadgeTextAchieved: {
    color: "#86efac"
  },

  performanceRecordUnavailable: {
    color: "#64748b",
    marginTop: 12,
    fontSize: 11
  },

  performanceRecordNotice: {
    marginTop: 15,
    backgroundColor: "rgba(59,130,246,.08)",
    borderColor: "rgba(59,130,246,.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },

  performanceRecordNoticeTitle: {
    color: "#93c5fd",
    fontWeight: "900"
  },

  performanceRecordNoticeText: {
    color: "#bfdbfe",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6
  }'''

        text = (
            text[:pos] +
            styles +
            text[pos:]
        )

    #
    # ==========================================================
    # 7. SAFETY
    # ==========================================================
    #

    required_summary = [
        "function buildPerformanceRecords",
        "PERFORMANCE_MILESTONES",
        "highestNetWorth",
        "lowestNetWorth",
        "bestSnapshotChange",
        "worstSnapshotChange",
        "bestHealthImprovement",
        "worstHealthDecline",
        "performanceRecords"
    ]

    for item in required_summary:
        if item not in SUMMARY.read_text(
            encoding="utf-8"
        ):
            raise RuntimeError(
                f"Missing summary contract: {item}"
            )

    required_ui = [
        "Performance Records",
        "Record High Net Worth",
        "Record Low Net Worth",
        "Best Snapshot Move",
        "Worst Snapshot Move",
        "Best Health Improvement",
        "Largest Health Decline",
        "Portfolio Milestones",
        "function PerformanceRecordMetric",
        "performanceRecordGrid:"
    ]

    missing_ui = [
        item
        for item in required_ui
        if item not in text
    ]

    if missing_ui:
        raise RuntimeError(
            f"Missing Performance Records UI: "
            f"{missing_ui}"
        )

    #
    # Preserve C5A timeline invariants.
    #

    c5_required = [
        "TimelineSelectedSnapshotSummary",
        "TimelineSnapshotInspector",
        "net-worth-hit-",
        'r="22"',
        'r="10"',
        "safePoints.length < 2",
        "Building Timeline History",
        "Missing dates are not interpolated"
    ]

    c5_missing = [
        item
        for item in c5_required
        if item not in text
    ]

    if c5_missing:
        raise RuntimeError(
            f"C5A timeline contract damaged: "
            f"{c5_missing}"
        )

    commit(
        PERFORMANCE,
        original,
        text
    )

    print()
    print(
        "PC-030C2C6 applied successfully."
    )

    print()
    print(
        "Performance Records now includes:"
    )

    print(
        "  - Record high / low Net Worth"
    )

    print(
        "  - Best / worst snapshot movement"
    )

    print(
        "  - Largest health improvement / decline"
    )

    print(
        "  - First recorded Net Worth milestones"
    )

    print(
        "  - N/A safeguards for insufficient history"
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
