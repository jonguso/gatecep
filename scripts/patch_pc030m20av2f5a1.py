from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/"mobile/app/basket-execution.js"
if not p.exists(): raise SystemExit(f"ERROR — missing {p}")
s=p.read_text(encoding="utf-8")
orig=s
old='          Status: {execution.status} • {brokerPlanMode ? "Indicative" : "Active"} Value KES {money(totalAmount)}'
new='          Status: {execution.status} • {brokerPlanMode ? "Planned Gross Purchases" : "Active Value"} KES {money(brokerPlanMode ? (execution?.costSummary?.plannedGrossPurchases ?? totalAmount) : totalAmount)}'
if old in s:
    s=s.replace(old,new,1)
elif "Planned Gross Purchases" in s:
    print("NO CHANGE — Planned Gross Purchases label already present.")
else:
    raise SystemExit("ERROR — current Broker Action Plan summary anchor still not found.")
if s!=orig:
    p.with_suffix(p.suffix+".pc030m20av2f5a1.bak").write_text(orig,encoding="utf-8")
    p.write_text(s,encoding="utf-8")
    print("UPDATED — BROKER_PLAN summary now says Planned Gross Purchases.")