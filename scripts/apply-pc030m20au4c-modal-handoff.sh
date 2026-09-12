#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SELECTOR="$ROOT/mobile/src/components/coach/RecoveryRecommendationSelector.js"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"

echo "PC-030M20AU4C — Decision Lab Modal → Floating Coach Handoff"

[[ -f "$SELECTOR" ]] || { echo "ERROR — RecoveryRecommendationSelector.js missing"; exit 1; }
[[ -f "$TRADING" ]] || { echo "ERROR — app/(tabs)/trading.js missing"; exit 1; }

python - "$SELECTOR" "$TRADING" <<'PY'
from pathlib import Path
import re, sys

selector = Path(sys.argv[1])
trading = Path(sys.argv[2])
ss0 = selector.read_text(encoding="utf-8")
ts0 = trading.read_text(encoding="utf-8")
ss = ss0
ts = ts0

# Add callback prop to RecoveryRecommendationSelector.
if "onConversationStarted" not in ss:
    m = re.search(
        r'export\s+default\s+function\s+RecoveryRecommendationSelector\s*\(\s*\{([\s\S]*?)\}\s*\)',
        ss
    )
    if not m:
        raise SystemExit("ERROR — selector prop signature not found")
    props = m.group(1).rstrip()
    if props and not props.endswith(","):
        props += ","
    props += "\n  onConversationStarted\n"
    ss = ss[:m.start(1)] + props + ss[m.end(1):]

# Replace AU4B activation call with parent-close then deferred open.
if "PC-030M20AU4C close Decision Lab before Floating Coach" not in ss:
    marker = "// PC-030M20AU4B activate canonical Floating Coach"
    marker_at = ss.find(marker)
    if marker_at < 0:
        raise SystemExit("ERROR — AU4B activation marker not found")

    call_at = ss.find("requestFloatingCoachGOpen({", marker_at)
    if call_at < 0:
        raise SystemExit("ERROR — requestFloatingCoachGOpen call not found")

    brace_at = ss.find("{", call_at)
    depth = 0
    end_at = None
    for i in range(brace_at, len(ss)):
        if ss[i] == "{":
            depth += 1
        elif ss[i] == "}":
            depth -= 1
            if depth == 0:
                semi = ss.find(";", i)
                if semi < 0:
                    raise SystemExit("ERROR — activation call semicolon not found")
                end_at = semi + 1
                break
    if end_at is None:
        raise SystemExit("ERROR — activation call parse failed")

    original_call = ss[call_at:end_at]
    deferred_call = "\n".join("      " + line.lstrip() for line in original_call.splitlines())

    replacement = (
        "// PC-030M20AU4C close Decision Lab before Floating Coach\n"
        "    onConversationStarted?.();\n\n"
        "    setTimeout(() => {\n"
        + deferred_call +
        "\n    }, 0);"
    )

    ss = ss[:marker_at] + replacement + ss[end_at:]

# Wire parent callback in trading.js.
if "setConversationOpen" not in ts:
    raise SystemExit("ERROR — setConversationOpen not found in trading.js")

if "onConversationStarted={() => setConversationOpen(false)}" not in ts:
    start = ts.find("<RecoveryRecommendationSelector")
    if start < 0:
        raise SystemExit("ERROR — RecoveryRecommendationSelector render not found")
    end = ts.find("/>", start)
    if end < 0:
        raise SystemExit("ERROR — selector JSX closing /> not found")

    tag = ts[start:end+2]
    insert = "\n              onConversationStarted={() => setConversationOpen(false)}"
    new_tag = tag[:-2] + insert + "\n            />"
    ts = ts[:start] + new_tag + ts[end+2:]

required_s = [
    "onConversationStarted?.();",
    "PC-030M20AU4C close Decision Lab before Floating Coach",
    "setTimeout(() => {",
    "requestFloatingCoachGOpen({",
]
required_t = [
    "onConversationStarted={() => setConversationOpen(false)}",
    "setConversationOpen(false)",
]

if any(x not in ss for x in required_s):
    raise SystemExit("ERROR — selector AU4C validation failed")
if any(x not in ts for x in required_t):
    raise SystemExit("ERROR — trading AU4C validation failed")

selector.with_suffix(selector.suffix + ".pc030m20au4c.bak").write_text(ss0, encoding="utf-8")
trading.with_suffix(trading.suffix + ".pc030m20au4c.bak").write_text(ts0, encoding="utf-8")

selector.write_text(ss, encoding="utf-8")
trading.write_text(ts, encoding="utf-8")

print("UPDATED — recovery selector notifies DecisionLabHome before opening Coach G.")
print("UPDATED — Decision Lab closes with setConversationOpen(false).")
print("UPDATED — Floating Coach opens on the next event-loop turn.")
print("PRESERVED — M20AU4B activation bridge and M20AT conversation session.")
print("PC-030M20AU4C applied successfully.")
PY
