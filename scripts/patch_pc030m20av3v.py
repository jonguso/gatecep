from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3V RESPONSIVE CALIBRATION"

targets = {
    "app/execution-audit.js": {
        "anchor": 'content: { padding: 22, paddingTop: 70, paddingBottom: 110 }',
        "replacement": 'content: { /* PC-030M20AV3V RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 }',
        "required": [
            "Practice Execution Audit",
            "Practice-only local audit trail for simulated lifecycle events and routing",
            "executionAuditStore",
        ],
    },
    "app/execution-bridge.js": {
        "anchor": 'content:{padding:22,paddingTop:70,paddingBottom:120}',
        "replacement": 'content:{/* PC-030M20AV3V RESPONSIVE CALIBRATION */width:"100%",maxWidth:960,alignSelf:"center",padding:22,paddingTop:70,paddingBottom:128}',
        "required": [
            "Coach G → Practice Simulation Pipeline",
            "ActiveUserBanner",
        ],
    },
    "app/execution-wizard.js": {
        "anchor": 'content: { padding: 22, paddingTop: 70, paddingBottom: 100 }',
        "replacement": 'content: { /* PC-030M20AV3V RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 }',
        "required": [
            "calculateExecutionReadiness",
            "Practice-only path from a Coach G idea to simulated order review. REAL execution occurs only at the broker.",
            "Broker account not linked",
            "Trade basket not created",
            "Cash balance missing",
            "Portfolio not loaded",
            "/broker-marketplace",
        ],
    },
}

for rel,cfg in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    src=p.read_text(encoding="utf-8")

    for tok in cfg["required"]:
        if tok not in src:
            raise SystemExit(f"STOP — {rel} required execution-boundary token missing before patch: {tok}")

    if MARKER in src:
        for token in ['maxWidth: 960','paddingBottom: 128']:
            if token not in src:
                raise SystemExit(f"STOP — {rel} has AV3V marker but incomplete responsive calibration.")
        print(f"ALREADY APPLIED — {rel}")
        continue

    count=src.count(cfg["anchor"])
    if count != 1:
        raise SystemExit(f"STOP — {rel} expected exactly one known content style anchor; found {count}.")
    bak=p.with_suffix(p.suffix+".pc030m20av3v.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    p.write_text(src.replace(cfg["anchor"],cfg["replacement"],1),encoding="utf-8")
    print(f"UPDATED — {rel}")

print("PC-030M20AV3V applied successfully.")
print("PRESERVED — Execution Audit remains Practice-only local simulated lifecycle evidence.")
print("PRESERVED — Execution Bridge remains the Coach G to Practice Simulation handoff.")
print("PRESERVED — Execution Wizard remains readiness/review only; REAL execution occurs only at the broker.")
print("PRESERVED — no REAL broker transmission, REAL trade mutation, or execution evidence creation is introduced.")
