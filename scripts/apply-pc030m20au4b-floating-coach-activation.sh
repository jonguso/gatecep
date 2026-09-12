#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLOATING="$ROOT/mobile/src/components/coach/FloatingCoachG.js"
SELECTOR="$ROOT/mobile/src/components/coach/RecoveryRecommendationSelector.js"

echo "PC-030M20AU4B — Floating Coach Activation Syntax Correction"

[[ -f "$FLOATING" ]] || { echo "ERROR — canonical FloatingCoachG.js missing"; exit 1; }
[[ -f "$SELECTOR" ]] || { echo "ERROR — M20AU3 selector missing"; exit 1; }

python - "$FLOATING" "$SELECTOR" <<'PY'
from pathlib import Path
import re
import sys

floating = Path(sys.argv[1])
selector = Path(sys.argv[2])

fs_original = floating.read_text(encoding="utf-8")
ss_original = selector.read_text(encoding="utf-8")

fs = fs_original
ss = ss_original

F_IMPORT = 'import { subscribeFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";'
S_IMPORT = 'import { requestFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";'

def add_import(text, import_line):
    if import_line in text:
        return text

    # Prefer the end of the initial import region, including multiline imports.
    match = re.match(r'(?s)^((?:\s*import\b.*?;\s*)+)', text)
    if match:
        pos = match.end(1)
        return text[:pos] + import_line + "\n" + text[pos:]

    # Safe fallback: prepend at module top.
    return import_line + "\n" + text

# ---------------------------------------------------------
# Discover actual FloatingCoachG component and visibility state.
# ---------------------------------------------------------
component_match = re.search(
    r'export\s+default\s+function\s+FloatingCoachG\s*\([^)]*\)\s*\{',
    fs,
)
if not component_match:
    component_match = re.search(
        r'function\s+FloatingCoachG\s*\([^)]*\)\s*\{',
        fs,
    )

if not component_match:
    raise SystemExit(
        "ERROR — FloatingCoachG component boundary not found; no source changes written"
    )

component_start = component_match.end()
component_text = fs[component_start:]

boolean_states = list(
    re.finditer(
        r'const\s+\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*'
        r'(?:React\.)?useState\(\s*(false|true)\s*\)\s*;?',
        component_text,
    )
)

if not boolean_states:
    raise SystemExit(
        "ERROR — no boolean state found inside FloatingCoachG; no source changes written"
    )

visible_name = None
visible_setter = None

# Strongest signal: React Native Modal visible={state}.
for state_match in boolean_states:
    state_name = state_match.group(1)
    setter_name = state_match.group(2)

    if re.search(
        r'<Modal\b[^>]*\bvisible\s*=\s*\{\s*'
        + re.escape(state_name)
        + r'\s*\}',
        component_text,
        re.S,
    ):
        visible_name = state_name
        visible_setter = setter_name
        break

# Alternate implementation: {state && (...)}.
if visible_name is None:
    for state_match in boolean_states:
        state_name = state_match.group(1)
        setter_name = state_match.group(2)

        if re.search(
            r'\{\s*' + re.escape(state_name) + r'\s*&&',
            component_text,
        ):
            visible_name = state_name
            visible_setter = setter_name
            break

# Final safe signal: setter is explicitly called with true.
if visible_name is None:
    for state_match in boolean_states:
        state_name = state_match.group(1)
        setter_name = state_match.group(2)

        if re.search(
            re.escape(setter_name) + r'\(\s*true\s*\)',
            component_text,
        ):
            visible_name = state_name
            visible_setter = setter_name
            break

if visible_name is None:
    discovered = ", ".join(
        f"{m.group(1)}/{m.group(2)}" for m in boolean_states
    )
    raise SystemExit(
        "ERROR — could not identify Floating Coach visibility state. "
        f"Boolean states found: {discovered}"
    )

# Discover current free-text question/input setter when available.
question_setter = None
question_match = re.search(
    r'const\s+\[\s*(question|input|message|draft|prompt)\s*,\s*(\w+)\s*\]'
    r'\s*=\s*(?:React\.)?useState\(',
    component_text,
    re.I,
)

if question_match:
    question_setter = question_match.group(2)

# ---------------------------------------------------------
# Add imports first.
# ---------------------------------------------------------
fs = add_import(fs, F_IMPORT)
ss = add_import(ss, S_IMPORT)

# Rediscover component/state after import insertion.
component_match = re.search(
    r'export\s+default\s+function\s+FloatingCoachG\s*\([^)]*\)\s*\{',
    fs,
)
if not component_match:
    component_match = re.search(
        r'function\s+FloatingCoachG\s*\([^)]*\)\s*\{',
        fs,
    )

