from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/"mobile/app/basket-execution.js"
if not p.exists(): raise SystemExit(f"ERROR — missing {p}")
s=p.read_text(encoding="utf-8")
old=s

# Cover both the current live wording and the intended conditional wording from F5.
s=s.replace(
    'Status: {execution.status} • Indicative Value {money(totalAmount)}',
    'Status: {execution.status} • Planned Gross Purchases {money(execution?.costSummary?.plannedGrossPurchases ?? totalAmount)}',
    1
)
s=s.replace(
    'Status: {execution.status} • {execution?.costSummary?.allChargesVerified ? "Estimated Total Cost" : "Planned Gross Purchases"} {money(execution?.costSummary?.allChargesVerified ? execution?.costSummary?.estimatedTotalBasketCost : execution?.costSummary?.plannedGrossPurchases ?? totalAmount)}',
    'Status: {execution.status} • Planned Gross Purchases {money(execution?.costSummary?.plannedGrossPurchases ?? totalAmount)}',
    1
)

if s==old and "Planned Gross Purchases" not in s:
    raise SystemExit("ERROR — Broker Action Plan summary anchor missing.")

if s!=old:
    p.with_suffix(p.suffix+".pc030m20av2f5a.bak").write_text(old,encoding="utf-8")
    p.write_text(s,encoding="utf-8")
    print("UPDATED — Broker Action Plan summary label now states Planned Gross Purchases.")
else:
    print("NO CHANGE — Planned Gross Purchases label already present.")
