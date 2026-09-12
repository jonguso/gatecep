from pathlib import Path
import re
import sys

root = Path(sys.argv[1])

coach_insights = root / "mobile/app/coach-insights.js"
coach_tab = root / "mobile/app/(tabs)/coach.js"
planner = root / "mobile/app/goal-scenario-planner.js"
performance = root / "mobile/app/performance.js"

for p in [coach_insights, coach_tab, planner, performance]:
    if not p.exists():
        raise SystemExit(f"ERROR — required AV3B1 target missing: {p.relative_to(root)}")

COMMON_STYLES = r"""
  /* PC-030M20AV3B RESPONSIVE CALIBRATION */
  av3bContentWide: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    paddingHorizontal: 24
  },
  av3bContentCompact: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 128
  },
  av3bContentNarrow: {
    paddingHorizontal: 12
  },
  av3bHeaderCompact: {
    flexWrap: "wrap",
    alignItems: "stretch"
  },
  av3bHeaderActionsCompact: {
    width: "100%",
    flexWrap: "wrap"
  },
  av3bTitleCompact: {
    fontSize: 28,
    lineHeight: 34
  },
  av3bTitleNarrow: {
    fontSize: 25,
    lineHeight: 31
  }
"""

def backup_and_write(path, original, updated):
    if updated == original:
        return False
    backup = path.with_suffix(path.suffix + ".pc030m20av3b1.bak")
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
    path.write_text(updated, encoding="utf-8")
    return True

def replace_once_or_keep(s, old, new, label):
    if new in s:
        return s
    if old not in s:
        raise SystemExit(f"ERROR — {label} anchor missing.")
    return s.replace(old, new, 1)

def add_use_window_dimensions(s):
    if "useWindowDimensions" in s:
        return s

    # Works for the single-line planner import.
    m = re.search(r'import\s*\{([^}]*)\}\s*from\s*"react-native";', s)
    if m and "useWindowDimensions" not in m.group(1):
        items = m.group(1).strip()
        return s[:m.start()] + f'import {{ {items}, useWindowDimensions }} from "react-native";' + s[m.end():]

    # Works for multiline React Native imports.
    m = re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"react-native";', s)
    if m and "useWindowDimensions" not in m.group(1):
        body = m.group(1).rstrip()
        new_block = 'import {' + body + ',\n  useWindowDimensions\n} from "react-native";'
        return s[:m.start()] + new_block + s[m.end():]

    raise SystemExit("ERROR — React Native import anchor missing.")

def ensure_width_hook(s, signature, variable="viewportWidth"):
    if re.search(rf'\bwidth\s*:\s*{re.escape(variable)}\b', s):
        return s
    if signature not in s:
        raise SystemExit(f"ERROR — component anchor missing: {signature}")
    return s.replace(signature, signature + f'\n  const {{ width: {variable} }} = useWindowDimensions();', 1)

def append_styles(s, style_text):
    if "/* PC-030M20AV3B RESPONSIVE CALIBRATION */" in s:
        return s
    idx = s.rfind("});")
    if idx < 0:
        raise SystemExit("ERROR — StyleSheet closing anchor missing.")
    prefix = s[:idx].rstrip()
    if not prefix.endswith(","):
        prefix += ","
    return prefix + "\n" + style_text.rstrip() + "\n" + s[idx:]

def ensure_existing_av3b_file(path, label):
    s = path.read_text(encoding="utf-8")
    required = [
        "PC-030M20AV3B RESPONSIVE CALIBRATION",
        "av3bContentWide",
        "av3bContentCompact",
        "av3bContentNarrow",
    ]
    missing = [x for x in required if x not in s]
    if missing:
        raise SystemExit(f"ERROR — {label} is missing partial AV3B state: {', '.join(missing)}")
    return False

changed = {}

# The original AV3B run completed these two before it reached the planner failure.
# Validate them rather than rewriting working files.
changed["coach-insights"] = ensure_existing_av3b_file(coach_insights, "Coach G Insights")
changed["coach-tab"] = ensure_existing_av3b_file(coach_tab, "REAL Coach G")

# ----------------------------------------------------------------------
# Goal Scenario Planner — corrected sector-row anchor.
# ----------------------------------------------------------------------
p = planner
s = p.read_text(encoding="utf-8")
orig = s

s = add_use_window_dimensions(s)
s = ensure_width_hook(s, "export default function GoalScenarioPlanner() {")