component_start = component_match.end()
component_text = fs[component_start:]

state_pattern = re.compile(
    r'const\s+\[\s*'
    + re.escape(visible_name)
    + r'\s*,\s*'
    + re.escape(visible_setter)
    + r'\s*\]\s*=\s*(?:React\.)?useState\(\s*(?:false|true)\s*\)\s*;?'
)

state_match = state_pattern.search(component_text)
if not state_match:
    raise SystemExit(
        "ERROR — visibility state moved unexpectedly after import insertion"
    )

state_absolute_end = component_start + state_match.end()

# ---------------------------------------------------------
# Subscribe canonical Floating Coach to activation bridge.
# ---------------------------------------------------------
if "PC-030M20AU4B runtime-state-aware activation" not in fs:
    subscription_lines = [
        "",
        "  // PC-030M20AU4B runtime-state-aware activation",
        "  React.useEffect(() => {",
        "    return subscribeFloatingCoachGOpen((request) => {",
    ]

    if question_setter:
        subscription_lines.extend([
            "      if (request?.question) {",
            f"        {question_setter}(request.question);",
            "      }",
        ])

    subscription_lines.extend([
        f"      {visible_setter}(true);",
        "    });",
        "  }, []);",
        "",
    ])

    subscription = "\n".join(subscription_lines)

    fs = (
        fs[:state_absolute_end]
        + subscription
        + fs[state_absolute_end:]
    )

# ---------------------------------------------------------
# Wire Answer Coach G to explicit canonical activation.
# ---------------------------------------------------------
if "PC-030M20AU4B activate canonical Floating Coach" not in ss:
    session_lines = [
        "    startDecisionConversation({",
        "      scenario: seed.scenario,",
        "      openingText:",
        "        selectedCoachResponse?.answer ||",
        "        seed.openingText,",
        "      openingQuestion:",
        "        selectedCoachResponse?.question ||",
        "        seed.openingQuestion",
        "    });",
    ]
    session_block = "\n".join(session_lines)

    if session_block not in ss:
        raise SystemExit(
            "ERROR — M20AU3 continueWithCoach session-start block not found; "
            "no source changes written"
        )

    activation_lines = [
        "",
        "    // PC-030M20AU4B activate canonical Floating Coach",
        "    requestFloatingCoachGOpen({",
        '      source: "RECOVERY_RECOMMENDATION",',
        "      question:",
        "        selectedCoachResponse?.question ||",
        "        seed.openingQuestion,",
        "      context: {",
        "        scenarioId: selectedChoice?.id || null,",
        "        strategy: selectedChoice?.strategy || null,",
        "        goalName: result?.goalName || goalName || null",
        "      }",
        "    });",
    ]
    activation_block = "\n".join(activation_lines)

    ss = ss.replace(
        session_block,
        session_block + activation_block,
        1,
    )

# ---------------------------------------------------------
# Safety validation before writing.
# ---------------------------------------------------------
floating_required = [
    F_IMPORT,
    "PC-030M20AU4B runtime-state-aware activation",
    f"{visible_setter}(true)",
]
selector_required = [
    S_IMPORT,
    "PC-030M20AU4B activate canonical Floating Coach",
    "requestFloatingCoachGOpen",
]

floating_missing = [
    item for item in floating_required if item not in fs
]
selector_missing = [
    item for item in selector_required if item not in ss
]

if floating_missing or selector_missing:
    raise SystemExit(
        "ERROR — AU4B safety validation failed. "
        f"floating={floating_missing}, selector={selector_missing}"
    )

# Only write after all validation succeeds.
if fs != fs_original:
    floating.with_suffix(
        floating.suffix + ".pc030m20au4b.bak"
    ).write_text(fs_original, encoding="utf-8")
    floating.write_text(fs, encoding="utf-8")

if ss != ss_original:
    selector.with_suffix(
        selector.suffix + ".pc030m20au4b.bak"
    ).write_text(ss_original, encoding="utf-8")
    selector.write_text(ss, encoding="utf-8")

print(
    f"DETECTED — Floating Coach visibility state: "
    f"{visible_name} via {visible_setter}."
)
print(
    "DETECTED — question setter: "
    + (question_setter or "not available")
)
print(
    "UPDATED — canonical Floating Coach listens for "
    "recovery activation requests."
)
print(
    "UPDATED — Answer Coach G opens the actual current "
    "Floating Coach state."
)
print(
    "PRESERVED — existing M20AT conversation session "
    "remains authoritative."
)
print("PC-030M20AU4B applied successfully.")
PY
