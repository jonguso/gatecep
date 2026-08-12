from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
FILE = APP / "performance.js"

ARCHIVE = (
    ROOT /
    "archive" /
    "expo-router-nonroutes" /
    "bak"
)


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2c4b.bak"
    )
    shutil.copy2(path, b)
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
    original = FILE.read_text(
        encoding="utf-8"
    )

    text = original

    #
    # ==========================================================
    # 1. SELECTED TIMELINE POINT STATE
    # ==========================================================
    #

    anchor = '''const [showTimelineCash, setShowTimelineCash] = useState(false);'''

    replacement = '''const [showTimelineCash, setShowTimelineCash] = useState(false);
  const [selectedTimelinePoint, setSelectedTimelinePoint] = useState(null);'''

    if "selectedTimelinePoint" not in text:
        if anchor not in text:
            raise RuntimeError(
                "Timeline state anchor not found."
            )

        text = text.replace(
            anchor,
            replacement,
            1
        )

    #
    # ==========================================================
    # 2. CLEAR SELECTED POINT WHEN RANGE CHANGES
    # ==========================================================
    #

    old = '''onPress={() =>
                      setTimelineRange(range)
                    }'''

    new = '''onPress={() => {
                      setTimelineRange(range);
                      setSelectedTimelinePoint(null);
                    }}'''

    if (
        "setTimelineRange(range);\n"
        "                      setSelectedTimelinePoint(null);"
        not in text
    ):
        if old not in text:
            raise RuntimeError(
                "Timeline range handler anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 3. TIMELINE CHART CALL
    # ==========================================================
    #

    old = '''                  showHoldings={showTimelineHoldings}
                  showCash={showTimelineCash}
                />'''

    new = '''                  showHoldings={showTimelineHoldings}
                  showCash={showTimelineCash}
                  selectedPoint={selectedTimelinePoint}
                  onSelectPoint={setSelectedTimelinePoint}
                />

                <Text style={styles.timelineInspectHint}>
                  Select a genuine observation point to inspect its portfolio snapshot.
                </Text>

                {selectedTimelinePoint ? (
                  <TimelineSnapshotInspector
                    point={selectedTimelinePoint}
                    onClose={() =>
                      setSelectedTimelinePoint(null)
                    }
                  />
                ) : null}'''

    if (
        "onSelectPoint={setSelectedTimelinePoint}"
        not in text
    ):
        if old not in text:
            raise RuntimeError(
                "Timeline chart call anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 4. SINGLE-OBSERVATION INSPECTION
    #
    # Chart remains unavailable with only one observation.
    # We simply allow the genuine stored snapshot to be inspected.
    # ==========================================================
    #

    old = '''                <Text style={styles.timelineEmptyText}>
                  At least two genuine portfolio snapshot dates
                  are required to draw a performance timeline.
                  GateCEP will preserve N/A until enough real
                  history exists.
                </Text>'''

    new = '''                <Text style={styles.timelineEmptyText}>
                  At least two genuine portfolio snapshot dates
                  are required to draw a performance timeline.
                  GateCEP will preserve N/A until enough real
                  history exists.
                </Text>

                {timeline?.points?.length === 1 ? (
                  <>
                    <Pressable
                      style={styles.inspectSnapshotButton}
                      onPress={() =>
                        setSelectedTimelinePoint(
                          timeline.points[0]
                        )
                      }
                    >
                      <Text style={styles.inspectSnapshotButtonText}>
                        Inspect Current Snapshot
                      </Text>
                    </Pressable>

                    {selectedTimelinePoint ? (
                      <TimelineSnapshotInspector
                        point={selectedTimelinePoint}
                        onClose={() =>
                          setSelectedTimelinePoint(null)
                        }
                      />
                    ) : null}
                  </>
                ) : null}'''

    if "Inspect Current Snapshot" not in text:
        if old not in text:
            raise RuntimeError(
                "Timeline empty-state anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 5. CHART SIGNATURE
    # ==========================================================
    #

    old = '''function PortfolioTimelineChart({
  width,
  height,
  points,
  showHoldings,
  showCash
}) {'''

    new = '''function PortfolioTimelineChart({
  width,
  height,
  points,
  showHoldings,
  showCash,
  selectedPoint,
  onSelectPoint
}) {'''

    if (
        "selectedPoint,\n  onSelectPoint"
        not in text
    ):
        if old not in text:
            raise RuntimeError(
                "PortfolioTimelineChart signature not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 6. EXACT SVG POINT MAP
    #
    # This anchor comes directly from PC-030C2C4A discovery.
    # ==========================================================
    #

    old = '''        {safePoints.map(
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
        )}'''

    new = '''        {safePoints.map(
          (point, index) => {
            const selected =
              selectedPoint?.date ===
              point?.date;

            return (
              <Circle
                key={`net-worth-${point.date}-${index}`}
                cx={xForIndex(index)}
                cy={yForValue(
                  point.netWorth
                )}
                r={selected ? "6" : "4"}
                fill="#22d3ee"
                stroke={
                  selected
                    ? "#f8fafc"
                    : "#22d3ee"
                }
                strokeWidth={
                  selected
                    ? "2"
                    : "1"
                }
                onPress={() =>
                  onSelectPoint?.(point)
                }
              />
            );
          }
        )}'''

    if (
        "onSelectPoint?.(point)"
        not in text
    ):
        if old not in text:
            raise RuntimeError(
                "Exact timeline point-map anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 7. TIMELINE POINT DETAILS
    #
    # Preserve canonical V2 snapshot fields in buildTimelineView.
    # ==========================================================
    #

    old = '''          availableCash:
            finiteTimelineNumber(
              snapshot?.availableCash ??
              snapshot?.cash
            )'''

    new = '''          availableCash:
            finiteTimelineNumber(
              snapshot?.availableCash ??
              snapshot?.cash
            ),

          investedValue:
            finiteTimelineNumber(
              snapshot?.investedValue
            ),

          unrealizedGainLoss:
            finiteTimelineNumber(
              snapshot?.unrealizedGainLoss ??
              snapshot?.netGainLoss
            ),

          unrealizedGainLossPct:
            finiteTimelineNumber(
              snapshot?.unrealizedGainLossPct ??
              snapshot?.gainLossPct
            ),

          healthScore:
            finiteTimelineNumber(
              snapshot?.healthScore
            ),

          healthRating:
            snapshot?.healthRating ??
            null,

          sourceId:
            snapshot?.sourceId ??
            null,

          sourceLabel:
            snapshot?.sourceLabel ??
            null,

          triggerReason:
            snapshot?.triggerReason ??
            null'''

    if (
        "snapshot?.triggerReason ??"
        not in text
    ):
        if old not in text:
            raise RuntimeError(
                "Timeline point detail mapping anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 8. SNAPSHOT INSPECTOR COMPONENT
    # ==========================================================
    #

    anchor = '''function PortfolioTimelineChart({'''

    inspector = '''function TimelineSnapshotInspector({
  point,
  onClose
}) {
  if (!point) {
    return null;
  }

  const gain =
    finiteTimelineNumber(
      point.unrealizedGainLoss ??
      point.netGainLoss
    );

  const gainPct =
    finiteTimelineNumber(
      point.unrealizedGainLossPct ??
      point.gainLossPct
    );

  const healthScore =
    finiteTimelineNumber(
      point.healthScore
    );

  return (
    <View style={styles.snapshotInspector}>
      <View style={styles.snapshotInspectorHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.snapshotInspectorTitle}>
            Snapshot Inspector
          </Text>

          <Text style={styles.snapshotInspectorDate}>
            {point.date || "Unknown date"}
          </Text>
        </View>

        <Pressable
          style={styles.snapshotInspectorClose}
          onPress={onClose}
        >
          <Text style={styles.snapshotInspectorCloseText}>
            Close
          </Text>
        </Pressable>
      </View>

      <View style={styles.analyticsGrid}>
        <AnalyticsMetric
          label="Net Worth"
          value={
            point.netWorth !== null &&
            point.netWorth !== undefined
              ? `KES ${money(point.netWorth)}`
              : "N/A"
          }
        />

        <AnalyticsMetric
          label="Holdings Market Value"
          value={
            point.holdingsValue !== null &&
            point.holdingsValue !== undefined
              ? `KES ${money(point.holdingsValue)}`
              : "N/A"
          }
        />

        <AnalyticsMetric
          label="Invested Value"
          value={
            point.investedValue !== null &&
            point.investedValue !== undefined
              ? `KES ${money(point.investedValue)}`
              : "N/A"
          }
        />

        <AnalyticsMetric
          label="Available Cash"
          value={
            point.availableCash !== null &&
            point.availableCash !== undefined
              ? `KES ${money(point.availableCash)}`
              : "N/A"
          }
        />

        <AnalyticsMetric
          label="Unrealized Gain/Loss"
          value={
            gain !== null
              ? `${gain >= 0 ? "+" : ""}KES ${money(gain)}`
              : "N/A"
          }
        />

        <AnalyticsMetric
          label="Unrealized Return"
          value={
            gainPct !== null
              ? `${gainPct >= 0 ? "+" : ""}${Number(
                  gainPct
                ).toFixed(2)}%`
              : "N/A"
          }
        />

        <AnalyticsMetric
          label="Health Score"
          value={
            healthScore !== null
              ? `${Number(
                  healthScore
                ).toFixed(0)}/100`
              : "N/A"
          }
        />

        <AnalyticsMetric
          label="Health Rating"
          value={
            formatPerformanceLabel(
              point.healthRating
            ) ||
            "N/A"
          }
        />

        <AnalyticsMetric
          label="Portfolio Source"
          value={
            point.sourceLabel ||
            point.sourceId ||
            "N/A"
          }
        />

        <AnalyticsMetric
          label="Snapshot Trigger"
          value={
            formatPerformanceLabel(
              point.triggerReason
            ) ||
            "N/A"
          }
        />
      </View>

      <Text style={styles.snapshotInspectorFootnote}>
        Stored genuine portfolio observation. Missing historical
        values remain N/A.
      </Text>
    </View>
  );
}


function PortfolioTimelineChart({'''

    if (
        "function TimelineSnapshotInspector"
        not in text
    ):
        if anchor not in text:
            raise RuntimeError(
                "Inspector insertion anchor not found."
            )

        text = text.replace(
            anchor,
            inspector,
            1
        )

    #
    # ==========================================================
    # 9. STYLES
    # ==========================================================
    #

    if "snapshotInspector:" not in text:
        marker = "\n});"
        pos = text.rfind(marker)

        if pos == -1:
            raise RuntimeError(
                "StyleSheet closing not found."
            )

        styles = ''',

  timelineInspectHint: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center"
  },

  inspectSnapshotButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#164e63",
    borderColor: "#0891b2",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },

  inspectSnapshotButtonText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 12
  },

  snapshotInspector: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#0891b2",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15
  },

  snapshotInspectorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },

  snapshotInspectorTitle: {
    color: "#67e8f9",
    fontSize: 16,
    fontWeight: "900"
  },

  snapshotInspectorDate: {
    color: "#e2e8f0",
    marginTop: 5,
    fontWeight: "800"
  },

  snapshotInspectorClose: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7
  },

  snapshotInspectorCloseText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "900"
  },

  snapshotInspectorFootnote: {
    color: "#64748b",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 13
  }'''

        text = (
            text[:pos] +
            styles +
            text[pos:]
        )

    #
    # ==========================================================
    # 10. SAFETY CHECKS
    # ==========================================================
    #

    required = [
        "selectedTimelinePoint",
        "TimelineSnapshotInspector",
        "Inspect Current Snapshot",
        "onSelectPoint?.(point)",
        'label="Net Worth"',
        'label="Invested Value"',
        'label="Unrealized Return"',
        'label="Portfolio Source"',
        'label="Snapshot Trigger"',
        "snapshot?.triggerReason",
        "snapshotInspector:"
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Missing PC-030C2C4B elements: {missing}"
        )

    if "safePoints.length < 2" not in text:
        raise RuntimeError(
            "Two-observation chart safeguard lost."
        )

    if "Building Timeline History" not in text:
        raise RuntimeError(
            "Building Timeline History safeguard lost."
        )

    commit(
        FILE,
        original,
        text
    )

    print()
    print(
        "PC-030C2C4B applied successfully."
    )

    print()
    print(
        "Interactive timeline now supports genuine point inspection."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )
    sys.exit(1)
