from pathlib import Path

p = Path("app/performance.js")
s = p.read_text()

# ============================================================
# 1. IMPORT CURRENT PORTFOLIO HEALTH ENGINE
# ============================================================

old = '''import { loadCanonicalRealWealthMetrics } from "../src/features/wealth-journey/canonicalRealWealthMetricsService";'''

new = '''import { loadCanonicalRealWealthMetrics } from "../src/features/wealth-journey/canonicalRealWealthMetricsService";
import { buildPortfolioHealthScore } from "../src/features/analytics/portfolioHealthScoreService";'''

assert old in s, "health import anchor not found"
s = s.replace(old, new, 1)

# ============================================================
# 2. ADD CURRENT HEALTH STATE
# ============================================================

old = '''const [canonicalMetrics, setCanonicalMetrics] = useState(null);'''

new = '''const [canonicalMetrics, setCanonicalMetrics] = useState(null);
const [currentHealth, setCurrentHealth] = useState(null);'''

assert old in s, "health state anchor not found"
s = s.replace(old, new, 1)

# ============================================================
# 3. LOAD CURRENT HEALTH WITH OTHER CURRENT DATA
# ============================================================

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

      setSnapshots(Array.isArray(data) ? data : []);
      setCanonicalMetrics(realMetrics || null);
      setCurrentHealth(health || null);'''

assert old in s, "performance load anchor not found"
s = s.replace(old, new, 1)

old = '''      setSnapshots([]);
      setCanonicalMetrics(null);'''

new = '''      setSnapshots([]);
      setCanonicalMetrics(null);
      setCurrentHealth(null);'''

assert old in s, "performance catch anchor not found"
s = s.replace(old, new, 1)

# ============================================================
# 4. HISTORICAL INTEGRITY
#
# A valid "since first snapshot" comparison requires:
#   - at least two stored snapshots
#   - a valid first snapshot value
#
# Missing history is null, never zero.
# ============================================================

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
      first?.currentValue ??
      null;

    const firstValue =
      firstValueRaw !== null &&
      Number.isFinite(Number(firstValueRaw))
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

assert old in s, "historical formula anchor not found"
s = s.replace(old, new, 1)

# ============================================================
# 5. CURRENT HEALTH SCORE
#
# Do not inherit 0 from an old/missing snapshot.
# Current Health Score comes from the analytics engine.
# ============================================================

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

assert old in s, "latest current metrics anchor not found"
s = s.replace(old, new, 1)

old = '''  }, [snapshots, canonicalMetrics]);'''

new = '''  }, [snapshots, canonicalMetrics, currentHealth]);'''

assert old in s, "metrics dependency anchor not found"
s = s.replace(old, new, 1)

# ============================================================
# 6. CHANGE SINCE FIRST SNAPSHOT UI
# ============================================================

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
                  ? `KES ${money(metrics.change)} (${metrics.changePct.toFixed(
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

assert old in s, "change UI anchor not found"
s = s.replace(old, new, 1)

# ============================================================
# 7. HEALTH SCORE UI
# ============================================================

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
                  ? `${Number(metrics.latest.healthScore).toFixed(0)}/100 ${
                      metrics.latest.healthRating
                        ? `(${metrics.latest.healthRating})`
                        : ""
                    }`
                  : "N/A"
              }
            />'''

assert old in s, "health UI anchor not found"
s = s.replace(old, new, 1)

# ============================================================
# 8. SNAPSHOT HISTORY
#
# Historical rows must not claim 0/100 when health was absent.
# ============================================================

old = '''                    Health {s.healthScore || 0}/100 • Cash KES {money(s.cash)}'''

new = '''                    Health{" "}
                    {s.healthScore !== null &&
                    s.healthScore !== undefined
                      ? `${Number(s.healthScore).toFixed(0)}/100`
                      : "N/A"}{" "}
                    • Cash KES {money(s.cash)}'''

assert old in s, "snapshot health UI anchor not found"
s = s.replace(old, new, 1)

p.write_text(s)

print("PC-030C2B7 patch complete")
