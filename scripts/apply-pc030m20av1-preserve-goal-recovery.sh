#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLANNER="$ROOT/mobile/app/goal-scenario-planner.js"
echo "PC-030M20AV1 — Preserve-Goal Recovery First"
[[ -f "$PLANNER" ]] || { echo "ERROR — mobile/app/goal-scenario-planner.js missing"; exit 1; }
python - "$PLANNER" <<'PY2'
from pathlib import Path
import sys
p=Path(sys.argv[1]); o=p.read_text(encoding='utf-8'); t=o
old='pathname: "/portfolio-rebalancing"'; new='pathname: "/goal-recovery-choice"'
if new in t: print('NO CHANGE — preserve-goal recovery route already installed.')
elif old in t:
 t=t.replace(old,new,1); p.with_suffix(p.suffix+'.pc030m20av1.bak').write_text(o,encoding='utf-8'); p.write_text(t,encoding='utf-8'); print('UPDATED — Continue with this scenario now opens preserve-goal recovery first.')
else: raise SystemExit('ERROR — expected /portfolio-rebalancing handoff not found; no source changes written')
PY2
echo "PRESERVED — existing simulator params, AU4C Coach G, and portfolio-rebalancing outside the direct handoff."
echo "PC-030M20AV1 applied successfully."
