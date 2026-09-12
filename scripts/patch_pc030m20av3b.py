from pathlib import Path
import re
import sys

root = Path(sys.argv[1])

TARGETS = {
    "coach_insights": root / "mobile/app/coach-insights.js",
    "performance": root / "mobile/app/performance.js",
    "coach_tab": root / "mobile/app/(tabs)/coach.js",
    "goal_planner": root / "mobile/app/goal-scenario-planner.js",
}

for key, path in TARGETS.items():
    if not path.exists():
        raise SystemExit(f"ERROR — required AV3B target missing: {path.relative_to(root)}")

def write_if_changed(path, original, updated):
    if updated == original:
        return False
    backup = path.with_suffix(path.suffix + ".pc030m20av3b.bak")
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
    path.write_text(updated, encoding="utf-8")
    return True

def add_use_window_dimensions(s):
    if "useWindowDimensions" in s:
        return s

    pat = r'(import\s*\{[\s\S]*?\n)(\s*View\s*\n\}\s*from\s*"react-native";)'
    m = re.search(pat, s)
    if m:
        block = m.group(0)
        replacement = block.replace(
            "\n  View\n} from \"react-native\";",
            "\n  useWindowDimensions,\n  View\n} from \"react-native\";",
            1
        )
        if replacement != block:
            return s.replace(block, replacement, 1)

    pat2 = r'import\s*\{([^}]*)\}\s*from\s*"react-native";'
    m2 = re.search(pat2, s)
    if m2 and "useWindowDimensions" not in m2.group(1):
        items = m2.group(1).strip()
        return s[:m2.start()] + f'import {{ {items}, useWindowDimensions }} from "react-native";' + s[m2.end():]

    raise SystemExit("ERROR — could not add useWindowDimensions safely.")

def insert_viewport_width(s, function_signature, variable="viewportWidth"):
    if function_signature not in s:
        raise SystemExit(f"ERROR — component anchor missing: {function_signature}")
    if f"width: {variable}" in s or f"width:{variable}" in s:
        return s
    return s.replace(
        function_signature,
        function_signature + f'\n  const {{ width: {variable} }} = useWindowDimensions();',
        1
    )

def replace_once_or_keep(s, old, new, label):
    if new in s:
        return s
    if old not in s:
        raise SystemExit(f"ERROR — {label} anchor missing.")
    return s.replace(old, new, 1)

def add_styles_before_last_close(s, style_text):
    marker = "/* PC-030M20AV3B RESPONSIVE CALIBRATION */"
    if marker in s:
        return s
    idx = s.rfind("});")
    if idx < 0:
        raise SystemExit("ERROR — StyleSheet closing anchor missing.")
    prefix = s[:idx].rstrip()
    if not prefix.endswith(","):
        prefix += ","
    return prefix + "\n" + style_text.rstrip() + "\n" + s[idx:]

COMMON_STYLES = r'''
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
'''

changed = {}

# Coach G Insights
p = TARGETS["coach_insights"]
s = p.read_text(encoding="utf-8")
orig = s
s = add_use_window_dimensions(s)
s = insert_viewport_width(s, "export default function Coach() {")
s = replace_once_or_keep(
    s,
    '<ScrollView style={styles.screen} contentContainerStyle={styles.content}>',
    '<ScrollView style={styles.screen} contentContainerStyle={[styles.content, viewportWidth >= 720 && styles.av3bContentWide, viewportWidth < 720 && styles.av3bContentCompact, viewportWidth < 480 && styles.av3bContentNarrow]}>',
    "Coach G Insights root content"
)
s = replace_once_or_keep(
    s,
    '<View style={styles.headerRow}>',
    '<View style={[styles.headerRow, viewportWidth < 720 && styles.av3bHeaderCompact]}>',
    "Coach G Insights header"
)
s = replace_once_or_keep(
    s,
    '<Text style={styles.title}>Practice Coach G Lab</Text>',
    '<Text style={[styles.title, viewportWidth < 720 && styles.av3bTitleCompact, viewportWidth < 480 && styles.av3bTitleNarrow]}>Practice Coach G Lab</Text>',
    "Coach G Insights title"
)
if '<View style={styles.headerActions}>' in s:
    s = s.replace(
        '<View style={styles.headerActions}>',
        '<View style={[styles.headerActions, viewportWidth < 720 && styles.av3bHeaderActionsCompact]}>',
        1
    )
