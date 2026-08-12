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
        path.suffix + ".pc030c2c5.bak"
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
    # 1. SELECTED SNAPSHOT SUMMARY
    #
    # Keep the detailed inspector from C4B.
    # Add a compact immediate selection summary above it.
    # ==========================================================
    #

    old = '''                <Text style={styles.timelineInspectHint}>
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

    new = '''                <Text style={styles.timelineInspectHint}>
                  Select a genuine observation point to inspect its portfolio snapshot.
                </Text>

                {selectedTimelinePoint ? (
                  <TimelineSelectedSnapshotSummary
                    point={selectedTimelinePoint}
                  />
                ) : null}

                {selectedTimelinePoint ? (
                  <TimelineSnapshotInspector
                    point={selectedTimelinePoint}
                    onClose={() =>
                      setSelectedTimelinePoint(null)
                    }
                  />
                ) : null}'''

    if (
        "TimelineSelectedSnapshotSummary"
        not in text
    ):
        if old not in text:
            raise RuntimeError(
                "Timeline inspector UI anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 2. COMPACT SELECTED SNAPSHOT COMPONENT
    # ==========================================================
    #

    anchor = '''function TimelineSnapshotInspector({'''

    component = '''function TimelineSelectedSnapshotSummary({
  point
}) {
  if (!point) {
    return null;
  }

  const gainPct =
    finiteTimelineNumber(
      point.unrealizedGainLossPct ??
      point.gainLossPct
    );

  return (
    <View style={styles.timelineSelectedSummary}>
      <View style={styles.timelineSelectedSummaryItem}>
        <Text style={styles.timelineSelectedSummaryLabel}>
          Selected
        </Text>

        <Text style={styles.timelineSelectedSummaryValue}>
          {formatTimelineDate(
            point.date
          ) || point.date || "N/A"}
        </Text>
      </View>

      <View style={styles.timelineSelectedSummaryItem}>
        <Text style={styles.timelineSelectedSummaryLabel}>
          Net Worth
        </Text>

        <Text style={styles.timelineSelectedSummaryValue}>
          {point.netWorth !== null &&
          point.netWorth !== undefined
            ? `KES ${money(point.netWorth)}`
            : "N/A"}
        </Text>
      </View>

      <View style={styles.timelineSelectedSummaryItem}>
        <Text style={styles.timelineSelectedSummaryLabel}>
          Return
        </Text>

        <Text style={styles.timelineSelectedSummaryValue}>
          {gainPct !== null
            ? `${gainPct >= 0 ? "+" : ""}${Number(
                gainPct
              ).toFixed(2)}%`
            : "N/A"}
        </Text>
      </View>
    </View>
  );
}


function TimelineSnapshotInspector({'''

    if (
        "function TimelineSelectedSnapshotSummary"
        not in text
    ):
        if anchor not in text:
            raise RuntimeError(
                "TimelineSnapshotInspector anchor not found."
            )

        text = text.replace(
            anchor,
            component,
            1
        )

    #
    # ==========================================================
    # 3. SELECTED POINT GEOMETRY
    #
    # Derive the selected point once.
    # This drives the guide line and selection ring.
    # ==========================================================
    #

    old = '''  const last =
    safePoints[
      safePoints.length - 1
    ];

  return ('''

    new = '''  const last =
    safePoints[
      safePoints.length - 1
    ];

  const selectedIndex =
    safePoints.findIndex(
      (point) =>
        selectedPoint?.date ===
        point?.date
    );

  const selectedChartPoint =
    selectedIndex >= 0
      ? safePoints[selectedIndex]
      : null;

  const selectedX =
    selectedChartPoint
      ? xForIndex(selectedIndex)
      : null;

  const selectedY =
    selectedChartPoint
      ? yForValue(
          selectedChartPoint.netWorth
        )
      : null;

  return ('''

    if "const selectedChartPoint" not in text:
        if old not in text:
            raise RuntimeError(
                "Chart selected geometry anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 4. SELECTED VERTICAL GUIDE LINE
    # ==========================================================
    #

    anchor = '''        {holdingsPath ? ('''

    guide = '''        {selectedChartPoint ? (
          <Line
            x1={selectedX}
            x2={selectedX}
            y1={padding.top}
            y2={
              padding.top +
              chartHeight
            }
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        ) : null}

        {holdingsPath ? ('''

    if 'strokeDasharray="4 4"' not in text:
        if anchor not in text:
            raise RuntimeError(
                "Chart guide-line anchor not found."
            )

        text = text.replace(
            anchor,
            guide,
            1
        )

    #
    # ==========================================================
    # 5. LARGE INVISIBLE MOBILE HIT TARGETS
    #
    # Render BEFORE visible dots so the small visual point stays
    # crisp while a 44px diameter target handles interaction.
    # ==========================================================
    #

    anchor = '''        {safePoints.map(
          (point, index) => {
            const selected ='''

    hit_targets = '''        {safePoints.map(
          (point, index) => (
            <Circle
              key={`net-worth-hit-${point.date}-${index}`}
              cx={xForIndex(index)}
              cy={yForValue(
                point.netWorth
              )}
              r="22"
              fill="transparent"
              onPress={() =>
                onSelectPoint?.(point)
              }
            />
          )
        )}

        {safePoints.map(
          (point, index) => {
            const selected ='''

    if "net-worth-hit-" not in text:
        if anchor not in text:
            raise RuntimeError(
                "Exact visible point-map anchor not found."
            )

        text = text.replace(
            anchor,
            hit_targets,
            1
        )

    #
    # ==========================================================
    # 6. STRONG SELECTED OUTER RING
    #
    # Insert immediately before the existing visible point.
    # pointerEvents none prevents the ring from stealing taps.
    # ==========================================================
    #

    old = '''            return (
              <Circle
                key={`net-worth-${point.date}-${index}`}'''

    new = '''            return (
              <React.Fragment
                key={`net-worth-${point.date}-${index}`}
              >
                {selected ? (
                  <Circle
                    cx={xForIndex(index)}
                    cy={yForValue(
                      point.netWorth
                    )}
                    r="10"
                    fill="none"
                    stroke="#f8fafc"
                    strokeWidth="2"
                    opacity="0.9"
                    pointerEvents="none"
                  />
                ) : null}

                <Circle
                cx={xForIndex(index)}'''

    if 'r="10"' not in text:
        if old not in text:
            raise RuntimeError(
                "Visible point return anchor not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

        old_close = '''                onPress={() =>
                  onSelectPoint?.(point)
                }
              />
            );
          }
        )}'''

        new_close = '''                onPress={() =>
                  onSelectPoint?.(point)
                }
              />
              </React.Fragment>
            );
          }
        )}'''

        if old_close not in text:
            raise RuntimeError(
                "Visible point closing anchor not found."
            )

        text = text.replace(
            old_close,
            new_close,
            1
        )

    #
    # ==========================================================
    # 7. STYLES
    # ==========================================================
    #

    if "timelineSelectedSummary:" not in text:
        marker = "\n});"
        pos = text.rfind(marker)

        if pos == -1:
            raise RuntimeError(
                "StyleSheet closing not found."
            )

        styles = ''',

  timelineSelectedSummary: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "#0f172a",
    borderColor: "#164e63",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },

  timelineSelectedSummaryItem: {
    minWidth: 105,
    flexGrow: 1
  },

  timelineSelectedSummaryLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  timelineSelectedSummaryValue: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4
  }'''

        text = (
            text[:pos] +
            styles +
            text[pos:]
        )

    #
    # ==========================================================
    # 8. SAFETY / CONTRACT CHECKS
    # ==========================================================
    #

    required = [
        "TimelineSelectedSnapshotSummary",
        "timelineSelectedSummary:",
        "net-worth-hit-",
        'r="22"',
        "const selectedChartPoint",
        'strokeDasharray="4 4"',
        'r="10"',
        "onSelectPoint?.(point)",
        "setSelectedTimelinePoint(null)",
        "safePoints.length < 2",
        "Building Timeline History",
        "Missing dates are not interpolated"
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Missing PC-030C2C5 elements: {missing}"
        )

    #
    # Holdings/Cash must preserve selection.
    #
    # We intentionally do NOT attach
    # setSelectedTimelinePoint(null) to either toggle.
    #

    holdings_start = text.find(
        "setShowTimelineHoldings("
    )

    cash_start = text.find(
        "setShowTimelineCash("
    )

    if holdings_start == -1 or cash_start == -1:
        raise RuntimeError(
            "Timeline series toggle anchors lost."
        )

    holdings_window = text[
        holdings_start:
        holdings_start + 180
    ]

    cash_window = text[
        cash_start:
        cash_start + 180
    ]

    if (
        "setSelectedTimelinePoint(null)"
        in holdings_window
    ):
        raise RuntimeError(
            "Holdings toggle incorrectly clears selection."
        )

    if (
        "setSelectedTimelinePoint(null)"
        in cash_window
    ):
        raise RuntimeError(
            "Cash toggle incorrectly clears selection."
        )

    #
    # Range control MUST continue clearing selection.
    #

    range_anchor = '''setTimelineRange(range);
                      setSelectedTimelinePoint(null);'''

    if range_anchor not in text:
        raise RuntimeError(
            "Range-change selection reset safeguard lost."
        )

    #
    # No historical data-builder changes are required for C5.
    #

    commit(
        FILE,
        original,
        text
    )

    print()
    print(
        "PC-030C2C5 applied successfully."
    )

    print()
    print(
        "Timeline interaction hardened for mobile and web."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )
    sys.exit(1)
