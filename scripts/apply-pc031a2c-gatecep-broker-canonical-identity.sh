#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  echo "ERROR: run inside the GateCEP git repository." >&2
  exit 1
fi
cd "$ROOT"

python3 - <<'PY'
from pathlib import Path

replacements = {
    Path('mobile/src/services/brokers/brokerRegistry.js'): [
        (
            b'''  {\n    id: "SIM",\n    name: "Simulation Broker",\n    shortName: "SIM",\n    adapter: "simulation",\n    status: "ACTIVE",\n    apiMode: "SIMULATION",\n    bestFor: "Testing OMS execution"\n  },''',
            b'''  {\n    id: "GATECEP_PRACTICE",\n    name: "GateCEP Broker",\n    shortName: "GateCEP",\n    adapter: "simulation",\n    status: "ACTIVE",\n    apiMode: "PRACTICE",\n    bestFor: "Learning GateCEP before live investing"\n  },'''
        ),
        (
            b'''export function findBrokerById(id = "SIM") {\n  return (\n    BROKER_REGISTRY.find(\n      (broker) =>\n        String(broker.id).toUpperCase() === String(id).toUpperCase()\n    ) || BROKER_REGISTRY[0]\n  );\n}''',
            b'''export function findBrokerById(id = "GATECEP_PRACTICE") {\n  const raw = String(id || "").trim().toUpperCase();\n\n  const canonicalId = [\n    "SIM",\n    "GATECEP-DEMO",\n    "GATECEP DEMO",\n    "GATECEP_PRACTICE",\n    "GATECEP PRACTICE",\n    "GATECEP BROKER",\n    "SIMULATION BROKER"\n  ].includes(raw)\n    ? "GATECEP_PRACTICE"\n    : raw;\n\n  return (\n    BROKER_REGISTRY.find(\n      (broker) => String(broker.id).toUpperCase() === canonicalId\n    ) || BROKER_REGISTRY[0]\n  );\n}'''
        ),
    ],
    Path('mobile/src/services/brokers/brokerAccountStore.js'): [
        (
            b'''  if (["GATECEP-DEMO","GATECEP DEMO","SIM"].includes(raw)) return "SIM";''',
            b'''  if (["GATECEP-DEMO","GATECEP DEMO","GATECEP_PRACTICE","GATECEP PRACTICE","GATECEP BROKER","SIM","SIMULATION BROKER"].includes(raw)) return "GATECEP_PRACTICE";'''
        ),
        (b'''findBrokerById(brokerId||"SIM")''', b'''findBrokerById(brokerId||"GATECEP_PRACTICE")'''),
        (b'''findBrokerById(brokerId || "SIM")''', b'''findBrokerById(brokerId || "GATECEP_PRACTICE")'''),
    ],
    Path('mobile/src/features/broker-sync/brokerCashEvidencePolicy.js'): [
        (
            b'''    const excluded = brokerId === "SIM" || /PRACTICE|DEMO|SIMULATION/.test(mode);''',
            b'''    const excluded = ["SIM", "GATECEP_PRACTICE"].includes(brokerId) || /PRACTICE|DEMO|SIMULATION/.test(mode);'''
        ),
    ],
    Path('mobile/src/features/broker-sync/brokerSyncService.js'): [
        (
            b'''    return brokerId !== "SIM" && !mode.includes("PRACTICE") && !mode.includes("DEMO");''',
            b'''    return !["SIM", "GATECEP_PRACTICE"].includes(brokerId) && !mode.includes("PRACTICE") && !mode.includes("DEMO") && !mode.includes("SIMULATION");'''
        ),
    ],
}

for path, reps in replacements.items():
    if not path.exists():
        raise SystemExit(f"ERROR: missing required file: {path}")
    data = path.read_bytes()
    original = data
    for old, new in reps:
        # Support CRLF without normalizing the whole file.
        candidates = [(old, new), (old.replace(b'\n', b'\r\n'), new.replace(b'\n', b'\r\n'))]
        applied = False
        for old_b, new_b in candidates:
            count = data.count(old_b)
            if count == 1:
                data = data.replace(old_b, new_b, 1)
                applied = True
                break
            if count > 1:
                raise SystemExit(f"ERROR: ambiguous pattern in {path}: matched {count} times")
        if not applied:
            # Idempotency: allow already-patched content.
            if new in data or new.replace(b'\n', b'\r\n') in data:
                continue
            raise SystemExit(f"ERROR: expected pattern not found in {path}; no changes written")
    if data != original:
        path.write_bytes(data)
        print(f"UPDATED {path}")
    else:
        print(f"UNCHANGED {path} (already patched)")
PY

echo
echo "PC-031A2C applied. Review with:"
echo "  git diff -- mobile/src/services/brokers/brokerRegistry.js mobile/src/services/brokers/brokerAccountStore.js mobile/src/features/broker-sync/brokerCashEvidencePolicy.js mobile/src/features/broker-sync/brokerSyncService.js"