s = add_styles_before_last_close(s, COMMON_STYLES)
changed["coach-insights"] = write_if_changed(p, orig, s)

# Canonical REAL Coach G
p = TARGETS["coach_tab"]
s = p.read_text(encoding="utf-8")
orig = s
s = add_use_window_dimensions(s)
s = insert_viewport_width(s, "export default function Coach() {")
s = replace_once_or_keep(
    s,
    '<ScrollView style={styles.screen} contentContainerStyle={styles.content}>',
    '<ScrollView style={styles.screen} contentContainerStyle={[styles.content, viewportWidth >= 720 && styles.av3bContentWide, viewportWidth < 720 && styles.av3bContentCompact, viewportWidth < 480 && styles.av3bContentNarrow]}>',
    "Coach G root content"
)
s = replace_once_or_keep(
    s,
    '<View style={styles.headerRow}>',
    '<View style={[styles.headerRow, viewportWidth < 720 && styles.av3bHeaderCompact]}>',
    "Coach G header"
)
s = replace_once_or_keep(
    s,
    '<Text style={styles.title}>Coach G Insights</Text>',
    '<Text style={[styles.title, viewportWidth < 720 && styles.av3bTitleCompact, viewportWidth < 480 && styles.av3bTitleNarrow]}>Coach G Insights</Text>',
    "Coach G title"
)
s = replace_once_or_keep(
    s,
    '<View style={styles.headerActions}>',
    '<View style={[styles.headerActions, viewportWidth < 720 && styles.av3bHeaderActionsCompact]}>',
    "Coach G header actions"
)
s = add_styles_before_last_close(s, COMMON_STYLES)
changed["coach-tab"] = write_if_changed(p, orig, s)

# Goal Scenario Planner
p = TARGETS["goal_planner"]
s = p.read_text(encoding="utf-8")
orig = s
s = add_use_window_dimensions(s)
s = insert_viewport_width(s, "export default function GoalScenarioPlanner() {")
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
s = replace_once_or_keep(
    s,
    '<View style={styles.sectorRow}>',
    '<View style={[styles.sectorRow, viewportWidth < 480 && styles.av3bSectorRowNarrow]}>',
    "Goal Scenario Planner sector row"
)
s = replace_once_or_keep(
    s,
    'function Field({ label, value, onChangeText, numeric }) { return <View style={styles.field}>',
    'function Field({ label, value, onChangeText, numeric }) { return <View style={[styles.field, styles.av3bField]}>',
    "Goal Scenario Planner Field"
)

GOAL_EXTRA = COMMON_STYLES + r'''
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
'''
s = add_styles_before_last_close(s, GOAL_EXTRA)
changed["goal-scenario-planner"] = write_if_changed(p, orig, s)

# Performance
p = TARGETS["performance"]
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
s = add_styles_before_last_close(s, COMMON_STYLES)
changed["performance"] = write_if_changed(p, orig, s)

print("PC-030M20AV3B — Responsive Screen Calibration")
print("UPDATED — Coach G Insights uses contained desktop width and compact mobile padding.")
print("UPDATED — REAL Coach G uses the same responsive containment and mobile header wrapping.")
print("UPDATED — Performance preserves existing responsive chart/detail logic and gains calibrated page/header containment.")
print("UPDATED — Goal Scenario Planner gains responsive page containment, wrapping input fields, and narrow sector rows.")
print("PRESERVED — all business logic, portfolio data, goal math, performance history, Coach G recommendations, recovery routing, fees, and execution boundaries.")
print("PRESERVED — global Coach G/Menu overlay clearance through compact bottom padding.")
print("FILES CHANGED — " + ", ".join(f"{k}={v}" for k,v in changed.items()))
