#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"

[[ -f "$TRADING" ]] || { echo "ERROR — expected Trading route not found: $TRADING"; exit 1; }

echo "PC-030M20AQ3 — Trading / Decision Lab UI Consolidation"

python - "$TRADING" <<'PY'
from pathlib import Path
import re, sys

path = Path(sys.argv[1])
s = path.read_text(encoding="utf-8")
original = s

if "PC-030M20AQ3 UI consolidation" in s:
    print("SKIP — M20AQ3 UI consolidation already applied")
    raise SystemExit(0)

if "PC-030M20AQ2 Decision Lab Home" not in s:
    raise SystemExit("ERROR — M20AQ2 Decision Lab Home not found; apply AQ2 first")

# 1. Remove the legacy Broker Evidence label from DecisionLabHome itself.
s, n = re.subn(
    r'\n\s*<Text\s+style=\{ui\.evidence\}>\s*Broker Evidence\s*</Text>',
    '',
    s,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit("ERROR — AQ2 Broker Evidence label anchor not found; refusing unsafe patch")

# 2. Locate the actual Trading component and its main render area.
trading_match = re.search(r'export\s+default\s+function\s+Trading\s*\(', s)
if not trading_match:
    raise SystemExit("ERROR — Trading component declaration not found; refusing unsafe patch")

component_start = trading_match.start()
render_start = s.find("<ScrollView", component_start)
if render_start < 0:
    raise SystemExit("ERROR — main Trading ScrollView not found; refusing unsafe patch")

# 3. Move Active Account above Decision Lab.
decision_tag = '<DecisionLabHome data={data} />'
active_pattern = re.compile(r'<ActiveUserBanner\s*/>')

decision_pos = s.find(decision_tag, render_start)
active_match = active_pattern.search(s, render_start)
if decision_pos < 0 or not active_match:
    raise SystemExit("ERROR — ActiveUserBanner / DecisionLabHome render anchors not found; refusing unsafe patch")

active_tag = active_match.group(0)
# Remove both tags from current positions, then insert in the requested order at the earliest location.
items = [(decision_pos, decision_pos + len(decision_tag)), (active_match.start(), active_match.end())]
insert_at = min(x[0] for x in items)
for start, end in sorted(items, reverse=True):
    s = s[:start] + s[end:]

ordered = (
    '      {/* PC-030M20AQ3 UI consolidation — account context first; legacy broker evidence UI removed. */}\n'
    '      <ActiveUserBanner />\n\n'
    '      <DecisionLabHome data={data} />'
)
s = s[:insert_at] + ordered + s[insert_at:]

# Refresh positions after mutation.
render_start = s.find("<ScrollView", component_start)
decision_pos = s.find(decision_tag, render_start)
if decision_pos < 0:
    raise SystemExit("ERROR — DecisionLabHome lost during reorder; refusing unsafe patch")

# 4. Replace the obsolete broker-evidence subtitle. Match only the first Trading subtitle.
subtitle_re = re.compile(
    r'(<Text\s+style=\{styles\.subtitle\}>)(.*?)(</Text>)',
    re.S,
)
sm = subtitle_re.search(s, render_start, decision_pos)
if sm:
    replacement = (
        sm.group(1)
        + '\n        Test investment decisions against your portfolio, goals and risk before you act.\n      '
        + sm.group(3)
    )
    s = s[:sm.start()] + replacement + s[sm.end():]
else:
    print("NOTICE — no styles.subtitle block before Decision Lab; no subtitle text changed")

# 5. Remove the old on-page broker workspace beneath Decision Lab.
#    This is a render-only consolidation: handlers, stores, routes and services remain untouched.
decision_pos = s.find(decision_tag, render_start)
decision_end = decision_pos + len(decision_tag)
scroll_close = s.find("</ScrollView>", decision_end)
if scroll_close < 0:
    raise SystemExit("ERROR — main Trading ScrollView closing tag not found; refusing unsafe patch")

removed = s[decision_end:scroll_close]
# Safety: do not truncate unless the removed region clearly contains legacy broker UI evidence.
legacy_signals = [
    "TRADING_TABS", "Broker controlled", "Trading account", "Trading Account",
    "Connect Broker", "Sync Broker Evidence", "Account", "Orders", "Depth", "Activity"
]
if not any(signal in removed for signal in legacy_signals):
    raise SystemExit("ERROR — lower Trading region does not look like legacy broker UI; refusing unsafe patch")

s = s[:decision_end] + "\n\n" + s[scroll_close:]

# Final safety assertions.
main_close = s.find("</ScrollView>", decision_end)
main_region = s[render_start:main_close]
if main_region.find("<ActiveUserBanner") > main_region.find(decision_tag):
    raise SystemExit("ERROR — Active Account did not move above Decision Lab")
if "Broker Evidence" in main_region or "Broker controlled" in main_region:
    raise SystemExit("ERROR — legacy Broker Evidence UI still rendered in Trading main region")

path.write_text(s, encoding="utf-8")
print("UPDATED — Active Account moved above Coach G Decision Lab")
print("UPDATED — obsolete broker-evidence subtitle replaced")
print("UPDATED — lower Broker Evidence / tabs / account controls removed from Trading UI")
print("PRESERVED — underlying broker handlers, routes, stores and services remain in source")
PY

echo "PC-030M20AQ3 applied successfully."