s = replace_once_or_keep(
    s,
    '<ScrollView style={styles.screen} contentContainerStyle={styles.content}>',
    '<ScrollView style={styles.screen} contentContainerStyle={[styles.content, viewportWidth >= 720 && styles.av3bContentWide, viewportWidth < 720 && styles.av3bContentCompact, viewportWidth < 480 && styles.av3bContentNarrow]}>',
    "Goal Scenario Planner root content"
)
s = replace_once_or_keep(
    s,
    '<Text style={styles.title}>Goal Recovery Simulator</Text>',
    '<Text style={[styles.title, viewportWidth < 720 && styles.av3bTitleCompact, viewportWidth < 480 && styles.av3bTitleNarrow]}>Goal Recovery Simulator</Text>',
    "Goal Scenario Planner title"
)
s = replace_once_or_keep(
    s,
    '<View style={styles.inputGrid}>',
    '<View style={[styles.inputGrid, styles.av3bInputGrid]}>',
    "Goal Scenario Planner input grid"
)

# Actual source is inline in scenario.sectorPlan.map:
old_sector = '<View key={row.sector} style={styles.sectorRow}>'
new_sector = '<View key={row.sector} style={[styles.sectorRow, viewportWidth < 480 && styles.av3bSectorRowNarrow]}>'
s = replace_once_or_keep(
    s,
    old_sector,
    new_sector,
    "Goal Scenario Planner inline sector row"
)

s = replace_once_or_keep(
    s,
    'function Field({ label, value, onChangeText, numeric }) { return <View style={styles.field}>',
    'function Field({ label, value, onChangeText, numeric }) { return <View style={[styles.field, styles.av3bField]}>',
    "Goal Scenario Planner Field"
)

GOAL_STYLES = COMMON_STYLES + r"""
  av3bInputGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  av3bField: {
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 0
  },
  av3bSectorRowNarrow: {
    flexDirection: "column",
    alignItems: "stretch"
  }
"""
s = append_styles(s, GOAL_STYLES)
changed["goal-scenario-planner"] = backup_and_write(p, orig, s)

# ----------------------------------------------------------------------
# Performance — this file was never reached by the failed AV3B apply.
# Preserve its existing window/chart/detail responsiveness; calibrate shell.
# ----------------------------------------------------------------------
p = performance
s = p.read_text(encoding="utf-8")
orig = s

s = replace_once_or_keep(
    s,
    '<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>',
    '<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={[styles.content, windowWidth >= 720 && styles.av3bContentWide, windowWidth < 720 && styles.av3bContentCompact, windowWidth < 480 && styles.av3bContentNarrow]}>',
    "Performance root content"
)
s = replace_once_or_keep(
    s,
    '<View style={styles.headerRow}>',
    '<View style={[styles.headerRow, windowWidth < 720 && styles.av3bHeaderCompact]}>',
    "Performance header"
)
s = replace_once_or_keep(
    s,
    '<Text style={styles.title}>Performance</Text>',
    '<Text style={[styles.title, windowWidth < 720 && styles.av3bTitleCompact, windowWidth < 480 && styles.av3bTitleNarrow]}>Performance</Text>',
    "Performance title"
)
s = replace_once_or_keep(
    s,
    '<View style={styles.headerActions}>',
    '<View style={[styles.headerActions, windowWidth < 720 && styles.av3bHeaderActionsCompact]}>',
    "Performance header actions"
)
s = append_styles(s, COMMON_STYLES)
changed["performance"] = backup_and_write(p, orig, s)

print("PC-030M20AV3B1 — Responsive Calibration Partial-Apply Recovery")
print("ROOT CAUSE — original AV3B expected a standalone sectorRow View, but Goal Scenario Planner renders it inline inside scenario.sectorPlan.map().")
print("RECOVERED — Coach G Insights and REAL Coach G completed in the original partial apply and were validated.")
print("UPDATED — Goal Scenario Planner now uses the correct inline sector-row anchor.")
print("UPDATED — Performance calibration now applies because the patch continues beyond the planner.")
print("PRESERVED — existing Performance useWindowDimensions/chart sizing/detail-panel behavior.")
print("PRESERVED — Goal recovery calculations and /goal-recovery-choice handoff.")
print("PRESERVED — Coach G REAL/Practice boundaries and all trading/reconciliation integrity.")
print("FILES CHANGED — " + ", ".join(f"{k}={v}" for k,v in changed.items()))
