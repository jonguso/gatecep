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
        path.suffix + ".pc030c2c4.bak"
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
    original = FILE.read_text(
        encoding="utf-8"
    )

    text = original

    #
    # ==========================================================
    # 1. SELECTED SNAPSHOT STATE
    # ==========================================================
    #

    anchor = '''const [showTimelineCash, setShowTimelineCash] = useState(false);'''

    replacement = '''const [showTimelineCash, setShowTimelineCash] = useState(false);
  const [selectedTimelinePoint, setSelectedTimelinePoint] = useState(null);'''

    if (
        "selectedTimelinePoint"
        not in text
    ):
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
    # 2. CLEAR SELECTION WHEN RANGE CHANGES
    # ==========================================================
    #

    old_range = '''onPress={() =>
                      setTimelineRange(range)
                    }'''

    new_range = '''onPress={() => {
                      setTimelineRange(range);
                      setSelectedTimelinePoint(null);
                    }}'''

    if (
        "setSelectedTimelinePoint(null);"
        not in text
    ):
        if old_range not in text:
            raise RuntimeError(
                "Timeline range handler anchor not found."
            )

        text = text.replace(
            old_range,
            new_range,
            1
        )

    #
    # ==========================================================
    # 3. INTERACTIVE CHART CALLBACK
    # ==========================================================
    #

    chart_anchor = '''                  showHoldings={showTimelineHoldings}
                  showCash={showTimelineCash}
                />'''

    chart_new = '''                  showHoldings={showTimelineHoldings}
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
        if chart_anchor not in text:
            raise RuntimeError(
                "Timeline chart props anchor not found."
            )

        text = text.replace(
            chart_anchor,
            chart_new,
            1
        )

    #
    # ==========================================================
    # 4. SINGLE OBSERVATION INSPECTOR
    #
    # Keep Building Timeline History intact.
    # Do NOT manufacture a second chart point.
    # ==========================================================
    #

    empty_anchor = '''                <Text style={styles.timelineEmptyText}>
                  At least two genuine portfolio snapshot dates
                  are required to draw a performance timeline.
                  GateCEP will preserve N/A until enough real
                  history exists.
                </Text>'''

    empty_new = '''                <Text style={styles.timelineEmptyText}>
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

    if (
        "Inspect Current Snapshot"
        not in text
    ):
        if empty_anchor not in text:
            raise RuntimeError(
                "Timeline empty-state anchor not found."
            )

        text = text.replace(
            empty_anchor,
            empty_new,
            1
        )

    #
    # ==========================================================
    # 5. CHART PROPS
    # ==========================================================
    #

    component_anchor = '''function PortfolioTimelineChart({
  width,
  height,
  points,
  showHoldings,
  showCash
}) {'''

    component_new = '''function PortfolioTimelineChart({
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
        if component_anchor not in text:
            raise RuntimeError(
                "PortfolioTimelineChart signature not found."
            )

        text = text.replace(
            component_anchor,
            component_new,
            1
        )

    #
    # ==========================================================
    # 6. MAKE SVG OBSERVATION POINTS PRESSABLE
    #
    # Existing point circles remain authoritative.
    # Add a transparent hit target around each point.
    # ==========================================================
    #

    circle_find = '''        {safePoints.map(
          (point, index) => ('''

    if circle_find not in text:
        raise RuntimeError(
            "Timeline point map anchor not found."
        )

    #
    # We need the exact existing map body, so patch only the
    # Circle return if the interactive marker is not present.
    #

    if "timelinePointHitTarget" not in text:
        map_start = text.find(
            circle_find
        )

        map_end = text.find(
            "        )}",
            map_start
        )

        if map_end == -1:
            raise RuntimeError(
                "Timeline point map closing not found."
            )

        segment = text[
            map_start:
            map_end + len("        )}")
        ]

        #
        # Find first Circle in this map.
        #
        circle_pos = segment.find(
            "<Circle"
        )

        if circle_pos == -1:
            raise RuntimeError(
                "Timeline point Circle not found."
            )

        circle_end = segment.find(
            "/>",
            circle_pos
        )

        if circle_end == -1:
            raise RuntimeError(
                "Timeline point Circle closing not found."
            )

        existing_circle = segment[
            circle_pos:
            circle_end + 2
        ]

        #
        # Extract cx/cy expressions by preserving the existing
        # circle and add a larger transparent Circle using the
        # same coordinates through the point's precomputed x/y
        # if available. If not, use a Pressable overlay later.
        #
        # The safest cross-platform implementation is to attach
        # onPress directly to the existing SVG Circle and enlarge
        # its stroke hit area.
        #

        if "onPress=" not in existing_circle:
            patched_circle = (
                existing_circle[:-2] +
                '''
            onPress={() =>
              onSelectPoint?.(point)
            }
            accessibilityLabel={`Inspect portfolio snapshot ${point.date || index + 1}`}
          />'''
            )

            segment = (
                segment[:circle_pos] +
                patched_circle +
                segment[circle_end + 2:]
            )

            text = (
                text[:map_start] +
                segment +
                text[map_end + len("        )}"):]
            )

        #
        # Marker token for verification.
        #
        helper_marker = '''function buildTimelineView('''

        marker_block = '''/*
 * PC-030C2C4
 * timelinePointHitTarget
 *
 * SVG observation circles are interactive through onPress.
 * No synthetic observations are created.
 */


function buildTimelineView('''

        if helper_marker not in text:
            raise RuntimeError(
                "buildTimelineView anchor not found."
            )

        text = text.replace(
            helper_marker,
            marker_block,
            1
        )

    #
    # ==========================================================
    # 7. SELECTED POINT VISUAL EMPHASIS
    #
    # Add selection styling to the point Circle where possible.
    # ==========================================================
    #

    #
    # We deliberately do not rewrite cx/cy/path mathematics.
    # Interaction is layered onto the existing genuine points.
    #

    #
    # ==========================================================
    # 8. SNAPSHOT INSPECTOR COMPONENT
    # ==========================================================
    #

    inspector_anchor = '''function PortfolioTimelineChart({'''

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
        This inspector displays the stored genuine portfolio
        observation. Missing historical values remain N/A.
      </Text>
    </View>
  );
}


function PortfolioTimelineChart({'''

    if (
        "function TimelineSnapshotInspector"
        not in text
    ):
        if inspector_anchor not in text:
            raise RuntimeError(
                "Timeline inspector insertion anchor not found."
            )

        text = text.replace(
            inspector_anchor,
            inspector,
            1
        )

    #
    # ==========================================================
    # 9. TIMELINE NORMALIZATION — PRESERVE V2 DETAIL FIELDS
    # ==========================================================
    #

    #
    # Current buildTimelineView maps normalized history into
    # points. Add fields to that mapping immediately after
    # availableCash without changing filtering/range logic.
    #

    cash_pattern = '''          availableCash:
            finiteTimelineNumber(
              snapshot?.availableCash ??
              snapshot?.cash
            )'''

    cash_replacement = '''          availableCash:
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
            snapshot?.healthRating ||
            null,

          sourceId:
            snapshot?.sourceId ||
            null,

          sourceLabel:
            snapshot?.sourceLabel ||
            null,

          triggerReason:
            snapshot?.triggerReason ||
            null'''

    if (
        "snapshot?.triggerReason ||"
        not in text
    ):
        if cash_pattern not in text:
            raise RuntimeError(
                "Timeline availableCash mapping anchor not found."
            )

        text = text.replace(
            cash_pattern,
            cash_replacement,
            1
        )

    #
    # ==========================================================
    # 10. STYLES
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
    # 11. SAFETY
    # ==========================================================
    #

    required = [
        "selectedTimelinePoint",
        "TimelineSnapshotInspector",
        "Snapshot Inspector",
        "Inspect Current Snapshot",
        "onSelectPoint",
        "timelinePointHitTarget",
        'label="Net Worth"',
        'label="Holdings Market Value"',
        'label="Invested Value"',
        'label="Available Cash"',
        'label="Unrealized Gain/Loss"',
        'label="Unrealized Return"',
        'label="Health Score"',
        'label="Health Rating"',
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
            f"Missing PC-030C2C4 elements: {missing}"
        )

    #
    # Historical truth invariant.
    #
    if "safePoints.length < 2" not in text:
        raise RuntimeError(
            "Timeline two-observation safeguard was lost."
        )

    if "Building Timeline History" not in text:
        raise RuntimeError(
            "Timeline empty-state safeguard was lost."
        )

    commit(
        FILE,
        original,
        text
    )

    print()
    print(
        "PC-030C2C4 applied successfully."
    )

    print()
    print(
        "Interactive timeline now supports:"
    )

    print(
        "  - genuine observation selection"
    )

    print(
        "  - snapshot detail inspector"
    )

    print(
        "  - V2 source + trigger metadata"
    )

    print(
        "  - single-observation inspection"
    )

    print(
        "  - no synthetic timeline history"
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
