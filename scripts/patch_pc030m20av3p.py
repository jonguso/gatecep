from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]/"mobile"

targets = {
"app/alerts.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 110 }',
"app/analysis-ready.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 90 }',
"app/behavior-analytics.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 110 }',
"app/corporate-actions.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 110 }',
"app/investor-home.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 40 }',
"app/investor-timeline.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 110 }',
"app/live-dashboard.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 120 }',
"app/portfolio-activity.js": 'content: { padding: 20, paddingTop: 60, paddingBottom: 120 }',
"app/progress.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 40 }',
"app/recommendation-history.js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 90 }',
"app/security/[symbol].js": 'content: { padding: 22, paddingTop: 70, paddingBottom: 120 }',
}

def calibrated(old):
    # Preserve existing padding and top spacing; add only desktop containment and
    # bottom safety. Marker is deliberately local to the style block.
    inner=old[len("content: { "):-2]
    parts=[p.strip() for p in inner.split(",")]
    kept=[]
    for p in parts:
        if p.startswith("paddingBottom:"):
            continue
        kept.append(p)
    return 'content: { /* PC-030M20AV3P RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", ' + ", ".join(kept) + ', paddingBottom: 128 }'

changed=[]
for rel, old in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    s=p.read_text(encoding="utf-8")

    marker="PC-030M20AV3P RESPONSIVE CALIBRATION"
    if marker in s:
        print(f"ALREADY APPLIED — {rel}")
        continue

    if old not in s:
        raise SystemExit(f"STOP — expected content style not found in {rel}; no broad fallback patch attempted.")

    new=calibrated(old)
    before=s
    after=s.replace(old,new,1)
    if after==before:
        raise SystemExit(f"STOP — no change produced for {rel}")

    backup=p.with_suffix(p.suffix+".pc030m20av3p.bak")
    if not backup.exists():
        backup.write_text(before,encoding="utf-8")
    p.write_text(after,encoding="utf-8")
    changed.append(rel)
    print(f"UPDATED — {rel}")

print(f"PC-030M20AV3P applied successfully. Updated {len(changed)} screen(s).")
print("PRESERVED — patch is confined to each target's existing content style.")
print("PRESERVED — no routes, services, state mutations, financial logic, watchlist logic, or investor evidence logic are changed.")
