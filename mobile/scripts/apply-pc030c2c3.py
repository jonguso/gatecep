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
        path.suffix + ".pc030c2c3.bak"
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
    # 1. REACT NATIVE WINDOW DIMENSIONS
    # ==========================================================
    #

    old_import = '''  Text,
  View
} from "react-native";'''

    new_import = '''  Text,
  useWindowDimensions,
  View
} from "react-native";'''

    if "useWindowDimensions" not in text:
        if old_import not in text:
            raise RuntimeError(
                "React Native import anchor not found."
            )

        text = text.replace(
            old_import,
            new_import,
            1
        )

    #
    # ==========================================================
    # 2. SVG
    # ==========================================================
    #

    svg_import = '''import Svg, {
  Circle,
  Line,
  Path,
  Text as SvgText
} from "react-native-svg";
'''

    router_anchor = '''import { router } from "expo-router";
'''

    if 'from "react-native-svg"' not in text:
        if router_anchor not in text:
            raise RuntimeError(
                "Expo Router import anchor not found."
            )

        text = text.replace(
            router_anchor,
            router_anchor +
            svg_import,
            1
        )

    #
    # ==========================================================
    # 3. TIMELINE STATE
    # ==========================================================
    #

    state_anchor = '''const [historicalSummary, setHistoricalSummary] = useState(null);'''

    state_new = '''const [historicalSummary, setHistoricalSummary] = useState(null);

  /*
   * PC-030C2C3
   *
   * Timeline defaults to 90D.
   * Net Worth is always visible.
   * Holdings and Cash are optional comparison layers.
   */
  const [timelineRange, setTimelineRange] = useState("90D");
  const [showTimelineHoldings, setShowTimelineHoldings] = useState(false);
  const [showTimelineCash, setShowTimelineCash] = useState(false);

  const { width: windowWidth } = useWindowDimensions();'''

    if "const [timelineRange" not in text:
        if state_anchor not in text:
            raise RuntimeError(
                "Historical summary state anchor not found."
            )

        text = text.replace(
            state_anchor,
            state_new,
            1
        )

    #
    # ==========================================================
    # 4. BUILD SELECTED TIMELINE
    # ==========================================================
    #

    metrics_end = '''  ]);

  if (loading) {'''

    metrics_new = '''  ]);

  const timeline = useMemo(
    () =>
      buildTimelineView(
        historicalSummary,
        timelineRange
      ),
    [
      historicalSummary,
      timelineRange
    ]
  );

  const timelineWidth =
    Math.max(
      280,
      Math.min(
        Number(windowWidth || 360) - 72,
        860
      )
    );

  if (loading) {'''

    if "const timeline = useMemo" not in text:
        if metrics_end not in text:
            raise RuntimeError(
                "Performance metrics ending anchor not found."
            )

        text = text.replace(
            metrics_end,
            metrics_new,
            1
        )

    #
    # ==========================================================
    # 5. PORTFOLIO TIMELINE UI
    #
    # Insert before the existing Historical Performance period
    # cards. PC-030C2C2 remains untouched.
    # ==========================================================
    #

    historical_anchor = '''          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Historical Performance
                </Text>'''

    timeline_ui = '''          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Portfolio Value Timeline
                </Text>

                <Text style={styles.body}>
                  Canonical REAL All Accounts snapshot history.
                  Missing dates are not interpolated.
                </Text>
              </View>

              <View style={styles.observationBadge}>
                <Text style={styles.observationBadgeText}>
                  {timeline?.points?.length || 0} points
                </Text>
              </View>
            </View>

            <View style={styles.timelineRangeRow}>
              {["30D", "90D", "1Y", "ALL"].map(
                (range) => (
                  <Pressable
                    key={range}
                    style={[
                      styles.timelineRangeButton,
                      timelineRange === range &&
                        styles.timelineRangeButtonActive
                    ]}
                    onPress={() =>
                      setTimelineRange(range)
                    }
                  >
                    <Text
                      style={[
                        styles.timelineRangeText,
                        timelineRange === range &&
                          styles.timelineRangeTextActive
                      ]}
                    >
                      {range}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <View style={styles.timelineSeriesRow}>
              <View style={styles.timelinePrimarySeries}>
                <View style={styles.netWorthLegendDot} />

                <Text style={styles.timelineSeriesText}>
                  Net Worth
                </Text>
              </View>

              <Pressable
                style={[
                  styles.timelineSeriesButton,
                  showTimelineHoldings &&
                    styles.timelineSeriesButtonActive
                ]}
                onPress={() =>
                  setShowTimelineHoldings(
                    (value) => !value
                  )
                }
              >
                <View style={styles.holdingsLegendDot} />

                <Text style={styles.timelineSeriesText}>
                  Holdings
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.timelineSeriesButton,
                  showTimelineCash &&
                    styles.timelineSeriesButtonActive
                ]}
                onPress={() =>
                  setShowTimelineCash(
                    (value) => !value
                  )
                }
              >
                <View style={styles.cashLegendDot} />

                <Text style={styles.timelineSeriesText}>
                  Cash
                </Text>
              </Pressable>
            </View>

            {timeline?.points?.length >= 2 ? (
              <>
                <PortfolioTimelineChart
                  width={timelineWidth}
                  height={250}
                  points={timeline.points}
                  showHoldings={showTimelineHoldings}
                  showCash={showTimelineCash}
                />

                <View style={styles.analyticsGrid}>
                  <AnalyticsMetric
                    label="Start Net Worth"
                    value={`KES ${money(
                      timeline.startNetWorth
                    )}`}
                  />

                  <AnalyticsMetric
                    label="Current Net Worth"
                    value={`KES ${money(
                      timeline.endNetWorth
                    )}`}
                  />

                  <AnalyticsMetric
                    label="Change"
                    value={
                      timeline.change !== null
                        ? `${timeline.change >= 0
                            ? "+"
                            : ""}KES ${money(
                            timeline.change
                          )}`
                        : "N/A"
                    }
                  />

                  <AnalyticsMetric
                    label="Return"
                    value={
                      timeline.returnPercentage !== null
                        ? `${timeline.returnPercentage >= 0
                            ? "+"
                            : ""}${Number(
                            timeline.returnPercentage
                          ).toFixed(2)}%`
                        : "N/A"
                    }
                  />

                  <AnalyticsMetric
                    label="First Observation"
                    value={
                      timeline.startDate ||
                      "N/A"
                    }
                  />

                  <AnalyticsMetric
                    label="Latest Observation"
                    value={
                      timeline.endDate ||
                      "N/A"
                    }
                  />
                </View>

                {!timeline.fullCoverage ? (
                  <View style={styles.timelineCoverageNotice}>
                    <Text style={styles.timelineCoverageTitle}>
                      Partial Range Coverage
                    </Text>

                    <Text style={styles.timelineCoverageText}>
                      GateCEP is showing genuine observations
                      available inside this range. It will not
                      create synthetic dates or interpolate a
                      missing historical baseline.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.timelineEmpty}>
                <Text style={styles.timelineEmptyTitle}>
                  Building Timeline History
                </Text>

                <Text style={styles.timelineEmptyText}>
                  At least two genuine portfolio snapshot dates
                  are required to draw a performance timeline.
                  GateCEP will preserve N/A until enough real
                  history exists.
                </Text>
              </View>
            )}
          </View>

''' + historical_anchor

    if "Portfolio Value Timeline" not in text:
        if historical_anchor not in text:
            raise RuntimeError(
                "Historical Performance UI anchor not found."
            )

        text = text.replace(
            historical_anchor,
            timeline_ui,
            1
        )

    #
    # ==========================================================
    # 6. TIMELINE COMPONENTS
    # ==========================================================
    #

    component_anchor = '''function PeriodCard({
  label,
  period
}) {'''

    components = r'''function PortfolioTimelineChart({
  width,
  height,
  points,
  showHoldings,
  showCash
}) {
  const safePoints =
    Array.isArray(points)
      ? points.filter(
          (point) =>
            point &&
            Number.isFinite(
              Number(point.netWorth)
            )
        )
      : [];

  if (safePoints.length < 2) {
    return null;
  }

  const padding = {
    top: 24,
    right: 18,
    bottom: 38,
    left: 64
  };

  const chartWidth =
    Math.max(
      width -
      padding.left -
      padding.right,
      1
    );

  const chartHeight =
    Math.max(
      height -
      padding.top -
      padding.bottom,
      1
    );

  const valueCandidates = [];

  safePoints.forEach((point) => {
    valueCandidates.push(
      Number(point.netWorth)
    );

    if (
      showHoldings &&
      Number.isFinite(
        Number(point.holdingsValue)
      )
    ) {
      valueCandidates.push(
        Number(point.holdingsValue)
      );
    }

    if (
      showCash &&
      Number.isFinite(
        Number(point.availableCash)
      )
    ) {
      valueCandidates.push(
        Number(point.availableCash)
      );
    }
  });

  let minimum =
    Math.min(
      ...valueCandidates
    );

  let maximum =
    Math.max(
      ...valueCandidates
    );

  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum)
  ) {
    return null;
  }

  if (minimum === maximum) {
    const buffer =
      Math.max(
        Math.abs(minimum) * 0.02,
        1
      );

    minimum -= buffer;
    maximum += buffer;
  }

  const range =
    maximum -
    minimum;

  const xForIndex = (index) =>
    padding.left +
    (
      index /
      Math.max(
        safePoints.length - 1,
        1
      )
    ) *
    chartWidth;

  const yForValue = (value) =>
    padding.top +
    (
      1 -
      (
        Number(value) -
        minimum
      ) /
      range
    ) *
    chartHeight;

  const pathFor = (field) => {
    const valid =
      safePoints
        .map(
          (point, index) => ({
            index,
            value:
              Number(
                point?.[field]
              )
          })
        )
        .filter(
          (item) =>
            Number.isFinite(
              item.value
            )
        );

    if (valid.length < 2) {
      return null;
    }

    return valid
      .map(
        (item, position) =>
          `${position === 0 ? "M" : "L"} ` +
          `${xForIndex(item.index)} ` +
          `${yForValue(item.value)}`
      )
      .join(" ");
  };

  const netWorthPath =
    pathFor("netWorth");

  const holdingsPath =
    showHoldings
      ? pathFor("holdingsValue")
      : null;

  const cashPath =
    showCash
      ? pathFor("availableCash")
      : null;

  const gridValues =
    [0, 0.25, 0.5, 0.75, 1]
      .map(
        (ratio) =>
          maximum -
          range * ratio
      );

  const first =
    safePoints[0];

  const last =
    safePoints[
      safePoints.length - 1
    ];

  return (
    <View style={styles.timelineChartContainer}>
      <Svg
        width={width}
        height={height}
      >
        {gridValues.map(
          (value, index) => {
            const y =
              yForValue(value);

            return (
              <React.Fragment
                key={`grid-${index}`}
              >
                <Line
                  x1={padding.left}
                  x2={
                    width -
                    padding.right
                  }
                  y1={y}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />

                <SvgText
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="end"
                >
                  {compactMoney(value)}
                </SvgText>
              </React.Fragment>
            );
          }
        )}

        {holdingsPath ? (
          <Path
            d={holdingsPath}
            fill="none"
            stroke="#c084fc"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {cashPath ? (
          <Path
            d={cashPath}
            fill="none"
            stroke="#86efac"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {netWorthPath ? (
          <Path
            d={netWorthPath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {safePoints.map(
          (point, index) => (
            <Circle
              key={`net-worth-${point.date}-${index}`}
              cx={xForIndex(index)}
              cy={yForValue(
                point.netWorth
              )}
              r="3.5"
              fill="#22d3ee"
            />
          )
        )}

        <SvgText
          x={padding.left}
          y={height - 12}
          fill="#64748b"
          fontSize="9"
          textAnchor="start"
        >
          {formatTimelineDate(
            first?.date
          )}
        </SvgText>

        <SvgText
          x={
            width -
            padding.right
          }
          y={height - 12}
          fill="#64748b"
          fontSize="9"
          textAnchor="end"
        >
          {formatTimelineDate(
            last?.date
          )}
        </SvgText>
      </Svg>
    </View>
  );
}


function buildTimelineView(
  historicalSummary,
  range
) {
  const history =
    Array.isArray(
      historicalSummary?.history
    )
      ? historicalSummary.history
      : [];

  const normalized =
    history
      .map(
        (snapshot) => ({
          date:
            snapshot?.date ??
            null,

          timestamp:
            timelineTimestamp(
              snapshot?.date
            ),

          netWorth:
            finiteTimelineNumber(
              snapshot?.netWorth ??
              snapshot?.totalValue
            ),

          holdingsValue:
            finiteTimelineNumber(
              snapshot?.holdingsValue ??
              snapshot?.currentValue
            ),

          availableCash:
            finiteTimelineNumber(
              snapshot?.availableCash ??
              snapshot?.cash
            )
        })
      )
      .filter(
        (point) =>
          point.date &&
          point.timestamp !== null &&
          point.netWorth !== null
      )
      .sort(
        (a, b) =>
          a.timestamp -
          b.timestamp
      );

  if (!normalized.length) {
    return {
      range,
      points: [],
      startDate: null,
      endDate: null,
      startNetWorth: null,
      endNetWorth: null,
      change: null,
      returnPercentage: null,
      fullCoverage: false
    };
  }

  const latest =
    normalized[
      normalized.length - 1
    ];

  const days =
    range === "30D"
      ? 30
      : range === "90D"
        ? 90
        : range === "1Y"
          ? 365
          : null;

  let points =
    normalized;

  let requestedBoundary =
    null;

  if (days !== null) {
    requestedBoundary =
      latest.timestamp -
      days * 86400000;

    points =
      normalized.filter(
        (point) =>
          point.timestamp >=
          requestedBoundary
      );

    /*
     * Include the last genuine observation immediately before
     * the boundary when one exists.
     *
     * This gives the chart historical continuity without
     * inventing a boundary value.
     */
    const beforeBoundary =
      [...normalized]
        .reverse()
        .find(
          (point) =>
            point.timestamp <
            requestedBoundary
        );

    if (beforeBoundary) {
      points = [
        beforeBoundary,
        ...points
      ];
    }
  }

  const start =
    points[0] ||
    null;

  const end =
    points[
      points.length - 1
    ] ||
    null;

  const startValue =
    start?.netWorth ??
    null;

  const endValue =
    end?.netWorth ??
    null;

  const change =
    startValue !== null &&
    endValue !== null &&
    points.length >= 2
      ? endValue -
        startValue
      : null;

  const returnPercentage =
    change !== null &&
    startValue !== null &&
    startValue > 0
      ? (
          change /
          startValue
        ) * 100
      : null;

  let fullCoverage =
    false;

  if (range === "ALL") {
    fullCoverage =
      points.length >= 2;
  } else if (
    requestedBoundary !== null
  ) {
    fullCoverage =
      normalized.some(
        (point) =>
          point.timestamp <=
          requestedBoundary
      );
  }

  return {
    range,

    points,

    startDate:
      start?.date ??
      null,

    endDate:
      end?.date ??
      null,

    startNetWorth:
      startValue,

    endNetWorth:
      endValue,

    change,

    returnPercentage,

    fullCoverage
  };
}


function finiteTimelineNumber(value) {
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


function timelineTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value)
      .getTime();

  return Number.isFinite(parsed)
    ? parsed
    : null;
}


function compactMoney(value) {
  const number =
    Number(value || 0);

  const absolute =
    Math.abs(number);

  if (absolute >= 1000000000) {
    return `${(
      number /
      1000000000
    ).toFixed(1)}B`;
  }

  if (absolute >= 1000000) {
    return `${(
      number /
      1000000
    ).toFixed(1)}M`;
  }

  if (absolute >= 1000) {
    return `${(
      number /
      1000
    ).toFixed(0)}K`;
  }

  return number.toFixed(0);
}


function formatTimelineDate(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric"
    }
  );
}


function PeriodCard({
  label,
  period
}) {'''

    if "function PortfolioTimelineChart" not in text:
        if component_anchor not in text:
            raise RuntimeError(
                "PeriodCard component anchor not found."
            )

        text = text.replace(
            component_anchor,
            components,
            1
        )

    #
    # ==========================================================
    # 7. TIMELINE STYLES
    # ==========================================================
    #

    if "timelineRangeRow:" not in text:
        marker = "\n});"

        pos = text.rfind(marker)

        if pos == -1:
            raise RuntimeError(
                "Performance StyleSheet closing not found."
            )

        styles = ''',

  timelineRangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16
  },

  timelineRangeButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9
  },

  timelineRangeButtonActive: {
    backgroundColor: "#0891b2",
    borderColor: "#22d3ee"
  },

  timelineRangeText: {
    color: "#94a3b8",
    fontWeight: "900",
    fontSize: 12
  },

  timelineRangeTextActive: {
    color: "white"
  },

  timelineSeriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 9,
    marginTop: 13,
    marginBottom: 4
  },

  timelinePrimarySeries: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0c4a6e",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7
  },

  timelineSeriesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7
  },

  timelineSeriesButtonActive: {
    borderColor: "#67e8f9"
  },

  timelineSeriesText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "800"
  },

  netWorthLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22d3ee"
  },

  holdingsLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c084fc"
  },

  cashLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#86efac"
  },

  timelineChartContainer: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    overflow: "hidden",
    alignItems: "center"
  },

  timelineCoverageNotice: {
    backgroundColor: "rgba(59,130,246,.08)",
    borderColor: "rgba(59,130,246,.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginTop: 14
  },

  timelineCoverageTitle: {
    color: "#93c5fd",
    fontWeight: "900"
  },

  timelineCoverageText: {
    color: "#bfdbfe",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6
  },

  timelineEmpty: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    marginTop: 16
  },

  timelineEmptyTitle: {
    color: "#fde68a",
    fontWeight: "900"
  },

  timelineEmptyText: {
    color: "#94a3b8",
    lineHeight: 20,
    marginTop: 7
  }'''

        text = (
            text[:pos] +
            styles +
            text[pos:]
        )

    #
    # ==========================================================
    # 8. FINAL SAFETY
    # ==========================================================
    #

    required = [
        'from "react-native-svg"',
        "useWindowDimensions",
        "timelineRange",
        "Portfolio Value Timeline",
        '"30D"',
        '"90D"',
        '"1Y"',
        '"ALL"',
        "function PortfolioTimelineChart",
        "function buildTimelineView",
        "function finiteTimelineNumber",
        "timelineRangeRow:",
        "timelineChartContainer:",
        "Missing dates are not interpolated"
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Missing PC-030C2C3 elements: {missing}"
        )

    commit(
        PERFORMANCE,
        original,
        text
    )

    print()
    print(
        "PC-030C2C3 applied successfully."
    )

    print()
    print(
        "Portfolio timeline capabilities:"
    )

    print(
        "  - Net Worth timeline"
    )

    print(
        "  - 30D / 90D / 1Y / ALL"
    )

    print(
        "  - Optional Holdings overlay"
    )

    print(
        "  - Optional Cash overlay"
    )

    print(
        "  - Start / current / change / return"
    )

    print(
        "  - No interpolation"
    )

    print(
        "  - No synthetic observations"
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
